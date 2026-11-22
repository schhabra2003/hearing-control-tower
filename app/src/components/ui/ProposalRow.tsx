/**
 * ProposalRow: one reader suggestion with Accept, Refuse and Undo, the same on every page.
 * Kept our own: no 21st.dev component decides one value with a quoted source and keyboard keys
 * (A, R, U). Its buttons are the shared Button ("Button" by coss.com,
 * https://21st.dev/r/coss.com/coss-button, and "Button" by wensity, https://21st.dev/r/wensity/button).
 * Accept, Refuse and Undo are 40 px.
 */
import { Check, Undo2, X } from 'lucide-react';
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { Suggestion } from '@/lib/data';
import { proposedBy } from '@/lib/decisions';
import { decisionKey, focusNextDecision } from '@/lib/focusNext';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { CopyLink } from './CopyLink';
import { useProposalDecision } from './useProposalDecision';

export interface ProposalRowProps {
  /** The row of the Reader suggestions tab this decides. */
  s: Suggestion;
  /** What is proposed, in plain words: "Close with message 7", or the value to type. */
  proposal: ReactNode;
  /** The words of the message it relies on, or the reason in one line. */
  quote?: ReactNode;
  /** "Tesswick hearing office, message 24". */
  from?: ReactNode;
  /** Test id base: proposal-<base>, accept-<base>, refuse-<base>, undo-<base>. */
  testIdBase: string;
  /** What a screen reader hears on Accept and Refuse: "G3 proof link for AX-107, message 24". */
  name: string;
  className?: string;
}

/**
 * A proposal a person accepts or refuses (A and R when the row has focus), in the hearing drawer and
 * on the hearing page. It says who proposed it (the readers or a rule), and decides through the same
 * hook as the Reader suggestions page, so the cells to type and Undo read the same everywhere.
 */
export function ProposalRow({ s, proposal, quote, from, testIdBase, name, className }: ProposalRowProps) {
  const d = useProposalDecision(s);
  const ref = useRef<HTMLDivElement>(null);
  const by = proposedBy(s) === 'readers' ? 'Readers proposed' : 'Rule proposed';

  const accept = (): void => {
    d.accept();
    focusNextDecision(ref.current);
  };
  const refuse = (): void => {
    d.refuse();
    focusNextDecision(ref.current);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const k = decisionKey(e);
    if (!k) return;
    if (!d.decision && k === 'a') { e.preventDefault(); accept(); }
    else if (!d.decision && k === 'r') { e.preventDefault(); refuse(); }
    else if (d.decision && k === 'u') { e.preventDefault(); d.undo(); }
  };

  return (
    <div
      ref={ref}
      data-testid={`proposal-${testIdBase}`}
      role="group"
      tabIndex={-1}
      onKeyDown={onKey}
      aria-label={`${by}: ${name}`}
      className={cn('border-t border-border py-3 first:border-t-0', d.decision?.decision === 'accepted' && 'bg-accent-soft', className)}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="min-w-0 flex-1 text-body text-ink">
          <span className="text-ink-2">{by}: </span>
          <span className="font-medium">{proposal}</span>
          {from ? <span className="text-ink-2">. {from}</span> : null}
        </p>
        {d.decision ? (
          <Button size="md" variant="ghost" data-undo aria-label={`Undo: ${name}`} aria-keyshortcuts="u" icon={<Undo2 aria-hidden className="size-4" />} data-testid={`undo-${testIdBase}`} onClick={d.undo}>
            Undo
          </Button>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-small text-ink-2">Coordinator decides</span>
            <Button size="md" variant="secondary" data-accept aria-label={`Accept: ${name}`} aria-keyshortcuts="a" icon={<Check aria-hidden className="size-4" />} data-testid={`accept-${testIdBase}`} onClick={accept}>
              Accept
            </Button>
            <Button size="md" variant="ghost" aria-label={`Refuse: ${name}`} aria-keyshortcuts="r" icon={<X aria-hidden className="size-4" />} data-testid={`refuse-${testIdBase}`} onClick={refuse}>
              Refuse
            </Button>
          </span>
        )}
      </div>
      {quote ? <blockquote className="mt-2 border-l-2 border-border-strong pl-3 text-body text-ink-2">{quote}</blockquote> : null}
      {d.rivals.length && !d.decision ? (
        <p className="mt-2 text-small text-ink-2">
          One choice: {d.rivals.length + 1} proposals for {d.cell}. Accepting this one refuses message {d.rivals.map((r) => r.message).join(', ')}.
        </p>
      ) : null}
      {d.decision ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-small text-ink">
          <span className="font-semibold">{d.decision.decision === 'accepted' ? 'Accepted here' : 'Refused here'}</span>
          <span className="text-ink-2">{d.decision.decision === 'accepted' ? d.acceptText : d.refuseText}</span>
          {d.decision.decision === 'accepted' && d.link ? <CopyLink link={d.link} /> : null}
        </p>
      ) : null}
    </div>
  );
}
