/**
 * GuidedTour: a spotlight tour across pages. For each stop it calls onEnter (the app opens the
 * route), waits for the element with the stop's data-testid, scrolls it into view, rings it with a
 * 4 px accent outline over the scrim, and places a 360 px card beside it. Back, Next (naming the
 * next stop), Esc to end, arrow keys, Tab kept inside the card, focus back to the starting control.
 * The page stays usable under the scrim; the tour never clicks anything itself.
 *
 * Adapted from the 21st.dev component "Product Tour" by laziekiki
 * (https://21st.dev/r/laziekiki/product-tour): measured target rectangle, box-shadow scrim with a
 * moving hole, auto placement that puts the card under or over a wide target and beside a narrow
 * one, focus on the primary button, reduced motion. Changes: our tokens; targets by data-testid;
 * a wait for targets that appear after a route change; Enter is left to the focused button; a
 * "Stop N of M" line and a progress bar in place of dots only; a note when a target is missing;
 * controlled by the caller (index and onIndexChange), so the app's store and router own the state.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { cn } from '@/lib/cn';
import { DUR, tween } from '@/lib/motion';

export interface GuidedTourStop {
  id: string;
  /** data-testid of the element the spotlight rings. */
  target: string;
  title: string;
  /** Two sentences at most. */
  body: ReactNode;
  /** Short name used on the Next button of the stop before: "Next: The 9:00 a.m. pass". */
  short: string;
}

export interface GuidedTourProps {
  stops: GuidedTourStop[];
  /** The open stop, or null when the tour is closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  /** Called once when a stop opens, before the wait for its target: open the stop's route here. */
  onEnter?: (stop: GuidedTourStop) => void;
  /** data-testid of the control that starts the tour; focus returns to it when the tour ends. */
  returnFocusTo?: string;
  /** How long to wait for a target before showing the card without a spotlight. */
  waitMs?: number;
  /** Height of the fixed top bar, so the spotlight is never drawn under it. */
  topInset?: number;
  /** Prefix of the test ids: tour-card, tour-next, tour-back, tour-close, tour-spotlight. */
  testIdPrefix?: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const CARD_W = 360;
const GAP = 16;
const EDGE = 16;

const byTestId = (id: string): HTMLElement | null => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);

function measure(el: HTMLElement, topInset: number): Box {
  const r = el.getBoundingClientRect();
  const top = Math.max(r.top - PAD, topInset + 4);
  const bottom = Math.min(r.bottom + PAD, window.innerHeight - 8);
  const left = Math.max(r.left - PAD, 8);
  const right = Math.min(r.right + PAD, window.innerWidth - 8);
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/** A wide target gets the card under or over it, aligned to its left edge; a narrow one beside it. */
function place(box: Box | null, cardH: number, topInset: number): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const corner = { top: vh - cardH - 24, left: vw - CARD_W - 24 };
  if (!box) return corner;
  const clampTop = (t: number): number => Math.min(Math.max(t, topInset + EDGE), vh - cardH - EDGE);
  const clampLeft = (l: number): number => Math.min(Math.max(l, EDGE), vw - CARD_W - EDGE);
  const below = box.top + box.height + GAP;
  const above = box.top - GAP - cardH;
  const fitsBelow = below + cardH < vh - EDGE;
  const fitsAbove = above > topInset + EDGE;
  const fitsRight = box.left + box.width + GAP + CARD_W < vw - EDGE;
  const fitsLeft = box.left - GAP - CARD_W > EDGE;
  const wide = box.width > vw * 0.45;
  const order: Array<'below' | 'above' | 'right' | 'left'> = wide ? ['below', 'above', 'right', 'left'] : ['right', 'left', 'below', 'above'];
  for (const side of order) {
    if (side === 'below' && fitsBelow) return { top: below, left: clampLeft(box.left) };
    if (side === 'above' && fitsAbove) return { top: above, left: clampLeft(box.left) };
    if (side === 'right' && fitsRight) return { top: clampTop(box.top), left: box.left + box.width + GAP };
    if (side === 'left' && fitsLeft) return { top: clampTop(box.top), left: box.left - GAP - CARD_W };
  }
  return corner;
}

const same = (a: Box | null, b: Box | null): boolean =>
  !!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

export function GuidedTour(props: GuidedTourProps) {
  const { stops, index } = props;
  const stop = index == null ? null : stops[index] ?? null;
  if (!stop || index == null) return null;
  return <TourStop key={stop.id} {...props} stop={stop} at={index} />;
}

