/**
 * What the first screen shows, derived from the typed data layer and the session. No figure is
 * typed here: every count is read from the sheet export or computed from it.
 *
 * The Today queue holds two kinds of item, in this order:
 * 1. decisions only the firm's owner makes (an office's process change that waits), and
 * 2. hearings at risk today (the sheet's daily list, "TOP OF LIST"), nearest first.
 */

import type { GateKey, Hearing } from '@/types/data';
import { byNearest, hearingByCase, hearings, officeBySlug, officesWithChangeWaiting, type Office } from '@/lib/data';
import { gateView, type GateView } from '@/lib/gates';
import { gateTitlePlain, statusCopy, todayActions, type TodayAction } from '@/lib/copy';
import type { Session } from '@/lib/store';
import type { Tone } from './Regions';

/** Who makes the decisions the coordinator cannot: the firm's owner (the firm is "Alice’s Law Firm"). */
export const OWNER = 'Alice, firm owner';

export const isAtRisk = (h: Hearing): boolean => (h.dailyList ?? '').startsWith('TOP OF LIST');
export const atRiskList = (): Hearing[] => hearings.filter(isAtRisk).sort(byNearest);
export const street = (h: Hearing): string => h.property.split(',')[0] ?? h.property;

export function statusOf(h: Hearing, changes?: Session['changes']): { label: string; tone: Tone } {
  const s = statusCopy(h.status, h, changes);
  // The checks are counted once, beside the status, in words: the status keeps only its state.
  return { label: s.label.replace(/: \d+ proofs? missing$/, ''), tone: s.tone };
}

/* ---------- the five checks, in words; check 4 has two parts and counts once ---------- */

export type CheckId = 'G1' | 'G2' | 'G3' | 'G4' | 'G5';

export interface CheckRow {
  id: CheckId;
  name: string;
  state: GateView;
  /** Proof message numbers, when proved. */
  messages: string[];
  /** Check 4 only: the two parts in words. */
  parts?: { name: string; state: GateView }[];
}

/** The five checks in plain words; codes live only in "Sheet reference". */
const CHECK_NAME: Record<Exclude<CheckId, 'G4' | 'G5'>, string> = {
  G1: 'Date confirmed by the office',
  G2: 'Consultant said yes',
  G3: 'Office has our consultant’s name',
};
const DONE: GateView[] = ['proved', 'accepted'];

function joinState(a: GateView, b: GateView): GateView {
  if (a === 'not-needed' && b === 'not-needed') return 'not-needed';
  if ([a, b].includes('missing-near')) return 'missing-near';
  if ([a, b].includes('missing')) return 'missing';
  if ([a, b].includes('accepted')) return 'accepted';
  return 'proved';
}

export function checkRows(h: Hearing, s: Pick<Session, 'proposals'>): CheckRow[] {
  const v = (k: GateKey): GateView => gateView(h, k, s);
  const msg = (k: GateKey): string[] => (h.gates[k].message && DONE.includes(v(k)) ? [String(h.gates[k].message)] : []);
  const one = (k: Exclude<GateKey, 'G4clerk' | 'G4consultant'>): CheckRow => ({ id: k, name: k === 'G5' ? gateTitlePlain('G5') : CHECK_NAME[k], state: v(k), messages: msg(k) });
  const clerk = v('G4clerk');
  const consultant = v('G4consultant');
  return [
    one('G1'),
    one('G2'),
    one('G3'),
    {
      id: 'G4',
      name: 'Files sent and received',
      state: joinState(clerk, consultant),
      messages: [...msg('G4clerk'), ...msg('G4consultant')],
      parts: [
        { name: 'Clerk', state: clerk },
        { name: 'Consultant', state: consultant },
      ],
    },
    one('G5'),
  ];
}

/**
 * "3 of 5 checks done": always over the five checks; a check that is not needed counts as done
 * (so the list never says "1 of 4" beside another page's "3 of 5").
 * `next` is the first check still missing, in words.
 */
export function checkSummary(rows: CheckRow[]): { done: number; total: number; next: string | null } {
  const ok = (r: CheckRow) => r.state === 'not-needed' || DONE.includes(r.state);
  const next = rows.find((r) => !ok(r));
  return { done: rows.filter(ok).length, total: rows.length, next: next ? next.name : null };
}

/* ---------- today's steps ---------- */

/** A step that opens an office's decision belongs to the owner, not to the coordinator on duty. */
export function stepsFor(h: Hearing, changes: Session['changes']): { actions: TodayAction[]; more: number } {
  const r = todayActions(h, { changes });
  return { more: r.more, actions: r.actions.map((a) => (a.href?.includes('/offices/') ? { ...a, owner: { name: OWNER, fromSheet: false } } : a)) };
}

/* ---------- the queue ---------- */

export type QueueItem =
  | { kind: 'decision'; key: string; office: Office; href: string }
  | { kind: 'hearing'; key: string; hearing: Hearing; href: string };

export const changesWaiting = (s: Pick<Session, 'changes'>): Office[] => officesWithChangeWaiting().filter((o) => !s.changes[o.slug]);

/** Hearings of an office that are still to come, nearest first. */
export const comingAt = (o: Office): Hearing[] => hearings.filter((h) => h.county === o.county && (h.workingDays ?? -1) >= 0).sort(byNearest);

export function todayQueue(s: Pick<Session, 'changes'>, list: 'today' | 'all', flaggedRows: Hearing[]): { decisions: QueueItem[]; hearings: QueueItem[] } {
  const base = list === 'all' ? '#/?list=all&' : '#/?';
  // A decision made in this session stays in the queue with its result and Undo, until the page is left.
  const decisions = officesWithChangeWaiting()
    .filter((o) => !s.changes[o.slug] || s.changes[o.slug]?.decision !== 'held')
    .map<QueueItem>((o) => ({ kind: 'decision', key: `decide-${o.slug}`, office: o, href: `${base}decide=${o.slug}` }));
  const rows = list === 'all' ? flaggedRows : atRiskList();
  return { decisions, hearings: rows.map<QueueItem>((h) => ({ kind: 'hearing', key: h.case, hearing: h, href: `${base}case=${h.case}` })) };
}

/** The selected item: ?decide=<slug>, ?case=<case>, or the first item of the queue. */
export function selectedItem(query: URLSearchParams, items: QueueItem[]): QueueItem | null {
  const slug = query.get('decide');
  const c = query.get('case');
  if (slug) return items.find((i) => i.kind === 'decision' && i.office.slug === slug) ?? null;
  if (c) {
    const found = items.find((i) => i.kind === 'hearing' && i.hearing.case === c);
    if (found) return found;
    const h = hearingByCase(c);
    return h ? { kind: 'hearing', key: h.case, hearing: h, href: `#/?case=${h.case}` } : null;
  }
  return items[0] ?? null;
}

export const officeFor = (slug: string): Office | undefined => officeBySlug(slug);
