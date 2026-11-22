/**
 * Measures and costs (#/measures), on the five regions:
 * - Page header: one plain savings sentence, marked Estimate, from the business case.
 * - Summary: five figures (a consultant's yes, ready on time, hearings per consultant-day, hearings
 *   per coordinator, cost per hearing), the last two marked Estimate.
 * - Toolbar: the tab's goals as links, plus "By status".
 * - List: each measure in plain words with its value now and one target.
 * - Detail: what it counts, the target, how it is counted, and the cells under "Sheet reference".
 * Every value is the Measures tab's own cell; nothing is counted again here.
 * ?goal=<block>, ?ref=<cell>, ?view=status and ?status=<word> select, so Back and reload work.
 */

import { buttonClass } from '@/components/ui/Button';
import { OVERVIEW_KPIS } from '@/lib/copy';
import { byNearest, cellNumber, cellText as cellTextSafe, hearings, measureRows } from '@/lib/data';
import { dateShort, sheetTime, workingDaysWords } from '@/lib/format';
import type { PageProps } from '@/lib/router';
import { Block, DetailRegion, ListRegion, Page, PageHeader, Seg, SheetRef, Src, Stat, State, Summary, Toolbar, Workspace, usePageState, type SegItem } from '@/layout/Regions';
import { statusOf, street } from '@/layout/model';
import { HeadFacts, PickHead, PickList, pagerFor, pick, type PickGroup, type PickRow } from '@/pages/agents/PickList';
import { measure, measureBlocks, measureTable, targetLine, targetText, type Measure } from './measures';
import { yesWindow } from './PlanBand';
import { recordDisagreements } from './caseNotes';

/* ---------- the write-up's measures (docs/write-up), with the same values, targets and labels ---------- */

interface WriteUp {
  key: string;
  group: 'Fewer errors' | 'More hearings' | 'Less human work' | 'Cost' | 'Guardrail';
  title: string;
  now: string;
  target: string;
  kind: 'measured' | 'estimate';
  counts: string;
  source: string;
  window: string;
  list?: string;
}

function writeUps(): WriteUp[] {
  const w = yesWindow();
  const rec = /(\d+) of (\d+)/.exec(cellTextSafe('Record check', 'C1'));
  const b15 = measure('B15');
  return [
    { key: 'wu-yes', group: 'Fewer errors', title: `No yes within ${w.days} working days`, now: `${w.none} of ${w.of}`, target: 'None', kind: 'measured', counts: `Hearings in the next ${w.days} working days with no consultant’s yes.`, source: 'Measures B3, from the Hearings tab', window: `The next ${w.days} working days (Settings B4)`, list: '#/hearings?filter=at-risk' },
    { key: 'wu-records', group: 'Fewer errors', title: 'Case records that disagree', now: rec ? `${rec[1]} of ${rec[2]}` : measure('B4').display, target: 'Under 1 in 20', kind: 'measured', counts: 'Case records whose date, consultant, files or status differ from the sheet.', source: 'Record check C1; a second person checks a sample of 10 every Friday', window: 'Every Friday, the example week' },
    { key: 'wu-perday', group: 'More hearings', title: 'Hearings per consultant-day', now: b15.display || '1.7', target: '2.4', kind: 'measured', counts: 'Hearings a consultant attends on each day they work; target 6 on video days.', source: 'Measures B15', window: 'The example week' },
    { key: 'wu-coordinator', group: 'Less human work', title: 'Hearings per coordinator, peak week', now: '92', target: 'Plan: 91 to 96', kind: 'estimate', counts: 'Hearings one coordinator covers in a peak week.', source: 'node cli/economics.js', window: 'A peak week' },
    { key: 'wu-minutes', group: 'Less human work', title: 'Coordinator minutes a hearing', now: '19.6', target: 'Plan: 18.7 to 19.6', kind: 'estimate', counts: 'Productive coordinator minutes per hearing held. No saving claimed for season one.', source: 'node cli/economics.js; payroll split by task in live week 1 replaces it', window: 'A normal week' },
    { key: 'wu-county', group: 'Less human work', title: 'Time to add a county', now: '4 to 12 hours', target: 'Under 1 day', kind: 'estimate', counts: 'Person-hours to read a new county’s rules, add its Offices row and check it.', source: 'SOLUTION_DESIGN.md, section 9', window: 'Per county' },
    { key: 'wu-cost', group: 'Cost', title: 'Cost per hearing', now: '$104', target: '$103', kind: 'estimate', counts: 'Consultant fee, coordinator time and tools, per hearing held; $95 at 1,000 a year.', source: 'node cli/economics.js', window: 'A year at 300 hearings' },
    { key: 'wu-guard', group: 'Guardrail', title: 'Share of hearings with a reduction', now: 'No result logged yet', target: 'Must not fall', kind: 'measured', counts: 'Hearings whose result is a reduction, by format and consultant, as days get fuller.', source: 'Measures, results by format and by consultant', window: 'Each week, from the weekly log' },
  ];
}



