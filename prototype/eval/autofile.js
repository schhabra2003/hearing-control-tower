'use strict';
// Auto-file analysis: numbers only, from the recorded runs.
//
//     node eval/autofile.js             prints the counts and writes eval/autofile.json
//     node eval/autofile.js --no-write  prints the counts and writes nothing
//     node eval/autofile.js --set data/unseen2.json --reads data/recorded_reads_unseen2.json [--out eval/autofile_unseen2.json]
//                                       one more unseen set with its own record file: prints only that set's
//                                       counts, lists every reading, and never touches eval/autofile.json
//
// The question: if a proposal that BOTH AI readers agree on and that the verifier passes were
// filed without a person, how often would that filing be wrong? This script measures it against
// the answer key on the 72 example messages (data/gold_dev.json) and on the 30 unseen messages
// (data/heldout.json). It decides nothing: auto-file is OFF this season, and the condition for switching it
// on is the sheet's own sentence (Reader suggestions A168, the live-week-4 review after four clean Friday
// samples); the firm's two-week log is the measurement that feeds that review. It calls no model: the readers' answers are replayed
// from data/recorded_reads.json through the same guard, cross-check and verifier as a live answer,
// in the same way as eval/run.js does.
//
// Words used here.
//   closing reading   One reading of one message for one hearing, of a type that can close a proof
//                     cell or set an official fact (the two-key types of src/extract/crosscheck.js).
//   agreed            Both readers produced it for the same hearing with the same key details, so
//                     it passed the cross-check.
//   passed            The verifier (src/verify.js) accepted it as a fact: the sender may establish
//                     it, in writing, as a plain statement.
//   right             The answer key holds the same type for the same hearing with the same key
//                     details (date, time, consultant and so on).
// The answer key was written by one person, the author of the readers' instructions. The unseen
// messages were written to be hard. Neither set is a sample of a real mailbox.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'eval/autofile.json');
const KIND_KEYED = ['document_submitted', 'doc_unreadable', 'signature_required', 'signature_rejected', 'obligation_cleared'];   // as in src/score.js
const GATE_KEYS = ['G1', 'G2', 'G3', 'G4', 'G5'];
// Claim types added after the unseen set was labelled (as in eval/run.js). When no label of a set
// uses any of them, a reading of such a type cannot be judged by that answer key: eval/run.js lists
// it separately and counts it neither as right nor as wrong. This script does the same and also
// gives the strict count, in which every such reading counts as wrong.
const NEWER = ['hearing_postponed', 'withdrawal_cancelled', 'homeowner_confirmed', 'homeowner_declined'];
// ---- the round-15 sheet rules that decide what a filed link is worth ---------------------------------------
// The readers propose proof LINKS. Since round 15 the gate sheet asks for more than a link in three places,
// and this script applies the same rules in fixed code to the words of each message (no model, no sheet):
//   S12  A receipt closes its half of the files check (G4) only for the version it names or when it says
//        "current". Otherwise the link is filed, the half stays open, and a person asks: the consultant
//        replies GOT IT n, the clerk answers the files email that names every file.
//   S11  A video room letter is not a link. On a video hearing the schedule check (G1) stays open until
//        column AV holds a link or a number of seven or more digits, or the office has said (Offices AL)
//        that the room letter is all it sends. The packet answers that question for no office.
//   S1   A GOT IT counts only when BW names the consultant it is from: a person types the name with the link.
//   S15  The time a consultant says they will arrive is typed in CH, and an office's own arrival instruction
//        in CI as minutes. The firm needs a consultant 30 minutes before their first case (Settings B16),
//        or the office's minutes when they are more.
// Source of the rules: the sheet rules in the working notes, not published, part B, sections 2, 4, 5 and 8.
const NAMES_VERSION = /\bversion\s*\d+\b|\bv\d+\b|\bcurrent\b/i;                 // S12: "version 2", "v2" or "current"
const IS_LINK = (text) => /http|:\/\//i.test(text) || (String(text).match(/\d/g) || []).length >= 7;   // S11: column CJ, test 3
const ARRIVAL_SAID = /\b(?:arrive|be there|be at the office)\b[^.;]{0,20}?\b(?:at|by|around)\s+(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\b/i;   // S15: CH
const ARRIVAL_MINUTES = 30;                                                             // Settings B16
// What the sheet's column U ("Proofs missing") reads on these six rows of the installed sheet, read from
// a dump of the sheet (working notes, not published) on 20 Nov 2026. cli/check.js compares the script's own count with it.
const SHEET_PROOFS_MISSING = { 'AX-121': 0, 'AX-122': 0, 'AX-123': 3, 'AX-124': 3, 'AX-113': 4, 'AX-114': 4 };
// The threads the brief asks about.
const THREADS = [
  { name: 'Clean thread, Larkmere (messages 61 to 66)', messages: [61, 66], cases: ['AX-121', 'AX-122'] },
  { name: 'Clean thread, Velloran (messages 67 to 72)', messages: [67, 72], cases: ['AX-123', 'AX-124'] },
  { name: 'Brook Road, Fenwick Vale (messages 37 to 42)', messages: [37, 42], cases: ['AX-113', 'AX-114'] },
];

async function analyse(extra = null) {
  const { loadAll } = await import('../cli/load.js');
  const { createEngine } = await import('../src/engine.js');
  const { extractWithRules } = await import('../src/extract/rules.js');
  const { verifyClaim } = await import('../src/verify.js');
  const { TYPE_LIST } = await import('../src/model.js');
  const { settleRead, factsFor, needsTwoKeys, closingKey } = await import('../src/extract/crosscheck.js');
  const { makeRecordedReader } = await import('../src/extract/recorded.js');
  const { wilson } = await import('../src/stats.js');
  const sheet = await import('../cli/sheet.js');

  const data = loadAll();
  const records = data.readJson('data/recorded_reads.json');
  const first = makeRecordedReader(records, { set: 'primary' });
  const second = makeRecordedReader(records, { set: 'second' });
  const first0 = first, second0 = second;
  const pairKey = (c, id) => `${c.type}|${id}|${KIND_KEYED.includes(c.type) ? c.kind || '' : ''}`;
  const pairMap = (claims) => { const m = new Map(); for (const c of claims) for (const id of c.cases || []) { const k = pairKey(c, id); if (!m.has(k)) m.set(k, c); } return m; };
  const known = (labels) => (labels || []).filter((c) => c && TYPE_LIST.includes(c.type) && Array.isArray(c.cases) && c.cases.length);
  const share = (k, n) => { const w = wilson(k, n); return { k, n, share: n ? k / n : null, interval95: n ? [w.lo, w.hi] : null }; };

  // ---- the messages of each set, each with the situation it is read in (as eval/run.js builds it) ----
  const newEngine = () => createEngine({ packet: data.packet, playbooks: data.playbooks, reader: extractWithRules });
  const examples = [];
  const G = newEngine();                                  // the answer key applied message by message
  for (const m of data.messages) {
    const { msg, ctx } = G.prepare(m);
    const labels = known(data.gold.labels[String(m.id)]);
    examples.push({ raw: m, msg, ctx, labels, facts: { ...ctx.facts, ...factsFor(G, ctx.caseIds) } });
    G.commit(msg, labels.map((c) => ({ ...c, quote: msg.body })), { reader: 'person' });
  }
  const B = newEngine();                                  // the unseen messages are read against the end of the examples
  for (const m of data.messages) B.ingest(m);
  const held = data.readJson('data/heldout.json');
  const unseen = held.messages.filter((m) => Array.isArray(m.claims)).map((m) => {
    const raw = { id: m.id, at: m.ts, sender: m.sender, address: m.address ?? null, channel: m.channel, properties: m.properties || [], body: m.body };
    const { msg, ctx } = B.prepare(raw);
    return { raw, msg, ctx, labels: known(m.claims), facts: { ...ctx.facts, ...factsFor(B, ctx.caseIds) } };
  });

  // ---- one set: every closing reading, whether agreed, passed and right ----------------------------------
  function claimLevel(items, dir, first = first0, second = second0, listAll = false) {
    const used = new Set(items.flatMap((it) => it.labels.map((c) => c.type)));
    const predate = NEWER.some((t) => used.has(t)) ? [] : NEWER;
    const rows = [];
    let missing = 0;
    for (const it of items) {
      if (it.msg.resolvedBy === 'none') continue;
      const a = first(it.msg, dir, it.ctx);
      if (first.last.path === 'missing') { missing += 1; continue; }
      let b = second(it.msg, dir, it.ctx);
      if (second.last.path === 'missing') b = [];
      const env = { facts: it.facts, openObligations: it.ctx.openObligations, sender: { role: it.msg.role, consultant: it.msg.consultant } };
      const r = settleRead(it.msg, dir, it.ctx, a, b, { facts: it.facts });
      const gold = pairMap(it.labels);
      // Closing readings of the first reader that did not get the second key.
      for (const d of r.disputed) for (const id of d.claim.cases || []) rows.push({ message: String(it.raw.id), type: d.claim.type, case: id, agreed: false, by: d.by, why: d.reason, inKey: gold.has(pairKey(d.claim, id)) });
      for (const [k, c] of pairMap(r.claims)) {
        const id = k.split('|')[1];
        if (!needsTwoKeys(c, id, env)) continue;
        const v = verifyClaim(c, it.msg, dir);
        const g = gold.get(k);
        let right = !!g, difference = g ? '' : 'The answer key has no reading of this type for this hearing.';
        if (g) {
          const kp = closingKey(c, id, env), kg = closingKey(g, id, env);
          const diff = kp.filter(([, v2], i) => kg[i][1] !== v2).map(([name, v2]) => `${name}: read ${v2 || 'nothing'}, answer key ${(kg.find((x) => x[0] === name) || [])[1] || 'nothing'}`);
          for (const f of ['room', 'mode']) if (['hearing_scheduled', 'hearing_confirmed', 'schedule_changed'].includes(c.type) && c[f] !== undefined && g[f] !== undefined && c[f] !== g[f]) diff.push(`${f}: read ${c[f]}, answer key ${g[f]}`);
          if (diff.length) { right = false; difference = diff.join('; '); }
        }
        const outside = predate.includes(c.type);
        if (outside) difference = `The answer key was written before the type "${c.type.replace(/_/g, ' ')}" existed, so it cannot judge this reading.${it.labels.length ? ` For this message it holds: ${it.labels.map((l) => `${l.type.replace(/_/g, ' ')} for ${l.cases.join(', ')}`).join('; ')}.` : ''}`;
        rows.push({ message: String(it.raw.id), type: c.type, case: id, agreed: true, outside, disposition: v.disposition, passed: v.disposition === 'fact', right: right && !outside, difference, quote: String(c.quote || '').slice(0, 200) });
      }
    }
    const agreed = rows.filter((x) => x.agreed), passed = agreed.filter((x) => x.passed), notPassed = agreed.filter((x) => !x.passed);
    const outside = passed.filter((x) => x.outside), judged = passed.filter((x) => !x.outside);
    const wrong = judged.filter((x) => !x.right);
    const byType = {};
    for (const x of passed) { const t = (byType[x.type] = byType[x.type] || { agreed_and_passed: 0, right: 0, wrong: 0 }); t.agreed_and_passed += 1; t[x.right ? 'right' : 'wrong'] += 1; }
    const disp = {};
    for (const x of notPassed) disp[x.disposition] = (disp[x.disposition] || 0) + 1;
    const heldBack = rows.filter((x) => !x.agreed);
    const keyClosing = items.reduce((n, it) => { const env = { facts: it.facts, openObligations: it.ctx.openObligations, sender: { role: it.msg.role, consultant: it.msg.consultant } }; return n + [...pairMap(it.labels)].filter(([k, c]) => needsTwoKeys(c, k.split('|')[1], env)).length; }, 0);
    return {
      messages: items.length, messages_without_a_recorded_read: missing,
      closing_readings_in_the_answer_key: keyClosing,
      agreed_by_both_readers: agreed.length,
      agreed_and_passed_by_the_verifier: passed.length,
      agreed_but_not_passed: { n: notPassed.length, by_verifier_result: disp, right_against_the_answer_key: notPassed.filter((x) => x.right).length, list: notPassed.map((x) => ({ message: x.message, type: x.type, case: x.case, verifier: x.disposition, right: x.right })) },
      agreed_and_passed_that_the_answer_key_cannot_judge: { n: outside.length, why: outside.length ? 'These readings are of a claim type that did not exist when this answer key was written. eval/run.js counts them neither as right nor as wrong, and so does the main count below.' : 'None.', list: outside.map((x) => ({ message: x.message, type: x.type, case: x.case, quote: x.quote, note: x.difference })) },
      of_agreed_and_passed: { judged: judged.length, right: share(judged.length - wrong.length, judged.length), wrong: share(wrong.length, judged.length) },
      strict_count_unjudged_as_wrong: { right: share(judged.length - wrong.length, passed.length), wrong: share(wrong.length + outside.length, passed.length) },
      wrong_by_message: wrong.map((x) => ({ message: x.message, type: x.type, case: x.case, quote: x.quote, why_wrong: x.difference })),
      answer_key_closing_readings_that_would_file_themselves: share(passed.filter((x) => x.right).length, keyClosing),
      held_back_for_a_person: { n: heldBack.length, in_the_answer_key: heldBack.filter((x) => x.inKey).length, not_in_the_answer_key: heldBack.filter((x) => !x.inKey).length, list: heldBack.map((x) => ({ message: x.message, type: x.type, case: x.case, found_by: x.by, in_answer_key: x.inKey })) },
      by_type: byType,
      ...(listAll ? { every_reading: rows, messages_read: items.filter((it) => it.msg.resolvedBy !== 'none').map((it) => String(it.raw.id)) } : {}),
    };
  }

  // ---- one more unseen set with its own record file (--set, --reads): only that set is analysed --------
  if (extra) {
    const records2 = data.readJson(extra.reads);
    const f2 = makeRecordedReader(records2, { set: 'primary' }), s2 = makeRecordedReader(records2, { set: 'second' });
    const B2 = newEngine();
    for (const m of data.messages) B2.ingest(m);
    const items2 = data.readJson(extra.set).messages.filter((m) => Array.isArray(m.claims)).map((m) => {
      const raw = { id: m.id, at: m.ts, sender: m.sender, address: m.address ?? null, channel: m.channel, properties: m.properties || [], body: m.body };
      const { msg, ctx } = B2.prepare(raw);
      return { raw, msg, ctx, labels: known(m.claims), facts: { ...ctx.facts, ...factsFor(B2, ctx.caseIds) } };
    });
    return { generated_by: `node eval/autofile.js --set ${extra.set} --reads ${extra.reads}`, source: `${extra.reads} replayed offline (no model call). First reader: ${f2.provenance.read_by}. Second reader: ${s2.provenance.read_by}.`, set: extra.set,
      roles: Object.fromEntries(items2.map((it) => [String(it.raw.id), it.msg.role])), extra_set: claimLevel(items2, B2.dir, f2, s2, true) };
  }

  // ---- the 72 examples as the sheet sees them: proof links for cells --------------------------------------
  const read = sheet.readMailbox(data.messages, data);
  const view = G.view(G.state.now);
  const keyLinks = new Set(), keyHalves = new Set();
  for (const c of view.cases) for (const k of GATE_KEYS) {
    const g = c.gates[k];
    if (g.status === 'closed') for (const id of g.evidence) if (id !== null && id !== undefined) keyLinks.add(`${c.id}|${k}|${id}`);
    if (k === 'G4' && g.status !== 'closed' && g.status !== 'na') {
      if (g.clerkOk && g.evidence[0] != null) keyHalves.add(`${c.id}|G4|${g.evidence[0]}`);
      if (g.consOk && g.evidence[1] != null) keyHalves.add(`${c.id}|G4|${g.evidence[1]}`);
    }
  }
  const linkOf = (p) => `${p.case}|${p.gate.slice(0, 2)}|${p.message}`;
  const close = read.proposals.filter((p) => p.proposal === 'close');
  const agreedLinks = close.filter((p) => p.agreedAndVerified);
  const wrongLinks = agreedLinks.filter((p) => !keyLinks.has(linkOf(p)));
  const proposed = new Set(close.map(linkOf));
  const missedLinks = [...keyLinks].filter((k) => !proposed.has(k));
  const sheetLevel = {
    what: 'The 72 example messages read in order, as node cli/sheet.js does. A proof link is one message proposed as the proof for one cell (G1 to G5) of one hearing. The answer key side is the same engine fed with the answer key and no reader.',
    proof_links_proposed: close.length,
    agreed_and_passed: agreedLinks.length,
    of_agreed_and_passed: { right: share(agreedLinks.length - wrongLinks.length, agreedLinks.length), wrong: share(wrongLinks.length, agreedLinks.length) },
    wrong_by_message: wrongLinks.map((p) => ({ message: p.message, case: p.case, cell: `${p.cell.tab} ${p.cell.column}`, quote: p.gateQuote || p.quote })),
    proof_links_in_the_answer_key: keyLinks.size,
    in_the_answer_key_but_not_proposed: missedLinks.map((k) => { const [id, gate, message] = k.split('|'); return { case: id, gate, message: Number(message) }; }),
    half_proofs: { what: 'A receipt of the case files from the clerk or the consultant where the other half of G4 is still missing. The gate stays open, but the cell (Hearings L or M) can be filled.', proposed: read.halfProofs.length, right: read.halfProofs.filter((p) => keyHalves.has(`${p.case}|G4|${p.message}`)).length, list: read.halfProofs.map((p) => ({ case: p.case, cell: `${p.cell.tab} ${p.cell.column}`, message: p.message, agreed_and_passed: p.agreedAndVerified })) },
    hearings_identical_to_the_answer_key: null,
  };
  // Hearings whose five cells read the same from the readers and from the answer key.
  const differing = [];
  for (const c of read.cases) {
    const k = view.cases.find((x) => x.id === c.id);
    const diff = GATE_KEYS.filter((g) => c.gates[g].status !== k.gates[g].status || (c.gates[g].status === 'closed' && JSON.stringify(c.gates[g].evidence) !== JSON.stringify(k.gates[g].evidence.filter((x) => x !== null && x !== undefined))));
    if (diff.length) differing.push({ case: c.id, cells: diff.map((g) => `${g}: readers ${c.gates[g].status}, answer key ${k.gates[g].status}`) });
  }
  sheetLevel.hearings_identical_to_the_answer_key = { what: 'Hearings whose five cells have the same status, and the same proof messages where a cell is closed, from the readers and from the answer key.', k: read.cases.length - differing.length, n: read.cases.length, differing };

  // ---- person actions for the two clean threads and Brook Road --------------------------------------------
  // Counted twice: by the method of before round 15 (proof links only), and on the gate sheet since round 15, where
  // rules S1, S11, S12 and S15 add cells that a person types and leave checks open after a link is filed.
  let officeRule = null;
  try { officeRule = require('../src/office_rule.js'); } catch { officeRule = null; }
  const inThread = (t, id) => Number(id) >= t.messages[0] && Number(id) <= t.messages[1];
  const message = (id) => data.packet.messages.find((m) => m.id === id);
  const isOffice = (m) => / hearing office$/.test(m.sender);
  const clock = (min) => `${((Math.floor(min / 60) + 11) % 12) + 1}:${String(min % 60).padStart(2, '0')} ${min < 720 ? 'a.m.' : 'p.m.'}`;
  const minutesOf = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
  const today = new Date(read.now).toISOString().slice(0, 10);
  const threads = THREADS.map((t) => {
    const msgs = data.packet.messages.filter((m) => inThread(t, m.id));
    const docket = t.cases.map((id) => read.cases.find((x) => x.id === id));
    const hearings = t.cases.map((id) => {
      const c = read.cases.find((x) => x.id === id);
      const record = data.packet.cases.find((x) => x.case_id === id);
      const doc = (data.packet.documents || []).find((d) => d.name === record.packet_reference);
      const version = doc && doc.version ? String(doc.version) : 'n';
      const mine = close.filter((p) => p.case === id);
      const halves = read.halfProofs.filter((p) => p.case === id);
      const self = [...mine, ...halves].filter((p) => p.agreedAndVerified).length;
      const typed = missedLinks.filter((k) => k.startsWith(`${id}|`)).length;
      const toPerson = read.toPerson.filter((x) => inThread(t, x.message)).map((x) => x.message);
      const open = GATE_KEYS.filter((g) => ['problem', 'waiting'].includes(c.gates[g].status)).map((g) => `${g}: ${c.gates[g].text}`);
      const off = mine.length + halves.length + typed + toPerson.length;

      // The round-15 sheet.
      const cells = [];      // cells a person types that the readers do not propose: { cell, value, why }
      const remains = [];    // what is still to do after every link and cell above is filed
      const toSend = [], noted = [];   // the messages among it; one message can serve every hearing of the docket
      const coming = c.schedule && c.schedule.date >= today;
      const linkFor = (col) => [...mine, ...halves].find((p) => p.cell.column === col);
      // S12, the clerk's half of the files check.
      const l = linkFor('L');
      let clerkOpen = true;
      if (l) {
        if (NAMES_VERSION.test(message(l.message).body)) { cells.push({ cell: 'Hearings AZ', value: version, why: `message ${l.message} names the version or says "current"` }); clerkOpen = false; }
        else {
          const later = msgs.find((m) => m.id > l.message && isOffice(m) && NAMES_VERSION.test(m.body) && /packet|file/i.test(m.body));
          if (later) {
            cells.push({ cell: 'Hearings L', value: `the link to message ${later.id}, pasted over the readers' link to message ${l.message}`, why: `message ${l.message} names no version; the office's later message ${later.id} says "current"` });
            cells.push({ cell: 'Hearings AZ', value: version, why: `message ${later.id} says "current"` });
            clerkOpen = false;
          } else (coming ? toSend : noted).push('a files email to the clerk that names every file'), remains.push(`The clerk's receipt (message ${l.message}) names no version, so the clerk's half of the files check stays open${coming ? `: send the files email that names every file (version ${version}) and ask for a reply to it, then type the version in AZ` : ` (AZ stays empty; the sheet does not print the question on a past row)`}.`);
        }
      }
      // S1 and S12, the consultant's half.
      const m4 = linkFor('M');
      let consOpen = true;
      if (m4) {
        cells.push({ cell: 'Hearings BW', value: message(m4.message).sender, why: `the GOT IT in M (message ${m4.message}) counts only with the name of the consultant it is from` });
        if (NAMES_VERSION.test(message(m4.message).body)) { cells.push({ cell: 'Hearings AY', value: version, why: `message ${m4.message} names the version or says "current"` }); consOpen = false; }
        else toSend.push(`a request to ${message(m4.message).sender} to reply GOT IT ${version}`), remains.push(`The consultant's receipt (message ${m4.message}) names no version, so the consultant's half of the files check stays open: ask ${message(m4.message).sender} to reply GOT IT ${version}, then type the version in AY.`);
      }
      // S15, the arrival time the consultant gave and the office's own instruction.
      const inPerson = c.schedule && c.schedule.mode === 'in_person';
      let officeMinutes = null;
      for (const m of msgs.filter(isOffice)) {
        const ci = officeRule ? officeRule.classifyOfficeReply(m.body, { county: c.county }).proposals.find((p) => p.column === 'CI' && /^\d+$/.test(p.value)) : null;
        if (ci) { officeMinutes = Number(ci.value); cells.push({ cell: 'Hearings CI', value: ci.value, why: `the office's arrival instruction in message ${m.id}, as minutes before the first case` }); }
      }
      if (inPerson && c.committed) {
        const said = msgs.filter((m) => m.sender === c.committed.name).map((m) => ({ m, x: ARRIVAL_SAID.exec(m.body) })).find((y) => y.x);
        if (said) {
          const given = (Number(said.x[1]) % 12 + (said.x[3].toLowerCase() === 'p' ? 12 : 0)) * 60 + Number(said.x[2] || 0);
          const first = Math.min(...docket.filter((d) => d.committed && d.committed.name === c.committed.name).map((d) => minutesOf(d.schedule.time)));
          const needed = first - Math.max(ARRIVAL_MINUTES, officeMinutes || 0);
          cells.push({ cell: 'Hearings CH', value: clock(given), why: `${c.committed.name} gives an arrival time in message ${said.m.id}` });
          if (given > needed) toSend.push(`a reply to ${c.committed.name} about the arrival time`), remains.push(`${c.committed.name} said they arrive at ${clock(given)} and the firm needs ${clock(needed)}: reply the same day (one reply for the docket).`);
        }
      }
      // S11, a video room without a link.
      let roomOnly = false;
      // What would go in AV: a web address anywhere in an office message of the thread, or what the office rule
      // proposes for AV (a room, a link, a call-in number). The digits of dates and addresses are not a number.
      const forAv = msgs.filter(isOffice).flatMap((m) => [...(m.body.match(/https?:\/\/\S+/gi) || []), ...(officeRule ? officeRule.classifyOfficeReply(m.body, { county: c.county }).proposals.filter((p) => p.column === 'AV').map((p) => p.value) : [])]);
      if (c.schedule && c.schedule.mode === 'video' && c.gates.G1.status === 'closed' && !forAv.some(IS_LINK)) {
        roomOnly = true;
        toSend.push('a question to the office about the video room');
        remains.push(`The office ${c.schedule.room ? `names video room ${c.schedule.room}` : 'gives no video link'} and sends no link or number, so the schedule check (G1) stays open: ask the office whether a link comes and whether the room is at the office (Offices AL), then type the link in AV or choose the answer in AL.`);
      }
      if (coming && c.committed) remains.push('No homeowner notice is on record in the packet for this hearing: send it, then type the name and date on it in BK and BL.');
      for (const o of open) remains.push(`Needs work with or without the readers: ${o}`);
      // Column U of the sheet: one for each open check, the files check counted by its two halves.
      const gateOpen = (g) => c.gates[g].status !== 'closed' && c.gates[g].status !== 'na';
      const missing = (gateOpen('G1') || roomOnly ? 1 : 0) + (gateOpen('G2') ? 1 : 0) + (gateOpen('G3') ? 1 : 0) + (c.gates.G4.status === 'na' ? 0 : (clerkOpen ? 1 : 0) + (consOpen ? 1 : 0)) + (gateOpen('G5') ? 1 : 0);
      const offSheet = off + cells.length;
      return {
        case: id, property: c.property, cells_closed_by_the_readers: GATE_KEYS.filter((g) => c.gates[g].status === 'closed').length, cells_that_apply: GATE_KEYS.filter((g) => c.gates[g].status !== 'na').length,
        proof_links_proposed: mine.length, half_proofs_proposed: halves.length, of_those_agreed_and_passed: self,
        proofs_in_the_answer_key_the_readers_did_not_propose: typed, messages_of_the_thread_handed_to_a_person: toPerson,
        cells_a_person_types_on_the_round_15_sheet: cells,
        person_actions_auto_file_off: offSheet, person_actions_auto_file_on: offSheet - self,
        proof_links_only_the_method_before_round_15: { person_actions_auto_file_off: off, person_actions_auto_file_on: off - self },
        proofs_missing_on_the_sheet_after_this_filing: missing,
        status_on_the_sheet_after_this_filing: !coming ? `${missing} proofs missing on a past row` : missing === 0 ? 'READY' : `OPEN: ${missing} missing`,
        what_remains: remains,
        messages_still_to_send: toSend,
        open_cells_that_need_work_either_way: open,
      };
    });
    const send = [...new Set(hearings.flatMap((h) => h.messages_still_to_send))];
    return { thread: t.name, messages_still_to_send_for_the_docket: { n: send.length, list: send, note: 'One message for the docket where it serves both hearings. The homeowner notices are not in this count.' }, hearings };
  });

  return {
    generated_by: 'node eval/autofile.js',
    source: 'data/recorded_reads.json replayed offline (no model call). First reader: ' + first.provenance.read_by + '. Second reader: ' + second.provenance.read_by + '.',
    definitions: {
      closing_reading: 'One reading of one message for one hearing, of a type that needs both readers because it can close a proof cell or set an official fact.',
      agreed: 'Both readers produced it for the same hearing with the same key details (it passed the cross-check).',
      passed: 'The verifier accepted it as a fact: the right sender, in writing, as a plain statement.',
      right: 'The answer key holds the same type for the same hearing with the same key details.',
      person_action: 'One of: a yes or no to one proposed proof link on the Reader suggestions tab; one proof a person types because the readers did not propose it; one message handed to a person to read; and, on the gate sheet since round 15, one cell that a person types because a rule added in round 15 reads it and the readers do not propose it (BW, AY, AZ, a later receipt pasted over the link in L, CH, CI). With auto-file on, a proposed link that is agreed and passed needs no yes; the typed cells stay with a person. A message handed to a person is counted on each hearing of its thread. This is a count of actions, not a timing.',
      not_counted: 'Typing that the method never counted, before or after round 15: the consultant\'s name in H, the name on the office\'s record in BD, a room in AV, the change notice in BN and BO, the homeowner notice in BK and BL. Messages that still have to be sent (a question to an office, a request to reply GOT IT n, a files email, a reply about an arrival time) are not counted either: they are listed for each hearing under what_remains, and one message can serve every hearing of a docket.',
      proofs_missing_on_the_sheet_after_this_filing: 'What column U of the gate sheet reads once every link and typed cell above is in: one for each open check, the files check counted by its two halves. Worked out here by rules S11 and S12 from the words of the messages; cli/check.js compares it with column U of the installed sheet.',
    },
    decision: 'Auto-file is OFF this season: nothing fills a cell on its own. The condition for switching it on is the sheet\'s own sentence (Reader suggestions A168): at the live-week-4 review Alice may decide that proposals both readers agree on, of one kind, fill their cell without the 9:00 pass, but only if the Friday sample found no wrong link of that kind in four weeks running. The firm\'s two-week log is the measurement that feeds that review; it is not a second condition. The counts in this file are from the example and unseen messages and decide nothing.',
    caution: 'The answer key was written by one person, the author of the readers\' instructions. The 72 examples were used while the readers\' instructions were written; the 30 unseen messages were not, and were written to be hard. Both sets are small and neither is a sample of a real mailbox. These are counts, not a policy.',
    examples_72: claimLevel(examples, G.dir),
    unseen_30: claimLevel(unseen, B.dir),
    sheet_examples_72: sheetLevel,
    threads,
  };
}

function print(r) {
  const pc = (s) => (s.share === null ? 'n/a' : `${(100 * s.share).toFixed(1)}%, 95% interval ${(100 * s.interval95[0]).toFixed(1)}% to ${(100 * s.interval95[1]).toFixed(1)}%`);
  console.log('Auto-file analysis from the recorded runs. No model was called. These are counts, not a policy.');
  for (const [name, s] of r.extra_set ? [[`${r.extra_set.messages} messages of ${r.set}`, r.extra_set]] : [['72 example messages', r.examples_72], ['30 unseen messages', r.unseen_30]]) {
    console.log(`\n${name}`);
    console.log(`  Closing readings in the answer key: ${s.closing_readings_in_the_answer_key}.`);
    console.log(`  Closing readings both readers agreed on: ${s.agreed_by_both_readers}. Of those ${s.agreed_by_both_readers}, the verifier passed ${s.agreed_and_passed_by_the_verifier} as a fact and did not pass ${s.agreed_but_not_passed.n}${s.agreed_but_not_passed.n ? ` (${Object.entries(s.agreed_but_not_passed.by_verifier_result).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}.`);
    const u = s.agreed_and_passed_that_the_answer_key_cannot_judge;
    if (u.n) {
      console.log(`  Of the ${s.agreed_and_passed_by_the_verifier} agreed and passed, the answer key cannot judge ${u.n}: they are of a claim type that did not exist when it was written (${[...new Set(u.list.map((x) => `${x.type.replace(/_/g, ' ')} in message ${x.message}`))].join(', ')}). They are counted neither as right nor as wrong here, as in eval/run.js.`);
    }
    console.log(`  Of the ${s.of_agreed_and_passed.right.n} agreed and passed${u.n ? ' that the answer key can judge' : ''}: right ${s.of_agreed_and_passed.right.k} (${pc(s.of_agreed_and_passed.right)}), wrong ${s.of_agreed_and_passed.wrong.k}.`);
    if (u.n) console.log(`  Strict count, with those ${u.n} counted as wrong: right ${s.strict_count_unjudged_as_wrong.right.k} of ${s.strict_count_unjudged_as_wrong.right.n} (${pc(s.strict_count_unjudged_as_wrong.right)}), wrong ${s.strict_count_unjudged_as_wrong.wrong.k}.`);
    for (const w of s.wrong_by_message) console.log(`    Wrong: message ${w.message}, ${w.type.replace(/_/g, ' ')} for ${w.case}. ${w.why_wrong} Words: "${w.quote}"`);
    console.log(`  Of the ${s.answer_key_closing_readings_that_would_file_themselves.n} closing readings in the answer key, ${s.answer_key_closing_readings_that_would_file_themselves.k} are agreed, passed and right.`);
    console.log(`  Held back for a person because only one reader found them: ${s.held_back_for_a_person.n}. In the answer key: ${s.held_back_for_a_person.in_the_answer_key} of ${s.held_back_for_a_person.n}.`);
  }
  if (r.extra_set) return;
  const t = r.sheet_examples_72;
  console.log('\nThe 72 examples as proof links on the sheet');
  console.log(`  Proof links proposed: ${t.proof_links_proposed}. Agreed and passed: ${t.agreed_and_passed} of ${t.proof_links_proposed}. Right against the answer key: ${t.of_agreed_and_passed.right.k} of ${t.of_agreed_and_passed.right.n} (${pc(t.of_agreed_and_passed.right)}), wrong ${t.of_agreed_and_passed.wrong.k}.`);
  console.log(`  Proof links in the answer key: ${t.proof_links_in_the_answer_key}. Not proposed by the readers: ${t.in_the_answer_key_but_not_proposed.length}${t.in_the_answer_key_but_not_proposed.length ? ` (${t.in_the_answer_key_but_not_proposed.map((x) => `${x.case} ${x.gate} message ${x.message}`).join('; ')})` : ''}.`);
  console.log(`  Half proofs (a case-file receipt while the other half of G4 is missing): ${t.half_proofs.proposed} proposed, ${t.half_proofs.right} of ${t.half_proofs.proposed} right.`);
  console.log(`  Hearings whose five cells are the same as with the answer key: ${t.hearings_identical_to_the_answer_key.k} of ${t.hearings_identical_to_the_answer_key.n}${t.hearings_identical_to_the_answer_key.differing.length ? ` (different: ${t.hearings_identical_to_the_answer_key.differing.map((d) => `${d.case}, ${d.cells.join(' and ')}`).join('; ')})` : ''}.`);
  console.log('\nPerson actions for each hearing on the gate sheet as it is installed, auto-file off and on. Auto-file is OFF this season, so "off" is the plan. A count of actions, not a timing. The count covers the proof links and the cells that the sheet\'s rules for the files check, the consultant\'s name beside a link and the arrival time read (rules S1, S11, S12 and S15, on the sheet since round 15). The cells the sheet gained in rounds 16 and 17 are not in this count.');
  for (const th of r.threads) {
    console.log(`  ${th.thread}`);
    console.log(`    Messages still to send for the docket after the filing: ${th.messages_still_to_send_for_the_docket.n}${th.messages_still_to_send_for_the_docket.n ? ` (${th.messages_still_to_send_for_the_docket.list.join('; ')})` : ''}. The homeowner notices are not in this count.`);
    for (const h of th.hearings) {
      const b = h.proof_links_only_the_method_before_round_15;
      console.log(`    ${h.case} ${h.property}: off ${h.person_actions_auto_file_off}, on ${h.person_actions_auto_file_on}. Proposed links ${h.proof_links_proposed}, half proofs ${h.half_proofs_proposed}, of those agreed and passed ${h.of_those_agreed_and_passed}; proofs to type ${h.proofs_in_the_answer_key_the_readers_did_not_propose}; messages to a person ${h.messages_of_the_thread_handed_to_a_person.length}; cells a person types that the readers do not propose ${h.cells_a_person_types_on_the_round_15_sheet.length}${h.cells_a_person_types_on_the_round_15_sheet.length ? ` (${h.cells_a_person_types_on_the_round_15_sheet.map((x) => x.cell.replace('Hearings ', '')).join(', ')})` : ''}. Proof links only, the method before round 15: off ${b.person_actions_auto_file_off}, on ${b.person_actions_auto_file_on}.`);
      console.log(`      The readers closed ${h.cells_closed_by_the_readers} of ${h.cells_that_apply} cells. On the sheet, after this filing: ${h.status_on_the_sheet_after_this_filing}.`);
      if (!h.what_remains.length) console.log('      What remains: nothing.');
      for (const w of h.what_remains) console.log(`      What remains: ${w}`);
    }
  }
  console.log(`  Not counted as actions: ${r.definitions.not_counted}`);
  console.log(`\n${r.decision}`);
  console.log(r.caution);
}

module.exports = { analyse, OUT, SHEET_PROOFS_MISSING, NAMES_VERSION, IS_LINK };

if (require.main === module) {
  const opt = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
  const extra = opt('--set') ? { set: opt('--set'), reads: opt('--reads') || 'data/recorded_reads.json' } : null;
  analyse(extra).then((r) => {
    print(r);
    if (extra) { if (opt('--out')) { fs.writeFileSync(path.resolve(ROOT, opt('--out')), JSON.stringify(r, null, 1) + '\n'); console.log(`Written: ${opt('--out')}`); } return; }
    if (!process.argv.includes('--no-write')) { fs.writeFileSync(OUT, JSON.stringify(r, null, 1) + '\n'); console.log(`Written: ${path.relative(ROOT, OUT)}`); }
  }).catch((e) => { console.error(e); process.exit(1); });
}
