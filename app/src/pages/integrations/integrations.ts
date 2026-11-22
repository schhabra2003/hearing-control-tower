/**
 * The integrations map as typed data: the firm's own tools, what each would read and write, the
 * permission it asks, what a person approves, what an agent may do, the firm question it needs
 * it, the cost, and two simulate events tied to the packet's example data.
 *
 * Content source: the integration map of 22 Nov 2026, which reads the week-one kit,
 * SOLUTION_DESIGN.md, the prototype README and the packet. Every example is fictional. Nothing
 * here claims a live connection: the status of every part is "Simulated", "Proposed" or
 * "Not connected", never "Connected".
 *
 * Plain words in the visible sentences; cell references only in the `ref` fields, which the page
 * shows behind a "Sheet reference" disclosure.
 */

import { engine } from '@/lib/data';

export type StatusWord = 'Simulated' | 'Proposed' | 'Not connected';
export type FigureLabel = 'Measured' | 'Simulated' | 'Estimate' | 'Packet' | 'Not estimated';

/** One honest status line. A card shows two or three when the answer is split. */
export interface StatusPart {
  /** "Exported files"; null when the line covers the whole integration. */
  part: string | null;
  status: StatusWord;
}

/** What an agent may do, per capability, after the Connectors component's allow / ask / deny. */
export interface AgentRule {
  action: string;
  /** allow: it may do this alone. ask: it proposes and a person decides. deny: never. */
  rule: 'allow' | 'ask' | 'deny';
}

export interface UnlockQuestion {
  /** "Q30" for a kit section 8 question; "Desk week 2" for a kit task; "Proposed" for one of ours. */
  id: string;
  text: string;
  /** Where the answer is typed on the sheet, for the Sheet reference disclosure. */
  ref?: string;
  /** True when the question is the integration map's proposal, not the kit's. */
  ours?: boolean;
}

export interface Cost {
  text: string;
  label: FigureLabel;
  /** Where the figure comes from, shown under it. */
  source: string;
}

export type EventSource = 'paste' | 'reader-row' | 'reply-rule' | 'office-rule' | 'sheet';

/**
 * A simulate event. It carries no new text: `ref` names the packet message, the paste message id,
 * the reply ids or the sheet rows, and the page reads every word from the engine or sheet export.
 */
export interface SimEvent {
  id: string;
  integration: string;
  title: string;
  source: EventSource;
  /** One sentence: what the event shows when it runs. */
  shows: string;
  ref: {
    /** Packet message numbers the event stands for. */
    messages?: string[];
    /** The message id inside data/paste-example/new-messages.json; "all" for the whole file. */
    paste?: string;
    /** Reader suggestions rows to replay. */
    rows?: number[];
    /** Reply ids of the reply rule's examples (R01 to R39). */
    replies?: string[];
    /** Rows of another sheet tab to show. */
    tab?: { name: 'Record check' | 'Notices on file'; rows: number[] | 'flagged' };
    /** Hearings whose printed next-action lines to show, with the words a line must hold. */
    printed?: { cases: string[]; holds: string };
    /** County whose office rule reads the packet message. */
    county?: string;
  };
  /** Where the result lands, so a person can act on it. */
  lands: { label: string; to: string };
}

export interface Integration {
  slug: string;
  name: string;
  /** The products a firm may use, named as examples, never as connected. */
  examples: string;
  icon: 'mail' | 'folder' | 'calendar' | 'phone' | 'signature' | 'records' | 'documents' | 'office' | 'model';
  /** One line of what it does. */
  oneLine: string;
  /** The status word the shell strip counts this integration under. */
  counted: StatusWord;
  statuses: StatusPart[];
  /** What the prototype actually does today, with its labelled numbers. */
  today: string;
  flowsIn: string;
  flowsOut: string;
  permission: { asks: string[]; never: string[] };
  fills: string;
  fillsRef: string;
  approves: string;
  agent: AgentRule[];
  /** Why an agent is held to that, when the map gives a reason. */
  agentWhy?: string;
  unlock: UnlockQuestion[];
  cost: Cost[];
  /** Things the packet does not hold, said plainly. */
  gaps?: string[];
  events: SimEvent[];
}

const pasteRowCount = engine.paste.rows.length;
const pasteMessages = engine.paste.messages.length;
const pasteReplayed = engine.paste.how.filter((h) => h.path !== 'missing').length;
const pasteMissing = engine.paste.how.filter((h) => h.path === 'missing').map((h) => String(h.id));
const replies = engine.replies;
const emailCount = engine.messages.filter((m) => m.channel === 'email').length;
const channelCount = (c: string): number => engine.messages.filter((m) => m.channel === c).length;

