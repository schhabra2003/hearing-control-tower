/**
 * IconButton: a square button for one icon (close, previous, next, theme, copy). The label is
 * required: it is the accessible name and the tooltip, so an icon never stands alone.
 *
 * Adapted from the 21st.dev component "Icon Button" by amankaushik481,
 * https://21st.dev/r/amankaushik481/icon-button (id 46179): a square size per button size, every
 * button variant, and the required aria-label in the type. Changes for Hearing Desk: built on our
 * Button classes (./Button) so the family matches, the label also shown as a Tooltip with an
 * optional key, sizes 32 and 40 px, ghost by default.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { buttonClass, type ButtonSize, type ButtonVariant } from './Button';
import { Tooltip } from './Tooltip';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  /** What the button does, as a short verb phrase: "Close the hearing", "Next hearing". */
  label: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** The key that does the same, shown in the tooltip and given to aria-keyshortcuts. */
  keys?: string[];
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
}

const SQUARE: Record<ButtonSize, string> = { sm: 'w-8 px-0', md: 'w-10 px-0', lg: 'w-12 px-0' };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, variant = 'ghost', size = 'sm', keys, tooltipSide = 'bottom', className, type = 'button', ...rest },
  ref,
) {
  return (
    <Tooltip content={label} keys={keys} side={tooltipSide}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        aria-keyshortcuts={keys?.join('+')}
        className={buttonClass({ variant, size, className: cn(SQUARE[size], className) })}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
});
