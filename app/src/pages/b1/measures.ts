/**
 * The Measures tab, read as the sheet holds it. Nothing here is
 * counted again: each value is the cell's own, and the words are the tab's own, split into a
 * title, its detail in brackets and the kind the tab writes in front ("OUTCOME.", "KPI.", "GOAL:").
 */

import { cell, measureRows, sheetToday } from '@/lib/data';
import { dateLong } from '@/lib/format';
import type { SourceInfo } from '@/components/ui/SourceTip';

export interface Measure {
  row: number;
  ref: string;
  /** "Outcome", "KPI" or "Goal: fewer errors"; empty when the tab writes none. */
  kind: string;
  title: string;
  /** The words in brackets after the title, when there are any. */
  detail: string;
  /** Column B as typed, or empty. */
  raw: string;
  value: number | null;
  /** The value as shown: "4", "1.7", "45.8%". Empty when the tab has no value yet. */
  display: string;
  /** Column C. */
  target: string;
  /** Column D. */
  how: string;
  /** The target is exactly "none" (or 0) and the value is above zero: the one case a figure turns red. */
  overTarget: boolean;
}

const num = (raw: string): number | null => (/^-?\d+(\.\d+)?$/.test(raw.trim()) ? Number(raw) : null);

/** A share between 0 and 1 is shown as a percent with one decimal; counts and rates as typed. */
export function displayValue(v: number | null, raw: string): string {
  if (v === null) return raw;
  if (v > 0 && v < 1 && !Number.isInteger(v)) return `${(v * 100).toFixed(1)}%`;
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}

function split(a: string): { kind: string; title: string; detail: string } {
  let kind = '';
  let rest = a.trim();
  const goal = /^GOAL:\s*([A-Z ,]+)\.\s*/.exec(rest);
  if (goal) {
    kind = `Goal: ${goal[1]!.trim().toLowerCase()}`;
    rest = rest.slice(goal[0].length);
  } else {
    const k = /^(OUTCOME|KPI)\.\s*/.exec(rest);
    if (k) {
      kind = k[1] === 'KPI' ? 'KPI' : 'Outcome';
      rest = rest.slice(k[0].length);
    }
  }
  // The detail is the last bracket that closes the text, found by matching brackets, so a bracket
  // inside it ("(date, consultant, case-file version or status)") stays whole.
  if (rest.endsWith(')')) {
    let depth = 0;
    for (let i = rest.length - 1; i >= 0; i -= 1) {
      if (rest[i] === ')') depth += 1;
      if (rest[i] === '(') depth -= 1;
      if (depth === 0) {
        if (i > 0 && rest[i - 1] === ' ') {
          const detail = rest.slice(i + 1, -1);
          return { kind, title: rest.slice(0, i - 1), detail: detail.charAt(0).toUpperCase() + detail.slice(1) };
        }
        break;
      }
    }
  }
  return { kind, title: rest, detail: '' };
}

export function measure(ref: string): Measure {
  const c = cell('Measures', ref);
  const row = c.row;
  const t = (col: string): string => {
    const v = cell('Measures', `${col}${row}`).value;
    return v == null ? '' : String(v);
  };
  const raw = t('B');
  const value = num(raw);
  const target = t('C');
  const { kind, title, detail } = split(t('A'));
  return {
    row,
    ref,
    kind,
    title,
    detail,
    raw,
    value,
    display: displayValue(value, raw),
    target,
    how: t('D'),
    overTarget: /^(none|0)$/i.test(target.trim()) && value !== null && value > 0,
  };
}

export function asOf(): string {
  return `${dateLong(sheetToday())} (Settings B2)`;
}

