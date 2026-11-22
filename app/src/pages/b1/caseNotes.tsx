/**
 * Key facts for one hearing: short labelled lines that
 * the sheet otherwise prints only in capitals under "Sheet reference". Two sources:
 * - the sheet itself (the Record check tab, the Dockets tab and the Hearings tab's printed lines),
 *   read and put in plain words here;
 * - the example week's messages, cited by number, for the few facts no formula prints
 *   (a settlement's signer, a withdrawal not yet processed, an office's arrival rule).
 * Each line is one fact with its source. Nothing here is sent.
 */

import { isValidElement, type ReactNode } from 'react';
import { todayActions } from '@/lib/copy';
import type { Hearing } from '@/types/data';
import { tab } from '@/lib/data';
import { dateShort } from '@/lib/format';
import { Block, State } from '@/layout/Regions';

export interface Note {
  label: string;
  text: ReactNode;
  tone?: 'warn' | 'danger';
  testId?: string;
  /** Shown even when "What to do today" cites the same message (the files receipts, E31). */
  keep?: boolean;
}

const B = ({ children }: { children: ReactNode }) => <span className="font-medium text-ink">{children}</span>;

/** The replacement order when a consultant says no or gives no day-before yes. */
export const LADDER: Note = {
  label: 'If no yes',
  testId: 'replacement-ladder',
  text: (
    <>
      <B>1</B> by 2:00 p.m. offer it to the next name on Ask next; <B>2</B> at 4:00 p.m. the office’s alternate; <B>3</B> after 4:00 p.m. phone down Ask next. Then the files are re-sent and the office told; each stays owed until proved. Owner: coordinator on duty.
    </>
  ),
};

/** The firm's rule for asking an office to move a date. */
const DATE_RULE: Note = {
  label: 'Date-change rule',
  testId: 'date-change-rule',
  text: 'Ask an office to move a hearing only after the bench was offered it on its own date, with the homeowner’s written yes, and never for a hearing a consultant accepted. The named coordinator decides.',
};