const TOP_DAYS = cellNumber('Settings', 'B4');

/** Six words or fewer for each measure, keyed by its cell. The tab's own sentence is in the Detail. */
const SHORT: Record<string, string> = {
  B2: 'Errors per 1,000 hearings held',
  B3: TOP_DAYS === null ? 'No consultant’s yes in time' : `No yes within ${TOP_DAYS} working days`,
  B4: 'Case records that disagree',
  B5: 'Appeals lost, nobody appeared',
  B6: 'Held with a proof missing',
  B7: 'Ready on time',
  B8: 'Over, no result logged',
  B9: 'Postponed, no new date',
  B10: 'Held, error entry missing',
  B11: 'Upcoming hearings ready now',
  B12: 'Proof links that prove their cell',
  B13: 'Yes by the offer’s deadline',
  B14: 'Weakest proof is a phone call',
  B15: 'Hearings per consultant-day',
  B16: 'Status typed over, formulas lost',
  B17: 'Not on, cancellation proof missing',
  B18: 'Coordinator minutes per hearing',
  B19: 'Waiting for the board’s decision',
  B20: 'Office asked twice, proof missing',
  B21: 'Video or phone, no link',
  B22: 'Messages per hearing',
  B23: 'Cost per hearing held',
  B24: 'Consultants over their daily cap',
  B25: 'Names the formulas do not read',
};

const shortLabel = (m: Measure): string => SHORT[m.ref] ?? m.title.split(' ').slice(0, 6).join(' ');
const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** A target that is a guess about money, minutes or people is an Estimate, not a measurement. */
const targetIsEstimate = (m: Measure): boolean => /estimate|\$|minute/i.test(m.target);

/** "Target: 0 after 1 working day" without the word "Target:", for the facts and the list line. */
const targetShort = (m: Measure): string => cap(targetLine(m.target).replace(/^Target: /, ''));

/** The estimates the tab writes in column C of rows 18 and 23, read from the text, never typed here. */
function coordinatorPeak(): { value: string; foot: string } | null {
  const c = measure('B18').target;
  const n = /(\d[\d,]*) today by estimate/i.exec(c);
  if (!n) return null;
  return { value: n[1]!, foot: 'Hearings in a peak week' };
}

function costPerHearing(): { value: string; foot: string } | null {
  const c = measure('B23').target;
  const n = /^(\$\d[\d,.]*) today \(estimate\)/i.exec(c.trim());
  if (!n) return null;
  const to = /to (\$\d[\d,.]*) at (\d[\d,]*) a year/i.exec(c);
  return { value: n[1]!, foot: to ? `${to[1]} at ${to[2]} a year` : 'All in, last logged week' };
}

/* ---------- the list ---------- */

interface Item extends PickRow {
  kind: 'measure' | 'table' | 'status' | 'writeup';
  wu?: WriteUp;
  m?: Measure;
  table?: string;
  status?: string;
}

const TABLES: { key: string; startsWith: string; title: string; line: string }[] = [
  { key: 'results-format', startsWith: 'Results by format', title: 'Results by format', line: 'Reductions, no change and no-shows, by hearing format.' },
  { key: 'results-consultant', startsWith: 'Results by consultant', title: 'Results by consultant', line: 'The same results, read by consultant.' },
];

