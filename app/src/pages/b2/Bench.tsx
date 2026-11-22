/**
 * Bench (#/bench, ?filter=, ?who=<bench row>), split 7 + 5:
 * - Summary: consultants; hearings per consultant-day with its targets (the next priority's levers,
 *   Measures B15); consultants reached by email only; hearings named on them.
 * - Toolbar: filters as links.
 * - List: each consultant (name, preferred channel, counties; how we reach them and the daily cap;
 *   rate and hearings held now).
 * - Detail: the consultant's hearings, what they told us about their days (the Availability tab,
 *   with the message and its channel), how to reach them, and the cells behind "Sheet reference".
 * Nothing here reads a calendar: availability and every yes come from replies.
 */

import type { TabRow } from '@/types/data';
import { benchRows, cellNumber, cellText, engine, hearings, offices, tab } from '@/lib/data';
import { dateShort, sheetTime } from '@/lib/format';
import type { PageProps } from '@/lib/router';
import { plainLine } from '@/lib/sheetText';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { street } from '@/layout/model';
import { Block, DetailRegion, ListRegion, Page, PageHeader, Seg, SheetRef, Src, Stat, State, Summary, Toolbar, Workspace, usePageState, type Tone } from '@/layout/Regions';
import { Facts, KeyValues, PagerLinks, RecordTable, pagerOf, type RecordGroup, type RecordRow } from './components/RecordTable';
import { consultantHref } from '@/components/hearing/ConsultantLink';
import { DocketDrafts, FilesDrafts, SimulatedDraft, docketDrafts, filesDrafts } from './components/Drafts';

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());
const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Column letters of the Bench tab, found by the start of their heading. */
function col(prefix: string): string {
  const hit = Object.entries(tab('Bench').headers).find(([, h]) => h.startsWith(prefix));
  if (!hit) throw new Error(`No Bench heading starts with "${prefix}".`);
  return hit[0];
}
const cell = (r: TabRow, prefix: string): string => str(r.cells[col(prefix)]);

type Filter = 'all' | 'notfree' | 'some';
const notFreeNames = (): Set<string> => new Set(tab('Availability').rows.filter((r) => str(r.cells.H) === 'not free').map((r) => str(r.cells.B)));
const everyOffice = (r: TabRow): boolean => {
  const list = str(r.cells[col('Counties allowed')]).split(',').map((s) => s.trim());
  return offices().every((o) => list.includes(o.county));
};
const FILTERS: { id: Filter; label: string; test: (r: TabRow) => boolean }[] = [
  { id: 'all', label: 'All consultants', test: () => true },
  { id: 'notfree', label: 'Said not free on a day', test: (r) => notFreeNames().has(str(r.cells[col('Consultant')])) },
  { id: 'some', label: 'Some offices only', test: (r) => !everyOffice(r) },
];
const isFilter = (v: string | null): v is Filter => FILTERS.some((f) => f.id === v);

/** How the texts and calls reach a consultant, from the Reach column (0, 1 or 2). */
function reach(r: TabRow): { word: string; tone: Tone; line: string } {
  const v = Number(r.cells[col('Reach')] ?? 0);
  if (v === 2) return { word: 'Texts and calls', tone: 'ok', line: 'Mobile number and their yes to texts on file.' };
  if (v === 1) return { word: 'Calls only', tone: 'neutral', line: 'Mobile number on file, no agreement to texts yet.' };
  return { word: 'Email only', tone: 'warn', line: 'No mobile number on file, so texts and calls go by email.' };
}

function counties(r: TabRow): string {
  const list = cell(r, 'Counties allowed').split(',').map((s) => s.trim()).filter(Boolean);
  const every = offices().length > 0 && offices().every((o) => list.includes(o.county));
  return every ? 'Every office on the sheet' : list.join(', ');
}

