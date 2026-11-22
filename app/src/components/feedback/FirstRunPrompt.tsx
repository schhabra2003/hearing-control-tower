/**
 * FirstRunPrompt: on the first visit, one quiet card in the bottom right corner offers "Take the
 * tour" or "Skip". It never blocks the page, never takes focus by itself, and is not shown again
 * once either is chosen.
 *
 * Adapted from two 21st.dev components:
 * - "First-Run Welcome Screen" by olewandowski1, https://21st.dev/r/olewandowski1/onboarding-4
 *   (id 29529): the icon tile, the one-line heading, one sentence, and a primary action with
 *   "Take the tour" beside it.
 * - "Product Tour Popover" by shadcnspace, https://21st.dev/r/shadcnspace/product-tour-popover
 *   (id 29891): the compact card size and the Skip control set as a quiet button next to the
 *   primary one.
 *
 * Changes for Hearing Desk: a small card instead of a full screen (the Overview stays readable
 * behind it, which matters for the first 30 seconds of the video), no badge, no sparkle or rocket
 * icon, no marketing hints; Escape inside the card skips; the choice is remembered in
 * localStorage inside try/catch, and with storage blocked the card simply shows again next time.
 */

import { useCallback, useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Compass } from 'lucide-react';
import { DUR, tween } from '@/lib/motion';
import { Button } from '@/components/ui/Button';
import { TOUR } from '@/tour/steps';

const TOUR_WORDS: Record<number, string> = { 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Eleven', 12: 'Twelve' };

const KEY = 'hd.firstrun.v1';

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

function writeSeen(choice: 'tour' | 'skip'): void {
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    /* Storage blocked: the prompt shows again on the next visit, which is harmless. */
  }
}

/** Whether to offer the tour, and the two ways to answer. `?reset=1` can call `forget()`. */
export function useFirstRun(): { show: boolean; choose: (c: 'tour' | 'skip') => void; forget: () => void } {
  const [seen, setSeen] = useState(readSeen);
  const choose = useCallback((c: 'tour' | 'skip') => {
    writeSeen(c);
    setSeen(true);
  }, []);
  const forget = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* Nothing stored, nothing to clear. */
    }
    setSeen(false);
  }, []);
  return { show: !seen, choose, forget };
}

export interface FirstRunPromptProps {
  onTour: () => void;
  onSkip: () => void;
  /** How long the tour is, said in the sentence. Default: the stop count of the tour, in words. */
  length?: string;
  /** In the sidebar's foot, in the flow of the page: it never covers a decision or a button (UX-2, I4). */
  inline?: boolean;
}

export function FirstRunPrompt({ onTour, onSkip, length = `${TOUR_WORDS[TOUR.length] ?? TOUR.length} short stops`, inline = false }: FirstRunPromptProps) {
  const reduce = useReducedMotion();
  const onKeyDown = (e: KeyboardEvent<HTMLElement>): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onSkip();
    }
  };
  if (inline)
    return (
      <section aria-labelledby="first-run-title" data-testid="first-run" onKeyDown={onKeyDown} className="mb-3 rounded-card bg-surface-2 p-3 text-ink">
        <h2 id="first-run-title" className="text-body font-semibold">
          New here? Take the tour
        </h2>
        <p className="mt-1 text-small text-ink-2">{length} show the daily passes, the five checks and what is real.</p>
        <div className="mt-3 flex items-center gap-2">
          <Button variant="primary" size="sm" data-testid="first-run-tour" onClick={onTour}>
            Take the tour
          </Button>
          <Button variant="ghost" size="sm" data-testid="first-run-skip" onClick={onSkip}>
            Skip
          </Button>
        </div>
      </section>
    );
  return (
    <motion.section
      aria-labelledby="first-run-title"
      data-testid="first-run"
      onKeyDown={onKeyDown}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={tween(DUR.pop, reduce)}
      className="fixed right-6 bottom-6 z-[60] w-[360px] max-w-[calc(100vw-32px)] rounded-card bg-surface p-4 text-ink shadow-e3 max-sm:right-4 max-sm:bottom-20"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-control border border-border text-accent">
          <Compass className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="first-run-title" className="text-body font-semibold">
            Take a short tour of Hearing Desk
          </h2>
          <p className="mt-1 text-body text-ink-2">{length} show the daily passes, the five checks and what is real.</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="ghost" size="md" data-testid="first-run-skip" onClick={onSkip}>
          Skip
        </Button>
        <Button variant="primary" size="md" data-testid="first-run-tour" onClick={onTour}>
          Take the tour
        </Button>
      </div>
    </motion.section>
  );
}
