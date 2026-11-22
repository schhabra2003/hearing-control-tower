// Firm-held files: staffing notices, packets and forms. They are the firm's own paperwork, so
// they count as beliefs, never as government evidence. A notice marked "recorded" in the
// firm's folder does not close the "representative recorded" gate; only the office can.
// The checks here catch paperwork that would put a wrong fact in front of a clerk.

export const REQUIRED_FIELDS = {
  staffing_notice: ['property', 'case', 'county', 'representative', 'status'],
  packet: ['property', 'homeowner', 'case', 'county', 'tax year', 'packet version'],
};

export function parseFields(text) {
  const out = {};
  for (const line of String(text || '').split('\n')) {
    const m = line.match(/^([A-Za-z][A-Za-z ]{1,30}):\s*(.+)$/);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

// -> { byCase: { [caseId]: { notice, packets: [...] } }, findings: [...] }
export function indexDocuments(packet, dir) {
  const byCase = {};
  const findings = [];
  const slot = (id) => (byCase[id] = byCase[id] || { notice: null, packets: [] });
  for (const d of packet.documents || []) {
    const f = parseFields(d.text);
    const caseId = d.case_id || f.case || null;
    const required = REQUIRED_FIELDS[d.kind] || [];
    const missing = required.filter((k) => !f[k]);
    if (!caseId || !dir.caseById[caseId]) continue;
    const rec = dir.caseById[caseId];
    if (missing.length) findings.push({ code: 'DOC_FIELD_MISSING', caseId, doc: d.name, text: `${d.name} has no ${missing.map((m) => `"${m[0].toUpperCase() + m.slice(1)}"`).join(', ')} line.` });
    if (f.property && f.property !== rec.property) findings.push({ code: 'DOC_WRONG_CASE', caseId, doc: d.name, text: `${d.name} is filed under ${caseId} but names ${f.property}.` });
    if (d.kind === 'staffing_notice') {
      const k = dir.consultants.find((x) => x.name === f.representative);
      slot(caseId).notice = { name: d.name, representative: k ? k.id : null, repName: f.representative || null, status: /not yet submitted/i.test(f.status || '') ? 'not_submitted' : /recorded/i.test(f.status || '') ? 'recorded' : 'unknown', missing };
    } else if (d.kind === 'packet') {
      slot(caseId).packets.push({ name: d.name, version: +d.version || +(f['packet version'] || 0), prepared: f.prepared || null, contents: f.contents || null });
    }
  }
  for (const id of Object.keys(byCase)) byCase[id].packets.sort((a, b) => a.version - b.version);
  return { byCase, findings };
}
