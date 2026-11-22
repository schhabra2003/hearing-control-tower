// DERIVE: turn ledger state plus the clock into gates, readiness and issues. Pure functions.
// Nothing is stored here: after any event the same inputs give the same answer, which is what
// makes duplicates, reordering and restarts harmless.

import { toTs, fmtSlot, fmtWhen, fmtDate, lastOpenBefore, HOURS } from './time.js';
import { tidy } from './text.js';

export const hearingStart = (c, pb) => (c.schedule && c.schedule.date && c.schedule.time ? toTs(c.schedule.date, c.schedule.time, pb.office.tz) : null);

// The consultant with a valid commitment to the *current official slot*, if any.
export function committedConsultant(c) {
  const s = c.schedule;
  if (!s || !s.date) return null;
  let best = null;
  for (const [id, cm] of Object.entries(c.commitments)) {
    const sameSlot = cm.slot && cm.slot.date === s.date && (!cm.slot.time || !s.time || cm.slot.time === s.time);
    if (cm.status === 'accepted' && sameSlot) { if (!best || cm.at > best.at) best = { id, via: 'accepted', source: cm.source, at: cm.at }; continue; }
    const declinedHere = cm.status === 'declined' && sameSlot;
    const belief = c.beliefs[id];
    // "I could do June 18 if it moves" + the government moves it to June 18 + the consultant then
    // puts June 18 in their calendar = a commitment to the new slot.
    if (!declinedHere && cm.conditionalDate === s.date && belief && belief.date === s.date && belief.at >= (s.at || 0)) {
      if (!best || belief.at > best.at) best = { id, via: 'condition', source: belief.source, at: belief.at };
    }
  }
  return best;
}

const G = (status, text, extra = {}) => ({ status, text, evidence: [], ...extra });
const DUE_SOON = 48 * HOURS;

