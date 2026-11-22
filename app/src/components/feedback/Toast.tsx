/**
 * Toasts and the notifications log they feed. A drop-in for components/ui/Toast.tsx: the same
 * `toast()`, `dismissToast()`, `clearToasts()` and `<Toaster>`, so every call site keeps working.
 *
 * Adapted from three 21st.dev components:
 * - "Toast" by shugar, https://21st.dev/r/shugar/toast (id 3978): the module-level store with add
 *   and remove, and the Undo action on the toast.
 * - "Pixel Toaster" by lumesec, https://21st.dev/r/lumesec/px-toaster (id 44967): the countdown
 *   that stops while the stack is hovered OR holds keyboard focus and restarts afterwards, and the
 *   draining timer bar that dims while paused. Drawn here as a 2 px hairline in the accent, not
 *   as pixels on a canvas.
 * - "Notification Panel" by uvain, https://21st.dev/r/uvain/notification-panel (id 27135): every
 *   toast is also a row of a persistent log, and an action taken settles the row into a quiet
 *   line that says what happened instead of removing it.
 *
 * Changes for Hearing Desk: one toast on screen at a time , 8 seconds
 * by default (the 22:55 rule), a persistent visually hidden role="status" region that speaks each
 * new toast (a live region added together with its text is often not announced), role="alert"
 * only for the error tone, our tokens, no colour fills, motion off under reduced motion.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DUR, tween } from '@/lib/motion';

/** The four tones. The old names (info, success, error) are accepted for one release and mapped on entry. */
export type ToastTone = 'neutral' | 'ok' | 'warn' | 'danger';
type ToneIn = ToastTone | 'info' | 'success' | 'error';
const TONE_IN: Record<ToneIn, ToastTone> = { neutral: 'neutral', ok: 'ok', warn: 'warn', danger: 'danger', info: 'neutral', success: 'ok', error: 'danger' };

export interface ToastInput {
  /** One short line: what happened ("Accepted AX-107 G1"). Plain text. */
  title: string;
  /** At most one more line: what to do next ("Paste the link in Hearings I11."). */
  body?: string;
  tone?: ToneIn;
  /** One action, usually Undo. It stays available from the notifications list. */
  action?: { label: string; run: () => void; /** What the log row says once the action ran. Default "Undone". */ done?: string };
  /** Milliseconds on screen; default 8000. 0 keeps it until it is closed. */
  duration?: number;
  /** A route the log row links to, for example "/hearings/AX-107". */
  href?: string;
  /** The decision the action takes back ("suggestion:10"), so an Undo elsewhere on the page settles this row (undoByKey). */
  key?: string;
}

export interface LogEntry {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
  href?: string;
  /** Simulated clock text when it happened, from the stamp the shell sets ("9:04 a.m."). */
  at: string;
  read: boolean;
  /** The action label, while it can still run. */
  actionLabel?: string;
  /** Set once the action ran: what the row now says. */
  resolved?: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

/* ---------------------------------------------------------------- the store */

/** The log is saved beside the session (hd.session.v1) so it survives a reload; Undo does not, since its function cannot be saved. */
const LOG_KEY = 'hd.notifications.v1';

function loadLog(): LogEntry[] {
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const p: unknown = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p
      .filter((e): e is LogEntry => typeof e === 'object' && e !== null && typeof (e as LogEntry).id === 'number' && typeof (e as LogEntry).title === 'string')
      .map((e) => ({ ...e, actionLabel: undefined }));
  } catch {
    return [];
  }
}

function saveLog(): void {
  try {
    if (log.length) window.localStorage.setItem(LOG_KEY, JSON.stringify(log));
    else window.localStorage.removeItem(LOG_KEY);
  } catch {
    /* Storage blocked: the list lives in memory only. */
  }
}

