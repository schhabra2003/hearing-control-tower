/**
 * Progress: one thin bar with its count in words. CheckProgress is the hearing preset: "3 of 5 checks
 * done", always over five checks (a check that is not needed counts as done).
 * It replaces an earlier five-square gate mark: the words carry the meaning, the bar is a quiet glance beside them.
 *
 * Adapted from "Progress" by jshguo, https://21st.dev/r/jshguo/interfaces-progress (a 4 px track
 * with a filled part and the value in words beside it; role="progressbar" with aria-valuenow and
 * aria-valuetext). Changes: our tokens only (ink fill on the border track, no state colour, no
 * gradient), no animation, a fixed 64 px bar so counts line up in a list, and the words in the DOM
 * (the bar is a picture of them, so a screen reader hears the sentence once).
 */
import { cn } from '@/lib/cn';

export interface ProgressProps {
  value: number;
  max: number;
  /** The words beside the bar, for example "3 of 5 checks done". */
  label: string;
  /** Hide the words visually (they stay for screen readers); only where the same words show nearby. */
  hideLabel?: boolean;
  className?: string;
  testId?: string;
}

export function Progress({ value, max, label, hideLabel = false, className, testId }: ProgressProps) {
  const pct = max > 0 ? Math.round((Math.min(value, max) / max) * 100) : 0;
  return (
    <span data-testid={testId} className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={label}
        aria-label={label}
        className="relative h-1 w-16 shrink-0 overflow-hidden rounded-full bg-border"
      >
        <span aria-hidden className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </span>
      <span aria-hidden className={cn('text-small whitespace-nowrap text-ink-2 tabular-nums', hideLabel && 'sr-only')}>
        {label}
      </span>
    </span>
  );
}

/** The five checks of a hearing: "3 of 5 checks done". `done` counts not-needed checks as done. */
export function CheckProgress({ done, total = 5, className, testId }: { done: number; total?: number; className?: string; testId?: string }) {
  return <Progress value={done} max={total} label={`${done} of ${total} checks done`} className={className} testId={testId} />;
}