export function deriveCase(c, env) {
  const { now, pb, dir, drift } = env;
  const name = (id) => (dir.consultantById[id] ? dir.consultantById[id].first : id);
  const start = hearingStart(c, pb);
  const end = start ? start + pb.hearing_minutes * 60e3 : null;
  const cm = committedConsultant(c);
  const issues = [];
  const issue = (code, severity, title, detail, evidence = [], extra = {}) =>
    issues.push({ key: `${code}:${c.id}${extra.sub ? ':' + extra.sub : ''}`, code, caseId: c.id, severity, title, detail, evidence: evidence.filter(Boolean), ...extra });

  // ---- stage
  let stage = 'unscheduled';
  if (c.withdrawn) stage = 'withdrawn';
  else if (c.outcome) stage = 'post_hearing';
  else if (start && now >= end) stage = 'awaiting_outcome';
  else if (start) stage = 'upcoming';

  // Deadlines. Anything that needs the office is pulled back to the last moment the office is
  // open: "48 hours before a Monday 9 a.m. hearing" is Saturday morning, so the real deadline
  // is Friday at closing time.
  const rule = {
    G2: start ? start - pb.deadlines.consultant_hours_before * HOURS : null,
    G3: c.repRequest && c.repRequest.deadline ? toTs(c.repRequest.deadline.slice(0, 10), c.repRequest.deadline.slice(11), pb.office.tz) : start ? start - pb.deadlines.rep_hours_before * HOURS : null,
    G4: start ? start - pb.packet.lead_hours * HOURS : null,
  };
  const due = { G2: rule.G2, G3: rule.G3 === null ? null : lastOpenBefore(pb, rule.G3), G4: rule.G4 === null ? null : lastOpenBefore(pb, rule.G4) };
  const pulled = (g) => (due[g] !== null && due[g] !== rule[g] ? ` The rule gives ${fmtWhen(rule[g], pb.office.tz)}, when the office is closed, so the working deadline is ${fmtWhen(due[g], pb.office.tz)}.` : '');
  const overdue = (g) => due[g] !== null && now > due[g];

  // ---- G1 official schedule
  let G1;
  if (!c.schedule) {
    G1 = c.postponed ? G('waiting', `The office took the hearing off the calendar (message ${c.postponed.source}). It was ${fmtSlot(c.postponed.previous)}. No new date yet.`, { evidence: [c.postponed.source] }) : G('waiting', 'No official date yet.');
  } else if (c.provisionalOff) {
    G1 = G('problem', `Official: ${fmtSlot(c.schedule)}. The clerk said by phone that the hearing is off. Not in writing yet.`, { evidence: [c.schedule.source, c.provisionalOff.source] });
    issue('VERBAL_OFF', 'problem', 'Postponement reported by phone only', `Treat ${fmtSlot(c.schedule)} as official. The consultant stays booked until the office confirms in writing.`, [c.provisionalOff.source]);
  } else if (c.provisional) {
    G1 = G('problem', `Official: ${fmtSlot(c.schedule)}. The clerk said by phone it moves to ${fmtSlot(c.provisional)}. Not in writing yet.`, { evidence: [c.schedule.source, c.provisional.source] });
    issue('VERBAL_CHANGE', 'problem', 'Schedule change reported by phone only', `Treat ${fmtSlot(c.schedule)} as official and ${fmtSlot(c.provisional)} as likely. Ask for written notice and pre-check the consultant for the new slot.`, [c.provisional.source]);
  } else {
    const bits = [fmtSlot(c.schedule), c.schedule.mode === 'video' ? 'video' : c.schedule.mode === 'in_person' ? 'in person' : null, c.schedule.room ? `room ${c.schedule.room}` : null].filter(Boolean);
    G1 = G('closed', bits.join(', ') + '.' + (c.schedule.timeCarried ? ' The office gave the new date without a time, so the earlier time is kept.' : ''), { evidence: [c.schedule.source, c.schedule.roomSource] });
  }
  if (c.change && (c.change.status === 'requested' || c.change.status === 'pending') && stage === 'upcoming') {
    issue('CHANGE_PENDING', 'info', 'Date-change request not answered', `Requested ${fmtSlot({ date: c.change.date })}. Until the government approves, the hearing stays ${fmtSlot(c.schedule)}. Keep it staffed.`, [c.change.source]);
  }
  if (c.homeownerChange && !c.homeownerChange.acknowledged) {
    issue('HOMEOWNER_CHANGE', 'problem', c.homeownerChange.kind === 'withdrawal' ? 'Homeowner asked the county to withdraw' : 'Homeowner asked the county to move the hearing',
      `${c.homeowner} went to the county directly. Confirm with them, and ask them to route changes through the firm.`, [c.homeownerChange.source]);
  }
  if (c.moveDisputed && !c.moveDisputed.settledBy) {
    issue('MOVE_DISPUTED', 'problem', 'Homeowner says they did not ask to move the hearing', `${c.homeowner} told the firm they did not ask for the new date. The official date stands until the office says otherwise in writing.`, [c.moveDisputed.source]);
  }
  const unwanted = c.withdrawn && c.homeownerChange && c.homeownerChange.answer === 'declined';
  if (unwanted) issue('WITHDRAWN_UNWANTED', 'problem', 'Withdrawal processed against the homeowner\'s wishes', `${c.homeowner} told the firm they did not want to withdraw, but the office processed it. A person must call the office about reinstating the appeal.`, [c.withdrawnSource, c.homeownerChange.answerSource]);

  // ---- G2 consultant committed to this slot
  let G2;
  const entries = Object.entries(c.commitments).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.at - a.at);
  const s = c.schedule;
  const onSlot = (e) => e.slot && s && e.slot.date === s.date && (!e.slot.time || !s.time || e.slot.time === s.time);
  // An offer nobody answered by its reply-by time no longer holds the slot: the next person is asked.
  const openOffer = c.offers.filter((o) => o.status === 'sent' && (!o.replyBy || now <= o.replyBy) && (!o.slot || !s || (o.slot.date === s.date && o.slot.time === s.time)));
  const silentOffer = c.offers.filter((o) => o.status === 'sent' && o.replyBy && now > o.replyBy && s && o.slot && o.slot.date === s.date && o.slot.time === s.time);
  if (stage === 'upcoming' || stage === 'awaiting_outcome' || stage === 'unscheduled') {
    if (cm) {
      G2 = G('closed', cm.via === 'accepted' ? `${name(cm.id)} accepted this slot.` : `${name(cm.id)} offered ${fmtDate(s.date)} and has it in the calendar.`, { evidence: [cm.source] });
    } else {
      const offered = entries.find((e) => e.status === 'offered' && onSlot(e));
      const stale = entries.find((e) => e.status === 'accepted' && !onSlot(e));
      const condMet = entries.find((e) => s && e.conditionalDate === s.date && !(e.status === 'declined' && onSlot(e)));
      const declined = entries.filter((e) => e.status === 'declined' && onSlot(e));
      const tentative = entries.find((e) => e.status === 'tentative');
      const unusable = entries.filter((e) => e.status === 'unusable' && onSlot(e));
      // The office has someone recorded whom the firm has no word from. Somebody arranged that,
      // so that person is asked first. Offering the hearing to others would risk two people turning up.
      const recorded = c.rep && !entries.some((e) => e.id === c.rep.consultant && (e.status === 'tentative' || (['declined', 'unusable'].includes(e.status) && onSlot(e)))) ? c.rep.consultant : null;
      const noUse = unusable.length ? ` ${unusable.map((e) => `${name(e.id)} said yes, but ${e.text}.`).join(' ')}` : '';
      const ev = entries.map((e) => e.source);
      let sub, text, sev = 'problem', who = null, oldSlot = null;
      if (offered) { sub = 'offered'; who = offered.id; text = `${name(offered.id)} volunteered to cover. Not confirmed yet.`; }
      else if (stale) { sub = 'stale'; who = stale.id; oldSlot = stale.slot; text = `${name(stale.id)} accepted ${fmtSlot(stale.slot)}. The hearing is now ${fmtSlot(s)}. Not reconfirmed.`; }
      else if (condMet) { sub = 'condition'; who = condMet.id; text = `${name(condMet.id)} said ${fmtDate(s.date)} would work. Needs a yes for the new slot.`; }
      else if (openOffer.length) { sub = 'offer_out'; who = openOffer.map((o) => o.consultant); sev = overdue('G2') ? 'problem' : 'waiting'; text = `Offer sent to ${openOffer.map((o) => name(o.consultant)).join(', ')}. No reply yet.`; }
      else if (silentOffer.length) { sub = 'no_answer'; who = silentOffer.map((o) => o.consultant); text = `${silentOffer.map((o) => name(o.consultant)).join(', ')} did not answer the offer in time.${declined.length ? ` ${declined.map((e) => name(e.id)).join(', ')} cannot attend.` : ''} No one is committed.`; }
      else if (recorded) { sub = 'recorded'; who = recorded; sev = overdue('G2') ? 'problem' : 'waiting'; text = `${c.county} has ${name(recorded)} recorded as representative (message ${c.rep.source}), but the firm has no yes from ${name(recorded)}. ${name(recorded)} is asked before anyone else.`; }
      else if (unusable.length) { sub = 'unusable'; who = unusable.map((e) => e.id); text = `${noUse.trim()}${declined.length ? ` ${declined.map((e) => name(e.id)).join(', ')} cannot attend.` : ''} No one is committed.`; }
      else if (declined.length) { sub = 'declined'; text = `${declined.map((e) => name(e.id)).join(', ')} cannot attend. No one is committed.`; }
      else if (tentative) { sub = 'tentative'; who = tentative.id; sev = overdue('G2') ? 'problem' : 'waiting'; text = `${name(tentative.id)} is tentative. A maybe is not a commitment.`; }
      else { sub = 'none'; sev = overdue('G2') ? 'problem' : 'waiting'; text = 'No consultant has accepted.'; }
      G2 = G(sev, text, { evidence: ev, sub, who, oldSlot, overdue: overdue('G2') });
      if (stage === 'upcoming') issue('UNCOVERED', sev, 'No consultant committed to this slot', text, ev, { due: due.G2, variant: sub });
    }
  } else G2 = G('na', '');

  // a second yes for a hearing that someone already holds
  if (s && cm && stage === 'upcoming') {
    for (const [id, v] of Object.entries(c.commitments)) {
      if (v.status !== 'surplus' || v.released || !onSlot(v)) continue;
      issue('SURPLUS_YES', 'waiting', `${name(id)} said yes to a hearing that is already covered`, `${name(cm.id)} accepted first. ${name(id)} must be told to stand down, and stays first in line if ${name(cm.id)} drops out.`, [v.source], { sub: id, who: id });
    }
  }

  // beliefs that disagree with the official date
  if (s && stage === 'upcoming') {
    for (const [who, b] of Object.entries(c.beliefs)) {
      if (!b.date || b.date === s.date) continue;
      const told = c.notified[who === 'shared_calendar' ? 'shared_calendar' : who];
      if (told && told.at > b.at) continue;
      const label = who === 'shared_calendar' ? 'The shared calendar' : `${name(who)}'s calendar`;
      issue('BELIEF_MISMATCH', 'problem', 'A calendar disagrees with the official date', `${label} shows ${fmtDate(b.date)}. The official date is ${fmtDate(s.date)}.`, [b.source, s.source], { sub: who, who });
    }
  }

  // details that changed after the consultant committed and that nobody has passed on
  if (s && cm && stage === 'upcoming') {
    const since = Math.max(cm.at, c.notified[cm.id] ? c.notified[cm.id].at : 0);
    const news = [];
    if (s.roomAt && s.roomAt > since && c.roomKnown[cm.id] !== s.room) news.push({ text: `the room is now ${s.room} (message ${s.roomSource}).`, source: s.roomSource });
    for (const ins of c.instructions) if (ins.at > since) news.push({ text: `the office says: "${ins.text}" (message ${ins.source}).`, source: ins.source });
    if (news.length) issue('DETAIL_UPDATE', 'waiting', `${name(cm.id)} has not been told about a change`, news.map((n) => n.text).join(' '), news.map((n) => n.source), { who: cm.id, news: news.map((n) => n.text) });
  }

  // ---- G3 representative recorded by the government
  let G3;
  if (stage === 'upcoming' || stage === 'awaiting_outcome' || stage === 'unscheduled') {
    const pendingDrift = drift && drift.status === 'proposed';
    const nf = c.files && c.files.notice;
    const sentForCm = c.repSubmission && cm && c.repSubmission.consultant === cm.id && c.repSubmission.at > (c.rep ? c.rep.at : 0) && (!c.repMissing || c.repMissing.at < c.repSubmission.at);
    if (c.rep && cm && cm.id === c.rep.consultant) G3 = G('closed', `${c.county} has ${name(c.rep.consultant)} recorded.`, { evidence: [c.rep.source] });
    else if (c.repProvisional && cm && c.repProvisional.consultant === cm.id && c.repProvisional.at > (c.rep ? c.rep.at : 0)) G3 = G('waiting', `Confirmed by phone only (${name(c.repProvisional.consultant)}). Ask for it in writing.`, { evidence: [c.repProvisional.source], sub: 'phone' });
    else if (c.rep && sentForCm) G3 = G(overdue('G3') ? 'problem' : 'waiting', `Replacement naming ${name(cm.id)} sent. ${c.county} still has ${name(c.rep.consultant)} until it acknowledges.`, { evidence: [c.repSubmission.source], sub: 'submitted' });
    else if (c.rep && cm) { G3 = G('problem', `${c.county} has ${name(c.rep.consultant)} recorded, but ${name(cm.id)} is attending.`, { evidence: [c.rep.source, cm.source], sub: 'mismatch' }); }
    else if (c.rep && G2.sub === 'recorded') { G3 = G('waiting', `${c.county} has ${name(c.rep.consultant)} recorded. The firm is waiting for ${name(c.rep.consultant)}'s own yes.`, { evidence: [c.rep.source], sub: 'orphan_pending' }); }
    else if (c.rep) { G3 = G('problem', `${c.county} has ${name(c.rep.consultant)} recorded, but ${name(c.rep.consultant)} is not committed to this slot.`, { evidence: [c.rep.source], sub: 'orphan' }); }
    // The notice that is out names someone who is no longer the one attending. It must not be
    // waited on: the office would record the wrong person.
    else if (c.repSubmission && c.repSubmission.consultant && (!c.repMissing || c.repMissing.at < c.repSubmission.at) && (!cm || cm.id !== c.repSubmission.consultant)) {
      G3 = G('problem', cm ? `The notice sent to ${c.county} names ${name(c.repSubmission.consultant)}, but ${name(cm.id)} is attending. The office has not answered it yet.` : `The notice sent to ${c.county} names ${name(c.repSubmission.consultant)}, who is no longer attending. A new notice goes out as soon as someone has accepted.`, { evidence: [c.repSubmission.source, cm && cm.source], sub: 'outdated', was: c.repSubmission.consultant });
    }
    else if (c.repSubmission && (!c.repMissing || c.repMissing.at < c.repSubmission.at)) G3 = G(overdue('G3') ? 'problem' : 'waiting', 'Staffing details sent. No acknowledgment yet.', { evidence: [c.repSubmission.source], sub: 'submitted' });
    else if (c.repMissing) G3 = G('problem', c.repSubmission ? 'Sent, but the office cannot find or confirm it.' : `${c.county} says no representative is recorded.`, { evidence: [c.repMissing.source, c.repSubmission && c.repSubmission.source], sub: c.repSubmission ? 'lost' : 'missing' });
    else if (nf && nf.status === 'recorded' && cm && nf.representative === cm.id) G3 = G(overdue('G3') ? 'problem' : 'waiting', `The firm's own file marks the notice naming ${name(cm.id)} as recorded. No message from ${c.county} confirms it.`, { evidence: [], sub: 'file_only', file: nf.name });
    else G3 = G(overdue('G3') || (c.repRequest && c.repRequest.asks > 1) ? 'problem' : 'waiting', c.repRequest ? 'The office asked who will attend. Nothing sent yet.' : 'Not sent yet.', { evidence: [c.repRequest && c.repRequest.source], sub: 'unsent' });
    if (G3.status !== 'closed' && stage === 'upcoming' && G3.sub !== 'orphan_pending') {
      const dl = c.repRequest && c.repRequest.deadline ? ` Office deadline: ${fmtWhen(due.G3, pb.office.tz)}.` : '';
      issue(G3.sub === 'mismatch' || G3.sub === 'orphan' ? 'REP_MISMATCH' : 'REP_NOT_RECORDED', G3.status, G3.sub === 'mismatch' || G3.sub === 'orphan' ? 'The office has the wrong representative' : 'Representative not recorded by the office', G3.text + dl + pulled('G3'), G3.evidence, { due: due.G3, variant: G3.sub });
      if (pendingDrift) issue('PLAYBOOK_DRIFT', 'problem', `${c.county} changed its process`, 'The office described a staffing process that differs from the saved playbook. Review the proposed change before sending anything else.', [drift.source]);
    }
    // The firm's own paperwork, checked against the evidence.
    if (nf && stage === 'upcoming') {
      if (nf.status === 'not_submitted' && nf.representative && (!cm || cm.id !== nf.representative)) {
        const said = c.commitments[nf.representative];
        const why = said && said.status === 'declined' ? 'declined this hearing' : said && said.status === 'tentative' ? 'only said maybe' : 'has not accepted this hearing';
        issue('DRAFT_NOTICE_WRONG', 'problem', 'The draft staffing notice names the wrong person', `${nf.name} names ${name(nf.representative)}, who ${why}. Sending it would put the wrong name on the office's record. Notices are generated from the evidence when someone accepts, so this draft is never sent.`, [said && said.source], { sub: 'notice', file: nf.name });
      }
      if (nf.missing && nf.missing.length) issue('DOC_FIELD_MISSING', 'info', 'A staffing notice on file is incomplete', `${nf.name} has no ${nf.missing.map((m) => `"${m[0].toUpperCase() + m.slice(1)}"`).join(', ')} line. Generated notices always carry every required field.`, [], { sub: 'notice_fields', file: nf.name });
    }
  } else G3 = G('na', '');

  // ---- G4 current packet with the clerk and the consultant
  let G4;
  if (stage === 'upcoming' || stage === 'awaiting_outcome' || stage === 'unscheduled') {
    const vi = c.packet.versionIssue;
    const clerk = c.packet.clerk;
    // What counts as proof is a county setting. Default: the clerk's own receipt.
    const sentOnTime = clerk.status === 'sent' && clerk.at <= rule.G4 && pb.packet.clerk_evidence === 'sent_on_time';
    const clerkOk = clerk.status === 'received' || sentOnTime;
    const r = cm ? c.packet.cons[cm.id] : null;
    const consOk = !!r && r.status === 'received' && (!vi || r.at > vi.at);
    const parts = [], ev = [clerk.source, r && r.source, vi && vi.source];
    let status = 'waiting';
    if (sentOnTime) parts.push('Sent to the clerk on time. This office does not send receipts.');
    else if (clerkOk) parts.push('Clerk has it.');
    else if (clerk.status === 'unreadable') { parts.push('Clerk could not read the file.'); status = 'problem'; }
    else if (clerk.status === 'sent') parts.push('Sent to the clerk, no receipt.');
    else parts.push('Not sent to the clerk.');
    if (!cm) parts.push('No committed consultant to send it to.');
    else if (consOk) parts.push(`${name(cm.id)} has ${c.packet.current || 'it'}.`);
    else if (vi) { parts.push(`${name(cm.id)}'s link points to an old version.`); status = 'problem'; }
    else if (r && r.status === 'unreadable') { parts.push(`${name(cm.id)} could not read the file.`); status = 'problem'; }
    else if (r && r.status === 'sent') parts.push(`Sent to ${name(cm.id)}, no receipt.`);
    else parts.push(`${name(cm.id)} has not confirmed receipt.`);
    if (clerkOk && consOk) status = 'closed';
    else if (overdue('G4')) { status = 'problem'; parts.push(now > rule.G4 ? `Past the ${pb.packet.lead_hours}-hour mark: late material needs clerk confirmation.` : `The ${pb.packet.lead_hours}-hour mark falls when the office is closed, so its last open hour has passed.`); }
    const consStatus = !cm ? 'no_consultant' : consOk ? 'received' : vi ? 'stale' : r ? r.status : 'none';
    G4 = G(status, parts.join(' '), { evidence: ev, clerkOk, consOk, clerkStatus: clerk.status, consStatus, clerkAt: clerk.at, consAt: r && r.at });
    if (status !== 'closed' && stage === 'upcoming') {
      if (!clerkOk) issue('PACKET_CLERK', clerk.status === 'unreadable' || overdue('G4') ? 'problem' : 'waiting', 'Clerk does not have a readable current packet', parts[0], [clerk.source], { due: due.G4, variant: clerk.status });
      if (cm && !consOk) issue('PACKET_CONSULTANT', vi || (r && r.status === 'unreadable') || overdue('G4') ? 'problem' : 'waiting', 'Consultant does not have the current packet', parts[1], [r && r.source, vi && vi.source], { due: due.G4, variant: vi ? 'stale' : r ? r.status : 'none' });
    }
  } else G4 = G('na', '');

  // ---- G5 obligations
  let G5;
  const open = c.obligations.filter((o) => o.status !== 'cleared');
  if (!open.length) G5 = G(c.obligations.length ? 'closed' : 'na', c.obligations.length ? 'All obligations cleared by the government.' : 'None.', { evidence: c.obligations.map((o) => o.history[o.history.length - 1].source) });
  else {
    let worst = 'waiting';
    const texts = [];
    open.forEach((o, i) => {
      const stated = o.deadline ? toTs(o.deadline.slice(0, 10), o.deadline.slice(11), pb.office.tz) : null;
      const dl = stated === null ? null : lastOpenBefore(pb, stated);     // a Saturday deadline really means Friday at closing
      const label = { settlement: 'Settlement', withdrawal: 'Withdrawal', homeowner_statement: 'Homeowner statement' }[o.kind] || o.kind;
      const st = {
        open: 'not sent', awaiting_signature: `waits for ${o.signer ? name(o.signer) + "'s" : 'a'} signature`, signature_requested: `signature requested from ${o.signer ? name(o.signer) : 'the signer'}`,
        signed: `signed by ${o.signer ? name(o.signer) : 'the consultant'}, not yet sent to the office`,
        rejected: 'rejected by the office', unreadable: o.copyRequested ? 'copy is unreadable, clearer copy requested' : 'copy is unreadable', submitted: 'sent, not processed by the office',
        needs_confirmation: 'needs the firm to confirm with the homeowner', confirmed: 'homeowner confirmed, not yet sent to the office',
        disputed: 'the homeowner does not want it, and the office has not been told', dispute_sent: 'the office was told not to process it, and has not confirmed',
      }[o.status] || o.status;
      const urgent = dl !== null && dl - now <= DUE_SOON;
      const sev = ['rejected', 'unreadable', 'needs_confirmation', 'disputed', 'dispute_sent'].includes(o.status) || urgent || o.reminders > 0 ? 'problem' : 'waiting';
      if (sev === 'problem') worst = 'problem';
      const moved = dl !== null && dl !== stated;
      const t = `${label}: ${st}${dl ? ` (due ${fmtWhen(stated, pb.office.tz)}${moved ? `, a day the office is closed, so it must arrive by ${fmtWhen(dl, pb.office.tz)}` : ''})` : ''}.`;
      texts.push(t);
      issue('OBLIGATION', sev, `${label}: ${st}`, t + (o.reminders ? ` The office has asked ${o.reminders + 1} times.` : ''), o.history.map((h) => h.source).concat([o.source]), { sub: `${o.kind}${i}`, due: dl, stated, kind: o.kind, obStatus: o.status, signer: o.signer });
    });
    G5 = G(worst, texts.join(' '), { evidence: open.map((o) => o.source) });
  }

  // ---- questions, leads, outcome
  for (const q of c.questions) if (!q.answered) issue('QUESTION', 'problem', `${name(q.consultant)} is waiting for an answer`, `"${q.text}"`, [q.source], { sub: `${q.consultant}:${q.source}`, who: q.consultant });
  for (const l of c.leads) {
    if (!l.open) continue;
    if (l.hedged) issue('UNVERIFIED_LEAD', 'info', 'The office mentioned a change without stating it', `"${l.text}" This confirms nothing. The record stays as it is and the office is asked for a plain answer.`, [l.source], { sub: `${l.source}:${l.type}` });
    else issue('UNVERIFIED_LEAD', 'info', 'Statement from a party with no authority', `"${l.text}" Verify with the authoritative source before acting.`, [l.source], { sub: `${l.source}:${l.type}` });
  }
  if (stage === 'awaiting_outcome') issue('OUTCOME_MISSING', 'problem', 'Hearing time has passed with no outcome report', cm ? `Ask ${name(cm.id)} what happened.` : 'No consultant was confirmed for this slot. Find out whether anyone attended.', [], { who: cm && cm.id });

  // A hearing the office took off the calendar has nothing to staff, record or send until a new
  // date exists. It is neither ready nor at risk: it waits for the office.
  if (!c.schedule && c.postponed) {
    G2 = G('na', 'Nothing to staff until the office sets a new date.');
    G3 = G('na', 'Nothing to record until the office sets a new date.');
    G4 = G('na', '');
    const keep = ['HOMEOWNER_CHANGE', 'MOVE_DISPUTED', 'OBLIGATION', 'QUESTION', 'UNVERIFIED_LEAD'];
    for (let i = issues.length - 1; i >= 0; i -= 1) if (!keep.includes(issues[i].code)) issues.splice(i, 1);
    issue('POSTPONED', 'waiting', 'Postponed by the office, no new date yet', `It was ${fmtSlot(c.postponed.previous)}. Everyone who was booked or asked is told. Staffing starts again when the office sets a date.`, [c.postponed.source]);
  }

  // ---- readiness
  const gates = { G1, G2, G3, G4, G5 };
  let readiness;
  if (stage === 'withdrawn') readiness = unwanted ? 'at_risk' : 'closed';
  else if (stage === 'post_hearing') readiness = G5.status === 'problem' ? 'at_risk' : c.decisionPending || G5.status === 'waiting' ? 'post' : 'post';
  else if (stage === 'awaiting_outcome') readiness = 'past';
  else {
    const st = [G1, G2, G3, G4, G5].map((g) => g.status);
    readiness = st.includes('problem') ? 'at_risk' : st.every((x) => x === 'closed' || x === 'na') ? 'ready' : 'in_progress';
  }
  // hard gates for "someone will be in the room": G1-G3
  const covered = G1.status === 'closed' && G2.status === 'closed';
  for (const g of Object.values(gates)) g.text = tidy(g.text);
  for (const i of issues) { i.title = tidy(i.title); i.detail = tidy(i.detail); }
  return { id: c.id, stage, start, end, due, rule, committed: cm, gates, readiness, covered, issues };
}
