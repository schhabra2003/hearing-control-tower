'use strict';
// Fixed checks for the office-reply rule (src/office_rule.js) and the submission simulator (cli/office.js).
//
//     node cli/check_office.js        every check, pass or fail, and "n of n" at the end
//     node cli/check_office.js -q     only the failures and the last line
//
// The checks cover each kind of office message, the HOLD on a process change (since round 16 a block: no notice
// goes to the office until a person approves, then the new route, and the old route only while the office still
// accepts it), a notice the office cannot find, the call a new route needs, what the rule must hand to a
// person, the shape of what it returns, the simulator's output, and the measured counts recorded in
// eval/office_examples.json. A measured count is checked by measuring again: if the rule or a label changes and
// a count moves, the check fails until the recorded count is deliberately updated.
//
// Nothing is sent and nothing outside this run is written.

const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const rule = require('../src/office_rule.js');
const { classifyOfficeReply, OFFICE_KINDS } = rule;
const sim = require('./office.js');

const root = path.resolve(__dirname, '..');
const packet = JSON.parse(fs.readFileSync(path.join(root, 'data/packet.json'), 'utf8'));
const examples = JSON.parse(fs.readFileSync(path.join(root, 'eval/office_examples.json'), 'utf8'));
const consultants = packet.consultants.map((c) => c.name);
const quiet = process.argv.includes('-q');

const results = [];
function check(name, fn) {
  let ok = false;
  let note = '';
  try { const r = fn(); ok = r === true; if (r !== true) note = typeof r === 'string' ? r : 'the condition is false'; } catch (e) { note = `threw: ${e.message}`; }
  results.push({ name, ok, note });
}
const cell = (r, column, tab = 'Hearings') => r.proposals.find((p) => p.tab === tab && p.column === column);
const cols = (r) => r.proposals.map((p) => `${p.tab} ${p.column}`).sort().join(', ');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const expectKind = (r, kind) => (r.kind === kind ? true : `kind is ${r.kind}, expected ${kind}`);
const all = (...tests) => { for (const t of tests) if (t !== true) return t || 'the condition is false'; return true; };
const ctx = { county: 'Larkmere', consultants };

// ---- The shape of the module and of what it returns.
check('The module exports classifyOfficeReply, OFFICE_KINDS, holdSentence, since round 16 BLOCK, routeState and routeText, and since round 17 REPEAT, markRepeats and versionNamed.', () => same(Object.keys(rule).sort(), ['BLOCK', 'OFFICE_KINDS', 'REPEAT', 'classifyOfficeReply', 'holdSentence', 'markRepeats', 'routeState', 'routeText', 'versionNamed']));
check('OFFICE_KINDS holds the nine kinds.', () => same(Object.keys(OFFICE_KINDS).sort(), ['ack_named', 'ack_no_name', 'cancellation_processed', 'cannot_find', 'date_time_change', 'deadline', 'for_person', 'link_or_number', 'process_change']));
check('The result has kind, proposals, hold, forPerson and reason, and every proposal has tab, column, value and why.', () => {
  const r = classifyOfficeReply('Leo is recorded as representative for 102 Willow Lane. Both packets received. Video room C is confirmed.', ctx);
  return all(['kind', 'proposals', 'hold', 'forPerson', 'reason'].every((k) => k in r), typeof r.hold === 'boolean', typeof r.forPerson === 'boolean', typeof r.reason === 'string' && r.reason.length > 0,
    r.proposals.length > 0 && r.proposals.every((p) => p.tab && p.column && p.value && p.why));
});
check('The context may be left out, empty, or carry only a county.', () => all(
  expectKind(classifyOfficeReply('Thank you.'), 'for_person'),
  expectKind(classifyOfficeReply('Thank you.', {}), 'for_person'),
  expectKind(classifyOfficeReply('Leo is recorded for both.', { county: 'Larkmere' }), 'ack_named')));
check('An empty message goes to a person with no proposal.', () => { const r = classifyOfficeReply('', ctx); return all(expectKind(r, 'for_person'), r.proposals.length === 0, r.forPerson === true, r.hold === false); });

// ---- An acknowledgment that names our representative.
check('ack_named: "Leo is recorded as representative" proposes the link in K and the full name in BD.', () => {
  const r = classifyOfficeReply('Leo is recorded as representative for 102 Willow Lane and 118 Willow Lane.', ctx);
  return all(expectKind(r, 'ack_named'), cell(r, 'K').value === 'the link to this message', cell(r, 'BD').value === 'Leo Arlen', r.hold === false, r.forPerson === false);
});
check('ack_named: without a consultant list BD holds the name as the office wrote it.', () => cell(classifyOfficeReply('Leo is recorded for both.', {}), 'BD').value === 'Leo');
check('ack_named: a name that is not on the consultant list is kept as written, with a warning.', () => {
  const r = classifyOfficeReply('Our record shows Sam Reed for 14 Willow Lane.', ctx);
  return all(expectKind(r, 'ack_named'), cell(r, 'BD').value === 'Sam Reed', /not on the consultant list/.test(cell(r, 'BD').why));
});
check('ack_named: "Staffing notices naming Leo have been accepted" counts.', () => expectKind(classifyOfficeReply('Staffing notices naming Leo have been accepted.', ctx), 'ack_named'));
check('ack_named: a first name shared by two consultants goes to a person.', () => {
  const r = classifyOfficeReply('Leo is recorded for both.', { consultants: ['Leo Arlen', 'Leo Marsh'] });
  return all(expectKind(r, 'for_person'), r.proposals.length === 0);
});
check('ack_named by phone keeps its kind but proposes no K: a confirmation by phone is not a record.', () => {
  const r = classifyOfficeReply('Clerk Ren called: Owen is entered on the list of representatives.', ctx);
  return all(expectKind(r, 'ack_named'), !cell(r, 'K'), !cell(r, 'BD'), Boolean(cell(r, 'Y')), r.inWriting === false);
});
check('"We can record Leo" is an offer and not a record: a person, no proposal (packet message 11).', () => {
  const r = classifyOfficeReply(packet.messages.find((m) => m.id === 11).body, { county: 'Velloran', consultants });
  return all(expectKind(r, 'for_person'), r.proposals.length === 0, /offer and not a record/.test(r.reason));
});
check('"Leo is not recorded" goes to a person.', () => expectKind(classifyOfficeReply('Leo is not recorded for 14 Willow Lane.', ctx), 'for_person'));
check('"34 Maple Lane, Iverfen remains listed for June 14" is a schedule and not a name on record.', () => { const r = classifyOfficeReply('34 Maple Lane, Iverfen remains listed for June 14.', { consultants }); return all(expectKind(r, 'for_person'), !cell(r, 'K')); });

