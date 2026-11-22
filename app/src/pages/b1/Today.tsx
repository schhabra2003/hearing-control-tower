/**
 * The 9:00 a.m. pass (#/today/9am) and the 2:00 p.m. review (#/today/2pm), on the five regions
 *: Page header, Summary (the four steps as cells), Toolbar, List and Detail.
 * Every step and every selected item is in the URL: ?step=1..4&item=<row> or &case=<case>, so
 * Back, reload and an agent reach the same state. The old ?open=<case> links still work.
 *
 * 9:00 a.m.: 1 proof links and other answers to decide (ReviewQueue, the adopted 21st.dev inbox),
 * 2 the office change only the owner decides (the same decision as on Today), 3 the calls due,
 * 4 the answers to send to consultants.
 * 2:00 p.m.: 1 the daily list, 2 a next step for each flagged hearing, 3 the same-day calls,
 * 4 the calendar file.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Hearing } from '@/types/data';
import { calendarEventCount, dailyList, hearingByCase, type Suggestion, suggestions } from '@/lib/data';
import { decided, needOf, proposedWords, targetCell, answerCell } from '@/lib/decisions';
import { clockText, dateShort, plural, sheetTime } from '@/lib/format';
import { gateLabel } from '@/lib/gates';
import { downloadIcs } from '@/lib/ics';
import { useKeys } from '@/lib/keys';
import { navigate, useLocation, type PageProps } from '@/lib/router';
import { actions, clockLabel, passOf, PASS_START, proposalKey, REVIEW_MINUTES, useSession, type Pass, type Session } from '@/lib/store';
import { afternoonCounts, answerSent, callLine, hasNextStep, morningCounts, ordersOfficeCall, passDone, questionGroups, sameDay } from '@/lib/today';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/Button';
import { toast, undoByKey } from '@/components/ui/Toast';
import { Checks, DecisionBody, DecisionFoot, DecisionHead, HearingHead, SheetLines, TodaySteps, type Pager } from '@/layout/Detail';
import { officeFor, street } from '@/layout/model';
import { APPROVAL_DIALOG, processCompare } from '@/lib/copy';
import type { Office } from '@/lib/data';
import type { QueueItem } from '@/layout/model';
import { QueueList, type QueueGroup } from '@/layout/QueueList';
import { Block, DetailRegion, ListRegion, Page, PageHeader, Seg, SheetRef, Src, Stat, State, Summary, Toolbar, Workspace, usePageState, type SegItem } from '@/layout/Regions';
import { messageById, messageTime } from './components/MessageQuote';
import { NextStepForm } from './components/NextStepForm';
import { icsEvents } from '@/pages/b2/lib';
import { CaseNotes } from './caseNotes';
import { DocketsWork, docketCount } from './components/Dockets';
import { ReviewQueue, type ReviewAnswer, type ReviewItem } from './components/ReviewQueue';

type Step = 1 | 2 | 3 | 4;
const SCOPE = 'suggestion';

/* ---------- small helpers ---------- */

const capsToSentence = (t: string): string => (/[a-z]/.test(t) ? t : t.charAt(0) + t.slice(1).toLowerCase());
/** The sheet heading without its cell and its bracketed hint: "The office says it cannot find our notice". */
function plainCell(s: Suggestion): string {
  const i = s.cell.indexOf(': ');
  const t = i >= 0 ? s.cell.slice(i + 2) : s.cell;
  return t.replace(/\s*\([^)]*\)\s*$/, '').trim();
}
const capFirst = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);
const isProof = (s: Suggestion): boolean => !!s.gate && s.closes;
const why = (w: string): string => w.replace(/^Rule [A-Z]\d+\.\s*/, '');
const sender = (from: string): string => from.replace(/\s*\([^)]*\)\s*$/, '');

/** An accessible name under 72 characters, so "Accept: <name>" stays under 80. */
function shortName(title: string, s: Suggestion): string {
  const lead = title.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  const tail = `${s.message ? `, message ${s.message}` : ''}`;
  const who = ` for ${s.case}`;
  const room = 70 - who.length - tail.length;
  const cut = lead.length > room ? `${lead.slice(0, Math.max(8, room - 1)).replace(/\s+\S*$/, '')}…` : lead;
  return `${cut}${who}${tail}`;
}

function proofTitle(s: Suggestion): string {
  return s.gate ? gateLabel(s.gate) : plainCell(s);
}

/** The message with the words the readers relied on marked, when they are in it. */
function MarkedBody({ body, words }: { body: string; words: string }) {
  const at = words ? body.indexOf(words) : -1;
  if (at < 0) return <>{body}</>;
  return (
    <>
      {body.slice(0, at)}
      <mark className="rounded-chip bg-accent-soft px-1 text-ink">{words}</mark>
      {body.slice(at + words.length)}
    </>
  );
}

/* ---------- the page ---------- */

