// Turns the raw results of the reader evaluation runs into the small table the web app shows.
//
//     node eval/summarize.js                      reads eval/reader_runs.json, writes eval/reader_results.json
//     node eval/summarize.js --add other.json     first merges the runs of another --out file into eval/reader_runs.json
//
// eval/reader_runs.json holds what `node eval/run.js ... --out eval/reader_runs.json` wrote for every
// run that was made: the command, the scores with their intervals, the cost. Nothing in it is
// rounded or selected. This script only chooses what to show and words it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abs = (p) => (path.isAbsolute(p) ? p : path.join(ROOT, p));
const RUNS = abs('eval/reader_runs.json'), OUT = abs('eval/reader_results.json');
const args = process.argv.slice(2);

// Paths of the machine a run was made on say nothing and may name a private folder.
const clean = (cmd) => String(cmd || '').replace(/--key-file\s+.*?(?=\s--|\s-v\b|$)/g, '--key-file <your key file>').replace(/--out\s+.*?(?=\s--|\s-v\b|$)/g, '--out eval/reader_runs.json').replace(/--save-reads\s+.*?(?=\s--|\s-v\b|$)/g, '--save-reads data/recorded_reads.json').replace(/\s-v\b/, '');

let store = fs.existsSync(RUNS) ? JSON.parse(fs.readFileSync(RUNS, 'utf8')) : { note: 'Every reader evaluation run that was made, as written by eval/run.js --out. Later runs of the same set and readers get a number.', runs: {} };
for (let i = 0; i < args.length; i += 1) {
  if (args[i] !== '--add') continue;
  const extra = JSON.parse(fs.readFileSync(abs(args[i + 1]), 'utf8'));
  for (const [key, run] of Object.entries(extra.runs || {})) {
    let k = key, n = 1;
    const same = (a, b) => a.generated_at === b.generated_at;
    while (store.runs[k] && !same(store.runs[k], run)) { n += 1; k = `${key} (run ${n})`; }
    store.runs[k] = { ...run, generated_by: clean(run.generated_by), saved_reads: undefined };
  }
}
if (args.includes('--add')) fs.writeFileSync(RUNS, JSON.stringify(store, null, 1));

const pct = (x) => `${(100 * x).toFixed(x > 0.995 || x < 0.005 ? 0 : 0)}%`;
const frac = (w, withInterval = true) => (w ? `${w.k} of ${w.n} (${pct(w.p)}${withInterval ? `, ${Math.round(100 * w.lo)} to ${Math.round(100 * w.hi)}` : ''})` : 'n/a');
const modelOf = (spec) => String(spec || '').replace(/^openai:/, '').replace(/^recorded:.*$/, 'recorded');

function rowOf(key, r) {
  const recorded = /^recorded:/.test(r.reader.spec);
  const first = recorded ? r.reader.provenance.read_by : r.reader.spec === 'rules' ? 'Offline pattern reader' : modelOf(r.reader.spec);
  const second = r.crosscheck ? (recorded ? r.crosscheck.provenance.read_by : modelOf(r.crosscheck.spec)) : null;
  const unsafe = r.safety.unsafe_closings && typeof r.safety.unsafe_closings.k === 'number' ? r.safety.unsafe_closings : r.safety.false_closings.of_closing_claims_read;
  const cost = r.cost && typeof r.cost.per_message_usd === 'number' ? r.cost.per_message_usd : null;
  return {
    key, set: r.set.format === 'unseen' ? 'unseen' : 'examples', messages: r.messages.n,
    reader: second ? `${first}, checked by ${second}` : first, first, second,
    kind: recorded ? 'recorded' : r.reader.spec === 'rules' ? 'offline' : 'live',
    found: frac(r.claims.recall), right: frac(r.claims.precision), exact: frac(r.messages.exact, false),
    wrong_closings: `${unsafe.k} of ${unsafe.n}`, wrong_closings_applied: (r.safety.false_closings.would_be_applied || 0) + ((r.safety.closings_with_a_wrong_detail && r.safety.closings_with_a_wrong_detail.would_be_applied) || 0),
    to_person: frac(r.pipeline.messages_for_a_person, false), failed_reads: r.pipeline.failed_reads,
    held_back: r.pipeline.held_back ? r.pipeline.held_back.n : null,
    cost_per_message: cost === null ? null : `$${cost.toFixed(cost < 0.001 ? 5 : 4)}`, cost_total: r.cost && typeof r.cost.total_usd === 'number' ? r.cost.total_usd : null,
    no_effect: r.effects && r.effects.no_effect ? `${r.effects.no_effect.with_effect.k} of ${r.effects.no_effect.with_effect.n}` : null,
    end_state: r.state && r.state.identical ? `${r.state.identical.k} of ${r.state.identical.n}` : null,
    without_ambiguous: r.ambiguous && r.ambiguous.recall ? { found: frac(r.ambiguous.recall), right: frac(r.ambiguous.precision) } : null,
    generated_at: r.generated_at, command: clean(r.generated_by),
    _: { recall: r.claims.recall, precision: r.claims.precision, exact: r.messages.exact, person: r.pipeline.messages_for_a_person, unsafe },
  };
}

