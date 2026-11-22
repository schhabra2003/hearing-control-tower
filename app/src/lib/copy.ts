/**
 * The interface's words in one place: page purposes and help, the plain names of statuses, list
 * words, filters and cards, the Overview coverage line, the Tesswick comparison and approval
 * states, and todayActions(), which turns a hearing's printed sheet lines and the Bench into one to
 * four plain steps, each with an owner and a deadline. Every figure is read from the data; nothing
 * here types a number.
 */

import type { GateKey, Hearing } from '@/types/data';
import { cellNumber, cellText, engine, hearings, officeOfHearing, officeSlug, sheetToday, tab, type Office } from '@/lib/data';
import { clockText, dateShort, parseIsoDate } from '@/lib/format';
import { sentenceCase } from '@/lib/sheetText';
import { gateLabel } from '@/lib/gates';
import type { ChangeDecision } from '@/lib/store';

/* ---------- pages: title, one-line purpose (12 words or fewer), help (two sentences) ---------- */

export type PageId =
  | 'overview' | 'today-9am' | 'today-2pm' | 'hearings' | 'hearing' | 'measures'
  | 'suggestions' | 'paste' | 'replies' | 'offices' | 'bench' | 'calendar'
  | 'ai' | 'agents' | 'evidence' | 'not-found' | 'integrations'
  | 'later-board' | 'later-queue' | 'later-messages' | 'later-try' | 'later-counties'
  | 'later-scale' | 'later-business' | 'later-checks' | 'later-how';

export interface PageCopy {
  title: string;
  /** The one line under the title; null where the title says enough. */
  purpose: string | null;
  /** The "?" popover: two plain sentences. */
  help: readonly [string, string];
}

const LATER_HELP = 'A prototype of a later tool, not used this season. Its numbers are simulated unless a label says otherwise.';

export const PAGES: Record<PageId, PageCopy> = {
  overview: {
    title: 'Overview',
    purpose: null,
    help: ["The goal: a named consultant's yes on every hearing, three working days ahead. Two AI readers propose the proof, and a person accepts each one.", 'Select a number’s label to see the cell it is read from.'],
  },
  'today-9am': {
    title: 'The 9:00 a.m. pass',
    purpose: 'Decide suggestions and office changes, then make the calls.',
    help: ['Work the four steps in order; each one says what waits.', 'Nothing changes on the sheet until the coordinator types it.'],
  },
  'today-2pm': {
    title: 'The 2:00 p.m. review',
    purpose: 'Give every flagged hearing a next step, an owner and a time.',
    help: ['Each hearing on the list needs a next step, an owner and a due time by 2:30 p.m.', 'Then download the calendar file.'],
  },
  hearings: {
    title: 'Hearings',
    purpose: 'Every hearing, nearest first. Open one to see what to do.',
    help: ['At risk means the sheet put the hearing at the top of today’s list.', 'Open a hearing to see today’s steps and the proof for each check.'],
  },
  hearing: {
    title: 'Hearing',
    purpose: null,
    help: ['Today’s steps come from the lines the sheet prints for this hearing.', 'A check is done only when a message proves it.'],
  },
  measures: {
    title: 'Measures',
    purpose: 'How the firm knows the season works, as the sheet counts it.',
    help: ['Each figure is read from the sheet’s Measures tab; nothing is counted again here.', 'Select a label to see the cell and how it is counted.'],
  },
  suggestions: {
    title: 'Proposals',
    purpose: 'Accept or refuse each value the readers and the rules propose.',
    help: ['The readers read the week’s messages and propose which one proves each gate. Fixed rules propose the other cells.', 'Accept the ones that are right, then type them on the Reader suggestions tab. Nothing changes on the sheet until a person types it.'],
  },
  paste: {
    title: 'Paste new messages',
    purpose: 'Read new messages and get rows to paste into the sheet.',
    help: ['This replays recorded answers for the example messages; no AI model is called.', 'Copy the rows and paste them into the Reader suggestions tab.'],
  },
  replies: {
    title: 'Replies',
    purpose: 'How the reply rule sorts consultants’ replies, and which need a person.',
    help: ['The rule files plain replies such as YES 1 3; anything unclear goes to a person.', 'Use Try a reply to test a reply of your own.'],
  },
  offices: {
    title: 'Offices',
    purpose: 'How each office wants our consultant named, and changes to decide.',
    help: ['Each office’s process is a row of data, not code; no notice goes to an office whose process changed until someone approves.', 'Try: open Tesswick, compare the old and the new process, approve it with your name, then undo it.'],
  },
  bench: {
    title: 'Bench',
    purpose: 'Our consultants: where they work, their daily limit, how to reach them.',
    help: ['This is the sheet’s Bench tab.', 'A consultant with no mobile number on file is reached by email only.'],
  },
  calendar: {
    title: 'Calendar file',
    purpose: 'Check the hearing events, then download the calendar file.',
    help: ['The file is the sheet’s Calendar file tab, byte for byte.', 'Import it into the shared calendar after the 2:00 p.m. review.'],
  },
  ai: {
    title: 'What the AI does',
    purpose: 'What the software reads and suggests, and what it never does.',
    help: ['Two readers suggest which message proves each check.', 'A person accepts every suggestion; nothing is sent or filed by itself.'],
  },
  agents: {
    title: 'For agents',
    purpose: 'Routes, data and steps for software that browses this app.',
    help: ['Every page, hearing and office has its own link.', 'window.hearingDesk returns the current data as JSON.'],
  },
  evidence: {
    title: 'How we know',
    purpose: 'How each number was checked, with its command and label.',
    help: ['Measured means a command ran and printed the line shown.', 'Simulated and Estimate numbers carry that label wherever they appear.'],
  },
  integrations: {
    title: 'Integrations',
    purpose: 'The systems the firm already uses, and what the desk would read or write in each.',
    help: ['Each row is a system the firm already uses, such as the mailbox, the calendars or the text line, with what the desk would read from it and write to it.', 'None is connected. Try: open one and press Simulate to see what would happen; nothing is sent.'],
  },
  'not-found': {
    title: 'There is no page here',
    purpose: 'Check the link, or choose a page below.',
    help: ['The link does not match a page of this app.', 'The pages closest to it are listed below.'],
  },
  'later-board': { title: 'Board', purpose: 'Every hearing and its checks, as the later tool would track them.', help: ['Every hearing and its checks, as the later tool would track them.', LATER_HELP] },
  'later-queue': { title: 'Work queue', purpose: 'What the later tool would do next, sorted by who acts.', help: ['What the later tool would do next, sorted by who acts.', LATER_HELP] },
  'later-messages': { title: 'Messages', purpose: 'Each example message, and what the later tool made of it.', help: ['Each example message, and what the later tool made of it.', LATER_HELP] },
  'later-try': { title: 'Try a message', purpose: 'Write a message and see what the later tool would do.', help: ['Write a message and see what the later tool would do with it.', LATER_HELP] },
  'later-counties': { title: 'Counties', purpose: 'Each county’s process is a data file, not code.', help: ['A new county is a new data file, checked and approved by a person. Not built this season; the data is simulated.', 'Try: open a county to read its file, then change the shared packet deadline and see which counties keep their own.'] },
  'later-scale': { title: 'Scale', purpose: 'More hearings and counties without more people, simulated.', help: ['The runs show how person minutes change as hearings and counties grow. Not built this season; every run is simulated.', 'Try: pick a size and run the simulation; each run adds a row you can compare.'] },
  'later-business': { title: 'Business case', purpose: 'What the plan costs and saves, as estimates.', help: ['Every figure here is an estimate, not a measurement of the firm.', 'Nobody has timed the firm’s work yet.'] },
  'later-checks': { title: 'Checks', purpose: 'The problems the later tool is tested against, run here.', help: ['Run the problems in this browser and see each result.', LATER_HELP] },
  'later-how': { title: 'How it works', purpose: 'How the later tool would read, decide and hand work to people.', help: ['None of these sends happen this season; today a person sends every message.', LATER_HELP] },
};

/* ---------- sidebar ---------- */

