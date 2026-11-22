// Messages: every message the firm received or sent, and exactly what the tower made of it.
// The trace shows the division of labour: a reader turns words into statements, and code
// decides what each statement is allowed to do, based on who said it and how.

import { html, raw, when, ROLES, DISPOSITION, READINESS, pill, caseChip, msgChip, empty, fieldSummary, markedBody, claimLabel, claimHelp, dispositionHelp, plural, addrOf } from '../ui.js';

const RESOLVED = {
  thread: 'the thread it arrived in', text: 'an address or case number in the text', homeowner: "the homeowner's own cases", person: 'a person filed it', question: 'the one open question the firm had asked this sender', none: null,
};

function whoIs(m, S) {
  const dir = S.eng.dir;
  if (m.spoofSuspected) return html`${pill('Unknown sender', 'bad')} The display name is one the firm knows, but the address is not the one on file. No authority.`;
  const how = m.address ? 'Identified by the address on file.' : 'Identified by name: the example messages carry no addresses. In production the address decides (SPF, DKIM, DMARC and the allow-list in the county file and the roster).';
  if (m.role === 'government') return html`${pill('County office', 'info')} ${m.county}. ${how}`;
  if (m.role === 'consultant') return html`${pill('Consultant', 'info')} ${dir.consultantById[m.consultant] ? dir.consultantById[m.consultant].name : m.consultant}. ${how}`;
  if (m.role === 'firm') return html`${pill('Firm staff', 'info')} ${m.verbal ? 'A phone note: it carries what someone told the firm by phone, so nothing in it counts as written.' : m.direction === 'out' ? "The firm's own message. It can record what the firm did, never what an office or a consultant decided." : ''}`;
  if (m.role === 'homeowner') return html`${pill('Homeowner', 'wait')} ${m.homeowner}. A homeowner's message changes nothing by itself: a person calls them back on the number on file.`;
  return html`${pill('Unknown sender', 'bad')} Not an office, a consultant or a staff address the firm knows. No authority.`;
}

// What the two AI readers made of an example message in the recorded run, in one or two lines.
function recordedLine(m, data) {
  const rr = data && data.reader_results;
  const row = rr && rr.per_message ? rr.per_message[String(m.id)] : null;
  if (!row || m.corrects) return '';
  const parts = [];
  if (row.failed) parts.push(html`${pill('not read', 'bad')} The first reader gave no usable answer in the recorded run, so the message went to a person.`);
  else if (row.exact && !row.for_person) parts.push(html`${pill('same reading', 'good')} They found exactly the statements of the hand labels${row.found ? html` (${row.found})` : ', which is none'}, and nothing was held back.`);
  else {
    parts.push(html`${pill(row.for_person ? 'to a person' : 'differs', row.for_person ? 'wait' : 'bad')} ${row.found} of ${row.found + row.missed.length} labelled statements were applied${row.extra.length ? html`, and ${row.extra.length} that the labels do not have (${row.extra.join('; ')})` : ''}.`);
    if (row.missed.length) parts.push(html` Not applied: ${row.missed.join('; ')}.`);
    for (const h of row.held || []) parts.push(html` Held back for a person: ${h.claim}. ${h.reason}`);
    if ((row.not_classified || []).length) parts.push(html` Passed to a person as text they could not classify: ${row.not_classified.length}.`);
  }
  return html`<div class="aireading"><b>The two AI readers on this message</b> <span class="muted small">(recorded run: ${rr.recorded.primary}, checked by ${rr.recorded.second})</span><div class="small">${parts}</div></div>`;
}

// For a message that was read live: who read it, how long it took and what it cost.
function liveLine(m) {
  const r = m.reading;
  if (!r || !r.live) return '';
  const u = r.usage || [];
  return html`<div class="aireading"><b>Read live by two AI readers</b><div class="small">${u.map((x) => html`${x.reader}: ${x.model}, ${((x.ms || 0) / 1000).toFixed(1)} s${typeof x.costUsd === 'number' ? html`, $${x.costUsd.toFixed(4)}` : ''}. `)}${(r.disputed || []).length ? html`${r.disputed.length} statement${r.disputed.length === 1 ? ' was' : 's were'} held back because the readers did not agree.` : 'Every statement that can close something was found by both.'}${(r.notes || []).length ? html` ${r.notes.join(' ')}` : ''}</div></div>`;
}

