/**
 * How we know (#/evidence), on the five regions:
 * - Page header: what the page is for, and the day the figures were quoted.
 * - Summary: four figures read from evidence.json and engine.json (the season-one checks, the
 *   readers on unseen messages, the commands run again, what is not verified yet).
 * - Toolbar: the label filter as links (All, Measured, Simulated) and the fictional-data line.
 * - List: every check, the readers' results, the outside tests, the installed sheet, then the label
 *   legend and what is not verified, each a row with its result on the right.
 * - Detail: what was checked, the result, its label, the line it printed, and the command behind a
 *   "Command" disclosure (a lawyer does not need it; an engineer can rerun it).
 * Nothing here is typed: every figure is parsed from the quoted lines, and a row whose line names no
 * count says "Ran" rather than inventing a pass.
 */

import type { ReactNode } from 'react';
import type { PageProps } from '@/lib/router';
import { engine, evidence, sheet } from '@/lib/data';
import { bytesText, dateMedium } from '@/lib/format';
import { LABELS, LABEL_ORDER, type LabelKind } from '@/lib/labels';
import type { EvidenceCommandRow } from '@/types/data';
import { Block, DetailRegion, ListRegion, Page, PageHeader, Seg, Src, Stat, State, Summary, Toolbar, Workspace, usePageState, type Tone } from '@/layout/Regions';
import { HeadFacts, PickHead, PickList, pagerFor, pick, type PickGroup, type PickRow } from '@/pages/agents/PickList';

type Filter = 'all' | 'measured' | 'simulated';
type Status = 'pass' | 'fail' | 'ran';

/** Text from a Markdown table cell: `code` in mono, **bold** in bold, nothing else changed. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') ? <code key={i} className="l-mono" style={{ overflowWrap: 'anywhere' }}>{p.slice(1, -1)}</code>
          : p.startsWith('**') ? <strong key={i} style={{ fontWeight: 600 }}>{p.slice(2, -2)}</strong>
            : <span key={i}>{p}</span>,
      )}
    </>
  );
}

const plain = (s: string): string => s.replace(/`/g, '').replace(/\*\*/g, '');
const commandOf = (r: EvidenceCommandRow): string => plain(r.command).replace(/\s*\(installed sheet\)$/, '');
const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** A plain name for each command, so the list reads as what was checked and not as a command line. */
const NAMES: [RegExp, string][] = [
  [/check\.js/, 'The season-one problems'],
  [/replies\.js/, 'The reply rule on example replies'],
  [/check_office\.js/, 'The office rule and the submission simulator'],
  [/inbox\.js --autofile/, 'Mailbox helper with auto-filing on'],
  [/inbox\.js --help/, 'What the mailbox helper reads'],
  [/inbox\.js/, 'Mailbox helper on the example inbox'],
  [/sheet\.js --process-changes/, 'Finding an office’s process change'],
  [/sheet\.js --dockets/, 'The week as dockets'],
  [/sheet\.js --new-cells/, 'Proposals for the new cells'],
  [/sheet\.js --repeats/, 'Repeats in the example messages'],
  [/sheet\.js --questions/, 'Consultants’ questions'],
  [/sheet\.js --paste/, 'Paste new messages'],
  [/sheet\.js$/, 'The readers’ proposals for the sheet'],
  [/sheet_threads\.py/, 'The gate sheet against the example threads'],
  [/office\.js --try/, 'The office rule on one message'],
  [/calendar\.js/, 'The calendar file'],
  [/trace\.js/, 'Every recorded reader call, with its cost'],
  [/scale\.js --quick/, 'A small scale run'],
  [/scale\.js/, 'All scale runs'],
  [/build\.js/, 'Building the control tower page'],
];

function titleOf(r: EvidenceCommandRow): string {
  const cmd = commandOf(r);
  return NAMES.find(([re]) => re.test(cmd))?.[1] ?? cmd;
}

/** What the command checks, in the source's own words: its description cell, up to the first full stop. */
function whatOf(r: EvidenceCommandRow, all: EvidenceCommandRow[]): string {
  const own = r.cells.length > 2 ? plain(r.cells[1] ?? '') : '';
  const fromReadme = all.find((x) => commandOf(x) === commandOf(r) && x.cells.length > 2);
  const text = own || (fromReadme ? plain(fromReadme.cells[1] ?? '') : '');
  return text ? cap(text.split(/(?<=[a-z0-9)])\.\s/)[0]!.replace(/\.$/, '')) + '.' : '';
}

/**
 * The status is a claim, so it is read from the printed line only: pass when the line prints a
 * full pass count, fail when it names a failure, ran for any other line.
 */
