'use strict';
// An office's message, sorted by fixed code.
//
// The firm tells a hearing office who will attend (a staffing notice, an email with the case IDs
// and the name, or the office's own form), and the office answers. Most answers are one of a few
// kinds, and each kind has a known place on the gate sheet:
//
//   ack_named               the office names our representative on its record   Hearings K (G3) and BD
//   ack_no_name             the office acknowledges, but names nobody           K stays empty; a receipt for case files goes in L
//   cannot_find             it cannot find our notice or form, or none arrived  nothing is proved; Hearings CP (the link) and CQ (when ours went);
//                                                                               the resend and the call are a task in Y and AA
//   deadline                something is due by a date and time                 Hearings AW, or N and BA for something owed; BH
//   date_time_change        the office moved a hearing                          Hearings D, E, I; J and H are cleared
//   cancellation_processed  the office processed a cancellation or withdrawal   Hearings AF
//   link_or_number          a room, video link, call-in number or arrival note  Hearings AV (and BN when it replaces an earlier one);
//                                                                               an arrival instruction goes in Hearings CI, as minutes
//   process_change          the office changed how it works                     Offices M, AS and AT, and HOLD (see below)
//   for_person              none of these, or something the rule cannot place   nothing is proposed
//
// classifyOfficeReply(text, context) reads the text sentence by sentence with fixed patterns. No
// model is involved, nothing is sent and nothing is written to the sheet: the result is a list of
// suggestions for a person, each with the tab, the column, the value and the reason.
//
// The rule is deliberately narrow.
//   - A message can carry more than one kind. The kind returned is the first one present in the
//     order above (ORDER below); the proposals of the other kinds found are kept.
//   - A sentence that asks for something, reports a problem or takes something back, and that no
//     kind explains, hands the whole message to a person. So does an offer ("we can record Leo" is
//     not a record), a name the office says is not on its record, and a case file it could not
//     open. The two kinds that already send a person to the telephone, cannot_find and
//     process_change, are kept, but then carry only their own proposal.
//   - A process change returns hold = true. Since round 16 HOLD is a block, in the gate sheet's own
//     words (BLOCK below): NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY.
//     A person at the firm reads the change in Offices M and types their name in Offices AQ and the
//     date in Offices AR. After that approval the new route is the route. The old route is a second
//     route only while the office still accepts it (Offices AS: yes or not known); when AS says no,
//     the old route is printed nowhere. The office's own written confirmation (a date in Offices L
//     on or after the date of the change in Offices AT) lifts the block in the same way.
//     routeState and routeText below are the sheet's formulas Offices AV and the route line of
//     Hearings BE, as fixed code, so the tools here print what the sheet prints. The rule proposes
//     M, AS and AT. It never proposes AQ or AR: the approval is a person's own act.
//   - An office that cannot find our notice is typed in Hearings CP (the link to its message or to
//     the dated call note) with the day our notice went in CQ, so the row does not read as if
//     nothing had been sent. The resend and the call in the office's hours are a task in Y and AA.
//   - What an office says by phone proves nothing on the sheet. A name, a move or a cancellation
//     reported in a call note keeps its kind, but the proof cell is not proposed; the proposal is to
//     ask for it in writing.
//   - A new hearing notice, or an office asking who will attend, has no kind here: a person makes
//     the row or answers, and the reason says so.
//
// forPerson is true when a person must read the whole message before anything is typed: for the
// kind for_person and for a process change. Every proposal is a suggestion in any case.

const OFFICE_KINDS = Object.freeze({
  ack_named: 'An acknowledgment that names our representative',
  ack_no_name: 'An acknowledgment without a name',
  cannot_find: 'The office cannot find our notice or form, or says none has arrived',
  deadline: 'A deadline',
  date_time_change: 'A date or time change',
  cancellation_processed: 'A cancellation or withdrawal that the office has processed',
  link_or_number: 'A room, video link or call-in number, or an arrival instruction',
  process_change: 'A change in how the office works',
  for_person: 'For a person',
});

// When a message carries more than one kind, the first one in this list is returned.
const ORDER = ['process_change', 'cannot_find', 'cancellation_processed', 'date_time_change', 'deadline', 'ack_named', 'link_or_number', 'ack_no_name'];

// The sheet's own column headers (deliverables/gate-sheet.xlsx), so a proposal can say what the cell is.
const HEADERS = {
  'Hearings D': 'Hearing date',
  'Hearings E': 'Time',
  'Hearings H': 'Consultant',
  'Hearings I': 'G1 Schedule: county, in writing (per docket)',
  'Hearings J': "G2 Consultant's own yes for this slot",
  'Hearings K': 'G3 County has the name on record for this case',
  'Hearings L': 'G4 Evidence on file with the clerk',
  'Hearings N': 'Owed (leave empty if nothing)',
  'Hearings Y': 'Next action',
  'Hearings AA': 'Due',
  'Hearings AF': 'Proof of cancellation or withdrawal (link)',
  'Hearings AV': 'Room, video link or call-in number (from the office; an arrival instruction goes in column CI, as minutes)',
  'Hearings AW': "Office's deadline for this row (date and time, from its message)",
  'Hearings BA': 'Owed by (date and time, as the office wrote it)',
  'Hearings BD': "Name on the office's record (as its message says)",
  'Hearings BH': 'Times the office has asked about this row (count each reminder)',
  'Hearings BJ': "The office's written answer to our date-change request (link)",
  'Hearings CI': "Office's own arrival instruction for this hearing: minutes before the first case (number, if the office gave one; type it on every hearing of the docket)",
  'Hearings BN': 'To tell the consultant: a change from the office or a wrong belief (who, what, which message)',
  'Offices M': 'Changed since: what, when, who said it, link',
  'Offices AS': 'Does the office still accept the old route? (yes / no / not known)',
  'Offices AT': 'Change said on (date of the call or message in column M)',
  'Hearings CP': 'The office says it cannot find our notice (link to its message or to the dated call note)',
  'Hearings CQ': 'Our notice or form for this hearing went to the office on (date, or the link to the sent message)',
  // Round 18 (K1, K2): the date a moved hearing had before.
  'Hearings DR': 'This hearing was moved: the date it had before (type it when an office moves a hearing, whoever asked for the move)',
};

const LINK = 'the link to this message';

// The block, in the gate sheet's own capitals (the generator's constant BLOCK; Offices N and AW, Hearings BE, Dockets N).
const BLOCK = 'NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY';

/**
 * The HOLD sentence, the same in every tool and word for word the sentence the gate sheet prints
 * on its Reader suggestions tab (column C of an Offices M proposal).
 * office: "the Tesswick office", "this office" or "the office"; the sentence starts it with a capital.
 */
const holdSentence = (office) => {
  const o = String(office || 'this office');
  return `HOLD: ${BLOCK}. ${o.charAt(0).toUpperCase()}${o.slice(1)} said it changed how it works. A person reads the change and types their name in Offices AQ and the date in Offices AR. After the approval the new route is the route, and the old route is a second route only while the office still accepts it (Offices AS: yes or not known).`;
};

const isDate = (v) => (v instanceof Date && !Number.isNaN(v.getTime())) || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)));
const dayOf = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v);

/**
 * The route state of one office, as the gate sheet's formula in Offices AV works it out.
 *   0  no change is typed in Offices M
 *   1  a change waits for approval: blocked, no notice goes and no route is printed
 *   2  approved, and the office no longer accepts the old route (Offices AS is "no"): the new route only
 *   3  approved, and Offices AS is "yes", "not known" or empty: the new route first, the old route second
 * A change is approved when a name is in AQ and a date is in AR, or when the office's written
 * confirmation (a date in L) is on or after the date of the change (a date in AT). A name without a
 * date does not approve, and neither does a date typed as words: dates are Date objects or
 * "YYYY-MM-DD" strings here, anything else is not a date.
 * o: { change (M), approvedBy (AQ), approvedOn (AR), stillAccepts (AS), saidOn (AT), confirmedOn (L) }
 */
function routeState(o) {
  const x = o || {};
  if (!String(x.change || '').trim()) return 0;
  const approved = String(x.approvedBy || '').trim() !== '' && isDate(x.approvedOn);
  const confirmed = isDate(x.confirmedOn) && isDate(x.saidOn) && dayOf(x.confirmedOn) >= dayOf(x.saidOn);
  if (!approved && !confirmed) return 1;
  return String(x.stillAccepts || '').trim().toLowerCase() === 'no' ? 2 : 3;
}

