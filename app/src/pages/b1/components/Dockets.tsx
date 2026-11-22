/**
 * Dockets (#/today/9am?view=dockets&docket=<row>): the Dockets tab as the coordinator uses it at the
 * 9:00 a.m. pass. A docket is one office, one day and one format; it is offered whole, in one
 * numbered text, so one reply covers the day and nothing is offered twice. The detail shows the
 * hearings on it, the offer text, the day-before text and the message to the office, each with
 * its recipient and channel, marked "Simulated, not sent".
 */

import type { ReactNode } from 'react';
import { hearings } from '@/lib/data';
import { dateShort, sheetTime } from '@/lib/format';
import { Block, DetailRegion, ListRegion, Src, Workspace } from '@/layout/Regions';
import { HeadFacts, PickHead, PickList, pagerFor, pick, type PickRow } from '@/pages/agents/PickList';
import { dockets, type Docket } from '../caseNotes';

export const docketCount = (): number => dockets().length;

const clean = (t: string): string =>
  t
    .replace(/\s*\((EMAIL ONLY|STATES: ASK|CALL OR EMAIL, NO TEXT)\)/g, '')
    .replace(/\s*When the offer goes, type the name in column BY of the Hearings tab on each hearing offered\./, '')
    .replace(/WHO MAY APPEAR AND SIGN IN [A-Z]+ IS NOT ANSWERED YET.*$/s, 'Our lawyer has not yet confirmed who may represent clients in this state.')
    .trim();

const noOffer = (d: Docket): boolean => /^No offer is needed/.test(d.offer);
const emailOnly = (t: string): boolean => /EMAIL ONLY/.test(t);
/** The first name the sheet offers the docket to, or "the first name on Ask next". */
function recipient(d: Docket): string {
  const m = /first to ([A-Z][a-z]+ [A-Z][a-z]+)/.exec(d.offerTo);
  if (m) return m[1]!;
  const a = /: ([A-Z][a-z]+ [A-Z][a-z]+)/.exec(d.askNext);
  return a ? a[1]! : 'the first name on Ask next';
}

function Draft({ title, to, channel, text, testId }: { title: string; to: string; channel: string; text: string; testId: string }) {
  return (
    <Block title={title} meta={<Src kind="simulated" cell="Simulated, not sent" />} testId={testId}>
      <dl className="l-kv" style={{ marginBottom: 8 }}>
        <dt>To</dt>
        <dd className="l-strong">{to}</dd>
        <dt>Channel</dt>
        <dd>{channel}</dd>
      </dl>
      <blockquote className="l-p" style={{ margin: 0, paddingLeft: 12, borderLeft: '2px solid var(--border-strong)', whiteSpace: 'pre-wrap', maxWidth: 'var(--measure)' }}>
        {text}
      </blockquote>
      <p className="l-small l-muted" style={{ marginTop: 8 }}>Simulated, not sent. A person sends it from the firm’s own mailbox or phone.</p>
    </Block>
  );
}

