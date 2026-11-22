/**
 * The guided tour: eleven stops across the product. The view is GuidedTour
 * (adapted from "Product Tour" by laziekiki, https://21st.dev/r/laziekiki/product-tour); this file
 * wires it to the session store, which holds the open stop, and to the hash router, which opens
 * each stop's route. The tour never clicks Accept or Approve itself.
 */

import { navigate } from '@/lib/router';
import { actions, getSession, useSession } from '@/lib/store';
import { GuidedTour, type GuidedTourStop } from './GuidedTour';
import { TOUR } from './steps';

/** The control that started the tour; focus goes back to it when the tour ends. */
let opener: HTMLElement | null = null;

/** Opens the tour at a stop (1 to 11), or resumes it where it was. */
export function startTour(step?: number): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) opener = active;
  const n = step ?? getSession().tourStep ?? 1;
  const stop = TOUR.find((s) => s.n === n) ?? TOUR[0]!;
  actions.setTourStep(stop.n);
  navigate(stop.route);
}

const STOPS: GuidedTourStop[] = TOUR.map((t) => ({ id: String(t.n), target: t.target, title: t.title, body: t.body, short: t.short }));

/** After the tour: the control that started it, else "Start the tour", else the page heading. */
function focusBack(): void {
  window.requestAnimationFrame(() => {
    const el = (opener?.isConnected ? opener : null)
      ?? document.querySelector<HTMLElement>('[data-testid="tour-start"]')
      ?? document.querySelector<HTMLElement>('main h1');
    if (!el) return;
    if (el.tagName === 'H1' && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus();
  });
}

const setIndex = (i: number | null): void => {
  actions.setTourStep(i == null ? null : TOUR[i]?.n ?? null);
  if (i == null) focusBack();
};
const enter = (s: GuidedTourStop): void => {
  const stop = TOUR.find((t) => String(t.n) === s.id);
  if (stop) navigate(stop.route);
};

export function Tour() {
  const step = useSession((s) => s.tourStep);
  const at = step == null ? -1 : TOUR.findIndex((s) => s.n === step);
  return <GuidedTour stops={STOPS} index={at < 0 ? null : at} onIndexChange={setIndex} onEnter={enter} />;
}
