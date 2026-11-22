import { useMemo, useState } from 'react';
import { BUILDS, INPUTS, OPERATIONAL, PEAK_WEEKS, VOLUME, businessCase, byVolume, count, defaults, feeRange, threeCases, usd } from '@engine/src/economics.js';
import type { PageProps } from '@/lib/router';
import { ComparisonTable } from '@/components/data/ComparisonTable';
import { KpiCell, KpiRow } from '@/components/data/KpiRow';
import { RangeField } from '@/components/data/RangeField';
import { SourceChip } from '@/components/data/SourceChip';
import { cn } from '@/lib/cn';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Section } from '@/components/ui/Section';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { Fact } from '@/components/ui/Fact';
import { LaterLayout, StateBadge, Table } from './parts';

interface Input {
  key: string;
  label: string;
  unit: 'count' | 'usd' | 'pct' | 'min' | 'h' | 'yr';
  min: number;
  max: number;
  step: number;
  value: number;
  low: number;
  high: number;
  basis: 'sourced' | 'packet' | 'simulated' | 'estimate' | 'unknown';
  note: string;
}

interface Build {
  key: string;
  yearly: number;
  perHearing: number;
  breakEven: number;
  pays: boolean;
  net: number;
  note: string;
}

/** The engine's notes, in the product's neutral voice (the engine app wrote them in the first person). */
const neutral = (t: string): string => t.replace(/\b(\d+%) is my guess\./g, '$1 is an assumption; the firm knows the real rate.').replace(/in my own simulation/g, "in the prototype's simulation").replace(/\bmy guess\b/g, 'an assumption');

/** The parts of src/economics.js businessCase() this page shows. */
interface Case {
  input: Record<string, number>;
  fee: number;
  costToday: number;
  costKit: number;
  costAfter: number;
  consultantShareOfCost: number;
  coordToday: number;
  coordKit: number;
  coordAfter: number;
  kitValue: number;
  towerVsToday: number;
  missMargin: number;
  kitWork: number;
  minutesSavedVsToday: number;
  feeLostThisYear: number;
  feeLostPerMiss: number;
  marginToday: number;
  builds: Build[];
  year: { missedToday: number; feesLostToMisses: number; kitWork: number; missMargin: number; towerVsToday: number };
  peak: { hearingsAWeek: number; coordinatorsToday: number; coordinatorsKit: number; coordinatorsAfter: number; consultants: number; seasonalSaving: number };
  cash: { towerYear: number; need: number };
  towerRange: { year: [number, number] };
  bench: { names: Record<string, number> };
}

// The engine's INPUTS carry these fields (prototype/src/economics.js).
const inputs = INPUTS as unknown as Input[];
const BY_KEY = Object.fromEntries(inputs.map((i) => [i.key, i]));
const bc = (m: Record<string, number>): Case => businessCase(m) as unknown as Case;

const GROUPS: [string, string[]][] = [
  ['The firm', ['hearingsPerYear', 'firstYearSaving', 'winRate', 'feeShare', 'consultantFee']],
  ['The work today', ['coordinatorRate', 'productiveHours', 'minutesByHand', 'missToday', 'lossGivenMiss', 'laterYears']],
  ['What the standing control achieves, and costs, without software', ['missAvoided', 'kitMinutes', 'blockDiscount', 'blockShare']],
  ['What the later tool adds', ['reduction']],
  ['The season', ['peakShare', 'hearingsPerConsultantDay']],
];

const pct = (x: number, d = 0): string => `${(100 * x).toFixed(d)}%`;

function show(key: string, v: number): string {
  const i = BY_KEY[key]!;
  if (i.unit === 'usd') return usd(v, Number.isInteger(v) ? 0 : 2);
  if (i.unit === 'pct') return pct(v, Math.abs(v * 100 - Math.round(v * 100)) > 1e-9 ? 2 : 0);
  if (i.unit === 'min') return `${v.toFixed(1)} min`;
  if (i.unit === 'h') return `${v} hours`;
  if (i.unit === 'yr') return `${v} ${v === 1 ? 'year' : 'years'}`;
  return count(v);
}

const SRC = 'prototype/src/economics.js';

/** The basis of a starting value: a label chip where the engine names one, else a quiet tag; the note on hover. */
function Basis({ i }: { i: Input }) {
  const note = neutral(i.note);
  if (i.basis === 'packet' || i.basis === 'simulated' || i.basis === 'estimate') return <SourceChip kind={i.basis} source={`${SRC}, ${i.key}`} counted={note} />;
  // Not a fifth label: an assumption or a public figure is an Estimate; the tooltip says which.
  const why = i.basis === 'unknown' ? 'An assumption. Only the firm knows the real figure.' : 'A public figure, at the cautious end.';
  return <SourceChip kind="estimate" source={`${SRC}, ${i.key}`} counted={`${why} ${note}`} />;
}

