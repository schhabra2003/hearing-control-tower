// Counties: local processes as data. Every county is a small file that holds only what differs
// from the shared rules. Adding a county, or changing a rule for all of them, is an edit to
// data that a person approves. No code changes.

import { html, raw, pill, empty, fmtTime, words, plural, caseChip } from '../ui.js';
import { STAFFING_METHODS } from '../../src/playbook.js';
import { longDate } from '../../src/drafts.js';
import { localParts } from '../../src/time.js';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function countyDefaults() {
  return { name: 'Kestrel Bay', state: 'Asterland', mode: 'video', method: 'email_case_ids', lead: 72, proof: 'receipt', sign: false, start: '10:00', end: '15:00', property: '5 Harbor Row', homeowner: 'Quinn Marsh', date: '2030-06-24', time: '10:00',
    text: 'Hearings are held by video. Email the case IDs and the name of the representative to the clerk. Case packets are due 72 hours before the hearing. The office is open 10 a.m. to 3 p.m.' };
}

// Offline stand-in for the onboarding agent: reads a county's own description of its process
// with keyword rules. With an API key the AI agent does this step; either way a person approves.
export function parseRules(text) {
  const t = String(text).toLowerCase(), out = {};
  if (/form/.test(t) && /(call|phone)/.test(t)) out.method = 'form_then_call';
  else if (/case (id|number)s?/.test(t)) out.method = 'email_case_ids';
  else if (/staffing notice|notice naming/.test(t)) out.method = 'staffing_notice';
  const h = t.match(/(\d{2,3})\s*hours?/);
  if (h) out.lead = +h[1];
  if (/video|remote|online/.test(t)) out.mode = 'video'; else if (/in person|in-person/.test(t)) out.mode = 'in_person';
  if (/(no|not|never|n't)\b[^.]*(receipt|acknowledg)/.test(t)) out.proof = 'sent_on_time';
  if (/(attending|consultant|representative)[^.]*(must|has to|needs to|required to)[^.]*sign/.test(t)) out.sign = true;
  const hrs = t.match(/(\d{1,2})(?::(\d\d))?\s*a\.?m\.?\s*(?:to|until|-)\s*(\d{1,2})(?::(\d\d))?\s*p\.?m\.?/);
  if (hrs) { out.start = `${String(+hrs[1]).padStart(2, '0')}:${hrs[2] || '00'}`; out.end = `${String((+hrs[3] % 12) + 12).padStart(2, '0')}:${hrs[4] || '00'}`; }
  return out;
}

// Turn the form into the same shapes the engine loads from disk: a county record, a county
// file with only the differences from the shared rules, one hearing and its packet.
export function buildCounty(f, S) {
  const dir = S.eng.dir, def = S.eng.layers.default;
  const id = slug(f.name);
  const email = `clerk@${id.replace(/-/g, '')}.example`;
  const file = { id, layer: 'county', county: f.name, state: f.state, version: 1, verified_at: localParts(S.now).date, verified_from: 'Entered in the prototype and approved by a person',
    office: { email }, hearing_mode: f.mode,
    staffing: { method: f.method, template: { staffing_notice: 'staffing_notice', email_case_ids: 'staffing_email', form_then_call: 'staffing_form' }[f.method], source_text: STAFFING_METHODS[f.method].steps.join('. ') + '.' },
    replacement: f.method === 'staffing_notice' ? { method: 'updated_staffing_notice', source_text: 'Submit an updated staffing notice naming the replacement for each changed case.' } : { method: 'email_replacement', source_text: 'Email the replacement name and affected case IDs.' } };
  if (f.method === 'form_then_call') file.staffing.channel = 'email, then phone';
  if (+f.lead !== def.packet.lead_hours) file.packet = { lead_hours: +f.lead };
  if (f.proof !== def.packet.clerk_evidence) file.packet = { ...(file.packet || {}), clerk_evidence: f.proof };
  if (f.sign) file.signatures = { attending_consultant_signs: true };
  if (f.start !== def.office.contact_hours.start || f.end !== def.office.contact_hours.end) file.office.contact_hours = { days: 'Mon-Fri', start: f.start, end: f.end };
  const n = 200 + dir.cases.filter((c) => /^AX-2\d\d$/.test(c.case_id)).length + 1;
  const caseId = `AX-${n}`;
  const property = `${f.property}, ${f.name}`;
  const packetName = `${slug(f.property)}-packet-v1.txt`;
  return {
    record: { county: f.name, state: f.state, office_email: email, hearing_mode: f.mode },
    file,
    eligible: dir.consultants.map((k) => k.id),
    cases: [{ property, case_id: caseId, customer_id: `H${n}`, homeowner: f.homeowner, county: f.name, state: f.state, tax_year: '2029', hearing_date: '', hearing_time: '', timezone: 'UTC-05:00', consultant_id: '', status: 'new', packet_reference: packetName, record_updated_at: new Date(S.now).toISOString() }],
    documents: [{ name: packetName, kind: 'packet', version: 1, case_id: caseId, text: `Property: ${property}\nHomeowner: ${f.homeowner}\nCase: ${caseId}\nCounty: ${f.name}\nTax year: 2029\nPacket version: 1` }],
    notice: { sender: `${f.name} hearing office`, address: email, channel: 'email', caseIds: [caseId], body: `The hearing for ${property} is scheduled for ${longDate(f.date)} at ${fmtTime(f.time)} ${f.mode === 'video' ? 'by video' : 'in person'}. Please confirm your representative.` },
    caseId,
  };
}

const METHOD = (pb) => (STAFFING_METHODS[pb.staffing.method] ? STAFFING_METHODS[pb.staffing.method].label : words(pb.staffing.method));

export function countiesView(app) {
  const { S, ui } = app;
  const books = S.eng.books, layers = S.eng.layers, def = layers.default;
  const f = ui.county;
  const view = S.view;
  const drift = Object.entries(S.eng.state.drift || {});
  const names = layers.counties.map((c) => c.county);
  const own = names.map((n) => books[n].own_fields), inh = names.map((n) => books[n].inherited_fields);
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
  const sel = ui.countySel && books[ui.countySel] ? ui.countySel : null;
  const upcoming = (n) => view.cases.filter((c) => c.ledger.county === n && c.stage === 'upcoming').length;
  const exists = names.some((n) => n.toLowerCase() === f.name.trim().toLowerCase());
  const last = ui.countyResult;

  return html`
  <section class="panel">
    <div class="panel-head"><h2>Local processes are data</h2></div>
    <p>${plural(names.length, 'county', 'counties')}. Each county file holds on average <b>${avg(own)}</b> settings of its own and inherits <b>${avg(inh)}</b> from the shared rules. The engine has no county names in its code: a new county is a new file, and a rule that changes everywhere is one edit.</p>
    <table class="mini counties"><thead><tr><th>County</th><th>Hearings held</th><th>Recording a representative</th><th>Packet</th><th>Proof the clerk has it</th><th>Office hours</th><th>Own / inherited</th><th>Version</th><th>Upcoming</th></tr></thead><tbody>
      ${names.map((n) => { const pb = books[n]; const d = S.eng.state.drift[n]; return html`<tr class="${sel === n ? 'selected' : ''}">
        <td><button class="link" data-action="county-sel" data-id="${n}"><b>${n}</b></button> <span class="muted">${pb.state}</span> ${d && d.status === 'proposed' ? pill('process change to review', 'bad') : ''}</td>
        <td>${pb.hearing_mode === 'video' ? 'video' : 'in person'}</td>
        <td>${METHOD(pb)}${pb.signatures.attending_consultant_signs ? html` <span class="muted">· attending consultant signs</span>` : ''}</td>
        <td>${pb.packet.lead_hours} h before</td>
        <td>${pb.packet.clerk_evidence === 'sent_on_time' ? 'on-time send' : "clerk's receipt"}</td>
        <td>${fmtTime(pb.office.contact_hours.start)} to ${fmtTime(pb.office.contact_hours.end)}</td>
        <td>${pb.own_fields} / ${pb.inherited_fields}</td>
        <td>v${pb.version}${pb.verified_at ? html` <span class="muted">${pb.verified_at}</span>` : html` <span class="tone-text-wait" title="${pb.verified_from}">not yet verified with the office</span>`}</td>
        <td>${upcoming(n)}</td></tr>`; })}
    </tbody></table>
    ${sel ? html`<div class="filebox"><div class="filebox-head"><b>playbooks/${layers.counties.find((c) => c.county === sel).id}.json</b> <span class="muted">the whole county file. Everything else comes from the shared rules.</span> <button class="link" data-action="county-sel" data-id="">hide</button></div>
      <pre>${JSON.stringify(layers.counties.find((c) => c.county === sel), null, 2)}</pre></div>` : html`<p class="muted small">Click a county to see its whole file.</p>`}
  </section>

  <div class="split">
    <section class="panel">
      <h2>Change a rule for every county at once</h2>
      <p>The packet rule lives in the shared layer: <b>${def.packet.lead_hours} hours</b> before the hearing. Counties that set their own value keep it.</p>
      <div class="formrow">
        ${[48, 72].map((h) => html`<button class="btn ${def.packet.lead_hours === h ? 'btn-primary' : ''}" data-action="lead" data-id="${h}" ${S.live && def.packet.lead_hours !== h ? '' : raw('disabled')}>${h} hours</button>`)}
      </div>
      ${ui.leadResult ? html`<p class="notice">One edit moved the packet deadline of <b>${ui.leadResult.changed}</b> of ${ui.leadResult.total} upcoming hearings. Every action and every reminder was re-planned from the new rule.</p>` : ''}
      <h3>Process changes the tower noticed</h3>
      ${drift.length ? html`<ul class="steps">${drift.map(([n, d]) => html`<li><b>${n}</b> ${pill(d.status, d.status === 'proposed' ? 'bad' : d.status === 'approved' ? 'good' : 'muted')} “${d.quote || d.text}” ${d.status === 'proposed' ? html`<button class="link" data-action="goto-item" data-id="playbook:${n}">review in the work queue</button>` : ''}</li>`)}</ul>` : empty('None so far.')}
      <p class="muted small">When an office describes a process that differs from its file, nothing more is sent under the old process. A person reviews the proposed change, and approving it creates a new version of the file.</p>
    </section>

    <section class="panel">
      <h2>Add a county</h2>
      <form class="compose" data-form="county">
        <label>Paste how the office describes its process <span class="muted small">(optional: fills the fields below)</span>
          <textarea name="text" rows="3" data-input="county-text">${f.text}</textarea></label>
        <div class="formrow"><button class="btn" type="button" data-action="county-parse">Read the description</button> <span class="muted small">Offline this step uses keyword rules. With an API key an AI agent drafts the file. Either way a person approves it.</span></div>
        <div class="formrow">
          <label>County <input name="name" data-input="county-name" value="${f.name}"></label>
          <label>State <input name="state" data-input="county-state" value="${f.state}"></label>
          <label>Hearings <select name="mode" data-change="county-mode"><option value="video" ${f.mode === 'video' ? raw('selected') : ''}>video</option><option value="in_person" ${f.mode === 'in_person' ? raw('selected') : ''}>in person</option></select></label>
        </div>
        <div class="formrow">
          <label>Recording a representative <select name="method" data-change="county-method">${Object.entries(STAFFING_METHODS).map(([k, v]) => html`<option value="${k}" ${f.method === k ? raw('selected') : ''}>${v.label}</option>`)}</select></label>
          <label>Packet due <select name="lead" data-change="county-lead">${[48, 72, 96].map((h) => html`<option value="${h}" ${+f.lead === h ? raw('selected') : ''}>${h} hours before</option>`)}</select></label>
          <label>Proof the clerk has it <select name="proof" data-change="county-proof"><option value="receipt" ${f.proof === 'receipt' ? raw('selected') : ''}>the clerk's receipt</option><option value="sent_on_time" ${f.proof === 'sent_on_time' ? raw('selected') : ''}>an on-time send (no receipts)</option></select></label>
        </div>
        <div class="formrow">
          <label>Office opens <input type="time" name="start" data-input="county-start" value="${f.start}"></label>
          <label>closes <input type="time" name="end" data-input="county-end" value="${f.end}"></label>
          <label class="switch"><input type="checkbox" name="sign" data-action="county-sign" ${f.sign ? raw('checked') : ''}> <span>Attending consultant must sign</span></label>
        </div>
        <h3>A first hearing there</h3>
        <div class="formrow">
          <label>Property <input name="property" data-input="county-property" value="${f.property}"></label>
          <label>Homeowner <input name="homeowner" data-input="county-homeowner" value="${f.homeowner}"></label>
          <label>Date <input type="date" name="date" data-input="county-date" value="${f.date}"></label>
          <label>Time <input type="time" name="time" data-input="county-time" value="${f.time}"></label>
        </div>
        <div class="formrow"><button class="btn btn-primary" type="submit" ${S.live && !exists && f.name.trim() ? '' : raw('disabled')}>Approve the file and add the county</button>
          ${exists ? html`<span class="muted small">A county with this name exists already.</span>` : ''}</div>
      </form>
      ${last ? html`<div class="notice"><b>${last.county} added as data.</b> Its file has ${last.own} settings of its own and inherits ${last.inherited}. The office's scheduling notice for ${caseChip(last.caseId)} has arrived, and the tower planned the work from the new file. Open the <button class="link" data-action="nav" data-id="queue">work queue</button> and press "Run to the end", or work it by hand.</div>` : ''}
    </section>
  </div>`;
}
