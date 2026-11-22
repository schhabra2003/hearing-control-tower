// OBSERVABILITY for the AI readers: one trace record per model call, a summary per model, the
// health of the reader pair, and alerts.
//
// Why this exists: the readers are the only part of the tower that is not deterministic, so they
// are the part that can drift without anything "breaking". A model version changes, a provider
// gets slow, a prompt edit makes the two readers disagree more often. None of that throws an
// error. It shows up only as numbers moving: cost, latency, cut-off answers, how often the two
// readers disagree, how many messages go to a person. This module turns the raw records into
// those numbers, so that they can be watched and alarmed on.
//
// The trace records use the attribute names of the OpenTelemetry conventions for generative AI
// (gen_ai.*), so any tracing backend that speaks OpenTelemetry can take them. Those conventions
// were still marked "Development" in late 2026 (research/09): expect renames, and pin a version
// before wiring a backend. The cost has no standard attribute: it is computed here.
//
// PRIVACY: a trace record never contains the text of a message, the instructions or the answer.
// Messages are homeowners' and consultants' mail. A record carries hashes and counts only. The
// text stays in the evidence ledger, which has its own access rules.
//
// Pure functions, no I/O: the same code runs in the browser, in the checks and in cli/trace.js.

import { TWO_KEY_TYPES } from './extract/crosscheck.js';

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const quantile = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : null);

// The provider is not stored with a record. It follows from the harness line of the provenance.
export function providerOf(provenance = {}) {
  const h = String(provenance.harness || '');
  if (/OpenAI/i.test(h)) return 'openai';
  if (/Anthropic/i.test(h)) return 'anthropic';
  const m = /chat completions at https?:\/\/([^/,\s]+)/i.exec(h);
  return m ? m[1] : 'unknown';
}

// One span per model call. `recorded` is a record file (data/recorded_reads.json).
export function spansFromRecords(recorded) {
  const sets = recorded && recorded.sets ? recorded.sets : recorded && recorded.reads ? { primary: recorded } : {};
  const spans = [];
  for (const [role, set] of Object.entries(sets)) {
    const p = set.provenance || {};
    for (const r of set.reads || []) {
      const u = r.usage || {};
      const cached = num(u.input_tokens_details && u.input_tokens_details.cached_tokens) + num(u.cache_read_input_tokens);
      const claims = Array.isArray(r.claims) ? r.claims : [];
      spans.push({
        name: `chat ${p.read_by || 'unknown'}`,
        start_time: p.recorded_at || null,
        duration_ms: typeof r.ms === 'number' ? r.ms : null,
        status: r.failed ? 'error' : 'ok',
        attributes: {
          'gen_ai.operation.name': 'chat',
          'gen_ai.provider.name': providerOf(p),
          'gen_ai.request.model': p.read_by || 'unknown',
          'gen_ai.usage.input_tokens': num(u.input_tokens),
          'gen_ai.usage.output_tokens': num(u.output_tokens),
          'gen_ai.usage.cache_read.input_tokens': cached,
          'tower.usage.reasoning_tokens': num(u.output_tokens_details && u.output_tokens_details.reasoning_tokens),
          'tower.cost_usd': typeof r.cost_usd === 'number' ? r.cost_usd : null,
          'tower.reader.role': role,
          'tower.prompt.version': p.prompt_version || null,
          'tower.prompt.hash': p.prompt_hash || null,
          'tower.schema.hash': p.schema_hash || null,
          'tower.message.id': String(r.id),
          'tower.message.body_hash': r.body_hash || null,
          'tower.message.context_hash': r.context_hash || null,
          'tower.answer.statements': claims.length,
          'tower.answer.closing_statements': claims.filter((c) => TWO_KEY_TYPES.includes(c.type)).length,
          'tower.answer.unplaced_passages': Array.isArray(r.unclassified) ? r.unclassified.length : 0,
        },
      });
    }
  }
  return spans;
}

// One line per span: the format log shippers and tracing backends take.
export const toJsonl = (spans) => spans.map((s) => JSON.stringify(s)).join('\n') + (spans.length ? '\n' : '');

// Per model and role: calls, tokens, cost, latency.
export function summarize(spans) {
  const groups = new Map();
  for (const s of spans) {
    const a = s.attributes, key = `${a['tower.reader.role']}|${a['gen_ai.request.model']}`;
    if (!groups.has(key)) groups.set(key, { role: a['tower.reader.role'], model: a['gen_ai.request.model'], provider: a['gen_ai.provider.name'], promptHash: a['tower.prompt.hash'], promptVersion: a['tower.prompt.version'], calls: 0, errors: 0, inputTokens: 0, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0, costUsd: 0, priced: 0, ms: [] });
    const g = groups.get(key);
    g.calls += 1; if (s.status !== 'ok') g.errors += 1;
    g.inputTokens += a['gen_ai.usage.input_tokens']; g.cachedTokens += a['gen_ai.usage.cache_read.input_tokens'];
    g.outputTokens += a['gen_ai.usage.output_tokens']; g.reasoningTokens += a['tower.usage.reasoning_tokens'];
    if (typeof a['tower.cost_usd'] === 'number') { g.costUsd += a['tower.cost_usd']; g.priced += 1; }
    if (typeof s.duration_ms === 'number') g.ms.push(s.duration_ms);
  }
  const byModel = [...groups.values()].map((g) => {
    const ms = g.ms.slice().sort((x, y) => x - y);
    return { role: g.role, model: g.model, provider: g.provider, promptVersion: g.promptVersion, promptHash: g.promptHash, calls: g.calls, errors: g.errors,
      inputTokens: g.inputTokens, cachedTokens: g.cachedTokens, cacheShare: g.inputTokens ? g.cachedTokens / g.inputTokens : 0, outputTokens: g.outputTokens, reasoningTokens: g.reasoningTokens,
      costUsd: g.priced === g.calls ? g.costUsd : null, costPerCall: g.priced === g.calls && g.calls ? g.costUsd / g.calls : null,
      p50Ms: quantile(ms, 0.5), p95Ms: quantile(ms, 0.95), maxMs: ms.length ? ms[ms.length - 1] : null };
  });
  const all = byModel.every((m) => m.costUsd !== null);
  const messages = new Set(spans.map((s) => s.attributes['tower.message.id'])).size;
  const costUsd = all ? byModel.reduce((n, m) => n + m.costUsd, 0) : null;
  return { byModel, calls: spans.length, messages, costUsd, costPerMessage: costUsd !== null && messages ? costUsd / messages : null };
}

