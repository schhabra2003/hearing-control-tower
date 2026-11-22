// The AI readers beside the control sheet, suggest-only.
//
// This is the agent in the first priority. It reads a mailbox (here: the 72 example messages)
// with the two AI readers, checks who may close which fact, and PROPOSES what goes into each
// proof cell of the gate sheet, with the sentence it relies on. It sends nothing and it changes
// no record: a coordinator accepts or rejects each proposal on the sheet.
//
//     node cli/sheet.js                      a summary, from the recorded AI reads (no key, no network)
//     node cli/sheet.js --rules              the same with the offline pattern reader
//     node cli/sheet.js --csv out.csv        one row per proposal, to paste into the sheet's "Reader suggestions" tab
//     node cli/sheet.js --json out.json      everything, for building the workbook
//     node cli/sheet.js --dockets            the dockets of the example week as the readers see them (a list only: the offer and the
//                                            day-before texts are printed by the Dockets tab of the gate sheet, columns H and I)
//     node cli/sheet.js --process-changes    the process-change detector, measured on the 72 example messages and the 30 unseen ones
//     node cli/sheet.js --new-cells          the proposals for the cells the gate sheet gained in rounds 16 and 18, one line each
//     node cli/sheet.js --repeats            the messages that repeat an earlier message for a cell (round 17): the cell keeps its first link
//     node cli/sheet.js --questions          the consultants' questions that wait for an answer, as proposals for Hearings BN (round 17)
//     node cli/sheet.js --paste new.json [--out paste.tsv]
//                                            NEW mail onto the sheet (round 17): reads new messages in the packet's message format with
//                                            the two readers and writes a tab-separated file whose seven columns are the columns of the
//                                            "Reader suggestions" tab, ready to paste under its last row. Without a key it replays recorded
//                                            answers and says for which messages it has none. See node cli/sheet.js --paste-help.
//
// Added in round 15 (every earlier field of the --json output is unchanged, fields were only added):
//   - A proposal for a consultant's own yes (gate G2) shows the words that say yes. Until round 14
//     "quote" was the quote of the LAST reading of the message, whatever it was about, so a yes
//     could be shown with "I have both case files". Now "quote" of a G2 proposal is the readers' own
//     quote for the yes; when that quote does not hold the acceptance and a sentence of the message
//     does, it is that sentence (fixed code in src/verify.js, no model). "quoteBefore" keeps the
//     words shown before, and "quoteFrom" says which of the two cases applied.
//   - Every proposal to close a cell also carries "gateQuote": the readers' quote for the reading
//     that supports THIS cell. For G1, G3 and G4 "quote" itself is unchanged, so that the sheet
//     generator's input stays as it was; where the two differ, "gateQuote" is the better one to show.
//   - Every proposal names its cell ("cell": tab, column, header) and says whether both readers
//     agreed on it and the verifier passed it ("agreedAndVerified").
//   - "officeProposals" lists office messages and call notes that change how an office works, as
//     proposals for Offices M with HOLD. They come from the fixed office rule (src/office_rule.js).
//     Since round 16 HOLD is a block, in the sheet's own words: NO NOTICE GOES TO THIS OFFICE UNTIL
//     A PERSON APPROVES THE CHANGE TODAY (Offices AQ and AR). After the approval the new route is
//     the route; the old one is a second route only while the office still accepts it (Offices AS).
//     The field "proposal" now holds that sentence word for word as the sheet prints it.
//
// Added in round 16 (fields were only added; "officeProposals" still lists one line for each change):
//   - "newCellProposals" lists proposals for the cells the sheet gained in round 16, all by fixed
//     code, all for a person: Offices AS and AT beside a process change; Hearings CP, CQ, Y and AA
//     when an office cannot find our notice (rule D3 and the call task of D4); a row of the
//     Availability tab with the reason illness when a consultant reports ill (X17), with the
//     hearings that consultant holds in the following days; and the four settlement cells that no
//     message proves yet (C2). The sheet generator does not read this list yet: see the README.
//   - "halfProofs" lists the clerk's or the consultant's receipt of the case files where the other
//     half is still missing, so the cell (Hearings L or M) can be filled although G4 is not closed.
//
// Added in round 17 (fields were only added):
//   - "repeatProposals" lists what the readers read in a message that repeats an earlier message for
//     the same cell (Hearings I, K, L or M). Each line carries "repeatOf", the message whose link the
//     cell keeps; nothing is typed. A later receipt that names the case-file version when the first
//     did not is NOT a repeat: it is listed with "firstLink" and "adds", and the version goes in AZ.
//     Every other proposal list carries "repeatOf" too when it applies (on the 72 example messages
//     none does: the engine already keeps the first link, so a repeat never became a proposal).
//   - "questionProposals" lists a consultant's question as a proposal for Hearings BN, so that the
//     sheet prints TELL until the answer is linked in BO.
//   - --paste writes the proposals of new mail as rows of the "Reader suggestions" tab.
//
// Added in round 18 (fields were only added; the 22 earlier lines of "newCellProposals" keep their places):
//   - "newCellProposals" gains the cells of Part K of the sheet, appended after the 22 lines of round 16, rule K1:
//     Hearings DQ (the hearing date the office's record of our name was for, only where the hearing was later moved)
//     and DR (the date a moved hearing had before); K3: Hearings DT and DU (who reported a result after the hearing,
//     and the link); K6: Offices BB (an office whose own message came on paper) and Hearings DX (the day a message
//     that says "tomorrow" arrived, as a cell for a person to type). The office's address (Offices BA), who decided a
//     date-change request (DV), the homeowner's word on a new date (DS) and the day a notice arrived (DW) are never
//     proposed: no message states them.
//
// The recorded reads are the raw answers of the two models to these 72 messages, replayed through
// the same guard and cross-check as a live answer. On a real mailbox the same script would take an
// export of the day's messages; that connection is not built (see README, "Known limits").

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadAll } from './load.js';
import { createEngine } from '../src/engine.js';
import { extractWithRules } from '../src/extract/rules.js';
import { makeRecordedReader } from '../src/extract/recorded.js';
import { readMessageSync, readMessage } from '../src/extract/crosscheck.js';
import { acceptanceSentence, holdsAcceptance } from '../src/verify.js';
import { isVerbal } from '../src/model.js';

export const GATES = { G1: 'G1 Schedule: county, in writing', G2: 'G2 Consultant\'s own yes for this slot', G3: 'G3 County has the name on record', G4: 'G4 Packet: clerk and consultant have it', G5: 'G5 Nothing owed' };
// The cell on the Hearings tab that holds the proof link of each gate (headers as on the gate sheet).
// G4 has two cells: the clerk's receipt (L) and the consultant's (M).
export const CELLS = {
  G1: { tab: 'Hearings', column: 'I', header: 'G1 Schedule: county, in writing (per docket)' },
  G2: { tab: 'Hearings', column: 'J', header: 'G2 Consultant\'s own yes for this slot' },
  G3: { tab: 'Hearings', column: 'K', header: 'G3 County has the name on record for this case' },
  G4clerk: { tab: 'Hearings', column: 'L', header: 'G4 Evidence on file with the clerk' },
  G4consultant: { tab: 'Hearings', column: 'M', header: 'G4 Consultant has the packet' },
  G5: { tab: 'Hearings', column: 'O', header: 'G5 Proof that it is processed' },
};
// The claim types whose applied reading can close each gate. All of them need both readers (crosscheck.js).
const GATE_TYPES = {
  G1: ['hearing_scheduled', 'hearing_confirmed', 'schedule_changed'],
  G2: ['consultant_accepted', 'consultant_conditional', 'calendar_edited', 'coverage_offered'],
  G3: ['rep_recorded'],
  G4: ['packet_received', 'document_submitted'],
  G5: ['obligation_cleared'],
};

// The fixed office rule is written by another engineer (src/office_rule.js, CommonJS). When the
// file is missing the detector is switched off and the output says so.
let officeRule = null;
try { officeRule = createRequire(import.meta.url)('../src/office_rule.js'); } catch { officeRule = null; }

// ---- the process-change detector -------------------------------------------------------------------
// Fixed code, no model. It looks at messages from an office and at the firm's own call notes (a
// clerk's words written down after a phone call), and flags the ones that change how the office
// works. The flag is a proposal for Offices M with HOLD: no notice goes to that office until a
// person approves the change in Offices AQ and AR (the wording is holdSentence in
// src/office_rule.js, word for word the sheet's). It never changes anything by itself.
//   raw: { id, sender, channel, body, properties? }.  dir: engine.dir.  county: for a call note, the county of the thread.
export function detectProcessChange(raw, dir, county = null) {
  if (!officeRule) return null;
  const office = /^(.*?)\s*hearing office$/i.exec(String(raw.sender || ''));
  const callNote = !office && /operations|law firm/i.test(String(raw.sender || '')) && isVerbal(raw.channel);
  if (!office && !callNote) return { checked: false };
  const where = office ? office[1].trim() : county;
  const r = officeRule.classifyOfficeReply(raw.body, { county: where || undefined, consultants: dir.consultants.map((c) => c.name), channel: raw.channel });
  if (r.kind !== 'process_change') return { checked: true, flagged: false };
  const p = r.proposals.find((x) => x.tab === 'Offices' && x.column === 'M') || r.proposals[0] || {};
  const quote = (/^"(.*?)"(?= Add the date)/.exec(String(p.value || '')) || [null, ''])[1];
  return { checked: true, flagged: true, county: where, quote, value: p.value || '', why: p.why || '', header: p.header || '', inWriting: !!r.inWriting, reason: r.reason };
}

