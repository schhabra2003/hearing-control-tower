/*
 * FilterChips: one choice from a row of filters, each with its count (the Hearings filters).
 *
 * Adapted from "Filter Grid" by ddoemonn, https://21st.dev/r/ddoemonn/filter-grid
 * (radiogroup with a roving Tab stop, arrows, Home and End, a sliding thumb under the chosen chip,
 * and a screen-reader text "label, N of total"). The grid of cards and its demo items were left out;
 * colours, radius and type come from tokens.css.
 */

import { motion, useReducedMotion } from 'motion/react';
import { useId, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { DUR, tween } from '@/lib/motion';

export interface FilterChip<V extends string> {
  value: V;
  label: string;
  count?: number;
  /** A count above zero on this chip needs action today: it is shown in the danger colour. */
  tone?: 'danger' | 'neutral';
  testId?: string;
}

export interface FilterChipsProps<V extends string> {
  chips: FilterChip<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Accessible name of the group, for example "Filter the hearings". */
  label: string;
  /** Total behind the counts, read out as "Top of list, 10 of 24". */
  total?: number;
  testId?: string;
  className?: string;
}

export function FilterChips<V extends string>({ chips, value, onChange, label, total, testId, className }: FilterChipsProps<V>) {
  const reduce = useReducedMotion();
  const uid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, chips.findIndex((c) => c.value === value));

  const go = (i: number): void => {
    const n = chips.length;
    const next = chips[(i + n) % n];
    if (!next) return;
    refs.current[(i + n) % n]?.focus();
    onChange(next.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number): void => {
    const keys: Record<string, number> = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: chips.length - 1 };
    const to = keys[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  };

  return (
    <div role="radiogroup" aria-label={label} data-testid={testId} className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map((c, i) => {
        const on = i === index;
        const alert = c.tone === 'danger' && (c.count ?? 0) > 0;
        return (
          <button
            key={c.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-testid={c.testId}
            onClick={() => onChange(c.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative inline-flex h-9 items-center gap-2 rounded-control border px-3 text-body font-medium transition-colors duration-[var(--dur-color)]',
              on ? 'border-accent text-accent' : 'border-border-control bg-surface text-ink-2 hover:border-border-strong hover:text-ink',
            )}
          >
            {on ? (
              <motion.span
                aria-hidden
                layoutId={reduce ? undefined : `${uid}-thumb`}
                transition={tween(DUR.pop, reduce)}
                className="absolute inset-0 rounded-control bg-accent-soft"
              />
            ) : null}
            <span aria-hidden className="relative">
              {c.label}
            </span>
            {c.count !== undefined ? (
              <span
                aria-hidden
                className={cn('relative tabular-nums text-small tabular-nums', on ? 'text-accent' : alert ? 'font-semibold text-danger' : 'text-muted')}
              >
                {c.count}
              </span>
            ) : null}
            <span className="sr-only">
              {c.label}
              {c.count !== undefined ? `, ${c.count}${total !== undefined ? ` of ${total}` : ''}` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
