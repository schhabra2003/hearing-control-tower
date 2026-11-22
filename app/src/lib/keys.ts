/**
 * Keyboard shortcuts. Single letters are ignored while focus is in a text
 * field. Pages register their keys with useKeys; the shell registers the global ones.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';

/** A key handler. Return false when it did nothing, so the browser's own action (if any) still runs. */
export type KeyHandler = (e: KeyboardEvent) => void | boolean;

/** A key binding: "j", "Enter", "shift+d", "mod+k" (Ctrl or Cmd), or a sequence "g h". */
export type KeyMap = Record<string, KeyHandler>;

export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

const INTERACTIVE =
  'a[href],button,input,select,textarea,summary,[role=button],[role=link],[role=menuitem],[role=option],[role=tab],[role=radio],[role=switch],[role=checkbox],[role=grid],[contenteditable=true]';

/** Enter or Space on a link, button or other control belongs to that control, never to a page shortcut. */
function activatesControl(e: KeyboardEvent): boolean {
  if (e.key !== 'Enter' && e.key !== ' ') return false;
  const t = e.target as HTMLElement | null;
  return !!t?.closest?.(INTERACTIVE);
}

function chord(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.altKey) parts.push('alt');
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.shiftKey && (e.key.length > 1 || /[a-z]/i.test(e.key))) parts.push('shift');
  parts.push(key);
  return parts.join('+');
}

const SEQUENCE_MS = 1200;

/* ---------- the "Keyboard shortcuts" switch (WCAG 2.1.4) ---------- */

const KEYS_SETTING = 'hd.shortcuts.v1';
let shortcutsOn = ((): boolean => {
  try {
    return window.localStorage.getItem(KEYS_SETTING) !== 'off';
  } catch {
    return true;
  }
})();
const keySubscribers = new Set<() => void>();

/** Single-letter shortcuts are on unless a person turns them off in the key help. */
export function shortcutsEnabled(): boolean {
  return shortcutsOn;
}

export function setShortcutsEnabled(on: boolean): void {
  shortcutsOn = on;
  try {
    window.localStorage.setItem(KEYS_SETTING, on ? 'on' : 'off');
  } catch {
    /* Storage blocked: the switch holds for this visit only. */
  }
  for (const f of keySubscribers) f();
}

export function useShortcutsEnabled(): boolean {
  return useSyncExternalStore(
    (f) => {
      keySubscribers.add(f);
      return () => keySubscribers.delete(f);
    },
    () => shortcutsOn,
    () => shortcutsOn,
  );
}

/** A plain character key (no Ctrl, Cmd or Alt), the kind the switch turns off. */
const isCharacterKey = (e: KeyboardEvent): boolean => e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

/**
 * Binds keys while the component is mounted. `enabled` turns the whole map off (for example while
 * a dialog is open). Keys with a modifier work in text fields; plain keys do not, except Escape.
 */
/*
 * A started sequence ("G", waiting for "O") is shared by every useKeys in the app, so the page's own
 * single keys do not fire on the second key of a sequence that the shell binds, whichever listener
 * runs first. Each key event reads the pending prefix once, then every listener sees the same value.
 */
let seqPending: string | null = null;
let seqTimer: number | undefined;
let lastEvent: KeyboardEvent | null = null;
let eventPending: string | null = null;

export function useKeys(map: KeyMap, enabled = true): void {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.isComposing || activatesControl(e)) return;
      const c = chord(e);
      const plain = !c.includes('mod+') && !c.includes('alt+');
      if (plain && e.key !== 'Escape' && isTyping(e.target)) return;
      if (!shortcutsOn && isCharacterKey(e)) return;
      if (lastEvent !== e) {
        lastEvent = e;
        eventPending = seqPending;
        seqPending = null;
        window.clearTimeout(seqTimer);
      }
      const m = ref.current;
      if (eventPending) {
        const h = m[`${eventPending} ${c}`];
        if (h && h(e) !== false) e.preventDefault();
        // The second key of a sequence never runs a single-key binding.
        return;
      }
      if (Object.keys(m).some((k) => k.startsWith(`${c} `))) {
        seqPending = c;
        seqTimer = window.setTimeout(() => {
          seqPending = null;
        }, SEQUENCE_MS);
        return;
      }
      const h = m[c];
      if (h && h(e) !== false) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

/** The keyboard map shown by "?". */
export const KEY_HELP: { keys: string[]; what: string }[] = [
  { keys: ['Ctrl K'], what: 'Command palette (Cmd K on a Mac)' },
  { keys: ['G', 'O'], what: 'Go to the Overview' },
  { keys: ['G', 'T'], what: 'Go to Today' },
  { keys: ['G', 'H'], what: 'Go to Hearings' },
  { keys: ['G', 'S'], what: 'Go to Check messages' },
  { keys: ['G', 'R'], what: 'Go to Replies' },
  { keys: ['G', 'F'], what: 'Go to Offices' },
  { keys: ['G', 'B'], what: 'Go to the Bench' },
  { keys: ['G', 'C'], what: 'Go to the Calendar file' },
  { keys: ['G', 'M'], what: 'Go to Measures' },
  { keys: ['G', 'E'], what: 'Go to Evidence' },
  { keys: ['G', 'L'], what: 'Go to Later: Board' },
  { keys: ['J'], what: 'Next row or hearing' },
  { keys: ['K'], what: 'Previous row or hearing' },
  { keys: ['Enter'], what: 'Open the row, or save the next step' },
  { keys: ['Esc'], what: 'Close the drawer, palette or tour' },
  { keys: ['A'], what: 'Accept the proposal that has focus' },
  { keys: ['R'], what: 'Refuse the proposal that has focus' },
  { keys: ['U'], what: 'Undo the decision on the focused proposal' },
  { keys: ['X'], what: 'Mark the current pass step done' },
  { keys: ['O'], what: 'Open the hearing\'s office' },
  { keys: ['?'], what: 'Show all keys' },
  { keys: ['Shift D'], what: 'Switch light and dark' },
  { keys: ['T'], what: 'Start or resume the tour' },
];
