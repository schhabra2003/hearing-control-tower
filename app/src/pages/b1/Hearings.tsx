/**
 * Hearings (#/hearings?filter=&q= and #/hearings/AX-107): every hearing on the five regions of a
 * work page. There is no drawer and no second layout: the full hearing page
 * is this page with the hearing selected, so Back returns to the filtered list and the position
 * ("3 of 24") is always counted in the list on screen.
 *
 * - Page header: the line and the one action, Export as JSON (rows as filtered).
 * - Summary: four figures that are filters, with the same words as Today's figures.
 * - Toolbar: the filters as links (each its own URL) and a search field.
 * - List: the shared QueueList rows (address, case number, what to do first, status, the
 *   "3 of 5 checks done" progress, due and owner), coming hearings first, then those already held.
 * - Detail: the hearing's facts with the office's time zone, What to do today, the five checks in
 *   words with the proof one click away, the messages, and the sheet's
 *   own words behind "Sheet reference".
 */

import { useEffect, useMemo, useRef } from 'react';
import { Download } from 'lucide-react';
import type { Hearing } from '@/types/data';
import { byNearest, cellNumber, hearingByCase, hearings, listPhrases, officeOfHearing } from '@/lib/data';
import { statusCopy } from '@/lib/copy';
import { downloadJson, exportHearings } from '@/lib/agentData';
import { useKeys } from '@/lib/keys';
import { navigate, type PageProps } from '@/lib/router';
import { useSession } from '@/lib/store';
import { Button, buttonClass } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { CheckList } from '@/components/hearing/CheckList';
import { MessageTimeline } from '@/components/hearing/MessageTimeline';
import { checkViews, summarize } from '@/components/hearing/checks';
import { HearingHead, SheetLines, TodaySteps, type Pager } from '@/layout/Detail';
import { isAtRisk, type QueueItem } from '@/layout/model';
import { QueueList, type QueueGroup } from '@/layout/QueueList';
import { CaseNotes } from './caseNotes';
import { useNarrowReveal } from '@/layout/Today';
import { DetailRegion, ListRegion, Page, PageHeader, Seg, Src, Stat, Summary, Toolbar, Workspace, usePageState } from '@/layout/Regions';

export type HearingFilter = 'all' | 'top' | 'at-risk' | 'coming' | 'ready' | 'blocked' | 'nobody';

const attended = (h: Hearing): boolean => String(h.format ?? '').trim().toLowerCase() !== 'written statement';
const stillOn = (h: Hearing): boolean => String(h.stillOn ?? 'yes').trim().toLowerCase() !== 'no';
const coming = (h: Hearing): boolean => h.workingDays !== null && h.workingDays >= 0;
const isReady = (h: Hearing): boolean => /^(READY|CONFIRMED)/.test(h.status);

/**
 * "Need a consultant's yes": the same rule as the coverage line on Today and Measures B3 (a coming
 * hearing someone attends, no consultant's yes, within Settings B4 working days), so the figure on
 * Today, this filter's count and its rows always agree.
 */
function needsYes(h: Hearing): boolean {
  const window = cellNumber('Settings', 'B4') ?? 3;
  return coming(h) && stillOn(h) && attended(h) && h.gates.G2.state !== 'proved' && (h.workingDays ?? 99) <= window;
}

const FILTERS: { value: HearingFilter; label: string; test: (h: Hearing) => boolean }[] = [
  { value: 'all', label: 'All', test: () => true },
  { value: 'top', label: 'At risk today', test: isAtRisk },
  { value: 'at-risk', label: 'At risk: no yes', test: needsYes },
  { value: 'coming', label: 'Coming', test: coming },
  { value: 'ready', label: 'Ready', test: isReady },
  { value: 'blocked', label: 'Notice waits', test: (h) => listPhrases(h.dailyList).includes('NOTICE BLOCKED') },
  { value: 'nobody', label: 'No consultant', test: (h) => !h.consultant },
];

const isFilter = (v: string | null): v is HearingFilter => FILTERS.some((f) => f.value === v);

