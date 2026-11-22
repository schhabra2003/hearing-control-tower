/**
 * Button: the one button system of the app. Primary, secondary, ghost and danger; two sizes
 * (sm 32 px for secondary actions, md 40 px for the primary action of a region); an optional
 * leading icon, trailing icon and key hint; loading and disabled states.
 *
 * Adapted from two 21st.dev components:
 * - "Button" by coss.com, https://21st.dev/r/coss.com/coss-button (id 11382): the loading state
 *   that keeps the button's width (the label stays in the layout, invisible, and the spinner sits
 *   centred over it), aria-busy while loading, the quiet "destructive-outline" variant that became
 *   our danger, and the rule that a disabled or loading button takes no pointer events.
 * - "Button" by wensity, https://21st.dev/r/wensity/button (id 31255): the 1 px border mixed from
 *   the fill so the primary button has a crisp edge instead of a flat block, the hover and pressed
 *   steps mixed from the same token, the 0.97 press scale switched off under reduced motion.
 *
 * Changes for Hearing Desk: our tokens only (primary, surface, border, danger, ink); the primary is
 * the ink fill of the "Ledger" tokens, with --shadow-primary for its edge and
 * inner highlight, and the accent stays for links, focus and selection; sizes cut to two; Inter 14/20; lucide icons sized by
 * the button; the Kbd hint from ./Kbd; no Base UI, no cva, no tailwind-merge (no new packages).
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Kbd } from './Kbd';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
/** sm 32 and md 40 everywhere; lg 48 only for touch targets on the consultant's phone page. */
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE = [
  'relative inline-flex max-w-full shrink-0 select-none items-center justify-center rounded-control border font-medium',
  // A button takes its label's width; only when its container is narrower does the label wrap,
  // inside the button, instead of being clipped or pushing the page sideways.
  'text-left',
  'transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--dur-color)] ease-[var(--ease-out)]',
  'active:scale-[0.97] active:duration-[var(--dur-press)] motion-reduce:active:scale-100 motion-reduce:transition-none',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  'disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none',
  '[&_svg]:pointer-events-none [&_svg]:shrink-0',
].join(' ');

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'border-primary bg-primary text-on-primary shadow-primary hover:bg-primary-hover hover:border-primary-hover active:bg-primary-hover',
  // Edges at 3:1 or more on the surface (--border-control), no color-mix at the point of use.
  secondary: 'border-border-control bg-surface text-ink shadow-control hover:bg-surface-2 active:bg-sunken',
  ghost: 'border-transparent bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink active:bg-sunken',
  danger: 'border-danger bg-surface text-danger shadow-control hover:bg-danger-bg active:bg-danger-bg',
};

// Heights 32 and 40 on the 8 px scale; icon to label 8 px in both sizes; icons 16 and 20 px.
const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-8 py-1 gap-2 px-3 text-body [&_svg]:size-4',
  md: 'min-h-10 py-2 gap-2 px-4 text-body [&_svg]:size-5',
  lg: 'min-h-12 py-2 gap-2 px-4 text-body font-semibold [&_svg]:size-5',
};

/** The class list of a button, for an <a> that must look like one (a download link, a route link). */
export function buttonClass({ variant = 'secondary', size = 'md', className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(BASE, VARIANT[variant], SIZE[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** An icon before the label. */
  icon?: ReactNode;
  /** An icon after the label, for example a chevron or an arrow out. */
  iconEnd?: ReactNode;
  /** The key that also does this, shown at the end ("A", "Enter"); the cap is hidden from screen readers and the key goes to aria-keyshortcuts. */
  kbd?: string;
  /** Shows a spinner (in the icon's place, or over the label when there is no icon), keeps the width, sets aria-busy and blocks clicks. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, iconEnd, kbd, loading = false, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-keyshortcuts={kbd}
      data-variant={variant}
      data-loading={loading ? '' : undefined}
      className={buttonClass({ variant, size, className })}
      {...rest}
    >
      {/* With an icon, the spinner takes the icon's place and the label stays readable (wensity);
          without one, the label keeps the width under a centred spinner (coss.com), transparent but still
          the button's accessible name. */}
      <span className={cn('inline-flex items-center gap-[inherit]', loading && !icon && 'opacity-0', loading && icon && 'opacity-70')}>
        {loading && icon ? <Spinner /> : icon}
        {children}
        {iconEnd}
        {kbd ? (
          <Kbd aria-hidden size="sm" tone={variant === 'primary' ? 'on-primary' : 'default'} className="ml-1">
            {kbd}
          </Kbd>
        ) : null}
      </span>
      {loading && !icon ? (
        <span aria-hidden className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      ) : null}
    </button>
  );
});

function Spinner() {
  return <span aria-hidden className="size-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />;
}
