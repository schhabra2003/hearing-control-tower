/**
 * Helpers over data the export already holds: the sections of the Reader suggestions
 * tab, the cell a person types for each proposal, the sheet's capitals in sentence case, and the
 * calendar file read back into events. Nothing here types a figure; every count is computed from
 * the rows it names.
 */

import type { TabRow } from '@/types/data';
import { benchRows, offices, readerSuggestionRows, sheet, suggestions, type Suggestion } from '@/lib/data';
import { needOf } from '@/lib/decisions';

/* ---------- the sheet's capitals ---------- */

/** Two-letter words that are English, so a two-letter capital word not in this list is a column ("AQ"). */
const ENGLISH_TWO = new Set(['AN', 'AS', 'AT', 'BY', 'DO', 'GO', 'IF', 'IN', 'IS', 'IT', 'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE', 'OK']);

/** Names the sheet writes in capitals inside its lines, as typed elsewhere: counties and consultants, longest first. */
function properNames(): string[] {
  const all = [...offices().map((o) => o.county), ...benchRows().map((r) => String(r.cells.A))];
  return [...new Set(all)].sort((a, b) => b.length - a.length);
}

let names: string[] | null = null;

/** Abbreviations that stay in capitals. */
const KEEP_CAPS = new Set(['UTC']);

/** Words a person types in a reply: shown lower case in quotes. */
const QUOTED = new Set(['YES', 'ARRIVED']);

/** True when the text holds a run of at least three capital words, the way the sheet prints its lines. */
export function hasCapitals(text: string): boolean {
  return /\b[A-Z][A-Z'’]+(?:[\s:,]+[A-Z][A-Z'’]+){2,}\b/.test(text);
}

/** Words after which a short capital word is a column: "Offices AS", "column O". */
const CELL_WORDS = /^(?:columns?|Offices|Hearings|Dockets|Bench|Settings)$/i;

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The sheet's capital lines in sentence case, for reading. Words already in mixed case stay as
 * typed; cell references (AQ5, AQ, column O), names of counties and consultants, and the kit's
 * keywords keep their form. The exact capital text stays one click away, "as printed on the sheet".
 */
export function sentenceCase(text: string): string {
  names ??= properNames();
  let start = true;
  let prev = '';
  const out = text.replace(/\.{3}|…|[A-Za-z][A-Za-z'’]*\d*|[.!?](?=\s|$)/g, (tok) => {
    // An ellipsis continues the sentence; a colon does not start a new one.
    if (tok === '...' || tok === '…') return tok;
    if (/^[.!?]$/.test(tok)) {
      start = true;
      return tok;
    }
    let word = tok;
    if (tok === tok.toUpperCase() && /[A-Z]/.test(tok)) {
      const column =
        /^[A-Z]{1,3}\d+$/.test(tok) ||
        (tok.length === 2 && !ENGLISH_TWO.has(tok)) ||
        (tok.length === 1 && tok !== 'A') ||
        (tok.length <= 2 && CELL_WORDS.test(prev));
      word = column || KEEP_CAPS.has(tok) ? tok : QUOTED.has(tok) ? `"${tok.toLowerCase()}"` : tok.toLowerCase();
      if (start && /^[a-z]/.test(word)) word = word[0]!.toUpperCase() + word.slice(1);
    }
    start = false;
    prev = tok;
    return word;
  });
  return names.reduce((acc, n) => acc.replace(new RegExp(`\\b${escape(n)}\\b`, 'gi'), n), out.replace(/""([a-z]+)""/g, '"$1"'));
}

/* ---------- the Reader suggestions tab, by section ---------- */

export type SuggestionTab = 'gates' | 'cells' | 'offices' | 'repeats' | 'questions';

export interface Section {
  /** The heading row: a row with only column A filled, which the sheet uses to open a list. */
  row: number;
  text: string;
  rows: TabRow[];
}

const isHeading = (r: TabRow): boolean => Object.keys(r.cells).length === 1 && typeof r.cells.A === 'string' && r.row > 1;

/** The tab's lists, each under the heading row that opens it. Rows above the first heading form section 0. */
export function sections(): Section[] {
  const out: Section[] = [{ row: 1, text: '', rows: [] }];
  for (const r of readerSuggestionRows()) {
    if (isHeading(r)) out.push({ row: r.row, text: String(r.cells.A), rows: [] });
    else out[out.length - 1]!.rows.push(r);
  }
  return out;
}

