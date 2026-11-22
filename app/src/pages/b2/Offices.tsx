/**
 * Offices (#/offices, #/offices/:slug, ?filter=, ?approve=1, ?try=1), split 5 + 7:
 * - Page header: the title and one line.
 * - Summary: offices (and their states), changes waiting (red only while one waits), routes
 *   confirmed in writing as one neutral count, offices with a daytime phone on the sheet.
 * - Toolbar: filters as links, and "Try an office message" on the right.
 * - List: the offices (name, state and time zone; how we name our consultant; the route in words).
 * - Detail: an office with a change waiting shows the change (old beside new, who said it, the
 *   hearings that wait) and the decision in the footer; any other office shows how to reach it, its
 *   hearings and the questions still open. ?try=1 shows the office rule to try instead.
 * The row's state, the Detail and the API read the same session decision, so nothing contradicts
 * itself after an approval.
 */

import { officeBySlug, officeCell, offices, type Office } from '@/lib/data';
import { plainRoute } from '@/lib/copy';
import { changeCounts, type OfficeChange } from '@/lib/officeChanges';
import type { PageProps } from '@/lib/router';
import { useSession } from '@/lib/store';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { comingAt } from '@/layout/model';
import { DetailRegion, ListRegion, Page, PageHeader, Seg, Src, Stat, State, Summary, Toolbar, Workspace, usePageState } from '@/layout/Regions';
import { OfficeBody, OfficeHead, routeState, zoneOf } from './components/OfficeCard';
import { ChangeBody, ChangeFoot, ChangeHead, changeRowWord } from './components/OfficeDecision';
import { RecordTable, pagerOf, type RecordGroup, type RecordRow } from './components/RecordTable';
import { TryOffice } from './components/TryOffice';

type Filter = 'all' | 'change' | 'unconfirmed';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All offices' },
  { id: 'change', label: 'Change waits' },
  { id: 'unconfirmed', label: 'Not confirmed in writing' },
];
const isFilter = (v: string | null): v is Filter => FILTERS.some((f) => f.id === v);

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());
const confirmedOf = (o: Office): string => str(officeCell(o, 'Process last confirmed').value);
const hasPhone = (o: Office): boolean => {
  const v = str(officeCell(o, 'Daytime telephone').value);
  return !!v && !v.startsWith('ASK');
};

/** The new route in a few words: "staffing form, then a call." */
function newRouteShort(c: OfficeChange): string {
  if (/staffing form/i.test(c.newRoute) && /call/i.test(c.newRoute)) return 'staffing form, then a call.';
  const first = c.newRoute.split(/[.:;]/)[0]!.trim();
  return `${first.charAt(0).toLowerCase()}${first.slice(1)}.`;
}

