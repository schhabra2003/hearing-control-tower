// The evidence ledger: per-case state that is built only from verified claims.
// Nothing here trusts the firm's old case records. Each reducer applies one claim to one case
// and returns a short description of what changed, for the audit trail.

import { fmtSlot } from './time.js';
import { indexDocuments } from './documents.js';
import { committedConsultant } from './derive.js';
import { whyUnusable } from './staffing.js';
import { SCHEDULE_CLAIMS } from './model.js';

export function newCaseState(rec, currentVersion) {
  return {
    id: rec.case_id, property: rec.property, county: rec.county, state: rec.state, homeowner: rec.homeowner,
    schedule: null,          // official: { date, time, mode, room, source, at }
    scheduleHistory: [],
    provisional: null,       // change stated by phone, not yet in writing
    provisionalOff: null,    // "the hearing is off", stated by phone only
    postponed: null,         // the office took the hearing off the calendar: { previous, source, at }
    change: null,            // a change request: { status: requested|pending|denied, date, by, source }
    homeownerChange: null,   // the homeowner went to the county directly
    beliefs: {},             // who believes which date (calendar edits). Never authoritative.
    commitments: {},         // consultantId -> { status, slot, conditionalDate, source, at }
    offers: [],              // offers sent by the firm: { consultant, at, status }
    asks: {},                // the open yes/no question to a consultant: { at, source, n, kind, slot, answered }. n is the line in the numbered list they were sent.
    rep: null,               // representative the government has recorded
    repProvisional: null,
    repMissing: null,        // latest "no representative recorded" from the government
    repRequest: null,        // government asked who attends: { deadline, asks, source }
    repSubmission: null,     // what the firm sent: { consultant, kind, source, at }
    packet: { current: currentVersion, clerk: { status: 'none' }, cons: {}, versionIssue: null },
    obligations: [],         // { kind, status, signer, deadline, reminders, source, at }
    questions: [],
    leads: [],               // statements from parties with no authority; to verify
    notified: {},            // consultantId -> last time the firm sent them the official facts
    waits: {},               // action key -> { at, n }: reminders sent while waiting for an answer
    instructions: [],        // practical instructions from the office that the attendee must know
    roomKnown: {},           // consultantId -> room they have shown they know
    outcome: null,
    decisionPending: false,
    noFurtherHearing: false,
    withdrawn: false,
    notes: [],
    files: { notice: null, packets: [] },   // the firm's own paperwork for this case (beliefs, not evidence)
    evidence: [],            // audit trail: { msgId, at, type, disposition, text }
  };
}

export function createState(dir, packet) {
  const current = {};
  for (const d of packet.documents || []) {
    if (d.kind === 'packet' && d.case_id) current[d.case_id] = Math.max(current[d.case_id] || 0, +d.version || 0);
  }
  const cases = {};
  const docs = indexDocuments(packet, dir);
  for (const rec of dir.cases) {
    cases[rec.case_id] = newCaseState(rec, current[rec.case_id] ? `v${current[rec.case_id]}` : null);
    if (docs.byCase[rec.case_id]) cases[rec.case_id].files = docs.byCase[rec.case_id];
  }
  return { cases, availability: [], unavailable: [], drift: {}, messages: [], outbox: [], triage: {}, seq: 0, docFindings: docs.findings };
}

const OB_OPEN = (o) => o.status !== 'cleared';
const SCHEDULE_TYPES = ['hearing_scheduled', 'hearing_confirmed', 'schedule_changed'];
// A statement about the schedule that only repeats the official record leaves nothing to verify.
const agreesWithRecord = (c, claim) => !!c.schedule && SCHEDULE_TYPES.includes(claim.type)
  && (claim.date ? claim.date === c.schedule.date : claim.type === 'hearing_confirmed')
  && (!claim.time || claim.time === c.schedule.time);
