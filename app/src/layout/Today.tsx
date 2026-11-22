/**
 * Today (#/), the first screen. It is the work, with no hero:
 * - Page header: the coverage sentence ("4 need one now" is a link) and the one primary action.
 * - Summary: four figures, each a link to the list it counts.
 * - Toolbar: which items (needs you today, or everything on today's list), and the link to what
 *   the AI does and does not do.
 * - List: "Decisions only you make" first, then the hearings at risk today, nearest first.
 * - Detail: the selected item. ?case=AX-101 or ?decide=tesswick selects one, so Back and reload work.
 */

import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';
import { Fact } from '@/components/ui/Fact';
import { coverageLine } from '@/lib/copy';
import { cellNumber, dailyList } from '@/lib/data';
import { proofCounts } from '@/lib/decisions';
import { flagged, morningCounts, passDone } from '@/lib/today';
import { PlanBand } from '@/pages/b1/PlanBand';
import type { PageProps } from '@/lib/router';
import { useSession } from '@/lib/store';
import { Checks, DecisionBody, DecisionFoot, DecisionHead, HearingHead, SheetLines, TodaySteps, type Pager } from './Detail';
import { CaseNotes } from '@/pages/b1/caseNotes';
import { atRiskList, changesWaiting, selectedItem, todayQueue, type QueueItem } from './model';
import { QueueList, type QueueGroup } from './QueueList';
import { DetailRegion, ListRegion, Page, PageHeader, Seg, Src, Stat, Summary, Toolbar, Workspace, usePageState } from './Regions';

/**
 * Phone widths (CLICK-today-390): the detail sits below a long list, so opening a row scrolls the
 * detail into view. Wide screens show both side by side and do not scroll.
 */
export function useNarrowReveal(key: string | null): void {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!/[?&](case|decide)=|\/hearings\/AX-/.test(window.location.hash)) return;
    }
    if (!key || window.innerWidth >= 768) return;
    const el = document.querySelector('[data-region="detail"]');
    // Below the sticky top bar (56 px) with 8 px to spare, so the hearing's title shows.
    if (el) window.requestAnimationFrame(() => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64 }));
  }, [key]);
}

