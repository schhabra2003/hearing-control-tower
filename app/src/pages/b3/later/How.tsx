import { DISPOSITIONS, GATES } from '@engine/src/model.js';
import { GATES as SHARED_GATES } from '@/lib/gates';
import type { PageProps } from '@/lib/router';
import { cn } from '@/lib/cn';
import { LaterPage, LevelChip, Panel, TableWrap, ToneChip } from '../components/Tower';
import { DISPOSITION, LEVELS, LEVEL_ORDER, useTower, words } from './tower';

const CLASS_LABEL: Record<string, string> = {
  consultant_offer: 'Offer a hearing to a consultant', consultant_update: 'Tell a consultant the official facts', consultant_reminder: 'Remind a consultant', answer_question: "Answer a consultant's question from the record",
  request_outcome: 'Ask what happened at a hearing', confirm_assignment: 'Confirm a consultant who volunteered', unusable_yes: 'Tell a consultant why their yes cannot be used', staffing_submission: "Send the representative's name to the office", packet_send: 'Send the case packet',
  chaser: 'Chase an office that has not answered', change_request: 'Ask an office for a date change', request_clear_copy: 'Ask for a readable copy of a document', signature_request: 'Ask a consultant to sign',
  obligation_submission: 'Send a signed document to the office', withdrawal_confirmation: 'Confirm a withdrawal to the office', dispute_notice: 'Tell an office not to process something', call_task: 'Phone calls',
  homeowner_contact: 'Anything that involves a homeowner', playbook_change: "Approve a change to a county's process", triage: 'Read a message the tower could not use',
};

/** SOLUTION_DESIGN.md section 7, "Agents and their limits": each role, what it may do and what it may never do. */
const ROLES: [string, string, string, string][] = [
  ['Intake', 'One AI call with a fixed form', 'Turn a message into statements, each with its quote', 'Write a fact to the record'],
  ['Verifier', 'Code', 'Reject a statement whose quote is not in the message', 'Accept anything on its own'],
  ['Reconciler', 'Code', 'Apply who may establish what; notice a county process change', 'Accept a fact from the wrong source'],
  ['Staffing', 'Code', 'Rank consultants for a docket; send offers', 'Assign a consultant who has not said yes'],
  ['Clerk liaison', 'AI drafting inside templates', 'Draft notices and chasers to an office', 'Send a withdrawal, settlement or date request without approval'],
  ['Exception resolver', 'AI agent, read-only', 'Propose a plan, with its evidence', 'Carry out anything'],
  ['Playbook', 'AI call, then a person', "Draft a county's process; propose a change", 'Publish a process nobody reviewed'],
  ['Auditor', 'Scheduled code', 'Daily readiness sweep; weekly sample check', 'Change a record'],
];

/** The autonomy ladder (SOLUTION_DESIGN.md section 7): the highest level each kind of action may reach. */
const LADDER: [string, string][] = [
  ['Offers, reminders and schedule updates to consultants', 'L2'],
  ['Staffing notice, packet and receipt chaser to an office', 'L2 after promotion'],
  ['Date-change request to an office', 'L1'],
  ['Withdrawal, settlement, anything signed', 'L0'],
];

/** SOLUTION_DESIGN.md section 9: where people stay needed, why, and how the work shrinks. */
const PEOPLE: [string, string, string][] = [
  ['Exceptions', 'Judgment; the cost of an error', 'Prevention; proposed plans'],
  ['Calls to clerks', 'Phone and recording law; relationships', 'A script and a structured note; steer offices to writing'],
  ['Approving sends to an office', 'High stakes', 'The autonomy ladder'],
  ['Withdrawals, settlements, signatures', "The homeowner's consent; the law", 'Pre-filled packets with the signer checked'],
  ["A new county's process", 'Research and checking', 'AI drafts, a person checks: 4 to 12 hours a county (estimate)'],
  ['Recruiting consultants', 'Trust', 'Reliability scores'],
];

