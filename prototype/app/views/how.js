// How it works: the design on one page, drawn from the same data the engine runs on.

import { html, raw, pill, levelPill, LEVELS, GATES, DISPOSITION, dispositionHelp, words } from '../ui.js';

const CLASS_LABEL = {
  consultant_offer: 'Offer a hearing to a consultant', consultant_update: 'Tell a consultant the official facts', consultant_reminder: 'Remind a consultant', answer_question: "Answer a consultant's question from the record",
  request_outcome: 'Ask what happened at a hearing', confirm_assignment: 'Confirm a consultant who volunteered', unusable_yes: 'Tell a consultant why their yes cannot be used', staffing_submission: "Send the representative's name to the office", packet_send: 'Send the case packet',
  chaser: 'Chase an office that has not answered', change_request: 'Ask an office for a date change', request_clear_copy: 'Ask for a readable copy of a document', signature_request: 'Ask a consultant to sign',
  obligation_submission: 'Send a signed document to the office', withdrawal_confirmation: 'Confirm a withdrawal to the office', dispute_notice: 'Tell an office not to process something', call_task: 'Phone calls',
  homeowner_contact: 'Anything that involves a homeowner', playbook_change: "Approve a change to a county's process", triage: 'Read a message the tower could not use',
};

const STAGES = [
  ['Message', 'email, text, phone note, mail, calendar', 'in'],
  ['Reader', 'AI turns words into typed statements, each with a quote', 'ai'],
  ['Checks', 'code: who said it, how, about which case', 'code'],
  ['Evidence ledger', 'append-only facts, each with its source', 'code'],
  ['Five gates', 'what is proven for each hearing', 'code'],
  ['Planner', 'what the county requires minus what is proven', 'code'],
  ['Autonomy ladder', 'send, one click, draft, or a person', 'people'],
];

function diagram() {
  const w = 138, gap = 16, h = 74;
  const total = STAGES.length * w + (STAGES.length - 1) * gap;
  return html`<svg class="flow" viewBox="0 0 ${total} ${h + 44}" role="img" aria-label="From message to action in seven steps">
    ${STAGES.map(([title, sub, kind], i) => { const x = i * (w + gap); return html`
      <g transform="translate(${x},0)">
        <rect class="flow-box flow-${kind}" x="0" y="0" width="${w}" height="${h}" rx="8"></rect>
        <text class="flow-title" x="${w / 2}" y="24" text-anchor="middle">${title}</text>
        <foreignObject x="6" y="30" width="${w - 12}" height="${h - 32}"><div xmlns="http://www.w3.org/1999/xhtml" class="flow-sub">${sub}</div></foreignObject>
        ${i < STAGES.length - 1 ? html`<path class="flow-arrow" d="M ${w + 2} ${h / 2} L ${w + gap - 3} ${h / 2}" marker-end="url(#arr)"></path>` : ''}
      </g>`; })}
    <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" class="flow-head"></path></marker></defs>
    <path class="flow-loop" d="M ${total - w / 2} ${h + 2} L ${total - w / 2} ${h + 26} L ${w / 2} ${h + 26} L ${w / 2} ${h + 4}" marker-end="url(#arr)"></path>
    <text class="flow-looptext" x="${total / 2}" y="${h + 40}" text-anchor="middle">every send is recorded, and every reply comes back in as a new message</text>
  </svg>`;
}

export function howView({ S }) {
  const autonomy = S.eng.layers.default.autonomy;
  const byLevel = (l) => Object.entries(autonomy).filter(([, v]) => v === l).map(([k]) => CLASS_LABEL[k] || words(k));
  return html`
  <section class="panel">
    <div class="panel-head"><h2>One idea: AI reads, code decides, people handle what only people can</h2></div>
    ${diagram()}
    <div class="legend flow-legend"><span><i class="sw flow-ai"></i> AI: language in, language out</span><span><i class="sw flow-code"></i> Code: every decision about state, the same answer every time</span><span><i class="sw flow-people"></i> People: approval, calls, judgment</span></div>
    <p>The reader can be wrong, fooled or offline, and the firm is still safe, because a reader can only produce <em>statements</em>. What a statement is allowed to do depends on who made it and how: only an office, in writing, sets a date or records a representative. Only a consultant commits themselves. Only the homeowner says what the homeowner wants. Anyone can raise a flag, and only the authority can clear it.</p>
  </section>

  <div class="split">
    <section class="panel">
      <h2>How the firm knows a hearing is ready</h2>
      <table class="mini"><thead><tr><th>Gate</th><th>Closes only on</th></tr></thead><tbody>
        ${GATES.map((g, i) => html`<tr><td><b>${i + 1}. ${g.name}</b></td><td>${g.authority}</td></tr>`)}
      </tbody></table>
      <p class="muted small">"Ready" is all five gates closed or not needed. It is computed from the evidence on every change, so it can never be typed in, copied from a calendar or left over from last week.</p>
      <h3>What a statement can become</h3>
      <table class="mini"><tbody>${Object.entries(DISPOSITION).map(([k, v]) => html`<tr><td>${pill(v.label, v.tone)}</td><td>${dispositionHelp(k)}</td></tr>`)}</tbody></table>
    </section>

    <section class="panel">
      <h2>Where people are needed</h2>
      <table class="mini"><thead><tr><th>Level</th><th>What it means</th><th>Used for</th></tr></thead><tbody>
        ${['L2', 'L1', 'L0', 'human'].map((l) => html`<tr><td>${levelPill(l)}</td><td>${LEVELS[l].help}</td><td><ul class="tight">${byLevel(l).map((t) => html`<li>${t}</li>`)}</ul></td></tr>`)}
      </tbody></table>
      <p class="muted small">The level of each kind of action is a setting in the shared rules, and a county can override it. Raising a class from one click to automatic is a decision the firm takes when its own error numbers for that class allow it. Lowering it takes one edit.</p>
    </section>
  </div>

  <section class="panel">
    <h2>What is real here, and what is simulated</h2>
    <ul class="tight">
      <li><b>Real:</b> the engine. Every board, action, draft and deadline in this app is computed live from the messages by the same code a production system would run.</li>
      <li><b>From the firm's examples:</b> the 72 messages, 24 cases, 6 consultants, 10 county notes and 40 documents.</li>
      <li><b>Simulated:</b> the timestamps of the example messages (the packet gives none), the answers you choose for the other side, and sending. Nothing leaves this page.</li>
      <li><b>The reader in this file</b> is the offline pattern reader, so the app runs with no network and no key. It is a baseline, not the product. The AI reader, its second reader and their measured accuracy are described in the README and on the Checks tab.</li>
      <li><b>Estimates:</b> reminder timers (24 hours), reply-by times and the staffing cost weights. They are settings, shown where they are used, to be replaced by the firm's own history.</li>
    </ul>
  </section>`;
}
