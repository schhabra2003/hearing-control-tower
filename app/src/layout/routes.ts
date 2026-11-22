/**
 * The layout's route table. It keeps every page the team built (no placeholder anywhere), puts
 * Today at #/, moves the old Overview to "How it works" (#/how), and gives each route its sidebar
 * group, its parent crumb and its help id. Pages rebuilt on the five regions set own: true.
 */

import type { PaletteEntry, RouteDef } from '@/lib/router';
import * as b1 from '@/pages/b1/routes';
import * as b2 from '@/pages/b2/routes';
import * as b3 from '@/pages/b3/routes';
import * as integrations from '@/pages/integrations/routes';
import { makeAgentsPage } from '@/pages/agents/Agents';
import type { LayoutRoute } from './Shell';
import { Today } from './Today';
import { Ai } from './Ai';

type Group = LayoutRoute['group'];

const GROUP: Record<string, { group: Group; page: string; parent?: { title: string; href: string } }> = {
  'today-9am': { group: 'Work', page: 'pass' },
  'today-2pm': { group: 'Work', page: 'today-2pm' },
  today: { group: 'Work', page: 'pass' },
  hearings: { group: 'Work', page: 'hearings' },
  hearing: { group: 'Work', page: 'hearings', parent: { title: 'Hearings', href: '#/hearings' } },
  suggestions: { group: 'Work', page: 'suggestions' },
  paste: { group: 'Work', page: 'paste', parent: { title: 'Check messages', href: '#/suggestions' } },
  offices: { group: 'Work', page: 'offices' },
  office: { group: 'Work', page: 'offices', parent: { title: 'Offices', href: '#/offices' } },
  bench: { group: 'Records', page: 'bench' },
  replies: { group: 'Records', page: 'replies' },
  calendar: { group: 'Records', page: 'calendar' },
  measures: { group: 'Results', page: 'measures' },
  evidence: { group: 'Results', page: 'evidence' },
  integrations: { group: 'Records', page: 'integrations' },
  integration: { group: 'Records', page: 'integrations', parent: { title: 'Integrations', href: '#/integrations' } },
};

function place(r: RouteDef): LayoutRoute {
  if (r.later) return { ...r, group: 'Later', page: r.id };
  const g = GROUP[r.id] ?? { group: 'Work' as Group, page: r.id };
  return { ...r, ...g };
}

const team = [...b1.routes, ...b2.routes, ...integrations.routes, ...b3.routes];
const overview = team.find((r) => r.id === 'overview');

const own: LayoutRoute[] = [
  { id: 'overview', path: '/', title: 'Today', section: 'Today', width: 'work', group: 'Work', page: 'today', own: true, component: Today },
  { id: 'ai', path: '/ai', title: 'What the AI does', section: 'About', width: 'reading', group: 'About', page: 'ai', own: true, component: Ai },
  ...(overview ? [{ ...overview, id: 'how', path: '/how', title: 'How it works', group: 'About' as Group, page: 'overview' }] : []),
];

const kept = team.filter((r) => r.id !== 'overview').map(place);
const agentsBase: LayoutRoute = { id: 'agents', path: '/agents', title: 'For agents', section: 'About', width: 'reading', group: 'About', page: 'agents', component: () => null };
const all: LayoutRoute[] = [...own, ...kept];

export const routes: LayoutRoute[] = [...all, { ...agentsBase, component: makeAgentsPage([...all, agentsBase]) }];
export const palette: PaletteEntry[] = [...b1.palette, ...b2.palette, ...integrations.palette, ...b3.palette];
