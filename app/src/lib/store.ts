/**
 * The session: what a person did here, in this browser. The sheet is never
 * written. Every action records where a person types it on the sheet, with the cell.
 *
 * Saved to localStorage under "hd.session.v1" inside try/catch; with storage blocked the app works
 * and simply forgets on reload. "Reset the example" and ?reset=1 clear it.
 */

import { useSyncExternalStore } from 'react';
import { sheetToday } from './data';
import { clockText, dateLong } from './format';

export type Pass = '0900' | '1400';

export interface Decision {
  decision: 'accepted' | 'refused';
  /** Simulated clock text when it was decided, "9:04 a.m." */
  at: string;
  /** Where a person types it on the sheet, for example "Hearings K16". */
  cell?: string;
}

export interface ChangeDecision {
  decision: 'approved' | 'rejected' | 'held';
  name?: string;
  /** Why a person keeps the change on hold, for example "Waiting for written confirmation". */
  reason?: string;
  /** "Friday, June 7, 2030, 9:06 a.m." */
  at: string;
}

export interface NextStep {
  action: string;
  owner: string;
  due: string;
  at: string;
}

export interface ReplyTry {
  text: string;
  kind: string;
  byRule: boolean;
  why: string;
  at: string;
}

/** What a consultant said on their own page: about attending, about the files, or a signature. */
export type ConsultantReplyKind = 'yes' | 'no' | 'cannot' | 'files' | 'signed';
export type ConsultantTopic = 'attend' | 'files' | 'sign';

export interface ConsultantReply {
  case: string;
  consultant: string;
  kind: ConsultantReplyKind;
  /** The reason for "cannot", the files version for "files", the typed or drawn name for "signed". */
  detail?: string;
  /** "Friday, June 7, 2030, 9:04 a.m." on the simulated clock. */
  at: string;
}

export interface Clock {
  /** ISO date of the simulated day. */
  day: string;
  /** Minutes after midnight. */
  minutes: number;
}

export interface Session {
  v: 1;
  /** Key: "<case or scope>:<gate or row>", for example "AX-107:G3" or "suggestion:12". */
  proposals: Record<string, Decision>;
  /** Key: office slug, for example "tesswick". */
  changes: Record<string, ChangeDecision>;
  /** Key: case, for example "AX-107". */
  nextSteps: Record<string, NextStep>;
  repliesTried: ReplyTry[];
  /** Steps marked done in each pass, by step number from 1. */
  passSteps: Record<Pass, number[]>;
  clock: Clock;
  tourStep: number | null;
  /** The calendar file was downloaded in this session (it ends the 2:00 p.m. review's step 4). */
  icsDownloaded?: boolean;
  /** Cases whose due call a person marked as made at the 9:00 a.m. pass. */
  called?: string[];
  /** Cases whose consultant answer a person marked as sent at the 9:00 a.m. pass. */
  sent?: string[];
  /** The pasted messages were run here, so their rows join the decisions that wait. */
  pasted?: boolean;
  /** Messages typed or loaded on the paste page, kept so the result survives a reload. */
  pastedExtra?: { id: string; sender: string; body: string }[];
  /** The coordinator's own name, remembered after the first next step. */
  me?: string;
  /** Steps of "What to do today" marked done, as "<case>:<step id>" (survives a reload). */
  todayDone?: string[];
  /** Answers given on the consultant page. Key: "<case>:<topic>", for example "AX-107:attend". The coordinator accepts each on Replies. */
  consultantReplies?: Record<string, ConsultantReply>;
}

const KEY = 'hd.session.v1';
export const PASS_START: Record<Pass, number> = { '0900': 9 * 60, '1400': 14 * 60 };
/** Minutes the 2:00 p.m. review has for its next steps (the kit's schedule: done by 2:30 p.m.). */
export const REVIEW_MINUTES = 30;

function fresh(): Session {
  return {
    v: 1,
    proposals: {},
    changes: {},
    nextSteps: {},
    repliesTried: [],
    passSteps: { '0900': [], '1400': [] },
    clock: { day: sheetToday(), minutes: PASS_START['0900'] },
    tourStep: null,
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const numbers = (v: unknown): number[] => (Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : []);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((n): n is string => typeof n === 'string') : []);

/** The entries of a saved record that pass the guard; anything else is dropped. */
function keep<T>(v: unknown, ok: (x: unknown) => x is T): Record<string, T> {
  if (!isRecord(v)) return {};
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, T] => ok(e[1])));
}