export const NAV_COPY = {
  groupToday: 'Today',
  groupSeason: 'This season',
  groupLater: 'Later (not built)',
  laterCount: (n: number): string => `${n} pages`,
  suggestionsCount: (n: number): string => `${n} gate links to decide`,
  officesCount: (n: number): string => (n === 1 ? '1 office change to decide today' : `${n} office changes to decide today`),
  passCount: (n: number): string => `${n} of 4 steps to do`,
  ai: 'What the AI does',
  agents: 'For agents',
} as const;

export const CLOCK_COPY = {
  pill: 'Example week',
  description: 'The clock is set to the example week. It changes nothing on the sheet.',
} as const;

/* ---------- statuses (Hearings W) ---------- */

export type Tone = 'danger' | 'warn' | 'ok' | 'neutral';

export interface StatusCopy {
  label: string;
  tone: Tone;
  /** One sentence, from the sheet's How to use A6. */
  meaning: string;
}

/**
 * The plain name of a Hearings W value. The words follow How to use A6, which defines each status.
 * OPEN counts proofs, not checks: G4 has two proofs, so "4 missing" is never "4 of 5 checks".
 */
export function statusCopy(w: string, h?: Hearing, changes?: Partial<Record<string, ChangeDecision>>): StatusCopy {
  const s = w.trim();
  // What the row says beyond its status word, in the words the example week asks for (N5, N8, N10, N11).
  if (h) {
    const list = h.dailyList ?? '';
    const owed = typeof h.owed === 'string' ? h.owed : '';
    if (list.includes('NOTICE BLOCKED')) {
      // once a person decided here, the notice waits only for the coordinator to record it.
      const d = changes?.[officeSlug(h.county)];
      if (d?.decision === 'approved') return { label: `Notice waits: record ${h.county}’s approved process`, tone: 'warn', meaning: 'Approved here; the notice goes once the coordinator records the new process on the sheet.' };
      if (d?.decision === 'rejected') return { label: `Notice waits: record that ${h.county} keeps its old process`, tone: 'warn', meaning: 'Rejected here; the notice goes once the coordinator records it on the sheet.' };
    }
    if (list.includes('NOTICE BLOCKED')) return { label: `Notice waits for ${h.county} approval`, tone: 'danger', meaning: 'No notice goes to the office until a person approves its new process.' };
    if (list.startsWith('NOBODY NAMED: POSSIBLY MISSED')) return { label: 'No consultant named: possibly missed', tone: 'danger', meaning: 'The hearing is over and no consultant was named.' };
    if (s === 'ERROR DUE' && /WAITING FOR THE BOARD'S WRITTEN DECISION/.test(h.printed ?? '')) return { label: 'Waiting for decision letter', tone: 'warn', meaning: 'Heard; the board’s written decision is not in yet.' };
    if (/^Withdrawal: sent, not processed/i.test(owed)) return { label: 'Withdrawal sent, not processed by the office', tone: 'warn', meaning: 'The hearing stays staffed until the office confirms the withdrawal in writing.' };
  }
  const open = /^OPEN: (\d+) missing$/.exec(s);
  if (open) {
    const n = Number(open[1]);
    return { label: `Not ready: ${n} ${n === 1 ? 'proof' : 'proofs'} missing`, tone: 'neutral', meaning: 'Before the hearing, with proofs still missing.' };
  }
  const done = /^DONE: (\d+) proofs? missing$/.exec(s);
  if (done) return { label: `Held: ${done[1]} proofs still due`, tone: 'warn', meaning: 'Held, but a proof never came in.' };
  const owedWhat = h && typeof h.owed === 'string' ? h.owed.split(':')[0]!.trim() : '';
  const table: Record<string, StatusCopy> = {
    READY: { label: 'Ready: every proof in', tone: 'ok', meaning: 'Every proof is linked.' },
    CONFIRMED: { label: 'Confirmed by the consultant', tone: 'ok', meaning: 'Ready, and the consultant said yes the day before.' },
    'RESULT DUE': { label: 'Past: result not recorded', tone: 'danger', meaning: 'The hearing is over and no result is typed yet.' },
    MISSED: { label: 'Missed: nobody appeared', tone: 'danger', meaning: 'Nobody appeared; the good-cause letter and the office’s answer are due.' },
    OWED: { label: owedWhat ? `${owedWhat} owed to office` : 'Owed to the office', tone: 'danger', meaning: 'A signature, statement or withdrawal is still owed.' },
    'NEW DATE DUE': { label: 'Postponed: new date not in', tone: 'warn', meaning: 'Postponed, and the county’s new date is not in yet.' },
    'ERROR DUE': { label: 'Past: errors not recorded', tone: 'warn', meaning: 'The hearing is over and the error entry is empty.' },
    'DECISION DUE': { label: 'Waiting for the written decision', tone: 'warn', meaning: 'Heard, and the board’s written decision is not linked.' },
    'RESULT IN: ARRIVAL NOT RECORDED': { label: 'Result in: arrival time missing', tone: 'warn', meaning: 'The result is typed but no arrival or join time is.' },
    'RESULT NOT CLEAR': { label: 'Result not clear', tone: 'warn', meaning: 'The result as reported fits no value of the result list.' },
    'CANCEL PROOF DUE': { label: 'Cancelled: office proof missing', tone: 'warn', meaning: 'Marked not on, without the office’s written confirmation.' },
    'NOT HELD': { label: 'Not held', tone: 'neutral', meaning: 'Cancelled, with the office’s written proof.' },
    'NO DATE': { label: 'No date yet', tone: 'neutral', meaning: 'The county has not set a date.' },
    DONE: { label: 'Done', tone: 'ok', meaning: 'Held, with every proof linked.' },
  };
  return table[s] ?? { label: sentenceCase(s), tone: 'neutral', meaning: 'As the sheet prints it.' };
}

/* ---------- daily-list words (Hearings X) ---------- */

export const LIST_WORD: Record<string, string> = {
  'TOP OF LIST: OWED': 'At risk: owed to office',
  'TOP OF LIST': 'At risk',
  'NOBODY NAMED: POSSIBLY MISSED': 'No consultant named: possibly missed',
  'OFFICE CANNOT FIND OUR NOTICE': 'Office cannot find our notice',
  'OPENING NOT ARRANGED': 'First case: opening not arranged',
  'ARRIVAL NOT SETTLED': 'Arrival time not agreed',
  'CALL THE HOMEOWNER': 'Call the homeowner',
  'ILLNESS REPORTED': 'Consultant reported ill',
  'NOTICE BLOCKED': 'Notice waits for approval',
  'CONFIRM TODAY': 'Confirm today',
  'FALLBACK DUE': 'Signing link due',
  'RESULT DUE': 'Result to record',
  'ERROR DUE': 'Errors to record',
  REVIEW: 'Read once today',
  'TELL DUE': 'Tell the consultant',
  'ARRIVAL DUE': 'Arrival time to record',
  'PROOFS DUE': 'Proofs still due',
};

export const listWord = (phrase: string): string => LIST_WORD[phrase] ?? sentenceCase(phrase);

/* ---------- filters, groups and cards ---------- */

export const HEARING_FILTERS = {
  all: 'All',
  coming: 'Coming',
  top: 'At risk',
  ready: 'Ready',
  blocked: 'Notice waits for approval',
  nobody: 'No consultant named',
} as const;

/** ?filter=at-risk is an alias of ?filter=top; the test id hearings-filter-top stays. */
export const HEARING_FILTER_ALIASES: Record<string, keyof typeof HEARING_FILTERS> = { 'at-risk': 'top' };

export const TODAY_FILTERS = {
  all: 'All',
  top: 'At risk',
  calls: 'Calls due',
  questions: 'Consultant questions',
  'same-day': 'Due today',
  'no-next': 'No next step yet',
} as const;

export const LIST_GROUP_COPY = {
  top: { title: 'At risk', sentence: 'Within 3 working days, blocked or owed.' },
  nobody: { title: 'Possibly missed', sentence: 'The hearing is over and nobody was named.' },
  confirm: { title: 'Confirm today', sentence: 'Ready or nearly ready; confirm with the consultant.' },
  due: { title: 'Result or errors to record', sentence: 'The hearing is over; its result or error entry is empty.' },
  review: { title: 'Read once today', sentence: 'Coming hearings with something to check.' },
} as const;

export const SUGGESTION_TABS = {
  gates: 'Proof links',
  cells: 'Other cells',
  offices: 'Office changes',
  repeats: 'Repeats',
  questions: 'Questions',
  showAsks: 'To decide',
  showAll: 'Every row',
} as const;

export const REPLY_FILTERS = { all: 'All', rule: 'Filed by the rule', person: 'For a person' } as const;

/** Overview cards: labels of 6 words or fewer; the sentence goes in the tooltip and as one visible line where noted. */
export const OVERVIEW_KPIS = {
  B3: { label: 'Within 3 days, no consultant’s yes', href: '#/hearings?filter=at-risk' },
  B11: { label: 'Ready now', href: '#/hearings?filter=ready' },
  B98: { label: 'Notice waits for approval', href: '#/hearings?filter=blocked' },
  B4: { label: 'Records that disagree', href: '#/measures' },
} as const;

export const OVERVIEW_QUESTIONS = [
  { id: 'kpis', title: 'How we measure it', answer: 'Every count, as the sheet’s Measures tab holds it.', href: '#/measures' },
  { id: 'process', title: 'The two daily passes', answer: 'Two passes a day. A person decides every step.', href: '#/today/9am' },
  { id: 'proof', title: 'How a hearing is proven ready', answer: 'Five checks, each closed by a link to its message.', href: '#/hearings' },
  { id: 'county', title: 'A new county or process', answer: 'An office is a row of data. A change waits for approval.', href: '#/offices' },
  { id: 'ai', title: 'What the AI does', answer: 'It suggests proofs. A person decides.', href: '#/ai' },
  { id: 'cost', title: 'Cost and savings', answer: 'Estimates, not measured.', href: '#/later/business' },
  { id: 'scale', title: 'How the work scales', answer: 'Simulated runs at more hearings and counties.', href: '#/later/scale' },
  { id: 'evidence', title: 'How we know it is true', answer: 'Every check, its command and the line it printed.', href: '#/evidence' },
] as const;

export const DOES_NOT_DO = ['No mailbox is connected', 'Nothing files itself', 'The clock changes nothing on the sheet'] as const;

export const AI_PAGE = {
  does: ['Reads the messages from offices and consultants.', 'Suggests which message proves each check.', 'Hands any message it cannot read to a person.'],
  doesNot: ['Send email or texts.', 'Change the sheet.', 'File anything.', 'Decide. A person accepts every suggestion.'],
} as const;

/* ---------- gates in plain words ---------- */

export const GATE_NAME: Record<GateKey, string> = {
  G1: 'the date is confirmed by the office',
  G2: 'the consultant said yes',
  G3: "the office has our consultant's name",
  G4clerk: 'the clerk has the files',
  G4consultant: 'the consultant has the files',
  G5: 'the owed items are received',
};

/** Capitalised for headings and chips: "Consultant said yes". */
export const gateTitlePlain = (k: GateKey): string => gateLabel(k);

const GATE_ORDER: GateKey[] = ['G1', 'G2', 'G3', 'G4clerk', 'G4consultant', 'G5'];

/** "1 of 5 proofs in. Missing: consultant said yes, name on the office's record, files with the clerk, files with the consultant." */
export function checksSummary(h: Hearing): string {
  const needed = GATE_ORDER.filter((k) => h.gates[k].state !== 'not-needed');
  const missing = needed.filter((k) => h.gates[k].state === 'missing');
  const head = `${needed.length - missing.length} of ${needed.length} proofs in.`;
  return missing.length ? `${head} Missing: ${missing.map((k) => GATE_NAME[k]).join(', ')}.` : `${head} Nothing missing.`;
}

/* ---------- Overview lines ---------- */

export interface CoverageLine {
  /** "Coming hearings: 14 of 19 have a consultant who said yes." */
  text: string;
  /** "4 need one now." (the link to #/hearings?filter=at-risk) */
  link: string;
  href: string;
  yes: number;
  total: number;
  near: number;
  /** Measures B3, the sheet's own count of "near"; the two must agree. */
  measure: number | null;
  /** The date range of the coming hearings, for the tooltip. */
  range: string;
}

const stillOn = (h: Hearing): boolean => String(h.stillOn ?? 'yes').trim().toLowerCase() !== 'no';
const attended = (h: Hearing): boolean => String(h.format ?? '').trim().toLowerCase() !== 'written statement';

/**
 * Hearings still to come (Hearings V from 0) that someone attends, and how many have a consultant's
 * yes that counts (G2 proved, which the export computes from BV). "Near" uses Settings B4, the
 * same window as Measures B3. The prefix says "This week" only when every coming hearing falls
 * within seven days of the day the sheet stands on; otherwise it says "Coming hearings".
 */
export function coverageLine(): CoverageLine {
  const window = cellNumber('Settings', 'B4') ?? 3;
  const coming = hearings.filter((h) => h.workingDays !== null && h.workingDays >= 0 && stillOn(h) && attended(h));
  const yes = coming.filter((h) => h.gates.G2.state === 'proved').length;
  const near = coming.filter((h) => h.gates.G2.state !== 'proved' && (h.workingDays ?? 99) <= window).length;
  const dates = coming.map((h) => h.date ?? '').filter(Boolean).sort();
  const today = Date.parse(`${sheetToday()}T00:00:00Z`);
  const last = dates.length ? Date.parse(`${dates.at(-1)}T00:00:00Z`) : today;
  const thisWeek = (last - today) / 86_400_000 <= 6;
  const subject = thisWeek ? `This week: ${yes} of ${coming.length} hearings` : `Coming hearings: ${yes} of ${coming.length}`;
  return {
    text: `${subject} have a consultant who said yes.`,
    link: `${near} need one now.`,
    href: '#/hearings?filter=at-risk',
    yes,
    total: coming.length,
    near,
    measure: cellNumber('Measures', 'B3'),
    range: dates.length ? `${dateShort(dates[0])} to ${dateShort(dates.at(-1))}` : '',
  };
}

/** "Our case system and the sheet differ on 11 of 24 hearings." from Record check C1. */
export function recordsLine(): string {
  const m = /(\d+) of (\d+)/.exec(cellText('Record check', 'C1'));
  return m ? `Our case system and the sheet differ on ${m[1]} of ${m[2]} hearings.` : '';
}

/* ---------- todayActions ---------- */

export type DueKind = 'now' | 'time' | 'day' | 'review' | 'none';

export interface TodayAction {
  /** A stable id for the test id: today-action-<case>-<id>. */
  id: string;
  text: string;
  owner: { name: string; fromSheet: boolean; cell?: string };
  due: { kind: DueKind; text: string; iso?: string; zone?: string };
  /** Where it comes from: "Hearings BE7, line 2", "Who can take it AV4". */
  from: string[];
  href?: string;
}

export interface TodayContext {
  /** The session's office decisions, by slug. */
  changes?: Record<string, ChangeDecision | undefined>;
}

const MONTHS: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
const SHEET_DATE = String.raw`(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)`;
const SHEET_TIME = String.raw`(\d{1,2}):(\d{2}) ?(AM|PM)`;

/** "Fri 7 Jun" in the sheet's year as "2030-06-07". */
function sheetDateIso(day: string, mon: string): string {
  const y = sheetToday().slice(0, 4);
  return `${y}-${String(MONTHS[mon.toUpperCase()]).padStart(2, '0')}-${day.padStart(2, '0')}`;
}

const minutes = (hh: string, mm: string, ap: string): number => ((Number(hh) % 12) + (ap.toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(mm);

/** The office's time as Hearings CB says it: "Larkmere office time". */
const zoneOf = (h: Hearing): string | undefined => /Times are (.+? office time)/.exec(h.timeZoneSentence ?? '')?.[1];

function dueAt(h: Hearing, iso: string, mins: number | null): TodayAction['due'] {
  const today = iso === sheetToday();
  const zone = zoneOf(h);
  if (mins === null) return { kind: 'day', text: today ? 'Today' : `By ${dateShort(iso)}`, iso, ...(zone ? { zone } : {}) };
  const t = clockText(mins);
  return { kind: 'time', text: today ? `By ${t} today` : `By ${dateShort(iso)}, ${t}`, iso, ...(zone ? { zone } : {}) };
}

/** The first "Ddd D Mon at H:MM AM" (or "Ddd D Mon") in a text. */
function dueInText(h: Hearing, text: string): TodayAction['due'] | null {
  const m = new RegExp(`${SHEET_DATE}(?: at ${SHEET_TIME})?`).exec(text);
  if (!m) return null;
  return dueAt(h, sheetDateIso(m[1]!, m[2]!), m[3] ? minutes(m[3], m[4]!, m[5]!) : null);
}

const TODAY = (h: Hearing): TodayAction['due'] => dueAt(h, sheetToday(), null);
const NOW: TodayAction['due'] = { kind: 'now', text: 'Now' };
/** No time on the sheet: the 2:00 p.m. review gives every flagged row a due time (Hearings AA). */
const atReview = (h: Hearing): TodayAction['due'] => (h.dailyList ? { kind: 'review', text: 'By the 2:00 p.m. review' } : { kind: 'none', text: 'No due time on the sheet' });

const ON_DUTY = { name: 'Coordinator on duty', fromSheet: false } as const;

/** "MAYA VENN" or "Maya Venn" as "Maya Venn". */
const name = (s: string): string => {
  const n = sentenceCase(s.trim()).replace(/^the /, 'The ');
  // The sheet's "THE COORDINATOR" is the same person every other step calls the coordinator on duty.
  return n.toLowerCase() === 'the coordinator' ? ON_DUTY.name : n;
};

/** The office's closing time (Offices AN, "16:00") in minutes, or null. */
function officeCloses(o: Office | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(o?.cells.AN ?? '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The Who can take it groups (AP to AU) in plain words. */
const ASK_WHY: Record<string, string> = {
  'already at this office that day': 'already at this office that day',
  'said they are free then': 'they said they are free then',
  'primary or promised day': 'it is a day they promised',
  'their preference fits': 'the hearing fits the consultant’s preference',
  bench: 'on the bench for this office',
  'working elsewhere that day, travel gap met': 'working nearby that day, with time to travel',
};

/**
 * Who the sheet says to ask first for a hearing with nobody named: the Who can take it tab, row of
 * the docket "<county>, <Ddd D Mon>, <format>", column AV ("Ask next"). Returns the first name of
 * the best group, the group's words and the cell.
 */
export function askFirst(h: Hearing): { name: string; why: string; cell: string } | null {
  const p = h.date ? parseIsoDate(h.date) : null;
  if (!p) return null;
  const key = `${h.county}, ${WD[p.weekday]} ${p.d} ${MON[p.m - 1]}, ${String(h.format ?? '').trim()}`;
  const row = tab('Who can take it').rows.find((r) => String(r.cells.A ?? '').trim() === key);
  const av = row ? String(row.cells.AV ?? '') : '';
  // A name may carry the sheet's marks in capitals: (EMAIL ONLY), (CALL OR EMAIL, NO TEXT), (STATES: ASK).
  const m = /^([^:]+): ([^,.(]+?)((?: \([A-Z ,:]+\))*)[,.]/.exec(av);
  if (!row || !m) return null;
  const group = m[1]!.trim().toLowerCase();
  const marks = m[3] ?? '';
  const how = /EMAIL ONLY/.test(marks) ? ', by email only' : /NO TEXT/.test(marks) ? ', by call or email, not text' : '';
  const state = /STATES: ASK/.test(marks) ? `. Our lawyer has not yet confirmed ${m[2]!.trim()} may represent clients in this state` : '';
  return { name: m[2]!.trim(), why: `${ASK_WHY[group] ?? group}${how}${state}`, cell: `Who can take it AV${row.row}` };
}

interface Found extends TodayAction {
  rank: number;
  kind: string;
}

interface Rule {
  kind: string;
  rank: number;
  re: RegExp;
  make: (m: RegExpExecArray, h: Hearing, all: string) => Omit<TodayAction, 'id' | 'from' | 'owner'> & { owner?: TodayAction['owner'] } | null;
}

const officeName = (h: Hearing): string => `the ${h.county} office`;
const who = (h: Hearing, raw: string): string => {
  const c = h.consultant ? String(h.consultant) : 'the consultant';
  return raw === 'THE CONSULTANT AND THE CLERK' ? `${c} and the clerk` : raw === 'THE CONSULTANT' ? c : 'the clerk';
};
const homeownerName = (all: string): string | null => /THE HOMEOWNER TO CALL: ([^(]+?) \(/.exec(all)?.[1]?.trim() ?? null;
const callExtras = (all: string): string => {
  const parts: string[] = [];
  if (/CONTACT NOT ON RECORD/.test(all)) parts.push('Get the number from the client file first.');
  const also = /ONE CALL COVERS THIS HEARING AND (AX-\d+)/.exec(all)?.[1];
  if (also) parts.push(`One call also covers ${also}.`);
  return parts.length ? ` ${parts.join(' ')}` : '';
};

const RULES: Rule[] = [
  {
    kind: 'approve', rank: 1, re: /NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY/,
    make: (_m, h) => ({ text: `Approve or reject ${h.county}’s new process for naming our consultant.`, due: TODAY(h), href: `#/offices/${officeSlug(h.county)}?approve=1` }),
  },
  {
    kind: 'name', rank: 2, re: /THE OFFICE HAS (.+?), WHO IS NOT ON THIS HEARING: NAME A CONSULTANT, THEN SEND THE OFFICE THE REPLACEMENT NOTICE/,
    make: (_m, h) => {
      const first = askFirst(h);
      return { text: `Name a consultant, then send the office the replacement notice.${first ? ` Ask ${first.name} first: ${first.why}.` : ''}`, due: atReview(h) };
    },
  },
  {
    kind: 'ill', rank: 2, re: /([A-Z][A-Z .'-]+?) REPORTED ILL ON .*?LINE UP A BACKUP BEFORE THE OFFICE'S NAMING DEADLINE \(([^)]+)\)/,
    make: (m, h) => {
      const next = askNextName(h);
      return { text: `Ask ${name(m[1]!)}: can you still attend? If not: by 2:00 p.m. offer it to ${next ?? 'the first name on Ask next'}; at 4:00 p.m. ask the office’s alternate; after 4:00 p.m. phone down Ask next.`, due: dueInText(h, m[2]!) ?? TODAY(h) };
    },
  },
  {
    kind: 'call-y', rank: 3, re: /CALL THE (.+?) OFFICE IN ITS HOURS \(Offices D: ([^)]+)\): THE CALL IS IN Y, Z AND AA/,
    make: (_m, h) => {
      const y = h.nextAction ? String(h.nextAction).trim() : '';
      if (!y) return null;
      const owner = h.owner ? { name: name(String(h.owner)), fromSheet: true, cell: `Hearings Z${h.row}` } : undefined;
      const iso = typeof h.due === 'string' && /^\d{4}-\d{2}-\d{2}/.test(h.due) ? h.due.slice(0, 10) : null;
      const o = officeOfHearing(h);
      const opens = /^(\d{1,2}):(\d{2})$/.exec(String(o?.cells.AM ?? ''));
      const closes = officeCloses(o);
      const hours = opens && closes !== null ? `, in office hours (${clockText(Number(opens[1]) * 60 + Number(opens[2]))} to ${clockText(closes)})` : '';
      const due = iso ? dueAt(h, iso, null) : atReview(h);
      return { text: y, due: { ...due, text: `${due.text}${hours}` }, ...(owner ? { owner } : {}) };
    },
  },
  {
    kind: 'owed', rank: 3, re: new RegExp(`^OWED: SEND BY ${SHEET_DATE} at ${SHEET_TIME}`),
    make: (m, h) => {
      const what = typeof h.owed === 'string' ? h.owed.split(':')[0]!.trim().toLowerCase() : 'owed item';
      const closed = /because the office is closed on ((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)) (\d{1,2}) ([A-Z][a-z]{2})/.exec(m.input);
      const why = closed ? ` The office is closed ${dateShort(sheetDateIso(closed[2]!, closed[3]!))}.` : '';
      return { text: `Send the ${what} to ${officeName(h)}.${why}`, due: dueAt(h, sheetDateIso(m[1]!, m[2]!), minutes(m[3]!, m[4]!, m[5]!)) };
    },
  },
  {
    kind: 'files', rank: 4, re: /SEND CASE FILES VERSION (\d+) TO (THE CONSULTANT AND THE CLERK|THE CLERK|THE CONSULTANT)[^:]*: PAST THE 48-HOUR MARK \([^)]*\): SEND NOW AND ASK THE CLERK TO ACCEPT LATE FILES/,
    make: (m, h) => ({ text: `Send case files version ${m[1]} to ${who(h, m[2]!)} now, and ask the clerk to accept them late.`, due: NOW }),
  },
  {
    kind: 'confirm-route', rank: 4, re: /THE OFFICE HAS NOT CONFIRMED (.+?) IN WRITING: SEND OR CHASE THE NOTICE BY THE OFFICE'S OWN ROUTE/,
    make: (m, h, all) => {
      const deadline = /OFFICE DEADLINE ([^.]+)\./.exec(all);
      return { text: `Send or chase the notice naming ${name(m[1]!)}, and ask ${officeName(h)} to confirm in writing.`, due: (deadline && dueInText(h, deadline[1]!)) || atReview(h) };
    },
  },
  {
    kind: 'arrival', rank: 5, re: /([A-Z][A-Z .'-]+?) SAID THEY ARRIVE AT (\d{1,2}:\d{2} [AP]M), WE NEED (\d{1,2}:\d{2} [AP]M): REPLY TODAY/,
    make: (m, h) => {
      const t = (s: string): string => s.replace(/ ?AM$/, ' a.m.').replace(/ ?PM$/, ' p.m.');
      return { text: `Reply to ${name(m[1]!)}: “${sentence(`We need you there by ${t(m[3]!)}, not ${t(m[2]!)}`)}”`, due: TODAY(h) };
    },
  },
  {
    kind: 'arrival', rank: 5, re: /ARRIVAL NOT SETTLED: ([A-Z][A-Z .'-]+?) SAID THEY ARE NOT FREE/,
    make: (m, h) => ({ text: `Ask ${name(m[1]!)} what time they can arrive, or ask the office to hear the case later.`, due: TODAY(h) }),
  },
  {
    kind: 'asked', rank: 6, re: /THE OFFICE HAS ASKED (\d+) TIMES: PHONE IT TODAY AND ANSWER IN WRITING/,
    make: (m, h, all) => ({
      text: /NUMBER NOT ON RECORD/.test(all)
        ? `Answer ${officeName(h)} in writing; it has asked ${m[1]} times. Its phone number is not on the sheet.`
        : `Phone ${officeName(h)} and answer in writing; it has asked ${m[1]} times.`,
      due: TODAY(h),
    }),
  },
  {
    kind: 'opening', rank: 7, re: /ARRANGE TODAY, WHILE IT IS OPEN: THE END-OF-DOCKET REQUEST AND THE ALTERNATE/,
    make: (_m, h) => {
      const c = officeCloses(officeOfHearing(h));
      return { text: `Ask ${officeName(h)} for an end-of-docket slot, an alternate, and whom to reach before opening. The first case is at office opening, so this is arranged the working day before.`, due: c === null ? TODAY(h) : { ...dueAt(h, sheetToday(), c), text: `By ${clockText(c)} today, when the office closes` } };
    },
  },
  {
    kind: 'decision', rank: 7, re: /WAITING FOR THE BOARD'S WRITTEN DECISION: ASK THE OFFICE EVERY FRIDAY/,
    make: (_m, h) => {
      const p = parseIsoDate(sheetToday());
      const add = p ? (5 - p.weekday + 7) % 7 : 0;
      const friday = new Date(Date.parse(`${sheetToday()}T00:00:00Z`) + add * 86_400_000).toISOString().slice(0, 10);
      return { text: `Ask ${officeName(h)} for the board’s written decision, and record the result.`, due: add === 0 ? { ...TODAY(h), text: 'Today (every Friday)' } : dueAt(h, friday, null) };
    },
  },
  {
    kind: 'version-check', rank: 7, re: /CHECK WHETHER CASE FILES VERSION (\d+) ALREADY HOLD WHAT THE OFFICE ASKS FOR/,
    make: (m, h) => ({ text: `Check whether case files version ${m[1]} already hold what the office asks for.`, due: atReview(h) }),
  },
  {
    kind: 'video', rank: 8, re: /NO VIDEO LINK YET: ASK THE OFFICE TODAY/,
    make: (_m, h) => ({ text: `Ask ${officeName(h)} for the video link.`, due: TODAY(h) }),
  },
  {
    kind: 'video', rank: 8, re: /VIDEO ROOM ONLY, NO LINK: ASK THE OFFICE TODAY/,
    make: (_m, h) => ({ text: `Ask ${officeName(h)} whether a video link comes, or the room is at the office.`, due: TODAY(h) }),
  },
  {
    kind: 'record', rank: 8, re: new RegExp(`ASK THE (.+?) OFFICE IN WRITING TODAY: IS (.+?) STILL ON YOUR RECORD FOR (${SHEET_DATE})`),
    make: (m, h) => ({ text: `Ask ${officeName(h)} in writing whether ${name(m[2]!)} is on its record for ${dateShort(sheetDateIso(m[4]!, m[5]!))}.`, due: TODAY(h) }),
  },
  {
    kind: 'homeowner', rank: 9, re: new RegExp(`THE HEARING WAS MOVED FROM (${SHEET_DATE}) TO (${SHEET_DATE}): A PERSON CALLS THE HOMEOWNER TODAY WITH THE NEW DATE`),
    make: (m, h, all) => {
      const who2 = homeownerName(all);
      return { text: `Call the homeowner${who2 ? `, ${who2},` : ''} with the new date, ${dateShort(sheetDateIso(m[5]!, m[6]!))}, and send the corrected notice.${callExtras(all)}`, due: TODAY(h) };
    },
  },
  {
    kind: 'homeowner', rank: 9, re: /MOVED AT OUR REQUEST AND THE HOMEOWNER'S YES TO THE NEW DATE IS NOT ON RECORD: A PERSON CALLS THE HOMEOWNER TODAY/,
    make: (_m, h, all) => {
      const who2 = homeownerName(all);
      return { text: `Call the homeowner${who2 ? `, ${who2},` : ''} for their written yes to the new date.${callExtras(all)}`, due: TODAY(h) };
    },
  },
  {
    kind: 'homeowner', rank: 9, re: /HOMEOWNER'S WRITTEN YES MISSING: A PERSON CALLS THE HOMEOWNER/,
    make: (_m, h, all) => {
      const who2 = homeownerName(all);
      // The daily list's CALL THE HOMEOWNER is one of the 2:00 p.m. review's same-day words.
      const sameDay = (h.dailyList ?? '').includes('CALL THE HOMEOWNER');
      return { text: `Call the homeowner${who2 ? `, ${who2},` : ''} for their written yes.${callExtras(all)}`, due: sameDay ? TODAY(h) : atReview(h) };
    },
  },
  {
    kind: 'settlement', rank: 10, re: /ASK THE OFFICE IN WRITING WHETHER THE SIGNED SETTLEMENT TAKES THE HEARING OFF/,
    make: (_m, h) => ({ text: `Ask ${officeName(h)} in writing whether the signed settlement takes the hearing off, and by when.`, due: atReview(h) }),
  },
  {
    kind: 'tell-date', rank: 10, re: /TELL THE CONSULTANT WHICH DATE NOW STANDS AND GET THEIR OWN YES FOR IT/,
    make: (_m, h) => {
      const c = h.consultant ? String(h.consultant) : 'the consultant';
      const when = `${dateShort(h.date)}, ${clockText(minutesOfSheet(h.time))}`;
      const yes = h.gates.G2.state === 'proved' && h.gates.G2.message ? h.gates.G2.message : null;
      return { text: yes ? `Tell ${c} that ${when} now stands. ${c}’s yes for it is on record (message ${yes}).` : `Tell ${c} that ${when} now stands, and get their yes for it.`, due: atReview(h) };
    },
  },
  {
    kind: 'files', rank: 10, re: new RegExp(`SEND CASE FILES VERSION (\\d+) TO (THE CONSULTANT AND THE CLERK|THE CLERK|THE CONSULTANT) \\([^)]*\\) BY ${SHEET_DATE} at ${SHEET_TIME}`),
    make: (m, h) => {
      const held = /the consultant confirmed version (\d+)/.exec(m.input)?.[1];
      const note = held && held !== m[1] && m[2] !== 'THE CLERK' ? ` ${h.consultant ? String(h.consultant) : 'The consultant'} has version ${held}; send version ${m[1]}.` : '';
      return { text: `Send case files version ${m[1]} to ${who(h, m[2]!)}.${note}`, due: dueAt(h, sheetDateIso(m[3]!, m[4]!), minutes(m[5]!, m[6]!, m[7]!)) };
    },
  },
  {
    kind: 'office-contact', rank: 11, re: /ADDRESS NOT ON RECORD: .*?ASK THE (.+?) OFFICE TODAY FOR ITS STREET ADDRESS/,
    make: (_m, h, all) => ({
      text: /NUMBER NOT ON RECORD/.test(all) && !/THE OFFICE HAS ASKED/.test(all)
        ? `Ask ${officeName(h)} for its phone number, street address and hearing room.`
        : `Ask ${officeName(h)} for its street address, hearing room and where to report.`,
      due: TODAY(h),
    }),
  },
  {
    kind: 'office-contact', rank: 11, re: /TO CALL THE (.+?) OFFICE: NUMBER NOT ON RECORD/,
    make: (_m, h, all) => (/THE OFFICE HAS ASKED|ADDRESS NOT ON RECORD/.test(all) ? null : { text: `Find ${officeName(h)}’s daytime phone number; the sheet has none.`, due: atReview(h) }),
  },
  {
    kind: 'got-it', rank: 12, re: /THE CONSULTANT'S RECEIPT NAMES NO VERSION: ASK THEM TO REPLY GOT IT (\d+)/,
    make: (m, h) => ({ text: `Ask ${h.consultant ? String(h.consultant) : 'the consultant'} to confirm they have version ${m[1]} of the case files.`, due: atReview(h) }),
  },
  {
    kind: 'clerk-receipt', rank: 12, re: /THE CLERK'S RECEIPT NAMES NO FILES/,
    make: (_m, h) => ({ text: 'Send the clerk the files email that lists every file, and ask for a reply.', due: atReview(h) }),
  },
  {
    kind: 'arrival-time', rank: 13, re: /NO ARRIVAL OR JOIN TIME IS RECORDED IN R: ASK (.+?) WHEN THEY ARRIVED OR JOINED/,
    make: (m, h) => ({ text: `Ask ${name(m[1]!)} what time they arrived, and record it.`, due: atReview(h) }),
  },
  {
    kind: 'homeowner-notice', rank: 14, re: /NO HOMEOWNER NOTICE ON RECORD: SEND IT/,
    make: (_m, h) => ({ text: 'Send the homeowner their hearing notice.', due: atReview(h) }),
  },
  {
    kind: 'tell', rank: 6, re: /^TELL (.+?) \(answers (?:his|her|their) message (\d+)\):?\s*(.*)$/,
    make: (m, h) => {
      const said = (m[3] ?? '').trim();
      const body = said ? `${said.charAt(0).toUpperCase()}${said.slice(1)}` : 'The update the sheet holds.';
      return { text: `Answer ${name(m[1]!)}’s message ${m[2]}: “${body.replace(/\s+$/, '')}${/[.!?]$/.test(body) ? '' : '.'}”`, due: atReview(h) };
    },
  },
  {
    kind: 'no-mobile', rank: 15, re: /([A-Z][A-Z .'-]+?) HAS NO MOBILE NUMBER ON FILE/,
    make: (m, h) => ({ text: `Email ${name(m[1]!)} to ask for a mobile number.`, due: atReview(h) }),
  },
  {
    kind: 'record-decider', rank: 16, re: /NO NAMED PERSON DECIDED THIS DATE-CHANGE REQUEST/,
    make: (_m, h) => ({ text: 'Record who decided to ask for the date change, and when.', due: atReview(h) }),
  },
  {
    kind: 'record-bench', rank: 16, re: /NO RECORD THAT THE BENCH WAS ASKED BEFORE/,
    make: (_m, h) => ({ text: 'Record who on the bench was asked first and said no.', due: atReview(h) }),
  },
  {
    kind: 'record-copy', rank: 16, re: /TYPE THE DATE OF THAT REQUEST IN DA/,
    make: (_m, h) => ({ text: 'Record the date the clearer copy was asked for.', due: atReview(h) }),
  },
  {
    kind: 'record-paper', rank: 16, re: /SENDS ITS NOTICES ON PAPER/,
    make: (_m, h) => ({ text: 'Record the day the paper notice arrived.', due: atReview(h) }),
  },
];

/** Steps that come from the row itself rather than a printed line. */
function rowActions(h: Hearing): Found[] {
  const out: Found[] = [];
  const past = (h.workingDays ?? 0) < 0;
  const when = h.date ? dateShort(h.date) : '';
  const base = { owner: { ...ON_DUTY }, from: [`Hearings W${h.row}`] };
  if (!h.consultant && !past && attended(h) && stillOn(h)) {
    const first = askFirst(h);
    const all = h.printedLines.map((l) => l.text).join(' ');
    const deadline = /OFFICE DEADLINE ([^.]+)\./.exec(all);
    const due = (deadline && dueInText(h, deadline[1]!)) || ((h.dailyList ?? '').startsWith('TOP OF LIST') ? TODAY(h) : atReview(h));
    out.push({
      ...base, id: 'name', kind: 'name', rank: 2,
      text: `${sentence(`Name a consultant for ${when}, ${clockText(minutesOfSheet(h.time))}${/WHO IS NOT ON THIS HEARING: NAME A CONSULTANT/.test(all) ? ', then send the office the replacement notice' : ''}`)}${first ? ` Ask ${first.name} first: ${first.why}.` : ''}`,
      due, from: [`Hearings H${h.row}`, ...(first ? [first.cell] : [])],
    });
  }
  if (h.status === 'RESULT DUE' && past) {
    out.push(h.consultant
      ? { ...base, id: 'result', kind: 'result', rank: 13, text: `Ask ${String(h.consultant)} for the result of the hearing on ${when}, and record it.`, due: atReview(h) }
      : { ...base, id: 'result', kind: 'result', rank: 3, text: `Call ${officeName(h)} today: did anyone attend the hearing on ${when}? Record the result.`, due: TODAY(h) });
    if (!h.consultant) {
      const cover = engine.messages.find((x) => x.properties?.includes(h.property) && /\bcan cover\b/i.test(x.body));
      if (cover) out.push({ ...base, id: 'cover', kind: 'cover', rank: 3, text: `Ask ${cover.sender} whether he was confirmed and attended (he offered to cover, message ${cover.id}), then record it.`, due: TODAY(h) });
      out.push({ ...base, id: 'missed', kind: 'missed', rank: 4, text: 'If it was missed, send the office the good-cause letter, and link the office’s answer as proof.', due: TODAY(h) });
    }
  }
  out.push(...owedAgreement(h, base));
  if (h.status === 'ERROR DUE') out.push({ ...base, id: 'error', kind: 'error', rank: 13, text: `Record whether anything went wrong at the hearing on ${when}.`, due: atReview(h) });
  return out;
}

/**
 * A settlement or withdrawal the firm owes the office (Hearings O), in plain words: who signs, what
 * is wrong with what was sent, and what ends it. Read from the row and the
 * messages that name the property; nothing is typed per case.
 */
function owedAgreement(h: Hearing, base: { owner: TodayAction['owner']; from: string[] }): Found[] {
  const owed = typeof h.owed === 'string' ? h.owed.trim() : '';
  const kind = /^(Settlement|Withdrawal)\b/i.exec(owed)?.[1]?.toLowerCase();
  if (!kind || h.status === 'OWED') return [];
  /* A message about two properties counts here only when it names this one, or names neither by street (N6). */
  const streetOf = (p: string): string => p.split(',')[0]!.trim();
  const about = engine.messages.filter(
    (x) =>
      x.properties?.includes(h.property) &&
      (x.body.includes(streetOf(h.property)) || !x.properties.some((p) => x.body.includes(streetOf(p)))) &&
      !new RegExp(kind === 'settlement' ? 'withdrawal' : 'settlement', 'i').test(x.body),
  );
  const signer = /waits for (\w+)'s signature/i.exec(owed)?.[1] ?? /corrected statement signed by (\w+)/i.exec(about.map((x) => x.body).join(' '))?.[1];
  const full = signer ? (benchFullName(signer) ?? signer) : null;
  const parts: string[] = [];
  if (/sent, not processed/i.test(owed)) {
    const c = h.consultant ? String(h.consultant) : 'The consultant';
    parts.push(`Withdrawal sent, not processed by the office. It ends only when the office’s written confirmation is linked; until then ${c} prepares for this hearing.`);
  } else {
    parts.push(`${kind === 'settlement' ? 'Settlement' : 'Signed withdrawal statement'} owed${full ? `: ${full} signs` : ''}. The coordinator confirms it when the office acknowledges a readable copy.`);
    const wrong = about.find((x) => /names (\w+), but (\w+) is the representative on our record/i.test(x.body));
    const wm = wrong ? /names (\w+), but (\w+) is the representative/i.exec(wrong.body) : null;
    if (wm) parts.push(`The statement signed by ${wm[1]} is not valid: ${wm[2]} is on the office’s record (message ${wrong!.id}).`);
    const photo = about.find((x) => /photographed it/i.test(x.body));
    if (photo) parts.push(`The photo from ${photo.sender.split(' ')[0]} (message ${photo.id}) is unreadable, not counted.`);
    const asked = about.find((x) => /send a clearer copy/i.test(x.body));
    if (asked) parts.push(`A clearer copy was already asked for (message ${asked.id}); do not ask again.`);
  }
  return [{ ...base, id: 'owed-agreement', kind: 'owed-agreement', rank: 3, text: parts.join(' '), due: atReview(h) }];
}

/** "Priya" as "Priya Marden", from the Bench tab. */
function benchFullName(first: string): string | null {
  const row = tab('Bench').rows.find((r) => String(r.cells.A ?? '').trim().split(' ')[0] === first);
  return row ? String(row.cells.A).trim() : null;
}

/** The first name on the docket's Ask next list (Who can take it AV), whoever is named on the hearing. */
function askNextName(h: Hearing): string | null {
  return askFirst(h)?.name ?? null;
}

function minutesOfSheet(t: unknown): number {
  const m = typeof t === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(t.trim()) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

/** 0 when the step is due now or today, 1 otherwise. */
const urgency = (d: TodayAction['due']): number => (d.kind === 'now' || ((d.kind === 'time' || d.kind === 'day') && d.iso === sheetToday()) ? 0 : 1);

/** Ends a sentence once: "9:00 a.m." takes no second full stop. */
const sentence = (s: string): string => (s.endsWith('.') ? s : `${s}.`);

/**
 * One to four plain steps for a hearing, in order: the ones due today (now, by a time, or today)
 * first, then the rest, each group by importance. Each step names an owner: the sheet's Owner (Z)
 * when the step is the sheet's own next action, otherwise "Coordinator on duty", because the data
 * names no one. Every step keeps the cells it came from. `more` counts the steps left out.
 */
export function todayActions(h: Hearing, ctx: TodayContext = {}): { actions: TodayAction[]; more: number } {
  const found: Found[] = [...rowActions(h)];
  const all = h.printedLines.map((l) => l.text).join(' ');
  for (const line of h.printedLines) {
    for (const rule of RULES) {
      const m = rule.re.exec(line.text);
      if (!m) continue;
      const made = rule.make(m, h, all);
      if (!made) continue;
      const cell = `Hearings BE${h.row}, line ${line.n}`;
      const existing = found.find((f) => f.kind === rule.kind);
      if (existing) {
        if (!existing.from.includes(cell)) existing.from.push(cell);
        continue;
      }
      found.push({ id: rule.kind, kind: rule.kind, rank: rule.rank, owner: made.owner ?? { ...ON_DUTY }, from: [cell], text: made.text, due: made.due, ...(made.href ? { href: made.href } : {}) });
    }
  }
  // After a decision in this session, the step becomes the coordinator's: record it on the sheet.
  const approve = found.find((f) => f.kind === 'approve');
  const decision = ctx.changes?.[officeSlug(h.county)];
  if (approve && decision) {
    approve.text = decision.decision === 'approved'
      ? `Record ${h.county}’s approved process on the sheet, then resend the notice.`
      : `Record the rejection of ${h.county}’s change on the sheet.`;
    delete approve.href;
  }
  if (!found.length) {
    found.push({ id: 'read', kind: 'read', rank: 99, owner: { ...ON_DUTY }, from: [`Hearings X${h.row}`], text: 'Read this hearing once today; nothing is due.', due: atReview(h) });
  }
  found.sort((a, b) => urgency(a.due) - urgency(b.due) || a.rank - b.rank);
  const actions = found.slice(0, 4).map(({ rank: _r, kind: _k, ...a }) => a);
  return { actions, more: Math.max(0, found.length - 4) };
}

/** The first step as the one-line reason of an at-risk row. */
export const atRiskReason = (h: Hearing): string => todayActions(h).actions[0]?.text ?? '';

export const TODAY_BLOCK = {
  heading: 'What to do today',
  owner: 'Owner',
  due: 'Due',
  more: (n: number): string => (n === 1 ? '1 more step in what the sheet prints' : `${n} more steps in what the sheet prints`),
  sheetRef: 'Sheet reference',
  asPrinted: 'As printed on the sheet',
} as const;

/* ---------- an office's process change (Tesswick) ---------- */

export interface ProcessCompare {
  oldHeading: string;
  old: string;
  newHeading: string;
  next: string;
  /** "Said by phone by clerk Ren on Tue, Jun 4 (message 22). Not yet confirmed in writing." */
  source: string;
  /** "Tesswick no longer accepts the old process." or null */
  oldAccepted: string | null;
  /** "Affects 2 hearings on Wed, Jun 12 (37 and 52 Meadow Avenue)." */
  affects: string;
}

/** The office's saved route (Offices F) in plain words. */
export function plainRoute(f: string): string {
  return f
    .replace(/\bcase IDs\b/g, 'the case numbers')
    .replace(/\brepresentative name\b/g, 'our consultant’s name')
    .replace(/\bto clerk\b/g, 'to the clerk')
    .replace(/;\s*government acknowledgment required(?: before coverage is recorded as accepted)?\.?/i, '. The office confirms in writing.')
    .replace(/\bnaming the representative\b/g, 'naming our consultant');
}

function streetsJoined(props: string[]): string {
  const parts = props.map((p) => /^(\d+) ([^,]+)/.exec(p)).filter((m): m is RegExpExecArray => !!m);
  if (parts.length === props.length && parts.length > 1 && parts.every((m) => m[2] === parts[0]![2])) {
    const nums = parts.map((m) => m[1]!);
    return `${nums.slice(0, -1).join(', ')} and ${nums.at(-1)} ${parts[0]![2]}`;
  }
  return props.map((p) => p.split(',')[0]!).join(', ');
}

export function processCompare(o: Office): ProcessCompare {
  const c = (col: string): string => String(o.cells[col] ?? '').trim();
  const said = /CHANGED BY (\w+) \(\d+, clerk (\w+)\): ([^.]+)\./.exec(c('K'));
  const m = /^(\w+), clerk (\w+) \(message (\d+)\)/.exec(c('M'));
  const nextRaw = said?.[3] ?? c('M');
  const next = `${nextRaw.charAt(0).toUpperCase()}${nextRaw.slice(1)}.`;
  const channel = (m?.[1] ?? said?.[1] ?? '').toLowerCase();
  const clerk = m?.[2] ?? said?.[2];
  const when = /^\d{4}-\d{2}-\d{2}/.test(c('AT')) ? dateShort(c('AT')) : '';
  const confirmedInWriting = !/not yet confirmed in writing|written confirmation asked/i.test(`${c('K')} ${c('M')}`);
  const source = `Said${channel ? ` by ${channel}` : ''}${clerk ? ` by clerk ${clerk}` : ''}${when ? ` on ${when}` : ''}${m ? ` (message ${m[3]})` : ''}.${confirmedInWriting ? '' : ' Not yet confirmed in writing.'}`;
  const coming = hearings.filter((h) => h.county === o.county && (h.workingDays ?? -1) >= 0);
  const byDate = new Map<string, string[]>();
  for (const h of coming) byDate.set(h.date ?? '', [...(byDate.get(h.date ?? '') ?? []), h.property]);
  const groups = [...byDate.entries()].map(([d, props]) => `${dateShort(d)} (${streetsJoined(props)})`);
  const n = coming.length;
  return {
    oldHeading: 'How we name our consultant now',
    old: plainRoute(c('F')),
    newHeading: `What ${o.county} now asks`,
    next,
    source,
    oldAccepted: /^no$/i.test(c('AS')) ? `${o.county} no longer accepts the old process.` : null,
    affects: n ? `Affects ${n === 1 ? '1 hearing' : `${n} hearings`} on ${groups.join(' and ')}.` : 'No coming hearing is affected.',
  };
}

/* ---------- approval states ---------- */

export type ApprovalStage = 'waiting' | 'approved-here' | 'rejected-here' | 'on-sheet';

export interface ApprovalCopy {
  stage: ApprovalStage;
  heading: string;
  badge: { text: string; tone: Tone };
  body: string;
  /** The Offices table's status cell for the row. */
  rowStatus: string;
  /** The line on each affected hearing. */
  hearingLine: string;
}

/**
 * What the process-change card says. "On the sheet" is read from the sheet (Offices AV is 2 or 3,
 * so a person typed the approval in AQ and AR); the "here" stages come from this session.
 */
export function approvalCopy(o: Office, d: ChangeDecision | undefined): ApprovalCopy {
  const av = Number(o.cells.AV ?? 0);
  const county = o.county;
  if (av === 2 || av === 3) {
    const by = String(o.cells.AQ ?? '').trim();
    const on = String(o.cells.AR ?? '').trim();
    return {
      stage: 'on-sheet',
      heading: `Approved on the sheet${by ? ` by ${by}` : ''}${/^\d{4}-\d{2}-\d{2}/.test(on) ? `, ${dateShort(on)}` : ''}`,
      badge: { text: 'New process in use', tone: 'ok' },
      body: `Notices to ${county} follow the new process.`,
      rowStatus: 'New process in use',
      hearingLine: `Notices to ${county} follow the new process.`,
    };
  }
  if (d?.decision === 'approved') {
    return {
      stage: 'approved-here',
      heading: `Approved by ${d.name ?? 'a person'}, ${d.at}`,
      badge: { text: 'Waiting for the coordinator to record it', tone: 'warn' },
      body: `The coordinator records your approval on the sheet. Notices to ${county} restart after that.`,
      rowStatus: 'Approved here, not yet on the sheet',
      hearingLine: 'Approved here. The notice restarts once the coordinator records it.',
    };
  }
  if (d?.decision === 'rejected') {
    return {
      stage: 'rejected-here',
      heading: `Rejected, ${d.at}`,
      badge: { text: 'Waiting for the coordinator to record it', tone: 'warn' },
      body: `The coordinator clears the change on the sheet. Notices then go by the saved process.`,
      rowStatus: 'Rejected here, not yet on the sheet',
      hearingLine: 'Change rejected here. The coordinator records it on the sheet.',
    };
  }
  return {
    stage: 'waiting',
    heading: `${county} changed how it wants our consultant named`,
    badge: { text: 'Waiting for your decision', tone: 'danger' },
    body: `No notice goes to ${county} until someone approves or rejects the change.`,
    rowStatus: 'Change waits for a decision',
    hearingLine: `Notice waits: ${county} changed its process. Approve or reject it on Offices.`,
  };
}

export const APPROVAL_DIALOG = {
  approveTitle: (county: string): string => `Approve ${county}’s new process?`,
  rejectTitle: (county: string): string => `Reject ${county}’s change?`,
  nameLabel: 'Your name',
  nameError: 'Type your name to approve.',
  approveConsequence: 'Saved in this browser. The coordinator then records it on the sheet.',
  approveNext: (county: string): string => `Next, the coordinator sends ${county}’s staffing form naming our consultant and calls to confirm.`,
  rejectConsequence: (county: string, oldNotAccepted: boolean): string =>
    `The sheet keeps the saved process.${oldNotAccepted ? ` ${county} says it no longer accepts it.` : ''}`,
  approveButton: 'Approve new process',
  rejectButton: 'Reject change',
  cancel: 'Cancel',
  undo: (county: string, what: 'approval' | 'rejection'): string => `Undo the ${what} of ${county}’s change`,
} as const;

/* ---------- confirmations and toasts ---------- */

export const TOASTS = {
  accepted: 'Accepted. The coordinator records it on the sheet.',
  refused: 'Refused. The coordinator records it on the sheet.',
  undone: (what: string): string => `Undone: ${what}.`,
  approved: (county: string): string => `Approved ${county}’s change. The coordinator records it on the sheet.`,
  rejected: (county: string): string => `Rejected ${county}’s change. The coordinator records it on the sheet.`,
  nextStepSaved: 'Saved. The coordinator types it on the sheet.',
  stepDone: (n: number): string => `Step ${n} marked done.`,
  icsDownloaded: 'Downloaded hearings.ics. Import it into the shared calendar.',
  rowsCopied: 'Rows copied. Paste them into the Reader suggestions tab.',
  clockChanged: (t: string): string => `Clock set to ${t}.`,
} as const;

export const CONFIRMS = {
  accept: (gate: GateKey, address: string): string => `Accept this message as proof that ${GATE_NAME[gate]} for ${address}?`,
  refuse: (gate: GateKey, address: string): string => `Refuse this message as proof that ${GATE_NAME[gate]} for ${address}?`,
  confirm: 'Confirm',
  cancel: 'Cancel',
  markDone: (n: number, open: number): string => `Mark step ${n} done with ${open} ${open === 1 ? 'decision' : 'decisions'} still open?`,
  reset: 'Reset the example? Every decision made here is cleared.',
} as const;

/** Accessible names that say the action and the target once. */
export const NAMES = {
  openHearing: (h: Hearing): string => `Open hearing ${h.case}, ${h.property.split(',')[0]}`,
  moreLines: (n: number, caseId: string): string => `Show ${n} more lines for ${caseId}`,
  acceptProof: (office: string, date: string, gate: GateKey, address: string): string => `Accept: the ${office} office’s message of ${date} proves ${GATE_NAME[gate]} for ${address}`,
  undoAccept: (caseId: string, gate: GateKey): string => `Undo accept for ${caseId}, ${GATE_NAME[gate]}`,
  approveChange: (county: string): string => `Approve ${county}’s change`,
  help: 'Help for this page',
} as const;

export const FIRST_RUN = {
  title: 'New here? Take a 2-minute tour.',
  start: 'Take the tour',
  skip: 'Skip',
} as const;

export const EMPTY = {
  hearingsFilter: { title: 'No hearing matches this filter', body: 'Choose All to see every hearing.' },
  dailyList: { title: 'Nothing on this list', body: 'Choose All to see every flagged hearing.' },
  suggestions: { title: 'Every proof link has a yes or no', body: 'Go to step 2 of the 9:00 a.m. pass.' },
  offices: { title: 'No office change waits', body: 'Nothing to approve today.' },
  notFound: { title: 'There is no page here', body: 'Check the link, or choose a page below.' },
} as const;