// A plain statement from the office about the schedule settles every open lead about it.
const settleLeads = (c, msg) => { for (const l of c.leads) if (l.open && SCHEDULE_CLAIMS.includes(l.type)) { l.open = false; l.settledBy = msg.id; } };
const settled = (fx, text) => { fx.push(text); fx.settled = true; return fx; };
function obligation(c, kind, msg, create = true) {
  let o = [...c.obligations].reverse().find((x) => x.kind === kind && OB_OPEN(x));
  if (!o && create) {
    o = { kind, status: 'open', signer: null, deadline: null, reminders: 0, source: msg.id, at: msg.ts, history: [] };
    c.obligations.push(o);
  }
  return o;
}
const setOb = (o, status, msg, note) => { o.status = status; o.history.push({ status, source: msg.id, at: msg.ts, note }); };

function setSchedule(c, msg, f, kind) {
  const prev = c.schedule;
  const next = {
    date: f.date || (prev && prev.date) || null,
    time: f.time || (prev && prev.time) || null,
    mode: f.mode || (prev && prev.mode) || null,
    room: f.room !== undefined ? f.room : prev ? prev.room : undefined,
    source: msg.id, at: msg.ts,
  };
  const moved = !prev || prev.date !== next.date || prev.time !== next.time;
  const roomChanged = !!prev && next.room !== prev.room;
  // A new date with no time: the earlier time is kept, and that is said out loud.
  const carried = !!prev && !f.time && !!prev.time && prev.date !== next.date;
  if (carried) next.timeCarried = true; else if (prev && prev.timeCarried && !f.time && !moved) next.timeCarried = true;
  if (!moved && !roomChanged) {
    // Same facts again (a reminder or a duplicate): nothing changes. Keep the first source.
    if (c.provisional || c.provisionalOff) { c.provisional = null; c.provisionalOff = null; return [`Written notice keeps ${fmtSlot(next)}. The phone report is dropped.`]; }
    return [];
  }
  if (!moved) { next.source = prev.source; next.at = prev.at; next.roomSource = msg.id; next.roomAt = msg.ts; }
  c.schedule = next;
  c.scheduleHistory.push({ date: next.date, time: next.time, room: next.room, mode: next.mode, kind, source: msg.id, at: msg.ts });
  if (c.provisional) c.provisional = null;
  c.provisionalOff = null;
  c.postponed = null;
  if (!prev) return [`Official schedule set: ${fmtSlot(next)}${next.room ? ', room ' + next.room : ''}.`];
  if (moved) return [`Official schedule moved from ${fmtSlot(prev)} to ${fmtSlot(next)}${next.room ? ', room ' + next.room : ''}.${carried ? ' The office gave no new time, so the earlier time is kept.' : ''}`];
  return [`Room is now ${next.room}.`];
}