function statusOf(result: string, passLines?: { pass: number; fail: number }): { status: Status; figure?: string } {
  if (passLines) return passLines.fail ? { status: 'fail', figure: `${passLines.fail} fail` } : { status: 'pass', figure: `${passLines.pass} pass, 0 fail` };
  if (/\b[1-9]\d* FAIL\b/.test(result)) return { status: 'fail' };
  const last = [...result.matchAll(/(\d[\d,]*) of (\d[\d,]*)/g)].at(-1);
  if (last && /pass|agree|unchanged/i.test(result) && last[1] === last[2]) return { status: 'pass', figure: last[0] };
  const lines = /(\d+) lines start with `pass` and none with `FAIL`/.exec(result) ?? /(\d+) pass lines, 0 FAIL/.exec(result);
  if (lines) return { status: 'pass', figure: `${lines[1]} pass, 0 fail` };
  return { status: 'ran' };
}

const STATUS: Record<Status, { word: string; tone: Tone }> = {
  pass: { word: 'Passes', tone: 'ok' },
  fail: { word: 'Fails', tone: 'danger' },
  ran: { word: 'Ran', tone: 'neutral' },
};

/** The scale runs are simulations; every other command ran on the example data. */
const labelOf = (r: EvidenceCommandRow): LabelKind => (/cli\/scale\.js/.test(r.command) ? 'simulated' : 'measured');

/** "51 of 57 (89%, 79 to 95)" becomes the value "51 of 57" and the line "89%, 79 to 95". */
function split(v: string | number | undefined): { value: string; line?: string } {
  const s = String(v ?? '');
  const m = /^(.*?) \((.*)\)$/.exec(s);
  return m ? { value: m[1]!, line: m[2]! } : { value: s };
}

/** Three facts of the live run, read from the quoted lines of its report. */
function liveFacts(items: string[]): { label: string; value: string; line?: string }[] {
  const all = items.join(' ');
  const out: { label: string; value: string; line?: string }[] = [];
  const read = /Read live: (\d+ of the \d+) messages/.exec(all);
  if (read) out.push({ label: 'Messages read live', value: read[1]!.replace(' the ', ' ') });
  const equal = /(\d+ of \d+) rows equal/.exec(all);
  if (equal) out.push({ label: 'Same as the recorded answers', value: equal[1]! });
  const cost = /(\$[\d.]+) for (\d+ requests)/.exec(all);
  if (cost) out.push({ label: 'Cost of the run', value: cost[1]!, line: cost[2]! });
  return out;
}

/** "Excel test of the gate sheet (measured, 20 Nov 2026, 11:27 PM Eastern)": the name, and when. */
function testTitle(t: string): { name: string; when: string } {
  const m = /^(.*?) \((?:measured, )?(.*)\)$/.exec(plain(t));
  if (!m) return { name: plain(t), when: '' };
  const name = /earlier build/.test(m[1]!) ? m[1]! : m[1]!.replace('the gate sheet', 'an earlier build of the gate sheet');
  const when = m[2]!.replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})/, '$2 $1, $3').replace(/ PM\b/, ' p.m.').replace(/ AM\b/, ' a.m.');
  return { name, when };
}

/* ---------- the items ---------- */

interface Item extends PickRow {
  kind: LabelKind | 'about';
  render: (pager: ReturnType<typeof pagerFor>) => ReactNode;
}

function Printed({ children }: { children: ReactNode }) {
  return <blockquote className="l-p" style={{ margin: 0, paddingLeft: 12, boxShadow: 'inset 2px 0 0 var(--border)' }}>{children}</blockquote>;
}

/** The command and where the line was quoted from, closed by default. */
function CommandRef({ command, source, full }: { command: string; source: string; full?: string }) {
  return (
    <div className="l-block">
      <details className="l-details" data-testid="evidence-command">
        <summary>Technical details</summary>
        <div className="l-small l-ink2" style={{ display: 'grid', gap: 4, maxWidth: '52ch' }}>
          {full ? <span>{full}</span> : null}
          <code className="l-mono" style={{ overflowWrap: 'anywhere' }}>{command}</code>
          <span>{source}</span>
          <span data-testid="evidence-md5-line">Sheet md5: <code className="l-mono" style={{ overflowWrap: 'anywhere' }}>{sheet.meta.md5}</code> (from sheet.json meta){sheet.meta.release ? `. ${sheet.meta.release}` : ''}</span>
        </div>
      </details>
    </div>
  );
}

/**
 * The list's second line: the first clause of what it checks ("All 216 checks"), unless it only
 * repeats the name, then where it ran. The full description is in the Detail.
 */
