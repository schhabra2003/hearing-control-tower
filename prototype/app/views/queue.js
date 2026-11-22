// The work queue: what the tower wants to do next, sorted by who has to act. This is where the
// prototype shows where people are needed: the automatic lane runs by itself, the one-click
// lane needs an approval, and the person lane is work only a person can do.

import { html, raw, when, rel, LEVELS, levelPill, caseChip, evidence, empty, pill, draftBox, plural, claimLabel, words, fieldSummary } from '../ui.js';
import { TYPE_LIST } from '../../src/model.js';

const ACTION_LABEL = (it) => {
  if (it.kind === 'triage') return 'Read: nothing more to do';
  if (it.kind === 'playbook') return 'Approve the change';
  if (it.level === 'human') return it.to && it.to.channel === 'phone note' ? 'Done' : 'Done: I did this';
  if (it.level === 'L0') return 'Checked: send it';
  if (it.level === 'L1') return 'Approve and send';
  return 'Send now';
};

function proposal(it) {
  return html`<div class="proposal">
    ${it.driftQuote ? html`<blockquote>${it.driftQuote}</blockquote>` : ''}
    ${it.proposal && it.proposal.length ? html`<table class="mini"><thead><tr><th>Setting</th><th>Saved</th><th>Proposed</th></tr></thead><tbody>
      ${it.proposal.map((ch) => html`<tr><td><code>${ch.path}</code></td><td>${words(ch.from)}</td><td><b>${words(ch.to)}</b></td></tr>`)}</tbody></table>`
      : html`<p class="muted">The tower could not turn this into a specific change. A person edits the county file.</p>`}
    <p class="muted small">Nothing is sent to this office under the old process while the change is open. Approving it creates a new version of the county file. Every hearing in the county is re-planned at once.</p>
  </div>`;
}

function correctionForm(it, S, ui) {
  const f = ui.correct;
  const dir = S.eng.dir;
  const pool = it.cases.length ? it.cases : dir.cases.map((c) => c.case_id);
  return html`<form class="correct" data-form="correct" data-id="${it.message.id}">
    <p class="small"><b>Enter what the message says.</b> It goes through the same checks as any reading, with the authority of the person who sent it: a person can correct what a message says, never who said it.</p>
    <div class="formrow">
      <label>Statement <select name="type">${TYPE_LIST.map((t) => html`<option value="${t}" ${f.type === t ? raw('selected') : ''}>${claimLabel(t)}</option>`)}</select></label>
      <label>Hearing <select name="case">${pool.map((id) => html`<option value="${id}" ${f.case === id ? raw('selected') : ''}>${id} ${dir.caseById[id] ? dir.caseById[id].property.split(',')[0] : ''}</option>`)}</select></label>
      <label>Date <input name="date" type="date" value="${f.date || ''}"></label>
      <label>Time <input name="time" type="time" value="${f.time || ''}"></label>
      <label>Consultant <select name="consultant"><option value="">none</option>${dir.consultants.map((k) => html`<option value="${k.id}" ${f.consultant === k.id ? raw('selected') : ''}>${k.name}</option>`)}</select></label>
    </div>
    <div class="formrow"><button class="btn btn-primary" type="submit">Apply through the checks</button> <button class="btn btn-quiet" type="button" data-action="correct-cancel">Cancel</button></div>
  </form>`;
}

// A statement that one AI reader found and the other did not is held back. If it is what the
// message says, a person applies it here. It still goes through the verifier, with the authority
// of whoever sent the message.
function heldReadings(it, S) {
  const m = S.messages.find((x) => x.id === it.message.id && !x.corrects);
  const list = m && m.reading && m.reading.disputed ? m.reading.disputed : [];
  if (!list.length) return '';
  const nameOf = (id) => (S.eng.dir.consultantById[id] ? S.eng.dir.consultantById[id].name : id);
  return html`<div class="heldreads"><b>Held back by the second reader.</b> ${list.length === 1 ? 'This statement was' : 'These statements were'} not applied, because the two readers did not agree. If the message does say it, apply it: it then goes through the same checks as any reading.
    <ul>${list.map((d) => html`<li><b>${claimLabel(d.claim.type)}</b> ${(d.claim.cases || []).map((id) => caseChip(id))} <span class="muted small">${fieldSummary(d.claim, nameOf)}</span>${d.claim.quote ? html`<div class="quote">“${d.claim.quote}”</div>` : ''}<div class="small muted">${d.reason}</div></li>`)}</ul>
    <button class="btn" data-action="confirm-held" data-id="${it.message.id}">Yes, the message says this: apply ${list.length === 1 ? 'it' : `all ${list.length}`}</button></div>`;
}

