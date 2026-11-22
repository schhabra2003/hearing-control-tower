// The readiness board: every hearing, its five gates, and what happens next. This is how the
// firm knows the work is complete: "ready" is computed from evidence, never typed in by hand.

import { html, raw, when, rel, fmtSlot, fmtDate, fmtTime, READINESS, GATE_STATUS, GATES, ROLES, readinessPill, levelPill, gateMark, caseChip, msgChip, evidence, empty, addrOf, pill, plural, cap, words } from '../ui.js';
import { auditRecords } from '../../src/audit.js';
import { STAFFING_METHODS } from '../../src/playbook.js';
import { localParts } from '../../src/time.js';

const FILTERS = [
  ['all', 'All'], ['at_risk', 'At risk'], ['in_progress', 'In progress'], ['ready', 'Ready'], ['past', 'Outcome unknown'], ['post', 'After the hearing'], ['closed', 'Closed'],
];

const nextFor = (items, id) => items.find((i) => i.cases.includes(id));

export function boardView({ S, ui }) {
  const { view, items } = S;
  const now = S.now;
  const filter = ui.boardFilter || 'all';
  const rows = [...view.cases]
    .filter((c) => filter === 'all' || c.readiness === filter)
    .sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity) || a.id.localeCompare(b.id));
  const todo = items.filter((i) => i.phase === 'todo');
  const people = todo.filter((i) => i.level === 'human' || i.level === 'L0').length;
  const clicks = todo.filter((i) => i.level === 'L1').length;
  const waiting = items.filter((i) => i.phase === 'waiting').length;
  const upcoming = view.cases.filter((c) => c.stage === 'upcoming');
  const covered = upcoming.filter((c) => c.covered).length;

  let lastDay = null;
  const body = rows.map((c) => {
    const L = c.ledger;
    const day = c.start ? localParts(c.start).date : 'none';
    const head = day !== lastDay ? html`<tr class="dayrow"><th colspan="6">${day === 'none' ? 'No official date' : fmtDate(day)}${day !== 'none' && c.start > now ? html` <span class="muted">· ${rel(c.start, now)}</span>` : ''}</th></tr>` : '';
    lastDay = day;
    const n = nextFor(items, c.id);
    const who = c.committed ? S.eng.dir.consultantById[c.committed.id].name : null;
    return html`${head}<tr class="caserow ${ui.caseId === c.id ? 'selected' : ''}" data-action="open-case" data-id="${c.id}" tabindex="0">
      <td class="col-when">${L.schedule ? html`<b>${fmtTime(L.schedule.time)}</b><div class="muted">${L.schedule.mode === 'video' ? 'video' : L.schedule.mode === 'in_person' ? 'in person' : ''}${L.schedule.room ? `, room ${L.schedule.room}` : ''}</div>` : html`<span class="muted">no date</span>`}</td>
      <td><b>${addrOf(L.property)}</b><div class="muted">${c.id} · ${L.county}</div></td>
      <td>${who ? who : c.stage === 'upcoming' || c.stage === 'unscheduled' ? html`<span class="tone-text-bad">nobody committed</span>` : html`<span class="muted">nobody</span>`}</td>
      <td class="col-gates">${GATES.map((g) => gateMark(g, c.gates[g.id]))}</td>
      <td>${readinessPill(c.readiness)}</td>
      <td class="col-next">${n ? html`${levelPill(n.level)} <span class="${n.phase === 'waiting' ? 'muted' : ''}">${n.title}</span>` : html`<span class="muted">Nothing to do</span>`}</td>
    </tr>`;
  });

  return html`
  <section class="tiles">
    ${FILTERS.slice(1).map(([key, label]) => html`<button class="tile tone-${READINESS[key].tone} ${filter === key ? 'active' : ''}" data-action="board-filter" data-id="${filter === key ? 'all' : key}" title="${READINESS[key].help}">
      <span class="tile-n">${view.counts[key]}</span><span class="tile-l">${label}</span></button>`)}
    <div class="tile tile-wide">
      <span class="tile-l">Someone will be in the room</span>
      <span class="tile-n">${covered} <small>of ${upcoming.length} upcoming</small></span>
    </div>
    <div class="tile tile-wide">
      <span class="tile-l">Open work</span>
      <span class="tile-s"><b>${people}</b> for a person · <b>${clicks}</b> one click · <b>${waiting}</b> waiting on others</span>
    </div>
  </section>
  <section class="panel">
    <div class="panel-head">
      <h2>${filter === 'all' ? 'All hearings' : READINESS[filter].label} <span class="muted">(${rows.length})</span></h2>
      <div class="legend">${GATES.map((g, i) => html`<span title="${g.name}. Who can close it: ${g.authority}."><b>${i + 1}</b> ${g.short}</span>`)}
        <span class="legend-marks">${Object.values(GATE_STATUS).map((v) => html`<span class="gate tone-${v.tone}">${v.mark}</span> ${v.label}`)}</span></div>
    </div>
    ${rows.length ? html`<table class="board">
      <thead><tr><th>Time</th><th>Hearing</th><th>Attending</th><th class="col-gates">Gates 1 to 5</th><th>Status</th><th>Next step</th></tr></thead>
      <tbody>${body}</tbody>
    </table>` : empty('No hearings in this group.')}
  </section>`;
}

