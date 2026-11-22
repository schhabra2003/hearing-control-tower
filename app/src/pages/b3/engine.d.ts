/*
 * The engine exports the control tower pages use, beyond the shared declarations in
 * src/types/modules.d.ts. Declarations of one module merge. The shapes of what these functions
 * return are typed in later/tower.ts, where the values are read.
 */

declare module '@engine/src/model.js' {
  export const GATES: { id: 'G1' | 'G2' | 'G3' | 'G4' | 'G5'; name: string; short: string; authority: string }[];
  export const DISPOSITIONS: Record<string, string>;
  export const CLAIM_TYPES: Record<string, string>;
  export const TYPE_LIST: string[];
}

declare module '@engine/src/time.js' {
  export function localParts(ts: number, tz?: string): { date: string; time: string; dow: number };
  export function fmtTime(hhmm: string): string;
  export function fmtDuration(ms: number): string;
}

declare module '@engine/src/playbook.js' {
  export const STAFFING_METHODS: Record<string, { label: string; steps: string[] }>;
}

declare module '@engine/src/drafts.js' {
  export function longDate(date: string): string;
}

declare module '@engine/src/telemetry.js' {
  export function spansFromRecords(recorded: unknown): unknown[];
  export function toJsonl(spans: unknown[]): string;
  export function summarize(spans: unknown[]): unknown;
  export function pairHealth(recorded: unknown, perMessage?: unknown): unknown;
  export function alerts(summary: unknown, pair?: unknown): { code: string; text: string }[];
}

declare module '@engine/src/sim.js' {
  export const MINUTES: { low: Record<string, number> & { human: Record<string, number> }; mid: Record<string, number> & { human: Record<string, number> }; high: Record<string, number> & { human: Record<string, number> } };
  export const ONE_CLICK_CLASSES: string[];
  export const SAFETY_CHECKS: string[];
  export const FAULT_CHECKS: string[];
  export function promote(classes?: string[], to?: string): Record<string, string>;
}

declare module '@engine/src/economics.js' {
  export const OPERATIONAL: string[];
  export const PEAK_WEEKS: number;
  export function threeCases(input?: Record<string, number>): Record<string, unknown>;
  export function criticsMath(): Record<string, unknown>;
  export function feeRange(input?: Record<string, number>): number[];
  export function usd(x: number, digits?: number): string;
  export function count(x: number): string;
  export const BUILDS: { key: string; label: string; yearly: number }[];
  export const VOLUME: { hearings: number[]; setUp: number[]; overhead: number[]; towerBuild: number };
  export function byVolume(input?: Record<string, number>): Record<string, unknown>;
}

declare module '@engine/eval/world.js' {
  export function createWorldKit(data: { packet: unknown; playbooks: unknown; messages: unknown; gold: unknown }): unknown;
}
