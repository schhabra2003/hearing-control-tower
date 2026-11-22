/**
 * How it works (#/how): the old Overview's content without its hero, as a
 * reading page. Page header (title, the goal in one line, the tour), Summary (the example week in
 * four numbers), then one row of four equal cards and one row of three, each with a short title, a
 * few plain lines and one link, and last the index of the assignment's questions (copy.ts).
 * Work lives on Today; this page explains, one click away from it.
 */

import { ArrowRight, Play } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { NotBuiltTag } from '@/components/ui/NotBuiltTag';
import { Progress } from '@/components/ui/Progress';
import { OVERVIEW_KPIS, OVERVIEW_QUESTIONS, recordsLine } from '@/lib/copy';
import { cellNumber, engine, hearings, listOrder, offices } from '@/lib/data';
import { allWaiting } from '@/lib/decisions';
import { groupDigits } from '@/lib/format';
import { navigate, type PageProps } from '@/lib/router';
import { actions, useSession, type Pass } from '@/lib/store';
import { afternoonCounts, passDone } from '@/lib/today';
import { startTour } from '@/tour/Tour';
import { changesWaiting, checkRows } from '@/layout/model';
import { PageHeader, Src, Stat, Summary, usePageState } from '@/layout/Regions';
import { measure, targetLine } from './measures';
import { yesWindow } from './PlanBand';

/** Settings B4: the working days a hearing is at the top of the list. Read from the sheet, with no default. */
const TOP_DAYS = cellNumber('Settings', 'B4');
const daysWords = TOP_DAYS === null ? 'ahead of time' : `${TOP_DAYS} working days ahead`;

function Card({ id, title, testId, span, meta, link, children }: { id: string; title: string; testId?: string; span: 3 | 4; meta?: ReactNode; link: { label: string; href: string; testId?: string }; children: ReactNode }) {
  return (
    <section className={`l-card col-span-12 flex flex-col ${span === 3 ? 'min-[1200px]:col-span-3' : 'min-[1200px]:col-span-4'}`} aria-labelledby={id} data-testid={testId}>
      <div className="l-cardhead">
        <h2 id={id}>{title}</h2>
        {meta}
      </div>
      <div className="l-cardbody flex-1">
        <ul className="grid gap-3">{children}</ul>
      </div>
      <div className="l-cardfoot">
        <a className="l-link inline-flex items-center gap-1" href={link.href} data-testid={link.testId}>
          {link.label} <ArrowRight aria-hidden className="size-3.5" />
        </a>
      </div>
    </section>
  );
}

/** One line of a card: a short lead in ink, the rest in normal text, and an optional figure. */
function Line({ lead, children, testId }: { lead?: string; children: ReactNode; testId?: string }) {
  return (
    <li className="l-p" data-testid={testId}>
      {lead ? <b className="font-semibold">{lead} </b> : null}
      {children}
    </li>
  );
}

/** The write-up's strip, with the owner of each step. */
const STRIP: { step: string; what: string; owner: string; by: string }[] = [
  { step: 'Notice', what: 'The county’s notice makes a row.', owner: 'coordinator', by: 'Person' },
  { step: 'Docket', what: 'One office, one day, offered whole in one numbered text.', owner: 'coordinator', by: 'Person sends' },
  { step: 'Yes for the slot', what: 'The consultant’s own reply.', owner: 'consultant', by: 'Rule files it' },
  { step: 'Week ahead', what: 'YES ALL to Wednesday’s text.', owner: 'consultant', by: 'Rule files it' },
  { step: 'Day before', what: 'YES to a text that names the date.', owner: 'consultant; coordinator phones if none', by: 'Rule, then a person' },
  { step: 'Morning', what: 'ARRIVED or IN, or a call.', owner: 'consultant; coordinator calls if none', by: 'Rule, then a person' },
  { step: 'Result', what: 'Result and any error, logged that day.', owner: 'coordinator', by: 'Person' },
];

const PASS_TITLE: Record<Pass, string> = { '0900': 'The 9:00 a.m. pass', '1400': 'The 2:00 p.m. review' };