export const INTEGRATIONS: Integration[] = [
  {
    slug: 'mailbox',
    name: 'Shared mailbox',
    examples: 'Gmail or Microsoft 365',
    icon: 'mail',
    oneLine: "Reads office notices and consultants' emails, and proposes what each one proves.",
    counted: 'Simulated',
    statuses: [
      { part: 'Exported files', status: 'Simulated' },
      { part: 'Live mailbox', status: 'Not connected' },
    ],
    today: 'The prototype reads saved email and text files, and the Paste page reads one file of new messages. It reads files, not the mailbox itself: that connection is not built.',
    flowsIn: `Every message to the shared hearing mailbox: office notices and acknowledgments, consultants' emailed replies, and the firm's own operations notes. In the example, ${emailCount} of ${engine.messages.length} messages arrive by email (Packet).`,
    flowsOut: 'Nothing. In season one only a person sends from the mailbox. Offers and day-before messages go by email to consultants with no mobile number on file, which is all six in the example.',
    permission: {
      asks: [
        'Read-only access to the one shared hearing mailbox (Gmail read scope or Microsoft Graph Mail.Read on that mailbox only).',
        'Or no access at all: a mail rule that saves each incoming message as an .eml file in a folder.',
        "Read access to last season's mailbox once, for the Day 1 counts.",
      ],
      never: ['Send, delete or mark mail as read.'],
    },
    fills: "By the reply rule: the consultant's yes, files received and an OK to a change. By the readers and the office rule, as proposals: date confirmed by the office, office has our consultant's name, files sent and received, result recorded, and office process changes held until a person approves.",
    fillsRef: 'Reply rule: Hearings J (G2), M with BW, Q with BX, BO. Proposals on the Reader suggestions tab: I (G1), K (G3), L and M (G4), O (G5), Offices M with HOLD, and cells of rounds 16 and 18 such as CI, DR, DT, DU, DX.',
    approves: 'Every proposed link at the 9:00 a.m. pass, every hold on an office, and every send.',
    agent: [
      { action: 'Read new messages', rule: 'allow' },
      { action: 'Sort them with the reply rule, the office rule and the two readers', rule: 'allow' },
      { action: 'Mark repeats', rule: 'allow' },
      { action: 'Propose links, with the words each relies on', rule: 'ask' },
      { action: 'File a cell on the sheet', rule: 'deny' },
      { action: 'Send, delete or mark mail as read', rule: 'deny' },
    ],
    unlock: [
      { id: 'Q30', text: 'Which mail service holds the shared mailbox, and who can give read-only access or set the .eml rule?', ref: 'Day 1 count B20' },
      { id: 'Q25', text: "Alice's and counsel's written yes, before the readers see real mail.", ref: 'Day 1 count row 18' },
    ],
    cost: [{ text: "Part of about three days of the firm's technical help. Not built.", label: 'Estimate', source: 'Week-one kit, the plan on one screen' }],
    events: [
      {
        id: 'mailbox-1',
        integration: 'mailbox',
        title: 'New email: Caldmere changes how filings reach the office',
        source: 'paste',
        shows: "Reads the example file of new messages. This message holds Caldmere's office process until a person approves or rejects the change on Offices.",
        ref: { paste: 'H036' },
        lands: { label: 'Decide it on Offices', to: '/offices' },
      },
      {
        id: 'mailbox-2',
        integration: 'mailbox',
        title: 'New email: Larkmere repeats its confirmation',
        source: 'paste',
        shows: 'Reads the example file of new messages. The repeat rows say the cell keeps its first link, so a person types nothing.',
        ref: { paste: '66', messages: ['66'] },
        lands: { label: 'Open the pasted messages', to: '/suggestions/paste' },
      },
    ],
  },
  {
    slug: 'file-storage',
    name: 'File storage',
    examples: 'Google Drive, OneDrive or Dropbox',
    icon: 'folder',
    oneLine: "Lists case file versions and, later, shares one hearing's files with one consultant.",
    counted: 'Not connected',
    statuses: [
      { part: null, status: 'Not connected' },
      { part: 'Sharing per hearing', status: 'Proposed' },
    ],
    today: "The prototype's links are placeholders, and the packet's 40 documents are names with versions, not files in a store (Packet).",
    flowsIn: "The current version of each case file (packet, staffing notice, staffing form, the homeowner's evidence) and the date it changed. The documents folder stays the store; the sheet holds no file.",
    flowsOut: 'Per-hearing share links for the consultant who holds the hearing, sent only in the files message, which names the version and asks for GOT IT with the number. When the named consultant changes after files went out, the share is removed.',
    permission: {
      asks: [
        'Read-only access to the one documents folder, to list files and versions.',
        'Later, as a separate step: create and revoke share links on that folder only.',
      ],
      never: ['Share, unshare, move or delete a file in season one: a person does it.'],
    },
    fills: "The current case file version, checked against the versions the consultant and the clerk confirmed. Where they differ, the hearing's next action says to send the current version to the consultant.",
    fillsRef: 'Hearings AX (current version), checked against AY (version the consultant confirmed) and AZ (version the clerk confirmed); BE prints SEND CASE FILES VERSION n TO THE CONSULTANT. The Friday sample compares AX with the folder for 10 hearings.',
    approves: "Raising the version when a file changes, sending the files message, and removing a departed consultant's access and typing the date.",
    agent: [
      { action: "Compare the folder's newest version with the sheet", rule: 'allow' },
      { action: 'List consultants who still hold links to a hearing they no longer hold', rule: 'allow' },
      { action: 'Propose the new version number', rule: 'ask' },
      { action: 'Share, unshare, move or delete a file', rule: 'deny' },
    ],
    unlock: [
      {
        id: 'Proposed',
        text: 'Which service holds the documents folder, and can a link be shared with one consultant for one hearing and removed later?',
        ours: true,
      },
    ],
    cost: [{ text: 'No estimate was made for this.', label: 'Not estimated', source: 'Integration map' }],
    gaps: [
      "No question in the kit's list asks about file storage; the question above is the integration map's.",
      "Hearings EC records the date a departed consultant's file access was removed (X34). In the example sheet it is empty on every row.",
    ],
    events: [
      {
        id: 'file-storage-1',
        integration: 'file-storage',
        title: 'Owen: Files reviewed',
        source: 'reader-row',
        shows: 'A receipt that names no version, so files sent and received stays open and a person asks for the version.',
        ref: { messages: ['71'], rows: [98, 104, 157, 159] },
        lands: { label: 'Decide it in Check messages', to: '/suggestions' },
      },
      {
        id: 'file-storage-2',
        integration: 'file-storage',
        title: 'Version 2 replaces version 1 for 75 and 96 Elm Street',
        source: 'sheet',
        shows: "The sheet's own next action for Eli Corven, from messages 33 and 36. No new data.",
        ref: { messages: ['33', '36'], printed: { cases: ['AX-111', 'AX-112'], holds: 'VERSION 2 TO THE CONSULTANT' } },
        lands: { label: 'Open AX-111', to: '/hearings/AX-111' },
      },
    ],
  },
  {
    slug: 'calendars',
    name: 'Calendars',
    examples: 'Google, Outlook or Apple; per-consultant feeds; text and paper',
    icon: 'calendar',
    oneLine: 'Publishes one read-only hearing calendar from the sheet. An edit in a calendar never moves a hearing.',
    counted: 'Simulated',
    statuses: [
      { part: 'Hearing calendar file (.ics)', status: 'Simulated' },
      { part: 'Per-consultant feeds', status: 'Proposed' },
    ],
    today: "The calendar command writes and checks an .ics file: 19 events, every one parses (Measured). The sheet's Calendar file tab holds the same form, and its file was imported into Apple Calendar on 21 Nov with no error (Measured). Google Calendar and Outlook were not tried.",
    flowsIn: 'Nothing that counts. A free slot is never availability and never a yes, and an edit in a calendar moves nothing. In the example, Maya, Nora, Priya and Eli share no calendar, Leo shares free and busy only, and Owen shares a work calendar without personal commitments (Packet).',
    flowsOut: 'One read-only hearing calendar built from the sheet, times in UTC, refilled after the 2:00 p.m. review and on every change. Proposed: one feed per consultant with only their hearings. Consultants without a digital calendar get the dates by the Wednesday text and the day-before text, or by email where no mobile number is on file.',
    permission: {
      asks: ['None, to publish a file.', 'For a feed: write to one firm-owned calendar only.'],
      never: ["Read or write a consultant's own calendar."],
    },
    fills: "Nothing directly. It reads each hearing's date, time, place and status. A consultant's own words about a date become a proposal of what to tell them.",
    fillsRef: 'Reads Hearings D, E, H, AV, DZ and Offices AP, BA, W. Proposals go to Hearings BN. Bench G holds "Calendar shared with the firm".',
    approves: 'Each refill of the hearing calendar (copy the file, save it as hearings.ics, empty the calendar, import), and each answer to a consultant whose calendar holds the wrong date.',
    agent: [
      { action: 'Rebuild the file and check it against RFC 5545', rule: 'allow' },
      { action: "Propose what to tell a consultant whose message shows a wrong date", rule: 'ask' },
      { action: 'Change a hearing because a calendar changed', rule: 'deny' },
    ],
    unlock: [
      { id: 'Desk week 2', text: "The associate imports the example file into the firm's own calendar program and writes down the steps." },
      { id: 'Q27', text: 'The weekdays each consultant gives.', ref: 'Bench I' },
    ],
    cost: [{ text: 'No estimate was made for this.', label: 'Not estimated', source: 'Integration map' }],
    gaps: ["A printed docket list on paper, for consultants without a calendar, is the integration map's proposal. The kit's routes are texts and email."],
    events: [
      {
        id: 'calendars-1',
        integration: 'calendars',
        title: 'Calendar activity: Leo moved both events from June 11 to June 13',
        source: 'reader-row',
        shows: "Replays message 9's rows: do not close, a problem. The calendar edit moves nothing; the case records are corrected and the hearing calendar refilled.",
        ref: { messages: ['10', '9'], rows: [11, 15] },
        lands: { label: 'See it in Check messages', to: '/suggestions' },
      },
      {
        id: 'calendars-2',
        integration: 'calendars',
        title: 'Nora: Both cases are still in my calendar',
        source: 'reader-row',
        shows: 'Two proposals of what to tell Nora, to answer her question.',
        ref: { messages: ['54'], rows: [226, 227] },
        lands: { label: 'Decide it in Check messages', to: '/suggestions' },
      },
    ],
  },
  {
    slug: 'phone-text',
    name: 'Phone and text line',
    examples: 'Twilio or RingCentral',
    icon: 'phone',
    oneLine: "Reads consultants' texts with the fixed reply rule. Calls stay notes a person types.",
    counted: 'Simulated',
    statuses: [
      { part: 'Text exports and reply rule', status: 'Simulated' },
      { part: 'Live text line', status: 'Not connected' },
      { part: 'Calls', status: 'Not connected' },
    ],
    today: `The reply rule runs on ${replies.rows.length} fictional replies: ${replies.byRule} filed by rule, ${replies.toPerson} to a person (Measured on fictional replies, 7 of them hypothetical). The text-line format it reads is not the format of a particular text service. Calls are typed notes; AI voice calls are not planned.`,
    flowsIn: `Consultants' texts (YES ALL, YES 1 3, NO, ARRIVED, IN, GOT IT with the version, OK, illness reports) and call notes typed by staff. In the example, ${channelCount('text note')} text notes and ${channelCount('phone note')} phone notes (Packet).`,
    flowsOut: "The offer, the Wednesday text, the day-before text, the files message and the change notice, with the words fixed in the kit and sent only on the sheet's schedule. Nothing else is sent by software.",
    permission: {
      asks: ['Read incoming texts on the one hearing number: a webhook to a firm address, or an export of texts as files.'],
      never: ['Send anything but the scheduled texts the firm approves.', 'Place or answer a call.'],
    },
    fills: "By the reply rule: the consultant's yes, files received, arrived and an OK to a change. An illness report becomes a new availability row for a person. Call notes propose cells for a person.",
    fillsRef: 'Hearings J (G2), M with BW, Q with BX, R (arrived), BO (OK to a change); the Availability tab for an illness report. Call notes propose Hearings CP, CQ, Y, AA and Offices M.',
    approves: `Every reply the rule hands over (${replies.toPerson} of ${replies.rows.length}), any YES over the daily cap, every illness report and backup, and every call.`,
    agent: [
      { action: 'Match replies with the fixed reply rule', rule: 'allow' },
      { action: 'File the fixed forms the kit lists, once auto-filing is allowed; until then propose', rule: 'ask' },
      { action: 'Call anyone', rule: 'deny' },
      { action: 'Text outside the fixed scripts', rule: 'deny' },
    ],
    unlock: [
      { id: 'Q31', text: 'Which service runs the text line, can it deliver each text to a web address or export it, and which number each consultant texts from?', ref: 'Day 1 count B21' },
      { id: 'Q15, Q16', text: "Each consultant's mobile number and consent to be texted.", ref: 'Bench O, P' },
      { id: 'Q17', text: "Nora's channel and Priya's number." },
      { id: 'Q18', text: 'Who reads texts after 4:00 p.m.', ref: 'Day 1 count row 16, Settings B9' },
    ],
    cost: [
      { text: 'About $1,000 a year for a text line with three users, at list price.', label: 'Estimate', source: 'Week-one kit, section 6' },
      { text: 'Connecting it to the reply rule is part of the about three days of technical help.', label: 'Estimate', source: 'Week-one kit, the plan on one screen' },
    ],
    events: [
      {
        id: 'phone-text-1',
        integration: 'phone-text',
        title: 'Text: Maya is ill and cannot attend tomorrow',
        source: 'reader-row',
        shows: 'Consultant said yes reopens for both hearings, and a new availability row (not free, illness) waits for a person.',
        ref: { messages: ['41'], rows: [53, 57, 192, 193, 194, 195] },
        lands: { label: 'Decide it in Check messages', to: '/suggestions' },
      },
      {
        id: 'phone-text-2',
        integration: 'phone-text',
        title: 'Text replies: YES from Maya, YES 1 3 from Leo, and a call note',
        source: 'reply-rule',
        shows: "The reply rule files Maya's YES and hands Leo's YES 1 3 to a person. The call note from Tesswick (message 24) replays its rows for a person.",
        ref: { replies: ['R01', 'R16'], messages: ['24'], rows: [180, 181, 182] },
        lands: { label: 'See the tries on Replies', to: '/replies' },
      },
    ],
  },
  {
    slug: 'e-signature',
    name: 'E-signature',
    examples: 'DocuSign or Dropbox Sign',
    icon: 'signature',
    oneLine: "Later: sends a settlement or withdrawal to be signed once the homeowner's written yes is on file.",
    counted: 'Not connected',
    statuses: [{ part: null, status: 'Not connected' }],
    today: 'Season one buys no signing tool: a free fill-and-sign PDF or a scanned signed page, never a paid e-signature tool. Proposed only for later: an e-signature API where the county accepts it.',
    flowsIn: 'The signed settlement or withdrawal statement, and the date signed.',
    flowsOut: "The signing request, only after the homeowner's written yes is on the sheet, to the signer the sheet names.",
    permission: {
      asks: ['Later: create envelopes from one template folder and read their status.'],
      never: ['Open any other document.', 'Send a request or sign.'],
    },
    fills: "The homeowner's written yes, who signs, result recorded once the office receipts the signed copy, the date a clearer copy was asked for, and each office's signing rules.",
    fillsRef: 'Hearings BG (homeowner\'s written yes), BP (who signs), O (G5), DA (clearer copy asked on); Offices AC, AD, AG.',
    approves: 'Sending each signing request, and deciding that a signed copy is readable.',
    agent: [
      { action: "Check that the signer matches the sheet and the office's rule", rule: 'allow' },
      { action: 'Propose result recorded when the office receipts the signed copy', rule: 'ask' },
      { action: 'Send a signing request or sign', rule: 'deny' },
    ],
    unlock: [
      { id: 'Q9', text: 'Does the office accept a fill-and-sign PDF or a scan?', ref: 'Offices AD' },
      { id: 'Q8', text: 'Who must sign?', ref: 'Offices AC, AG' },
    ],
    cost: [
      { text: 'Season one: none bought. A free fill-and-sign PDF or a scanned signed page.', label: 'Packet', source: 'Week-one kit, the rules by what happens' },
      { text: "A later tool: no estimate. It would also need Alice's decision, since the kit rules it out for season one.", label: 'Not estimated', source: 'Integration map' },
    ],
    events: [
      {
        id: 'e-signature-1',
        integration: 'e-signature',
        title: 'Brindlefen: the withdrawal must be signed by Priya',
        source: 'reader-row',
        shows: 'Result recorded stays open: do not close, the copy is unreadable.',
        ref: { messages: ['28'], rows: [41, 43] },
        lands: { label: 'See it in Check messages', to: '/suggestions' },
      },
      {
        id: 'e-signature-2',
        integration: 'e-signature',
        title: 'Settlement for 16 Birch Lane ready for Priya to sign',
        source: 'reader-row',
        shows: "The homeowner's written yes is empty, so the hearing's first next action says it is missing.",
        ref: { messages: ['27'], rows: [38, 188, 189, 190, 191], printed: { cases: ['AX-109'], holds: "HOMEOWNER'S WRITTEN YES MISSING" } },
        lands: { label: 'Open AX-109', to: '/hearings/AX-109' },
      },
    ],
  },
  {
    slug: 'case-system',
    name: 'Case system',
    examples: "The firm's own case records",
    icon: 'records',
    oneLine: 'Compares a six-column export with the sheet every Friday. Never writes to the case system.',
    counted: 'Simulated',
    statuses: [
      { part: 'Record check, 24 records', status: 'Simulated' },
      { part: 'Live export', status: 'Not connected' },
    ],
    today: "The Record check tab compares the packet's 24 case records with the sheet on date, consultant, case-file version and status (Measured on the example).",
    flowsIn: 'An export of six columns (case, date, time, consultant, case files, status) for the Friday check.',
    flowsOut: "Proposed: a CSV of the flagged Record check rows, in the case system's import layout, if it can import one. Otherwise a hand correction list.",
    permission: {
      asks: ['A read-only export.'],
      never: ['Write to the case system: the deputy imports or types every correction.'],
    },
    fills: 'The Record check tab. The case system stays the system of record, with its status field.',
    fillsRef: 'Record check tab, columns A to L.',
    approves: 'Every correction, typed or imported by the deputy on Friday.',
    agent: [
      { action: 'Compare the export with the sheet and list disagreements', rule: 'allow' },
      { action: 'Write to the case system', rule: 'deny' },
    ],
    unlock: [{ id: 'Q32', text: 'Can the case system import a CSV?', ref: 'Day 1 count B22' }],
    cost: [{ text: 'The six-column export is part of the about three days of technical help. Nothing is built for either case, and no time is claimed for it.', label: 'Estimate', source: 'Week-one kit, the workflows the firm already has' }],
    events: [
      {
        id: 'case-system-1',
        integration: 'case-system',
        title: 'Case record changed with the calendar',
        source: 'sheet',
        shows: 'Message 10 says the internal case records now show June 13. The Record check rows for both hearings show what disagrees.',
        ref: { messages: ['10'], tab: { name: 'Record check', rows: [6, 7] } },
        lands: { label: 'Open AX-103', to: '/hearings/AX-103' },
      },
      {
        id: 'case-system-2',
        integration: 'case-system',
        title: 'Friday export of the flagged rows',
        source: 'sheet',
        shows: 'Downloads the flagged Record check rows as a CSV, labelled Simulated, for the deputy to correct by hand.',
        ref: { tab: { name: 'Record check', rows: 'flagged' } },
        lands: { label: 'Open Hearings', to: '/hearings' },
      },
    ],
  },
  {
    slug: 'documents-notices',
    name: 'Notices and documents',
    examples: "The firm's intake and notice tools",
    icon: 'documents',
    oneLine: "Reads intake records for the homeowner's contact. The sheet records what each notice said.",
    counted: 'Not connected',
    statuses: [{ part: null, status: 'Not connected' }],
    today: 'The firm keeps its document collection and its notice tool. The sheet only records what each notice said.',
    flowsIn: "At intake: the signed appointment of the firm as agent, the homeowner's evidence, and the homeowner's consent to be texted, with the number.",
    flowsOut: "Proposed: a list of notice rows (case, address, consultant, date, time) that the firm's tool sends from, if it can.",
    permission: {
      asks: ["Read-only access to the intake records, for the homeowner's contact and the appointment."],
      never: ['Write to a homeowner.'],
    },
    fills: 'The notice as sent, the homeowner contact and the case file version, and the Notices on file tab.',
    fillsRef: 'Hearings BK, BL (notice as sent), DG (homeowner contact), AX (case-file version); the Notices on file tab.',
    approves: 'Every homeowner notice, sent by a person.',
    agent: [
      { action: 'List hearings with no homeowner notice on record', rule: 'allow' },
      { action: 'List notices that name the wrong consultant or date', rule: 'allow' },
      { action: 'Contact a homeowner', rule: 'deny' },
    ],
    unlock: [
      { id: 'Q33', text: 'Which tool sends the notices, and can it send from a list?', ref: 'Day 1 count row 23' },
      { id: 'Q36', text: 'The name and date on notices already sent.', ref: 'Day 1 count row 28' },
      { id: 'Q41', text: "The homeowner's telephone and email.", ref: 'Day 1 count row 31' },
    ],
    cost: [{ text: 'No estimate was made for this.', label: 'Not estimated', source: 'Integration map' }],
    events: [
      {
        id: 'documents-notices-1',
        integration: 'documents-notices',
        title: 'Notice for 42 Birch Lane lacks the county',
        source: 'sheet',
        shows: 'The Notices on file row for 42 Birch Lane, with the field the office needs and the notice lacks.',
        ref: { tab: { name: 'Notices on file', rows: [8] } },
        lands: { label: 'Open AX-110', to: '/hearings/AX-110' },
      },
      {
        id: 'documents-notices-2',
        integration: 'documents-notices',
        title: 'Draft notice names Maya, who declined',
        source: 'sheet',
        shows: 'The Notices on file row for 14 Willow Lane: void, because it names a consultant with no yes that counts.',
        ref: { tab: { name: 'Notices on file', rows: [3] } },
        lands: { label: 'Open AX-101', to: '/hearings/AX-101' },
      },
    ],
  },
  {
    slug: 'county-offices',
    name: 'County office channels',
    examples: 'Email, form, phone, paper or portal',
    icon: 'office',
    oneLine: "Sorts each office's messages by its own process, and holds a change until a person approves it.",
    counted: 'Simulated',
    statuses: [
      { part: 'Office rule and submission simulator', status: 'Simulated' },
      { part: 'Office portals, later, read-only', status: 'Proposed' },
    ],
    today: 'Each of the ten offices is played by its saved process: 90 of 90 example answers handled as prepared (Simulated; handling, not accuracy). The office rule sorted 31 of 31 packet messages, and 13 of 30 unseen ones right, handing 24 to a person (Measured, small sample).',
    flowsIn: 'Notices, acknowledgments, process changes, date changes, video links and deadlines. All ten offices list a clerk email address (Packet). Tesswick wants the staffing form, then a call; Caldmere wants filings by form from now on; Harthmere sends paper notices.',
    flowsOut: "The staffing notice or form by the office's confirmed route, sent by a person. Never a write to a government system.",
    permission: {
      asks: ["Read the office's messages in the shared mailbox.", 'For a portal: a read-only login, to compare the official schedule with the sheet.'],
      never: ['Approve a process change.', 'Send a notice or write to a government system.'],
    },
    fills: "Date confirmed by the office, office has our consultant's name, files sent and received, result recorded, video links, and the office's process cells. Never the approval of a change.",
    fillsRef: 'Hearings I (G1), K (G3), L (G4), O (G5), AV, CI, DR, DW; Offices F, G, K, L, M, N, AS, AT; never AQ and AR (the approval).',
    approves: 'Every process change (with the approver\'s name and the date), every notice sent, and every call.',
    agent: [
      { action: 'Sort an office message with the office rule', rule: 'allow' },
      { action: 'Flag a process change with a hold and propose cells', rule: 'ask' },
      { action: 'Approve a change or send a notice', rule: 'deny' },
    ],
    unlock: [
      { id: 'Q26', text: 'Each office confirms its route in writing.', ref: 'Offices L, N' },
      { id: 'Q40', text: 'Daytime phone and clerk for each office.', ref: 'Day 1 count row 30' },
      { id: 'Q10, Q11', text: 'How video links come.' },
      { id: 'Q12', text: 'Who to reach before opening.' },
      { id: 'Q38', text: 'The last day for a date-change request.', ref: 'Day 1 count row 29' },
      { id: 'Proposed', text: 'Does the office have a portal? Not in the kit\'s list.', ours: true },
    ],
    cost: [{ text: 'No estimate was made for this.', label: 'Not estimated', source: 'Integration map' }],
    gaps: ['No office portal appears anywhere in the packet.'],
    events: [
      {
        id: 'county-offices-1',
        integration: 'county-offices',
        title: 'Tesswick by phone: send the form, then call',
        source: 'office-rule',
        shows: 'The office rule sorts the call note and holds Tesswick. Approve or reject the change on Offices (the approver in demos is Dana Price).',
        ref: { messages: ['22'], county: 'Tesswick', rows: [171, 178, 179] },
        lands: { label: 'Decide it on Offices', to: '/offices/tesswick' },
      },
      {
        id: 'county-offices-2',
        integration: 'county-offices',
        title: 'Harthmere paper notice dated May 30',
        source: 'office-rule',
        shows: 'The office rule sorts the mail transcript; its rows ask a person for the date the paper notice arrived.',
        ref: { messages: ['43'], county: 'Harthmere', rows: [62, 64, 67] },
        lands: { label: 'See it in Check messages', to: '/suggestions' },
      },
    ],
  },
  {
    slug: 'ai-provider',
    name: 'AI model provider',
    examples: 'OpenAI in season one',
    icon: 'model',
    oneLine: 'Two AI readers propose what a message proves. They never file anything.',
    counted: 'Simulated',
    statuses: [
      { part: 'Recorded answers replayed', status: 'Simulated' },
      { part: 'Live readers in this file', status: 'Not connected' },
    ],
    today: "Opened as a file, the app replays the readers' recorded answers and asks no AI model. Started with the firm's own key, both readers read new messages live; the key never reaches this page. First live run, 21 Nov 2026: 8 requests for $0.0911 in 76.8 seconds (Measured).",
    flowsIn: "The readers' proposals, with the words each relies on.",
    flowsOut: "The text of each new message, only after Alice's and counsel's written yes on the provider, its data terms and what is sent.",
    permission: {
      asks: ['An API key held by the firm, in its own environment.'],
      never: ['Show, store or ask for a key in this app.', 'File a cell on the sheet.'],
    },
    fills: "Proposals only, on the sheet's Reader suggestions tab, accepted at the 9:00 a.m. pass.",
    fillsRef: 'Reader suggestions column G holds a person\'s yes or no. Auto-filing stays off under the condition in Reader suggestions A168.',
    approves: 'Every proposal. Auto-filing of one kind may be allowed only by Alice at the live-week-4 review.',
    agent: [
      { action: 'Read a new message and propose', rule: 'ask' },
      { action: 'File a cell on the sheet', rule: 'deny' },
    ],
    agentWhy: 'On unseen everyday mail the readers were wrong about 1 time in 11 on agreed and checked closings (72 of 79 right; Measured), which is why they never file.',
    unlock: [
      { id: 'Q25', text: "Alice's and counsel's written yes on the provider, its data terms and what is sent.", ref: 'Day 1 count row 18' },
      { id: 'Q35', text: "The firm's two-week tally of proposals by kind.", ref: 'Day 1 count row 24' },
    ],
    cost: [
      { text: 'Recorded runs: $0.00348 a message, two readers.', label: 'Measured', source: 'Prototype README, the trace command' },
      { text: 'Live run of 21 Nov: 8 requests for $0.0911.', label: 'Measured', source: 'Live reader run notes' },
      { text: 'Later design: about $0.02 a message.', label: 'Estimate', source: 'Solution design, the later control tower' },
    ],
    gaps: ['Season one measured OpenAI (gpt-6.1-sol checked by gpt-6-luna). Open-weight models were not measured. The later control tower design names Claude Opus 5.5, a design choice not measured here.'],
    events: [
      {
        id: 'ai-provider-1',
        integration: 'ai-provider',
        title: `Read the ${pasteMessages} example messages`,
        source: 'paste',
        shows: `Reads the example file of new messages: ${pasteRowCount} proposals from ${pasteReplayed} messages, and ${pasteMissing.length ? `message ${pasteMissing.join(', ')}` : 'none'} left for a person to read.`,
        ref: { paste: 'all' },
        lands: { label: 'Open the pasted messages', to: '/suggestions/paste' },
      },
      {
        id: 'ai-provider-2',
        integration: 'ai-provider',
        title: 'Show the live run of 21 Nov',
        source: 'sheet',
        shows: 'The record of the first live run, in How we know (Measured). No AI model is asked.',
        ref: {},
        lands: { label: 'Open How we know', to: '/evidence' },
      },
    ],
  },
];

