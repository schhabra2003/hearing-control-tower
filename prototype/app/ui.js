// Small rendering helpers shared by every view. No framework: views return html strings built
// with the `html` tag below, which escapes every interpolated value unless it is already html.

import { fmtWhen, fmtSlot, fmtDate, fmtTime, fmtDuration } from '../src/time.js';
import { CLAIM_TYPES, DISPOSITIONS, GATES } from '../src/model.js';

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const raw = (s) => new Raw(String(s));
const render = (v) => (v == null || v === false || v === true ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(render).join('') : esc(v));
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((str, i) => { out += str; if (i < vals.length) out += render(vals[i]); });
  return new Raw(out);
}
export const when = (ts) => (ts ? fmtWhen(ts) : '');
export const rel = (ts, now) => (ts == null ? '' : ts >= now ? `in ${fmtDuration(ts - now)}` : fmtDuration(ts - now));
export { fmtWhen, fmtSlot, fmtDate, fmtTime, fmtDuration };

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
export const words = (t) => String(t).replace(/_/g, ' ');

// ---- vocabulary, in the words a coordinator would use
export const READINESS = {
  ready: { label: 'Ready', tone: 'good', help: 'Every gate is closed by the party with authority over it.' },
  in_progress: { label: 'In progress', tone: 'wait', help: 'Nothing is wrong. Something is still on its way.' },
  at_risk: { label: 'At risk', tone: 'bad', help: 'At least one gate has a problem that needs action.' },
  past: { label: 'Outcome unknown', tone: 'bad', help: 'The hearing time has passed and nobody has reported what happened.' },
  post: { label: 'After the hearing', tone: 'info', help: 'The hearing took place. Follow-up may still be open.' },
  closed: { label: 'Closed', tone: 'muted', help: 'Withdrawn, and the office has processed it.' },
};
export const GATE_STATUS = {
  closed: { label: 'Done', mark: '✓', tone: 'good' },
  waiting: { label: 'Waiting', mark: '…', tone: 'wait' },
  problem: { label: 'Problem', mark: '!', tone: 'bad' },
  na: { label: 'Not needed', mark: '–', tone: 'muted' },
};
export const LEVELS = {
  L2: { label: 'Automatic', help: 'Sent by the system and logged. Routine, reversible, and to people who expect it.' },
  L1: { label: 'One click', help: 'The system writes it. A person approves it with one click.' },
  L0: { label: 'Person sends', help: 'The system drafts it. A person reads, edits and sends it.' },
  human: { label: 'Person only', help: 'Only a person can do this: a phone call, a judgment, a signature.' },
};
export const ROLES = {
  government: 'County office', consultant: 'Consultant', firm: 'Firm staff', homeowner: 'Homeowner', unknown: 'Unknown sender',
};
export const DISPOSITION = {
  fact: { label: 'Official fact', tone: 'good' },
  provisional: { label: 'Held: not in writing', tone: 'wait' },
  flag: { label: 'Flag raised', tone: 'bad' },
  request: { label: 'Request', tone: 'info' },
  belief: { label: 'Belief only', tone: 'muted' },
  signal: { label: 'Lead to verify', tone: 'wait' },
  held: { label: 'Held: not said plainly', tone: 'wait' },
  note: { label: 'Note', tone: 'muted' },
  rejected: { label: 'Rejected', tone: 'bad' },
};
export const claimLabel = (type) => cap(words(type));
export const claimHelp = (type) => CLAIM_TYPES[type] || '';
export const dispositionHelp = (d) => DISPOSITIONS[d] || '';
export { GATES };

// ---- small components
export const pill = (text, tone = 'muted', title = '') => html`<span class="pill tone-${tone}" title="${title}">${text}</span>`;
export const readinessPill = (r) => pill(READINESS[r].label, READINESS[r].tone, READINESS[r].help);
export const levelPill = (l) => html`<span class="level level-${l}" title="${LEVELS[l].help}">${LEVELS[l].label}</span>`;
export const gateMark = (gate, g) => html`<span class="gate tone-${GATE_STATUS[g.status].tone}" title="${gate.name}: ${GATE_STATUS[g.status].label}. ${g.text}"><span aria-hidden="true">${GATE_STATUS[g.status].mark}</span><span class="sr">${gate.short}: ${GATE_STATUS[g.status].label}</span></span>`;
export const caseChip = (id, label) => html`<button class="chip" data-action="open-case" data-id="${id}" title="Open ${id}">${label || id}</button>`;
export const msgChip = (id) => html`<button class="chip chip-msg" data-action="open-msg" data-id="${id}" title="Show message ${id}">msg ${id}</button>`;
export const evidence = (list) => {
  const ids = [...new Set((list || []).filter((x) => x != null && x !== ''))];
  return ids.length ? html`<span class="evidence">${ids.map((id) => (/^out-/.test(String(id)) ? html`<span class="chip chip-out" title="Sent by the firm through the tower">sent ${String(id).replace('out-', '#')}</span>` : msgChip(id)))}</span>` : '';
};
export const empty = (text) => html`<p class="empty">${text}</p>`;
export const addrOf = (property) => String(property).split(',')[0];

export function fieldSummary(c, nameOf = (id) => id) {
  const bits = [];
  if (c.date) bits.push(fmtDate(c.date));
  if (c.time) bits.push(fmtTime(c.time));
  if (c.mode) bits.push(c.mode === 'video' ? 'video' : 'in person');
  if (c.room) bits.push(`room ${c.room}`);
  if (c.consultant) bits.push(nameOf(c.consultant));
  if (c.kind) bits.push(words(c.kind));
  if (c.deadline) bits.push(`by ${fmtWhen(Date.parse(c.deadline + ':00-05:00'))}`);
  if (c.result) bits.push(c.result);
  if (c.part) bits.push(c.part);
  if (c.version) bits.push(c.version);
  if (c.homeowner_initiated) bits.push('asked for by the homeowner');
  if (c.no_further_hearing) bits.push('no further hearing');
  return bits.join(' · ');
}

// The body of a message with the quoted parts marked.
export function markedBody(body, claims) {
  let marks = [];
  for (const c of claims || []) {
    if (!c.quote) continue;
    const i = body.indexOf(c.quote);
    if (i >= 0 && c.quote.length < body.length) marks.push([i, i + c.quote.length]);
  }
  marks = marks.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const m of marks) { const last = merged[merged.length - 1]; if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]); else merged.push([...m]); }
  let out = '', pos = 0;
  for (const [a, b] of merged) { out += esc(body.slice(pos, a)) + `<mark>${esc(body.slice(a, b))}</mark>`; pos = b; }
  return raw(out + esc(body.slice(pos)));
}

export function draftBox(draft, { open = false } = {}) {
  if (!draft) return '';
  const att = draft.attachments || [];
  return html`<details class="draft" ${open ? raw('open') : ''}>
    <summary>${draft.subject ? 'Draft' : 'Script'}: <span class="draft-subject">${draft.subject || 'what to say'}</span></summary>
    <div class="draft-meta">To: ${draft.to || ''}</div>
    <pre class="draft-body">${draft.body}</pre>
    ${att.length ? html`<div class="draft-att">${att.map((a) => html`<details class="att"><summary>Attachment: ${a.name}</summary><pre>${a.text || ''}</pre></details>`)}</div>` : ''}
  </details>`;
}