/** A saved session, checked field by field: a stale or hand-edited value falls back to the fresh one. */
function load(): Session {
  const base = fresh();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return base;
    const p: unknown = JSON.parse(raw);
    if (!isRecord(p) || p.v !== 1) return base;
    const steps = isRecord(p.passSteps) ? p.passSteps : {};
    const clock = isRecord(p.clock) && typeof p.clock.day === 'string' && typeof p.clock.minutes === 'number' ? { day: p.clock.day, minutes: p.clock.minutes } : base.clock;
    return {
      v: 1,
      proposals: keep(p.proposals, (d): d is Decision => isRecord(d) && (d.decision === 'accepted' || d.decision === 'refused') && typeof d.at === 'string'),
      changes: keep(p.changes, (d): d is ChangeDecision => isRecord(d) && (d.decision === 'approved' || d.decision === 'rejected' || d.decision === 'held') && typeof d.at === 'string'),
      nextSteps: keep(p.nextSteps, (d): d is NextStep => isRecord(d) && ['action', 'owner', 'due', 'at'].every((k) => typeof d[k] === 'string')),
      repliesTried: Array.isArray(p.repliesTried)
        ? p.repliesTried.filter((x): x is ReplyTry => isRecord(x) && typeof x.text === 'string' && typeof x.kind === 'string' && typeof x.why === 'string' && typeof x.byRule === 'boolean')
        : [],
      passSteps: { '0900': numbers(steps['0900']), '1400': numbers(steps['1400']) },
      clock,
      tourStep: typeof p.tourStep === 'number' ? p.tourStep : null,
      icsDownloaded: p.icsDownloaded === true,
      called: strings(p.called),
      sent: strings(p.sent),
      pasted: p.pasted === true,
      pastedExtra: Array.isArray(p.pastedExtra)
        ? p.pastedExtra.filter((x): x is { id: string; sender: string; body: string } => isRecord(x) && typeof x.id === 'string' && typeof x.sender === 'string' && typeof x.body === 'string')
        : [],
      me: typeof p.me === 'string' ? p.me : undefined,
      todayDone: strings(p.todayDone),
      consultantReplies: isRecord(p.consultantReplies) ? (p.consultantReplies as Record<string, ConsultantReply>) : {},
    };
  } catch {
    return base;
  }
}

let state: Session = load();
const subscribers = new Set<() => void>();

function save(): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Storage blocked (private window, file:// policy): the session lives in memory only. */
  }
}

function set(next: Session): void {
  state = next;
  save();
  for (const f of subscribers) f();
}

/** The simulated time as the top bar shows it. The clock stands still unless a person changes it. */
function stamp(): string {
  return clockText(state.clock.minutes);
}

function stampLong(): string {
  return `${dateLong(state.clock.day)}, ${clockText(state.clock.minutes)}`;
}

export const replyKey = (caseId: string, topic: ConsultantTopic): string => `${caseId}:${topic}`;

export const proposalKey = (scope: string, target: string | number): string => `${scope}:${target}`;