export function Today({ query }: PageProps) {
  const s = useSession((x) => x);
  const cov = coverageLine();
  const windowDays = cellNumber('Settings', 'B4');
  const list = query.get('list') === 'all' ? 'all' : 'today';
  const all = flagged();
  const risk = atRiskList();
  const q = todayQueue(s, list, all);
  const changes = changesWaiting(s);
  const groups: QueueGroup[] = [
    ...(q.decisions.length ? [{ id: 'decisions', title: 'Decisions only you make', items: q.decisions, count: `${changes.length} waiting` }] : []),
    ...(list === 'all'
      ? dailyList().map((g) => ({ id: g.group.id, title: g.group.title, items: q.hearings.filter((i) => i.kind === 'hearing' && g.rows.includes(i.hearing)) }))
      : [{ id: 'at-risk', title: 'At risk today', items: q.hearings }]),
  ].filter((g) => g.items.length);
  const items: QueueItem[] = groups.flatMap((g) => g.items);
  const sel = selectedItem(query, items);
  const at = sel ? items.findIndex((i) => i.key === sel.key) : -1;
  const pager: Pager | undefined = at >= 0 ? { index: at + 1, total: items.length, prev: items[at - 1]?.href ?? null, next: items[at + 1]?.href ?? null } : undefined;
  const proofs = proofCounts(s.proposals);
  const morning = morningCounts(s);
  const done = passDone(s, '0900').length;
  const primary = done ? `Continue the 9:00 a.m. pass, ${done} of 4 done` : 'Start the 9:00 a.m. pass';
  // UX-4: count what still needs action from the same live state as the tab; a decided row stays, said apart.
  const open = changes.length + (list === 'all' ? q.hearings.length : risk.length);
  const decided = q.decisions.length - changes.length;
  const countWords = `${open === 1 ? '1 item' : `${open} items`}${decided > 0 ? `, plus ${decided} decided` : ''}, nearest first`;
  const zones = [...new Set(all.map((h) => /\((UTC[^)]+)\)/.exec(h.timeZoneSentence ?? '')?.[1]).filter(Boolean))];
  useNarrowReveal(sel?.key ?? null);
  usePageState({ page: 'today', list, listCount: items.length, selected: sel?.key ?? null, primaryAction: primary });

  return (
    <Page fit>
      <PageHeader
        title="Today"
        line={
          <>
            <span className="block min-[1200px]:whitespace-nowrap" data-testid="today-intro">
              <Fact kind="count">{cov.yes} of {cov.total}</Fact> coming hearings have a yes.{' '}
              <Src kind="measured" cell="Hearings, consultant said yes (check 2)" testId="today-intro-src" />{' '}
              <a className="l-link" href={cov.href} data-testid="overview-coverage">{cov.link}</a>
            </span>
          </>
        }
        actions={
          <a className={buttonClass({ variant: 'primary', size: 'md' })} href="#/today/9am" data-testid="start-pass">
            {primary}
            <ArrowRight aria-hidden className="size-4" />
          </a>
        }
      />
      {/* The four figures and the plan read as one summary band (8 px grid: 16 px between them). */}
      <div className="flex flex-none flex-col gap-4" data-region="summary">
        <Summary label="Today in four figures">
          <Stat testId="stat-risk" label="At risk today" value={risk.length} of={`of ${all.length} hearings`} foot={changes.length ? `Plus ${changes.length === 1 ? '1 decision' : `${changes.length} decisions`} only you make` : 'Each has an owner and a deadline'} source={<Src kind="measured" cell="Hearings, daily list" />} href="#/hearings?filter=top" name={`${risk.length === 1 ? '1 hearing' : `${risk.length} hearings`} at risk today. Show them`} />
          <Stat testId="stat-near" label="Need a consultant’s yes" value={cov.near} tone={cov.near > 0 ? 'danger' : undefined} foot={windowDays ? `Within ${windowDays} working days. Target 0` : 'Target 0'} source={<Src kind="measured" cell="Measures B3" />} href={cov.href} name={`${cov.near} hearings need a consultant’s yes now. Show them`} />
          <Stat testId="stat-proofs" label="Suggestions to decide" value={morning.proposals.waiting} of={`of ${morning.proposals.total}`} foot={`${proofs.waiting} of them proof links. Step 1 of the 9:00 a.m. pass`} source={<Src kind="measured" cell="Reader suggestions" />} href="#/today/9am?step=1" name={`${morning.proposals.waiting} suggestions to decide. Open step 1 of the 9:00 a.m. pass`} />
          <Stat testId="stat-changes" label="Decisions only you make" value={changes.length} foot={changes.length ? `${changes.map((o) => o.county).join(', ')}: new process` : 'Nothing waits'} source={<Src kind="measured" cell="Offices tab, column N (process change waiting)" />} href={changes[0] ? `#/?decide=${changes[0].slug}` : '#/offices'} name={changes.length ? `${changes.length === 1 ? '1 decision' : `${changes.length} decisions`} only you make. Open ${changes.length === 1 ? 'it' : 'the first'}` : 'No decision waits for you. Open Offices'} />
        </Summary>
        <PlanBand />
      </div>
      <Toolbar
        left={
          <Seg
            label="Which items"
            current={list}
            items={[
              { id: 'today', label: 'Needs action today', count: changes.length + risk.length, href: '#/' },
              { id: 'all', label: 'Everything on today’s list', count: changes.length + all.length, href: '#/?list=all' },
            ]}
          />
        }
        right={<a className="l-link l-small inline-flex min-h-8 items-center" href="#/ai" data-testid="link-ai">What the agents and the AI do</a>}
      />
      <Workspace>
        <ListRegion title={list === 'all' ? 'Everything on today’s list' : 'Needs action today'} meta={<><span className="l-num" data-testid="today-list-count">{countWords}</span>{zones.length === 1 ? <span className="l-num" data-testid="today-zone">Office time, {zones[0]}</span> : null}</>}>
          <QueueList groups={groups} selected={sel?.key ?? null} caption="Items that need action today: decisions first, then hearings, nearest first" />
        </ListRegion>
        {sel?.kind === 'hearing' ? (
          <DetailRegion
            head={<HearingHead h={sel.hearing} pager={pager} />}
            foot={
              <>
                <span className="l-small l-muted"><span className="l-wide">Suggested by software. </span>A person decides.</span>
                <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={`#/hearings/${sel.hearing.case}`} data-testid="open-full">Open hearing {sel.hearing.case}</a>
              </>
            }
          >
            <Checks h={sel.hearing} />
            <TodaySteps h={sel.hearing} />
            <CaseNotes h={sel.hearing} />
            <SheetLines h={sel.hearing} />
          </DetailRegion>
        ) : sel?.kind === 'decision' ? (
          <DetailRegion head={<DecisionHead o={sel.office} pager={pager} />} foot={<DecisionFoot o={sel.office} approveOpen={query.get('approve') === '1'} />} testId="region-detail-decision">
            <DecisionBody o={sel.office} />
          </DetailRegion>
        ) : (
          <DetailRegion head={<h2 className="l-section">Nothing needs action</h2>}>
            <p className="l-block l-muted l-p">Every hearing on today’s list has a step, an owner and a deadline.</p>
          </DetailRegion>
        )}
      </Workspace>
    </Page>
  );
}
