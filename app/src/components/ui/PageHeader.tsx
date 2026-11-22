/**
 * PageHeader: the one header of every route. A breadcrumb trail (or a short context line), the h1
 * with an optional state tag beside it, one line of purpose, the actions on the right aligned to the
 * title's baseline, and an optional toolbar row under a hairline.
 *
 * Adapted from two 21st.dev components by olewandowski1:
 * - "Page Header with Breadcrumbs", https://21st.dev/r/olewandowski1/page-header-2 (breadcrumb above
 *   the title, a badge beside the title, actions aligned to the bottom of the title block, a hairline
 *   under the header instead of a box).
 * - "Search Toolbar Page Header", https://21st.dev/r/olewandowski1/page-header-5 (title and one line
 *   of description with the primary action on the right, then a separator and a toolbar row).
 * Changes: the shadcn Breadcrumb, Badge, Button and Separator are replaced by the app's tokens and
 * plain semantic elements; the remix icon and the demo placeholders are gone; the trail is a real
 * nav with aria-current; type follows the app scale (24/32 h1, 14/20 lede capped at the measure, 13/18 trail).
 */

import { ChevronRight } from 'lucide-react';
import { createContext, useContext, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PageCrumb {
  label: string;
  /** A hash route such as "/hearings". The last crumb is the page itself and has no link. */
  to?: string;
}

const CrumbsContext = createContext<PageCrumb[] | undefined>(undefined);

/** AppShell wraps the page in this with the route's trail, so pages do not repeat it. */
export const PageCrumbsProvider = CrumbsContext.Provider;

export interface PageHeaderProps {
  title: ReactNode;
  /** One line of purpose, 12 words or fewer. Leave it out when the title says enough. */
  lede?: ReactNode;
  /** Where the page sits, above the title; the last crumb is the current page. Defaults to the shell's trail. */
  crumbs?: PageCrumb[];
  /** A short context line shown in place of the trail when there are no crumbs ("9:00 a.m. pass, step 2"). */
  eyebrow?: ReactNode;
  /** A small state tag beside the title, for example the NotBuiltTag or a source chip. */
  status?: ReactNode;
  /** Buttons on the right. One primary at most. */
  actions?: ReactNode;
  /** A row under the hairline: filters, a segmented control, a search field. */
  toolbar?: ReactNode;
  /** Draw the hairline under the header. On by default. */
  divider?: boolean;
  className?: string;
  testId?: string;
}

function Trail({ crumbs }: { crumbs: PageCrumb[] }) {
  return (
    <nav aria-label="You are here" data-testid="page-crumbs">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-small">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 ? <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted" /> : null}
              {c.to && !last ? (
                <a
                  href={`#${c.to}`}
                  className="truncate rounded-chip text-muted transition-colors duration-[var(--dur-color)] hover:text-ink"
                >
                  {c.label}
                </a>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={cn('truncate', last ? 'font-medium text-ink-2' : 'text-muted')}>
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, lede, crumbs: own, eyebrow, status, actions, toolbar, divider = true, className, testId = 'page-header' }: PageHeaderProps) {
  const shell = useContext(CrumbsContext);
  const crumbs = own ?? shell;
  const context = crumbs && crumbs.length > 0 ? <Trail crumbs={crumbs} /> : eyebrow ? <p className="text-small font-medium text-muted">{eyebrow}</p> : null;
  return (
    <header data-testid={testId} className={cn(divider && 'border-b border-border', 'pb-6', className)}>
      {/* The shell's top bar carries the breadcrumb, so the context row only shows when a page passes one. */}
      {context ? <div className="mb-2 min-w-0">{context}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 tabIndex={-1} className="text-title text-ink">{title}</h1>
            {status ? <div className="flex items-center gap-2">{status}</div> : null}
          </div>
          {lede ? <p className="mt-1 max-w-[var(--measure)] text-body text-ink-2">{lede}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {toolbar ? (
        <div data-testid={`${testId}-toolbar`} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          {toolbar}
        </div>
      ) : null}
    </header>
  );
}