/** The volume slider starts at 100 in steps of 100, so the write-up's 300 sits on the track. */
const VOLUME_TRACK = { min: 100, step: 100 };

function Slider({ k, m, set }: { k: string; m: Record<string, number>; set: (k: string, v: number) => void }) {
  const i = BY_KEY[k]!;
  const track = k === 'hearingsPerYear' ? VOLUME_TRACK : { min: i.min, step: i.step };
  return <RangeField label={i.label} value={m[k]!} min={track.min} max={i.max} step={track.step} onChange={(v) => set(k, v)} format={(v) => show(k, v)} chip={<Basis i={i} />} testId={`business-slider-${k}`} className="border-t border-border first:border-t-0" />;
}

function verdict(x: Build) {
  return x.pays ? <StateBadge tone="ok">Pays at this volume</StateBadge> : <StateBadge tone="neutral">Does not pay in dollars</StateBadge>;
}

function span(lo: Build, hi: Build) {
  return hi.pays ? <StateBadge tone="ok">Pays at this volume</StateBadge> : lo.pays ? <StateBadge tone="warn">Borderline</StateBadge> : <StateBadge tone="neutral">Does not pay yet</StateBadge>;
}

interface Option {
  id: string;
  name: string;
  lo: Build;
  hi: Build;
  loKey: string;
  hiKey: string;
}

/** Thousands with a sign, as the write-up prints money left: "-$2k", "+$477k". */
const k = (x: number): string => `${x < 0 ? '−' : '+'}$${Math.round(Math.abs(x) / 1000).toLocaleString('en-US')}k`;
/** Coordinator minutes with the plan's confirmation checks (SOLUTION_DESIGN.md sections 4 and 10): an estimate, not engine output. */
const PLAN_MINUTES = '18.7 to 19.6';
const PLAN_PER_COORDINATOR = '91 to 96';
const towerCost = (key: string): number => BUILDS.find((x) => x.key === key)!.yearly;

/** The write-up's scaling table (a normal year, with the levers), from the same engine function. */
function PlanAtThreeVolumes({ m }: { m: Record<string, number> }) {
  const v = byVolume(m) as unknown as { rows: { h: number; names: [number, number]; coordinators: number; cost: number; consultant: number; left: [number, number] }[]; fees: [number, number]; growth: { hearings: number; coordinators: number }; input: { minutesByHand: number } };
  const rows = v.rows;
  const last = rows[rows.length - 1]!;
  const lines: [string, (r: (typeof rows)[number]) => string][] = [
    ['Consultants needed', (r) => `${r.names[0]} to ${r.names[1]}`],
    ['Coordinators, peak week', (r) => r.coordinators.toFixed(1)],
    ['Cost a hearing', (r) => usd(r.cost, 0)],
    [`Left a year at ${usd(v.fees[0], 0)}`, (r) => k(r.left[0])],
    [`Left a year at ${usd(v.fees[1], 0)}`, (r) => k(r.left[1])],
  ];
  return (
    <div data-testid="business-volumes">
      <div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="text-h3 text-ink">The plan at three volumes, a normal year</h3> <SourceChip kind="estimate" source={`${SRC} byVolume()`} counted="The same function as the one-page write-up: the full sheet, the reply rule and the readers, by docket. Other inputs as set." /></div>
      <Table label="The plan at three volumes, a normal year">
        <thead><tr><th scope="col">Hearings a year</th>{rows.map((r) => <th scope="col" key={r.h} className="text-right">{count(r.h)}</th>)}</tr></thead>
        <tbody>
          {lines.map(([label, f]) => (
            <tr key={label}><th scope="row">{label}</th>{rows.map((r) => <td key={r.h} className="text-right tabular-nums">{f(r)}</td>)}</tr>
          ))}
        </tbody>
      </Table>
      <ul className="mt-3 flex max-w-[var(--measure)] list-disc flex-col gap-1 pl-4 text-body text-ink">
        <li>Coordinator minutes a hearing: <Fact kind="count">{v.input.minutesByHand.toFixed(1)}</Fact> today, <Fact kind="count">{PLAN_MINUTES}</Fact> with the plan. No saving of coordinator minutes is claimed for season one; it pays through missed hearings prevented.</li>
        <li>Coordinators rise <Fact kind="count">{v.growth.coordinators.toFixed(1)} times</Fact> when hearings rise {v.growth.hearings.toFixed(1)} times. Hearings per coordinator in a peak week: 92 today, {PLAN_PER_COORDINATOR} with the plan.</li>
        <li>Fuller days cut consultant cost from {usd(rows[0]!.consultant, 0)} to {usd(last.consultant, 0)} a hearing at {count(last.h)}.</li>
      </ul>
    </div>
  );
}