/** Words a person may type: the case, the address, the office, the consultant. */
function matchesSearch(h: Hearing, q: string): boolean {
  if (!q) return true;
  const hay = `${h.case} ${h.property} ${h.county} ${h.consultant ?? ''}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

/** The statuses the sheet can print, explained once in plain words. */
const STATUS_ORDER = ['OPEN: 1 missing', 'READY', 'CONFIRMED', 'DONE', 'RESULT DUE', 'ERROR DUE', 'DECISION DUE', 'OWED', 'MISSED', 'NEW DATE DUE', 'NOT HELD'];

/** Open by itself under a short list, so the list column is not left empty. */
function StatusMeanings({ open }: { open: boolean }) {
  const rows = STATUS_ORDER.map((s) => {
    const c = statusCopy(s);
    const label = s.startsWith('OPEN') ? 'Not ready' : c.label;
    // The write-up's word for each status, so a reader can map OPEN to "Not ready".
    return { s, label, word: s.split(':')[0]!, meaning: c.meaning };
  });
  return (
    <div className="l-block">
      <details key={open ? 'open' : 'closed'} className="l-details" data-testid="status-meanings" open={open}>
        <summary>What each status means</summary>
        <dl className="grid grid-cols-3 gap-x-8 gap-y-3 text-small max-[1600px]:grid-cols-2 max-sm:grid-cols-1">
          {rows.map((r) => (
            <div key={r.s} className="flex min-w-0 flex-col gap-1">
              <dt className="font-medium text-ink">
                {r.label} <span className="font-normal text-muted">(sheet: {r.word})</span>
              </dt>
              <dd className="text-ink-2">{r.meaning}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

/** The hearings whose case numbers are nearest to one that does not exist, for the Not found detail. */
function closest(asked: string): Hearing[] {
  const n = Number(/(\d+)$/.exec(asked)?.[1] ?? NaN);
  const by = (h: Hearing): number => Math.abs(Number(/(\d+)$/.exec(h.case)?.[1] ?? 0) - (Number.isNaN(n) ? 0 : n));
  return [...hearings].sort((a, b) => by(a) - by(b) || a.case.localeCompare(b.case)).slice(0, 6);
}

function timeZone(h: Hearing): string | null {
  return /Times are (.+?)\.?$/.exec(h.timeZoneSentence ?? '')?.[1] ?? null;
}

function HearingDetailRegion({ h, pager, inList, section }: { h: Hearing; pager?: Pager; inList: boolean; section: string | null }) {
  // ?tab=lines (the old drawer tab, and tour stop 7) opens "Sheet reference" with the sheet's printed lines.
  const lines = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (section !== 'lines') return;
    const d = lines.current?.querySelector('details');
    if (d) {
      d.open = true;
      lines.current?.scrollIntoView({ block: 'start' });
    }
  }, [section, h.case]);
  const proposals = useSession((s) => s.proposals);
  const views = checkViews(h, { proposals });
  const sum = summarize(views);
  const office = officeOfHearing(h);
  const zone = timeZone(h);
  return (
    <DetailRegion
      testId="region-detail-hearing"
      head={
        <>
          <HearingHead h={h} pager={pager} />
          {zone ? (
            <p className="l-small l-muted" data-testid="hearing-zone">
              Times are {zone}.
            </p>
          ) : null}
          {inList ? null : (
            <p className="l-small l-ink2" data-testid="not-in-list">
              This hearing is not in the list as filtered.
            </p>
          )}
        </>
      }
      foot={
        <>
          <span className="l-small l-muted">
            <span className="l-wide">Suggested by software. </span>A person decides.
          </span>
          {office ? (
            <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={`#/offices/${office.slug}`} data-testid="open-office">
              Open the {office.county} office
            </a>
          ) : null}
        </>
      }
    >
      {/* the five checks first, so all five show at 1920x1080 without scrolling. */}
      <div className="l-block [&_h3]:text-body [&_h3]:leading-5" data-testid="hearing-checks">
        <CheckList hearing={h} views={views} summary={sum.count} />
      </div>
      <TodaySteps h={h} />
      <CaseNotes h={h} />
      <div className="l-block [&_h3]:text-body [&_h3]:leading-5">
        <MessageTimeline hearing={h} views={views} highlightId={null} />
      </div>
      <div ref={lines} data-testid="be-lines" style={{ borderTop: '1px solid var(--border)' }}>
        <SheetLines h={h} />
      </div>
    </DetailRegion>
  );
}

