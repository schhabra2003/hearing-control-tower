/**
 * Live AI client. When the app is served by the live server (`npm run live`), GET /api/status says
 * whether the two readers run live on the firm's own key or replay recorded answers, and
 * POST /api/read reads messages with exactly the code of `node cli/sheet.js --paste`. Opened as a
 * file (no server), the app keeps its recorded answers and says so. The key never reaches the
 * browser: the server holds it.
 */

import { useSyncExternalStore } from 'react';
import type { PasteResult } from '@/types/data';
import { setPasteOverride } from '@/lib/paste';
import { actions, getSession } from '@/lib/store';

export type LiveMode = 'live' | 'recorded';

export interface LiveStatus {
  mode: LiveMode;
  /** True when the next read will call the models (live and under the spend cap). */
  live: boolean;
  reason: string;
  models: { reader: string; second: string };
  readerLabels: string[] | null;
  costUsd: number;
  requests: number;
  cap: number;
  runs: number;
  busy: boolean;
  maxMessages: number;
}

export interface LiveMessage {
  id?: string | number;
  sender: string;
  channel?: string;
  body: string;
  properties?: string[];
  address?: string;
  at?: string;
}

export interface LiveResult extends PasteResult {
  mode: LiveMode;
  capReached: boolean;
  readLive: (string | number)[];
  failed: (string | number)[];
  example: (string | number)[];
  ms: number;
  costUsd: number;
  requests: number;
  status: LiveStatus;
}

export interface LiveRun {
  state: 'idle' | 'running' | 'done' | 'error';
  /** Answers received and expected, counted per request (two readers per message). */
  done: number;
  total: number;
  /** The message the readers are on now. */
  current: string | null;
  startedAt: number | null;
  result: LiveResult | null;
  error: string | null;
}

interface LiveState {
  /** "none": the app is not served by the live server (opened as a file, or the server is down). */
  server: 'unknown' | 'none' | 'up';
  status: LiveStatus | null;
  run: LiveRun;
}

const IDLE: LiveRun = { state: 'idle', done: 0, total: 0, current: null, startedAt: null, result: null, error: null };
let state: LiveState = { server: 'unknown', status: null, run: IDLE };

// The last server read survives a reload of this tab (the session's decisions do too), so the
// decisions keep pointing at the rows they were made on. Browser storage may be blocked: then the
// tab simply starts from the recorded rows.
const SAVE_KEY = 'hd.live.v1';
function save(r: LiveResult | null): void {
  try {
    if (r) window.sessionStorage.setItem(SAVE_KEY, JSON.stringify(r));
    else window.sessionStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage blocked: nothing to keep */
  }
}
function restore(): void {
  try {
    const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(SAVE_KEY) : null;
    if (!raw) return;
    const r = JSON.parse(raw) as LiveResult;
    if (!Array.isArray(r.rows) || !getSession().pasted) return;
    setPasteOverride(toPaste(r));
    state = { ...state, run: { ...IDLE, state: 'done', result: r } };
  } catch {
    /* nothing kept */
  }
}
const subs = new Set<() => void>();
const set = (next: Partial<LiveState>): void => {
  state = { ...state, ...next };
  subs.forEach((f) => f());
};

export const getLive = (): LiveState => state;
export function useLive<T>(select: (s: LiveState) => T): T {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => select(state),
    () => select(state),
  );
}

/** The chip's word: "Live AI" only when the next read calls the models. */
export function liveLabel(s: LiveState = state): 'Live AI' | 'Recorded answers' {
  return s.server === 'up' && s.status?.live ? 'Live AI' : 'Recorded answers';
}

/** One sentence for the chip's hint and for agents. */
export function liveSentence(s: LiveState = state): string {
  if (s.server !== 'up' || !s.status) return 'This copy of the app has no live server, so the readers replay recorded answers. Start it with npm run live to read new messages with your own key.';
  if (s.status.live) return `The two readers run live: ${s.status.models.reader} checked by ${s.status.models.second}. Spent so far $${s.status.costUsd.toFixed(2)} of the $${s.status.cap.toFixed(2)} cap.`;
  return s.status.reason;
}

export const usd = (n: number): string => (n < 0.01 && n > 0 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

const canFetch = (): boolean => typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol);

