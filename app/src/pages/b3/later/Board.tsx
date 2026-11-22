import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, StepBack } from 'lucide-react';
import { GATES } from '@engine/src/model.js';
import { GATES as SHARED_GATES } from '@/lib/gates';
import { STAFFING_METHODS } from '@engine/src/playbook.js';
import type { PageProps } from '@/lib/router';
import { setQuery } from '@/lib/router';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { FilterChips } from '@/components/ui/FilterChips';
import { KpiCell, KpiRow } from '@/components/data/KpiRow';
import { SourceChip } from '@/components/data/SourceChip';
import { dateLong } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Section } from '@/components/ui/Section';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { CheckBar, GateBadge, HistoryControls, LaterLayout, LevelBadge, MessageLinks, ReadinessBadge, StateBadge, Table } from './parts';
import { READINESS, READINESS_ORDER, dayOf, fmtTime, rel, useTower, when, type CaseView, type Readiness, type Tower } from './tower';

type Filter = 'all' | Readiness;

const REPLAY_MS = 650;

/** Who can prove each check, in plain words (the engine's authority table). */
const PROVED_BY: Record<string, string> = {
  G1: 'the county, in writing',
  G2: 'the consultant, for this hearing and time',
  G3: "the county's acknowledgment",
  G4: 'receipts from the clerk and the consultant',
  G5: "the county's processing",
};

/** The replay of the week: the board as it stood after any number of the example messages. */
function Replay({ t }: { t: Tower }) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const N = t.s.N;
  const k = t.s.cursor;

  useEffect(() => {
    if (!playing) return undefined;
    timer.current = window.setInterval(() => {
      const next = t.s.cursor + 1;
      if (next > N) {
        setPlaying(false);
        return;
      }
      t.seek(next);
    }, REPLAY_MS);
    return () => window.clearInterval(timer.current);
  }, [playing, t, N]);

  const play = (): void => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (t.s.cursor >= N) t.seek(0);
    setPlaying(true);
  };
  const last = k ? t.messages[t.messages.length - 1] : null;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-body font-semibold text-ink">Replay the example week</span>
        <Button size="sm" variant="ghost" aria-label="Before the first message" disabled={k === 0} onClick={() => { setPlaying(false); t.seek(0); }} icon={<SkipBack aria-hidden />} />
        <Button size="sm" variant="ghost" aria-label="One message back" disabled={k === 0} onClick={() => { setPlaying(false); t.seek(k - 1); }} icon={<StepBack aria-hidden />} />
        <Button size="sm" variant="secondary" data-testid="board-replay-play" onClick={play} icon={playing ? <Pause aria-hidden /> : <Play aria-hidden />}>
          {playing ? 'Pause' : k >= N ? 'Replay from the start' : 'Play'}
        </Button>
        <Button size="sm" variant="ghost" data-testid="board-replay-step" disabled={k === N} onClick={() => { setPlaying(false); t.seek(k + 1); }} icon={<SkipForward aria-hidden />}>
          One message forward
        </Button>
        {!t.live ? (
          <Button size="sm" onClick={() => { setPlaying(false); t.seek(N); }}>Return to now</Button>
        ) : null}
        <input
          type="range"
          min={0}
          max={N}
          step={1}
          value={k}
          aria-label="Position in the example messages"
          onChange={(e) => { setPlaying(false); t.seek(Number(e.target.value)); }}
          className="mx-2 min-w-[160px] flex-1 accent-[var(--accent)]"
        />
        <span className="text-small text-ink-2 tabular-nums">{k} of {N} messages read</span>
      </div>
      {t.live ? null : (
        <InlineAlert tone="warn" title="You are looking back in time. Actions are off.">
          {k ? `After ${k} of ${N} messages${last ? `, the latest from ${last.sender}` : ''}, on ${when(t.now)}.` : "Before the first message: only the firm's old records."}
        </InlineAlert>
      )}
    </div>
  );
}

