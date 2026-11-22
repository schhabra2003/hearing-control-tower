/**
 * For agents (#/agents): what the app holds, every route, and how to do each
 * task, in plain text, for browsing agents and screen readers. Split 5 + 7: the tasks (from
 * layout/workflows.ts, the same list as window.hearingDesk.tasks()) and three reference items on the
 * left, the selected one on the right. ?task=<id> selects, so Back and reload work. The data itself
 * is on window.hearingDesk as JSON; nothing on this page is typed apart from the words.
 */

import type { ReactNode } from 'react';
import { DESK_API_VERSION, deskDocs } from '@/lib/agentApi';
import { hearings, offices, suggestions } from '@/lib/data';
import { proposalCounts } from '@/lib/decisions';
import type { PageProps, RouteDef } from '@/lib/router';
import { useSession } from '@/lib/store';
import { Block, DetailRegion, ListRegion, PageHeader, Stat, State, Summary, Workspace, usePageState } from '@/layout/Regions';
import { HeadFacts, PickHead, PickList, pagerFor, pick, type PickGroup } from './PickList';

/** The API's own method list, read from its help text so the page and the API cannot disagree. */
function methods(): string[] {
  const m = /Methods: ([^.]+)\./.exec(deskDocs.help());
  return m ? m[1]!.split(', ').map((x) => x.trim()) : [];
}

