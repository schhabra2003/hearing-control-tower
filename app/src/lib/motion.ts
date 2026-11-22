/**
 * Motion constants for JavaScript animations (motion/react), the same values as the CSS tokens in
 * tokens.css (--ease-out, --dur-*). Every component imports these instead of
 * writing its own numbers, so a change of tempo is one edit.
 */
export const EASE_OUT = [0.2, 0.7, 0.2, 1] as const;

/** Seconds, as motion/react expects. */
export const DUR = {
  press: 0.12,
  color: 0.16,
  pop: 0.2,
  spot: 0.24,
  step: 0.32,
} as const;

/** A transition for motion/react: the token duration, or none under reduced motion. */
export function tween(duration: number, reduce: boolean | null): { duration: number; ease?: typeof EASE_OUT } {
  return reduce ? { duration: 0 } : { duration, ease: EASE_OUT };
}
