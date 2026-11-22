/**
 * LayoutShell: the frame of every page. It replaces
 * components/shell/AppShell.tsx and keeps the team's command palette, key help, toasts, tour,
 * error boundary and Not found page.
 * - Top bar, 56 px: brand (over the sidebar), breadcrumb, "Search or run a command" (Ctrl K),
 *   the integrations strip (from 1600 px), where the readers' answers come from (Live AI or
 *   Recorded answers), the "Example week" clock in neutral ink, "?" help, notifications and the theme switch.
 * - Sidebar, 248 px (232 below 1600): Work, Records, Results, About, then Later folded. Below
 *   640 px the team's PhoneBar replaces it. The brand is a plain wordmark (no mark).
 * - Main: the page. Work pages fill the viewport (Page fit); reading pages scroll.
 * - <script type="application/json" id="desk-state"> equals window.hearingDesk.state().
 *
 * Sources: "Sidebar" by wensity, https://21st.dev/r/wensity/sidebar (36 px rows, icon, label and a
 * count, the current row tinted); "Sidebar Nav Group" by felipemenezes098,
 * https://21st.dev/r/felipemenezes098/collapsible-05 (the folded group is one button with
 * aria-expanded, its links out of the DOM while folded); the header trail of "Dashboard Shell" by
 * isaiahbjork, https://21st.dev/r/isaiahbjork/app-dashboard-shell.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BarChart3, BookOpen, Bot, Building2, CalendarDays, ChevronRight, CircleHelp, Clock3, Code2, FileCheck2, Gavel, Inbox, LayoutList, Moon, Plug,
  Reply, Search, Sun, Sunrise, Users, Workflow, X,
} from 'lucide-react';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { ABOUT, AboutDialog } from '@/components/shell/AboutDialog';
import { AppKeyHelp } from '@/components/shell/AppKeyHelp';
import { NotFound } from '@/components/shell/NotFound';
import { PageErrorBoundary } from '@/components/shell/PageErrorBoundary';
import { PhoneBar } from '@/components/shell/PhoneBar';
import { PHONE, useMedia } from '@/lib/media';
import { Toaster, clearLog, clearToasts, setStamp } from '@/components/ui/Toast';
import { NotificationsButton } from '@/components/feedback/Notifications';
import { FirstRunPrompt, useFirstRun } from '@/components/feedback/FirstRunPrompt';
import { IconButton } from '@/components/ui/IconButton';
import { Tooltip } from '@/components/ui/Tooltip';
import { KeyCombo } from '@/components/ui/Kbd';
import { LiveChip } from '@/components/ui/LiveChip';
import { IntegrationsStrip } from '@/pages/integrations/IntegrationsStrip';
import { resetSimulations } from '@/pages/integrations/simulate';
import { clockText } from '@/lib/format';
import { Tour, startTour } from '@/tour/Tour';
import { deskViewJson, installHearingDesk, setDeskLocation } from '@/lib/agentApi';
import { CLOCK_COPY, PAGES } from '@/lib/copy';
import { hearings } from '@/lib/data';
import { proposalCounts } from '@/lib/decisions';
import { downloadIcs } from '@/lib/ics';
import { useKeys } from '@/lib/keys';
import { focusPageHeading } from '@/lib/returnFocus';
import { matchRoute, navigate, titleOf, useLocation, type PageProps, type PaletteEntry, type RouteDef } from '@/lib/router';
import { actions, clockLabel, getSession, useSession } from '@/lib/store';
import { passDone } from '@/lib/today';
import { toggleTheme, useTheme } from '@/lib/theme';
import { atRiskList, changesWaiting } from './model';
import { onPageState } from './Regions';
import { workflowsFor } from './workflows';

/** A route of the layout: the team's RouteDef plus its sidebar group, its parent page and its help id. */
export interface LayoutRoute extends RouteDef {
  /** The help and workflow id: today, pass, hearings, offices, measures, ai, agents, or the team's page id. */
  page: string;
  /** The sidebar group and the first crumb. */
  group: 'Work' | 'Records' | 'Results' | 'About' | 'Later';
  parent?: { title: string; href: string };
  /** The page draws its own frame with <Page> (the layout's pages); the team's pages get a plain frame. */
  own?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  match: (path: string) => boolean;
  count?: () => { n: number | string; due?: boolean; name: string } | null;
  testId: string;
}

