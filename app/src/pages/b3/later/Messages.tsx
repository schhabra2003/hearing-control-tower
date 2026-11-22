import { useMemo, useState } from 'react';
import type { PageProps } from '@/lib/router';
import { setQuery } from '@/lib/router';
import { SourceChip } from '@/components/data/SourceChip';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Field, TextInput } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Section } from '@/components/ui/Section';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { cn } from '@/lib/cn';
import { Trace } from '../components/Trace';
import { HistoryControls, LaterLayout, SelectField } from './parts';
import { addrOf, when, type Msg } from './tower';
import { useTower } from './tower';

type Effect = 'ok' | 'warn' | 'danger' | 'neutral';

const effectOf = (m: Msg): Effect =>
  m.attention?.length ? 'danger'
    : m.claims.some((c) => c.disposition === 'fact') ? 'ok'
      : m.claims.some((c) => ['flag', 'provisional', 'signal', 'held'].includes(c.disposition)) ? 'warn'
        : 'neutral';

/** What each message did, in words; a message with no effect shows no badge. */
const EFFECT: Record<Effect, { tone: BadgeTone; word: string }> = {
  ok: { tone: 'ok', word: 'Official fact' },
  warn: { tone: 'warn', word: 'Flag or lead' },
  danger: { tone: 'danger', word: 'A person had to read it' },
  neutral: { tone: 'neutral', word: 'No effect' },
};

/** The channel in a word, and the date or a plain note that the message carries none. */
const CHANNEL: Record<string, string> = { email: 'Email', 'text note': 'Text', 'phone note': 'Phone note', 'mail transcript': 'Paper mail', 'calendar activity': 'Calendar' };
const channelOf = (c: string): string => CHANNEL[c] ?? (c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Channel not recorded');

export function Messages({ query }: PageProps) {
  const t = useTower();
  const [caseId, setCaseId] = useState('');
  const [search, setSearch] = useState('');
  const [attention, setAttention] = useState(false);
  const all = t.messages;
  const q = search.toLowerCase();
  const list = useMemo(
    () => all.filter((m) => (!caseId || m.caseIds.includes(caseId)) && (!attention || (m.attention?.length ?? 0) > 0) && (!q || `${m.sender} ${m.body} ${m.id}`.toLowerCase().includes(q))),
    [all, caseId, attention, q],
  );
  const want = query.get('msg');
  const sel = all.find((m) => String(m.id) === want) ?? list[0] ?? null;

  return (
    <LaterLayout
      id="later-messages"
      testId="page-later-messages"
      actions={<HistoryControls />}
      toolbar={
        <>
          <div className="flex flex-wrap items-end gap-4">
            <SelectField label="Hearing" value={caseId} onChange={setCaseId} className="w-64">
              <option value="">All hearings</option>
              {t.eng.dir.cases.map((c) => <option key={c.case_id} value={c.case_id}>{addrOf(c.property)} ({c.case_id})</option>)}
            </SelectField>
            <Field label="Search" className="w-64">
              <TextInput type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sender or words" />
            </Field>
            <SegmentedControl<'all' | 'person'>
              label="Which messages"
              size="md"
              value={attention ? 'person' : 'all'}
              onValueChange={(v) => setAttention(v === 'person')}
              options={[{ value: 'all', label: 'All' }, { value: 'person', label: 'A person had to read' }]}
            />
          </div>
          <span className="flex flex-wrap items-center gap-3 text-small text-ink-2">
            <span className="tabular-nums">{list.length} of {all.length} messages</span>
            <SourceChip kind="packet" source="engine.json messages" counted="The 72 example messages of the case packet. The later tool's reading of each is computed in this browser." />
          </span>
        </>
      }
    >
      <div className="grid grid-cols-[minmax(360px,1fr)_minmax(0,680px)] gap-8 pt-6 max-lg:grid-cols-1">
        <section aria-labelledby="msg-list-title" className="min-w-0">
          <h2 id="msg-list-title" className="sr-only">Messages</h2>
          <ul className="flex max-h-[calc(100vh-280px)] min-h-[320px] flex-col divide-y divide-border overflow-y-auto border-y border-border max-lg:max-h-[420px]" aria-label="Messages">
            {list.length ? list.map((m) => {
              const e = effectOf(m);
              const on = sel?.id === m.id;
              return (
                <li key={String(m.id)}>
                  <button
                    type="button"
                    aria-current={on ? 'true' : undefined}
                    onClick={() => setQuery('msg', String(m.id))}
                    className={cn('flex w-full flex-col items-start gap-1 px-3 py-2 text-left transition-colors', on ? 'bg-accent-soft' : 'hover:bg-surface-2')}
                  >
                    <span className="flex w-full items-baseline justify-between gap-2">
                      <span className="truncate text-body font-semibold text-ink">{m.sender}</span>
                      <span className="shrink-0 text-small text-ink-2 tabular-nums">No. {m.id} · {channelOf(m.channel)} · {m.ts ? when(m.ts) : 'No date in the message'}</span>
                    </span>
                    <span className="line-clamp-1 w-full max-w-[var(--measure)] text-body text-ink-2">{m.body}</span>
                    {e === 'neutral' ? null : <Badge size="sm" tone={EFFECT[e].tone}>{EFFECT[e].word}</Badge>}
                  </button>
                </li>
              );
            }) : <li className="p-3"><InlineAlert title="No message matches." /></li>}
          </ul>
        </section>
        <Section title={sel ? `Message ${sel.id}: what the later tool made of it` : 'What the later tool made of it'} rule={false} className="!pt-0" testId="message-trace">
          {sel ? <Trace m={sel} t={t} /> : <p className="text-body text-ink-2">Pick a message.</p>}
        </Section>
      </div>
    </LaterLayout>
  );
}