// ---- An acknowledgment without a name.
check('ack_no_name: "We have received your staffing notice" leaves K empty and asks which name is on record.', () => {
  const r = classifyOfficeReply('We have received your staffing notice.', ctx);
  return all(expectKind(r, 'ack_no_name'), !cell(r, 'K'), !cell(r, 'BD'), Boolean(cell(r, 'Y')));
});
check('ack_no_name: a receipt for case files proposes L and nothing for G3 (packet message 64).', () => {
  const r = classifyOfficeReply(packet.messages.find((m) => m.id === 64).body, ctx);
  return all(expectKind(r, 'ack_no_name'), cols(r) === 'Hearings L');
});

// ---- The office cannot find our notice or form.
const CANNOT_FIND_CELLS = 'Hearings AA, Hearings CP, Hearings CQ, Hearings Y';
check('cannot_find (D3): "We cannot find your staffing notice" proposes the link in CP, the day ours went in CQ, the resend and the call as a task in Y and AA, and no proof.', () => {
  const r = classifyOfficeReply('We cannot find your staffing notice for 28 Willow Lane.', ctx);
  return all(expectKind(r, 'cannot_find'), cols(r) === CANNOT_FIND_CELLS, /RESEND/.test(cell(r, 'Y').value), /CALL THE OFFICE IN ITS HOURS/.test(cell(r, 'Y').value), cell(r, 'Y').appliesTo === '28 Willow Lane',
    cell(r, 'CP').value === 'the link to this message, if our notice or form went (if none went, leave CP and CQ empty and send it now)', cell(r, 'CP').appliesTo === '28 Willow Lane', /OFFICE CANNOT FIND OUR NOTICE/.test(cell(r, 'CP').why), !cell(r, 'K'), !cell(r, 'BD'),
    cell(r, 'CP').header === 'The office says it cannot find our notice (link to its message or to the dated call note)',
    cell(r, 'CQ').header === 'Our notice or form for this hearing went to the office on (date, or the link to the sent message)', cell(r, 'AA').header === 'Due');
});
check('cannot_find (D3): the clerk who cannot find the form by phone (packet message 24) gives CP for the dated call note and "tomorrow morning" in AA, as the clerk asked.', () => {
  const m = packet.messages.find((x) => x.id === 24);
  const r = classifyOfficeReply(m.body, { county: 'Tesswick', consultants, channel: m.channel });
  return all(expectKind(r, 'cannot_find'), cols(r) === CANNOT_FIND_CELLS, r.hold === false, /said by phone: link the dated call note/.test(cell(r, 'CP').why), /^tomorrow morning, as the office asked/.test(cell(r, 'AA').value));
});
check('cannot_find (D3): when the caller knows when our notice went (context sentNotice), CQ holds it and CP is the plain link; otherwise CQ asks for the date or the link and never invents one, and CP is proposed only on the condition that a notice went (packet message 16: none went for 24 Orchard Road).', () => all(
  cell(classifyOfficeReply('We cannot find your form.', { county: 'Tesswick', sentNotice: 'https://mailbox.example/message/23' }), 'CQ').value === 'https://mailbox.example/message/23',
  cell(classifyOfficeReply('We cannot find your form.', { county: 'Tesswick', sentNotice: 'https://mailbox.example/message/23' }), 'CP').value === 'the link to this message',
  /^the link to this message, if our notice or form went/.test(cell(classifyOfficeReply(packet.messages.find((m) => m.id === 16).body, { county: 'Orimere', consultants }), 'CP').value),
  cell(classifyOfficeReply('We cannot find your form.', { county: 'Tesswick' }), 'CQ').value === 'the date our notice or form went, or the link to the sent message',
  cell(classifyOfficeReply('We cannot find your form.', { county: 'Tesswick' }), 'AA').value === "today, in the office's hours"));
check('Not cannot_find: an acknowledgment proposes no CP and no CQ (packet messages 37 and 64).', () => [37, 64].every((id) => { const r = classifyOfficeReply(packet.messages.find((m) => m.id === id).body, ctx); return !cell(r, 'CP') && !cell(r, 'CQ'); }));
check('cannot_find beside a name for another case: K and BD only for the case the office has (packet message 16).', () => {
  const r = classifyOfficeReply(packet.messages.find((m) => m.id === 16).body, { county: 'Orimere', consultants });
  return all(expectKind(r, 'cannot_find'), cell(r, 'K').appliesTo === '9 Orchard Road', cell(r, 'BD').value === 'Nora Pell', cell(r, 'Y').appliesTo === '24 Orchard Road');
});

// ---- A deadline.
check('deadline for the notices goes in AW, and BH counts the request (packet message 6).', () => {
  const r = classifyOfficeReply(packet.messages.find((m) => m.id === 6).body, ctx);
  return all(expectKind(r, 'deadline'), cell(r, 'AW').value === 'June 7, 4:00 p.m.', cell(r, 'BH').value === 'add 1', cols(r) === 'Hearings AW, Hearings BH');
});
check('deadline for something owed goes in N and BA, not in AW (packet message 59).', () => {
  const r = classifyOfficeReply(packet.messages.find((m) => m.id === 59).body, { county: 'Juniper Reach', consultants });
  return all(expectKind(r, 'deadline'), cell(r, 'N').value === 'homeowner statement', cell(r, 'BA').value === 'June 8, 4:00 p.m.', !cell(r, 'AW'), cell(r, 'N').appliesTo === '57 Clover Road');
});
check('A hearing time is not a deadline: "set for June 10 at 9 a.m. by video" proposes no AW.', () => !cell(classifyOfficeReply('The hearing is set for June 10 at 9 a.m. by video.', ctx), 'AW'));
check('An arrival time is not a deadline: "Please arrive by 9:45 a.m." is proposed for CI as minutes a person works out, and not for AW or AV.', () => { const r = classifyOfficeReply('Please arrive by 9:45 a.m. at the latest.', ctx); return all(!cell(r, 'AW'), !cell(r, 'AV'), Boolean(cell(r, 'CI')), /a person works it out/.test(cell(r, 'CI').value)); });

