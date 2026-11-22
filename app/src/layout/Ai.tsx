/**
 * What the AI does (#/ai) (one entry per part:
 * what it reads, what it gives, where a person decides, how well it does, what it never does).
 * Regions: Page header, Summary (what waits for a person now), then the parts on the left and the
 * selected part on the right. ?part=<id> selects, so Back and reload work.
 *
 * The general lists come from the same source as window.hearingDesk.ai() and the tasks from the
 * same file as hearingDesk.tasks(), so a person and an agent read the same words. Each part's
 * accuracy is read from the quoted check lines in evidence.json, never typed here. The readers'
 * mode says Live only when the local server reports live; otherwise the answers are recorded.
 */

import type { ReactNode } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { deskDocs } from '@/lib/agentApi';
import { evidence } from '@/lib/data';
import { allWaiting, proofCounts } from '@/lib/decisions';
import { liveLabel, useLive } from '@/lib/live';
import type { PageProps } from '@/lib/router';
import { useSession } from '@/lib/store';
import { HeadFacts, PickHead, PickList, pagerFor, pick, type PickRow } from '@/pages/agents/PickList';
import { changesWaiting } from './model';
import { Block, DetailRegion, ListRegion, Page, PageHeader, Src, Stat, State, Summary, Workspace, usePageState } from './Regions';
import { WORKFLOWS, type Workflow } from './workflows';

/** "39 of 39" from the newest quoted line of a command, when the line prints a full count. */
function fullCount(command: RegExp): string | null {
  const rows = [...evidence.factsChecks, ...evidence.readmeChecks].filter((r) => command.test(r.command));
  for (const r of rows) {
    const line = r.cells[r.cells.length - 1] ?? '';
    const m = [...line.matchAll(/(\d[\d,]*) of (\d[\d,]*)/g)].find((x) => x[1] === x[2]);
    if (m) return m[0];
  }
  return null;
}

