// Splits of the auto-file analysis on the second unseen set. No model call, no key.
//   node runner/analyse_unseen2.mjs <proto folder> <key_status.json> [author_key.json]
// Reads <proto>/eval/autofile_unseen2.json (written by eval/autofile.js --set ... --out ...),
// <proto>/data/unseen2.json, <proto>/eval/autofile.json (first unseen set, for the pooled figure)
// and <proto>/eval/reader_runs_unseen2.json (the recorded scoring run, for the count handed to a person).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [proto, statusFile, authorFile] = process.argv.slice(2);
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const { wilson } = await import(pathToFileURL(path.join(proto, 'src/stats.js')).href);
const A = J(path.join(proto, 'eval/autofile_unseen2.json')), S = A.extra_set;
const set = J(path.join(proto, 'data/unseen2.json'));
const status = J(statusFile).statements;
const msgs = new Map(set.messages.map((m) => [m.id, m]));
const W = (k, n) => { if (!n) return `${k} of ${n}`; const w = wilson(k, n); return `${k} of ${n} (${(100 * k / n).toFixed(1)}%, 95% interval ${(100 * w.lo).toFixed(1)}% to ${(100 * w.hi).toFixed(1)}%)`; };
const senderType = (id) => ({ government: 'office', consultant: 'consultant' }[A.roles[id]] || 'other');
const rows = S.every_reading;
const passed = rows.filter((x) => x.agreed && x.passed);
const keyStatus = (x) => { const s = (status[x.message] || []).find((k) => k.type === x.type && k.case === x.case); return s ? s.status : 'not in the key'; };
console.log(`Messages in the set: ${S.messages}. Without a recorded read: ${S.messages_without_a_recorded_read}.`);
console.log(`Closing readings in the key: ${S.closing_readings_in_the_answer_key}. Agreed by both readers: ${S.agreed_by_both_readers}. Agreed and passed by the verifier: ${passed.length}.`);
console.log(`Right, of agreed and passed: ${W(passed.filter((x) => x.right).length, passed.length)}. Wrong: ${passed.filter((x) => !x.right).length}.`);
const split = (title, f, order) => { console.log(`\n${title}`); for (const k of order) { const l = passed.filter((x) => f(x) === k); console.log(`  ${k}: right ${W(l.filter((x) => x.right).length, l.length)}, wrong ${l.filter((x) => !x.right).length}`); } };
split('By sender type (as checked by code: government is office; homeowner and firm are other)', (x) => senderType(x.message), ['office', 'consultant', 'other']);
split('By key status of the statement', keyStatus, ['both', 'adjudicated', 'not in the key']);
console.log('\nWrong agreed-and-passed readings');
for (const x of passed.filter((y) => !y.right)) {
  const m = msgs.get(x.message);
  console.log(`- ${x.message} (${senderType(x.message)}, ${m.sender}, ${m.channel}): proposed ${x.type} for ${x.case}; key status ${keyStatus(x)}. ${x.difference}`);
  console.log(`  Reader's words: "${x.quote}"`);
  console.log(`  Key for this message: ${JSON.stringify(m.claims)}`);
  console.log(`  Ambiguous in the key: ${m.ambiguous === true}${m.ambiguous_why ? `. ${m.ambiguous_why}` : ''}`);
  console.log(`  Message: ${JSON.stringify(m.body)}`);
}
const np = S.agreed_but_not_passed;
console.log(`\nAgreed but not passed by the verifier: ${np.n} (${JSON.stringify(np.by_verifier_result)}), of which right against the key ${np.right_against_the_answer_key}.`);
console.log(`Held back because only one reader found them or they disagree: ${S.held_back_for_a_person.n}; in the key ${S.held_back_for_a_person.in_the_answer_key}, not in the key ${S.held_back_for_a_person.not_in_the_answer_key}.`);
// Messages that carry no proof: the key gives an empty list.
const empty = set.messages.filter((m) => Array.isArray(m.claims) && m.claims.length === 0).map((m) => m.id);
const onEmpty = rows.filter((x) => empty.includes(x.message));
console.log(`\nMessages with an empty list in the key: ${empty.length}. Closing readings proposed on them: ${onEmpty.length}; agreed and passed (false proposals that would file): ${onEmpty.filter((x) => x.agreed && x.passed).length}; held back or not passed: ${onEmpty.filter((x) => !(x.agreed && x.passed)).length}.`);
for (const x of onEmpty) console.log(`  ${x.message} ${x.type} ${x.case} agreed ${x.agreed} passed ${!!x.passed}`);
if (authorFile) {
  const np10 = J(authorFile).messages.filter((m) => /no_proof|ambiguous/.test(m.bucket)).map((m) => m.id);
  const on10 = rows.filter((x) => np10.includes(x.message));
  console.log(`The author's ${np10.length} no-proof or ambiguous messages (${np10.join(', ')}): closing readings proposed ${on10.length}; agreed and passed ${on10.filter((x) => x.agreed && x.passed).length}, of which wrong against the key ${on10.filter((x) => x.agreed && x.passed && !x.right).length}.`);
  for (const x of on10) console.log(`  ${x.message} ${x.type} ${x.case} agreed ${x.agreed} passed ${!!x.passed} right ${!!x.right}`);
}
// The scoring run (eval/run.js on the recorded file): statements and the count handed to a person.
const runsFile = path.join(proto, 'eval/reader_runs_unseen2.json');
if (fs.existsSync(runsFile)) {
  const R = Object.entries(J(runsFile).runs).filter(([k]) => /recorded:/.test(k)).map(([, v]) => v).pop();
  if (R) {
    console.log(`\nScoring run (${R.generated_by}): messages ${R.messages.n}; statements found ${R.claims.found}, missed ${R.claims.missed}, extra ${R.claims.extra}.`);
    const fp = R.per_message.filter((m) => m.for_person);
    console.log(`Messages handed to a person because of the reading: ${W(fp.length, R.messages.n)}.`);
    const by = {}; for (const m of R.per_message) { const t = senderType(m.id); by[t] = by[t] || { n: 0, p: 0, found: 0, missed: 0, extra: 0 }; by[t].n += 1; by[t].p += m.for_person ? 1 : 0; by[t].found += m.found; by[t].missed += m.missed.length; by[t].extra += m.extra.length; }
    for (const [t, v] of Object.entries(by)) console.log(`  ${t}: ${v.n} messages, to a person ${v.p}; statements found ${v.found}, missed ${v.missed}, extra ${v.extra}`);
    const st = { both: [0, 0], adjudicated: [0, 0] };
    for (const m of R.per_message) for (const k of status[m.id] || []) { const miss = m.missed.some((x) => x.startsWith(`${k.type}|${k.case}|`)); st[k.status][miss ? 1 : 0] += 1; }
    console.log(`  Key statements marked both: found ${st.both[0]}, missed ${st.both[1]}. Marked adjudicated: found ${st.adjudicated[0]}, missed ${st.adjudicated[1]}.`);
    const e = R.per_message.filter((m) => empty.includes(m.id));
    console.log(`  On the ${empty.length} messages with an empty key: statements of any type applied on ${e.filter((m) => m.extra.length).length} messages (${e.filter((m) => m.extra.length).map((m) => `${m.id}: ${m.extra.join(', ')}`).join('; ') || 'none'}); handed to a person ${e.filter((m) => m.for_person).length}.`);
  }
}
// Pooled with the first unseen set (30 office messages, one labeller, written to be hard).
const F = J(path.join(proto, 'eval/autofile.json')).unseen_30;
const r1 = F.of_agreed_and_passed.right, k2 = passed.filter((x) => x.right).length;
console.log(`\nFirst unseen set (30 messages): right ${W(r1.k, r1.n)} of those the key can judge; strict ${W(F.strict_count_unjudged_as_wrong.right.k, F.strict_count_unjudged_as_wrong.right.n)}.`);
console.log(`Second unseen set: right ${W(k2, passed.length)}.`);
console.log(`Pooled: right ${W(r1.k + k2, r1.n + passed.length)}; strict ${W(F.strict_count_unjudged_as_wrong.right.k + k2, F.strict_count_unjudged_as_wrong.right.n + passed.length)}.`);
console.log('The two sets were written differently: the first holds 30 office messages written to be hard, with one labeller; the second holds 100 messages in an everyday mix of senders, with two blind labellers and an adjudicator. The pooled figure mixes them and is not a rate for either.');