// Measures the detector on the 72 example messages and the 30 unseen ones against the answer key
// (label type process_rule_changed in data/gold_dev.json and data/heldout.json).
export function measureProcessChanges(data) {
  const eng = createEngine({ packet: data.packet, playbooks: data.playbooks, reader: extractWithRules });
  const countyOf = (props) => { const c = eng.dir.cases.find((x) => (props || []).includes(x.property)); return c ? c.county : null; };
  const one = (list, labelsOf) => {
    const rows = list.map((m) => ({ id: String(m.id), d: detectProcessChange(m, eng.dir, countyOf(m.properties)), key: labelsOf(m).some((c) => c.type === 'process_rule_changed') }));
    const checked = rows.filter((r) => r.d && r.d.checked), flagged = checked.filter((r) => r.d.flagged);
    return {
      messages: rows.length, checked: checked.length, not_checked: rows.length - checked.length,
      flagged: flagged.map((r) => r.id), in_answer_key: rows.filter((r) => r.key).map((r) => r.id),
      right: flagged.filter((r) => r.key).map((r) => r.id), false_alarms: flagged.filter((r) => !r.key).map((r) => r.id), missed: rows.filter((r) => r.key && !(r.d && r.d.flagged)).map((r) => r.id),
    };
  };
  const held = data.readJson('data/heldout.json');
  return {
    available: !!officeRule,
    what: 'Fixed code (src/office_rule.js, kind process_change) on messages from an office and on the firm\'s call notes. Messages from consultants and the firm\'s other messages are not checked.',
    examples: one(data.packet.messages, (m) => data.gold.labels[String(m.id)] || []),
    unseen: one(held.messages, (m) => m.claims || []),
    caution: 'Message 22 was a development example of the office rule. H036 and H057 were not seen when the rule was written. Three process changes in 102 messages is a small sample: zero false alarms here does not show a rate.',
  };
}

// What HOLD means, in the words every tool prints (lead decision of round 16, which replaces "both routes" of round 15d).
export const HOLD_MEANS = 'HOLD means a block: NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY. A person reads the change and types their name in Offices AQ and the date in Offices AR. After the approval the new route is the route, and the old route is a second route only while the office still accepts it (Offices AS: yes or not known).';

