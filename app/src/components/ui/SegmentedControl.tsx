/**
 * SegmentedControl: the pass switch and the list filters.
 * Adapted from the 21st.dev component "Segmented Control" by klyv-ui
 * (https://21st.dev/r/klyv-ui/segmented-control, from Klyv, https://github.com/Klyv-UI/klyv,
 * MIT License, Copyright (c) 2026 Klyv contributors). Changes: our tokens and sizes, a count per
 * option, test ids, square-cornered track to match the work pages.
 *
 * MIT License. Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions: The above copyright notice
 * and this permission notice shall be included in all copies or substantial portions of the
 * Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: ReactNode;
  /** A count shown after the label. */
  count?: number;
  disabled?: boolean;
  testId?: string;
  /** A short hint on hover, for example the step a filter serves: "Step 3". */
  title?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Accessible name of the set. */
  label: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
  testId?: string;
}

/** Single choice from a few options: a radiogroup with roving focus, so arrow keys move and only the chosen option is a tab stop. */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onValueChange,
  label,
  size = 'md',
  fullWidth = false,
  className,
  testId,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (event: KeyboardEvent, index: number): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const total = options.length;
    const pick = (i: number): void => {
      const o = options[i];
      if (!o || o.disabled) return;
      onValueChange(o.value);
      refs.current[i]?.focus();
    };
    if (event.key === 'Home') return pick(options.findIndex((o) => !o.disabled));
    if (event.key === 'End') {
      for (let i = total - 1; i >= 0; i -= 1) if (!options[i]!.disabled) return pick(i);
      return undefined;
    }
    const step = event.key === 'ArrowRight' ? 1 : -1;
    for (let offset = 1; offset <= total; offset += 1) {
      const next = (index + step * offset + total * offset) % total;
      if (!options[next]!.disabled) return pick(next);
    }
    return undefined;
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
      className={cn('inline-flex max-w-full flex-wrap items-center gap-1 rounded-[10px] bg-surface-2 p-1 shadow-[inset_0_0_0_1px_var(--border)]', fullWidth && 'flex w-full', className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            tabIndex={selected ? 0 : -1}
            data-testid={option.testId}
            title={option.title}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(e) => move(e, index)}
            className={cn(
              'inline-flex shrink-0 items-center justify-center gap-2 rounded-[7px] leading-[18px] whitespace-nowrap transition-colors duration-[var(--dur-color)]',
              'disabled:pointer-events-none disabled:opacity-40',
              size === 'sm' ? 'h-8 px-3 text-small' : 'h-8 px-4 text-small',
              fullWidth && 'flex-1',
              selected ? 'bg-surface font-semibold text-ink shadow-e1' : 'font-medium text-ink-2 hover:text-ink',
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cn('tabular-nums text-small tabular-nums', selected ? 'text-ink-2' : 'text-muted')}>{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