const rows = Object.entries(store.runs).map(([k, r]) => rowOf(k, r));
// One row per reader and set for the table: the recorded pair first, then the offline reader, then
// the live runs by cost. Where the same readers ran twice, both runs are shown.
const order = (x) => (x.kind === 'recorded' ? 0 : x.kind === 'offline' ? 1 : x.second ? 2 : 3);
rows.sort((a, b) => (a.set === b.set ? order(a) - order(b) || String(a.generated_at).localeCompare(String(b.generated_at)) : a.set === 'unseen' ? -1 : 1));

const rec = rows.find((x) => x.kind === 'recorded' && x.set === 'unseen'), recEx = rows.find((x) => x.kind === 'recorded' && x.set === 'examples');
const off = rows.find((x) => x.kind === 'offline' && x.set === 'unseen');
const recRun = (set) => Object.values(store.runs).find((r) => /^recorded:/.test(r.reader.spec) && (r.set.format === 'unseen') === (set === 'unseen'));
const per_message = {};
for (const set of ['examples', 'unseen']) { const r = recRun(set); if (r) for (const m of r.per_message) per_message[m.id] = m; }
const spend = Object.values(store.runs).reduce((a, r) => a + ((r.cost && r.cost.total_usd) || 0), 0);
// What the recorded answers cost, from the usage stored with each one. Attempts that were cut off
// and read again are not in the record, so their cost is added from the runs that made it.
let recordedCost = null;
try {
  const file = JSON.parse(fs.readFileSync(abs('data/recorded_reads.json'), 'utf8'));
  const reads = Object.values(file.sets || { primary: file }).flatMap((x) => x.reads);
  const ids = new Set(reads.map((x) => x.id));
  recordedCost = { messages: ids.size, answers_usd: reads.reduce((a, x) => a + (x.cost_usd || 0), 0), median_ms: reads.map((x) => x.ms || 0).sort((a, b) => a - b)[Math.floor(reads.length / 2)] };
  recordedCost.per_message_usd = recordedCost.answers_usd / ids.size;
} catch { recordedCost = null; }
const prov = recRun('unseen') || recRun('examples');

const result = {
  title: 'How well the readers read',
  generated: new Date().toISOString(),
  recorded: prov ? { primary: prov.reader.provenance.read_by, second: prov.crosscheck.provenance.read_by, recorded_at: prov.reader.provenance.recorded_at, prompt_version: prov.reader.provenance.prompt_version, file: 'data/recorded_reads.json' } : null,
  headline: rec && off ? {
    unseen_n: rec.messages, offline_recall: pct(off._.recall.p), ai_recall: pct(rec._.recall.p), ai_precision: pct(rec._.precision.p),
    ai_found: rec.found, ai_right: rec.right, ai_to_person: rec.to_person, ai_wrong_closings: rec.wrong_closings, ai_cost: rec.cost_per_message,
    examples_found: recEx ? recEx.found : null, examples_to_person: recEx ? recEx.to_person : null,
  } : null,
  per_message,
  recorded_cost: recordedCost,
  rows: rows.map(({ _, ...x }) => (x.kind === 'recorded' && recordedCost ? { ...x, cost_per_message: `$${recordedCost.per_message_usd.toFixed(4)}` } : x)),
  spend_usd: Math.round(spend * 100) / 100,
  runs: rows.length,
};
// Notes written by hand live in eval/reader_notes.json, so that a rebuild keeps them.
const notesFile = abs('eval/reader_notes.json');
if (fs.existsSync(notesFile)) Object.assign(result, JSON.parse(fs.readFileSync(notesFile, 'utf8')));
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));

const w = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
console.log(`${rows.length} runs. Total cost of the paid runs listed: $${spend.toFixed(2)}.`);
console.log(`${w('set', 9)}${w('reader', 40)}${w('found', 28)}${w('right', 28)}${w('exact', 15)}${w('wrong cl.', 11)}${w('to person', 16)}${w('cut off', 8)}cost/msg`);
for (const x of rows) console.log(`${w(x.set, 9)}${w(x.reader, 40)}${w(x.found, 28)}${w(x.right, 28)}${w(x.exact, 15)}${w(x.wrong_closings, 11)}${w(x.to_person, 16)}${w(x.failed_reads, 8)}${x.cost_per_message || ''}`);
console.log(`Written: ${path.relative(ROOT, OUT)}`);
