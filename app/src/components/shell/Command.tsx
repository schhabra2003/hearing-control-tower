/**
 * Command: cmdk parts inside a Radix dialog, for the command palette.
 *
 * Adapted from the 21st.dev component "Command Menu" by uvain
 * (https://21st.dev/r/uvain/command-menu-palette): cmdk for ranking and arrow keys, a Radix dialog
 * for focus trapping, Escape and focus return, items with an optional second line and a shortcut,
 * and its fix that keeps the listbox semantics whole (cmdk's sizing div gets role="presentation",
 * separators get role="none"). Sizes are raised to the app's legibility floor (14 px items,
 * 13 px second lines) and every colour comes from tokens.css. Its ⌘K hook is left out: the shell's
 * useKeys already binds Ctrl K and Cmd K.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { Command as Cmdk } from 'cmdk';
import { Search } from 'lucide-react';
import { useEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Kbd } from '@/components/ui/Kbd';

export function CommandInput({ className, ...props }: ComponentPropsWithoutRef<typeof Cmdk.Input>) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4">
      <Search aria-hidden className="size-5 shrink-0 text-muted" />
      <Cmdk.Input className={cn('h-14 min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-muted', className)} {...props} />
      <Kbd>Esc</Kbd>
    </div>
  );
}

export function CommandList({ className, ...props }: ComponentPropsWithoutRef<typeof Cmdk.List>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector('[cmdk-list-sizer]')?.setAttribute('role', 'presentation');
    ref.current?.querySelectorAll('[cmdk-separator]').forEach((el) => el.setAttribute('role', 'none'));
  });
  return <Cmdk.List ref={ref} className={cn('max-h-[min(60vh,460px)] overflow-y-auto overscroll-contain p-2', className)} {...props} />;
}

export function CommandEmpty({ className, ...props }: ComponentPropsWithoutRef<typeof Cmdk.Empty>) {
  return <Cmdk.Empty className={cn('px-4 py-10 text-center text-body text-muted', className)} {...props} />;
}

const HEADING =
  '[&_[cmdk-group-heading]]:sticky [&_[cmdk-group-heading]]:top-0 [&_[cmdk-group-heading]]:z-[1] [&_[cmdk-group-heading]]:bg-surface [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:text-small [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted';

export function CommandGroup({ className, ...props }: ComponentPropsWithoutRef<typeof Cmdk.Group>) {
  return <Cmdk.Group className={cn(HEADING, className)} {...props} />;
}

export interface CommandItemProps extends ComponentPropsWithoutRef<typeof Cmdk.Item> {
  icon?: ReactNode;
  /** A second line under the label. */
  hint?: ReactNode;
  /** Display only, keys split on spaces: "G H", "Shift D". */
  shortcut?: string;
  /** Shown at the right end, before the shortcut, for example a status chip. */
  meta?: ReactNode;
  testId?: string;
}

export function CommandItem({ className, icon, hint, shortcut, meta, testId, children, ...props }: CommandItemProps) {
  return (
    <Cmdk.Item
      data-testid={testId}
      aria-label={typeof children === 'string' ? (typeof hint === 'string' ? `${children}. ${hint}` : children) : undefined}
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-body text-ink outline-hidden select-none',
        'data-[selected=true]:bg-accent-soft data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-60',
        '[&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-muted data-[selected=true]:[&>svg]:text-accent',
        className,
      )}
      {...props}
    >
      {icon}
      <span className="grid min-w-0 flex-1">
        <span className="truncate font-medium">{children}</span>
        {hint ? <span className="truncate text-small text-muted">{hint}</span> : null}
      </span>
      {meta ? <span className="shrink-0">{meta}</span> : null}
      {shortcut ? (
        <span className="flex shrink-0 gap-1" aria-hidden>
          {shortcut.split(' ').map((k, i) => (
            <Kbd key={`${k}-${i}`}>{k}</Kbd>
          ))}
        </span>
      ) : null}
    </Cmdk.Item>
  );
}

export interface CommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name of the dialog and the combobox. */
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  empty: ReactNode;
  /** Shown in the footer on the left; key hints sit on the right. */
  footer?: ReactNode;
  testId?: string;
  inputTestId?: string;
  /** Passed to Radix, so the app can return focus where the palette was opened from. */
  onCloseAutoFocus?: (e: Event) => void;
  /** cmdk's own filter; pass false when the caller ranks and caps the entries itself. */
  shouldFilter?: boolean;
  children: ReactNode;
}

export function CommandDialog({ open, onOpenChange, label, value, onValueChange, placeholder, empty, footer, testId, inputTestId, onCloseAutoFocus, shouldFilter, children }: CommandDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--scrim)]" />
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 w-[640px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-card bg-surface text-ink shadow-e3 outline-none"
        >
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          <Cmdk data-testid={testId} label={label} loop shouldFilter={shouldFilter} className="flex flex-col">
            <CommandInput data-testid={inputTestId} value={value} onValueChange={onValueChange} placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{empty}</CommandEmpty>
              {children}
            </CommandList>
            <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3 text-small text-muted">
              <span className="min-w-0 truncate">{footer}</span>
              <span className="flex shrink-0 items-center gap-3" aria-hidden>
                <span className="flex items-center gap-1"><Kbd>Up</Kbd><Kbd>Down</Kbd> move</span>
                <span className="flex items-center gap-1"><Kbd>Enter</Kbd> open</span>
              </span>
            </div>
          </Cmdk>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
