/**
 * Card: a bordered surface for the few places where a box is right (a rail beside a list, a dialog
 * like decision block, the Overview pass cards). Slots: header (title, one line, an action pinned
 * right), content, footer. Header and footer are divided from the content by hairlines, so a card
 * never needs a box inside it.
 *
 * Adapted from the 21st.dev component "Card" by jshguo (Interfaces DS),
 * https://21st.dev/r/jshguo/interfaces-card: the slot set (Card, CardHeader, CardTitle,
 * CardDescription, CardAction, CardContent, CardFooter), the header grid that pins the action to the
 * right of both rows, and the hairline under the header and over the footer.
 * Changes: shadcn colour names are the app tokens; the radius is --radius-card; elevation is a 1 px
 * border with no drop shadow (flat surfaces have no shadow); the title is a real heading
 * with a chosen level; data-slot attributes are kept so pages can target slots in CSS.
 * The old API (Card, CardHeader with title, description and actions props, CardBody) keeps working.
 */

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card" className={cn('flex flex-col rounded-card border border-border bg-surface text-ink', className)} {...rest}>
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  /** One line under the title, 12 words or fewer. */
  description?: ReactNode;
  /** Pinned to the right of the title and description: a link, a button, a source chip. */
  actions?: ReactNode;
  /** Heading level; cards under a page section use h3. */
  as?: 'h2' | 'h3';
  /** Draw the hairline under the header. On by default. */
  divider?: boolean;
  /** A context line above the title. Kept for the old API; prefer leaving it out. */
  eyebrow?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, actions, as: H = 'h2', divider = true, eyebrow, className }: CardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-4 py-4', divider && 'border-b border-border', className)}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-small font-medium text-muted">{eyebrow}</p> : null}
        <H data-slot="card-title" className="text-h3 text-ink">
          {title}
        </H>
        {description ? (
          <p data-slot="card-description" className="text-small mt-1 text-ink-2">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div data-slot="card-action" className="flex items-center gap-2 self-start">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function CardContent({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-content" className={cn('px-4 py-4', className)} {...rest}>
      {children}
    </div>
  );
}

/** The old name of CardContent. */
export const CardBody = CardContent;

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-footer" className={cn('flex items-center justify-end gap-2 border-t border-border px-4 py-3', className)} {...rest}>
      {children}
    </div>
  );
}