// ---- round 16: proposals for the cells the gate sheet gained --------------------------------------------
// Fixed code, no model, and every line is for a person. Headings are row 1 of the installed sheet.
export const NEW_CELLS = {
  'Offices AS': 'Does the office still accept the old route? (yes / no / not known)',
  'Offices AT': 'Change said on (date of the call or message in column M)',
  'Hearings CP': 'The office says it cannot find our notice (link to its message or to the dated call note)',
  'Hearings CQ': 'Our notice or form for this hearing went to the office on (date, or the link to the sent message)',
  'Hearings Y': 'Next action',
  'Hearings AA': 'Due',
  'Availability B': 'Consultant',
  'Availability H': 'free or not free',
  'Availability I': 'Reason (choose illness when they say they are ill; otherwise other, or empty)',
  'Availability J': 'Said on (the date of their message; empty = the date in column A)',
  'Hearings BG': "Homeowner's written yes for a settlement or withdrawal (link)",
  'Hearings O': 'G5 Proof that it is processed',
  'Hearings AF': 'Proof of cancellation or withdrawal (link)',
  'Hearings BA': 'Owed by (date and time, as the office wrote it)',
};
// ---- round 18: proposals for the cells the gate sheet gained in round 18 (Part K of the rule book) -------------
// Fixed code, no model, every line for a person, and only where a reading of the two AI readers (or the channel of an
// office's own message) supports it. Headings word for word as row 1 of the installed sheet (sheet dump, 21 Nov 2026).
// Never proposed: the office's street address (Offices BA: only the office can say it), who decided a date-change
// request (Hearings DV: messages 8 and 15 name no person), the homeowner's own word on a new date (Hearings DS) and the
// day a notice arrived (Hearings DW): no message of the packet states them.
export const NEW_CELLS_R18 = {
  'Hearings DQ': "The office's record in column K is for the hearing date of (type the hearing date the office's message was about, with the link in K; on a hearing that was moved, K counts only while this is the date in column D)",
  'Hearings DR': 'This hearing was moved: the date it had before (type it when an office moves a hearing, whoever asked for the move)',
  'Hearings DT': 'Result reported by (who and when)',
  'Hearings DU': 'Link to the note or message that reported the result',
  'Hearings DX': 'The message behind the next action in column Y arrived on (date; type it when the message says today, tomorrow or this week, and type the real date in AA)',
  'Offices BB': 'This office sends its hearing notices on paper (yes, or empty)',
};
const PAPER = /\b(?:mail transcript|letter|paper|post(?:al)?|fax)\b/i;
const RELATIVE_DAY = /\b(?:today|tomorrow|this week|tonight|this (?:morning|afternoon|evening))\b/i;
const ILL = /\bI(?: am|'m|’m| have been| was| feel| am feeling)(?: (?!not\b|never\b|no\b)\w+)? (?:ill|sick|unwell)\b|\b(?:I have (?:the )?(?:flu|a fever)|I am in (?:the )?hospital|called in sick|off sick)\b/i;
const SETTLE = /\bsettle(?:ment|d|s)?\b/i;
const OUR_NOTICE = /\bstaffing (?:details|notice|notices|form)\b|\bon your form\b|\bnam(?:e|ing) of (?:the|our) representative\b|\brepresentative(?:'s)? name\b/i;
const dayIn = (at, offsetHours) => new Date(Date.parse(at) + offsetHours * 3600000).toISOString().slice(0, 10);
const addDays = (iso, n) => { const t = new Date(`${iso}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const ILLNESS_DAYS = 7; // Settings B18 of the gate sheet: our suggestion, not a packet fact.

// messages: raw messages in time order. entries: Map(id -> the engine's entry). cases: the cases of the --json output. dir: engine.dir.
export function newCellProposals(messages, entries, cases, dir) {
  if (!officeRule) return [];
  const out = [];
  const names = dir.consultants.map((c) => c.name);
  const DATED = 'On the example messages the date is the timestamp of the prototype\'s simulated timeline (data/timeline.json); the packet\'s messages carry no dates.';
  const caseIdsOf = (m) => { const e = entries.get(m.id); const ids = e && e.caseIds && e.caseIds.length ? e.caseIds : dir.cases.filter((c) => (m.properties || []).includes(c.property)).map((c) => c.id || c.case_id); return [...new Set(ids)]; };
  const push = (rule, m, where, tab, column, value, why, extra = {}) => out.push({ rule, tab, column, header: NEW_CELLS[`${tab} ${column}`] || NEW_CELLS_R18[`${tab} ${column}`] || '', ...where, value, message: m.id, sender: m.sender, channel: m.channel, why, by: 'fixed code, no model', files: 'for a person', ...extra });
  // Round 18: the hearing date on record for each case as the messages arrive, from the case records, then each move.
  const dateNow = new Map(dir.cases.map((c) => [c.id || c.case_id, c.hearing_date || null]));
  const paperDone = new Set(), resultDone = new Set();
  messages.forEach((m, i) => {
    const sender = String(m.sender || '');
    const office = /^(.*?)\s*hearing office$/i.exec(sender);
    const firm = !office && /operations|law firm/i.test(sender);
    const consultant = names.find((n) => n === sender) || null;
    const ids = caseIdsOf(m);
    const county = office ? office[1].trim() : ((cases.find((c) => ids.includes(c.id)) || {}).county || null);
    const said = m.at ? dayIn(m.at, -5) : null;
    // D2, D3, D4: the office rule on an office's message and on the firm's own call note.
    if (office || (firm && isVerbal(m.channel))) {
      // Our own earlier written message in the same thread that carries the notice or form, for CQ.
      const sent = messages.slice(0, i).reverse().find((x) => /operations|law firm/i.test(String(x.sender || '')) && !isVerbal(x.channel) && (x.properties || []).some((p) => (m.properties || []).includes(p)) && OUR_NOTICE.test(x.body));
      const r = officeRule.classifyOfficeReply(m.body, { county: county || undefined, caseIds: ids, consultants: names, channel: m.channel, saidOn: said || undefined, sentNotice: sent ? `the link to message ${sent.id}` : undefined });
      for (const p of r.proposals) {
        if (r.kind === 'process_change' && p.tab === 'Offices' && ['AS', 'AT'].includes(p.column)) push('D2', m, { county, row: `the ${county || 'office'} row` }, 'Offices', p.column, p.value, `${p.why}${p.column === 'AT' ? ` ${DATED}` : ''}`);
        if (r.kind === 'cannot_find' && p.tab === 'Hearings' && ['CP', 'CQ', 'Y', 'AA'].includes(p.column)) {
          const named = (String(p.appliesTo || '').match(/[A-Z]{2,4}-\d{2,6}/g) || []).concat(cases.filter((c) => String(p.appliesTo || '').includes(c.property.split(',')[0])).map((c) => c.id));
          for (const id of [...new Set(named.length ? named : ids)]) {
            push(['Y', 'AA'].includes(p.column) ? 'D4' : 'D3', m, { case: id }, 'Hearings', p.column, p.value, p.why, p.column === 'CQ' && sent ? { valueMessage: sent.id } : {});
            // K6 (round 18): a due day in words ("tomorrow morning") needs the day the message arrived, in DX, and the real date in AA.
            if (p.column === 'AA' && RELATIVE_DAY.test(String(p.value || '')) && RELATIVE_DAY.test(String(m.body || ''))) push('K6', m, { case: id }, 'Hearings', 'DX', 'the day this message arrived, typed as a date', `AA holds words ("${p.value}"), and "tomorrow" in a message is the day after it arrived. Type the day it arrived in DX and the real date in AA. The packet's messages carry no dates${said ? ` (the prototype's simulated timeline puts this message on ${said}, which is not a packet fact)` : ''}, so a person types the day.`);
          }
        }
      }
    }
    // Round 18 (Part K). Only readings both readers agree on and the verifier passes as a fact, or an office's own channel.
    const e18 = entries.get(m.id);
    const facts = ((e18 && e18.claims) || []).filter((cl) => cl.disposition === 'fact');
    const flags = ((e18 && e18.claims) || []);
    // K1, K2: an office moves a hearing. The date it had before goes in DR; the record of our name in K was for that date.
    for (const cl of facts.filter((x) => x.type === 'schedule_changed')) {
      for (const id of cl.cases || []) {
        const c = cases.find((x) => x.id === id);
        const was = dateNow.get(id);
        if (!c || !c.schedule || c.schedule.source !== m.id || !was || was === c.schedule.date) continue;
        push('K1', m, { case: id }, 'Hearings', 'DR', was, `The office moved this hearing from ${was} to ${c.schedule.date}. With the old date in DR the sheet asks the office in writing whether the name is still on its record for the new date (a link in K that came before the move does not count for it: keep it in a note in Y and clear K), and a person calls the homeowner with the new date and sends the corrected homeowner notice, linked in DS. The date ${was} is the case record's or the last move's, as the readers see it.`, { quote: cl.quote, dateNow: c.schedule.date });
        dateNow.set(id, c.schedule.date);
      }
    }
    // K1: the office records our name. DQ says for which hearing date: the date on record when its message came.
    // Proposed only where the hearing was moved after that record (filtered at the end): on a hearing that was never
    // moved an empty DQ lets K count as before, so typing it there adds work and changes nothing.
    if (office) for (const cl of facts.filter((x) => x.type === 'rep_recorded')) {
      for (const id of cl.cases || []) {
        const d = dateNow.get(id);
        if (d) push('K1', m, { case: id }, 'Hearings', 'DQ', d, `The office's record of the name in this message is for the hearing date on record when it came (${d}). If the hearing is later moved, the link in K no longer counts for the new date until the office says so in writing.`, { quote: cl.quote });
      }
    }
    // K3: who reported a result after the hearing, and the link. A consultant's or the firm's note of the result,
    // or the office's own written word on a hearing whose date has passed.
    const after = (id) => { const d = dateNow.get(id); return d && said && d <= said; };
    const resultReads = facts.filter((x) => x.type === 'outcome_reported').concat(office ? flags.filter((x) => ['decision_pending', 'obligation_created'].includes(x.type)) : []);
    // One source of each kind per hearing: a later office reminder of the same request (message 60) is not a new report.
    const resultCases = [...new Set(resultReads.flatMap((x) => (x.cases || []).filter(after)))].filter((id) => !resultDone.has(`${id}|${office ? 'office' : 'note'}`));
    for (const id of resultCases) {
      resultDone.add(`${id}|${office ? 'office' : 'note'}`);
      const how = isVerbal(m.channel) ? 'by telephone' : 'in writing';
      const q = (resultReads.find((x) => (x.cases || []).includes(id)) || {}).quote;
      push('K3', m, { case: id }, 'Hearings', 'DT', `${sender} ${how} after the hearing (message ${m.id}); type the day it was reported`, `The result in S needs its source on the row. The packet's messages carry no dates, so the day is typed by a person. If the words fit no value of the result list, choose "reported: not clear" in S and ask the same day.`, { quote: q });
      push('K3', m, { case: id }, 'Hearings', 'DU', 'the link to this message', 'The note or message that reported the result. A later written word of the office replaces a phoned report when the phoned words fit no value of the result list.', { quote: q });
    }
    // K6: an office that sends its notices on paper (the channel of its own message says so).
    if (office && county && PAPER.test(String(m.channel || '')) && !/e-?mail/i.test(String(m.channel || '')) && !paperDone.has(county)) {
      paperDone.add(county);
      push('K6', m, { county, row: `the ${county} row` }, 'Offices', 'BB', 'yes', `This message from the office came as ${m.channel}. With yes in BB the sheet asks, on each coming hearing of this office, for the day the notice linked in I arrived (Hearings DW), because a deadline can count from the arrival. No message says that day, so DW is not proposed.`);
    }
    // X17: a consultant reports ill. One row of the Availability tab, and the hearings they hold in the days after.
    if (consultant && ILL.test(m.body)) {
      const where = { consultant };
      const until = said ? addDays(said, ILLNESS_DAYS) : null;
      const held = said ? cases.filter((c) => c.committed && c.committed.name === consultant && c.schedule && c.schedule.date >= said && c.schedule.date <= until && c.gates.G2.status !== 'na').map((c) => ({ case: c.id, date: c.schedule.date, time: c.schedule.time, county: c.county })) : [];
      const quote = (officeRuleSentences(m.body).find((s) => ILL.test(s)) || m.body).trim();
      const check = `The same day, ask about every hearing ${consultant} holds in the ${ILLNESS_DAYS} days after the report (Settings B18, our suggestion): ${held.length ? held.map((h) => `${h.case} on ${h.date} at ${h.time}, ${h.county}`).join('; ') : 'the readers see none'}. With the reason illness the sheet prints on each of them that ${consultant.toUpperCase()} REPORTED ILL and puts the row at the top of the daily list, until their own yes after the report is linked in Hearings CT with its date in CU.`;
      push('X17', m, where, 'Availability', 'B', consultant, 'A new row of the Availability tab for the day they cannot attend (columns A, C and D as their message says).', { quote, heldInTheDaysAfter: held });
      push('X17', m, where, 'Availability', 'H', 'not free', 'They say they cannot attend.', { quote });
      push('X17', m, where, 'Availability', 'I', 'illness', check, { quote, heldInTheDaysAfter: held });
      push('X17', m, where, 'Availability', 'J', said || 'the date of this message, typed as a date', `The day they said it. ${DATED}`, { quote });
    }
    // C2: a settlement. No cell is proved by a message that only mentions one; the list says what is still missing.
    if ((firm || office) && SETTLE.test(m.body)) {
      const sentence = officeRuleSentences(m.body).find((s) => SETTLE.test(s)) || m.body;
      const named = cases.filter((c) => sentence.includes(c.property.split(',')[0])).map((c) => c.id);
      for (const id of (named.length ? named : ids)) {
        const leave = [
          ['BG', "the homeowner's written acceptance of the settlement"],
          ['O', "the office's receipt of the signed settlement"],
          ['AF', "the office's written word that the hearing is off its schedule"],
          ['BA', 'the date by which the settlement must reach the office'],
        ];
        for (const [col, what] of leave) push('C2', m, { case: id }, 'Hearings', col, '(leave empty)', `This message mentions a settlement and proves none of its four cells. Still missing: ${what}. Until AF is linked the hearing stays staffed and on its docket. Ask the office in writing whether the signed settlement takes the hearing off, and by when it must arrive.`, { quote: sentence.trim(), proposal: 'leave empty: not proved by any message' });
      }
    }
  });
  const finalDate = (id) => { const c = cases.find((x) => x.id === id); return c && c.schedule ? c.schedule.date : null; };
  const kept = out.filter((p) => !(p.rule === 'K1' && p.column === 'DQ' && finalDate(p.case) === p.value));
  // The lines of round 18 come after the 22 lines of round 16, so that no row of the sheet's list above them moves.
  return [...kept.filter((p) => !/^K\d/.test(p.rule)), ...kept.filter((p) => /^K\d/.test(p.rule))];
}
// ---- round 17 (K2): a repeat -------------------------------------------------------------------------
// The engine keeps the first link of a cell, so a later message that says the same again never becomes
// a proposal. Until round 17 nothing showed that it had been read and found to be a repeat. This list
// does: for every reading both readers agree on and the verifier passes as a fact, for a cell that
// already holds the link of an earlier message, fixed code decides whether the later message states
// anything the cell needs that the first did not.
//   Hearings K (the name on the office's record): a repeat when it names the same consultant.
//   Hearings I (the schedule): a repeat when it confirms, and every date, time and room it states is
//     the one on record. A changed date, time or room is never a repeat.
//   Hearings L and M (the case files): a repeat unless it names the version ("version 2", "v2",
//     "current") and the first receipt named none. Then it REPLACES the first link, and the version
//     goes in AZ (the clerk) or AY (the consultant). This is the written test of the kit.
export const REPEAT = 'REPEAT: THE CELL KEEPS ITS FIRST LINK';      // the sheet's words (Reader suggestions, column C)
export const repeatShown = (n) => `${REPEAT} (the same statement as message ${n}: type nothing)`;
export function versionNamed(text) {
  const m = /\bversion\s+(\d+)\b|\bv(\d+)\b/i.exec(String(text || ''));
  if (m) return String(m[1] || m[2]);
  return /\bcurrent\b/i.test(String(text || '')) ? 'current' : null;
}
const VERSION_CELL = { G4clerk: ['AZ', 'Case files: version the clerk confirmed (every file named)'], G4consultant: ['AY', 'Case files: version the consultant confirmed (GOT IT)'] };
export function repeatProposals(messages, entries, cases, dir) {
  const out = [];
  const order = new Map(messages.map((m, i) => [m.id, i]));
  const names = dir.consultants.map((c) => c.name);
  const nameOf = (id) => { const c = dir.consultants.find((x) => (x.id || x.consultant_id) === id); return c ? c.name : String(id || ''); };
  const done = new Set();
  messages.forEach((m, i) => {
    const e = entries.get(m.id);
    if (!e || !(e.reading && e.reading.crossChecked)) return;
    const office = /hearing office$/i.test(String(m.sender || ''));
    const consultant = names.includes(m.sender);
    for (const cl of e.claims || []) {
      if (cl.disposition !== 'fact') continue;
      let k = null, half = null;
      if (office && ['hearing_scheduled', 'hearing_confirmed'].includes(cl.type)) { k = 'G1'; half = 'G1'; }
      else if (office && cl.type === 'rep_recorded') { k = 'G3'; half = 'G3'; }
      else if (cl.type === 'packet_received' && (office || consultant)) { k = 'G4'; half = office ? 'G4clerk' : 'G4consultant'; }
      if (!half) continue;
      for (const id of cl.cases || []) {
        const c = cases.find((x) => x.id === id);
        const g = c && c.gates[k];
        if (!g || g.status === 'na' || (g.slots || []).includes(m.id)) continue;        // this message is itself a link of the cell
        const held = (half === 'G4clerk' ? [g.slots[0]] : half === 'G4consultant' ? [g.slots[1]] : g.slots).filter((x) => x !== null && x !== undefined && order.has(x) && order.get(x) < i);
        if (!held.length || done.has(`${m.id}|${id}|${half}`)) continue;
        const cell = CELLS[half];
        const base = { rule: 'K2', tab: cell.tab, column: cell.column, header: cell.header, case: id, gate: GATES[k], message: m.id, sender: m.sender, channel: m.channel, quote: cl.quote, by: 'the two AI readers (both agree, the verifier passes), and fixed code for the repeat test', files: 'for a person' };
        const firstClaim = (msgId, types) => ((entries.get(msgId) || {}).claims || []).find((x) => types.includes(x.type) && (x.cases || []).includes(id) && x.disposition === 'fact');
        if (half === 'G3') {
          const first = held.find((x) => { const f = firstClaim(x, ['rep_recorded']); return f && f.consultant === cl.consultant; });
          if (first === undefined) continue;
          out.push({ ...base, proposal: 'repeat', value: '(type nothing)', repeatOf: first, why: `Message ${first} already says that the office has ${nameOf(cl.consultant)} on its record for this case, and its link is in the cell. This message says the same again: the cell keeps its first link and nothing is typed.` });
        } else if (half === 'G1') {
          const sch = c.schedule || {};
          if (!order.has(sch.source) || order.get(sch.source) >= i) continue;           // the schedule on record is newer than this message
          const differs = ['date', 'time', 'room'].filter((f) => cl[f] !== undefined && cl[f] !== null && sch[f] !== undefined && String(cl[f]) !== String(sch[f]));
          if (differs.length || (cl.room && !sch.room)) continue;                         // it states something else, or a room the record does not have: not a repeat
          const roomFrom = cl.room && sch.roomSource !== undefined && sch.roomSource !== sch.source ? sch.roomSource : null;
          out.push({ ...base, proposal: 'repeat', value: '(type nothing)', repeatOf: sch.source, why: `This message confirms the schedule and states no date, time or room that is not on record already (the date and time from message ${sch.source}${roomFrom !== null ? `, the room from message ${roomFrom}` : ''}). The cell keeps its first link and nothing is typed.` });
        } else {
          const first = held[0];
          const f = firstClaim(first, ['packet_received', 'document_submitted']);
          const vNow = versionNamed(cl.quote), vFirst = versionNamed(f ? f.quote : '');
          if (vNow && vFirst && vNow !== vFirst) continue;                                // another version: a change, not a repeat
          if (vNow && !vFirst) {
            const [vc, vh] = VERSION_CELL[half];
            const says = vNow === 'current' ? 'the receipt says "current"' : `the receipt says version ${vNow}`;
            out.push({ ...base, proposal: 'replace the first link', value: `the link to this message, in place of the link of message ${first}`, firstLink: first, adds: 'the case-file version', why: `NOT A REPEAT. The cell holds the link of message ${first}, which names no version. This message names it (${says}), and the files check needs the version: paste this link over the first one and type the version in ${vc}.` });
            out.push({ ...base, column: vc, header: vh, proposal: 'type the version', value: vNow === 'current' ? 'the number of the current version of the case files (the receipt says "current")' : vNow, firstLink: first, adds: 'the case-file version', why: `Message ${first} named no version, so this cell could not be filled from it. This message names it (${says}).` });
          } else out.push({ ...base, proposal: 'repeat', value: '(type nothing)', repeatOf: first, why: `Message ${first} is already linked as the ${half === 'G4clerk' ? "clerk's" : "consultant's"} receipt of the case files, and this message names no version that message ${first} did not. The cell keeps its first link and nothing is typed.` });
        }
        done.add(`${m.id}|${id}|${half}`);
      }
    }
  });
  return out;
}
export function repeatLines(out) {
  const list = out.repeatProposals || [];
  const reps = list.filter((p) => p.repeatOf !== undefined), not = list.filter((p) => p.repeatOf === undefined);
  const lines = [`${reps.length} repeats in the ${out.messages} example messages: a message that states for a cell nothing that the message already linked there did not. The cell keeps its first link and nothing is typed. Fixed code on the readers' agreed readings, no model. Nothing sent, no record changed.`];
  lines.push(`${not.length} lines are NOT repeats although the cell already holds a link: the later message names the case-file version, which the first receipt did not, so it replaces the first link and the version is typed beside it.`);
  lines.push('');
  for (const p of list) lines.push(p.repeatOf !== undefined
    ? `REPEAT of message ${p.repeatOf}: no cell changes | ${p.case} | ${p.tab} ${p.column} (${p.header}) | message ${p.message}, ${p.sender} (${p.channel}) | "${p.quote}"`
    : `NOT A REPEAT of message ${p.firstLink}: it adds ${p.adds} | ${p.case} | ${p.tab} ${p.column} (${p.header}) | ${p.proposal}: ${p.value} | message ${p.message}, ${p.sender} (${p.channel}) | "${p.quote}"`);
  lines.push('');
  lines.push('The test, as the kit writes it: a later message replaces the first link only when it states something the cell needs that the first did not. A changed date, time, room or name is a change and is never listed here.');
  return lines;
}

