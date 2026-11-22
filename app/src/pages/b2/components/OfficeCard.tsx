/**
 * One office in the Offices Detail region: its head (name, pager, one state Badge,
 * and State, Time zone and Hearings coming as facts), then blocks divided by hairlines: how to reach
 * it and how it wants our consultant named, its coming hearings, the questions still open, and the
 * sheet's cells behind "Sheet reference". No card inside the card, no cell code in the main view.
 */

import type { ReactNode } from 'react';
import { engine, hearings, officeCell, tab, type Office } from '@/lib/data';
import { NoticesOnFile, StaffingDrafts } from './Drafts';
import { plainRoute } from '@/lib/copy';
import { clockText, dateLong, dateShort, sheetTime } from '@/lib/format';
import { comingAt, street } from '@/layout/model';
import { Block, SheetRef, State, type Tone } from '@/layout/Regions';
import { Facts, KeyValues, PagerLinks, type Pager } from './RecordTable';

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());
const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Plain words for the route state codes of Offices AV; the code shows only in the Sheet reference. */
export const ROUTE_STATE_WORDS = ['Route on file', 'Change waits for a decision', 'New route only', 'New and old route'] as const;

/** The meaning the heading of a column gives to a code: "1 a change waits for approval, no notice goes". */
export function routeStateWords(heading: string, value: unknown): string {
  const m = new RegExp(`(?:^|[:;]\\s*)${str(value)} (?:= )?([^;]+)`).exec(heading);
  return m ? m[1]!.trim() : '';
}

/** "09:00 to 16:00 local, Monday-Friday" as "9:00 a.m. to 4:00 p.m., Monday to Friday". */
export function hoursText(v: string): string {
  const t = (hm: string): string => {
    const [h, m] = hm.split(':').map(Number);
    return clockText((h ?? 0) * 60 + (m ?? 0));
  };
  return v
    .replace(/\b(\d{1,2}:\d{2}) to (\d{1,2}:\d{2})(?: local)?/, (_x, a: string, b: string) => `${t(a)} to ${t(b)}`)
    .replace(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)-(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/, '$1 to $2');
}

/** "UTC-05:00" from "UTC-05:00 (fixed for this exercise)". */
export function zoneOf(o: Office): string {
  return str(officeCell(o, 'Time zone').value).replace(/\s*\(.*\)\s*$/, '');
}

/** Short names for the questions an office has not answered yet, by the start of the column heading. */
const ASK_LABELS: [RegExp, string][] = [
  [/^Naming deadline the office uses/, 'Naming deadline'],
  [/^If nobody attends/, 'If nobody attends'],
  [/^Will it put our hearings on one day/, 'Hearings on one day'],
  [/^Who may represent/, 'Who may represent a homeowner'],
  [/^Alternate on the record/, 'An alternate on the record'],
  [/^Hearing season/, 'Hearing season'],
  [/^Names needed/, 'Names needed in the peak'],
  [/^Who signs a settlement/, 'Who signs a settlement'],
  [/^Signature the office accepts/, 'Signatures it accepts'],
  [/^Who we reach before opening/, 'Before the office opens'],
  [/^Length of one hearing/, 'Hearing length'],
  [/^Does this office change its clocks/, 'Daylight saving time'],
  [/^Last day this office accepts a change/, 'Last day for a change request'],
  [/^Daytime telephone/, 'Daytime phone'],
  [/^Street address/, 'Address and hearing room'],
];

/** The questions still open for an office: every Offices cell that starts with ASK, in plain words. */
export function asksOf(o: Office): { column: string; label: string; question: string }[] {
  const headers = tab('Offices').headers;
  return Object.entries(o.cells)
    .filter(([, v]) => typeof v === 'string' && v.startsWith('ASK'))
    .map(([column, v]) => {
      const h = headers[column] ?? column;
      const label = ASK_LABELS.find(([re]) => re.test(h))?.[1] ?? h.replace(/\s*\(.*$/, '');
      const q = String(v)
        .replace(/^ASK[^:]*:\s*/, '')
        .replace(/\s*\((?:Before asking|question \d+)[^)]*\)\s*/gi, ' ')
        .trim();
      return { column, label, question: cap(q) };
    });
}

