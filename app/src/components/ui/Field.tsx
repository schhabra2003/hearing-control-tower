/**
 * Field and TextInput: a label, an optional hint, an error, and the control wired to them by id.
 * Adapted from the 21st.dev component "Field" by wensity (https://21st.dev/r/wensity/field,
 * id 27462): the context that hands the control its id and aria-describedby, the error that
 * replaces nothing and is announced, the required marker. Changes: no Base UI, one stacked layout,
 * no success message, text at 13 px or more, our tokens. A hint is only for what the label cannot
 * say (the cell a value goes to), never a restatement of the label.
 */

import { createContext, forwardRef, useContext, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

function useField(): FieldContextValue {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error('TextInput and TextArea must be inside a Field.');
  return ctx;
}

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /** Shown under the control and announced; marks the control invalid. */
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function Field({ label, hint, error, required = false, children, className, 'data-testid': testId }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required }}>
      <div data-testid={testId} className={cn('flex flex-col gap-2', className)}>
        <label htmlFor={id} className="text-body font-semibold text-ink">
          {label}
          {required ? <span className="ml-1 font-normal text-ink-2">(required)</span> : null}
        </label>
        {hint ? (
          <p id={hintId} className="text-small text-ink-2">
            {hint}
          </p>
        ) : null}
        {children}
        <p id={errorId} role="alert" className={cn('text-small font-medium text-danger', !error && 'hidden')}>
          {error}
        </p>
      </div>
    </FieldContext.Provider>
  );
}

const CONTROL =
  'w-full rounded-control border bg-surface px-3 text-body text-ink max-sm:text-[16px] max-sm:leading-6 transition-colors duration-[var(--dur-color)] placeholder:text-muted disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-2';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...rest }, ref) {
  const f = useField();
  return (
    <input
      ref={ref}
      id={f.id}
      aria-describedby={f.describedBy}
      aria-invalid={f.invalid || undefined}
      aria-required={f.required || undefined}
      className={cn(CONTROL, 'h-10', f.invalid ? 'border-danger' : 'border-border-strong hover:border-ink-2', className)}
      {...rest}
    />
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, rows = 3, ...rest }, ref) {
  const f = useField();
  return (
    <textarea
      ref={ref}
      id={f.id}
      rows={rows}
      aria-describedby={f.describedBy}
      aria-invalid={f.invalid || undefined}
      aria-required={f.required || undefined}
      className={cn(CONTROL, 'py-2', f.invalid ? 'border-danger' : 'border-border-strong hover:border-ink-2', className)}
      {...rest}
    />
  );
});