function PassLine({ pass, waits }: { pass: Pass; waits: string }) {
  const done = useSession((s) => passDone(s, pass).length);
  const go = (): void => {
    actions.setClock(pass);
    navigate(pass === '0900' ? '/today/9am' : '/today/2pm');
  };
  return (
    <li data-testid={`pass-card-${pass}`} className="grid gap-1">
      <span className="flex items-center justify-between gap-2">
        <b className="font-semibold">{PASS_TITLE[pass]}</b>
        <Button size="sm" variant="secondary" data-testid={`pass-continue-${pass}`} aria-label={`${done === 0 ? 'Start' : done === 4 ? 'Review' : 'Continue'} ${PASS_TITLE[pass].replace(/^The /, 'the ')}`} onClick={go}>
          {done === 0 ? 'Start' : done === 4 ? 'Review' : 'Continue'}
        </Button>
      </span>
      <span className="l-small l-ink2">{waits}</span>
      <Progress value={done} max={4} label={`${done} of 4 steps done`} />
    </li>
  );
}

/** "11 of 24" from the Record check tab, as the Records line reads it; else the Measures value. */
function recordsFigure(): { value: string; of?: string } {
  const m = /differ on (\d+) of (\d+)/.exec(recordsLine());
  if (m) return { value: m[1]!, of: `of ${m[2]}` };
  return { value: measure('B4').display };
}

/**
 * The proof question opens a ready hearing with its five checks, and the plan has its own entry.
 * The questions themselves are copy.ts's; only these links are set here.
 */
const QUESTION_HREF: Record<string, string> = { proof: '#/hearings/AX-121' };
const PLAN_QUESTION = { id: 'plan', title: 'First, next and later', answer: 'This season first; fuller days next; a control tower later.', href: '#/later/how' };

