// EXTRACT stage, recorded reads: run the AI reader's saved output offline.
//
// Why: the prototype must be usable with no API key, and a replay must be repeatable. A model's
// answers are therefore recorded once, together with who produced them and with which prompt,
// and replayed from the record. The record holds the RAW output of the model. The code guard
// (normalizeClaims) runs every time a record is used, exactly as it does on a live answer.
//
// Pure module: no Node imports. Reading and writing the JSON files is done by eval/run.js.
//
// Record file (JSON), one reader per set:
//   {
//     "format": "hearing-control-tower/recorded-reads@1",
//     "provenance": {
//       "read_by":        "claude-opus-5-5",          the model, or a description of whoever read
//       "harness":        "how the reads were made (API, agent, by hand)",
//       "variant":        "primary" | "second",
//       "prompt_version": "reader-1",
//       "prompt_hash":    hashText(system prompt),     which instructions produced the reads
//       "schema_hash":    hashText(JSON schema),
//       "recorded_at":    ISO time,
//       "note":           free text
//     },
//     "reads": [ { "id": "17", "body_hash": "...", "context_hash": "...",
//                  "claims": [ ... ], "unclassified": [ ... ],
//                  optional: "read_by", "prompt_hash", "recorded_at", "usage", "cost_usd", "ms" } ]
//   }
// One file may hold both readers: { "format": ..., "sets": { "primary": { provenance, reads },
// "second": { provenance, reads } } }.

import { PROMPT_VERSION, READER_SCHEMA, buildReaderSystem, buildReaderInput, normalizeClaims, hashText } from './prompt.js';
import { TWO_KEY_TYPES } from './crosscheck.js';

export const RECORD_FORMAT = 'hearing-control-tower/recorded-reads@1';
export const PACK_FORMAT = 'hearing-control-tower/read-pack@1';
export const SCHEMA_HASH = hashText(JSON.stringify(READER_SCHEMA));

const flat = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
export const bodyHash = (body) => hashText(flat(body));
// The same message in the same situation, whatever its id: sender check, channel, time, the
// thread's cases with their official facts, and the body.
export const contextHash = (msg, dir, ctx) => hashText(buildReaderInput(msg, dir, ctx).replace(/^message id: .*$/m, ''));
export const messageKey = (id, body) => `${String(id)}|${bodyHash(body)}`;

const systemFor = (dir, variant) => buildReaderSystem(dir, variant === 'second' ? { variant: 'second', closing: TWO_KEY_TYPES } : {});

const OUTPUT_RULES = `Answer with one JSON object and nothing else: no explanation before or after it, no code fence.
The object must be valid against this JSON schema (no other keys; leave out optional fields the message does not state):`;

// Everything needed to read ONE message outside the API (for example by an agent): the stable
// instructions, the per-message input and the output schema, and all three joined as one text.
//   msg, ctx: from engine.prepare(raw message).  opts.variant: 'primary' (default) or 'second'.
export function renderReadTask(msg, dir, ctx, { variant = 'primary' } = {}) {
  const system = systemFor(dir, variant);
  const input = buildReaderInput(msg, dir, ctx);
  const text = `${system}\n\n## Output format\n${OUTPUT_RULES}\n${JSON.stringify(READER_SCHEMA)}\n\n----------\n\n${input}`;
  return {
    id: String(msg.id), variant, system, input, schema: READER_SCHEMA, text,
    prompt_version: PROMPT_VERSION, prompt_hash: hashText(system), schema_hash: SCHEMA_HASH,
    body_hash: bodyHash(msg.body), context_hash: contextHash(msg, dir, ctx),
  };
}

// A pack of read tasks for many messages. The instructions are stored once.
//   items: [{ msg, ctx }]
export function buildReadPack(items, dir, { variant = 'primary', note = '' } = {}) {
  const system = systemFor(dir, variant);
  return {
    format: PACK_FORMAT, variant, prompt_version: PROMPT_VERSION, prompt_hash: hashText(system), schema_hash: SCHEMA_HASH, note,
    how_to_read: 'For each task, give the reader the text of "system", then "output_rules" followed by "schema", then the task\'s "input". One task per request, with no memory of other tasks and no tools. Save the JSON object it returns under the task id.',
    system, output_rules: OUTPUT_RULES, schema: READER_SCHEMA,
    tasks: items.map(({ msg, ctx }) => ({ id: String(msg.id), body_hash: bodyHash(msg.body), context_hash: contextHash(msg, dir, ctx), input: buildReaderInput(msg, dir, ctx) })),
  };
}
export const taskText = (pack, task) => `${pack.system}\n\n## Output format\n${pack.output_rules}\n${JSON.stringify(pack.schema)}\n\n----------\n\n${task.input}`;