export function Today({ query }: PageProps) {
  const session = useSession((s) => s);
  const loc = useLocation();
  const pass: Pass = loc.path.endsWith('/2pm') ? '1400' : '0900';
  const base = pass === '0900' ? '#/today/9am' : '#/today/2pm';
  const done = passDone(session, pass);
  const firstOpen = ([1, 2, 3, 4] as Step[]).find((n) => !done.includes(n)) ?? 1;
  const asked = Number(query.get('step'));
  // Old links (?open=<case>, used by the tour and the video) open the case: on the 9:00 a.m. pass the
  // case's first suggestion that waits (step 1), otherwise the calls list (step 3); on the 2:00 p.m.
  // review the daily list (step 1).
  const legacy = query.get('open');
  const legacyRow = legacy && pass === '0900' ? suggestions().find((s) => s.case === legacy && needOf(s) === 'decide') : undefined;
  const step: Step = asked >= 1 && asked <= 4 ? (asked as Step) : legacy ? (pass === '1400' ? 1 : legacyRow ? 1 : 3) : firstOpen;
  const show = query.get('show');
  const href = (n: Step, extra: Record<string, string> = {}): string => {
    const q = new URLSearchParams({ step: String(n), ...extra });
    return `${base}?${q.toString()}`;
  };

  const morning = useMemo(() => morningCounts(session), [session]);
  const afternoon = useMemo(() => afternoonCounts(session), [session]);
  const reviewDue = clockText(PASS_START['1400'] + REVIEW_MINUTES);
  const clockPass = passOf(session.clock);

  /* ----- the four steps, as summary cells ----- */
  const groupsQ = questionGroups();
  const noNext = afternoon.rows.filter((h) => !hasNextStep(h, session));
  const officeChange = morning.changesOpen[0] ?? morning.changes.find((c) => session.changes[c.slug]);
  const office = officeChange ? officeFor(officeChange.slug) : undefined;
  interface Cell { short: string; title: string; value: number; of?: string; foot: string; left: number; leftWords: string }
  const cells: Record<Step, Cell> =
    pass === '0900'
      ? {
          1: { short: 'Suggestions', title: 'Decide what the software suggests', value: morning.proposals.waiting, of: `of ${morning.proposals.total} left`, foot: `${morning.proposals.gateLinks} of them proof links`, left: morning.proposals.waiting, leftWords: `${plural(morning.proposals.waiting, 'suggestion')} still ${morning.proposals.waiting === 1 ? 'waits' : 'wait'}.` },
          2: { short: 'Office change', title: 'Decide each office change', value: morning.changesWaiting, of: morning.changesWaiting === 1 ? 'change waits' : 'changes wait', foot: morning.changesOpen.length ? `${morning.changesOpen.map((c) => c.county).join(', ')}: only Alice decides` : 'Nothing waits', left: morning.changesWaiting, leftWords: 'An office change still waits for Alice.' },
          3: { short: 'Calls', title: 'Make the calls that are due', value: morning.callsLeft, of: `of ${morning.calls.length} left`, foot: `${morning.officeCalls.length} to offices, ${morning.homeownerCalls.length} to homeowners`, left: morning.callsLeft, leftWords: `${plural(morning.callsLeft, 'call')} not marked as made.` },
          4: { short: 'Answers', title: 'Send the answers consultants wait for', value: morning.answersLeft, of: `of ${groupsQ.length} left`, foot: `${plural(groupsQ.length, 'question')} on ${plural(morning.questions.length, 'hearing')}`, left: morning.answersLeft, leftWords: `${plural(morning.answersLeft, 'answer')} not marked as sent.` },
        }
      : {
          1: { short: 'Daily list', title: 'Read the daily list', value: afternoon.rows.length, of: 'flagged hearings', foot: 'Read each hearing, nearest first, then mark the step done', left: 0, leftWords: '' },
          2: { short: 'Next steps', title: 'Give each one a next step', value: noNext.length, of: `of ${afternoon.rows.length} left`, foot: `By ${reviewDue}`, left: noNext.length, leftWords: `${plural(noNext.length, 'hearing')} still ${noNext.length === 1 ? 'has' : 'have'} no next step.` },
          3: { short: 'Same-day calls', title: 'Make the same-day calls', value: afternoon.sameLeft, of: `of ${afternoon.same.length} left`, foot: 'Arrival, opening, fallback, homeowner', left: afternoon.sameLeft, leftWords: `${plural(afternoon.sameLeft, 'call')} not marked as made.` },
          4: { short: 'Calendar file', title: 'Export the calendar file', value: calendarEventCount(), of: 'events in the file', foot: session.icsDownloaded ? 'Downloaded in this session' : 'Not downloaded yet', left: 0, leftWords: '' },
        };

  /* ----- mark a step done ----- */
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setConfirm(false), [step, pass]);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirm) confirmRef.current?.focus();
  }, [confirm]);
  const isDone = done.includes(step);
  const blocked = pass === '0900' && step === 2 && morning.changesWaiting > 0;
  const mark = (): void => {
    if (isDone || blocked) return;
    if (cells[step].left > 0) setConfirm(true);
    else actions.markStep(pass, step);
  };
  useKeys({ x: () => mark() });

  const headerAction = isDone ? (
    <Button size="md" variant="secondary" data-testid={`unmark-step-${step}`} onClick={() => actions.markStep(pass, step, false)}>
      Mark step {step} as not done
    </Button>
  ) : blocked ? (
    <span className="inline-flex flex-wrap items-center gap-3">
      <span className="text-small text-ink-2" data-testid="mark-step-reason">Alice decides the change first</span>
      <Button size="md" variant="primary" disabled data-testid={`mark-step-${step}`}>Mark step {step} done</Button>
    </span>
  ) : confirm ? (
    <span role="group" aria-label="Confirm" className="inline-flex flex-wrap items-center gap-3">
      <span className="text-small text-ink-2">{cells[step].leftWords} Mark it done anyway?</span>
      <Button size="md" variant="ghost" data-testid={`cancel-step-${step}`} onClick={() => setConfirm(false)}>Cancel</Button>
      <Button ref={confirmRef} size="md" variant="primary" data-testid={`confirm-step-${step}`} onClick={() => { actions.markStep(pass, step); setConfirm(false); }}>Mark done</Button>
    </span>
  ) : (
    <Button size="md" variant="primary" data-testid={`mark-step-${step}`} kbd="X" onClick={mark}>
      Mark step {step} done
    </Button>
  );

  usePageState({ page: pass === '0900' ? 'today-9am' : 'today-2pm', step, stepsDone: done, primaryAction: isDone ? `Mark step ${step} as not done` : `Mark step ${step} done` });

  /* ----- toolbar: the step's filter, the clock, the other pass ----- */
  const other = pass === '0900'
    ? <a className="l-link l-small" href="#/today/2pm" data-testid="pass-switch-1400">Go to the 2:00 p.m. review</a>
    : <a className="l-link l-small" href="#/today/9am" data-testid="pass-switch-0900">Go to the 9:00 a.m. pass</a>;
  const clock = clockPass !== pass ? (
    <span className="inline-flex flex-wrap items-center gap-3 text-small text-ink-2" data-testid="clock-mismatch">
      <span>The example clock reads {clockText(session.clock.minutes).replace(/\.$/, '')}.</span>
      <Button size="sm" variant="secondary" data-testid="clock-set-pass" onClick={() => actions.setClock(pass)}>
        Set it to {clockText(PASS_START[pass])}
      </Button>
    </span>
  ) : null;

  const segOf = (items: { id: string; label: string; count: number }[], current: string): ReactNode => (
    <Seg label="Show" current={current} items={items.map<SegItem>((i) => ({ ...i, href: href(step, i.id === items[0]!.id ? {} : { show: i.id }) }))} />
  );

  /* ----- the step's list and detail ----- */
  let toolbarLeft: ReactNode = <span className="text-small text-ink-2">{cells[step].foot}.</span>;
  let work: ReactNode;

  if (pass === '0900' && step === 1) {
    const r = proofStep({ session, show, query, legacyRow: legacyRow ? String(legacyRow.row) : null, href: (extra) => href(1, extra) });
    toolbarLeft = segOf(r.seg, r.show);
    work = r.work;
  } else if (pass === '0900' && step === 2) {
    work = (
      <Workspace split="12">
        {office ? (
          <DetailRegion head={<DecisionHead o={office} />} foot={<DecisionFoot o={office} approveOpen={query.get('approve') === '1'} />} testId="region-detail-decision">
            {/* LAYOUT 7.1, step 2: one change fills the width, the comparison left and the hearings that wait right. */}
            <div className="grid grid-cols-1 items-start xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] [&>.l-block+.l-block]:xl:border-t-0 [&>.l-block:nth-child(2)]:xl:border-l [&>.l-block:nth-child(2)]:xl:border-border [&>.l-block:nth-child(5)]:xl:border-l [&>.l-block:nth-child(5)]:xl:border-border [&>.l-block:nth-child(3)]:order-last [&>.l-block:nth-child(3)]:xl:col-span-2 [&>.l-block:nth-child(n+4)]:xl:border-t">
              <DecisionBody o={office} />
              <OfficeMessage o={office} />
            </div>
          </DetailRegion>
        ) : (
          <DetailRegion head={<h2 className="l-section">No office change waits</h2>}>
            <p className="l-block l-p l-ink2">Every office still accepts the process on the sheet. Mark this step done.</p>
          </DetailRegion>
        )}
      </Workspace>
    );
  } else {
    // A hearing list with its detail.
    let rows: Hearing[] = [];
    let groups: { id: string; title: string; rows: Hearing[] }[] = [];
    let isDoneRow: ((h: Hearing) => boolean) | null = null;
    let words: [string, string] = ['To do', 'Done'];
    if (pass === '0900' && step === 3) {
      rows = morning.calls;
      isDoneRow = (h) => !!session.called?.includes(h.case);
      words = ['To call', 'Called'];
    } else if (pass === '0900' && step === 4) {
      rows = morning.questions;
      isDoneRow = (h) => answerSent(h, session);
      words = ['To send', 'Sent'];
    } else if (pass === '1400' && step === 1) {
      rows = afternoon.rows;
    } else if (pass === '1400' && step === 2) {
      rows = afternoon.rows;
      isDoneRow = (h) => hasNextStep(h, session);
      words = ['No next step', 'Has one'];
    } else if (pass === '1400' && step === 3) {
      rows = afternoon.rows.filter(sameDay);
      isDoneRow = (h) => !!session.called?.includes(h.case);
      words = ['To call', 'Called'];
    }
    const cur = show === 'done' || show === 'all' ? show : 'todo';
    const shown = isDoneRow ? rows.filter((h) => (cur === 'all' ? true : cur === 'done' ? isDoneRow!(h) : !isDoneRow!(h))) : rows;
    if (isDoneRow) toolbarLeft = segOf([
      { id: 'todo', label: words[0], count: rows.filter((h) => !isDoneRow!(h)).length },
      { id: 'done', label: words[1], count: rows.filter((h) => isDoneRow!(h)).length },
      { id: 'all', label: 'All', count: rows.length },
    ], cur);
    // Groups: the 9:00 a.m. answers by question; the calls by whom to call; the daily list by its groups.
    if (pass === '0900' && step === 4) groups = groupsQ.map((g, i) => ({ id: `q${i}`, title: g.question, rows: g.hearings.filter((h) => shown.includes(h)) }));
    else if (step === 3) {
      const toOffice = shown.filter(ordersOfficeCall);
      groups = [{ id: 'office', title: 'Calls to offices', rows: toOffice }, { id: 'homeowner', title: 'Calls to homeowners', rows: shown.filter((h) => !toOffice.includes(h)) }];
    } else groups = dailyList().map((g) => ({ id: g.group.id, title: g.group.title, rows: g.rows.filter((h) => shown.includes(h)) }));
    groups = groups.filter((g) => g.rows.length);
    const extra: Record<string, string> = cur === 'todo' ? {} : { show: cur };
    const qGroups: QueueGroup[] = groups.map((g) => ({ id: g.id, title: g.title, items: g.rows.map<QueueItem>((h) => ({ kind: 'hearing', key: h.case, hearing: h, href: href(step, { ...extra, case: h.case }) })) }));
    const items = qGroups.flatMap((g) => g.items);
    const c = query.get('case') ?? query.get('open');
    const sel = c ? (items.find((i) => i.key === c) ?? null) : (items[0] ?? null);
    const selH = sel?.kind === 'hearing' ? sel.hearing : c ? (hearingByCase(c) ?? null) : null;
    const at = sel ? items.findIndex((i) => i.key === sel.key) : -1;
    const pager: Pager | undefined = at >= 0 ? { index: at + 1, total: items.length, prev: items[at - 1]?.href ?? null, next: items[at + 1]?.href ?? null } : undefined;
    const nextHref = at >= 0 ? (items[at + 1]?.href ?? null) : null;
    // The offices' time zone, as the Today and Hearings lists state it.
    const zones = [...new Set(items.map((i) => (i.kind === 'hearing' ? /\((UTC[^)]+)\)/.exec(i.hearing.timeZoneSentence ?? '')?.[1] : undefined)).filter(Boolean))];
    const listTitle = pass === '0900' ? (step === 3 ? 'Calls due' : 'Answers to send') : step === 1 ? 'The daily list' : step === 2 ? 'Hearings that need a next step' : 'Same-day calls';
    work = (
      <Workspace>
        <ListRegion title={listTitle} meta={<><span className="l-num">{plural(items.length, 'hearing')}, nearest first</span>{zones.length === 1 ? <span className="l-num" data-testid="pass-zone">Office time, {zones[0]}</span> : null}</>}>
          {items.length ? (
            <QueueList groups={qGroups} selected={sel?.key ?? null} caption={`${listTitle}, nearest first`} />
          ) : (
            <p className="l-block l-p l-ink2" data-testid="list-empty">{cur === 'todo' ? `Nothing left here. Mark step ${step} done.` : 'Nothing here.'}</p>
          )}
        </ListRegion>
        {selH ? (
          <HearingDetail pass={pass} step={step} h={selH} pager={pager} nextHref={nextHref} session={session} />
        ) : (
          <DetailRegion head={<h2 className="l-section">Nothing selected</h2>}>
            <p className="l-block l-p l-ink2">Pick a hearing from the list.</p>
          </DetailRegion>
        )}
      </Workspace>
    );
  }

  if (pass === '1400' && step === 4) {
    const events = icsEvents();
    work = (
      <Workspace split="12">
        <DetailRegion
          head={<h2 className="l-section">The calendar file, hearings.ics</h2>}
          foot={
            <>
              <span className="l-small l-muted">Made from the sheet. Nothing is sent to anyone.</span>
              <span style={{ display: 'inline-flex', gap: 8 }}>
                <a className={buttonClass({ variant: 'secondary', size: 'md' })} href="#/calendar">See every event</a>
                <Button
                  size="md"
                  variant="primary"
                  data-testid="step-download-ics"
                  onClick={() => {
                    downloadIcs(firstOpen === 4);
                    toast({ title: `hearings.ics downloaded (${calendarEventCount()} events)`, tone: 'success' });
                  }}
                >
                  Download hearings.ics
                </Button>
              </span>
            </>
          }
        >
          <Block title="What is in it" meta={<Src kind="measured" cell="the calendar file on the sheet" />}>
            <p className="l-p">
              <b className="l-num">{calendarEventCount()} events</b>, one for each hearing with a date and time, in the office’s own time zone.
              Consultants add the file to Google, Outlook or Apple calendars. Consultants without a digital calendar get the same by text and on paper.
            </p>
          </Block>
          <Block title="The events" meta={`${events.length}`} testId="ics-events">
            <table className="l-table">
              <caption className="l-sr">The events in hearings.ics, by day</caption>
              <colgroup><col style={{ width: 160 }} /><col /><col style={{ width: 440 }} /></colgroup>
              <thead><tr><th scope="col">Day and time</th><th scope="col">Hearing</th><th scope="col">Where</th></tr></thead>
              <tbody>
                {events.map((e) => {
                  const eh = e.caseId ? hearingByCase(e.caseId) : undefined;
                  return (
                    <tr key={e.uid}>
                      <td className="l-num"><b>{dateShort(e.day)}</b>{eh ? <span className="l-small l-muted" style={{ display: 'block' }}>{sheetTime(eh.time)}</span> : null}</td>
                      <th scope="row" style={{ fontWeight: 400 }}>{eh ? <><b>{street(eh)}</b><span className="l-small l-muted" style={{ display: 'block' }}>{eh.consultant ? `Consultant: ${String(eh.consultant)}` : 'No consultant named'}</span></> : e.summary}</th>
                      <td className="l-small l-ink2">{e.location || 'Not in the file'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Block>
        </DetailRegion>
      </Workspace>
    );
  }

  const docketView = pass === '0900' && query.get('view') === 'dockets';
  if (docketView) {
    work = <DocketsWork query={query} />;
    toolbarLeft = <span className="text-small text-ink-2">Each docket is one office and one day, offered whole in one numbered text.</span>;
  }
  const docketLink = pass === '0900' ? (
    docketView
      ? <a className="l-link l-small" href={href(step)} data-testid="link-dockets">Back to step {step}</a>
      : <a className="l-link l-small" href="#/today/9am?view=dockets" data-testid="link-dockets">Dockets and offer texts ({docketCount()})</a>
  ) : null;
  const stepLinks = pass === '0900' && !docketView ? (
    <>
      <a className="l-link l-small" href="#/suggestions" data-testid="step-link-suggestions">All suggestions</a>
      {officeChange ? <a className="l-link l-small" href={`#/offices/${officeChange.slug}`} data-testid={`step-link-office-${officeChange.slug}`}>{office?.county ?? officeChange.county} office</a> : null}
    </>
  ) : null;
  const complete = done.length === 4;
  const completeLine = pass === '0900'
    ? `Pass complete: ${morning.proposals.total - morning.proposals.waiting} of ${morning.proposals.total} suggestions decided, ${morning.calls.length - morning.callsLeft} of ${morning.calls.length} calls made, ${groupsQ.length - morning.answersLeft} of ${groupsQ.length} answers sent.`
    : `Review complete: ${afternoon.rows.length - noNext.length} of ${afternoon.rows.length} flagged hearings have a next step, ${afternoon.same.length - afternoon.sameLeft} of ${afternoon.same.length} same-day calls made.`;

  return (
    <Page fit>
      <div data-testid="page-today" style={{ display: 'contents' }}>
        <PageHeader
          title={pass === '0900' ? 'The 9:00 a.m. pass' : 'The 2:00 p.m. review'}
          line={complete ? <span data-testid="pass-complete"><b className="l-strong">{completeLine}</b></span> : pass === '0900' ? 'Four steps, in order. Decide each item, then mark the step done.' : `By ${reviewDue}, give each flagged hearing a step, owner and time.`}
          actions={headerAction}
        />
        <Summary label={`The four steps of the ${pass === '0900' ? '9:00 a.m. pass' : '2:00 p.m. review'}`} testId="pass-stepper">
          {([1, 2, 3, 4] as Step[]).map((n) => {
            const c = cells[n];
            const d = done.includes(n);
            return (
              <Stat
                key={n}
                testId={`pass-step-${n}`}
                label={`${n}. ${c.short}${d ? ', done' : ''}`}
                value={c.value}
                of={c.of}
                foot={c.title}
                source={<Src kind="measured" cell={n === 1 && pass === '0900' ? 'Reader suggestions' : 'Hearings, daily list'} />}
                href={href(n)}
                current={n === step}
                name={`Step ${n}: ${c.title}. ${c.value} ${c.of ?? ''}${d ? '. Done' : ''}`}
              />
            );
          })}
        </Summary>
        <Toolbar left={toolbarLeft} right={<span className="inline-flex flex-wrap items-center gap-4">{clock}{docketLink}{stepLinks}{other}</span>} />
        {work}
      </div>
    </Page>
  );
}

/* ---------- step 1 of the 9:00 a.m. pass: what the software suggests ---------- */

function proofStep({ session, show, query, legacyRow, href }: { session: Session; show: string | null; query: URLSearchParams; legacyRow: string | null; href: (extra?: Record<string, string>) => string }) {
  const p = session.proposals;
  const rows = suggestions().filter((s) => needOf(s) === 'decide').sort((a, b) => Number(isProof(b)) - Number(isProof(a)) || a.row - b.row);
  const cur = show === 'decided' || show === 'all' ? show : 'waiting';
  const shown = rows.filter((s) => (cur === 'all' ? true : cur === 'decided' ? decided(s, p) : !decided(s, p) || KEPT.has(s.row)));
  const extra: Record<string, string> = cur === 'waiting' ? {} : { show: cur };
  const asked = query.get('item') ?? legacyRow;
  const sel = shown.find((s) => String(s.row) === asked) ?? rows.find((s) => String(s.row) === asked) ?? shown.find((s) => !decided(s, p)) ?? shown[0] ?? null;
  const at = sel ? shown.indexOf(sel) : -1;
  const pager: Pager | undefined = at >= 0 ? { index: at + 1, total: shown.length, prev: shown[at - 1] ? href({ ...extra, item: String(shown[at - 1]!.row) }) : null, next: shown[at + 1] ? href({ ...extra, item: String(shown[at + 1]!.row) }) : null } : undefined;

  const items: ReviewItem[] = shown.map((s) => {
    const h = hearingByCase(s.case);
    const d = p[proposalKey(SCOPE, s.row)];
    const where = h ? street(h) : s.case;
    const title = proofTitle(s);
    return {
      id: String(s.row),
      title: <>{title}<span className="font-normal text-ink-2">, {where}</span></>,
      titleText: `${title}, ${where}, ${s.case}`,
      meta: <>{s.message ? <>Message {s.message} from <span className="font-medium text-ink">{sender(s.from)}</span></> : sender(s.from)}{h ? <>. Hearing <span className="font-medium text-ink tabular-nums">{dateShort(h.date)}</span></> : null}</>,
      href: href({ ...extra, item: String(s.row) }),
      name: shortName(title, s),
      decision: d ? { answer: d.decision, at: d.at } : null,
      resultLine: (a: ReviewAnswer) => (a === 'accepted' ? 'The coordinator types it on the sheet.' : 'The check stays open.'),
    };
  });

  const nextWaiting = (after: string): string | null => {
    const i = rows.findIndex((s) => String(s.row) === after);
    const n = rows.slice(i + 1).concat(rows.slice(0, i)).find((s) => !decided(s, p) && String(s.row) !== after);
    return n ? String(n.row) : null;
  };
  const decide = (ids: string[], answer: ReviewAnswer): void => {
    for (const id of ids) {
      const s = rows.find((x) => String(x.row) === id);
      if (!s) continue;
      KEPT.add(s.row);
      if (answer === 'accepted') actions.acceptProposal(SCOPE, s.row, targetCell(s));
      else actions.refuseProposal(SCOPE, s.row, targetCell(s));
    }
    if (sel && ids.includes(String(sel.row))) {
      const n = nextWaiting(String(sel.row));
      if (n) navigate(href({ ...extra, item: n }), { replace: true });
    }
  };
  const undo = (ids: string[]): void => {
    for (const id of ids) actions.undoProposal(SCOPE, Number(id));
  };
  const keyOf = (id: string): string => proposalKey(SCOPE, Number(id));
  const textOf = (id: string): string => items.find((i) => i.id === id)?.titleText ?? id;
  /** The open card's Accept and Refuse: the same toast, Undo and notifications row as the list. */
  const decideFromCard = (ids: string[], answer: ReviewAnswer): void => {
    decide(ids, answer);
    for (const id of ids) {
      toast({
        title: `${answer === 'accepted' ? 'Accepted' : 'Refused'} here: ${textOf(id)}`,
        body: answer === 'accepted' ? 'The coordinator types it on the sheet.' : 'The check stays open.',
        tone: answer === 'accepted' ? 'success' : 'info',
        action: { label: 'Undo', run: () => undo([id]) },
        key: keyOf(id),
      });
    }
  };
  const undoFromCard = (ids: string[]): void => {
    for (const id of ids) {
      const answered = p[keyOf(id)]?.decision === 'refused' ? 'Refused' : 'Accepted';
      undoByKey(keyOf(id), () => undo([id]), `${answered} here: ${textOf(id)}`);
    }
  };

  const count = (f: (s: Suggestion) => boolean): number => rows.filter(f).length;
  const accepted = rows.filter((s) => p[proposalKey(SCOPE, s.row)]?.decision === 'accepted').length;
  const refused = rows.filter((s) => p[proposalKey(SCOPE, s.row)]?.decision === 'refused').length;

  const work = (
    <Workspace>
      <ReviewQueue
        items={items}
        title="Suggestions to decide"
        selected={sel ? String(sel.row) : null}
        noun={['suggestion', 'suggestions']}
        totals={{ total: rows.length, accepted, refused }}
        dateText={clockLabel(session.clock)}
        doneText="Every suggestion has an answer. Mark step 1 done."
        emptyText={cur === 'decided' ? 'Nothing decided yet.' : 'Nothing waits.'}
        testId="review"
        onDecide={decide}
        onUndo={undo}
        actionKey={keyOf}
        batchFacts={(chosen, answer) => [
          { label: 'Suggestions', value: chosen.map((i) => i.titleText).slice(0, 5).join('; ') + (chosen.length > 5 ? `; and ${chosen.length - 5} more` : '') },
          { label: 'Then', value: answer === 'accepted' ? 'The coordinator types each one on the sheet.' : 'Each check stays open.' },
        ]}
      />
      {sel ? <ProofDetail s={sel} pager={pager} session={session} onDecide={decideFromCard} onUndo={undoFromCard} /> : (
        <DetailRegion head={<h2 className="l-section">Nothing waits</h2>}>
          <p className="l-block l-p l-ink2">Every suggestion has an answer.</p>
        </DetailRegion>
      )}
    </Workspace>
  );
  return {
    show: cur,
    seg: [
      { id: 'waiting', label: 'Waiting', count: count((s) => !decided(s, p)) },
      { id: 'decided', label: 'Decided', count: count((s) => decided(s, p)) },
      { id: 'all', label: 'All', count: rows.length },
    ],
    work,
  };
}

/** Rows answered while the page is open stay in the Waiting list with their Undo (LAYOUT 5.7). */
const KEPT = new Set<number>();

function ProofDetail({ s, pager, session, onDecide, onUndo }: { s: Suggestion; pager?: Pager; session: Session; onDecide: (ids: string[], a: ReviewAnswer) => void; onUndo: (ids: string[]) => void }) {
  const h = hearingByCase(s.case);
  const m = s.message ? messageById(s.message) : undefined;
  const d = session.proposals[proposalKey(SCOPE, s.row)];
  const title = proofTitle(s);
  const where = h ? street(h) : s.case;
  /* The list row names the street; the detail's buttons leave it out, so no two controls share a name. */
  const short = shortName(title, s);
  const quote = isProof(s) && s.words && !/^Rule /.test(s.words);
  const suggestion = isProof(s)
    ? <>Count <b>{title.toLowerCase()}</b> as done for <b>{where}</b>, with message {s.message} as the proof.</>
    : <><b>{title}</b>: {capsToSentence(proposedWords(s))}.</>;
  return (
    <DetailRegion
      testId="region-detail-proof"
      head={
        <>
          <div className="l-detailhead-row">
            <h2 className="l-section l-clip" data-testid="detail-title">{title}</h2>
            {pager ? (
              <span className="l-pager" data-testid="detail-pager">
                <span>{pager.index} of {pager.total}</span>
                {pager.prev ? <a href={pager.prev} aria-label="Previous suggestion" data-testid="detail-prev"><ChevronLeft aria-hidden size={16} /></a> : <span aria-disabled="true" data-testid="detail-prev"><ChevronLeft aria-hidden size={16} /></span>}
                {pager.next ? <a href={pager.next} aria-label="Next suggestion" data-testid="detail-next"><ChevronRight aria-hidden size={16} /></a> : <span aria-disabled="true" data-testid="detail-next"><ChevronRight aria-hidden size={16} /></span>}
              </span>
            ) : null}
          </div>
          <State tone={d ? (d.decision === 'accepted' ? 'accent' : 'neutral') : 'warn'} testId="proof-state">{d ? (d.decision === 'accepted' ? 'Accepted here' : 'Refused here') : 'Waiting for your answer'}</State>
          <dl className="l-facts">
            <div style={{ minWidth: 0 }}><dt>Hearing</dt><dd>{h ? <><a className="l-link" href={`#/hearings/${h.case}`}>{where}</a><span className="l-small l-muted" style={{ display: 'block' }}>{dateShort(h.date)}, {sheetTime(h.time)}</span></> : s.case}</dd></div>
            <div style={{ minWidth: 0 }}><dt>Office</dt><dd>{h ? h.county : 'Not on file'}</dd></div>
            <div style={{ minWidth: 0 }}><dt>From</dt><dd>{sender(s.from)}</dd></div>
          </dl>
        </>
      }
      foot={
        d ? (
          <>
            <span role="status" className="l-small" data-testid="proof-result">
              <span className="l-strong">{d.decision === 'accepted' ? 'Accepted.' : 'Refused.'}</span>{' '}
              <span className="l-ink2">{d.decision === 'accepted' ? 'The coordinator types it on the sheet.' : 'The check stays open.'}</span>
            </span>
            <Button size="md" variant="secondary" data-testid={`proof-undo-${s.row}`} aria-label={`Undo: ${short}`} onClick={() => onUndo([String(s.row)])}>Undo</Button>
          </>
        ) : (
          <>
            <span className="l-small l-muted"><span className="l-wide">Suggested by software. </span>A person decides.</span>
            <span style={{ display: 'inline-flex', gap: 8 }}>
              <Button size="md" variant="secondary" data-testid={`proof-refuse-${s.row}`} aria-label={`Refuse: ${short}`} onClick={() => onDecide([String(s.row)], 'refused')}>Refuse</Button>
              <Button size="md" variant="primary" data-testid={`proof-accept-${s.row}`} aria-label={`Accept: ${short}`} onClick={() => onDecide([String(s.row)], 'accepted')}>Accept</Button>
            </span>
          </>
        )
      }
    >
      <Block title="What the software suggests" testId={s.gate ? `proposal-${s.case}-${s.gate}` : 'proof-suggestion'}>
        <p className="l-p">{suggestion}</p>
        {!quote && s.words ? <p className="l-p l-small l-ink2" style={{ marginTop: 8 }}>Why: {why(s.words)}</p> : null}
      </Block>
      {m ? (
        <Block title={`Message ${s.message}`} meta={messageTime(m.at)} testId="proof-message">
          <p className="l-small l-ink2 l-p" style={{ marginBottom: 8 }}>
            From <span className="l-strong">{m.sender}</span>, by {m.channel}. {quote ? 'The words it relies on are marked.' : ''}
          </p>
          <blockquote className="l-p" style={{ margin: 0, paddingLeft: 12, borderLeft: '2px solid var(--border-strong)', whiteSpace: 'pre-wrap' }}>
            <MarkedBody body={m.body} words={quote ? s.words : ''} />
          </blockquote>
        </Block>
      ) : null}
      {h ? <Checks h={h} /> : null}
      <div className="l-block">
        <SheetRef>
          <span><span className="l-mono l-muted">Reader suggestions row {s.row}</span> {s.cell}</span>
          <span>If accepted, the coordinator types yes in <span className="l-mono">{answerCell(s.row)}</span>{isProof(s) ? <> and the link to message {s.message} in <span className="l-mono">{targetCell(s)}</span></> : <> and the value in <span className="l-mono">{targetCell(s)}</span></>}.</span>
        </SheetRef>
      </div>
    </DetailRegion>
  );
}

/* ---------- a hearing's detail on steps 3 and 4, and the 2:00 p.m. review ---------- */

function HearingDetail({ pass, step, h, pager, nextHref, session }: { pass: Pass; step: Step; h: Hearing; pager?: Pager; nextHref: string | null; session: Session }) {
  const call = (pass === '0900' && step === 3) || (pass === '1400' && step === 3);
  const answer = pass === '0900' && step === 4;
  const next = pass === '1400' && step === 2;
  const called = !!session.called?.includes(h.case);
  const sent = answerSent(h, session);
  const line = callLine(h);
  let foot: ReactNode = (
    <>
      <span className="l-small l-muted"><span className="l-wide">Suggested by software. </span>A person decides.</span>
      <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={`#/hearings/${h.case}`} data-testid="open-full">Open hearing {h.case}</a>
    </>
  );
  if (call) {
    foot = called ? (
      <>
        <span role="status" className="l-small" data-testid={`call-state-${h.case}`}><span className="l-strong">Call marked as made.</span> <span className="l-ink2">Note what was said on the sheet.</span></span>
        <Button size="md" variant="secondary" data-testid={`call-undo-${h.case}`} aria-label={`Undo: call for ${street(h)}`} onClick={() => actions.markCalled(h.case, false)}>Undo</Button>
      </>
    ) : (
      <>
        <span className="l-small l-muted">A person makes the call.</span>
        <Button size="md" variant="primary" data-testid={`call-made-${h.case}`} aria-label={`Mark the call for ${street(h)} as made`} onClick={() => { actions.markCalled(h.case, true); if (nextHref) navigate(nextHref, { replace: true }); }}>Mark call made</Button>
      </>
    );
  } else if (answer) {
    foot = sent ? (
      <>
        <span role="status" className="l-small" data-testid={`answer-state-${h.case}`}><span className="l-strong">Answer marked as sent.</span></span>
        <Button size="md" variant="secondary" data-testid={`answer-undo-${h.case}`} aria-label={`Undo: answer for ${street(h)}`} onClick={() => actions.markSent(h.case, false)}>Undo</Button>
      </>
    ) : (
      <>
        <span className="l-small l-muted">A person sends it.</span>
        <Button size="md" variant="primary" data-testid={`answer-sent-${h.case}`} aria-label={`Mark the answer for ${street(h)} as sent`} onClick={() => { actions.markSent(h.case, true); if (nextHref) navigate(nextHref, { replace: true }); }}>Mark answer sent</Button>
      </>
    );
  }
  const tell = String(h.tellConsultant ?? '').trim();
  return (
    <DetailRegion head={<HearingHead h={h} pager={pager} />} foot={foot} testId={pass === '1400' ? 'focus-card' : 'region-detail'}>
      {call ? (
        <Block title="The call" testId="call-block">
          <dl className="l-kv">
            <dt>Who</dt><dd className="l-strong">{capFirst(line.who.replace(/^Call (the )?/, ''))}</dd>
            <dt>Number</dt><dd className="l-num">{line.number}</dd>
            {line.hours ? (<><dt>Hours</dt><dd>{line.hours}</dd></>) : null}
          </dl>
        </Block>
      ) : null}
      {answer && tell ? (
        <Block title="The answer to send" meta={h.consultant ? `To ${String(h.consultant)}` : undefined} testId="answer-block">
          <p className="l-p">{capsToSentence(tell)}</p>
        </Block>
      ) : null}
      {next ? (
        <Block title="Next step for this hearing" meta={hasNextStep(h, session) ? 'Set' : `Due by ${clockText(PASS_START['1400'] + REVIEW_MINUTES)}`} testId="next-step-block">
          <NextStepForm key={h.case} hearing={h} bare onSaved={() => { if (nextHref) navigate(nextHref, { replace: true }); }} />
        </Block>
      ) : null}
      <TodaySteps h={h} />
      <Checks h={h} />
      <CaseNotes h={h} />
      <SheetLines h={h} />
    </DetailRegion>
  );
}

/** The office's own words behind a process change, so the person who decides reads them, not a summary. */
function OfficeMessage({ o }: { o: Office }) {
  const cmp = processCompare(o);
  const n = /message (\d+)/.exec(cmp.source)?.[1];
  const m = n ? messageById(n) : undefined;
  if (!m) return null;
  return (
    <>
    <div className="l-block" data-testid="change-message">
      <div className="l-blockhead">
        <h3>What the office said, message {n}</h3>
        <span className="l-small l-muted l-num">{messageTime(m.at)}</span>
      </div>
      <p className="l-small l-ink2 l-p" style={{ marginBottom: 8 }}>From <span className="l-strong">{m.sender}</span>, by {m.channel}.</p>
      <blockquote className="l-p" style={{ margin: 0, paddingLeft: 12, borderLeft: '2px solid var(--border-strong)', whiteSpace: 'pre-wrap', maxWidth: 'var(--measure)' }}>{m.body}</blockquote>
    </div>
    <div className="l-block" data-testid="change-choices">
      <div className="l-blockhead"><h3>What each choice does</h3></div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3" style={{ margin: 0 }}>
        {[
          ['Approve new process', `${cmp.affects} ${APPROVAL_DIALOG.approveConsequence}`],
          ['Keep old process', APPROVAL_DIALOG.rejectConsequence(o.county, !!cmp.oldAccepted)],
          ['Change your mind', 'Either choice can be undone here until the coordinator records it on the sheet.'],
        ].map(([k, v]) => (
          <div key={k} className="grid content-start gap-1">
            <dt className="text-small font-semibold text-ink">{k}</dt>
            <dd className="m-0 text-small text-ink-2">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
    </>
  );
}
