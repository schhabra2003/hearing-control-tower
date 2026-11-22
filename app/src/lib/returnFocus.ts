/**
 * Focus return for overlays (WCAG 2.4.3). Radix returns focus only to a Dialog.Trigger; our
 * overlays open from rows, links, keys and the URL, so each remembers the element that had focus
 * when it opened and gives it focus back on close. When that element is gone (the overlay ran a
 * navigation, or opened from the URL) the caller's fallback is used, then the page's h1.
 */

import { useLayoutEffect, useRef } from 'react';

export function focusPageHeading(): void {
  const h1 = document.querySelector<HTMLElement>('#main h1');
  if (!h1) return;
  if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
  h1.focus({ preventScroll: true });
}

const nowhere = (): boolean => {
  const a = document.activeElement;
  return !a || a === document.body || a === document.documentElement;
};

/** Returns the handler for Radix's onCloseAutoFocus. */
export function useReturnFocus(open: boolean, fallback?: () => HTMLElement | null): (e: Event) => void {
  const trigger = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const a = document.activeElement;
    trigger.current = a instanceof HTMLElement && a !== document.body ? a : null;
  }, [open]);
  return (e: Event) => {
    e.preventDefault();
    const saved = trigger.current;
    // A frame later, so a route change that ran from the overlay can place focus first.
    window.requestAnimationFrame(() => {
      if (!nowhere()) return;
      const candidates = [fallback?.() ?? null, saved && saved.isConnected ? saved : null];
      for (const target of candidates) {
        if (!target) continue;
        target.focus({ preventScroll: false });
        // A row inside a grid may not take focus itself; try the next candidate then.
        if (document.activeElement === target || target.contains(document.activeElement)) return;
      }
      focusPageHeading();
    });
  };
}
