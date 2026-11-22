/**
 * Calendar file (#/calendar, ?filter=, ?event=<case>), split 7 + 5:
 * - Page header: one line that says the file is a copy, and the primary "Download hearings.ics".
 * - Summary: events in the file, hearings left out and why, the time zone, lines in the file.
 * - Toolbar: filters as links (all, in the file, left out).
 * - List: the events by day (time in the office's time, the hearing, the consultant), then the
 *   hearings the file leaves out with the reason.
 * - Detail: the event as a calendar will show it, with the office time and its offset written out,
 *   and the file's own lines for that event; or, for a hearing left out, why and what to do.
 */

import { Download } from 'lucide-react';
import type { Hearing } from '@/types/data';
import { calendarEventCount, hearingByCase, hearings, officeOfHearing, sheet } from '@/lib/data';
import { dateLong, dateShort, sheetTime } from '@/lib/format';
import { downloadIcs } from '@/lib/ics';
import type { PageProps } from '@/lib/router';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { street } from '@/layout/model';
import { Block, DetailRegion, ListRegion, Page, PageHeader, Seg, SheetRef, Src, Stat, State, Summary, Toolbar, Workspace, usePageState } from '@/layout/Regions';
import { zoneOf } from './components/OfficeCard';
import { Facts, KeyValues, PagerLinks, RecordTable, pagerOf, type Pager, type RecordGroup, type RecordRow } from './components/RecordTable';
import { icsEvents, type IcsEvent } from './lib';

type Filter = 'all' | 'in' | 'out';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All hearings' },
  { id: 'in', label: 'In the file' },
  { id: 'out', label: 'Left out' },
];
const isFilter = (v: string | null): v is Filter => FILTERS.some((f) => f.id === v);

/** "Juniper Reach hearing office: ADDRESS NOT ON RECORD: Offices BA11" in plain words, without the cell. */
function placeText(loc: string): string {
  const clean = loc.replace(/:\s*Offices [A-Z]{1,3}\d+\.?$/, '').trim();
  return clean.replace(/ADDRESS NOT ON RECORD/i, 'address not on record yet').replace(/NO VIDEO LINK YET/i, 'no video link yet');
}

/** The office time and its offset: "Juniper Reach time (UTC-05:00)". */
function zoneLine(h: Hearing | undefined): string {
  const o = h ? officeOfHearing(h) : undefined;
  return o ? `${o.county} time (${zoneOf(o)})` : 'Office time';
}

/** "No video link yet" for a video hearing with no link on record; "Video room only (room C), no link yet" for a room alone. */
export function videoLinkWords(h: Hearing | undefined): string | null {
  if (!h || String(h.format).toLowerCase() !== 'video') return null;
  const v = String(h.cells?.AV ?? '').trim();
  if (/^https?:/.test(v)) return null;
  return v ? `Video ${v} only, no link yet` : 'No video link yet';
}

/** Why the sheet leaves a hearing out of the file. */
function leftOutWhy(h: Hearing, short = false): string {
  if (!h.consultant) return short ? 'No consultant named yet.' : 'No consultant named yet, so there is nobody to send it to.';
  if ((h.workingDays ?? 0) < 0) return 'Already held.';
  return 'The sheet does not put it in the file yet.';
}

export function Calendar({ query }: PageProps) {
  const file = sheet.calendarFile;
  if (!file) {
    return (
      <Page>
        <div data-testid="page-calendar">
          <PageHeader title="Calendar file" />
          <EmptyState title="The sheet holds no calendar file" description="The export found no Calendar file tab on the installed sheet." />
        </div>
      </Page>
    );
  }
  return <CalendarFilePage query={query} file={file} />;
}

