// What reading adds to the scale results.
//
// The scale runs (cli/scale.js) simulate people who write in wording the offline reader knows,
// so almost no message needs a person just to find out what it says. Real reading is not that
// good: on the two labelled sets the two AI readers sent 15% and 27% of the messages to a person
// (a statement only one reader found, a passage neither could place). This script puts the two
// measurements together: messages per hearing from the scale runs, the share that needs a person
// from the reader runs, and a time for each such message. It is arithmetic, not a simulation,
// and it says so on the page.
//
//     node cli/reading.js          adds the table to eval/scale.json (cli/scale.js does this itself)
//
// Try the two AI readers on a message of your own (added in round 15):
//
//     node cli/reading.js --try "I accept both. See you Tuesday." --from "Owen Tarris" --about "120 Garden Street, Velloran; 138 Garden Street, Velloran"
//     node cli/reading.js --try --example 62        the recorded reading of example message 62, no key needed
//     node cli/reading.js --help
//
// The message is read against the example mailbox as it stands after the 72 example messages
// (Friday, June 7, 2030). The key is taken from the environment variable OPENAI_API_KEY and from
// nowhere else: this command never reads a key from a file. When the variable is not set, the
// command says so, calls nothing, and shows the recorded reading of an example message so that
// the steps can still be seen. With a key, each try sends the typed message and the fictional
// example directory (case IDs, addresses, consultant names) to the OpenAI API in two requests,
// one for each reader, and prints what they cost. Nothing is filed anywhere either way.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, loadAll } from './load.js';
import { createEngine } from '../src/engine.js';
import { extractWithRules } from '../src/extract/rules.js';
import { makeRecordedReader } from '../src/extract/recorded.js';
import { readMessage, readMessageSync } from '../src/extract/crosscheck.js';

const f1 = (x) => x.toFixed(1);
const pct = (x, d = 0) => `${(100 * x).toFixed(d)}%`;

export function readingExperiment(scale, rr) {
  const typical = (scale.settings || []).find((p) => p.scenario === 'typical' && p.autonomy === 'default' && p.perRun === scale.base.hearings && p.countiesMade === scale.base.counties)
    || (scale.settings || []).find((p) => p.scenario === 'typical' && p.autonomy === 'default');
  if (!typical || !rr || !rr.rows) return null;
  const rec = (set) => rr.rows.find((x) => x.kind === 'recorded' && x.set === set);
  const share = (row) => { const m = /^(\d+) of (\d+)/.exec(row.to_person); return m ? { k: +m[1], n: +m[2], p: +m[1] / +m[2] } : null; };
  const ex = rec('examples') && share(rec('examples')), un = rec('unseen') && share(rec('unseen'));
  if (!ex || !un) return null;
  const inbound = typical.inbound, tower = typical.tower, manual = typical.manual;
  const M = scale.minutes;
  const simShare = (typical.towerBy && typical.towerBy.triage ? typical.towerBy.triage / M.mid.triage : 0) / inbound;
  const times = [
    { m: M.mid.approve, label: `${M.mid.approve} minute: the reading is shown with its quote and a person confirms it` },
    { m: M.low.triage, label: `${M.low.triage} minutes: a person reads the passage and enters what it says` },
    { m: M.mid.triage, label: `${M.mid.triage} minutes: the same, middle estimate` },
  ];
  const shares = [
    { p: 0.05, label: '5%: a target for routine traffic, not measured' },
    { p: ex.p, label: `${pct(ex.p)}: measured on the ${ex.n} example messages (${ex.k} of ${ex.n})` },
    { p: un.p, label: `${pct(un.p)}: measured on the ${un.n} unseen messages, written to be hard (${un.k} of ${un.n})` },
  ];
  const rows = [{ first: `${pct(simShare, 1)}: what the scale runs assume`, minutes: '', added: '0.0', total: f1(tower), less: pct(1 - tower / manual), perCoordinator: String(Math.round(scale.weekMinutes / tower)), _: { share: simShare, minutes: 0, total: tower } }];
  for (const s of shares) for (const t of times) {
    const added = inbound * s.p * t.m, total = tower + added;
    rows.push({ first: s.label, minutes: t.label, added: f1(added), total: f1(total), less: pct(1 - total / manual), perCoordinator: String(Math.round(scale.weekMinutes / total)), _: { share: s.p, minutes: t.m, total } });
  }
  const measured = rows.filter((r) => r._.share === ex.p || r._.share === un.p).map((r) => r._.total);
  const lo = Math.min(...measured), hi = Math.max(...measured);
  return {
    id: 'reading', title: 'What reading adds',
    question: `The runs above assume that almost every message is read without a person, because the simulated people write in wording the offline reader knows. Real reading is not that good yet. With the two AI readers, ${pct(ex.p)} of the example messages and ${pct(un.p)} of the unseen messages went to a person: a statement that only one reader found, or a passage neither could place. A hearing brings about ${f1(inbound)} incoming messages, so this is what that adds in the typical world. With the measured shares a hearing costs ${f1(lo)} to ${f1(hi)} person-minutes, not ${f1(tower)}: ${pct(1 - hi / manual)} to ${pct(1 - lo / manual)} less than by hand (${f1(manual)}).`,
    columns: [
      { key: 'first', label: 'Share of incoming messages that need a person because of the reading' },
      { key: 'minutes', label: 'Time for each' },
      { key: 'added', label: 'Added person-minutes per hearing', num: true, help: 'Incoming messages per hearing (measured in the typical runs) times the share times the minutes.' },
      { key: 'total', label: 'Person-minutes per hearing, with the tower', num: true },
      { key: 'less', label: 'Less than by hand', num: true },
      { key: 'perCoordinator', label: 'Hearings a week per coordinator', num: true, help: 'Estimate: 30 productive hours a week divided by the minutes per hearing.' },
    ],
    rows,
    note: 'This table is arithmetic on two measurements, not a simulation: it does not model the delay while a reading waits for a person. Both labelled sets were written to show difficult situations, so real traffic, which is mostly routine confirmations, should sit below them. That share is the first number a pilot has to measure, and bringing it down is where the next gain is: it matters more than making anything else automatic.',
    _: { inbound, tower, manual, low: lo, high: hi, examples: ex, unseen: un },
  };
}

