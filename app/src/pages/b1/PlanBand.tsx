/**
 * The plan in four cells, on Today (#/) and How it works (#/how): First, Next, Later and how it
 * scales, each labelled as a process change or a digital tool, with one-click links. The figures are the write-up's: counts measured on the example week, money
 * and people estimates (node cli/economics.js).
 */

import type { ReactNode } from 'react';
import { cellNumber, hearings } from '@/lib/data';
import { measure } from './measures';

const stillOn = (h: (typeof hearings)[number]): boolean => String(h.stillOn ?? 'yes').trim().toLowerCase() !== 'no';
const attended = (h: (typeof hearings)[number]): boolean => String(h.format ?? '').trim().toLowerCase() !== 'written statement';

/** "4 of 11": hearings within Settings B4 working days with no consultant's yes, of all hearings in that window. */
export function yesWindow(): { days: number; none: number; of: number; noYes: (typeof hearings)[number][] } {
  const days = cellNumber('Settings', 'B4') ?? 3;
  const inWindow = hearings.filter((h) => h.workingDays !== null && h.workingDays >= 0 && h.workingDays <= days && stillOn(h) && attended(h));
  const noYes = inWindow.filter((h) => h.gates.G2.state !== 'proved');
  return { days, none: noYes.length, of: inWindow.length, noYes };
}

/** The write-up's figures that are estimates (docs/write-up, "Scaling" and "Measures"). */
export const WRITE_UP = {
  costToday: '$104',
  coordinators: { low: '0.2', high: '3.3' },
  countyHours: '4 to 12 hours',
};

function Cell({ head, kind, children, links, testId }: { head: string; kind: string; children: ReactNode; links: { label: string; href: string; testId?: string }[]; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 py-3" data-testid={testId}>
      <p className="m-0 text-small">
        <b className="font-semibold text-ink">{head}</b> <span className="text-muted">{kind}</span>
      </p>
      <p className="m-0 text-small text-ink">
        {children}{' '}
        {links.map((l, i) => (
          <span key={l.href}>
            {i ? <span className="text-muted"> · </span> : null}
            <a className="l-link" href={l.href} data-testid={l.testId}>{l.label}</a>
          </span>
        ))}
      </p>
    </div>
  );
}

export function PlanBand() {
  const w = yesWindow();
  const perDay = measure('B15');
  const target = /^([\d.]+)/.exec(perDay.target)?.[1] ?? '2.4';
  return (
    <section aria-label="The plan: first, next, later" className="l-card grid flex-none grid-cols-4 divide-x divide-border max-[1199px]:grid-cols-2 max-[1199px]:divide-x-0 max-sm:grid-cols-1" data-testid="today-plan">
      <Cell head="First" kind="Process change" testId="plan-first" links={[{ label: '9:00 a.m. pass', href: '#/today/9am' }, { label: 'Dockets', href: '#/today/9am?view=dockets' }]}>
        A named consultant’s yes on every hearing, {w.days} working days ahead; dockets offered whole. Why: <b className="l-num">{w.none} of {w.of}</b> have none, and a miss costs the client.
      </Cell>
      <Cell head="This season’s tools" kind="Digital tools, a person decides" testId="plan-tools" links={[{ label: 'Consultant replies', href: '#/replies' }, { label: 'Reader suggestions', href: '#/suggestions' }, { label: 'Calendar', href: '#/calendar' }]}>
        A reply rule files replies; two AI readers suggest proof links; a calendar file.
      </Cell>
      <Cell head="Next, then later" kind="Process, then a tool not built" testId="plan-later" links={[{ label: 'Bench of consultants', href: '#/bench' }, { label: 'Cost and savings', href: '#/later/business', testId: 'link-cost' }]}>
        Fuller days, <b className="l-num">{perDay.display || '1.7'}</b> to <b className="l-num">{target}</b> hearings. A control tower only if it pays. Day 1: under <b className="l-num">{WRITE_UP.costToday}</b> a hearing, pick cases first.
      </Cell>
      <Cell head="How it scales" kind="Estimate" testId="plan-scale" links={[{ label: 'Scale', href: '#/later/scale' }, { label: 'Counties', href: '#/later/counties' }, { label: 'Every question answered', href: '#/how?at=questions', testId: 'link-questions' }]}>
        300 to 5,000 a year: <b className="l-num">{WRITE_UP.coordinators.low}</b> to <b className="l-num">{WRITE_UP.coordinators.high}</b> coordinators a peak week. New county: one row, {WRITE_UP.countyHours}.
      </Cell>
    </section>
  );
}
