// Scores a reader against hand labels and prints a table plus JSON.
//
//   node eval/run.js --set data/gold_dev.json --reader rules
//   node eval/run.js --set data/heldout.json  --reader recorded:data/recorded_reads.json [--crosscheck rules]
//   node eval/run.js --set data/heldout.json  --reader claude [--crosscheck claude] [--save-reads data/recorded_reads.json]
//   node eval/run.js --set data/heldout.json  --reader gold --crosscheck rules     what the cross-check costs a perfect first reader
//
// Readers (--reader, --crosscheck, --baseline):
//   rules                    the offline pattern reader
//   gold                     the labels themselves (a perfect reader; shows what the guard and the cross-check cost)
//   recorded:<file>[#set]    saved AI reads (src/extract/recorded.js); set is "primary" or "second"
//   claude[:model]           the live AI reader (needs ANTHROPIC_API_KEY, in the environment or in .env).
//                            As --crosscheck it is the sceptical second reader.
//   openai[:model]           the same reader on the OpenAI Responses API (needs OPENAI_API_KEY, in the
//                            environment, in .env, or in a file named with --key-file). Behind a proxy
//                            start Node with NODE_USE_ENV_PROXY=1. --effort low|medium|high is passed on.
//   compat:<provider>:<model>  the same reader on any OpenAI-compatible chat-completions endpoint
//                            (src/extract/compat.js): open-weight models at an inference provider
//                            or on the firm's own machine. provider is openrouter, together,
//                            fireworks, groq, deepinfra or local; or give --base-url. The key comes
//                            from the provider's variable (for example OPENROUTER_API_KEY) or
//                            READER_API_KEY. --mode schema|object|prompt sets the firmest JSON mode
//                            to try. --price in,cached,out (USD per million tokens) prices the run
//                            when the provider reports no cost; --price2 does so for --crosscheck.
// Other options:
//   --out <file>             add this run to a results file (for example eval/reader_results.json)
//   --json                   print the full result as JSON and nothing else
//   -v                       list every difference between the reader and the labels
//   --limit n | --only a,b   score a subset (useful to try the live reader on a few messages)
//   --baseline <reader>      paired comparison on the same messages (default: rules; "none" to skip)
//   --fallback rules         for a recorded reader: use the rules reader where there is no record
//                            (default: messages without a record are left out and counted)
//   --labels-current         the labels already use the four newest claim types (see NEWER below)
//   --concurrency n          parallel requests for the live reader (default 4)
// Two more jobs, for making recorded reads without the API:
//   node eval/run.js --set <set> --render-pack <pack.json> [--variant second]
//   node eval/run.js --build-records <records.json> --pack <pack.json> --outputs <answers.json> --read-by "<who>" --harness "<how>" [--note "..."]
//
// Two set formats are understood: data/gold_dev.json ({ labels: { "<message id>": [claims] } },
// for the 72 example messages, read in order) and the unseen-set format ({ messages: [{ id, ts,
// sender, address, channel, properties, body, claims, expect_no_effect, trap, ambiguous }] },
// every message read on its own at the end of the examples).

import fs from 'node:fs';
import path from 'node:path';
import { loadAll, ROOT } from '../cli/load.js';
import { createEngine } from '../src/engine.js';
import { extractWithRules } from '../src/extract/rules.js';
import { verifyClaim } from '../src/verify.js';
import { TYPE_LIST } from '../src/model.js';
import { scoreMessage } from '../src/score.js';
import { PROMPT_VERSION, hashText, buildReaderSystem } from '../src/extract/prompt.js';
import { settleRead, factsFor, needsTwoKeys, closingKey, TWO_KEY_TYPES } from '../src/extract/crosscheck.js';
import { makeRecordedReader, checkRecordFile, buildReadPack, makeRecord, buildRecordFile, RECORD_FORMAT, PACK_FORMAT } from '../src/extract/recorded.js';
import { wilson, bootstrapPRF, pairedCompare, upperBoundZero, pct, fmtWilson, fmtBoot } from '../src/stats.js';

// Claim types added to the vocabulary after the unseen set was labelled. Labels written before
// that cannot contain them, so a prediction of one of these types can be neither confirmed nor
// refuted by such labels: it is reported in its own bucket and left out of the scores.
const NEWER = ['hearing_postponed', 'withdrawal_cancelled', 'homeowner_confirmed', 'homeowner_declined'];
const KIND_KEYED = ['document_submitted', 'doc_unreadable', 'signature_required', 'signature_rejected', 'obligation_cleared'];   // as in src/score.js
const APPLIED = ['fact', 'flag', 'belief'];        // dispositions under which the ledger applies a closing claim

// ---- small helpers ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { _: [] };
  const flags = ['json', 'v', 'labels-current', 'help'];
  for (let i = 0; i < argv.length; i += 1) {
    const s = argv[i];
    if (!s.startsWith('-')) { a._.push(s); continue; }
    const k = s.replace(/^-+/, '');
    if (flags.includes(k)) a[k] = true; else { a[k] = argv[i + 1]; i += 1; }
  }
  return a;
}
const abs = (p) => (path.isAbsolute(p) ? p : fs.existsSync(path.resolve(p)) || !fs.existsSync(path.join(ROOT, p)) ? path.resolve(p) : path.join(ROOT, p));
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), 'utf8'));
const fail = (text) => { console.error(text); process.exit(2); };

// Loads KEY=VALUE lines from .env in the prototype folder. Values are never printed.
function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return false;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    const v = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined && v) process.env[m[1]] = v;
  }
  return true;
}