export function addReading(scaleFile = path.join(ROOT, 'eval/scale.json'), readerFile = path.join(ROOT, 'eval/reader_results.json')) {
  if (!fs.existsSync(scaleFile) || !fs.existsSync(readerFile)) return null;
  const scale = JSON.parse(fs.readFileSync(scaleFile, 'utf8'));
  const e = readingExperiment(scale, JSON.parse(fs.readFileSync(readerFile, 'utf8')));
  if (!e) return null;
  scale.experiments = [...scale.experiments.filter((x) => x.id !== 'reading'), e];
  const limit = 'Reading is outside these runs: the simulated people write in wording the offline reader is known to read. What measured reading adds is in the table "What reading adds".';
  scale.limits = [...scale.limits.filter((x) => !/^The simulated people write in wording|^Reading is outside these runs/.test(x)), limit];
  fs.writeFileSync(scaleFile, JSON.stringify(scale, null, 1));
  return e;
}

// ---- try a message ------------------------------------------------------------------------------------
export const TRY_HELP = `Try the two AI readers on one message.

  node cli/reading.js --try "<the message text>" --from "<sender>" [--about "<address>; <address>"] [--channel email|text|"phone note"]
  node cli/reading.js --try --example <number>

--from     Who wrote it, as the example data names them: a consultant ("Owen Tarris"), an office
           ("Tesswick hearing office") or the firm ("Alice's Law Firm operations"). Any other
           name is an unknown sender, and an unknown sender can prove nothing.
--about    The hearings the message belongs to, by address, separated by semicolons. Leave it out
           when the text names the address or the case ID itself.
--channel  email (the default), text, or "phone note". What is said by phone proves nothing in writing.
--example  Show the recorded reading of one of the 72 example messages (1 to 72). No key is needed.

The key comes from the environment variable OPENAI_API_KEY only, for example:
  OPENAI_API_KEY=... node cli/reading.js --try "Both packets received." --from "Velloran hearing office" --about "120 Garden Street, Velloran"
This command never reads a key from a file. Without the variable it calls nothing and shows a
recorded example. With it, the typed text and the fictional example directory go to the OpenAI
API in two requests (one for each reader), and the cost of the try is printed. Nothing is filed:
the output is what the readers would propose and what the checks in code did with it.`;