/**
 * What the sheet prints for a notice to that office, state by state (the route line of Hearings BE
 * and the clause in Offices AW), and whether the new route needs a call (Offices AX: the state is 2
 * or 3 and the change in M contains the word "call").
 * o: the fields of routeState, plus county, oldRoute (Offices F), hours (Offices D), row (the office's row on the Offices tab, optional)
 * Returns { state, blocked, routes: string[], line, needsCall, callTask }.
 */
function routeText(o) {
  const x = o || {};
  const state = routeState(x);
  const row = x.row ? String(x.row) : '';
  const county = x.county || 'this';
  const change = String(x.change || '').trim();
  const oldRoute = String(x.oldRoute || '').trim();
  // As the sheet prints it: "approved by <AQ> on <AR>" when both are typed, otherwise "confirmed by the office in writing on <L>"; dates as "Fri 7 Jun".
  const say = (v) => { const t = new Date(`${dayOf(v)}T00:00:00Z`); return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][t.getUTCDay()]} ${t.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][t.getUTCMonth()]}`; };
  const by = String(x.approvedBy || '').trim() !== '' && isDate(x.approvedOn) ? `approved by ${String(x.approvedBy).trim()} on ${say(x.approvedOn)}` : `confirmed by the office in writing${isDate(x.confirmedOn) ? ` on ${say(x.confirmedOn)}` : ''}`;
  const noDot = (s) => s.replace(/[.\s]+$/, '');
  let line, routes;
  if (state === 0) { routes = [oldRoute]; line = `SEND OR CHASE THE NOTICE BY THE OFFICE'S OWN ROUTE (Offices F): ${oldRoute}`; }
  else if (state === 1) { routes = []; line = `${BLOCK}: the ${county} office said it changed how it works (Offices M${row}). To approve, a person types their name in Offices AQ${row} and the date in Offices AR${row}. No route is printed until then.`; }
  else if (state === 2) { routes = [change]; line = `SEND OR CHASE THE NOTICE BY THE OFFICE'S NEW ROUTE (Offices M, ${by}): ${noDot(change)}. THE OFFICE NO LONGER ACCEPTS THE OLD ROUTE (Offices AS): DO NOT USE IT.`; }
  else {
    routes = [change, oldRoute];
    const said = String(x.stillAccepts || '').trim().toLowerCase() === 'yes' ? 'WHICH THE OFFICE STILL ACCEPTS' : 'WHICH THE OFFICE HAS NOT SAID IT NO LONGER ACCEPTS';
    line = `SEND OR CHASE THE NOTICE BY THE OFFICE'S NEW ROUTE (Offices M, ${by}): (1) ${noDot(change)}; (2) THE OLD ROUTE, ${said} (Offices F): ${noDot(oldRoute)}.`;
  }
  const needsCall = state >= 2 && /call/i.test(change);
  const hours = String(x.hours || '').trim();
  const callTask = needsCall ? `CALL THE ${String(county).toUpperCase()} OFFICE IN ITS HOURS${hours ? ` (Offices D: ${hours})` : ''}: TYPE THE CALL IN Y (WHAT), Z (WHO) AND AA (BY WHEN).` : '';
  return { state, blocked: state === 1, routes, line, needsCall, callTask };
}

// ---------------------------------------------------------------------------------------------
// Dates and times, as an office writes them.

const MONTH = '(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\\.?';
const FULL_WEEKDAY = '(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)';
const DATE_SRC = `(?:${FULL_WEEKDAY},? )?(?:${MONTH} \\d{1,2}(?:st|nd|rd|th)?(?:,? \\d{4})?|\\d{1,2}(?:st|nd|rd|th)? (?:of )?${MONTH}(?:,? \\d{4})?|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?)|\\b${FULL_WEEKDAY}\\b|\\b(?:today|tomorrow)\\b`;
const TIME_SRC = '\\b\\d{1,2}(?::\\d{2})? ?[ap]\\.?m\\b\\.?|\\b(?:noon|midday|midnight)\\b|\\b(?:[01]?\\d|2[0-3]):[0-5]\\d\\b|\\b(?:close of business|end of (?:the )?(?:business )?day)\\b';
const DATE_RE = new RegExp(DATE_SRC, 'i');
const TIME_RE = new RegExp(TIME_SRC, 'i');
const WHEN_START_RE = new RegExp(`^(?:the )?(?:${DATE_SRC}|${TIME_SRC})`, 'i');

/** "4 p.m." becomes "4:00 p.m."; other forms stay as the office wrote them. */
function tidyTime(t) {
  const m = String(t).match(/^(\d{1,2})(?::(\d{2}))? ?([ap])\.?m\.?$/i);
  if (m) return `${Number(m[1])}:${m[2] || '00'} ${m[3].toLowerCase()}.m.`;
  return String(t).trim();
}

/** The first date and the first time in a piece of text, or null for each that is absent. */
function findWhen(s) {
  const d = String(s).match(DATE_RE);
  const t = String(s).match(TIME_RE);
  const date = d ? d[0].replace(/\.$/, '').trim() : null;
  const time = t ? tidyTime(t[0].replace(/\.$/, '')) : null;
  return { date, time, text: [date, time].filter(Boolean).join(', ') };
}

// ---------------------------------------------------------------------------------------------
// Sentences, hearings and names.