/** The office's route in words, the same in the row, the Detail and the API. */
export function routeState(o: Office): { word: string; tone: Tone; code: number } {
  const code = Number(officeCell(o, 'Route state').value ?? 0);
  return { word: ROUTE_STATE_WORDS[code] ?? `Route state ${code}`, tone: code === 1 ? 'danger' : 'neutral', code };
}

export function OfficeHead({ office: o, pager, extra }: { office: Office; pager?: Pager; extra?: ReactNode }) {
  const st = routeState(o);
  const coming = comingAt(o).length;
  return (
    <>
      <div className="l-detailhead-row">
        <h2 className="l-section l-clip" data-testid="detail-title">
          {o.county} office
        </h2>
        {pager ? <PagerLinks p={pager} /> : null}
      </div>
      <State tone={st.tone} testId={`office-state-${o.slug}`}>
        {st.word}
      </State>
      <Facts
        items={[
          { term: 'State', value: str(o.cells.B), testId: 'office-state-name' },
          { term: 'Time zone', value: `${o.county} time (${zoneOf(o)})`, testId: 'office-zone' },
          { term: 'Hearings coming', value: coming === 1 ? '1 hearing' : `${coming} hearings` },
        ]}
      />
      {extra}
    </>
  );
}

/** Messages from this office (sender "<county> hearing office") whose words match. */
function officeSays(o: Office, re: RegExp): { id: string; body: string } | null {
  const m = engine.messages.find((x) => x.sender === `${o.county} hearing office` && re.test(x.body));
  return m ? { id: String(m.id), body: m.body } : null;
}

/** The office's own instruction for arrival, quoted from its message ("Please arrive 15 minutes before the first case."). */
export function arrivalRule(o: Office): string | null {
  const m = officeSays(o, /\barrive\b/i);
  if (!m) return null;
  const s = m.body.split(/(?<=\.)\s+/).find((x) => /\barrive\b/i.test(x)) ?? m.body;
  return `${s.replace(/^Please /, '').replace(/^./, (c) => c.toUpperCase())} (message ${m.id})`;
}

/** Whether the office has agreed in writing to move a hearing on request. */
function datesAnswer(o: Office): string | null {
  const m = officeSays(o, /\bWe can move\b/i);
  return m ? `Takes date requests in writing (message ${m.id})` : null;
}

const missingWords = (v: string, what: string): string | null => (!v || v.startsWith('ASK') ? `We have no ${what} for this office yet. Asked in the season email.` : null);