/** Facts from the example week's messages, by case. Short, with the message number. */
const BY_CASE: Record<string, Note[]> = {
  'AX-101': [
    { label: 'First case at opening', text: 'The office opens at 9:00 a.m., so the slot and the alternate are arranged the working day before: today.' },
    { label: 'Office deadline', text: <>Name our consultant by <B>Fri, Jun 7, 4:00 p.m.</B> The office has asked 3 times (message 6).</> },
    { label: 'Void draft', tone: 'warn', text: 'The draft notice naming Maya Venn is void, not proof: she cannot get there for 9:00 a.m. (message 5).' },
  ],
  'AX-102': [
    { label: 'Office deadline', text: <>Name our consultant by <B>Fri, Jun 7, 4:00 p.m.</B> The office has asked 3 times (message 6).</> },
    { label: 'Maya Venn', tone: 'warn', text: 'Said yes to 9:30 a.m. (message 5), then reported ill on Wed, Jun 5 (message 41).' },
  ],
  'AX-103': [{ label: 'Answer to Leo Arlen', text: 'Message 12: Tue, Jun 11 stands. His calendar edit to Jun 13 (message 10) was wrong, and the hearing is offered to others.' }],
  'AX-104': [{ label: 'Answer to Leo Arlen', text: 'Message 12: Tue, Jun 11 stands. His calendar edit to Jun 13 (message 10) was wrong, and the hearing is offered to others.' }],
  'AX-105': [
    { label: 'Date moved', text: <>Only 9 Orchard Road moved, to <B>Tue, Jun 18, 9:00 a.m.</B> The Orimere office agreed in writing (message 17). Nora Pell’s yes for Jun 18 is in (message 18).</> },
    { label: 'Tell Nora Pell', text: 'Only this hearing moved and only its files go to her. 24 Orchard Road stays Wed, Jun 12 and is not hers.' },
    { label: 'Rule broken', tone: 'warn', text: 'The move was asked for a hearing Nora had already accepted. Who decided it is not recorded.' },
    DATE_RULE,
  ],
  'AX-106': [
    { label: 'Tell Nora Pell', text: <>24 Orchard Road stays <B>Wed, Jun 12, 2:00 p.m.</B> and is not hers; the office could not move it (message 17). Only 9 Orchard Road’s files go to her.</> },
    DATE_RULE,
  ],
  'AX-107': [
    { label: 'Not proof', text: <>The voicemail (message 21) and clerk Ren’s call (message 22) do not prove our name is on record. <a className="l-link" href="#/?decide=tesswick">Tesswick’s change</a></> },
  ],
  'AX-108': [
    { label: 'Not proof', text: <>The voicemail (message 21) and clerk Ren’s call (message 22) do not prove our name is on record. <a className="l-link" href="#/?decide=tesswick">Tesswick’s change</a></> },
  ],
  'AX-109': [
    { label: 'Settlement owed', tone: 'warn', testId: 'owed-settlement', text: <><B>Priya Marden</B> signs; Brindlefen requires the attending consultant’s signature (message 27). The coordinator confirms when the office acknowledges a readable copy.</> },
    { label: 'Name on record', text: 'Our file lists Priya; the office has not confirmed her in writing (message 25).' },
  ],
  'AX-110': [
    { label: 'Withdrawal owed', tone: 'warn', testId: 'owed-withdrawal', text: <>Owen’s signature is not valid: <B>Priya Marden</B> is on the office’s record (message 28). Priya signs a corrected statement; the coordinator confirms when the office acknowledges a readable copy.</> },
    { label: 'Not counted', text: 'Priya’s photo (message 29) is unreadable.' },
    { label: 'Already asked', text: 'For a clearer copy (message 30). Do not ask again.' },
  ],
  'AX-111': [
    { label: 'Files with the clerk', keep: true, testId: 'files-clerk', text: 'Done: message 34, version 2.' },
    { label: 'Files with Eli Corven', keep: true, tone: 'warn', testId: 'files-consultant', text: <>Missing: message 35 confirms version 1, not 2. Send version 2; he replies GOT IT 2. <a className="l-link" href="#/bench?view=dockets">Drafted message</a></> },
  ],
  'AX-112': [
    { label: 'Files with the clerk', tone: 'warn', text: 'Missing: the clerk could not open the file (message 34). Resend version 2.' },
    { label: 'Files with Eli Corven', tone: 'warn', text: <>Missing: Eli has version 1 (message 35). Send version 2 and ask him to reply GOT IT 2. <a className="l-link" href="#/bench?view=dockets">Drafted message</a></> },
  ],
  'AX-113': [
    { label: 'Maya Venn', text: 'Reported ill the evening before (message 41).' },
    { label: 'Owen Tarris', text: 'Offered to cover both Brook Road hearings (message 42). No confirmation is on record.' },
    { label: 'Office rule', testId: 'arrival-rule', text: 'Arrive 15 minutes before the first case (message 40).' },
  ],
  'AX-114': [
    { label: 'Maya Venn', text: 'Reported ill the evening before (message 41).' },
    { label: 'Owen Tarris', text: 'Offered to cover both Brook Road hearings (message 42). No confirmation is on record.' },
    { label: 'Office rule', testId: 'arrival-rule', text: 'Arrive 15 minutes before the first case (message 40).' },
  ],
  'AX-115': [
    { label: 'Date moved', text: <>To <B>Thu, Jun 13, 10:00 a.m.</B> by the office’s written notice (message 47). The clerk’s phone call (message 46) alone did not move it. No message names who at the office decided.</> },
    { label: 'Date pending', keep: true, tone: 'warn', testId: 'date-pending', text: <>Jun 13 is pending: message 47 is not counted yet. Old date: Thu, Jun 6.</> },
    { label: 'Notice', text: 'Paper notice: a written government source (message 43).' },
    { label: 'Reply to Leo Arlen', text: 'Message 48: 48 Linden Avenue moved to Thu, Jun 13, room D; 66 Linden Avenue stayed Thu, Jun 6. He cannot attend Jun 13, so this hearing is offered to others.' },
  ],
  'AX-116': [{ label: 'Notice', text: 'Paper notice: a written government source (message 43). It stayed on Thu, Jun 6 (message 47).' }],
  'AX-117': [
    { label: 'Withdrawal', tone: 'warn', testId: 'withdrawal-pending', text: 'Sent (message 52); it ends only when the office’s written confirmation is linked. Tell Nora Pell: prepare both (her message 54).' },
  ],
  'AX-118': [{ label: 'Still listed', text: 'The office lists it for Fri, Jun 14 (message 53). Nora Pell prepares it.' }],
  'AX-119': [{ label: 'Statement due', tone: 'warn', text: <>By <B>Fri, Jun 7, 4:00 p.m.</B> The office asks for Sat, Jun 8 (message 59), a day it is closed.</> }],
  'AX-120': [{ label: 'Decision letter', testId: 'waiting-decision', text: 'The board’s written decision is not in yet (message 59). Ask the office every Friday.' }],
  'AX-123': [
    { label: 'Files with the clerk', keep: true, tone: 'warn', testId: 'files-clerk', text: 'Missing: message 70 names no files. Send the email that names every file, version 2.' },
    { label: 'Files with the consultant', keep: true, tone: 'warn', testId: 'files-consultant', text: 'Missing: message 71 names no version. Ask for GOT IT 2.' },
    { label: 'Repeat', text: 'Message 72 repeats message 70: no change, no new proof.' },
  ],
  'AX-124': [
    { label: 'Repeat', text: 'Message 72 repeats message 70: no change, no new proof.' },
  ],
};