// ---- round 17 (I3): a consultant's question that waits for an answer -----------------------------------
// A question from a consultant ("Should I prepare for both?") proves nothing and closes nothing, so until
// round 17 it left no line anywhere. It is now a proposal for Hearings BN, the cell that makes the sheet
// print TELL until the answer is linked in BO. The answer itself is the firm's: the code never writes it.
const BN_HEADER = 'To tell the consultant: a change from the office or a wrong belief (who, what, which message)';
export function questionProposals(messages, entries, dir) {
  const out = [];
  const names = dir.consultants.map((c) => c.name);
  for (const m of messages) {
    if (!names.includes(m.sender)) continue;
    const e = entries.get(m.id);
    for (const cl of (e && e.claims) || []) {
      if (cl.type !== 'consultant_question' || cl.disposition !== 'fact') continue;
      for (const id of cl.cases || []) out.push({ rule: 'I3', tab: 'Hearings', column: 'BN', header: BN_HEADER, case: id, proposal: 'type', value: `${m.sender}: answer their question "${String(cl.quote || '').trim()}" (message ${m.id})`, message: m.id, sender: m.sender, channel: m.channel, quote: cl.quote, why: `${m.sender} asks a question about this hearing. With this text in BN the sheet prints TELL for the row until the firm's answer is linked in BO, so the question cannot stay unanswered unseen. Answer the same day; if the answer already went, link it in BO. The code does not write the answer.`, by: 'the two AI readers (the question), and fixed code for the cell', files: 'for a person' });
    }
  }
  return out;
}
export function questionLines(out) {
  const list = out.questionProposals || [];
  const lines = [`${list.length} proposals for Hearings BN from ${new Set(list.map((p) => p.message)).size} questions that consultants ask in the ${out.messages} example messages. Every line is for a person. Nothing sent, no record changed.`];
  lines.push('With the text in BN the sheet prints TELL on the row until the answer is linked in BO. The answer is written by the firm (the kit has the scripts); if it already went, link it in BO.');
  lines.push('');
  for (const p of list) lines.push(`${p.case} | Hearings BN | ${p.value} | ${p.sender} (${p.channel})`);
  return lines;
}

// Sentences of a message (a small splitter; the office rule keeps its own).
function officeRuleSentences(text) { return String(text || '').split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/).map((s) => s.trim()).filter(Boolean); }

// The dockets of the example week as the readers see them: one line for each office, day and format.
// The offer and the day-before texts are NOT made here: the Dockets tab of the gate sheet prints them.
// How a consultant can be reached, as the gate sheet's Bench R works it out: 2 = a mobile number and their agreement
// to be texted, 1 = a number only (call, no text), 0 = no number (email only). The packet's roster carries an email
// address and a preferred channel for each consultant and no telephone number at all, so every one of the six is 0
// until the firm types the numbers from the season letter (Bench O and P).
export function reachOf(consultant) {
  const c = consultant || {};
  const number = Object.entries(c).find(([k, v]) => /^(?:phone|mobile|cell|text)(?:_number)?$|_(?:phone|mobile|cell)$|^(?:phone|mobile)_/i.test(k) && String(v || '').replace(/\D/g, '').length >= 7);
  if (!number) return 0;
  return c.text_consent === true || /^(?:yes|true|http)/i.test(String(c.text_consent || '')) ? 2 : 1;
}
const REACH_MARK = [' (EMAIL ONLY)', ' (CALL OR EMAIL, NO TEXT)', ''];

// The hearings the --dockets list holds, and so the events of node cli/calendar.js: still on, with a date, on or after the example day.
export function docketHearings(out) {
  return out.cases.filter((c) => { const d = c.schedule; return !(!d || !d.date || c.stage === 'withdrawn' || c.gates.G2.status === 'na' || d.date < '2030-06-07'); });
}

