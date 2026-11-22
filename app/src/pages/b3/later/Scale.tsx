import { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { MINUTES, ONE_CLICK_CLASSES, SAFETY_CHECKS, FAULT_CHECKS, SCENARIOS, makeSyntheticWorld, promote, runSimAsync } from '@engine/src/sim.js';
import type { PageProps } from '@/lib/router';
import { engine } from '@/lib/data';
import { Button } from '@/components/ui/Button';
import { SkeletonRows, SkeletonSwap } from '@/components/ui/Skeleton';
import { ChartFrame, LineRunChart } from '@/components/data/Charts';
import { KpiCell, KpiRow } from '@/components/data/KpiRow';
import { SourceChip } from '@/components/data/SourceChip';
import { toast } from '@/components/ui/Toast';
import { Field, TextInput } from '@/components/ui/Field';
import { Section } from '@/components/ui/Section';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LaterLayout, SelectField, StateBadge, Table } from './parts';
import { num, one, pct, scale, two, type Experiment, type ScaleData, type SimResult } from './scaleData';

const SIZES: [number, number][] = [[100, 10], [300, 15], [1000, 30], [5000, 50]];
/** Productive minutes in a coordinator's week (30 hours), as cli/scale.js uses. */
const WEEK_MINUTES = scale?.weekMinutes ?? 1800;
const WEEKS = 4;

type Autonomy = 'default' | 'more';
const scenarios = SCENARIOS as Record<string, { label: string }>;

const MIN_ROWS: [string, string, string][] = [
  ['approve', 'One click: read a prepared message and send it', 'With the later tool'],
  ['draft', 'Sensitive draft: a person reviews it and sends it personally', 'With the later tool'],
  ['triage', 'Read a message the later tool could not use, with its context on screen', 'With the later tool'],
  ['statement', 'Get a statement from the homeowner and send it', 'Both'],
  ['phoneIn', 'A clerk phones: answer and log it', 'Both'],
  ['readRoutine', 'Read a routine message and update the record', 'By hand'],
  ['readException', 'Read an exception and work out what it means', 'By hand'],
  ['write', 'Write a message', 'By hand'],
];
const HUMAN_ROWS: [string, string][] = [['follow_up_call', 'Call someone who did not answer'], ['call_office', 'Call an office'], ['homeowner', 'Call a homeowner'], ['find_out', 'Find out what happened at a hearing'], ['playbook', "Review a change to a county's process"], ['escalate', 'Find a consultant by phone when nobody is available'], ['reinstate', 'Ask an office to put a hearing back']];
const BY: [string, string][] = [['calls', 'Phone calls and decisions only a person makes'], ['approve', 'One-click approvals'], ['draft', 'Sensitive drafts, statements, signatures'], ['triage', 'Messages the later tool could not use'], ['phoneIn', 'Calls from a clerk, answered']];

const SIM = 'eval/scale.json (node cli/scale.js)';
/** Coordinators a week for a run: hearings a week times person-minutes, over a coordinator's productive week. */
const coord = (hearings: number, minutes: number): string => ((hearings / WEEKS) * minutes / WEEK_MINUTES).toFixed(1);
const simChip = (counted?: string) => <SourceChip kind="simulated" source={SIM} counted={counted} />;
const estChip = (counted?: string) => <SourceChip kind="estimate" source={SIM} counted={counted} />;