export function OfficeBody({ office: o }: { office: Office }) {
  const c = (prefix: string) => officeCell(o, prefix);
  const confirmed = str(c('Process last confirmed').value);
  const asks = asksOf(o);
  const coming = comingAt(o);
  const held = hearings.filter((h) => h.county === o.county && (h.workingDays ?? -1) < 0);
  const plan = asks.find((a) => a.label === 'Hearings on one day');
  const shownAsks = asks.filter((a) => a !== plan);
  const st = routeState(o);
  return (
    <>
      <div className="@3xl:grid @3xl:grid-cols-2 @3xl:[&>.l-block]:border-t-0! @3xl:[&>.l-block+.l-block]:shadow-[inset_1px_0_0_var(--border)]!">
      <Block title="How to reach this office" testId={`office-card-${o.slug}`}>
        <KeyValues
          items={[
            { term: 'Contact', value: str(c('Office contact').value) },
            { term: 'Hours', value: `${hoursText(str(c('Office hours').value))}, ${o.county} time` },
            { term: 'Hearings', value: cap(str(c('Hearing format today').value)) },
            { term: 'Name our consultant', value: plainRoute(str(c('How to name our representative').value)) },
            { term: 'A replacement', value: str(c('How to name a replacement').value) },
            { term: 'Phone', value: missingWords(str(c('Daytime telephone').value), 'phone number') ?? str(c('Daytime telephone').value), testId: 'office-phone' },
            {
              term: 'Street address',
              value: /in person/i.test(str(c('Hearing format today').value)) ? (missingWords(str(c('Street address').value), 'street address') ?? str(c('Street address').value)) : 'Hearings by video; no address needed',
              testId: 'office-address',
            },
            ...(arrivalRule(o) ? [{ term: 'Arrival', value: arrivalRule(o)!, testId: 'office-arrival' }] : []),
            { term: 'Confirmed in writing', value: confirmed ? dateLong(confirmed) : 'Not yet', testId: 'office-confirmed' },
            {
              term: 'Plans dates with us',
              value: datesAnswer(o) ?? (plan ? 'Not known yet. Asked in the season email.' : 'Answered on the sheet'),
              testId: 'office-plans-dates',
            },
            {
              term: 'Moving a date',
              value: 'We ask only after the bench was offered the hearing on its own date, with the homeowner’s written yes, never for a hearing a consultant accepted. The named coordinator decides.',
              testId: 'office-date-rule',
            },
          ]}
        />
      </Block>
      <Block title="Hearings coming" meta={`${coming.length}`} testId="office-hearings">
        {coming.length ? (
          <ul className="l-checks">
            {coming.map((h) => (
              <li key={h.case} className="l-check">
                <span className="l-check-name">
                  <span className="l-clip">
                    <a className="l-link" href={`#/hearings/${h.case}`}>
                      {street(h)}
                    </a>{' '}
                    <span className="l-num l-muted">{h.case}</span>
                  </span>
                  <span className="l-small l-muted">Consultant: {h.consultant ? String(h.consultant) : 'No consultant named'}</span>
                </span>
                <span className="l-small l-ink2 l-num">
                  {dateShort(h.date)}, {sheetTime(h.time)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="l-small l-muted l-p">No coming hearing at this office{held.length ? `. ${held.length} already held.` : '.'}</p>
        )}
      </Block>
      </div>
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <Block title="Staffing notices on file" testId="office-notices">
          <NoticesOnFile office={o} />
          <StaffingDrafts office={o} />
        </Block>
      </div>
      {shownAsks.length ? (
        <div style={{ borderTop: '1px solid var(--border)' }}>
        <Block title="Still to ask this office" meta={`${shownAsks.length}`} testId="office-asks">
          <ul className="l-checks">
            {shownAsks.slice(0, 4).map((a) => (
              <li key={a.column} className="l-check">
                <span className="l-check-name">
                  <span className="l-small l-muted">{a.label}</span>
                  <span className="l-p" style={{ maxWidth: 420 }}>{a.question}</span>
                </span>
              </li>
            ))}
          </ul>
          {shownAsks.length > 4 ? (
            <details className="l-details" style={{ marginTop: 8 }} data-testid="office-asks-more">
              <summary>{shownAsks.length - 4} more questions</summary>
              <ul className="l-checks">
                {shownAsks.slice(4).map((a) => (
                  <li key={a.column} className="l-check">
                    <span className="l-check-name">
                      <span className="l-small l-muted">{a.label}</span>
                      <span className="l-p" style={{ maxWidth: 420 }}>{a.question}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Block>
        </div>
      ) : null}
      <div className="l-block" style={{ borderTop: '1px solid var(--border)' }}>
        <SheetRef>
          <span>
            Offices tab, row {o.row}. Route state <span className="l-mono">Offices {officeCell(o, 'Route state').ref}</span>: code {st.code}.
          </span>
          <span>
            How to name our consultant, as typed: <span className="l-mono">Offices {c('How to name our representative').ref}</span> {str(c('How to name our representative').value)}
          </span>
          <span>
            Last confirmed in writing: <span className="l-mono">Offices {c('Process last confirmed').ref}</span>. Time zone: <span className="l-mono">Offices {c('Time zone').ref}</span>.
          </span>
          {asks.map((a) => (
            <span key={a.column}>
              <span className="l-mono">
                Offices {a.column}
                {o.row}
              </span>{' '}
              {String(o.cells[a.column] ?? '')}
            </span>
          ))}
        </SheetRef>
      </div>
    </>
  );
}
