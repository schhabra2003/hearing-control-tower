/*
 * Ambient types for two kinds of import that TypeScript does not read itself.
 *
 * 1. The generated JSON files (src/data/*.json, through the @data alias). They are typed in
 *    src/types/data.ts and read only through src/lib/data.ts.
 * 2. The engine (../prototype/, through the @engine alias). It is plain JavaScript that must
 *    not be edited, so its modules are declared here with the parts the pages use. A developer who
 *    needs another engine export declares it in a .d.ts file in their own page folder, with
 *    `declare module '@engine/...'`; declarations of one module merge.
 */

declare module '@data/*.json' {
  const value: unknown;
  export default value;
}

declare module '@engine/src/replies.js' {
  import type { ReplyOut, ReplySent } from '@/types/data';
  export function matchReply(
    sent: ReplySent,
    reply: { from: string; text: string; channel?: string },
    taken?: number[],
    day?: { cap: number; held: number; offered: number } | null,
  ): ReplyOut;
}

declare module '@engine/src/office_rule.js' {
  export interface OfficeProposal {
    tab: string;
    column: string;
    value: string;
    why?: string;
    [key: string]: unknown;
  }
  export interface OfficeResult {
    kind: string;
    proposals: OfficeProposal[];
    reason: string;
    hold?: boolean;
    [key: string]: unknown;
  }
  export function classifyOfficeReply(text: string, context?: { county?: string; [key: string]: unknown }): OfficeResult;
  export const OFFICE_KINDS: Record<string, string>;
  export function holdSentence(...args: unknown[]): string;
  export const BLOCK: string;
  export function routeState(o: Record<string, unknown>): number;
  export function routeText(...args: unknown[]): string;
}

declare module '@engine/src/extract/rules.js' {
  export function extractWithRules(msg: unknown, dir: unknown, ctx: unknown): unknown;
}

declare module '@engine/src/extract/recorded.js' {
  export interface RecordedReader {
    (msg: unknown, dir: unknown, ctx: unknown): unknown;
    label?: string;
    stats: { missing: number; [key: string]: number };
  }
  export function makeRecordedReader(records: unknown, options?: { fallback?: unknown; set?: string }): RecordedReader;
}

declare module '@engine/src/extract/crosscheck.js' {
  export function readMessageSync(engine: unknown, raw: unknown, options: { reader: unknown; second?: unknown; label?: string }): Record<string, unknown>;
}

declare module '@engine/src/engine.js' {
  export interface Engine {
    state: { messages: unknown[]; outbox: unknown[]; [key: string]: unknown };
    dir: unknown;
    [key: string]: unknown;
  }
  export function createEngine(options: { packet: unknown; playbooks: unknown; reader?: unknown }): Engine;
}

declare module '@engine/src/playbook.js' {
  export function deepMerge<T>(base: T, over: unknown): T;
  export function resolvePlaybooks(layers: unknown): unknown;
}

declare module '@engine/src/economics.js' {
  export function defaults(): Record<string, number>;
  export function businessCase(input?: Record<string, number>): Record<string, unknown>;
  export const INPUTS: { id: string; [key: string]: unknown }[];
}

declare module '@engine/src/sim.js' {
  export const SCENARIOS: Record<string, unknown>;
  export function makeSyntheticWorld(options: {
    base: { packet: unknown; playbooks: unknown };
    hearings?: number;
    counties?: number;
    weeks?: number;
    seed?: number;
    mix?: Record<string, unknown>;
  }): unknown;
  export function runSim(world: unknown, options?: Record<string, unknown>): Record<string, unknown>;
  export function runSimAsync(world: unknown, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
}

declare module '@engine/app/store.js' {
  export interface TowerSession {
    items: unknown[];
    messages: unknown[];
    now: number;
    subscribe(f: () => void): () => void;
    [key: string]: unknown;
  }
  export function createSession(data: unknown, options?: { reader?: unknown }): TowerSession;
}
