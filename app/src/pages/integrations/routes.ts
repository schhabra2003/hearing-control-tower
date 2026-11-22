/**
 * The Integrations routes and palette entries. App.tsx joins them after the other route tables, so the
 * #/agents page lists them with every other route.
 */

import type { PaletteEntry, RouteDef } from '@/lib/router';
import { integrationBySlug, INTEGRATIONS } from './integrations';
import { Integrations } from './Integrations';

/** Read by layout/Shell.tsx: the page draws its own frame (<Page fit>), so the shell adds none. */
const OWN = { own: true };

export const routes: RouteDef[] = [
  { id: 'integrations', path: '/integrations', title: 'Integrations', section: 'Season one', width: 'work', ...OWN, component: Integrations },
  {
    id: 'integration',
    path: '/integrations/:slug',
    title: (p) => integrationBySlug(p.params.slug ?? '')?.name ?? 'Unknown integration',
    section: 'Season one',
    width: 'work',
    ...OWN,
    component: Integrations,
  },
];

export const palette: PaletteEntry[] = [
  { id: 'page-integrations', group: 'Pages', label: 'Integrations', keywords: ['email', 'drive', 'calendar', 'phone', 'text', 'signature', 'connect', 'simulate'], to: '/integrations' },
  ...INTEGRATIONS.map((i): PaletteEntry => ({ id: `page-integration-${i.slug}`, group: 'Pages', label: `Integrations: ${i.name}`, keywords: [i.examples], to: `/integrations/${i.slug}` })),
];
