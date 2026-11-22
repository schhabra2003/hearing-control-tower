/**
 * EmptyState and ErrorState: what is missing or what went wrong, and what to do next.
 *
 * Adapted from two 21st.dev components:
 * - "Empty" by cnippet-dev, https://21st.dev/r/cnippet-dev/cnippet-empty (id 19745): the
 *   composition of media, title, description and content, the narrow text column, the icon in a
 *   small bordered tile.
 * - "Error Empty State" by olewandowski1, https://21st.dev/r/olewandowski1/empty-states-4
 *   (id 19376): the failed-load variant with a retry first and a second way out.
 *
 * Changes for Hearing Desk: no tilted stacked cards behind the icon and no tinted red tile:
 * the error state is a neutral tile with a small red dot and the word "Error"
 * in ink. A "Details" disclosure keeps the technical message in the DOM for agents without
 * putting it in front of a lawyer. Two sizes: `page` (Not found, a page that failed) with the
 * title as the page's h1, and `inline` (an empty table or filter) that sits inside a section,
 * left-aligned with the column it replaces. Typed props, our tokens, a test id.
 */

import { useId, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  /** One lucide icon, 20 px, aria-hidden. */
  icon?: ReactNode;
  /** Says what is missing in plain words: "No hearings match these filters". */
  title: string;
  /** One sentence that says what to do next. */
  description?: string;
  /** One primary action and at most one secondary. */
  action?: ReactNode;
  /** page: centred in the main area, title is the h1. inline: inside a section, left-aligned. */
  size?: 'page' | 'inline';
  /** Heading level of the title; page defaults to 1, inline to a paragraph. */
  headingLevel?: 1 | 2 | 3;
  className?: string;
  testId?: string;
  /** Extra content under the actions, such as the Details disclosure. */
  children?: ReactNode;
}

export function EmptyState({ icon, title, description, action, size = 'inline', headingLevel, className, testId, children }: EmptyStateProps) {
  const level = headingLevel ?? (size === 'page' ? 1 : undefined);
  const Title = level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : 'p';
  const page = size === 'page';
  return (
    <div
      data-testid={testId}
      data-size={size}
      className={cn(
        'flex flex-col gap-4',
        page ? 'min-h-[60vh] items-center justify-center px-6 py-16 text-center' : 'items-start px-4 py-10',
        className,
      )}
    >
      {icon ? (
        <div aria-hidden className="grid size-10 place-items-center rounded-control border border-border bg-surface text-ink-2 shadow-e1 [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <div className={cn('flex max-w-[30rem] flex-col gap-1', page && 'items-center')}>
        <Title tabIndex={level === 1 ? -1 : undefined} className={cn('font-semibold text-ink outline-none', page ? 'text-section' : 'text-body')}>
          {title}
        </Title>
        {description ? <p className="text-body text-ink-2">{description}</p> : null}
      </div>
      {action ? <div className={cn('flex flex-wrap items-center gap-2', page && 'justify-center')}>{action}</div> : null}
      {children}
    </div>
  );
}

export interface ErrorStateProps extends Omit<EmptyStateProps, 'children'> {
  /** The technical message, shown only under "Details". */
  detail?: string;
}

/** A failed page or panel: a neutral tile with a red dot, the word "Error", and the way out. */
export function ErrorState({ icon, detail, title, ...rest }: ErrorStateProps) {
  const id = useId();
  return (
    <EmptyState
      {...rest}
      title={title}
      icon={
        icon ? (
          <span className="relative">
            {icon}
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-danger ring-2 ring-surface" />
          </span>
        ) : undefined
      }
    >
      <p className="sr-only" role="alert">
        Error: {title}
      </p>
      {detail ? (
        <details className="group w-full max-w-[30rem] text-left [[data-size=page]_&]:text-center">
          <summary
            aria-controls={id}
            className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-control px-2 text-small font-medium text-ink-2 hover:bg-surface-2 hover:text-ink [&::-webkit-details-marker]:hidden"
          >
            <ChevronRight aria-hidden className="size-4 transition-transform duration-[var(--dur-pop)] group-open:rotate-90 motion-reduce:transition-none" />
            Details
          </summary>
          <pre id={id} className="mt-2 overflow-x-auto rounded-control bg-sunken px-3 py-2 font-mono text-small whitespace-pre-wrap text-ink-2">
            {detail}
          </pre>
        </details>
      ) : null}
    </EmptyState>
  );
}
