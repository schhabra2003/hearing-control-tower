#!/usr/bin/env node
// Hearing Desk live server. Serves the built single-file app and runs the two AI readers of the
// prototype on new messages, with the same code as `node cli/sheet.js --paste`.
//
//   node server/live.mjs [--key-file <path>] [--port 4173] [--host 127.0.0.1] [--dist <dir>]
//                        [--prototype <dir>] [--cap <usd>] [--recorded]
//
// The key comes from the environment variable OPENAI_API_KEY or from --key-file (a file with a
// line OPENAI_API_KEY=... or the key alone). It stays in this process: it is never sent to the
// browser, never logged, never written to disk. Without a key, or with --recorded, the server
// replays the readers' recorded answers and says so in every answer.
//
// Endpoints (all JSON, no cookies, no files written):
//   GET  /api/status   { mode: "live" | "recorded", reason, models, costUsd, requests, cap, ... }
//   POST /api/read     { messages: [{ id?, sender, channel?, body, properties?, at? }] }
//                      Answer: the rows of the "Reader suggestions" tab, exactly as --paste writes
//                      them, with the counts, the reader labels, the time and the cost of the run.
//                      Send "Accept: application/x-ndjson" to get progress lines before the result.
//
// Safety, the same as the command: the readers only suggest rows for a person to accept or refuse.
// Nothing is sent to anyone, no sheet or file is changed. Only fictional example messages belong here.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VERSION = 'live-1';

// ---------- arguments ----------
const argv = process.argv.slice(2);
const opt = (name, dflt = null) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const flag = (name) => argv.includes(name);
if (flag('--help') || flag('-h')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 22).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const PORT = Number(opt('--port', process.env.PORT || 4173));
const HOST = opt('--host', process.env.HOST || '127.0.0.1');
const PUBLIC = !/^(127\.0\.0\.1|localhost|::1)$/i.test(HOST);
// On a public host each visitor's address may start at most LIVE_PER_HOUR live reads an hour; after
// that the server answers with the recorded readers and says why. The spend cap still applies.
const PER_HOUR = Number(opt('--per-hour', process.env.LIVE_PER_HOUR || 6));
const CAP = Number(opt('--cap', process.env.LIVE_CAP_USD || 5));
const MAX_MESSAGES = Number(opt('--max-messages', 10));
const MAX_BODY_CHARS = 6000;
const FORCE_RECORDED = flag('--recorded');

const firstExisting = (list, test) => list.filter(Boolean).map((p) => path.resolve(p)).find(test) || null;
const DIST = firstExisting([opt('--dist'), process.env.LIVE_DIST, path.join(HERE, '..', 'dist'), path.join(process.cwd(), 'dist'), path.join(process.cwd(), 'app', 'dist')], (p) => fs.existsSync(path.join(p, 'index.html')));
const PROTO = firstExisting([opt('--prototype'), process.env.LIVE_PROTOTYPE, path.join(HERE, '..', '..', 'prototype'), path.join(process.cwd(), 'prototype'), path.join(process.cwd(), '..', 'prototype')], (p) => fs.existsSync(path.join(p, 'cli', 'sheet.js')));
if (!PROTO) { console.error('The prototype folder was not found. Pass --prototype <path to the prototype folder>.'); process.exit(2); }
if (!DIST) console.warn('No built app was found (dist/index.html). The API works; build the app (npm run build) or pass --dist <dir> to serve it.');

