// Start here: what this is, what the tower sees right now, three flows to try first and five more.

import { html, plural, pill, levelPill } from '../ui.js';
import { auditRecords } from '../../src/audit.js';

// Three flows first: each is one story from the example week or one question the firm asks.
// "after" is a message id: the replay goes to the moment right after that message arrived (the
// replay runs in time order, so the stories are interleaved with the rest of the week), and
// "case" opens that hearing with its gates, its record audit and its messages.
const FIRST = [
  { tab: 'board', after: 11, case: 'AX-103', n: 1, title: 'Watch a date error get caught', button: 'Show me that moment',
    todo: 'The firm asked to move the two Garden Street hearings to June 13. A consultant changed the shared calendar, the case records followed, and then the office said no (message 11). This opens 63 Garden Street as the tower saw it at that moment, with the six messages of the story under it.',
    proves: 'A request, a calendar edit and “works for me” change nothing official. The tower keeps June 11, marks the calendar and the record as contradicted, and nobody counts as covering the hearing. Press “Return to now” to see the answer it drafts and the one offer that covers both hearings.' },
  { tab: 'board', after: 53, case: 'AX-117', n: 2, title: 'Follow a cancellation that never happened', button: 'Show me that moment',
    todo: 'The firm marked a Maple Lane case “canceled internally” and asked the office for a withdrawal. Two days later the office’s reminder still lists the hearing (message 53). This opens that hearing right after the reminder arrived.',
    proves: 'Not processed means still scheduled. The consultant stays on the hearing, the record’s “canceled” is marked contradicted, a chaser to the office is drafted, and nothing goes out until a person has spoken to the homeowner.' },
  { tab: 'money', n: 3, title: 'Grow the firm, and see what pays', button: 'Open the business case',
    todo: 'Set the sliders to your own numbers: hearings a year, fee, consultant cost, minutes, missed hearings. Then open the Scale page and simulate 300 to 3,000 hearings with silent clerks and consultants who drop out.',
    proves: 'What a hearing costs, what the no-software kit and the tower are each worth, from how many hearings a year each pays for itself, how many coordinators and consultant-days a peak week needs, and that the human work per hearing stays flat as volume grows.' },
];
const TOUR = [
  { tab: 'board', n: 4, title: 'See why a hearing is, or is not, ready', button: 'Open the board',
    todo: 'Click any hearing. Each of its five gates shows the evidence that closed it, and the one party that is allowed to close it.',
    proves: 'How the firm knows the work is complete: “ready” is computed from evidence. Nobody types it in, and a calendar entry or a hopeful email cannot fake it.' },
  { tab: 'queue', n: 5, title: 'Do a morning’s work in a minute', button: 'Open the work queue',
    todo: 'Approve a one-click item, then play the other side: pick the consultant’s or the clerk’s answer, or let nobody answer. “Run to the end” does it all with everyone cooperating.',
    proves: 'Where people are needed: three lanes, sorted by who has to act. The counters show how much needed no person at all.' },
  { tab: 'compose', n: 6, title: 'Try to fool it', button: 'Try a message',
    todo: 'Thirteen situations are one click away: a forged office address, a rumour, a phone call, a homeowner, and an email that orders the AI to mark everything done. Or write your own.',
    proves: 'Safety does not depend on the reader being right. A wrong or fooled reading can raise a flag, never close a gate.' },
  { tab: 'counties', n: 7, title: 'Add an eleventh county', button: 'Open the counties',
    todo: 'Paste how a new office describes its process and approve the file. Then change the packet rule for every county with one edit.',
    proves: 'Different local processes are data, not code. A new county costs one small file and one approval.' },
  { tab: 'checks', n: 8, title: 'Check the checks, and the AI readers', button: 'Open the checks',
    todo: 'Run all checks in this browser. Below them: how two AI readers scored on labelled messages, one message at a time, and what every model call cost and how long it took.',
    proves: 'Every claim on these pages can be re-run, and the one part that is not deterministic is measured and watched.' },
];
const card = (t) => html`<article class="tourcard">
  <div class="tour-n">${t.n}</div>
  <h3>${t.title}</h3>
  <p>${t.todo}</p>
  <p class="proves"><b>What it shows.</b> ${t.proves}</p>
  <button class="btn btn-primary" data-action="tour-go" data-id="${t.tab}" data-after="${t.after === undefined ? '' : t.after}" data-case="${t.case || ''}">${t.button}</button>
</article>`;