// The example mailbox after the 72 messages, read from the recorded answers of the two models.
export function exampleWorld(data = loadAll()) {
  const records = data.readJson('data/recorded_reads.json');
  const eng = createEngine({ packet: data.packet, playbooks: data.playbooks, reader: extractWithRules });
  const first = makeRecordedReader(records, { set: 'primary', fallback: extractWithRules });
  const second = makeRecordedReader(records, { set: 'second', fallback: extractWithRules });
  const entries = new Map();
  for (const m of data.messages) entries.set(String(m.id), readMessageSync(eng, m, { reader: first, second }));
  return { data, eng, entries, labels: [first.provenance.read_by, second.provenance.read_by] };
}

const WHO = { government: (e) => `the ${e.county} hearing office`, consultant: (e, eng) => `the consultant ${eng.dir.consultantById[e.consultant].name}`, firm: () => 'the firm itself', homeowner: (e) => `the homeowner ${e.homeowner}`, unknown: () => 'an unknown sender, who can prove nothing' };
const DISPOSITION = { fact: 'accepted as a fact', provisional: 'kept as said by phone, not yet in writing', flag: 'accepted as a flag that opens work', signal: 'noted only: this sender cannot establish it', note: 'a note without effect', belief: 'recorded as what someone believes', request: 'recorded as a request', held: 'held: not a plain statement', rejected: 'rejected' };

// What the readers and the checks made of one message, as lines of text. entry is what readMessage returns.
export function describeRead(entry, eng) {
  const lines = [];
  const kind = (t) => String(t).replace(/_/g, ' ');
  lines.push(`From: ${entry.sender} (${entry.channel}). The code checked the sender as ${(WHO[entry.role] || WHO.unknown)(entry, eng)}.`);
  lines.push(`About: ${entry.caseIds.length ? entry.caseIds.map((id) => `${id} (${eng.dir.caseById[id].property})`).join(', ') : 'no hearing could be matched, so nothing was read'}.`);
  lines.push(`Text: "${String(entry.body).replace(/\s+/g, ' ').trim()}"`);
  const r = entry.reading || {};
  if (!entry.claims.length) lines.push('Readings that passed the cross-check: none.');
  else {
    lines.push(`Readings that passed the cross-check (${entry.claims.length}):`);
    for (const c of entry.claims) {
      const details = ['date', 'time', 'deadline', 'consultant', 'kind', 'room', 'mode', 'result'].filter((f) => c[f] !== undefined && c[f] !== null).map((f) => `${f} ${c[f]}`).join(', ');
      lines.push(`  ${kind(c.type)} for ${(c.cases || []).join(', ')}${details ? ` (${details})` : ''}. Words: "${String(c.quote || '').replace(/\s+/g, ' ')}". Verifier: ${DISPOSITION[c.disposition] || c.disposition}. ${c.reason}`);
      for (const fx of c.effects || []) lines.push(`      ${fx.caseId}: ${fx.text}`);
    }
  }
  for (const d of r.disputed || []) lines.push(`  Held back, not applied: ${kind(d.claim.type)} for ${(d.claim.cases || []).join(', ')}. ${d.reason}`);
  for (const d of r.dropped || []) lines.push(`  Not used: ${d.reason}`);
  for (const u of r.unclassified || []) lines.push(`  Not classified: "${u.quote || ''}"${u.note ? ` (${u.note})` : ''}`);
  for (const ch of entry.readinessChanges || []) lines.push(`  ${ch.caseId} goes from ${String(ch.from).replace(/_/g, ' ')} to ${String(ch.to).replace(/_/g, ' ')}.`);
  lines.push(entry.attention && entry.attention.length ? `For a person: yes. ${entry.attention.join(' ')}` : 'For a person: no reason found by the readers or the checks.');
  return lines;
}

