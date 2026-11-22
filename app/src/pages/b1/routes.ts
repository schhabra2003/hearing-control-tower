/**
 * The routes and palette entries: Overview, Today, Hearings and the hearing page, Measures.
 * App.tsx joins it with the other two tables.
 */

import type { PaletteEntry, RouteDef } from '@/lib/router';
import { getSession, passOf } from '@/lib/store';
import { Overview } from './Overview';
import { Today } from './Today';
import { HearingPage, HearingsPage } from './HearingPage';
import { Measures } from './Measures';

/** The page draws its own frame with the layout's <Page> (read by layout/Shell.tsx). */
const OWN_FRAME = { own: true };

export const routes: RouteDef[] = [
  { id: 'overview', path: '/', title: 'Overview', section: 'About', width: 'reading', component: Overview },
  {
    id: 'today',
    path: '/today',
    title: 'Today',
    section: 'Today',
    width: 'work',
    redirect: (p) => {
      const q = p.query.toString();
      return `${passOf(getSession().clock) === '0900' ? '/today/9am' : '/today/2pm'}${q ? `?${q}` : ''}`;
    },
  },
  // The passes draw their own five-region frame (<Page fit>); `own` tells the layout shell not to add one.
  Object.assign({ id: 'today-9am', path: '/today/9am', title: 'The 9:00 a.m. pass', section: 'Today', width: 'work', component: Today } as RouteDef, { own: true }),
  Object.assign({ id: 'today-2pm', path: '/today/2pm', title: 'The 2:00 p.m. review', section: 'Today', width: 'work', component: Today } as RouteDef, { own: true }),
  { ...OWN_FRAME, id: 'hearings', path: '/hearings', title: 'Hearings', section: 'Season one', width: 'work', component: HearingsPage },
  { ...OWN_FRAME, id: 'hearing', path: '/hearings/:case', title: (p) => `Hearing ${p.params.case ?? ''}`, section: 'Season one', width: 'work', component: HearingPage },
  { ...OWN_FRAME, id: 'measures', path: '/measures', title: 'Measures and costs', section: 'Season one', width: 'reading', component: Measures },
];

export const palette: PaletteEntry[] = [
  { id: 'page-hearings-ready', group: 'Pages', label: 'Hearings that are ready', keywords: ['READY'], to: '/hearings?filter=ready' },
  { id: 'page-hearings-blocked', group: 'Pages', label: 'Hearings whose notice waits for approval', keywords: ['NOTICE BLOCKED', 'hold'], to: '/hearings?filter=blocked' },
  { id: 'page-hearings-nobody', group: 'Pages', label: 'Hearings with no consultant', keywords: ['NOBODY NAMED', 'no consultant'], to: '/hearings?filter=nobody' },
  { id: 'page-hearings-need-yes', group: 'Pages', label: 'Hearings that need a consultant’s yes now', keywords: ['at risk', 'need one now'], to: '/hearings?filter=at-risk' },
  { id: 'cmd-start-9am', group: 'Commands', label: 'Start the 9:00 a.m. pass', keywords: ['start the 9:00', '9am', 'morning pass'], to: '/today/9am' },
  { id: 'page-dockets', group: 'Pages', label: 'Dockets and their offer texts', keywords: ['docket', 'offer text', 'numbered text', 'YES ALL', 'offer'], to: '/today/9am?view=dockets' },
  { id: 'page-replacement', group: 'Pages', label: 'Find a replacement consultant (28 Willow Lane)', keywords: ['replacement', 'backup', 'ill', 'cancel', 'cannot attend', 'ladder'], to: '/hearings/AX-102' },
  { id: 'page-settlement', group: 'Pages', label: 'Settlement owed: 16 Birch Lane, Priya Marden signs', keywords: ['settlement', 'signer', 'signature'], to: '/hearings/AX-109' },
  { id: 'page-withdrawal', group: 'Pages', label: 'Withdrawal owed: 42 Birch Lane', keywords: ['withdrawal', 'withdraw', 'signed statement'], to: '/hearings/AX-110' },
  { id: 'page-withdrawal-pending', group: 'Pages', label: 'Withdrawal sent, not processed: 18 Maple Lane', keywords: ['withdrawal', 'not processed'], to: '/hearings/AX-117' },
  { id: 'page-date-change', group: 'Pages', label: 'Date-change rule (9 Orchard Road)', keywords: ['date change', 'move a hearing', 'reschedule', 'move'], to: '/hearings/AX-105' },
  { id: 'page-arrival-rule', group: 'Pages', label: 'Arrival rule: Fenwick Vale, 15 minutes early', keywords: ['arrival', '15 minutes', 'Fenwick Vale'], to: '/hearings/AX-113' },
  { id: 'page-cost', group: 'Pages', label: 'Cost and savings', keywords: ['cost', 'money', 'budget', 'savings', 'fee', 'business case'], to: '/later/business' },
  { id: 'cmd-export-calendar', group: 'Commands', label: 'Export the calendar file (hearings.ics)', keywords: ['export calendar', 'ics', 'calendar file'], to: '/today/2pm?step=4' },
  { id: 'cmd-export-json', group: 'Commands', label: 'Export hearings as JSON', keywords: ['export JSON', 'json', 'download hearings'], to: '/hearings' },
  { id: 'page-how-complete', group: 'Pages', label: 'How we know a hearing is complete', keywords: ['complete', 'done', 'proof', 'how do we know', 'five checks'], to: '/how' },
  { id: 'page-records-disagree', group: 'Pages', label: 'Case records that disagree (11 of 24)', keywords: ['records', 'case system', 'disagree', 'Friday check'], to: '/measures?ref=wu-records' },
  { id: 'page-writeup-measures', group: 'Pages', label: 'Measures from the write-up', keywords: ['kpi', 'guardrail', 'targets', 'measures'], to: '/measures?goal=writeup' },
];
