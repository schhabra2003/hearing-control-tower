// Core vocabulary of the Hearing Control Tower.
//
// A *claim* is one thing a message asserts about one or more cases. Readers (the rule-based
// reader or the AI reader) may only produce claims. They never change a case.
// The *authority table* below decides what a claim from a given sender is allowed to do:
// establish a fact, raise a flag, file a request, or nothing.

export const CLAIM_TYPES = {
  hearing_scheduled:      'Government states the date and time (and mode or room) of a hearing.',
  hearing_confirmed:      'Government re-states that a hearing stays as scheduled (optionally with a room).',
  schedule_changed:       'Government states that a hearing date, time or room HAS changed (already approved).',
  hearing_postponed:      'Government says a hearing will not take place as scheduled and gives no new date yet (postponed, taken off the calendar).',
  change_requested:       'Someone asks for a date change. A request, not a change.',
  change_pending:         'Government says a change request is still under review.',
  change_denied:          'Government says a hearing stays on its current date or cannot be moved.',
  calendar_edited:        'Someone moved or created a calendar entry. Never changes the official date.',
  rep_requested:          'Government asks who will attend or asks for the staffing notice (optionally by a deadline).',
  rep_recorded:           'Government confirms a named consultant is recorded as representative.',
  rep_not_recorded:       'Government says no representative is recorded, or it cannot confirm one.',
  consultant_accepted:    'Consultant explicitly accepts specific case(s).',
  consultant_tentative:   'Consultant is unsure or needs to check. Not a commitment.',
  consultant_conditional: 'Consultant would accept only if something changes (for example a different date).',
  consultant_declined:    'Consultant cannot attend specific case(s): conflict, illness or partial decline.',
  coverage_offered:       'A consultant volunteers to cover cases they are not assigned to and asks for confirmation.',
  consultant_question:    'Consultant is confused or asks what is current.',
  availability_stated:    'Consultant says they are free for part of a day (for example "I have left the morning free").',
  packet_received:        'Recipient confirms they have, opened or reviewed the current case packet.',
  doc_unreadable:         'A file or photo could not be read.',
  packet_version_issue:   'Someone has, or links to, an outdated packet version.',
  document_submitted:     'Someone sent a document: packet, staffing details, withdrawal, signed statement.',
  signature_required:     'A settlement or withdrawal needs a signature from a named consultant.',
  signature_rejected:     'Government rejected a signed document (wrong signer or missing information).',
  withdrawal_requested:   'Government reports that the homeowner asked to withdraw. Needs the firm to confirm.',
  withdrawal_cancelled:   'Government confirms that a withdrawal request will not be processed and the appeal stays active.',
  homeowner_confirmed:    'Firm staff record that the homeowner confirmed their own request (a withdrawal or a date change).',
  homeowner_declined:     'Firm staff record that the homeowner did not make the request, or no longer wants it.',
  process_rule_changed:   'Government describes a procedure that differs from the saved instructions.',
  outcome_reported:       'Consultant reports what happened at the hearing.',
  obligation_created:     'Government asks for something by a deadline (for example a homeowner statement).',
  obligation_cleared:     'Government confirms it received or processed a requested item (statement, withdrawal, settlement).',
  decision_pending:       'Government says a written decision is pending.',
  hearing_instruction:    'Government gives a practical instruction for the hearing (arrive early, what to bring, how to join).',
  internal_note:          'Firm-internal status note or call log. Never authoritative.',
  acknowledgement:        'Thanks or "understood" and nothing else. Recorded. Changes nothing and needs nobody.',
};

export const TYPE_LIST = Object.keys(CLAIM_TYPES);

// Optional fields a claim can carry. Used for the AI reader's output schema, for
// verification, and for scoring field accuracy in the test harness.
export const CLAIM_FIELDS = {
  date:     { type: 'string',  desc: 'Hearing or target date, YYYY-MM-DD.' },
  time:     { type: 'string',  desc: 'Hearing time, 24h HH:MM.' },
  mode:     { type: 'string',  enum: ['in_person', 'video'], desc: 'Hearing mode.' },
  room:     { type: 'string',  desc: 'Room letter or name.' },
  consultant: { type: 'string', desc: 'Consultant id (R01...) the claim is about.' },
  kind:     { type: 'string',  enum: ['packet', 'staffing', 'staffing_form', 'withdrawal', 'settlement', 'homeowner_statement'], desc: 'Which document or obligation.' },
  deadline: { type: 'string',  desc: 'Deadline, YYYY-MM-DDTHH:MM.' },
  result:   { type: 'string',  enum: ['heard', 'continued', 'other'], desc: 'Hearing outcome.' },
  part:     { type: 'string',  enum: ['morning', 'afternoon', 'day'], desc: 'Part of the day.' },
  reason:   { type: 'string',  enum: ['conflict', 'illness', 'other', 'no_reason'], desc: 'Why a consultant declined. no_reason when they only say no and give no reason.' },
  version:  { type: 'string',  desc: 'Packet version that is current, for example v2.' },
  homeowner_initiated: { type: 'boolean', desc: 'True when the homeowner asked the government for this.' },
  no_further_hearing:  { type: 'boolean', desc: 'True when the government says no further hearing is scheduled.' },
};

