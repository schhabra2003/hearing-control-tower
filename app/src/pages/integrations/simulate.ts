/**
 * Simulate an integration event. Every event reuses data and
 * logic the app already has: the paste export (engine.paste) through the session's "pasted" flag,
 * the Reader suggestions rows of the sheet export, the reply rule (matchReply) as the Replies page
 * runs it, the office rule (classifyOfficeReply) as the Offices page runs it, and rows of other
 * sheet tabs. No event adds new text. Each run and each undo is kept in this browser only, under
 * "hd.integrations.v1", and logged with "Example data. Nothing was sent or received."
 */

import { classifyOfficeReply, type OfficeResult } from '@engine/src/office_rule.js';
import { matchReply } from '@engine/src/replies.js';
import { useSyncExternalStore } from 'react';
import type { ReplyOut, ReplyRow, TabRow } from '@/types/data';
import { benchRows, engine, hearingByCase, hearings, suggestions, tab, type Suggestion } from '@/lib/data';
import { clockText } from '@/lib/format';
import { actions, getSession } from '@/lib/store';
import { pasteSource } from '@/lib/paste';
import { EXAMPLE_NOTE, eventById, INTEGRATIONS, type SimEvent } from './integrations';

/* ---------- what an event shows: computed from the exports, never stored ---------- */

export interface PastedRow {
  /** Row number in the pasted file, from 1, as the Paste page numbers it. */
  n: number;
  row: string[];
}

export interface ReplyRun {
  id: string;
  row: ReplyRow;
  out: ReplyOut;
}

export interface EventResult {
  messages: { id: string; sender: string; channel: string; body: string }[];
  pasted: PastedRow[];
  readerRows: Suggestion[];
  replies: ReplyRun[];
  office: OfficeResult | null;
  tabRows: { tab: string; headers: Record<string, string>; rows: TabRow[] } | null;
  printed: { case: string; property: string; text: string }[];
}

function packetMessage(id: string): EventResult['messages'][number] | null {
  const m = engine.messages.find((x) => String(x.id) === id);
  if (m) return { id, sender: m.sender, channel: m.channel, body: m.body };
  const p = engine.paste.messages.find((x) => String(x.id) === id);
  return p ? { id, sender: p.sender, channel: p.channel ?? 'email', body: p.body } : null;
}

/** Record check rows whose disagreement count (the last formula column) is above 0. */
function flaggedRecordRows(t: ReturnType<typeof tab>): TabRow[] {
  const countCol = Object.entries(t.headers).find(([, h]) => h.startsWith('Disagreements'))?.[0] ?? 'L';
  return t.rows.filter((r) => /^AX-\d+$/.test(String(r.cells.A ?? '')) && Number(r.cells[countCol] ?? 0) > 0);
}

export function eventResult(e: SimEvent): EventResult {
  const ids = new Set<string>(e.ref.messages ?? []);
  if (e.ref.paste && e.ref.paste !== 'all') ids.add(e.ref.paste);
  const messages = [...ids].map(packetMessage).filter((m): m is NonNullable<typeof m> => m !== null);

  const pasted: PastedRow[] = e.ref.paste
    ? pasteSource().rows.map((row, i) => ({ n: i + 1, row })).filter((x) => e.ref.paste === 'all' || x.row[3] === e.ref.paste)
    : [];

  const want = new Set(e.ref.rows ?? []);
  const readerRows = want.size ? suggestions().filter((s) => want.has(s.row)) : [];

  // Replies run in order, as the reply rule's command runs them: a hearing one reply takes on a
  // docket is taken for the next reply to the same docket (R01 takes hearing 1, so R16 goes to a person).
  const taken = new Map<string, number[]>();
  const replies: ReplyRun[] = (e.ref.replies ?? []).flatMap((id) => {
    const row = engine.replies.rows.find((r) => r.id === id);
    if (!row) return [];
    const day = row.day && typeof row.day.cap === 'number' ? { cap: row.day.cap, held: row.day.held ?? 0, offered: row.day.offered ?? 0 } : null;
    const before = taken.get(row.docket) ?? [];
    const out = matchReply(row.sent, row.reply, before, day);
    if (out.byRule && row.sent.kind === 'offer') taken.set(row.docket, [...before, ...out.numbers]);
    return [{ id, row, out }];
  });

  let office: OfficeResult | null = null;
  if (e.source === 'office-rule' && e.ref.county && messages[0]) {
    const county = e.ref.county;
    office = classifyOfficeReply(messages[0].body, {
      county,
      caseIds: hearings.filter((h) => h.county === county).map((h) => h.case),
      consultants: benchRows().map((r) => String(r.cells.A)),
      channel: messages[0].channel,
    });
  }

  let tabRows: EventResult['tabRows'] = null;
  if (e.ref.tab) {
    const t = tab(e.ref.tab.name);
    const rows = e.ref.tab.rows === 'flagged' ? flaggedRecordRows(t) : t.rows.filter((r) => (e.ref.tab!.rows as number[]).includes(r.row));
    tabRows = { tab: e.ref.tab.name, headers: t.headers, rows };
  }

  const printed = (e.ref.printed?.cases ?? []).flatMap((c) => {
    const h = hearingByCase(c);
    if (!h) return [];
    return h.printedLines
      .filter((l) => l.text.includes(e.ref.printed!.holds))
      .map((l) => ({ case: h.case, property: h.property, text: l.text.trim() }));
  });

  return { messages, pasted, readerRows, replies, office, tabRows, printed };
}