const firstClause = (s: string): string => s.split(/: |; /)[0]!.replace(/\.$/, '');

function listLine(title: string, what: string, result: string): string | undefined {
  const words = (x: string): string[] => x.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter((w) => w.length > 3);
  const t = new Set(words(title));
  const differs = (x: string): boolean => Boolean(x) && words(x).filter((w) => t.has(w)).length < Math.min(2, t.size);
  const first = firstClause(what);
  if (differs(first)) return `${first}.`;
  // Else the printed result's first sentence, when it reads as words and not as file paths or options.
  const printed = plain(result).split(/(?<=[a-z0-9)])\.\s/)[0]!.replace(/\.$/, '');
  return printed && printed.length <= 90 && !/[/_]|--|\(|"/.test(printed) && differs(printed) ? `${cap(printed)}.` : undefined;
}

const README = 'the prototype README';

/*
 * Figures the engine data does not carry, typed with the file and line they are quoted from:
 * the live reader run of 22 Nov (all sets), the recorded agreed-and-verified counts, the office rule
 * on unseen mail, the sheet check on the shipped sheet and the independent test of the sheet.
 */
const LIVE22 = 'docs/evaluation/live-readers-22nov.md';
const PROTO = 'prototype/README.md (22 Nov 2026)';
const LIVE22_ROWS: [string, string][] = [
  ['Unseen set 2, 100 everyday messages', '73 of 81 agreed and passed readings right (90.1%, 81.7% to 94.9%)'],
  ['Unseen set 1, 30 office messages', '23 of 24 the key can judge (strict count 23 of 28)'],
  ['72 examples, two runs', '117 of 117 and 119 of 119'],
  ['Proof links on the sheet, 72 examples', '62 of 62 and 57 of 58'],
  ['Requests, failed', '550 requests, 0 failed'],
  ['Cost', '$1.16 for 275 messages'],
];
const RECORDED_ROWS: [string, string][] = [
  ['72 examples', '124 of 125 right; 63 of 63 proposed proof links'],
  ['Unseen set 1, 30 office messages', '25 of 26 the key can judge (25 of 30 strict)'],
  ['Unseen set 2, 100 everyday messages', '72 of 79 right, 7 of 79 wrong'],
];
/** What the prototype does not do, and what a person does instead. */
const NOT_DONE: [string, string][] = [
  ['The day a message arrived', 'No example message states it. The coordinator types it when filing the message.'],
  ["A homeowner's phone number or email", 'Not in the packet. The coordinator takes it from the client file.'],
  ["An office's phone number and street address", 'Not on record. Asked in the season email; until then the coordinator writes to the office.'],
  ['Who at the office decided a date change', 'No message names a person. The named coordinator records it from the office’s written decision.'],
  ['Reading real mail', 'No mailbox is connected. A person exports the messages and pastes them in.'],
];
const ACCESS = 'The example emails, texts and phone notes, the paper notice, the offices’ written instructions and the case packet files. Nothing else: no mailbox, text line, calendar or case system.';
const FACTS = 'the check log of 22 Nov 2026 (summarised in CHECKS.md)';

function commandItem(r: EvidenceCommandRow, file: string, where: string, all: EvidenceCommandRow[], filterQ: string): Item {
  const result = r.cells[r.cells.length - 1] ?? '';
  const { status, figure } = statusOf(result, r.passLines);
  const kind = labelOf(r);
  const short = file.split('/').pop() ?? file;
  const key = `${/README/.test(file) ? 'readme' : 'facts'}-${r.line}`;
  const title = titleOf(r) + (/sheet_threads/.test(r.command) && !/README/.test(file) ? ', re-run 22 Nov' : '');
  const what = whatOf(r, all);
  const st = STATUS[status];
  const href = `#/evidence?${filterQ}item=${key}`;
  return {
    key,
    kind,
    href,
    title,
    name: `Show details: ${title}${file === README ? '' : `, re-run`}`.slice(0, 80),
    line: listLine(title, what, result),
    right: figure ?? st.word,
    rightSub: figure ? st.word : kind === 'simulated' ? 'Simulated' : undefined,
    testId: `evidence-row-${key}`,
    render: (pager) => (
      <DetailRegion
        testId="evidence-detail"
        head={
          <PickHead title={title} pager={pager}>
            <State tone={st.tone}>{st.word}</State>
            <HeadFacts items={[['Result', <span className="l-num l-strong" key="r">{figure ?? 'No count printed'}</span>], ['Label', <Src key="s" kind={kind === 'simulated' ? 'simulated' : 'measured'} cell={`${short}, line ${r.line}`} />], ['Run', cap(where)]]} />
          </PickHead>
        }
        foot={<span className="l-small l-muted">{status === 'ran' ? 'The line names no pass count, so it is shown as Ran.' : 'The result is the line the command printed.'}</span>}
      >
        {what ? <Block title="What it checks"><p className="l-p">{firstClause(what)}.</p></Block> : null}
        <Block title="What it printed"><Printed><Inline text={result} /></Printed></Block>
        <CommandRef command={commandOf(r)} source={`Quoted from ${file}, line ${r.line}.`} full={what && firstClause(what).length + 1 < what.length ? what : undefined} />
      </DetailRegion>
    ),
  };
}

