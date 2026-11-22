/**
 * Integrations (#/integrations, #/integrations/<slug>, ?filter=simulated|not-connected),
 * split 5 + 7 on the shared regions (layout/Regions.tsx):
 * - Summary: connected (always 0), simulated, not connected, and examples tried in this browser.
 * - Toolbar: filters by status, as links; "Undo all" on the right once something was tried.
 * - List: the firm's tools, two lines each (name, what it does), status as one Badge.
 * - Detail: what the prototype does today, two examples to try, what flows in and out, the
 *   permission asked, what an agent may do, what a person approves, the question it needs,
 *   the cost, and the sheet cells behind "Sheet reference". The one primary action, "Try an
 *   example", sits in the Detail footer.
 *
 * 21st.dev sources: the list and the allow / ask / never rows after "Connectors" by aadixc0de
 * (https://21st.dev/r/aadixc0de/connectors); the permission block after "Permission Grant" by
 * syeddhasnainn (https://21st.dev/r/syeddhasnainn/permission-grant); the action after "Connect
 * Integration Cards" by olewandowski1 (https://21st.dev/r/olewandowski1/integrations-1). Changes:
 * no brand logos, no "Connected" state or toggle, "Connect" became "Try an example". Buttons,
 * Badges and the regions are the app's adopted components.
 */

import { ArrowRight, Ban, Braces, Check, Play, RotateCcw, Undo2, UserCheck } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { downloadJson } from '@/lib/agentData';
import { useLive } from '@/lib/live';
import { navigate, type PageProps } from '@/lib/router';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Block, DetailRegion, ListRegion, Page, PageHeader, Seg, SheetRef, Src, Stat, Summary, Toolbar, Workspace, usePageState } from '@/layout/Regions';
import { Facts, PagerLinks, RecordTable, pagerOf, type RecordGroup } from '@/pages/b2/components/RecordTable';
import { EXAMPLE_NOTE, INTEGRATIONS, integrationBySlug, statusCounts, type AgentRule, type FigureLabel, type Integration, type SimEvent, type StatusWord, type UnlockQuestion } from './integrations';
import { EventResultView } from './EventResult';
import { eventResult, runEvent, undoAll, undoEvent, useSim, type LogEntry } from './simulate';
import { deskIntegrations } from './api';
import { liveDoneText, readEventLive, readsLive, useReadingEvent } from './liveSimulate';

type Filter = 'all' | 'simulated' | 'not-connected';
const FILTER_WORD: Record<Filter, string> = { all: 'All tools', simulated: 'Simulated', 'not-connected': 'Not connected' };
const isFilter = (v: string | null): v is Filter => v === 'all' || v === 'simulated' || v === 'not-connected';
const matches = (i: Integration, f: Filter): boolean => f === 'all' || (f === 'simulated' ? i.counted === 'Simulated' : i.counted !== 'Simulated');

/** One tone per status word: the word carries the meaning, the dot only adds to it. */
const STATUS_TONE: Record<StatusWord, BadgeTone> = { Simulated: 'neutral', Proposed: 'neutral', 'Not connected': 'later' };

/** Runs an event and says so once, with an Undo. With the live server and a key, mail events are read live first. */
export function simulateWithToast(e: SimEvent): void {
  if (readsLive(e)) {
    readEventLive(e)
      .then((r) => {
        if (!runEvent(e.id)) return;
        toast({ title: `Tried with live AI: ${e.title}`, body: `${r ? liveDoneText(r) : ''} Only example messages were sent.`.trim(), tone: 'neutral', duration: 8000, action: { label: 'Undo', run: () => undoEvent(e.id) } });
      })
      .catch((err: unknown) => toast({ title: `The live read failed: ${err instanceof Error ? err.message : String(err)}`, body: 'Nothing was recorded. Try again.', tone: 'warn' }));
    return;
  }
  if (!runEvent(e.id)) return;
  toast({ title: `Tried: ${e.title}`, body: EXAMPLE_NOTE, tone: 'neutral', duration: 8000, action: { label: 'Undo', run: () => undoEvent(e.id) } });
}

