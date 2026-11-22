/**
 * Kbd and KeyCombo: key caps for the keyboard map, the palette, the tour and button hints.
 *
 * Adapted from the 21st.dev component "Combo Kbd" by ai2, https://21st.dev/r/ai2/kbd-combo
 * (id 28308): real <kbd> caps inside one root <kbd>, the visual caps hidden from screen readers
 * and one readable name in their place ("Ctrl plus K", "G then O"), and the "then" connector for
 * sequences. Changes for Hearing Desk: Inter instead of mono (mono is kept for cell
 * references only), 13 px so nothing a person reads is smaller, our surface and border tokens, a
 * 1 px bottom edge for a quiet key-cap depth, two sizes, and only the plus and then forms.
 */
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type KbdSize = 'sm' | 'md';

const CAP: Record<KbdSize, string> = {
  sm: 'h-5 min-w-5 px-1 text-small',
  md: 'h-6 min-w-6 px-2 text-small',
};

const CAP_BASE =
  'inline-flex shrink-0 select-none items-center justify-center rounded-chip border font-sans font-medium leading-[18px] whitespace-nowrap tabular-nums';

const TONE = {
  /** On a page, a menu or a secondary button. */
  default: 'border-border bg-surface-2 text-ink-2 shadow-[inset_0_-1px_0_var(--border)]',
  /** Inside a primary (ink) button. */
  'on-primary': 'border-on-primary bg-primary text-on-primary',
} as const;

export type KbdTone = keyof typeof TONE;

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  size?: KbdSize;
  tone?: KbdTone;
  children: ReactNode;
}

/** One key cap: "Esc", "K", "Enter". */
export function Kbd({ size = 'md', tone = 'default', className, children, ...rest }: KbdProps) {
  return (
    <kbd className={cn(CAP_BASE, CAP[size], TONE[tone], className)} {...rest}>
      {children}
    </kbd>
  );
}

export interface KeyComboProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** The keys in order: ["Ctrl", "K"] or ["G", "O"]. */
  keys: string[];
  /** "plus" for keys held together (Ctrl K); "then" for keys pressed one after the other (G then O). */
  join?: 'plus' | 'then';
  size?: KbdSize;
}

/** Several keys read as one name: a screen reader hears "Ctrl plus K" or "G then O". */
export function KeyCombo({ keys, join = 'plus', size = 'md', className, ...rest }: KeyComboProps) {
  return (
    <kbd className={cn('inline-flex shrink-0 items-center gap-1 font-sans', className)} {...rest}>
      <span className="sr-only">{keys.join(` ${join} `)}</span>
      <span aria-hidden className="inline-flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={`${k}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 && join === 'then' ? <span className="text-small text-muted">then</span> : null}
            <Kbd size={size}>{k}</Kbd>
          </span>
        ))}
      </span>
    </kbd>
  );
}
