/**
 * ShortcutsDialog ("?"): every key, in groups, with a filter field.
 *
 * Adapted from the 21st.dev component "Keyboard Shortcuts" by laziekiki
 * (https://21st.dev/r/laziekiki/keyboard-shortcuts): grouped rows, a filter that matches the
 * action, the keys or the group, and sequences shown as "G then H". Its hand-made portal and focus
 * trap are replaced by a Radix dialog (focus trap, Escape, focus return); its gradient key caps,
 * italic "then", zinc colours and spring are replaced by the app's Kbd and tokens.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { Search, X } from 'lucide-react';
import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react';
import { Kbd } from '@/components/ui/Kbd';

export interface Shortcut {
  /** One entry per key pressed in turn: ["G", "H"] is G then H; ["Shift D"] is a chord. */
  keys: string[];
  what: string;
}

export interface ShortcutGroup {
  heading: string;
  items: Shortcut[];
}

export interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ShortcutGroup[];
  title?: string;
  testId?: string;
  /** Shown under the list, for example the switch that turns single-letter keys off. */
  footer?: ReactNode;
  /** Passed to Radix, so the app can return focus where the dialog was opened from. */
  onCloseAutoFocus?: (e: Event) => void;
}

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      {keys.map((k, i) => (
        <Fragment key={`${k}-${i}`}>
          {i > 0 ? <span className="text-small text-muted">then</span> : null}
          <span className="flex items-center gap-1">
            {k.split(' ').map((part) => (
              <Kbd key={part} className="h-6 min-w-6 px-2 text-small">{part}</Kbd>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

export function ShortcutsDialog({ open, onOpenChange, groups, title = 'Keys', testId = 'key-help', footer, onCloseAutoFocus }: ShortcutsDialogProps) {
  const [query, setQuery] = useState('');
  const filterRef = useRef<HTMLInputElement>(null);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => it.what.toLowerCase().includes(q) || it.keys.join(' ').toLowerCase().includes(q) || g.heading.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQuery('');
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--scrim)]" />
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            filterRef.current?.focus();
          }}
          data-testid={testId}
          aria-describedby={undefined}
          className="fixed top-[10vh] left-1/2 z-50 flex max-h-[80vh] w-[880px] max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col overflow-hidden rounded-card bg-surface text-ink shadow-e3 outline-none"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <Dialog.Title className="text-section">{title}</Dialog.Title>
            <Dialog.Close aria-label="Close" className="grid size-9 place-items-center rounded-control text-ink-2 hover:bg-surface-2 hover:text-ink">
              <X aria-hidden className="size-4" />
            </Dialog.Close>
          </div>
          <label className="flex items-center gap-3 border-b border-border px-4">
            <Search aria-hidden className="size-4 shrink-0 text-muted" />
            <span className="sr-only">Filter keys</span>
            <input
              ref={filterRef}
              data-testid={`${testId}-filter`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter keys"
              className="h-12 min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
            />
          </label>
          <div className="min-h-0 flex-1 gap-6 overflow-y-auto px-3 pt-1 pb-3 md:columns-2">
            {shown.length === 0 ? (
              <p className="px-2 py-10 text-center text-body text-muted">No key matches.</p>
            ) : (
              shown.map((g) => (
                <section key={g.heading} className="break-inside-avoid" aria-labelledby={`keys-${slug(g.heading)}`}>
                  <h3 id={`keys-${slug(g.heading)}`} className="text-eyebrow px-2 pt-4 pb-2 text-muted">{g.heading}</h3>
                  <ul>
                    {g.items.map((it) => (
                      <li key={it.what} className="flex min-h-10 items-center justify-between gap-4 rounded-control px-2 py-2 hover:bg-surface-2">
                        <span className="text-body text-ink-2">{it.what}</span>
                        <Keys keys={it.keys} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
          {footer ? <div className="border-t border-border px-4 py-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