export function Hearings({ params, query }: PageProps) {
  const filter: HearingFilter = (() => {
    const f = query.get('filter');
    return isFilter(f) ? f : 'all';
  })();
  const q = (query.get('q') ?? '').trim();
  const active = FILTERS.find((f) => f.value === filter)!;
  const rows = useMemo(() => hearings.filter((h) => active.test(h) && matchesSearch(h, q)).sort(byNearest), [active, q]);

  /** The query every link keeps: the filter and the search. */
  const keep = (): string => {
    const p = new URLSearchParams();
    if (filter !== 'all') p.set('filter', filter);
    if (q) p.set('q', q);
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  const hrefOf = (c: string): string => `#/hearings/${c}${keep()}`;

  const upcoming = rows.filter(coming);
  const held = rows.filter((h) => !coming(h));
  const toItem = (h: Hearing): QueueItem => ({ kind: 'hearing', key: h.case, hearing: h, href: hrefOf(h.case) });
  const groups: QueueGroup[] = [
    { id: 'coming', title: 'Coming, nearest first', items: upcoming.map(toItem) },
    { id: 'held', title: 'Already held: result or follow-up due', items: [...held].reverse().map(toItem) },
  ].filter((g) => g.items.length);
  const items = groups.flatMap((g) => g.items);

  // ?open= is the old drawer link and still selects the hearing, so links in notes keep working.
  const asked = (params.case ?? query.get('case') ?? query.get('open') ?? '').trim().toUpperCase();
  const selected: Hearing | undefined = asked ? hearingByCase(asked) : items[0]?.kind === 'hearing' ? items[0].hearing : undefined;
  const at = selected ? items.findIndex((i) => i.key === selected.case) : -1;
  const pager: Pager | undefined = at >= 0 ? { index: at + 1, total: items.length, prev: items[at - 1]?.href ?? null, next: items[at + 1]?.href ?? null } : undefined;

  useKeys(
    {
      j: () => {
        if (pager?.next) navigate(pager.next.slice(1));
      },
      k: () => {
        if (pager?.prev) navigate(pager.prev.slice(1));
      },
    },
    !!pager,
  );

  const all = hearings.length;
  const comingAll = hearings.filter(coming);
  const open = hearings.filter((h) => h.status.startsWith('OPEN')).length;
  const ready = hearings.filter(isReady).length;
  const top = hearings.filter(isAtRisk).length;
  const near = hearings.filter(needsYes).length;
  const windowDays = cellNumber('Settings', 'B4');
  const countOf = (f: HearingFilter): number => hearings.filter(FILTERS.find((x) => x.value === f)!.test).length;
  const filterHref = (f: HearingFilter): string => {
    const p = new URLSearchParams();
    if (f !== 'all') p.set('filter', f);
    if (q) p.set('q', q);
    const s = p.toString();
    return `#/hearings${s ? `?${s}` : ''}`;
  };

  usePageState({ page: 'hearings', filter, search: q || null, listCount: rows.length, selected: selected?.case ?? null, primaryAction: 'Export as JSON' });

  const setSearch = (v: string): void => {
    const p = new URLSearchParams();
    if (filter !== 'all') p.set('filter', filter);
    if (v.trim()) p.set('q', v);
    const s = p.toString();
    const base = params.case ? `/hearings/${params.case}` : '/hearings';
    navigate(`${base}${s ? `?${s}` : ''}`, { replace: true });
  };

  const unknown = asked && !selected;
  useNarrowReveal(params.case || query.get('open') || query.get('case') ? selected?.case ?? null : null);
  const zones = [...new Set(hearings.map((h) => /\((UTC[^)]+)\)/.exec(h.timeZoneSentence ?? '')?.[1]).filter(Boolean))];

  return (
    <Page fit>
      <PageHeader
        title="Hearings"
        line="Every hearing, nearest first. Open one to see what to do."
        actions={
          <Button
            variant="secondary"
            size="md"
            icon={<Download aria-hidden />}
            onClick={() => downloadJson('hearings.json', exportHearings().filter((x) => rows.some((h) => h.case === x.case)))}
            data-testid="export-json"
            aria-label={`Export the ${rows.length} hearings in this list as JSON`}
          >
            Export as JSON
          </Button>
        }
      />
      <Summary label="Hearings in four figures">
        <Stat
          testId="stat-all"
          label="All hearings"
          value={all}
          foot={`${open} not ready, ${ready} ready, ${all - open - ready} other`}
          source={<Src kind="measured" cell="Hearings, status column" />}
          href={filterHref('all')}
          current={filter === 'all'}
          name={`${all} hearings. Show them all`}
        />
        <Stat
          testId="stat-top"
          label="At risk today"
          value={top}
          of={`of ${all}`}
          foot="On the sheet’s daily list"
          source={<Src kind="measured" cell="Hearings, daily list" />}
          href={filterHref('top')}
          current={filter === 'top'}
          name={`${top} hearings at risk today. Show them`}
        />
        <Stat
          testId="stat-near"
          label="Need a consultant’s yes"
          value={near}
          tone={near > 0 ? 'danger' : undefined}
          foot={windowDays ? `Within ${windowDays} working days. Target 0` : 'Target 0'}
          source={<Src kind="measured" cell="Measures B3" />}
          href={filterHref('at-risk')}
          current={filter === 'at-risk'}
          name={`${near} hearings need a consultant’s yes now. Show them`}
        />
        <Stat
          testId="stat-ready"
          label="Ready"
          value={ready}
          of={`of ${comingAll.length} coming`}
          foot="Every check done"
          source={<Src kind="measured" cell="Hearings, status column" />}
          href={filterHref('ready')}
          current={filter === 'ready'}
          name={`${ready} of ${comingAll.length} coming hearings are ready. Show them`}
        />
      </Summary>
      <Toolbar
        left={<Seg label="Which hearings" current={filter} items={FILTERS.map((f) => ({ id: f.value, label: f.label, count: countOf(f.value), href: filterHref(f.value) }))} />}
        right={
          <Field label={<span className="sr-only">Search the hearings</span>} className="gap-0">
            <TextInput type="search" className="w-60" style={{ height: 'var(--h-control-sm)' }} placeholder="Case, address or name" defaultValue={q} onChange={(e) => setSearch(e.target.value)} data-testid="hearings-search" />
          </Field>
        }
      />
      <Workspace split={selected || unknown ? '7-5' : '12'}>
        <ListRegion title={active.label === 'All' ? 'All hearings' : active.label} meta={<><span className="l-num">{rows.length === 1 ? '1 hearing' : `${rows.length} hearings`}</span>{zones.length === 1 ? <span className="l-num" data-testid="hearings-zone">Office time, {zones[0]}</span> : null}</>}>
          {items.length ? (
            <QueueList groups={groups} selected={selected?.case ?? null} caption={`${active.label} hearings: coming first, nearest first, then those already held`} />
          ) : (
            <div className="l-block">
              <EmptyState
                size="inline"
                headingLevel={3}
                title={q ? `No hearing matches “${q}”` : 'No hearing in this list'}
                description={q ? 'Search by case number, street, office or consultant, or clear the search.' : 'Choose All to see every hearing.'}
                action={
                  <a className={buttonClass({ variant: 'secondary', size: 'sm' })} href="#/hearings">
                    Show all hearings
                  </a>
                }
              />
            </div>
          )}
          <StatusMeanings open={items.length <= 6} />
        </ListRegion>
        {selected ? (
          <HearingDetailRegion h={selected} pager={pager} inList={at >= 0} section={query.get('tab')} />
        ) : unknown ? (
          <DetailRegion head={<h2 className="l-section">{`No hearing ${asked}`}</h2>} testId="region-detail-hearing">
            <p className="l-block l-muted l-p" data-testid="hearing-unknown">
              The sheet has no hearing with the case number {asked}. The closest case numbers are below, or pick one from the list.
            </p>
            <ul className="l-block flex flex-col gap-2" data-testid="hearing-closest">
              {closest(asked).map((h) => (
                <li key={h.case} className="text-body">
                  <a className="l-link" href={hrefOf(h.case)}>
                    {h.case}, {h.property}
                  </a>
                </li>
              ))}
            </ul>
          </DetailRegion>
        ) : null}
      </Workspace>
    </Page>
  );
}