export function itemCard(it, { S, ui }) {
  const now = S.now, live = S.live;
  const open = ui.openDrafts.has(it.key);
  const todo = it.phase === 'todo';
  const overdue = it.due && it.due < now;
  return html`<article class="card ${todo ? 'card-todo' : 'card-wait'} ${ui.focusItem === it.key ? 'card-focus' : ''}" id="item-${it.key}">
    <header class="card-head">
      ${levelPill(it.level)}
      <h3>${it.title}</h3>
      ${it.due ? html`<span class="due ${overdue ? 'tone-text-bad' : ''}" title="${when(it.due)}">${overdue ? 'was due' : 'due'} ${when(it.due)}</span>` : ''}
    </header>
    <div class="card-meta">${it.to ? html`To: <b>${it.to.name}</b>${it.to.channel ? ` · ${it.to.channel}` : ''}` : ''} ${it.cases.map((id) => caseChip(id))} ${evidence(it.evidence)}</div>
    <p class="why">${it.why}</p>
    ${it.kind === 'playbook' ? proposal(it) : ''}
    ${it.checks && it.checks.length && todo ? html`<ul class="checks">${it.checks.map((c) => html`<li>${c}</li>`)}</ul>` : ''}
    ${draftBox(it.draft, { open })}
    ${it.blocked ? html`<div class="blocked"><b>Held back.</b> ${it.blocked}</div>` : ''}
    ${it.kind === 'triage' && todo && live ? heldReadings(it, S) : ''}
    ${ui.correct && it.kind === 'triage' && ui.correct.msgId === it.message.id ? correctionForm(it, S, ui) : ''}
    <footer class="card-foot">
      ${!live ? html`<span class="muted small">History view: this is what the tower proposed at this moment.</span>`
      : todo ? html`
        <button class="btn btn-primary" data-action="act" data-id="${it.key}" ${it.blocked ? raw('disabled') : ''}>${ACTION_LABEL(it)}</button>
        ${it.kind === 'triage' ? html`<button class="btn" data-action="correct-open" data-id="${it.message.id}" data-case="${it.cases[0] || ''}">Enter what it says</button>` : ''}
        ${it.kind === 'playbook' ? html`<button class="btn" data-action="dismiss" data-id="${it.county}">Dismiss: the saved process is right</button>` : ''}
        <button class="btn btn-quiet" data-action="toggle-draft" data-id="${it.key}">${open ? 'Hide' : 'Read'} the ${it.draft && it.draft.subject ? 'draft' : 'details'}</button>`
      : html`
        <span class="muted small">${it.sentAt ? `Sent ${when(it.sentAt)}. ` : ''}${it.followUpAt && it.followUpAt > now ? `If nobody answers, the tower follows up ${when(it.followUpAt)}.` : it.replyBy && it.replyBy > now ? `If nobody answers by ${when(it.replyBy)}, the next person is asked.` : ''}</span>
        ${it.replies && it.replies.length ? html`<div class="replies"><span class="small">Simulate the answer:</span>
          ${it.replies.map((r, i) => html`<button class="btn btn-reply tone-btn-${r.tone || 'neutral'}" data-action="reply" data-id="${it.key}" data-i="${i}" title="${r.message.body}">${r.label}</button>`)}
          ${it.followUpAt && it.followUpAt > now ? html`<button class="btn btn-quiet" data-action="goto" data-ts="${it.followUpAt + 60e3}">Nobody answers</button>` : it.replyBy && it.replyBy > now ? html`<button class="btn btn-quiet" data-action="goto" data-ts="${it.replyBy + 60e3}">Nobody answers</button>` : ''}
        </div>` : ''}`}
    </footer>
  </article>`;
}

