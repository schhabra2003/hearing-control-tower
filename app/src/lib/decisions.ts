/**
 * What the Reader suggestions tab asks of a person, counted one way for every screen (the sidebar
 * badge, the 9:00 a.m. pass, the suggestions tabs and the hearing drawer).
 *
 * A proof row proposes to close a gate ("close"). If the example sheet already holds a proof in
 * that cell, the row is "on the sheet" and needs no decision. A row that "names no version" does
 * not close a gate: a person asks the sender which version they have. Every other "close" row,
 * and every row "for a person", waits for a yes or no.
 */

import { pasteDecisionRows } from './paste';
import { cell, hearingByCase, hearingByRow, hearings, readerSuggestionRows, suggestions, type Suggestion } from './data';
import { proposalKey, type Session } from './store';
import { datesTyped } from './format';

export type Need = 'decide' | 'on-sheet' | 'ask-version' | 'repeat' | 'hold' | 'info' | 'rule-says' | 'nothing';

/**
 * A rule row whose column C says what kind of value goes in the cell, not the value itself ("the
 * date our notice went", "tomorrow morning (type the date)", "answer their question"). There is
 * nothing to accept: a person reads it and types the value they find.
 */
export function isPlaceholder(v: string): boolean {
  return /^(the date|the number|tomorrow|today\b)|\(type the date\)|answer their question|, if our notice/i.test(v);
}

/** The value the sheet already holds in the cell a row names in column B ("Hearings CP16: ..."), or null. */
export function heldValue(s: Suggestion): string | null {
  const m = /^(Hearings|Offices|Bench|Availability|Settings) ([A-Z]{1,3})(\d+):/.exec(s.cell);
  if (!m) return null;
  const [, tabName, column, row] = m;
  const v = tabName === 'Hearings' ? hearingByRow(Number(row))?.cells[column!] : cell(tabName!, `${column}${row}`).value;
  return v === undefined || v === null || String(v).trim() === '' ? null : String(v);
}

export function needOf(s: Suggestion): Need {
  if (s.proposal.startsWith('names no version')) return 'ask-version';
  if (s.closes) {
    const h = s.gate ? hearingByCase(s.case) : undefined;
    return h && s.gate && h.gates[s.gate].state === 'proved' ? 'on-sheet' : 'decide';
  }
  if (s.proposal.startsWith('REPEAT')) return 'repeat';
  if (s.proposal.startsWith('HOLD')) return 'hold';
  if (s.proposal.startsWith('for a person')) {
    if (heldValue(s) !== null) return 'on-sheet';
    const v = s.proposal.replace(/^for a person:\s*/, '').trim();
    if (/^\(leave empty\)$/i.test(v)) return 'nothing';
    return isPlaceholder(v) ? 'rule-says' : 'decide';
  }
  return 'info';
}

export const decided = (s: Suggestion, p: Session['proposals']): boolean => !!p[proposalKey('suggestion', s.row)];

/** Rows that wait for a person's yes or no in this session. */
export function waiting(rows: Suggestion[], p: Session['proposals']): Suggestion[] {
  return rows.filter((s) => needOf(s) === 'decide' && !decided(s, p));
}

/** The proof links the readers proposed, split the way the pass reads them. */
export function proofCounts(p: Session['proposals']) {
  const proofs = suggestions().filter((s) => s.gate && (s.closes || needOf(s) === 'ask-version'));
  const decide = proofs.filter((s) => needOf(s) === 'decide');
  return {
    total: proofs.length,
    onSheet: proofs.filter((s) => needOf(s) === 'on-sheet').length,
    askVersion: proofs.filter((s) => needOf(s) === 'ask-version').length,
    decide: decide.length,
    waiting: decide.filter((s) => !decided(s, p)).length,
  };
}

/** Every row on the tab that waits for a yes or no. */
export function allWaiting(p: Session['proposals']): number {
  return waiting(suggestions(), p).length;
}