/** The page's first lines: cost, savings and the tower, in plain words. */
function InShort({ m }: { m: Record<string, number> }) {
  const today = bc(m);
  const at5000 = bc({ ...m, hearingsPerYear: 5000 });
  const freed = Math.round(at5000.cash.towerYear / 100) * 100;
  return (
    <dl data-testid="business-in-short" className="grid max-w-[calc(var(--measure)+128px)] grid-cols-[112px_minmax(0,1fr)] content-start gap-x-4 gap-y-2 text-body">
      <dt className="font-semibold text-ink">Cost</dt>
      <dd className="text-ink">A hearing costs <Fact kind="money">{usd(today.costToday, 0)}</Fact> today, {usd(m.consultantFee!, 0)} of it the consultant. Season one sets up for about <Fact kind="money">{usd(VOLUME.setUp[0]!)}</Fact> at 300 hearings a year.</dd>
      <dt className="font-semibold text-ink">Savings</dt>
      <dd className="text-ink">None claimed in coordinator minutes for season one. It pays through missed hearings prevented.</dd>
      <dt className="font-semibold text-ink">Later tool</dt>
      <dd className="text-ink">At 5,000 hearings it frees <Fact kind="money">{usd(freed)}</Fact> a year and costs {usd(towerCost('lean'))} to {usd(towerCost('leanHigh'))} a year. Not built.</dd>
      <dt className="font-semibold text-ink">The ask</dt>
      <dd className="text-ink">Two to four weeks of the author's time, three days of a coordinator, two hours a week of Alice, three days of technical help. The only code this season is the reply rule and tools that read exported mail.</dd>
    </dl>
  );
}

/** Where each of the firm's real numbers goes on the sheet (the "Day 1 count" tab). */
const DAY_ONE: [string, string][] = [
  ['Hearings a year', 'B6'],
  ['Fee per hearing', 'B4'],
  ['Missed hearings and their cost', 'B3'],
  ['Hearings and coordinator hours in the 8 busiest weeks', 'B2'],
  ['Weeks from hearing to fee', 'B5'],
];

function Results({ m }: { m: Record<string, number> }) {
  const b = bc(m);
  const three = threeCases(m) as { hopeful: Case; cautious: Case };
  const get = (c: Case, key: string): Build => c.builds.find((x) => x.key === key)!;
  const p0 = get(b, 'phase0');
  const lean = get(b, 'lean');
  const leanHi = get(b, 'leanHigh');
  const engLo = get(b, 'engineerLow');
  const engHi = get(b, 'engineerHigh');
  const fr = feeRange(m);
  const H = b.input.hearingsPerYear!;
  const be = (c: Case, key: string): number => get(c, key).breakEven;
  const options: Option[] = [
    { id: 'phase0', name: 'The standing control, no software', lo: p0, hi: p0, loKey: 'phase0', hiKey: 'phase0' },
    { id: 'lean', name: 'Lean build of the later tool', lo: lean, hi: leanHi, loKey: 'lean', hiKey: 'leanHigh' },
    { id: 'engineer', name: 'A dedicated engineer', lo: engLo, hi: engHi, loKey: 'engineerLow', hiKey: 'engineerHigh' },
  ];
  return (
    <div className="flex flex-col gap-6" aria-live="polite">
      <div className="grid items-start gap-6 min-[1600px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <InShort m={m} />
        <InlineAlert className="max-w-[calc(var(--measure)+48px)]" tone="warn" title="The fee per hearing is the weakest figure.">
          On public figures it is {usd(fr[0]!, 0)} if half are won and {usd(fr[1]!, 0)} if all are, against {usd(b.costToday, 0)} of cost. Seasonal help for the {PEAK_WEEKS} peak weeks saves {usd(b.peak.seasonalSaving)} a year at the volume set.
        </InlineAlert>
      </div>
      <KpiRow title="Per hearing and per peak week" showTitle={false} columns={4} testId="business-kpis" className="shadow-none ring-1 ring-border">
        <KpiCell label="Cost per hearing today" value={usd(b.costToday, 0)} target={`${usd(b.costKit, 0)} with the checks, ${usd(b.costAfter, 0)} with the later tool`} />
        <KpiCell label="Worth per hearing, later tool" value={usd(b.towerVsToday, 2)} target={`${b.minutesSavedVsToday.toFixed(1)} minutes saved; checks alone ${usd(b.kitValue, 2)}`} />
        <KpiCell label="Fees lost per missed hearing" value={usd(b.feeLostThisYear, 0)} target={`${usd(b.feeLostPerMiss, 0)} with later years`} />
        <KpiCell label="Coordinators, peak week today" value={b.peak.coordinatorsToday.toFixed(1)} target={`${b.peak.coordinatorsAfter.toFixed(1)} with the later tool, ${count(b.peak.hearingsAWeek)} hearings`} />
      </KpiRow>

      <ComparisonTable<Option>
        caption="What pays for itself"
        testId="business-pays"
        rows={options}
        rowKey={(o) => o.id}
        rowHeader={{ header: 'Way to do it', render: (o) => o.name, width: '24%' }}
        highlight={(o) => o.hi.pays}
        columns={[
          { key: 'cost', header: 'Cost a year', numeric: true, render: (o) => (o.lo === o.hi ? usd(o.lo.yearly) : `${usd(o.lo.yearly)} to ${usd(o.hi.yearly)}`) },
          { key: 'worth', header: 'Worth per hearing', numeric: true, render: (o) => usd(o.lo.perHearing, 2) },
          { key: 'from', header: 'Pays from, hearings', numeric: true, render: (o) => (o.lo === o.hi ? count(o.lo.breakEven) : `${count(o.lo.breakEven)} to ${count(o.hi.breakEven)}`) },
          { key: 'range', header: 'Hopeful to cautious', numeric: true, render: (o) => `${count(be(three.hopeful, o.loKey))} to ${count(be(three.cautious, o.hiKey))}` },
          { key: 'verdict', header: `At ${count(H)} a year`, render: (o) => (o.lo === o.hi ? verdict(o.lo) : span(o.lo, o.hi)) },
        ]}
      />
      <PlanAtThreeVolumes m={m} />
    </div>
  );
}

