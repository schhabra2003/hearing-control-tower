/*
 * ChecksCell: the compact checks cell of a hearing list (and the replacement of the old five-square
 * gate strip everywhere). Two lines of words: one Progress with "3 of 5 checks done", then "Next:
 * office has our consultant's name". A red dot and the word "Soon" only when the next check is
 * missing within 3 working days of the hearing or after it.
 *
 * Adapted from "Progress" by jshguo, https://21st.dev/r/jshguo/interfaces-progress, through
 * components/ui/Progress.tsx (a thin bar with the count in words beside it). No squares, no codes.
 */

import type { Hearing } from '@/types/data';
import { useSession } from '@/lib/store';
import { cn } from '@/lib/cn';
import { CheckProgress } from '@/components/ui/Progress';
import { checkViews, summarize } from './checks';

export function ChecksCell({ hearing: h, className, showNext = true }: { hearing: Hearing; className?: string; showNext?: boolean }) {
  const proposals = useSession((s) => s.proposals);
  const sum = summarize(checkViews(h, { proposals }));
  const near = sum.next?.state === 'missing-near';
  return (
    <span data-testid={`checks-cell-${h.case}`} className={cn('flex min-w-0 flex-col gap-1', className)}>
      <CheckProgress done={sum.done} total={sum.total} testId={`checks-count-${h.case}`} />
      {showNext ? (
        <span className={cn('text-small', sum.next ? 'text-ink-2' : 'text-muted')}>
          {near ? (
            <span className="mr-2 inline-flex items-center gap-1 font-medium text-danger">
              <span aria-hidden className="inline-block size-2 rounded-full bg-dot-danger" />
              Soon.
            </span>
          ) : null}
          {sum.nextText}
        </span>
      ) : null}
    </span>
  );
}
