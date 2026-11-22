/**
 * ConfirmDecisionDialog: a modal that records who decided and when, before a decision is kept.
 * Adapted from the 21st.dev component "Alert Dialog" by shadcn (https://21st.dev/r/shadcn/alert-dialog,
 * id 705): header with title and one-line description, a body, a footer with Cancel before the
 * action. Changes: built on the installed @radix-ui/react-dialog (no new package), a required name
 * field (Field.tsx) and a read-only date line, a list of what the decision types and where, our tokens and
 * motion, focus starts in the name field, and test ids on every control.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { motion, useReducedMotion } from 'motion/react';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from './Button';
import { Field, TextInput } from './Field';
import { DUR, tween } from '@/lib/motion';

/** "Your name" gives "Type your name first."; "Reason" gives "Type the reason first." */
export function missingText(label: string): string {
  const l = label.trim().toLowerCase();
  return /^(your|the|a|an)\s/.test(l) ? `Type ${l} first.` : `Type the ${l} first.`;
}

/** Where a decision is kept, said in every decision dialog. */
export const SAVED_NOTE = 'Saved in this browser. The coordinator then records it on the sheet.';

export interface DecisionFact {
  /** Short label, for example "Name goes in". */
  label: string;
  /** The value, for example a SourceTag with "Offices AY7". */
  value: ReactNode;
}

export interface ConfirmDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Verb first: "Approve the Tesswick change". */
  title: string;
  /** One sentence, at most two lines. */
  description?: ReactNode;
  /** What the decision types and where. Shown as a short definition list. */
  facts?: DecisionFact[];
  /** Label of the name field. Leave out for a decision that records no name (a rejection). */
  nameLabel?: string;
  /** The text the name field starts with, for a field that asks for a reason. */
  nameDefault?: string;
  /** The date and time that will be recorded, from the simulated clock: "Friday, June 7, 2030, 9:00 a.m.". */
  dateText: string;
  /** Short label of the date line. */
  dateLabel?: string;
  /** The action button: "Approve change". */
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** A second, required text field (a reason), under the name. */
  reasonLabel?: string;
  reasonDefault?: string;
  /** Called with the trimmed name and reason (empty strings when not asked). */
  onConfirm: (name: string, reason: string) => void;
  /** Where focus goes when the dialog closes (Radix's onCloseAutoFocus); returns false to keep Radix's default. */
  onCloseFocus?: () => boolean;
  /** Test id base: <base>-dialog, <base>-name, <base>-confirm, <base>-cancel. */
  testIdBase: string;
  /** The line under the date that says where the decision is kept; false hides it. */
  savedNote?: ReactNode | false;
}

export function ConfirmDecisionDialog({
  open,
  onOpenChange,
  title,
  description,
  facts = [],
  nameLabel,
  nameDefault = '',
  dateText,
  dateLabel = 'Date recorded',
  confirmLabel,
  tone = 'primary',
  reasonLabel,
  reasonDefault = '',
  onConfirm,
  onCloseFocus,
  testIdBase,
  savedNote = SAVED_NOTE,
}: ConfirmDecisionDialogProps) {
  const reduce = useReducedMotion();
  const [name, setName] = useState(nameDefault);
  const [tried, setTried] = useState(false);
  const [reason, setReason] = useState(reasonDefault);
  const nameRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const missing = Boolean(nameLabel) && !name.trim();
  const missingReason = Boolean(reasonLabel) && !reason.trim();

  const change = (next: boolean): void => {
    if (!next) {
      setName(nameDefault);
      setReason(reasonDefault);
      setTried(false);
    }
    onOpenChange(next);
  };

  const submit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (missing || missingReason) {
      setTried(true);
      (missing ? nameRef : reasonRef).current?.focus();
      return;
    }
    onConfirm(name.trim(), reason.trim());
    change(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={change}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--scrim)]" />
        <Dialog.Content
          asChild
          data-testid={`${testIdBase}-dialog`}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (nameRef.current ?? confirmRef.current)?.focus();
          }}
          onCloseAutoFocus={(e) => {
            if (onCloseFocus?.()) e.preventDefault();
          }}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tween(DUR.pop, reduce)}
            className="fixed top-1/2 left-1/2 z-50 w-[520px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-card bg-surface text-ink shadow-e3 outline-none"
          >
            <form onSubmit={submit} noValidate>
              <div className="px-6 pt-6">
                <Dialog.Title className="text-h2-card text-ink">{title}</Dialog.Title>
                {description ? <Dialog.Description className="mt-2 text-body leading-normal text-ink-2">{description}</Dialog.Description> : null}
              </div>

              <div className="flex flex-col gap-4 px-6 py-4">
                {facts.length ? (
                  <dl className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)] gap-x-4 gap-y-2 text-body">
                    {facts.map((f) => (
                      <div key={f.label} className="contents">
                        <dt className="text-ink-2">{f.label}</dt>
                        <dd className="text-ink">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {nameLabel ? (
                  <Field label={nameLabel} required error={tried && missing ? missingText(nameLabel) : undefined}>
                    <TextInput ref={nameRef} data-testid={`${testIdBase}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete={nameDefault ? 'off' : 'name'} />
                  </Field>
                ) : null}

                {reasonLabel ? (
                  <Field label={reasonLabel} required error={tried && missingReason ? missingText(reasonLabel) : undefined}>
                    <TextInput ref={reasonRef} data-testid={`${testIdBase}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} autoComplete="off" />
                  </Field>
                ) : null}

                <p className="flex flex-wrap items-baseline gap-x-2 text-body">
                  <span className="text-ink-2">{dateLabel}</span>
                  <span data-testid={`${testIdBase}-date`} className="font-medium text-ink tabular-nums">
                    {dateText}
                  </span>
                </p>
                {savedNote ? (
                  <p className="text-small text-ink-2" data-testid={`${testIdBase}-saved-note`}>
                    {savedNote}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
                <Dialog.Close asChild>
                  <Button variant="ghost" data-testid={`${testIdBase}-cancel`}>
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button ref={confirmRef} type="submit" variant={tone === 'danger' ? 'danger' : 'primary'} data-testid={`${testIdBase}-confirm`}>
                  {confirmLabel}
                </Button>
              </div>
            </form>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