export function docketLines(out, consultants = null) {
  const mark = (name) => { if (!consultants) return name; const c = consultants.find((x) => x.name === name); return `${name}${c ? REACH_MARK[reachOf(c)] : ''}`; };
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const count = (n) => (n === 1 ? 'one hearing' : `${words[n] || n} hearings`);
  const groups = new Map();
  for (const c of docketHearings(out)) {
    const d = c.schedule;
    const k = `${d.date}|${c.county}|${d.mode}`;
    groups.set(k, [...(groups.get(k) || []), c]);
  }
  const lines = [`${groups.size} dockets from ${[...groups.values()].reduce((n, g) => n + g.length, 0)} hearings, as the two readers see the example week. This is a list only. Nothing sent.`];
  lines.push('The offer and the day-before text of each docket are printed by the Dockets tab of the gate sheet (column H, the offer; column I, the day-before text, one for each consultant). That tab is the source: its texts carry the office time zone, the clock time to be at the office and DO NOT SEND YET while a video link is missing, which this tool does not work out.');
  lines.push('"Held now by" below is what the readers found in the messages. The sheet shows the row after a person\'s 9:00 pass and counts only a yes that still counts, so the two can differ; the sheet is the record.');
  if (consultants) {
    const none = consultants.filter((c) => reachOf(c) === 0);
    lines.push(`Mobile numbers: ${consultants.length - none.length} of the ${consultants.length} consultants in the packet have one on file. ${none.length ? `A name marked (EMAIL ONLY) below has none, whatever their preferred channel: the day-before message and the evening offer to them go by email, and no noon call and no arrival call can reach them, until the number from the season letter is typed in Bench O and their agreement to be texted is linked in Bench P. The Dockets tab marks the same names.` : ''}`.trim());
  }
  lines.push('');
  for (const [k, cs] of [...groups].sort()) {
    const [date, county, mode] = k.split('|');
    const how = mode === 'in_person' ? 'in person' : 'by video';
    cs.sort((x, y) => String(x.schedule.time).localeCompare(String(y.schedule.time)));
    const open = cs.map((c, i) => ({ c, n: i + 1 })).filter((x) => !x.c.committed);
    const holders = [...new Set(cs.filter((c) => c.committed).map((c) => c.committed.name))];
    lines.push(`${date} ${county}, ${how}: ${count(cs.length)}, held now by ${holders.map(mark).join(' and ') || 'nobody'}, open: ${open.map((x) => x.n).join(', ') || 'none'}`);
  }
  return lines;
}

// ---- reading a mailbox -------------------------------------------------------------------------------
// messages: raw messages in time order ({ id, at, sender, address?, channel, properties?, body }).
// Returns everything the --json option writes. Nothing is sent and no record is changed.
//   opts.useRules: the offline pattern reader, not the recorded AI reads.
//   opts.noFallback: a message without a recorded read is NOT read by the pattern reader; it goes to a person.
export function readMailbox(messages, data, opts = {}) {
  const mb = openMailbox(data, opts);
  for (const m of messages) mb.take(m, opts.useRules ? mb.eng.ingest(m) : readMessageSync(mb.eng, m, { reader: mb.first, second: mb.second }));
  return mb.finish(messages);
}
// The same in two steps, so that --paste can read a new message with a live reader (which answers later)
// between the recorded ones: take(message, entry) for each message in time order, then finish(messages).
//   opts.records: recorded reads to use in place of data/recorded_reads.json (--paste joins two files).
export function openMailbox(data, { useRules = false, noFallback = false, records: given = null } = {}) {
  const records = useRules ? null : (given || data.readJson('data/recorded_reads.json'));
  const eng = createEngine({ packet: data.packet, playbooks: data.playbooks, reader: extractWithRules });
  const fallback = noFallback ? null : extractWithRules;
  const first = useRules ? null : makeRecordedReader(records, { set: 'primary', fallback });
  const second = useRules ? null : makeRecordedReader(records, { set: 'second', fallback });

  const toPerson = [], entries = new Map(), officeProposals = [];
  let officeChecked = 0;
  const take = (m, entry) => {
    entries.set(m.id, entry);
    if (entry.attention && entry.attention.length) toPerson.push({ message: m.id, sender: m.sender, why: entry.attention });
    const county = entry.county || (entry.caseIds.length ? eng.dir.caseById[entry.caseIds[0]].county : null);
    const d = detectProcessChange(m, eng.dir, county);
    if (d && d.checked) officeChecked += 1;
    if (d && d.flagged) officeProposals.push({
      tab: 'Offices', column: 'M', header: d.header, county: d.county, row: `the ${d.county || 'office'} row`,
      // "proposal" is the HOLD sentence of round 16, word for word what the gate sheet prints in column C of this proposal
      // (the generator accepts the sentences of round 15 as well, and prints this one in every case).
      proposal: officeRule.holdSentence(`the ${d.county || ''} office`.replace('the  office', 'this office')),
      message: m.id, sender: m.sender, channel: m.channel, quote: d.quote, value: d.value, why: d.why, inWriting: d.inWriting, hold: true,
      by: 'fixed code (src/office_rule.js), no model', files: 'for a person',
    });
    return entry;
  };
  const finish = (messages) => {
  const now = eng.state.now;
  const view = eng.view(now);
  const byId = Object.fromEntries(messages.map((m) => [m.id, m]));

  const cases = view.cases.map((c) => {
    const L = eng.state.cases[c.id];
    const quoteOf = (id) => { const e = [...L.evidence].reverse().find((x) => x.msgId === id && x.quote); return e ? e.quote : (byId[id] ? byId[id].body : ''); };
    // The quote of the reading of that message that supports this gate (null when there is none).
    const gateQuoteOf = (id, k) => { const e = L.evidence.find((x) => x.msgId === id && x.quote && (GATE_TYPES[k] || []).includes(x.type)); return e ? e.quote : null; };
    return {
      id: c.id, property: L.property, county: L.county, stage: c.stage, readiness: c.readiness, schedule: L.schedule,
      committed: c.committed ? { id: c.committed.id, name: eng.dir.consultantById[c.committed.id].name } : null,
      gates: Object.fromEntries(Object.entries(c.gates).map(([k, g]) => [k, {
        status: g.status, text: g.text,
        evidence: g.evidence.filter((x) => x !== null && x !== undefined),
        proofs: g.evidence.filter((x) => x !== null && x !== undefined).map((id) => ({ message: id, sender: byId[id] ? byId[id].sender : '', channel: byId[id] ? byId[id].channel : '', quote: quoteOf(id), ...(gateQuoteOf(id, k) === null ? {} : { gateQuote: gateQuoteOf(id, k) }) })),
        slots: g.evidence,
        ...(k === 'G4' && g.status !== 'na' ? { clerkOk: !!g.clerkOk, consOk: !!g.consOk } : {}),
      }])),
    };
  });

  // Did both readers produce the reading that closes this gate, and did the verifier pass it as a
  // fact? Every claim type in GATE_TYPES needs two keys, so a claim of such a type that was applied
  // after a cross-check is one both readers agreed on.
  const basisOf = (caseId, gateKey, msgId) => {
    const e = entries.get(msgId);
    if (!e) return { agreedAndVerified: false, readings: [] };
    const mine = e.claims.filter((c) => GATE_TYPES[gateKey].includes(c.type) && (c.cases || []).includes(caseId));
    const crossChecked = !!(e.reading && e.reading.crossChecked);
    return { agreedAndVerified: crossChecked && mine.some((c) => c.disposition === 'fact'), readings: mine.map((c) => `${c.type}: ${c.disposition}`) };
  };

  // The words shown for a consultant's own yes: see the note at the top of this file.
  const yesQuote = (p, m) => {
    const own = p.gateQuote !== undefined ? p.gateQuote : p.quote;
    let quote = own, quoteFrom = 'the readers\' own quote for the yes';
    if (!holdsAcceptance(own)) {
      const sentence = m ? acceptanceSentence(own, m.body) : null;
      if (sentence) { quote = sentence; quoteFrom = 'the acceptance sentence of the message, found by fixed code'; }
    }
    return quote === p.quote ? { quoteFrom } : { quote, quoteBefore: p.quote, quoteFrom };
  };
  const proposals = [], halfProofs = [];
  for (const c of cases) for (const [k, g] of Object.entries(c.gates)) {
    if (g.status === 'closed') g.proofs.forEach((p) => {
      const half = k === 'G4' ? (g.slots.indexOf(p.message) === 0 ? 'G4clerk' : 'G4consultant') : k;
      const out = { case: c.id, gate: GATES[k], proposal: 'close', message: p.message, sender: p.sender, channel: p.channel, quote: p.quote };
      if (p.gateQuote !== undefined) out.gateQuote = p.gateQuote;
      if (k === 'G2') Object.assign(out, yesQuote(p, byId[p.message]));
      proposals.push({ ...out, cell: CELLS[half], ...basisOf(c.id, k, p.message) });
    });
    else if (g.status === 'problem' || g.status === 'waiting') proposals.push({ case: c.id, gate: GATES[k], proposal: g.status === 'problem' ? 'do not close: problem' : 'leave open', message: g.proofs.length ? g.proofs[g.proofs.length - 1].message : '', sender: g.proofs.length ? g.proofs[g.proofs.length - 1].sender : '', channel: '', quote: g.text });
    // One half of G4 is proved although the gate is not closed: the receipt can still be filed in its own cell.
    if (k === 'G4' && g.status !== 'closed' && g.status !== 'na') {
      for (const [ok, slot, half, who] of [[g.clerkOk, 0, 'G4clerk', 'clerk'], [g.consOk, 1, 'G4consultant', 'consultant']]) {
        const id = g.slots[slot];
        if (!ok || id === null || id === undefined) continue;
        const p = g.proofs.find((x) => x.message === id);
        halfProofs.push({ case: c.id, gate: GATES.G4, half: who, proposal: 'file this half: the gate stays open', message: id, sender: p ? p.sender : '', channel: p ? p.channel : '', quote: p ? (p.gateQuote !== undefined ? p.gateQuote : p.quote) : '', cell: CELLS[half], ...basisOf(c.id, 'G4', id) });
      }
    }
  }
  const tally = {};
  for (const c of cases) for (const [k, g] of Object.entries(c.gates)) tally[g.status] = (tally[g.status] || 0) + 1;
  const newCells = newCellProposals(messages, entries, cases, eng.dir);
  const repeats = repeatProposals(messages, entries, cases, eng.dir);
  const questions = questionProposals(messages, entries, eng.dir);
  // Round 17 (K2): a process change the same office already said, in the same words, is a repeat of the first flag.
  officeProposals.forEach((p, i) => { const first = officeProposals.slice(0, i).find((q) => q.county === p.county && String(q.quote).replace(/\s+/g, ' ').trim().toLowerCase() === String(p.quote).replace(/\s+/g, ' ').trim().toLowerCase()); if (first) p.repeatOf = first.message; });
  const close = proposals.filter((p) => p.proposal === 'close');
  return {
    reader: useRules ? 'offline pattern reader' : `${first.label} checked by ${second.label}`,
    now: new Date(now).toISOString(), messages: messages.length, toPerson, cases, proposals,
    summary: { hearings: cases.length, proofCellsProposed: close.length, leftOpen: proposals.filter((p) => p.proposal !== 'close').length, messagesToAPerson: toPerson.length, gates: tally,
      agreedAndVerified: close.filter((p) => p.agreedAndVerified).length, g2QuotesReplaced: close.filter((p) => p.quoteBefore !== undefined).length, g2QuotesByFixedCode: close.filter((p) => /fixed code/.test(p.quoteFrom || '')).length,
      gateQuoteDiffers: close.filter((p) => p.gateQuote !== undefined && p.gateQuote !== p.quote).length,
      officeMessagesChecked: officeChecked, processChanges: officeProposals.length, halfProofs: halfProofs.length, newCellProposals: newCells.length,
      repeats: repeats.filter((p) => p.repeatOf !== undefined).length, notRepeats: repeats.filter((p) => p.repeatOf === undefined).length, questionProposals: questions.length },
    officeProposals, halfProofs, newCellProposals: newCells, repeatProposals: repeats, questionProposals: questions,
    processChangeDetector: officeRule ? 'src/office_rule.js, kind process_change (fixed code, no model)' : 'not available: src/office_rule.js is missing',
  };
  };
  return { eng, first, second, entries, take, finish };
}

