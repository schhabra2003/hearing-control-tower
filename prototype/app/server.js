// The dev server for the web app. No dependencies: Node 20 or newer is all it needs.
//
//     node app/server.js                 then open http://localhost:4173
//     node app/server.js --port 5000
//
// It does three things:
//   1. serves the app as it is in this folder (ES modules, no build step),
//   2. serves the data bundle at /data.json, the same one the single-file build inlines,
//   3. when an API key is present, serves the live AI reader at /api/read.
//
// The live reader. The page builds the reader's instructions and the message input itself,
// because it knows the directory, including counties added in the session. It posts both texts
// here. This server adds the key, asks the model, and returns the raw answer. The key never
// reaches the browser, and the answer is not trusted: back in the page it goes through the code
// guard, the cross-check of the two readers and the verifier, like every other reading.
//
// The key is read from a file named .env in the prototype folder (a line OPENAI_API_KEY=... or
// ANTHROPIC_API_KEY=...), from --key-file <path>, or from the environment. It is never printed.
// The server listens on this computer only (127.0.0.1) and refuses requests from other sites.
// Behind a company proxy, start Node with NODE_USE_ENV_PROXY=1.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../cli/load.js';
import { assembleData } from '../cli/appdata.js';

const args = {};
for (let i = 2; i < process.argv.length; i += 1) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const next = process.argv[i + 1];
  if (next === undefined || next.startsWith('--')) args[a.slice(2)] = true; else { args[a.slice(2)] = next; i += 1; }
}
const PORT = +(args.port || process.env.PORT || 4173);
const HOST = '127.0.0.1';
const MAX_REQUESTS = +(args['max-requests'] || 400);          // a ceiling on paid requests per run of this server

// KEY=VALUE lines. A value already in the environment wins. Nothing is printed.
function loadEnvFile(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return false; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
  return true;
}
loadEnvFile(path.join(ROOT, '.env'));
if (typeof args['key-file'] === 'string' && !loadEnvFile(path.resolve(args['key-file']))) console.log(`Could not read the key file ${args['key-file']}.`);

// ---- the live readers -----------------------------------------------------------------------------
let live = null, liveWhy = 'No API key was found. Put a line OPENAI_API_KEY=... in a file named .env in the prototype folder and start the server again.';
const spent = { requests: 0, usd: 0, failures: 0 };
async function setUpReaders() {
  try {
    if (process.env.OPENAI_API_KEY) {
      const O = await import('../src/extract/openai.js');
      const primary = process.env.READER_MODEL || O.DEFAULT_MODEL, second = process.env.SECOND_READER_MODEL || O.DEFAULT_SECOND_MODEL;
      live = { provider: 'OpenAI', models: { primary, second }, measured: primary === O.DEFAULT_MODEL && second === O.DEFAULT_SECOND_MODEL,
        readers: { primary: O.createOpenAIReader({ model: primary }), second: O.createOpenAIReader({ model: second, variant: 'second' }) } };
    } else if (process.env.ANTHROPIC_API_KEY) {
      const C = await import('../src/extract/claude.js');
      const primary = process.env.READER_MODEL || C.DEFAULT_MODEL, second = process.env.SECOND_READER_MODEL || C.DEFAULT_MODEL;
      // Built from the provider's documentation, but never run against the live API: no Anthropic
      // key was available when this prototype was made. It needs `npm install @anthropic-ai/sdk`.
      live = { provider: 'Anthropic', models: { primary, second }, measured: false,
        readers: { primary: C.createClaudeReader({ model: primary }), second: C.createClaudeReader({ model: second, variant: 'second' }) } };
    }
  } catch (e) { live = null; liveWhy = `The live reader could not be set up: ${e.message}`; }
}

// ---- small helpers --------------------------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const send = (res, status, body, type = 'application/json; charset=utf-8') => {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(data);
};
// What the page may load as files: the app, the engine, and the scripts in eval. Data goes out
// only through /data.json, so a key file or a private folder can never be fetched.
function staticFile(urlPath) {
  const rel = urlPath === '/' ? 'app/index.html' : decodeURIComponent(urlPath).replace(/^\/+/, '');
  const ok = /^(app|src)\/[\w./-]+\.(html|js|css|svg)$/.test(rel) || /^eval\/[\w-]+\.js$/.test(rel);
  if (!ok || rel.includes('..')) return null;
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) return null;
  try { return { body: fs.readFileSync(file), type: TYPES[path.extname(file)] || 'application/octet-stream' }; } catch { return null; }
}
const readBody = (req, limit) => new Promise((resolve, reject) => {
  let size = 0; const chunks = [];
  req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});
