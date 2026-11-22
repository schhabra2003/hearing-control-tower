import { useSyncExternalStore } from 'react';

/** True while the media query matches, for example useMedia('(max-width: 639px)'). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (f) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', f);
      return () => m.removeEventListener('change', f);
    },
    () => window.matchMedia(query).matches,
  );
}

/** The phone layout (390 px is the reference width). */
export const PHONE = '(max-width: 639px)';
/** The collapsed layout (1280 px and below). */
export const COMPACT = '(max-width: 1439px)';