/** "How this number is known" for a Measures cell. */
/** The target in one style: "zero" for the tab's "none" or 0, "No target set" when the cell is empty. */
export function targetText(target: string): string {
  const t = target.trim();
  if (!t) return 'No target set';
  if (/^(none|0)$/i.test(t)) return 'Zero';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const WORD_NUM: Record<string, string> = { one: '1', two: '2', three: '3' };

/**
 * The target in one form, "Target: <value> <when>" (Measures column C, read, never typed here):
 * "none after one working day" is "Target: 0 after 1 working day", "under 1 in 20" is "Target:
 * under 5%", "3.0 counted today (estimate) to 1.8 by live week 4" is "Target: 1.8 by live week 4
 * (now 3.0, estimate)". Only the first sentence is kept; the rest is in the cell's tooltip.
 */
export function targetLine(target: string, shorten: (t: string) => string = (t) => t): string {
  const raw = target.trim();
  if (!raw) return 'No target';
  if (/^(none|0)$/i.test(raw)) return 'Target: 0';
  const none = /^none (after|inside|at) (.+)$/i.exec(raw);
  if (none) return `Target: 0 ${none[1]!.toLowerCase()} ${none[2]!.replace(/\b(one|two|three)\b/g, (w) => WORD_NUM[w] ?? w)}`;
  const under = /^under (\d+) in (\d+)$/i.exec(raw);
  if (under) return `Target: under ${under[1]} in ${under[2]}`;
  const now = /^(.+?) (?:counted )?today \(estimate\) to (.+)$/i.exec(raw);
  if (now) return `Target: ${now[2]} (now ${now[1]}, estimate)`;
  const est = /^[^:]+: (\d[\d.,]*) today by estimate/i.exec(raw);
  if (est) return `Estimate: ${est[1]} a peak week today`;
  const first = raw.split(/(?<=[a-z0-9)])\.\s+(?=[A-Z])/)[0]!.replace(/\.$/, '');
  const s = shorten(first);
  return `Target: ${/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s}`;
}

export function measureInfo(m: Measure): SourceInfo {
  return { label: 'measured', source: `Measures ${m.ref}`, counted: m.how || 'As the Measures tab states it.', asOf: asOf() };
}

export interface MeasureBlock {
  id: string;
  title: string;
  /** The row of the tab that heads the block. */
  headRow: number;
  measures: Measure[];
}

/**
 * The tab's measure blocks: the first block (rows 2 to 25) split at the rows the tab starts with
 * "GOAL:", and the block the tab added later under "More measures". Rows are found by reading the
 * tab: a measure row has words in A and is not a heading row.
 */
export function measureBlocks(): MeasureBlock[] {
  const rows = measureRows();
  const more = rows.find((r) => String(r.cells.A ?? '').startsWith('More measures'));
  const firstEnd = rows.find((r) => r.row > 2 && !r.cells.B && !r.cells.C && !r.cells.D)?.row ?? 26;
  const blocks: MeasureBlock[] = [];
  for (const r of rows) {
    if (r.row < 2 || r.row >= firstEnd) continue;
    const a = String(r.cells.A ?? '');
    if (!a) continue;
    if (a.startsWith('GOAL:') || !blocks.length) {
      const kind = split(a).kind;
      blocks.push({ id: `goal-${r.row}`, title: kind ? kind.replace(/^Goal: /, '') : 'Measures', headRow: r.row, measures: [] });
    }
    blocks[blocks.length - 1]!.measures.push(measure(`B${r.row}`));
  }
  if (more) {
    const list = rows.filter((r) => r.row > more.row + 1 && r.cells.A && (r.cells.B !== undefined || r.cells.C !== undefined));
    blocks.push({ id: 'more', title: 'More measures', headRow: more.row, measures: list.map((r) => measure(`B${r.row}`)) });
  }
  return blocks;
}

/** A table block of the tab (results by format, results by consultant): its title row, its heading row and its rows. */
export function measureTable(startsWith: string): { title: string; titleRow: number; headers: string[]; columns: string[]; rows: { row: number; cells: string[] }[] } | null {
  const rows = measureRows();
  const head = rows.find((r) => String(r.cells.A ?? '').startsWith(startsWith));
  if (!head) return null;
  const heading = rows.find((r) => r.row === head.row + 1);
  if (!heading) return null;
  const columns = Object.keys(heading.cells).sort((a, b) => a.length - b.length || a.localeCompare(b));
  const body: { row: number; cells: string[] }[] = [];
  for (let n = head.row + 2; ; n += 1) {
    const r = rows.find((x) => x.row === n);
    if (!r || !r.cells.A) break;
    body.push({ row: n, cells: columns.map((c) => (r.cells[c] === undefined ? '' : String(r.cells[c]))) });
  }
  return { title: String(head.cells.A), titleRow: head.row, headers: columns.map((c) => String(heading.cells[c])), columns, rows: body };
}