// ---- A date or time change.
check('date_time_change in writing: D, E and I for the moved row, and J and H cleared.', () => {
  const r = classifyOfficeReply('The hearing for 48 Linden Avenue has been moved from June 6 to June 13 at 10 a.m.', { county: 'Harthmere', consultants });
  return all(expectKind(r, 'date_time_change'), cell(r, 'D').value === 'June 13', cell(r, 'E').value === '10:00 a.m.', cell(r, 'I').value === 'the link to this message',
    cell(r, 'J').value === '(clear the cell)', cell(r, 'H').value === '(clear the cell)', cell(r, 'D').appliesTo === '48 Linden Avenue');
});
check('date_time_change: only the moved hearing is touched, and the refusal is linked in BJ (packet message 17).', () => {
  const r = classifyOfficeReply(packet.messages.find((m) => m.id === 17).body, { county: 'Orimere', consultants });
  const d = r.proposals.filter((p) => p.column === 'D');
  return all(expectKind(r, 'date_time_change'), d.length === 1 && d[0].appliesTo === '9 Orchard Road' && d[0].value === 'June 18', r.proposals.some((p) => p.column === 'BJ' && p.appliesTo === '24 Orchard Road'));
});
check('Round 18 (K1, K2): a new date in writing also clears K (the old link kept in a note in Y) and proposes the old date for DR.', () => {
  const r = classifyOfficeReply('The hearing for 48 Linden Avenue has been moved from June 6 to June 13 at 10 a.m.', { county: 'Harthmere', consultants });
  return all(expectKind(r, 'date_time_change'), cell(r, 'K').value === '(clear the cell; keep the old link in a note in Y)', cell(r, 'DR').value === 'June 6', cell(r, 'DR').appliesTo === '48 Linden Avenue',
    cell(r, 'DR').header === 'This hearing was moved: the date it had before (type it when an office moves a hearing, whoever asked for the move)');
});
check('Round 18: a new time on the same day keeps the office\'s record: no K and no DR.', () => {
  const r = classifyOfficeReply('28 Willow Lane is brought forward from 9:30 a.m. to 9 a.m. and will be heard in the same sitting.', { county: 'Larkmere', consultants });
  return all(expectKind(r, 'date_time_change'), !cell(r, 'K'), !cell(r, 'DR'), Boolean(cell(r, 'E')));
});
check('date_time_change by phone moves nothing: no D or E, a warning in BN and a request for the notice (packet message 46).', () => {
  const m = packet.messages.find((x) => x.id === 46);
  const r = classifyOfficeReply(m.body, { county: 'Harthmere', consultants, channel: m.channel });
  return all(expectKind(r, 'date_time_change'), !cell(r, 'D'), !cell(r, 'E'), Boolean(cell(r, 'BN')), Boolean(cell(r, 'Y')), r.inWriting === false);
});
check('A request to move is not a move: "The homeowner asked to move the hearing to June 20" goes to a person.', () => { const r = classifyOfficeReply('The homeowner asked to move the hearing to June 20.', ctx); return all(expectKind(r, 'for_person'), !cell(r, 'D')); });
check('A postponement without a new date goes to a person.', () => expectKind(classifyOfficeReply('The hearing for 14 Willow Lane has been postponed. A new date will follow.', ctx), 'for_person'));

// ---- A cancellation or withdrawal processed.
check('cancellation_processed: the office\'s written confirmation proposes AF.', () => {
  const r = classifyOfficeReply('The withdrawal for 18 Maple Lane has been processed and the hearing has been removed from our schedule.', { county: 'Iverfen', consultants });
  return all(expectKind(r, 'cancellation_processed'), cols(r) === 'Hearings AF', cell(r, 'AF').value === 'the link to this message');
});
check('A withdrawal that is only asked for proposes no AF and goes to a person (packet message 51).', () => {
  const r = classifyOfficeReply(packet.messages.find((m) => m.id === 51).body, { county: 'Iverfen', consultants });
  return all(expectKind(r, 'for_person'), !cell(r, 'AF'));
});
check('"remain listed" proposes no AF (packet message 53).', () => { const r = classifyOfficeReply(packet.messages.find((m) => m.id === 53).body, { county: 'Iverfen', consultants }); return all(expectKind(r, 'for_person'), !cell(r, 'AF')); });
check('A cancellation said by phone proposes no AF.', () => { const r = classifyOfficeReply('Clerk Ana called: the hearing for 18 Maple Lane has been cancelled.', ctx); return all(expectKind(r, 'cancellation_processed'), !cell(r, 'AF'), Boolean(cell(r, 'Y'))); });