export function DocketsWork({ query }: { query: URLSearchParams }) {
  const all = dockets();
  const href = (d: Docket): string => `#/today/9am?view=dockets&docket=${d.row}`;
  const rows: (PickRow & { d: Docket })[] = all.map((d) => {
    const open = /^Offer/.test(d.offerTo);
    return {
      d,
      key: String(d.row),
      href: href(d),
      title: `${d.office}, ${dateShort(d.date)}`,
      meta: d.format,
      name: `Docket ${d.office}, ${dateShort(d.date)}, ${d.format}. Show its texts`,
      line: `${d.hearings === 1 ? '1 hearing' : `${d.hearings} hearings`}. Held by ${d.heldBy === 'nobody' ? 'nobody yet' : d.heldBy}.`,
      right: open ? 'Offer it' : 'Covered',
      rightSub: open ? 'One numbered text' : 'No offer needed',
      testId: `docket-row-${d.row}`,
    };
  });
  const sel = pick(rows, query.get('docket'));
  const pager = sel ? pagerFor(rows, sel.key) : undefined;
  const d = sel?.d;
  const on = d ? hearings.filter((h) => h.date === d.date && h.county === d.office && String(h.format ?? '').toLowerCase() === d.format.toLowerCase()).sort((a, b) => String(a.time).localeCompare(String(b.time))) : [];
  let detail: ReactNode = null;
  if (d) {
    detail = (
      <DetailRegion
        testId="docket-detail"
        head={
          <PickHead title={`${d.office}, ${dateShort(d.date)}, ${d.format}`} pager={pager}>
            <HeadFacts items={[['Hearings', String(d.hearings)], ['Held by', d.heldBy === 'nobody' ? 'Nobody yet' : d.heldBy], ['Label', <Src key="s" kind="packet" cell={`Dockets row ${d.row}`} />]]} />
          </PickHead>
        }
        foot={<span className="l-small l-muted">Offered whole, so one reply covers the day and nothing is offered twice.</span>}
      >
        <Block title="Hearings on this docket" meta={String(on.length)}>
          <ol className="grid gap-1" style={{ margin: 0, paddingLeft: 20 }}>
            {on.map((h) => (
              <li key={h.case} className="l-p">
                <span className="l-num">{sheetTime(h.time)}</span> <a className="l-link" href={`#/hearings/${h.case}`}>{h.property.split(',')[0]}</a> <span className="l-num l-muted">{h.case}</span>
                <span className="l-ink2">{h.consultant ? `, ${String(h.consultant)}` : ', no consultant named'}</span>
              </li>
            ))}
          </ol>
        </Block>
        {noOffer(d) ? (
          <Block title="The offer" testId={`docket-offer-${d.row}`}>
            <p className="l-p">No offer is needed. Every hearing on this docket has a consultant’s yes.</p>
          </Block>
        ) : (
          <Draft title="The offer, one numbered text" to={recipient(d)} channel={emailOnly(d.offerTo) ? 'Email: no mobile number on file' : 'Text'} text={d.offer} testId={`docket-offer-${d.row}`} />
        )}
        {/^(DO NOT SEND|No text)/.test(d.dayBefore) ? (
          <Block title="The day-before text" testId={`docket-daybefore-${d.row}`}>
            <p className="l-p">{/^DO NOT SEND/.test(d.dayBefore) ? 'Not ready: a video hearing on this docket has no link yet. It goes once every link is in.' : 'No text yet: no hearing on this docket has a consultant’s yes.'}</p>
          </Block>
        ) : (
          <Draft title="The day-before text" to={/^To ([^:]+):/.exec(d.dayBefore)?.[1] ?? d.heldBy} channel="Email: no mobile number on file" text={d.dayBefore.replace(/^To [^:]+: /, '')} testId={`docket-daybefore-${d.row}`} />
        )}
        {/^Nobody to name yet/.test(d.toOffice) ? null : /^NO NOTICE GOES/.test(d.toOffice) ? (
          <Block title="To the office" testId={`docket-office-${d.row}`}>
            <p className="l-p">Blocked: no notice goes to the {d.office} office until Alice approves its new process. <a className="l-link" href="#/?decide=tesswick">Open the decision</a></p>
          </Block>
        ) : (
          <Draft title="To the office" to={`The ${d.office} office`} channel="The office’s own route" text={d.toOffice} testId={`docket-office-${d.row}`} />
        )}
        <Block title="Ask next, in this order">
          <p className="l-p l-ink2">{clean(d.askNext)}</p>
        </Block>
      </DetailRegion>
    );
  }
  return (
    <Workspace>
      <ListRegion title="Dockets from today" meta={<span className="l-num">{all.length} dockets</span>}>
        <PickList groups={[{ id: 'dockets', title: '', rows }]} selected={sel?.key ?? null} caption="Dockets: one office, one day, one format" columns={['Docket', 'Offer']} />
      </ListRegion>
      {detail ?? (
        <DetailRegion head={<h2 className="l-section">No docket</h2>}>
          <p className="l-block l-p l-ink2">No hearing from today on.</p>
        </DetailRegion>
      )}
    </Workspace>
  );
}
