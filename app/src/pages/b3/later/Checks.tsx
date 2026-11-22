import { useMemo, useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { alerts, pairHealth, spansFromRecords, summarize } from '@engine/src/telemetry.js';
import type { PageProps } from '@/lib/router';
import { engine, evidence } from '@/lib/data';
import { Button } from '@/components/ui/Button';
import { Skeleton, useSkeletonSwap } from '@/components/ui/Skeleton';
import { KpiCell, KpiRow } from '@/components/data/KpiRow';
import { SourceChip } from '@/components/data/SourceChip';
import { toast } from '@/components/ui/Toast';
import { Section } from '@/components/ui/Section';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { LaterLayout, StateBadge, Table } from './parts';
import { worldKit, type ProblemResult } from './tower';

interface ReaderRow {
  set: string;
  kind: string;
  reader: string;
  found: string;
  right: string;
  exact: string;
  wrong_closings: string;
  to_person: string;
  cost_per_message?: string;
  failed_reads?: number;
}

interface ReaderResults {
  headline?: { unseen_n: number; ai_found: string; ai_right: string; ai_to_person: string; offline_recall: string };
  rows: ReaderRow[];
  notes: string[];
  reproduce: { what: string; command: string }[];
  spend_usd: number;
  per_message?: Record<string, unknown>;
}

interface ModelSummary {
  model: string;
  role: string;
  provider: string;
  calls: number;
  errors: number;
  cacheShare: number | null;
  costPerCall: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
}

interface Summary {
  calls: number;
  messages: number;
  costUsd: number | null;
  costPerMessage: number | null;
  byModel: ModelSummary[];
}

interface Pair {
  agreement: number | null;
  messagesWherePairAgrees: number;
  messagesWithClosingStatements: number;
  toPersonShare?: number;
  toPerson?: number;
  scored?: number;
  wrongClosings?: number;
}

// engine.json carries the recorded reader results and the coverage run as cli/appdata.js writes them.
const rr = engine.reader_results as ReaderResults | null;
const coverage = engine.coverage as { pass: number; total: number } | null;

/** "91 of 91" from the newest quoted line of a command, when the line prints a full count. */
function fullCount(command: RegExp): string | null {
  for (const r of [...evidence.factsChecks, ...evidence.readmeChecks].filter((x) => command.test(x.command))) {
    const m = [...(r.cells[r.cells.length - 1] ?? '').matchAll(/(\d[\d,]*) of (\d[\d,]*)/g)].find((x) => x[1] === x[2]);
    if (m) return m[0];
  }
  return null;
}
const officeChecks = fullCount(/check_office\.js/);
const safety = engine.scale ? { broken: engine.scale.totals.safety, rules: engine.scale.totals.safetyRules.length, hearings: engine.scale.totals.hearings } : null;

/** The recorded runs beside the browser run: the full suite, the office rule and the simulated safety rules. */
function Recorded({ inBrowser }: { inBrowser: number }) {
  return (
    <KpiRow title="Last recorded runs" showTitle={false} columns={3} className="mt-4 shadow-none ring-1 ring-border" testId="checks-recorded">
      {coverage ? <KpiCell testId="checks-full-suite" label="Full suite, last recorded run" value={`${coverage.pass} of ${coverage.total}`} target={`The ${inBrowser} here run in a browser; the rest check the sheet and tools.`} chip={<SourceChip kind="measured" source="node cli/check.js" counted="Measured on the prototype." />} /> : null}
      {officeChecks ? <KpiCell testId="checks-office" label="Office-rule checks" value={officeChecks} target="node cli/check_office.js" chip={<SourceChip kind="measured" source="node cli/check_office.js" counted="Measured on the prototype." />} /> : null}
      {safety ? <KpiCell testId="checks-safety" label="Safety rules broken" value={`${safety.broken} of ${safety.rules}`} target={`In ${safety.hearings.toLocaleString('en-US')} simulated hearings`} chip={<SourceChip kind="simulated" source="eval/scale.json (node cli/scale.js)" counted="Each rule checked after every step of every simulated run." />} /> : null}
    </KpiRow>
  );
}

const pctOf = (x: number | null | undefined): string => (x == null ? 'n/a' : `${Math.round(100 * x)}%`);
const sec = (ms: number | null): string => (ms == null ? 'n/a' : `${(ms / 1000).toFixed(1)} s`);

function ReaderTable({ rows, caption }: { rows: ReaderRow[]; caption: string }) {
  const detail = (r: ReaderRow): string => (r.kind === 'recorded' ? 'Recorded answers, replayed offline with no key.' : r.kind === 'offline' ? 'No model and no key.' : `Live run.${r.failed_reads ? ` ${r.failed_reads} ${r.failed_reads === 1 ? 'answer' : 'answers'} cut off, counted as not read.` : ''}`);
  return (
    <div>
      <h3 className="text-h3 mb-2 text-ink">{caption}</h3>
      <Table label={caption}>
        <thead><tr><th scope="col">Reader</th><th scope="col" className="text-right">Statements found</th><th scope="col" className="text-right">Of those applied, right</th><th scope="col" className="text-right">Messages read exactly</th><th scope="col" className="text-right">Wrong closings</th><th scope="col" className="text-right">Messages to a person</th><th scope="col" className="text-right">Cost per message</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={r.kind === 'recorded' ? 'bg-accent-soft' : ''}>
              <th scope="row"><span className="font-semibold">{r.reader}</span><div className="text-small text-ink-2">{detail(r)}</div></th>
              <td className="text-right tabular-nums">{r.found}</td>
              <td className="text-right tabular-nums">{r.right}</td>
              <td className="text-right tabular-nums">{r.exact}</td>
              <td className="text-right tabular-nums">{r.wrong_closings}</td>
              <td className="text-right tabular-nums">{r.to_person}</td>
              <td className="text-right tabular-nums">{r.cost_per_message || (r.kind === 'offline' ? 'nothing' : 'see notes')}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function Ops() {
  const data = useMemo(() => {
    if (!engine.recorded) return null;
    const s = summarize(spansFromRecords(engine.recorded)) as Summary;
    const p = pairHealth(engine.recorded, rr?.per_message ?? null) as Pair;
    return { s, p, a: alerts(s, p) };
  }, []);
  if (!data) return null;
  const { s, p, a } = data;
  return (
    <Section title="Every recorded AI call" description="The readers can drift without an error, so every call is counted." actions={<SourceChip kind="measured" source="data/recorded_reads.json" counted="Computed in this browser from the recorded reads: model, tokens, cost and time of each call." />}>
      <KpiRow title="Recorded calls" showTitle={false} columns={3} className="shadow-none ring-1 ring-border">
        <KpiCell label="Model calls" value={s.calls.toLocaleString('en-US')} target={`For ${s.messages} messages${s.costUsd == null ? '' : `, $${s.costUsd.toFixed(2)}`}`} />
        <KpiCell label="Readers agree" value={pctOf(p.agreement)} target={`${p.messagesWherePairAgrees} of ${p.messagesWithClosingStatements} messages`} />
        {typeof p.scored === 'number' ? <KpiCell label="Sent to a person" value={pctOf(p.toPersonShare)} target={`${p.toPerson} of ${p.scored} labelled messages`} /> : null}
      </KpiRow>
      <div className="mt-4">
        <Table label="Recorded model calls by reader">
          <thead><tr><th scope="col">Reader</th><th scope="col" className="text-right">Calls</th><th scope="col" className="text-right">Failed</th><th scope="col" className="text-right">Input from cache</th><th scope="col" className="text-right">Cost per call</th><th scope="col" className="text-right">Median time</th><th scope="col" className="text-right">95th percentile</th></tr></thead>
          <tbody>
            {s.byModel.map((m) => (
              <tr key={m.model}>
                <th scope="row"><span className="font-semibold">{m.model}</span> <span className="text-small text-ink-2">{m.role === 'second' ? 'second reader' : 'first reader'}, {m.provider}</span></th>
                <td className="text-right tabular-nums">{m.calls}</td>
                <td className="text-right tabular-nums">{m.errors}</td>
                <td className="text-right tabular-nums">{pctOf(m.cacheShare)}</td>
                <td className="text-right tabular-nums">{m.costPerCall == null ? 'n/a' : `$${m.costPerCall.toFixed(5)}`}</td>
                <td className="text-right tabular-nums">{sec(m.p50Ms)}</td>
                <td className="text-right tabular-nums">{sec(m.p95Ms)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <h3 className="text-h3 mt-6 mb-2 text-ink">Alarms</h3>
      {a.length ? (
        <ul className="flex flex-col gap-2 text-body">
          {a.map((x) => <li key={x.code} className="flex flex-wrap items-center gap-2"><StateBadge tone={x.code === 'WRONG_CLOSING' ? 'danger' : 'warn'}>{(([h, ...r]) => `${h!.toUpperCase()}${r.join('')}`)(x.code.split('_').join(' ').toLowerCase())}</StateBadge><span>{x.text}</span></li>)}
        </ul>
      ) : <p className="flex flex-wrap items-center gap-2 text-body"><StateBadge tone="ok">Quiet</StateBadge> Nothing is over its limit.</p>}
    </Section>
  );
}

export function Checks(_props: PageProps) {
  const kit = worldKit();
  const problems = kit.problems;
  const groups = [...new Set(problems.map((p) => p.group))];
  const [results, setResults] = useState<Map<string, ProblemResult>>(new Map());
  const [running, setRunning] = useState(false);
  const [ms, setMs] = useState<number | null>(null);
  const passed = [...results.values()].filter((r) => r.ok).length;
  const skeleton = useSkeletonSwap(!running);
  // The run yields to the browser every few checks; leaving the page stops it (no state set after).
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const run = async (): Promise<void> => {
    if (running) return;
    alive.current = true;
    setRunning(true);
    setMs(null);
    const out = new Map<string, ProblemResult>();
    setResults(new Map());
    const t0 = performance.now();
    const cache: Record<string, unknown> = {};
    for (let i = 0; i < problems.length; i += 1) {
      const p = problems[i]!;
      out.set(p.id, kit.runOne(p, cache));
      if (i % 4 === 3) {
        if (!alive.current) return;
        setResults(new Map(out));
        await new Promise((r) => { window.setTimeout(r, 0); });
      }
    }
    if (!alive.current) return;
    const took = performance.now() - t0;
    setResults(new Map(out));
    setMs(took);
    setRunning(false);
    const ok = [...out.values()].filter((r) => r.ok).length;
    toast({ title: `${ok} of ${out.size} checks pass`, body: 'Run in this browser just now.', tone: ok === out.size ? 'ok' : 'neutral' });
  };

  const unseen = rr?.rows.filter((r) => r.set === 'unseen') ?? [];
  const examples = rr?.rows.filter((r) => r.set === 'examples') ?? [];

  return (
    <LaterLayout
      id="later-checks"
      testId="page-later-checks"
      actions={
        <Button size="md" variant="primary" data-testid="checks-run" disabled={running} onClick={() => { void run(); }} icon={<Play aria-hidden />}>
          {running ? `Running, ${results.size} of ${problems.length}` : results.size ? 'Run them again' : `Run all ${problems.length}`}
        </Button>
      }
    >
      <Section
        title="Problems the later tool must get right"
        rule={false}
      >
        {results.size || running ? (
          <KpiRow title="This browser" showTitle={false} columns={3} className="shadow-none ring-1 ring-border" testId="checks-kpis">
            <KpiCell label="Problems" value={problems.length} target={`In ${groups.length} groups: the ones that run in a browser.`} />
            <KpiCell
              label="Pass in this browser"
              value={
                skeleton ? <Skeleton className="my-2 h-6 w-32" /> : <span data-testid="checks-result">{results.size ? `${passed} of ${results.size}` : 'Running'}</span>
              }
              tone={results.size && passed !== results.size ? 'danger' : 'neutral'}
              chip={results.size ? <SourceChip kind="measured" source="eval/world.js, in this browser" counted="Measured in this browser, on this computer, just now." /> : undefined}
            />
            <KpiCell label="Time to run" value={ms != null ? `${(ms / 1000).toFixed(1)} s` : 'Running'} target="Measured in this browser" />
          </KpiRow>
        ) : (
          <KpiRow title="This browser" showTitle={false} columns={2} className="shadow-none ring-1 ring-border" testId="checks-kpis">
            <KpiCell label="Problems to run in this browser" value={problems.length} target={`In ${groups.length} groups. Run them to see how many pass.`} />
            <KpiCell label="What they prove" value={<span className="text-body font-normal text-ink">Who may establish what, and what is never automatic.</span>} />
          </KpiRow>
        )}
        <Recorded inBrowser={problems.length} />
      </Section>

      {rr ? (
        <Section title="How well messages are read" description={rr.headline ? `On ${rr.headline.unseen_n} unseen office messages, written after the readers were built.` : undefined} actions={<SourceChip kind="measured" source="eval/reader_results.json" counted="Labelled statements found and applied, by reader." />}>
          <div className="flex flex-col gap-6">
            <ReaderTable rows={unseen} caption="Unseen office messages" />
            <ReaderTable rows={examples} caption="The example messages (not a fair test)" />
            <details>
              <summary className="cursor-pointer text-body font-medium text-accent hover:underline">What these numbers do and do not show</summary>
              <ul className="mt-2 flex max-w-[var(--measure)] list-disc flex-col gap-2 pl-4 text-body text-ink">{rr.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            </details>
            <p className="text-body text-ink-2">All paid runs cost ${rr.spend_usd.toFixed(2)}, on fictional messages only.</p>
          </div>
        </Section>
      ) : null}

      <Ops />

      <Section title="Every problem, by group" description="Open a group to see each problem and what the later tool must do.">
        <div className="flex flex-col divide-y divide-border border-y border-border">
          {groups.map((g) => {
            const list = problems.filter((p) => p.group === g);
            const done = list.filter((p) => results.has(p.id));
            const ok = done.filter((p) => results.get(p.id)!.ok).length;
            return (
              <details key={g}>
                <summary className="flex min-h-10 cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-body font-semibold text-ink hover:bg-surface-2">
                  {g} <span className="tabular-nums text-small font-normal text-ink-2">{list.length}</span>
                  {done.length ? <StateBadge tone={ok === done.length ? 'ok' : 'danger'}>{ok} of {done.length} pass</StateBadge> : null}
                </summary>
                <div className="px-3 pb-4">
                  <Table label={g}>
                    <thead><tr><th scope="col">Check</th><th scope="col">Problem</th><th scope="col">What the later tool must do</th></tr></thead>
                    <tbody>
                      {list.map((p) => {
                        const r = results.get(p.id);
                        return (
                          <tr key={p.id}>
                            <th scope="row" className="whitespace-nowrap"><span className="tabular-nums font-semibold">{p.id}</span> {r ? <StateBadge tone={r.ok ? 'ok' : 'danger'}>{r.ok ? 'Pass' : 'Fail'}</StateBadge> : null}</th>
                            <td>{p.problem}{r?.error ? <div className="text-small text-danger">{r.error}</div> : null}</td>
                            <td>{p.expect}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </details>
            );
          })}
        </div>
      </Section>
      {!rr ? <InlineAlert title="The reader results are not in this build." /> : null}
    </LaterLayout>
  );
}