export const STATUS_ORDER: StatusWord[] = ['Simulated', 'Proposed', 'Not connected'];

export function integrationBySlug(slug: string): Integration | undefined {
  return INTEGRATIONS.find((i) => i.slug === slug);
}

export function eventById(id: string): SimEvent | undefined {
  for (const i of INTEGRATIONS) for (const e of i.events) if (e.id === id) return e;
  return undefined;
}

/** The counts the shell strip and the page summary show. "Connected" is always 0 in this prototype. */
export function statusCounts(): { total: number; connected: 0; simulated: number; proposed: number; notConnected: number } {
  const n = (w: StatusWord): number => INTEGRATIONS.filter((i) => i.counted === w).length;
  return { total: INTEGRATIONS.length, connected: 0, simulated: n('Simulated'), proposed: n('Proposed'), notConnected: n('Not connected') };
}

/** "Integrations: 0 connected, 6 simulated, 3 not connected" */
export function statusSentence(): string {
  const c = statusCounts();
  const parts = [`${c.connected} connected`, `${c.simulated} simulated`];
  if (c.proposed) parts.push(`${c.proposed} proposed`);
  if (c.notConnected) parts.push(`${c.notConnected} not connected`);
  return `Integrations: ${parts.join(', ')}`;
}

export const SOURCE_WORDS: Record<EventSource, string> = {
  paste: 'Read like new mail',
  'reader-row': 'Shows proposals',
  'reply-rule': 'Reply rule',
  'office-rule': 'Office rule',
  sheet: 'Shows the sheet',
};

export const EXAMPLE_NOTE = 'Example data. Nothing was sent or received.';