// Only this page may use the reader: the request must come from this server's own address.
function sameSite(req) {
  const host = String(req.headers.host || '');
  if (![`localhost:${PORT}`, `127.0.0.1:${PORT}`].includes(host)) return false;
  const origin = req.headers.origin;
  return !origin || origin === `http://${host}`;
}

let dataCache = null;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/data.json') {
      if (!dataCache || url.searchParams.has('fresh')) dataCache = JSON.stringify(assembleData());
      return send(res, 200, dataCache);
    }
    if (req.method === 'GET' && url.pathname === '/api/reader') {
      return send(res, 200, live
        ? { live: true, provider: live.provider, primary: live.models.primary, second: live.models.second, measured: live.measured, requests: spent.requests, spentUsd: spent.usd }
        : { live: false, reason: liveWhy });
    }
    if (url.pathname === '/api/read') {
      if (req.method !== 'POST' || !/application\/json/.test(String(req.headers['content-type'] || '')) || !sameSite(req)) return send(res, 403, { ok: false, code: 'refused', error: 'This reader answers only its own page.' });
      if (!live) return send(res, 200, { ok: false, code: 'no_key', error: liveWhy });
      if (spent.requests >= MAX_REQUESTS) return send(res, 200, { ok: false, code: 'limit', error: `This server has made ${spent.requests} paid requests, its limit for one run. Start it again to go on.` });
      let body;
      try { body = JSON.parse(await readBody(req, 256 * 1024)); } catch { return send(res, 400, { ok: false, code: 'bad_request', error: 'The request was not valid JSON, or it was too large.' }); }
      const reader = live.readers[body && body.variant === 'second' ? 'second' : 'primary'];
      if (!body || typeof body.system !== 'string' || typeof body.input !== 'string' || !body.system.trim() || !body.input.trim()) return send(res, 400, { ok: false, code: 'bad_request', error: 'The request needs the instructions and the message input as text.' });
      spent.requests += 1;
      try {
        const a = await reader.ask(body.system, body.input);
        if (typeof a.costUsd === 'number') spent.usd += a.costUsd;
        console.log(`  read ${spent.requests}: ${a.model}, ${(a.ms / 1000).toFixed(1)} s${typeof a.costUsd === 'number' ? `, $${a.costUsd.toFixed(4)} (this run so far $${spent.usd.toFixed(4)})` : ''}`);
        return send(res, 200, { ok: true, raw: a.raw, usage: a.usage, costUsd: a.costUsd, ms: a.ms, model: a.model });
      } catch (e) {
        spent.failures += 1;
        if (typeof e.costUsd === 'number') spent.usd += e.costUsd;
        console.log(`  read ${spent.requests} failed: ${e.code || 'error'}: ${e.message}`);
        return send(res, 200, { ok: false, code: e.code || 'error', error: e.message });
      }
    }
    if (req.method === 'GET') {
      const f = staticFile(url.pathname);
      if (f) return send(res, 200, f.body, f.type);
    }
    return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  } catch (e) {
    return send(res, 500, { ok: false, code: 'server', error: String(e && e.message ? e.message : e) });
  }
});

await setUpReaders();
server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is in use. Try: node app/server.js --port ${PORT + 1}` : String(e.message || e)); process.exit(1); });
server.listen(PORT, HOST, () => {
  console.log(`Hearing Control Tower: http://localhost:${PORT}`);
  if (live) {
    console.log(`Live AI reader: ${live.provider}, ${live.models.primary} checked by ${live.models.second}. Choose it on the page "Try a message".`);
    if (!live.measured) console.log('Note: this pair of models has not been measured. The measured pair is in eval/reader_results.json.');
  } else console.log(`Live AI reader: off. ${liveWhy}\nThe app still works: it shows the recorded AI reads and reads new text with the offline pattern reader.`);
  console.log('Stop with Ctrl+C.');
});