// Turn a reader's raw answer (an object, or text that contains one JSON object) into { claims, unclassified }.
// Returns null when no JSON object can be found.
export function parseReaderOutput(output) {
  if (output && typeof output === 'object') return Array.isArray(output) ? { claims: output, unclassified: [] } : output;
  const s = String(output ?? '').trim();
  const tries = [s, s.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim()];
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) tries.push(s.slice(a, b + 1));
  for (const t of tries) { try { const o = JSON.parse(t); if (o && typeof o === 'object') return Array.isArray(o) ? { claims: o, unclassified: [] } : o; } catch { /* next */ } }
  return null;
}

// One entry of "reads", from a task (renderReadTask or a pack task) and the reader's raw answer.
export function makeRecord(task, output, extra = {}) {
  const parsed = parseReaderOutput(output);
  const read = { id: String(task.id), body_hash: task.body_hash, context_hash: task.context_hash || null };
  if (!parsed || !Array.isArray(parsed.claims)) return { ...read, claims: [], unclassified: [], failed: 'The answer was not a JSON object with a list of claims.', ...extra };
  return { ...read, claims: parsed.claims, unclassified: Array.isArray(parsed.unclassified) ? parsed.unclassified : [], ...extra };
}

export function buildRecordFile({ read_by, harness, variant = 'primary', prompt_hash, prompt_version = PROMPT_VERSION, schema_hash = SCHEMA_HASH, recorded_at, note = '' }, reads) {
  if (!read_by || !harness || !prompt_hash || !recorded_at) throw new Error('buildRecordFile: read_by, harness, prompt_hash and recorded_at are required, so that every recorded read can be traced.');
  return { format: RECORD_FORMAT, provenance: { read_by, harness, variant, prompt_version, prompt_hash, schema_hash, recorded_at, note }, reads };
}

const setOf = (file, set) => (file && file.sets ? file.sets[set] || null : set === 'primary' || !set ? file : null);

// Problems stop the file from being used. Warnings are worth showing next to any result.
//   opts.dir: when given, the recorded prompt hash is compared with today's instructions.
export function checkRecordFile(file, { dir = null, set = 'primary' } = {}) {
  const problems = [], warnings = [];
  if (!file || typeof file !== 'object') return { ok: false, problems: ['Not a record file.'], warnings };
  if (file.format !== RECORD_FORMAT) problems.push(`Unknown format "${file.format}" (expected ${RECORD_FORMAT}).`);
  const s = setOf(file, set);
  if (!s) return { ok: false, problems: [...problems, `The file has no "${set}" set.`], warnings };
  const p = s.provenance || {};
  for (const k of ['read_by', 'harness', 'variant', 'prompt_version', 'prompt_hash', 'recorded_at']) if (!p[k]) problems.push(`provenance.${k} is missing.`);
  if (!Array.isArray(s.reads)) return { ok: false, problems: [...problems, '"reads" must be a list.'], warnings };
  const seen = new Set();
  s.reads.forEach((r, i) => {
    const at = `read ${i + 1}${r && r.id !== undefined ? ` (id ${r.id})` : ''}`;
    if (!r || r.id === undefined || !r.body_hash) { problems.push(`${at}: id and body_hash are required.`); return; }
    if (!Array.isArray(r.claims)) problems.push(`${at}: claims must be a list.`);
    const k = `${r.id}|${r.body_hash}`;
    if (seen.has(k)) warnings.push(`${at}: recorded twice. The first one is used.`);
    seen.add(k);
    if (r.failed) warnings.push(`${at}: the reader's answer could not be used (${r.failed}).`);
  });
  if (dir && p.prompt_hash) {
    const now = hashText(systemFor(dir, p.variant));
    const other = new Set(s.reads.map((r) => r.prompt_hash || p.prompt_hash).filter((h) => h !== now));
    if (other.size) warnings.push(`${s.reads.filter((r) => (r.prompt_hash || p.prompt_hash) !== now).length} of ${s.reads.length} reads were made with other instructions than today's (recorded ${[...other].join(', ')}, today ${now}). They show how that version read, not how the current one would.`);
  }
  if (p.schema_hash && p.schema_hash !== SCHEMA_HASH) warnings.push('The output schema has changed since these reads were recorded.');
  return { ok: !problems.length, problems, warnings };
}

