/**
 * The consultant page's data: what one consultant needs to know about their own hearings, read
 * from the sheet export (Hearings, Bench, Availability, Settings) and the packet's documents. Every
 * sentence a consultant reads is either the sheet's own day-before text (Hearings AT) or built
 * from a cell; nothing is typed here as a fact. Cell references never reach the consultant.
 */

import type { CellValue, Hearing } from '@/types/data';
import { byNearest, engine, hearings, sheetToday, tab } from '@/lib/data';
import { clockText, dateLong, sheetTime } from '@/lib/format';

export interface Consultant {
  name: string;
  /** URL id: "owen-tarris". The packet id ("R04") also opens the page. */
  slug: string;
  packetId: string | null;
  email: string;
  /** Bench C: "email", "text" or "phone". */
  channel: string;
  /** Bench G: "None", "Free/busy only", "Shared work calendar". */
  calendar: string;
  /** Bench R: 2 = text and call, 1 = call only, 0 = email only. */
  reach: number;
}

export interface CaseFile {
  name: string;
  title: string;
  version: number | null;
  text: string;
  current: boolean;
}

export interface Agreement {
  /** "Settlement" or "Withdrawal". */
  kind: string;
  /** Why this consultant signs, in plain words. */
  why: string;
  /** A sentence about an earlier copy, when there is one. */
  earlier: string | null;
  homeowner: string | null;
}

export type FilesState = 'none' | 'old' | 'current';

export interface ConsultantHearing {
  h: Hearing;
  caseId: string;
  property: string;
  county: string;
  date: string;
  time: string;
  /** Minutes after midnight, for sorting and the docket. */
  minutes: number;
  inPerson: boolean;
  /** A video hearing with a room letter and no link: video or in person is not confirmed yet. */
  formatOpen: boolean;
  place: { title: string; detail: string };
  arrival: string | null;
  bring: string;
  bringWhat: string | null;
  files: CaseFile[];
  filesVersion: number | null;
  filesState: FilesState;
  filesYours: number | null;
  /** G2 is proved on the sheet: they said yes to the offer. */
  saidYes: boolean;
  notes: string[];
  agreement: Agreement | null;
  timeZone: string;
  /** This consultant's day-before text for the docket, as the sheet prints it (Hearings AT). */
  dayBefore: string | null;
}

export interface PastHearing {
  caseId: string;
  property: string;
  date: string;
  time: string;
  result: string;
}

/** The firm's telephone number, as the sheet's day-before texts print it. */
export function firmPhone(): string | null {
  for (const h of hearings) {
    const m = /call (\d{3}-\d{4})/.exec(String(h.dayBeforeTexts ?? ''));
    if (m) return m[1]!;
  }
  return null;
}

export function slugOf(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const str = (v: CellValue | null | undefined): string => (v == null ? '' : String(v).trim());
const num = (v: CellValue | null | undefined): number | null => (typeof v === 'number' ? v : v != null && /^-?\d+$/.test(String(v).trim()) ? Number(v) : null);

interface PacketConsultant {
  name: string;
  consultant_id: string;
}
interface PacketDocument {
  name: string;
  kind: string;
  version: number | null;
  case_id: string | null;
  fields: Record<string, string>;
  text: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function packetList<T>(key: string, ok: (v: Record<string, unknown>) => boolean): T[] {
  const list = engine.packet[key];
  return Array.isArray(list) ? (list.filter((v) => isObj(v) && ok(v)) as T[]) : [];
}

const packetConsultants = (): PacketConsultant[] => packetList<PacketConsultant>('consultants', (v) => typeof v.name === 'string' && typeof v.consultant_id === 'string');
const packetDocuments = (): PacketDocument[] => packetList<PacketDocument>('documents', (v) => typeof v.name === 'string' && typeof v.text === 'string');

/** The six consultants of the Bench tab, in its order. */
export function consultants(): Consultant[] {
  const ids = packetConsultants();
  return tab('Bench')
    .rows.filter((r) => str(r.cells.A) !== '' && str(r.cells.B).includes('@'))
    .map((r) => {
      const name = str(r.cells.A);
      return {
        name,
        slug: slugOf(name),
        packetId: ids.find((c) => c.name === name)?.consultant_id ?? null,
        email: str(r.cells.B),
        channel: str(r.cells.C),
        calendar: str(r.cells.G),
        reach: num(r.cells.R) ?? 0,
      };
    });
}

export function consultantById(id: string): Consultant | undefined {
  const k = id.trim().toLowerCase();
  return consultants().find((c) => c.slug === k || c.packetId?.toLowerCase() === k);
}

const minutesOf = (t: CellValue | null): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(str(t));
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};

/** Splits Hearings AT ("To Maya Venn: ... To Leo Arlen: ...") and returns this consultant's text. */
export function dayBeforeFor(h: Hearing, name: string): string | null {
  const all = str(h.dayBeforeTexts);
  if (!all) return null;
  const parts = all.split(/(?=To [A-Z][a-z]+ [A-Z][a-z]+: )/);
  const mine = parts.find((p) => p.startsWith(`To ${name}: `));
  return mine ? mine.slice(`To ${name}: `.length).trim() : null;
}

/** The sheet writes "(ADDRESS NOT ON RECORD: Offices BA5)" where the address will go: a consultant sees "[address]", as the sheet already writes "[link]". */
export function forConsultant(text: string): string {
  return text.replace(/\s*\(ADDRESS NOT ON RECORD:[^)]*\)/g, ' [address]').replace(/\s+/g, ' ').trim();
}

