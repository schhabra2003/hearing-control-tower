/**
 * KpiRow and KpiCell: a row of key figures split by hairlines, never cards inside a card.
 *
 * Adapted from aadixc0de, "Stat Card" (StatCardGroup, chatcn), https://21st.dev/aadixc0de/stat-card
 * and uvain, "Charts & KPI Cards" (KpiCard), https://21st.dev/uvain/revenue-charts-kpi
 * Changes: our tokens instead of injected theme CSS, no delta arrow or sparkline (the sheet has no
 * previous period), a target line in place of the delta, one SourceChip per row or per cell, the
 * sans face with tabular numerals, label first and value second with 4 px between them.
 */
import { Children, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type KpiTone = 'neutral' | 'danger' | 'warn' | 'ok';

const VALUE_TONE: Record<KpiTone, string> = {
  neutral: 'text-ink',
  danger: 'text-danger',
  warn: 'text-warn',
  ok: 'text-ok',
};

export interface KpiRowProps {
  /** The group's accessible name and, unless `showTitle` is false, its visible header. */
  title: string;
  /** Hide the header when the page heading right above already names the row and there is no chip. */
  showTitle?: boolean;
  /** One chip for the whole row when every cell shares a source. */
  chip?: ReactNode;
  /** Cells per row at full width. The row wraps on narrow screens. */
  columns?: 2 | 3 | 4 | 5;
  children: ReactNode;
  testId?: string;
  className?: string;
}

const COLS: Record<NonNullable<KpiRowProps['columns']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
};

export function KpiRow({ title, showTitle = true, chip, columns = 4, children, testId, className }: KpiRowProps) {
  const count = Children.count(children);
  return (
    <section
      aria-label={title}
      data-testid={testId}
      className={cn('overflow-hidden rounded-card bg-surface shadow-e1', className)}
    >
      {showTitle || chip ? (
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <h3 className={cn('text-h3 text-ink', !showTitle && 'sr-only')}>{title}</h3>
          {chip ? <span className="ml-auto">{chip}</span> : null}
        </header>
      ) : null}
      {/* Hairlines between cells however they wrap: each cell draws its top and left edge and the
          frame clips the outer ones (the StatCardGroup technique). */}
      <div className={cn('grid grid-cols-1', COLS[columns])} data-cells={count}>
        {children}
      </div>
    </section>
  );
}

export interface KpiCellProps {
  /** Six words or fewer. */
  label: string;
  /** The value as read from the data, already formatted. Never typed by hand. */
  value: ReactNode;
  /** "of 24", in ink-2 after the value. */
  of?: ReactNode;
  /** A short line under the value, for example "Target: none". */
  target?: ReactNode;
  /** Red only when the source says the value is above its target. */
  tone?: KpiTone;
  /** A per-cell chip when the row has no shared one. */
  chip?: ReactNode;
  /** Empty state: the cell has no value yet. */
  empty?: string;
  testId?: string;
}

export function KpiCell({ label, value, of, target, tone = 'neutral', chip, empty, testId }: KpiCellProps) {
  return (
    <div
      data-testid={testId}
      className="-mt-px -ml-px flex min-w-0 flex-col gap-1 border-t border-l border-border px-4 pt-4 pb-4"
    >
      <div className="flex min-h-6 items-center justify-between gap-2">
        <p className="text-small font-medium text-ink-2">{label}</p>
        {chip}
      </div>
      {empty ? (
        <p className="text-body leading-[40px] text-muted">{empty}</p>
      ) : (
        <p className={cn('text-figure', VALUE_TONE[tone])}>
          {value}
          {of ? <span className="ml-2 text-body font-normal tracking-normal text-ink-2">{of}</span> : null}
        </p>
      )}
      {target ? <p className="text-small text-ink-2">{target}</p> : null}
    </div>
  );
}
