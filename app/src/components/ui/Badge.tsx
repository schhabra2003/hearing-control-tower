/**
 * Badge, StatusChip and PhraseChip: the app's status words, text first. A badge is ink text on the
 * surface with a hairline outline; its tone shows only as a small low-chroma dot (or a small icon,
 * such as the lock of "Notice blocked") never as a coloured outline or fill. A second part,
 * after a hairline divider, carries the detail: "Open | 3 missing".
 *
 * Adapted from two 21st.dev components:
 * - "Status Badge" (inspired by Tremor) by serafimcloud, https://21st.dev/r/serafimcloud/status-badge
 *   (id 521): the neutral background with a 1 px border, the coloured mark beside ink text instead
 *   of a coloured fill, and the two-part badge split by a 1 px divider with the detail in muted ink.
 * - "Badge" by coss.com, https://21st.dev/r/coss.com/coss-badge (id 11356): one component with
 *   semantic tones (neutral, success, warning, error, info) and sizes, icons sized by the badge.
 *
 * Changes for Hearing Desk: tones are ours (neutral, ok, warn, danger, accent, later); the dot is
 * mixed toward muted so green, amber and red stay quiet; a dashed outline for the
 * "Not built" tag; radius 4 (chips are not pills); 13 px; the words as printed on the sheet are kept
 * in the accessible text through `printed`, never shown only on hover.
 */
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { chipCase } from '@/lib/chipCase';

export type BadgeTone = 'neutral' | 'ok' | 'warn' | 'danger' | 'accent' | 'later';

/** The dot: the quiet --dot-* tones (3:1 or more on every surface), so it reads as a hint and never as a fill. */
const DOT: Record<BadgeTone, string> = {
  neutral: 'border border-muted bg-transparent',
  ok: 'bg-dot-ok',
  warn: 'bg-dot-warn',
  danger: 'bg-dot-danger',
  accent: 'bg-accent',
  later: 'border border-dashed border-later bg-transparent',
};

const MARK: Record<BadgeTone, string> = {
  neutral: 'text-muted',
  ok: 'text-dot-ok',
  warn: 'text-dot-warn',
  danger: 'text-danger',
  accent: 'text-accent',
  later: 'text-later',
};

const OUTLINE: Record<BadgeTone, string> = {
  neutral: 'border-border',
  ok: 'border-border',
  warn: 'border-border',
  danger: 'border-border',
  accent: 'border-border',
  later: 'border-dashed border-later',
};

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  tone?: BadgeTone;
  /** The word: "Ready", "Notice blocked". */
  children: ReactNode;
  /** The second part after a hairline: "3 missing". */
  detail?: ReactNode;
  /** An icon in place of the dot (lucide, 14 px). */
  icon?: ReactNode;
  /** No dot and no icon: the word alone (for "Not built"). */
  plain?: boolean;
  size?: 'sm' | 'md';
  /** The exact words as printed on the sheet; read to screen readers after the word, and the title. */
  printed?: string;
  testId?: string;
}

export function Badge({ tone = 'neutral', children, detail, icon, plain = false, size = 'md', printed, testId, className, ...rest }: BadgeProps) {
  return (
    <span
      data-testid={testId}
      data-tone={tone}
      title={printed ? `As printed on the sheet: ${printed}` : undefined}
      className={cn(
        'inline-flex max-w-full shrink-0 items-center rounded-chip border bg-surface font-medium whitespace-nowrap text-ink',
        size === 'sm' ? 'h-6 gap-2 px-2 text-small' : 'h-7 gap-2 px-2 text-small',
        OUTLINE[tone],
        className,
      )}
      {...rest}
    >
      {plain ? null : icon ? (
        <span aria-hidden className={cn('inline-flex [&_svg]:size-3.5 [&_svg]:shrink-0', MARK[tone])}>
          {icon}
        </span>
      ) : (
        <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', DOT[tone])} />
      )}
      <span className={cn(tone === 'later' && 'text-later')}>{children}</span>
      {detail ? (
        <>
          <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />
          <span className="font-normal text-ink-2 tabular-nums">{detail}</span>
        </>
      ) : null}
      {printed ? <span className="sr-only">{`, as printed on the sheet: ${printed}`}</span> : null}
    </span>
  );
}

/** Hearings W: READY ok; OPEN neutral with its "N missing" as the detail; OWED and ERROR DUE danger; RESULT DUE warn. */
export function statusTone(status: string): BadgeTone {
  const s = status.toUpperCase();
  if (s.startsWith('READY') || s.startsWith('CONFIRMED') || s.startsWith('DONE')) return 'ok';
  if (s.startsWith('OWED') || s.startsWith('ERROR DUE') || s.startsWith('MISSED')) return 'danger';
  if (s.startsWith('RESULT DUE')) return 'warn';
  return 'neutral';
}

export interface StatusChipProps {
  /** Hearings W, verbatim. */
  status: string;
  /** The plain words to show instead of the sheet's ("Not ready: 3 proofs missing"), from src/lib/copy.ts statusCopy() once that module is in the app. */
  label?: string;
  /** The tone to use instead of statusTone(), from the same statusCopy(). */
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  className?: string;
  testId?: string;
}

/**
 * The sheet's status as one badge: "OPEN: 3 missing" reads "Open | 3 missing". With `label`, the
 * plain words replace the sheet's; the exact sheet text stays in the title and the screen reader text.
 */
export function StatusChip({ status, label, tone, size, className, testId }: StatusChipProps) {
  const [head, ...tail] = status.split(':');
  const detail = label ? '' : tail.join(':').trim();
  return (
    <Badge tone={tone ?? statusTone(status)} detail={detail || undefined} size={size} printed={status} className={className} testId={testId}>
      {label ?? chipCase(head ?? status)}
    </Badge>
  );
}

/** Hearings X: the tone of one daily-list phrase, as the app's ListWords assigns it. */
const PHRASE_TONE: Record<string, BadgeTone> = {
  'NOTICE BLOCKED': 'danger',
  'TOP OF LIST': 'danger',
  'TOP OF LIST: OWED': 'danger',
  'NOBODY NAMED: POSSIBLY MISSED': 'danger',
  'OFFICE CANNOT FIND OUR NOTICE': 'danger',
  'ERROR DUE': 'danger',
  'ARRIVAL NOT SETTLED': 'warn',
  'OPENING NOT ARRANGED': 'warn',
  'ILLNESS REPORTED': 'warn',
  'CALL THE HOMEOWNER': 'warn',
  'FALLBACK DUE': 'warn',
  'RESULT DUE': 'warn',
  'CONFIRM TODAY': 'warn',
};

/**
 * One daily-list phrase as a badge. NOTICE BLOCKED takes the lock icon passed in `icon`. `label`
 * takes the plain words of src/lib/copy.ts listWord() once that module is in the app.
 */
export function PhraseChip({ phrase, label, icon, size, className }: { phrase: string; label?: string; icon?: ReactNode; size?: 'sm' | 'md'; className?: string }) {
  return (
    <Badge tone={PHRASE_TONE[phrase] ?? 'neutral'} icon={icon} size={size} printed={phrase} className={className}>
      {label ?? chipCase(phrase)}
    </Badge>
  );
}