// opts: { text, from, about: [addresses], channel, example, env, readers: { reader, second } (tests only), log }.
// Returns { mode: 'recorded' | 'live' | 'help' | 'error', entry? }. Calls the API only when env.OPENAI_API_KEY is set.
export async function tryMessage({ text = null, from = null, about = [], channel = 'email', example = null, env = process.env, readers = null, log = console.log } = {}) {
  const world = exampleWorld();
  const { data, eng, entries } = world;
  const hasKey = !!(env && env.OPENAI_API_KEY);
  const showRecorded = (id, why) => {
    const m = data.messages.find((x) => String(x.id) === String(id));
    if (!m) { log(`There is no example message ${id}. The examples are numbered 1 to ${data.messages.length}.`); return { mode: 'error' }; }
    log(why);
    log(`Recorded reading of example message ${m.id}, read by ${world.labels[0]} and checked by ${world.labels[1]}. It is replayed from data/recorded_reads.json through the same checks as a live answer.`);
    for (const line of describeRead(entries.get(String(m.id)), eng)) log(line);
    return { mode: 'recorded', entry: entries.get(String(m.id)), example: m.id };
  };
  if (example !== null && example !== undefined) return showRecorded(example, 'Showing a recorded example. No model was called.');
  if (!text || !String(text).trim()) { log(TRY_HELP); return { mode: 'help' }; }
  if (!hasKey && !readers) {
    const same = data.messages.find((m) => m.body.replace(/\s+/g, ' ').trim() === String(text).replace(/\s+/g, ' ').trim());
    const why = `No key is set: the environment variable OPENAI_API_KEY is empty, so no model was called and your message was not read. ${same ? `Your text is the text of example message ${same.id}, so its recorded reading is shown.` : 'A recorded example is shown in its place, so that you can see what a reading looks like.'} To read your own message, start the command with OPENAI_API_KEY set in the environment. This command never reads a key from a file.`;
    return showRecorded(same ? same.id : 62, why);
  }
  if (!from) { log('Please say who wrote the message with --from, for example --from "Owen Tarris" or --from "Tesswick hearing office". Without a sender the code cannot check who may prove what.'); return { mode: 'error' }; }
  let reader, second;
  if (readers) ({ reader, second } = readers);
  else {
    const ai = await import('../src/extract/openai.js');
    reader = ai.createOpenAIReader({ apiKey: env.OPENAI_API_KEY });
    second = ai.createSecondReader({ apiKey: env.OPENAI_API_KEY, model: ai.DEFAULT_SECOND_MODEL });
  }
  const raw = { id: 'typed', at: new Date(eng.state.now + 60e3).toISOString(), sender: from, channel, properties: about, body: String(text) };
  log(`Reading your message with ${reader.label || 'the first reader'}, checked by ${second.label || 'the second reader'}. It is read as if it arrived one minute after the last example message. Nothing is filed.`);
  let entry;
  try { entry = await readMessage(eng, raw, { reader, second }); }
  catch (e) { log(`The message could not be read: ${e && e.message ? e.message : e}`); return { mode: 'error' }; }
  for (const line of describeRead(entry, eng)) log(line);
  const usage = (entry.reading && entry.reading.usage) || [];
  const cost = usage.reduce((n, u) => n + (u.costUsd || 0), 0);
  if (usage.length) log(`Cost of this try: $${cost.toFixed(4)} for ${usage.length} ${usage.length === 1 ? 'request' : 'requests'}.`);
  return { mode: 'live', entry };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(TRY_HELP); process.exit(0); }
  if (args.includes('--try')) {
    const KNOWN = ['--try', '--from', '--about', '--channel', '--example'];
    const val = (name) => { const i = args.indexOf(name); const v = i >= 0 ? args[i + 1] : undefined; return v === undefined || KNOWN.includes(v) ? null : v; };
    const r = await tryMessage({ text: val('--try'), from: val('--from'), about: (val('--about') || '').split(';').map((x) => x.trim()).filter(Boolean), channel: val('--channel') || 'email', example: val('--example') });
    process.exit(r.mode === 'error' ? 1 : 0);
  }
  const e = addReading();
  if (!e) { console.log('Nothing added: eval/scale.json or eval/reader_results.json is missing.'); process.exit(1); }
  console.log(e.question);
  for (const r of e.rows) console.log(`  ${r.first.padEnd(78).slice(0, 78)} ${String(r._.minutes).padStart(4)} min  +${r.added.padStart(4)}  total ${r.total.padStart(5)}  less ${r.less.padStart(4)}  per coordinator ${r.perCoordinator}`);
}