/** Records that disagree as the write-up writes it, "11 of 24" (Record check C1), not a percent. */
function withCount(m: Measure): Measure {
  if (m.ref !== 'B4') return m;
  const r = /(\d+) of (\d+)/.exec(cellTextSafe('Record check', 'C1'));
  return r ? { ...m, display: `${r[1]} of ${r[2]}` } : m;
}

/**
 * Rows whose sheet target mixes two units (B4 finding: "92" read as minutes), said in the write-up's
 * words with each unit named, and rows the sheet does not count yet (MSG-59: AX-120 waits for the
 * board's letter, Measures B19 still reads 0).
 */
const ROW_LINE: Record<string, string> = {
  B18: 'Not counted yet. Estimates: 19.6 productive minutes a hearing; 92 hearings a coordinator in a peak week.',
};
const ROW_SUB: Record<string, (m: Measure) => string | undefined> = {
  B19: (m) => (m.display === '0' || m.display === '' ? 'Sheet value; AX-120 not yet counted' : undefined),
};

function measureItem(raw: Measure, goal: string): Item {
  const m = withCount(raw);
  const counted = Boolean(m.display);
  return {
    kind: 'measure',
    m,
    key: m.ref,
    href: `#/measures?${goal !== 'all' ? `goal=${goal}&` : ''}ref=${m.ref}`,
    title: shortLabel(m),
    name: `Show how it is counted: ${shortLabel(m)}: ${counted ? m.display : 'not counted yet'}`.slice(0, 80),
    line: ROW_LINE[m.ref] ?? (counted ? targetLine(m.target) : `Not counted yet. ${targetLine(m.target)}.`),
    right: counted ? m.display : <span className="l-muted" style={{ fontWeight: 400 }}>Not counted</span>,
    rightSub: m.overTarget ? <span className="l-danger">Above target</span> : ROW_SUB[m.ref]?.(m) ?? (counted ? (targetIsEstimate(m) ? 'Target is an estimate' : undefined) : 'No value yet'),
    testId: `measure-${m.ref}`,
  };
}

function statusGroups(): { label: string; rows: typeof hearings }[] {
  const by = new Map<string, typeof hearings>();
  for (const h of [...hearings].sort(byNearest)) {
    const l = statusOf(h).label;
    by.set(l, [...(by.get(l) ?? []), h]);
  }
  return [...by].map(([label, rows]) => ({ label, rows })).sort((a, b) => b.rows.length - a.rows.length || a.label.localeCompare(b.label));
}

/* ---------- the detail ---------- */

function MeasureDetail({ m: raw, pager }: { m: Measure; pager?: ReturnType<typeof pagerFor> }) {
  const m = withCount(raw);
  const est = targetIsEstimate(m);
  const kpi = (OVERVIEW_KPIS as Record<string, { href: string }>)[m.ref];
  const r = m.row;
  return (
    <DetailRegion
      testId="measure-detail"
      head={
        <PickHead title={shortLabel(m)} pager={pager}>
          {m.overTarget ? <State tone="warn">Above target</State> : <State tone="neutral">{m.display ? 'Counted on the sheet' : 'Not counted yet'}</State>}
          <HeadFacts
            items={[
              ['Now', <span className="l-num l-strong" key="v">{m.display || 'Not counted yet'}</span>],
              ['Target', targetShort(m)],
              ['Label', <Src key="s" kind={est ? 'estimate' : 'measured'} cell={`Measures B${r} and C${r}`} />],
            ]}
          />
        </PickHead>
      }
      foot={
        <>
          <span className="l-small l-muted">Read from the sheet. Nothing is counted again here.</span>
          {kpi && kpi.href !== '#/measures' ? (
            <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={kpi.href} data-testid="measure-open-list">Show these hearings</a>
          ) : null}
        </>
      }
    >
      <Block title="What it counts">
        <p className="l-p">{cap(m.title)}.</p>
        {m.detail ? <p className="l-p l-small l-ink2" style={{ marginTop: 4 }}>{m.detail}.</p> : null}
      </Block>
      <Block title="Target" meta={est ? 'Estimate' : undefined}>
        <p className="l-p">{targetText(m.target)}</p>
      </Block>
      <Block title="How it is counted">
        <p className="l-p">{m.how ? cap(m.how) : 'As the Measures tab states it.'}</p>
      </Block>
      <div className="l-block">
        <SheetRef>
          <span>Measures tab, row {r}: the measure in A{r}, the value in B{r}, the target in C{r}, how it is counted in D{r}.</span>
          {m.raw ? <span>B{r} as typed: {m.raw}</span> : <span>B{r} is empty.</span>}
        </SheetRef>
      </div>
    </DetailRegion>
  );
}