function Headline({ s, autonomy }: { s: ScaleData; autonomy: Autonomy }) {
  const base = s.settings.find((p) => p.scenario === 'typical' && p.autonomy === 'default' && p.perRun === s.base.hearings && p.counties === s.base.counties);
  const more = s.settings.find((p) => p.scenario === 'typical' && p.autonomy === 'more');
  if (autonomy === 'more' && more) {
    return (
      <KpiRow title="Typical world, one-click steps automatic, simulated" showTitle={false} columns={4} testId="scale-kpis">
        <KpiCell label="Person-minutes per hearing" value={one(more.tower)} target={`As shipped: ${base ? one(base.tower) : 'n/a'}. By hand: ${one(more.manual)}.`} chip={simChip(`Typical run of ${num(more.perRun)} hearings with the ${ONE_CLICK_CLASSES.length} one-click kinds sent automatically. Not this season.`)} />
        <KpiCell label="Hearings a week per coordinator" value={num(Math.round(s.weekMinutes / more.tower))} target={`As shipped: ${base ? num(Math.round(s.weekMinutes / base.tower)) : 'n/a'}`} chip={estChip('Productive minutes in a week divided by the person-minutes per hearing.')} />
        <KpiCell label="Safety rules broken" value={String(s.totals.safety)} target={`In ${num(s.totals.hearings)} simulated hearings`} chip={simChip(`${s.totals.safetyRules.length} rules checked after every step of ${s.totals.runs} runs.`)} />
        <KpiCell label="Held with all five checks done" value={pct(more.readyRate, 1)} target={`${pct(more.coveredRate, 1)} had a consultant`} chip={simChip('Share of hearings held with all five checks done.')} />
      </KpiRow>
    );
  }
  const rd = s.experiments.find((e) => e.id === 'reading')?._;
  // The same figure as the first chart: the typical run, lowest to highest over the sizes.
  const vp = (s.experiments.find((e) => e.id === 'volume')?.rows ?? []).map((r) => r._).filter((p): p is NonNullable<typeof p> => !!p);
  const span = (k: 'tower' | 'manual'): string => {
    const v = vp.map((p) => p[k]).filter((x): x is number => typeof x === 'number');
    return `${one(Math.min(...v))} to ${one(Math.max(...v))}`;
  };
  const vol = vp.length ? { tower: span('tower'), manual: span('manual') } : null;
  if (!base) return null;
  return (
    <KpiRow title="Typical world, simulated" showTitle={false} columns={4} testId="scale-kpis">
      <KpiCell
        label="Person-minutes per hearing"
        value={vol ? vol.tower : one(base.tower)}
        target={`By hand: ${vol ? vol.manual : one(base.manual)}. With reading errors as measured: ${rd ? `${one(rd.low)} to ${one(rd.high)}` : 'n/a'}.`}
        chip={simChip(`Typical run of the later tool, ${vol ? '100 to 3,200 hearings' : `${num(base.perRun)} hearings`}. Minutes per task are estimates.`)}
      />
      <KpiCell
        label="Hearings a week per coordinator"
        value={rd ? `${num(Math.round(s.weekMinutes / rd.high))} to ${num(Math.round(s.weekMinutes / rd.low))}` : num(Math.round(s.weekMinutes / base.tower))}
        target={`By hand (simulated teams): ${num(Math.round(s.weekMinutes / base.manual))}`}
        chip={estChip("Productive minutes in a week divided by the person-minutes per hearing. The simulator's by-hand baseline works in pods of about 30 hearings a week; the sheet's own estimate is in Measures C18.")}
      />
      <KpiCell
        label="Safety rules broken"
        value={String(s.totals.safety)}
        target={`In ${num(s.totals.hearings)} simulated hearings`}
        chip={simChip(`${s.totals.safetyRules.length} rules checked after every step of ${s.totals.runs} runs.`)}
      />
      <KpiCell
        label="Held with all five checks done"
        value={pct(base.readyRate, 1)}
        target={`${pct(base.coveredRate, 1)} had a consultant`}
        chip={simChip('Share of hearings held with all five checks done, typical world.')}
      />
    </KpiRow>
  );
}