// A key kept outside the prototype folder: a file with a line OPENAI_API_KEY=... (or just the key).
// Read into the environment of this process only. Never printed, never copied.
function loadKeyFile(file) {
  if (!file) return;
  if (!fs.existsSync(file)) fail(`There is no key file at ${file}.`);
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(t);
    const name = m ? m[1] : 'OPENAI_API_KEY';          // a bare line is taken as the OpenAI key
    const v = (m ? m[2] : t).replace(/^(['"])(.*)\1$/, '$2').trim();
    if (v && /_API_KEY$|^READER_BASE_URL$/.test(name) && process.env[name] === undefined) process.env[name] = v;
  }
}

const pairKey = (c, id) => `${c.type}|${id}|${KIND_KEYED.includes(c.type) ? c.kind || '' : ''}`;
const pairMap = (claims) => { const m = new Map(); for (const c of claims) for (const id of c.cases || []) { const k = pairKey(c, id); if (!m.has(k)) m.set(k, c); } return m; };
const quoted = (labels, body) => labels.map((c) => ({ ...c, quote: body }));

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next; next += 1; out[i] = await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

// What a careful coordinator would call "the record": official facts, gates and readiness.
function snapshot(eng, now) {
  const out = {};
  for (const c of eng.view(now).cases) {
    const L = c.ledger, s = L.schedule;
    out[c.id] = {
      official: {
        schedule: s ? `${s.date} ${s.time}${s.mode ? ' ' + s.mode : ''}${s.room ? ' room ' + s.room : ''}` : L.postponed ? 'postponed' : 'none',
        committed: c.committed ? c.committed.id : null,
        recorded: L.rep ? L.rep.consultant : null,
        packet_clerk: L.packet.clerk.status === 'received',
        packet_consultants: Object.entries(L.packet.cons).filter(([, v]) => v.status === 'received').map(([k]) => k).sort().join(','),
        obligations_cleared: L.obligations.filter((o) => o.status === 'cleared').length,
        withdrawn: !!L.withdrawn,
        outcome: L.outcome ? L.outcome.result : null,
      },
      gates: Object.fromEntries(Object.entries(c.gates).map(([g, v]) => [g, v.status])),
      readiness: c.readiness, stage: c.stage,
    };
  }
  return out;
}
function effectsOf(before, after) {
  const fact = [], gate = [], ready = [];
  for (const id of Object.keys(after)) {
    const a = before[id], b = after[id];
    for (const k of Object.keys(b.official)) if (a.official[k] !== b.official[k]) fact.push(`${id} ${k.replace(/_/g, ' ')}: ${a.official[k]} -> ${b.official[k]}`);
    for (const g of Object.keys(b.gates)) if (a.gates[g] !== b.gates[g] && (b.gates[g] === 'closed' || b.gates[g] === 'na')) gate.push(`${id} ${g}: ${a.gates[g]} -> ${b.gates[g]}`);
    if (a.readiness !== b.readiness) ready.push(`${id}: ${a.readiness} -> ${b.readiness}`);
  }
  return { fact, gate, ready, any: !!(fact.length || gate.length || ready.length) };
}
const sameRecord = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- readers -------------------------------------------------------------------------------------
// Every reader is called as read(item) and returns what the reader said: a list of claims or
// { claims, unclassified, dropped, usage, costUsd, ms }, or { failed: text } when it could not read.
async function makeReader(spec, { role, args, dir }) {
  const [kind, ...rest] = String(spec).split(':');
  const arg = rest.join(':');
  if (kind === 'rules') return { spec, kind, label: 'rules (offline pattern reader)', read: (it) => extractWithRules(it.msg, dir, it.ctx) };
  if (kind === 'gold') return { spec, kind, label: 'the labels themselves', read: (it) => quoted(it.labels, it.msg.body) };
  if (kind === 'recorded') {
    const [file, set = role === 'second' ? 'second' : 'primary'] = arg.split('#');
    if (!file) fail('Use --reader recorded:<file>[#set].');
    if (!fs.existsSync(abs(file))) fail(`There is no record file at ${abs(file)}. Make one with --render-pack and --build-records, or with --reader claude --save-reads.`);
    const records = readJson(file);
    const useSet = records.sets ? set : 'primary';
    const check = checkRecordFile(records, { dir, set: useSet });
    if (!check.ok) fail(`The record file cannot be used:\n  ${check.problems.join('\n  ')}`);
    const fallback = args.fallback === 'rules' ? Object.assign((m, d, c) => extractWithRules(m, d, c), { label: 'rules' }) : null;
    const reader = makeRecordedReader(records, { set: useSet, fallback });
    return { spec, kind, label: reader.label, provenance: reader.provenance, warnings: check.warnings, reader,
      read: (it) => {
        if (!fallback && !reader.has(it.msg)) {
          const out = reader(it.msg, dir, it.ctx);                    // may still match by content
          if (reader.last.path === 'missing') return { missing: true };
          return Object.assign(out, { path: reader.last.path, contextChanged: reader.last.contextChanged });
        }
        const out = reader(it.msg, dir, it.ctx);
        return Object.assign(out, { path: reader.last.path, contextChanged: reader.last.contextChanged });
      } };
  }
  if (kind === 'claude') {
    loadEnv();
    const C = await import('../src/extract/claude.js');
    let reader;
    try { reader = C.createClaudeReader({ model: arg || C.DEFAULT_MODEL, variant: role === 'second' ? 'second' : 'primary', effort: args.effort || undefined }); } catch (e) { fail(e.message); }
    return { spec, kind, label: reader.label, live: true, reader,
      read: async (it) => { try { return await reader(it.msg, dir, it.ctx); } catch (e) { if (['no_sdk', 'auth', 'permission'].includes(e.code)) fail(e.message); return { failed: `${e.code || 'error'}: ${e.message}`, usage: e.usage || null, costUsd: e.costUsd ?? null, ms: e.ms ?? null }; } } };
  }
  if (kind === 'openai') {
    loadEnv(); loadKeyFile(args['key-file']);
    const O = await import('../src/extract/openai.js');
    let reader;
    try { reader = O.createOpenAIReader({ model: arg || O.DEFAULT_MODEL, variant: role === 'second' ? 'second' : 'primary', effort: args.effort || undefined }); } catch (e) { fail(e.message); }
    return { spec, kind, label: reader.label, live: true, reader,
      read: async (it) => { try { return await reader(it.msg, dir, it.ctx); } catch (e) { if (['no_key', 'auth', 'permission'].includes(e.code) || (e.code === 'bad_request' && /not found/.test(e.message))) fail(e.message); return { failed: `${e.code || 'error'}: ${e.message}`, usage: e.usage || null, costUsd: e.costUsd ?? null, ms: e.ms ?? null }; } } };
  }
  if (kind === 'compat') {
    loadEnv(); loadKeyFile(args['key-file']);
    const K = await import('../src/extract/compat.js');
    const known = Object.keys(K.PROVIDERS).includes(rest[0]);
    const provider = known ? rest[0] : undefined, model = (known ? rest.slice(1) : rest).join(':');
    if (!model) fail('Use --reader compat:<provider>:<model>, for example compat:openrouter:<vendor>/<model>.');
    if (!provider && !args['base-url'] && !process.env.READER_BASE_URL) fail(`Name a provider (${Object.keys(K.PROVIDERS).join(', ')}) or give --base-url.`);
    const priceArg = role === 'second' ? args.price2 : args.price;
    let prices = null;
    if (priceArg) { const [i, c, o] = String(priceArg).split(',').map(Number); if (![i, c, o].every(Number.isFinite)) fail('Use --price in,cached,out in USD per million tokens, for example --price 0.25,0.25,1.00.'); prices = { input: i, cached: c, output: o }; }
    let reader;
    try { reader = K.createCompatReader({ provider, baseUrl: args['base-url'], model, variant: role === 'second' ? 'second' : 'primary', mode: args.mode || 'schema', prices }); } catch (e) { fail(e.message); }
    return { spec, kind, label: reader.label, live: true, reader,
      read: async (it) => { try { return await reader(it.msg, dir, it.ctx); } catch (e) { if (['no_key', 'no_endpoint', 'no_model', 'auth', 'permission'].includes(e.code) || (e.code === 'bad_request' && /not found/.test(e.message))) fail(e.message); return { failed: `${e.code || 'error'}: ${e.message}`, usage: e.usage || null, costUsd: e.costUsd ?? null, ms: e.ms ?? null }; } } };
  }
  return fail(`Unknown reader "${spec}". Use rules, gold, recorded:<file>, claude[:model], openai[:model] or compat:<provider>:<model>.`);
}

// ---- the labelled set ----------------------------------------------------------------------------
function loadSet(file, data, args) {
  const raw = readJson(file);
  const warnings = [];
  let format, list;
  if (Array.isArray(raw.messages)) {
    format = 'unseen';
    list = raw.messages.map((m) => ({ raw: { id: m.id, at: m.ts, sender: m.sender, address: m.address ?? null, channel: m.channel, properties: m.properties || [], body: m.body },
      labels: m.claims, flags: { expect_no_effect: m.expect_no_effect === true, trap: m.trap || null, ambiguous: m.ambiguous === true, group: m.group || null } }));
    const unlabelled = list.filter((x) => !Array.isArray(x.labels));
    if (unlabelled.length) { warnings.push(`${unlabelled.length} messages have no "claims" list and were left out (${unlabelled.slice(0, 8).map((x) => x.raw.id).join(', ')}${unlabelled.length > 8 ? ', ...' : ''}).`); list = list.filter((x) => Array.isArray(x.labels)); }
  } else if (raw.labels && !Array.isArray(raw.labels)) {
    format = 'examples';
    list = data.messages.filter((m) => raw.labels[String(m.id)]).map((m) => ({ raw: m, labels: raw.labels[String(m.id)], flags: { expect_no_effect: false, trap: null, ambiguous: false, group: null } }));
    const unknownIds = Object.keys(raw.labels).filter((id) => !data.messages.some((m) => String(m.id) === id));
    if (unknownIds.length) warnings.push(`Labels for ${unknownIds.length} unknown message ids were ignored (${unknownIds.slice(0, 8).join(', ')}).`);
  } else fail('The set must be { "labels": { "<message id>": [claims] } } or { "messages": [ ... ] }.');

  // Unknown claim types in the labels: reported, never a crash. Such labels cannot be matched by any reader.
  const unknown = {};
  for (const it of list) {
    it.labels = it.labels.filter((c) => {
      if (c && TYPE_LIST.includes(c.type) && Array.isArray(c.cases) && c.cases.length) return true;
      const k = c && c.type ? String(c.type) : '(no type)';
      (unknown[k] = unknown[k] || []).push(String(it.raw.id));
      return false;
    });
  }
  const nUnknown = Object.values(unknown).reduce((n, l) => n + l.length, 0);
  if (nUnknown) warnings.push(`${nUnknown} label claims use a type this version does not know (${Object.entries(unknown).map(([k, l]) => `${k}: ${l.length}`).join(', ')}). They were left out of the scores.`);

  // Do the labels predate the newest claim types?
  let predate = [];
  if (Array.isArray(raw.labels_predate)) predate = raw.labels_predate.filter((t) => TYPE_LIST.includes(t));
  else if (format === 'unseen' && !args['labels-current']) {
    const used = new Set(list.flatMap((it) => it.labels.map((c) => c.type)));
    if (!NEWER.some((t) => used.has(t))) predate = NEWER.filter((t) => TYPE_LIST.includes(t));
  }
  if (predate.length) warnings.push(`No label uses ${predate.join(', ')}: the labels were written before these types existed. A reading of one of these types is listed separately and counted neither as right nor as wrong. Pass --labels-current once the labels have been brought up to date.`);

  if (args.only) { const ids = String(args.only).split(',').map((s) => s.trim()); list = list.filter((it) => ids.includes(String(it.raw.id))); }
  if (args.limit) list = list.slice(0, +args.limit);
  return { file, format, list, warnings, unknown, predate, note: raw.note || null };
}

function replayExamples(data) {
  const e = createEngine({ packet: data.packet, playbooks: data.playbooks, reader: extractWithRules });
  for (const m of data.messages) e.ingest(m);
  return e;
}
// The state every unseen message is read against: the end of the 72 examples.
async function baseWorld(data) {
  try {
    const mod = await import('../cli/check.js');
    if (mod.makeWorld('end').eng.state.messages.length === data.messages.length) return { make: () => mod.makeWorld('end').eng, how: 'makeWorld("end") from cli/check.js (the examples replayed with the rules reader)' };
  } catch { /* fall through: the check files may be mid-edit */ }
  return { make: () => replayExamples(data), how: 'the 72 examples replayed with the rules reader' };
}

// ---- phase A: the context of every message ----------------------------------------------------
async function contexts(set, data) {
  const items = [];
  if (set.format === 'examples') {
    // Each message is read with the TRUE case facts so far: the labels of all earlier messages
    // are applied first. An earlier misreading therefore cannot hide or cause a later one.
    const G = createEngine({ packet: data.packet, playbooks: data.playbooks, reader: extractWithRules });
    const all = loadAllLabels(set, data);
    for (const m of data.messages) {
      const { msg, ctx } = G.prepare(m);
      const it = set.list.find((x) => x.raw.id === m.id);
      if (it) items.push({ ...it, msg, ctx, facts: { ...ctx.facts, ...factsFor(G, ctx.caseIds) } });
      G.commit(msg, quoted(all[String(m.id)] || [], msg.body), { reader: 'person' });   // labels are a person's reading: not second-guessed by the plain-statement guard
    }
    return { items, dir: G.dir, goldEngine: G, base: null };
  }
  const base = await baseWorld(data);
  const B = base.make();
  for (const it of set.list) {
    const { msg, ctx } = B.prepare(it.raw);
    items.push({ ...it, msg, ctx, facts: { ...ctx.facts, ...factsFor(B, ctx.caseIds) } });
  }
  return { items, dir: B.dir, goldEngine: null, base };
}
function loadAllLabels(set, data) {
  const raw = readJson(set.file).labels;
  const out = {};
  for (const m of data.messages) out[String(m.id)] = (raw[String(m.id)] || []).filter((c) => c && TYPE_LIST.includes(c.type));
  return out;
}

// ---- phase B: read every message ----------------------------------------------------------------
async function readAll(items, dir, first, second, args) {
  const live = first.live || (second && second.live);
  return pool(items, live ? +(args.concurrency || 4) : 1, async (it) => {
    if (it.msg.resolvedBy === 'none') return { claims: [], unresolved: true, disputed: [], dropped: [], notes: [], unclassified: [] };
    const a = await first.read(it);
    if (a && a.missing) return { missing: true };
    if (a && a.failed) return { claims: [], failed: a.failed, disputed: [], dropped: [], notes: [], unclassified: [], usage: [a] };
    let b = null, bFailed = null;
    if (second) {
      b = await second.read(it);
      if (b && b.missing) b = null;                                   // no second key recorded: every closing claim is held back
      if (b && b.failed) { bFailed = b.failed; b = []; }
      if (b === null) b = [];
    }
    const r = settleRead(it.msg, dir, it.ctx, a, second ? b : null, { facts: it.facts });
    return { ...r, secondFailed: bFailed, path: a && a.path, contextChanged: !!(a && a.contextChanged), raw: a && a.raw, raw2: b && !Array.isArray(b) ? b.raw || null : null, usage2: b && !Array.isArray(b) && b.usage ? b : null, usage: [a, b].filter((x) => x && !Array.isArray(x) && x.usage) };
  });
}

// ---- phase C: score -------------------------------------------------------------------------------
function scoreOne(it, read, set, dir) {
  const env = { facts: it.facts, openObligations: it.ctx.openObligations, sender: { role: it.msg.role, consultant: it.msg.consultant } };
  const all = read.claims || [];
  const outside = [];                                                  // readings of a type the labels predate
  const pred = all.map((c) => (set.predate.includes(c.type) ? (outside.push(c), null) : c)).filter(Boolean);
  const s = scoreMessage(pred, it.labels);
  const P = pairMap(pred), Gd = pairMap(it.labels);
  const closingPredicted = [...P].filter(([k, c]) => needsTwoKeys(c, k.split('|')[1], env)).length;
  const falseClosings = [], wrongClosings = [];
  const disposition = (c) => verifyClaim(c, it.msg, dir).disposition;
  for (const k of s.fp) {
    const c = P.get(k), id = k.split('|')[1];
    if (needsTwoKeys(c, id, env)) falseClosings.push({ id: String(it.raw.id), type: c.type, case: id, disposition: disposition(c), quote: String(c.quote || '').slice(0, 160) });
  }
  for (const k of s.tp) {
    const c = P.get(k), g = Gd.get(k), id = k.split('|')[1];
    if (!needsTwoKeys(c, id, env)) continue;
    const kp = closingKey(c, id, env), kg = closingKey(g, id, env);
    const diff = kp.filter(([name, v], i) => kg[i][1] !== v).map(([name, v], i) => `${name}: read ${v || 'nothing'}, labelled ${kg.find((x) => x[0] === name)[1] || 'nothing'}`);
    for (const f of ['room', 'mode']) if (['hearing_scheduled', 'hearing_confirmed', 'schedule_changed'].includes(c.type) && c[f] !== undefined && g[f] !== undefined && c[f] !== g[f]) diff.push(`${f}: read ${c[f]}, labelled ${g[f]}`);
    if (diff.length) wrongClosings.push({ id: String(it.raw.id), type: c.type, case: id, disposition: disposition(c), difference: diff.join('; ') });
  }
  return { id: String(it.raw.id), channel: it.raw.channel, role: it.msg.role, flags: it.flags, tp: s.tp, fp: s.fp, fn: s.fn, fields: s.fields, exact: s.exact,
    closingPredicted, falseClosings, wrongClosings,
    outside: outside.flatMap((c) => c.cases.map((id) => ({ id: String(it.raw.id), type: c.type, case: id, disposition: disposition(c), closing: needsTwoKeys(c, id, env) }))),
    dropped: (read.dropped || []).length, disputed: read.disputed || [], unclassified: (read.unclassified || []).length, failed: read.failed || null, secondFailed: read.secondFailed || null, unresolved: !!read.unresolved,
    applied: all.flatMap((c) => (c.cases && c.cases.length ? c.cases : ['-']).map((id) => `${c.type} ${id}`)), notClassified: (read.unclassified || []).map((u) => String((u && u.quote) || '').slice(0, 200)),
    forPerson: !!((read.dropped || []).length || (read.disputed || []).length || (read.unclassified || []).length || read.failed || read.secondFailed) };
}

function summarize(rows, B) {
  const sum = (f) => rows.reduce((n, r) => n + f(r), 0);
  const tp = sum((r) => r.tp.length), fp = sum((r) => r.fp.length), fn = sum((r) => r.fn.length);
  const fr = sum((r) => r.fields.right), fw = sum((r) => r.fields.wrong), fm = sum((r) => r.fields.missing);
  const boot = bootstrapPRF(rows.map((r) => ({ tp: r.tp.length, fp: r.fp.length, fn: r.fn.length })), { B });
  const group = (keyOf) => {
    const g = {};
    for (const r of rows) { const k = keyOf(r); if (k === null || k === undefined) continue; (g[k] = g[k] || []).push(r); }
    return Object.fromEntries(Object.entries(g).sort((a, b) => b[1].length - a[1].length).map(([k, list]) => {
      const t = list.reduce((n, r) => n + r.tp.length, 0), p = list.reduce((n, r) => n + r.fp.length, 0), m = list.reduce((n, r) => n + r.fn.length, 0);
      return [k, { messages: list.length, exact: wilson(list.filter((r) => r.exact).length, list.length), found: t, missed: m, extra: p, precision: wilson(t, t + p), recall: wilson(t, t + m) }];
    }));
  };
  const byType = {};
  for (const r of rows) for (const [k, list] of [['found', r.tp], ['extra', r.fp], ['missed', r.fn]]) for (const key of list) { const t = key.split('|')[0]; (byType[t] = byType[t] || { found: 0, missed: 0, extra: 0 })[k] += 1; }
  for (const v of Object.values(byType)) { v.precision = wilson(v.found, v.found + v.extra); v.recall = wilson(v.found, v.found + v.missed); }
  return {
    claims: { found: tp, missed: fn, extra: fp, precision: wilson(tp, tp + fp), recall: wilson(tp, tp + fn), f1: 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null,
      by_message_bootstrap: { precision: boot.precision, recall: boot.recall, f1: boot.f1 } },
    fields: { right: fr, wrong: fw, missing: fm, accuracy: wilson(fr, fr + fw + fm) },
    messages: { n: rows.length, exact: wilson(rows.filter((r) => r.exact).length, rows.length) },
    by_type: Object.fromEntries(Object.entries(byType).sort((a, b) => (b[1].found + b[1].missed) - (a[1].found + a[1].missed))),
    by_channel: group((r) => r.channel),
    by_sender: group((r) => r.role),
    by_group: group((r) => r.flags.group),
  };
}

function safety(rows) {
  const closing = rows.reduce((n, r) => n + r.closingPredicted, 0);
  const fc = rows.flatMap((r) => r.falseClosings), wc = rows.flatMap((r) => r.wrongClosings);
  const applied = (l) => l.filter((x) => APPLIED.includes(x.disposition)).length;
  const msgs = new Set([...fc, ...wc].map((x) => x.id)).size;
  return {
    closing_claims_read: closing,
    false_closings: { n: fc.length, of_closing_claims_read: wilson(fc.length, closing), would_be_applied: applied(fc), upper_bound_if_zero: fc.length === 0 && closing ? upperBoundZero(closing) : null, list: fc },
    closings_with_a_wrong_detail: { n: wc.length, of_closing_claims_read: wilson(wc.length, closing), would_be_applied: applied(wc), list: wc },
    unsafe_closings: { n: fc.length + wc.length, of_closing_claims_read: wilson(fc.length + wc.length, closing), would_be_applied: applied(fc) + applied(wc), messages: wilson(msgs, rows.length),
      upper_bound_if_zero: fc.length + wc.length === 0 && closing ? upperBoundZero(closing) : null },
  };
}

// ---- report ------------------------------------------------------------------------------------
const W = (w) => (w && w.p !== null && w.p !== undefined ? fmtWilson(w) : 'n/a');
const padR = (s, n) => String(s).padEnd(n), padL = (s, n) => String(s).padStart(n);
function printReport(R, verbose) {
  const L = (s = '') => console.log(s);
  L(`READER EVALUATION   ${R.generated_at}`);
  L(`set:     ${R.set.file}  (${R.set.format === 'examples' ? 'the 72 examples, read in order with the true facts so far' : 'unseen set, each message read on its own at the end of the examples'})`);
  L(`reader:  ${R.reader.label}${R.crosscheck ? `\nsecond:  ${R.crosscheck.label}   (two keys to close, one key to open)` : ''}`);
  if (R.reader.provenance) L(`         recorded ${R.reader.provenance.recorded_at} by ${R.reader.provenance.read_by} via ${R.reader.provenance.harness}; instructions ${R.reader.provenance.prompt_version} ${R.reader.provenance.prompt_hash}`);
  L(`today's instructions: ${R.prompt.version}, hash ${R.prompt.hash}`);
  for (const w of R.warnings) L(`WARNING: ${w}`);
  L();
  L(`messages scored: ${R.messages.n}${R.set.left_out ? `   (left out, no recorded read: ${R.set.left_out})` : ''}   labelled claims (claim x case): ${R.claims.found + R.claims.missed}`);
  if (!R.messages.n) { L('Nothing to score.'); return; }
  L();
  L('CLAIMS');
  L(`  found ${R.claims.found}   missed ${R.claims.missed}   extra ${R.claims.extra}`);
  L(`  precision ${W(R.claims.precision)}     by message: ${fmtBoot(R.claims.by_message_bootstrap.precision)}`);
  L(`  recall    ${W(R.claims.recall)}     by message: ${fmtBoot(R.claims.by_message_bootstrap.recall)}`);
  L(`  F1        ${pct(R.claims.f1)}     by message: ${fmtBoot(R.claims.by_message_bootstrap.f1)}`);
  L(`  fields right ${W(R.fields.accuracy)}   (wrong ${R.fields.wrong}, missing ${R.fields.missing})`);
  L(`  messages read exactly ${W(R.messages.exact)}`);
  L('  Intervals are 95%. The first is a Wilson interval over claims; "by message" resamples whole messages, because claims in one message are not independent.');
  L();
  L('SAFETY 1: FALSE CLOSINGS  (a claim that can close a gate or set an official fact, and that the labels do not contain)');
  const S = R.safety;
  L(`  closing claims read: ${S.closing_claims_read}`);
  L(`  false closings: ${S.false_closings.n}   -> ${W(S.false_closings.of_closing_claims_read)} of closing claims read; the verifier would apply ${S.false_closings.would_be_applied} of them`);
  if (S.false_closings.upper_bound_if_zero !== null) L(`     none seen in ${S.closing_claims_read}: the true rate could still be as high as ${pct(S.false_closings.upper_bound_if_zero, 2)} (95%)`);
  L(`  right claim, wrong key detail (date, time, person, document): ${S.closings_with_a_wrong_detail.n}; the verifier would apply ${S.closings_with_a_wrong_detail.would_be_applied}`);
  L(`  unsafe closings in total: ${S.unsafe_closings.n}   -> ${W(S.unsafe_closings.of_closing_claims_read)}; messages affected ${W(S.unsafe_closings.messages)}`);
  for (const x of S.false_closings.list) L(`     false   ${padR(x.id, 6)} ${padR(x.type, 22)} ${x.case}  [${x.disposition}]  "${x.quote}"`);
  for (const x of S.closings_with_a_wrong_detail.list) L(`     detail  ${padR(x.id, 6)} ${padR(x.type, 22)} ${x.case}  [${x.disposition}]  ${x.difference}`);
  if (R.newer_types.n) {
    L(`  not scored: ${R.newer_types.n} readings of types the labels predate (${Object.entries(R.newer_types.by_type).map(([k, v]) => `${k} ${v}`).join(', ')}); ${R.newer_types.closing} of them can close something and ${R.newer_types.would_be_applied} would be applied. Check these by hand:`);
    for (const x of R.newer_types.list) L(`     ${padR(x.id, 6)} ${padR(x.type, 22)} ${x.case}  [${x.disposition}]`);
  }
  if (R.effects) {
    const E = R.effects;
    L();
    L('SAFETY 2: MESSAGES THAT MUST CHANGE NOTHING  (each replayed through a fresh engine at the end of the examples)');
    L(`  marked expect_no_effect: ${E.no_effect.messages}   changed the record: ${E.no_effect.with_effect.k}  -> ${W(E.no_effect.with_effect)}`);
    if (E.no_effect.with_effect.k === 0 && E.no_effect.messages) L(`     none in ${E.no_effect.messages}: the true rate could still be as high as ${pct(upperBoundZero(E.no_effect.messages), 2)} (95%)`);
    L(`     changed an official fact ${E.no_effect.fact_changed}, closed a gate ${E.no_effect.gate_closed}, changed readiness ${E.no_effect.readiness_changed}`);
    L(`     the labels themselves, applied the same way, change the record in ${E.no_effect.labels_with_effect} of these messages${E.no_effect.labels_with_effect ? ' (a label or an authority rule to look at)' : ''}`);
    L(`  marked as a trap: ${E.trap.messages}   record differs from what the labels give: ${E.trap.differs.k}  -> ${W(E.trap.differs)}`);
    L(`     changed an official fact ${E.trap.fact_changed}, closed a gate ${E.trap.gate_closed}, changed readiness ${E.trap.readiness_changed} (some traps are genuine changes; the comparison with the labels is what counts)`);
    L(`  either mark (${E.either.messages} messages): changed an official fact ${E.either.fact_changed}, closed a gate ${E.either.gate_closed}, changed readiness ${E.either.readiness_changed}`);
    for (const x of E.list) L(`     ${padR(x.id, 6)} ${x.kind}: ${x.what.slice(0, 3).join(' | ')}${x.what.length > 3 ? ` | +${x.what.length - 3} more` : ''}`);
  }
  if (R.state) {
    L();
    L('END STATE  (the reader\'s claims applied to all examples in order, against the labels applied the same way)');
    L(`  cases with the same official facts, gates and readiness: ${W(R.state.identical)}`);
    for (const d of R.state.differing) L(`     ${d}`);
  }
  L();
  L('WHAT GOES TO A PERSON BECAUSE OF THE READING');
  const Pp = R.pipeline;
  L(`  messages: ${W(Pp.messages_for_a_person)}   dropped by the code guard: ${Pp.dropped_by_guard}   passages the reader could not classify: ${Pp.unclassified}   failed reads: ${Pp.failed_reads}   no case matched: ${Pp.unresolved}`);
  if (R.crosscheck) L(`  held back by the cross-check: ${Pp.held_back.n} claims (first reader only ${Pp.held_back.primary}, second reader only ${Pp.held_back.secondary}, readers disagree ${Pp.held_back.both}); of the first reader's held-back claims, ${Pp.held_back.true_closings_held} are in the labels (a true closing delayed) and ${Pp.held_back.false_closings_stopped} are not (a false closing stopped)`);
  L();
  L('BY CLAIM TYPE              found missed extra   precision   recall');
  for (const [t, v] of Object.entries(R.by_type)) L(`  ${padR(t, 24)} ${padL(v.found, 5)} ${padL(v.missed, 6)} ${padL(v.extra, 5)}   ${padL(v.precision.p === null ? 'n/a' : pct(v.precision.p, 0), 9)}   ${padL(v.recall.p === null ? 'n/a' : pct(v.recall.p, 0), 6)}`);
  const table = (title, obj) => {
    if (!Object.keys(obj).length) return;
    L();
    L(`${padR(title, 26)} messages  read exactly                     found missed extra`);
    for (const [k, v] of Object.entries(obj)) L(`  ${padR(k, 24)} ${padL(v.messages, 8)}  ${padR(W(v.exact), 32)} ${padL(v.found, 5)} ${padL(v.missed, 6)} ${padL(v.extra, 5)}`);
  };
  table('BY CHANNEL', R.by_channel);
  table('BY SENDER (as checked)', R.by_sender);
  table('BY GROUP', R.by_group);
  if (R.ambiguous) { L(); L(`Without the ${R.ambiguous.left_out} messages marked ambiguous: precision ${W(R.ambiguous.precision)}, recall ${W(R.ambiguous.recall)}, read exactly ${W(R.ambiguous.exact)}`); }
  if (R.baseline) {
    const b = R.baseline;
    L();
    L(`AGAINST ${b.label.toUpperCase()} on the same ${b.paired.n} messages (read exactly: yes or no)`);
    L(`  this reader ${pct(b.paired.rateA)}, baseline ${pct(b.paired.rateB)}; only this reader right ${b.paired.onlyA}, only the baseline right ${b.paired.onlyB}, both ${b.paired.both}, neither ${b.paired.neither}`);
    L(`  difference ${fmtBoot(b.paired.difference)} (bootstrap over messages); exact McNemar p = ${b.paired.p.toFixed(4)}`);
    L(`  baseline claims: precision ${W(b.precision)}, recall ${W(b.recall)}; false closings ${b.false_closings}, closings with a wrong detail ${b.wrong_detail_closings}`);
  }
  if (R.cost) {
    L();
    L(`COST AND TIME (from the usage the API reported; ${R.cost.provider === 'compat' ? 'cost as the provider reported it, or from --price' : `prices in src/extract/${R.cost.provider === 'openai' ? 'openai' : 'claude'}.js`}, check current pricing)`);
    L(`  requests ${R.cost.requests}, total $${R.cost.total_usd === null ? 'n/a' : R.cost.total_usd.toFixed(4)}, per message $${R.cost.per_message_usd === null ? 'n/a' : R.cost.per_message_usd.toFixed(5)}; median ${R.cost.median_ms} ms per request, 95th percentile ${R.cost.p95_ms} ms`);
    if (R.cost.provider === 'compat') L(`  JSON mode used: ${R.cost.json_mode}; answers that were not valid JSON ${R.cost.bad_json}, cut off ${R.cost.cut_off}, failed requests ${R.cost.failures}`);
    L(`  tokens: ${R.cost.input_tokens} uncached in, ${R.cost.cache_read_tokens} read from cache, ${R.cost.cache_write_tokens} written to cache, ${R.cost.output_tokens} out${R.cost.reasoning_tokens ? ` (of which ${R.cost.reasoning_tokens} reasoning)` : ''}`);
  }
  if (verbose) {
    L();
    L('EVERY DIFFERENCE');
    for (const r of R.per_message) {
      if (r.exact && !r.outside) continue;
      L(`  ${r.id}${r.failed ? `\n     read failed: ${r.failed}` : ''}${r.missed.length ? `\n     missed: ${r.missed.join(', ')}` : ''}${r.extra.length ? `\n     extra:  ${r.extra.join(', ')}` : ''}${r.field_errors.length ? `\n     fields: ${r.field_errors.join('; ')}` : ''}`);
    }
  }
}

// ---- recorded reads without the API ----------------------------------------------------------
function mergeRecords(existing, incoming, setName) {
  if (!existing) return setName === 'second' ? { format: RECORD_FORMAT, sets: { second: { provenance: incoming.provenance, reads: incoming.reads } } } : incoming;
  const sets = existing.sets ? existing.sets : { primary: { provenance: existing.provenance, reads: existing.reads } };
  const target = sets[setName];
  if (!target) sets[setName] = { provenance: incoming.provenance, reads: incoming.reads };
  else {
    const same = ['read_by', 'harness', 'prompt_hash', 'variant'].every((k) => target.provenance[k] === incoming.provenance[k]);
    const stamp = same ? {} : { read_by: incoming.provenance.read_by, harness: incoming.provenance.harness, prompt_hash: incoming.provenance.prompt_hash, prompt_version: incoming.provenance.prompt_version, recorded_at: incoming.provenance.recorded_at };
    const key = (r) => `${r.id}|${r.body_hash}`;
    const fresh = new Map(incoming.reads.map((r) => [key(r), { ...r, ...stamp }]));
    target.reads = [...target.reads.filter((r) => !fresh.has(key(r))), ...fresh.values()];
  }
  return existing.sets || setName === 'second' || Object.keys(sets).length > 1 ? { format: RECORD_FORMAT, sets } : { format: RECORD_FORMAT, provenance: sets.primary.provenance, reads: sets.primary.reads };
}

function buildRecords(args) {
  for (const k of ['pack', 'outputs', 'read-by', 'harness']) if (!args[k]) fail(`--build-records needs --${k}.`);
  const pack = readJson(args.pack);
  if (pack.format !== PACK_FORMAT) fail(`${args.pack} is not a read pack.`);
  const raw = readJson(args.outputs);
  const answers = Array.isArray(raw) ? Object.fromEntries(raw.map((x) => [String(x.id), x.output ?? x.answer ?? x])) : raw.outputs || raw;
  const reads = [], missing = [];
  for (const task of pack.tasks) { if (answers[task.id] === undefined) { missing.push(task.id); continue; } reads.push(makeRecord(task, answers[task.id])); }
  const incoming = buildRecordFile({ read_by: args['read-by'], harness: args.harness, variant: pack.variant, prompt_hash: pack.prompt_hash, prompt_version: pack.prompt_version, schema_hash: pack.schema_hash, recorded_at: new Date().toISOString(), note: args.note || '' }, reads);
  const out = abs(args['build-records']);
  const merged = mergeRecords(fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null, incoming, pack.variant === 'second' ? 'second' : 'primary');
  fs.writeFileSync(out, JSON.stringify(merged, null, 1));
  const failed = reads.filter((r) => r.failed);
  console.log(`Wrote ${reads.length} reads (${pack.variant} reader, instructions ${pack.prompt_version} ${pack.prompt_hash}) to ${out}.`);
  if (missing.length) console.log(`No answer for ${missing.length} tasks: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ', ...' : ''}`);
  if (failed.length) console.log(`${failed.length} answers were not usable JSON: ${failed.map((r) => r.id).join(', ')}`);
}

// ---- main ----------------------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.set && !args['build-records'])) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 32).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); return; }
  if (args['build-records']) return buildRecords(args);

  const data = loadAll();
  const set = loadSet(args.set, data, args);
  const { items, dir, goldEngine, base } = await contexts(set, data);

  if (args['render-pack']) {
    const variant = args.variant === 'second' ? 'second' : 'primary';
    const pack = buildReadPack(items, dir, { variant, note: `${set.file}: ${items.length} messages. ${set.format === 'examples' ? 'Each message is shown with the true case facts at the time it arrived.' : 'Each message is shown with the case facts at the end of the 72 examples.'}` });
    fs.writeFileSync(abs(args['render-pack']), JSON.stringify(pack, null, 1));
    console.log(`Wrote ${pack.tasks.length} read tasks for the ${variant} reader to ${abs(args['render-pack'])} (instructions ${pack.prompt_version}, hash ${pack.prompt_hash}; system text ${pack.system.length} characters).`);
    return;
  }

  const first = await makeReader(args.reader || 'rules', { role: 'first', args, dir });
  const second = args.crosscheck ? await makeReader(args.crosscheck, { role: 'second', args, dir }) : null;
  const warnings = [...set.warnings, ...(first.warnings || []), ...((second && second.warnings) || []).map((w) => `(second reader) ${w}`)];

  let reads = await readAll(items, dir, first, second, args);
  const leftOut = reads.filter((r) => r.missing).length;
  const kept = items.map((it, i) => ({ it, read: reads[i] })).filter((x) => !x.read.missing);
  if (leftOut) warnings.push(`${leftOut} of ${items.length} messages have no recorded read and were left out. The scores describe the other ${kept.length}.`);
  const rows = kept.map(({ it, read }) => scoreOne(it, read, set, dir));
  const B = +(args.B || 2000);
  const sum = summarize(rows, B);

  // ---- the two replays
  let state = null, effects = null;
  if (set.format === 'examples' && !args.only && !args.limit && !leftOut) {
    const Rw = createEngine({ packet: data.packet, playbooks: data.playbooks, reader: extractWithRules });
    const byId = new Map(kept.map((x) => [x.it.raw.id, x.read]));
    const all = loadAllLabels(set, data);
    for (const m of data.messages) {
      const { msg } = Rw.prepare(m);
      const read = byId.get(m.id);
      Rw.commit(msg, read ? read.claims : quoted(all[String(m.id)] || [], msg.body), { reader: read ? first.label : 'person' });
    }
    const now = Math.max(Rw.state.now, goldEngine.state.now);
    const a = snapshot(Rw, now), g = snapshot(goldEngine, now);
    const differing = Object.keys(g).filter((id) => !sameRecord(a[id], g[id])).map((id) => {
      const d = [];
      for (const k of Object.keys(g[id].official)) if (a[id].official[k] !== g[id].official[k]) d.push(`${k.replace(/_/g, ' ')}: reader ${a[id].official[k]}, labels ${g[id].official[k]}`);
      for (const k of Object.keys(g[id].gates)) if (a[id].gates[k] !== g[id].gates[k]) d.push(`${k}: reader ${a[id].gates[k]}, labels ${g[id].gates[k]}`);
      if (a[id].readiness !== g[id].readiness) d.push(`readiness: reader ${a[id].readiness}, labels ${g[id].readiness}`);
      return `${id}  ${d.join('; ')}`;
    });
    state = { cases: Object.keys(g).length, identical: wilson(Object.keys(g).length - differing.length, Object.keys(g).length), differing };
  }
  if (set.format === 'unseen') {
    const marked = kept.filter((x) => x.it.flags.expect_no_effect || x.it.flags.trap);
    const list = [];
    const tally = () => ({ messages: 0, fact_changed: 0, gate_closed: 0, readiness_changed: 0 });
    const noEff = { ...tally(), with_effect: 0, labels_with_effect: 0 }, trap = { ...tally(), differs: 0 }, either = tally();
    for (const { it, read } of marked) {
      const run = (claims) => { const e = base.make(); const { msg } = e.prepare(it.raw); const before = snapshot(e, msg.ts); e.commit(msg, claims, { reader: 'eval' }); const after = snapshot(e, msg.ts); return { fx: effectsOf(before, after), after }; };
      const r = run(read.claims), g = run(quoted(it.labels, it.msg.body));
      const count = (t) => { t.messages += 1; if (r.fx.fact.length) t.fact_changed += 1; if (r.fx.gate.length) t.gate_closed += 1; if (r.fx.ready.length) t.readiness_changed += 1; };
      count(either);
      if (it.flags.expect_no_effect) {
        count(noEff);
        if (r.fx.any) { noEff.with_effect += 1; list.push({ id: String(it.raw.id), kind: 'expect_no_effect, but the record changed', what: [...r.fx.fact, ...r.fx.gate, ...r.fx.ready.map((x) => `readiness ${x}`)] }); }
        if (g.fx.any) noEff.labels_with_effect += 1;
      }
      if (it.flags.trap) {
        count(trap);
        if (!sameRecord(r.after, g.after)) {
          trap.differs += 1;
          if (!(it.flags.expect_no_effect && r.fx.any)) list.push({ id: String(it.raw.id), kind: 'trap, record differs from the labels', what: [...r.fx.fact, ...r.fx.gate, ...r.fx.ready.map((x) => `readiness ${x}`), ...(r.fx.any ? [] : ['the reader changed nothing where the labels do'])] });
        }
      }
    }
    effects = { base: base.how, no_effect: { ...noEff, with_effect: wilson(noEff.with_effect, noEff.messages) }, trap: { ...trap, differs: wilson(trap.differs, trap.messages) }, either, list };
  }

  // ---- what the reading sends to a person
  const disputes = rows.flatMap((r) => r.disputed.map((d) => ({ ...d, row: r })));
  const inLabels = (d, r) => { const it = kept.find((x) => String(x.it.raw.id) === r.id).it; const Gd = pairMap(it.labels); return d.claim.cases.filter((id) => Gd.has(pairKey(d.claim, id))).length; };
  let trueHeld = 0, falseStopped = 0;
  for (const d of disputes) if (d.by !== 'secondary') { const k = inLabels(d, d.row); trueHeld += k; falseStopped += d.claim.cases.length - k; }
  const pipeline = {
    messages_for_a_person: wilson(rows.filter((r) => r.forPerson).length, rows.length),
    dropped_by_guard: rows.reduce((n, r) => n + r.dropped, 0), unclassified: rows.reduce((n, r) => n + r.unclassified, 0),
    failed_reads: rows.filter((r) => r.failed).length, unresolved: rows.filter((r) => r.unresolved).length,
    held_back: { n: disputes.reduce((n, d) => n + d.claim.cases.length, 0), primary: disputes.filter((d) => d.by === 'primary').reduce((n, d) => n + d.claim.cases.length, 0), secondary: disputes.filter((d) => d.by === 'secondary').reduce((n, d) => n + d.claim.cases.length, 0), both: disputes.filter((d) => d.by === 'both').reduce((n, d) => n + d.claim.cases.length, 0), true_closings_held: trueHeld, false_closings_stopped: falseStopped },
  };

  // ---- readings of types the labels predate
  const outside = rows.flatMap((r) => r.outside);
  const newer = { n: outside.length, closing: outside.filter((x) => x.closing).length, would_be_applied: outside.filter((x) => APPLIED.includes(x.disposition)).length, by_type: outside.reduce((o, x) => { o[x.type] = (o[x.type] || 0) + 1; return o; }, {}), list: outside };

  // ---- ambiguous messages left out (sensitivity)
  let ambiguous = null;
  const clear = rows.filter((r) => !r.flags.ambiguous);
  if (clear.length !== rows.length) { const s2 = summarize(clear, 200); ambiguous = { left_out: rows.length - clear.length, precision: s2.claims.precision, recall: s2.claims.recall, exact: s2.messages.exact }; }

  // ---- paired comparison with a baseline reader
  let baseline = null;
  const bSpec = args.baseline || (first.kind === 'rules' && !second ? 'none' : 'rules');
  if (bSpec !== 'none' && rows.length) {
    const b = await makeReader(bSpec, { role: 'first', args: { ...args, fallback: undefined }, dir });
    const bReads = await readAll(kept.map((x) => x.it), dir, b, null, args);
    const usable = kept.map((x, i) => ({ row: rows[i], it: x.it, read: bReads[i] })).filter((x) => !x.read.missing);
    const bRows = usable.map((x) => scoreOne(x.it, x.read, set, dir));
    const bs = summarize(bRows, 200), bSafe = safety(bRows);
    baseline = { spec: bSpec, label: b.label, paired: pairedCompare(usable.map((x) => x.row.exact), bRows.map((r) => r.exact), { B }), precision: bs.claims.precision, recall: bs.claims.recall, exact: bs.messages.exact, false_closings: bSafe.false_closings.n, wrong_detail_closings: bSafe.closings_with_a_wrong_detail.n };
  }

  // ---- cost
  let cost = null;
  const used = kept.flatMap((x) => x.read.usage || []);
  if (used.length) {
    const t = (k) => used.reduce((n, u) => n + ((u.usage && u.usage[k]) || 0), 0);
    const ms = used.map((u) => u.ms).filter((x) => typeof x === 'number').sort((a, b) => a - b);
    const priced = used.every((u) => typeof u.costUsd === 'number');
    const total = priced ? used.reduce((n, u) => n + u.costUsd, 0) : null;
    cost = { requests: used.length, total_usd: total, per_message_usd: total === null ? null : total / kept.length, median_ms: ms.length ? ms[Math.floor(ms.length / 2)] : null,
      input_tokens: t('input_tokens'), output_tokens: t('output_tokens'), cache_read_tokens: t('cache_read_input_tokens'), cache_write_tokens: t('cache_creation_input_tokens') };
    // The OpenAI API reports all input in input_tokens and the cached part inside it.
    const cachedIn = used.reduce((n, u) => n + ((u.usage && u.usage.input_tokens_details && u.usage.input_tokens_details.cached_tokens) || 0), 0);
    const reasoning = used.reduce((n, u) => n + ((u.usage && u.usage.output_tokens_details && u.usage.output_tokens_details.reasoning_tokens) || 0), 0);
    if (first.kind === 'openai' || first.kind === 'compat') { cost.cache_read_tokens = cachedIn; cost.input_tokens -= cachedIn; cost.reasoning_tokens = reasoning; cost.provider = first.kind; }
    if (first.kind === 'compat') { const t0 = first.reader.totals; cost.json_mode = first.reader.mode; cost.bad_json = t0.badJson; cost.cut_off = t0.cutOff; cost.failures = t0.failures; }
    const p50 = (xs) => (xs.length ? xs[Math.floor(xs.length / 2)] : null), p95 = (xs) => (xs.length ? xs[Math.min(xs.length - 1, Math.floor(xs.length * 0.95))] : null);
    cost.p95_ms = p95(ms); cost.median_ms = p50(ms);
  }

  const result = {
    generated_at: new Date().toISOString(), generated_by: `node eval/run.js ${process.argv.slice(2).join(' ')}`,
    set: { file: args.set, format: set.format, messages: items.length, left_out: leftOut, labels_predate: set.predate, unknown_label_types: Object.fromEntries(Object.entries(set.unknown).map(([k, l]) => [k, l.length])), base: base ? base.how : null },
    reader: { spec: first.spec, label: first.reader && first.reader.label ? (first.kind === 'recorded' ? `recorded ${first.provenance.read_by} (${first.provenance.prompt_version})` : first.label) : first.label, provenance: first.provenance || null, paths: first.kind === 'recorded' ? first.reader.stats : null },
    crosscheck: second ? { spec: second.spec, label: second.kind === 'recorded' ? `recorded ${second.provenance.read_by} (${second.provenance.prompt_version}, second reader)` : second.label, provenance: second.provenance || null } : null,
    prompt: { version: PROMPT_VERSION, hash: hashText(buildReaderSystem(dir)), second_hash: hashText(buildReaderSystem(dir, { variant: 'second', closing: TWO_KEY_TYPES })) },
    warnings,
    ...sum,
    safety: safety(rows), newer_types: newer, effects, state, pipeline, ambiguous, baseline, cost,
    per_message: rows.map((r) => ({ id: r.id, exact: r.exact, found: r.tp.length, missed: r.fn, extra: r.fp, field_errors: r.fields.errors, outside: r.outside.length, for_person: r.forPerson,
      applied: r.applied, held: r.disputed.map((d) => ({ claim: `${d.claim.type} ${(d.claim.cases || []).join(', ')}`, reason: d.reason })), not_classified: r.notClassified, dropped: r.dropped,
      false_closings: r.falseClosings.map((f) => `${f.type} ${f.case}`), failed: r.failed, second_failed: r.secondFailed })),
  };

  // ---- save the raw answers of a live run, so that a paid run can be replayed offline
  if (args['save-reads'] && first.live) {
    const stamp = new Date().toISOString();
    const reads2 = kept.filter((x) => x.read.raw).map((x) => makeRecord({ id: String(x.it.raw.id), body_hash: null, context_hash: null }, x.read.raw));
    const { bodyHash, contextHash } = await import('../src/extract/recorded.js');
    kept.filter((x) => x.read.raw).forEach((x, i) => { reads2[i].body_hash = bodyHash(x.it.msg.body); reads2[i].context_hash = contextHash(x.it.msg, dir, x.it.ctx); const u = (x.read.usage || [])[0]; if (u) { reads2[i].usage = u.usage; reads2[i].cost_usd = u.costUsd; reads2[i].ms = u.ms; } });
    const incoming = buildRecordFile({ read_by: first.reader.model, harness: `eval/run.js, ${first.kind === 'openai' ? 'OpenAI Responses API' : first.kind === 'compat' ? `chat completions at ${first.reader.endpoint}, JSON mode ${first.reader.mode}` : 'Anthropic API'}, one request per message, structured output`, variant: 'primary', prompt_hash: first.reader.promptHash(dir), recorded_at: stamp, note: `Set ${args.set}` }, reads2);
    const out = abs(args['save-reads']);
    fs.writeFileSync(out, JSON.stringify(mergeRecords(fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null, incoming, 'primary'), null, 1));
    result.saved_reads = { file: args['save-reads'], reads: reads2.length };
    if (second && second.live) {
      const k2 = kept.filter((x) => x.read.raw2);
      const reads3 = k2.map((x) => { const r = makeRecord({ id: String(x.it.raw.id), body_hash: bodyHash(x.it.msg.body), context_hash: contextHash(x.it.msg, dir, x.it.ctx) }, x.read.raw2); const u = x.read.usage2; if (u) { r.usage = u.usage; r.cost_usd = u.costUsd; r.ms = u.ms; } return r; });
      const inc2 = buildRecordFile({ read_by: second.reader.model, harness: `eval/run.js, ${second.kind === 'openai' ? 'OpenAI Responses API' : second.kind === 'compat' ? `chat completions at ${second.reader.endpoint}, JSON mode ${second.reader.mode}` : 'Anthropic API'}, one request per message, structured output`, variant: 'second', prompt_hash: second.reader.promptHash(dir), recorded_at: stamp, note: `Set ${args.set}` }, reads3);
      fs.writeFileSync(out, JSON.stringify(mergeRecords(JSON.parse(fs.readFileSync(out, 'utf8')), inc2, 'second'), null, 1));
      result.saved_reads.second_reads = reads3.length;
    }
  }

  if (args.out) {
    const out = abs(args.out);
    const file = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { note: 'Reader evaluation runs. Written by eval/run.js. Each run records the exact command.', runs: {} };
    file.runs[`${path.basename(args.set)} | ${first.spec}${second ? ` x ${second.spec}` : ''}`] = result;
    fs.writeFileSync(out, JSON.stringify(file, null, 1));
  }
  if (args.json) console.log(JSON.stringify(result, null, 1));
  else {
    printReport(result, !!args.v);
    console.log();
    console.log(`JSON: ${JSON.stringify({ set: result.set.file, reader: result.reader.spec, crosscheck: result.crosscheck && result.crosscheck.spec, messages: result.messages.n, found: result.claims.found, missed: result.claims.missed, extra: result.claims.extra,
      precision: result.claims.precision.p, recall: result.claims.recall.p, f1: result.claims.f1, field_accuracy: result.fields.accuracy.p, exact_messages: result.messages.exact.p,
      false_closings: result.safety.false_closings.n, wrong_detail_closings: result.safety.closings_with_a_wrong_detail.n, no_effect_violations: effects ? effects.no_effect.with_effect.k : null, held_back: pipeline.held_back.n })}`);
    if (args.out) console.log(`Full result added to ${abs(args.out)}`);
    if (result.saved_reads) console.log(`Raw answers saved to ${abs(args['save-reads'])} (${result.saved_reads.reads} reads)`);
  }
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