// Apply one verified claim to one case. `d` is the disposition from verify.js.
export function applyClaim(state, dir, msg, claim, d, caseId, books = null) {
  const c = state.cases[caseId];
  const fx = [];
  const who = claim.consultant || msg.consultant || null;
  const name = (id) => (dir.consultantById[id] ? dir.consultantById[id].first : id);
  const slotNow = () => ({ date: claim.date || (c.schedule && c.schedule.date) || null, time: claim.time || (c.schedule && c.schedule.time) || null });
  // A yes the firm cannot use (wrong county for this consultant, or two hearings at once) is kept
  // and shown, but it never closes the consultant gate. The search for cover goes on.
  const cannotUse = (verb) => {
    const u = books && who ? whyUnusable(state, dir, books, caseId, who, slotNow()) : null;
    if (!u) return false;
    c.commitments[who] = { status: 'unusable', why: u.kind, text: u.text, with: u.with || null, slot: slotNow(), source: msg.id, at: msg.ts };
    for (const o of c.offers) if (o.consultant === who && o.status === 'sent') o.status = 'declined';
    if (c.asks[who] && msg.ts >= c.asks[who].at) c.asks[who].answered = msg.id;
    fx.push(`${name(who)} ${verb}, but the firm cannot use it: ${u.text}. Not a commitment. Someone else is asked.`);
    return true;
  };
  // A yes for another date is not a yes for this hearing. It is kept as "could attend then", and
  // whatever the consultant said about the official date stays as it was.
  const otherDate = () => {
    if (!claim.date || !c.schedule || !c.schedule.date || claim.date === c.schedule.date) return false;
    const prev = c.commitments[who];
    if (prev) { prev.conditionalDate = claim.date; prev.conditionalSource = msg.id; }
    else c.commitments[who] = { status: 'conditional', slot: null, conditionalDate: claim.date, conditionalSource: msg.id, source: msg.id, at: msg.ts };
    fx.push(`${name(who)} said yes for ${fmtSlot({ date: claim.date })}. The hearing is on ${fmtSlot({ date: c.schedule.date })}, so this is not a commitment to it.`);
    return true;
  };
  c.evidence.push({ msgId: msg.id, at: msg.ts, type: claim.type, disposition: d, quote: claim.quote });

  if (d === 'rejected' || d === 'note') { if (d === 'note') c.notes.push({ source: msg.id, at: msg.ts, text: claim.quote }); return fx; }
  if (d === 'signal') {
    if (agreesWithRecord(c, claim)) return settled(fx, 'Agrees with the official record. Nothing to verify.');
    c.leads.push({ type: claim.type, text: claim.quote, source: msg.id, at: msg.ts, open: true, fields: { date: claim.date, time: claim.time, consultant: claim.consultant } });
    fx.push('Kept as a lead to verify. No change to the record.');
    return fx;
  }
  // The right party said it, but not as a plain statement (see hedge.js). Nothing is confirmed.
  if (d === 'held') {
    if (msg.role === 'consultant' && who && (claim.type === 'consultant_accepted' || claim.type === 'coverage_offered')) {
      // A yes that is not a plain yes is a maybe: the consultant is asked for a yes or no.
      const prev = c.commitments[who];
      const holder = committedConsultant(c);
      if (holder && holder.id === who) {
        // ... unless they already hold this hearing. Then nothing is taken away on a guess: a person asks them.
        fx.push(`${name(who)} holds this hearing and now does not sound certain. Nothing was changed. A person asks ${name(who)}.`);
        fx.person = true;
      } else {
        if (!(prev && prev.source === msg.id)) c.commitments[who] = { status: 'tentative', slot: slotNow(), source: msg.id, at: msg.ts, hedged: claim.hedged || true };
        fx.push(`Not a plain yes from ${name(who)}. Recorded as a maybe, not as a commitment.`);
      }
    } else if (SCHEDULE_CLAIMS.includes(claim.type)) {
      if (agreesWithRecord(c, claim)) return settled(fx, 'Agrees with the official record. Nothing to verify.');
      c.leads.push({ type: claim.type, text: claim.quote, source: msg.id, at: msg.ts, open: true, hedged: claim.hedged || true, voice: msg.role === 'government' ? 'office' : 'phone', fields: { date: claim.date, time: claim.time } });
      fx.push('The schedule on record stays. The office is asked to say plainly whether anything has changed.');
    } else fx.push('Nothing is confirmed. What was open stays open, and its follow-up continues.');
    return fx;
  }

  switch (claim.type) {
    case 'hearing_scheduled':
    case 'hearing_confirmed':
    case 'schedule_changed': {
      if (claim.homeowner_initiated) {
        const h = c.homeownerChange;
        if (h && h.kind === 'reschedule' && !h.acknowledged) { h.source = msg.id; h.at = msg.ts; }      // the same request, now from a better source
        else c.homeownerChange = { kind: 'reschedule', source: msg.id, at: msg.ts, acknowledged: false };
      }
      if (d === 'fact' && c.moveDisputed && c.moveDisputed.sentAt && !c.moveDisputed.settledBy && msg.ts > c.moveDisputed.sentAt) c.moveDisputed.settledBy = msg.id;
      if (d === 'provisional') {
        const differs = claim.date && (!c.schedule || claim.date !== c.schedule.date || (claim.time && claim.time !== c.schedule.time));
        if (differs) {
          c.provisional = { date: claim.date, time: claim.time || null, room: claim.room, source: msg.id, at: msg.ts };
          fx.push(`Phone report: may move to ${fmtSlot(c.provisional)}. The official schedule stays ${fmtSlot(c.schedule)} until written notice arrives.`);
        }
        break;
      }
      if (claim.type === 'hearing_confirmed' && !claim.date && !claim.time && claim.room === undefined) {
        if (c.schedule) { fx.push('Government confirms the schedule is unchanged.'); settleLeads(c, msg); }
        break;
      }
      const kind = claim.type === 'hearing_scheduled' ? 'scheduled' : claim.type === 'schedule_changed' ? 'changed' : 'confirmed';
      const before = c.schedule ? { ...c.schedule } : null;
      const res = setSchedule(c, msg, { date: claim.date, time: claim.time, mode: claim.mode, room: claim.room }, kind);
      fx.push(...(res.length ? res : before ? ['Government confirms the schedule is unchanged.'] : []));
      settleLeads(c, msg);
      if (c.change && c.change.status !== 'denied' && c.schedule && c.change.date === c.schedule.date) c.change.status = 'approved';
      break;
    }
    case 'hearing_postponed': {
      if (!c.schedule) { fx.push('The office says the hearing is off the calendar. No date was set.'); break; }
      if (d === 'provisional') {
        c.provisionalOff = { source: msg.id, at: msg.ts };
        fx.push(`Phone report: the hearing may be off. The official schedule stays ${fmtSlot(c.schedule)} until written notice arrives.`);
        break;
      }
      const prev = c.schedule;
      c.postponed = { previous: { ...prev }, source: msg.id, at: msg.ts };
      c.schedule = null; c.provisional = null; c.provisionalOff = null;
      settleLeads(c, msg);
      fx.push(`The office took the hearing off the calendar. It was ${fmtSlot(prev)}. No new date yet.`);
      break;
    }
    case 'change_requested':
      c.change = { status: 'requested', date: claim.date || null, by: msg.role, source: msg.id, at: msg.ts };
      fx.push(`Change request filed${claim.date ? ' for ' + fmtSlot({ date: claim.date }) : ''}. The hearing does not move unless the government approves.`);
      break;
    case 'change_pending':
      c.change = { ...(c.change || { date: null, by: 'firm' }), status: 'pending', source: msg.id, at: msg.ts };
      fx.push('Change request is still under review. Plan for the current date.');
      break;
    case 'change_denied':
      // A denial never moves anything. The schedule is only ever set by a scheduled, changed or confirmed claim.
      c.change = { ...(c.change || { by: 'firm' }), status: 'denied', deniedAt: msg.ts, source: msg.id, at: msg.ts };
      fx.push(`Move denied. The hearing stays ${fmtSlot(c.schedule)}.`);
      if (msg.role === 'government' && msg.written) settleLeads(c, msg);
      break;
    case 'calendar_edited': {
      const key = msg.role === 'consultant' ? msg.consultant : claim.consultant || 'shared_calendar';
      c.beliefs[key] = { date: claim.date || null, source: msg.id, at: msg.ts };
      fx.push(`${key === 'shared_calendar' ? 'The shared calendar' : name(key) + "'s calendar"} shows ${fmtSlot({ date: claim.date })}. A calendar entry is not an official date.`);
      break;
    }
    case 'rep_requested':
      c.repRequest = {
        deadline: claim.deadline || (c.repRequest && c.repRequest.deadline) || null,
        asks: ((c.repRequest && c.repRequest.asks) || 0) + 1,
        first: (c.repRequest && c.repRequest.first) || msg.id, source: msg.id, at: msg.ts,
      };
      fx.push(`Government asks who will attend${claim.deadline ? ' (deadline ' + claim.deadline.replace('T', ' ') + ')' : ''}.`);
      break;
    case 'rep_recorded':
      if (!claim.consultant) break;
      if (d === 'provisional') { c.repProvisional = { consultant: claim.consultant, source: msg.id, at: msg.ts }; fx.push(`By phone: ${name(claim.consultant)} is recorded. Held until confirmed in writing.`); break; }
      if (!c.rep || c.rep.consultant !== claim.consultant) fx.push(`Government has ${name(claim.consultant)} recorded as representative.`);
      c.rep = { consultant: claim.consultant, source: c.rep && c.rep.consultant === claim.consultant ? c.rep.source : msg.id, at: msg.ts };
      c.repMissing = null; c.repProvisional = null;
      break;
    case 'rep_not_recorded':
      c.repMissing = { source: msg.id, at: msg.ts };
      c.rep = null;
      fx.push('Government says no representative is recorded.');
      break;
    case 'consultant_accepted': {
      const prev = c.commitments[who];
      if (otherDate() || cannotUse('said yes')) break;
      const holder = committedConsultant(c);
      if (holder && holder.id !== who) {
        // Someone else already holds this slot. First yes wins. The second yes is kept as a
        // standby, and that person is told so that two people do not turn up.
        c.commitments[who] = { status: 'surplus', slot: slotNow(), source: msg.id, at: msg.ts, holder: holder.id };
        for (const o of c.offers) if (o.consultant === who && o.status === 'sent') o.status = 'released';
        fx.push(`${name(who)} also said yes, but ${name(holder.id)} already holds this hearing. ${name(who)} is kept as a standby.`);
        break;
      }
      // A yes answers the question that was asked. If the office moved the hearing after the
      // question went out and the reply names no date, the yes is for the old time, not the new one.
      const q = c.asks[who];
      const moved = q && !q.answered && q.slot && c.schedule && msg.ts >= q.at && c.schedule.at > q.at && !claim.date && (q.slot.date !== c.schedule.date || q.slot.time !== c.schedule.time);
      if (q && msg.ts >= q.at) q.answered = msg.id;
      if (moved) {
        c.commitments[who] = { status: 'accepted', slot: q.slot, source: msg.id, at: msg.ts };
        for (const o of c.offers) if (o.consultant === who && o.status === 'sent') o.status = 'accepted';
        fx.push(`${name(who)} said yes to ${fmtSlot(q.slot)}, the time in the question. The hearing has moved since, so ${name(who)} is asked about the new time.`);
        break;
      }
      c.commitments[who] = { status: 'accepted', slot: slotNow(), source: msg.id, at: msg.ts, conditionalDate: prev ? prev.conditionalDate : undefined };
      for (const o of c.offers) if (o.status === 'sent') o.status = o.consultant === who ? 'accepted' : 'released';   // first yes wins
      fx.push(`${name(who)} accepted ${fmtSlot(slotNow())}.`);
      break;
    }
    case 'consultant_tentative': {
      const prev = c.commitments[who];
      if (prev && prev.source === msg.id) break;      // the same message already said yes or no for this case
      c.commitments[who] = { status: 'tentative', slot: slotNow(), source: msg.id, at: msg.ts };
      fx.push(`${name(who)} is tentative. Not a commitment.`);
      break;
    }
    case 'consultant_conditional': {
      const prev = c.commitments[who];
      if (prev) { prev.conditionalDate = claim.date || null; prev.conditionalSource = msg.id; }
      else c.commitments[who] = { status: 'conditional', slot: null, conditionalDate: claim.date || null, conditionalSource: msg.id, source: msg.id, at: msg.ts };
      fx.push(`${name(who)} could attend on ${fmtSlot({ date: claim.date })} if the hearing moves. Not a commitment to the current date.`);
      break;
    }
    case 'consultant_declined': {
      if (!who) { c.leads.push({ type: claim.type, text: claim.quote, source: msg.id, at: msg.ts, open: true, fields: {} }); break; }
      const prev = c.commitments[who];
      const slot = slotNow();
      c.commitments[who] = { status: 'declined', slot, reason: claim.reason || 'other', source: msg.id, at: msg.ts, conditionalDate: prev ? prev.conditionalDate : undefined };
      for (const o of c.offers) if (o.consultant === who && o.status === 'sent') o.status = 'declined';
      if (c.asks[who] && msg.ts >= c.asks[who].at) c.asks[who].answered = msg.id;
      // A bare "no" gives no reason, so it says nothing about the consultant's other hearings that day.
      if (claim.reason !== 'no_reason') state.unavailable.push({ consultant: who, date: slot.date, time: slot.time, reason: claim.reason || 'other', source: msg.id, caseId });
      fx.push(claim.reason === 'no_reason' ? `${name(who)} said no to ${fmtSlot(slot)}.` : `${name(who)} cannot attend ${fmtSlot(slot)}${claim.reason === 'illness' ? ' (ill)' : ''}.`);
      // Being ill is about the day, not about one hearing. Every other hearing this consultant holds
      // that day is opened as well: one key opens, and a no-show costs more than one extra question.
      if (claim.reason === 'illness' && slot.date) {
        const also = [];
        for (const [id, o] of Object.entries(state.cases)) {
          if (id === caseId || (claim.cases || []).includes(id) || !o.schedule || o.schedule.date !== slot.date || o.withdrawn || o.postponed) continue;
          const held = o.commitments[who];
          if (!held || !['accepted', 'offered', 'tentative'].includes(held.status)) continue;
          o.commitments[who] = { status: 'declined', slot: { date: o.schedule.date, time: o.schedule.time }, reason: 'illness', source: msg.id, at: msg.ts, carriedFrom: caseId };
          for (const of of o.offers) if (of.consultant === who && of.status === 'sent') of.status = 'declined';
          also.push(id);
        }
        if (also.length) fx.push(`Being ill covers the whole day. ${name(who)} also held ${also.join(', ')} on ${fmtSlot({ date: slot.date })}, so ${also.length === 1 ? 'that hearing needs' : 'those hearings need'} cover too.`);
      }
      break;
    }
    case 'coverage_offered':
      if (otherDate() || cannotUse('offered to cover')) break;
      c.commitments[who] = { status: 'offered', slot: slotNow(), source: msg.id, at: msg.ts };
      fx.push(`${name(who)} volunteers to cover and asks for confirmation.`);
      break;
    case 'consultant_question':
      c.questions.push({ consultant: who, text: claim.quote, source: msg.id, at: msg.ts, answered: false });
      fx.push(`${name(who)} asks a question.`);
      break;
    case 'availability_stated': {
      const date = claim.date || (c.schedule && c.schedule.date);
      if (date && !state.availability.some((a) => a.consultant === who && a.date === date && a.part === claim.part)) {
        state.availability.push({ consultant: who, date, part: claim.part || 'day', source: msg.id });
        fx.push(`${name(who)} says the ${claim.part || 'day'} of ${fmtSlot({ date })} is free.`);
      }
      break;
    }
    // A repeat receipt never replaces the first one: the first receipt of the same packet version
    // stays the evidence. A new send or an "unreadable" in between sets another status, and a new
    // current version makes the versions differ, so the next receipt is then recorded as new.
    case 'packet_received': {
      const sameVersion = (r) => !!r && r.status === 'received' && (r.version ?? null) === (c.packet.current ?? null);
      if (msg.role === 'consultant') {
        const prev = c.packet.cons[who], vi = c.packet.versionIssue;
        // A consultant's receipt also counts only when it is later than the last version issue
        // (derive.js, G4), so an earlier receipt is kept only when it still counts.
        if (!(sameVersion(prev) && (!vi || prev.at > vi.at))) c.packet.cons[who] = { status: 'received', version: c.packet.current ?? null, source: msg.id, at: msg.ts };
        fx.push(`${name(who)} has the current packet.`);
      } else if (d === 'fact') {
        if (c.packet.clerk.status !== 'received') fx.push('Clerk confirms the packet arrived and opened.');
        if (!sameVersion(c.packet.clerk)) c.packet.clerk = { status: 'received', version: c.packet.current ?? null, source: msg.id, at: msg.ts };
      }
      break;
    }
    case 'doc_unreadable': {
      const kind = claim.kind || 'packet';
      if (kind === 'packet') {
        if (msg.role === 'consultant') c.packet.cons[who] = { status: 'unreadable', source: msg.id, at: msg.ts };
        else c.packet.clerk = { status: 'unreadable', source: msg.id, at: msg.ts };
        fx.push(`${msg.role === 'consultant' ? name(who) : 'Clerk'} could not read the packet file.`);
      } else {
        const o = obligation(c, kind, msg);
        setOb(o, 'unreadable', msg, claim.quote);
        // A written message from the firm that reports the problem is also the request for a new copy.
        if (msg.role === 'firm' && msg.written) o.copyRequested = { at: msg.ts, source: msg.id };
        fx.push(`The ${kind.replace('_', ' ')} copy is unreadable.${o.copyRequested ? ' A clearer copy has been requested.' : ''}`);
      }
      break;
    }
    case 'packet_version_issue':
      if (claim.version) c.packet.current = claim.version;
      if (msg.role === 'consultant') c.packet.cons[who] = { status: 'stale', source: msg.id, at: msg.ts };
      c.packet.versionIssue = { source: msg.id, at: msg.ts, by: msg.role };
      fx.push(`Consultant copy points to an old packet version. Current is ${c.packet.current || 'unknown'}.`);
      break;
    case 'document_submitted': {
      const kind = claim.kind || 'packet';
      if (kind === 'packet') {
        c.packet.clerk = { status: 'sent', source: msg.id, at: msg.ts };
        fx.push('Packet sent to the clerk. No receipt yet.');
        for (const k of Object.keys(c.commitments)) {
          if (new RegExp(`\\b${name(k)}\\b`).test(msg.body) && c.commitments[k].status === 'accepted') { c.packet.cons[k] = { status: 'sent', source: msg.id, at: msg.ts }; fx.push(`Packet sent to ${name(k)}. No receipt yet.`); }
        }
      } else if (kind === 'staffing' || kind === 'staffing_form') {
        c.repSubmission = { consultant: claim.consultant || null, kind, source: msg.id, at: msg.ts };
        fx.push(`Staffing details sent to the office${claim.consultant ? ' naming ' + name(claim.consultant) : ''}. No acknowledgment yet.`);
      } else {
        const o = obligation(c, kind, msg);
        const label = kind === 'withdrawal' ? 'withdrawal' : kind.replace('_', ' ');
        if (msg.role === 'consultant') {
          // The consultant returned a signed copy to the firm. The office does not have it yet.
          o.signer = who; o.copyRequested = null;
          setOb(o, 'signed', msg, claim.quote);
          fx.push(`${name(who)} signed the ${label}. The firm has it; the office does not yet.`);
        } else {
          setOb(o, 'submitted', msg, claim.quote);
          fx.push(`${label[0].toUpperCase() + label.slice(1)} sent to the office. Sending is not processing: it stays open until the office confirms.`);
        }
      }
      break;
    }
    case 'signature_required': {
      const o = obligation(c, claim.kind || 'settlement', msg);
      o.signer = claim.consultant || o.signer;
      setOb(o, 'awaiting_signature', msg, claim.quote);
      fx.push(`${(claim.kind || 'settlement')} needs a signature${o.signer ? ' from ' + name(o.signer) : ''}.`);
      break;
    }
    case 'signature_rejected': {
      const o = obligation(c, claim.kind || 'withdrawal', msg);
      o.rejected = { source: msg.id, at: msg.ts, text: claim.quote };
      setOb(o, 'rejected', msg, claim.quote);
      fx.push('Government rejected the signed document.');
      break;
    }
    case 'withdrawal_requested': {
      const o = obligation(c, 'withdrawal', msg);
      o.homeownerInitiated = true;
      setOb(o, 'needs_confirmation', msg, claim.quote);
      if (!(c.homeownerChange && c.homeownerChange.kind === 'withdrawal' && !c.homeownerChange.acknowledged)) c.homeownerChange = { kind: 'withdrawal', source: msg.id, at: msg.ts, acknowledged: false };
      fx.push('Homeowner asked the county to withdraw. The hearing stays listed until the government processes it.');
      break;
    }
    // What the homeowner told the firm when a person asked them. Only this settles a request the
    // homeowner is said to have made at the county.
    case 'homeowner_confirmed':
    case 'homeowner_declined': {
      const h = c.homeownerChange;
      if (!h || h.acknowledged) { fx.push("Recorded. Nothing was waiting for the homeowner's answer."); break; }
      const yes = claim.type === 'homeowner_confirmed';
      h.acknowledged = true; h.answer = yes ? 'confirmed' : 'declined'; h.answerSource = msg.id; h.answerAt = msg.ts;
      const o = [...c.obligations].reverse().find((x) => x.kind === 'withdrawal' && OB_OPEN(x));
      if (h.kind === 'withdrawal') {
        if (yes) {
          if (o && o.status === 'needs_confirmation') setOb(o, 'confirmed', msg, claim.quote);
          fx.push('The homeowner confirmed the withdrawal. The firm can now confirm it to the office.');
        } else {
          if (o) { o.disputeFrom = o.status; setOb(o, 'disputed', msg, claim.quote); }
          fx.push('The homeowner does not want to withdraw. The office must be told not to process it.');
        }
      } else if (yes) fx.push('The homeowner confirmed they asked for the new date.');
      else { c.moveDisputed = { source: msg.id, at: msg.ts }; fx.push('The homeowner says they did not ask to move the hearing. The official date stands until the office says otherwise.'); }
      break;
    }
    case 'withdrawal_cancelled': {
      const o = [...c.obligations].reverse().find((x) => x.kind === 'withdrawal' && OB_OPEN(x));
      if (!o) { fx.push('The office says no withdrawal will be processed. None was open.'); break; }
      if (d === 'provisional') { o.provisionalCancelled = { source: msg.id, at: msg.ts }; fx.push('By phone: the withdrawal will not be processed. Held until confirmed in writing.'); break; }
      o.cancelled = true;
      setOb(o, 'cleared', msg, claim.quote);
      fx.push('The office will not process the withdrawal. The appeal stays active.');
      break;
    }
    case 'process_rule_changed':
      if (!state.drift[c.county] || state.drift[c.county].status !== 'proposed') {
        state.drift[c.county] = { status: 'proposed', source: msg.id, at: msg.ts, text: msg.body, quote: claim.quote };
        fx.push(`${c.county}: the office describes a process that differs from the saved playbook.`);
      }
      break;
    case 'outcome_reported':
      c.outcome = { result: claim.result || 'other', source: msg.id, at: msg.ts, text: claim.quote };
      fx.push(`Consultant reports: ${claim.result || 'other'}.`);
      break;
    case 'obligation_created': {
      const kind = claim.kind || 'homeowner_statement';
      const existing = obligation(c, kind, msg, false);
      const o = existing || obligation(c, kind, msg);
      if (existing) o.reminders += 1;
      if (claim.deadline) o.deadline = claim.deadline;
      if (claim.no_further_hearing) c.noFurtherHearing = true;
      fx.push(existing ? `Government asks again for the ${kind.replace('_', ' ')}.` : `Government requests a ${kind.replace('_', ' ')}${claim.deadline ? ' by ' + claim.deadline.replace('T', ' ') : ''}.`);
      break;
    }
    case 'obligation_cleared': {
      const kind = claim.kind || (c.obligations.find(OB_OPEN) || {}).kind;
      const o = kind && obligation(c, kind, msg, false);
      if (!o) break;
      if (d === 'provisional') { o.provisionalCleared = { source: msg.id, at: msg.ts }; fx.push('By phone: received. Held until confirmed in writing.'); break; }
      setOb(o, 'cleared', msg, claim.quote);
      if (kind === 'withdrawal') { c.withdrawn = true; c.withdrawnAt = msg.ts; c.withdrawnSource = msg.id; fx.push('Government processed the withdrawal. The hearing is off the schedule.'); }
      else fx.push(`Government confirms the ${kind.replace('_', ' ')}.`);
      break;
    }
    case 'decision_pending':
      c.decisionPending = true;
      fx.push('Awaiting a written decision.');
      break;
    case 'hearing_instruction':
      if (!c.instructions.some((i) => i.text === claim.quote)) {
        c.instructions.push({ text: claim.quote, source: msg.id, at: msg.ts });
        fx.push('The office gave an instruction the attendee must know.');
      }
      break;
    default:
      break;
  }
  return fx;
}

// Claims in one message are applied in this order, so that (for example) a schedule change
// lands before a consultant's reply about it, and a rejection lands before the new request.
const ORDER = ['process_rule_changed', 'hearing_postponed', 'hearing_scheduled', 'schedule_changed', 'change_denied', 'hearing_confirmed', 'change_requested',
  'change_pending', 'rep_not_recorded', 'rep_recorded', 'rep_requested', 'consultant_accepted', 'consultant_declined', 'coverage_offered',
  'consultant_tentative', 'consultant_conditional', 'calendar_edited', 'availability_stated', 'signature_rejected', 'signature_required',
  'withdrawal_requested', 'homeowner_confirmed', 'homeowner_declined', 'withdrawal_cancelled', 'obligation_created', 'document_submitted', 'packet_version_issue', 'packet_received', 'doc_unreadable',
  'obligation_cleared', 'outcome_reported', 'decision_pending', 'hearing_instruction', 'consultant_question', 'internal_note', 'acknowledgement'];
export const claimOrder = (type) => { const i = ORDER.indexOf(type); return i < 0 ? ORDER.length : i; };
