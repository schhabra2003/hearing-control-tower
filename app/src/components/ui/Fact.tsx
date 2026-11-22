/**
 * Fact: the key facts of a sentence, emphasised ("text hierarchy, key facts
 * stand out"). Three levels of text only: key facts (ink, medium or semibold), normal text (ink,
 * regular), supporting text (muted, small). A Fact is the first level.
 *
 * Kinds: date, deadline, person, place, money, count, id. A deadline that is overdue or due today
 * also says so in words ("Overdue", "Due today"); the colour is never the only signal. Numbers use
 * tabular figures; a case id uses the mono face.
 *
 * `Sentence` renders structured parts (strings and facts) from the copy module. `stepParts` marks
 * the dates, times, people and offices in a step the copy module wrote, using names from the data. At most two facts are emphasised per
 * sentence; later ones render as normal text (one emphasis per line).
 *
 * Written for Hearing Desk; no 21st.dev match (a text style, not a component on the catalog).
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type FactKind = 'date' | 'deadline' | 'person' | 'place' | 'money' | 'count' | 'id';
export type DeadlineState = 'overdue' | 'today' | 'later';

const KIND: Record<FactKind, string> = {
  date: 'font-medium text-ink tabular-nums',
  deadline: 'font-semibold text-ink tabular-nums',
  person: 'font-medium text-ink',
  place: 'font-medium text-ink',
  money: 'font-semibold text-ink tabular-nums',
  count: 'font-semibold text-ink tabular-nums',
  id: 'font-medium text-ink tabular-nums',
};

const DEADLINE: Record<DeadlineState, { cls: string; word: string }> = {
  overdue: { cls: 'text-danger', word: 'Overdue' },
  today: { cls: 'text-warn', word: 'Due today' },
  later: { cls: '', word: '' },
};

export interface FactProps {
  kind: FactKind;
  children: ReactNode;
  /** Deadlines only: overdue and today add the word and the danger or warn ink. */
  state?: DeadlineState;
  /** Render as normal text (used past the second fact of a line). */
  plain?: boolean;
  className?: string;
  testId?: string;
}

export function Fact({ kind, children, state, plain = false, className, testId }: FactProps) {
  if (plain) return <span className={cn('tabular-nums', className)}>{children}</span>;
  const d = kind === 'deadline' && state ? DEADLINE[state] : null;
  return (
    <span data-testid={testId} data-fact={kind} className={cn(KIND[kind], d?.cls, className)}>
      {d?.word ? <>{d.word}: </> : null}
      {children}
    </span>
  );
}

/** One part of a generated sentence: plain text, or a fact. */
export type SentencePart = string | { kind: FactKind; text: string; state?: DeadlineState };

/** A sentence from structured parts; the first two facts are emphasised. */
export function Sentence({ parts, className, max = 2 }: { parts: readonly SentencePart[]; className?: string; max?: number }) {
  let n = 0;
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (typeof p === 'string') return <span key={i}>{p}</span>;
        n += 1;
        return (
          <Fact key={i} kind={p.kind} state={p.state} plain={n > max}>
            {p.text}
          </Fact>
        );
      })}
    </span>
  );
}

/* ---------- facts inside a generated step ---------- */

const MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
const WHEN = String.raw`(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (?:${MONTHS}) \d{1,2}(?:, \d{1,2}:\d{2} [ap]\.m\.)?|\d{1,2}:\d{2} [ap]\.m\.)`;
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The parts of a step sentence the copy module already wrote (todayActions), with its dates, times,
 * people and offices marked as facts, so a row reads "Name a consultant for **Mon, Jun 10, 9:00 a.m.**.
 * Ask **Leo Arlen** first". The names come from the data (the Bench and the Offices tabs), passed in.
 */
export function stepParts(text: string, people: readonly string[], places: readonly string[]): SentencePart[] {
  const longest = (xs: readonly string[]): string[] => xs.filter(Boolean).sort((a, b) => b.length - a.length).map(esc);
  const who = longest(people).join('|') || '(?!)';
  const where = longest(places).map((p) => `${p} office`).join('|') || '(?!)';
  const re = new RegExp(`(?<when>${WHEN})|(?<who>${who})|(?<where>${where})`, 'g');
  const out: SentencePart[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > at) out.push(text.slice(at, i));
    const g = m.groups ?? {};
    out.push({ kind: g.when ? 'date' : g.who ? 'person' : 'place', text: m[0] });
    at = i + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}