/** The page once the sheet holds a calendar file (hooks stay after no early return). */
function CalendarFilePage({ query, file }: { query: PageProps['query']; file: NonNullable<typeof sheet.calendarFile> }) {
  const events = icsEvents();
  const inFile = new Set(events.map((e) => e.caseId));
  const left = hearings.filter((h) => !inFile.has(h.case)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const noConsultant = left.filter((h) => !h.consultant).length;
  const filter: Filter = isFilter(query.get('filter')) ? (query.get('filter') as Filter) : 'all';
  const keep = filter === 'all' ? '' : `filter=${filter}&`;

  const download = (): void => {
    downloadIcs();
    toast({ title: 'Downloaded hearings.ics', body: 'Send it to the consultants who want it in their calendar.', tone: 'ok' });
  };


  const eventRow = (e: IcsEvent): RecordRow => {
    const h = e.caseId ? hearingByCase(e.caseId) : undefined;
    const who = e.summary.split(': ')[0] ?? '';
    const key = e.caseId ?? e.uid;
    return {
      key,
      href: `#/calendar?${keep}event=${key}`,
      testId: `ics-event-${key}`,
      title: h ? street(h) : e.summary,
      linkLabel: `Open the event for ${h ? `${street(h)}, ${e.caseId}` : e.summary}`,
      meta: e.caseId ?? '',
      line: `${who}, ${h ? `${h.county} office` : ''}${/not on record/i.test(e.location) ? '. Address not on record yet' : ''}${videoLinkWords(h) ? `. ${videoLinkWords(h)}` : ''}`,
      side: <State tone="ok">In the file</State>,
      right: h ? sheetTime(h.time) : '',
      rightSub: h ? zoneLine(h) : 'office time',
      sr: h ? `${zoneLine(h)}, ${dateLong(e.day)}` : dateLong(e.day),
    };
  };
  const leftRow = (h: Hearing): RecordRow => ({
    key: h.case,
    href: `#/calendar?${keep}event=${h.case}`,
    testId: `calendar-missing-${h.case}`,
    title: street(h),
    linkLabel: `Open ${street(h)}, ${h.case}, left out of the file`,
    meta: h.case,
    line: `${leftOutWhy(h, true)}${videoLinkWords(h) ? ` ${videoLinkWords(h)}.` : ''}`,
    side: <State tone="neutral">Left out</State>,
    right: `${dateShort(h.date)}, ${sheetTime(h.time)}`,
    rightSub: zoneLine(h),
  });

  const byDay = new Map<string, IcsEvent[]>();
  for (const e of events) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  const groups: RecordGroup[] = [
    ...(filter === 'out' ? [] : days.map(([day, list]) => ({ id: day, title: dateLong(day), rows: list.map(eventRow), count: list.length === 1 ? '1 event' : `${list.length} events` }))),
    ...(filter === 'in' || !left.length ? [] : [{ id: 'left-out', title: 'Left out of the file', rows: left.map(leftRow) }]),
  ];
  const all = groups.flatMap((g) => g.rows);
  const asked = (query.get('event') ?? '').toUpperCase();
  const selKey = all.find((r) => r.key.toUpperCase() === asked)?.key ?? all[0]?.key ?? null;
  const pager = pagerOf(groups, selKey);
  const selEvent = events.find((e) => (e.caseId ?? e.uid) === selKey);
  const selLeft = selEvent ? undefined : left.find((h) => h.case === selKey);
  const offsets = new Set(hearings.map((h) => { const o = officeOfHearing(h); return o ? zoneOf(o) : ''; }).filter(Boolean));
  const filterHref = (f: Filter): string => `#/calendar${f === 'all' ? '' : `?filter=${f}`}`;

  usePageState({ page: 'calendar', filter, listCount: all.length, selected: selKey, primaryAction: 'Download hearings.ics', events: calendarEventCount(), leftOut: left.map((h) => h.case) });

  return (
    <Page fit>
      <div data-testid="page-calendar" style={{ display: 'contents' }}>
        <PageHeader
          title="Calendar file"
          line="A copy for consultants’ calendars. Editing it moves no hearing."
          actions={
            <Button variant="primary" size="md" icon={<Download aria-hidden />} onClick={download} data-testid="export-ics" aria-label="Download hearings.ics">
              Download hearings.ics
            </Button>
          }
        />
        <Summary label="The calendar file in four figures" testId="calendar-summary">
          <Stat
            testId="calendar-events"
            label="Events in the file"
            value={calendarEventCount()}
            foot="Read from the Calendar file tab"
            source={<Src kind="measured" cell="Calendar file B2" />}
            href={filterHref('in')}
            current={filter === 'in'}
            name={`${calendarEventCount()} events in the file. Show them`}
          />
          <Stat
            testId="calendar-left"
            label="Hearings left out"
            value={left.length}
            of={`of ${hearings.length}`}
            foot={noConsultant === left.length && left.length ? 'No consultant named on any of them' : `${noConsultant} with no consultant named`}
            source={<Src kind="measured" cell="Hearings and Calendar file" />}
            href={filterHref('out')}
            current={filter === 'out'}
            name={`${left.length} hearings left out of the file. Show them`}
          />
          <Stat
            testId="calendar-zones"
            label="Time zones"
            value={offsets.size}
            foot={offsets.size === 1 ? `Every office is on ${[...offsets][0]}` : [...offsets].join(', ')}
            source={<Src kind="packet" cell="Offices V" />}
          />
          <Stat
            testId="calendar-lines"
            label="Lines in the file"
            value={file.lines.length}
            foot="None longer than 75 characters"
            source={<Src kind="measured" cell="Calendar file column A" />}
          />
        </Summary>
        <Toolbar left={<Seg label="Which hearings" current={filter} items={FILTERS.map((f) => ({ id: f.id, label: f.label, count: f.id === 'all' ? events.length + left.length : f.id === 'in' ? events.length : left.length, href: filterHref(f.id) }))} />} />
        <Workspace split="7-5">
          <ListRegion
            title={filter === 'out' ? 'Left out of the file' : 'The events, by day'}
            meta={<span className="l-num">{all.length === 1 ? '1 hearing' : `${all.length} hearings`}</span>}
            foot={
              <details className="l-details" data-testid="calendar-import-test">
                <summary>Import test</summary>
                <p className="l-small l-ink2 l-p">
                  A file of the same form, from an earlier build of the sheet, opened in Apple Calendar on Nov 21, 2026 with no error. Not rerun on this sheet. Google Calendar and Outlook not tried.
                </p>
              </details>
            }
          >
            <RecordTable groups={groups} selected={selKey} caption="The calendar file's events by day, then the hearings it leaves out" heads={['Hearing and consultant', 'In the file', 'Office time']} sideWidth={128} rightWidth={248} testId="calendar-preview" />
          </ListRegion>
          {selEvent ? <EventDetail e={selEvent} pager={pager} /> : selLeft ? <LeftOutDetail h={selLeft} pager={pager} /> : null}
        </Workspace>
      </div>
    </Page>
  );
}

const ABOUT = 'Sent to the consultants who want it. Never read back: a yes comes by reply.';

function EventDetail({ e, pager }: { e: IcsEvent; pager?: Pager }) {
  const h = e.caseId ? hearingByCase(e.caseId) : undefined;
  const lines = sheet.calendarFile?.lines ?? [];
  const end = lines.indexOf('END:VEVENT', e.line - 1);
  const own = lines.slice(e.line - 1, end + 1);
  // A folded line (one that starts with a space) stays with the line it continues.
  const groups: { first: number; text: string[] }[] = [];
  own.forEach((l, i) => {
    const last = groups[groups.length - 1];
    if (last && l.startsWith(' ')) last.text.push(l);
    else groups.push({ first: e.line + i, text: [l] });
  });
  const who = e.summary.split(': ')[0] ?? '';
  const description = e.description.replace(/\s*Status when built: .*$/, '').trim();
  return (
    <DetailRegion
      testId={`calendar-event-${e.caseId ?? e.uid}`}
      head={
        <>
          <div className="l-detailhead-row">
            <h2 className="l-section l-clip" data-testid="detail-title">
              {h ? street(h) : e.summary}
            </h2>
            {pager ? <PagerLinks p={pager} /> : null}
          </div>
          <State tone="ok">In the file</State>
          <Facts
            items={[
              { term: 'When', value: h ? `${dateShort(e.day)}, ${sheetTime(h.time)}` : dateShort(e.day) },
              { term: 'Time zone', value: zoneLine(h), testId: 'event-zone' },
              { term: 'Consultant', value: who },
            ]}
          />
        </>
      }
      foot={
        <>
          <span className="l-small l-muted">{ABOUT}</span>
          {h ? (
            <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={`#/hearings/${h.case}`} data-testid="event-hearing-open">
              Open hearing {h.case}
            </a>
          ) : null}
        </>
      }
    >
      <div className="@3xl:grid @3xl:grid-cols-2 @3xl:[&>.l-block]:border-t-0! @3xl:[&>.l-block+.l-block]:shadow-[inset_1px_0_0_var(--border)]!">
      <Block title="As a calendar will show it" testId="event-preview">
        <KeyValues
          items={[
            { term: 'Title', value: e.summary },
            { term: 'Where', value: placeText(e.location) },
            { term: 'Video link', value: videoLinkWords(h) ?? '', testId: 'event-video-link' },
            { term: 'Notes', value: description },
          ]}
        />
      </Block>
      <Block title="The lines in the file" meta={`Lines ${e.line} to ${end + 1}`} testId="calendar-raw">
        <p className="l-small l-muted l-p" style={{ marginBottom: 8 }}>
          The calendar standard cuts a long line after 75 characters. The rest goes on in the next line, shown here with the line it continues.
        </p>
        <ol className="l-mono" style={{ margin: 0, padding: 0, listStyle: 'none', columnWidth: 256, columnGap: 24 }} aria-label={`Lines ${e.line} to ${end + 1} of the calendar file`}>
          {groups.map((g) => (
            <li key={g.first} style={{ display: 'flex', gap: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', breakInside: 'avoid', marginBottom: 4 }}>
              <span aria-hidden className="l-muted l-num" style={{ width: 32, textAlign: 'right', flex: 'none' }}>
                {g.first}
              </span>
              <span>{g.text.join('\n')}</span>
            </li>
          ))}
        </ol>
      </Block>
      </div>
      <div className="l-block" style={{ borderTop: '1px solid var(--border)' }}>
        <SheetRef>
          <span>
            Calendar file column A, lines {e.line} to {end + 1}. Event id <span className="l-mono">{e.uid}</span>.
          </span>
          <span>Place as written in the file: {e.location}</span>
        </SheetRef>
      </div>
    </DetailRegion>
  );
}

function LeftOutDetail({ h, pager }: { h: Hearing; pager?: Pager }) {
  const events = new Set(icsEvents().map((e) => e.caseId));
  const others = hearings.filter((x) => !events.has(x.case) && x.case !== h.case);
  return (
    <DetailRegion
      testId={`calendar-left-${h.case}`}
      head={
        <>
          <div className="l-detailhead-row">
            <h2 className="l-section l-clip" data-testid="detail-title">
              {street(h)}
            </h2>
            {pager ? <PagerLinks p={pager} /> : null}
          </div>
          <State tone="neutral">Left out of the file</State>
          <Facts
            items={[
              { term: 'When', value: `${dateShort(h.date)}, ${sheetTime(h.time)}` },
              { term: 'Time zone', value: zoneLine(h) },
              { term: 'Consultant', value: h.consultant ? String(h.consultant) : 'No consultant named' },
            ]}
          />
        </>
      }
      foot={
        <>
          <span className="l-small l-muted">{ABOUT}</span>
          <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={`#/hearings/${h.case}`} data-testid="event-hearing-open">
            Open hearing {h.case}
          </a>
        </>
      }
    >
      <Block title="Why it is not in the file" testId="calendar-left-why">
        <p className="l-body l-p">{leftOutWhy(h)}</p>
        {!h.consultant ? (
          <p className="l-small l-ink2 l-p" style={{ marginTop: 8 }}>
            Once a consultant says yes and is named on the sheet, the next file holds this hearing.
          </p>
        ) : null}
      </Block>
      {others.length ? (
        <Block title="Also left out" meta={`${others.length}`} testId="calendar-left-others">
          <ul className="l-checks">
            {others.map((x) => (
              <li key={x.case} className="l-check">
                <span className="l-check-name">
                  <span className="l-clip">
                    <a className="l-link" href={`#/calendar?event=${x.case}`}>
                      {street(x)}
                    </a>{' '}
                    <span className="l-num l-muted">{x.case}</span>
                  </span>
                  <span className="l-small l-muted">{leftOutWhy(x, true)}</span>
                </span>
                <span className="l-small l-ink2 l-num">
                  {dateShort(x.date)}, {sheetTime(x.time)}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
    </DetailRegion>
  );
}