/** The section that starts with these words, found by text so a moved row does not break it. */
export function sectionStarting(prefix: string): Section | undefined {
  return sections().find((s) => s.text.startsWith(prefix));
}

const rowsOf = (prefix: string): Set<number> => new Set(sectionStarting(prefix)?.rows.map((r) => r.row) ?? []);

/** The proposals of each tab of the page, in the sheet's own order. */
export function suggestionsByTab(): Record<SuggestionTab, Suggestion[]> {
  const all = suggestions();
  const gateRows = new Set(sections()[0]!.rows.map((r) => r.row));
  const officeRows = rowsOf('Proposals for the Offices tab');
  const newCellRows = rowsOf('Proposals for the cells the sheet gained');
  const repeatRows = rowsOf('Repeats and questions');
  const isOfficeCell = (s: Suggestion): boolean => s.cell.startsWith('Offices ');
  const isQuestion = (s: Suggestion): boolean => /^Hearings BN\d/.test(s.cell);
  return {
    gates: all.filter((s) => gateRows.has(s.row)),
    cells: all.filter((s) => newCellRows.has(s.row) && !isOfficeCell(s)),
    offices: all.filter((s) => officeRows.has(s.row) || (newCellRows.has(s.row) && isOfficeCell(s))),
    repeats: all.filter((s) => repeatRows.has(s.row) && !isQuestion(s)),
    questions: all.filter((s) => repeatRows.has(s.row) && isQuestion(s)),
  };
}

/** What kind of answer a row asks of the person at the 9:00 a.m. pass. */
export type Ask = 'yes-no' | 'on-sheet' | 'ask-version' | 'repeat' | 'open' | 'hold' | 'rule-says' | 'nothing';

export function askOf(s: Suggestion): Ask {
  const n = needOf(s);
  return n === 'decide' ? 'yes-no' : n === 'info' ? 'open' : n;
}

export { answerCell, targetCell } from '@/lib/decisions';

/** The words of column B after the cell reference: "Hearings CP15: The office says..." gives "The office says...". */
export function cellTitle(s: Suggestion): string {
  const i = s.cell.indexOf(': ');
  return i >= 0 && /^[A-Za-z ]+ [A-Z]{1,3}\d*$/.test(s.cell.slice(0, i)) ? s.cell.slice(i + 2) : s.cell;
}

/** The proposal in column C without its "for a person: " opening, which the card already says. */
export function proposalWords(s: Suggestion): string {
  return s.proposal.replace(/^for a person:\s*/, '');
}

/* ---------- the calendar file ---------- */

export interface IcsEvent {
  uid: string;
  caseId: string | null;
  /** "2030-06-04" from DTSTART. */
  day: string;
  summary: string;
  location: string;
  description: string;
  /** The first line of the event in column A, counted from 1. */
  line: number;
}

/** The value of an iCalendar text property, with its escapes read back (\, \; \n \\). */
function unescape(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

/** Reads the events back out of the sheet's file: folded lines joined, escapes undone. */
export function icsEvents(): IcsEvent[] {
  const lines = sheet.calendarFile?.lines ?? [];
  const out: IcsEvent[] = [];
  let cur: Record<string, string> | null = null;
  let first = 0;
  let last = '';
  lines.forEach((raw, i) => {
    if (raw.startsWith(' ') && cur && last) {
      cur[last] += raw.slice(1);
      return;
    }
    if (raw === 'BEGIN:VEVENT') {
      cur = {};
      first = i + 1;
      last = '';
      return;
    }
    if (raw === 'END:VEVENT' && cur) {
      const c: Record<string, string> = cur;
      const start = c.DTSTART ?? '';
      const uid = c.UID ?? '';
      out.push({
        uid,
        caseId: /^([A-Z]+-\d+)-/.exec(uid)?.[1] ?? null,
        day: /^(\d{4})(\d{2})(\d{2})/.test(start) ? start.replace(/^(\d{4})(\d{2})(\d{2}).*$/, '$1-$2-$3') : '',
        summary: unescape(c.SUMMARY ?? ''),
        location: unescape(c.LOCATION ?? ''),
        description: unescape(c.DESCRIPTION ?? ''),
        line: first,
      });
      cur = null;
      return;
    }
    if (cur) {
      const k = raw.indexOf(':');
      if (k > 0) {
        last = raw.slice(0, k).split(';')[0]!;
        cur[last] = raw.slice(k + 1);
      }
    }
  });
  return out;
}
