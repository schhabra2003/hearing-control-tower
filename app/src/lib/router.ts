/**
 * Hash routing for a one-file app opened from file://. A route is
 * "#/path?query". The route tables live in the routes.ts file of each pages folder and are joined in
 * src/layout/routes.ts; this file only matches and navigates.
 */

import { useSyncExternalStore, type ComponentType } from 'react';

export interface PageProps {
  params: Record<string, string>;
  query: URLSearchParams;
}

export type Section = 'Today' | 'Season one' | 'Later: control tower' | 'Results' | 'About';

export interface RouteDef {
  /** Stable id, for example "today-9am". */
  id: string;
  /** "/hearings/:case" style pattern. */
  path: string;
  /** Page title: the last breadcrumb and the document title. */
  title: string | ((p: PageProps) => string);
  section: Section;
  /** Work pages use the full width; reading pages cap at 1600 px. */
  width: 'work' | 'reading';
  /** A later control tower page: gets the LaterFrame band and the "Later: control tower" crumb. */
  later?: boolean;
  /** When set, the route only redirects (for example #/today to the pass the clock is in). */
  redirect?: (p: PageProps) => string;
  component?: ComponentType<PageProps>;
}

export interface PaletteEntry {
  /** cmdk value and test id suffix: data-testid="cmdk-item-<id>". */
  id: string;
  group: 'Pages' | 'Commands';
  label: string;
  /** Words that also find it. */
  keywords?: string[];
  /** A route to open, "#/hearings?filter=ready", or an action. */
  to?: string;
  run?: () => void;
  shortcut?: string;
}

export interface Location {
  /** "/hearings/AX-107" */
  path: string;
  query: URLSearchParams;
  /** The raw hash, "#/hearings/AX-107?x=1" */
  hash: string;
}

function read(): Location {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const q = raw.indexOf('?');
  const path = (q < 0 ? raw : raw.slice(0, q)) || '/';
  const query = new URLSearchParams(q < 0 ? '' : raw.slice(q + 1));
  return { path: path.startsWith('/') ? path : `/${path}`, query, hash: window.location.hash };
}

let current = read();
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = read();
  for (const f of subs) f();
});

export function useLocation(): Location {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
  );
}

/** Goes to "#/path?query" (the leading "#" is optional). */
export function navigate(to: string, { replace = false }: { replace?: boolean } = {}): void {
  const hash = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`;
  if (hash === window.location.hash) return;
  if (replace) {
    window.history.replaceState(null, '', hash);
    current = read();
    for (const f of subs) f();
  } else {
    window.location.hash = hash;
  }
}

/** Sets or clears one query parameter of the current route without adding a history entry. */
export function setQuery(key: string, value: string | null): void {
  const q = new URLSearchParams(current.query);
  if (value === null) q.delete(key);
  else q.set(key, value);
  const s = q.toString();
  navigate(`${current.path}${s ? `?${s}` : ''}`, { replace: true });
}

export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i += 1) {
    const p = a[i]!;
    const v = b[i]!;
    if (p.startsWith(':')) {
      // A malformed escape ("%E0%A4%A") is not a page: the route does not match and Not found shows.
      try {
        params[p.slice(1)] = decodeURIComponent(v);
      } catch {
        return null;
      }
    }
    else if (p !== v) return null;
  }
  return params;
}

export interface Matched {
  route: RouteDef | null;
  params: Record<string, string>;
  location: Location;
}

export function matchRoute(routes: RouteDef[], location: Location): Matched {
  for (const route of routes) {
    const params = matchPath(route.path, location.path);
    if (params) return { route, params, location };
  }
  return { route: null, params: {}, location };
}

export function titleOf(route: RouteDef, props: PageProps): string {
  return typeof route.title === 'function' ? route.title(props) : route.title;
}
