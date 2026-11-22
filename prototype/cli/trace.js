// Observability for the AI readers, from the recorded reads.
//
//     node cli/trace.js                     summary per model, health of the pair, alerts
//     node cli/trace.js --out traces.jsonl  also write one trace record per model call
//     node cli/trace.js --file <records>    use another record file (default data/recorded_reads.json)
//
// The trace records use OpenTelemetry's attribute names for generative AI (gen_ai.*) and carry
// no message text: hashes and counts only. See src/telemetry.js.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './load.js';
import { spansFromRecords, summarize, pairHealth, alerts, toJsonl, THRESHOLDS } from '../src/telemetry.js';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
const file = opt('--file') || path.join(ROOT, 'data/recorded_reads.json');
if (!fs.existsSync(file)) { console.error(`There is no record file at ${file}.`); process.exit(2); }
const recorded = JSON.parse(fs.readFileSync(file, 'utf8'));
let perMessage = null;
try { perMessage = JSON.parse(fs.readFileSync(path.join(ROOT, 'eval/reader_results.json'), 'utf8')).per_message || null; } catch { perMessage = null; }

const spans = spansFromRecords(recorded);
const s = summarize(spans), p = pairHealth(recorded, opt('--file') ? null : perMessage), a = alerts(s, p);
const pct = (x) => (x === null || x === undefined ? 'n/a' : `${(100 * x).toFixed(0)}%`);
const sec = (ms) => (ms === null ? 'n/a' : `${(ms / 1000).toFixed(1)} s`);
const line = (...c) => console.log(`| ${c.join(' | ')} |`);

console.log(`MODEL CALLS: ${s.calls} calls for ${s.messages} messages, ${s.costUsd === null ? 'cost not known' : `$${s.costUsd.toFixed(4)} in all, $${s.costPerMessage.toFixed(5)} per message`}`);
line('Role', 'Model', 'Provider', 'Calls', 'Failed', 'Input tokens', 'From cache', 'Output tokens', 'Of which reasoning', 'Cost', 'Per call', 'Median', '95th percentile', 'Slowest', 'Instructions');
for (const m of s.byModel) line(m.role, m.model, m.provider, m.calls, m.errors, m.inputTokens, pct(m.cacheShare), m.outputTokens, m.reasoningTokens, m.costUsd === null ? 'n/a' : `$${m.costUsd.toFixed(4)}`, m.costPerCall === null ? 'n/a' : `$${m.costPerCall.toFixed(5)}`, sec(m.p50Ms), sec(m.p95Ms), sec(m.maxMs), `${m.promptVersion} ${m.promptHash}`);

console.log('\nHEALTH OF THE PAIR');
line('Messages read by both readers', p.messagesReadByBoth);
line('Of those, with statements that need two keys', p.messagesWithClosingStatements);
line('The two readers agree on every such statement', `${p.messagesWherePairAgrees} (${pct(p.agreement)})`);
line('Closing statements of the first reader confirmed by the second', `${p.closingStatementsConfirmed} of ${p.closingStatements} (${pct(p.confirmedShare)})`);
if (typeof p.scored === 'number') {
  line('Messages scored against labels', p.scored);
  line('Sent to a person because of the reading', `${p.toPerson} (${pct(p.toPersonShare)})`);
  line('Reads that failed', p.failedReads);
  line('Statements the code guard refused', p.droppedByGuard);
  line('Wrong closings', p.wrongClosings);
}

console.log(`\nALERTS (limits: ${Object.entries(THRESHOLDS).map(([k, v]) => `${k} ${v}`).join(', ')})`);
if (!a.length) console.log('none');
for (const x of a) console.log(`- ${x.code}: ${x.text}`);

const out = opt('--out');
if (out) { fs.writeFileSync(out, toJsonl(spans)); console.log(`\nWrote ${spans.length} trace records to ${out}. They contain no message text.`); }
