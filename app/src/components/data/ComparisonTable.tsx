/**
 * ComparisonTable: options side by side, one row each, with the attributes as columns. A row that
 * meets the current condition (for example "pays at this volume") gets a quiet fill, a 3 px accent
 * bar and its verdict in words, so the mark never rests on colour alone.
 *
 * Adapted from aadixc0de, "Comparison Table" (chatcn), https://21st.dev/aadixc0de/comparison-table
 * and dhxwhy, "Usage Slider Pricing Comparison Table", https://21st.dev/dhxwhy/usage-slider-pricing-table
 * Kept: a native table with scope on every header, the best value marked by a check and weight,
 * one control upstream (a slider) moving the highlight. Changed: no injected CSS, no streaming or
 * rolling digits, no pricing model inside; rows are options so long names wrap; our tokens.
 */
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ComparisonColumn<T> {
  key: string;
  header: string;
  /** Numbers right-aligned with tabular numerals. */
  numeric?: boolean;
  render: (row: T) => ReactNode;
  /** Marks the best cell in this column with a check and weight. */
  best?: (row: T) => boolean;
  /** Column width hint, for example "28%". */
  width?: string;
}

export interface ComparisonTableProps<T> {
  /** Accessible caption, also shown above the table when `showCaption` is true. */
  caption: string;
  showCaption?: boolean;
  rows: T[];
  rowKey: (row: T) => string;
  /** The first column, a row header: the option's name. */
  rowHeader: { header: string; render: (row: T) => ReactNode; width?: string };
  columns: ComparisonColumn<T>[];
  /** Rows that meet the current condition. */
  highlight?: (row: T) => boolean;
  /** Right side of the caption row: usually one SourceChip. */
  chip?: ReactNode;
  testId?: string;
  className?: string;
}

export function ComparisonTable<T>({
  caption,
  showCaption = true,
  rows,
  rowKey,
  rowHeader,
  columns,
  highlight,
  chip,
  testId,
  className,
}: ComparisonTableProps<T>) {
  return (
    <div data-testid={testId} className={cn('flex flex-col gap-3', className)}>
      {showCaption || chip ? (
        <div className="flex items-center justify-between gap-3">
          {showCaption ? <p className="text-h3 text-ink">{caption}</p> : <span />}
          {chip}
        </div>
      ) : null}
      <div role="region" aria-label={caption} tabIndex={0} className="overflow-x-auto rounded-quote border border-border">
        <table className="w-full border-separate border-spacing-0 text-left text-body">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-surface-2">
              <th scope="col" style={{ width: rowHeader.width }} className="px-4 py-3 text-small font-semibold text-ink-2">
                {rowHeader.header}
              </th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={{ width: c.width }}
                  className={cn('px-4 py-3 text-small font-semibold text-ink-2', c.numeric && 'text-right')}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const on = highlight?.(r) ?? false;
              return (
                <tr key={rowKey(r)} data-highlight={on || undefined} className={cn('transition-colors duration-[var(--dur-color)]', on && 'bg-accent-soft')}>
                  <th
                    scope="row"
                    className={cn(
                      'border-t border-border px-4 py-3 align-top font-medium text-ink',
                      on ? 'shadow-[inset_3px_0_0_var(--accent)]' : '',
                    )}
                  >
                    {rowHeader.render(r)}
                  </th>
                  {columns.map((c) => {
                    const best = c.best?.(r) ?? false;
                    return (
                      <td
                        key={c.key}
                        className={cn(
                          'border-t border-border px-4 py-3 align-top text-ink',
                          c.numeric && 'text-right tabular-nums',
                          best && 'font-semibold',
                        )}
                      >
                        <span className={cn('inline-flex items-center gap-2', c.numeric && 'justify-end')}>
                          {best ? (
                            <>
                              <Check aria-hidden className="size-4 text-ok" />
                              <span className="sr-only">Best in this column: </span>
                            </>
                          ) : null}
                          {c.render(r)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
