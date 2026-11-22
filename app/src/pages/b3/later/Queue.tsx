import { FastForward, StepForward } from 'lucide-react';
import type { PageProps } from '@/lib/router';
import { setQuery } from '@/lib/router';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Section } from '@/components/ui/Section';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { SourceChip } from '@/components/data/SourceChip';
import { toast } from '@/components/ui/Toast';
import { DraftBox, ItemCard } from '../components/ItemCard';
import { CaseLink, HistoryControls, LaterLayout, LevelBadge } from './parts';
import { LEVELS, LEVEL_ORDER, useTower, when, type Item } from './tower';

/** Routine one-click sends: current packets and updates to people who expect them. Shown as one collapsed batch. */
const ROUTINE = new Set(['send_packet', 'packet_send', 'consultant_reminder', 'answer_question']);

const routine = (list: Item[]): Item[] => list.filter((it) => ROUTINE.has(it.kind));

export function Queue({ query }: PageProps) {
  const t = useTower();
  const scope = query.get('case');
  const all = t.items;
  const scoped = scope ? all.filter((i) => i.cases.includes(scope)) : all;
  const todo = scoped.filter((i) => i.phase === 'todo');
  const lanes: { id: string; title: string; hint: string; list: Item[] }[] = [
    { id: 'person', title: 'For a person', hint: 'Calls, judgment and signatures. The later tool drafts and waits.', list: todo.filter((i) => i.level === 'human' || i.level === 'L0') },
    { id: 'click', title: 'One click', hint: 'The later tool writes it. A person approves each one.', list: todo.filter((i) => i.level === 'L1') },
    { id: 'auto', title: 'Automatic', hint: 'Routine messages to consultants. Simulated: nothing is sent.', list: todo.filter((i) => i.level === 'L2') },
  ];
  const waiting = scoped.filter((i) => i.phase === 'waiting');
  const sent = [...t.outbox].reverse();
  const by = t.countsByLevel();
  const total = sent.length;
  let n = 0;
  const next = (): string => {
    n += 1;
    return `queue-card-${n}`;
  };

  return (
    <LaterLayout
      id="later-queue"
      testId="page-later-queue"
      actions={<HistoryControls full />}
      toolbar={
        <>
          <SegmentedControl<'auto' | 'hold'>
            label="Automatic steps"
            size="sm"
            testId="queue-auto"
            value={t.s.auto ? 'auto' : 'hold'}
            options={[
              { value: 'auto', label: 'Automatic steps go by themselves', disabled: !t.live },
              { value: 'hold', label: 'Automatic steps wait for a click', disabled: !t.live },
            ]}
            onValueChange={(v) => { t.setAuto(v === 'auto'); toast({ title: v === 'auto' ? 'Automatic steps go by themselves again (simulated).' : 'Automatic steps now wait in the queue. Nothing goes without a click.' }); }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={!t.live} icon={<FastForward aria-hidden />} onClick={() => {
              const c = t.playForward();
              const k = c.L2 + c.L1 + c.L0 + c.human;
              toast({ title: k || c.replies ? `Ran to the end: ${k} steps and ${c.replies} simulated answers.` : 'Nothing is left to do right now.', body: k ? `${c.L2} automatic, ${c.L1} one click, ${c.L0} drafted for a person, ${c.human} by a person.` : undefined, tone: 'ok' });
            }}>Run to the end, everyone says yes</Button>
            <Button size="sm" variant="primary" disabled={!t.live} icon={<StepForward aria-hidden />} title="Take the next step, or let the oldest open request be answered helpfully." onClick={() => {
              const r = t.step();
              toast({ title: r ? (r.type === 'act' ? `Done: ${r.text}.` : `Answer delivered: "${r.text}".`) : 'Nothing is left to do right now.' });
            }}>Next step</Button>
          </div>
        </>
      }
    >
      {scope ? (
        <InlineAlert className="mt-6" title={`Showing the work for one hearing only.`} action={<Button size="sm" variant="ghost" onClick={() => setQuery('case', null)}>Show everything</Button>}>
          <CaseLink id={scope} />
        </InlineAlert>
      ) : null}

      <Section title="To do now" rule={false}>
        <div className="grid grid-cols-3 gap-6 max-xl:grid-cols-1">
          {lanes.map((lane) => (
            <section key={lane.id} aria-labelledby={`lane-${lane.id}`} className="flex min-w-0 flex-col gap-3">
              <div>
                <div className="flex items-baseline gap-2"><h3 id={`lane-${lane.id}`} className="text-h3 text-ink">{lane.title}</h3><span className="text-body text-ink-2 tabular-nums">{lane.list.length}<span className="sr-only"> steps</span></span></div>
                <p className="mt-1 text-small text-ink-2">{lane.hint}</p>
              </div>
              {lane.id === 'click' && lane.list.some((it) => ROUTINE.has(it.kind)) ? (
                <>
                  <div data-testid="queue-routine-batch" className="flex flex-col gap-2 rounded-control border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-body font-medium text-ink">{routine(lane.list).length} routine packet sends</span>
                      <Button size="md" variant="primary" data-testid="queue-routine-approve" disabled={!t.live} onClick={() => {
                        const keys = routine(lane.list).map((it) => it.key);
                        let done = 0;
                        for (const k of keys) { const r = t.act(k); if (r?.result && !r.result.refused) done += 1; }
                        toast({ title: `Approved ${done} of ${keys.length} routine sends (simulated).`, body: 'Nothing is sent. Undo takes back one step at a time.', tone: 'ok' });
                      }}>Approve all {routine(lane.list).length}</Button>
                    </div>
                    <details data-testid="queue-routine">
                      <summary className="flex min-h-8 cursor-pointer items-center text-body text-ink-2 hover:text-ink">Show each send</summary>
                      <div className="mt-2 flex flex-col gap-3">{routine(lane.list).map((it) => <ItemCard key={it.key} it={it} t={t} testId={next()} />)}</div>
                    </details>
                  </div>
                  {lane.list.filter((it) => !ROUTINE.has(it.kind)).map((it) => <ItemCard key={it.key} it={it} t={t} testId={next()} />)}
                </>
              ) : lane.list.length ? lane.list.map((it) => <ItemCard key={it.key} it={it} t={t} testId={next()} />) : (
                <p className="text-body text-ink-2">{lane.id === 'auto' && t.s.auto ? 'Nothing waiting. Automatic steps go by themselves.' : 'Nothing here.'}</p>
              )}
            </section>
          ))}
        </div>
      </Section>

      <Section title={`Waiting on others (${waiting.length})`} description="Requests that are out. Pick the other side's answer, or let nobody answer.">
        {waiting.length ? (
          <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1 2xl:grid-cols-3">{waiting.map((it) => <ItemCard key={it.key} it={it} t={t} testId={next()} />)}</div>
        ) : <p className="text-body text-ink-2">Nobody owes the firm an answer.</p>}
      </Section>

      <Section
        title={`Done since the examples ended (${total})`}
        description="Newest first. Simulated: nothing leaves this page."
        actions={<SourceChip kind="simulated" source="engine/app/store.js" counted="Steps taken on the simulated clock since the example messages ended. Nothing is sent." />}
      >
        <p className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-body text-ink-2">
          {LEVEL_ORDER.map((l) => <span key={l}>{LEVELS[l].label}: <span className="font-semibold text-ink tabular-nums">{by[l]}</span></span>)}
        </p>
        {total ? (
          <ul className="flex flex-col divide-y divide-border border-t border-border">
            {sent.map((o, i) => (
              <li key={`${o.at}-${i}`} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center gap-2 text-body">
                  <span className="text-small text-ink-2 tabular-nums">{when(o.at)}</span>
                  <LevelBadge level={o.level} />
                  <span className="font-semibold text-ink">{o.title}</span>
                  {o.to ? <span className="text-ink-2">to {o.to.name}</span> : null}
                  {o.cases.map((id) => <CaseLink key={id} id={id} />)}
                </div>
                {o.draft ? <DraftBox draft={o.draft} /> : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-body text-ink-2">Nothing yet. Approve a step above, or run to the end.</p>}
      </Section>
    </LaterLayout>
  );
}
