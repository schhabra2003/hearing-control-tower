/**
 * The typed data layer: the only place that reads src/data/*.json. Pages read numbers and text
 * through these functions, never by importing the JSON themselves, and never type a figure.
 */

import sheetJson from '@data/sheet.json';
import engineJson from '@data/engine.json';
import evidenceJson from '@data/evidence.json';
import type { CellValue, EngineData, EvidenceData, GateKey, Hearing, SheetData, Tab, TabRow } from '@/types/data';

export const sheet = sheetJson as SheetData;
export const engine = engineJson as EngineData;
export const evidence = evidenceJson as EvidenceData;

export const useSheet = (): SheetData => sheet;
export const useEngine = (): EngineData => engine;
export const useEvidence = (): EvidenceData => evidence;

/* ---------- tabs and cells ---------- */

export function tab(name: string): Tab {
  const t = sheet.tabs[name];
  if (!t) throw new Error(`The sheet export has no tab "${name}".`);
  return t;
}

export function tabRow(name: string, row: number): TabRow | undefined {
  return tab(name).rows.find((r) => r.row === row);
}

export interface CellRef {
  tab: string;
  /** "B3" */
  ref: string;
  column: string;
  row: number;
  value: CellValue | null;
  /** The column's heading on that tab, when the tab has a heading row. */
  heading: string | null;
}

const REF = /^([A-Z]{1,3})(\d+)$/;

/** A cell of any tab except Hearings, by reference: cell('Measures', 'B3'). */
export function cell(tabName: string, ref: string): CellRef {
  const m = REF.exec(ref);
  if (!m) throw new Error(`Not a cell reference: ${ref}`);
  const column = m[1]!;
  const row = Number(m[2]);
  const t = tab(tabName);
  const value = t.rows.find((r) => r.row === row)?.cells[column] ?? null;
  return { tab: tabName, ref, column, row, value, heading: t.headers[column] ?? null };
}

export function cellText(tabName: string, ref: string): string {
  const v = cell(tabName, ref).value;
  return v == null ? '' : String(v);
}

export function cellNumber(tabName: string, ref: string): number | null {
  const v = cell(tabName, ref).value;
  return typeof v === 'number' ? v : null;
}

/** Settings B2: the day the example sheet stands on ("2030-06-07"). */
export function sheetToday(): string {
  const v = cell('Settings', 'B2').value;
  if (typeof v !== 'string') throw new Error('Settings B2 holds no date.');
  return v;
}

/** Settings B15: the time of day the sheet's lines are computed for ("14:00"), or null when empty. */
export function sheetTimeOfDay(): string | null {
  const v = cell('Settings', 'B15').value;
  return typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v) ? v : null;
}

/* ---------- hearings ---------- */

export const hearings: Hearing[] = sheet.hearings.rows;

export function hearingByCase(caseId: string): Hearing | undefined {
  return hearings.find((h) => h.case === caseId);
}

export function hearingByRow(row: number): Hearing | undefined {
  return hearings.find((h) => h.row === row);
}

/** The Hearings column letter of a named field ("status" is "W"). */
export function hearingColumn(field: string): string {
  const c = sheet.hearings.columns[field];
  if (!c) throw new Error(`No Hearings column for the field "${field}".`);
  return c;
}

/** The phrases of the daily list (Hearings X) as the sheet starts them; the longest is matched first. */
const LIST_PHRASES = [
  'TOP OF LIST: OWED',
  'NOBODY NAMED: POSSIBLY MISSED',
  'OFFICE CANNOT FIND OUR NOTICE',
  'OPENING NOT ARRANGED',
  'ARRIVAL NOT SETTLED',
  'CALL THE HOMEOWNER',
  'ILLNESS REPORTED',
  'NOTICE BLOCKED',
  'CONFIRM TODAY',
  'FALLBACK DUE',
  'TOP OF LIST',
  'RESULT DUE',
  'ERROR DUE',
  'REVIEW',
];

