/*
 * MessageTimeline: every message of the example packet about this property, oldest first, grouped
 * by day on a thin rail. Each message shows who sent it, how and when on one line, then its words
 * in full (the packet's messages are one to three sentences), and, when it is the proof of a check,
 * "Proves: consultant said yes" in ink. A message followed from a check is scrolled into view and
 * marked.
 *
 * Adapted from "Activity Timeline" by olewandowski1, https://21st.dev/r/olewandowski1/timeline-3
 * (day groups, a channel marker per row joined by a 1 px rail, the actor in medium weight, the time
 * in tabular figures on the right) and the app's ActivityTimeline ("Timeline" by kuratlielia,
 * https://21st.dev/r/kuratlielia/timeline).
 * Changes: no avatars or relative times (the example week is in 2030, so times are as the packet
 * wrote them); no green proof chip, the check a message proves is named in words with a small
 * check icon; the body is never cut.
 */

import { Check } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import type { Hearing } from '@/types/data';
import { engine } from '@/lib/data';
import { clockText, dateLong } from '@/lib/format';
import { cn } from '@/lib/cn';
import { SourceChip } from '@/components/data/SourceChip';
import { ChannelIcon } from '@/pages/b1/components/MessageQuote';
import type { CheckView } from './checks';

/** The packet's messages about this property, oldest first. */
export function messagesFor(h: Hearing) {
  return engine.messages
    .filter((m) => Array.isArray(m.properties) && (m.properties as string[]).includes(h.property))
    .sort((a, b) => a.at.localeCompare(b.at));
}

const timeOf = (at: string): string => {
  const t = /T(\d{2}):(\d{2})/.exec(at);
  return t ? clockText(Number(t[1]) * 60 + Number(t[2])) : '';
};

const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

type Msg = ReturnType<typeof messagesFor>[number];

/** How a message came, in words a lawyer reads: the packet's "mail transcript" is a paper notice. */
const channelWords = (c: string): string => (/^mail transcript$/i.test(c) ? 'paper notice, a written government source' : c);

/**
 * What a message counts for, when it is not plain:
 * a call or voicemail is never proof, an unreadable photo is not counted, a repeat adds nothing.
 */
function noteFor(m: Msg, all: Msg[]): string | null {
  if (/phone|voicemail|call/i.test(m.channel)) return 'A call or voicemail is not proof; only a written message closes a check.';
  if (/photographed it/i.test(m.body) && all.some((x) => x.at > m.at && /cannot read/i.test(x.body))) return 'Photo unreadable: not counted as proof.';
  if (/same confirmation again|no changes\.?$/i.test(m.body)) {
    // Address words say nothing about what a message confirms: they are left out of the comparison.
    const place = new Set((m.properties ?? []).join(' ').toLowerCase().match(/[a-z]{4,}/g) ?? []);
    const words = (t: string): Set<string> => new Set((t.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !place.has(w)));
    const mine = words(m.body);
    const overlap = (x: Msg): number => [...words(x.body)].filter((w) => mine.has(w)).length;
    const first = all.filter((x) => x.at < m.at && x.sender === m.sender && x.id !== m.id).sort((a, b) => overlap(b) - overlap(a))[0];
    return first ? `Repeat of message ${first.id}: no change, no new proof.` : 'A repeat: no change, no new proof.';
  }
  return null;
}

export function MessageTimeline({ hearing: h, views, highlightId, className }: { hearing: Hearing; views: CheckView[]; highlightId: string | null; className?: string }) {
  const msgs = messagesFor(h);
  const groups = useMemo(() => {
    const out: { day: string; rows: typeof msgs }[] = [];
    for (const m of msgs) {
      const day = m.at.slice(0, 10);
      const g = out.at(-1);
      if (g && g.day === day) g.rows.push(m);
      else out.push({ day, rows: [m] });
    }
    return out;
  }, [msgs]);
  const proves = (id: string): string[] =>
    views.filter((c) => c.partViews.some((p) => p.view === 'proved' && p.message === id)).map((c) => {
      const parts = c.partViews.filter((p) => p.view === 'proved' && p.message === id);
      return c.partViews.length > 1 && parts.length === 1 ? `${lowerFirst(c.name)} (${parts[0]!.who!.toLowerCase()})` : lowerFirst(c.name);
    });
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!highlightId) return;
    root.current?.querySelector<HTMLElement>(`[data-message="${highlightId}"]`)?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }, [highlightId, reduce]);
  const headingId = `messages-${h.case}`;

  return (
    <section ref={root} data-testid="messages-timeline" aria-labelledby={headingId} className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-4">
        <h3 id={headingId} className="text-[16px] leading-6 font-semibold text-ink">
          Messages <span className="font-normal text-muted tabular-nums">{msgs.length}</span>
        </h3>
        <SourceChip kind="packet" source="The example packet" counted="Every packet message on this property." />
      </div>
      {msgs.length === 0 ? (
        <p className="text-body text-ink-2">The packet holds no message that names this property.</p>
      ) : (
        <div className="flex flex-col gap-4 border-t border-border pt-3">
          {groups.map((g) => (
            <section key={g.day} aria-label={dateLong(g.day)} className="flex flex-col gap-2">
              <h4 className="text-small leading-5 font-semibold text-ink-2">{dateLong(g.day)}</h4>
              <ol className="relative flex flex-col">
                {g.rows.map((m, i) => {
                  const id = String(m.id);
                  const p = proves(id);
                  const marked = id === highlightId;
                  return (
                    <li key={id} data-testid={`message-${id}`} data-message={id} data-highlighted={marked || undefined} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 pb-3">
                      {i < g.rows.length - 1 ? <span aria-hidden className="absolute top-8 bottom-0 left-[13.5px] w-px bg-border" /> : null}
                      <span aria-hidden className="z-[1] mt-1 grid size-7 place-items-center rounded-full border border-border bg-surface text-ink-2 [&_svg]:size-3.5">
                        <ChannelIcon channel={m.channel} />
                      </span>
                      <div className={cn('min-w-0 rounded-quote px-2 py-1 -mx-2 transition-colors duration-[var(--dur-color)]', marked && 'bg-accent-soft')}>
                        <p className="flex items-baseline gap-x-2 text-body leading-5">
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-semibold text-ink">{m.sender}</span>
                            <span className="text-ink-2">, {channelWords(m.channel)}</span>
                          </span>
                          <span className="shrink-0 text-small text-muted tabular-nums">
                            Message {id}, {timeOf(m.at)}
                          </span>
                        </p>
                        <p className="mt-1 max-w-[75ch] text-body leading-6 text-ink">{m.body}</p>
                        {!p.length && noteFor(m, msgs) ? (
                          <p className="mt-1 text-small leading-5 font-medium text-ink-2" data-testid={`message-note-${id}`}>
                            {noteFor(m, msgs)}
                          </p>
                        ) : null}
                        {p.length ? (
                          <p className="mt-2 inline-flex items-center gap-2 text-small leading-5 font-medium text-ink">
                            <Check aria-hidden className="size-3.5 text-[var(--dot-ok)]" strokeWidth={3} />
                            Proves: {p.join('; ')}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
