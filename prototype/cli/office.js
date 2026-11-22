'use strict';
// A submission to each hearing office, played as a simulation, and the office-reply rule on the answer.
//
//     node cli/office.js                 every one of the ten offices: what is submitted and how (by that office's
//                                        saved process in the packet), then each kind of answer in turn, the kind the
//                                        rule gives, what a person types into which sheet cell, and what the sheet
//                                        then shows or what happens next
//     node cli/office.js --county Tesswick
//                                        the same for one office
//     node cli/office.js --try "<the office's answer>" --county Tesswick [--channel phone] [--earlier "<an earlier message of the office>"]
//                                        the rule once on an answer of your own to that office's simulated submission.
//                                        With --earlier (round 17) the rule first reads the earlier message and then
//                                        says which cells of the answer only repeat it: REPEAT of message n: no cell
//                                        changes. When the answer you type is the text of one of the packet's own
//                                        messages, the earlier messages of that office about the same hearings are
//                                        compared without --earlier.
//     node cli/office.js --answer <kind> --county Tesswick
//                                        one prepared answer; the kinds are listed by --kinds
//     node cli/office.js --kinds         the nine kinds and where each one goes on the sheet
//     node cli/office.js --measure       the rule measured on the packet's own office messages and on the 30 unseen
//                                        ones, against the labels in eval/office_examples.json
//     node cli/office.js --help          this text
//
// This is a simulation. Nothing is sent to any office, no mailbox is read and nothing is written to the sheet.
// The submission is built from data/packet.json: the office's saved route, its form, its replacement route and,
// where one of its own messages states one, its deadline. The prepared answers are fictional and were written by
// the author of the rule, so the run shows how each kind is handled and not how often real answers fit the rule.
// That share is what --measure reports, and what the live weeks will count.
//
// The rule itself is src/office_rule.js: fixed code, no model. It suggests; a person types.

const fs = require('node:fs');
const path = require('node:path');
const { classifyOfficeReply, OFFICE_KINDS, holdSentence, BLOCK, routeText, markRepeats } = require('../src/office_rule.js');