/** Splits Hearings X into its phrases. Words the list does not know stay together as one phrase. */
export function listPhrases(x: string | null | undefined): string[] {
  if (!x) return [];
  const out: string[] = [];
  let rest = x.trim();
  let unknown = '';
  while (rest.length) {
    const hit = LIST_PHRASES.find((p) => rest === p || rest.startsWith(`${p} `));
    if (hit) {
      if (unknown.trim()) out.push(unknown.trim());
      unknown = '';
      out.push(hit);
      rest = rest.slice(hit.length).trimStart();
    } else {
      const sp = rest.indexOf(' ');
      unknown += `${sp < 0 ? rest : rest.slice(0, sp)} `;
      rest = sp < 0 ? '' : rest.slice(sp + 1);
    }
  }
  if (unknown.trim()) out.push(unknown.trim());
  return out;
}

export type ListGroup = 'top' | 'nobody' | 'confirm' | 'due' | 'review';

export const LIST_GROUPS: { id: ListGroup; title: string; sentence: string }[] = [
  { id: 'top', title: 'Top of list', sentence: 'Due within a working day, blocked, or owed.' },
  { id: 'nobody', title: 'Held: nobody named', sentence: 'Held with no consultant named: possibly missed.' },
  { id: 'confirm', title: 'Confirm today', sentence: 'Ready or nearly ready; confirm with the consultant today.' },
  { id: 'due', title: 'Result or error due', sentence: 'Held, and the result or the error is still to be typed.' },
  { id: 'review', title: 'Review', sentence: 'Coming hearings to read once today.' },
];

/** The group of a daily-list row, by the first phrase the sheet prints in X. */
export function listGroup(x: string | null | undefined): ListGroup | null {
  const first = listPhrases(x)[0];
  if (!first) return null;
  if (first.startsWith('TOP OF LIST')) return 'top';
  if (first.startsWith('NOBODY NAMED')) return 'nobody';
  if (first === 'CONFIRM TODAY') return 'confirm';
  if (first === 'RESULT DUE' || first === 'ERROR DUE') return 'due';
  return 'review';
}

const minutesOf = (t: unknown): number => {
  const m = typeof t === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(t.trim()) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};

/** Nearest hearing first: by date, then by the time typed in E, then by sheet row. */
export function byNearest(a: Hearing, b: Hearing): number {
  return (a.date ?? '9999').localeCompare(b.date ?? '9999') || minutesOf(a.time) - minutesOf(b.time) || a.row - b.row;
}

/** The daily list: rows whose X is not empty, grouped in the order of LIST_GROUPS, nearest hearing first in each group. */
export function dailyList(): { group: (typeof LIST_GROUPS)[number]; rows: Hearing[] }[] {
  return LIST_GROUPS.map((group) => ({
    group,
    rows: hearings.filter((h) => listGroup(h.dailyList) === group.id).sort(byNearest),
  }));
}

/** The flat list order (the order of dailyList, then the rows not on the list, nearest first). */
export function listOrder(): Hearing[] {
  const on = dailyList().flatMap((g) => g.rows);
  const off = hearings.filter((h) => !h.dailyList).sort(byNearest);
  return [...on, ...off];
}

/* ---------- offices ---------- */