function ExperimentTable({ e }: { e: Experiment }) {
  return (
    <Table label={e.title}>
      <thead><tr>{e.columns.map((c) => <th scope="col" key={c.key} className={c.num ? 'text-right' : ''}>{c.label}</th>)}</tr></thead>
      <tbody>
        {e.rows.map((row, i) => (
          <tr key={i}>
            {e.columns.map((c, ci) => {
              const Cell = ci === 0 ? 'th' : 'td';
              return (
              <Cell key={c.key} scope={ci === 0 ? 'row' : undefined} className={c.num ? 'text-right tabular-nums' : ''}>
                {c.key === 'safety' ? <StateBadge tone={row.safety === '0' ? 'ok' : 'danger'}>{String(row.safety)}</StateBadge>
                  : c.key === 'tower' ? <><span className="font-semibold">{String(row.tower)}</span>{row.towerSpread ? <div className="text-small text-ink-2">{row.towerSpread}</div> : null}</>
                    : c.key === 'manual' ? <>{String(row.manual)}{row.manualSpread ? <div className="text-small text-ink-2">{row.manualSpread}</div> : null}</>
                      : String(row[c.key] ?? '')}
              </Cell>
              );
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function Figures({ e }: { e: Experiment }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-body font-medium text-accent hover:underline">Show as table</summary>
      <div className="mt-3 flex flex-col gap-3">
        <ExperimentTable e={e} />
        {e.note ? <p className="max-w-[var(--measure)] text-body text-ink-2">{e.note}</p> : null}
      </div>
    </details>
  );
}

/** An experiment with a chart: minutes per hearing by size, the line the middle and the band low to high. */
function ExperimentChart({ e }: { e: Experiment }) {
  const by = e.chart === 'counties' ? 'counties' : 'hearings';
  const data = e.rows.map((r) => r._).filter((p): p is NonNullable<typeof p> => !!p).map((p) => ({ x: by === 'counties' ? p.counties : p.x, manual: p.manual, manualLow: p.manualLow, manualHigh: p.manualHigh, tower: p.tower, towerLow: p.towerLow, towerHigh: p.towerHigh }));
  const range = (k: 'manual' | 'tower'): string => {
    const v = data.map((d) => d[k]).filter((x): x is number => typeof x === 'number');
    return v.length ? `first ${one(v[0])}, last ${one(v[v.length - 1])}, highest ${one(Math.max(...v))}` : '';
  };
  const caption = `${by === 'counties' ? 'Spread over more counties' : 'Person-minutes per hearing as hearings grow'}. By hand: ${range('manual')}. With the later tool: ${range('tower')}.`;
  return (
    <ChartFrame
      title={e.title}
      chip={simChip(`${e.title}: person-minutes per hearing in the recorded runs. The minutes per task are estimates.`)}
      legend={[{ label: 'By hand', color: 'muted' }, { label: 'With the later tool', color: 'accent' }]}
      note="Line: middle estimate. Band: low to high."
      className="relative overflow-hidden ring-1 ring-border"
    >
      <LineRunChart
        data={data}
        xKey="x"
        xLabel={by === 'counties' ? 'Counties' : 'Hearings in four weeks'}
        yLabel="Minutes"
        series={[
          { key: 'manual', label: 'By hand', color: 'muted', band: ['manualLow', 'manualHigh'] },
          { key: 'tower', label: 'With the later tool', color: 'accent', band: ['towerLow', 'towerHigh'] },
        ]}
        format={(v) => one(v)}
        tickFormat={(v) => String(Math.round(v))}
        xFormat={(v) => num(Number(v))}
        description={caption}
      />
      <p className="max-w-[var(--measure)] text-small text-ink-2">{caption}</p>
      <Figures e={e} />
    </ChartFrame>
  );
}

/** The first sentence of each line, the whole line one click away. */
const firstSentence = (x: string): string => /^(.+?[.:])(\s|$)/.exec(x)?.[1]?.replace(/:$/, '.') ?? x;

function Findings({ title, list }: { title: string; list: string[] }) {
  return (
    <div>
      <h3 className="text-h3 mb-2 text-ink">{title}</h3>
      <ul className="flex max-w-[var(--measure)] list-disc flex-col gap-2 pl-4 text-body text-ink">{list.map((x) => <li key={x}>{firstSentence(x)}</li>)}</ul>
      <details className="mt-2">
        <summary className="cursor-pointer text-body font-medium text-accent hover:underline">Details</summary>
        <ul className="mt-2 flex max-w-[var(--measure)] list-disc flex-col gap-2 pl-4 text-body text-ink-2">{list.map((x) => <li key={x}>{x}</li>)}</ul>
      </details>
    </div>
  );
}

function ExperimentPanel({ e }: { e: Experiment }) {
  return (
    <Section title={e.title} actions={simChip(e.title)}>
      <ExperimentTable e={e} />
      {e.note ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-body font-medium text-accent hover:underline">Details</summary>
          <p className="mt-2 max-w-[var(--measure)] text-body text-ink-2">{e.note}</p>
        </details>
      ) : null}
    </Section>
  );
}

function WhereItGoes({ s }: { s: ScaleData }) {
  const e = s.experiments.find((x) => x.id === 'noise');
  if (!e) return null;
  const rows = e.rows.filter((r) => r._?.towerBy);
  const max = Math.max(...rows.flatMap((r) => Object.values(r._!.towerBy!)));
  return (
    <Section title="Where the person time goes" description="Minutes per hearing with the later tool, by kind of work." actions={estChip()}>
      <Table label="Where the remaining person time goes">
        <thead><tr><th scope="col">Kind of work</th>{rows.map((r) => <th scope="col" key={r.first}>{r.first.split(':')[0]!.replace(' (control)', '')}</th>)}</tr></thead>
        <tbody>
          {BY.map(([k, label]) => (
            <tr key={k}>
              <th scope="row">{label}</th>
              {rows.map((r) => {
                const v = r._!.towerBy![k] ?? 0;
                return (
                  <td key={r.first}>
                    <span className="flex items-center gap-2"><span className="w-10 text-right tabular-nums">{two(v)}</span><i aria-hidden className="h-2 rounded-chip bg-accent" style={{ width: `${Math.max(v > 0 ? 2 : 0, Math.round((96 * v) / max))}px` }} /></span>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr><th scope="row" className="font-semibold">All person time, minutes per hearing</th>{rows.map((r) => <td key={r.first} className="font-semibold tabular-nums">{one(r._!.tower)}</td>)}</tr>
        </tbody>
      </Table>
    </Section>
  );
}

interface RunRow {
  hearings: number;
  scenario: string;
  autonomy: string;
  seed: number;
  ms: number;
  res: SimResult;
}

function RunYourself({ autonomy, setAutonomy }: { autonomy: Autonomy; setAutonomy: (a: Autonomy) => void }) {
  const [size, setSize] = useState('100:10');
  const [scenario, setScenario] = useState('typical');
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState<{ done: number; total: number } | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Leaving the page stops the run at its next progress step, and no state is set after that.
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const run = async (): Promise<void> => {
    if (running) return;
    const ctl = new AbortController();
    abort.current = ctl;
    const [h, c] = size.split(':').map(Number) as [number, number];
    setRunning({ done: 0, total: 1 });
    setError(null);
    await new Promise((r) => { window.setTimeout(r, 30); });
    const t0 = performance.now();
    try {
      const world = makeSyntheticWorld({ base: { packet: engine.packet, playbooks: engine.playbooks }, hearings: h, counties: c, weeks: 4, seed, mix: { scenario } });
      // runSimAsync returns the merged result of cli/scale.js; its shape is SimResult.
      const res = (await runSimAsync(world, { scenario, autonomy: autonomy === 'more' ? promote() : {}, onProgress: (p: { done: number; total: number }) => {
        if (ctl.signal.aborted) throw new DOMException('Left the page', 'AbortError');
        setRunning({ done: p.done, total: p.total });
      } })) as unknown as SimResult;
      if (ctl.signal.aborted) return;
      const ms = performance.now() - t0;
      setRuns((r) => [{ hearings: h, scenario, autonomy, seed, ms, res }, ...r]);
      toast({ title: `Simulated ${num(res.hearings)} hearings in ${(ms / 1000).toFixed(1)} seconds`, body: `${one(res.perHearing.towerMinutes)} minutes of a person's time per hearing with the later tool, ${one(res.perHearing.manualMinutes)} by hand.`, tone: 'ok' });
    } catch (e) {
      if (ctl.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
    }
    if (!ctl.signal.aborted) setRunning(null);
  };

  return (
    <Section testId="scale-run-panel" title="Run it yourself" description="The engine on a made-up firm of the size you pick. Same seed, same result." actions={<SourceChip kind="simulated" source="prototype/src/sim.js, in this browser" counted="Generated offices, consultants and homeowners. Minutes per task are estimates." />}>
      <div className="flex flex-wrap items-end gap-4">
        <SelectField label="Size" value={size} onChange={setSize}>{SIZES.map(([h, c]) => <option key={h} value={`${h}:${c}`}>{num(h)} hearings in {c} counties{h >= 5000 ? ', about two minutes' : ''}</option>)}</SelectField>
        <SelectField label="World" value={scenario} onChange={setScenario}>{Object.entries(scenarios).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</SelectField>
        <SelectField label="Who sends one-click steps" value={autonomy} onChange={(v) => setAutonomy(v as Autonomy)}>
          <option value="default">A person approves each one</option>
          <option value="more">The {ONE_CLICK_CLASSES.length} kinds go out by themselves</option>
        </SelectField>
        <Field label="Seed" className="w-24">
          <TextInput type="number" min={1} max={9999} value={seed} onChange={(e) => setSeed(Number(e.target.value) || 1)} />
        </Field>
        <Button size="md" variant="primary" data-testid="scale-run" disabled={!!running} onClick={() => { void run(); }} icon={<Play aria-hidden />}>
          {running ? `Running, part ${running.done} of ${running.total}` : 'Run the simulation'}
        </Button>
      </div>
      {error ? <InlineAlert tone="danger" className="mt-4" title="The simulation stopped.">{error}</InlineAlert> : null}
      <SkeletonSwap data-testid="scale-result" className="mt-4" label="The simulation result" ready={!running} skeleton={<SkeletonRows rows={Math.max(1, runs.length + 1)} columns="160px minmax(0,1fr) 140px 80px 120px 100px 100px 100px 100px 80px" rowHeight={60} />}>
        {runs.length ? (
          <Table label="Your runs">
            <thead><tr><th scope="col">Size</th><th scope="col">World</th><th scope="col" className="text-right">Person-minutes per hearing</th><th scope="col" className="text-right">Less</th><th scope="col" className="text-right">Things a person does per hearing</th><th scope="col" className="text-right">Sent with no person</th><th scope="col" className="text-right">Coordinators a week</th><th scope="col" className="text-right">Ready when held</th><th scope="col" className="text-right">Safety rules broken</th><th scope="col" className="text-right">Run time</th></tr></thead>
            <tbody>
              {runs.map((r, i) => {
                const p = r.res.perHearing;
                const saved = p.manualMinutes ? 1 - p.towerMinutes / p.manualMinutes : null;
                return (
                  <tr key={i}>
                    <th scope="row"><span className="font-semibold">{num(r.res.hearings)}</span> hearings<div className="text-small text-ink-2">{r.res.meta.counties} counties, {r.res.meta.consultants} consultants</div></th>
                    <td>{scenarios[r.scenario]?.label.split(':')[0]}<div className="text-small text-ink-2">{r.autonomy === 'more' ? 'One-click steps by themselves' : 'A person approves'}, seed {r.seed}</div></td>
                    <td className="text-right tabular-nums"><span className="font-semibold">{one(p.towerMinutes)}</span> min<div className="text-small text-ink-2">by hand {one(p.manualMinutes)} min</div></td>
                    <td className="text-right tabular-nums">{saved == null ? 'n/a' : pct(saved)}</td>
                    <td className="text-right tabular-nums">{two(p.humanTouches)}<div className="text-small text-ink-2">of {one(p.outbound)} messages out</div></td>
                    <td className="text-right tabular-nums">{pct(r.res.rates.automaticShare)}</td>
                    <td className="text-right tabular-nums" data-testid={`scale-run-coordinators-${i}`}><span className="font-semibold">{coord(r.res.hearings, p.towerMinutes)}</span><div className="text-small text-ink-2">by hand {coord(r.res.hearings, p.manualMinutes)}</div></td>
                    <td className="text-right tabular-nums">{pct(r.res.rates.ready, 1)}<div className="text-small text-ink-2">{r.res.ready} of {r.res.held} held</div></td>
                    <td className="text-right"><StateBadge tone={r.res.safetyViolations ? 'danger' : 'ok'}>{String(r.res.safetyViolations)}</StateBadge></td>
                    <td className="text-right text-ink-2 tabular-nums">{(r.ms / 1000).toFixed(1)} s</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : <p className="text-body text-ink-2">No runs yet. Try 100 hearings, then 5,000 (about two minutes).</p>}
      </SkeletonSwap>
    </Section>
  );
}

export function Scale(_props: PageProps) {
  const s = scale;
  const [autonomy, setAutonomy] = useState<Autonomy>('default');
  const one_ = (id: string) => s?.experiments.find((e) => e.id === id);
  const charts = (['volume', 'counties'] as const).map(one_).filter((e): e is Experiment => !!e && !!e.chart);
  const tables = (['noise', 'autonomy', 'reading'] as const).map(one_).filter((e): e is Experiment => !!e);
  return (
    <LaterLayout
      id="later-scale"
      testId="page-later-scale"
      actions={<Button size="sm" variant="secondary" data-testid="scale-run-open" onClick={() => document.querySelector('[data-testid="scale-run-panel"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Run it yourself</Button>}
    >
      {s ? (
        <>
          <Section
            title="Typical firm, simulated"
            rule={false}
            actions={
              <SegmentedControl<Autonomy>
                label="Autonomy"
                size="sm"
                testId="scale-autonomy"
                value={autonomy}
                onValueChange={setAutonomy}
                options={[{ value: 'default', label: 'As shipped: a person approves' }, { value: 'more', label: 'One-click steps automatic' }]}
              />
            }
          >
            <Headline s={s} autonomy={autonomy} />
          </Section>
          <Section title="Person time as the work grows" description="Hearings and counties go up; minutes per hearing stay flat.">
            <div className="grid grid-cols-2 gap-6 max-xl:grid-cols-1">{charts.map((e) => <ExperimentChart key={e.id} e={e} />)}</div>
          </Section>
          <Section title="What the runs show" actions={simChip(s.generated)}>
            <div className="grid grid-cols-2 gap-8 max-lg:grid-cols-1">
              <Findings title="They show" list={s.findings} />
              <Findings title="They do not show" list={s.limits} />
            </div>
            <p className="mt-4 text-body text-ink-2">Checked after every step: {SAFETY_CHECKS.length} safety rules and {FAULT_CHECKS.length} outcome faults.</p>
          </Section>
          {tables.slice(0, 1).map((e) => <ExperimentPanel key={e.id} e={e} />)}
          <WhereItGoes s={s} />
          {tables.slice(1).map((e) => <ExperimentPanel key={e.id} e={e} />)}
        </>
      ) : <InlineAlert className="mt-6" title="No recorded runs in this build.">Use the form below.</InlineAlert>}
      <RunYourself autonomy={autonomy} setAutonomy={setAutonomy} />
      <Section title="Minutes behind the estimates" description="The author's estimates, not the firm's timings." actions={<SourceChip kind="estimate" source="prototype/src/sim.js MINUTES" counted="The comparison between sizes rests on counted actions, not on these minutes." />}>
        <div className="grid grid-cols-2 gap-8 max-xl:grid-cols-1">
          <Table label="Minutes per kind of work">
            <thead><tr><th scope="col">Kind of work</th><th scope="col">Counted</th><th scope="col" className="text-right">Low</th><th scope="col" className="text-right">Middle</th><th scope="col" className="text-right">High</th></tr></thead>
            <tbody>{MIN_ROWS.map(([k, label, w]) => <tr key={k}><th scope="row">{label}</th><td className="text-ink-2">{w}</td><td className="text-right tabular-nums">{MINUTES.low[k]}</td><td className="text-right font-semibold tabular-nums">{MINUTES.mid[k]}</td><td className="text-right tabular-nums">{MINUTES.high[k]}</td></tr>)}</tbody>
          </Table>
          <Table label="Minutes of work only a person does">
            <thead><tr><th scope="col">Only a person does these</th><th scope="col" className="text-right">Low</th><th scope="col" className="text-right">Middle</th><th scope="col" className="text-right">High</th></tr></thead>
            <tbody>{HUMAN_ROWS.map(([k, label]) => <tr key={k}><th scope="row">{label}</th><td className="text-right tabular-nums">{MINUTES.low.human[k]}</td><td className="text-right font-semibold tabular-nums">{MINUTES.mid.human[k]}</td><td className="text-right tabular-nums">{MINUTES.high.human[k]}</td></tr>)}</tbody>
          </Table>
        </div>
      </Section>
    </LaterLayout>
  );
}