let current: ToastItem[] = [];
let log: LogEntry[] = loadLog();
const runs = new Map<number, ToastInput['action']>();
/** Decision key to the newest log row whose action takes it back. */
const keyed = new Map<string, number>();
let nextId = log.reduce((m, e) => Math.max(m, e.id), 0) + 1;
let stamp: () => string = () => '';
const subs = new Set<() => void>();
let savedLog: LogEntry[] = log;
const emit = (): void => {
  if (log !== savedLog) {
    savedLog = log;
    saveLog();
  }
  for (const f of subs) f();
};
const subscribe = (f: () => void): (() => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** The shell sets how a log row is timed, usually the simulated clock: `setStamp(() => clockText(...))`. */
export function setStamp(fn: () => string): void {
  stamp = fn;
}

/** Shows one toast (replacing any other) and records it in the notifications log. Returns its id. */
export function toast(t: ToastInput): number {
  const id = nextId;
  nextId += 1;
  current = [{ ...t, id }];
  if (t.action) runs.set(id, t.action);
  if (t.action && t.key) keyed.set(t.key, id);
  log = [{ id, title: t.title, body: t.body, tone: TONE_IN[t.tone ?? 'neutral'], href: t.href, at: stamp(), read: false, actionLabel: t.action?.label }, ...log].slice(0, 50);
  emit();
  return id;
}

/** Closes the toast on screen. The log keeps the entry. */
export function dismissToast(id: number): void {
  if (!current.some((t) => t.id === id)) return;
  current = current.filter((t) => t.id !== id);
  emit();
}

/** Clears the toast on screen; the shell calls it on a route change. The log keeps the entry. */
export function clearToasts(): void {
  if (!current.length) return;
  current = [];
  emit();
}

/** Runs an entry's action (from the toast or the list) once, and settles the log row. */
export function runAction(id: number): void {
  const a = runs.get(id);
  if (!a) return;
  a.run();
  runs.delete(id);
  const when = stamp();
  const done = a.done ?? 'Undone';
  const was = log.find((e) => e.id === id);
  log = log.map((e) => (e.id === id ? { ...e, actionLabel: undefined, resolved: when ? `${done} at ${when}` : done } : e));
  if (was) {
    const undoneId = nextId;
    nextId += 1;
    log = [{ id: undoneId, title: `${done}. ${firstClause(was.title)}`, tone: 'neutral' as const, href: was.href, at: when, read: false }, ...log].slice(0, 50);
  }
  current = current.filter((t) => t.id !== id);
  emit();
}

/**
 * Takes back one decision from a row's own Undo button, the same way as the toast or the list:
 * when the newest log row for this key can still run its Undo, that runs (the row settles and an
 * "Undone" row is added). Otherwise `fallback` takes the decision back and an "Undone" row is added.
 */
export function undoByKey(key: string, fallback: () => void, title: string): void {
  const id = keyed.get(key);
  if (id !== undefined && runs.has(id)) {
    runAction(id);
    return;
  }
  fallback();
  const at = stamp();
  const undoneId = nextId;
  nextId += 1;
  log = [{ id: undoneId, title: `Undone. ${firstClause(title)}`, tone: 'neutral' as const, at, read: false }, ...log].slice(0, 50);
  emit();
}

export function markAllRead(): void {
  if (!log.some((e) => !e.read)) return;
  log = log.map((e) => ({ ...e, read: true }));
  emit();
}

/** Empties the log, for "Reset the example". */
export function clearLog(): void {
  log = [];
  runs.clear();
  keyed.clear();
  current = [];
  emit();
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, () => current);
}

export function useNotificationLog(): LogEntry[] {
  return useSyncExternalStore(subscribe, () => log);
}

/** Read-only copy of the log for window.hearingDesk and the #/agents page. */
export function notificationLog(): readonly LogEntry[] {
  return log;
}

/* ---------------------------------------------------------------- the view */

const DOT: Record<ToastTone, string> = {
  neutral: 'bg-muted',
  ok: 'bg-dot-ok',
  warn: 'bg-dot-warn',
  danger: 'bg-dot-danger',
};