function TourStop({ stops, stop, at, onIndexChange, onEnter, returnFocusTo, waitMs = 6000, topInset = 60, testIdPrefix = 'tour' }: GuidedTourProps & { stop: GuidedTourStop; at: number }) {
  const reduce = useReducedMotion();
  const [box, setBox] = useState<Box | null>(null);
  const [missing, setMissing] = useState(false);
  const [cardH, setCardH] = useState(280);
  const card = useRef<HTMLDivElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const after = stops[at + 1] ?? null;
  const tid = (s: string): string => `${testIdPrefix}-${s}`;
  // The caller may pass a new function on every render; the stop opens once.
  const enter = useRef(onEnter);
  enter.current = onEnter;

  const go = useCallback(
    (to: number | null) => {
      onIndexChange(to);
      if (to == null && returnFocusTo) window.requestAnimationFrame(() => byTestId(returnFocusTo)?.focus());
    },
    [onIndexChange, returnFocusTo],
  );

  // Open the stop, then follow its target every frame: it may mount late, scroll or resize.
  useEffect(() => {
    enter.current?.(stop);
    let frame = 0;
    let tries = 0;
    let lastTry = -Infinity;
    const started = performance.now();
    const tick = (): void => {
      const el = byTestId(stop.target);
      if (el) {
        const r = el.getBoundingClientRect();
        const out = r.top < topInset + 8 || (r.bottom > window.innerHeight - 16 && r.top > window.innerHeight * 0.5);
        // A route change can reset the scroll after the first try, so try again a few times.
        if (out && tries < 4 && performance.now() - lastTry > 700) {
          tries += 1;
          lastTry = performance.now();
          el.scrollIntoView({ block: r.height > window.innerHeight - 160 ? 'start' : 'center', behavior: reduce ? 'auto' : 'smooth' });
        }
        const b = measure(el, topInset);
        setMissing(false);
        setBox((old) => (same(old, b) ? old : b));
      } else if (performance.now() - started > waitMs) {
        setMissing(true);
        setBox(null);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [stop, reduce, topInset, waitMs]);

  useLayoutEffect(() => {
    if (card.current && Math.abs(card.current.offsetHeight - cardH) > 1) setCardH(card.current.offsetHeight);
  });

  useEffect(() => {
    nextButton.current?.focus({ preventScroll: true });
  }, [stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (e.key === 'Escape') {
        e.preventDefault();
        go(null);
        return;
      }
      if (/^(input|textarea|select)$/i.test(target?.tagName ?? '') || target?.isContentEditable) return;
      const inCard = !!target && !!card.current?.contains(target);
      // Enter inside the card belongs to the focused button; outside it, Enter goes on.
      if ((e.key === 'Enter' && !inCard) || e.key === 'ArrowRight') {
        e.preventDefault();
        go(after ? at + 1 : null);
      } else if (e.key === 'ArrowLeft' && at > 0) {
        e.preventDefault();
        go(at - 1);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [after, at, go]);

  const phone = typeof window !== 'undefined' && window.innerWidth < 640;
  const pos = phone ? null : place(box, cardH, topInset);
  const ease = tween(DUR.spot, reduce);
  const progress = ((at + 1) / stops.length) * 100;

  return (
    <>
      {box ? (
        <motion.div
          data-testid={tid('spotlight')}
          aria-hidden
          initial={false}
          animate={{ top: box.top, left: box.left, width: box.width, height: box.height }}
          transition={ease}
          className="pointer-events-none fixed z-[70] rounded-[var(--radius-card)] outline-4 outline-accent outline-solid"
          style={{ boxShadow: '0 0 0 9999px var(--scrim)' }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] bg-[var(--scrim)]" />
      )}
      <motion.div
        ref={card}
        data-testid={tid('card')}
        role="dialog"
        aria-modal="false"
        aria-labelledby={tid('title')}
        aria-describedby={tid('body')}
        onKeyDown={(e) => {
          if (e.key !== 'Tab' || !card.current) return;
          const items = [...card.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
          if (items.length === 0) return;
          const now = items.indexOf(document.activeElement as HTMLElement);
          const to = e.shiftKey ? (now <= 0 ? items.length - 1 : now - 1) : now === items.length - 1 ? 0 : now + 1;
          e.preventDefault();
          items[to]?.focus();
        }}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, ...(pos ? { top: pos.top, left: pos.left } : {}) }}
        transition={ease}
        className={cn(
          'pointer-events-auto fixed z-[75] flex flex-col gap-4 rounded-[var(--radius-feature)] bg-surface p-6 text-ink shadow-e3',
          phone ? 'right-4 bottom-4 left-4' : 'w-[360px]',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p data-testid={tid('step-count')} className="text-small font-medium text-ink-2 tabular-nums">
            Stop {at + 1} of {stops.length}
          </p>
          <button
            type="button"
            data-testid={tid('close')}
            aria-label="End the tour"
            onClick={() => go(null)}
            className="grid size-8 place-items-center rounded-[var(--radius-control)] text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <div aria-hidden className="h-1 overflow-hidden rounded-full bg-surface-2">
          <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${progress}%` }} transition={tween(DUR.step, reduce)} />
        </div>
        <div>
          <h2 id={tid('title')} data-testid={tid('title')} className="text-section text-ink">
            {stop.title}
          </h2>
          <div id={tid('body')} className="mt-2 text-body leading-normal text-ink-2">
            {stop.body}
          </div>
          {missing ? <p className="mt-2 text-body text-warn">This part is not on screen right now. Next goes on.</p> : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button size="md" variant="ghost" data-testid={tid('back')} disabled={at === 0} onClick={() => go(at - 1)} icon={<ArrowLeft aria-hidden className="size-4" />}>
            Back
          </Button>
          <Button ref={nextButton} size="md" variant="primary" data-testid={tid('next')} onClick={() => go(after ? at + 1 : null)}>
            {after ? (
              <>
                Next: {after.short}
                <ArrowRight aria-hidden className="size-4" />
              </>
            ) : (
              'Finish the tour'
            )}
          </Button>
        </div>
        <p className="text-small text-ink-2">
          <Kbd>Esc</Kbd> ends the tour
        </p>
      </motion.div>
    </>
  );
}
