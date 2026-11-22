/**
 * RecordTable: the List region's table for the record pages (Offices, Bench, Replies, Calendar file).
 * It is the shared QueueList's anatomy (layout/QueueList.tsx: a real table with a caption, column
 * headers and a row header per item; two lines per row; status as one Badge in the middle column;
 * the key date or figure on the right), for rows that are not hearings. The classes are the
 * layout's own (l-table, l-queue, l-rowmain), so these lists look and stack like the Today list.
 *
 * Row anatomy: line 1 the name in semibold ink with a small muted code;
 * line 2 one plain sentence; the middle column one Badge (and at most one short muted line); the
 * right column one key fact in ink and one muted line. A click anywhere on the row selects it; the
 * name is a link to the same URL for keyboards and agents.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { navigate } from '@/lib/router';

export interface RecordRow {
  key: string;
  href: string;
  testId: string;
  /** Line 1, the name: "Tesswick office", "Maya Venn". */
  title: ReactNode;
  /** The accessible name of the row's link: the action and the target. */
  linkLabel: string;
  /** Small muted words after the name: a code, a state, a channel. */
  meta?: ReactNode;
  /** Line 2, one plain sentence. */
  line?: ReactNode;
  /** Middle column: a Badge and at most one short muted line. */
  side?: ReactNode;
  /** Right column, line 1 in ink. */
  right?: ReactNode;
  /** Right column, line 2 muted. */
  rightSub?: ReactNode;
  /** Words for screen readers and agents only. */
  sr?: string;
}

export interface RecordGroup {
  id: string;
  title: string;
  rows: RecordRow[];
  count?: string;
}

export interface Pager {
  index: number;
  total: number;
  prev: string | null;
  next: string | null;
}

/** "2 of 11" with the previous and next rows' URLs, over every row on screen in order. */
export function pagerOf(groups: RecordGroup[], key: string | null | undefined): Pager | undefined {
  const rows = groups.flatMap((g) => g.rows);
  const at = key ? rows.findIndex((r) => r.key === key) : -1;
  if (at < 0) return undefined;
  return { index: at + 1, total: rows.length, prev: rows[at - 1]?.href ?? null, next: rows[at + 1]?.href ?? null };
}

export function RecordTable({
  groups,
  selected,
  caption,
  heads,
  sideWidth = 184,
  rightWidth = 168,
  testId,
}: {
  groups: RecordGroup[];
  selected: string | null;
  caption: string;
  /** Column headings; leave the third empty for a two-column list. */
  heads: [string, string, string?];
  sideWidth?: number;
  rightWidth?: number;
  testId: string;
}) {
  const table = useRef<HTMLTableElement>(null);
  useEffect(() => {
    // Keep the selected row in view inside the list region; never scroll the page.
    const row = table.current?.querySelector<HTMLElement>('tr[aria-selected="true"]');
    const box = row?.closest<HTMLElement>('.l-scroll');
    if (row && box && box.scrollHeight > box.clientHeight) {
      const r = row.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      if (r.top < b.top + 40 || r.bottom > b.bottom) box.scrollTop += r.top - b.top - 40;
    }
  }, [selected]);
  const grouped = groups.length > 1;
  const three = !!heads[2];
  const cols = three ? 3 : 2;
  return (
    <table className="l-table l-queue" ref={table} data-testid={testId}>
      <caption className="l-sr">{caption}</caption>
      <colgroup>
        <col />
        <col style={{ width: sideWidth }} />
        {three ? <col style={{ width: rightWidth }} /> : null}
      </colgroup>
      <thead>
        <tr>
          <th scope="col">{heads[0]}</th>
          <th scope="col">{heads[1]}</th>
          {three ? (
            <th scope="col" className="due">
              {heads[2]}
            </th>
          ) : null}
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g.id} data-testid={`${testId}-group-${g.id}`}>
          {grouped ? (
            <tr className="l-group">
              <th scope="colgroup" colSpan={cols}>
                {g.title}{' '}
                <span className="l-num l-muted" style={{ fontWeight: 400, marginLeft: 4 }}>
                  {g.count ?? g.rows.length}
                </span>
              </th>
            </tr>
          ) : null}
          {g.rows.map((r) => (
            <tr key={r.key} aria-selected={r.key === selected} data-href={r.href} data-testid={r.testId} onClick={() => navigate(r.href.replace(/^#/, ''))}>
              <th scope="row" style={{ fontWeight: 400 }}>
                <div className="l-rowmain">
                  <div className="l-rowtop">
                    {r.key === selected ? (
                      // The open row: no link back to the page it is on.
                      <span className="l-rowaddr" aria-current="true" style={{ flex: 'none', whiteSpace: 'nowrap', overflowWrap: 'normal' }}>
                        {r.title}
                      </span>
                    ) : (
                      <a className="l-rowaddr" href={r.href} aria-label={r.linkLabel} onClick={(e) => e.stopPropagation()} style={{ flex: 'none', whiteSpace: 'nowrap', overflowWrap: 'normal' }}>
                        {r.title}
                      </a>
                    )}
                    {r.meta ? <span className="l-small l-muted l-clip">{r.meta}</span> : null}
                  </div>
                  {r.line ? <span className="l-rowstep">{r.line}</span> : null}
                </div>
              </th>
              <td>
                <div className="l-rowside">{r.side}</div>
                {!three && r.sr ? <span className="l-sr">. {r.sr}</span> : null}
              </td>
              {three ? (
                <td className="due">
                  <span className="l-due">
                    {r.right !== undefined ? <b>{r.right}</b> : null}
                    {r.rightSub !== undefined ? <span>{r.rightSub}</span> : null}
                  </span>
                  {r.sr ? <span className="l-sr">. {r.sr}</span> : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}

/** The pager in a Detail head: "2 of 11" with previous and next links (the same markup as layout/Detail). */
export function PagerLinks({ p }: { p: Pager }) {
  return (
    <span className="l-pager" data-testid="detail-pager">
      <span>
        {p.index} of {p.total}
      </span>
      {p.prev ? (
        <a href={p.prev} aria-label="Previous item" data-testid="detail-prev">
          <ChevronLeft aria-hidden size={16} />
        </a>
      ) : (
        <span aria-disabled="true" data-testid="detail-prev">
          <ChevronLeft aria-hidden size={16} />
        </span>
      )}
      {p.next ? (
        <a href={p.next} aria-label="Next item" data-testid="detail-next">
          <ChevronRight aria-hidden size={16} />
        </a>
      ) : (
        <span aria-disabled="true" data-testid="detail-next">
          <ChevronRight aria-hidden size={16} />
        </span>
      )}
    </span>
  );
}

/** The Detail head's facts: a dl of up to three term and value pairs, as layout/Detail draws them. */
export function Facts({ items }: { items: { term: string; value: ReactNode; testId?: string }[] }) {
  return (
    <dl className="l-facts">
      {items.map((f) => (
        <div key={f.term} style={{ minWidth: 0 }} data-testid={f.testId}>
          <dt>{f.term}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Label and value rows inside a Block (layout.css .l-kv): the term muted, the value in ink. */
export function KeyValues({ items, testId }: { items: { term: string; value: ReactNode; testId?: string }[]; testId?: string }) {
  const shown = items.filter((i) => i.value !== null && i.value !== undefined && i.value !== '');
  return (
    <dl className="l-kv l-body" data-testid={testId} style={{ font: 'var(--type-body)' }}>
      {shown.map((i) => (
        <div key={i.term} style={{ display: 'contents' }}>
          <dt>{i.term}</dt>
          <dd data-testid={i.testId}>{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