/** Sentences end at a full stop before a capital letter, so "10:30 a.m. and" stays whole. */
const sentences = (text: string): string[] => text.split(/(?<=\.)\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);

function arrivalOf(h: Hearing, text: string | null): string | null {
  if (text) {
    const keep = sentences(text).filter((s) => /^(Please be at|Please text IN|Your arrival time)/.test(s));
    if (keep.length) return keep.join(' ');
  }
  const at = num(h.cells.DL) ?? num(h.cells.CL);
  return at != null && at >= 0 ? `Please be at the office by ${clockText(at)}.` : null;
}

function placeOf(h: Hearing, inPerson: boolean): { title: string; detail: string } {
  if (inPerson) {
    const addr = str(h.officeAddress);
    const known = addr !== '' && !addr.startsWith('ADDRESS NOT ON RECORD');
    return { title: `${h.county} hearing office`, detail: known ? addr : 'The address is not on record yet. It comes with the day-before text.' };
  }
  const room = str(h.room);
  if (room && !/^https?:/.test(room)) return { title: `${h.county} board, ${room}`, detail: 'Video or in person: the firm confirms by the day-before text.' };
  return { title: `Video, ${h.county} board${room ? `, ${room}` : ''}`, detail: 'The link comes with the day-before text.' };
}

function filesOf(caseId: string, current: number | null): CaseFile[] {
  return packetDocuments()
    .filter((d) => d.case_id === caseId && d.kind === 'packet')
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))
    .map((d) => ({ name: d.name, title: `Case files, version ${d.version ?? ''}`.trim(), version: d.version, text: d.text, current: d.version === current }));
}

function contentsOf(files: CaseFile[]): string | null {
  const cur = files.find((f) => f.current);
  const m = cur ? /^Contents: (.+)$/m.exec(cur.text) : null;
  return m ? m[1]!.replace(/\.$/, '').replace(/, ([^,]+)$/, ' and $1') : null;
}

function agreementOf(h: Hearing, name: string): Agreement | null {
  const owed = str(h.owed);
  const kind = /^(Settlement|Withdrawal)\b/.exec(owed)?.[1];
  const signer = str(h.cells.BP);
  if (!kind || !signer.startsWith(name)) return null;
  const unreadable = /unreadable/i.test(owed);
  if (!/signature/i.test(owed) && !unreadable) return null;
  const why = /who attends/.test(signer)
    ? `The ${h.county} office asks the person who attends to sign.`
    : `The ${h.county} office asks the person on its record to sign.`;
  return {
    kind,
    why,
    earlier: unreadable ? 'The office could not read the copy you sent. Please sign again here.' : null,
    homeowner: str(h.homeowner) || null,
  };
}

