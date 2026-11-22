/**
 * AppKeyHelp: the "?" dialog for this app. Same props as components/shell/KeyHelp.tsx. Groups the
 * shell's KEY_HELP list (lib/keys.ts) so the list stays in one place.
 * Drawn with ShortcutsDialog, adapted from the 21st.dev component "Keyboard Shortcuts" by laziekiki
 * (https://21st.dev/r/laziekiki/keyboard-shortcuts).
 */

import { KEY_HELP, setShortcutsEnabled, useShortcutsEnabled } from '@/lib/keys';
import { useReturnFocus } from '@/lib/returnFocus';
import { ShortcutsDialog, type ShortcutGroup } from './ShortcutsDialog';

const ON_A_LIST = new Set(['J', 'K', 'Enter', 'A', 'R', 'N', 'X', 'O']);

/** "Go to" for G sequences, "Anywhere" for the global keys, "On a list or hearing" for row keys; ordered so two columns balance. */
export function groupKeyHelp(list: { keys: string[]; what: string }[] = KEY_HELP): ShortcutGroup[] {
  const go: ShortcutGroup = { heading: 'Go to', items: [] };
  const row: ShortcutGroup = { heading: 'On a list or hearing', items: [] };
  const any: ShortcutGroup = { heading: 'Anywhere', items: [] };
  for (const k of list) {
    if (k.keys.length === 2 && k.keys[0] === 'G') go.items.push({ keys: k.keys, what: k.what.replace(/^Go to (the )?/, '').replace(/^./, (c) => c.toUpperCase()) });
    else if (k.keys.length === 1 && ON_A_LIST.has(k.keys[0]!)) row.items.push(k);
    else any.items.push(k);
  }
  return [go, any, row].filter((g) => g.items.length > 0);
}

const GROUPS = groupKeyHelp();

/** The on and off switch for single-letter keys (WCAG 2.1.4), kept from the app's KeyHelp. */
function ShortcutsSwitch() {
  const on = useShortcutsEnabled();
  return (
    <label className="flex items-center justify-between gap-4 text-body text-ink">
      <span>
        Single-letter keys <span className="text-ink-2">(off for speech input)</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        data-testid="shortcuts-switch"
        checked={on}
        onChange={(e) => setShortcutsEnabled(e.target.checked)}
        className="size-5 accent-[var(--accent)]"
      />
    </label>
  );
}

export function AppKeyHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const onCloseAutoFocus = useReturnFocus(open);
  return <ShortcutsDialog open={open} onOpenChange={onOpenChange} groups={GROUPS} footer={<ShortcutsSwitch />} onCloseAutoFocus={onCloseAutoFocus} />;
}
