/**
 * The work queue: a real table (caption, column headers, a row header per item) whose rows read like
 * a queue. The first line names the hearing, the second says what to do in full (never cut); the
 * state and the checks sit in the middle column, the deadline and the owner on the right.
 * The case number is a link to the item's URL, and the whole row selects it too, so a person and an
 * agent pick an item the same way.
 *
 * The row layout is the "ops" panel's (reason first, deadline right), which keeps every word at
 * 1440 px; the table semantics and the URL per selection are the "agent" panel's. Two lines per row
 *: the address with the case number small and muted, then the action in
 * full; status is one Badge and the checks one Progress ("3 of 5 checks done", jshguo's
 * interfaces-progress on 21st.dev) in the middle column; the deadline and the owner on the right.
 *
 * Sources: the status Badge is "Badge" by coss.com (https://21st.dev/r/coss.com/coss-badge) and
 * "Status Badge" by serafimcloud (https://21st.dev/r/serafimcloud/status-badge); the checks bar is
 * "Interfaces Progress" by jshguo (https://21st.dev/r/jshguo/interfaces-progress). The table itself
 * is kept our own: the 21st.dev data tables sort and edit, and this queue must keep its order
 * (nearest first) and read as a caption plus a row header per hearing.
 */

import { useEffect, useRef } from 'react';
import { dateShort, sheetTime, workingDaysWords } from '@/lib/format';
import { NAMES, processCompare } from '@/lib/copy';
import { navigate, useLocation } from '@/lib/router';
import { PHONE } from '@/lib/media';
import { useSession } from '@/lib/store';
import { OWNER, checkRows, checkSummary, comingAt, statusOf, stepsFor, street, type QueueItem } from './model';
import { State } from './Regions';
import { CheckProgress } from '@/components/ui/Progress';
import { NO_CONSULTANT } from '@/components/hearing/ConsultantLink';
import { StepText } from '@/components/hearing/StepText';

export interface QueueGroup {
  id: string;
  title: string;
  items: QueueItem[];
  /** The figure beside the title when it is not the number of rows, for example decisions still waiting. */
  count?: string;
}

/** A long step keeps its first sentence in the row; the Detail shows it in full. */
function rowText(text: string): string {
  if (text.length <= 140) return text;
  const first = text.split(/(?<=[a-z0-9)”]\.)\s+(?=[A-Z“])/)[0] ?? text;
  return first.length < text.length ? `${first} More in the detail.` : text;
}

function HearingRow({ item, selected }: { item: Extract<QueueItem, { kind: 'hearing' }>; selected: boolean }) {
  const s = useSession((x) => x);
  const h = item.hearing;
  const a = stepsFor(h, s.changes).actions[0];
  const st = statusOf(h, s.changes);
  const rows = checkRows(h, s);
  const sum = checkSummary(rows);
  const missing = rows.filter((r) => !(r.state === 'not-needed' || r.state === 'proved' || r.state === 'accepted')).map((r) => r.name.toLowerCase());
  const past = h.workingDays !== null && h.workingDays < 0;
  const dueNow = a ? a.due.kind === 'now' || /today/i.test(a.due.text) : false;
  const consultant = h.consultant ? String(h.consultant) : NO_CONSULTANT;
  return (
    <tr aria-selected={selected} data-href={item.href} data-testid={`row-${h.case}`} onClick={() => navigate(item.href)}>
      <th scope="row" style={{ fontWeight: 400 }}>
        <div className="l-rowmain">
          {/* Line 1: the address first (the key fact), the case number small and muted. */}
          <div className="l-rowtop">
            <a className="l-rowaddr" href={item.href} aria-label={NAMES.openHearing(h)} data-testid={`open-${h.case}`} onClick={(e) => e.stopPropagation()}>
              {street(h)}
            </a>
            <span className="l-rowcase l-small l-muted" title={`${h.case}, ${h.county} office`}>
              <span className="l-num">{h.case}</span> · {h.county}
            </span>
          </div>
          {/* Line 2: what to do first, in full, with its dates, people and offices emphasised. */}
          <span className="l-rowstep" data-testid={`first-step-${h.case}`}>{a ? <StepText text={rowText(a.text)} /> : 'Nothing is due today.'}</span>
        </div>
      </th>
      <td>
        <div className="l-rowside">
          <State tone={st.tone} testId={`row-state-${h.case}`}>{st.label}</State>
          <CheckProgress done={sum.done} total={sum.total} testId={`hearing-checks-summary-${h.case}`} />
          {/* The first missing check is said in words on the row; the rest for a screen reader. */}
          {sum.next ? (
            <span className="l-small l-ink2" data-testid={`row-next-check-${h.case}`}>
              Next: {sum.next.charAt(0).toLowerCase()}{sum.next.slice(1)}
            </span>
          ) : null}
          {missing.length > 1 ? <span className="l-sr">Also missing: {missing.slice(1).join(', ')}.</span> : null}
          <span className="l-small l-ink2 l-clip" data-testid={`row-consultant-${h.case}`}>
            <span className="l-sr">Consultant: </span>
            {consultant}
          </span>
        </div>
      </td>
      <td className="due">
        <span className="l-due">
          <b className={past ? 'l-danger' : undefined} data-tone={!past && dueNow ? 'warn' : undefined}>{a?.due.text ?? 'Nothing due'}</b>
          <span>{a?.owner.name ?? ''}</span>
        </span>
        <span className="l-sr">. Hearing {dateShort(h.date)}, {sheetTime(h.time)}, {workingDaysWords(h.workingDays)}.</span>
      </td>
    </tr>
  );
}

