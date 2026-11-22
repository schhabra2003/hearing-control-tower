/**
 * Tooltip: a short hint on hover and on keyboard focus; Escape closes it. Three forms: a plain
 * line, a heading with one line under it, and a line with the key that does the same thing.
 *
 * Adapted from two 21st.dev components:
 * - "Tooltip" by wensity, https://21st.dev/r/wensity/tooltip (id 31328): the solid overlay surface
 *   with a hairline border instead of an inverted black box, the rich form (heading plus one line),
 *   the shortcut form with key caps, the 150 ms fade and 0.96 scale from the trigger's side, and no
 *   motion under reduced motion.
 * - "Accessible Tooltip" by a11ypros, https://21st.dev/r/a11ypros/a11y-tooltip (id 34686): the
 *   dashed underline that marks a plain word as having a hint, and making that word focusable so a
 *   keyboard user reaches the same hint.
 *
 * Changes for Hearing Desk: built on @radix-ui/react-tooltip (already in the app; Base UI is not),
 * our surface, border, ink and e2 tokens, 13 px text so nothing is below the floor, our Kbd caps,
 * closed while the guided tour runs (as the app's tooltip does). A hint only adds: the same fact is
 * in the DOM elsewhere (an accessible name, a "Details" disclosure or the drawer).
 */
import * as RT from '@radix-ui/react-tooltip';
import type { ReactElement, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/store';
import { Kbd } from './Kbd';

export const TooltipProvider = RT.Provider;

export interface TooltipProps {
  /** The hint: one short line. With `heading`, the line under the heading. */
  content: ReactNode;
  /** A bold first line, for a hint that names a thing and then explains it. */
  heading?: ReactNode;
  /** Keys that do the same as the trigger, shown at the end: ["A"], ["Ctrl", "K"]. */
  keys?: string[];
  /** The trigger. A button or link; or plain text with `term` set. */
  children: ReactElement | string;
  /** Plain text trigger: dashed underline, focusable, help cursor. */
  term?: boolean;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  /** Opens without hover, for screenshots and the tour. */
  open?: boolean;
  delay?: number;
  className?: string;
}

const POPUP = cn(
  'z-[60] max-w-[320px] rounded-control border border-border bg-surface px-3 py-2 text-small leading-[1.45] text-ink shadow-e2',
  'origin-[var(--radix-tooltip-content-transform-origin)] transition-[opacity,scale] duration-150 ease-[var(--ease-out)]',
  'data-[state=closed]:opacity-0 data-[state=closed]:scale-[0.96] starting:opacity-0 starting:scale-[0.96]',
  'motion-reduce:transition-none',
);

export function Tooltip({ content, heading, keys, children, term = false, side = 'top', align = 'center', open, delay = 300, className }: TooltipProps) {
  const touring = useSession((s) => s.tourStep !== null);
  const forced = touring ? false : open;
  const trigger =
    term || typeof children === 'string' ? (
      <span
        tabIndex={0}
        className="cursor-help rounded-[2px] underline decoration-muted decoration-dashed decoration-1 underline-offset-[3px] hover:decoration-ink-2"
      >
        {children}
      </span>
    ) : (
      children
    );
  return (
    <RT.Root delayDuration={delay} {...(forced !== undefined ? { open: forced } : {})}>
      <RT.Trigger asChild>{trigger}</RT.Trigger>
      <RT.Portal>
        <RT.Content side={side} align={align} sideOffset={6} collisionPadding={12} className={cn(POPUP, heading ? 'px-3 py-2' : null, className)}>
          {heading ? (
            <span className="block">
              <span className="block font-semibold text-ink">{heading}</span>
              <span className="mt-1 block text-ink-2">{content}</span>
            </span>
          ) : (
            <span className="inline">{content}</span>
          )}
          {keys?.length ? (
            <span aria-hidden className="ml-2 inline-flex translate-y-[-1px] items-center gap-1 align-middle">
              {keys.map((k, i) => (
                <Kbd key={`${k}-${i}`} size="sm">{k}</Kbd>
              ))}
            </span>
          ) : null}
          <RT.Arrow asChild width={12} height={6}>
            <svg viewBox="0 0 12 6" aria-hidden>
              <path d="M0 0 L6 6 L12 0" className="fill-surface stroke-border" strokeWidth={1} />
            </svg>
          </RT.Arrow>
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}