export const actions = {
  /** Undo of markPasted, for a simulated arrival that set it (src/pages/integrations/simulate.ts). */
  unmarkPasted(): void {
    if (state.pasted) set({ ...state, pasted: false });
  },
  /** Removes the last tried reply equal to this one (the undo of a simulated text reply). */
  removeReplyTry(t: Pick<ReplyTry, 'text' | 'kind' | 'why'>): void {
    const i = state.repliesTried.map((x) => x.text === t.text && x.kind === t.kind && x.why === t.why).lastIndexOf(true);
    if (i < 0) return;
    set({ ...state, repliesTried: state.repliesTried.filter((_, j) => j !== i) });
  },
  /** Ticks or clears the "Done" box of one step of "What to do today". */
  markTodayStep(caseId: string, stepId: string, done: boolean): void {
    const key = `${caseId}:${stepId}`;
    const now = state.todayDone ?? [];
    set({ ...state, todayDone: done ? [...new Set([...now, key])] : now.filter((k) => k !== key) });
  },
  acceptProposal(scope: string, target: string | number, cell?: string): void {
    const at = stamp();
    set({ ...state, proposals: { ...state.proposals, [proposalKey(scope, target)]: { decision: 'accepted', at, ...(cell ? { cell } : {}) } } });
  },
  refuseProposal(scope: string, target: string | number, cell?: string): void {
    const at = stamp();
    set({ ...state, proposals: { ...state.proposals, [proposalKey(scope, target)]: { decision: 'refused', at, ...(cell ? { cell } : {}) } } });
  },
  undoProposal(scope: string, target: string | number): void {
    const next = { ...state.proposals };
    delete next[proposalKey(scope, target)];
    set({ ...state, proposals: next });
  },
  approveChange(slug: string, name: string): void {
    const at = stampLong();
    set({ ...state, changes: { ...state.changes, [slug]: { decision: 'approved', name: name.trim(), at } } });
  },
  rejectChange(slug: string): void {
    const at = stampLong();
    set({ ...state, changes: { ...state.changes, [slug]: { decision: 'rejected', at } } });
  },
  holdChange(slug: string, reason: string, name?: string): void {
    const at = stampLong();
    set({ ...state, changes: { ...state.changes, [slug]: { decision: 'held', reason: reason.trim(), ...(name ? { name: name.trim() } : {}), at } } });
  },
  /** The paste page ran the example file: its rows join the counts. */
  markPasted(): void {
    if (!state.pasted) set({ ...state, pasted: true });
  },
  /** Marks a consultant's answer as sent (or not) at the 9:00 a.m. pass. */
  markSent(caseId: string, made = true): void {
    const have = new Set(state.sent ?? []);
    if (made) have.add(caseId);
    else have.delete(caseId);
    set({ ...state, sent: [...have] });
  },
  /** Keeps the messages typed or loaded on the paste page. */
  setPastedExtra(list: { id: string; sender: string; body: string }[]): void {
    set({ ...state, pastedExtra: list });
  },
  /** Forgets the paste run (Start again on the paste page). */
  clearPasted(): void {
    set({ ...state, pasted: false, pastedExtra: [] });
  },
  rememberMe(name: string): void {
    if (name.trim() && state.me !== name.trim()) set({ ...state, me: name.trim() });
  },
  /** Marks a due call as made (or not) at the 9:00 a.m. pass. */
  markCalled(caseId: string, made = true): void {
    const have = new Set(state.called ?? []);
    if (made) have.add(caseId);
    else have.delete(caseId);
    set({ ...state, called: [...have] });
  },
  /** A consultant's answer on their page; it replaces their earlier answer on the same topic. */
  consultantReply(topic: ConsultantTopic, r: Omit<ConsultantReply, 'at'>): void {
    const at = stampLong();
    set({ ...state, consultantReplies: { ...state.consultantReplies, [replyKey(r.case, topic)]: { ...r, at } } });
  },
  /** Takes back a consultant's answer; a decision the coordinator made on it is cleared too. */
  undoConsultantReply(caseId: string, topic: ConsultantTopic): void {
    const replies = { ...state.consultantReplies };
    delete replies[replyKey(caseId, topic)];
    const proposals = { ...state.proposals };
    delete proposals[proposalKey('consultant', replyKey(caseId, topic))];
    set({ ...state, consultantReplies: replies, proposals });
  },
  undoChange(slug: string): void {
    const next = { ...state.changes };
    delete next[slug];
    set({ ...state, changes: next });
  },
  setNextStep(caseId: string, step: { action: string; owner: string; due: string }): void {
    const at = stamp();
    set({ ...state, nextSteps: { ...state.nextSteps, [caseId]: { ...step, at } } });
  },
  recordReplyTry(t: Omit<ReplyTry, 'at'>): void {
    const at = stamp();
    set({ ...state, repliesTried: [...state.repliesTried, { ...t, at }].slice(-50) });
  },
  markStep(pass: Pass, step: number, done = true): void {
    const have = new Set(state.passSteps[pass]);
    if (done) have.add(step);
    else have.delete(step);
    set({ ...state, passSteps: { ...state.passSteps, [pass]: [...have].sort((a, b) => a - b) } });
  },
  /** Sets the simulated clock to the start of a pass, on the given day (default: the sheet's day). */
  setClock(pass: Pass, day?: string): void {
    set({ ...state, clock: { day: day ?? state.clock.day, minutes: PASS_START[pass] } });
  },
  markIcsDownloaded(): void {
    set({ ...state, icsDownloaded: true, passSteps: { ...state.passSteps, '1400': [...new Set([...state.passSteps['1400'], 4])].sort((a, b) => a - b) } });
  },
  setTourStep(step: number | null): void {
    set({ ...state, tourStep: step });
  },
  reset(): void {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* Storage blocked: nothing was saved. */
    }
    set(fresh());
  },
};

export function getSession(): Session {
  return state;
}

/* Another tab of the same file (the consultant's page next to the coordinator's) saved the session: read it again. */
window.addEventListener('storage', (e) => {
  if (e.key !== KEY && e.key !== null) return;
  state = load();
  for (const f of subscribers) f();
});

function subscribe(f: () => void): () => void {
  subscribers.add(f);
  return () => subscribers.delete(f);
}

/** Reads a slice of the session and re-renders when that slice changes. Return a stable value (a field, not a new object). */
export function useSession<T>(select: (s: Session) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(state));
}

/** The pass the simulated clock is in: before noon the 9:00 a.m. pass, else the 2:00 p.m. review. */
export function passOf(clock: Clock): Pass {
  return clock.minutes < 12 * 60 ? '0900' : '1400';
}

export function clockLabel(clock: Clock): string {
  return `${dateLong(clock.day)}, ${clockText(clock.minutes)}`;
}