function DecisionRow({ item, selected }: { item: Extract<QueueItem, { kind: 'decision' }>; selected: boolean }) {
  const o = item.office;
  const d = useSession((x) => x.changes[o.slug]);
  const n = comingAt(o).length;
  const cmp = processCompare(o);
  return (
    <tr aria-selected={selected} data-href={item.href} data-testid={`row-decide-${o.slug}`} onClick={() => navigate(item.href)}>
      <th scope="row" style={{ fontWeight: 400 }}>
        <div className="l-rowmain">
          <div className="l-rowtop">
            <a className="l-rowaddr" href={item.href} aria-label={`Open ${o.county}’s process change`} data-testid={`open-decide-${o.slug}`} onClick={(e) => e.stopPropagation()}>
              {o.county} office
            </a>
            <span className="l-small l-muted l-clip">Process change{cmp.oldAccepted ? '' : ', old process no longer accepted'}</span>
          </div>
          <span className="l-rowstep">
            {d?.decision === 'approved'
              ? `Record ${o.county}’s approved process on the sheet, then send the notices.`
              : d
                ? `Record on the sheet that ${o.county}’s old process is kept.`
                : `Approve or keep ${o.county}’s new process for naming our consultant.`}
          </span>
        </div>
      </th>
      <td>
        <div className="l-rowside">
          {d ? (
            <State tone="warn">{d.decision === 'approved' ? `Approved by ${d.name ?? 'a person'}` : 'Old process kept'}</State>
          ) : (
            <State tone="danger">Notices wait</State>
          )}
          <span className="l-small l-ink2 l-num">{n === 1 ? '1 hearing affected' : `${n} hearings affected`}</span>
        </div>
      </td>
      <td className="due">
        <span className="l-due">
          <b>{d ? 'Decided' : 'Today'}</b>
          <span>{OWNER}</span>
        </span>
        {d ? <span className="l-sr">. {d.at}. Waiting for the coordinator to record it.</span> : null}
      </td>
    </tr>
  );
}

export function QueueList({ groups, selected, caption }: { groups: QueueGroup[]; selected: string | null; caption: string }) {
  const body = useRef<HTMLTableElement>(null);
  const loc = useLocation();
  const chosen = ['case', 'decide', 'open', 'item'].some((k) => loc.query.get(k)) || /^\/hearings\/[^/]+$/.test(loc.path);
  useEffect(() => {
    // On a phone the Detail sits under the list: a row chosen by click or by URL brings it into view.
    if (!chosen || !selected || !window.matchMedia(PHONE).matches) return undefined;
    const t = window.setTimeout(() => document.querySelector<HTMLElement>('[data-region="detail"]')?.scrollIntoView({ block: 'start' }), 60);
    return () => window.clearTimeout(t);
  }, [selected, chosen]);
  useEffect(() => {
    // Scroll the list region only, never the page (on a phone the region does not scroll).
    const row = body.current?.querySelector<HTMLElement>('tr[aria-selected="true"]');
    const box = row?.closest<HTMLElement>('.l-scroll');
    if (row && box && box.scrollHeight > box.clientHeight) {
      const r = row.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      if (r.top < b.top + 40 || r.bottom > b.bottom) box.scrollTop += r.top - b.top - 40;
    }
  }, [selected]);
  return (
    <table className="l-table l-queue" ref={body} data-testid="queue-table">
      <caption className="l-sr">{caption}</caption>
      <colgroup>
        <col />
        <col style={{ width: 232 }} />
        <col style={{ width: 168 }} />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Item and what to do</th>
          <th scope="col">Status, checks, consultant</th>
          <th scope="col" className="due">Due and owner</th>
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g.id} data-testid={`queue-group-${g.id}`}>
          <tr className="l-group">
            <th scope="colgroup" colSpan={3}>
              {g.title} <span className="l-num l-muted" style={{ fontWeight: 400, marginLeft: 4 }}>{g.count ?? g.items.length}</span>
            </th>
          </tr>
          {g.items.map((i) =>
            i.kind === 'hearing' ? <HearingRow key={i.key} item={i} selected={i.key === selected} /> : <DecisionRow key={i.key} item={i} selected={i.key === selected} />,
          )}
        </tbody>
      ))}
    </table>
  );
}