type Kind = 'in' | 'ai' | 'code' | 'people';
const STAGES: [string, string, Kind][] = [
  ['Message', 'Email, text, phone note, mail, calendar', 'in'],
  ['Reader', 'The reader turns words into typed statements, each with a quote', 'ai'],
  ['Checks', 'Code: who said it, how, about which case', 'code'],
  ['Evidence ledger', 'Append-only facts, each with its source', 'code'],
  ['Five checks', 'What is proven for each hearing', 'code'],
  ['Planner', 'What the county requires, less what is proven', 'code'],
  ['Who acts', 'Send, one click, draft, or a person', 'people'],
];
const KIND: Record<Kind, { cls: string; word: string }> = {
  in: { cls: 'border-border-strong bg-surface', word: 'Input' },
  ai: { cls: 'border-border-strong border-dashed bg-surface-2', word: 'AI: language in, language out' },
  code: { cls: 'border-accent/50 bg-accent-soft', word: 'Code: the same answer every time' },
  people: { cls: 'border-ink/60 bg-surface-2', word: 'People: approval, calls, judgment' },
};

export function How(_props: PageProps) {
  const t = useTower();
  const autonomy = t.eng.layers.default.autonomy;
  const byLevel = (l: string): string[] => Object.entries(autonomy).filter(([, v]) => v === l).map(([k]) => CLASS_LABEL[k] ?? words(k));
  return (
    <LaterPage testId="page-later-how" title="How it works" lede="AI reads, code decides, and people handle the rest.">
      <Panel title="From a message to an action">
        <ol className="grid grid-cols-7 gap-2 max-xl:grid-cols-4 max-md:grid-cols-2">
          {STAGES.map(([title, sub, kind], i) => (
            <li key={title} className={cn('flex flex-col gap-1 rounded-[var(--radius-quote)] border-[1.5px] p-3', KIND[kind].cls)}>
              <span className="tabular-nums text-small text-ink-2">Step {i + 1}</span>
              <span className="text-body font-semibold text-ink">{title}</span>
              <span className="text-small text-ink-2">{sub}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-body text-ink-2">Every reply comes back in as a new message at step 1.</p>
        <div className="mt-3 flex flex-wrap gap-4 text-small text-ink-2">
          {(['ai', 'code', 'people'] as Kind[]).map((k) => <span key={k} className="inline-flex items-center gap-2"><i className={cn('size-3.5 rounded-[3px] border-[1.5px]', KIND[k].cls)} />{KIND[k].word}</span>)}
        </div>
        <p className="mt-4 max-w-[var(--measure)] text-body text-ink">A reader only produces statements, so a wrong or fooled reader cannot set a fact. Only an office, in writing, sets a date; only a consultant commits themselves.</p>
      </Panel>

      <div className="grid grid-cols-2 gap-4 max-xl:grid-cols-1">
        <Panel title="How a hearing is proven ready" description="All five checks done or not needed, worked out from the evidence.">
          <TableWrap label="The five checks">
            <thead><tr><th scope="col">Check</th><th scope="col">Done only on</th></tr></thead>
            <tbody>{GATES.map((g, i) => <tr key={g.id}><th scope="row" className="font-semibold"><span className="tabular-nums">{i + 1}</span> {SHARED_GATES[i]?.name ?? g.name}</th><td>{g.authority}</td></tr>)}</tbody>
          </TableWrap>
          <h3 className="text-h3 mt-6 mb-2 text-ink">What a statement can become</h3>
          <TableWrap label="What a statement can become">
            <thead><tr><th scope="col">Becomes</th><th scope="col">Meaning</th></tr></thead>
            <tbody>{Object.entries(DISPOSITION).map(([k, v]) => <tr key={k}><th scope="row" className="whitespace-nowrap"><ToneChip tone={v.tone}>{v.label}</ToneChip></th><td><span className="block max-w-[var(--measure)]">{DISPOSITIONS[k]}</span></td></tr>)}</tbody>
          </TableWrap>
        </Panel>
        <Panel title="Where people are needed" description="Each level is a setting. The firm raises it when its error numbers allow.">
          <p className="mb-3 max-w-[var(--measure)] text-body font-semibold text-ink" data-testid="how-not-this-season">None of these automatic sends happen this season.</p>
          <TableWrap label="Levels">
            <thead><tr><th scope="col">Level</th><th scope="col">What it means, and what it is used for</th></tr></thead>
            <tbody>
              {LEVEL_ORDER.map((l) => (
                <tr key={l}>
                  <th scope="row" className="whitespace-nowrap"><span className="mr-2 font-mono text-small text-ink-2">{l === 'human' ? '' : l}</span><LevelChip level={l} /></th>
                  <td>
                    <span className="block max-w-[var(--measure)]">{LEVELS[l].help}</span>
                    <ul className="mt-2 grid list-disc grid-cols-2 gap-x-6 gap-y-1 pl-4 text-ink-2 max-md:grid-cols-1">{byLevel(l).map((x) => <li key={x}>{x}</li>)}</ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <h3 className="text-h3 mt-6 mb-2 text-ink">The highest level each action may reach</h3>
          <TableWrap label="The autonomy ladder">
            <thead><tr><th scope="col">Action</th><th scope="col">Highest level</th></tr></thead>
            <tbody>{LADDER.map(([a, l]) => <tr key={a}><th scope="row">{a}</th><td className="whitespace-nowrap font-mono">{l}</td></tr>)}</tbody>
          </TableWrap>
          <p className="mt-3 max-w-[var(--measure)] text-body text-ink" data-testid="how-ladder-rules">Promotion: one level up for a county and action after <b className="font-semibold">30 approvals in a row with no edits</b> (estimate). Demotion: one level down on any edit or error.</p>
        </Panel>
      </div>

      <Panel testId="how-roles" title="Agents and their limits" description="Each role, what it may do and what it may never do. Not built.">
        <TableWrap label="Agents and their limits">
          <thead><tr><th scope="col">Role</th><th scope="col">Built as</th><th scope="col">May do</th><th scope="col">May never do</th></tr></thead>
          <tbody>{ROLES.map(([r, b, may, never]) => <tr key={r} data-testid={`how-role-${r.toLowerCase().replace(/ /g, '-')}`}><th scope="row" className="font-semibold">{r}</th><td className="text-ink-2">{b}</td><td>{may}</td><td>{never}</td></tr>)}</tbody>
        </TableWrap>
      </Panel>

      <Panel testId="how-people" title="Where people stay needed" description="Why each stays with a person, and how the work shrinks.">
        <TableWrap label="Where people stay needed">
          <thead><tr><th scope="col">Task</th><th scope="col">Why a person</th><th scope="col">How it shrinks</th></tr></thead>
          <tbody>{PEOPLE.map(([task, why, how]) => <tr key={task}><th scope="row" className="font-semibold">{task}</th><td>{why}</td><td>{how}</td></tr>)}</tbody>
        </TableWrap>
      </Panel>

      <Panel title="What is real here">
        <dl className="grid max-w-[110ch] grid-cols-[180px_minmax(0,1fr)] gap-x-6 gap-y-2 text-body max-md:grid-cols-1">
          <dt className="font-semibold text-ink">Real</dt><dd className="text-ink-2">The engine. Every board, action and deadline is computed here by the prototype's code.</dd>
          <dt className="font-semibold text-ink">From the packet</dt><dd className="text-ink-2">The messages, cases, consultants, county notes and documents.</dd>
          <dt className="font-semibold text-ink">Simulated</dt><dd className="text-ink-2">Message times, the answers you pick for the other side, and sending.</dd>
          <dt className="font-semibold text-ink">The reader here</dt><dd className="text-ink-2">The offline pattern reader, a baseline. The AI readers are measured on Checks.</dd>
          <dt className="font-semibold text-ink">Estimates</dt><dd className="text-ink-2">Reminder timers, reply-by times and staffing cost weights.</dd>
        </dl>
      </Panel>
    </LaterPage>
  );
}
