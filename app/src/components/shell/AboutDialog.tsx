/**
 * About Hearing Desk: what the app is for, and the three things a reader must know before trusting a
 * figure: the data is fictional, nothing is sent, the control tower is not built.
 * Built on the installed Radix dialog (Escape, focus trap and focus return), styled like the other
 * dialogs of the shell.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useReturnFocus } from '@/lib/returnFocus';
import { sheet } from '@/lib/data';

export const ABOUT = {
  firm: 'Alice’s Law Firm',
  what: 'Hearing coordination',
  intro:
    'Hearing Desk is the prototype of hearing coordination for Alice’s Law Firm. Each day it shows which hearings are at risk, what to do, who does it and by when, and the proof that each hearing is ready.',
  facts: [
    { term: 'Data', text: 'Fictional. Every name, office, message and hearing is made up (an example week in June 2030).' },
    { term: 'Sending', text: 'Nothing is sent. No email, text, call or filing leaves this page.' },
    { term: 'Decisions', text: 'Saved in this browser only. The coordinator records them on the sheet.' },
    { term: 'Control tower', text: 'Not built. The pages under Later show how it would work, with simulated data.' },
  ],
} as const;

export function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const onCloseAutoFocus = useReturnFocus(open);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--scrim)]" />
        <Dialog.Content
          data-testid="about-dialog"
          onCloseAutoFocus={onCloseAutoFocus}
          className="fixed top-1/2 left-1/2 z-50 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-card bg-surface text-ink shadow-e3 outline-none"
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <Dialog.Title className="text-h2-card text-ink">About Hearing Desk</Dialog.Title>
            <Dialog.Close className="l-iconbtn" aria-label="Close About" data-testid="about-close">
              <X aria-hidden size={16} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 px-6 text-body leading-normal text-ink-2">{ABOUT.intro}</Dialog.Description>
          <dl className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] gap-x-4 gap-y-2 px-6 py-4 text-body">
            {ABOUT.facts.map((f) => (
              <div key={f.term} className="contents">
                <dt className="font-medium text-ink">{f.term}</dt>
                <dd className="text-ink-2">{f.text}</dd>
              </div>
            ))}
            <div className="contents" data-testid="about-sheet-md5">
              <dt className="font-medium text-ink">Sheet</dt>
              <dd className="text-ink-2">
                gate-sheet.xlsx, md5 <span className="font-mono text-small [overflow-wrap:anywhere]">{sheet.meta.md5}</span> (from sheet.json meta)
                {sheet.meta.release ? <span className="block">{sheet.meta.release}</span> : null}
              </dd>
            </div>
          </dl>
          <p className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border px-6 py-4 text-body">
            <a className="l-link" href="#/how" onClick={() => onOpenChange(false)}>How it works</a>
            <a className="l-link" href="#/ai" onClick={() => onOpenChange(false)}>What the AI does</a>
            <a className="l-link" href="#/evidence" onClick={() => onOpenChange(false)}>How we know</a>
            <a className="l-link" href="#/later/business" onClick={() => onOpenChange(false)}>Cost and savings</a>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
