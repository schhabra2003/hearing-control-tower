/**
 * InlineAlert: a message about one part of the page that stays next to it until it is dealt with.
 * Use it for anything a person must act on (a rejected file, a pass that cannot finish); a toast
 * only confirms what was just done.
 *
 * Adapted from the 21st.dev component "Alert" by redrob-labs, https://21st.dev/r/redrob-labs/alert
 * (id 38095): the rule that an alert lives in place and a toast floats away, one action and not a
 * row of them, no close button for something that must be read, and role="alert" only for the
 * danger tone (role="status" for the others, so a mild notice never talks over the reader).
 *
 * Changes for Hearing Desk: rewritten as typed JSX on our tokens; no tinted fills or coloured left
 * stripe: a hairline border, a small tone dot and the tone word in ink.
 */

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/** The four tones; info and success are accepted for one release as neutral and ok. */
export type AlertTone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'success';

const TONE: Record<AlertTone, { dot: string; word: string }> = {
  neutral: { dot: 'bg-muted', word: 'Note' },
  info: { dot: 'bg-muted', word: 'Note' },
  ok: { dot: 'bg-dot-ok', word: 'Done' },
  success: { dot: 'bg-dot-ok', word: 'Done' },
  warn: { dot: 'bg-dot-warn', word: 'Check' },
  danger: { dot: 'bg-dot-danger', word: 'Error' },
};

export interface InlineAlertProps {
  tone?: AlertTone;
  /** What happened, in one line. */
  title: string;
  /** What to do next, in one sentence. */
  children?: ReactNode;
  /** One control to fix it. */
  action?: ReactNode;
  /** Omit it and the alert cannot be closed, which is right for something that must be read. */
  onClose?: () => void;
  className?: string;
  testId?: string;
}

export function InlineAlert({ tone = 'neutral', title, children, action, onClose, className, testId }: InlineAlertProps) {
  const t = TONE[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      data-testid={testId}
      data-tone={tone}
      className={cn('flex items-start gap-3 rounded-control border border-border-control bg-surface py-3 pr-2 pl-4', className)}
    >
      <span aria-hidden className={cn('mt-2 size-2 shrink-0 rounded-full', t.dot)} />
      <div className="min-w-0 flex-1">
        <p className="text-body text-ink">
          <span className="font-semibold">{t.word}.</span> <span className="font-medium">{title}</span>
        </p>
        {children ? <div className="mt-1 text-body text-ink-2">{children}</div> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          aria-label={`Close: ${title}`}
          onClick={onClose}
          className="grid size-8 shrink-0 place-items-center rounded-control text-muted hover:bg-surface-2 hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