/** Splits a message into sentences. "a.m." and "p.m." end a sentence only before a capital or a digit. */
function splitSentences(text) {
  const out = [];
  for (const line of String(text || '').split(/\r?\n+/)) {
    const marked = line
      .replace(/\b(No|Mr|Ms|Mrs|Dr|St|Ave|Rd|Ln|Blvd|vs|approx)\.(?= )/g, '$1\u0001')
      .replace(/([.!?])(["')\]]?)\s+(?=["'(\[]?[A-Z0-9])/g, '$1$2\u0002')
      .replace(/;\s+/g, ';\u0002');
    for (const part of marked.split('\u0002')) {
      const s = part.replace(/\u0001/g, '.').replace(/;$/, '').trim();
      if (s) out.push(s);
    }
  }
  return out;
}

const STREET = '(?:Lane|Street|Road|Avenue|Drive|Court|Way|Place|Close|Boulevard|Terrace|Row|Square|Crescent|Hill|Park|Walk|Circle|St|Rd|Ave|Dr|Ln|Blvd)';
const ADDRESS_RE = new RegExp(`\\b(\\d{1,5})((?:(?:,| and|,? and) \\d{1,5})*) ([A-Z][a-z]+(?: [A-Z][a-z]+)? ${STREET})\\b`, 'g');
const CASE_ID_RE = /\b[A-Z]{2,4}-\d{2,6}\b/g;

/** The hearings a sentence names: case IDs and street addresses ("14 and 28 Willow Lane" gives two). */
function hearingsIn(s) {
  const found = [];
  for (const m of String(s).matchAll(CASE_ID_RE)) found.push(m[0]);
  for (const m of String(s).matchAll(ADDRESS_RE)) {
    const numbers = [m[1], ...(m[2].match(/\d{1,5}/g) || [])];
    for (const n of numbers) found.push(`${n} ${m[3]}`);
  }
  return [...new Set(found)];
}

const NAME = "([A-Z][a-z]+(?:[-'’][A-Z]?[a-z]+)?(?: [A-Z][a-z]+(?:[-'’][A-Z]?[a-z]+)?){0,2})";
const NOT_A_NAME = new Set(['The', 'We', 'Both', 'Your', 'Our', 'No', 'Nobody', 'None', 'Nothing', 'It', 'This', 'That', 'Each', 'All', 'Any', 'Notice', 'Notices', 'Staffing', 'Hearing', 'Hearings', 'Video', 'Room', 'Representative', 'Representatives', 'Please', 'Case', 'Cases', 'Packet', 'Packets', 'File', 'Files', 'Form', 'Forms', 'Withdrawal', 'Appeal', 'Homeowner', 'County', 'Clerk', 'Board', 'Office', 'Someone', 'Everyone', 'Anyone', 'He', 'She', 'They', 'Who', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
const RECORDED = '(?:recorded|listed|entered|registered|noted|logged|added|on (?:our|the) (?:record|records|list|file))';
const NAMED_PATTERNS = [
  // "Leo is recorded for both", "Leo is listed as representative", "Priya is the representative on our record"
  { re: new RegExp(`${NAME} (?:is|are|has been|have been|was|were|remains|stays)((?: (?:now|already|still|also|not|no longer|not yet))*) (?:${RECORDED}|(?:the |our |your )?representative (?:on|of) (?:our |the )?records?|accepted as)\\b`), name: 1, adverbs: 2 },
  // "We have recorded Owen Tarris as representative"
  { re: new RegExp(`\\b(?:[Ww]e have|[Ww]e've|[Ww]e|I have|I) (?:now |already |also )?(?:recorded|listed|entered|registered|noted|logged|added|accepted) ${NAME}\\b`), name: 1 },
  // "Staffing notices naming Leo have been accepted"
  { re: new RegExp(`\\bnam(?:ing|es|ed) ${NAME} (?:has|have|was|were|is|are) (?:been )?(?:accepted|recorded|entered|processed|registered|approved|received and recorded)\\b`), name: 1 },
  // "Our record shows Leo Arlen"
  { re: new RegExp(`\\b(?:record|records|list|file) (?:shows?|names?|lists?|has|have|gives?) ${NAME}\\b`), name: 1 },
  // "Representative on record: Leo Arlen"
  { re: new RegExp(`\\b[Rr]epresentative(?: on (?:our |the )?record| of record| recorded| listed)?(?: is|:) ${NAME}\\b`), name: 1 },
];

/** The consultant names the caller knows: strings or objects with a name. */
function consultantNames(context) {
  const list = (context && context.consultants) || [];
  return list.map((c) => (typeof c === 'string' ? c : c && c.name)).filter(Boolean);
}

/**
 * Turns the name an office wrote into a name for BD.
 * With a consultant list: the full name when exactly one consultant matches (full name, first name or
 * last name); ambiguous when more than one matches; the name as written, marked unknown, when none does.
 * Without a list: the name as written.
 */
function resolveName(written, names) {
  if (!names.length) return { name: written, known: null };
  const w = written.toLowerCase();
  const full = names.filter((n) => n.toLowerCase() === w);
  if (full.length === 1) return { name: full[0], known: true };
  const part = names.filter((n) => n.toLowerCase().split(/\s+/).includes(w));
  if (part.length === 1) return { name: part[0], known: true };
  if (part.length > 1) return { name: written, known: false, ambiguous: part };
  return { name: written, known: false };
}

// ---------------------------------------------------------------------------------------------
// The patterns for each kind. Each is tested on one sentence.

const PROCESS_WORD = /\b(?:accept\w*|enough|suffic\w+|tak(?:e|es|ing)|us(?:e|es|ing)|e-?mail\w*|fax\w*|mail\w*|post\w*|portal|upload\w*|forms?|send\w*|sent|submit\w*|submission\w*|requir\w+|need\w*|valid|allow\w*|permit\w*|process\w*|notices?|names?|phone|call\w*)\b/i;
const PROCESS_PATTERNS = [
  { re: /\bno longer\b/i, needsWord: true },
  { re: /\b(?:is|are) not (?:enough|sufficient)\b/i, needsWord: true },
  { re: /\bnow (?:requires?|required|needs?|must|asks?|accepts? only|only accepts?|uses?|has to|have to)\b/i },
  { re: /\b(?:is|are) now (?:required|needed|mandatory|compulsory)\b/i },
  { re: /\b(?:must|have to|has to|need to|needs to|should|will need to) now\b/i },
  { re: /\bfrom now on\b|\bgoing forward\b|\bin future\b|\bhenceforth\b|\bfrom here on\b/i },
  { re: /\b(?:new|revised|updated|changed) (?:staffing |representative |notice |submission |filing |intake |online )?(?:form|procedure|process|requirement|requirements|portal|policy|rule|rules|system|route|instructions)\b/i },
  { re: /\beffective (?:immediately|today|from|as of|[A-Z][a-z]+ \d)/ },
  { re: /\b(?:as of|starting|beginning|from) (?:today|tomorrow|next (?:week|month)|[A-Z][a-z]+ \d{1,2})\b[^.;]*\b(?:must|requires?|required|only|will (?:not|no longer|only)|needs?)\b/ },
  { re: /\b(?:will|can) only (?:accept|record|take|process|be accepted)\b|\bonly (?:accept|accepts|accepted) (?:by|via|through|on|in)\b/i },
  { re: /\b(?:we have|we've|the office has|the board has|the county has) (?:changed|updated|revised|moved to|switched to|introduced|adopted)\b/i, needsWord: true },
  { re: /\binstead of (?:e-?mailing|e-?mail|sending|faxing|posting|mailing|calling|phoning|the (?:staffing )?(?:notice|form|email))\b/i },
  { re: /\bstop (?:e-?mailing|sending|faxing|using|posting)\b/i },
];

const CANNOT_FIND_RE = /\b(?:cannot|can't|can not|could not|couldn't|unable to|not able to|been unable to) (?:find|locate|see|trace)\b|\b(?:have|has|had) (?:not|never)(?: yet)? (?:received|got|seen|been sent)\b|\b(?:did not|didn't|never) (?:receive|arrive|reach|come through|get)\b|\bno (?:record|trace|sign|copy) of\b|\bnot (?:in|on) (?:the|our) [a-z ]{0,20}(?:inbox|system|files?|records|mailbox)\b|\bnothing (?:has |was )?(?:been )?(?:received|arrived)\b/i;
// The office's own words that the old route is closed, for Offices AS.
const OLD_ROUTE_CLOSED = /\bno longer (?:enough|sufficient|accept\w*|valid|allowed|permitted|take[sn]?|use[sd]?)\b|\b(?:is|are) not (?:enough|sufficient)\b|\b(?:accepts?|accepted) only\b|\bonly accepts?\b|\bno longer\b.*\b(?:accept\w*|enough)\b/i;
// When the office asks for the call, for Hearings AA.
const CALL_WHEN = /\b(?:call|phone|ring)(?: (?:us|back|again|me))*,? ((?:tomorrow|this|on|next|after|before|at)\b[^.;]{0,40}|today|later today)/i;
const CANNOT_FIND_OBJECT = /\b(?:notices?|forms?|assignments?|e-?mails?|submissions?|staffing|names?|packets?|files?|attachments?|documents?|statements?|fax|letters?|messages?|it|them|anything)\b/i;

const CANCEL_WORD = /\b(?:withdraw(?:n|s|al|als|ing)?|cancel(?:s|led|ed|ling|lation|lations)?|vacated?|taken off|struck)\b/i;
const CANCEL_DONE = [
  /\b(?:has|have) (?:now )?been (?:withdrawn|cancell?ed|removed|vacated|struck|taken off|processed)\b/i,
  /\b(?:we|I) (?:have |'ve )?(?:now )?(?:processed|withdrawn|cancell?ed|removed|vacated|taken)\b/i,
  /\b(?:is|are|stands?) (?:now )?(?:withdrawn|cancell?ed|vacated|off (?:the|our) (?:list|schedule|calendar|docket))\b/i,
  /\b(?:withdrawal|cancellation) (?:is|has been|was) (?:processed|complete|completed|recorded|entered|confirmed|accepted|granted|approved)\b/i,
  /\bno longer (?:on|listed|scheduled|set)\b/i,
  /\bwill not (?:be heard|go ahead|take place|proceed)\b/i,
  /\b(?:removed|taken) (?:from|off) (?:the|our) (?:schedule|list|calendar|docket)\b/i,
];
const CANCEL_PENDING = /\b(?:until|once|after|when|if|so (?:that )?we can|before we|pending|request(?:s|ed)?|asked|asks|please|not yet|has not|have not|cannot|can't|will be processed|to be processed|remains?|still|unless)\b|\?/i;
const POSTPONED_RE = /\b(?:reschedul\w*|new date|re-?list\w*|postpon\w*|adjourn\w*)\b/i;

const MOVE_VERB = /\b(?:moved?|moving|rescheduled?|rescheduling|postponed?|adjourned|continued|reset|re-set|relisted|re-listed|brought forward|advanced|pushed back|changed|delayed)\b/i;
const MOVE_REQUESTED = /\b(?:ask(?:s|ed|ing)?|request(?:s|ed|ing)?|want(?:s|ed)?|wish(?:es|ed)?|would like|propos(?:e|es|ed|ing)|consider(?:s|ed|ing)?|hop(?:e|es|ed|ing)|could (?:we|you)|can you|may we)\b[^,;.]{0,50}?\b(?:to (?:move|reschedule|postpone|change)|be (?:moved|rescheduled|postponed|changed)|move|reschedule)\b/i;
const MOVE_CONDITION = /\b(?:if|once|provided|subject to|would need|as long as|unless|whether)\b|\?/i;
const REFUSED_RE = /\b(?:cannot|can't|can not|could not|couldn't|unable to|not able to|will not|won't) (?:be )?(?:mov|reschedul|chang|postpon|accommodat)\w*\b|\bmust (?:stay|remain)\b|\bschedule is full\b|\b(?:is|are|was|were) (?:full|fully booked)\b|\b(?:request|change|move) (?:is|was|has been) (?:denied|refused|declined|rejected|not approved)\b|\bnot (?:be )?(?:moved|rescheduled)\b/i;

const ARRIVAL_RE = /\b(?:arrive|check in|be (?:there|present|seated)|join|log (?:in|on)|dial in|connect)\b[^.;]{0,40}?\b(?:\d+ minutes?|by \d|before|early|at least|ahead)\b/i;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;
const ROOM_RE = /\b((?:video |hearing |court)?room) (?:number )?([A-Z]|\d{1,4}[A-Z]?)\b/;
const CALL_IN_RE = /\b(?:dial(?:-in| in)?|call(?:-in| in)|conference (?:line|number|call)|telephone number|phone number|join by phone|meeting id|access code|passcode)\b/i;
const PHONE_NUMBER_RE = /(?:\+?1[ .-])?\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b|\b555-\d{4}\b|\b\d{3} \d{3,4} \d{3,4}\b/;
const REPLACES_RE = /\binstead of\b|\bno longer\b|\bnow\b|\bnew\b|\bchanged?\b|\breplaces?\b|\bupdated\b|\bmoved to\b/i;

const NAME_SUBJECT = /\b(?:staffing|representatives?|assignments?|who will attend|attending|names?|appearance)\b/i;
const OWED_SUBJECT = /\b((?:[a-z'’-]+ ){0,2}?)(statements?|signatures?|signed (?:copy|page|form)|documents?|survey|evidence|affidavit|authori[sz]ation|cop(?:y|ies)|withdrawal|settlement|photographs?|photos?|appraisal|report|exhibits?|materials?|packets?|files?|pages?|receipt|payment|fee)\b/i;
const DEADLINE_ASK = /\b(?:please|kindly|must|submit|return|send|file|provide|needs?|required|requires?|due|deadline|respond|reply|confirm|supply|deliver|until|waiting for|otherwise|upload|complete|sign|pay|let us know|tell us|name|identify)\b/i;
const OFFICE_OWN_TIMING = /\b(?:decision|ruling|determination)\b[^.;]*\b(?:issued|sent|mailed|expected|posted|released|follow)\b/i;

const ASKS_WHO_RE = /\bwho will (?:attend|appear|represent)\b|\b(?:confirm|identify|name|send|provide|tell us|advise|let us know)\b[^.;]{0,50}\b(?:representatives?|who)\b|\bname of the representative\b|\b(?:do|does) not (?:yet )?have a representative\b|\bno representative (?:is |has been )?(?:recorded|named|on record|listed)\b|\b(?:not|not yet) recorded a representative\b|\bhave not (?:yet )?recorded a representative\b/i;
const UPDATE_REP_RE = /\bupdate your representative\b/i;
const OFFER_RE = /\b(?:can|could|will|would|shall|may|might|able to|happy to|glad to|prepared to|ready to)\b(?: (?:then|also|now))? (?:be )?(?:record(?:ed)?|list(?:ed)?|enter(?:ed)?|register(?:ed)?|add(?:ed)?)\b/i;

const NOTICE_ACK = /\b(?:received|acknowledg(?:e|es|ed|ing)|confirm(?:ing|s)? receipt|accepted|processed|recorded|entered|registered|on file|noted)\b/i;
const NOTICE_OBJECT = /\b(?:staffing (?:notices?|forms?|details)|notices?|forms?|assignments?|submissions?|representatives?|representation|e-?mails?|names?)\b/i;
const NOT_A_PLAIN_STATEMENT = /\b(?:please|if|whether|once|when|will|would|should|not|no|never|cannot|unable)\b|n't\b|\?/i;

const FILE_WORD = /\b(?:packets?|case files?|files?|attachments?|documents?|exhibits?|evidence)\b/i;
const FILE_OK = /\b(?:received|opened|opens|open (?:fine|correctly|without)|readable|legible|on file|we have|we hold|hold|in hand|confirm(?:ing)? receipt|receipt of)\b/i;
const FILE_BAD = /\b(?:unreadable|not readable|illegible|not legible|(?:could|can|would|did|does|will) ?not open|cannot open|can't open|won't open|corrupt(?:ed)?|blank|damaged|incomplete|missing|password|truncated|cut off|wrong (?:file|version|case)|resend|re-send|send (?:it|them) again)\b/i;

// Statements that need nothing typed.
const NEUTRAL_RE = new RegExp(`\\bunchanged\\b|\\bno changes?\\b|\\b(?:has|have|is|are) not changed\\b|\\bremains? (?:confirmed|as (?:scheduled|listed|set)|on|the same|listed|scheduled|set|${MONTH} \\d+)|\\bstays? (?:on|as)\\b|\\bas (?:previously )?(?:scheduled|notified)\\b|\\bunaffected\\b|\\b(?:no|nothing) (?:further|more|other|additional|else)\\b[^.;]*\\b(?:requested|required|needed|scheduled|necessary|outstanding)\\b|\\bno additional material\\b|\\bawaiting (?:a |the )?(?:written )?decision\\b|\\b(?:still )?(?:reviewing|considering|looking at)\\b[^.;]*\\b(?:request|change)\\b|\\bunder review\\b`, 'i');

// A sentence with one of these, and no kind that explains it, sends the message to a person.
const CUE_RE = /\b(?:please|kindly|must|need(?:s|ed)?|require[sd]?|cannot|can't|can not|unable|won't|unreadable|illegible|missing|incorrect|wrong|correct(?:ed|ion)?|resend|re-send|return|invalid|reject(?:ed|s|ion)?|refus(?:e|ed|es|al)|den(?:y|ied|ial)|declin(?:e|ed|es)|fail(?:ed|s|ure)?|problem|issue|error|incomplete|expired|overdue|late|dismiss(?:ed|al)?|default|urgent(?:ly)?|immediately|otherwise|unless|not|no|never|without|but|however|except|only|instead|objection|disput(?:e|ed)|complain(?:t|ed)?)\b|n't\b|\?/i;

const BY_PHONE_TEXT = /^(?:called|phoned|rang)\b|\b(?:clerk|office|county|board)\b[^.:]{0,30}\b(?:called|phoned|rang|said by phone|told us by phone)\b|\breturned our call\b|\bby (?:phone|telephone)\b|\bvoicemail\b|\bon the (?:phone|call)\b|\b(?:called|phoned) (?:again|us)\b/i;

// ---------------------------------------------------------------------------------------------
// One sentence: what it says.

function readSentence(sentence, env) {
  const s = sentence;
  const found = [];
  const add = (type, extra = {}) => found.push({ type, sentence: s, ...extra });

  // A change in how the office works.
  for (const p of PROCESS_PATTERNS) {
    if (p.re.test(s) && (!p.needsWord || PROCESS_WORD.test(s))) {
      // "is no longer on our schedule" is a cancellation, not a process.
      if (/\bno longer (?:on|listed|scheduled|set)\b/i.test(s) && !/\b(?:accept|enough|e-?mail|form|fax|portal|submit)\w*\b/i.test(s)) continue;
      add('process_change');
      break;
    }
  }

  // The office cannot find what we sent, or says nothing arrived.
  if (CANNOT_FIND_RE.test(s) && CANNOT_FIND_OBJECT.test(s)) add('cannot_find');

  // A name on the office's record. Addresses are blanked first, so "Maple Lane is listed" is not a name.
  const blanked = s.replace(ADDRESS_RE, '#').replace(env.countyRe || /$^/, '#');
  let named = false;
  for (const p of NAMED_PATTERNS) {
    const m = blanked.match(p.re);
    if (!m) continue;
    const written = m[p.name].split(' ').filter((w, i, a) => !(i < a.length - 1 && NOT_A_NAME.has(w))).join(' ');
    if (!written || written.split(' ').some((w) => NOT_A_NAME.has(w))) continue;
    // "listed for June 14" is a schedule, not a record of a representative.
    const after = blanked.slice(m.index + m[0].length);
    if (new RegExp(`^ (?:for|on) (?:${DATE_SRC})`, 'i').test(after) && !/\brepresentative\b/i.test(s)) continue;
    if (p.adverbs && /\bnot\b|\bno longer\b/.test(m[p.adverbs] || '')) { add('not_on_record', { written }); named = true; break; }
    add('ack_named', { written });
    named = true;
    break;
  }
  if (OFFER_RE.test(s) && !found.some((f) => f.type === 'process_change')) add('offer_not_record');

  // A cancellation or withdrawal: processed, or only asked for.
  if (CANCEL_WORD.test(s) || CANCEL_DONE.slice(4).some((re) => re.test(s))) {
    const done = CANCEL_DONE.some((re) => re.test(s));
    if (done && POSTPONED_RE.test(s)) add('postponed');
    else if (done && !CANCEL_PENDING.test(s)) add('cancellation_processed');
    else add('withdrawal_pending');
  } else if (/\bso (?:that )?we can process\b|\bprocess (?:it|the request)\b/i.test(s)) {
    add('withdrawal_pending');
  }

  // A move to a new date or time, a refusal to move, or only a request to move.
  if (MOVE_REQUESTED.test(s)) add('move_requested');
  else if (REFUSED_RE.test(s)) add('refused');
  if (!found.some((f) => f.type === 'move_requested') && MOVE_VERB.test(s)) {
    const verbAt = s.search(MOVE_VERB);
    const before = s.slice(Math.max(0, verbAt - 30), verbAt);
    const negated = /\b(?:cannot|can't|can not|could not|couldn't|unable to|not able to|will not|won't|not|never)\b[^,;]{0,25}$/i.test(before);
    if (!negated) {
      const rest = s.slice(verbAt);
      let when = null;
      const tos = [...rest.matchAll(/\bto\b\s+/gi)];
      for (const t of tos.reverse()) {
        const tail = rest.slice(t.index + t[0].length);
        if (WHEN_START_RE.test(tail)) { when = findWhen(tail); break; }
      }
      if (when && (when.date || when.time)) {
        const modal = /\b(?:can|are able to|is able to)\b[^,;]{0,12}$/i.test(before);
        if (MOVE_CONDITION.test(s)) add('move_conditional');
        else add('date_time_change', { when, answersOurRequest: modal });
      } else if (/\b(?:postponed|adjourned|rescheduled|delayed|continued)\b/i.test(s)) {
        add('postponed');
      }
    }
  }
  const nowAt = s.match(/\b(?:will now|is now|are now|now)\b[^.;]{0,30}\b(?:heard|held|take place|start|begin|set|scheduled|listed)\b[^.;]{0,12}?\b(?:on|at|for)\b\s+(.*)$/i)
    || s.match(/\bnew (?:hearing )?(?:date|time|slot)\b[^.;]{0,20}?\b(?:is|will be|:|of)\s+(.*)$/i);
  if (nowAt && !found.some((f) => ['date_time_change', 'move_conditional', 'move_requested'].includes(f.type)) && WHEN_START_RE.test(nowAt[1])) {
    add('date_time_change', { when: findWhen(nowAt[1]), answersOurRequest: false });
  }

  // An arrival instruction, a room, a link or a call-in number.
  const arrival = ARRIVAL_RE.test(s);
  const parts = [];
  const url = s.match(URL_RE);
  const room = s.match(ROOM_RE);
  if (room) parts.push(`room ${room[2]}`);
  if (url) parts.push(url[0].replace(/[.,;]+$/, ''));
  if (CALL_IN_RE.test(s)) {
    const num = s.match(PHONE_NUMBER_RE);
    const code = s.match(/\b(?:meeting id|access code|passcode)\b[:\s#]*([\d][\d\s-]{3,}\d)/i);
    if (num) parts.push(`call-in number ${num[0]}`);
    if (code) parts.push(`${code[0].replace(/\s+/g, ' ').trim()}`);
  }
  // The office's arrival instruction has its own cell, Hearings CI, as minutes before the first case.
  let arrivalSaid = null, arrivalMinutes = null;
  if (arrival) {
    arrivalSaid = s.replace(/^(?:please|kindly)\s+/i, '').replace(/[.!]+$/, '');
    const min = s.match(/\b(\d{1,3}) minutes?\b/i);
    arrivalMinutes = min ? Number(min[1]) : null;
  }
  if (parts.length || arrival) add('link_or_number', { value: parts.join('; '), arrivalSaid, arrivalMinutes, replaces: !arrival && REPLACES_RE.test(s) && Boolean(room || url) });

  // A deadline: a date or a time straight after "by", "before", "no later than", "due", or after "deadline".
  if (!arrival && !(OFFICE_OWN_TIMING.test(s) && !/\b(?:please|must|submit|return|send us|file|provide)\b/i.test(s))) {
    let when = null;
    let written = null;
    for (const m of s.matchAll(/\b(?:by|before|no later than|not later than|on or before|due(?: on| by)?|ha(?:ve|s) until)\s+/gi)) {
      const tail = s.slice(m.index + m[0].length, m.index + m[0].length + 60);
      if (!WHEN_START_RE.test(tail)) continue;
      when = findWhen(tail);
      written = `${m[0]}${tail}`.replace(/[,;.]?\s*(?:otherwise|or the|or we|and)\b.*$/i, '').replace(/[.,;\s]+$/, '');
      break;
    }
    if (!when) {
      const d = s.match(/\bdeadline\b(.*)$/i);
      if (d) { const w = findWhen(d[1]); if (w.date || w.time) { when = w; written = `deadline${d[1]}`.replace(/[.,;\s]+$/, ''); } }
    }
    if (!when) {
      const w = s.match(/\bwithin (?:\w+ )?(?:\(?\d+\)? )?(?:working |business |calendar )?(?:days?|hours?|weeks?)\b/i);
      if (w && /\d|one|two|three|four|five|six|seven|ten/i.test(w[0])) { when = { date: null, time: null, text: w[0] }; written = w[0]; }
    }
    if (when && DEADLINE_ASK.test(s)) add('deadline', { when, written });
  }

  if (ASKS_WHO_RE.test(s) && !/\b(?:cannot|can't|can not|unable to|not able to)\b/i.test(s)) add('asks_who');
  if (UPDATE_REP_RE.test(s)) add('update_rep');

  // Case files: received, or a problem with them.
  if (FILE_WORD.test(s) && FILE_BAD.test(s) && !found.some((f) => f.type === 'cannot_find')) add('file_problem');
  else if (FILE_WORD.test(s) && FILE_OK.test(s) && !NOT_A_PLAIN_STATEMENT.test(s.replace(/\bno (?:further|more|other)\b/gi, ''))) add('files_received');

  // An acknowledgment of our notice that names nobody.
  if (!named && NOTICE_ACK.test(s) && NOTICE_OBJECT.test(s) && !NOT_A_PLAIN_STATEMENT.test(s) && !found.some((f) => ['files_received', 'file_problem', 'cannot_find', 'process_change'].includes(f.type))) add('ack_no_name');

  if (NEUTRAL_RE.test(s)) add('neutral');
  if (!found.length && CUE_RE.test(s)) add('unexplained');
  return found;
}

// ---------------------------------------------------------------------------------------------
// The whole message.

/**
 * Sorts one message from a hearing office and proposes what a person types on the gate sheet.
 * Nothing is sent and nothing is written anywhere.
 *
 * @param {string} text     the body of the office's message, or of a call note about the office
 * @param {object} [context] optional, and may be empty:
 *   county       the office's county, for the HOLD sentence (holdSentence above) and so the county is not read as a name
 *   caseIds      the case IDs the message is about, used when a sentence names no hearing
 *   consultants  the firm's consultants (names, or objects with a name), so "Leo" becomes "Leo Arlen"
 *   channel      how the message came; anything with "phone", "call" or "voicemail" is treated as said by phone
 * @returns {{ kind: string, proposals: {tab: string, column: string, value: string, why: string, appliesTo: string, header: string}[],
 *   hold: boolean, forPerson: boolean, reason: string, inWriting: boolean, alsoSeen: string[] }}
 *   kind is a key of OFFICE_KINDS. hold is true only for a process change. forPerson is true for
 *   the kind for_person and for a process change. alsoSeen lists the other kinds found in the message.
 */
function classifyOfficeReply(text, context) {
  const ctx = context || {};
  const body = String(text || '').trim();
  const office = ctx.county ? `the ${ctx.county} office` : 'this office';
  const result = (kind, proposals, reason, extra = {}) => ({
    kind,
    proposals,
    hold: kind === 'process_change',
    forPerson: kind === 'for_person' || kind === 'process_change',
    reason,
    inWriting: !extra.byPhone,
    alsoSeen: extra.alsoSeen || [],
  });
  if (!body) return result('for_person', [], 'The message is empty.');

  const names = consultantNames(ctx);
  const env = { countyRe: ctx.county ? new RegExp(`,? ${String(ctx.county).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g') : null };
  const byPhone = /phone|call|voicemail/i.test(String(ctx.channel || '')) || BY_PHONE_TEXT.test(body);
  const sentences = splitSentences(body);
  const everyHearing = (Array.isArray(ctx.caseIds) && ctx.caseIds.length) ? ctx.caseIds.join(', ') : (hearingsIn(body).join(', ') || 'each hearing the message is about');

  // Read every sentence, and work out which hearings each one is about.
  const signals = [];
  let last = null;
  for (const s of sentences) {
    const here = hearingsIn(s);
    let appliesTo;
    if (here.length) appliesTo = here.join(', ');
    else if (last && /\b(?:it|that one|this one|that hearing|this hearing|that case|this case)\b/i.test(s)) appliesTo = last;
    else appliesTo = everyHearing;
    if (here.length) last = here.join(', ');
    for (const f of readSentence(s, env)) signals.push({ ...f, appliesTo });
  }
  const has = (type) => signals.some((f) => f.type === type);
  const all = (type) => signals.filter((f) => f.type === type);

  // The proposals of each kind found.
  const byKind = {};
  const push = (kind, tab, column, value, why, appliesTo) => {
    const list = (byKind[kind] = byKind[kind] || []);
    if (list.some((p) => p.tab === tab && p.column === column && p.appliesTo === appliesTo)) return;
    list.push({ tab, column, value, why, appliesTo, header: HEADERS[`${tab} ${column}`] || '' });
  };
  const forced = []; // reasons that hand the message to a person

  const officeRow = ctx.county ? `the ${ctx.county} row` : "the office's row";
  for (const f of all('process_change')) {
    push('process_change', 'Offices', 'M', `"${f.sentence}" Add the date, who said it and the link to this message. Written confirmation asked.`,
      'When an office says anything new about how it works, by phone or in writing, it is written in Offices M the same day with the date and who said it.', officeRow);
  }
  if (all('process_change').length) {
    // Does the office still accept the old route? "no" only when its own words say so; otherwise "not known", and a person asks.
    const closes = all('process_change').find((f) => OLD_ROUTE_CLOSED.test(f.sentence));
    push('process_change', 'Offices', 'AS', closes ? 'no' : 'not known',
      closes ? `The office's own words say the old route is no longer enough or no longer accepted ("${closes.sentence}"). After a person approves the change, the old route is printed nowhere.`
        : 'The message does not say whether the old route is still accepted. Ask the office; until it answers, the old route is printed as a second route after the approval.', officeRow);
    push('process_change', 'Offices', 'AT', ctx.saidOn ? String(ctx.saidOn) : 'the date of this call or message, typed as a date',
      "The day the office said it. The office's written confirmation (Offices L) counts as the approval only when its date is on or after this one. The approval itself (Offices AQ and AR) is typed by the person who read the change, never by a rule.", officeRow);
  }

  for (const f of all('cannot_find')) {
    // Without the firm's own record that the notice went (context sentNotice), CP is proposed on a condition: an office that
    // "has not received" a notice may be right, and CP must not say that a notice was sent when none was.
    push('cannot_find', 'Hearings', 'CP', ctx.sentNotice ? LINK : `${LINK}, if our notice or form went (if none went, leave CP and CQ empty and send it now)`,
      `The office says it cannot find our notice or form, or that none has arrived${byPhone ? ' (said by phone: link the dated call note)' : ''}. With the link in CP the row reads OFFICE CANNOT FIND OUR NOTICE at the top of the daily list and BE prints THE NOTICE WAS SENT ... BUT THE OFFICE CANNOT FIND IT. It is not a record: G3 (K) stays empty.`, f.appliesTo);
    push('cannot_find', 'Hearings', 'CQ', ctx.sentNotice ? String(ctx.sentNotice) : 'the date our notice or form went, or the link to the sent message',
      'The firm\'s own record that the notice went, so the row does not read as if nothing had been sent. If it never went, CQ stays empty and the notice is sent now.', f.appliesTo);
    push('cannot_find', 'Hearings', 'Y', "RESEND THE COMPLETED FORM OR NOTICE TODAY BY THE OFFICE'S ROUTE, THEN CALL THE OFFICE IN ITS HOURS",
      'A notice or form that the office cannot find is not a record: G3 (K) stays empty. If it was sent, it is resent that day, complete, and then the coordinator calls in the office\'s hours (Offices D). While a change of route waits for approval (Offices AQ and AR), it is resent only after the approval. The call is a task in Y (what), Z (who) and AA (by when); a call never closes a check.', f.appliesTo);
    const asked = CALL_WHEN.exec(f.sentence) || CALL_WHEN.exec(body);
    push('cannot_find', 'Hearings', 'AA', asked ? `${asked[1].toLowerCase()}, as the office asked (type the date), in its hours` : "today, in the office's hours",
      'By when the call is made. Z names who calls.', f.appliesTo);
  }

  for (const f of all('cancellation_processed')) {
    if (byPhone) {
      push('cancellation_processed', 'Hearings', 'Y', 'THE OFFICE SAID BY PHONE THAT THIS IS OFF ITS LIST: ASK FOR IT IN WRITING',
        "Only the office's written confirmation goes in AF. Until then the hearing stays staffed and on its docket.", f.appliesTo);
    } else {
      push('cancellation_processed', 'Hearings', 'AF', LINK,
        "The office's written confirmation that the cancellation or withdrawal is processed. \"Hearing still on?\" (G) is set to no only once the homeowner's written yes is linked in BG.", f.appliesTo);
    }
  }

  for (const f of all('date_time_change')) {
    const said = [f.when.date, f.when.time].filter(Boolean).join(' at ');
    if (byPhone) {
      push('date_time_change', 'Hearings', 'BN', `[the consultant on the row]: the office said by phone that this hearing moves to ${said}; the old date stands until the written notice (this call note)`,
        'Only the office\'s written notice moves a date. A phone report is held: the old date stays and the consultant gets the warning text that day.', f.appliesTo);
      push('date_time_change', 'Hearings', 'Y', 'ASK THE OFFICE FOR THE WRITTEN NOTICE OF THE MOVE',
        'D and E do not change on a phone report.', f.appliesTo);
      continue;
    }
    if (f.when.date) push('date_time_change', 'Hearings', 'D', f.when.date, 'The new date, on the moved row only. The message gives no year: type it as a date.', f.appliesTo);
    if (f.when.time) push('date_time_change', 'Hearings', 'E', f.when.time, 'The new time, as the office states it (its local time).', f.appliesTo);
    push('date_time_change', 'Hearings', 'I', LINK, 'Replace the G1 link: the schedule in writing is now this message.', f.appliesTo);
    push('date_time_change', 'Hearings', 'J', '(clear the cell)', 'A yes belongs to a time slot, so the old yes does not count for the new one.', f.appliesTo);
    push('date_time_change', 'Hearings', 'H', '(clear the cell)', 'The new slot has no consultant until someone says yes to it. Offer the new slot.', f.appliesTo);
    // Round 18 (K1, K2): the office's record of our name was for the old date, so K is cleared too, and the old date goes in DR.
    // Only for a new date: a new time on the same day keeps the record (the sheet compares dates).
    if (f.when.date) push('date_time_change', 'Hearings', 'K', '(clear the cell; keep the old link in a note in Y)',
      'The office recorded the name for the date the hearing had before, so that record does not close G3 for the new date. Ask the office in writing whether the consultant is still on its record for the new date; its answer goes in K and the new date in DQ.', f.appliesTo);
    const before = new RegExp(`\\bfrom (${MONTH} \\d{1,2})(?:st|nd|rd|th)?\\b`, 'i').exec(String(f.sentence || ''));
    if (f.when.date) push('date_time_change', 'Hearings', 'DR', before ? before[1] : 'the date the hearing had before (the date now in D), typed as a date',
      'The hearing was moved. With the old date in DR the sheet asks the office whether the name is still on its record for the new date, and puts the call to the homeowner with the new date on the daily list until the homeowner\'s own message, the dated call note or the corrected notice is linked in DS. The message gives no year: type it as a date.', f.appliesTo);
    if (f.answersOurRequest) push('date_time_change', 'Hearings', 'BJ', LINK, 'The office says it can move the hearing, which reads as its written answer to our own date-change request. Check that it is an approval before D and E change.', f.appliesTo);
  }

  for (const f of all('deadline')) {
    const said = f.when.text;
    const name = NAME_SUBJECT.test(f.sentence);
    const owedHere = f.sentence.match(OWED_SUBJECT);
    const owedAnywhere = body.match(OWED_SUBJECT);
    const nameAnywhere = NAME_SUBJECT.test(body);
    const owed = name ? null : (owedHere || (!nameAnywhere ? owedAnywhere : null));
    if (owed) {
      const what = `${owed[1] || ''}${owed[2]}`.replace(/^(?:(?:the|a|an|your|our|requested|this|that|for|of|to|submit|send|return|file|provide|please) )+/i, '').trim();
      push('deadline', 'Hearings', 'N', what, 'A statement, signature or document the office wants goes in N.', f.appliesTo);
      push('deadline', 'Hearings', 'BA', said, `Its due date, as the office wrote it ("${f.written}"). BB pulls a weekend or closed day back to the office's last working moment.`, f.appliesTo);
    } else {
      push('deadline', 'Hearings', 'AW', said, `The office's deadline for this row, from its message ("${f.written}"). Type it as a date and time; the message gives no year.${name ? '' : ' The message does not say what is due in words the rule knows: if it is something owed (a statement, a signature, a document), type it in N and the date in BA instead.'}`, f.appliesTo);
    }
    push('deadline', 'Hearings', 'BH', 'add 1', 'Every time the office asks about a row counts. From 2 the row is TOP OF LIST and the coordinator phones.', f.appliesTo);
  }

  for (const f of all('ack_named')) {
    const r = resolveName(f.written, names);
    if (r.ambiguous) { forced.push(`the office names "${f.written}", and more than one consultant on the list has that name (${r.ambiguous.join(', ')})`); continue; }
    if (byPhone) {
      push('ack_named', 'Hearings', 'Y', `THE OFFICE CONFIRMED ${r.name.toUpperCase()} BY PHONE: SEND THE EMAIL AFTER A PHONE CALL AND ASK FOR IT IN WRITING`,
        'A confirmation by phone is not a record: G3 (K) stays empty until the office confirms in writing.', f.appliesTo);
      continue;
    }
    push('ack_named', 'Hearings', 'K', LINK, `The office names ${r.name} on its record for this case, in writing. G3 closes only on that.`, f.appliesTo);
    push('ack_named', 'Hearings', 'BD', r.name,
      r.known === false
        ? `The name as the office wrote it. It is not on the consultant list the rule was given: if it differs from the consultant in H, the row prints THE OFFICE HAS ${r.name}, NOT the consultant in H.`
        : r.known === true && r.name !== f.written
          ? `The office wrote "${f.written}"; the consultant list has one ${f.written}, ${r.name}. BD must equal the consultant in H for G3 to count.`
          : 'The name the office has, as its message says. BD must equal the consultant in H for G3 to count.',
      f.appliesTo);
  }

  for (const f of all('link_or_number')) {
    if (f.value) push('link_or_number', 'Hearings', 'AV', f.value, 'The room, video link or call-in number goes in AV. For a video or telephone hearing G1 counts only when AV holds a link or a number: a room letter alone is not a link until Offices AL says it is all the office sends. The day-before text carries what AV holds.', f.appliesTo);
    if (f.arrivalSaid) {
      push('link_or_number', 'Hearings', 'CI', f.arrivalMinutes !== null ? String(f.arrivalMinutes) : `the minutes before the first case that "${f.arrivalSaid}" comes to (a person works it out)`,
        `The office's own arrival instruction ("${f.arrivalSaid}") goes in CI as a number of minutes before the first case, on every hearing of the docket, and not in AV. The day-before text then gives one clock time: the first case less the larger of CI and Settings B16.`, f.appliesTo);
    }
    if (f.replaces) push('link_or_number', 'Hearings', 'BN', `[the consultant on the row]: ${f.value} (this message)`, 'A room, link or time changed after a YES: AV that day, BN, and the change notice to the consultant.', f.appliesTo);
  }

  for (const f of all('files_received')) {
    if (byPhone) continue;
    push('files_received', 'Hearings', 'L', LINK, "The clerk's receipt of the case files. Check that it names every file, and type the version it confirms in AZ.", f.appliesTo);
  }

  for (const f of all('ack_no_name')) {
    push('ack_no_name', 'Hearings', 'Y', 'ASK THE OFFICE IN WRITING WHICH NAME IT HAS ON ITS RECORD',
      "The office acknowledges our notice without naming anyone. G3 closes only on the office's written reply naming our consultant for that case, so K stays empty.", f.appliesTo);
  }

  // What hands the message to a person.
  if (has('offer_not_record')) forced.push('the office says it can or will record a name, which is an offer and not a record');
  if (has('not_on_record')) forced.push('the office says a name is not on its record');
  if (has('file_problem')) forced.push('the office reports a problem with a case file');
  if (has('move_conditional')) forced.push('the office ties a move to a condition');
  const loose = all('unexplained').map((f) => `"${f.sentence.replace(/[.\s]+$/, '')}"`);
  if (loose.length === 1) forced.push(`a sentence asks for something, reports a problem or takes something back, and no kind explains it: ${loose[0]}`);
  if (loose.length > 1) forced.push(`${loose.length} sentences ask for something, report a problem or take something back, and no kind explains them: ${loose.join(', ')}`);

  // What else was seen, for the reason.
  const notes = [];
  if (has('asks_who')) notes.push('the office asks who will attend, or says it has no representative recorded (if this is its first notice of the hearing, a person makes the rows and links it in I; in any case answer it and add 1 to BH)');
  if (has('refused')) notes.push("the office keeps a hearing on its date or refuses a move (its written answer to our request is linked in BJ)");
  if (has('withdrawal_pending')) notes.push("a cancellation or withdrawal is mentioned that the office has not processed (the homeowner's written yes goes in BG first; AF stays empty)");
  if (has('move_requested')) notes.push('a request to move a hearing is mentioned, not a move');
  if (has('postponed')) notes.push('a hearing is postponed without a new date the rule can read (the row waits for the new date)');
  if (has('update_rep')) notes.push('the office asks us to update the representative for the moved hearing');

  const present = ORDER.filter((k) => (k === 'ack_no_name' ? (byKind.ack_no_name || byKind.files_received) : byKind[k]));
  const alsoSeen = (kind) => present.filter((k) => k !== kind);
  const tail = (list) => (list.length ? ` The rule also saw this: ${list.join('; ')}.` : '');

  // 1. A process change: HOLD (the recorded route is not changed without a person), whatever else the message says.
  if (byKind.process_change) {
    return result('process_change', byKind.process_change,
      `${holdSentence(office)} The message changes how the office works${byPhone ? ', and it was said by phone, so written confirmation is asked for' : ''}.${tail([...notes, ...forced])}`,
      { byPhone, alsoSeen: alsoSeen('process_change') });
  }

  // 2. The office cannot find our notice or form. A person phones in any case.
  if (byKind.cannot_find) {
    const clean = !forced.length;
    const proposals = clean ? collect(byKind, ['cannot_find', 'cancellation_processed', 'date_time_change', 'deadline', 'ack_named', 'link_or_number', 'files_received']) : byKind.cannot_find;
    if (clean) addExtras(proposals, signals, byPhone);
    return result('cannot_find', proposals,
      `The office cannot find our notice or form, or says none has arrived. That is not a record.${clean ? '' : ' The rest of the message goes to a person.'}${tail([...notes, ...forced])}`,
      { byPhone, alsoSeen: alsoSeen('cannot_find') });
  }

  // 3. Anything unexplained: a person.
  if (forced.length) {
    const sawKinds = present.map((k) => OFFICE_KINDS[k].toLowerCase());
    return result('for_person', [],
      `For a person: ${forced.join('; ')}.${sawKinds.length ? ` The rule recognised these parts and proposes none of them: ${sawKinds.join('; ')}.` : ''}${tail(notes)}`,
      { byPhone, alsoSeen: present });
  }

  // 4. The first kind present, with the proposals of the others.
  const kind = present[0];
  if (!kind) {
    const base = notes.length
      ? `For a person: ${notes.join('; ')}.`
      : (DATE_RE.test(body) || TIME_RE.test(body))
        ? 'For a person: the message states a date or a time and nothing the rule files. If it is a new hearing notice, a person makes the rows and links it in I.'
        : 'For a person: the message is none of the kinds the rule knows.';
    return result('for_person', [], base, { byPhone, alsoSeen: [] });
  }
  const proposals = collect(byKind, ['cancellation_processed', 'date_time_change', 'deadline', 'ack_named', 'link_or_number', 'files_received', 'ack_no_name']);
  addExtras(proposals, signals, byPhone);
  const lead = {
    cancellation_processed: byPhone ? 'The office said by phone that a cancellation or withdrawal is processed. Only its written confirmation counts.' : 'The office confirms in writing that a cancellation or withdrawal is processed.',
    date_time_change: byPhone ? 'The office reported a move by phone. Only its written notice moves a date.' : 'The office moved a hearing, in writing.',
    deadline: 'The office sets a deadline.',
    ack_named: byPhone ? 'The office confirmed a name by phone. That is not a record.' : 'The office names our representative on its record.',
    link_or_number: 'The office gives a room, a link, a call-in number or an arrival instruction.',
    ack_no_name: byKind.ack_no_name ? 'The office acknowledges our notice without naming anyone.' : (byPhone ? 'The office said by phone that it has the case files. Only a written receipt counts in L.' : 'The office acknowledges the case files and names nobody.'),
  }[kind];
  return result(kind, proposals, `${lead}${tail(notes)}`, { byPhone, alsoSeen: alsoSeen(kind) });
}

/** The proposals of the kinds listed, in that order. */
function collect(byKind, kinds) {
  const out = [];
  for (const k of kinds) for (const p of byKind[k] || []) out.push(p);
  return out;
}

/** BH when the office asks who attends, and BJ when it refuses a move. Only added beside other proposals. */
function addExtras(proposals, signals, byPhone) {
  const add = (tab, column, value, why, appliesTo) => {
    if (proposals.some((p) => p.tab === tab && p.column === column && p.appliesTo === appliesTo)) return;
    proposals.push({ tab, column, value, why, appliesTo, header: HEADERS[`${tab} ${column}`] || '' });
  };
  for (const f of signals) {
    if (f.type === 'asks_who' && !proposals.some((p) => p.column === 'BH')) add('Hearings', 'BH', 'add 1', 'The office asks who will attend. Every time it asks about a row counts.', f.appliesTo);
    if (f.type === 'refused' && !byPhone) add('Hearings', 'BJ', LINK, "The office's written answer to our date-change request: this hearing stays on its date.", f.appliesTo);
  }
}

// ---------------------------------------------------------------------------------------------
// Round 17 (K2): a repeat. A later message of the same office that states, for a cell, nothing the
// earlier message did not state is a repeat: the cell keeps its first link and nothing is typed.
// A later message replaces the first link only when it states something the cell needs that the
// first did not. The one such thing this rule knows is the case-file version in a clerk's receipt
// (Hearings L with the version in AZ): "we have the current packets" after "both packets received".

/** The sheet's own words for a repeat (the generator's constant REPEAT, Reader suggestions column C). */
const REPEAT = 'REPEAT: THE CELL KEEPS ITS FIRST LINK';

/** The case-file version a text names: a number after "version" or "v", or "current". Null when it names none. (The sheet generator's test, word for word.) */
function versionNamed(text) {
  const m = /\bversion\s+(\d+)\b|\bv(\d+)\b/i.exec(String(text || ''));
  if (m) return String(m[1] || m[2]);
  return /\bcurrent\b/i.test(String(text || '')) ? 'current' : null;
}

// Cells where a second message is never a repeat: a count (every reminder counts), a task, a note for the consultant, something owed.
// Round 18: the date before a move (DR) is never a repeat either, and an instruction to clear a cell links nothing.
const NEVER_A_REPEAT = new Set(['Hearings BH', 'Hearings Y', 'Hearings AA', 'Hearings BN', 'Hearings N', 'Hearings CQ', 'Hearings DR']);
// What a link in a cell stands for: the other cells of the same message that say what the link proves.
const STATED_WITH = { 'Hearings K': ['BD'], 'Hearings I': ['D', 'E', 'AV'] };

/**
 * Marks the proposals of one message that repeat an earlier message.
 *   now:      { message, text, proposals }   the proposals of classifyOfficeReply for this message
 *   earlier:  [{ message, text, proposals }] the earlier messages of the same office, oldest first
 *   keysOf:   optional (proposal) => [row keys]; default: the parts of appliesTo
 * Returns a copy of now.proposals. A repeat carries repeatOf (the earlier message whose link the cell
 * keeps) and repeatText ("REPEAT of message n: no cell changes"). A proposal for a cell that already
 * holds an earlier link but states more carries firstLink (that message) and adds (what is new).
 */
function markRepeats(now, earlier, keysOf) {
  const keys = keysOf || ((p) => String(p.appliesTo || '').split(', ').map((x) => x.trim()).filter(Boolean));
  const flat = (v) => String(v == null ? '' : v).split(LINK).join('<link>').replace(/\s+/g, ' ').trim().toLowerCase();
  // What a proposal states for one row: its own value when it is not a link, and what stands beside a link.
  const stated = (p, msg, key) => {
    const cell = `${p.tab} ${p.column}`;
    const facts = {};
    if (flat(p.value) !== '<link>') facts.value = flat(p.value);
    for (const col of STATED_WITH[cell] || []) {
      const q = (msg.proposals || []).find((x) => x.tab === p.tab && x.column === col && keys(x).includes(key));
      if (q) facts[col] = flat(q.value);
    }
    if (cell === 'Hearings L') { const v = versionNamed(msg.text); if (v) facts.version = v; }
    return facts;
  };
  return (now.proposals || []).map((p) => {
    const cell = `${p.tab} ${p.column}`;
    const mine = keys(p);
    if (NEVER_A_REPEAT.has(cell) || !mine.length || /^\(clear the cell/.test(String(p.value || ''))) return { ...p };
    const repeatOf = [], adds = [];
    for (const key of mine) {
      const a = stated(p, now, key);
      let same = null, first = null, more = null;
      for (const e of earlier || []) {
        const q = (e.proposals || []).find((x) => x.tab === p.tab && x.column === p.column && keys(x).includes(key));
        if (!q) continue;
        const b = stated(q, e, key);
        // A repeat: every fact this message states, the earlier one stated too. A changed value is not a repeat, it is a change.
        const extra = Object.keys(a).filter((k) => b[k] === undefined), changed = Object.keys(a).filter((k) => b[k] !== undefined && b[k] !== a[k]);
        if (!extra.length && !changed.length) { same = e.message; break; }
        if (first === null && !changed.length) { first = e.message; more = extra; }
      }
      if (same !== null) repeatOf.push(same);
      else if (first !== null) adds.push({ key, firstLink: first, more });
    }
    if (repeatOf.length === mine.length) {
      const n = repeatOf[0];
      return { ...p, repeatOf: n, repeatOfByRow: repeatOf, repeatText: `REPEAT of message ${[...new Set(repeatOf)].join(', ')}: no cell changes` };
    }
    if (adds.length) {
      const names = { version: 'the case-file version', BD: 'the name on its record', D: 'the date', E: 'the time', AV: 'the room, link or number', value: 'a value' };
      const what = [...new Set(adds.flatMap((x) => x.more))].map((k) => names[k] || k).join(' and ');
      const out = { ...p, firstLink: adds[0].firstLink, adds: what, notARepeatText: `NOT A REPEAT: the cell holds the link of message ${adds[0].firstLink}, and this message states ${what}, which message ${adds[0].firstLink} did not` };
      if (cell === 'Hearings L' && adds[0].more.includes('version')) out.alsoType = { tab: 'Hearings', column: 'AZ', header: 'Case files: version the clerk confirmed (every file named)', value: versionNamed(now.text) === 'current' ? 'the number of the current version of the case files (the receipt says "current")' : versionNamed(now.text) };
      return out;
    }
    return { ...p };
  });
}

module.exports = { classifyOfficeReply, OFFICE_KINDS, holdSentence, BLOCK, routeState, routeText, markRepeats, versionNamed, REPEAT };