/** The hearings behind "No yes within N working days", nearest first (fills the detail; B1). */
function NoYesBlock() {
  const rows = [...yesWindow().noYes].sort(byNearest);
  return (
    <Block title="The hearings with no yes" meta={`${rows.length}`} testId="measure-wu-yes-hearings">
      <table className="l-table">
        <caption className="l-sr">Hearings in the window with no consultant’s yes</caption>
        <thead><tr><th scope="col" style={{ width: 120 }}>Hearing</th><th scope="col">Where</th><th scope="col" style={{ width: 200 }}>When</th></tr></thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.case}>
              <th scope="row" style={{ fontWeight: 400 }}><a className="l-link l-num" href={`#/hearings/${h.case}`}>{h.case}</a></th>
              <td>{street(h)}<span className="l-small l-muted" style={{ display: 'block' }}>{h.consultant ? `Consultant: ${String(h.consultant)}` : 'No consultant named'}</span></td>
              <td className="l-num" style={{ whiteSpace: 'nowrap' }}>{dateShort(h.date)}, {sheetTime(h.time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Block>
  );
}

function WriteUpDetail({ w, pager }: { w: WriteUp; pager?: ReturnType<typeof pagerFor> }) {
  const recs = w.key === 'wu-records' ? recordDisagreements() : [];
  const cases = [...new Set(recs.map((r) => r.case))];
  return (
    <DetailRegion
      testId="measure-detail"
      head={
        <PickHead title={w.title} pager={pager}>
          <State tone="neutral">{w.group}</State>
          <HeadFacts items={[['Now', <span className="l-num l-strong" key="v">{w.now}</span>], ['Target', w.target], ['Label', <Src key="s" kind={w.kind} cell={w.source} />]]} />
        </PickHead>
      }
      foot={
        <>
          <span className="l-small l-muted">The same value, target and label as the write-up.</span>
          {w.list ? <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={w.list} data-testid="measure-open-list">Show these hearings</a> : null}
        </>
      }
    >
      <Block title="What it counts"><p className="l-p">{w.counts}</p></Block>
      <Block title="Source and window"><p className="l-p">{w.source}. {w.window}.</p></Block>
      {w.key === 'wu-yes' ? <NoYesBlock /> : null}
      {recs.length ? (
        <Block title="The records that disagree" meta={`${cases.length} hearings`} testId="records-disagree">
          <table className="l-table">
            <caption className="l-sr">Case records that disagree with the sheet: the field and both values</caption>
            <thead><tr><th scope="col" style={{ width: 120 }}>Hearing</th><th scope="col" style={{ width: 128 }}>Field</th><th scope="col">What differs</th></tr></thead>
            <tbody>
              {recs.map((r, i) => (
                <tr key={`${r.case}-${r.field}-${i}`}>
                  <th scope="row" style={{ fontWeight: 400 }}><a className="l-link l-num" href={`#/hearings/${r.case}`} data-testid={`record-row-${r.case}`}>{r.case}</a></th>
                  <td>{r.field}</td>
                  <td className="l-small">{r.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      ) : null}
    </DetailRegion>
  );
}

function TableDetail({ t, pager }: { t: (typeof TABLES)[number]; pager?: ReturnType<typeof pagerFor> }) {
  const data = measureTable(t.startsWith);
  return (
    <DetailRegion testId="measure-detail" head={<PickHead title={t.title} pager={pager}><State tone="neutral">{data && data.rows.every((r) => r.cells.slice(1).every((c) => c === '' || c === '0')) ? 'No result logged yet' : 'Results logged'}</State></PickHead>}>
      {data ? (
        <table className="l-table" aria-label={t.title}>
          <thead>
            <tr>
              {data.headers.map((h, i) => <th key={h} scope="col" className={i > 0 ? 'num' : undefined}>{cap(h)}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.row}>
                {row.cells.map((c, i) => (i === 0 ? <th key={i} scope="row" style={{ fontWeight: 500 }}>{cap(c)}</th> : <td key={i} className="num">{c === '' ? <span className="l-muted">None yet</span> : c}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="l-block l-muted l-p">The tab has no such table.</p>
      )}
      <div className="l-block">
        <SheetRef>
          <span>{data ? `Measures A${data.titleRow} to G${data.rows.at(-1)?.row ?? data.titleRow}, as the tab counts them.` : 'Measures tab.'}</span>
        </SheetRef>
      </div>
    </DetailRegion>
  );
}

function StatusDetail({ label, rows, pager }: { label: string; rows: typeof hearings; pager?: ReturnType<typeof pagerFor> }) {
  return (
    <DetailRegion testId="measure-detail" head={<PickHead title={label} pager={pager}><HeadFacts items={[['Hearings', <span className="l-num l-strong" key="n">{rows.length}</span>], ['Of', `${hearings.length} in the example week`], ['Label', <Src key="s" kind="measured" cell="Hearings, Status column" />]]} /></PickHead>}>
      <table className="l-table" aria-label={`Hearings: ${label}`}>
        <thead>
          <tr>
            <th scope="col">Hearing</th>
            <th scope="col" className="due" style={{ width: 168 }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.case}>
              <th scope="row" style={{ fontWeight: 400 }}>
                <a className="l-rowaddr" href={`#/hearings/${h.case}`} data-testid={`status-open-${h.case}`}>{street(h)}</a>{' '}
                <span className="l-num l-muted">{h.case}</span>
                <span className="l-small l-muted" style={{ display: 'block' }}>{h.county}</span>
              </th>
              <td className="due">
                <span className="l-due"><b>{dateShort(h.date)}, {sheetTime(h.time)}</b><span>{workingDaysWords(h.workingDays)}</span></span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DetailRegion>
  );
}

/* ---------- the page ---------- */

export function Measures({ query }: PageProps) {
  const blocks = measureBlocks();
  const view = query.get('view') === 'status' ? 'status' : 'goal';
  const goalAsked = query.get('goal') ?? 'all';
  const goal = goalAsked === 'results' || goalAsked === 'writeup' || blocks.some((b) => b.id === goalAsked) ? goalAsked : 'all';
  const log = measureRows().find((r) => String(r.cells.A ?? '').startsWith('Weekly log'));
  const logHead = log ? measureRows().find((r) => r.row === log.row + 1) : undefined;
  const logged = logHead ? measureRows().filter((r) => r.row > logHead.row && r.row < logHead.row + 13 && r.cells.A !== undefined).length : 0;

  let groups: PickGroup[];
  if (view === 'status') {
    groups = [
      {
        id: 'status',
        title: '',
        rows: statusGroups().map((g) => ({
          key: g.label,
          href: `#/measures?view=status&status=${encodeURIComponent(g.label)}`,
          title: g.label,
          name: `${g.rows.length} hearings: ${g.label}. Show them`,
          line: g.rows.slice(0, 3).map((h) => h.case).join(', ') + (g.rows.length > 3 ? ` and ${g.rows.length - 3} more` : ''),
          right: g.rows.length,
          rightSub: g.rows.length === 1 ? 'hearing' : 'hearings',
          testId: `status-row-${g.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        })),
      },
    ];
  } else {
    const wus = writeUps();
    const wuGroups: PickGroup[] = goal === 'all' || goal === 'writeup'
      ? (['Fewer errors', 'More hearings', 'Less human work', 'Cost', 'Guardrail'] as const).map((g) => ({
          id: `wu-${g.toLowerCase().replace(/ /g, '-')}`,
          title: g,
          testId: `measure-group-wu-${g.toLowerCase().replace(/ /g, '-')}`,
          rows: wus.filter((w) => w.group === g).map<Item>((w) => ({
            kind: 'writeup',
            wu: w,
            key: w.key,
            href: `#/measures?${goal !== 'all' ? `goal=${goal}&` : ''}ref=${w.key}`,
            title: w.title,
            name: `Show how it is counted: ${w.title}: ${w.now}. Target ${w.target}`.slice(0, 80),
            line: <>{w.counts} <span className="l-muted">{w.window}.</span> <Src kind={w.kind} cell={w.source} /></>,
            right: w.now,
            rightSub: w.target === 'None' ? 'Target: none' : w.target === 'Must not fall' ? 'Must not fall' : /^Plan: /.test(w.target) ? w.target.replace(/^Plan: /, 'Plan ') : `Target ${w.target.charAt(0).toLowerCase()}${w.target.slice(1)}`,
            testId: `measure-${w.key}`,
          })),
        }))
      : [];
    groups = [
      ...wuGroups,
      ...blocks
        .filter((b) => goal === 'all' || b.id === goal)
        .map((b) => ({ id: b.id, title: `From the sheet: ${b.title}`, testId: `measure-group-${b.id}`, rows: b.measures.map((m) => measureItem(m, goal)) })),
    ];
    if (goal === 'all' || goal === 'results') {
      groups.push({
        id: 'results',
        title: 'Results and the weekly log',
        testId: 'measure-group-results',
        rows: [
          ...TABLES.map((t) => ({ key: t.key, href: `#/measures?${goal !== 'all' ? `goal=${goal}&` : ''}ref=${t.key}`, title: t.title, line: t.line, right: '', rightSub: 'Table', testId: `measure-${t.key}` })),
          {
            key: 'weekly-log',
            href: `#/measures?${goal !== 'all' ? `goal=${goal}&` : ''}ref=weekly-log`,
            title: 'Weekly log',
            line: logged ? `${logged} weeks logged.` : 'No week logged yet. The Friday checker types each week.',
            right: logged,
            rightSub: 'weeks logged',
            testId: 'measure-weekly-log',
          },
        ],
      });
    }
  }
  const rows = groups.flatMap((g) => g.rows);
  const selKey = view === 'status' ? query.get('status') : query.get('ref');
  const sel = pick(rows, selKey ?? (view === 'goal' && rows.some((r) => r.key === 'wu-yes') ? 'wu-yes' : null));
  const pager = sel ? pagerFor(rows, sel.key) : undefined;
  const byRef = new Map(blocks.flatMap((b) => b.measures).map((m) => [m.ref, m]));
  const groupsShown = statusGroups();
  usePageState({ page: 'measures', view, goal, listCount: rows.length, selected: sel?.key ?? null });

  const b3 = measure('B3');
  const b7 = measure('B7');
  const b15 = measure('B15');
  const target15 = /^([\d.]+)/.exec(b15.target)?.[1];
  const peak = coordinatorPeak();
  const cost = costPerHearing();
  const segs: SegItem[] = [
    { id: 'all', label: 'All', count: blocks.reduce((n, b) => n + b.measures.length, 0) + writeUps().length + TABLES.length + 1, href: '#/measures' },
    { id: 'writeup', label: 'Write-up measures', count: writeUps().length, href: '#/measures?goal=writeup' },
    ...blocks.map((b) => ({ id: b.id, label: cap(b.title), count: b.measures.length, href: `#/measures?goal=${b.id}` })),
    { id: 'results', label: 'Results', count: TABLES.length + 1, href: '#/measures?goal=results' },
    { id: 'status', label: 'By status', count: groupsShown.length, href: '#/measures?view=status' },
  ];

  let detail = null;
  if (sel) {
    const it = sel as Item;
    if (it.kind === 'writeup' && it.wu) {
      detail = <WriteUpDetail w={it.wu} pager={pager} />;
    } else if (view === 'status') {
      const g = groupsShown.find((x) => x.label === sel.key);
      if (g) detail = <StatusDetail label={g.label} rows={g.rows} pager={pager} />;
    } else if (byRef.has(sel.key)) {
      detail = <MeasureDetail m={byRef.get(sel.key)!} pager={pager} />;
    } else if (it.key === 'weekly-log') {
      detail = (
        <DetailRegion testId="measure-detail" head={<PickHead title="Weekly log" pager={pager}><State tone="neutral">{logged ? `${logged} weeks logged` : 'No week logged yet'}</State></PickHead>}>
          <Block title="What it holds">
            <p className="l-p">Each Friday the checker types the hearings held and the coordinator hours. The sheet then works out minutes per hearing, messages per hearing and cost per hearing.</p>
          </Block>
          <div className="l-block">
            <SheetRef><span>{log ? `Measures A${log.row} and the rows below it.` : 'Measures tab.'}</span></SheetRef>
          </div>
        </DetailRegion>
      );
    } else {
      const t = TABLES.find((x) => x.key === sel.key);
      if (t) detail = <TableDetail t={t} pager={pager} />;
    }
  }

  return (
    <div data-testid="page-measures" className="contents min-[1200px]:[&_.l-summary]:grid-cols-5! [&_.l-details>div]:max-w-[48ch]!">
      <Page fit>
        <PageHeader
          title="Measures and costs"
          line={<>Value: missed hearings prevented, not minutes saved. <Src kind="estimate" cell="node cli/economics.js" /></>}
        />
        <Summary label="Measures and costs in five figures" testId="measures-summary">
          <Stat testId="stat-b3" label="Need a yes now" value={b3.display || '0'} of={`of ${yesWindow().of}`} tone={b3.overTarget ? 'danger' : undefined} foot={TOP_DAYS === null ? 'Target 0' : `Within ${TOP_DAYS} working days. Target 0`} source={<Src kind="measured" cell="Measures B3" testId="label-chip-B3" />} href="#/measures?ref=B3" name={`${b3.display} hearings need a consultant’s yes. Show the measure`} />
          <Stat testId="stat-b7" label="Ready on time" value={b7.display || 'Not counted'} foot={cap(targetShort(b7).split('.')[0]!)} source={<Src kind="measured" cell="Measures B7" />} href="#/measures?ref=B7" name={`Ready on time ${b7.display}. Show the measure`} />
          <Stat testId="stat-b15" label="Per consultant-day" value={b15.display || 'Not counted'} of={target15 ? `target ${target15}` : undefined} foot="By the end of the season" source={<Src kind="measured" cell="Measures B15" />} href="#/measures?ref=B15" name={`${b15.display} hearings per consultant-day. Show the measure`} />
          <Stat testId="stat-coordinator" label="Per coordinator" value={peak?.value ?? 'Not on the sheet'} foot={peak ? `${peak.foot}; plan 91 to 96` : 'Measures C18'} source={<Src kind="estimate" cell="Measures C18" />} href="#/measures?ref=B18" name={`${peak?.value ?? 'No'} hearings per coordinator in a peak week, estimate. Show the measure`} />
          <Stat testId="stat-cost" label="Cost per hearing" value={cost?.value ?? 'Not on the sheet'} foot={cost ? 'Target $103; $95 at 1,000 a year' : 'Measures C23'} source={<Src kind="estimate" cell="Measures C23" />} href="#/measures?ref=B23" name={`Cost per hearing ${cost?.value ?? 'not on the sheet'}, estimate. Show the measure`} />
        </Summary>
        <Toolbar
          left={<Seg label="Which measures" current={view === 'status' ? 'status' : goal} items={segs} />}
          right={<a className="l-link l-small" href="#/evidence" data-testid="link-evidence">How each figure was checked</a>}
        />
        <Workspace>
          <ListRegion title={view === 'status' ? 'Hearings by status' : 'Measures'} meta={<span className="l-num">{view === 'status' ? `${hearings.length} hearings` : `${rows.length} items`}</span>}>
            <PickList groups={groups} selected={sel?.key ?? null} caption={view === 'status' ? 'Hearings by status, the largest group first' : 'Each measure with its value now and its target'} columns={view === 'status' ? ['Status and its hearings', 'Hearings'] : ['Measure and target', 'Now']} />
          </ListRegion>
          {detail ?? (
            <DetailRegion head={<h2 className="l-section">Nothing to show</h2>}>
              <p className="l-block l-muted l-p">Choose a measure on the left.</p>
            </DetailRegion>
          )}
        </Workspace>
      </Page>
    </div>
  );
}