// ---------- the key: in memory only, masked in every text that leaves this process ----------
function readKey() {
  if (FORCE_RECORDED) return null;
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) return process.env.OPENAI_API_KEY.trim();
  const file = opt('--key-file', process.env.OPENAI_KEY_FILE || null);
  if (!file) return null;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { console.error('The key file could not be read. Check the path given to --key-file.'); process.exit(2); }
  const line = text.split(/\r?\n/).map((l) => l.trim()).find((l) => /^(export\s+)?OPENAI_API_KEY\s*=/.test(l));
  const raw = line ? line.replace(/^(export\s+)?OPENAI_API_KEY\s*=\s*/, '') : text.trim().split(/\s+/)[0];
  const key = (raw || '').replace(/^["']|["']$/g, '').trim();
  if (!key) { console.error('The key file holds no OPENAI_API_KEY line.'); process.exit(2); }
  return key;
}
const KEY = readKey();
// The key must not reach a child process or a later module through the environment.
delete process.env.OPENAI_API_KEY;
const mask = (s) => {
  let t = String(s ?? '');
  if (KEY) t = t.split(KEY).join('[key hidden]');
  return t.replace(/sk-[A-Za-z0-9_-]{8,}/g, '[key hidden]').replace(/Bearer\s+\S+/gi, 'Bearer [key hidden]');
};

// ---------- the prototype's own code ----------
const imp = (rel) => import(pathToFileURL(path.join(PROTO, rel)).href);
const { loadAll } = await imp('cli/load.js');
const sheet = await imp('cli/sheet.js');
const ai = await imp('src/extract/openai.js');
const data = loadAll();
const exampleById = new Map(data.messages.map((m) => [String(m.id), m]));

// ---------- state shown by /api/status ----------
const state = {
  mode: 'recorded',
  reason: FORCE_RECORDED ? 'Started with --recorded.' : 'No key was given (OPENAI_API_KEY or --key-file).',
  models: { reader: ai.DEFAULT_MODEL, second: ai.DEFAULT_SECOND_MODEL },
  readerLabels: null,
  costUsd: 0,
  requests: 0,
  failures: 0,
  runs: 0,
  messagesRead: 0,
  busy: false,
  startedAt: new Date().toISOString(),
};

let readers = null;
if (KEY) {
  // Check the key and the two models once, at start, with the free model list (no reading cost).
  try {
    const res = await fetch('https://api.openai.com/v1/models', { headers: { authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(20000) });
    if (res.status === 401) state.reason = 'The key was refused by the API (401). Recorded answers are used.';
    else if (!res.ok) state.reason = `The model list could not be read (HTTP ${res.status}). Recorded answers are used.`;
    else {
      const ids = new Set(((await res.json()).data || []).map((m) => m.id));
      const missing = [ai.DEFAULT_MODEL, ai.DEFAULT_SECOND_MODEL].filter((m) => !ids.has(m));
      if (missing.length) state.reason = `This key cannot use ${missing.join(' and ')}. Recorded answers are used.`;
      else {
        readers = { reader: ai.createOpenAIReader({ apiKey: KEY }), second: ai.createSecondReader({ apiKey: KEY, model: ai.DEFAULT_SECOND_MODEL }) };
        state.mode = 'live';
        state.reason = `Key checked: ${ai.DEFAULT_MODEL} and ${ai.DEFAULT_SECOND_MODEL} are available.`;
        state.readerLabels = [readers.reader.label, readers.second.label];
      }
    }
  } catch (e) {
    state.reason = `The API could not be reached (${mask(e && e.cause && e.cause.code ? e.cause.code : e && e.name ? e.name : 'network')}). Behind a proxy, start Node with NODE_USE_ENV_PROXY=1. Recorded answers are used.`;
  }
}
const spent = () => (readers ? readers.reader.totals.costUsd + readers.second.totals.costUsd : 0);
const requestsMade = () => (readers ? readers.reader.totals.requests + readers.second.totals.requests : 0);
function status() {
  const costUsd = spent();
  return {
    mode: state.mode,
    live: state.mode === 'live' && costUsd < CAP,
    reason: state.mode === 'live' && costUsd >= CAP ? `The spend cap of $${CAP.toFixed(2)} for this server run is reached. Recorded answers are used.` : state.reason,
    models: state.models,
    readerLabels: state.readerLabels,
    costUsd: Number(costUsd.toFixed(4)),
    requests: requestsMade(),
    cap: CAP,
    runs: state.runs,
    messagesRead: state.messagesRead,
    busy: state.busy,
    maxMessages: MAX_MESSAGES,
    startedAt: state.startedAt,
    version: VERSION,
  };
}

// ---------- one read ----------
function cleanMessages(body) {
  const list = Array.isArray(body) ? body : body && Array.isArray(body.messages) ? body.messages : null;
  if (!list || !list.length) throw Object.assign(new Error('Send a JSON object with a list "messages" (at least one message).'), { status: 400 });
  if (list.length > MAX_MESSAGES) throw Object.assign(new Error(`Send at most ${MAX_MESSAGES} messages in one read.`), { status: 400 });
  return list.map((m, i) => {
    if (!m || typeof m !== 'object') throw Object.assign(new Error(`Message ${i + 1} is not an object.`), { status: 400 });
    const text = (v) => (v === undefined || v === null ? '' : String(v));
    const out = { sender: text(m.sender).slice(0, 200), channel: text(m.channel || 'email').slice(0, 40), body: text(m.body).slice(0, MAX_BODY_CHARS) };
    if (m.id !== undefined && m.id !== null && m.id !== '') out.id = typeof m.id === 'number' ? m.id : text(m.id).slice(0, 40);
    if (m.address) out.address = text(m.address).slice(0, 200);
    if (Array.isArray(m.properties)) out.properties = m.properties.slice(0, 12).map((p) => text(p).slice(0, 200));
    if (m.at) out.at = text(m.at).slice(0, 40);
    if (!out.sender.trim() || !out.body.trim()) throw Object.assign(new Error(`Message ${i + 1} has no sender or no text.`), { status: 400 });
    return out;
  });
}
const isExample = (m) => { const e = exampleById.get(String(m.id)); return !!e && String(e.body).replace(/\s+/g, ' ').trim() === String(m.body).replace(/\s+/g, ' ').trim(); };

// Wraps a reader so that each request reports progress; the wrapper keeps the reader's label and totals.
function withProgress(fn, role, emit) {
  const w = async (msg, dir, ctx) => {
    emit({ type: 'progress', stage: 'request', role, message: msg && msg.id !== undefined ? String(msg.id) : '' });
    try { return await fn(msg, dir, ctx); } finally { emit({ type: 'progress', stage: 'answer', role, message: msg && msg.id !== undefined ? String(msg.id) : '' }); }
  };
  return Object.assign(w, fn);
}

let queue = Promise.resolve();
function runRead(messages, emit, limited = false) {
  const job = queue.then(async () => {
    state.busy = true;
    const t0 = Date.now();
    const cost0 = spent(), req0 = requestsMade();
    const liveNow = state.mode === 'live' && spent() < CAP && !limited;
    const fresh = messages.filter((m) => !isExample(m));
    emit({ type: 'start', mode: liveNow ? 'live' : 'recorded', messages: messages.length, toReadLive: liveNow ? fresh.length : 0, expectedRequests: liveNow ? fresh.length * 2 : 0 });
    try {
      const r = liveNow
        ? await sheet.pasteNewMail(messages, data, { env: {}, readers: { reader: withProgress(readers.reader, 'reader', emit), second: withProgress(readers.second, 'second reader', emit) } })
        : await sheet.pasteNewMail(messages, data, { env: {} });
      const ms = Date.now() - t0;
      const costUsd = spent() - cost0;
      state.runs += 1;
      state.messagesRead += r.readLive.length;
      const lines = sheet.pasteLines(r, 'the messages sent from the app', 'reader-suggestions-paste.tsv').map(mask);
      return {
        type: 'result',
        mode: liveNow ? 'live' : 'recorded',
        capReached: state.mode === 'live' && !liveNow,
        columns: sheet.PASTE_COLUMNS,
        rows: r.rows.map((row) => row.map(mask)),
        count: r.count,
        how: r.how.map((h) => ({ id: h.id, path: h.path, sender: h.sender, ...(h.why ? { why: mask(h.why) } : {}) })),
        readLive: r.readLive, failed: r.failed, missing: r.missing, example: r.example, replayed: r.replayed, nothingProposed: r.nothingProposed,
        readerLabels: r.readerLabels,
        messages: messages.map((m, i) => ({ id: m.id ?? `new-${i + 1}`, sender: m.sender, channel: m.channel, body: m.body })),
        lines,
        ms,
        costUsd: Number(costUsd.toFixed(4)),
        requests: requestsMade() - req0,
        status: status(),
      };
    } finally { state.busy = false; }
  });
  queue = job.catch(() => {});
  return job;
}

// ---------- HTTP ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.ics': 'text/calendar; charset=utf-8' };
const send = (res, code, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
// Only this machine's own pages may call the API: the Host must be local (no DNS rebinding) and a
// browser's Origin, when present, must be this server.
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
function allowed(req) {
  const host = String(req.headers.host || '');
  if (HOST === '127.0.0.1' || HOST === 'localhost') { if (!LOCAL.test(host)) return false; }
  const origin = req.headers.origin;
  if (origin && origin !== `http://${host}` && origin !== `https://${host}`) return false;
  return true;
}
// Live reads per visitor address in the last hour (public host only; memory only, nothing stored).
const hits = new Map();
function overLimit(req) {
  if (!PUBLIC) return false;
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  if (recent.length >= PER_HOUR) { hits.set(ip, recent); return true; }
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}
function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('The request is too large.'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  try {
    if (url.pathname.startsWith('/api/')) {
      if (!allowed(req)) return send(res, 403, { error: 'Only pages served by this server may call it.' });
      if (url.pathname === '/api/status' && req.method === 'GET') return send(res, 200, status());
      if (url.pathname === '/api/read' && req.method === 'POST') {
        if (!/application\/json/i.test(String(req.headers['content-type'] || ''))) return send(res, 415, { error: 'Send the messages as application/json.' });
        let body;
        try { body = JSON.parse(await readBody(req)); } catch (e) { return send(res, e.status || 400, { error: e.status ? e.message : 'The request is not JSON.' }); }
        let messages;
        try { messages = cleanMessages(body); } catch (e) { return send(res, e.status || 400, { error: e.message }); }
        const stream = /application\/x-ndjson/i.test(String(req.headers.accept || ''));
        if (stream) res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
        const emit = (ev) => { if (stream && !res.writableEnded) res.write(`${JSON.stringify(ev)}\n`); };
        try {
          const limited = overLimit(req);
          const out = await runRead(messages, emit, limited);
          if (limited) out.limitNote = `This address has used its ${PER_HOUR} live reads for this hour, so recorded answers were used.`;
          console.log(`Read ${out.messages.length} ${out.messages.length === 1 ? 'message' : 'messages'} (${out.mode}): ${out.readLive.length} live, ${out.failed.length} failed, ${out.rows.length} rows, ${(out.ms / 1000).toFixed(1)} s, $${out.costUsd.toFixed(4)}. Total $${out.status.costUsd.toFixed(4)} of the $${CAP.toFixed(2)} cap.`);
          if (stream) { res.end(`${JSON.stringify(out)}\n`); return; }
          return send(res, 200, out);
        } catch (e) {
          const msg = mask(e && e.message ? e.message : e);
          console.error(`A read failed: ${msg}`);
          if (stream) { res.end(`${JSON.stringify({ type: 'error', error: msg })}\n`); return; }
          return send(res, 500, { error: msg });
        }
      }
      return send(res, 404, { error: 'There is no such API path. Use GET /api/status or POST /api/read.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain; charset=utf-8');
    if (url.pathname === '/control-tower.html') return send(res, 200, fs.readFileSync(path.join(PROTO, 'control-tower.html')), TYPES['.html']);
    if (!DIST) return send(res, 404, 'The app is not built. Run npm run build, or pass --dist <dir>.', 'text/plain; charset=utf-8');
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(DIST, `.${rel}`);
    if (!file.startsWith(DIST + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  } catch (e) {
    return send(res, 500, { error: mask(e && e.message ? e.message : e) });
  }
});

server.listen(PORT, HOST, () => {
  const s = status();
  console.log(`Hearing Desk live server on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`);
  console.log(s.mode === 'live' ? `Live AI: ${s.readerLabels[0]} checked by ${s.readerLabels[1]}. Spend cap for this run: $${CAP.toFixed(2)}.` : `Recorded answers: ${s.reason}`);
  console.log(`Prototype: ${PROTO}${DIST ? `. App: ${DIST}` : ''}. Only fictional example messages belong here. Stop with Ctrl+C.`);
});