// Health of the pair. The two readers answer different questions (the second reports only
// statements that need two keys), so agreement is measured on those statements only.
//   recorded     the record file with both sets
//   perMessage   optional: eval/reader_results.json per_message, for what went to a person
export function pairHealth(recorded, perMessage = null) {
  const sets = (recorded && recorded.sets) || {};
  const first = new Map(((sets.primary || {}).reads || []).map((r) => [String(r.id), r]));
  const second = new Map(((sets.second || {}).reads || []).map((r) => [String(r.id), r]));
  const keys = (r) => new Set((r.claims || []).filter((c) => TWO_KEY_TYPES.includes(c.type)).flatMap((c) => (c.cases || []).map((id) => `${c.type}|${id}`)));
  let both = 0, withClosing = 0, agree = 0, statements = 0, confirmed = 0;
  for (const [id, a] of first) {
    const b = second.get(id);
    if (!b) continue;
    both += 1;
    const ka = keys(a), kb = keys(b);
    if (!ka.size && !kb.size) continue;
    withClosing += 1;
    const same = ka.size === kb.size && [...ka].every((k) => kb.has(k));
    if (same) agree += 1;
    statements += ka.size; confirmed += [...ka].filter((k) => kb.has(k)).length;
  }
  const out = { messagesReadByBoth: both, messagesWithClosingStatements: withClosing, messagesWherePairAgrees: agree, agreement: withClosing ? agree / withClosing : null,
    closingStatements: statements, closingStatementsConfirmed: confirmed, confirmedShare: statements ? confirmed / statements : null };
  if (perMessage) {
    const rows = Object.values(perMessage);
    out.scored = rows.length;
    out.toPerson = rows.filter((r) => r.for_person).length;
    out.toPersonShare = rows.length ? out.toPerson / rows.length : null;
    out.failedReads = rows.filter((r) => r.failed).length;
    out.droppedByGuard = rows.reduce((n, r) => n + num(r.dropped), 0);
    out.wrongClosings = rows.reduce((n, r) => n + ((r.false_closings || []).length), 0);
  }
  return out;
}

// Thresholds a small team can live with. Each alert says what moved and what to look at.
export const THRESHOLDS = { toPersonShare: 0.35, agreement: 0.6, p95Ms: 30000, costPerMessage: 0.02, errorShare: 0.02, cacheShare: 0.5 };
export function alerts(summary, pair = {}, limits = THRESHOLDS) {
  const out = [];
  const pct = (x) => `${Math.round(100 * x)}%`;
  if (typeof pair.toPersonShare === 'number' && pair.toPersonShare > limits.toPersonShare) out.push({ code: 'TO_PERSON', text: `${pct(pair.toPersonShare)} of messages went to a person because of the reading (limit ${pct(limits.toPersonShare)}). Look at the newest disagreements: a prompt or model change is the usual cause.` });
  if (typeof pair.agreement === 'number' && pair.agreement < limits.agreement) out.push({ code: 'AGREEMENT', text: `The two readers agreed on ${pct(pair.agreement)} of messages with closing statements (limit ${pct(limits.agreement)}).` });
  if (typeof pair.wrongClosings === 'number' && pair.wrongClosings > 0) out.push({ code: 'WRONG_CLOSING', text: `${pair.wrongClosings} wrong closing${pair.wrongClosings === 1 ? '' : 's'} on labelled messages. Each one is read by a person and added to the test set.` });
  if (typeof summary.costPerMessage === 'number' && summary.costPerMessage > limits.costPerMessage) out.push({ code: 'COST', text: `Reading costs $${summary.costPerMessage.toFixed(4)} per message (limit $${limits.costPerMessage.toFixed(2)}).` });
  for (const m of summary.byModel || []) {
    if (typeof m.p95Ms === 'number' && m.p95Ms > limits.p95Ms) out.push({ code: 'SLOW', text: `${m.model} (${m.role}): 1 call in 20 takes longer than ${(m.p95Ms / 1000).toFixed(1)} seconds (limit ${limits.p95Ms / 1000}).` });
    if (m.calls && m.errors / m.calls > limits.errorShare) out.push({ code: 'ERRORS', text: `${m.model} (${m.role}): ${m.errors} of ${m.calls} calls failed.` });
    if (m.calls >= 20 && m.cacheShare < limits.cacheShare) out.push({ code: 'CACHE', text: `${m.model} (${m.role}): only ${pct(m.cacheShare)} of input tokens came from the provider's cache. The instructions may have changed between calls.` });
  }
  return out;
}