/** The page a task URL opens, by its title ("#/offices/tesswick?approve=1" is "office"), from the route table. */
function pageOf(url: string): string {
  const path = url.split('?')[0]!;
  const r = deskDocs.routes().find((x) => new RegExp(`^${x.pattern.replace(/:[a-z]+/g, '[^/]+')}$`).test(path));
  const t = r?.title ?? path;
  return /^[a-z]/.test(t) ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

interface Part {
  id: string;
  name: string;
  line: string;
  reads: string;
  gives: string;
  person: string;
  does: string[];
  never: string[];
  score: { value: string; what: string; kind: 'measured' | 'simulated'; cell: string; href: string } | null;
  tasks: string[];
  go: { label: string; href: string } | null;
}

function parts(readersLive: boolean): Part[] {
  const ai = deskDocs.ai();
  const u2 = evidence.readers.unseen2;
  const replies = fullCount(/replies\.js/);
  const office = fullCount(/check_office\.js/);
  return [
    {
      id: 'all',
      name: 'All of it, in short',
      line: 'Software suggests. A person decides every proposal.',
      reads: 'The week’s messages',
      gives: 'Proposals only',
      person: 'Decides each one',
      does: ai.does,
      never: ai.doesNot,
      score: null,
      tasks: [],
      go: { label: 'Open the 9:00 a.m. pass', href: '#/today/9am' },
    },
    {
      id: 'readers',
      name: 'The two readers',
      line: 'Propose which message proves each check, quoting its words.',
      reads: 'Emails, texts and notes',
      gives: 'A proposed proof link',
      person: 'Accepts or refuses it',
      does: [
        'Read each message from an office or a consultant.',
        'Propose a proof link for a check, or a value for another cell, with the words they rely on.',
        'A second reader checks the first, then the verifier checks both; when they disagree, the message goes to a person.',
        readersLive ? 'In this session they run live, on fictional messages only; the key stays on the server.' : 'In this app their answers are recorded once and replayed. No model is called.',
      ],
      never: ['Accept their own proposal.', 'Send a message or change the sheet.'],
      score: { value: `${u2.right} of ${u2.agreed}`, what: `right, ${u2.agreed - u2.right} wrong`, kind: 'measured', cell: `${evidence.readers.source}, line ${u2.line}`, href: '#/evidence?item=unseen2' },
      tasks: ['pass-0900', 'paste-message'],
      go: { label: 'Open step 1 of the 9:00 a.m. pass', href: '#/today/9am?step=1' },
    },
    {
      id: 'verifier',
      name: 'The verifier',
      line: 'Code that checks every reading before anyone sees it.',
      reads: 'Both readers’ readings',
      gives: 'Pass, or hand to a person',
      person: 'Reads every handed-over message',
      does: ['Check that each quoted phrase is really in the message. Passed readings were right on 124 of 125 examples and 72 of 79 unseen messages (7 of 79 wrong).', 'Check that both readers agree on what the message proves.', 'Hand the message to a person when either check fails.'],
      never: ['Accept a reading by itself.', 'Change the sheet or send anything.'],
      score: { value: '124 of 125', what: 'right, 72 examples', kind: 'measured', cell: 'prototype/README.md, line 250', href: '#/evidence?item=recorded' },
      tasks: [],
      go: { label: 'See how it was checked', href: '#/evidence?item=recorded' },
    },
    {
      id: 'replies',
      name: 'The reply rule',
      line: 'Files a plain reply such as YES 1 3, hands the rest over.',
      reads: 'Consultants’ replies',
      gives: 'A filed yes or no',
      person: 'Reads every unclear reply',
      does: ['Match a reply against a fixed rule.', 'File the replies that match it exactly: 17 of the 39 examples.', `Hand every other reply to a person. On all ${replies ?? '39 of 39'} it decides as a coordinator would.`],
      never: ['Guess what an unclear reply means.', 'Answer the consultant.'],
      score: { value: '17 of 39', what: 'filed by the rule', kind: 'measured', cell: 'node cli/replies.js', href: '#/evidence' },
      tasks: [],
      go: { label: 'Open Replies', href: '#/replies' },
    },
    {
      id: 'office',
      name: 'The office rule',
      line: 'Sorts an office’s message and spots a change of process.',
      reads: 'Offices’ messages',
      gives: 'Where it goes on the sheet',
      person: 'Approves a process change',
      does: ['Sort an office’s message by fixed code.', 'Propose where it goes on the sheet.', 'Spot when an office changes how it wants our consultant named.'],
      never: ['Approve a process change; only the owner does.', 'Send a notice to an office whose change waits.'],
      score: office ? { value: office, what: 'checks pass', kind: 'measured', cell: 'node cli/check_office.js', href: '#/evidence' } : null,
      tasks: ['approve-change'],
      go: { label: 'Open Offices', href: '#/offices' },
    },
    {
      id: 'mailbox',
      name: 'The mailbox helper',
      line: 'Turns the example inbox into proposed filings. Auto-filing is off.',
      reads: 'The example inbox',
      gives: 'Proposed filings',
      person: 'Files each one',
      does: ['Read the example inbox folder: emails and texts.', 'Propose where each message is filed.'],
      never: ['File anything by itself this season.', 'Connect to a real mailbox.'],
      score: null,
      tasks: [],
      go: { label: 'Open Integrations', href: '#/integrations' },
    },
  ];
}

export function Ai({ query }: PageProps) {
  const s = useSession((x) => x);
  const readersLive = useLive((x) => liveLabel(x)) === 'Live AI';
  const proofs = proofCounts(s.proposals);
  const changes = changesWaiting(s);
  const list = parts(readersLive);
  const partRows: PickRow[] = list.map((p) => ({
    key: p.id,
    href: `#/ai?part=${p.id}`,
    title: p.name,
    line: p.line,
    right: p.score?.value ?? (p.id === 'mailbox' ? 'Off' : ''),
    rightSub: p.score?.what ?? (p.id === 'mailbox' ? 'auto-filing' : 'A person decides'),
    testId: `ai-part-${p.id}`,
  }));
  const taskRows: PickRow[] = WORKFLOWS.map((w) => ({
    key: `task-${w.id}`,
    href: `#/ai?part=task-${w.id}`,
    title: w.title,
    line: `Where: ${pageOf(w.url)}`,
    right: w.steps.length,
    rightSub: 'steps',
    testId: `ai-task-${w.id}`,
  }));
  const rows = [...partRows, ...taskRows];
  const selRow = pick(rows, query.get('part'));
  const task = WORKFLOWS.find((w) => `task-${w.id}` === selRow?.key);
  const sel = list.find((p) => p.id === selRow?.key) ?? list[0]!;
  const pager = pagerFor(rows, selRow?.key ?? sel.id);
  const tasks: Workflow[] = WORKFLOWS.filter((w) => sel.tasks.includes(w.id));
  usePageState({ page: 'ai', selected: selRow?.key ?? sel.id, listCount: rows.length, primaryAction: sel.go?.label ?? 'Open the 9:00 a.m. pass' });

  const bullets = (items: string[]): ReactNode => (
    <ul className="l-steps" style={{ listStyle: 'disc', paddingLeft: 16 }}>
      {items.map((d) => <li key={d} className="l-p">{d}</li>)}
    </ul>
  );

  return (
    <Page fit>
      <PageHeader title="What the AI does" line="Software suggests. A person decides every proposal." />
      <Summary label="What waits for a person now">
        <Stat testId="ai-waiting" label="Proposals waiting" value={allWaiting(s.proposals)} foot="Each waits for a yes or no" source={<Src kind="measured" cell="Reader suggestions" />} href="#/suggestions" name="Proposals waiting for a person. Open Check messages" />
        <Stat testId="ai-proofs" label="Proof links to decide" value={proofs.waiting} of={`of ${proofs.decide}`} foot="Step 1 of the 9:00 a.m. pass" source={<Src kind="measured" cell="Reader suggestions" />} href="#/today/9am?step=1" name="Proof links to decide. Open step 1 of the 9:00 a.m. pass" />
        <Stat testId="ai-changes" label="Office changes to decide" value={changes.length} foot="Only the owner approves" source={<Src kind="measured" cell="Offices tab, column N (Ask again?)" />} href={changes[0] ? `#/?decide=${changes[0].slug}` : '#/offices'} name="Office changes to decide. Open the first" />
        <Stat testId="ai-autofile" label="Auto-filing" value="Off" foot="A person accepts each proposal" />
      </Summary>
      <Workspace>
        <ListRegion title="Parts and decisions" meta={<span className="l-num">{rows.length} items</span>}>
          <PickList groups={[{ id: 'parts', title: 'The parts', rows: partRows }, { id: 'tasks', title: 'Where a person decides', testId: 'ai-tasks', rows: taskRows }]} selected={selRow?.key ?? sel.id} caption="Each part of the software, what it gives and how well it does" columns={['Part and what it does', 'How well']} rightWidth={184} />
        </ListRegion>
        {task ? (
          <DetailRegion
            testId="ai-detail"
            head={<PickHead title={task.title} pager={pager}><State tone="neutral">A person decides</State><HeadFacts items={[['Where', <a key="w" className="l-link" href={task.url}>{pageOf(task.url)}</a>], ['Steps', String(task.steps.length)], ['An agent', 'Same steps']]} /></PickHead>}
            foot={
              <>
                <span className="l-small l-muted">The same steps for a person and an agent.</span>
                <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={task.url} data-testid="ai-go">Open {pageOf(task.url)}</a>
              </>
            }
          >
            <Block title="Steps">
              <ol className="l-steps" style={{ listStyle: 'decimal', paddingLeft: 24 }}>
                {task.steps.map((x) => <li key={x} className="l-p">{x}</li>)}
              </ol>
            </Block>
            <Block title="How an agent checks it"><p className="l-p">{task.verify}</p></Block>
          </DetailRegion>
        ) : (
        <DetailRegion
          testId="ai-detail"
          head={
            <PickHead title={sel.name} pager={pager}>
              <State tone="neutral">{sel.id === 'readers' ? (readersLive ? 'Live in this session' : 'Recorded answers') : sel.id === 'mailbox' ? 'Auto-filing off' : 'Suggests only'}</State>
              <HeadFacts items={[['Reads', sel.reads], ['Gives', sel.gives], ['A person', sel.person]]} />
            </PickHead>
          }
          foot={
            <>
              <span className="l-small l-muted"><span className="l-wide">Suggested by software. </span>A person decides.</span>
              {sel.go ? <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={sel.go.href} data-testid="ai-go">{sel.go.label}</a> : null}
            </>
          }
        >
          <Block title="What it does" testId="ai-does" meta={<a className="l-link" href={sel.score?.href ?? '#/evidence'}>How it was checked</a>}>{bullets(sel.does)}</Block>
          <Block title="What it never does" testId="ai-never">{bullets(sel.never)}</Block>
          {sel.score ? (
            <Block title="How well it does" testId="ai-score">
              <p className="l-p">
                <b className="l-num">{sel.score.value}</b> {sel.score.what}. <Src kind={sel.score.kind} cell={sel.score.cell} />{' '}
                <a className="l-link" href={sel.score.href}>How it was checked</a>
              </p>
            </Block>
          ) : null}
          {tasks.length ? (
            <div className="l-block" data-testid="ai-part-tasks">
              <div className="l-blockhead">
                <h3>Where a person decides</h3>
                <a className="l-link l-small" href="#/agents">The same steps for agents</a>
              </div>
              <table className="l-table">
                <caption className="l-sr">Each task, where it is done and how an agent checks it</caption>
                <colgroup><col style={{ width: '40%' }} /><col /></colgroup>
                <thead><tr><th scope="col">Task</th><th scope="col">Where</th></tr></thead>
                <tbody>
                  {tasks.map((w) => (
                    <tr key={w.id}>
                      <th scope="row" style={{ fontWeight: 500 }}>{w.title}</th>
                      <td><a className="l-link" href={w.url}>{pageOf(w.url)}</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </DetailRegion>
        )}
      </Workspace>
    </Page>
  );
}
