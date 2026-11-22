/**
 * The routes and palette entries: Reader suggestions and Paste, Replies, Offices, Bench,
 * Calendar file. App.tsx joins it with the other two tables.
 */

import type { PaletteEntry, RouteDef } from '@/lib/router';
import { officeBySlug } from '@/lib/data';
import { Suggestions } from './Suggestions';
import { Paste } from './Paste';
import { Replies } from './Replies';
import { Offices } from './Offices';
import { Bench } from './Bench';
import { Calendar } from './Calendar';

/** Read by layout/Shell.tsx: the page draws its own frame. */
const OWN = { own: true };

export const routes: RouteDef[] = [
  { id: 'suggestions', path: '/suggestions', title: 'Check messages', section: 'Season one', width: 'work', component: Suggestions },
  { ...OWN, id: 'paste', path: '/suggestions/paste', title: 'Paste new messages', section: 'Season one', width: 'work', component: Paste },
  // Replies, Offices, Bench and Calendar file draw their own five-region frame (<Page fit>); page owner 3.
  { ...OWN, id: 'replies', path: '/replies', title: 'Replies', section: 'Season one', width: 'work', component: Replies },
  { ...OWN, id: 'offices', path: '/offices', title: 'Offices', section: 'Season one', width: 'work', component: Offices },
  {
    ...OWN,
    id: 'office',
    path: '/offices/:slug',
    title: (p) => `${officeBySlug(p.params.slug ?? '')?.county ?? 'Unknown'} office`,
    section: 'Season one',
    width: 'work',
    component: Offices,
  },
  { ...OWN, id: 'bench', path: '/bench', title: 'Bench', section: 'Season one', width: 'work', component: Bench },
  { ...OWN, id: 'calendar', path: '/calendar', title: 'Calendar file', section: 'Season one', width: 'work', component: Calendar },
];

export const palette: PaletteEntry[] = [
  { id: 'page-paste', group: 'Pages', label: 'Paste new messages', keywords: ['paste', 'new mail'], to: '/suggestions/paste' },
  { id: 'page-suggestions-cells', group: 'Pages', label: 'Reader suggestions: other cells, fixed code', keywords: ['new cells', 'fixed code'], to: '/suggestions?filter=cells' },
  { id: 'page-suggestions-offices', group: 'Pages', label: 'Reader suggestions: office changes', keywords: ['HOLD', 'process change'], to: '/suggestions?filter=offices' },
  { id: 'page-suggestions-repeats', group: 'Pages', label: 'Reader suggestions: repeats', keywords: ['REPEAT'], to: '/suggestions?filter=repeats' },
  { id: 'page-suggestions-questions', group: 'Pages', label: "Reader suggestions: consultants' questions", keywords: ['question', 'TELL'], to: '/suggestions?filter=questions' },
  { id: 'page-consultant', group: 'Pages', label: "Open a consultant's page", keywords: ['consultant page', 'phone page', 'consultant view', 'what the consultant sees'], to: '/consultant' },
  { id: 'page-docket-offers', group: 'Pages', label: 'Docket offers and day-before texts', keywords: ['docket', 'offer', 'day-before text', 'drafts', 'files message'], to: '/bench?view=dockets' },
  { id: 'cmd-export-calendar', group: 'Commands', label: 'Export the calendar file (hearings.ics)', keywords: ['export calendar', 'ics', 'download calendar'], to: '/calendar' },
  { id: 'cmd-paste-messages', group: 'Commands', label: 'Paste messages', keywords: ['paste messages', 'new messages'], to: '/suggestions/paste' },
  { id: 'cmd-approve-change', group: 'Commands', label: 'Approve or reject an office change', keywords: ['approve', 'HOLD', 'NOTICE BLOCKED'], to: '/offices?approve=1' },
];