/**
 * The one count of waiting proposals that every screen shows (the sidebar, the Overview, step 1 of
 * the 9:00 a.m. pass and the Reader suggestions summary): all rows that wait, and how many of them
 * are gate links.
 */
export function proposalCounts(p: Session['proposals'], pasted = false): { waiting: number; total: number; gateLinks: number; pastedWaiting: number } {
  const rows = suggestions().filter((s) => needOf(s) === 'decide');
  const open = rows.filter((s) => !decided(s, p));
  const pastedRows = pasted ? pasteDecisionRows() : [];
  const pastedOpen = pastedRows.filter((x) => !p[proposalKey('paste', x.n)]);
  const pastedWaiting = pastedOpen.length;
  return {
    waiting: open.length + pastedWaiting,
    total: rows.length + pastedRows.length,
    gateLinks: open.filter((s) => s.gate && s.closes).length + pastedOpen.filter((x) => /\bG\d\b/.test(x.row[1] ?? '')).length,
    pastedWaiting,
  };
}

/**
 * The cell a person types when they accept a row. For a proof row it is the hearing's proof column
 * on its own row (Hearings K16); for the other lists it is the cell column B names ("Hearings CP15").
 */
export function targetCell(s: Suggestion): string {
  if (s.gate) {
    const h = hearingByCase(s.case);
    if (h) return `Hearings ${h.gates[s.gate].linkColumn}${h.row}`;
  }
  const m = /^([A-Za-z ]+?) ([A-Z]{1,3}\d*):/.exec(s.cell);
  return m ? `${m[1]} ${m[2]}` : s.cell;
}

/** The yes or no cell of a row on the Reader suggestions tab. */
export const answerCell = (row: number): string => `Reader suggestions G${row}`;

/**
 * Who proposed a row. The tab's first list is the two AI readers' proof links; every list under a
 * heading row after it (other cells, office changes, repeats, questions) is written by fixed code.
 */
export function proposedBy(s: Suggestion): 'readers' | 'rule' {
  const firstHeading = readerSuggestionRows().find((r) => r.row > 1 && Object.keys(r.cells).length === 1 && typeof r.cells.A === 'string');
  return !firstHeading || s.row < firstHeading.row ? 'readers' : 'rule';
}

/** Other rows that wait for a decision on the same cell: accepting one of them refuses the rest. */
export function rivalsOf(s: Suggestion): Suggestion[] {
  if (needOf(s) !== 'decide') return [];
  const cellOf = targetCell(s);
  return suggestions().filter((x) => x.row !== s.row && needOf(x) === 'decide' && targetCell(x) === cellOf);
}

/** The link to a message, in the form the sheet's own proof cells hold ("https://mailbox.example/message/34"). */
export function messageLink(message: string): string | null {
  for (const h of hearings) {
    for (const g of Object.values(h.gates)) {
      const base = g.link ? /^(https?:\/\/.+\/message\/)\d+$/.exec(String(g.link))?.[1] : undefined;
      if (base) return `${base}${message}`;
    }
  }
  return null;
}

/**
 * The value a "for a person" row proposes, as concrete as the row allows: the link itself when it
 * proposes "the link to this message", otherwise the row's own words (which may ask a person to
 * fill in a date).
 */
/** The proposal in words: "The link to message 23" instead of the raw link, the value otherwise. */
export function proposedWords(s: Suggestion): string {
  const v = s.proposal.replace(/^for a person:\s*/, '').trim();
  const m = /^the link to (?:this message|message (\d+))/i.exec(v);
  if (m) return `The link to message ${m[1] ?? s.message}`;
  const t = datesTyped(v);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function proposedValue(s: Suggestion): string {
  const v = s.proposal.replace(/^for a person:\s*/, '').trim();
  const m = /^the link to (?:this message|message (\d+))/i.exec(v);
  if (m) {
    const link = messageLink(m[1] ?? s.message);
    if (link) return link;
  }
  if (/^\(leave empty\)$/i.test(v)) return 'Leave the cell empty';
  return datesTyped(v);
}
