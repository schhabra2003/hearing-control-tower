/**
 * A list to pick from, for the reading pages that use the list and detail layout (Measures and
 * costs, How we know, What the AI does, For agents). It is the same table as the Today queue
 * (layout/QueueList.tsx): a real table with a caption, a row header per item and group rows, two
 * lines per row (the name in ink, then one plain line), and a right column for the figure. The name
 * is a link to the item's own URL, and the whole row selects it too, so a person and an agent pick
 * an item the same way and Back returns to the last one.
 *
 * The pager in the detail head is the one HearingHead draws (layout/Detail.tsx), with the same test
 * ids, because Detail.tsx does not export it.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { navigate } from '@/lib/router';
import type { Pager } from '@/layout/Detail';

export interface PickRow {
  key: string;
  href: string;
  /** Line 1: the name, in ink and semibold. */
  title: ReactNode;
  /** The accessible name of the row's link, when the title alone does not say where it goes. */
  name?: string;
  /** Small and muted, after the name on line 1. */
  meta?: ReactNode;
  /** Line 2: one plain sentence. */
  line?: ReactNode;
  /** The right column: the figure or the state. */
  right?: ReactNode;
  /** Under the figure, small. */
  rightSub?: ReactNode;
  testId?: string;
}

export interface PickGroup {
  id: string;
  title: string;
  rows: PickRow[];
  count?: ReactNode;
  testId?: string;
}

export function PickList({ groups, selected, caption, columns, rightWidth = 168 }: { groups: PickGroup[]; selected: string | null; caption: string; columns: [string, string]; rightWidth?: number }) {
  const table = useRef<HTMLTableElement>(null);
  useEffect(() => {
    // Scroll the list region only, never the page.
    const row = table.current?.querySelector<HTMLElement>('tr[aria-selected="true"]');
    const box = row?.closest<HTMLElement>('.l-scroll');
    if (row && box && box.scrollHeight > box.clientHeight) {
      const r = row.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      if (r.top < b.top + 40 || r.bottom > b.bottom) box.scrollTop += r.top - b.top - 40;
    }
  }, [selected]);
  const groupRows = groups.length > 1 || groups.some((g) => g.title);
  return (
    <table className="l-table l-queue" ref={table}>
      <caption className="l-sr">{caption}</caption>
      <colgroup>
        <col />
        <col style={{ width: rightWidth }} />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">{columns[0]}</th>
          <th scope="col" className="due">{columns[1]}</th>
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g.id} data-testid={g.testId}>
          {groupRows ? (
            <tr className="l-group">
              <th scope="colgroup" colSpan={2}>
                {g.title} <span className="l-num l-muted" style={{ fontWeight: 400, marginLeft: 4 }}>{g.count ?? g.rows.length}</span>
              </th>
            </tr>
          ) : null}
          {g.rows.map((r) => (
            <tr key={r.key} aria-selected={r.key === selected} data-href={r.href} data-testid={r.testId} onClick={() => navigate(r.href)}>
              <th scope="row" style={{ fontWeight: 400 }}>
                <div className="l-rowmain">
                  <div className="l-rowtop">
                    <a className="l-rowaddr" href={r.href} aria-label={r.name} onClick={(e) => e.stopPropagation()}>
                      {r.title}
                    </a>
                    {r.meta ? <span className="l-small l-muted l-clip">{r.meta}</span> : null}
                  </div>
                  {r.line ? <span className="l-rowstep l-ink2">{r.line}</span> : null}
                </div>
              </th>
              <td className="due">
                <span className="l-due">
                  {r.right !== undefined ? <b className="l-num">{r.right}</b> : null}
                  {r.rightSub ? <span>{r.rightSub}</span> : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}

/** The selected row: the key in the URL when it names a row, else the first row. */
export function pick<T extends { key: string }>(rows: T[], key: string | null): T | null {
  return rows.find((r) => r.key === key) ?? rows[0] ?? null;
}

export function pagerFor(rows: { key: string; href: string }[], key: string | null): Pager | undefined {
  const at = rows.findIndex((r) => r.key === key);
  if (at < 0) return undefined;
  return { index: at + 1, total: rows.length, prev: rows[at - 1]?.href ?? null, next: rows[at + 1]?.href ?? null };
}

/** The detail head: the h2, the pager on the right, then an optional state line and facts. */
export function PickHead({ title, pager, children, testId = 'detail-title' }: { title: ReactNode; pager?: Pager; children?: ReactNode; testId?: string }) {
  return (
    <>
      <div className="l-detailhead-row">
        <h2 className="l-section l-clip" data-testid={testId}>{title}</h2>
        {pager ? (
          <span className="l-pager" data-testid="detail-pager">
            <span>{pager.index} of {pager.total}</span>
            {pager.prev ? (
              <a href={pager.prev} aria-label="Previous item" data-testid="detail-prev"><ChevronLeft aria-hidden size={16} /></a>
            ) : (
              <span aria-disabled="true" data-testid="detail-prev"><ChevronLeft aria-hidden size={16} /></span>
            )}
            {pager.next ? (
              <a href={pager.next} aria-label="Next item" data-testid="detail-next"><ChevronRight aria-hidden size={16} /></a>
            ) : (
              <span aria-disabled="true" data-testid="detail-next"><ChevronRight aria-hidden size={16} /></span>
            )}
          </span>
        ) : null}
      </div>
      {children}
    </>
  );
}

/** Three facts in the detail head, as the hearing head shows them. */
export function HeadFacts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="l-facts">
      {items.map(([term, value]) => (
        <div key={term} style={{ minWidth: 0 }}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