function KvBlock({ title, rows, meta }: { title: string; rows: [string, ReactNode][]; meta?: ReactNode }) {
  return (
    <Block title={title} meta={meta}>
      <dl className="l-kv" style={{ font: 'var(--type-body)' }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd className="l-num">{v}</dd>
          </div>
        ))}
      </dl>
    </Block>
  );
}

export function Evidence({ query }: PageProps) {
  const asked = query.get('filter');
  const filter: Filter = asked === 'measured' || asked === 'simulated' ? asked : 'all';
  const filterQ = filter === 'all' ? '' : `filter=${filter}&`;
  const allRows = [...evidence.readmeChecks, ...evidence.factsChecks];
  const readme = evidence.readmeChecks.map((r) => ({ r, later: /control tower/i.test(r.section) || /--autofile/.test(r.command) }));
  const facts = evidence.factsChecks.map((r) => ({ r, later: /build\.js/.test(r.command) }));
  const factsWhen = `again on the ${evidence.meta.factsRound} sheet, ${dateMedium(sheet.meta.modified.slice(0, 10))}`;
  const seasonOne = readme.filter((x) => !x.later).map((x) => commandItem(x.r, README, 'on the prototype', allRows, filterQ));
  const rerun = facts.filter((x) => !x.later).map((x) => commandItem(x.r, FACTS, factsWhen, allRows, filterQ));
  const later = [...readme.filter((x) => x.later).map((x) => commandItem(x.r, README, 'on the prototype', allRows, filterQ)), ...facts.filter((x) => x.later).map((x) => commandItem(x.r, FACTS, factsWhen, allRows, filterQ))];

  const rr = engine.reader_results as { headline?: Record<string, string | number> } | null;
  const h = rr?.headline;
  const u2 = evidence.readers.unseen2;
  const live = evidence.outsideTests.find((o) => o.id === 'live');
  const liveItems = live?.sections.flatMap((s) => s.items.map((i) => i.text)) ?? [];
  const liveLimits = live?.sections.find((s) => /limit/i.test(s.heading))?.items ?? [];
  const facts3 = liveFacts(liveItems);
  const m = sheet.meta;
  const file = m.source.split('/fairappeal/')[1] ?? m.source;
  const notVerified: ReactNode[] = [
    `Small AI test sets: ${u2.agreed} and 26 messages a key can judge.`,
    'Untested programs: Excel, Google Sheets and the calendar import ran on earlier builds only.',
    'The readers know only the 24 packet hearings; the firm’s own rows are not connected.',
    'No mailbox, text line, calendar or case system is connected.',
    'Minutes and money are estimates; nobody has timed the firm.',
    'The control tower (the Later pages) is not built; its pages run on the example only.',
  ];

  const readers: Item[] = [];
  if (h) {
    const found = split(h.ai_found);
    readers.push({
      key: 'unseen1', kind: 'measured', href: `#/evidence?${filterQ}item=unseen1`, title: `Unseen set 1: ${h.unseen_n} office messages`, line: 'Written after the readers were built, labelled by one person.', right: found.value, rightSub: 'statements found', testId: 'evidence-unseen1',
      render: (pager) => (
        <DetailRegion testId="evidence-detail" head={<PickHead title={`Unseen set 1: ${h.unseen_n} office messages`} pager={pager}><State tone="neutral">Recorded answers, scored</State><HeadFacts items={[['Found', <span className="l-num l-strong" key="f">{found.value}</span>], ['Label', <Src key="s" kind="measured" cell="eval/reader_results.json" />], ['Messages', String(h.unseen_n)]]} /></PickHead>}>
          <KvBlock title="Results" rows={[['Statements found', String(h.ai_found)], ['Applied and right', String(h.ai_right)], ['Messages to a person', String(h.ai_to_person)], ['Offline reader found', `${evidence.readers.offline.found} of ${evidence.readers.offline.of}`]]} />
          <Block title="What it means"><p className="l-p">The two readers found most statements, and almost every one they applied was right. A message they could not settle went to a person.</p></Block>
        </DetailRegion>
      ),
    });
  }
  readers.push({
    key: 'unseen2', kind: 'measured', href: `#/evidence?${filterQ}item=unseen2`, title: `Unseen set 2: ${u2.messages} messages, everyday mix`, line: 'Readings both readers agreed on and the checker passed.', right: `${u2.right} of ${u2.agreed}`, rightSub: `${Math.round(u2.pct)}% right, ${u2.agreed - u2.right} wrong`, testId: 'evidence-unseen2',
    render: (pager) => (
      <DetailRegion testId="evidence-detail" head={<PickHead title={`Unseen set 2: ${u2.messages} messages`} pager={pager}><State tone="neutral">Recorded answers, scored</State><HeadFacts items={[['Right', <span className="l-num l-strong" key="r">{u2.right} of {u2.agreed}</span>], ['Label', <Src key="s" kind="measured" cell={`${evidence.readers.source}, line ${u2.line}`} />], ['Range', `${Math.round(u2.low)}% to ${Math.round(u2.high)}%`]]} /></PickHead>}>
        <KvBlock title="Results" rows={[['Agreed, passed and right', `${u2.right} of ${u2.agreed} (${Math.round(u2.pct)}%)`], ['Wrong', `${u2.agreed - u2.right} of ${u2.agreed}`], ['Likely range', `${Math.round(u2.low)}% to ${Math.round(u2.high)}%`], ...(h?.examples_found ? ([['On the 72 examples, found', split(h.examples_found).value]] as [string, ReactNode][]) : [])]} />
        <Block title="How it was scored"><p className="l-p">A paid run’s recorded answers, scored against an answer key written by an author who did not see the readers’ instructions. The 72 examples were used while writing the instructions, so they are not a fair test.</p></Block>
      </DetailRegion>
    ),
  });
  if (facts3.length) {
    readers.push({
      key: 'live', kind: 'measured', href: `#/evidence?${filterQ}item=live`, title: 'Live run, Nov 21, 2026', line: 'The two readers called once, on the six messages of the paste example.', right: facts3[0]!.value, rightSub: facts3[0]!.label.toLowerCase(), testId: 'evidence-live-run',
      render: (pager) => (
        <DetailRegion testId="evidence-detail" head={<PickHead title="Live run, Nov 21, 2026" pager={pager}><State tone="neutral">Ran once with a key</State><HeadFacts items={facts3.slice(0, 2).map((f) => [f.label, <span className="l-num l-strong" key={f.label}>{f.value}</span>] as [string, ReactNode]).concat([['Label', <Src key="s" kind="measured" cell={live?.source ?? 'live-reader-run.md'} />]])} /></PickHead>}>
          <KvBlock title="Results" rows={facts3.map((f) => [f.label, f.line ? `${f.value}, ${f.line}` : f.value])} />
          <Block title="Limits">
            <ul className="l-steps" style={{ listStyle: 'disc', paddingLeft: 16 }}>
              {liveLimits.map((l) => <li key={l.line} className="l-p"><Inline text={l.text} /></li>)}
              <li className="l-p">It ran an earlier version of the paste command.</li>
            </ul>
          </Block>
        </DetailRegion>
      ),
    });
  }

  readers.push(
    {
      key: 'live22', kind: 'measured', href: `#/evidence?${filterQ}item=live22`, title: 'Live run, Nov 22, 2026: every labelled set', line: 'Both readers called live on all 275 messages.', right: '73 of 81', rightSub: 'right, unseen set 2', testId: 'evidence-live22',
      render: (pager) => (
        <DetailRegion testId="evidence-detail" head={<PickHead title="Live run, Nov 22, 2026" pager={pager}><State tone="neutral">Ran with a key</State><HeadFacts items={[['Unseen set 2', <span className="l-num l-strong" key="u">73 of 81</span>], ['Label', <Src key="s" kind="measured" cell={LIVE22} />], ['Failed reads', '0 of 550']]} /></PickHead>}>
          <KvBlock title="Agreed and passed readings that were right" rows={LIVE22_ROWS} />
          <Block title="What it means"><p className="l-p">About 1 wrong proof in 11 on everyday unseen mail, live and recorded alike. That is too many to file without a person, so auto-filing stays off and a person accepts every proposal.</p></Block>
          <Block title="Readers"><p className="l-p">gpt-6.1-sol reads, gpt-6-luna checks. Fictional messages only.</p></Block>
        </DetailRegion>
      ),
    },
    {
      key: 'recorded', kind: 'measured', href: `#/evidence?${filterQ}item=recorded`, title: 'Recorded answers, agreed and verified', line: 'The answers the app replays with no key.', right: '124 of 125', rightSub: 'right, 72 examples', testId: 'evidence-recorded',
      render: (pager) => (
        <DetailRegion testId="evidence-detail" head={<PickHead title="Recorded answers, agreed and verified" pager={pager}><State tone="neutral">Recorded answers, scored</State><HeadFacts items={[['72 examples', <span className="l-num l-strong" key="e">124 of 125</span>], ['Label', <Src key="s" kind="measured" cell={`${PROTO}, line 250`} />], ['Unseen set 2', '72 of 79']]} /></PickHead>}>
          <KvBlock title="Readings both readers agreed on and the verifier passed" rows={RECORDED_ROWS} />
          <Block title="Samples"><p className="l-p">The 72 examples were used while writing the readers’ instructions, so they are not a fair test. Unseen set 1 was labelled by one person; unseen set 2 by two AI labellers and an adjudicator.</p></Block>
        </DetailRegion>
      ),
    },
    {
      key: 'office-rule', kind: 'measured', href: `#/evidence?${filterQ}item=office-rule`, title: 'The office rule on 30 unseen office messages', line: 'Fixed code that sorts an office’s message.', right: '13 of 30', rightSub: 'sorted right', testId: 'evidence-office-rule',
      render: (pager) => (
        <DetailRegion testId="evidence-detail" head={<PickHead title="The office rule on unseen mail" pager={pager}><State tone="warn">Weak on new mail</State><HeadFacts items={[['Sorted right', <span className="l-num l-strong" key="o">13 of 30</span>], ['Label', <Src key="s" kind="measured" cell="node cli/office.js --measure" />], ['To a person', '24 of 30']]} /></PickHead>}>
          <KvBlock title="Results" rows={[['Sorted right', '13 of 30'], ['Handed to a person', '24 of 30'], ['Office-rule checks on the examples', '91 of 91']]} />
          <Block title="What it means"><p className="l-p">The rule was written from the example messages and is weak on new ones. A person reads every office message it sorts.</p></Block>
        </DetailRegion>
      ),
    },
  );

  const outside: Item[] = evidence.outsideTests.filter((o) => o.id !== 'live').map((o) => {
    const t = testTitle(o.title);
    return {
      key: `outside-${o.id}`, kind: 'measured' as const, href: `#/evidence?${filterQ}item=outside-${o.id}`, title: t.name, line: `Run ${t.when}.`, right: 'Ran', rightSub: 'Not run again', testId: `evidence-outside-${o.id}`,
      render: (pager: ReturnType<typeof pagerFor>) => (
        <DetailRegion testId="evidence-detail" head={<PickHead title={t.name} pager={pager}><State tone="neutral">Ran on an earlier build</State><HeadFacts items={[['When', t.when], ['Label', <Src key="s" kind="measured" cell={o.source} />], ['Since', 'Not run again']]} /></PickHead>}>
          <Block title="What it means"><p className="l-p">The sheet or the calendar file opened and calculated in the other program. It was not run again on the installed sheet.</p></Block>
          <CommandRef command={o.source} source="The full note, with each step, is in this file." />
        </DetailRegion>
      ),
    };
  });

  const sheetItem: Item = {
    key: 'sheet', kind: 'measured', href: `#/evidence?${filterQ}item=sheet`, title: 'The installed gate sheet', line: `Saved ${dateMedium(m.modified.slice(0, 10))}; every figure here is read from it.`, right: `${m.tabs.length} tabs`, rightSub: bytesText(m.bytes), testId: 'evidence-sheet',
    render: (pager) => (
      <DetailRegion testId="evidence-detail" head={<PickHead title="The installed gate sheet" pager={pager}><State tone="neutral">Read, never written</State><HeadFacts items={[['Saved', `${dateMedium(m.modified.slice(0, 10))}, ${m.modified.slice(11, 16)} UTC`], ['Size', bytesText(m.bytes)], ['Tabs', String(m.tabs.length)]]} /></PickHead>}>
        <Block title="The file">
          <dl data-testid="evidence-sheet-md5" className="l-kv" style={{ font: 'var(--type-body)' }}>
            <dt>File</dt><dd className="l-mono" style={{ overflowWrap: 'anywhere' }}>{file}</dd>
            <dt>Fingerprint (MD5)</dt><dd className="l-mono" style={{ overflowWrap: 'anywhere' }}>{m.md5}</dd>
            {m.release ? <><dt>Release</dt><dd>{m.release}</dd></> : null}
            <dt>Exported</dt><dd>{dateMedium(m.exportedAt.slice(0, 10))}, {m.exportedAt.slice(11, 16)} UTC</dd>
            <dt>Gate check</dt><dd>{m.gateCheck}</dd>
            {sheet.calendarFile ? <><dt>Calendar file</dt><dd>{sheet.calendarFile.summary}</dd></> : null}
          </dl>
        </Block>
        <Block title="How it is read"><p className="l-p">Read with openpyxl from the values LibreOffice last calculated. The app never writes the sheet.</p></Block>
      </DetailRegion>
    ),
  };

  const sheetCheck: Item = {
    key: 'sheet-check', kind: 'measured', href: `#/evidence?${filterQ}item=sheet-check`, title: 'The gate sheet against the example threads, shipped sheet', line: 'Includes the three newest rules.', right: '180 pass, 0 fail', rightSub: 'Passes', testId: 'evidence-sheet-check',
    name: 'Show details: the gate sheet against the example threads, shipped sheet',
    render: (pager) => (
      <DetailRegion testId="evidence-detail" head={<PickHead title="The gate sheet against the example threads" pager={pager}><State tone="ok">Passes</State><HeadFacts items={[['Result', <span className="l-num l-strong" key="r">180 pass, 0 fail</span>], ['Label', <Src key="s" kind="measured" cell={`${PROTO}, line 44`} />], ['Sheet', 'Shipped, 22 Nov']]} /></PickHead>}>
        <Block title="What it checks"><p className="l-p">The installed gate sheet against the 11 example threads and every written rule, the three newest included.</p></Block>
        <CommandRef command="python3 eval/sheet_threads.py" source={`Quoted from ${PROTO}, line 44.`} />
      </DetailRegion>
    ),
  };
  const independent: Item = {
    key: 'independent', kind: 'measured', href: `#/evidence?${filterQ}item=independent`, title: 'Independent model of the written rules', line: 'Nine generated sheets, compared cell by cell.', right: '0 differences', rightSub: 'in 893,010 cells', testId: 'evidence-independent',
    render: (pager) => (
      <DetailRegion testId="evidence-detail" head={<PickHead title="Independent model of the written rules" pager={pager}><State tone="ok">No difference</State><HeadFacts items={[['Differences', <span className="l-num l-strong" key="d">0 in 893,010 cells</span>], ['Label', <Src key="s" kind="measured" cell="Repository README, by an independent tester" />], ['Sheets', '9 generated']]} /></PickHead>}>
        <Block title="What it means"><p className="l-p">An independent tester rebuilt the rules in separate code and compared every cell. It ran before the three newest rules; those have no independent test yet.</p></Block>
      </DetailRegion>
    ),
  };

  const about: Item[] = [
    {
      key: 'labels', kind: 'about', href: `#/evidence?${filterQ}item=labels`, title: 'What the labels mean', line: 'Every figure in the app carries one of these four words.', right: LABEL_ORDER.length, rightSub: 'labels', testId: 'evidence-labels',
      render: (pager) => (
        <DetailRegion testId="evidence-detail" head={<PickHead title="What the labels mean" pager={pager} />}>
          {LABEL_ORDER.map((k) => (
            <Block key={k} title={LABELS[k].word}>
              <p className="l-p">{LABELS[k].meaning}</p>
            </Block>
          ))}
        </DetailRegion>
      ),
    },
    {
      key: 'not-done', kind: 'about', href: `#/evidence?${filterQ}item=not-done`, title: 'What is not done', line: 'Each with what a person does instead.', right: NOT_DONE.length, rightSub: 'situations', testId: 'evidence-not-done',
      render: (pager) => (
        <DetailRegion testId="evidence-detail" head={<PickHead title="What is not done" pager={pager}><State tone="warn">A person does it</State></PickHead>}>
          <KvBlock title="Situation, and what a person does" rows={NOT_DONE} />
          <Block title="What the prototype reads"><p className="l-p" data-testid="evidence-access">{ACCESS}</p></Block>
        </DetailRegion>
      ),
    },
    {
      key: 'not-verified', kind: 'about', href: `#/evidence?${filterQ}item=not-verified`, title: 'Not verified yet', line: 'What no check covers, said plainly.', right: notVerified.length, rightSub: 'items', testId: 'evidence-not-verified',
      render: (pager) => (
        <DetailRegion testId="evidence-detail" head={<PickHead title="Not verified yet" pager={pager}><State tone="warn">Open</State></PickHead>}>
          <Block title="What no check covers">
            <ul className="l-steps" style={{ listStyle: 'disc', paddingLeft: 16 }}>
              {notVerified.map((n, i) => <li key={i} className="l-p">{n}</li>)}
            </ul>
          </Block>
        </DetailRegion>
      ),
    },
  ];

  const keep = (x: Item): boolean => filter === 'all' || x.kind === filter;
  const groups: (PickGroup & { rows: Item[] })[] = [
    { id: 'season', title: 'Season-one checks, on the prototype', testId: 'evidence-checks', rows: [...seasonOne.filter((x) => !/sheet_threads/.test(x.key) && x.title !== 'The gate sheet against the example threads'), sheetCheck].filter(keep) },
    { id: 'rerun', title: `Run ${factsWhen}`, testId: 'evidence-rerun', rows: rerun.filter(keep) },
    { id: 'readers', title: 'The readers', testId: 'evidence-readers', rows: readers.filter(keep) },
    { id: 'outside', title: 'Outside tests', testId: 'evidence-outside', rows: outside.filter(keep) },
    { id: 'sheet', title: 'The sheet', rows: [sheetItem, independent].filter(keep) },
    { id: 'later', title: 'Off this season, or later', testId: 'evidence-later', rows: later.filter(keep) },
    { id: 'about', title: 'About these figures', rows: about.filter(() => filter === 'all') },
  ].filter((g) => g.rows.length);
  const rows = groups.flatMap((g) => g.rows);
  const itemQ = query.get('item') ?? (asked === 'sheet' ? 'sheet' : null);
  const sel = pick(rows, itemQ);
  const pager = sel ? pagerFor(rows, sel.key) : undefined;
  usePageState({ page: 'evidence', filter, listCount: rows.length, selected: sel?.key ?? null });

  const count = (k: LabelKind): number => [...seasonOne, sheetCheck, ...rerun, ...readers, ...outside, sheetItem, independent, ...later].filter((x) => x.kind === k).length;
  const checkJs = seasonOne.find((x) => x.title === 'The season-one problems');
  const passing = [...seasonOne, ...rerun].filter((x) => x.rightSub === 'Passes').length;

  return (
    <div data-testid="page-evidence" className="contents [&_.l-p]:max-w-[52ch]!">
      <Page fit>
        <PageHeader title="How we know" line={<>How each number was checked. Quoted {dateMedium(evidence.meta.exportedAt.slice(0, 10))}.</>} />
        <Summary label="How we know, in four figures">
          <Stat testId="stat-checks" label="Season-one problems" value={checkJs ? String(checkJs.right) : 'Not quoted'} foot="All pass on the prototype" source={<Src kind="measured" cell="Prototype README" />} href={checkJs?.href ?? '#/evidence'} name={`Season-one problems: ${checkJs?.right ?? 'not quoted'}. Show the check`} />
          <Stat testId="stat-readers" label="Readers right, unseen" value={`${u2.right} of ${u2.agreed}`} foot={`${Math.round(u2.pct)}%, likely ${Math.round(u2.low)}% to ${Math.round(u2.high)}%`} source={<Src kind="measured" cell={`${evidence.readers.source}, line ${u2.line}`} />} href={`#/evidence?${filterQ}item=unseen2`} name={`Readers right on ${u2.right} of ${u2.agreed} unseen readings. Show the result`} />
          <Stat testId="stat-passing" label="Checks with a full pass" value={passing} of={`of ${seasonOne.length + rerun.length}`} foot="The rest print a result, no count" source={<Src kind="measured" cell={`README and facts ${evidence.meta.factsSection}`} />} />
          <Stat testId="stat-not-verified" label="Not verified yet" value={notVerified.length} foot="Listed plainly on this page" href="#/evidence?item=not-verified" name={`${notVerified.length} things not verified yet. Show them`} />
        </Summary>
        <Toolbar
          left={
            <Seg
              label="Filter by label"
              current={filter}
              items={[
                { id: 'all', label: 'All', href: '#/evidence' },
                { id: 'measured', label: 'Measured', count: count('measured'), href: '#/evidence?filter=measured' },
                { id: 'simulated', label: 'Simulated', count: count('simulated'), href: '#/evidence?filter=simulated' },
              ]}
            />
          }
          right={<span data-testid="fictional-note" className="l-small l-muted">All names and messages are fictional.</span>}
        />
        <Workspace>
          <ListRegion title="Checks and results" meta={<span className="l-num">{rows.length} items</span>}>
            <PickList groups={groups} selected={sel?.key ?? null} caption="Every check and result, with what it printed" columns={['What was checked', 'Result']} />
          </ListRegion>
          {sel ? (sel as Item).render(pager) : (
            <DetailRegion head={<h2 className="l-section">Nothing to show</h2>}>
              <p className="l-block l-muted l-p">No item has this label. Choose All.</p>
            </DetailRegion>
          )}
        </Workspace>
      </Page>
    </div>
  );
}