const starts = (p: string) => (path: string) => path === p || path.startsWith(`${p}/`);

function useNav(): { label: string; items: NavItem[] }[] {
  const s = useSession((x) => x);
  return [
    {
      label: 'Work',
      items: [
        { href: '#/', label: 'Today', icon: <LayoutList />, match: (p) => p === '/', testId: 'nav-today', count: () => { const n = atRiskList().length + changesWaiting(s).length; return { n, due: true, name: n === 1 ? 'item needs action today' : 'items need action today' }; } },
        { href: '#/today/9am', label: '9:00 a.m. pass', icon: <Sunrise />, match: starts('/today/9am'), testId: 'nav-today-9am', count: () => ({ n: `${passDone(s, '0900').length}/4`, name: 'of 4 steps done' }) },
        { href: '#/today/2pm', label: '2:00 p.m. review', icon: <Clock3 />, match: starts('/today/2pm'), testId: 'nav-today-2pm', count: () => ({ n: `${passDone(s, '1400').length}/4`, name: 'of 4 steps done' }) },
        { href: '#/hearings', label: 'Hearings', icon: <Gavel />, match: starts('/hearings'), testId: 'nav-hearings', count: () => ({ n: hearings.length, name: 'hearings' }) },
        { href: '#/suggestions', label: 'Check messages', icon: <Inbox />, match: starts('/suggestions'), testId: 'nav-suggestions', count: () => { const n = proposalCounts(s.proposals, s.pasted).waiting; return { n, name: n === 1 ? 'suggestion waits' : 'suggestions wait' }; } },
        { href: '#/offices', label: 'Offices', icon: <Building2 />, match: starts('/offices'), testId: 'nav-offices', count: () => { const n = changesWaiting(s).length; return n ? { n, due: true, name: 'office change to decide today' } : null; } },
      ],
    },
    {
      label: 'Records',
      items: [
        { href: '#/bench', label: 'Bench', icon: <Users />, match: starts('/bench'), testId: 'nav-bench' },
        { href: '#/replies', label: 'Replies', icon: <Reply />, match: starts('/replies'), testId: 'nav-replies' },
        { href: '#/calendar', label: 'Calendar file', icon: <CalendarDays />, match: starts('/calendar'), testId: 'nav-calendar' },
        { href: '#/integrations', label: 'Integrations', icon: <Plug />, match: starts('/integrations'), testId: 'nav-integrations' },
      ],
    },
    {
      label: 'Results',
      items: [
        { href: '#/measures', label: 'Measures and costs', icon: <BarChart3 />, match: starts('/measures'), testId: 'nav-measures' },
        { href: '#/evidence', label: 'How we know', icon: <FileCheck2 />, match: starts('/evidence'), testId: 'nav-evidence' },
      ],
    },
    {
      label: 'About',
      items: [
        { href: '#/how', label: 'How it works', icon: <BookOpen />, match: starts('/how'), testId: 'nav-how' },
        { href: '#/ai', label: 'What the AI does', icon: <Bot />, match: starts('/ai'), testId: 'nav-ai' },
        { href: '#/agents', label: 'For agents', icon: <Code2 />, match: starts('/agents'), testId: 'nav-agents' },
      ],
    },
  ];
}

const FOLD_KEY = 'hd.nav.later.v1';

function readFold(): boolean {
  try {
    return window.localStorage.getItem(FOLD_KEY) === 'open';
  } catch {
    return false;
  }
}