const root = path.resolve(__dirname, '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const sayDate = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}`; };
const shiftDate = (iso, days) => { const t = new Date(`${iso}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + days); return t.toISOString().slice(0, 10); };
const sayTime = (hm) => { const [h, m] = hm.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'a.m.' : 'p.m.'}`; };
const list = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const short = (property) => property.split(',')[0];

// Where each kind goes on the sheet, for --kinds.
const WHERE = {
  ack_named: 'Hearings K (G3, the link) and BD (the name on the office\'s record).',
  ack_no_name: 'K stays empty, because G3 needs the name. A receipt for case files goes in Hearings L.',
  cannot_find: 'Nothing is proved. Hearings CP gets the link to the office\'s message and CQ the day our notice went, so the row reads OFFICE CANNOT FIND OUR NOTICE. Hearings Y and AA get the task: resend complete, then call in the office\'s hours.',
  deadline: 'Hearings AW for a naming deadline, or N and BA for something owed, and BH counts the request.',
  date_time_change: 'Hearings D and E on the moved row, a new link in I, and J and H are cleared.',
  cancellation_processed: 'Hearings AF, the office\'s written proof.',
  link_or_number: 'Hearings AV for a room, link or number, and BN when it replaces an earlier room or link. An arrival instruction goes in Hearings CI, as minutes before the first case.',
  process_change: `Offices M (the change), AS (does the office still accept the old route?) and AT (the day it was said). The approval cells Offices AQ and AR are never proposed: a person types them. ${holdSentence('the office')}`,
  for_person: 'Nothing is proposed. A person reads the message.',
};

// ---------------------------------------------------------------------------------------------
// The simulated submission for one office, from the packet.

function buildSubmission(packet, countyName, docketIds = null) {
  const office = packet.counties.find((c) => c.county.toLowerCase() === String(countyName).toLowerCase());
  if (!office) return null;
  const byId = new Map(packet.consultants.map((c) => [c.consultant_id, c.name]));
  const all = packet.cases.filter((c) => c.county === office.county);
  // The docket: the first two hearings of the office's first day, or (round 17) the hearings named by the caller.
  const docket = docketIds && docketIds.length ? all.filter((c) => docketIds.includes(c.case_id)) : all.filter((c) => c.hearing_date === all[0].hearing_date).slice(0, 2);
  const named = docket.filter((c) => byId.has(c.consultant_id));
  const leftOut = docket.filter((c) => !byId.has(c.consultant_id));
  const usesNotice = /^staffing notice/i.test(office.staffing_rule);
  const form = packet.documents.find((d) => d.kind === 'staffing_form' && new RegExp(office.county, 'i').test(d.text));
  const consultant = named.length ? byId.get(named[0].consultant_id) : null;
  return { office, docket, named, leftOut, usesNotice, form, consultant, byId };
}

function submissionLines(sim, packet) {
  const { office, named, leftOut, usesNotice, form, byId } = sim;
  const out = [];
  out.push(`Saved process in the packet for the ${office.county} office (${office.state}):`);
  out.push(`  How to name our representative: "${office.staffing_rule}"`);
  out.push(`  How to name a replacement: "${office.replacement_rule}"`);
  out.push(`  Office address: ${office.office_email}. Contact hours: ${office.contact_hours}. Hearings are ${office.hearing_mode === 'in_person' ? 'in person' : `by ${office.hearing_mode}`}.`);
  if (office.instructions_recorded_at) out.push(`  These instructions were recorded on ${office.instructions_recorded_at} (the packet gives a date for this office only).`);
  if (form) out.push(`  The packet also holds this office's own blank form, ${form.name}, which asks for: ${form.text.split('\n').filter((l) => /:\s*_+/.test(l)).map((l) => l.split(':')[0].toLowerCase()).join(', ')}.`);
  const deadlines = officeDeadlines(packet, office.county);
  out.push(deadlines.length
    ? `  Naming deadline: ${deadlines.join(' ')} Whether that is its standing rule is a question for the office (Offices O).`
    : '  Naming deadline: the packet states none for this office. The plan asks the office in writing (Offices O).');
  out.push('');
  if (!named.length) { out.push('What is submitted (simulated): nothing, because no case of this office has a consultant on the case record.'); return out; }
  if (usesNotice) {
    out.push(`What is submitted (simulated, not sent): one staffing notice for each case, in the form of the packet's own notices, attached to an email to ${office.office_email}. The packet does not say how a staffing notice is delivered, so the simulation uses the office's address.`);
    for (const c of named) out.push(`    FICTIONAL STAFFING NOTICE. Property: ${c.property}. Case: ${c.case_id}. County: ${c.county}. Representative: ${byId.get(c.consultant_id)}.`);
  } else {
    out.push(`What is submitted (simulated, not sent): one email to ${office.office_email} with the case IDs and the representative's name, as the saved process says.`);
    out.push(`    FICTIONAL EMAIL. Case IDs: ${list(named.map((c) => c.case_id))}. Representative: ${list([...new Set(named.map((c) => byId.get(c.consultant_id)))])}. Hearings: ${sayDate(named[0].hearing_date)} at ${list(named.map((c) => sayTime(c.hearing_time)))}, ${list(named.map((c) => short(c.property)))}.`);
  }
  out.push('  The simulation names the consultant on the firm\'s case record. In the live process "Tell the office" (Dockets N) writes the notice from YES replies only, and only for the cases the office does not have yet.');
  for (const c of leftOut) out.push(`  ${c.case_id}, ${short(c.property)}, has no consultant on the case record, so no notice is made for it.`);
  if (office.county === 'Tesswick') out.push('  The packet also holds a later call note (message 22) in which a clerk changes this route by phone. It is the prepared answer for the kind process_change below.');
  return out;
}

/** Deadlines for naming a representative that this office's own packet messages state, found by the rule. */
function officeDeadlines(packet, county) {
  const found = [];
  for (const m of packet.messages) {
    if (m.sender !== `${county} hearing office`) continue;
    const r = classifyOfficeReply(m.body, { county, channel: m.channel });
    for (const p of r.proposals) if (p.column === 'AW') found.push(`Message ${m.id} asks for the notices by ${p.value.replace(/\.$/, '')}.`);
  }
  return [...new Set(found)];
}

// The prepared answers, one for each kind. Fictional, written for this simulation.
function preparedAnswers(sim, packet) {
  const { office, named, usesNotice, consultant } = sim;
  const first = consultant.split(' ')[0];
  const props = list(named.map((c) => short(c.property)));
  const c1 = named[0];
  const sent = usesNotice ? `staffing notice${named.length > 1 ? 's' : ''}` : 'email';
  const video = office.hearing_mode !== 'in_person';
  const slug = office.county.toLowerCase().replace(/\s+/g, '-');
  const tesswickNote = packet.messages.find((m) => m.id === 22);
  return [
    { kind: 'ack_named', text: `${first} is recorded as representative for ${props}.` },
    { kind: 'ack_no_name', text: `We have received your ${sent}.` },
    { kind: 'cannot_find', text: `We cannot find your ${sent} for ${short(c1.property)}.` },
    { kind: 'deadline', text: `Please send the name of the representative for ${props} by 4 p.m. on ${sayDate(shiftDate(c1.hearing_date, -3))}.` },
    { kind: 'date_time_change', text: `The hearing for ${short(c1.property)} has been moved from ${sayDate(c1.hearing_date)} to ${sayDate(shiftDate(c1.hearing_date, 7))} at ${sayTime(c1.hearing_time).replace(/\.$/, '')}.` },
    { kind: 'cancellation_processed', text: `The withdrawal for ${short(c1.property)} has been processed and the hearing has been removed from our schedule.` },
    video
      ? { kind: 'link_or_number', text: `The hearings for ${props} will use video room 2. Join at https://video.example/${slug}/room-2.` }
      : { kind: 'link_or_number', text: `The hearings for ${props} will be in room 3. Please arrive 15 minutes before the first case.` },
    office.county === 'Tesswick' && tesswickNote
      ? { kind: 'process_change', text: tesswickNote.body, channel: tesswickNote.channel, source: "the packet's own message 22, a call note written by the firm" }
      : usesNotice
        ? { kind: 'process_change', text: 'Staffing notices are no longer accepted by email. From now on, please enter the representative on our online form.' }
        : { kind: 'process_change', text: 'Emailing names is no longer enough. From now on, send our staffing form and then call to have it entered.' },
    { kind: 'for_person', text: 'Can you tell us whether the homeowner will attend as well?' },
  ];
}

// ---------------------------------------------------------------------------------------------
// What the sheet then shows, or what happens next. The words in capitals are the sheet's own.

function sheetThen(result, sim) {
  const { office, consultant } = sim;
  const out = [];
  const cols = new Set(result.proposals.map((p) => p.column));
  const value = (col) => (result.proposals.find((p) => p.column === col) || {}).value;
  const video = office.hearing_mode !== 'in_person';

  if (result.kind === 'process_change') {
    out.push(holdSentence(`the ${office.county} office`));
    const change = String((result.proposals.find((p) => p.tab === 'Offices' && p.column === 'M') || {}).value || '').replace(/^"(.*?)" Add the date.*$/, '$1');
    const as = value('AS') || 'not known';
    const hours = String(office.contact_hours).replace(/(\d)-(\d)/, '$1 to $2');
    const base = { change, county: office.county, oldRoute: office.staffing_rule, hours };
    const blocked = routeText({ ...base, stillAccepts: as });
    out.push(`The same day the coordinator writes the change in Offices M with who said it and the link, the day it was said in AT, and "${as}" in AS (does the office still accept the old route?), and asks the office for the change in writing. Offices N then reads APPROVE OR REJECT THE CHANGE TODAY (AQ AND AR).`);
    out.push(`Route state 1, blocked (Offices AV). Hearings BE, Dockets N and Offices N print for every hearing at this office: ${blocked.line} Such rows go to TOP OF LIST with the words NOTICE BLOCKED. Routes printed: ${blocked.routes.length}.`);
    for (const [label, still] of [...new Set([as, 'no', 'yes', 'not known'])].map((s) => [`Offices AS says "${s}"`, s])) {
      const t = routeText({ ...base, stillAccepts: still, approvedBy: '[the person who read it]', approvedOn: '2030-06-07' });
      out.push(`After a person types their name in Offices AQ and the date in Offices AR, when ${label}: route state ${t.state}. BE prints: ${t.line}${t.needsCall ? ` The new route needs a call, so BE also prints: ${t.callTask}` : ''}`);
    }
    out.push('To reject the change, a person clears Offices M. The approval cells are typed by a person only; no rule and no reader proposes them.');
    out.push("When the office confirms the new route in writing, the coordinator types the date in Offices L. A confirmation dated on or after the day in AT lifts the block like an approval, and Offices N then reads CONFIRMED IN WRITING: MOVE M INTO F AND G, THEN CLEAR M, AQ, AR, AS AND AT.");
    return out;
  }
  if (result.kind === 'for_person') {
    out.push('Nothing is typed by rule. A person reads the message and decides; the reason above says what the rule saw.');
    return out;
  }
  if (result.kind === 'cannot_find') {
    out.push('G3 stays open: a notice or form that the office cannot find is not a record, so K stays empty and the row still counts a missing proof.');
    out.push('With the link in CP the row reads OFFICE CANNOT FIND OUR NOTICE at the top of the daily list, and BE prints THE NOTICE WAS SENT ON the day typed in CQ BUT THE OFFICE CANNOT FIND IT, so the row is not read as if nothing had been sent.');
    out.push(`Next: the completed form or notice is resent that day by the office's route ("${office.staffing_rule}"), and then the coordinator calls the office in its hours (${office.contact_hours}). The call is a task in Y (what), Z (who) and AA (by when); BE prints CALL THE ${office.county.toUpperCase()} OFFICE IN ITS HOURS until it is typed, and A CALL NEVER CLOSES A CHECK: ASK FOR IT IN WRITING once it is.`);
    out.push(`If a change of route at this office waits for approval (Offices AQ and AR empty), ${BLOCK}: the form is resent only after the approval, and BE says so.`);
  }
  if (cols.has('K') && cols.has('BD')) {
    const bd = value('BD');
    if (consultant && bd === consultant) out.push(`K holds the link and BD (${bd}) equals the consultant in H, so G3 counts for the rows named and their "Proofs missing" goes down by one.`);
    else out.push(`BD (${bd}) differs from the consultant in H (${consultant || 'nobody yet'}), so G3 does not count and BE prints THE OFFICE HAS ${bd}, NOT ${consultant || 'the consultant in H'}: SEND THE NOTICE NAMING ${consultant || 'the consultant in H'} BY THE OFFICE'S REPLACEMENT ROUTE. That route is: "${office.replacement_rule}"`);
  }
  if (result.kind === 'ack_named' && result.inWriting === false) {
    out.push('G3 stays open: a confirmation by phone is not a record. The coordinator notes it in Y and sends the email after a phone call, which asks the office to confirm the name in writing.');
  }
  if (result.kind === 'ack_no_name' && cols.has('Y')) {
    out.push('G3 stays open: it closes only on the office\'s written reply naming our consultant for that case, so K stays empty.');
    out.push('Next: the coordinator asks the office in writing which name it has. No written answer by the 2:00 p.m. review on the next working day: the second request. None by 9:00 a.m. on the working day after that: phone.');
  }
  if (cols.has('L')) out.push('L holds the clerk\'s receipt once a person has checked that it names every file and has typed the version it confirms in AZ. G4 also needs the consultant\'s GOT IT for the same version.');
  if (cols.has('AW')) {
    out.push(`BE prints OFFICE DEADLINE with the date and time typed in AW (${value('AW')}).`);
    out.push('Before it, the notice goes for every row with a YES. A row with nobody is offered at once, and the office is told in writing when the name will follow.');
  }
  if (cols.has('N')) out.push(`The row reads OWED: N says what the office wants (${value('N')}) and BA when (${value('BA')}). BB pulls a weekend or closed day back to the office's last working moment, BP says who signs, and the office's written receipt, linked in O, closes G5.`);
  if (cols.has('BH')) out.push('BH goes up by one. From 2 the row is TOP OF LIST and BE prints THE OFFICE HAS ASKED n TIMES: PHONE IT TODAY AND ANSWER IN WRITING.');
  if (result.kind === 'date_time_change') {
    if (result.inWriting === false) {
      out.push('The date does not move: only the office\'s written notice moves a date. The old date stays on the sheet, the notice is asked for, and the consultant gets the warning text that day (BN, then their OK in BO).');
    } else {
      out.push('The moved row shows the new date and time, I links this message, and J and H are empty, because a yes belongs to a time slot. The row is open again and is offered as a new slot (Dockets, the offer).');
      out.push('The same day the Calendar tab is downloaded and imported again, and the tab is sorted by date, office and time.');
      out.push('K is cleared as well and the old link kept in a note in Y, because the office recorded our name for the old date (round 18). With the old date in DR the sheet prints THE OFFICE RECORDED ... BEFORE THIS HEARING WAS MOVED and asks the office in writing whether the name is still on its record for the new date; its answer goes in K and the new date in DQ. A person calls the homeowner that day with the new date and sends the corrected homeowner notice, and links the call note, the homeowner\'s message or the notice in DS: until then the row reads CALL THE HOMEOWNER on the daily list.');
      if (cols.has('BJ')) out.push('BJ holds the office\'s written answer, so BE no longer prints OUR DATE-CHANGE REQUEST IS STILL OPEN for that row.');
    }
  }
  if (result.kind === 'cancellation_processed') {
    if (result.inWriting === false) out.push('Nothing changes: only the office\'s written confirmation goes in AF. The hearing stays staffed and on its docket, and Status reads CANCEL PROOF DUE once G is no.');
    else {
      out.push('With the link in AF, and "Hearing still on?" (G) set to no after the homeowner\'s written yes is linked in BG, Status reads NOT HELD. Until AF has the link it reads CANCEL PROOF DUE and the hearing stays staffed.');
      out.push('Next: the release notice goes to the consultant, it is typed in BN, their OK is linked in BO, and the Calendar tab is imported again.');
    }
  }
  if (cols.has('AV')) {
    out.push(video
      ? 'With a link or a number of seven or more digits in AV, G1 counts for a video or telephone hearing, BE stops printing NO VIDEO LINK YET, and the day-before text no longer reads DO NOT SEND YET: it carries what AV holds. A room letter alone is not a link: BE prints VIDEO ROOM ONLY, NO LINK and the coordinator asks the office, until Offices AL says the room letter is all the office sends.'
      : 'AV holds the room, and the day-before text carries it after the office\'s name.');
    if (cols.has('BN')) out.push('Because it replaces an earlier room or link after a YES, BN names the consultant and the change, BE prints the TELL line, the change notice goes that day, and the consultant\'s OK is linked in BO.');
  }
  if (cols.has('CI')) out.push('CI holds the office\'s arrival instruction as minutes before the first case, typed on every hearing of the docket. The day-before text then gives one clock time: the consultant\'s first case less the larger of CI and Settings B16 (30 minutes). AV is not used for it.');
  if (!out.length) out.push('Nothing on the sheet changes.');
  return out;
}

/** The rows a proposal is for, with the case ID and the address together where the packet has both. */
function showRows(appliesTo, packet, county) {
  const cases = packet.cases.filter((c) => c.county === county);
  return String(appliesTo).split(', ').map((part) => {
    const c = cases.find((x) => x.case_id === part || short(x.property) === part);
    return c ? `${c.case_id} (${short(c.property)})` : part;
  }).join(', ');
}

function printAnswer(sim, packet, answer, label) {
  const { office, named } = sim;
  const ctx = { county: office.county, caseIds: answer.caseIds && answer.caseIds.length ? answer.caseIds : named.map((c) => c.case_id), consultants: packet.consultants.map((c) => c.name), channel: answer.channel || 'email' };
  const r = classifyOfficeReply(answer.text, ctx);
  // Round 17 (K2): what an earlier message of the same office already said is a repeat, not a fresh proposal.
  const earlier = (answer.earlier || []).map((e) => ({ message: e.message, text: e.text, proposals: classifyOfficeReply(e.text, { ...ctx, channel: e.channel || 'email' }).proposals }));
  const rowKeys = (p) => String(p.appliesTo || '').split(', ').map((part) => { const c = packet.cases.find((x) => x.county === office.county && (x.case_id === part || short(x.property) === part)); return c ? c.case_id : part; }).filter(Boolean);
  if (earlier.length) r.proposals = markRepeats({ message: 'this one', text: answer.text, proposals: r.proposals }, earlier, rowKeys);
  console.log(label);
  if (answer.earlierNote) console.log(`  ${answer.earlierNote}`);
  console.log(`  The office's answer (${answer.source ? answer.source : 'simulated'}${/phone|call|voicemail/i.test(ctx.channel) ? ', by phone' : ''}): "${answer.text}"`);
  console.log(`  The rule sorts it as: ${OFFICE_KINDS[r.kind]} (${r.kind}).`);
  console.log(`  Why: ${r.reason}`);
  if (r.proposals.length) {
    console.log('  A person types (the rule only suggests):');
    for (const p of r.proposals) {
      const cell = `${p.tab} ${p.column}${p.header ? ` (${p.header})` : ''}, for ${showRows(p.appliesTo, packet, office.county)}`;
      if (p.repeatOf !== undefined) console.log(`    ${p.repeatText}. ${cell}: the earlier message already says this and its link is in the cell. The cell keeps its first link. Type nothing.`);
      else if (p.firstLink !== undefined) { console.log(`    ${cell}: ${p.value}. ${p.notARepeatText}. This link replaces the first one.`); if (p.alsoType) console.log(`    ${p.alsoType.tab} ${p.alsoType.column} (${p.alsoType.header}), for ${showRows(p.appliesTo, packet, office.county)}: ${p.alsoType.value}`); }
      else console.log(`    ${cell}: ${p.value}`);
    }
    if (earlier.length) console.log(`  Repeats: ${r.proposals.filter((p) => p.repeatOf !== undefined).length} of the ${r.proposals.length} cells above repeat an earlier message. The written test: a later message replaces the first link only when it states something the cell needs that the first did not.`);
  } else {
    console.log('  A person types: nothing by rule.');
  }
  console.log('  The sheet then, or what happens next:');
  for (const line of sheetThen(r, sim)) console.log(`    ${line}`);
  console.log('');
  return r;
}

function simulate(packet, counties) {
  let disagree = 0;
  let blocks = 0;
  console.log('SIMULATION. Nothing is sent to any office, no mailbox is read and nothing is written to the sheet.');
  console.log('Each office gets a simulated submission by its own saved process in the packet, then one prepared answer of each kind.');
  console.log('The prepared answers are fictional and were written by the author of the rule: this shows how each kind is handled, not how often real answers fit. For that, run node cli/office.js --measure.');
  console.log('');
  counties.forEach((name, i) => {
    const sim = buildSubmission(packet, name);
    console.log(`==== ${sim.office.county} office (${i + 1} of ${counties.length}), simulated ====`);
    for (const line of submissionLines(sim, packet)) console.log(line);
    console.log('');
    if (!sim.named.length) return;
    const answers = preparedAnswers(sim, packet);
    answers.forEach((a, k) => {
      const r = printAnswer(sim, packet, a, `Answer ${k + 1} of ${answers.length} for ${sim.office.county}, prepared as: ${OFFICE_KINDS[a.kind].toLowerCase()}.`);
      blocks += 1;
      if (r.kind !== a.kind) { disagree += 1; console.log(`  DISAGREE: this answer was prepared as ${a.kind} and the rule sorted it as ${r.kind}.\n`); }
    });
  });
  console.log(`${blocks} simulated answers at ${counties.length} ${counties.length === 1 ? 'office' : 'offices'}: the rule sorted ${blocks - disagree} of ${blocks} as the kind they were prepared as${disagree ? `, and ${disagree} differently (marked DISAGREE above)` : ''}.`);
  console.log('That shows the handling of each kind. It is not a measure of accuracy, because the author of the rule wrote the answers. Nothing was sent.');
  return disagree;
}

// ---------------------------------------------------------------------------------------------
// The measurement: the rule against the hand labels in eval/office_examples.json.

// How many proposals of the office rule can be filed without a person. Measured, not asserted: the 30
// unseen office messages are written as .eml files into a temporary folder and the inbox connector
// (cli/inbox.js) is run on it with auto-file off and with --autofile. A line "files itself" only when the
// reply rule or, with --autofile, the two AI readers propose that same cell with that same link; a line
// that the office rule alone proposes is always "for a person". Nothing is sent and no sheet is written.
async function unreviewedOnUnseen() {
  const os = require('node:os');
  const { runInbox } = require('./inbox.js');
  const held = readJson('data/heldout.json');
  const ex = readJson('eval/office_examples.json');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'office-unseen-'));
  try {
    for (const m of held.messages) {
      fs.writeFileSync(path.join(dir, `${m.id}.eml`), [m.address ? `From: ${m.sender} <${m.address}>` : `From: ${m.sender}`, `Date: ${new Date(m.ts).toUTCString().replace('GMT', '+0000')}`, `Subject: Hearings: ${(m.properties || []).join('; ')}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', m.body].join('\r\n'));
    }
    const off = await runInbox(dir, {}), on = await runInbox(dir, { autofile: true });
    const label = new Map((ex.unseen_office_messages || []).map((e) => [e.message, e.cells]));
    const fromOffice = (f) => f.proposedBy.includes('the office rule');
    const wrong = (f) => fromOffice(f) && !(label.get(String(f.file).replace(/\.eml$/, '')) || []).includes(`${f.tab} ${f.column}`);
    const self = (f) => f.files === 'files itself';
    const one = (r) => ({
      office_lines: r.filings.filter(fromOffice).length,
      office_lines_by_the_office_rule_alone: r.filings.filter((f) => f.proposedBy === 'the office rule (fixed code)').length,
      office_lines_by_the_office_rule_alone_that_file_themselves: r.filings.filter((f) => f.proposedBy === 'the office rule (fixed code)' && self(f)).length,
      office_lines_also_proposed_by_the_readers_that_file_themselves: r.filings.filter((f) => fromOffice(f) && f.proposedBy !== 'the office rule (fixed code)' && self(f)).map((f) => `${f.file.replace(/\.eml$/, '')} ${f.tab} ${f.column}`),
      wrong_office_lines: r.filings.filter(wrong).map((f) => `${f.file.replace(/\.eml$/, '')} ${f.tab} ${f.column}${f.case ? ` ${f.case}` : ''}`),
      wrong_office_lines_that_file_themselves: r.filings.filter((f) => wrong(f) && self(f)).length,
    });
    return { messages: off.summary.emails, office_messages_checked: off.summary.officeMessagesChecked, auto_file_off: one(off), auto_file_on: one(on) };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function contextFor(packet, m, county) {
  const caseIds = (m.properties || []).map((p) => (packet.cases.find((c) => c.property === p) || {}).case_id).filter(Boolean);
  return { county, caseIds, consultants: packet.consultants.map((c) => c.name), channel: m.channel };
}

function scoreSet(labels, lookup) {
  const rows = labels.map((e) => {
    const { text, context } = lookup(e.message);
    const r = classifyOfficeReply(text, context);
    const cells = [...new Set(r.proposals.map((p) => `${p.tab} ${p.column}`))].sort();
    const want = [...e.cells].sort();
    return { message: e.message, want: e.kind, got: r.kind, hold: r.hold, forPerson: r.forPerson, extraCells: cells.filter((c) => !want.includes(c)), missingCells: want.filter((c) => !cells.includes(c)), kindRight: r.kind === e.kind, cellsRight: JSON.stringify(cells) === JSON.stringify(want), cells, wantCells: want };
  });
  return {
    n: rows.length,
    right: rows.filter((x) => x.kindRight).length,
    wrong: rows.filter((x) => !x.kindRight).map((x) => x.message),
    for_person: rows.filter((x) => x.got === 'for_person').length,
    for_person_where_label_has_a_kind: rows.filter((x) => x.got === 'for_person' && x.want !== 'for_person').map((x) => x.message),
    wrong_kind_with_proposals: rows.filter((x) => !x.kindRight && x.got !== 'for_person').map((x) => x.message),
    cells_right: rows.filter((x) => x.cellsRight).length,
    cells_wrong: rows.filter((x) => !x.cellsRight).map((x) => x.message),
    cells_proposed_that_the_label_does_not_have: rows.filter((x) => x.cells.some((c) => !x.wantCells.includes(c))).map((x) => x.message),
    hold: rows.filter((x) => x.hold).map((x) => x.message),
    // Mis-sorted (the kind or the set of cells differs from the label) and NOT handed to a person as a whole
    // message: these are the ones whose proposals a person sees without a warning to read the whole message.
    mis_sorted_not_handed_to_a_person: rows.filter((x) => (!x.kindRight || !x.cellsRight) && !x.forPerson).map((x) => x.message),
    wrong_cells_proposed: rows.filter((x) => !x.forPerson).reduce((n, x) => n + x.extraCells.length, 0),
    rows,
  };
}

/** Runs the rule on every labelled message. Returns the counts; rows holds one line for each message. */
function measure() {
  const packet = readJson('data/packet.json');
  const held = readJson('data/heldout.json');
  const ex = readJson('eval/office_examples.json');
  const fromPacket = (id) => { const m = packet.messages.find((x) => x.id === id); return { text: m.body, context: contextFor(packet, m, (m.properties[0] || '').split(', ').pop()) }; };
  const fromHeld = (id) => { const m = held.messages.find((x) => x.id === id); return { text: m.body, context: contextFor(packet, m, m.sender.replace(/ hearing office$/, '')) }; };
  const officeSenders = packet.messages.filter((m) => / hearing office$/.test(m.sender)).map((m) => m.id);
  const out = {
    packet_office_messages: scoreSet(ex.packet_office_messages, fromPacket),
    packet_call_notes: scoreSet(ex.packet_call_notes, fromPacket),
    unseen_office_messages: scoreSet(ex.unseen_office_messages || [], fromHeld),
    office_senders_in_packet: officeSenders,
    unseen_total: held.messages.length,
    unseen_from_offices: held.messages.filter((m) => / hearing office$/.test(m.sender)).length,
  };
  // HOLD on any of the 72 packet messages, whoever wrote them, and on the 30 unseen ones.
  out.hold_on_all_72 = packet.messages.filter((m) => classifyOfficeReply(m.body, contextFor(packet, m, (m.properties[0] || '').split(', ').pop())).hold).map((m) => m.id);
  out.hold_on_all_unseen = held.messages.filter((m) => classifyOfficeReply(m.body, contextFor(packet, m, m.sender.replace(/ hearing office$/, ''))).hold).map((m) => m.id);
  return out;
}

async function printMeasure() {
  const m = measure();
  const ex = readJson('eval/office_examples.json');
  const line = (name, s) => {
    console.log(`${name}: ${s.n} messages. Kind right: ${s.right} of ${s.n}. Wrong: ${s.wrong.length ? s.wrong.join(', ') : 'none'}. Handed to a person: ${s.for_person}.`);
    console.log(`  Of the wrong ones, handed to a person although the label has a kind: ${s.for_person_where_label_has_a_kind.length ? s.for_person_where_label_has_a_kind.join(', ') : 'none'}. Sorted as another kind, with proposals: ${s.wrong_kind_with_proposals.length ? s.wrong_kind_with_proposals.join(', ') : 'none'}.`);
    console.log(`  Cells right (the same set of cells as the label): ${s.cells_right} of ${s.n}. A cell proposed that the label does not have: ${s.cells_proposed_that_the_label_does_not_have.length ? s.cells_proposed_that_the_label_does_not_have.join(', ') : 'none'}. HOLD on: ${s.hold.length ? s.hold.join(', ') : 'none'}.`);
  };
  console.log('The office-reply rule, measured against hand labels (eval/office_examples.json). Measured now, by running the rule.');
  console.log('The labels were written by the author of the rule, before the rule was run on the messages.');
  console.log('');
  console.log(`Of the 72 packet messages, ${m.office_senders_in_packet.length} are from a hearing office (messages ${m.office_senders_in_packet.join(', ')}).`);
  line('Packet office messages', m.packet_office_messages);
  console.log('  The rule was written from these messages, so this count shows that the rule does what its author intends. It is not a measure of how it does on new mail.');
  if (ex.measured && ex.measured.packet_first_run) console.log(`  First run, before one fix: ${ex.measured.packet_first_run.right} of ${ex.measured.packet_first_run.n}, wrong ${ex.measured.packet_first_run.wrong.join(', ')}. ${ex.measured.packet_first_run.note}`);
  console.log('');
  line('Packet call notes written by the firm about an office (21, 22, 46)', m.packet_call_notes);
  console.log('');
  console.log(`Unseen messages (data/heldout.json): ${m.unseen_total}, of which ${m.unseen_from_offices} are from a hearing office.`);
  line('Unseen office messages', m.unseen_office_messages);
  const u = m.unseen_office_messages.rows.filter((x) => x.message !== 'H031');
  console.log(`  Without H031, which the author saw before writing the rule: ${u.filter((x) => x.kindRight).length} of ${u.length}.`);
  console.log('  The rule was frozen before these were labelled and run, and it was not tuned on them afterwards. Later changes left the kind and the hold of every one of these 30 messages as they were: the wording of the HOLD sentence, the arrival instruction of an office moving from Hearings AV to Hearings CI (20 Nov 2026), and the cells the gate sheet gained in round 16 (a process change now also proposes Offices AS and AT, and a notice the office cannot find now also proposes Hearings CP, CQ and AA; the labels of those two kinds gained the same cells by rule, not message by message). This is the count to read as a first measure on new mail.');
  console.log('');
  console.log(`HOLD on any of the 72 packet messages, whoever wrote them: ${m.hold_on_all_72.length ? `message ${m.hold_on_all_72.join(', ')}` : 'none'}. HOLD on any of the ${m.unseen_total} unseen ones: ${m.hold_on_all_unseen.length ? m.hold_on_all_unseen.join(', ') : 'none'}.`);
  console.log('');
  const mis = m.unseen_office_messages.rows.filter((x) => (!x.kindRight || !x.cellsRight) && !x.forPerson);
  console.log(`Mis-sorted on the unseen set and not handed to a person as a whole message: ${mis.length} of ${m.unseen_office_messages.n} (${mis.map((x) => x.message).join(', ') || 'none'}). These are the ones to worry about, because their proposals reach a person without the warning to read the whole message:`);
  for (const x of mis) console.log(`  ${x.message}: the label is ${x.want}, the rule says ${x.got}. ${x.extraCells.length ? `It proposes ${x.extraCells.join(' and ')}, which the label does not have` : 'It proposes no cell that the label does not have'}${x.missingCells.length ? `, and it leaves out ${x.missingCells.join(', ')}` : ''}.`);
  console.log(`  Cells proposed on these messages that the label does not have: ${m.unseen_office_messages.wrong_cells_proposed}. The same count on the 31 packet office messages and the 3 call notes: ${m.packet_office_messages.wrong_cells_proposed + m.packet_call_notes.wrong_cells_proposed}.`);
  const u2 = await unreviewedOnUnseen();
  const a = u2.auto_file_off, b = u2.auto_file_on;
  console.log(`Measured now on the same ${u2.messages} messages as exported emails, through the inbox connector (cli/inbox.js; the three that came as a phone note, a voicemail and a letter are read there as written mail): the office rule proposes ${a.office_lines} lines (one for each cell and hearing). Lines for a cell the label does not have: ${a.wrong_office_lines.length} (${a.wrong_office_lines.join('; ') || 'none'}).`);
  console.log(`Wrong proposals of the office rule that could reach the sheet without a person: ${a.wrong_office_lines_that_file_themselves} with auto-file off and ${b.wrong_office_lines_that_file_themselves} with --autofile. Lines that the office rule alone proposes and that file themselves: ${a.office_lines_by_the_office_rule_alone_that_file_themselves} of ${a.office_lines_by_the_office_rule_alone} with auto-file off, ${b.office_lines_by_the_office_rule_alone_that_file_themselves} of ${b.office_lines_by_the_office_rule_alone} with --autofile. Every line of the office rule is for a person; the rule itself writes to no sheet.`);
  const both = b.office_lines_also_proposed_by_the_readers_that_file_themselves.length;
  console.log(`With --autofile, ${both} ${both === 1 ? 'line that the two AI readers also propose for the same cell with the same link files itself' : 'lines that the two AI readers also propose for the same cell with the same link file themselves'} on the readers' agreement, not on the office rule (${b.office_lines_also_proposed_by_the_readers_that_file_themselves.join('; ') || 'none'}). Auto-file is off by design. node cli/check.js keeps these counts fixed (check R15D-OFFICE1).`);
  console.log('');
  console.log('Message | Label | The rule says | Kind | Cells');
  for (const [name, s] of [['packet', m.packet_office_messages], ['call note', m.packet_call_notes], ['unseen', m.unseen_office_messages]]) {
    for (const x of s.rows) console.log(`${name} ${x.message} | ${x.want} | ${x.got}${x.hold ? ', HOLD' : ''} | ${x.kindRight ? 'right' : 'WRONG'} | ${x.cellsRight ? 'right' : `WRONG: label [${x.wantCells.join(', ')}], rule [${x.cells.join(', ')}]`}`);
  }
  return m;
}

// ---------------------------------------------------------------------------------------------

const USAGE = [
  'This tool plays a submission to a hearing office as a simulation and runs the office-reply rule on the answer.',
  'Nothing is sent to any office, no mailbox is read and nothing is written to the sheet.',
  '',
  '  node cli/office.js',
  '      It plays every one of the ten offices: the submission by that office\'s saved process, then one prepared answer of each kind.',
  '  node cli/office.js --county <name>',
  '      It plays one office only.',
  '  node cli/office.js --try "<the office\'s answer>" --county <name> [--channel phone] [--earlier "<an earlier message of the office>"]',
  '      It runs the rule once on an answer that you type. With --channel phone the answer counts as said by phone.',
  '      With --earlier the rule reads that earlier message first and marks what the answer only repeats: REPEAT of message n: no cell changes.',
  '      --earlier may be given more than once, oldest first. An answer that is the text of a message of the packet is compared with the',
  '      earlier messages of that office about the same hearings without --earlier.',
  '  node cli/office.js --answer <kind> --county <name>',
  '      It shows one prepared answer. The kinds are listed by --kinds.',
  '  node cli/office.js --kinds',
  '      It lists the nine kinds and where each one goes on the sheet.',
  '  node cli/office.js --measure',
  '      It measures the rule on the packet\'s office messages and on the 30 unseen ones, against the hand labels.',
  '',
  `The offices are: ${'Larkmere, Velloran, Orimere, Tesswick, Brindlefen, Caldmere, Fenwick Vale, Harthmere, Iverfen, Juniper Reach'}. Put a name of two words in quotes.`,
].join('\n');

function main(args) {
  const FLAGS = { '--try': true, '--county': true, '--channel': true, '--answer': true, '--earlier': true, '--kinds': false, '--measure': false, '--help': false };
  const flags = new Map();
  const earlierTexts = [];
  const stop = (msg) => { console.error(`${msg}\n\n${USAGE}`); process.exit(2); };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (!(a in FLAGS)) stop(a.startsWith('--') ? `Unknown flag ${a}.` : `"${a}" does not follow a flag. Put the office's answer in quotes, for example --try "Leo is recorded for both."`);
    if (FLAGS[a]) {
      const v = args[i + 1];
      if (v === undefined || v.startsWith('--')) stop(`${a} needs a value.`);
      flags.set(a, v);
      if (a === '--earlier') earlierTexts.push(v.replace(/\\n/g, '\n'));
      i += 1;
    } else flags.set(a, true);
  }
  if (flags.has('--help')) { console.log(USAGE); return 0; }
  if (flags.has('--kinds')) {
    console.log('The nine kinds of office message, and where each one goes on the sheet. The rule only suggests.');
    for (const k of Object.keys(OFFICE_KINDS)) console.log(`  ${k}: ${OFFICE_KINDS[k]}. ${WHERE[k]}`);
    return 0;
  }
  if (flags.has('--measure')) { printMeasure().catch((e) => { console.error(e); process.exitCode = 1; }); return 0; }

  const packet = readJson('data/packet.json');
  const names = packet.counties.map((c) => c.county);
  let county = null;
  if (flags.has('--county')) {
    county = names.find((n) => n.toLowerCase() === flags.get('--county').toLowerCase());
    if (!county) stop(`--county must be one of: ${names.join(', ')}.`);
  }
  if (flags.has('--channel') && !flags.has('--try')) stop('--channel goes with --try.');
  if (flags.has('--earlier') && !flags.has('--try')) stop('--earlier goes with --try.');
  if (flags.has('--try') && flags.has('--answer')) stop('Use --try or --answer, not both.');

  if (flags.has('--try') || flags.has('--answer')) {
    const used = county || names[0];
    // Round 17: an answer that is the text of one of the packet's own messages from this office is about that message's hearings.
    const flat = (t) => String(t || '').replace(/\s+/g, ' ').trim();
    const twin = flags.has('--try') ? packet.messages.find((m) => new RegExp(`^${used} hearing office$`, 'i').test(String(m.sender || '')) && flat(m.body) === flat(flags.get('--try').replace(/\\n/g, '\n'))) : null;
    const twinCases = twin ? packet.cases.filter((c) => (twin.properties || []).includes(c.property)).map((c) => c.case_id) : [];
    const sim = buildSubmission(packet, used, twinCases);
    console.log('SIMULATION. Nothing is sent to any office and nothing is written to the sheet.');
    if (!county) console.log(`No --county was given, so the ${used} office is used.`);
    console.log('');
    for (const line of submissionLines(sim, packet)) console.log(line);
    console.log('');
    if (flags.has('--answer')) {
      const answers = preparedAnswers(sim, packet);
      const a = answers.find((x) => x.kind === flags.get('--answer'));
      if (!a) stop(`--answer must be one of: ${Object.keys(OFFICE_KINDS).join(', ')}.`);
      printAnswer(sim, packet, a, `Prepared answer: ${OFFICE_KINDS[a.kind].toLowerCase()}.`);
    } else {
      const text = flags.get('--try').replace(/\\n/g, '\n');
      let earlier = earlierTexts.map((t, i) => ({ message: `E${i + 1}`, text: t }));
      let earlierNote = earlier.length ? `E1${earlier.length > 1 ? `${earlier.length > 2 ? ` to E${earlier.length}` : " and E2"} are the earlier messages` : ' is the earlier message'} you gave with --earlier${earlier.length > 1 ? ', oldest first' : ''}.` : null;
      // The answer is one of the packet's own messages from this office: the office's earlier messages about the same hearings are known.
      if (twin) {
        if (!earlier.length) {
          const before = packet.messages.filter((m) => m.id < twin.id && m.sender === twin.sender && (m.properties || []).some((p) => (twin.properties || []).includes(p)));
          earlier = before.map((m) => ({ message: m.id, text: m.body, channel: m.channel }));
          earlierNote = `Your text is the text of message ${twin.id} of the packet. ${before.length ? `The rule compared it with the earlier ${before.length === 1 ? 'message' : 'messages'} of this office about the same hearings (${before.map((m) => m.id).join(', ')}).` : 'This office sent no earlier message about the same hearings.'}`;
        }
      }
      printAnswer(sim, packet, { text, channel: flags.get('--channel') || 'email', source: 'typed by you', earlier, earlierNote }, 'Your answer, as if the office had sent it:');
    }
    return 0;
  }
  return simulate(packet, county ? [county] : names) ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { measure, buildSubmission, preparedAnswers, sheetThen, simulate, unreviewedOnUnseen };