// ---- round 17 (R8): new mail onto the sheet -----------------------------------------------------------
// The seven columns of the "Reader suggestions" tab of the gate sheet, in its order (row 1 of that tab).
export const PASTE_COLUMNS = ['Case', 'Proof cell', 'The readers propose', 'Message', 'From', 'The words it relies on, or the reason', 'Accept? (yes / no)'];
export const PASTE_HELP = `New mail onto the gate sheet: the readers' proposals as rows of the "Reader suggestions" tab.

  node cli/sheet.js --paste <messages.json> [--out <file.tsv>] [--header]

What it reads. A JSON file with the new messages in the packet's message format: a list, or an object
with a list named "messages". Each message has "id", "sender", "channel", "body" and "properties" (the
addresses it is about); "at" (a time) is optional. data/paste-example/new-messages.json is an example.

What it does. It replays the 72 example messages, so that the readers know the hearings and what is
already linked, and then reads each new message with the two AI readers, the cross-check and the
verifier, and with the fixed code beside them (the office rule, the repeat test, the illness check).
  Without a key (OPENAI_API_KEY is not set): no model is called. A new message is read only when a
  recorded answer of both readers exists for it (data/recorded_reads.json and
  data/recorded_reads_unseen2.json hold the answers to the 72 example messages, the 30 unseen ones and
  the 100 of the second unseen set). The output says which messages were replayed and which have no
  recorded answer. Those are NOT read: each gets one row that hands it to a person.
  With a key in the environment variable OPENAI_API_KEY: each new message goes to the two live readers
  (two requests for each message). A message that is itself one of the 72 examples keeps its recorded
  answer. This path costs money. It was run once on a real model on 21 November 2026: 4 new messages
  read live, no reader failure, 8 requests for 0.0911 US dollars, the live rows equal to the recorded
  rows in 9 of 9 (a smoke test of the path, not an accuracy measure; see the README).
  Behind a proxy, start Node with NODE_USE_ENV_PROXY=1 (Node 22.21 or newer), for example
  NODE_USE_ENV_PROXY=1 node cli/sheet.js --paste new.json. Without it Node's own fetch does not use
  the proxy, every request fails, and each message gets one NOT READ row for a person.

What it writes. A tab-separated file, one row for each proposal, with exactly the seven columns of the
"Reader suggestions" tab: ${PASTE_COLUMNS.join(' | ')}. No heading row unless you pass
--header. Open the file, copy everything, click the first empty cell of column A below the last row of the
tab and paste. Column G stays empty: a person types yes or no. A row whose column C starts with REPEAT
needs no typing at all. Then it prints one line with the counts. Nothing is sent and no sheet is changed.

What it does not do. It does not read a mailbox: a person (or a mail rule) saves the day's new messages
as the JSON file. It knows the 24 hearings of the case packet and no others.`;

const sameText = (a, b) => String(a || '').replace(/\s+/g, ' ').trim() === String(b || '').replace(/\s+/g, ' ').trim();
// A cell of the tab-separated file: one line, no tab, and never read as a formula when pasted.
export const tsvCell = (v) => { const t = String(v ?? '').replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); return /^[=+\-@]/.test(t) ? ` ${t}` : t; };