// ---- A room, video link or call-in number.
check('link_or_number: a video link goes in AV.', () => {
  const r = classifyOfficeReply('The hearing link is https://video.example/iverfen/room-4.', ctx);
  return all(expectKind(r, 'link_or_number'), cell(r, 'AV').value === 'https://video.example/iverfen/room-4');
});
check('link_or_number: a call-in number goes in AV.', () => { const r = classifyOfficeReply('Dial in at 555-0142, access code 99812.', ctx); return all(expectKind(r, 'link_or_number'), /555-0142/.test(cell(r, 'AV').value)); });
check('link_or_number: a room that replaces another also proposes BN (packet message 45).', () => {
  const r = classifyOfficeReply(packet.messages.find((m) => m.id === 45).body, { county: 'Harthmere', consultants });
  return all(expectKind(r, 'link_or_number'), cell(r, 'AV').value === 'room D', Boolean(cell(r, 'BN')));
});
check('link_or_number: an arrival instruction goes in CI as the number of minutes, not in AV, beside the receipt in L (packet message 40; sheet rule S15).', () => {
  const r = classifyOfficeReply(packet.messages.find((m) => m.id === 40).body, { county: 'Fenwick Vale', consultants });
  return all(expectKind(r, 'link_or_number'), !cell(r, 'AV'), cell(r, 'CI').value === '15', /minutes before the first case/.test(cell(r, 'CI').header), /not in AV/.test(cell(r, 'CI').why), Boolean(cell(r, 'L')));
});
check('link_or_number: a room and an arrival instruction in one message give the room in AV and the minutes in CI.', () => {
  const r = classifyOfficeReply('The hearings will be in room 3. Please arrive 20 minutes before the first case.', ctx);
  return all(expectKind(r, 'link_or_number'), cell(r, 'AV').value === 'room 3', cell(r, 'CI').value === '20', cols(r) === 'Hearings AV, Hearings CI');
});
check('No proposal of the rule puts words about arriving in AV, on the 72 packet messages, the 30 unseen ones and the 90 prepared answers.', () => {
  const held = JSON.parse(fs.readFileSync(path.join(root, 'data/heldout.json'), 'utf8'));
  const texts = [...packet.messages.map((m) => m.body), ...held.messages.map((m) => m.body)];
  for (const office of packet.counties) { const s = sim.buildSubmission(packet, office.county); if (s && s.named.length) for (const a of sim.preparedAnswers(s, packet)) texts.push(a.text); }
  const bad = texts.filter((t) => classifyOfficeReply(t, ctx).proposals.some((p) => p.column === 'AV' && /arriv|minutes before|check in/i.test(p.value)));
  return bad.length === 0 ? true : `AV holds an arrival instruction for: ${bad[0]}`;
});

// ---- A process change, and the HOLD.
// Lead decision of round 16 (it replaces decision (a) of round 15d, "send by both routes"): a changed office route
// is BLOCKED until a person approves. NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY.
// After the approval the new route is the route, and the old route is a second route only while the office
// still accepts it. HOLD_SHEET is typed here by hand from the installed gate sheet (Reader suggestions C171,
// read from the sheet dump on 20 Nov 2026), so the check fails if the tool and the sheet drift apart.
const BLOCK_SHEET = 'NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY';
const HOLD_SHEET = 'HOLD: NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY. The Tesswick office said it changed how it works. A person reads the change and types their name in Offices AQ and the date in Offices AR. After the approval the new route is the route, and the old route is a second route only while the office still accepts it (Offices AS: yes or not known).';
const HOLD_LARKMERE = HOLD_SHEET.replace('Tesswick', 'Larkmere');
// The wording of round 15d, which must be gone from every tool: it told people to send before anybody approved.
const sendsBeforeApproval = /both routes|Notices do not stop|notices keep going|send every notice by/i;
check('holdSentence (D2) is word for word the sentence the gate sheet prints (Reader suggestions C171): no notice goes until a person approves, and it names the approval cells Offices AQ and AR.', () => all(
  rule.holdSentence('the Tesswick office') === HOLD_SHEET, rule.holdSentence('the Larkmere office') === HOLD_LARKMERE, rule.BLOCK === BLOCK_SHEET, HOLD_SHEET.includes(BLOCK_SHEET),
  /Offices AQ and the date in Offices AR/.test(HOLD_SHEET), !sendsBeforeApproval.test(HOLD_SHEET), rule.holdSentence('this office').includes('. This office said it changed how it works.')));
const OLD = 'Email case IDs and representative name to clerk; government acknowledgment required.';
const NEW = 'Phone, clerk Ren (message 22): staffing form, then a call. Written confirmation asked';
const tess = (extra) => ({ change: NEW, county: 'Tesswick', oldRoute: OLD, hours: '09:00 to 16:00 local, Monday-Friday', row: 5, ...extra });
check('routeState (D2) is the sheet\'s formula in Offices AV: 0 with no change; 1 until a name AND a date are typed; 2 when the office no longer accepts the old route; 3 otherwise.', () => all(
  rule.routeState({}) === 0, rule.routeState({ change: '  ' }) === 0, rule.routeState(tess()) === 1,
  rule.routeState(tess({ approvedBy: 'Alice', approvedOn: '2030-06-07', stillAccepts: 'no' })) === 2,
  rule.routeState(tess({ approvedBy: 'Alice', approvedOn: new Date('2030-06-07T00:00:00Z'), stillAccepts: 'No ' })) === 2,
  rule.routeState(tess({ approvedBy: 'Alice', approvedOn: '2030-06-07', stillAccepts: 'yes' })) === 3,
  rule.routeState(tess({ approvedBy: 'Alice', approvedOn: '2030-06-07', stillAccepts: 'not known' })) === 3,
  rule.routeState(tess({ approvedBy: 'Alice', approvedOn: '2030-06-07' })) === 3));
check('routeState (D2), what does NOT lift the block: a name without a date, a date without a name, a date typed as words, and a written confirmation dated before the change.', () => all(
  rule.routeState(tess({ approvedBy: 'Alice' })) === 1, rule.routeState(tess({ approvedOn: '2030-06-07' })) === 1, rule.routeState(tess({ approvedBy: 'Alice', approvedOn: '7 June' })) === 1,
  rule.routeState(tess({ approvedBy: '   ', approvedOn: '2030-06-07' })) === 1, rule.routeState(tess({ confirmedOn: '2030-05-15', saidOn: '2030-06-04', stillAccepts: 'no' })) === 1,
  rule.routeState(tess({ confirmedOn: '2030-06-05' })) === 1));
check('routeState (D2): the office\'s written confirmation dated on or after the change lifts the block like an approval (Offices L and AT).', () => all(
  rule.routeState(tess({ confirmedOn: '2030-06-05', saidOn: '2030-06-04', stillAccepts: 'no' })) === 2, rule.routeState(tess({ confirmedOn: '2030-06-04', saidOn: '2030-06-04' })) === 3));