function CaseDrawer({ c, t }: { c: CaseView; t: Tower }) {
  const L = c.ledger;
  const pb = c.playbook;
  const name = (id: string): string => t.eng.dir.consultantById[id]?.name ?? id;
  const mine = t.items.filter((i) => i.cases.includes(c.id));
  const msgs = t.messages.filter((m) => m.caseIds.includes(c.id) || (m.alsoCases ?? []).includes(c.id));
  const method = STAFFING_METHODS[pb.staffing.method];
  return (
    <div className="flex flex-col gap-6 p-6 max-sm:p-4">
      <div>
        <p className="text-small text-ink-2 tabular-nums">Hearing {c.id} · {L.county}{c.record.tax_year ? ` · tax year ${c.record.tax_year}` : ''}</p>
        <h2 className="text-h2 mt-1 text-ink">{L.property}</h2>
        <p className="mt-1 text-body text-ink-2">Homeowner {L.homeowner}. {L.schedule ? `${when(c.start)}${L.schedule.mode === 'video' ? ', by video' : L.schedule.mode === 'in_person' ? ', in person' : ''}.` : 'No official date yet.'} {c.committed ? `Attending: ${name(c.committed.id)}.` : 'Nobody committed.'}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2"><ReadinessBadge r={c.readiness} /><span className="text-body text-ink-2">{READINESS[c.readiness].help}</span></div>
      </div>

      <section>
        <h3 className="text-h3 mb-3 text-ink">The five checks</h3>
        <ol className="flex flex-col divide-y divide-border border-y border-border">
          {GATES.map((g, i) => {
            const v = c.gates[g.id];
            const due = c.due[g.id];
            return (
              <li key={g.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body font-semibold text-ink">{SHARED_GATES[i]?.name ?? g.name}</span>
                  <GateBadge status={v.status} />
                  {due && v.status !== 'closed' && v.status !== 'na' && c.stage === 'upcoming' ? (
                    <span className={cn('text-small', due < t.now ? 'text-danger' : 'text-ink-2')}>{due < t.now ? 'Was due' : 'Due'} {when(due)} ({rel(due, t.now)})</span>
                  ) : null}
                </div>
                {v.status === 'na' ? null : <p className="mt-2 text-body text-ink">{v.text || 'Not needed for this hearing.'}</p>}
                {v.status === 'na' ? null : <div className="mt-2 flex flex-wrap items-center gap-2 text-small text-ink-2">
                  <span>Proved only by {PROVED_BY[g.id] ?? g.authority.toLowerCase()}.</span>
                  <MessageLinks refs={v.evidence} />
                </div>}
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h3 className="text-h3 mb-3 text-ink">Open issues ({c.issues.length})</h3>
        {c.issues.length ? (
          <ul className="flex flex-col gap-2">
            {c.issues.map((i) => (
              <li key={i.key} className="text-body">
                <div className="flex flex-wrap items-center gap-2">
                  <StateBadge tone={i.severity === 'problem' ? 'danger' : i.severity === 'waiting' ? 'warn' : 'neutral'}>{i.severity === 'problem' ? 'Problem' : i.severity === 'waiting' ? 'Waiting' : 'Note'}</StateBadge>
                  <span className="font-semibold text-ink">{i.title}</span>
                </div>
                <p className="mt-1 text-ink-2">{i.detail}</p>
                <MessageLinks refs={i.evidence} />
              </li>
            ))}
          </ul>
        ) : <p className="text-body text-ink-2">None.</p>}
      </section>

      <section>
        <h3 className="text-h3 mb-3 text-ink">Next steps ({mine.length})</h3>
        {mine.length ? (
          <ul className="flex flex-col gap-2">
            {mine.map((i) => (
              <li key={i.key} className="flex flex-wrap items-center gap-2 text-body">
                <LevelBadge level={i.level} />
                {i.phase === 'waiting' ? <StateBadge tone="warn">Waiting</StateBadge> : null}
                <span className="text-ink">{i.title}</span>
                <a className="text-accent underline underline-offset-2" href={`#/later/queue?case=${c.id}`}>Open in the work queue</a>
              </li>
            ))}
          </ul>
        ) : <p className="text-body text-ink-2">Nothing to do for this hearing right now.</p>}
      </section>

      <section>
        <h3 className="text-h3 mb-3 text-ink">Messages about this hearing ({msgs.length})</h3>
        <ul className="flex flex-col gap-2">
          {msgs.map((m) => (
            <li key={String(m.id)} className="border-l-2 border-border pl-3 text-body">
              <div className="flex flex-wrap items-center gap-2">
                <MessageLinks refs={[m.id]} />
                <span className="font-semibold text-ink">{m.sender}</span>
                <span className="text-small text-ink-2">{when(m.ts)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-ink-2">{m.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-h3 mb-3 text-ink">{L.county}'s process (version {pb.version})</h3>
        <dl className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3 text-body max-sm:grid-cols-1">
          <dt className="text-ink-2">Recording a representative</dt>
          <dd className="text-ink">
            {method ? method.label : pb.staffing.method}
            {method ? <ol className="mt-1 list-decimal pl-4 text-ink-2">{method.steps.map((s) => <li key={s}>{s}</li>)}</ol> : null}
          </dd>
          <dt className="text-ink-2">Packet</dt>
          <dd className="text-ink">{pb.packet.lead_hours} hours before the hearing, to the clerk and the consultant. Proof that the clerk has it: {pb.packet.clerk_evidence === 'sent_on_time' ? 'an on-time send (this office sends no receipts)' : "the clerk's own receipt"}.</dd>
          <dt className="text-ink-2">Office hours</dt>
          <dd className="text-ink">{pb.office.contact_hours.days}, {fmtTime(pb.office.contact_hours.start)} to {fmtTime(pb.office.contact_hours.end)}.</dd>
          <dt className="text-ink-2">Where the rules come from</dt>
          <dd className="text-ink">{pb.own_fields} settings are {L.county}'s own; {pb.inherited_fields} come from the shared rules. <a className="text-accent underline underline-offset-2" href="#/later/counties">See all counties</a></dd>
        </dl>
      </section>
    </div>
  );
}

export function Board({ query }: PageProps) {
  const t = useTower();
  const [filter, setFilter] = useState<Filter>('all');
  const open = query.get('open');
  const { view, items } = t;
  const rows = useMemo(
    () => [...view.cases].filter((c) => filter === 'all' || c.readiness === filter).sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity) || a.id.localeCompare(b.id)),
    [view.cases, filter],
  );
  const todo = items.filter((i) => i.phase === 'todo');
  const people = todo.filter((i) => i.level === 'human' || i.level === 'L0').length;
  const clicks = todo.filter((i) => i.level === 'L1').length;
  const waiting = items.filter((i) => i.phase === 'waiting').length;
  const upcoming = view.cases.filter((c) => c.stage === 'upcoming');
  const covered = upcoming.filter((c) => c.covered).length;
  const selected = open ? view.cases.find((c) => c.id === open) ?? null : null;
  const nextFor = (id: string) => items.find((i) => i.cases.includes(id));

  const chips = (cls: string) => (
    <FilterChips<Filter>
      label="Show hearings by state"
      value={filter}
      onChange={setFilter}
      className={cls}
      chips={[
        { value: 'all', label: 'All', count: view.cases.length },
        ...READINESS_ORDER.map((r) => ({ value: r as Filter, label: READINESS[r].label, count: view.counts[r], tone: r === 'at_risk' ? ('danger' as const) : ('neutral' as const) })),
      ]}
    />
  );
  let lastDay: string | null = null;
  return (
    <LaterLayout id="later-board" testId="page-later-board" actions={<HistoryControls />} toolbar={<Replay t={t} />}>
      <Section title="Right now" rule={false} actions={<SourceChip kind="simulated" source="engine/app/store.js on the example messages" counted="Computed in this browser by the prototype's engine, on its simulated clock." />}>
        <KpiRow title="Right now" showTitle={false} columns={4} testId="board-kpis">
          <KpiCell label="Upcoming hearings with a consultant" value={covered} of={`of ${upcoming.length}`} />
          <KpiCell label="Steps for a person" value={people} target={<a className="text-accent underline underline-offset-2" href="#/later/queue">Open the work queue</a>} />
          <KpiCell label="Steps a person approves with one click" value={clicks} />
          <KpiCell label="Waiting on someone else" value={waiting} />
        </KpiRow>
      </Section>

      <Section title={`${filter === 'all' ? 'All hearings' : READINESS[filter].label} (${rows.length})`} actions={chips('max-2xl:hidden')}>
        {chips('mb-4 2xl:hidden')}
        {rows.length ? (
          <Table label="Hearings on the board">
            <thead>
              <tr><th scope="col">Time</th><th scope="col">Hearing</th><th scope="col">Attending</th><th scope="col">Checks</th><th scope="col">State</th><th scope="col">Next step</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const day = c.start ? dayOf(c.start) : 'none';
                const head = day !== lastDay;
                lastDay = day;
                const n = nextFor(c.id);
                const who = c.committed ? t.eng.dir.consultantById[c.committed.id]?.name : null;
                const sched = c.ledger.schedule;
                return [
                  head ? (
                    <tr key={`d-${day}`}>
                      <th scope="colgroup" colSpan={6} className="!border-t !border-b-0 bg-surface-2 !text-ink">
                        {day === 'none' ? 'No official date' : dateLong(day)}
                        {day !== 'none' && c.start && c.start > t.now ? <span className="font-normal text-ink-2"> · {rel(c.start, t.now)}</span> : null}
                      </th>
                    </tr>
                  ) : null,
                  <tr
                    key={c.id}
                    data-testid={`board-case-${c.id}`}
                    aria-current={open === c.id ? 'true' : undefined}
                    onClick={(e) => { if (!(e.target as HTMLElement).closest('a,button')) setQuery('open', c.id); }}
                    className={cn('cursor-pointer transition-colors hover:bg-surface-2 focus-within:bg-accent-soft', open === c.id && 'bg-accent-soft')}
                  >
                    <td className="whitespace-nowrap">
                      {sched ? (
                        <>
                          <span className="font-semibold text-ink">{sched.time ? fmtTime(sched.time) : ''}</span>
                          <div className="text-small text-ink-2">{sched.mode === 'video' ? 'Video' : sched.mode === 'in_person' ? 'In person' : ''}{sched.room ? `, room ${sched.room}` : ''}</div>
                        </>
                      ) : <span className="text-ink-2">No date</span>}
                    </td>
                    <th scope="row" className="min-w-[180px]">
                      <a href={`#/later/board?open=${c.id}`} aria-label={`${c.ledger.property.split(',')[0]}, hearing ${c.id}, open details`} className="font-semibold whitespace-nowrap text-ink underline-offset-2 hover:underline">{c.ledger.property.split(',')[0]}</a>
                      <div className="text-small text-ink-2">{c.ledger.county} · {c.id}</div>
                    </th>
                    <td className="whitespace-nowrap">{who ?? (c.stage === 'upcoming' || c.stage === 'unscheduled' ? <StateBadge tone="danger">Nobody yet</StateBadge> : <span className="text-ink-2">Nobody</span>)}</td>
                    <td><CheckBar gates={c.gates} caseId={c.id} /></td>
                    <td><ReadinessBadge r={c.readiness} /></td>
                    <td className="min-w-[280px]">
                      {n ? (
                        <span className="flex flex-col items-start gap-1"><span className={n.phase === 'waiting' ? 'text-ink-2' : 'text-ink'}>{n.title}</span><LevelBadge level={n.level} /></span>
                      ) : <span className="text-ink-2">Nothing to do</span>}
                    </td>
                  </tr>,
                ];
              })}
            </tbody>
          </Table>
        ) : <InlineAlert title="No hearings in this group." />}
      </Section>

      <Drawer
        open={!!selected}
        onOpenChange={(o) => { if (!o) setQuery('open', null); }}
        title={selected ? `${selected.ledger.property.split(',')[0]}, hearing ${selected.id}` : 'Hearing'}
        header={selected ? <span className="text-small text-ink-2">The later tool's own reading of the messages, not the sheet</span> : null}
        testId="board-drawer"
      >
        {selected ? <CaseDrawer c={selected} t={t} /> : null}
      </Drawer>
    </LaterLayout>
  );
}
