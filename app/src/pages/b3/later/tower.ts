/**
 * The control tower's engine session, typed. One session for the whole app, made the first time
 * a tower page opens, from the engine's exported data (src/data/engine.json). It lives in memory:
 * a reload starts again from the end of the example messages, as the old prototype does. Nothing
 * here touches the season-one session store, and nothing is sent anywhere.
 */

import { useSyncExternalStore } from 'react';
import { createSession } from '@engine/app/store.js';
import { createWorldKit } from '@engine/eval/world.js';
import { localParts, fmtTime, fmtDuration } from '@engine/src/time.js';
import { engine } from '@/lib/data';
import { dateShort } from '@/lib/format';

export type GateId = 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
export type GateStatus = 'closed' | 'waiting' | 'problem' | 'na';
export type Readiness = 'ready' | 'in_progress' | 'at_risk' | 'past' | 'post' | 'closed';
export type Level = 'L2' | 'L1' | 'L0' | 'human';
export type EvidenceRef = number | string | null;

export interface TowerGate {
  status: GateStatus;
  text: string;
  evidence: EvidenceRef[];
}

export interface Issue {
  key: string;
  severity: 'problem' | 'waiting' | 'note';
  title: string;
  detail: string;
  evidence: EvidenceRef[];
}

export interface Slot {
  date: string;
  time?: string;
  mode?: string;
  room?: string;
}

export interface Playbook {
  version: number;
  state: string;
  hearing_mode: string;
  verified_at?: string;
  verified_from?: string;
  own_fields: number;
  inherited_fields: number;
  staffing: { method: string };
  packet: { lead_hours: number; clerk_evidence: string };
  signatures: { attending_consultant_signs: boolean };
  office: { contact_hours: { days: string; start: string; end: string } };
}

export interface CaseView {
  id: string;
  stage: string;
  start: number | null;
  end: number | null;
  due: Partial<Record<GateId, number>>;
  committed: { id: string } | null;
  gates: Record<GateId, TowerGate>;
  readiness: Readiness;
  covered: boolean;
  issues: Issue[];
  ledger: { property: string; county: string; homeowner: string; schedule: Slot | null };
  record: { tax_year?: string };
  playbook: Playbook;
}

export interface Draft {
  to?: string;
  subject?: string;
  body: string;
  attachments?: { name: string; text?: string }[];
}

export interface ReplyChoice {
  label: string;
  tone?: string;
  message: { body: string; [key: string]: unknown };
}

export interface Item {
  key: string;
  cases: string[];
  evidence: EvidenceRef[];
  phase: 'todo' | 'waiting';
  kind: string;
  level: Level;
  to?: { name: string; channel?: string };
  title: string;
  why: string;
  due?: number;
  sentAt?: number;
  followUpAt?: number;
  replyBy?: number;
  county?: string;
  draft?: Draft;
  replies?: ReplyChoice[];
  blocked?: string;
  checks?: string[];
  driftQuote?: string;
  proposal?: { path: string; from: string; to: string }[];
  message?: { id: number | string };
}

export interface Claim {
  type: string;
  cases: string[];
  quote?: string;
  disposition: string;
  reason: string;
  effects: { caseId: string; text: string }[];
  date?: string;
  time?: string;
  consultant?: string;
}

export interface Msg {
  id: number | string;
  ts: number;
  sender: string;
  address: string | null;
  channel: string;
  body: string;
  role: string;
  county: string | null;
  consultant: string | null;
  homeowner: string | null;
  spoofSuspected: boolean;
  caseIds: string[];
  alsoCases?: string[];
  resolvedBy: string;
  verbal: boolean;
  direction: 'in' | 'out';
  claims: Claim[];
  opened: { caseId: string; title: string }[];
  closed: { caseId: string; title: string }[];
  readinessChanges: { caseId: string; from: Readiness; to: Readiness }[];
  attention?: string[];
  reader?: string;
  corrects?: unknown;
}

export interface Sent {
  at: number;
  level: Level;
  title: string;
  to?: { name: string };
  cases: string[];
  draft?: Draft;
}

export interface Directory {
  consultantById: Record<string, { name: string; email?: string }>;
  consultants: { id: string; name: string; email?: string }[];
  counties: { county: string; office_email: string }[];
  cases: { case_id: string; property: string; county: string; homeowner: string }[];
  caseById: Record<string, { property: string }>;
}

export interface CountyFile {
  id: string;
  county: string;
  [key: string]: unknown;
}

export interface Drift {
  status: string;
  quote?: string;
  text?: string;
}

export interface RawMessage {
  sender: string;
  address: string;
  channel: string;
  body: string;
  caseIds: string[];
}

export interface ForcedClaim {
  type: string;
  cases: string[];
  quote: string;
  [key: string]: unknown;
}

interface Run<T> {
  result: T;
  auto: number;
}

/** The session API of engine/app/store.js, as the tower pages use it. */
export interface Tower {
  s: { N: number; cursor: number; version: number; auto: boolean; log: unknown[] };
  readonly now: number;
  readonly live: boolean;
  readonly view: { cases: CaseView[]; counts: Record<Readiness, number> };
  readonly items: Item[];
  readonly messages: Msg[];
  readonly outbox: Sent[];
  readonly canUndo: boolean;
  eng: {
    dir: Directory;
    books: Record<string, Playbook>;
    layers: { default: { packet: { lead_hours: number; clerk_evidence: string }; office: { contact_hours: { start: string; end: string } }; autonomy: Record<string, Level> }; counties: CountyFile[] };
    state: { drift: Record<string, Drift> };
  };
  subscribe(f: () => void): () => void;
  act(key: string): Run<{ refused?: boolean; reason?: string; title?: string } | null> | null;
  reply(message: ReplyChoice['message'], label: string): Run<Msg | null> | null;
  send(raw: RawMessage, claims?: ForcedClaim[] | null): Run<Msg | null> | null;
  dismiss(county: string): unknown;
  editDefault(patch: unknown): unknown;
  addCounty(county: unknown): unknown;
  advance(ms: number): unknown;
  goto(ts: number): unknown;
  nextTimer(): { at: number; why: string } | null;
  nextMorning(): number;
  step(): { type: 'act' | 'reply'; text: string } | null;
  playForward(): { L2: number; L1: number; L0: number; human: number; replies: number };
  setAuto(on: boolean): void;
  undo(): void;
  reset(): void;
  seek(k: number): void;
  countsByLevel(): Record<Level, number>;
}

