/**
 * RangeField: a labelled slider with a live value readout and its basis chip, on the native
 * range input (keyboard, screen reader and touch behaviour come from the browser).
 *
 * Adapted from halaska-studio, "Slider" (the labelled numeric slider with a live readout),
 * https://21st.dev/halaska-studio/slider
 * Changes: no inline-style theme kit or spring track; our tokens; an <output> tied to the input;
 * a filled track drawn from the value; the basis chip in place of helper text.
 */
import { useId, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Formats the readout and the screen reader's value text. */
  format: (value: number) => string;
  /** The basis of the starting value, usually one SourceChip. */
  chip?: ReactNode;
  testId?: string;
  className?: string;
}

export function RangeField({ label, value, min, max, step, onChange, format, chip, testId, className }: RangeFieldProps) {
  const id = useId();
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={cn('flex flex-col gap-2 py-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-body font-medium text-ink">
          {label}
        </label>
        <span className="flex items-center gap-2">
          {chip}
          <output htmlFor={id} className="min-w-[72px] text-right text-body font-semibold text-ink tabular-nums">
            {format(value)}
          </output>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        data-testid={testId}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': `${fill}%` } as CSSProperties}
        className={cn(
          'h-5 w-full cursor-pointer appearance-none bg-transparent',
          '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full',
          '[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--accent)_var(--fill),var(--border-strong)_var(--fill))]',
          '[&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-surface',
          '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-[var(--dur-press)] active:[&::-webkit-slider-thumb]:scale-110',
          '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border-strong',
          '[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-accent',
          '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-surface',
        )}
      />
    </div>
  );
}
