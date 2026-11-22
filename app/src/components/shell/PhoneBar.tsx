import * as Dialog from '@radix-ui/react-dialog';
import { MoreHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { useReturnFocus } from '@/lib/returnFocus';
import { cn } from '@/lib/cn';
import { NotBuiltTag } from '@/components/ui/NotBuiltTag';
import { NAV, PHONE_BAR, isActive } from './nav';

/** The phone's bottom bar of five (Today, 9:00 a.m. pass, Hearings, Messages, More) and the More sheet. */
export function PhoneBar({ path }: { path: string }) {
  const [more, setMore] = useState(false);
  const returnFocus = useReturnFocus(more);
  const items = NAV.flatMap((g) => g.items);
  const bar = PHONE_BAR.map((id) => items.find((i) => i.id === id)!).filter(Boolean);
  return (
    <>
      <nav aria-label="Main" data-testid="sidebar" className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        {bar.map((it) => {
          const active = isActive(it, path) || (it.id === 'today-9am' && path.startsWith('/today'));
          return (
            <a key={it.id} href={`#${it.to}`} data-testid={it.testId} aria-current={active ? 'page' : undefined} className={cn('flex flex-col items-center justify-center gap-1 text-small font-medium', active ? 'text-accent' : 'text-ink-2')}>
              <it.icon aria-hidden className="size-5" />
              {it.id === 'today-9am' ? '9:00 pass' : it.id === 'suggestions' ? 'Messages' : it.label}
            </a>
          );
        })}
        <button type="button" onClick={() => setMore(true)} className="flex flex-col items-center justify-center gap-1 text-small font-medium text-ink-2">
          <MoreHorizontal aria-hidden className="size-5" />
          More
        </button>
      </nav>
      <Dialog.Root open={more} onOpenChange={setMore}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--scrim)]" />
          <Dialog.Content onCloseAutoFocus={returnFocus} aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[var(--radius-feature)] bg-surface p-4 pb-8 text-ink shadow-e3">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-h2-card">All pages</Dialog.Title>
              <Dialog.Close aria-label="Close" className="grid size-9 place-items-center rounded-control text-ink-2"><X aria-hidden className="size-4" /></Dialog.Close>
            </div>
            {NAV.map((g) => (
              <div key={g.id} className={cn('mb-3', g.later && 'border-l border-dashed border-border-strong pl-2')}>
                {g.title ? (
                  <div className="mb-1 flex items-center justify-between px-2">
                    <p className={cn('text-eyebrow', g.later ? 'text-later' : 'text-muted')}>{g.title}</p>
                    {g.later ? <NotBuiltTag /> : null}
                  </div>
                ) : null}
                <ul className="grid grid-cols-2 gap-1">
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <a href={`#${it.to}`} onClick={() => setMore(false)} className="flex h-11 items-center gap-3 rounded-control px-2 text-body text-ink hover:bg-surface-2">
                        <it.icon aria-hidden className="size-5 text-muted" />
                        {it.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
