// AUDIT: compare the firm's old case records with what the evidence shows.
// The packet says the records are "supporting reference material, not a verified live system".
// This is the measure of how far a hand-kept record drifts from the official position.

import { fmtSlot } from './time.js';

const STATUS_WORDS = {
  hearing_scheduled: 'hearing scheduled', canceled: 'canceled', awaiting_reschedule: 'awaiting reschedule', awaiting_decision: 'awaiting decision',
};

// view: engine.view(now). Returns one row per case with field-level findings.
export function auditRecords(view, dir) {
  const name = (id) => (dir.consultantById[id] ? dir.consultantById[id].name : id || 'nobody');
  const rows = view.cases.map((c) => {
    const rec = c.record, L = c.ledger, findings = [];
    const add = (field, verdict, record, evidence, note, sources = []) => findings.push({ field, verdict, record, evidence, note, sources: sources.filter(Boolean) });

    // 1. date and time
    if (!L.schedule) add('schedule', 'unverified', `${rec.hearing_date} ${rec.hearing_time}`, 'no government notice', 'No official notice in the evidence.');
    else if (rec.hearing_date !== L.schedule.date || rec.hearing_time !== L.schedule.time) {
      add('schedule', 'contradicted', fmtSlot({ date: rec.hearing_date, time: rec.hearing_time }), fmtSlot(L.schedule),
        L.beliefs.shared_calendar && L.beliefs.shared_calendar.date === rec.hearing_date ? 'The record copied a calendar edit. The office never approved that date.' : 'The office moved the hearing after the record was last updated.', [L.schedule.source]);
    }

    // 2. who attends
    const cm = c.committed;
    const live = c.stage === 'upcoming' || c.stage === 'awaiting_outcome';
    if (live) {
      if (rec.consultant_id && !cm) {
        const said = L.commitments[rec.consultant_id];
        const why = !said ? 'never accepted in the evidence' : said.status === 'tentative' ? 'only said maybe' : said.status === 'declined' ? 'said they cannot attend this slot' : said.status === 'accepted' ? 'accepted a different date or time' : said.status === 'conditional' ? 'offered a different date only' : 'has not accepted';
        add('consultant', 'contradicted', name(rec.consultant_id), 'nobody committed', `${name(rec.consultant_id)} ${why}.`, [said && said.source]);
      } else if (rec.consultant_id && cm && cm.id !== rec.consultant_id) add('consultant', 'contradicted', name(rec.consultant_id), name(cm.id), 'A different consultant holds the commitment.', [cm.source]);
      else if (!rec.consultant_id && !cm) add('consultant', 'missing', 'blank', 'nobody committed', 'The record is blank and nobody has accepted. The record is honest but the hearing is uncovered.');
      else if (!rec.consultant_id && cm) add('consultant', 'contradicted', 'blank', name(cm.id), 'A consultant accepted but the record is blank.', [cm.source]);
    }

    // 3. status
    if (rec.status === 'canceled' && !L.withdrawn) add('status', 'contradicted', 'canceled', 'still on the office schedule', 'The firm marked it canceled when it sent the withdrawal. The office has not processed it and still lists the hearing.', [L.obligations.map((o) => o.source)[0]]);
    if (rec.status === 'awaiting_reschedule' && L.noFurtherHearing) add('status', 'contradicted', 'awaiting reschedule', 'no further hearing; a statement is due', 'The office says no further hearing is scheduled. What is open is a deadline, which the record does not show.', L.obligations.map((o) => o.source));
    if (rec.status === 'hearing_scheduled' && c.stage === 'awaiting_outcome') add('status', 'unverified', 'hearing scheduled', 'hearing time has passed', 'No outcome is recorded.');

    // 4. things the record has no field for
    if (live && c.gates.G3.status !== 'closed') add('representative on the office record', 'missing', 'no field', c.gates.G3.text, 'The record cannot show whether the office has the representative.', c.gates.G3.evidence);
    const open = L.obligations.filter((o) => o.status !== 'cleared');
    for (const o of open) add('open obligation', 'missing', 'no field', `${o.kind.replace('_', ' ')}: ${o.status.replace('_', ' ')}${o.deadline ? ', due ' + o.deadline.replace('T', ' ') : ''}`, 'The record has no place for obligations or deadlines.', [o.source]);

    // 5. packet reference
    const refVersion = (String(rec.packet_reference).match(/-v(\d+)\./) || [])[1];
    if (refVersion && L.packet.current && `v${refVersion}` !== L.packet.current) add('packet', 'contradicted', `v${refVersion}`, L.packet.current, 'The record links to an old packet version.', [L.packet.versionIssue && L.packet.versionIssue.source]);

    const hard = findings.filter((f) => f.verdict === 'contradicted');
    const verdict = hard.length ? 'contradicted' : findings.some((f) => f.field === 'consultant' && f.verdict === 'missing') ? 'missing' : findings.some((f) => f.verdict === 'unverified') ? 'unverified' : findings.length ? 'incomplete' : 'clean';
    return { caseId: c.id, property: rec.property, recordStatus: STATUS_WORDS[rec.status] || rec.status, readiness: c.readiness, stage: c.stage, verdict, findings };
  });
  const count = (v) => rows.filter((r) => r.verdict === v).length;
  const noAttendee = view.cases.filter((c) => (c.stage === 'upcoming' || c.stage === 'awaiting_outcome') && !c.committed).map((c) => c.id);
  return {
    rows,
    summary: { cases: rows.length, contradicted: count('contradicted'), missing: count('missing'), unverified: count('unverified'), incomplete: count('incomplete'), clean: count('clean'), noAttendee,
      contradictedFields: rows.reduce((n, r) => n + r.findings.filter((f) => f.verdict === 'contradicted').length, 0) },
  };
}