/** "Q30" becomes "Week-one kit, question 30"; the code itself stays in the Sheet reference. */
function questionSource(q: UnlockQuestion): string {
  if (q.ours) return 'Our proposal, not a kit question';
  const nums = [...q.id.matchAll(/Q(\d+)/g)].map((m) => m[1]);
  if (nums.length === 1) return `Week-one kit, question ${nums[0]}`;
  if (nums.length > 1) return `Week-one kit, questions ${nums.slice(0, -1).join(', ')} and ${nums[nums.length - 1]}`;
  return `Week-one kit, ${q.id.charAt(0).toLowerCase()}${q.id.slice(1)}`;
}

/* ---------- small parts ---------- */

function StatusBadges({ i, testIdPrefix }: { i: Integration; testIdPrefix: string }) {
  const liveNow = useLive((s) => s.server === 'up' && !!s.status?.live);
  return (
    <ul aria-label="Status" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
      {i.statuses.map((p, n) => {
        // The one honest exception: the AI readers run live when the local server reports a key.
        const live = liveNow && i.slug === 'ai-provider' && p.status === 'Not connected';
        return (
          <li key={`${p.part ?? 'all'}-${n}`} style={{ maxWidth: '100%' }}>
            <Badge tone={live ? 'ok' : STATUS_TONE[p.status]} detail={p.part ? (live ? 'Live AI' : p.status) : undefined} testId={`${testIdPrefix}-${n + 1}`} data-status={live ? 'Live AI' : p.status}>
              {p.part ? (live ? 'Live readers' : p.part) : p.status}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

const RULE: Record<AgentRule['rule'], { word: string; icon: ReactNode }> = {
  allow: { word: 'Allowed', icon: <Check aria-hidden size={16} /> },
  ask: { word: 'Proposes, a person decides', icon: <UserCheck aria-hidden size={16} /> },
  deny: { word: 'Never', icon: <Ban aria-hidden size={16} /> },
};

const FIGURE_SRC: Partial<Record<FigureLabel, 'measured' | 'estimate' | 'simulated' | 'packet'>> = { Measured: 'measured', Estimate: 'estimate', Simulated: 'simulated', Packet: 'packet' };

/* ---------- one example event ---------- */

function TryButton({ e, testId }: { e: SimEvent; testId: string }) {
  const live = useLive((s) => s.server === 'up' && !!s.status?.live) && readsLive(e);
  const busy = useLive((s) => s.run.state === 'running');
  const mine = useReadingEvent() === e.id;
  const progress = useLive((s) => (s.run.state === 'running' && s.run.total ? `${s.run.done} of ${s.run.total}` : ''));
  return (
    <Button size="sm" variant="secondary" data-testid={testId} data-mode={live ? 'live' : 'recorded'} icon={<Play aria-hidden />} loading={busy && mine} disabled={busy} onClick={() => simulateWithToast(e)} aria-label={`Try${live ? ' with live AI' : ''}: ${e.title}`}>
      {busy && mine ? (progress ? `Reading ${progress}` : 'Reading') : live ? 'Try with live AI' : 'Try it'}
    </Button>
  );
}

function EventItem({ i, e, n }: { i: Integration; e: SimEvent; n: number }) {
  const run = useSim((s) => s.runs[e.id]);
  const result = useMemo(() => (run ? eventResult(e) : null), [run, e]);
  return (
    <li data-testid={`integration-${i.slug}-event-${n}`} className="l-check" style={{ display: 'block', padding: '12px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'start' }}>
        <div className="l-check-name" style={{ padding: 0 }}>
          <span className="l-body l-strong">{e.title}</span>
          <span className="l-small l-ink2 l-p" style={{ maxWidth: 416 }}>{e.shows}</span>
        </div>
        <div className="l-check-right">
          {run ? (
            <>
              <Badge tone="neutral" size="sm" detail={`at ${run.at}`}>
                Tried
              </Badge>
              <Button size="sm" variant="ghost" data-testid={`integration-${i.slug}-event-${n}-undo`} icon={<Undo2 aria-hidden />} onClick={() => undoEvent(e.id)} aria-label={`Undo: ${e.title}`}>
                Undo
              </Button>
            </>
          ) : (
            <TryButton e={e} testId={`integration-${i.slug}-event-${n}-run`} />
          )}
        </div>
      </div>
      {run && result ? (
        <div style={{ display: 'grid', gap: 12, marginTop: 12, paddingLeft: 12, boxShadow: 'inset 2px 0 0 var(--border-strong)' }}>
          <EventResultView e={e} r={result} />
          {e.id === 'ai-provider-2' ? <p className="l-body l-p">{i.today}</p> : null}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span className="l-small l-muted">{EXAMPLE_NOTE}</span>
            <Button size="sm" variant="secondary" data-testid={`integration-${i.slug}-event-${n}-open`} iconEnd={<ArrowRight aria-hidden />} onClick={() => navigate(e.lands.to)}>
              {e.lands.label}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/* ---------- the log, in the list footer ---------- */

function TriedLog() {
  const log = useSim((s) => s.log);
  const entries = [...log].reverse().slice(0, 8);
  return (
    <details className="l-details" data-testid="integrations-log" style={{ width: '100%' }}>
      <summary>
        Tried in this browser: <span className="l-num">{entries.length ? log.filter((l) => l.what === 'ran').length : 0}</span>
      </summary>
      {entries.length ? (
        <ol aria-label="Examples tried, newest first" className="l-checks" style={{ marginTop: 8 }}>
          {entries.map((l: LogEntry) => (
            <li key={l.n} data-testid={`integrations-log-${l.n}`} className="l-check" style={{ minHeight: 32 }}>
              <span className="l-small">
                {l.what === 'ran' ? 'Tried' : 'Undone'}: {l.title}
              </span>
              <span className="l-small l-muted l-num">{l.at}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="l-small l-ink2 l-p" style={{ marginTop: 8 }}>
          Nothing tried yet. Open a tool and choose Try an example.
        </p>
      )}
    </details>
  );
}

/* ---------- the detail ---------- */

function Detail({ i, pager }: { i: Integration; pager?: ReturnType<typeof pagerOf> }) {
  const runs = useSim((s) => s.runs);
  const liveBusy = useLive((s) => s.run.state === 'running');
  const next = i.events.find((e) => !runs[e.id]);
  const tried = i.events.filter((e) => runs[e.id]).length;
  const refs = i.unlock.filter((q) => q.ref);
  return (
    <DetailRegion
      testId={`integration-detail-${i.slug}`}
      head={
        <>
          <div className="l-detailhead-row">
            <h2 className="l-section l-clip" id="integration-detail-title" data-testid="detail-title">
              {i.name}
            </h2>
            {pager ? <PagerLinks p={pager} /> : null}
          </div>
          <StatusBadges i={i} testIdPrefix={`integration-detail-${i.slug}-status`} />
          <Facts
            items={[
              { term: 'Works with', value: i.examples },
              { term: 'In this prototype', value: i.counted === 'Simulated' ? 'Example files' : 'Not built' },
              { term: 'Tried here', value: `${tried} of ${i.events.length} examples` },
            ]}
          />
        </>
      }
      foot={
        <>
          <span className="l-small l-muted">Example data only. Nothing is sent or received.</span>
          <Button
            variant="primary"
            size="md"
            data-testid={`integration-${i.slug}-simulate`}
            icon={<Play aria-hidden />}
            loading={liveBusy}
            disabled={!next || liveBusy}
            onClick={() => next && simulateWithToast(next)}
            aria-label={next ? `Try an example for ${i.name}: ${next.title}` : `Both examples for ${i.name} were tried`}
          >
            {next ? 'Try an example' : 'Both examples tried'}
          </Button>
        </>
      }
    >
      <Block title="What the prototype does today">
        <p className="l-body l-p">{i.today}</p>
      </Block>
      <Block title="Try it with example data" meta={`${i.events.length} examples`}>
        <ol className="l-checks" style={{ marginTop: -12 }}>
          {i.events.map((e, n) => (
            <EventItem key={e.id} i={i} e={e} n={n + 1} />
          ))}
        </ol>
      </Block>
      <Block title="What would flow in and out">
        <dl className="l-kv l-body">
          <dt>In</dt>
          <dd data-testid={`integration-${i.slug}-in`} style={{ maxWidth: 408 }}>
            {i.flowsIn}
          </dd>
          <dt>Out</dt>
          <dd data-testid={`integration-${i.slug}-out`} style={{ maxWidth: 408 }}>
            {i.flowsOut}
          </dd>
        </dl>
      </Block>
      <Block title="Permission asked, read-only first" testId={`integration-${i.slug}-permission`}>
        <ul className="l-checks">
          {i.permission.asks.map((p) => (
            <li key={p} className="l-check">
              <span className="l-body l-p" style={{ padding: '8px 0' }}>{p}</span>
              <span className="l-check-right l-small l-ink2">
                <Check aria-hidden size={16} /> Asked
              </span>
            </li>
          ))}
          {i.permission.never.map((p) => (
            <li key={p} className="l-check">
              <span className="l-body l-p" style={{ padding: '8px 0' }}>{p}</span>
              <span className="l-check-right l-small l-strong">
                <Ban aria-hidden size={16} /> Never
              </span>
            </li>
          ))}
        </ul>
      </Block>
      <Block title="What an agent may do" testId={`integration-${i.slug}-agent`}>
        <ul className="l-checks">
          {i.agent.map((r) => (
            <li key={r.action} data-rule={r.rule} className="l-check">
              <span className="l-body l-p" style={{ padding: '8px 0' }}>
                {r.action}
                <span className="l-sr">: </span>
              </span>
              <span className={r.rule === 'deny' ? 'l-check-right l-small l-strong' : 'l-check-right l-small l-ink2'}>
                {RULE[r.rule].icon}
                {RULE[r.rule].word}
              </span>
            </li>
          ))}
        </ul>
        {i.agentWhy ? <p className="l-small l-ink2 l-p" style={{ marginTop: 8 }}>{i.agentWhy}</p> : null}
      </Block>
      <Block title="What a person approves" testId={`integration-${i.slug}-approves`}>
        <p className="l-body l-p">{i.approves}</p>
      </Block>
      <Block title="Cost or effort" testId={`integration-${i.slug}-cost`}>
        <ul className="l-checks">
          {i.cost.map((c) => (
            <li key={c.text} className="l-check">
              <span className="l-check-name">
                <span className="l-body l-p">{c.text}</span>
                <span className="l-small l-muted">From: {c.source}</span>
              </span>
              <span className="l-check-right">{FIGURE_SRC[c.label] ? <Src kind={FIGURE_SRC[c.label]!} cell={c.source} /> : <span className="l-small l-muted">Not estimated</span>}</span>
            </li>
          ))}
        </ul>
      </Block>
      <Block title="What it fills on the sheet" testId={`integration-${i.slug}-fills`}>
        <p className="l-body l-p">{i.fills}</p>
      </Block>
      <Block title="The firm's answer it needs" testId={`integration-${i.slug}-unlock`}>
        <ul className="l-checks">
          {i.unlock.map((q) => (
            <li key={`${q.id}-${q.text}`} className="l-check">
              <span className="l-check-name">
                <span className="l-body l-p">{q.text}</span>
                <span className="l-small l-muted">{questionSource(q)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Block>
      {i.gaps?.length ? (
        <Block title="Not in the example data" testId={`integration-${i.slug}-gaps`}>
          <ul className="l-checks">
            {i.gaps.map((g) => (
              <li key={g} className="l-check">
                <span className="l-body l-p" style={{ padding: '8px 0' }}>{g}</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
      <div className="l-block">
        <SheetRef>
          <span>{i.fillsRef}</span>
          {refs.map((q) => (
            <span key={`${q.id}-ref`}>
              <span className="l-mono">{q.id}</span>: {q.ref}
            </span>
          ))}
        </SheetRef>
      </div>
    </DetailRegion>
  );
}

/* ---------- the page ---------- */

export function Integrations({ params, query }: PageProps) {
  const c = statusCounts();
  const runs = useSim((s) => s.runs);
  const tried = Object.keys(runs).length;
  const filter: Filter = isFilter(query.get('filter')) ? (query.get('filter') as Filter) : 'all';
  const shown = INTEGRATIONS.filter((i) => matches(i, filter));
  const keep = filter === 'all' ? '' : `?filter=${filter}`;
  const hrefOf = (i: Integration): string => `#/integrations/${i.slug}${keep}`;
  const filterHref = (f: Filter): string => `#/integrations${params.slug ? `/${params.slug}` : ''}${f === 'all' ? '' : `?filter=${f}`}`;
  const selected = integrationBySlug(params.slug ?? '') ?? shown[0] ?? INTEGRATIONS[0]!;

  const groups: RecordGroup[] = [
    {
      id: 'tools',
      title: "The firm's tools",
      rows: shown.map((i) => {
        const ran = i.events.filter((e) => runs[e.id]).length;
        return {
          key: i.slug,
          href: hrefOf(i),
          testId: `integration-${i.slug}`,
          title: i.name,
          linkLabel: `Open ${i.name}: ${i.counted}`,
          meta: i.examples,
          line: i.oneLine,
          side: (
            <>
              <Badge tone={STATUS_TONE[i.counted]} size="sm">
                {i.counted}
              </Badge>
              {ran ? <span className="l-small l-muted l-num">{ran} tried here</span> : null}
            </>
          ),
          sr: i.statuses.map((s) => `${s.part ? `${s.part}, ` : ''}${s.status}`).join('; '),
        };
      }),
    },
  ];
  const pager = pagerOf(groups, selected.slug);

  usePageState({ page: 'integrations', filter, listCount: shown.length, selected: selected.slug, primaryAction: 'Try an example', connected: c.connected, tried });

  return (
    <Page fit>
      <div data-testid="page-integrations" style={{ display: 'contents' }}>
        <PageHeader
          title="Integrations"
          line="The firm’s own tools: what each reads, and what a person approves."
          actions={
            <Button variant="secondary" size="md" data-testid="export-json-integrations" icon={<Braces aria-hidden />} onClick={() => downloadJson('integrations.json', deskIntegrations())}>
              Export as JSON
            </Button>
          }
        />
        <Summary label="The firm's tools in four figures" testId="integrations-summary">
          <Stat testId="integrations-count-connected" label="Connected" value={c.connected} of={`of ${c.total}`} foot="No tool is read live" />
          <Stat
            testId="integrations-count-simulated"
            label="Simulated"
            value={c.simulated}
            of={`of ${c.total}`}
            foot="Played on example files"
            href={filterHref('simulated')}
            current={filter === 'simulated'}
            name={`${c.simulated} tools simulated on example files. Show them`}
          />
          <Stat
            testId="integrations-count-not-connected"
            label="Not connected"
            value={c.notConnected + c.proposed}
            of={`of ${c.total}`}
            foot="Proposed for later"
            href={filterHref('not-connected')}
            current={filter === 'not-connected'}
            name={`${c.notConnected + c.proposed} tools not connected. Show them`}
          />
          <Stat testId="integrations-count-events" label="Tried here" value={tried} foot={tried ? 'Each one can be undone' : 'In this browser only'} source={<Src kind="simulated" cell="This browser's session" />} />
        </Summary>
        <Toolbar
          left={
            <Seg
              label="Which tools"
              current={filter}
              items={(['all', 'simulated', 'not-connected'] as Filter[]).map((f) => ({ id: f, label: FILTER_WORD[f], count: INTEGRATIONS.filter((i) => matches(i, f)).length, href: filterHref(f) }))}
            />
          }
          right={
            tried ? (
              <Button size="sm" variant="ghost" data-testid="integrations-undo-all" icon={<RotateCcw aria-hidden />} onClick={undoAll}>
                Undo all examples
              </Button>
            ) : (
              <span className="l-small l-muted">Nothing is connected. Examples run in this browser.</span>
            )
          }
        />
        <Workspace split="5-7">
          <ListRegion title={filter === 'all' ? "The firm's tools" : FILTER_WORD[filter]} meta={<span className="l-num">{shown.length === 1 ? '1 tool' : `${shown.length} tools`}</span>} foot={<TriedLog />}>
            <RecordTable groups={groups} selected={selected.slug} caption="The firm's tools and their status in this prototype" heads={['Tool', 'Status']} sideWidth={152} testId="integration-list" />
          </ListRegion>
          <Detail key={selected.slug} i={selected} pager={pager} />
        </Workspace>
      </div>
    </Page>
  );
}
