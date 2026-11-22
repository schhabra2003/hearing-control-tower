/**
 * CheckList: the Evidence page's checks as one divided list. Each row: a status glyph and word,
 * the plain name of the check, the command in mono, the figure it printed on the right in tabular
 * numerals, its label, and a "Details" disclosure with the line as quoted and the file it is
 * quoted from. A header line counts the rows by label.
 *
 * Adapted from the 21st.dev component "Health Checks" by astralyxdev
 * (https://21st.dev/r/astralyxdev/health-checks): one row per probe with a status icon, a name,
 * a mono line, a right-aligned figure and a status word. The counts in the header follow
 * "Test Results" by aadixc0de (https://21st.dev/r/aadixc0de/test-results).
 * Changes: our tokens and label chips, the row itself is a native details disclosure in place of the sparkline,
 * status always in words as well as the glyph, no badge, sparkline or motion util files, no demo data.
 */

import { Check, ChevronRight, Minus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * pass: the printed line says all of its checks pass ("88 of 88"). fail: it names a failure.
 * ran: the command ran and printed a result that is not a pass count (a count of proposals, a file).
 */
export type CheckStatus = 'pass' | 'fail' | 'ran';

export interface CheckItem {
  id: string;
  /** The plain name of the check, a short sentence. */
  title: string;
  /** The command exactly as the source gives it, shown in mono. */
  command: string;
  status: CheckStatus;
  /** The figure the command printed, as printed: "88 of 88", "63". */
  figure?: string;
  /** The label chip for this row, from the caller (Measured, Simulated). */
  label?: ReactNode;
  /** The line as quoted, shown under "Details". */
  quoted?: ReactNode;
  /** Where the line is quoted from, shown under "Details". */
  source?: ReactNode;
  /** A small group word under the command: "Season one", "Later". */
  group?: string;
  testId?: string;
}

export interface CheckListProps {
  items: CheckItem[];
  /** Accessible name of the list. */
  label: string;
  /** The header line, for example "30 checks. Measured 28, simulated 2." Built by the caller. */
  summary?: ReactNode;
  className?: string;
  testId?: string;
}

const STATUS: Record<CheckStatus, { word: string; Icon: typeof Check; tone: string }> = {
  pass: { word: 'Pass', Icon: Check, tone: 'text-ok bg-ok-bg' },
  fail: { word: 'Fail', Icon: X, tone: 'text-danger bg-danger-bg' },
  ran: { word: 'Ran', Icon: Minus, tone: 'text-ink-2 bg-surface-2' },
};

export function CheckList({ items, label, summary, className, testId }: CheckListProps) {
  return (
    <div data-testid={testId} className={cn('flex flex-col', className)}>
      {summary ? <p className="border-b border-border pb-3 text-body text-ink-2">{summary}</p> : null}
      <ul aria-label={label} className="flex flex-col divide-y divide-border">
        {items.map((c) => {
          const s = STATUS[c.status];
          return (
            <li key={c.id} data-testid={c.testId} className="py-3">
              <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 max-md:grid-cols-[minmax(0,1fr)_auto]">
                <span className={cn('inline-flex h-6 w-fit items-center gap-1 rounded-[var(--radius-chip)] px-1.5 text-small font-medium', s.tone)}>
                  <s.Icon aria-hidden className="size-3.5" strokeWidth={2.5} />
                  {s.word}
                </span>
                <details className="group min-w-0 max-md:col-span-2 max-md:row-start-2">
                  <summary className="flex cursor-pointer list-none items-start gap-1.5 rounded-[var(--radius-chip)] [&::-webkit-details-marker]:hidden">
                    <ChevronRight aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-2 transition-transform duration-[var(--dur-color)] group-open:rotate-90" />
                    <span className="min-w-0">
                      <span className="block text-body leading-snug text-ink group-hover:text-accent">{c.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2">
                        {c.title === c.command ? null : <code className="font-mono text-small break-all text-ink-2">{c.command}</code>}
                        {c.group ? <span className="text-small text-muted">{c.group}</span> : null}
                      </span>
                    </span>
                  </summary>
                  {c.quoted || c.source ? (
                    <div className="mt-2 ml-5.5 flex max-w-[90ch] flex-col gap-2 border-l-2 border-border pl-4 text-body leading-normal text-ink">
                      {c.quoted ? <div>{c.quoted}</div> : null}
                      {c.source ? <div className="text-small text-ink-2">{c.source}</div> : null}
                    </div>
                  ) : null}
                </details>
                <div className="flex items-center gap-3 text-right">
                  {c.figure ? <span className="text-body font-semibold whitespace-nowrap text-ink tabular-nums">{c.figure}</span> : null}
                  {c.label}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