check('routeText (D2), blocked: the line is the sheet\'s block clause for Tesswick word for word (Offices AW5), it prints no route at all, and no call task.', () => {
  const t = rule.routeText(tess({ stillAccepts: 'no' }));
  return all(t.state === 1, t.blocked === true, t.routes.length === 0, !t.line.includes(OLD), !t.line.includes('staffing form'), t.needsCall === false, t.callTask === '',
    t.line === 'NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY: the Tesswick office said it changed how it works (Offices M5). To approve, a person types their name in Offices AQ5 and the date in Offices AR5. No route is printed until then.');
});
check('routeText (D2), approved and the office no longer accepts the old route: the new route only; the old email route is printed nowhere.', () => {
  const t = rule.routeText(tess({ approvedBy: 'Alice', approvedOn: '2030-06-07', stillAccepts: 'no' }));
  return all(t.state === 2, same(t.routes, [NEW]), !t.line.includes(OLD), !/Email case IDs/.test(t.line), /NEW ROUTE \(Offices M, approved by Alice on Fri 7 Jun\)/.test(t.line), /NEW ROUTE \(Offices M, confirmed by the office in writing on Wed 5 Jun\)/.test(rule.routeText(tess({ confirmedOn: '2030-06-05', saidOn: '2030-06-04', stillAccepts: 'no' })).line), /THE OFFICE NO LONGER ACCEPTS THE OLD ROUTE \(Offices AS\): DO NOT USE IT\.$/.test(t.line));
});
check('routeText (D2), approved and the office still accepts the old route, or has not said: the new route first, the old route second.', () => {
  const y = rule.routeText(tess({ approvedBy: 'Alice', approvedOn: '2030-06-07', stillAccepts: 'yes' })), n = rule.routeText(tess({ approvedBy: 'Alice', approvedOn: '2030-06-07', stillAccepts: 'not known' }));
  return all(y.state === 3, n.state === 3, same(y.routes, [NEW, OLD]), y.line.indexOf(NEW) < y.line.indexOf(OLD), /\(2\) THE OLD ROUTE, WHICH THE OFFICE STILL ACCEPTS \(Offices F\)/.test(y.line), /\(2\) THE OLD ROUTE, WHICH THE OFFICE HAS NOT SAID IT NO LONGER ACCEPTS \(Offices F\)/.test(n.line));
});
check('routeText with no change typed prints the office\'s own route, as before.', () => { const t = rule.routeText({ county: 'Larkmere', oldRoute: 'Staffing notice naming the representative' }); return all(t.state === 0, same(t.routes, ['Staffing notice naming the representative']), /OFFICE'S OWN ROUTE \(Offices F\)/.test(t.line)); });
check('The call a new route needs (D4) is a task with the office\'s hours, only after the approval and only when the change says "call" (Offices AX).', () => {
  const blocked = rule.routeText(tess()), ok = rule.routeText(tess({ approvedBy: 'Alice', approvedOn: '2030-06-07', stillAccepts: 'no' })), noCall = rule.routeText(tess({ change: 'Upload the form to the portal', approvedBy: 'Alice', approvedOn: '2030-06-07' }));
  return all(blocked.needsCall === false, ok.needsCall === true, noCall.needsCall === false, noCall.callTask === '',
    ok.callTask === 'CALL THE TESSWICK OFFICE IN ITS HOURS (Offices D: 09:00 to 16:00 local, Monday-Friday): TYPE THE CALL IN Y (WHAT), Z (WHO) AND AA (BY WHEN).');
});
const holdTexts = [
  ['"no longer"', 'We no longer accept names by email.'],
  ['"now requires"', 'The office now requires a signed form for each representative.'],
  ['"from now on"', 'From now on, staffing notices must be uploaded through the portal.'],
  ['"new form"', 'Please use the new staffing form for every representative.'],
];
for (const [label, text] of holdTexts) {
  check(`process_change: ${label} returns HOLD, proposals for Offices M, AS and AT and nothing else, and the reason starts with the block.`, () => {
    const r = classifyOfficeReply(text, ctx);
    return all(expectKind(r, 'process_change'), r.hold === true, r.forPerson === true, cols(r) === 'Offices AS, Offices AT, Offices M', r.reason.startsWith(HOLD_LARKMERE), !sendsBeforeApproval.test(r.reason));
  });
}
check('process_change (D2): Offices AS is "no" only when the office\'s own words close the old route, and "not known" otherwise; AT asks for the date and invents none.', () => all(
  cell(classifyOfficeReply('We no longer accept names by email.', ctx), 'AS', 'Offices').value === 'no',
  cell(classifyOfficeReply(packet.messages.find((m) => m.id === 22).body, { county: 'Tesswick', channel: 'phone note' }), 'AS', 'Offices').value === 'no',
  cell(classifyOfficeReply('The office now requires a signed form for each representative.', ctx), 'AS', 'Offices').value === 'not known',
  cell(classifyOfficeReply('Please use the new staffing form for every representative.', ctx), 'AS', 'Offices').value === 'not known',
  cell(classifyOfficeReply('We no longer accept names by email.', ctx), 'AT', 'Offices').value === 'the date of this call or message, typed as a date',
  cell(classifyOfficeReply('We no longer accept names by email.', { county: 'Larkmere', saidOn: '2030-06-04' }), 'AT', 'Offices').value === '2030-06-04',
  cell(classifyOfficeReply('We no longer accept names by email.', ctx), 'AS', 'Offices').header === 'Does the office still accept the old route? (yes / no / not known)',
  cell(classifyOfficeReply('We no longer accept names by email.', ctx), 'AT', 'Offices').header === 'Change said on (date of the call or message in column M)'));
check('The approval is a person\'s own act (D2): no proposal of the rule is for Offices AQ or AR, on the 72 packet messages, the 30 unseen ones and the 90 prepared answers.', () => {
  const held = JSON.parse(fs.readFileSync(path.join(root, 'data/heldout.json'), 'utf8'));
  const texts = [...packet.messages.map((m) => m.body), ...held.messages.map((m) => m.body)];
  for (const office of packet.counties) { const s = sim.buildSubmission(packet, office.county); if (s && s.named.length) for (const a of sim.preparedAnswers(s, packet)) texts.push(a.text); }
  const bad = texts.filter((t) => classifyOfficeReply(t, ctx).proposals.some((p) => p.tab === 'Offices' && ['AQ', 'AR'].includes(p.column)));
  return all(texts.length === 192, bad.length === 0 ? true : `AQ or AR proposed for: ${bad[0]}`);
});
check('process_change: the packet\'s own change by phone (message 22) returns HOLD and quotes the clerk in Offices M.', () => {
  const m = packet.messages.find((x) => x.id === 22);
  const r = classifyOfficeReply(m.body, { county: 'Tesswick', consultants, channel: m.channel });
  return all(expectKind(r, 'process_change'), r.hold === true, /no longer enough/.test(cell(r, 'M', 'Offices').value), /said by phone/.test(r.reason));
});
check('HOLD wins over good news in the same message: no K is proposed beside a process change.', () => {
  const r = classifyOfficeReply('Leo is recorded for both. From now on we no longer accept names by email.', ctx);
  return all(expectKind(r, 'process_change'), r.hold === true, !cell(r, 'K'), cols(r) === 'Offices AS, Offices AT, Offices M');
});
check('Not a process change: "is no longer on our schedule" is a cancellation, with no HOLD.', () => {
  const r = classifyOfficeReply('The hearing for 18 Maple Lane is no longer on our schedule.', ctx);
  return all(expectKind(r, 'cancellation_processed'), r.hold === false);
});
check('hold is true for a process change and for nothing else, on all 72 packet messages and all 30 unseen ones.', () => {
  const m = sim.measure();
  return all(same(m.hold_on_all_72, [22]), same(m.hold_on_all_unseen, ['H036', 'H057']));
});

// ---- What must go to a person.
check('A request that no kind explains hands the whole message to a person, with no proposal (packet message 28).', () => {
  const r = classifyOfficeReply(packet.messages.find((m) => m.id === 28).body, { county: 'Brindlefen', consultants });
  return all(expectKind(r, 'for_person'), r.proposals.length === 0, r.forPerson === true);
});
check('A case file the office could not open goes to a person (packet message 34).', () => { const r = classifyOfficeReply(packet.messages.find((m) => m.id === 34).body, { county: 'Caldmere', consultants }); return all(expectKind(r, 'for_person'), r.proposals.length === 0); });
check('"However" after good news goes to a person.', () => expectKind(classifyOfficeReply('Leo is recorded for both. However, the notice for 118 Willow Lane had the wrong case number.', ctx), 'for_person'));
check('A new hearing notice that asks who will attend goes to a person (packet message 1).', () => { const r = classifyOfficeReply(packet.messages.find((m) => m.id === 1).body, ctx); return all(expectKind(r, 'for_person'), /asks who will attend/.test(r.reason)); });
check('A question goes to a person.', () => expectKind(classifyOfficeReply('Can you tell us whether the homeowner will attend as well?', ctx), 'for_person'));

// ---- The measured counts.
const measured = sim.measure();
const rec = examples.measured || {};
const sameCounts = (now, was) => {
  if (!was) return 'no recorded counts in eval/office_examples.json';
  for (const k of ['n', 'right', 'wrong', 'for_person', 'for_person_where_label_has_a_kind', 'wrong_kind_with_proposals', 'cells_right', 'cells_wrong', 'cells_proposed_that_the_label_does_not_have', 'hold', 'mis_sorted_not_handed_to_a_person', 'wrong_cells_proposed']) {
    if (!same(now[k], was[k])) return `${k} is now ${JSON.stringify(now[k])}, recorded ${JSON.stringify(was[k])}`;
  }
  return true;
};
check('The labels file says who wrote the labels.', () => examples.labelled_by === 'the author of the rule' && /before the rule was run/.test(examples.note));
check('The packet has 31 messages from a hearing office, and each one has a label.', () => all(measured.office_senders_in_packet.length === 31, same(measured.office_senders_in_packet, examples.packet_office_messages.map((e) => e.message))));
check('Measured on the 31 packet office messages: 31 of 31 kinds right, 12 handed to a person, 31 of 31 cells right, as recorded.', () => all(
  sameCounts(measured.packet_office_messages, rec.packet_office_messages), measured.packet_office_messages.right === 31, measured.packet_office_messages.for_person === 12, measured.packet_office_messages.cells_right === 31));
check('Measured on the 3 call notes about an office: 3 of 3 right, 1 handed to a person, HOLD on message 22, as recorded.', () => all(
  sameCounts(measured.packet_call_notes, rec.packet_call_notes), measured.packet_call_notes.right === 3, measured.packet_call_notes.for_person === 1, same(measured.packet_call_notes.hold, [22])));
check('All 30 unseen messages are from a hearing office, and each one has a label.', () => all(measured.unseen_total === 30, measured.unseen_from_offices === 30, examples.unseen_office_messages.length === 30));
check('Measured on the 30 unseen office messages: 13 of 30 kinds right, 24 handed to a person, the same wrong ones by number, as recorded.', () => all(
  sameCounts(measured.unseen_office_messages, rec.unseen_office_messages), measured.unseen_office_messages.right === 13, measured.unseen_office_messages.for_person === 24,
  same(measured.unseen_office_messages.wrong_kind_with_proposals, ['H038', 'H059']), same(measured.unseen_office_messages.hold, ['H036', 'H057'])));
check('Every unseen message that is mis-sorted and not handed to a person is named: H038, H047 and H059, with 3 cells the label does not have; none on the packet messages.', () => all(
  same(measured.unseen_office_messages.mis_sorted_not_handed_to_a_person, ['H038', 'H047', 'H059']), measured.unseen_office_messages.wrong_cells_proposed === 3,
  same(measured.packet_office_messages.mis_sorted_not_handed_to_a_person, []), same(measured.packet_call_notes.mis_sorted_not_handed_to_a_person, []),
  // every wrong message is either handed to a person or in the list: nothing mis-sorted is left unreported
  measured.unseen_office_messages.rows.filter((x) => !x.kindRight || !x.cellsRight).every((x) => x.forPerson || measured.unseen_office_messages.mis_sorted_not_handed_to_a_person.includes(x.message))));
check('The first run on the packet messages is recorded with its wrong ones (59, 66, 72).', () => rec.packet_first_run && rec.packet_first_run.right === 28 && same(rec.packet_first_run.wrong, [59, 66, 72]));

// ---- The simulator.
check('Every one of the ten offices gets a simulated submission by its own saved route, and each of the nine prepared answers is sorted as its kind (90 of 90).', () => {
  let n = 0;
  for (const office of packet.counties) {
    const s = sim.buildSubmission(packet, office.county);
    if (!s || !s.named.length) return `${office.county} has no simulated submission`;
    if (s.usesNotice !== /^staffing notice/i.test(office.staffing_rule)) return `${office.county} uses the wrong form`;
    const answers = sim.preparedAnswers(s, packet);
    if (!same(answers.map((a) => a.kind).sort(), Object.keys(OFFICE_KINDS).sort())) return `${office.county} does not have one answer of each kind`;
    for (const a of answers) {
      const r = classifyOfficeReply(a.text, { county: office.county, caseIds: s.named.map((c) => c.case_id), consultants, channel: a.channel || 'email' });
      if (r.kind !== a.kind) return `${office.county}: the answer prepared as ${a.kind} was sorted as ${r.kind}`;
      n += 1;
    }
  }
  return n === 90 ? true : `${n} answers`;
});
check('A name the office has that differs from the consultant in H prints THE OFFICE HAS X, NOT Y with the replacement route.', () => {
  const s = sim.buildSubmission(packet, 'Larkmere');
  const r = classifyOfficeReply('Owen is recorded as representative for 14 Willow Lane and 28 Willow Lane.', { county: 'Larkmere', consultants });
  const lines = sim.sheetThen(r, s).join(' ');
  return all(/THE OFFICE HAS Owen Tarris, NOT Maya Venn/.test(lines), lines.includes(s.office.replacement_rule));
});
const run = (args) => spawnSync(process.execPath, [path.join(root, 'cli/office.js'), ...args], { encoding: 'utf8' });
const whole = run([]);
check('node cli/office.js runs all ten offices, exits 0, and says that it is a simulation and that nothing is sent.', () => all(
  whole.status === 0, /^SIMULATION\. Nothing is sent to any office/.test(whole.stdout), (whole.stdout.match(/^==== .* office \(\d+ of 10\), simulated ====$/gm) || []).length === 10,
  /90 simulated answers at 10 offices: the rule sorted 90 of 90/.test(whole.stdout), /Nothing was sent\.\s*$/.test(whole.stdout)));
check('The simulator\'s output has no em dash and no arrow.', () => !/[\u2014\u2013\u2192]|->|=>/.test(whole.stdout));
check('--try with a typed process change at Tesswick (D2) prints the sheet\'s HOLD sentence, the block with no route, then each state after the approval, and exits 0.', () => {
  const r = run(['--try', 'We now require the staffing form by fax.', '--county', 'Tesswick']);
  return all(r.status === 0, r.stdout.includes(HOLD_SHEET), /Route state 1, blocked \(Offices AV\)\./.test(r.stdout), /Routes printed: 0\./.test(r.stdout), /TOP OF LIST with the words NOTICE BLOCKED/.test(r.stdout),
    /when Offices AS says "no": route state 2\./.test(r.stdout), /when Offices AS says "yes": route state 3\./.test(r.stdout), /To reject the change, a person clears Offices M\./.test(r.stdout), /typed by you/.test(r.stdout), /^SIMULATION\./.test(r.stdout));
});
check('The packet\'s own change (message 22, prepared answer at Tesswick, D2 and D4): Offices AS is "no", so after the approval the old email route is not printed, and the call the new route needs is a task with the office\'s hours.', () => {
  const r = run(['--answer', 'process_change', '--county', 'Tesswick']);
  const after = (r.stdout.split('\n').find((l) => /when Offices AS says "no": route state 2/.test(l)) || '');
  return all(r.status === 0, /Offices AS \(Does the office still accept the old route\? \(yes \/ no \/ not known\)\), for the Tesswick row: no$/m.test(r.stdout), after.length > 0, !after.includes('Email case IDs'),
    /THE OFFICE NO LONGER ACCEPTS THE OLD ROUTE \(Offices AS\): DO NOT USE IT\./.test(after), /CALL THE TESSWICK OFFICE IN ITS HOURS \(Offices D: 09:00 to 16:00 local, Monday-Friday\): TYPE THE CALL IN Y \(WHAT\), Z \(WHO\) AND AA \(BY WHEN\)\./.test(after));
});
check('--answer cannot_find at Tesswick (D3) says what the row then reads, that the form is resent complete, the call in the office\'s hours, and that a resend waits while a change is not approved.', () => {
  const r = run(['--answer', 'cannot_find', '--county', 'Tesswick']);
  return all(r.status === 0, /Hearings CP \(The office says it cannot find our notice/.test(r.stdout), /the row reads OFFICE CANNOT FIND OUR NOTICE at the top of the daily list/.test(r.stdout), /THE NOTICE WAS SENT ON the day typed in CQ BUT THE OFFICE CANNOT FIND IT/.test(r.stdout),
    /CALL THE TESSWICK OFFICE IN ITS HOURS/.test(r.stdout), /A CALL NEVER CLOSES A CHECK: ASK FOR IT IN WRITING/.test(r.stdout), /the form is resent only after the approval/.test(r.stdout));
});
check('No output of the office tools tells anyone to send before a person approves (D2): the whole simulation, --kinds, --help and --measure hold none of the round-15 wording, and every process change prints the block.', () => {
  const texts = [whole.stdout, run(['--kinds']).stdout, run(['--help']).stdout, run(['--measure']).stdout];
  const bad = texts.map((t) => (t.match(sendsBeforeApproval) || [])[0]).filter(Boolean);
  return all(bad.length === 0 ? true : `found "${bad[0]}"`, texts[1].includes(BLOCK_SHEET), (whole.stdout.match(/HOLD: NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY\./g) || []).length >= 10,
    (whole.stdout.match(/Route state 1, blocked \(Offices AV\)\./g) || []).length === 10);
});
check('--try with a phone channel keeps the proof cell empty.', () => {
  const r = run(['--try', 'Owen is recorded for both.', '--county', 'Tesswick', '--channel', 'phone']);
  return all(r.status === 0, /by phone/.test(r.stdout), !/Hearings K \(/.test(r.stdout));
});
check('--answer picks a prepared answer, and an unknown county or flag stops with exit code 2.', () => all(
  run(['--answer', 'cannot_find', '--county', 'Iverfen']).status === 0, run(['--county', 'Nowhere']).status === 2, run(['--bogus']).status === 2, run(['--try']).status === 2));
check('--measure prints the measured counts and the wrong ones by message number.', () => {
  const r = run(['--measure']);
  return all(r.status === 0, /Packet office messages: 31 messages\. Kind right: 31 of 31\./.test(r.stdout), /Unseen office messages: 30 messages\. Kind right: 13 of 30\. Wrong: H031, H033, H038/.test(r.stdout), /Handed to a person: 24\./.test(r.stdout),
    /not handed to a person as a whole message: 3 of 30 \(H038, H047, H059\)/.test(r.stdout), /^  H038: the label is cannot_find, the rule says ack_no_name\./m.test(r.stdout), /^  H047: .*It proposes Hearings L, which the label does not have/m.test(r.stdout), /^  H059: .*It proposes Hearings AW and Hearings BH, which the label does not have/m.test(r.stdout),
    /could reach the sheet without a person: 0 with auto-file off and 0 with --autofile\./.test(r.stdout), /file themselves: 0 of 23 with auto-file off, 0 of 23 with --autofile/.test(r.stdout), /the office rule proposes 24 lines/.test(r.stdout));
});

// ---- Round 17 (K2): a repeat is marked and not proposed again.
{
  const packet = JSON.parse(fs.readFileSync(path.join(root, 'data/packet.json'), 'utf8'));
  const text = (id) => packet.messages.find((m) => m.id === id).body;
  const names = packet.consultants.map((c) => c.name);
  const run = (id, county, caseIds) => ({ message: id, text: text(id), proposals: rule.classifyOfficeReply(text(id), { county, caseIds, consultants: names, channel: 'email' }).proposals });
  const vel = ['AX-123', 'AX-124'], lark = ['AX-121', 'AX-122'];
  // A proposal names its rows by case ID or by street address; the caller says which row each part is (cli/office.js and cli/inbox.js do the same).
  const rows = (p) => String(p.appliesTo || '').split(', ').map((part) => { const c = packet.cases.find((x) => x.case_id === part || x.property.split(',')[0] === part); return c ? c.case_id : part; });
  check('K2. Message 72 after messages 67 and 70 (Velloran): every cell the rule would propose (Hearings K, BD and AV) is a repeat of message 70, in the words REPEAT of message 70: no cell changes.', () => {
    const m = rule.markRepeats(run(72, 'Velloran', vel), [run(67, 'Velloran', vel), run(70, 'Velloran', vel)], rows);
    return all(same(m.map((p) => p.column).sort(), ['AV', 'BD', 'K']), m.every((p) => p.repeatOf === 70 && p.repeatText === 'REPEAT of message 70: no cell changes'));
  });
  check('K2. Message 66 after messages 61 and 64 (Larkmere): Hearings K and BD are repeats of message 61. Hearings L is NOT a repeat, because message 66 names the case-file version ("current") and message 64 did not: it carries the first link 64 and the version for Hearings AZ.', () => {
    const m = rule.markRepeats(run(66, 'Larkmere', lark), [run(61, 'Larkmere', lark), run(64, 'Larkmere', lark)], rows);
    const by = (c) => m.find((p) => p.column === c);
    return all(by('K').repeatOf === 61, by('BD').repeatOf === 61, by('L').repeatOf === undefined, by('L').firstLink === 64, by('L').adds === 'the case-file version',
      by('L').alsoType.column === 'AZ' && /current/.test(by('L').alsoType.value), /^NOT A REPEAT: the cell holds the link of message 64/.test(by('L').notARepeatText));
  });
  check('Round 18. Message 47 after message 43 (Harthmere): the instruction to clear K and the old date for DR are neither a repeat nor a link that replaces the first one.', () => {
    const hm = ['AX-115', 'AX-116'];
    const m = rule.markRepeats(run(47, 'Harthmere', hm), [run(43, 'Harthmere', hm)], rows);
    const by = (c) => m.find((p) => p.column === c);
    return all(Boolean(by('K')), Boolean(by('DR')), [by('K'), by('DR')].every((p) => p.repeatOf === undefined && p.firstLink === undefined && p.notARepeatText === undefined));
  });
  check('K2. A first message is never a repeat, and a receipt that names no version after one that names none is a repeat (it states nothing new).', () => {
    const first = rule.markRepeats(run(70, 'Velloran', vel), []);
    const again = rule.markRepeats({ message: 'b', text: 'Both packets received.', proposals: rule.classifyOfficeReply('Both packets received.', { county: 'Larkmere', caseIds: lark, consultants: names, channel: 'email' }).proposals }, [run(64, 'Larkmere', lark)], rows);
    return all(first.length > 0, first.every((p) => p.repeatOf === undefined && p.firstLink === undefined), again.length === 1, again[0].column === 'L', again[0].repeatOf === 64);
  });
  check('K2. versionNamed reads a version as the sheet does: a number after "version" or "v", or "current"; nothing else.', () => all(rule.versionNamed('we have the current packets') === 'current', rule.versionNamed('Received version 3 of both files') === '3', rule.versionNamed('GOT IT v2') === '2', rule.versionNamed('Both packets received and readable.') === null, rule.REPEAT === 'REPEAT: THE CELL KEEPS ITS FIRST LINK'));
  check('K2. node cli/office.js --try with --earlier: the answer "Owen is recorded for both cases." after the same sentence prints REPEAT of message E1: no cell changes, and --earlier without --try is refused.', () => {
    const r = spawnSync(process.execPath, [path.join(root, 'cli/office.js'), '--try', 'Owen is recorded for both cases.', '--county', 'Velloran', '--earlier', 'Owen is recorded for both cases.'], { encoding: 'utf8' });
    const bad = spawnSync(process.execPath, [path.join(root, 'cli/office.js'), '--county', 'Velloran', '--earlier', 'x'], { encoding: 'utf8' });
    return all(r.status === 0, /E1 is the earlier message you gave with --earlier\./.test(r.stdout), (r.stdout.match(/^    REPEAT of message E1: no cell changes\. Hearings (K|BD) /gm) || []).length === 2, /Repeats: 2 of the 2 cells above repeat an earlier message\./.test(r.stdout), bad.status === 2, /--earlier goes with --try\./.test(bad.stderr));
  });
}

// ---- The result.
for (const r of results) if (!r.ok || !quiet) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n        ${r.note}`}`);
const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass} of ${results.length} office checks pass.`);
process.exitCode = pass === results.length ? 0 : 1;