export function Overview({ query }: PageProps) {
  const at = query.get('at');
  useEffect(() => {
    if (at !== 'questions') return;
    window.requestAnimationFrame(() => document.querySelector('[data-testid="how-questions"]')?.scrollIntoView({ block: 'start' }));
  }, [at]);
  const s = useSession((x) => x);
  const changes = changesWaiting(s);
  const waiting = allWaiting(s.proposals);
  const a = afternoonCounts({ nextSteps: s.nextSteps, called: s.called });
  const noStep = a.rows.length - a.withStep.length;
  const perDay = measure('B15');
  const perDayTarget = /^([\d.]+)/.exec(perDay.target)?.[1];
  const totals = engine.scale?.totals;
  const yw = yesWindow();
  const first = listOrder()[0];
  const checks = first ? checkRows(first, s).map((r) => r.name) : [];
  const b3 = measure('B3');
  const rec = recordsFigure();
  usePageState({ page: 'how', primaryAction: 'Start the tour' });

  const kpi = (ref: keyof typeof OVERVIEW_KPIS): { label: string; href: string } => {
    const k = OVERVIEW_KPIS[ref];
    return ref === 'B3' && TOP_DAYS !== null ? { ...k, label: `No yes within ${TOP_DAYS} working days` } : k;
  };

  return (
    <div data-testid="page-overview" className="contents">
      <PageHeader
        title="How it works"
        testId="overview-hero"
        line={`The goal: a consultant’s yes on every hearing, ${daysWords}.`}
        actions={
          <Button size="md" variant="primary" data-testid="tour-start" icon={<Play aria-hidden className="size-4" />} onClick={() => startTour(1)}>
            Start the tour
          </Button>
        }
      />
      <Summary label="The example week in four numbers" testId="overview-kpis">
        <Stat testId="kpi-1" label={kpi('B3').label} value={b3.display} of={`of ${yw.of}`} tone={b3.overTarget ? 'danger' : undefined} foot={targetLine(b3.target)} source={<Src kind="measured" cell="Measures B3" />} href={kpi('B3').href} name={`${b3.display} hearings with no yes in time. Show them`} />
        <Stat testId="kpi-2" label={kpi('B11').label} value={measure('B11').display} of={`of ${hearings.length}`} foot="Ready or confirmed" source={<Src kind="measured" cell="Measures B11" />} href={kpi('B11').href} name={`${measure('B11').display} hearings ready now. Show them`} />
        <Stat testId="kpi-3" label={kpi('B98').label} value={measure('B98').display} foot={targetLine(measure('B98').target)} source={<Src kind="measured" cell="Measures B98" />} href={kpi('B98').href} name={`${measure('B98').display} notices wait for approval. Show them`} />
        <Stat testId="kpi-4" label={kpi('B4').label} value={rec.value} of={rec.of} foot={targetLine(measure('B4').target)} source={<Src kind="measured" cell="Record check C1" />} href="#/measures?ref=B4" name={`${rec.value} ${rec.of ?? ''} records disagree. Show the measure`} />
      </Summary>

      <div className="grid grid-cols-12 gap-[var(--grid-gutter)]">
        <Card id="how-plan" title="First, next and later" span={3} testId="how-plan" link={{ label: 'See the plan for later', href: '#/later/how' }}>
          <Line lead="First, this season." testId="layer-season-one">
            Every hearing covered, {daysWords}. Why: <b className="l-num">{yw.none} of {yw.of}</b> in that window have no yes, and a missed hearing costs the client and the firm.
          </Line>
          <Line lead="Next." testId="layer-next">
            Fuller consultant-days: <b className="l-num">{perDay.display}</b> now{perDayTarget ? `, target ${perDayTarget}` : ''}. Why: the consultant fee is most of the cost. <Src kind="measured" cell="Measures B15" />
          </Line>
          <Line lead="Later." testId="layer-later">
            A control tower, only if timed minutes show it pays in cash. <NotBuiltTag />
          </Line>
          <Line lead="Day 1 check." testId="fee-check">
            Count the fee a hearing earns. Under <b className="l-num">$104</b>, first decide which cases go to a hearing. <Src kind="estimate" cell="node cli/economics.js" />
          </Line>
        </Card>

        <Card id="how-day" title="The daily process" span={3} testId="passes-card" link={{ label: 'Open Today', href: '#/', testId: 'open-today' }}>
          <PassLine pass="0900" waits={`${waiting} suggestions and ${changes.length === 1 ? '1 office change' : `${changes.length} office changes`} wait.`} />
          <PassLine pass="1400" waits={`${noStep} of ${a.rows.length} hearings have no next step yet.`} />
        </Card>

        <Card id="how-proof" title="How done is proven" span={3} testId="how-proof" link={{ label: 'See a ready hearing’s five proofs', href: '#/hearings?filter=ready' }}>
          {checks.map((c, i) => (
            <Line key={c}>
              <span className="l-num l-muted">{i + 1}.</span> {c}
            </Line>
          ))}
          <Line>Each closes only with a link to the message that proves it.</Line>
        </Card>

        <Card id="how-ai" title="What the AI does" span={3} testId="how-ai" link={{ label: 'What it does and never does', href: '#/ai' }}>
          <Line lead="Two readers">propose which message proves each check.</Line>
          <Line lead="A person">accepts or refuses every proposal.</Line>
          <Line lead="Auto-filing is off.">Nothing is sent or filed by itself.</Line>
          <Line lead="Why:">on unseen mail, <b className="l-num">73 of 81</b> agreed readings were right in the live run of Nov 22; about 1 in 10 was wrong. <Src kind="measured" cell="live-readers-22nov.md, unseen set 2" /></Line>
          <Line lead="Cost:"><b className="l-num">$1.16</b> for 550 requests, 0 failed. <Src kind="measured" cell="live-readers-22nov.md" /></Line>
        </Card>

        <Card id="how-county" title="A new county or process" span={4} testId="how-county" link={{ label: 'Open Offices', href: '#/offices' }}>
          <Line lead="An office is a row of data,">not code: <b className="l-num">{offices().length}</b> offices in the example. <Src kind="packet" cell="Offices tab" /></Line>
          <Line lead="A changed process waits">for the owner’s approval: <b className="l-num">{changes.length}</b> now.</Line>
          <Line lead="Adding a county:" testId="county-effort"><b className="l-num">4 to 12</b> person-hours to read its rules, add the row and check it. <Src kind="estimate" cell="SOLUTION_DESIGN.md section 9" /></Line>
        </Card>

        <Card id="how-scale" title="How it scales" span={4} testId="how-scale" link={{ label: 'See the scale runs', href: '#/later/scale' }}>
          {totals ? (
            <Line lead="Simulated:">
              <b className="l-num">{groupDigits(totals.hearings)}</b> hearings, <b className="l-num">{totals.safety}</b> safety rules broken. <Src kind="simulated" cell="node cli/scale.js" />
            </Line>
          ) : null}
          <Line lead="A normal year:" testId="scale-table-line">
            at 300, 1,000 and 5,000 hearings, <b className="l-num">0.2, 0.7 and 3.3</b> coordinators a peak week; cost a hearing <b className="l-num">$103, $95 and $98</b>. <Src kind="estimate" cell="node cli/economics.js" />
          </Line>
          <Line lead="Two levers:">fuller consultant-days, and a new county as one row of data.</Line>
        </Card>

        <Card id="how-know" title="How we know it is true" span={4} testId="how-know" link={{ label: 'Open How we know', href: '#/evidence' }}>
          <Line lead="Every check">is listed with the line it printed.</Line>
          <Line lead="Every figure">carries its label: Measured, Simulated, Estimate or Packet.</Line>
        </Card>
      </div>

      <section aria-labelledby="strip-title" className="l-card" data-testid="how-strip">
        <div className="l-cardhead">
          <h2 id="strip-title">One hearing, from notice to result</h2>
          <span className="l-small l-muted">Person: a person acts. Rule: the reply rule files the answer.</span>
        </div>
        <ol className="grid grid-cols-7 max-[1199px]:grid-cols-2 max-sm:grid-cols-1" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {STRIP.map((s, i) => (
            <li key={s.step} className="flex min-w-0 flex-col gap-1 border-border px-4 py-3 [&+&]:border-l" data-testid={`strip-step-${i + 1}`}>
              <span className="text-small leading-5 text-muted l-num">{i + 1}</span>
              <b className="text-body leading-6 font-semibold text-ink">{s.step}</b>
              <span className="text-small leading-5 text-ink-2">{s.what}</span>
              <span className="text-small leading-5 text-ink"><span className="font-medium">Owner:</span> {s.owner}</span>
              <span className="text-small leading-5 font-medium text-ink">{s.by}</span>
            </li>
          ))}
        </ol>
        <p className="l-small l-ink2 px-4 pb-3" style={{ margin: 0, borderTop: '1px solid var(--border)', paddingTop: 12 }} data-testid="strip-escalation">
          No day-before YES by noon: the coordinator phones. At 2:00 p.m. or on a NO, it goes to the next on Ask next; at 4:00 p.m., the office’s alternate; after 4:00 p.m., phone down Ask next.
        </p>
      </section>

      <section aria-labelledby="questions-title" className="l-card" data-testid="how-questions">
        <div className="l-cardhead"><h2 id="questions-title">Where each question is answered</h2></div>
        <ul className="grid grid-cols-2 max-[1199px]:grid-cols-1">
          {[...OVERVIEW_QUESTIONS.map((q) => ({ ...q, href: QUESTION_HREF[q.id] ?? q.href })), PLAN_QUESTION].map((q) => (
            <li key={q.id} className="border-b border-border">
              <a href={q.href} className="group flex items-baseline gap-3 px-4 py-3 hover:bg-surface-2" data-testid={`question-${q.id}`}>
                <span className="w-[232px] shrink-0 text-body font-semibold text-ink group-hover:text-accent max-sm:w-auto">{q.title}</span>
                <span className="min-w-0 flex-1 text-body text-ink-2">{q.answer}</span>
                <ArrowRight aria-hidden className="size-4 shrink-0 self-center text-accent" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