/** The calendar field in plain words: the firm never reads a calendar; a yes comes by reply. */
function calendarWords(v: string): string {
  if (!v || /^none$/i.test(v)) return 'No digital calendar shared. Confirms by reply.';
  return `${cap(v.toLowerCase())}, told to us. The firm does not read it; a yes comes by reply.`;
}

const SHARED = /^NO MOBILE NUMBER ON FILE:.*?ASK IN THE SEASON LETTER\.\s*/;
/** The part of a contact check that is about this person only (the shared opening is the Reach word). */
function personalCheck(check: string): string {
  if (!SHARED.test(check)) return check ? plainLine(check) : '';
  const pref = /THOUGH THEIR PREFERRED CHANNEL IS (\w+)/.exec(check)?.[1];
  const rest = check.replace(SHARED, '').trim();
  return [pref ? `Prefers ${pref.toLowerCase()}, but has no mobile number on file.` : '', rest ? plainLine(rest) : ''].filter(Boolean).join(' ');
}

/** What a consultant told us about their days: the Availability tab rows with their name. */
function availabilityOf(name: string) {
  return tab('Availability')
    .rows.filter((r) => str(r.cells.B) === name)
    .map((r) => {
      const said = str(r.cells.F);
      const msgNo = /\(message (\d+)\)\s*$/.exec(said)?.[1];
      const m = msgNo ? engine.messages.find((x) => String(x.id) === msgNo) : undefined;
      return {
        row: r.row,
        day: str(r.cells.A),
        from: str(r.cells.C),
        to: str(r.cells.D),
        office: str(r.cells.E),
        free: str(r.cells.H) === 'free',
        reason: str(r.cells.I),
        quote: said.replace(/\s*\(message \d+\)\s*$/, '').replace(/^"|"$/g, ''),
        message: msgNo ?? null,
        channel: m?.channel ?? null,
      };
    })
    .sort((a, b) => a.day.localeCompare(b.day));
}

const hm = (v: string): string => (/^\d{1,2}:\d{2}$/.test(v) ? sheetTime(v) : v);

