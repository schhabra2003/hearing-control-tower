/**
 * The --paste result of the engine export, sorted into the groups the command counts in its
 * summary line, in the same order. The group counts shown on the page are the command's own
 * (engine.paste.count); this file only says which group each row belongs to.
 */

import { engine, hearingByCase, officeBySlug, officeSlug } from '@/lib/data';
import type { PasteResult } from '@/types/data';

/**
 * The paste result the app shows: the recorded export (engine.paste), or the rows the live server
 * returned for the messages read in this session (lib/live.ts sets it). Every function below reads
 * through pasteSource(), so Paste, Reader suggestions and Offices show the same rows.
 */
let override: PasteResult | null = null;
export function setPasteOverride(r: PasteResult | null): void {
  override = r;
}
export const pasteSource = (): PasteResult => override ?? engine.paste;
export const pasteIsOverridden = (): boolean => override !== null;

export type PasteGroup = 'proof' | 'open' | 'repeat' | 'replace' | 'office' | 'newCells' | 'questions' | 'person' | 'notRead';

export const PASTE_GROUPS: { id: PasteGroup; title: string; detail: string; keys: string[] }[] = [
  { id: 'proof', title: 'Proof links to decide', detail: 'Proof links to accept or refuse at the 9:00 a.m. pass.', keys: ['close', 'half'] },
  { id: 'open', title: 'Cells to leave open', detail: 'Cells to leave open, with the reason.', keys: ['open'] },
  { id: 'repeat', title: 'Repeats', detail: 'The cell keeps its first link. Type nothing.', keys: ['repeat'] },
  { id: 'replace', title: 'A later link replaces the first', detail: 'A later link that replaces the first, with the version to type.', keys: ['replace'] },
  { id: 'office', title: 'Office changes with HOLD', detail: 'No notice goes to the office until a person approves the change.', keys: ['office'] },
  { id: 'newCells', title: 'Other cells by fixed code', detail: 'Proposals for the other cells, by fixed code with no model.', keys: ['newCells'] },
  { id: 'questions', title: "Consultants' questions", detail: 'Words to tell a consultant the same day.', keys: ['questions'] },
  { id: 'person', title: 'Messages for a person', detail: 'The two readers disagreed or could not place a passage.', keys: ['person'] },
  { id: 'notRead', title: 'Not read', detail: 'No recorded answer for this message, so a person reads it.', keys: ['notRead'] },
];

export function pasteGroupOf(row: string[]): PasteGroup {
  const c = row[2] ?? '';
  const b = row[1] ?? '';
  if (c === 'close' || c.startsWith('file this half')) return 'proof';
  if (c === 'leave open' || c.startsWith('do not close')) return 'open';
  if (c.startsWith('REPEAT')) return 'repeat';
  if (/in place of the link|number of the current version/.test(c)) return 'replace';
  if (c.startsWith('HOLD')) return 'office';
  if (c.startsWith('NOT READ')) return 'notRead';
  if (c.startsWith('FOR A PERSON')) return 'person';
  if (/^Hearings BN\b/.test(b)) return 'questions';
  return 'newCells';
}

/** The command's count for a group (the sum of its keys in pasteSource().count). */
export function pasteCount(g: (typeof PASTE_GROUPS)[number]): number {
  return g.keys.reduce((n, k) => n + (pasteSource().count[k] ?? 0), 0);
}

/** The file the command read and the file it wrote, as the command line names them. */
export function pasteFiles(): { input: string; output: string } {
  const cmd = pasteSource().command;
  const input = /--paste\s+(\S+)/.exec(cmd)?.[1] ?? '';
  const output = /--out\s+(\S+)/.exec(cmd)?.[1] ?? 'reader-suggestions-paste.tsv';
  return { input, output };
}

/** The rows as the .tsv file holds them: tab between columns, a line per row. */
export function pasteTsv(): string {
  return `${pasteSource().rows.map((r) => r.join('\t')).join('\n')}\n`;
}

/** How the command reached each message: an example of the packet, a recorded answer, or none. */
export function pastePath(id: string | number): 'example' | 'recorded' | 'missing' | 'live' | 'failed' {
  const h = pasteSource().how.find((x) => String(x.id) === String(id));
  return h?.path === 'example' || h?.path === 'recorded' || h?.path === 'live' || h?.path === 'failed' ? h.path : 'missing';
}

/**
 * The groups whose rows a person accepts or refuses here: proof links, later links, other cells.
 * An office change is decided on the Offices page, with a name, like every office change.
 */
export const PASTE_DECIDE: PasteGroup[] = ['proof', 'replace', 'newCells'];

/** A pasted row a person decides, numbered from 1 as on the page, keyed proposalKey('paste', n). */
export interface PasteDecisionRow {
  n: number;
  row: string[];
  group: PasteGroup;
}

export function pasteDecisionRows(): PasteDecisionRow[] {
  return pasteSource().rows
    .map((row, i) => ({ n: i + 1, row, group: pasteGroupOf(row) }))
    .filter((x) => PASTE_DECIDE.includes(x.group));
}

/** The office the pasted HOLD row is about (H036, Caldmere), as a slug, with the row. */
export function pastedOfficeChange(): { slug: string; office: string; row: PasteDecisionRow } | null {
  const r = pasteSource().rows.map((row, i) => ({ n: i + 1, row, group: pasteGroupOf(row) })).find((x) => x.group === 'office');
  if (!r) return null;
  const office = (r.row[0] ?? '').replace(/^Office: /, '').trim();
  return { slug: officeSlug(office), office, row: r };
}

/**
 * The cell a pasted row writes, with its row number: the command names only the column
 * ("Hearings L"), so the row comes from the case or the office. "Hearings L11", "Offices AS7".
 */
export function pasteCell(row: string[]): string {
  const m = /\b(Hearings|Offices) ([A-Z]{1,3})\b/.exec(row[1] ?? '');
  if (!m) return row[1] ?? '';
  if (m[1] === 'Hearings') {
    const h = hearingByCase(row[0] ?? '');
    return h ? `Hearings ${m[2]}${h.row}` : `Hearings column ${m[2]}`;
  }
  const o = officeBySlug(officeSlug((row[0] ?? '').replace(/^Office: /, '')));
  return o ? `Offices ${m[2]}${o.row}` : `Offices column ${m[2]}`;
}

/** The heading part of column B, without the cell: "G4 Packet: clerk and consultant have it". */
export function pasteTitle(row: string[]): string {
  const b = row[1] ?? '';
  return b.replace(/:\s*(Hearings|Offices) [A-Z]{1,3}$/, '').replace(/^(Hearings|Offices) [A-Z]{1,3}:\s*/, '');
}

/** The command's printed lines without any mention of a key (the app never deals with keys). */
export function pasteLinesPlain(): string[] {
  return pasteSource().lines
    .map((l) => l.split(/(?<=\.)\s+/).filter((x) => !/API_KEY|key is set|No key/i.test(x)).join(' '))
    .filter((l) => l.trim() !== '');
}