// Reads new messages and returns the rows for the tab.
//   newMessages: [{ id, sender, channel, body, properties?, at? }].
//   opts.env: the environment (default process.env); a key is taken from env.OPENAI_API_KEY only.
//   opts.readers: { reader, second } live readers to use (tests); opts.fetchImpl: a fetch function to use in place of the network (tests).
export async function pasteNewMail(newMessages, data, { env = process.env, readers = null, fetchImpl = null } = {}) {
  if (!Array.isArray(newMessages) || !newMessages.length) throw new Error('The file holds no messages.');
  const example = data.messages;
  const key = env && env.OPENAI_API_KEY ? env.OPENAI_API_KEY : null;
  const live = !!(readers || key || fetchImpl);
  const records = data.readJson('data/recorded_reads.json');
  // The recorded answers of the second unseen set are joined in, so that its messages replay too.
  let joined = records;
  try {
    const more = data.readJson('data/recorded_reads_unseen2.json');
    joined = { format: records.format, sets: Object.fromEntries(['primary', 'second'].map((k) => [k, { provenance: records.sets[k].provenance, reads: [...records.sets[k].reads, ...more.sets[k].reads.map((r) => ({ ...r, prompt_hash: r.prompt_hash || more.sets[k].provenance.prompt_hash }))] }])) };
  } catch { joined = records; }
  const mb = openMailbox(data, { noFallback: true, records: joined });
  let liveReaders = null;
  if (live) {
    if (readers) liveReaders = readers;
    else {
      const ai = await import('../src/extract/openai.js');
      liveReaders = { reader: ai.createOpenAIReader({ apiKey: key || undefined, fetchImpl }), second: ai.createSecondReader({ apiKey: key || undefined, model: ai.DEFAULT_SECOND_MODEL, fetchImpl }) };
    }
  }
  // Every new message gets an id and a time. One that is an example message (same number, same text) is read at its own place among the examples.
  const seen = new Set(), fresh = [], how = new Map();
  let t = Date.parse(example[example.length - 1].at);
  newMessages.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object' || !String(raw.body || '').trim() || !String(raw.sender || '').trim()) throw new Error(`Message ${i + 1} of the file has no "sender" or no "body".`);
    const id = raw.id === undefined || raw.id === null || raw.id === '' ? `new-${i + 1}` : raw.id;
    if (seen.has(String(id))) throw new Error(`Two messages of the file have the id ${id}. Give each message its own id.`);
    seen.add(String(id));
    const twin = example.find((m) => String(m.id) === String(id));
    if (twin && sameText(twin.body, raw.body)) { how.set(twin.id, { id: twin.id, path: 'example', sender: twin.sender }); return; }
    if (twin) throw new Error(`Message id ${id} is the number of an example message with another text. Give a new message its own id, for example "new-${id}".`);
    const at = raw.at || raw.ts;
    t = at && !Number.isNaN(Date.parse(at)) ? Math.max(Date.parse(at), t + 60e3) : t + 60e3;
    fresh.push({ id, at: new Date(t).toISOString(), sender: String(raw.sender), ...(raw.address ? { address: raw.address } : {}), channel: raw.channel || 'email', properties: Array.isArray(raw.properties) ? raw.properties : [], body: String(raw.body) });
  });
  for (const m of example) mb.take(m, readMessageSync(mb.eng, m, { reader: mb.first, second: mb.second }));
  const usage = [];
  for (const m of fresh) {
    if (live) {
      try {
        const entry = await readMessage(mb.eng, m, { reader: liveReaders.reader, second: liveReaders.second });
        mb.take(m, entry);
        for (const u of (entry.reading && entry.reading.usage) || []) usage.push(u);
        how.set(m.id, { id: m.id, path: 'live', sender: m.sender });
      } catch (e) {
        how.set(m.id, { id: m.id, path: 'failed', sender: m.sender, why: e && e.message ? e.message : String(e) });
      }
      continue;
    }
    mb.first.last = null;
    const has = mb.first.has(m) && mb.second.has(m);
    const entry = readMessageSync(mb.eng, m, { reader: mb.first, second: mb.second });
    mb.take(m, entry);
    const path = mb.first.last === null ? (has ? 'recorded' : 'not placed') : mb.first.last.path === 'missing' || mb.second.last.path === 'missing' ? 'missing' : 'recorded';
    how.set(m.id, { id: m.id, path, sender: m.sender });
  }
  const all = [...example, ...fresh.filter((m) => mb.entries.has(m.id))];
  const out = mb.finish(all);
  const mine = (id) => how.has(id);
  const where = (p) => (p.case ? p.case : p.county ? `Office: ${p.county}` : p.consultant ? `Consultant: ${p.consultant}` : '');
  const from = (p) => `${p.sender}${p.channel ? ` (${p.channel})` : ''}`;
  const rows = [], count = { close: 0, open: 0, half: 0, repeat: 0, replace: 0, office: 0, newCells: 0, questions: 0, person: 0, notRead: 0 };
  const row = (a, b, c, d, e, f) => rows.push([a, b, c, d, e, f, ''].map(tsvCell));
  for (const p of out.proposals.filter((x) => mine(x.message))) {
    if (p.proposal === 'close') { count.close += 1; row(p.case, `${p.gate}: ${p.cell.tab} ${p.cell.column}`, p.cell.column === 'L' && versionNamed((data.messages.concat(fresh).find((m) => m.id === p.message) || {}).body) === null ? 'names no version: a person asks for it' : 'close', p.message, p.sender, p.gateQuote !== undefined ? p.gateQuote : p.quote); }
    else { count.open += 1; row(p.case, p.gate, p.proposal, p.message, p.sender, p.quote); }
  }
  for (const p of out.halfProofs.filter((x) => mine(x.message))) { count.half += 1; row(p.case, `${p.gate}: ${p.cell.tab} ${p.cell.column}`, p.proposal, p.message, p.sender, p.quote); }
  for (const p of out.repeatProposals.filter((x) => mine(x.message))) {
    if (p.repeatOf !== undefined) { count.repeat += 1; row(p.case, `${p.gate}: ${p.tab} ${p.column}`, repeatShown(p.repeatOf), p.message, p.sender, `${p.why} The words: "${p.quote}"`); }
    else { count.replace += 1; row(p.case, `${p.tab} ${p.column}: ${p.header}`, `for a person: ${p.value}`, p.message, p.sender, `${p.why} The words: "${p.quote}"`); }
  }
  for (const p of out.officeProposals.filter((x) => mine(x.message))) { count.office += 1; row(p.county, `${p.tab} ${p.column}: ${p.header}`, p.repeatOf !== undefined ? repeatShown(p.repeatOf) : p.proposal, p.message, from(p), `To type: ${p.value} The rule: ${p.why}${p.inWriting ? '' : ' The office has not said it in writing.'}`); }
  for (const p of out.newCellProposals.filter((x) => mine(x.message))) { count.newCells += 1; row(where(p), `${p.tab} ${p.column}: ${p.header}${p.tab === 'Availability' ? ' (a new row of the Availability tab)' : ''}`, `for a person: ${p.value}`, p.message, from(p), `Rule ${p.rule}. ${p.why}${p.quote ? ` The words: "${p.quote}"` : ''}`); }
  for (const p of out.questionProposals.filter((x) => mine(x.message))) { count.questions += 1; row(p.case, `${p.tab} ${p.column}: ${p.header}`, `for a person: ${p.value}`, p.message, from(p), `Rule ${p.rule}. ${p.why}`); }
  for (const tp of out.toPerson.filter((x) => mine(x.message))) {
    if ((how.get(tp.message) || {}).path === 'missing') continue;
    count.person += 1; row('', '', 'FOR A PERSON: the two readers disagreed or could not place a passage. Read the message.', tp.message, tp.sender, tp.why.join(' '));
  }
  for (const h of how.values()) {
    if (h.path === 'missing') { count.notRead += 1; row('', '', 'NOT READ: there is no recorded answer for this message and no key was set, so no model read it. A person reads the message.', h.id, h.sender, 'To have the readers read it, run the command again with OPENAI_API_KEY set in the environment.'); }
    if (h.path === 'failed') { count.notRead += 1; row('', '', 'NOT READ: the live reader failed on this message. A person reads the message.', h.id, h.sender, h.why); }
  }
  const ids = (path) => [...how.values()].filter((h) => h.path === path).map((h) => h.id);
  const withRow = new Set(rows.map((r) => r[3]));
  return { live, keySet: !!key, rows, count, how: [...how.values()], replayed: [...ids('example'), ...ids('recorded'), ...ids('not placed')], example: ids('example'), missing: ids('missing'), failed: ids('failed'), readLive: ids('live'),
    nothingProposed: [...how.values()].filter((h) => !withRow.has(tsvCell(h.id))).map((h) => h.id), usage, out,
    readerLabels: live ? [liveReaders.reader.label || 'the first reader', liveReaders.second.label || 'the second reader'] : [mb.first.provenance.read_by, mb.second.provenance.read_by] };
}
export function pasteLines(r, file, target) {
  const n = r.how.length, c = r.count;
  const lines = [];
  if (!r.live) {
    lines.push(`No key is set (the environment variable OPENAI_API_KEY is empty), so NO MODEL WAS CALLED: this run replayed recorded answers of the two readers (${r.readerLabels[0]} checked by ${r.readerLabels[1]}).`);
    lines.push(`Recorded answers replayed for ${r.replayed.length} of the ${n} messages${r.replayed.length ? ` (${r.replayed.join(', ')})` : ''}${r.example.length ? `; ${r.example.length} of them ${r.example.length === 1 ? 'is an example message' : 'are example messages'} of the packet, read at ${r.example.length === 1 ? 'its' : 'their'} own place` : ''}.`);
    lines.push(r.missing.length ? `There is NO recorded answer for ${r.missing.length} of the ${n} messages (${r.missing.join(', ')}): ${r.missing.length === 1 ? 'it was' : 'they were'} NOT READ by any reader. Each such message has one row that hands it to a person. To have the readers read them, run the same command with OPENAI_API_KEY set.` : 'Every message of the file has a recorded answer.');
  } else {
    lines.push(`Live readers: ${r.readerLabels[0]} checked by ${r.readerLabels[1]}. Read live: ${r.readLive.length} of the ${n} messages${r.readLive.length ? ` (${r.readLive.join(', ')})` : ''}. ${r.example.length ? `Example messages of the packet, replayed from their recorded answers: ${r.example.join(', ')}. ` : ''}${r.failed.length ? `The reader FAILED on ${r.failed.length} (${r.failed.join(', ')}): each has one row that hands it to a person.` : 'No reader failure.'}`);
    const cost = r.usage.reduce((x, u) => x + (u.costUsd || 0), 0);
    if (r.usage.length) lines.push(`Cost of this run, from the usage the API reported: $${cost.toFixed(4)} for ${r.usage.length} requests.`);
  }
  if (r.nothingProposed.length) lines.push(`Read, and nothing to propose: ${r.nothingProposed.join(', ')}. No row was written for ${r.nothingProposed.length === 1 ? 'it' : 'them'}.`);
  lines.push(`Wrote ${target}: ${r.rows.length} rows for ${n} new ${n === 1 ? "message" : "messages"} from ${file}. Proof links to accept or refuse: ${c.close + c.half}. Cells to leave open, with the reason: ${c.open}. Repeats (the cell keeps its first link, type nothing): ${c.repeat}. A later link that replaces the first, with the version to type: ${c.replace}. Office changes with HOLD: ${c.office}. Other cells by fixed code: ${c.newCells + c.questions}. Messages for a person: ${c.person}. Not read: ${c.notRead}.`);
  lines.push(`The columns are the seven columns of the "Reader suggestions" tab (${PASTE_COLUMNS.join(' | ')}). Open the file, copy all of it, and paste it into column A of the first empty row below the last row of that tab. Column G is for a person's yes or no. Nothing was sent and no sheet was changed.`);
  return lines;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

function main() {
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
if (args.includes('--paste-help')) { console.log(PASTE_HELP); process.exit(0); }
const data = loadAll();
const useRules = args.includes('--rules');
if (args.includes('--paste')) {
  const file = opt('--paste');
  if (!file || file.startsWith('--')) { console.error('--paste needs the path of a JSON file with the new messages.\n'); console.error(PASTE_HELP); process.exit(2); }
  if (!fs.existsSync(file)) { console.error(`There is no file at ${file}.`); process.exit(2); }
  let list;
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); list = Array.isArray(j) ? j : j.messages; } catch (e) { console.error(`${file} is not a JSON file: ${e.message}`); process.exit(2); }
  const target = opt('--out') || 'reader-suggestions-paste.tsv';
  pasteNewMail(list, data).then((r) => {
    const rows = args.includes('--header') ? [PASTE_COLUMNS, ...r.rows] : r.rows;
    fs.writeFileSync(target, rows.map((x) => x.join('\t')).join('\n') + (rows.length ? '\n' : ''));
    for (const line of pasteLines(r, file, target)) console.log(line);
    process.exit(0);
  }).catch((e) => { console.error(e && e.message ? e.message : e); process.exit(1); });
  return;
}
if (args.includes('--process-changes')) {
  const m = measureProcessChanges(data);
  if (!m.available) { console.log('The process-change detector is not available: src/office_rule.js is missing.'); process.exit(1); }
  console.log('Process-change detector: fixed code, no model. It checks messages from an office and the firm\'s call notes.');
  for (const [name, r] of [['72 example messages', m.examples], ['30 unseen messages', m.unseen]]) {
    const without = r.checked - r.in_answer_key.length;
    console.log(`${name}: ${r.checked} of ${r.messages} are from an office or are call notes and were checked; the other ${r.not_checked} were not. Flagged: ${r.flagged.length} (${r.flagged.join(', ') || 'none'}). Process changes in the answer key: ${r.in_answer_key.length} (${r.in_answer_key.join(', ') || 'none'}). Right: ${r.right.length} of ${r.in_answer_key.length}. False alarms: ${r.false_alarms.length} of the ${without} checked messages that hold no process change${r.false_alarms.length ? ` (${r.false_alarms.join(', ')})` : ''}. Missed: ${r.missed.length} of ${r.in_answer_key.length}${r.missed.length ? ` (${r.missed.join(', ')})` : ''}.`);
  }
  console.log(m.caution);
  console.log(`A flagged message is a proposal for Offices M with HOLD, for a person. ${HOLD_MEANS}`);
  console.log('The same fixed code proposes Offices AS (does the office still accept the old route?) and AT (the day it was said) beside each flag, and never the approval cells AQ and AR.');
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(m, null, 1));
  process.exit(0);
}
const out = readMailbox(data.messages, data, { useRules });
const proposals = out.proposals;