/* ---------- read from the sheet ---------- */

/** The Record check tab's capitals in plain words: "RECORD SAYS Thu 13 Jun, THE COUNTY SAYS Tue 11 Jun". */
function plainRecord(raw: string): string {
  let s = raw
    .replace(/^RECORD (SAYS|POINTS TO) /, (_m, v: string) => `Our case record ${v.toLowerCase()} `)
    .replace(/, (THE|BUT) /g, (_m, w: string) => `; ${w.toLowerCase()} `)
    .replace(/: /g, '; ')
    .replace(/\b([A-Z]+)\b/g, (w) => w.toLowerCase())
    .replace(/(\w{3}) (\d{1,2}) (\w{3})\b/g, '$1, $3 $2');
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

/** The Record check tab's disagreements for a case: field and the two values. */
export function recordDisagreements(): { case: string; field: string; text: string }[] {
  const t = tab('Record check');
  const out: { case: string; field: string; text: string }[] = [];
  const FIELD: Record<string, string> = { H: 'Date or time', I: 'Consultant', J: 'Case files', K: 'Status' };
  for (const r of t.rows) {
    if (r.row <= (t.headerRow ?? 0)) continue;
    const c = String(r.cells.A ?? '');
    if (!/^AX-\d+$/.test(c)) continue;
    for (const col of ['H', 'I', 'J', 'K']) {
      const v = r.cells[col];
      if (v != null && String(v).trim()) out.push({ case: c, field: FIELD[col]!, text: plainRecord(String(v).trim()) });
    }
  }
  return out;
}

export interface Docket {
  row: number;
  date: string;
  office: string;
  format: string;
  hearings: number;
  heldBy: string;
  offerTo: string;
  offer: string;
  dayBefore: string;
  toOffice: string;
  askNext: string;
}

const s = (v: unknown): string => (v == null ? '' : String(v));

/** The Dockets tab: one row for each office, day and format from today on. */
export function dockets(): Docket[] {
  const t = tab('Dockets');
  return t.rows
    .filter((r) => r.row > (t.headerRow ?? 0) && /^\d{4}-\d{2}-\d{2}$/.test(s(r.cells.A)))
    .map((r) => ({
      row: r.row,
      date: s(r.cells.A),
      office: s(r.cells.B),
      format: s(r.cells.C),
      hearings: Number(r.cells.D ?? 0),
      heldBy: s(r.cells.E),
      offerTo: s(r.cells.G),
      offer: s(r.cells.H),
      dayBefore: s(r.cells.I),
      toOffice: s(r.cells.N),
      askNext: s(r.cells.O),
    }));
}

export function docketOf(h: Hearing): Docket | undefined {
  return dockets().find((d) => d.date === h.date && d.office === h.county && d.format.toLowerCase() === String(h.format ?? '').toLowerCase());
}

/** A note's words without markup, to compare with the hearing's to-do steps. */
function plain(n: ReactNode): string {
  if (n == null || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(plain).join('');
  if (isValidElement<{ children?: ReactNode }>(n)) return plain(n.props.children);
  return '';
}

const cited = (s: string): string[] => [...s.matchAll(/message (\d+)/g)].map((m) => m[1]!);

/** The lines this hearing shows: the case's own facts, then what the sheet prints, in plain words. */
export function caseNotes(h: Hearing): Note[] {
  // A fact already said in "What to do today" (the same messages cited there) is not repeated here.
  let todo = '';
  try {
    todo = todayActions(h).actions.map((a) => a.text).join(' ');
  } catch {
    todo = '';
  }
  const said = new Set(cited(todo));
  const out: Note[] = (BY_CASE[h.case] ?? []).filter((n) => {
    if (n.keep) return true;
    const c = cited(plain(n.text));
    return !(c.length && c.every((x) => said.has(x)));
  });
  const printed = h.printedLines.map((l) => l.text).join('\n');
  for (const d of recordDisagreements().filter((x) => x.case === h.case)) {
    out.push({ label: `Case record: ${d.field.toLowerCase()}`, tone: 'warn', testId: `record-differs-${h.case}`, text: d.text });
  }
  if (/NO VIDEO LINK YET|VIDEO ROOM ONLY, NO LINK/.test(printed)) {
    out.push({ label: 'Video link', testId: 'no-video-link', text: 'None yet. The schedule check stays open until one is on record.' });
  }
  if (/NO HOMEOWNER NOTICE ON RECORD/.test(printed)) {
    out.push({ label: 'Homeowner notice', testId: 'homeowner-notice', text: 'None on record. Send it, then record its date.' });
  }
  const phone = /NUMBER NOT ON RECORD/.test(printed);
  const addr = /ADDRESS NOT ON RECORD/.test(printed);
  if (phone || addr) {
    out.push({ label: 'Office contact', text: `No ${[phone ? 'phone number' : '', addr ? 'street address' : ''].filter(Boolean).join(' or ')} yet. Ask in the season email.` });
  }
  return out;
}

/** The block above "What to do today". */
export function CaseNotes({ h }: { h: Hearing }) {
  const notes = caseNotes(h);
  const d = docketOf(h);
  if (!notes.length && !d) return null;
  return (
    <Block title="Key facts" testId="case-notes">
      <dl className="grid grid-cols-[minmax(0,152px)_minmax(0,1fr)] gap-x-4 gap-y-2 text-body max-sm:grid-cols-1">
        {notes.map((n, i) => (
          <div key={`${n.label}-${i}`} className="contents" data-testid={n.testId}>
            <dt className="text-small leading-6 font-medium text-ink-2">{n.tone ? <State tone={n.tone}>{n.label}</State> : n.label}</dt>
            <dd className="m-0 leading-6 text-ink">{n.text}</dd>
          </div>
        ))}
        {d ? (
          <div className="contents">
            <dt className="text-small leading-6 font-medium text-ink-2">Docket</dt>
            <dd className="m-0 leading-6 text-ink">
              {d.office}, {dateShort(d.date)}, {d.format}: {d.hearings === 1 ? '1 hearing' : `${d.hearings} hearings`}.{' '}
              <a className="l-link" href={`#/today/9am?view=dockets&docket=${d.row}`} data-testid={`docket-link-${h.case}`}>
                Its offer text
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </Block>
  );
}
