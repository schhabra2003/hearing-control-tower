/**
 * The five regions every work page is built from, in this order and with these landmark names:
 * Page header, Summary, Toolbar, List, Detail. A person sees the same blocks in the same places;
 * an agent finds them by role and name (getByRole('region', { name: 'List' })) on every page.
 *
 * Adapted from the main area of "Dashboard Shell" by isaiahbjork,
 * https://21st.dev/r/isaiahbjork/app-dashboard-shell (header across the width, an equal-height
 * metric row, then the work grid), through the "agent" layout panel. Changes: one card style; the
 * metric row is one card cut by hairlines; each cell is a link with a short accessible name; the
 * work grid is a list and a detail that fill the viewport and scroll inside.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';

export type Tone = 'danger' | 'warn' | 'ok' | 'neutral' | 'accent';
export type SourceKind = 'measured' | 'estimate' | 'simulated' | 'packet';

/* ---------- what the page shows, for agents ---------- */

export interface PageState {
  page: string;
  selected?: string | null;
  listCount?: number;
  primaryAction?: string;
  [k: string]: unknown;
}

let pageState: PageState = { page: '' };
const listeners = new Set<() => void>();
export const getPageState = (): PageState => pageState;
export const onPageState = (f: () => void): (() => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

/** A page reports what it shows and its primary action; the shell adds it to the desk-state block. */
export function usePageState(s: PageState): void {
  const key = JSON.stringify(s);
  useEffect(() => {
    pageState = JSON.parse(key) as PageState;
    for (const f of listeners) f();
  }, [key]);
}

/* ---------- the page and its regions ---------- */

/** The page frame. fit: the list and detail fill the viewport (work pages); without it the page scrolls (reading pages). */
export function Page({ children, fit = false }: { children: ReactNode; fit?: boolean }) {
  return (
    <div className="l-page" data-fit={fit ? '' : undefined}>
      {children}
    </div>
  );
}

export function PageHeader({ title, line, status, actions, testId }: { title: string; line?: ReactNode; status?: ReactNode; actions?: ReactNode; testId?: string }) {
  return (
    <header className="l-pagehead" role="region" aria-label="Page header" data-region="header" data-testid={testId ?? 'page-header'}>
      <div className="l-pagehead-text">
        <div className="l-pagehead-title">
          <h1 className="l-title" tabIndex={-1}>{title}</h1>
          {status}
        </div>
        {line ? <p className="l-body l-ink2 l-p" data-testid="page-line">{line}</p> : null}
      </div>
      {actions ? <div className="l-pagehead-actions">{actions}</div> : null}
    </header>
  );
}

export function Summary({ children, label, testId }: { children: ReactNode; label: string; testId?: string }) {
  return (
    <section className="l-card l-summary" aria-label="Summary" data-region="summary" data-testid={testId ?? 'summary'}>
      <h2 className="l-sr">{label}</h2>
      {children}
    </section>
  );
}

export interface StatProps {
  label: string;
  value: ReactNode;
  of?: ReactNode;
  foot: ReactNode;
  source?: ReactNode;
  tone?: Tone;
  href?: string;
  current?: boolean;
  testId: string;
  /** The accessible name of a link cell: the figure, what it counts and where the link goes. */
  name?: string;
}

/** One summary cell: label (13/18), figure (28/32), foot (13/18), 4 px apart, the same rows in every cell. */
export function Stat({ label, value, of, foot, source, tone, href, current, testId, name }: StatProps) {
  const body = (
    <>
      <span className="l-stat-label">
        <span className="l-clip" title={label}>{label}</span>
        {source}
      </span>
      <span className="l-stat-value">
        {/* A figure is never red: its foot says the target in words. */}
        <span className="l-figure" data-tone={tone} data-testid={`${testId}-value`}>
          {value}
        </span>
        {of ? <span className="l-stat-of">{of}</span> : null}
      </span>
      <span className="l-stat-foot l-clip" title={typeof foot === 'string' ? foot : undefined}>{foot}</span>
    </>
  );
  return href ? (
    <a className="l-stat" href={href} data-testid={testId} aria-label={name} aria-current={current ? 'true' : undefined}>
      {body}
    </a>
  ) : (
    <div className="l-stat" data-testid={testId}>
      {body}
    </div>
  );
}

export function Toolbar({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="l-toolbar" role="toolbar" aria-label="Toolbar" data-region="toolbar" data-testid="toolbar">
      <div className="l-toolbar-left">{left}</div>
      {right ? <div className="l-toolbar-right">{right}</div> : null}
    </div>
  );
}

export interface SegItem {
  id: string;
  label: string;
  count?: number;
  href: string;
}

/** Filters as links: each is its own URL, so Back returns to the last filter and an agent can open one directly. */
export function Seg({ items, current, label }: { items: SegItem[]; current: string; label: string }) {
  return (
    <nav className="l-seg" aria-label={label}>
      {items.map((i) => (
        <a key={i.id} href={i.href} aria-current={i.id === current ? 'page' : undefined} data-testid={`filter-${i.id}`}>
          {i.label}
          {i.count !== undefined ? <span className="l-segcount">{i.count}</span> : null}
        </a>
      ))}
    </nav>
  );
}

/** The work area. split: 7-5 (default, list-heavy), 5-7 (detail-heavy) or 12 (one item: the Detail alone). */
export function Workspace({ children, split = '7-5' }: { children: ReactNode; split?: '7-5' | '5-7' | '12' }) {
  return (
    <div className="l-work" data-split={split}>
      {children}
    </div>
  );
}

/**
 * The scrolling body of a region. When it scrolls and holds nothing a keyboard can reach (a read-only
 * table), it becomes a tab stop with a name, so a keyboard user can scroll it too (axe
 * scrollable-region-focusable).
 */
function ScrollBody({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = (): void => {
      const scrolls = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
      const reachable = el.querySelector('a[href],button:not([disabled]),input,select,textarea,summary,[tabindex]:not([tabindex="-1"])');
      if (scrolls && !reachable) {
        el.tabIndex = 0;
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', label);
      } else if (el.getAttribute('role') === 'region') {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
      }
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [label]);
  return <div className="l-scroll" ref={ref}>{children}</div>;
}

export function ListRegion({ title, meta, children, foot }: { title: string; meta?: ReactNode; children: ReactNode; foot?: ReactNode }) {
  return (
    <section className="l-card l-list" aria-label="List" data-region="list" data-testid="region-list">
      <div className="l-cardhead">
        <h2>{title}</h2>
        {meta ? <div className="l-small l-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{meta}</div> : null}
      </div>
      <ScrollBody label={title}>{children}</ScrollBody>
      {foot ? <div className="l-cardfoot">{foot}</div> : null}
    </section>
  );
}

export function DetailRegion({ head, children, foot, testId }: { head: ReactNode; children: ReactNode; foot?: ReactNode; testId?: string }) {
  return (
    <section className="l-card l-detail" aria-label="Detail" data-region="detail" data-testid={testId ?? 'region-detail'}>
      <div className="l-detailhead">{head}</div>
      <ScrollBody label="Detail">{children}</ScrollBody>
      {foot ? <div className="l-cardfoot">{foot}</div> : null}
    </section>
  );
}

export function Block({ title, meta, children, testId }: { title: string; meta?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <div className="l-block" data-testid={testId}>
      <div className="l-blockhead">
        <h3>{title}</h3>
        {meta ? <span className="l-small l-muted l-num">{meta}</span> : null}
      </div>
      {children}
    </div>
  );
}

/* ---------- small parts ---------- */

/** A state word with its dot, as one Badge. */
export function State({ tone = 'neutral', children, className, testId }: { tone?: Tone; children: ReactNode; className?: string; testId?: string }) {
  return (
    <Badge tone={tone} className={cn('l-state', className)} testId={testId}>
      {children}
    </Badge>
  );
}

const SRC_WORD: Record<SourceKind, string> = { measured: 'Measured', estimate: 'Estimate', simulated: 'Simulated', packet: 'Packet' };

/** A dot and one word; the cell is in the title and in the accessible text. */
export function Src({ kind, cell, testId }: { kind: SourceKind; cell: string; testId?: string }) {
  return (
    <span className="l-src" data-kind={kind} title={`${SRC_WORD[kind]}. ${cell}`} data-testid={testId}>
      {SRC_WORD[kind]}
      <span className="l-sr">, {cell}</span>
    </span>
  );
}

/** Cell references and sheet words, closed by default. */
export function SheetRef({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <details className="l-details" data-testid="sheet-ref">
      <summary data-testid={testId}>Sheet reference</summary>
      <div className="l-small l-ink2" style={{ display: 'grid', gap: 4, maxWidth: 'var(--measure)' }}>{children}</div>
    </details>
  );
}
