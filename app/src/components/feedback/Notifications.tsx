/**
 * The notifications list: every toast of this session, newest first, as plain sentences. Opened
 * from a bell in the top bar; the same list renders on its own for #/agents or a phone sheet.
 *
 * Adapted from the 21st.dev component "Notification Panel" by uvain,
 * https://21st.dev/r/uvain/notification-panel (id 27135): the row built around one sentence with
 * the time as one dim line under it, hairline dividers instead of cards, an unread dot that is
 * also said in words, "Mark all as read" in the header, and the rule that an action resolves in
 * place: after Undo the row stays and says "Undone at 9:06 a.m." so the list still reads as a
 * history. Popover trigger, Escape and focus return come from Radix Popover, as the "Popover" by
 * pearpages (https://21st.dev/r/pearpages/popover, id 44314) specifies them: a non-modal
 * role="dialog" named by its title, aria-haspopup and aria-expanded on the trigger.
 *
 * Dropped from the original: avatars and kind badges (nobody is an actor here; the app records
 * what a person did in this browser), the tabs, the row menu and archiving, the squircle corners,
 * the Tailwind palette colours. The empty state is the "Empty Notifications State" by
 * olewandowski1 (https://21st.dev/r/olewandowski1/empty-states-1, id 19367), cut to one line.
 */

import * as Popover from '@radix-ui/react-popover';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { markAllRead, runAction, useNotificationLog, type LogEntry } from './Toast';

const DOT: Record<LogEntry['tone'], string> = {
  neutral: 'bg-muted',
  ok: 'bg-dot-ok',
  warn: 'bg-dot-warn',
  danger: 'bg-dot-danger',
};

function Row({ e }: { e: LogEntry }) {
  return (
    <li data-testid={`notification-${e.id}`} className="flex gap-3 px-4 py-3">
      <span aria-hidden className={cn('mt-2 size-2 shrink-0 rounded-full', DOT[e.tone])} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-ink">
          {e.href ? (
            <a href={`#${e.href}`} className="underline-offset-2 hover:underline">
              {e.title}
            </a>
          ) : (
            e.title
          )}
        </p>
        {e.body ? <p className="mt-1 text-body text-ink-2">{e.body}</p> : null}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-small text-muted">
          {e.at ? <span className="tabular-nums">{e.at}</span> : null}
          {e.resolved ? (
            <span data-testid={`notification-${e.id}-resolved`} className="text-ink-2">
              {e.at ? <span aria-hidden className="mr-2">·</span> : null}
              {e.resolved}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-start gap-2">
        {e.actionLabel ? (
          <button
            type="button"
            data-testid={`notification-${e.id}-action`}
            aria-label={`${e.actionLabel}: ${e.title}`}
            onClick={() => runAction(e.id)}
            className="h-8 rounded-control border border-border-control bg-surface px-3 text-small font-medium text-ink transition-colors duration-[var(--dur-color)] hover:bg-surface-2"
          >
            {e.actionLabel}
          </button>
        ) : null}
        <span className={cn('mt-2 size-2 rounded-full', e.read ? 'bg-transparent' : 'bg-accent')}>
          <span className="sr-only">{e.read ? '' : 'New'}</span>
        </span>
      </div>
    </li>
  );
}

export interface NotificationsListProps {
  /** Height of the scrolling list in px. Default 440. */
  maxHeight?: number;
  /** The id of the element that names the list (the panel's h2). */
  labelledBy?: string;
  className?: string;
}

/** The list alone, for #/agents, a phone sheet or a page. */
export function NotificationsList({ maxHeight = 440, labelledBy, className }: NotificationsListProps) {
  const items = useNotificationLog();
  if (!items.length) {
    return (
      <p data-testid="notifications-empty" className={cn('px-4 py-8 text-center text-body text-ink-2', className)}>
        Nothing yet. What you accept, refuse or approve here is listed.
      </p>
    );
  }
  return (
    <ol
      data-testid="notifications-list"
      aria-labelledby={labelledBy}
      style={{ maxHeight }}
      className={cn('divide-y divide-border overflow-y-auto [scrollbar-width:thin]', className)}
    >
      {items.map((e) => (
        <Row key={e.id} e={e} />
      ))}
    </ol>
  );
}

export interface NotificationsButtonProps {
  /** Open state, for screenshots and the tour. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** The bell in the top bar and its panel. The count is the number of new entries, in neutral ink. */
export function NotificationsButton({ open, onOpenChange }: NotificationsButtonProps) {
  const items = useNotificationLog();
  const unread = items.filter((e) => !e.read).length;
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        data-testid="notifications-open"
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        className="relative inline-flex h-9 min-w-9 items-center justify-center px-2 rounded-control text-ink-2 transition-colors duration-[var(--dur-color)] hover:bg-surface-2 hover:text-ink data-[state=open]:bg-surface-2 data-[state=open]:text-ink"
      >
        <Bell aria-hidden className="size-5" />
        {unread ? (
          <span aria-hidden className="ml-1 text-small leading-none font-semibold text-ink tabular-nums">
            {unread}
          </span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          aria-labelledby="notifications-title"
          data-testid="notifications-panel"
          className="z-50 w-[440px] max-w-[calc(100vw-32px)] overflow-hidden rounded-card bg-surface text-ink shadow-e2 outline-none"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border py-2 pr-2 pl-4">
            <h2 id="notifications-title" className="text-body font-semibold">
              Notifications
            </h2>
            <button
              type="button"
              data-testid="notifications-read-all"
              disabled={!unread}
              onClick={markAllRead}
              className="inline-flex h-8 items-center gap-2 rounded-control px-3 text-small font-medium text-ink-2 transition-colors duration-[var(--dur-color)] hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-50"
            >
              <CheckCheck aria-hidden className="size-4" />
              Mark all as read
            </button>
          </div>
          <NotificationsList labelledBy="notifications-title" />
          <p className="border-t border-border px-4 py-3 text-small text-muted">Kept in this browser after a reload. The sheet is not changed.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
