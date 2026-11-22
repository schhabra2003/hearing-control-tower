/**
 * Simulate with live AI. When the app is served by the live server
 * with a key, a simulated event that brings new mail (source "paste") sends the fictional example
 * file to POST /api/read, the same path as the Paste page, before the event is recorded, so Reader
 * suggestions and Offices show what the live readers proposed. Every other event, and every event
 * without the server, replays as before.
 *
 * Change from the drop-in: the app's readOnServer() replaces the paste rows with the rows of one
 * read and has no merge option, so a live event reads the whole example file (6 messages, a few
 * cents). That matches the recorded path, where a mailbox event also runs the whole file.
 */

import { useSyncExternalStore } from 'react';
import { engine } from '@/lib/data';
import { getLive, readOnServer, usd, type LiveMessage, type LiveResult } from '@/lib/live';
import type { SimEvent } from './integrations';

/** The event being read now, so only its button shows the progress. */
let reading: string | null = null;
const subs = new Set<() => void>();
const setReading = (id: string | null): void => {
  reading = id;
  subs.forEach((f) => f());
};
export function useReadingEvent(): string | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => reading,
    () => reading,
  );
}

/** True when the server reads with a key, so a mail event goes to the live readers. */
export function readsLive(e: SimEvent): boolean {
  const s = getLive();
  return e.source === 'paste' && !!e.ref.paste && s.server === 'up' && !!s.status?.live;
}

/** Reads the example file live; resolves with the result, or null when the event is not live. */
export async function readEventLive(e: SimEvent): Promise<LiveResult | null> {
  if (!readsLive(e)) return null;
  const list = engine.paste.messages as unknown as LiveMessage[];
  if (!list.length) return null;
  setReading(e.id);
  try {
    return await readOnServer(list);
  } finally {
    setReading(null);
  }
}

/** One plain sentence for the toast after a live read. */
export function liveDoneText(r: LiveResult): string {
  return r.mode === 'live' ? `Read live in ${(r.ms / 1000).toFixed(0)} seconds for ${usd(r.costUsd)}. The rows are in Check messages.` : 'Read from recorded answers on the server. No AI model was asked.';
}