/** The flagged Record check rows as CSV, for the Friday export event. */
export function recordCheckCsv(): string {
  const t = tab('Record check');
  const cols = Object.keys(t.headers);
  const q = (v: unknown): string => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    '# Simulated: the flagged rows of the Record check tab of the example sheet. Example data. Nothing was sent or received.',
    cols.map((c) => q(t.headers[c])).join(','),
    ...flaggedRecordRows(t).map((r) => cols.map((c) => q(r.cells[c])).join(',')),
  ];
  return `${lines.join('\n')}\n`;
}

function downloadText(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- the runs: kept in this browser ---------- */

export interface Run {
  /** Simulated clock text when it ran, "9:00 a.m." */
  at: string;
  /** This run set the session's "pasted" flag, so its undo clears it again. */
  setPasted?: boolean;
  /** Replies this run recorded on the Replies page, so its undo removes them. */
  replyTries?: { text: string; kind: string; why: string }[];
}

export interface LogEntry {
  n: number;
  event: string;
  title: string;
  integration: string;
  what: 'ran' | 'undone';
  at: string;
}

interface SimState {
  v: 1;
  runs: Record<string, Run>;
  log: LogEntry[];
}

const KEY = 'hd.integrations.v1';
const fresh = (): SimState => ({ v: 1, runs: {}, log: [] });

function load(): SimState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<SimState>;
    if (p.v !== 1 || typeof p.runs !== 'object' || p.runs === null || !Array.isArray(p.log)) return fresh();
    const runs = Object.fromEntries(Object.entries(p.runs).filter(([id]) => eventById(id)));
    return { v: 1, runs, log: p.log.filter((l) => eventById(l.event)).slice(-50) };
  } catch {
    return fresh();
  }
}

let state: SimState = load();
const subs = new Set<() => void>();

function set(next: SimState): void {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Storage blocked: the runs live in memory only. */
  }
  for (const f of subs) f();
}

const stamp = (): string => clockText(getSession().clock.minutes);

function logged(e: SimEvent, what: LogEntry['what']): LogEntry[] {
  const n = (state.log[state.log.length - 1]?.n ?? 0) + 1;
  return [...state.log, { n, event: e.id, title: e.title, integration: e.integration, what, at: stamp() }].slice(-50);
}

/**
 * Runs one event: paste events set the session's "pasted" flag (the Paste page's own path), reply
 * events record each reply on the Replies page, the Friday export downloads its CSV. Reader rows,
 * office rule results and sheet rows are shown from the export. Returns false if it already ran.
 */
export function runEvent(id: string): boolean {
  const e = eventById(id);
  if (!e || state.runs[id]) return false;
  const run: Run = { at: stamp() };
  if (e.source === 'paste' && !getSession().pasted) {
    actions.markPasted();
    run.setPasted = true;
  }
  if (e.source === 'reply-rule') {
    const tries = eventResult(e).replies.map((r) => ({ text: r.row.reply.text, kind: r.row.sent.kind, why: r.out.why, byRule: r.out.byRule }));
    for (const t of tries) actions.recordReplyTry(t);
    run.replyTries = tries.map(({ text, kind, why }) => ({ text, kind, why }));
  }
  if (e.ref.tab?.rows === 'flagged') downloadText('record-check-flagged-SIMULATED.csv', recordCheckCsv(), 'text/csv');
  set({ ...state, runs: { ...state.runs, [id]: run }, log: logged(e, 'ran') });
  return true;
}

/** Takes one run back: clears what it set in the session, and logs the undo. */
export function undoEvent(id: string): void {
  const e = eventById(id);
  const run = state.runs[id];
  if (!e || !run) return;
  if (run.setPasted) {
    // Another simulated paste event that still stands keeps the rows; it inherits the flag.
    const heir = Object.entries(state.runs).find(([other]) => other !== id && eventById(other)?.source === 'paste');
    if (heir) state = { ...state, runs: { ...state.runs, [heir[0]]: { ...heir[1], setPasted: true } } };
    else actions.unmarkPasted();
  }
  for (const t of run.replyTries ?? []) actions.removeReplyTry(t);
  const runs = { ...state.runs };
  delete runs[id];
  set({ ...state, runs, log: logged(e, 'undone') });
}

/** Undoes every run, newest first. "Reset the example" in the shell may call it too. */
export function undoAll(): void {
  for (const id of Object.keys(state.runs).reverse()) undoEvent(id);
}

/** Clears every run and the log without touching the session; the shell's "Reset the example" calls it after actions.reset(). */
export function resetSimulations(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* Storage blocked: nothing was saved. */
  }
  set(fresh());
}

export function getSimState(): SimState {
  return state;
}

function subscribe(f: () => void): () => void {
  subs.add(f);
  return () => subs.delete(f);
}

export function useSim<T>(select: (s: SimState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(state));
}

/** Events that ran and stand, in the order of the map. */
export function standingEvents(s: SimState = state): SimEvent[] {
  return INTEGRATIONS.flatMap((i) => i.events).filter((e) => !!s.runs[e.id]);
}

export { EXAMPLE_NOTE };