export function makeAgentsPage(routes: RouteDef[]) {
  return function Agents({ query }: PageProps) {
    const waiting = useSession((s) => proposalCounts(s.proposals, s.pasted).waiting);
    const tasks = deskDocs.tasks();
    // The same list as window.hearingDesk.routes(), so the count here and the API's agree.
    const desk = deskDocs.routes();
    const shown = desk.length ? desk.map((d) => ({ id: d.id, path: d.pattern.replace(/^#/, ''), title: d.title, section: d.section })) : routes.filter((r) => !r.redirect).map((r) => ({ id: r.id, path: r.path, title: typeof r.title === 'string' ? r.title : r.id, section: r.section }));
    const api = methods();
    const groups: PickGroup[] = [
      {
        id: 'tasks',
        title: 'Tasks',
        testId: 'agents-tasks',
        rows: tasks.map((t) => ({ key: t.id, href: `#/agents?task=${t.id}`, title: t.title, line: `Starts at ${t.url}`, right: t.steps.length, rightSub: 'steps', testId: `agents-task-${t.id}` })),
      },
      {
        id: 'reference',
        title: 'Reference',
        rows: [
          { key: 'holds', href: '#/agents?task=holds', title: 'What the app holds', line: 'The example week, the offices, the proposals, read-only.', right: hearings.length, rightSub: 'hearings', testId: 'agents-holds' },
          { key: 'api', href: '#/agents?task=api', title: 'window.hearingDesk', line: 'Read-only JSON of the same data the pages show.', right: api.length, rightSub: 'methods', testId: 'agents-api' },
        ],
      },
    ];
    const rows = groups.flatMap((g) => g.rows);
    const sel = pick(rows, query.get('task'));
    const pager = sel ? pagerFor(rows, sel.key) : undefined;
    const task = tasks.find((t) => t.id === sel?.key);
    usePageState({ page: 'agents', selected: sel?.key ?? null, listCount: rows.length });

    const routesBlock = (
      <div className="l-block" data-testid="agents-routes">
        <div className="l-blockhead"><h3>Routes</h3><span className="l-small l-muted l-num">{shown.length} routes; Back and reload keep the state</span></div>
        <table className="l-table" aria-label="Routes an agent can read">
          <colgroup><col style={{ width: '38%' }} /><col /><col style={{ width: '28%' }} /></colgroup>
          <thead><tr><th scope="col">Route</th><th scope="col">Page</th><th scope="col">Section</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="l-mono" style={{ fontWeight: 400 }}>#{r.path}</th>
                <td>{r.title}</td>
                <td className="l-ink2">{r.section}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    let detail: ReactNode = null;
    if (task) {
      detail = (
        <DetailRegion testId="agents-detail" head={<PickHead title={task.title} pager={pager}><HeadFacts items={[['Starts at', <a key="u" className="l-link l-mono" href={task.url}>{task.url}</a>], ['Steps', String(task.steps.length)], ['A person', 'Does the same steps']]} /></PickHead>}>
          <Block title="Steps">
            <ol className="l-steps" style={{ listStyle: 'decimal', paddingLeft: 24 }}>
              {task.steps.map((x) => <li key={x} className="l-p">{x}</li>)}
            </ol>
          </Block>
          <Block title="How to check it is done">
            <p className="l-p">{task.verify}</p>
          </Block>
          {routesBlock}
        </DetailRegion>
      );
    } else if (sel?.key === 'holds') {
      detail = (
        <DetailRegion testId="agents-detail" head={<PickHead title="What the app holds" pager={pager}><State tone="neutral">Read-only</State></PickHead>}>
          <Block title="Data">
            <ul className="l-steps" style={{ listStyle: 'disc', paddingLeft: 16 }}>
              <li className="l-p">{hearings.length} hearings of the example week, with their five checks and the lines the sheet prints.</li>
              <li className="l-p">{offices().length} offices and how each wants the firm named.</li>
              <li className="l-p">{suggestions().length} proposals on the Reader suggestions tab; {waiting} wait for a decision in this browser.</li>
              <li className="l-p">The notifications log: every message this session showed.</li>
              <li className="l-p">Each consultant’s phone page, for example <a className="l-link l-mono" href="#/consultant/maya-venn">#/consultant/maya-venn</a>.</li>
              <li className="l-p">The later tool’s agents, what each may do and may never do: <a className="l-link" href="#/later/how">How the later tool works</a>.</li>
            </ul>
          </Block>
          <Block title="What it does not do">
            <p className="l-p">Nothing is sent anywhere and the sheet is never written. Decisions are kept in this browser.</p>
          </Block>
          {routesBlock}
        </DetailRegion>
      );
    } else if (sel?.key === 'api') {
      detail = (
        <DetailRegion testId="agents-detail" head={<PickHead title="window.hearingDesk" pager={pager}><HeadFacts items={[['Version', DESK_API_VERSION], ['Methods', String(api.length)], ['Writes', 'Nothing']]} /></PickHead>}>
          <Block title="Methods">
            <ul className="l-steps" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {api.map((x) => <li key={x} className="l-mono">{x}()</li>)}
            </ul>
          </Block>
          <Block title="How to start">
            <p className="l-p">Call window.hearingDesk.help() for a short description, then tasks() for the steps on this page.</p>
          </Block>
          {routesBlock}
        </DetailRegion>
      );
    }

    return (
      <div data-testid="page-agents" className="contents">
        <PageHeader title="For agents" line="Routes, data and steps for software that browses this app." />
        <Summary label="For agents in four figures">
          <Stat testId="agents-stat-routes" label="Routes" value={shown.length} foot="Each page has its own link" href="#/agents?task=holds" name={`${shown.length} routes. Show what the app holds and every route`} />
          <Stat testId="agents-stat-tasks" label="Tasks" value={tasks.length} foot="The same steps a person takes" href={tasks[0] ? `#/agents?task=${tasks[0].id}` : '#/agents'} name={`${tasks.length} tasks. Show the first`} />
          <Stat testId="agents-stat-methods" label="API methods" value={api.length} foot="On window.hearingDesk, read-only" href="#/agents?task=api" name={`${api.length} API methods. Show them`} />
          <Stat testId="agents-stat-version" label="API version" value={DESK_API_VERSION} foot="Nothing on the sheet is written" />
        </Summary>
        <Workspace>
          <ListRegion title="Tasks and reference" meta={<span className="l-num">{rows.length} items</span>}>
            <PickList groups={groups} selected={sel?.key ?? null} caption="Each task an agent can do, then the reference" columns={['Task', 'Steps']} rightWidth={112} />
          </ListRegion>
          {detail}
        </Workspace>
      </div>
    );
  };
}
