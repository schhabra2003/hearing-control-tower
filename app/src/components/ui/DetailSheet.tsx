/*
 * DetailSheet: the hearing drawer. A side sheet under the top bar with three fixed parts: a header
 * bar (previous and next, the row position, the actions on the right, close), a scrolling body,
 * and an optional footer bar that keeps the one primary action of the drawer in reach.
 *
 * Adapted from "Sheet" by kevingirelli, https://21st.dev/r/kevingirelli/sheet
 * (Radix Dialog as a side panel: focus moves in and is trapped, Escape and the overlay close it,
 * the page behind does not scroll, the panel is named by its title, no slide under reduced motion,
 * the header, body and footer as separate slots).
 * Changes: no class-variance-authority (one side only, the right; a full-screen sheet with a Back
 * button on a phone); the app's tokens for surface, hairline, scrim and elevation; the panel starts
 * under the top bar so the breadcrumb and the clock stay visible; the slide uses the app's motion
 * tokens; focus returns to the row that opened it (useReturnFocus) and the first element marked
 * data-autofocus gets focus on open; while the guided tour runs the sheet is not modal; the footer
 * slot is new to the app's drawer.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { PHONE, useMedia } from '@/lib/media';
import { DUR, tween } from '@/lib/motion';
import { useReturnFocus } from '@/lib/returnFocus';
import { useSession } from '@/lib/store';

export interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The sheet's accessible name, for example "Hearing AX-107, 37 Meadow Avenue, Tesswick". */
  title: string;
  /** The left part of the header bar: previous and next, "Row 14 of 24". */
  nav?: ReactNode;
  /** The right part of the header bar, before Close: "Open full page". */
  actions?: ReactNode;
  /** A bar fixed at the bottom, for the drawer's one primary action. */
  footer?: ReactNode;
  children: ReactNode;
  /** Where focus goes when the sheet closes, if the element that opened it is gone. */
  returnFocusTo?: () => HTMLElement | null;
  className?: string;
  'data-testid'?: string;
  closeTestId?: string;
}

export function DetailSheet({ open, onOpenChange, title, nav, actions, footer, children, returnFocusTo, className, 'data-testid': testId, closeTestId }: DetailSheetProps) {
  const phone = useMedia(PHONE);
  const reduce = useReducedMotion();
  const touring = useSession((s) => s.tourStep !== null);
  const body = useRef<HTMLDivElement>(null);
  const onCloseAutoFocus = useReturnFocus(open, returnFocusTo);
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [title]);
  const iconButton =
    'grid size-9 place-items-center rounded-control text-ink-2 transition-colors duration-[var(--dur-color)] hover:bg-surface-2 hover:text-ink';
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={!touring}>
      <Dialog.Portal>
        <Dialog.Overlay data-testid="drawer-scrim" className="fixed inset-0 z-40 bg-[var(--scrim)]" />
        <Dialog.Content
          aria-describedby={undefined}
          data-testid={testId}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const first = body.current?.querySelector<HTMLElement>('[data-autofocus]');
            (first ?? body.current)?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={onCloseAutoFocus}
          onInteractOutside={(e) => {
            const t = e.target as HTMLElement | null;
            if (touring || t?.closest('[data-testid="tour-card"], [data-testid="toast"]')) e.preventDefault();
          }}
          asChild
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={tween(DUR.pop, reduce)}
            className={cn(
              'fixed z-40 flex flex-col bg-surface text-ink shadow-e3 outline-none',
              phone ? 'inset-0' : 'top-[var(--topbar-height)] right-0 bottom-0 w-[var(--drawer-width)] max-w-[calc(100vw-var(--sidebar-collapsed))] border-l border-border',
              className,
            )}
          >
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
              {phone ? (
                <Dialog.Close data-testid={closeTestId} className="inline-flex h-9 items-center gap-2 rounded-control px-2 text-body font-medium text-ink-2 hover:bg-surface-2">
                  <ArrowLeft aria-hidden className="size-4" />
                  Back
                </Dialog.Close>
              ) : null}
              <div className="flex min-w-0 flex-1 items-center gap-1">{nav}</div>
              {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
              {!phone ? (
                <Dialog.Close data-testid={closeTestId} aria-label="Close the drawer (Esc)" className={iconButton}>
                  <X aria-hidden className="size-5" />
                </Dialog.Close>
              ) : null}
            </header>
            <div ref={body} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none">
              {children}
            </div>
            {footer ? <footer className="flex min-h-16 shrink-0 items-center justify-end gap-2 border-t border-border bg-surface px-6 py-3 max-sm:px-4">{footer}</footer> : null}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