export function Bench({ query }: PageProps) {
  const rows = benchRows();
  const filter: Filter = isFilter(query.get('filter')) ? (query.get('filter') as Filter) : 'all';
  const active = FILTERS.find((f) => f.id === filter)!;
  const shown = rows.filter(active.test);
  const keep = filter === 'all' ? '' : `filter=${filter}&`;
  const hrefOf = (r: TabRow): string => `#/bench?${keep}who=${r.row}`;

  const groups: RecordGroup[] = [
    {
      id: 'bench',
      title: 'Consultants',
      rows: shown.map((r, i): RecordRow => {
        const name = cell(r, 'Consultant');
        const rc = reach(r);
        const holds = Number(r.cells[col('Hearings they hold now')] ?? 0);
        const rate = r.cells[col('Rate per hearing')];
        return {
          key: String(r.row),
          href: hrefOf(r),
          testId: `bench-row-${rows.indexOf(r) + 1}`,
          title: name,
          linkLabel: `Open ${name}`,
          meta: `prefers ${cell(r, 'Preferred channel') || 'email'}`,
          line: counties(r),
          side: (
            <>
              <State tone={rc.tone} testId={`bench-reach-${i + 1}`}>
                {rc.word}
              </State>
              <span className="l-small l-muted l-num">Up to {str(r.cells[col('Most hearings a day')])} hearings a day</span>
            </>
          ),
          right: typeof rate === 'number' ? `$${rate} a hearing` : 'Rate not set',
          sr: consultantHref(name) ? `Phone page at ${consultantHref(name)}` : undefined,
          rightSub: holds === 1 ? 'Holds 1 hearing' : `Holds ${holds} hearings`,
        };
      }),
    },
  ];

  const dockets = query.get('view') === 'dockets';
  const offers = docketDrafts().filter((d) => d.offer).length;
  const who = Number(query.get('who') ?? NaN);
  const selected = rows.find((r) => r.row === who) ?? shown[0];
  const pager = selected ? pagerOf(groups, String(selected.row)) : undefined;

  const emailOnly = rows.filter((r) => r.cells[col('Reach')] === 0).length;
  const names = new Set(rows.map((r) => cell(r, 'Consultant')));
  const named = hearings.filter((h) => names.has(str(h.consultant))).length;
  const perDay = cellNumber('Measures', 'B15');
  const perDayTarget = cellText('Measures', 'C15');
  const target = /^([\d.]+)/.exec(perDayTarget)?.[1];
  const oneDay = /([\d.]+) where an office agrees to one day/.exec(perDayTarget)?.[1];
  const video = /([\d.]+) on day-rate video days/.exec(perDayTarget)?.[1];
  const filterHref = (f: Filter): string => `#/bench${f === 'all' ? '' : `?filter=${f}`}`;

  usePageState({ page: 'bench', filter, listCount: shown.length, selected: selected ? cell(selected, 'Consultant') : null });

  return (
    <Page fit>
      <div data-testid="page-bench" style={{ display: 'contents' }}>
        <PageHeader title="Bench" line="Who takes hearings, where, at what rate, and how to reach them." />
        <Summary label="The bench in four figures" testId="bench-summary">
          <Stat
            testId="bench-consultants"
            label="Consultants"
            value={rows.length}
            foot="Counties, daily cap and rate each"
            source={<Src kind="measured" cell={`Bench A2:A${rows.at(-1)?.row ?? 2}`} />}
            href={filterHref('all')}
            current={filter === 'all'}
            name={`${rows.length} consultants. Show them all`}
          />
          <Stat
            testId="bench-per-day"
            label="Hearings a consultant-day"
            value={perDay ?? 'Not counted'}
            of={target ? `target ${target}` : undefined}
            foot={oneDay && video ? `Estimate: ${oneDay} one-day, ${video} video days` : 'Target on the Measures tab'}
            source={<Src kind="measured" cell="Measures B15; targets C15, Estimate" />}
          />
          <Stat
            testId="bench-email-only"
            label="Email only"
            value={emailOnly}
            of={`of ${rows.length}`}
            foot="Asked for a mobile number"
            source={<Src kind="measured" cell={`Bench ${col('Reach')}`} />}
          />
          <Stat
            testId="bench-named"
            label="Hearings named on them"
            value={named}
            of={`of ${hearings.length}`}
            foot="Consultant column of the Hearings tab"
            source={<Src kind="measured" cell="Hearings H" />}
          />
        </Summary>
        <Toolbar
          left={<Seg label="Which consultants" current={dockets ? '' : filter} items={FILTERS.map((f) => ({ id: f.id, label: f.label, count: rows.filter(f.test).length, href: filterHref(f.id) }))} />}
          right={
            <a className={buttonClass({ variant: dockets ? 'primary' : 'secondary', size: 'sm' })} href={dockets ? filterHref(filter) : `#/bench?${keep}view=dockets`} data-testid="bench-dockets-open" aria-current={dockets ? 'page' : undefined}>
              {dockets ? 'Close docket offers' : `Docket offers and texts (${offers})`}
            </a>
          }
        />
        <Workspace split="7-5">
          <ListRegion title={active.label} meta={<span className="l-num">{shown.length === 1 ? '1 consultant' : `${shown.length} consultants`}</span>}>
            {shown.length ? (
              <RecordTable groups={groups} selected={selected ? String(selected.row) : null} caption="The consultants on the Bench tab" heads={['Consultant and counties', 'Reach and daily cap', 'Rate and hearings']} testId="bench-table" />
            ) : (
              <div className="l-block">
                <EmptyState size="inline" headingLevel={3} title="No consultant in this list" description="Choose All consultants to see the bench." />
              </div>
            )}
          </ListRegion>
          {dockets ? (
            <DetailRegion
              testId="bench-dockets"
              head={
                <div className="l-detailhead-row">
                  <h2 className="l-section">Docket offers and day-before texts</h2>
                </div>
              }
              foot={<span className="l-small l-muted">One numbered text offers a whole docket (one office, one day), so one reply covers the day. Nothing is sent from here.</span>}
            >
              <Block title="Dockets from today on" meta={`${docketDrafts().length}`}>
                <DocketDrafts />
              </Block>
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <Block title="Files messages" meta={`${filesDrafts().length}`}>
                  <FilesDrafts />
                </Block>
              </div>
            </DetailRegion>
          ) : selected ? (
            <ConsultantDetail r={selected} pager={pager} />
          ) : null}
        </Workspace>
      </div>
    </Page>
  );
}

