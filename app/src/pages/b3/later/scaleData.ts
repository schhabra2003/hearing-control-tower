/** The recorded scale runs in engine.json (written by the prototype's cli/scale.js), typed. */

import { engine } from '@/lib/data';

export type { ExpPoint, ExpRow, Experiment, ScaleData, ScaleSetting } from '@/types/data';

/** engine.json's scale block is written by cli/scale.js with this shape. */
export const scale = engine.scale;

export interface SimResult {
  hearings: number;
  held: number;
  ready: number;
  meta: { counties: number; consultants: number };
  perHearing: { towerMinutes: number; manualMinutes: number; humanTouches: number; outbound: number };
  rates: { automaticShare: number; ready: number; covered: number };
  safetyViolations: number;
  faults: number;
}

export const one = (x: number | null | undefined): string => (x == null || Number.isNaN(x) ? 'n/a' : x.toFixed(1));
export const two = (x: number | null | undefined): string => (x == null || Number.isNaN(x) ? 'n/a' : x.toFixed(2));
export const pct = (x: number | null | undefined, d = 0): string => (x == null || Number.isNaN(x) ? 'n/a' : `${(100 * x).toFixed(d)}%`);
export const num = (n: number): string => Number(n).toLocaleString('en-US');