export function officeSlug(county: string): string {
  return county.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export interface Office {
  row: number;
  county: string;
  slug: string;
  cells: Record<string, CellValue>;
}

export function offices(): Office[] {
  return tab('Offices').rows
    .filter((r) => typeof r.cells.A === 'string' && r.cells.A.trim() !== '')
    .map((r) => ({ row: r.row, county: String(r.cells.A), slug: officeSlug(String(r.cells.A)), cells: r.cells }));
}

export function officeBySlug(slug: string): Office | undefined {
  return offices().find((o) => o.slug === slug);
}

/** The Offices heading text of a column, for example officeHeading('N') is "Ask again? (formula)". */
export function officeHeading(column: string): string {
  return tab('Offices').headers[column] ?? column;
}

export function officeOfHearing(h: Hearing): Office | undefined {
  return offices().find((o) => o.county === h.county);
}

/**
 * Offices whose column N holds the block or asks for an approval today: a change of process that
 * a person must approve or reject. The column is found by its heading, "Ask again?".
 */
export function officesWithChangeWaiting(): Office[] {
  const t = tab('Offices');
  const col = Object.entries(t.headers).find(([, h]) => h.startsWith('Ask again?'))?.[0];
  if (!col) return [];
  return offices().filter((o) => {
    const v = String(o.cells[col] ?? '');
    return /NO NOTICE GOES TO THIS OFFICE|APPROVE OR REJECT/i.test(v);
  });
}

/* ---------- bench, measures, reader suggestions ---------- */

export function benchRows(): TabRow[] {
  return tab('Bench').rows.filter((r) => typeof r.cells.A === 'string' && r.cells.A.trim() !== '');
}

export function measureRows(): TabRow[] {
  return tab('Measures').rows;
}

export function readerSuggestionRows(): TabRow[] {
  return tab('Reader suggestions').rows;
}

/** One proposal row of the Reader suggestions tab (columns A to G), read verbatim. */
export interface Suggestion {
  row: number;
  /** A: the case, or an office or consultant for rows that are not about one hearing. */
  case: string;
  /** B: the proof cell or the cell, in the sheet's words. */
  cell: string;
  /** C: what the readers propose ("close", "leave open", "REPEAT: ...", "for a person: ..."). */
  proposal: string;
  /** D: the message number. */
  message: string;
  /** E: who sent it. */
  from: string;
  /** F: the words it relies on, or the reason. */
  words: string;
  /** G: a person's yes or no, as typed on the sheet (empty in the example). */
  accepted: string;
  /** The gate part a proof row is for; null for other cells. */
  gate: GateKey | null;
  /** True when the readers propose to close the gate with this message's link (column C reads "close"). */
  closes: boolean;
}

/**
 * The gate part of a proof row, by its target cell. Column B names the cell by the sheet's own
 * heading: "G4 Evidence on file with the clerk" is column L (the clerk's part) and "G4 Consultant
 * has the packet" is column M (the consultant's part). Only the shared heading "G4 Packet: clerk
 * and consultant have it" names both; there a receipt from a consultant on the Bench is the
 * consultant's part and any other is the clerk's.
 */
function suggestionGate(b: string, from: string): GateKey | null {
  const m = /^G([1-5])\b/.exec(b);
  if (!m) return null;
  if (m[1] !== '4') return `G${m[1]}` as GateKey;
  const heading = b.trim();
  const first = hearings[0];
  for (const key of ['G4clerk', 'G4consultant'] as const) {
    const col = first?.gates[key].linkColumn;
    if (col && sheet.hearingHeaders[col]?.trim() === heading) return key;
  }
  const bench = new Set(benchRows().map((r) => String(r.cells.A).trim()));
  return bench.has(from.trim()) ? 'G4consultant' : 'G4clerk';
}

/** Rows of the Reader suggestions tab that carry a proposal (columns B and C are filled). */
export function suggestions(): Suggestion[] {
  return readerSuggestionRows()
    .filter((r) => r.cells.B !== undefined && r.cells.C !== undefined)
    .map((r) => {
      const t = (k: string): string => (r.cells[k] === undefined ? '' : String(r.cells[k]));
      const proposal = t('C');
      return {
        row: r.row,
        case: t('A'),
        cell: t('B'),
        proposal,
        message: t('D'),
        from: t('E'),
        words: t('F'),
        accepted: t('G'),
        gate: suggestionGate(t('B'), t('E')),
        closes: proposal === 'close',
      };
    });
}

export function suggestionsFor(caseId: string): Suggestion[] {
  return suggestions().filter((s) => s.case === caseId);
}

/** Events in the sheet's calendar file (lines that read BEGIN:VEVENT). */
export function calendarEventCount(): number {
  return sheet.calendarFile ? sheet.calendarFile.lines.filter((l) => l === 'BEGIN:VEVENT').length : 0;
}

/** The Offices cells a person types to approve a change: the name (AQ) and the date (AR), found by heading. */
export function approvalCells(o: Office): { name: string; date: string } {
  const h = tab('Offices').headers;
  const by = (prefix: string): string => Object.entries(h).find(([, t]) => t.startsWith(prefix))?.[0] ?? prefix;
  return { name: `${by('Change approved by')}${o.row}`, date: `${by('Approved on')}${o.row}` };
}

/** An Offices cell of an office by the start of its heading, with its reference: officeCell(o, 'Changed since'). */
export function officeCell(o: Office, headingPrefix: string): { ref: string; column: string; value: CellValue | null; heading: string } {
  const h = tab('Offices').headers;
  const hit = Object.entries(h).find(([, t]) => t.startsWith(headingPrefix));
  if (!hit) throw new Error(`No Offices heading starts with "${headingPrefix}".`);
  const [column, heading] = hit;
  return { ref: `${column}${o.row}`, column, value: o.cells[column] ?? null, heading };
}