/** Asks the server once (and again after each read). Never throws. */
export async function refreshLiveStatus(): Promise<LiveStatus | null> {
  if (!canFetch()) {
    set({ server: 'none', status: null });
    return null;
  }
  try {
    const ctl = new AbortController();
    const t = window.setTimeout(() => ctl.abort(), 4000);
    const res = await fetch('/api/status', { headers: { accept: 'application/json' }, signal: ctl.signal });
    window.clearTimeout(t);
    if (!res.ok) throw new Error(String(res.status));
    const s = (await res.json()) as LiveStatus;
    if (!s || (s.mode !== 'live' && s.mode !== 'recorded')) throw new Error('not the live server');
    set({ server: 'up', status: s });
    return s;
  } catch {
    set({ server: 'none', status: null });
    return null;
  }
}

/** True when a read should go to the server (live or recorded there); false for the built-in replay. */
export const serverReads = (): boolean => state.server === 'up';

/**
 * Reads messages on the server, with progress per request. On success the rows replace the
 * recorded paste rows everywhere (Paste, Reader suggestions, Offices), and earlier decisions on
 * pasted rows are cleared, because they were about other rows.
 */
export async function readOnServer(messages: LiveMessage[]): Promise<LiveResult> {
  set({ run: { ...IDLE, state: 'running', startedAt: Date.now() } });
  try {
    const res = await fetch('/api/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok || !res.body) {
      let why = `The server answered ${res.status}.`;
      try {
        why = ((await res.json()) as { error?: string }).error ?? why;
      } catch {
        /* keep the status line */
      }
      throw new Error(why);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let result: LiveResult | null = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (value) buf += dec.decode(value, { stream: true });
      let nl = buf.indexOf('\n');
      while (nl >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        nl = buf.indexOf('\n');
        if (!line) continue;
        const ev = JSON.parse(line) as { type: string; [k: string]: unknown };
        const run = state.run;
        if (ev.type === 'start') set({ run: { ...run, total: Number(ev.expectedRequests) || 0 } });
        else if (ev.type === 'progress' && ev.stage === 'request') set({ run: { ...run, current: String(ev.message ?? '') } });
        else if (ev.type === 'progress' && ev.stage === 'answer') set({ run: { ...run, done: run.done + 1 } });
        else if (ev.type === 'error') throw new Error(String(ev.error ?? 'The read failed.'));
        else if (ev.type === 'result') result = ev as unknown as LiveResult;
      }
      if (done) break;
    }
    if (!result) throw new Error('The server closed the connection before the result.');
    applyResult(result);
    set({ status: result.status, run: { ...state.run, state: 'done', current: null, result } });
    return result;
  } catch (e) {
    set({ run: { ...state.run, state: 'error', current: null, error: e instanceof Error ? e.message : String(e) } });
    void refreshLiveStatus();
    throw e;
  }
}

/** The server's rows become the paste rows; decisions on the old rows are undone, not carried over. */
function applyResult(r: LiveResult): void {
  const s = getSession();
  for (const key of Object.keys(s.proposals ?? {})) {
    const m = /^paste[:/-](\d+)$/.exec(key);
    if (m) actions.undoProposal('paste', Number(m[1]));
  }
  setPasteOverride(toPaste(r));
  save(r);
  actions.markPasted();
}

function toPaste(r: LiveResult): PasteResult {
  return {
    command: `POST /api/read (${r.mode === 'live' ? 'live readers' : 'recorded answers'}; the code of node cli/sheet.js --paste)`,
    messages: r.messages,
    rows: r.rows,
    count: r.count,
    how: r.how,
    replayed: r.replayed,
    missing: r.missing,
    nothingProposed: r.nothingProposed,
    readerLabels: r.readerLabels,
    lines: r.lines,
  };
}

/** Back to the recorded example rows (Start again). */
export function forgetServerRun(): void {
  setPasteOverride(null);
  save(null);
  set({ run: IDLE });
}

/** For window.hearingDesk.live(): read-only, no key, no message bodies. */
export function liveForAgents(): { label: string; sentence: string; server: string; status: LiveStatus | null; lastRun: Omit<LiveRun, 'result'> & { rows: number; costUsd: number | null; ms: number | null; mode: string | null } } {
  const { result, ...run } = state.run;
  return {
    label: liveLabel(),
    sentence: liveSentence(),
    server: state.server,
    status: state.status,
    lastRun: { ...run, rows: result?.rows.length ?? 0, costUsd: result?.costUsd ?? null, ms: result?.ms ?? null, mode: result?.mode ?? null },
  };
}

restore();