// A synchronous reader over recorded reads, for engine.ingest and readMessageSync.
//   records: a record file (see the top of this file).
//   opts.fallback: reader used for a message that has no record (usually the rules reader).
//   opts.set: 'primary' (default) or 'second'.
// The returned function gives the claims that passed the guard, as a list with two extra
// properties (dropped, unclassified) that the pipeline in crosscheck.js picks up. After every
// call, reader.label says which path answered and reader.last holds the details.
export function makeRecordedReader(records, { fallback = null, set = 'primary' } = {}) {
  const s = setOf(records, set);
  if (!s || !Array.isArray(s.reads)) throw new Error(`makeRecordedReader: the record file has no "${set}" reads.`);
  const prov = s.provenance || {};
  const byKey = new Map(), byContext = new Map();
  for (const r of s.reads) {
    const k = `${String(r.id)}|${r.body_hash}`;
    if (!byKey.has(k)) byKey.set(k, r);
    if (r.context_hash && !byContext.has(r.context_hash)) byContext.set(r.context_hash, r);
  }
  const name = `recorded ${prov.read_by || 'reads'} (${prov.prompt_version || 'prompt unknown'}${prov.variant === 'second' ? ', second reader' : ''})`;
  let today = null;

  function reader(msg, dir, ctx) {
    const ch = contextHash(msg, dir, ctx);
    let rec = byKey.get(messageKey(msg.id, msg.body)), path = 'recorded';
    if (!rec && byContext.has(ch)) { rec = byContext.get(ch); path = 'recorded, matched by content'; }
    if (!rec) {
      if (!fallback) {
        reader.stats.missing += 1;
        reader.label = `${name}: no record for this message`;
        reader.last = { path: 'missing', record: null, dropped: [], unclassified: [], fixed: [], contextChanged: false, stale: false };
        return Object.assign([], { dropped: [{ claim: null, reason: 'There is no recorded read for this message, and no other reader was set.' }], unclassified: [] });
      }
      const out = fallback(msg, dir, ctx);
      reader.stats.fallback += 1;
      reader.label = `${fallback.label || 'rules'} (no recorded read for this message)`;
      reader.last = { path: 'fallback', record: null, dropped: (out && out.dropped) || [], unclassified: (out && out.unclassified) || [], fixed: [], contextChanged: false, stale: false };
      return out;
    }
    if (today === null) today = hashText(systemFor(dir, prov.variant));
    const stale = (rec.prompt_hash || prov.prompt_hash) !== today;
    // The situation differs from the one the read was made in (for example another official date
    // at that moment). The read is still used, and the difference is reported.
    const contextChanged = !!rec.context_hash && rec.context_hash !== ch;
    const g = normalizeClaims({ claims: rec.claims, unclassified: rec.unclassified || [] }, msg, dir, ctx);
    const dropped = rec.failed ? [{ claim: null, reason: `The recorded answer could not be used: ${rec.failed}` }, ...g.dropped] : g.dropped;
    reader.stats[path === 'recorded' ? 'recorded' : 'byContent'] += 1;
    if (contextChanged) reader.stats.contextChanged += 1;
    if (stale) reader.stats.stale += 1;
    reader.label = `${path === 'recorded' ? name : `${name}, matched by content`}${stale ? ', older instructions' : ''}`;
    reader.last = { path, record: rec, dropped, unclassified: g.unclassified, fixed: g.fixed, contextChanged, stale };
    return Object.assign(g.claims, { dropped, unclassified: g.unclassified });
  }
  reader.label = name;
  reader.provenance = prov;
  reader.size = s.reads.length;
  reader.stats = { recorded: 0, byContent: 0, fallback: 0, missing: 0, contextChanged: 0, stale: 0 };
  reader.last = null;
  reader.has = (msg) => byKey.has(messageKey(msg.id, msg.body));
  return reader;
}