export function Business(_props: PageProps) {
  const start = (): Record<string, number> => ({ ...defaults(), hearingsPerYear: 300 });
  const [m, setM] = useState<Record<string, number>>(start);
  const set = (k: string, v: number): void => setM((x) => ({ ...x, [k]: v }));
  const preset = (which: 'low' | 'value' | 'high' | 'reset'): void => {
    if (which === 'reset') {
      setM(start());
      return;
    }
    setM((x) => {
      const next = { ...x };
      for (const i of inputs) if (OPERATIONAL.includes(i.key)) next[i.key] = i[which];
      return next;
    });
  };
  const [which, setWhich] = useState<'start' | 'low' | 'value' | 'high'>('start');
  const results = useMemo(() => <Results m={m} />, [m]);
  return (
    <LaterLayout
      id="later-business"
      testId="page-later-business"
      actions={
        <SegmentedControl<'start' | 'low' | 'value' | 'high'>
          label="Starting values"
          size="sm"
          testId="business-presets"
          value={which}
          onValueChange={(v) => { setWhich(v); preset(v === 'start' ? 'reset' : v); }}
          options={[
            { value: 'start', label: 'As loaded' },
            { value: 'low', label: 'Cautious' },
            { value: 'value', label: 'Middle' },
            { value: 'high', label: 'Hopeful' },
          ]}
        />
      }
    >
      <div className="grid grid-cols-[minmax(340px,420px)_minmax(0,1fr)] gap-x-12 max-xl:grid-cols-1">
        <Section title="Your numbers" description="Starts at 300 hearings a year, what the example week implies. Each value has a label." rule={false}>
          {GROUPS.map(([title, keys]) => (
            <fieldset key={title} className={cn('mt-6 first:mt-0')}>
              <legend className="mb-2 text-body font-semibold text-ink">{title}</legend>
              {keys.map((key) => <Slider key={key} k={key} m={m} set={(kk, v) => { setWhich('start'); set(kk, v); }} />)}
            </fieldset>
          ))}
          <div className="mt-6" data-testid="business-day-one">
            <h3 className="text-h3 mb-2 text-ink">Where the firm's real numbers go</h3>
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-body">
              {DAY_ONE.map(([what, cell]) => <div key={cell} className="contents"><dt className="text-ink">{what}</dt><dd className="text-ink-2">Day 1 count {cell}</dd></div>)}
            </dl>
          </div>
        </Section>
        <Section title="What the numbers say" rule={false} actions={<SourceChip kind="estimate" source={`${SRC} businessCase()`} counted="Calculated in this browser from the inputs on the left." />}>{results}</Section>
      </div>
      <Section title="What this page leaves out">
        <ul className="flex max-w-[var(--measure)] list-disc flex-col gap-2 pl-4 text-body text-ink">
          <li>The cost of winning a customer and preparing a case, which a missed hearing wastes.</li>
          <li>Clients lost to a bad review, beyond the later fees on the slider.</li>
          <li>Whether a prepared person in the room wins more often. Nothing published says.</li>
          <li>Cash: paying consultants within seven days moves cash out before the fee comes in.</li>
        </ul>
      </Section>
    </LaterLayout>
  );
}