function notesOf(h: Hearing): string[] {
  const out: string[] = [];
  if (str(h.dailyList).includes('ILLNESS REPORTED')) out.push('You told us you were ill. Tell us if you can still attend this hearing.');
  if (/^Withdrawal: sent/i.test(str(h.owed))) out.push('The homeowner asked to withdraw. The hearing stays on until the office confirms it in writing.');
  return out;
}

function toHearing(h: Hearing, name: string): ConsultantHearing {
  const inPerson = str(h.format).toLowerCase() === 'in person';
  const dayBefore = dayBeforeFor(h, name);
  const filesVersion = num(h.filesCurrent);
  const filesYours = num(h.filesConsultant);
  const files = filesOf(h.case, filesVersion);
  const what = contentsOf(files);
  const ofFiles = filesVersion != null ? `version ${filesVersion} of the case files` : 'the case files';
  return {
    h,
    caseId: h.case,
    property: h.property,
    county: h.county,
    date: h.date ?? '',
    time: sheetTime(h.time),
    minutes: minutesOf(h.time),
    inPerson,
    formatOpen: !inPerson && !!str(h.room) && !/^https?:/.test(str(h.room)),
    place: placeOf(h, inPerson),
    arrival: arrivalOf(h, dayBefore),
    bring: inPerson ? `Bring ${ofFiles}.` : `Have ${ofFiles} open.`,
    bringWhat: what,
    files,
    filesVersion,
    filesYours,
    filesState: filesYours == null ? 'none' : filesVersion != null && filesYours < filesVersion ? 'old' : 'current',
    saidYes: h.gates.G2?.state === 'proved',
    notes: notesOf(h),
    agreement: agreementOf(h, name),
    timeZone: h.timeZoneSentence ?? '',
    dayBefore: dayBefore ? forConsultant(dayBefore) : null,
  };
}

const stillOn = (h: Hearing): boolean => str(h.stillOn).toLowerCase() !== 'no';

/** This consultant's coming hearings (the sheet's day and after), nearest first. */
export function comingFor(c: Consultant): ConsultantHearing[] {
  const today = sheetToday();
  return hearings
    .filter((h) => str(h.consultant) === c.name && (h.date ?? '') >= today && stillOn(h))
    .sort(byNearest)
    .map((h) => toHearing(h, c.name));
}

export function pastFor(c: Consultant): PastHearing[] {
  const today = sheetToday();
  return hearings
    .filter((h) => str(h.consultant) === c.name && (h.date ?? '9999') < today)
    .sort(byNearest)
    .map((h) => ({ caseId: h.case, property: h.property, date: h.date ?? '', time: sheetTime(h.time), result: str(h.result).replace(/^./, (ch) => ch.toUpperCase()) }));
}

/** The clock time in the arrival sentence ("be at the office by 10:30 a.m."), for the agenda. */
export function arriveBy(x: ConsultantHearing): string | null {
  return /\bby (\d{1,2}:\d{2} [ap]\.m\.)/.exec(x.arrival ?? '')?.[1] ?? null;
}

/** Days within a week of the sheet's day ("this week") and the rest ("later"). */
export function splitWeek(list: ConsultantHearing[]): { week: ConsultantHearing[]; later: ConsultantHearing[] } {
  const t = new Date(`${sheetToday()}T00:00:00Z`).getTime();
  const inWeek = (d: string): boolean => (new Date(`${d}T00:00:00Z`).getTime() - t) / 86_400_000 < 7;
  return { week: list.filter((x) => inWeek(x.date)), later: list.filter((x) => !inWeek(x.date)) };
}

export function byDay(list: ConsultantHearing[]): { date: string; label: string; items: ConsultantHearing[] }[] {
  const days = [...new Set(list.map((x) => x.date))];
  return days.map((d) => ({ date: d, label: dateLong(d).replace(/, \d{4}$/, ''), items: list.filter((x) => x.date === d) }));
}

/** The day-before texts this consultant gets, one for each docket (hearings on one day at one office). */
export function textsFor(list: ConsultantHearing[]): { text: string; items: ConsultantHearing[] }[] {
  const out: { text: string; items: ConsultantHearing[] }[] = [];
  for (const x of list) {
    if (!x.dayBefore) continue;
    const have = out.find((o) => o.text === x.dayBefore);
    if (have) have.items.push(x);
    else out.push({ text: x.dayBefore, items: [x] });
  }
  return out;
}