if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(out, null, 1));
if (opt('--csv')) {
  const q = (s) => `"${String(s ?? '').replace(/"/g, '""').replace(/\s+/g, ' ').trim()}"`;
  const rows = [['Case', 'Proof cell', 'Reader proposes', 'Message', 'From', 'The words it relies on', 'Accept? (yes / no)']];
  for (const p of proposals) rows.push([p.case, p.gate, p.proposal, p.message, p.sender, p.quote, '']);
  // Process changes, found by fixed code: one row each, for Offices M. The first column names the office, not a case.
  for (const p of out.officeProposals) rows.push([`Office: ${p.county}`, 'Offices M: Changed since', officeRule ? officeRule.holdSentence(`the ${p.county || 'office'} office`.replace('the office office', 'the office')) : HOLD_MEANS, p.message, p.sender, p.quote, '']);
  // Round 16: the proposals for the new cells, one row each. The first column names the hearing, the office or the consultant.
  for (const p of out.newCellProposals) rows.push([newCellWhere(p), `${p.tab} ${p.column}: ${p.header}`, `${p.proposal || 'type'}: ${p.value}`, p.message, p.sender, p.quote || p.why, '']);
  // Round 17: the repeats (column 3 is the sheet's own REPEAT text) and the consultants' questions.
  for (const p of out.repeatProposals) rows.push([p.case, `${p.tab} ${p.column}: ${p.header}`, p.repeatOf !== undefined ? repeatShown(p.repeatOf) : `${p.proposal}: ${p.value}`, p.message, p.sender, `${p.why} The words: "${p.quote}"`, '']);
  for (const p of out.questionProposals) rows.push([p.case, `${p.tab} ${p.column}: ${p.header}`, `type: ${p.value}`, p.message, p.sender, p.why, '']);
  fs.writeFileSync(opt('--csv'), rows.map((r) => r.map(q).join(',')).join('\n') + '\n');
}
const s = out.summary;
// --dockets: the dockets of the example week (one office, one day, one format) as the two readers see
// them. It prints a list only. Until round 15 it also printed an offer and a day-before text for each
// docket; those were the wording of the earlier sheet, and the sheet's own texts now depend on cells this
// tool does not read (the link check CJ, the arrival minutes CI, the office's hours from UTC, the yes
// that counts), so the texts were removed here and the Dockets tab is the one source. Nothing is sent.
if (args.includes('--dockets')) {
  for (const line of docketLines(out, data.packet.consultants)) console.log(line);
  process.exit(0);
}
if (args.includes('--new-cells')) {
  for (const line of newCellLines(out)) console.log(line);
  process.exit(0);
}
if (args.includes('--repeats')) {
  for (const line of repeatLines(out)) console.log(line);
  process.exit(0);
}
if (args.includes('--questions')) {
  for (const line of questionLines(out)) console.log(line);
  process.exit(0);
}
console.log(`Reader: ${out.reader}`);
console.log(`${out.messages} messages read for ${s.hearings} hearings. Nothing sent, no record changed.`);
console.log(`Proposed for the sheet: ${s.proofCellsProposed} proof links to accept, ${s.leftOpen} cells to leave open with the reason.`);
console.log(`Handed to a person because the readers disagreed or could not place a passage: ${s.messagesToAPerson} of ${out.messages} messages.`);
const ownYes = proposals.filter((p) => p.proposal === 'close' && p.gate === GATES.G2).length;
console.log(`Of the ${s.proofCellsProposed} links, ${ownYes} are a consultant's own yes for a slot. With numbered offers that is the type code can match alone (the sender is the consultant on the row, the word YES, the number); the plan accepts those by rule and samples them on Friday. The rule is built and tested on example replies (node cli/replies.js); it is not connected to a mailbox or a text line.`);
console.log(`Gate cells: ${Object.entries(s.gates).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
console.log(`${useRules ? 'One reader only (the offline pattern reader), so no proof link counts as agreed by two readers.' : `Both readers agreed and the verifier passed on ${s.agreedAndVerified} of the ${s.proofCellsProposed} proof links.`} ${s.g2QuotesReplaced} of the ${ownYes} own-yes proposals now show other words than before round 15: the readers' own quote for the yes in ${s.g2QuotesReplaced - s.g2QuotesByFixedCode}, the acceptance sentence found by fixed code in ${s.g2QuotesByFixedCode}. On ${s.gateQuoteDiffers} of the other proof links the field "gateQuote" holds better words than "quote".`);
console.log(`Process changes: ${s.processChanges} of ${s.officeMessagesChecked} office messages and call notes flagged for Offices M with HOLD${out.officeProposals.length ? ` (message ${out.officeProposals.map((p) => p.message).join(', ')})` : ''}. ${HOLD_MEANS} Detector: ${out.processChangeDetector}. Measured on both sets with node cli/sheet.js --process-changes.`);
console.log(`Half proofs: ${s.halfProofs} case-file receipts where the other half of G4 is still missing.`);
const byRule = (r) => out.newCellProposals.filter((p) => p.rule === r);
console.log(`Cells the sheet gained in rounds 16 and 18: ${s.newCellProposals} proposals by fixed code, all for a person (list: node cli/sheet.js --new-cells). A changed route: ${byRule('D2').length} (Offices AS and AT). A notice the office cannot find: ${byRule('D3').length} (Hearings CP and CQ), with the call task: ${byRule('D4').length} (Hearings Y and AA). An illness report: ${byRule('X17').length} (one Availability row). A settlement: ${byRule('C2').length} cells to leave empty, because no message proves them. The approval cells Offices AQ and AR are never proposed. Round 18: the office's record and a moved hearing ${byRule('K1').length} (Hearings DQ and DR), the source of a result ${byRule('K3').length} (Hearings DT and DU), a paper notice and the day a message arrived ${byRule('K6').length} (Offices BB and Hearings DX); never the office's address.`);
console.log(`Repeats (round 17): ${s.repeats} readings repeat an earlier message for a cell that already holds its link, from ${new Set(out.repeatProposals.filter((p) => p.repeatOf !== undefined).map((p) => p.message)).size} messages: the cell keeps its first link and nothing is typed (list: node cli/sheet.js --repeats). ${s.notRepeats} lines are not repeats, because the later receipt names the case-file version and the first did not (message ${[...new Set(out.repeatProposals.filter((p) => p.repeatOf === undefined).map((p) => p.message))].join(', ') || 'none'}).`);
console.log(`Questions (round 17): ${s.questionProposals} proposals for Hearings BN from ${new Set(out.questionProposals.map((p) => p.message)).size} questions of consultants, so that the sheet prints TELL until the answer is linked (list: node cli/sheet.js --questions).`);
console.log('New mail onto the sheet (round 17): node cli/sheet.js --paste <messages.json> writes the proposals of new messages as rows of the "Reader suggestions" tab (node cli/sheet.js --paste-help).');
}

function newCellWhere(p) { return p.case ? p.case : p.county ? `Office: ${p.county}` : `Consultant: ${p.consultant}`; }
export function newCellLines(out) {
  const list = out.newCellProposals || [];
  const r18 = list.filter((p) => /^K\d/.test(p.rule)).length;
  const lines = [`${list.length} proposals for the cells the gate sheet gained in rounds 16 and 18 (${list.length - r18} and ${r18}), from the ${out.messages} example messages. Fixed code, no model. Every line is for a person. Nothing sent, no record changed.`];
  lines.push('Since round 17 the sheet\'s "Reader suggestions" tab lists these below the proposals for the Offices tab, when the sheet is built from an input that carries them.');
  lines.push('');
  for (const p of list) {
    lines.push(`${p.rule} | ${newCellWhere(p)} | ${p.tab} ${p.column} (${p.header}) | ${p.proposal || 'type'}: ${p.value} | message ${p.message}, ${p.sender} (${p.channel})`);
    if (p.heldInTheDaysAfter && p.column === 'I') lines.push(`      ${p.why}`);
  }
  lines.push('');
  lines.push('The approval of a changed route (Offices AQ and AR) is never proposed: a person at the firm types their own name and the date.');
  lines.push('Round 18 never proposes the office\'s street address (Offices BA: only the office can say it), who decided a date-change request (Hearings DV: no message names a person), the homeowner\'s own word on a new date (Hearings DS) or the day a notice arrived (Hearings DW): no message of the packet states them. The day a message arrived (Hearings DX) is proposed as a cell to type, because the packet\'s messages carry no dates.');
  return lines;
}