export function startView({ S, data }) {
  const v = S.view, items = S.items, N = data.messages.length;
  const upcoming = v.cases.filter((c) => c.stage === 'upcoming');
  const ready = upcoming.filter((c) => c.readiness === 'ready').length;
  const atRisk = v.counts.at_risk + v.counts.past;
  const covered = upcoming.filter((c) => c.covered).length;
  const todo = items.filter((i) => i.phase === 'todo');
  const person = todo.filter((i) => i.level === 'human' || i.level === 'L0').length;
  const click = todo.filter((i) => i.level === 'L1').length;
  const waiting = items.filter((i) => i.phase === 'waiting').length;
  const examples = S.messages.filter((m) => typeof m.id === 'number' && !m.corrects);
  const statements = examples.flatMap((m) => m.claims);
  const facts = statements.filter((c) => c.disposition === 'fact').length;
  const audit = auditRecords(v, S.eng.dir).summary;
  const sent = S.outbox.length, by = S.countsByLevel();

  return html`
  <section class="panel hero">
    <h1>The firm’s week, read by the tower</h1>
    <p class="lead">This is a working prototype for Alice’s Law Firm. It has read the firm’s ${N} example messages the way a live system would, one at a time and in order, and worked out which of the ${v.cases.length} hearings are really ready, what is missing for the others, and what to do next. Everything on these pages is computed from the messages. Nothing is sent anywhere, and you can undo every step.</p>
    <div class="now">
      <button class="nowtile" data-action="nav" data-id="board"><b>${ready} of ${upcoming.length}</b><span>upcoming hearings are proven ready</span></button>
      <button class="nowtile ${atRisk ? 'tone-border-bad' : ''}" data-action="nav" data-id="board"><b>${atRisk}</b><span>${atRisk === 1 ? 'hearing is' : 'hearings are'} at risk or have no known outcome</span></button>
      <button class="nowtile" data-action="nav" data-id="board"><b>${covered} of ${upcoming.length}</b><span>have a consultant committed to that exact slot</span></button>
      <button class="nowtile" data-action="nav" data-id="queue"><b>${person} + ${click}</b><span>${plural(person, 'task', 'tasks')} for a person, ${plural(click, 'one-click approval', 'one-click approvals')}; ${waiting} waiting on others</span></button>
      <button class="nowtile" data-action="nav" data-id="board"><b>${audit.contradicted} of ${audit.cases}</b><span>of the firm’s own case records are contradicted by the evidence</span></button>
      <button class="nowtile" data-action="nav" data-id="messages"><b>${facts} of ${statements.length}</b><span>statements in the ${examples.length} messages came from the party with authority and became official facts</span></button>
    </div>
    ${sent ? html`<p class="muted small">Since the examples ended, in this session: ${plural(sent, 'action', 'actions')}. ${levelPill('L2')} ${by.L2} · ${levelPill('L1')} ${by.L1} · ${levelPill('L0')} ${by.L0} · ${levelPill('human')} ${by.human}</p>` : ''}
  </section>

  <section class="panel">
    <div class="panel-head"><h2>Three things to try first</h2><p class="muted small">About five minutes. Two stories from the example week, and the question of scale.</p></div>
    <div class="tour">${FIRST.map(card)}</div>
  </section>

  <section class="panel">
    <div class="panel-head"><h2>Five more, if you have time</h2><p class="muted small">Each one shows a part of the answer to the firm’s question.</p></div>
    <div class="tour">${TOUR.map(card)}</div>
  </section>

  <section class="panel">
    <div class="panel-head"><h2>Good to know before you click</h2></div>
    <ul class="tight">
      <li><b>This file is the second step, not the first.</b> The firm’s first priority needs no software: a count of its own numbers, then a gate sheet (<code>gate-sheet.xlsx</code> in the deliverables folder) beside which this prototype’s two AI readers only propose proof links (<code>node cli/sheet.js</code>). The tower on these pages is what the firm would build later, and only if its own hours justify it: see the Business case tab.</li>
      <li><b>The clock is simulated.</b> The examples end on Friday June 7, 2030, at 11:16 a.m. The buttons at the top move time forward, which is how you see reminders, deadlines and escalations fire.</li>
      <li><b>You play everyone else.</b> When the tower has asked someone for something, the work queue offers their possible answers. Each answer goes through the same reading and the same checks as a real message.</li>
      <li><b>The reader in this file works offline.</b> It is a pattern reader, so the prototype opens with a double click and needs no key. With an API key the same engine runs with an AI reader; the README says how, and the Checks tab shows how each reader scores.</li>
      <li><b>Undo and Reset are at the top.</b> You cannot break anything.</li>
    </ul>
    <p><button class="btn" data-action="nav" data-id="how">How it works, on one page</button></p>
  </section>`;
}
