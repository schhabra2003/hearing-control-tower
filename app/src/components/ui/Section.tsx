/**
 * Section and DescriptionList: the open block that replaces boxed cards on working pages. A section
 * is a heading row (title, one line, actions on the right), a hairline, and its content. Sections
 * follow one another with whitespace and a hairline, never inside a box. The "aside" layout puts
 * the heading in a left column, as settings pages in Stripe and Vercel do.
 *
 * Adapted from these 21st.dev components:
 * - "Horizontal Section Separator" by sean0205, https://21st.dev/r/sean0205/c-separator-1 (a
 *   title and subtitle block, a separator, then the body).
 * - "Description" by shugar, https://21st.dev/r/shugar/description (a dl with a term, an optional
 *   info hint beside the term, and the detail under it).
 * - The header with an action slot of "Card" by jshguo (Interfaces DS),
 *   https://21st.dev/r/jshguo/interfaces-card (title and description on the left, the action pinned
 *   to the right of both rows).
 * Changes: the shadcn Separator is a border token; gray-900 and gray-1000 are ink tokens; the
 * description hint is a real button with an accessible name that opens the app's Tooltip on hover
 * and on focus, and its text is also in the DOM for agents (sr-only), so nothing lives only in a
 * tooltip.
 */

import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';

export interface SectionProps {
  title: ReactNode;
  /** One line under the title, 12 words or fewer. */
  description?: ReactNode;
  /** Right side of the heading row: a link, a button, a source chip. */
  actions?: ReactNode;
  /** "stack" puts the heading above the content; "aside" puts it in a 280 px column on the left. */
  layout?: 'stack' | 'aside';
  /** Draw the hairline above the section, between it and the one before. On by default. */
  rule?: boolean;
  /** Heading level. Sections directly under the page h1 are h2. */
  as?: 'h2' | 'h3';
  id?: string;
  testId?: string;
  className?: string;
  children: ReactNode;
}

export function Section({ title, description, actions, layout = 'stack', rule = true, as: H = 'h2', id, testId, className, children }: SectionProps) {
  const headingId = id ? `${id}-title` : undefined;
  const heading = (
    <div className={cn('flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2', layout === 'stack' && 'mb-4')}>
      <div className="min-w-0">
        <H id={headingId} className={cn(H === 'h2' ? 'text-h2' : 'text-h3', 'text-ink')}>
          {title}
        </H>
        {description ? <p className="text-small mt-1 max-w-[68ch] text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-testid={testId}
      className={cn(rule && 'border-t border-border', 'py-8 first:border-t-0 first:pt-6', className)}
    >
      {layout === 'aside' ? (
        <div className="grid gap-x-12 gap-y-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          {heading}
          <div className="min-w-0">{children}</div>
        </div>
      ) : (
        <>
          {heading}
          {children}
        </>
      )}
    </section>
  );
}

export interface DescriptionItem {
  term: ReactNode;
  detail: ReactNode;
  /** A short explanation of the term. Shown in a tooltip and kept in the DOM as text. */
  hint?: string;
  /** Something small at the end of the row: a cell button, a source chip. */
  trailing?: ReactNode;
  testId?: string;
}

/**
 * Label and value rows divided by hairlines. "columns" puts the term in a fixed left column (for
 * a detail panel); "stacked" puts the term above the value (for a narrow rail).
 */
export function DescriptionList({ items, layout = 'columns', className }: { items: DescriptionItem[]; layout?: 'columns' | 'stacked'; className?: string }) {
  return (
    <dl className={cn('divide-y divide-border', className)}>
      {items.map((it, i) => (
        <div
          key={i}
          data-testid={it.testId}
          className={cn('py-3 first:pt-0 last:pb-0', layout === 'columns' ? 'grid grid-cols-[minmax(0,200px)_minmax(0,1fr)] items-baseline gap-x-6' : 'grid grid-cols-1')}
        >
          <dt className={cn('flex items-center gap-2 text-body text-muted', layout === 'stacked' && 'mb-1')}>
            {it.term}
            {it.hint ? (
              <>
                <Tooltip content={it.hint}>
                  <button type="button" aria-label={`About ${typeof it.term === 'string' ? it.term : 'this'}`} className="grid size-5 place-items-center rounded-chip text-muted hover:text-ink">
                    <Info aria-hidden className="size-3.5" />
                  </button>
                </Tooltip>
                <span className="sr-only">{it.hint}</span>
              </>
            ) : null}
          </dt>
          <dd className="flex min-w-0 items-baseline justify-between gap-3 text-body text-ink">
            <span className="min-w-0">{it.detail}</span>
            {it.trailing ? <span className="shrink-0 self-center">{it.trailing}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
