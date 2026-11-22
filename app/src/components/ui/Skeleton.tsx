/**
 * Skeleton, SkeletonRows and SkeletonSwap: placeholders shaped like the content that is coming.
 * Adapted from the 21st.dev component "Skeleton Swap" by ddoemonn
 * (https://21st.dev/r/ddoemonn/skeleton-swap, id 23557): the skeleton appears only after a short
 * delay and then stays a minimum time, so a fast load never flashes; content and skeleton share
 * one grid cell, so nothing shifts; busy state on the region and a polite "loaded" message.
 * Changes: no spring, scale or blur (a 160 ms fade), our tokens, a table-row variant whose columns
 * follow DataTable, a soft pulse that stops under reduced motion.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block h-3 rounded-chip bg-border motion-safe:animate-pulse', className)} />;
}

const WIDTHS = ['w-[92%]', 'w-[78%]', 'w-[86%]', 'w-[64%]', 'w-[70%]'];

export interface SkeletonRowsProps {
  rows?: number;
  /** Grid template of the real table, for example "120px minmax(0,2fr) minmax(0,1fr) 140px". */
  columns: string;
  /** Height of one real row in px, so the swap does not shift the page. */
  rowHeight?: number;
  className?: string;
}

/** Placeholder rows with the real table's columns and row height. */
export function SkeletonRows({ rows = 6, columns, rowHeight = 56, className }: SkeletonRowsProps) {
  const count = columns.split(/\s+(?![^(]*\))/).length;
  return (
    <div aria-hidden className={cn('flex flex-col', className)}>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid items-center gap-4 border-b border-border px-4 last:border-b-0" style={{ gridTemplateColumns: columns, height: rowHeight }}>
          {Array.from({ length: count }, (_, c) => (
            <Skeleton key={c} className={c === 0 ? 'w-16' : WIDTHS[(r * 3 + c) % WIDTHS.length]} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Shows the skeleton only when loading lasts longer than delay ms, and then for at least minVisible ms. */
export function useSkeletonSwap(ready: boolean, delay = 120, minVisible = 400): boolean {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);
  useEffect(() => {
    if (!ready && !visible) {
      const t = window.setTimeout(() => {
        shownAt.current = performance.now();
        setVisible(true);
      }, delay);
      return () => window.clearTimeout(t);
    }
    if (ready && visible) {
      const t = window.setTimeout(() => setVisible(false), Math.max(0, minVisible - (performance.now() - shownAt.current)));
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [ready, visible, delay, minVisible]);
  return visible;
}

export interface SkeletonSwapProps {
  ready: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  /** What is loading, said to screen readers when it has loaded: "Reader rows". */
  label: string;
  delay?: number;
  minVisible?: number;
  className?: string;
  'data-testid'?: string;
}

export function SkeletonSwap({ ready, skeleton, children, label, delay, minVisible, className, 'data-testid': testId }: SkeletonSwapProps) {
  const showSkeleton = useSkeletonSwap(ready, delay, minVisible);
  const showContent = ready && !showSkeleton;
  return (
    <div data-testid={testId} aria-busy={!showContent} className={cn('grid', className)}>
      <div className={cn('col-start-1 row-start-1 min-w-0 transition-opacity duration-[var(--dur-color)] motion-reduce:transition-none', showContent ? 'opacity-100' : 'pointer-events-none opacity-0')} aria-hidden={!showContent}>
        {ready ? children : null}
      </div>
      {showSkeleton ? <div className="col-start-1 row-start-1 self-start">{skeleton}</div> : null}
      <span role="status" className="sr-only">
        {showContent ? `${label} loaded` : ''}
      </span>
    </div>
  );
}