export function traceView(m, { S, data }, { compact = false } = {}) {
  if (!m) return empty('Pick a message.');
  const dir = S.eng.dir;
  const prop = (id) => (dir.caseById[id] ? addrOf(dir.caseById[id].property) : id);
  return html`<div class="trace">
    <header class="trace-head">
      <div><b>${m.sender}</b>${m.address ? html` <span class="muted">&lt;${m.address}&gt;</span>` : ''}</div>
      <div class="muted">${m.channel} · ${when(m.ts)} · message ${m.id}${m.corrects ? html` · ${pill('entered by a person', 'info')}` : ''}${m.reader && !m.corrects ? html` · read by: ${m.reader}` : ''}</div>
    </header>

    <ol class="stages">
      <li><h4>1. Who is speaking?</h4><p>${whoIs(m, S)}</p></li>
      <li><h4>2. Which hearings?</h4><p>${m.caseIds.length ? html`${m.caseIds.map((id) => caseChip(id, `${id} ${prop(id)}`))} <span class="muted">matched by ${RESOLVED[m.resolvedBy] || m.resolvedBy}.</span>${(m.alsoCases || []).length ? html` <span class="muted">It also changed</span> ${m.alsoCases.map((id) => caseChip(id, `${id} ${prop(id)}`))}<span class="muted">, which it does not name.</span>` : ''}` : html`${pill('No case matched', 'bad')} The message names no case and sits in no known thread. A person files it.`}</p></li>
      <li><h4>3. What does it say?</h4>
        <blockquote class="body">${markedBody(m.body, m.claims)}</blockquote>
        ${m.claims.length ? html`<table class="claims"><thead><tr><th>Statement</th><th>What it is allowed to do</th><th>What changed</th></tr></thead><tbody>
          ${m.claims.map((c) => html`<tr>
            <td><b title="${claimHelp(c.type)}">${claimLabel(c.type)}</b><div class="muted small">${c.cases.map((id) => caseChip(id))} ${fieldSummary(c, (id) => (dir.consultantById[id] ? dir.consultantById[id].name : id))}</div>${c.quote && c.quote !== m.body ? html`<div class="quote">“${c.quote}”</div>` : ''}</td>
            <td>${pill(DISPOSITION[c.disposition].label, DISPOSITION[c.disposition].tone, dispositionHelp(c.disposition))}<div class="small">${c.reason}</div></td>
            <td>${c.effects.length ? html`<ul class="effects">${c.effects.map((e) => html`<li><span class="muted">${e.caseId}</span> ${e.text}</li>`)}</ul>` : html`<span class="muted">Nothing.</span>`}</td>
          </tr>`)}
        </tbody></table>` : html`<p>${pill('Nothing recognised', 'wait')} The reader found no statement it knows. The message is not dropped: see step 5.</p>`}
        ${liveLine(m)}${compact ? '' : recordedLine(m, data)}
      </li>
      ${compact ? '' : html`<li><h4>4. What moved on the board?</h4>
        ${m.readinessChanges.length || m.opened.length || m.closed.length ? html`
          ${m.readinessChanges.length ? html`<p>${m.readinessChanges.map((r) => html`<span class="change">${caseChip(r.caseId)} ${pill(READINESS[r.from].label, READINESS[r.from].tone)} → ${pill(READINESS[r.to].label, READINESS[r.to].tone)}</span>`)}</p>` : ''}
          ${m.opened.length ? html`<p class="small"><b>Opened:</b> ${m.opened.map((i) => html`<span class="issue-line">${i.caseId} ${i.title}</span>`)}</p>` : ''}
          ${m.closed.length ? html`<p class="small"><b>Closed:</b> ${m.closed.map((i) => html`<span class="issue-line">${i.caseId} ${i.title}</span>`)}</p>` : ''}` : html`<p class="muted">Nothing. No gate opened or closed.</p>`}
      </li>`}
      <li><h4>${compact ? '4' : '5'}. Does a person need to read it?</h4>
        ${m.attention && m.attention.length ? html`<p>${pill('Yes', 'bad')} ${m.attention.join(' ')} It stays in the work queue until someone has read it.</p>` : html`<p>${pill('No', 'good')} ${m.direction === 'out' && !m.verbal ? "The firm's own message." : 'Every statement was understood and handled by the rules above.'}</p>`}
      </li>
    </ol>
  </div>`;
}

export function messagesView(app) {
  const { S, ui } = app;
  const all = S.messages;
  const q = (ui.msgSearch || '').toLowerCase();
  const list = all.filter((m) => (!ui.msgCase || m.caseIds.includes(ui.msgCase)) && (!ui.msgAttention || (m.attention && m.attention.length)) && (!q || `${m.sender} ${m.body} ${m.id}`.toLowerCase().includes(q)));
  const sel = all.find((m) => String(m.id) === String(ui.msgId)) || list[list.length - 1] || null;
  const cases = S.eng.dir.cases;
  const tone = (m) => (m.attention && m.attention.length ? 'bad' : m.claims.some((c) => c.disposition === 'fact') ? 'good' : m.claims.some((c) => ['flag', 'provisional', 'signal', 'held'].includes(c.disposition)) ? 'wait' : 'muted');
  return html`
  <section class="panel msg-filters">
    <label>Hearing <select data-change="msg-case"><option value="">all</option>${cases.map((c) => html`<option value="${c.case_id}" ${ui.msgCase === c.case_id ? raw('selected') : ''}>${c.case_id} ${addrOf(c.property)}</option>`)}</select></label>
    <label>Search <input type="search" data-input="msg-search" value="${ui.msgSearch || ''}" placeholder="sender or text"></label>
    <label class="switch"><input type="checkbox" data-action="msg-attention" ${ui.msgAttention ? raw('checked') : ''}> <span>Only messages a person had to read</span></label>
    <span class="spacer"></span>
    <span class="muted small">${plural(list.length, 'message', 'messages')} of ${all.length}. The dot shows the strongest effect: green an official fact, amber a flag or a lead, red a person had to read it.</span>
  </section>
  <div class="split">
    <section class="panel msglist" id="msglist">
      ${list.length ? list.map((m) => html`<button class="msgrow ${sel && sel.id === m.id ? 'selected' : ''}" data-action="open-msg" data-id="${m.id}">
        <span class="dot tone-${tone(m)}"></span>
        <span class="msg-id">${m.id}</span>
        <span class="msg-main"><b>${m.sender}</b> <span class="muted">${m.channel === 'email' ? '' : `· ${m.channel}`}</span><span class="clip">${m.body}</span></span>
        <span class="msg-when muted">${when(m.ts)}</span>
      </button>`) : empty('No message matches.')}
    </section>
    <section class="panel">${traceView(sel, app)}</section>
  </div>`;
}