function ConsultantDetail({ r, pager }: { r: TabRow; pager?: ReturnType<typeof pagerOf> }) {
  const name = cell(r, 'Consultant');
  const rc = reach(r);
  const rate = r.cells[col('Rate per hearing')];
  const theirs = hearings.filter((h) => str(h.consultant) === name).sort((a, b) => str(a.date).localeCompare(str(b.date)));
  const days = availabilityOf(name);
  const own = personalCheck(cell(r, 'Contact check'));
  const prefers = [cell(r, 'Prefers: time of day'), cell(r, 'Prefers: format')].filter(Boolean).join(', ');
  return (
    <DetailRegion
      testId={`bench-detail-${r.row}`}
      head={
        <>
          <div className="l-detailhead-row">
            <h2 className="l-section l-clip" data-testid="detail-title">
              {name}
            </h2>
            {pager ? <PagerLinks p={pager} /> : null}
          </div>
          <State tone={rc.tone}>{rc.word}</State>
          <Facts
            items={[
              { term: 'Rate', value: typeof rate === 'number' ? `$${rate} a hearing` : 'Not set', testId: 'bench-rate' },
              { term: 'Daily cap', value: `${str(r.cells[col('Most hearings a day')])} hearings` },
              { term: 'Holds now', value: Number(r.cells[col('Hearings they hold now')] ?? 0) === 1 ? '1 hearing' : `${str(r.cells[col('Hearings they hold now')])} hearings` },
            ]}
          />
        </>
      }
      foot={
        <>
          <span className="l-small l-muted">From the Bench and Availability tabs.</span>
          {consultantHref(name) ? (
            <a className={buttonClass({ variant: 'ghost', size: 'md' })} href={consultantHref(name)!} data-testid="bench-consultant-page">
              Consultant’s phone page
            </a>
          ) : null}
          <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={`#/hearings?q=${encodeURIComponent(name)}`} data-testid="bench-hearings-open">
            Open {name.split(' ')[0]}’s hearings
          </a>
        </>
      }
    >
      <Block title="Their hearings" meta={`${theirs.length}`} testId="bench-hearings">
        {theirs.length ? (
          <ul className="l-checks">
            {theirs.map((h) => (
              <li key={h.case} className="l-check">
                <span className="l-check-name">
                  <span className="l-clip">
                    <a className="l-link" href={`#/hearings/${h.case}`}>
                      {street(h)}
                    </a>{' '}
                    <span className="l-num l-muted">{h.case}</span>
                  </span>
                  <span className="l-small l-muted">{h.county} office</span>
                </span>
                <span className="l-small l-ink2 l-num">
                  {dateShort(h.date)}, {sheetTime(h.time)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="l-small l-muted l-p">No hearing names {name} yet.</p>
        )}
      </Block>
      <Block title="What they told us about their days" meta={days.length ? `${days.length}` : undefined} testId="bench-availability">
        <div style={{ display: 'grid', gap: 12 }}>
          <p className="l-body l-p">
            <span className="l-small l-muted">In general: </span>“{cell(r, 'Standing availability')}”
          </p>
          {days.length ? (
            <ul className="l-checks">
              {days.map((d) => (
                <li key={d.row} className="l-check" data-testid={`bench-day-${d.row}`}>
                  <span className="l-check-name">
                    <span className="l-p">“{d.quote}”</span>
                    <span className="l-small l-muted l-num">
                      <span className="l-ink2">
                        {dateShort(d.day)}
                        {d.from && d.to ? `, ${hm(d.from)} to ${hm(d.to)}` : ''}
                      </span>
                      {d.message ? `, message ${d.message}` : ', a dated note'}
                      {d.channel ? `, by ${d.channel}` : ''}
                      {d.office ? `, ${d.office}` : ''}
                    </span>
                  </span>
                  <span className="l-check-right">
                    <State tone={d.free ? 'ok' : 'warn'}>{d.free ? 'Free' : d.reason === 'illness' ? 'Not free, ill' : 'Not free'}</State>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Block>
      <Drafts name={name} />
      <Block title="How to reach them" testId="bench-reach">
        <KeyValues
          items={[
            { term: 'Contact', value: `${cell(r, 'Contact')}, prefers ${cell(r, 'Preferred channel') || 'email'}` },
            { term: 'Texts and calls', value: rc.line },
            { term: 'Calendar', value: calendarWords(cell(r, 'Calendar shared')), testId: 'bench-calendar' },
            { term: 'Counties', value: counties(r) },
            { term: 'Prefers', value: prefers ? cap(prefers) : '' },
            { term: 'Season letter', value: cell(r, 'Season letter signed') ? 'Signed' : 'Not signed yet' },
            { term: 'Also', value: own },
          ]}
        />
      </Block>
      <div className="l-block">
        <SheetRef>
          <span>
            Bench tab, row {r.row}. Rate <span className="l-mono">Bench {col('Rate per hearing')}{r.row}</span>, daily cap{' '}
            <span className="l-mono">Bench {col('Most hearings a day')}{r.row}</span>, reach <span className="l-mono">Bench {col('Reach')}{r.row}</span> (code {str(r.cells[col('Reach')])}).
          </span>
          <span>
            Contact check <span className="l-mono">Bench {col('Contact check')}{r.row}</span>: {cell(r, 'Contact check')}
          </span>
          {days.map((d) => (
            <span key={d.row}>
              <span className="l-mono">Availability row {d.row}</span> {d.free ? 'free' : 'not free'}
            </span>
          ))}
        </SheetRef>
      </div>
    </DetailRegion>
  );
}

/** The messages the sheet has written for this consultant: offers, day-before texts, files messages. */
function Drafts({ name }: { name: string }) {
  const ds = docketDrafts();
  const offers = ds.filter((d) => d.offer?.to === name);
  const texts = ds.flatMap((d) => d.dayBefore.filter((x) => x.to === name).map((x, i) => ({ d, x, i })));
  const files = filesDrafts(name);
  const n = offers.length + texts.length + files.length;
  const href = consultantHref(name);
  return (
    <Block title={`Messages to ${name.split(' ')[0]}`} meta={`${n}`} testId="bench-drafts">
      {n === 0 ? <p className="l-small l-muted l-p">No message waits to go to {name}.</p> : null}
      {offers.map((d) => (
        <SimulatedDraft key={`o-${d.key}`} title={`Offer: ${d.county} office, ${dateShort(d.date)}`} draft={d.offer!} testId={`bench-offer-${d.key}`} />
      ))}
      {texts.map(({ d, x, i }) => (
        <SimulatedDraft
          key={`t-${d.key}-${i}`}
          title={`Day-before text: ${d.county} office, ${dateShort(d.date)}`}
          draft={x}
          testId={`bench-daybefore-${d.key}`}
          note={href ? <>The consultant reads it on <a className="l-link" href={href}>their phone page</a>.</> : undefined}
        />
      ))}
      {files.length ? <FilesDrafts name={name} /> : null}
    </Block>
  );
}