function Sidebar({ path, later, foot }: { path: string; later: { title: string; href: string }[]; foot: ReactNode }) {
  const groups = useNav();
  const onLater = path.startsWith('/later/');
  const [open, setOpen] = useState(() => readFold() || onLater);
  const toggle = () => {
    setOpen((o) => {
      try {
        window.localStorage.setItem(FOLD_KEY, o ? 'closed' : 'open');
      } catch {
        /* Storage blocked: the fold resets on the next visit. */
      }
      return !o;
    });
  };
  return (
    <nav className="l-sidebar" aria-label="Main" data-testid="sidebar">
      {groups.map((g) => (
        <div key={g.label} className="l-navgroup">
          <h2 className="l-navlabel">{g.label}</h2>
          <ul className="l-navlist">
            {g.items.map((i) => {
              const c = i.count?.();
              return (
                <li key={i.href}>
                  <a className="l-nav" href={i.href} aria-current={i.match(path) ? 'page' : undefined} data-testid={i.testId}>
                    <span aria-hidden>{i.icon}</span>
                    <span className="l-clip">{i.label}</span>
                    {c ? (
                      <span className="l-navcount" data-due={c.due ? '' : undefined}>
                        {c.due ? <span className="l-dot" data-tone="danger" aria-hidden /> : null}
                        {c.n}
                        <span className="l-sr"> {c.name}</span>
                      </span>
                    ) : <span />}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="l-later">
        <button type="button" aria-expanded={open} aria-controls="nav-later-list" onClick={toggle} data-testid="later-nav-frame-toggle">
          <ChevronRight aria-hidden />
          Later
          <span className="l-tag">Not built, {later.length} pages</span>
        </button>
        {open ? (
          <ul className="l-navlist" id="nav-later-list">
            {later.map((l) => (
              <li key={l.href}>
                <a className="l-nav" href={l.href} aria-current={path === l.href.slice(1) ? 'page' : undefined}>
                  <span aria-hidden><Workflow /></span>
                  <span className="l-clip">{l.title}</span>
                  <span />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {foot}
    </nav>
  );
}

/** The sidebar's foot: whose desk this is, what it is for, and what is not real. */
function SideFoot({ onAbout, firstRun }: { onAbout: () => void; firstRun: ReactNode }) {
  return (
    <div className="l-sidefoot" data-testid="sidebar-about">
      {firstRun}
      <p className="l-body l-strong l-p">{ABOUT.firm}</p>
      <p className="l-small l-ink2 l-p">{ABOUT.what}. Fictional data; nothing is sent.</p>
      <button type="button" className="l-link l-small l-plainbtn" onClick={onAbout} data-testid="about-open">
        About this prototype
      </button>
    </div>
  );
}

function Help({ page, onClose }: { page: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const copyId = page === 'today' ? 'overview' : page === 'pass' ? 'today-9am' : page;
  const help = (PAGES as Record<string, { help: readonly string[] } | undefined>)[copyId]?.help;
  const flows = workflowsFor(page);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', k);
    return () => {
      window.removeEventListener('keydown', k);
      back?.focus();
    };
  }, [onClose]);
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-label="Help for this page" className="l-help" data-testid="page-help-panel">
      <div className="l-cardhead">
        <h2>Help for this page</h2>
        <IconButton label="Close help" onClick={onClose} data-testid="page-help-close">
          <X aria-hidden />
        </IconButton>
      </div>
      <div className="l-cardbody" style={{ display: 'grid', gap: 16 }}>
        {page === 'today' ? <p className="l-ink2 l-p">Today lists what needs action: decisions only the owner makes, then the hearings at risk. Select an item to see what to do, who does it and by when.</p> : help ? <p className="l-ink2 l-p">{help.join(' ')}</p> : null}
        {flows.map((f) => (
          <div key={f.id} style={{ display: 'grid', gap: 8 }}>
            <h3 className="l-body l-strong" style={{ margin: 0 }}>{f.title}</h3>
            <ol className="l-small l-ink2">
              {f.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </div>
        ))}
        <a className="l-link l-small" href="#/agents">The same steps for agents</a>
      </div>
    </div>
  );
}

/** Keeps <script id="desk-state"> equal to window.hearingDesk.state() after every route change and decision. */
function DeskState({ hash }: { hash: string }) {
  const session = useSession((s) => s);
  const [tick, setTick] = useState(0);
  useEffect(() => onPageState(() => setTick((t) => t + 1)), []);
  useEffect(() => {
    let el = document.getElementById('desk-state');
    if (!el) {
      el = document.createElement('script');
      el.setAttribute('type', 'application/json');
      el.id = 'desk-state';
      document.head.appendChild(el);
    }
    el.textContent = deskViewJson();
  }, [hash, session, tick]);
  return null;
}


const SELECT_KEYS = ['case', 'open', 'decide', 'item'];

/**
 * Escape closes what a row opened: the selected hearing or decision leaves the URL and
 * focus goes back to that row's link. A dialog, a menu or a text field keeps its own Escape. When an
 * overlay closes and focus is left nowhere (the tour), focus goes back to the control that opened it.
 */
function useEscapeCloses(path: string, query: URLSearchParams): void {
  const lastOutside = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const inOverlay = (el: Element | null): boolean => !!el?.closest('[role="dialog"],[role="alertdialog"],[data-tour],[data-testid="tour"]');
    const onFocus = (e: FocusEvent): void => {
      const t = e.target;
      if (t instanceof HTMLElement && t !== document.body && !inOverlay(t) && !t.matches('h1')) lastOutside.current = t;
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      const a = document.activeElement;
      const typing = a instanceof HTMLElement && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
      const overlay = document.querySelector('[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]');
      if (!typing && !overlay && !e.defaultPrevented) {
        const sel = SELECT_KEYS.map((k) => [k, query.get(k)] as const).find(([, v]) => v);
        const caseMatch = /^\/hearings\/([^/]+)$/.exec(path);
        const id = sel?.[1] ?? caseMatch?.[1] ?? null;
        if (id) {
          e.preventDefault();
          const q = new URLSearchParams(query);
          for (const k of SELECT_KEYS) q.delete(k);
          q.delete('approve');
          const base = caseMatch && !sel ? '/hearings' : path;
          const rest = q.toString();
          navigate(`${base}${rest ? `?${rest}` : ''}`);
          const back = (): void => {
            const row =
              document.querySelector<HTMLElement>(`[data-testid="open-${CSS.escape(id)}"]`) ??
              document.querySelector<HTMLElement>(`[data-testid="open-decide-${CSS.escape(id)}"]`) ??
              document.querySelector<HTMLElement>(`#main a[href*="${CSS.escape(id)}"]`);
            row?.focus();
          };
          window.setTimeout(back, 60);
          return;
        }
      }
      // An overlay closed by Escape (the tour) and left focus nowhere: give it back.
      window.setTimeout(() => {
        const now = document.activeElement;
        if (now && now !== document.body) return;
        const back = lastOutside.current?.isConnected ? lastOutside.current : document.querySelector<HTMLElement>('[data-testid="tour-start"]');
        if (back) back.focus();
        else focusPageHeading();
      }, 120);
    };
    document.addEventListener('focusin', onFocus);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('focusin', onFocus);
      window.removeEventListener('keydown', onKey);
    };
  }, [path, query]);
}

export function LayoutShell({ routes, palette }: { routes: LayoutRoute[]; palette: PaletteEntry[] }) {
  const loc = useLocation();
  const theme = useTheme();
  const clock = useSession((s) => s.clock);
  const phone = useMedia(PHONE);
  const [help, setHelp] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  installHearingDesk(routes);
  setDeskLocation(loc);
  const firstRun = useFirstRun();
  const touring = useSession((s) => s.tourStep !== null);
  useEffect(() => setStamp(() => clockText(getSession().clock.minutes)), []);

  const { route, params } = useMemo(() => matchRoute(routes, loc), [routes, loc]);
  const r = route as LayoutRoute | null;
  const props: PageProps = useMemo(() => ({ params, query: loc.query }), [params, loc.query]);
  const title = r ? titleOf(r, props) : 'Not found';
  const later = useMemo(() => routes.filter((x) => x.group === 'Later' && !x.path.includes(':')).map((x) => ({ title: typeof x.title === 'string' ? x.title : x.id, href: `#${x.path}` })), [routes]);

  useEffect(() => {
    if (r?.redirect) navigate(r.redirect(props), { replace: true });
  }, [r, props]);
  useEffect(() => {
    document.title = `${title} | Hearing Desk, Alice’s Law Firm`;
    setHelp(false);
  }, [title]);
  useEffect(() => clearToasts(), [loc.path]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.requestAnimationFrame(focusPageHeading);
    return () => window.cancelAnimationFrame(id);
  }, [loc.path]);

  const commands: PaletteEntry[] = useMemo(
    () => [
      { id: 'cmd-today', group: 'Pages', label: 'Today: what needs action', keywords: ['home', 'at risk', 'queue', 'work', 'overview'], to: '/' },
      { id: 'cmd-measures', group: 'Pages', label: 'Measures and costs', keywords: ['kpi', 'kpis', 'measures', 'targets', 'results', 'records that disagree'], to: '/measures' },
      { id: 'cmd-agents', group: 'Pages', label: 'Open the page for agents', keywords: ['agents', 'api', 'json', 'for agents', 'window.hearingDesk'], to: '/agents' },
      { id: 'cmd-ai', group: 'Pages', label: 'What the agents and the AI do', keywords: ['agents', 'ai', 'what the ai does', 'readers', 'reader', 'automation', 'what the agents do'], to: '/ai' },
      { id: 'cmd-2pm', group: 'Commands', label: 'Do the 2:00 p.m. review', keywords: ['2pm', '2:00', 'afternoon review', 'review', 'two'], to: '/today/2pm' },
      { id: 'cmd-consultant', group: 'Commands', label: 'Open a consultant’s phone page', keywords: ['consultant page', 'consultant view', 'phone page', 'what a consultant sees', 'consultant'], to: '/consultant' },
      { id: 'cmd-scale', group: 'Commands', label: 'Run the scale simulation', keywords: ['scale', 'simulation', 'volume', 'grow', '5,000', '1,000', 'more hearings'], to: '/later/scale' },
      { id: 'cmd-county', group: 'Commands', label: 'Add a county or change its process', keywords: ['add a county', 'new county', 'county', 'counties', 'playbook', 'local process'], to: '/later/counties' },
      { id: 'cmd-proof', group: 'Pages', label: 'How we know the work is complete', keywords: ['how do we know', 'complete', 'done', 'proof', 'tests', 'evidence', 'checks'], to: '/evidence' },
      { id: 'cmd-how', group: 'Pages', label: 'How it works: priorities and the five checks', keywords: ['how it works', 'priorities', 'first next later', 'plan', 'complete', 'done', 'five checks', 'how done is proven'], to: '/how' },
      { id: 'cmd-about', group: 'Commands', label: 'About this prototype', keywords: ['about', 'fictional', 'nothing is sent', 'control tower', 'alice'], run: () => setAboutOpen(true) },
      { id: 'cmd-approve', group: 'Commands', label: 'Decide an office’s process change', keywords: ['approve', 'tesswick', 'change'], to: '/?decide=tesswick' },
      { id: 'cmd-ics', group: 'Commands', label: 'Download hearings.ics now', keywords: ['export calendar', 'download calendar', 'ics', 'calendar', 'export'], run: downloadIcs },
      { id: 'cmd-tour', group: 'Commands', label: 'Start the tour', shortcut: 'T', run: () => startTour(1) },
      { id: 'cmd-theme', group: 'Commands', label: 'Switch light and dark', shortcut: 'Shift D', run: toggleTheme },
      { id: 'cmd-keys', group: 'Commands', label: 'Show all keys', shortcut: '?', run: () => setKeysOpen(true) },
      { id: 'cmd-reset', group: 'Commands', label: 'Reset the example', keywords: ['clear', 'start again'], run: () => { if (window.confirm('Reset the example? Every decision made here is cleared.')) { actions.reset(); resetSimulations(); clearLog(); } } },
    ],
    [],
  );

  useKeys({
    'mod+k': () => setPaletteOpen((o) => !o),
    'g o': () => navigate('/'),
    'g h': () => navigate('/hearings'),
    'g f': () => navigate('/offices'),
    'g m': () => navigate('/measures'),
    'g i': () => navigate('/integrations'),
    'shift+?': () => setKeysOpen(true),
    'shift+d': toggleTheme,
  }, !paletteOpen && !keysOpen && !aboutOpen);

  useEscapeCloses(loc.path, loc.query);

  const Page = r?.component;
  return (
    <div className="l-app" data-testid="app-shell" data-phone={phone ? '' : undefined}>
      <a href="#main" className="l-sr" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to the page</a>
      <header className="l-topbar" data-testid="topbar">
        <a className="l-brand" href="#/" data-testid="brand" aria-label="Hearing Desk, Alice’s Law Firm. Today">
          <span>Hearing Desk</span>
          <span className="l-brand-sub">{ABOUT.firm}</span>
        </a>
        <nav className="l-crumbs" aria-label="Breadcrumb" data-testid="breadcrumb">
          <ol>
            <li>{r?.group ?? 'Hearing Desk'}</li>
            {r?.parent ? (
              <li>
                <ChevronRight aria-hidden size={14} />
                <a href={r.parent.href}>{r.parent.title}</a>
              </li>
            ) : null}
            <li>
              <ChevronRight aria-hidden size={14} />
              <span aria-current="page">{title}</span>
            </li>
          </ol>
        </nav>
        <div className="l-topright">
          <button type="button" className="l-search" onClick={() => setPaletteOpen(true)} aria-keyshortcuts="Control+K" data-testid="search-open">
            <Search aria-hidden size={16} />
            <span>Search<span className="l-wide"> or run a command</span></span>
            <KeyCombo keys={['Ctrl', 'K']} size="sm" aria-hidden />
          </button>
          <span className="l-wide">
            <IntegrationsStrip />
          </span>
          <LiveChip />
          <Tooltip content={CLOCK_COPY.description} side="bottom">
            <span className="l-clock" data-testid="sim-clock" tabIndex={0} aria-describedby="sim-clock-desc">
              <span className="l-clock-pill">{CLOCK_COPY.pill}</span>
              <b>{clockLabel(clock)}</b>
              <span className="l-sr" id="sim-clock-desc">{CLOCK_COPY.description}</span>
            </span>
          </Tooltip>
          <IconButton label="Help for this page" aria-expanded={help} onClick={() => setHelp((v) => !v)} data-testid="page-help">
            <CircleHelp aria-hidden />
          </IconButton>
          <NotificationsButton />
          <IconButton label={theme.resolved === 'dark' ? 'Use light theme' : 'Use dark theme'} keys={['Shift', 'D']} onClick={toggleTheme} data-testid="theme-toggle">
            {theme.resolved === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
          </IconButton>
        </div>
      </header>
      {phone ? (
        <PhoneBar path={loc.path} />
      ) : (
        <Sidebar
          path={loc.path}
          later={later}
          foot={
            <SideFoot
              onAbout={() => setAboutOpen(true)}
              firstRun={firstRun.show && !touring ? <FirstRunPrompt inline onTour={() => { firstRun.choose('tour'); startTour(1); }} onSkip={() => firstRun.choose('skip')} /> : null}
            />
          }
        />
      )}
      <main id="main" tabIndex={-1} className="l-main" data-page={r?.page ?? 'not-found'}>
        {r && !r.redirect && Page ? (
          <PageErrorBoundary key={loc.path}>
            {!r.own ? (
              <div className="l-page">
                <Page {...props} />
              </div>
            ) : (
              <Page {...props} />
            )}
          </PageErrorBoundary>
        ) : null}
        {!r ? (
          <div className="l-page">
            <NotFound path={loc.path} />
          </div>
        ) : null}
      </main>
      {help && r ? <Help page={r.page} onClose={() => setHelp(false)} /> : null}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} entries={[...commands, ...palette]} />
      <AppKeyHelp open={keysOpen} onOpenChange={setKeysOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <Toaster className="left-[calc(var(--shell-sidebar)+16px)]" />
      <Tour />
      {phone && firstRun.show && !touring ? (
        <FirstRunPrompt
          onTour={() => {
            firstRun.choose('tour');
            startTour(1);
          }}
          onSkip={() => firstRun.choose('skip')}
        />
      ) : null}
      <DeskState hash={loc.hash} />
    </div>
  );
}