// ---- one hearing, with the evidence behind every statement
export function caseDrawer({ S, ui }, id) {
  const { view, items } = S;
  const now = S.now;
  const c = view.cases.find((x) => x.id === id);
  if (!c) return '';
  const L = c.ledger, pb = c.playbook, dir = S.eng.dir;
  const name = (cid) => (dir.consultantById[cid] ? dir.consultantById[cid].name : cid);
  const mine = items.filter((i) => i.cases.includes(id));
  const audit = auditRecords(view, dir).rows.find((r) => r.caseId === id);
  const msgs = S.messages.filter((m) => m.caseIds.includes(id) || (m.alsoCases || []).includes(id));
  const method = STAFFING_METHODS[pb.staffing.method];
  const due = { G2: c.due.G2, G3: c.due.G3, G4: c.due.G4 };

  return html`<aside class="drawer" aria-label="Hearing ${id}">
    <header class="drawer-head">
      <div>
        <h2>${L.property}</h2>
        <div class="muted">${id} · homeowner ${L.homeowner} · ${L.county} ${c.record.tax_year ? `· tax year ${c.record.tax_year}` : ''}</div>
      </div>
      <button class="btn btn-quiet" data-action="close-drawer" aria-label="Close">Close</button>
    </header>
    <div class="drawer-body">
      <div class="drawer-status">${readinessPill(c.readiness)} <span>${READINESS[c.readiness].help}</span></div>

      <h3>The five gates</h3>
      <ol class="gatelist">
        ${GATES.map((g) => { const v = c.gates[g.id]; return html`<li class="gateitem tone-border-${GATE_STATUS[v.status].tone}">
          <div class="gate-top">${gateMark(g, v)} <b>${g.name}</b> ${pill(GATE_STATUS[v.status].label, GATE_STATUS[v.status].tone)}
            ${due[g.id] && v.status !== 'closed' && v.status !== 'na' && c.stage === 'upcoming' ? html`<span class="due ${due[g.id] < now ? 'tone-text-bad' : ''}">working deadline ${when(due[g.id])} (${rel(due[g.id], now)})</span>` : ''}</div>
          <div class="gate-text">${v.text || 'Not needed for this hearing.'}</div>
          <div class="gate-foot"><span class="muted">Only this closes it: ${g.authority.toLowerCase()}.</span> ${evidence(v.evidence)}</div>
        </li>`; })}
      </ol>

      <h3>Open issues <span class="muted">(${c.issues.length})</span></h3>
      ${c.issues.length ? html`<ul class="issues">${c.issues.map((i) => html`<li>${pill(i.severity === 'problem' ? 'Problem' : i.severity === 'waiting' ? 'Waiting' : 'Note', i.severity === 'problem' ? 'bad' : i.severity === 'waiting' ? 'wait' : 'info')} <b>${i.title}</b><div>${i.detail}</div>${evidence(i.evidence)}</li>`)}</ul>` : empty('None.')}

      <h3>Next steps <span class="muted">(${mine.length})</span></h3>
      ${mine.length ? html`<ul class="steps">${mine.map((i) => html`<li>${levelPill(i.level)} ${i.phase === 'waiting' ? pill('waiting', 'wait') : ''} ${i.title} <button class="link" data-action="goto-item" data-id="${i.key}">open</button></li>`)}</ul>` : empty('Nothing to do for this hearing right now.')}

      <h3>The firm's old record against the evidence</h3>
      <p class="muted small">The case record is "supporting reference material, not a verified live system". This is what it says, and what the messages show.</p>
      ${audit && audit.findings.length ? html`<table class="mini"><thead><tr><th>Field</th><th>Record says</th><th>Evidence shows</th></tr></thead><tbody>
        ${audit.findings.map((f) => html`<tr><td>${cap(f.field)} ${pill(f.verdict, f.verdict === 'contradicted' ? 'bad' : f.verdict === 'missing' ? 'wait' : 'muted')}</td><td>${f.record}</td><td>${f.evidence}<div class="muted small">${f.note} ${evidence(f.sources)}</div></td></tr>`)}
      </tbody></table>` : empty('The record agrees with the evidence.')}

      <h3>Messages about this hearing <span class="muted">(${msgs.length})</span></h3>
      <ul class="msglist-mini">${msgs.map((m) => html`<li>${msgChip(m.id)} <span class="muted">${when(m.ts)}</span> <b>${m.sender}</b>${m.corrects ? html` ${pill('corrected by a person', 'info')}` : ''}<div class="clip">${m.body}</div></li>`)}</ul>

      <h3>${L.county}'s rules <span class="muted">(playbook version ${pb.version})</span></h3>
      <dl class="rules">
        <dt>Recording a representative</dt><dd>${method ? method.label : words(pb.staffing.method)}${method ? html`<ol>${method.steps.map((st) => html`<li>${st}</li>`)}</ol>` : ''}</dd>
        <dt>Packet</dt><dd>${pb.packet.lead_hours} hours before the hearing, to the clerk and the consultant. Proof that the clerk has it: ${pb.packet.clerk_evidence === 'sent_on_time' ? 'an on-time send (this office sends no receipts)' : "the clerk's own receipt"}.</dd>
        <dt>Signatures</dt><dd>${pb.signatures.attending_consultant_signs ? 'The attending consultant must sign.' : 'No special rule.'}</dd>
        <dt>Office hours</dt><dd>${pb.office.contact_hours.days}, ${fmtTime(pb.office.contact_hours.start)} to ${fmtTime(pb.office.contact_hours.end)}. Deadlines that fall outside these hours are pulled back to the last open hour.</dd>
        <dt>Where the rules come from</dt><dd>${pb.own_fields} settings are ${L.county}'s own. ${pb.inherited_fields} are inherited from the shared rules. <button class="link" data-action="nav" data-id="counties">See all counties</button></dd>
      </dl>
    </div>
  </aside>`;
}