export interface Problem {
  id: string;
  group: string;
  problem: string;
  expect: string;
}

export interface ProblemResult {
  id: string;
  ok: boolean;
  error?: string;
}

export interface WorldKit {
  problems: Problem[];
  runOne(p: Problem, cache: Record<string, unknown>): ProblemResult;
}

let session: Tower | null = null;
let kit: WorldKit | null = null;

/** The one tower session; engine.json carries everything createSession needs. */
export function tower(): Tower {
  // createSession is plain JavaScript; its shape is the Tower interface above.
  if (!session) {
    session = createSession(engine) as unknown as Tower;
    // Automatic sends start off: a person turns on the simulation on the Work queue.
    session.setAuto(false);
    session.reset();
  }
  return session;
}

export function worldKit(): WorldKit {
  // createWorldKit is plain JavaScript; its shape is the WorldKit interface above.
  if (!kit) kit = createWorldKit({ packet: engine.packet, playbooks: engine.playbooks, messages: engine.messages, gold: engine.gold }) as WorldKit;
  return kit;
}

/** Re-renders when the session changes (every act, reply, seek, undo or reset bumps s.version). */
export function useTower(): Tower {
  const t = tower();
  useSyncExternalStore(
    (f) => t.subscribe(f),
    () => t.s.version,
  );
  return t;
}

/* ---------- words, in a coordinator's vocabulary (from engine/app/ui.js) ---------- */

export type Tone = 'ok' | 'warn' | 'danger' | 'neutral' | 'info';

export const READINESS: Record<Readiness, { label: string; tone: Tone; help: string }> = {
  ready: { label: 'Ready', tone: 'ok', help: 'All five checks are done, each proved by the party that can prove it.' },
  in_progress: { label: 'In progress', tone: 'warn', help: 'Nothing is wrong. Something is still on its way.' },
  at_risk: { label: 'At risk', tone: 'danger', help: 'At least one check has a problem that needs action.' },
  past: { label: 'Outcome unknown', tone: 'danger', help: 'The hearing time has passed and nobody has reported what happened.' },
  post: { label: 'After the hearing', tone: 'neutral', help: 'The hearing took place. Follow-up may still be open.' },
  closed: { label: 'Closed', tone: 'neutral', help: 'Withdrawn, and the office has processed it.' },
};

export const READINESS_ORDER: Readiness[] = ['at_risk', 'in_progress', 'ready', 'past', 'post', 'closed'];

export const GATE_STATUS: Record<GateStatus, { label: string; tone: Tone }> = {
  closed: { label: 'Done', tone: 'ok' },
  waiting: { label: 'Waiting', tone: 'warn' },
  problem: { label: 'Problem', tone: 'danger' },
  na: { label: 'Not needed', tone: 'neutral' },
};

export const LEVELS: Record<Level, { label: string; help: string }> = {
  L2: { label: 'Automatic', help: 'Would be sent by the later tool and logged (not built). Routine, reversible, and to people who expect it.' },
  L1: { label: 'One click', help: 'The later tool would write it. A person approves it with one click.' },
  L0: { label: 'Person sends', help: 'The later tool would draft it. A person reads, edits and sends it.' },
  human: { label: 'Person only', help: 'Only a person can do this: a phone call, a judgment, a signature.' },
};

export const LEVEL_ORDER: Level[] = ['L2', 'L1', 'L0', 'human'];

export const DISPOSITION: Record<string, { label: string; tone: Tone }> = {
  fact: { label: 'Official fact', tone: 'ok' },
  provisional: { label: 'Held: not in writing', tone: 'warn' },
  flag: { label: 'Flag raised', tone: 'danger' },
  request: { label: 'Request', tone: 'neutral' },
  belief: { label: 'Belief only', tone: 'neutral' },
  signal: { label: 'Lead to verify', tone: 'warn' },
  held: { label: 'Held: not said plainly', tone: 'warn' },
  note: { label: 'Note', tone: 'neutral' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export const words = (t: string): string => t.replace(/_/g, ' ');
export const cap = (t: string): string => (t ? t[0]!.toUpperCase() + t.slice(1) : t);
export const claimLabel = (type: string): string => cap(words(type));
export const addrOf = (property: string): string => property.split(',')[0] ?? property;

/** "Fri, Jun 7, 9 a.m." in the tower's time zone (UTC-05:00, as the example packet). */
export function when(ts: number | null | undefined): string {
  if (!ts) return '';
  const p = localParts(ts);
  return `${dateShort(p.date)}, ${fmtTime(p.time)}`;
}

/** "in 2h 05m" or "3d 4h ago". */
export function rel(ts: number | null | undefined, now: number): string {
  if (ts == null) return '';
  return ts >= now ? `in ${fmtDuration(ts - now)}` : fmtDuration(ts - now);
}

export function dayOf(ts: number): string {
  return localParts(ts).date;
}

export { fmtTime };
