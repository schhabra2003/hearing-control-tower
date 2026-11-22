/**
 * ActionButton: a button that shows the state of its own action (working, done, failed) in place,
 * without changing its width. Used for downloads and copies.
 * Adapted from the 21st.dev component "Loading Button" by ddoemonn
 * (https://21st.dev/r/ddoemonn/loading-button, id 23536): the useAsyncAction hook, which settles on
 * the action's own result (no pretend timer), and the labels stacked in one grid cell so nothing
 * shifts. With the fixed icon slot of "Download Button" by bidyut10
 * (https://21st.dev/r/bidyut10/download-button, id 34553). Changes: our Button variants and sizes,
 * lucide icons, no blur or spring, colour changes in 160 ms, reduced motion respected by the CSS.
 */

import { Check, CircleAlert, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button, type ButtonSize, type ButtonVariant } from './Button';

export type ActionStatus = 'idle' | 'pending' | 'success' | 'error';

/** Runs an action once at a time and reports idle, pending, success or error; returns to idle after resetAfter ms. */
export function useAsyncAction(action: () => unknown, resetAfter = 2400): { status: ActionStatus; run: () => void } {
  const [status, setStatus] = useState<ActionStatus>('idle');
  const busy = useRef(false);
  const runId = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const act = useRef(action);
  act.current = action;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const run = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    window.clearTimeout(timer.current);
    const id = ++runId.current;
    setStatus('pending');
    const settle = (next: 'success' | 'error'): void => {
      busy.current = false;
      if (id !== runId.current) return;
      setStatus(next);
      timer.current = window.setTimeout(() => setStatus('idle'), resetAfter);
    };
    Promise.resolve()
      .then(() => act.current())
      .then(
        (result) => settle(result === false ? 'error' : 'success'),
        () => settle('error'),
      );
  }, [resetAfter]);

  return { status, run };
}

export interface ActionButtonProps {
  /** The action. Return false or throw to show the failed state; a promise is awaited. */
  onAction: () => unknown;
  /** Idle label: "Download hearings.ics". */
  children: string;
  /** Idle icon. */
  icon: ReactNode;
  pendingLabel?: string;
  /** "Downloaded". */
  successLabel: string;
  errorLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  resetAfter?: number;
  className?: string;
  'data-testid'?: string;
}

const ICON = 'col-start-1 row-start-1 grid place-items-center transition-opacity duration-[var(--dur-color)] motion-reduce:transition-none';

export function ActionButton({
  onAction,
  children,
  icon,
  pendingLabel = children,
  successLabel,
  errorLabel = 'Failed. Try again',
  variant = 'secondary',
  size = 'sm',
  disabled,
  resetAfter,
  className,
  'data-testid': testId,
}: ActionButtonProps) {
  const { status, run } = useAsyncAction(onAction, resetAfter);
  const faces: { key: ActionStatus; text: string; mark: ReactNode }[] = [
    { key: 'idle', text: children, mark: icon },
    { key: 'pending', text: pendingLabel, mark: <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> },
    { key: 'success', text: successLabel, mark: <Check aria-hidden className="size-4" strokeWidth={2.5} /> },
    { key: 'error', text: errorLabel, mark: <CircleAlert aria-hidden className="size-4" /> },
  ];
  const label = faces.find((f) => f.key === status)?.text ?? children;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        aria-busy={status === 'pending' || undefined}
        aria-label={children}
        data-testid={testId}
        data-status={status}
        onClick={run}
        className={cn(
          status === 'success' && variant !== 'primary' && 'border-ok text-ok hover:bg-ok-bg',
          status === 'error' && variant !== 'primary' && 'border-danger text-danger hover:bg-danger-bg',
          className,
        )}
      >
        <span aria-hidden className="grid size-4 shrink-0">
          {faces.map((f) => (
            <span key={f.key} className={cn(ICON, f.key === status ? 'opacity-100' : 'opacity-0')}>
              {f.mark}
            </span>
          ))}
        </span>
        <span aria-hidden className="text-left whitespace-nowrap">{label}</span>
      </Button>
      <span role="status" className="sr-only">
        {status === 'success' ? successLabel : status === 'error' ? errorLabel : ''}
      </span>
    </>
  );
}