export function queueView(app) {
  const { S, ui } = app;
  const all = S.items;
  const scoped = ui.queueCase ? all.filter((i) => i.cases.includes(ui.queueCase)) : all;
  const todo = scoped.filter((i) => i.phase === 'todo');
  const lanes = [
    { id: 'person', title: 'For a person', hint: 'Phone calls, judgment, signatures and anything that involves a homeowner. The tower prepares the script or the draft and waits.', list: todo.filter((i) => i.level === 'human' || i.level === 'L0') },
    { id: 'click', title: 'One click', hint: 'Written by the tower from the evidence. A person approves each one.', list: todo.filter((i) => i.level === 'L1') },
    { id: 'auto', title: 'Automatic', hint: 'Routine messages to consultants who expect them. Sent and logged without a person.', list: todo.filter((i) => i.level === 'L2') },
  ];
  const waiting = scoped.filter((i) => i.phase === 'waiting');
  const sent = [...S.outbox].reverse();
  const by = S.countsByLevel();
  const total = sent.length;

  return html`
  <section class="panel queue-top">
    <div class="queue-controls">
      <label class="switch"><input type="checkbox" data-action="toggle-auto" ${S.s.auto ? raw('checked') : ''} ${S.live ? '' : raw('disabled')}> <span>Send automatic actions without asking</span></label>
      <span class="spacer"></span>
      <button class="btn" data-action="step" ${S.live ? '' : raw('disabled')} title="Take the next action, or let the oldest open request be answered helpfully.">Next step</button>
      <button class="btn" data-action="play" ${S.live ? '' : raw('disabled')} title="Every action is taken and everyone answers helpfully, until nothing is left.">Run to the end (everyone cooperates)</button>
    </div>
    <div class="queue-stats">
      <span>Sent or done since the examples ended: <b>${total}</b></span>
      ${['L2', 'L1', 'L0', 'human'].map((l) => html`<span>${levelPill(l)} <b>${by[l]}</b></span>`)}
      ${total ? html`<span class="muted">${Math.round((100 * by.L2) / total)}% needed no person, ${Math.round((100 * (by.L0 + by.human)) / total)}% needed a person's own work.</span>` : ''}
    </div>
    ${ui.queueCase ? html`<div class="notice">Showing work for ${caseChip(ui.queueCase)} only. <button class="link" data-action="queue-all">Show everything</button></div>` : ''}
  </section>

  <div class="lanes">
    ${lanes.map((lane) => html`<section class="lane lane-${lane.id}">
      <header><h2>${lane.title} <span class="count">${lane.list.length}</span></h2><p class="muted small">${lane.hint}</p></header>
      ${lane.list.length ? lane.list.map((it) => itemCard(it, app)) : empty(lane.id === 'auto' && S.s.auto ? 'Nothing waiting: automatic actions go out as soon as the evidence calls for them.' : 'Nothing here.')}
    </section>`)}
  </div>

  <section class="panel">
    <div class="panel-head"><h2>Waiting on others <span class="count">${waiting.length}</span></h2>
      <p class="muted small">Requests that are out. In this prototype you play the other side: pick an answer, or let nobody answer and watch the reminder timers.</p></div>
    <div class="waitgrid">${waiting.length ? waiting.map((it) => itemCard(it, app)) : empty('Nobody owes the firm an answer.')}</div>
  </section>

  <section class="panel">
    <details ${ui.showSent ? raw('open') : ''} data-toggle="showSent"><summary><h2 class="inline">Sent and done <span class="count">${total}</span></h2> <span class="muted small">Everything that left the tower, newest first. Nothing is really sent: this is a simulation.</span></summary>
      ${total ? html`<ul class="outbox">${sent.map((o) => html`<li>
        <span class="muted">${when(o.at)}</span> ${levelPill(o.level)} <b>${o.title}</b> ${o.to ? html`<span class="muted">to ${o.to.name}</span>` : ''} ${o.cases.map((id) => caseChip(id))}
        ${o.draft ? draftBox(o.draft) : ''}</li>`)}</ul>` : empty('Nothing yet.')}
    </details>
  </section>`;
}