export const GATES = [
  { id: 'G1', name: 'Official schedule',       short: 'Schedule',  authority: 'Government, in writing' },
  { id: 'G2', name: 'Consultant committed',    short: 'Consultant', authority: 'The consultant, per case and per slot' },
  { id: 'G3', name: 'Representative recorded', short: 'Recorded',  authority: 'Government acknowledgment' },
  { id: 'G4', name: 'Current packet delivered', short: 'Packet',   authority: 'Receipts from the clerk and the consultant' },
  { id: 'G5', name: 'Obligations cleared',     short: 'Obligations', authority: 'Government processing' },
];

// ---- Authority table --------------------------------------------------------------------
// Rule 1: only the authority can CLOSE a gate. Rule 2: anyone can RAISE a flag.
// "establish" claims close gates or set official facts. "flag" claims open gates.

// Only the government can establish these, and only in writing.
export const GOV_ESTABLISH = new Set([
  'hearing_scheduled', 'hearing_confirmed', 'schedule_changed', 'hearing_postponed', 'rep_recorded', 'obligation_cleared', 'withdrawal_cancelled',
]);
// Government statements that open work or keep things as they are. Accepted from any
// government channel, including a phone note, because none of them closes a gate.
export const GOV_FLAG = new Set([
  'rep_requested', 'rep_not_recorded', 'withdrawal_requested', 'process_rule_changed',
  'obligation_created', 'signature_rejected', 'change_denied', 'change_pending', 'decision_pending', 'hearing_instruction',
]);
// Only the consultant can commit or describe themselves.
export const CONSULTANT_ONLY = new Set([
  'consultant_accepted', 'consultant_tentative', 'consultant_conditional', 'coverage_offered',
  'availability_stated', 'outcome_reported', 'consultant_question',
]);
// Anyone the firm knows may raise these. They open gates or record a belief, and never close anything.
export const ANYONE_FLAG = new Set([
  'consultant_declined', 'doc_unreadable', 'packet_version_issue', 'signature_required',
]);

// Only the homeowner can say what the homeowner wants. The evidence is the firm's own note of
// speaking with them. A message that only claims to come from a homeowner is a lead: a person
// calls back on the number on file.
export const HOMEOWNER_ONLY = new Set(['homeowner_confirmed', 'homeowner_declined']);

// Claims that CLOSE something: a gate, a request, an obligation, or the schedule itself. A wrong
// one is the costly error, so two extra rules attach to this list. (1) The verifier holds a
// closing claim whose sentence guesses, asks, sets a condition, promises or denies (hedge.js).
// (2) With an AI reader, two independent readings must agree on it (extract/crosscheck.js keeps
// the same list, with the fields that must match; a check compares the two lists).
export const CLOSING_CLAIMS = [
  'hearing_scheduled', 'hearing_confirmed', 'schedule_changed', 'hearing_postponed', 'change_denied',
  'rep_recorded', 'consultant_accepted', 'consultant_conditional', 'coverage_offered', 'packet_received',
  'obligation_cleared', 'withdrawal_cancelled', 'homeowner_confirmed', 'homeowner_declined', 'outcome_reported', 'document_submitted',
];
// Statements about whether and when a hearing takes place.
export const SCHEDULE_CLAIMS = ['hearing_scheduled', 'hearing_confirmed', 'schedule_changed', 'hearing_postponed', 'change_denied'];

export const WRITTEN_CHANNELS =['email', 'mail', 'portal', 'letter', 'text'];
export const isVerbal = (channel) => /phone|call|voicemail|voice mail|voice message/i.test(String(channel));
// Speech wins. A voicemail transcript is somebody speaking, even though the word contains
// "mail" and somebody typed it out: it is not the office putting a fact in writing. (Found by
// the unseen test set: a clerk's voicemail moved a hearing on the official record.)
export const isWritten = (channel) => !isVerbal(channel) && WRITTEN_CHANNELS.some((c) => String(channel).toLowerCase().includes(c));

// Dispositions, from strongest to weakest.
export const DISPOSITIONS = {
  fact:        'Accepted as an official fact from the authoritative source.',
  provisional: 'Said by the right party but not in writing. Held until written confirmation.',
  flag:        'Opens work. Anyone may raise a flag; only the authority can clear it.',
  request:     'A request. It changes nothing until the authority answers.',
  belief:      'What someone believes or put in a calendar. Never changes the official record.',
  signal:      'Said by a party with no authority over this fact. Kept as a lead to verify.',
  held:        'Said by the right party, but as a guess, a question, a condition or a promise. It confirms nothing, so nothing changes until it is said plainly.',
  note:        'Internal note. No effect.',
  rejected:    'Failed verification. Not recorded.',
};