export function Offices({ params, query }: PageProps) {
  const all = offices();
  const changes = useSession((s) => s.changes);
  const pasted = useSession((s) => s.pasted);
  const counts = changeCounts({ changes, pasted });
  const changeOf = (slug: string): OfficeChange | undefined => counts.all.find((c) => c.slug === slug);
  const filter: Filter = isFilter(query.get('filter')) ? (query.get('filter') as Filter) : 'all';
  const trying = query.get('try') === '1';

  const waitingOf = (slug: string): boolean => counts.waiting.some((c) => c.slug === slug);
  const test = (o: Office): boolean => (filter === 'change' ? waitingOf(o.slug) : filter === 'unconfirmed' ? !confirmedOf(o) : true);
  const keep = (extra?: Record<string, string>): string => {
    const p = new URLSearchParams();
    if (filter !== 'all') p.set('filter', filter);
    for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  const hrefOf = (o: Office): string => `#/offices/${o.slug}${keep()}`;

  const row = (o: Office): RecordRow => {
    const c = changeOf(o.slug);
    const st = c ? changeRowWord(changes[o.slug]) : routeState(o);
    const confirmed = confirmedOf(o);
    const n = comingAt(o).length;
    return {
      key: o.slug,
      href: hrefOf(o),
      testId: `office-row-${o.slug}`,
      title: o.county,
      linkLabel: `Open the ${o.county} office`,
      meta: `${str(o.cells.B)}, ${n === 1 ? '1 hearing coming' : `${n} hearings coming`}`,
      line: c ? (changes[o.slug] && changes[o.slug]!.decision !== 'held' ? `Record ${o.county}’s ${changes[o.slug]!.decision === 'approved' ? 'approved' : 'kept'} process on the sheet.` : `New route, waits for approval: ${newRouteShort(c)}`) : plainRoute(str(officeCell(o, 'How to name our representative').value)).split('. ')[0]!.replace(/\.?$/, '.'),
      side: (
        <>
          <State tone={st.tone} testId={`office-row-state-${o.slug}`}>
            {st.word}
          </State>
          <span className="l-small l-muted l-num" style={{ whiteSpace: 'nowrap' }}>
            {zoneOf(o)}
          </span>
        </>
      ),
      sr: c ? (confirmed ? `Old process confirmed in writing; new process said by ${c.channel}${c.channel === 'phone' ? ' only' : ''}` : `New process said by ${c.channel}, not confirmed in writing`) : confirmed ? 'Process confirmed in writing' : 'Process not confirmed in writing',
    };
  };

  const shown = all.filter(test);
  const waitingFirst = [...shown].sort((a, b) => Number(!!changeOf(b.slug)) - Number(!!changeOf(a.slug)));
  const groups: RecordGroup[] = [{ id: 'offices', title: 'Offices', rows: waitingFirst.map(row) }];

  const unknown = !!params.slug && !officeBySlug(params.slug);
  const firstWaiting = counts.waiting[0]?.office;
  const selected: Office | undefined = unknown ? undefined : params.slug ? officeBySlug(params.slug) : (firstWaiting ?? waitingFirst[0]);
  const change = selected ? changeOf(selected.slug) : undefined;
  const pager = selected ? pagerOf(groups, selected.slug) : undefined;
  const approveOpen = query.get('approve') === '1';

  const confirmedCount = all.filter((o) => !!confirmedOf(o)).length;
  const phones = all.filter(hasPhone).length;
  const states = new Set(all.map((o) => str(o.cells.B))).size;
  const filterHref = (f: Filter): string => `#/offices${f === 'all' ? '' : `?filter=${f}`}`;
  const zones = new Set(all.map(zoneOf));
  const countOf = (f: Filter): number => all.filter((o) => (f === 'change' ? waitingOf(o.slug) : f === 'unconfirmed' ? !confirmedOf(o) : true)).length;
  const base = selected && params.slug ? `#/offices/${selected.slug}` : '#/offices';

  usePageState({
    page: 'offices',
    filter,
    listCount: shown.length,
    selected: selected?.slug ?? null,
    changesWaiting: counts.waiting.map((c) => c.slug),
    changesOnHold: counts.held.map((c) => c.slug),
    trying,
    primaryAction: change && !changes[change.slug] ? 'Approve new process' : undefined,
  });

  return (
    <Page fit>
      <div data-testid="page-offices" style={{ display: 'contents' }}>
        <PageHeader title="Offices" line="Each office’s naming process, and the changes waiting for you." />
        <Summary label="Offices in four figures">
          <Stat
            testId="stat-offices"
            label="Offices"
            value={all.length}
            foot={zones.size === 1 ? `In ${states} states, all on ${[...zones][0]} in this example` : `In ${states} states, ${zones.size} time zones`}
            source={<Src kind="packet" cell="Offices tab, columns A, B and V" />}
            href={filterHref('all')}
            current={filter === 'all' && !trying}
            name={`${all.length} offices. Show them all`}
          />
          <Stat
            testId="stat-changes"
            label="Change waits for you"
            value={counts.waiting.length}
            tone={counts.waiting.length ? 'danger' : undefined}
            foot={counts.waiting.length ? `${counts.waiting.map((c) => c.county).join(', ')}: decide today` : counts.held.length ? `${counts.held.length} on hold` : 'Nothing waits'}
            source={<Src kind="measured" cell="Offices tab, column N (Ask again?)" />}
            href={filterHref('change')}
            current={filter === 'change'}
            name={`${counts.waiting.length} office changes wait for a decision. Show them`}
          />
          <Stat
            testId="stat-confirmed"
            label="Confirmed in writing"
            value={confirmedCount}
            of={`of ${all.length}`}
            foot="The rest are asked in the season email"
            source={<Src kind="measured" cell="Offices, process last confirmed" />}
            href={filterHref('unconfirmed')}
            current={filter === 'unconfirmed'}
            name={`${confirmedCount} of ${all.length} offices confirmed their process in writing. Show the others`}
          />
          <Stat
            testId="stat-phones"
            label="Daytime phone on file"
            value={phones}
            of={`of ${all.length}`}
            foot="Asked in the season email"
            source={<Src kind="measured" cell="Offices, daytime telephone" />}
          />
        </Summary>
        <Toolbar
          left={<Seg label="Which offices" current={trying ? '' : filter} items={FILTERS.map((f) => ({ id: f.id, label: f.label, count: countOf(f.id), href: filterHref(f.id) }))} />}
          right={
            <a className={buttonClass({ variant: trying ? 'primary' : 'secondary', size: 'sm' })} href={trying ? base : `${base}${keep({ try: '1' })}`} data-testid="try-office-open" aria-current={trying ? 'page' : undefined}>
              {trying ? 'Close the office rule' : 'Try an office message'}
            </a>
          }
        />
        <Workspace split="5-7">
          <ListRegion title={FILTERS.find((f) => f.id === filter)!.label} meta={<span className="l-num">{shown.length === 1 ? '1 office' : `${shown.length} offices`}</span>}>
            {shown.length ? (
              <RecordTable
                groups={groups}
                selected={trying ? null : (selected?.slug ?? null)}
                caption="The offices on the sheet: an office whose change waits comes first"
                heads={['Office and how to name our consultant', 'Route and time zone']}
                sideWidth={176}
                testId="offices-table"
              />
            ) : (
              <div className="l-block">
                <EmptyState size="inline" headingLevel={3} title="No office in this list" description="Choose All offices to see every office." />
              </div>
            )}
            <div className="l-block">
              <details className="l-details" data-testid="offices-new-office">
                <summary>How a new office is added</summary>
                <ol className="l-small l-ink2 l-p" style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
                  <li>Ask the office for its rules, one hearing day and an alternate.</li>
                  <li>Add one row on the Offices tab. No code changes.</li>
                  <li>A person approves the row before any notice goes.</li>
                </ol>
              </details>
            </div>
          </ListRegion>
          {trying ? (
            <DetailRegion
              testId="region-detail-try"
              head={
                <div className="l-detailhead-row">
                  <h2 className="l-section">Try an office message</h2>
                  <span className="l-small l-muted">Runs in your browser</span>
                </div>
              }
              foot={
                <>
                  <span className="l-small l-muted">The rule suggests. A person decides.</span>
                  <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={base}>
                    Back to the office
                  </a>
                </>
              }
            >
              <TryOffice defaultCounty={selected?.county} />
            </DetailRegion>
          ) : selected && change ? (
            <DetailRegion
              testId={`process-change-${change.slug}`}
              head={<ChangeHead change={change} pager={pager} />}
              foot={<ChangeFoot change={change} approveOpen={approveOpen} />}
            >
              <ChangeBody change={change} />
            </DetailRegion>
          ) : selected ? (
            <DetailRegion
              testId={`office-detail-${selected.slug}`}
              head={<OfficeHead office={selected} pager={pager} />}
              foot={
                <>
                  <span className="l-small l-muted">Read from the Offices tab.</span>
                  <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={`#/hearings?q=${encodeURIComponent(selected.county)}`} data-testid="office-hearings-open">
                    Open {selected.county} hearings
                  </a>
                </>
              }
            >
              <OfficeBody office={selected} />
            </DetailRegion>
          ) : (
            <DetailRegion head={<h2 className="l-section">{`No office named “${params.slug ?? ''}”`}</h2>} testId="office-unknown">
              <div className="l-block">
                <p className="l-body l-p" role="status">
                  The sheet has no office with that name. Pick one from the list.
                </p>
                <ul className="l-checks" style={{ marginTop: 8 }}>
                  {all.map((o) => (
                    <li key={o.slug} className="l-check">
                      <a className="l-link" href={`#/offices/${o.slug}`}>
                        {o.county} office
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </DetailRegion>
          )}
        </Workspace>
      </div>
    </Page>
  );
}