function ToastCard({ t, paused }: { t: ToastItem; paused: boolean }) {
  const reduce = useReducedMotion();
  const duration = t.duration ?? 8000;
  const left = useRef(duration);
  const startedAt = useRef<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const [share, setShare] = useState(1);

  useEffect(() => {
    if (duration <= 0) return undefined;
    if (paused) {
      if (startedAt.current !== null) left.current -= performance.now() - startedAt.current;
      startedAt.current = null;
      window.clearTimeout(timer.current);
      setShare(Math.max(0, left.current / duration));
      return undefined;
    }
    startedAt.current = performance.now();
    timer.current = window.setTimeout(() => dismissToast(t.id), Math.max(0, left.current));
    setShare(0);
    return () => window.clearTimeout(timer.current);
  }, [paused, duration, t.id]);

  const remainingMs = Math.max(0, left.current);
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 4 }}
      transition={tween(DUR.pop, reduce)}
      data-testid="toast"
      data-tone={TONE_IN[t.tone ?? 'neutral']}
      className="pointer-events-auto relative w-[400px] max-w-[calc(100vw-32px)] overflow-hidden rounded-control bg-surface text-ink shadow-e2"
    >
      <div className="flex items-start gap-3 py-3 pr-2 pl-4">
        <span aria-hidden className={cn('mt-2 size-2 shrink-0 rounded-full', DOT[TONE_IN[t.tone ?? 'neutral']])} />
        <div className="min-w-0 flex-1">
          <p data-testid="toast-title" className="text-body font-semibold">{t.title}</p>
          {t.body ? <p className="mt-1 text-body text-ink-2">{t.body}</p> : null}
        </div>
        {t.action ? (
          <button
            type="button"
            data-testid="toast-action"
            aria-label={t.action.label === 'Undo' ? undoName(t.title) : undefined}
            onClick={() => runAction(t.id)}
            className="h-8 shrink-0 rounded-control border border-border-control bg-surface px-3 text-small font-medium text-ink transition-colors duration-[var(--dur-color)] hover:bg-surface-2 active:bg-sunken"
          >
            {t.action.label}
          </button>
        ) : null}
        <button
          type="button"
          aria-label={`Close: ${t.title}`}
          data-testid="toast-close"
          onClick={() => dismissToast(t.id)}
          className="grid size-8 shrink-0 place-items-center rounded-control text-muted transition-colors duration-[var(--dur-color)] hover:bg-surface-2 hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      {duration > 0 ? (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-border">
          <span
            className={cn('block h-full origin-left bg-accent', paused ? 'opacity-40' : 'opacity-70')}
            style={{
              transform: `scaleX(${share})`,
              transition: paused || reduce ? 'none' : `transform ${remainingMs}ms linear`,
            }}
          />
        </span>
      ) : null}
    </motion.li>
  );
}

export interface ToasterProps {
  /** Placement classes, for example the left offset of the sidebar. Default bottom left. */
  className?: string;
  /** "top-on-phone" keeps the toast clear of the answer buttons on a 390 px phone page (UX-17). */
  placement?: 'bottom' | 'top-on-phone';
}

/** "Accepted: AX-103, date confirmed by the office": the toast's first sentence, at most 64 characters. */
function firstClause(title: string): string {
  const first = title.split(/\.(?:\s|$)/)[0] ?? title;
  return first.length > 64 ? `${first.slice(0, 63).trimEnd()}…` : first;
}

/** "Undo: Accepted: AX-103, date confirmed by the office". */
function undoName(title: string): string {
  return `Undo: ${firstClause(title)}`;
}

/** Bottom left, clear of the row actions on the right. One toast at a time. */
export function Toaster({ className, placement = 'bottom' }: ToasterProps) {
  const list = useToasts();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const spoken = list[0];
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="toast-live">
        {spoken && TONE_IN[spoken.tone ?? 'neutral'] !== 'danger' ? [spoken.title, spoken.body].filter(Boolean).join('. ') : ''}
      </div>
      <div role="alert" aria-atomic="true" className="sr-only">
        {spoken && TONE_IN[spoken.tone ?? 'neutral'] === 'danger' ? [spoken.title, spoken.body].filter(Boolean).join('. ') : ''}
      </div>
      <section aria-label="Latest message">
        <ol
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
          }}
          className={cn('pointer-events-none fixed left-4 z-[70] flex flex-col items-start gap-2', placement === 'top-on-phone' ? 'sm:bottom-4 max-sm:top-20' : 'bottom-4 max-sm:bottom-20', className)}
        >
          <AnimatePresence initial={false}>
            {list.map((t) => (
              <ToastCard key={t.id} t={t} paused={hovered || focused} />
            ))}
          </AnimatePresence>
        </ol>
      </section>
    </>
  );
}
