// PLAN: from open gates to next actions. This is the control loop's second half:
//   work to do now = what the playbook requires - what the evidence already shows.
// Each action carries its autonomy level from the county playbook, a draft rendered from
// ledger facts, and (in this prototype) the replies a counterparty could send.

import { solveStaffing, bindTime } from './staffing.js';
import { renderDraft, replyTemplates } from './drafts.js';
import { proposeChange, STAFFING_METHODS } from './playbook.js';
import { officeOpen, nextOpen, lastOpenBefore, afterQuietHours, replyWindow, fmtWhen, fmtSlot, fmtDate, HOURS } from './time.js';
import { tidy } from './text.js';
import { SCHEDULE_CLAIMS } from './model.js';

const LEAD_TYPES = ['schedule_changed', 'hearing_scheduled', 'hearing_confirmed'];
const addr = (c) => c.property.split(',')[0];
const stop = (t) => (/[.!?]$/.test(t) ? t : t + '.');
const toStart = (slot, pb) => (slot && slot.date && slot.time ? Date.parse(`${slot.date}T${slot.time}:00${pb.office.tz}`) : null);

export function planActions({ view, state, dir, books, now }) {
  const name = (id) => dir.consultantById[id].first;
  const full = (id) => dir.consultantById[id].name;
  const groups = new Map();
  const add = (key, base, cv) => {
    // A hearing that still needs a message never hides inside a group that is only waiting for an
    // answer: the same key can hold one to-do group and one waiting group. If both exist, the
    // waiting one is renamed at the end. A waiting group counts its silence from the latest send.
    const phase = base.phase || 'todo';
    const first = groups.get(key);
    const slot = first && first.phase !== phase ? `${key}|${phase}` : key;
    let g = groups.get(slot);
    if (!g) { g = { key, cases: [], caseViews: [], evidence: [], phase: 'todo', severity: 'problem', ...base }; groups.set(slot, g); }
    else if (phase === 'waiting' && base.sentAt && g.sentAt && base.sentAt > g.sentAt) g.sentAt = base.sentAt;
    if (!g.cases.includes(cv.id)) { g.cases.push(cv.id); g.caseViews.push(cv); }
    for (const e of base.evidence || []) if (e && !g.evidence.includes(e)) g.evidence.push(e);
    if (base.due != null) g.due = g.due == null ? base.due : Math.min(g.due, base.due);
    return g;
  };
  const office = (c) => ({ kind: 'office', name: `${c.ledger.county} hearing office`, address: c.playbook.office.email, channel: 'email' });
  const cons = (id) => {
    const k = dir.consultantById[id];
    return { kind: 'consultant', id, name: k.name, address: k.notice_preference === 'email' ? k.email : `${k.first} (${k.notice_preference})`, channel: k.notice_preference === 'text' ? 'text' : k.notice_preference === 'phone' ? 'phone, then text' : 'email' };
  };
  const blockKey = (c) => `${c.ledger.county}:${c.ledger.schedule ? c.ledger.schedule.date : 'nodate'}`;

  // ---- A. playbook drift (county level, a person decides)
  for (const [county, d] of Object.entries(state.drift)) {
    if (d.status !== 'proposed') continue;
    const affected = view.cases.filter((c) => c.ledger.county === county && c.stage === 'upcoming');
    if (!affected.length) continue;
    const g = { key: `playbook:${county}`, kind: 'playbook', klass: 'playbook_change', phase: 'todo', severity: 'problem', county, cases: affected.map((c) => c.id), caseViews: affected,
      to: { kind: 'staff', name: 'Operations lead', channel: 'review' }, title: `Review ${county}'s new process`, evidence: [d.source],
      why: `Message ${d.source} describes a staffing process that differs from the saved playbook (version ${books[county].version}).`,
      proposal: proposeChange(books[county], d.text), driftQuote: d.quote, due: Math.min(...affected.map((c) => c.due.G3 || Infinity)) };
    groups.set(g.key, g);
  }

  // ---- A0. messages that could not be used in full. A person reads each one: nothing is dropped silently.
  for (const m of state.messages) {
    if (!m.attention || !m.attention.length || state.triage[m.id]) continue;
    const cvs = view.cases.filter((c) => m.caseIds.includes(c.id));
    const used = m.claims.some((c) => c.effects && c.effects.length && !['rejected', 'signal', 'held'].includes(c.disposition));
    const starts = cvs.map((c) => c.start).filter(Boolean);
    groups.set(`triage:${m.id}`, { key: `triage:${m.id}`, kind: 'triage', klass: 'triage', phase: 'todo', severity: m.spoofSuspected ? 'problem' : 'waiting',
      county: cvs[0] ? cvs[0].ledger.county : m.county || null, cases: cvs.map((c) => c.id), caseViews: cvs,
      to: { kind: 'staff', name: 'Coordinator', channel: 'review' }, message: { id: m.id, sender: m.sender, address: m.address, channel: m.channel, body: m.body, role: m.role, homeowner: m.homeowner },
      title: m.role === 'homeowner' ? `Call ${m.homeowner} back: they wrote to the firm` : `Read message ${m.id} from ${m.sender}`,
      reasons: m.attention, used, why: `${m.attention.join(' ')} ${used ? 'The rest of the message was applied.' : 'Nothing was changed because of it.'}`, evidence: [m.id], due: starts.length ? Math.min(...starts) : null });
  }

  const upcoming = view.cases.filter((c) => c.stage === 'upcoming');

  // ---- B. cover (G2)
  // Silence is an answer. An offer or a request to confirm a new time that nobody answered in
  // time counts as a no for this round, and the next person is asked.
  // How long is silence allowed? A third of the working time left before the office needs the
  // name, between one working hour and one working day. A weekend does not count as waiting time.
  const quietUntil = (c, sentAt) => replyWindow(c.playbook, sentAt, bindTime(c.ledger, c.playbook, sentAt));
  // A "maybe" holds a hearing only until the answer time given in the nudge. Then others are asked.
  const nudgeExpired = (c) => {
    const who = c.gates.G2.who, q = typeof who === 'string' ? c.ledger.asks[who] : null;
    return !!(q && q.kind === 'nudge' && !q.answered && q.replyBy && now > q.replyBy);
  };
  const exclude = {}, silentReconfirm = new Set();
  const skip = (c, k, text) => { (exclude[c.id] = exclude[c.id] || {})[k] = text; };
  for (const c of upcoming) {
    const L = c.ledger, g2 = c.gates.G2;
    for (const o of L.offers) {
      const sameSlot = o.slot && L.schedule && o.slot.date === L.schedule.date && o.slot.time === L.schedule.time;
      if (sameSlot && (o.status === 'no_answer' || (o.status === 'sent' && o.replyBy && now > o.replyBy))) skip(c, o.consultant, `No answer to the offer sent ${fmtWhen(o.at)}`);
    }
    if (g2.sub === 'stale' || g2.sub === 'condition' || g2.sub === 'recorded') {
      const told = L.notified[g2.who];
      if (told && told.at >= (g2.sub === 'recorded' ? L.rep.at : L.schedule.at) && now > quietUntil(c, told.at)) { skip(c, g2.who, g2.sub === 'recorded' ? `No answer to the request to confirm, sent ${fmtWhen(told.at)}` : `No answer to the request to confirm the new time, sent ${fmtWhen(told.at)}`); silentReconfirm.add(c.id); }
    }
  }
  const liveOffers = (c) => c.ledger.offers.filter((x) => x.status === 'sent' && (!x.replyBy || now <= x.replyBy) && c.ledger.schedule && (!x.slot || (x.slot.date === c.ledger.schedule.date && x.slot.time === c.ledger.schedule.time)));
  const targets = upcoming.filter((c) => c.gates.G2.status !== 'closed' && (['declined', 'none', 'offered', 'no_answer', 'unusable'].includes(c.gates.G2.sub) || (c.gates.G2.sub === 'tentative' && (c.gates.G2.overdue || nudgeExpired(c))) || silentReconfirm.has(c.id)));
  const staffing = targets.length ? solveStaffing({ state, dir, books, now, targets: targets.map((c) => c.id), exclude }) : null;
  const planFor = (id) => staffing && staffing.plans.find((p) => p.caseId === id);

  for (const c of upcoming) {
    const g2 = c.gates.G2;
    if (g2.status === 'closed') continue;
    const L = c.ledger, bk = blockKey(c);
    if (g2.sub === 'offered') {
      add(`confirm:${g2.who}:${bk}`, { kind: 'confirm_assignment', klass: 'confirm_assignment', to: cons(g2.who), title: `Confirm ${name(g2.who)} for ${L.county}, ${fmtDate(L.schedule.date)}`,
        why: `${name(g2.who)} volunteered and asked for confirmation. Confirming closes the consultant gate and sends the current packets.`, evidence: g2.evidence, due: c.due.G2 }, c);
    } else if ((g2.sub === 'stale' || g2.sub === 'condition' || g2.sub === 'recorded') && !silentReconfirm.has(c.id)) {
      const told = L.notified[g2.who];
      const recorded = g2.sub === 'recorded';
      const waiting = told && told.at >= (recorded ? L.rep.at : L.schedule.at);
      add(`reconfirm:${g2.who}:${bk}`, { kind: 'reconfirm', klass: 'consultant_update', to: cons(g2.who), phase: waiting ? 'waiting' : 'todo', sentAt: waiting ? told.at : null, oldSlot: g2.oldSlot, recorded, recordedIn: recorded ? L.rep.source : null,
        replyBy: waiting && L.asks[g2.who] && L.asks[g2.who].replyBy ? L.asks[g2.who].replyBy : quietUntil(c, now),
        title: recorded ? `Ask ${name(g2.who)} to confirm: ${L.county} has ${name(g2.who)} recorded` : `Ask ${name(g2.who)} to confirm the new slot`, why: g2.text, evidence: g2.evidence, due: c.due.G2 }, c);
    } else if (g2.sub === 'offer_out' || liveOffers(c).length) {
      // An offer that is still inside its reply time is waited for, whatever else is open on the
      // hearing. Without this, a consultant who ignored a request to reconfirm made the planner
      // send the next person the same offer on every pass.
      for (const o of liveOffers(c)) {
        add(`offer:${o.consultant}:${bk}`, { kind: 'offer', klass: 'consultant_offer', to: cons(o.consultant), phase: 'waiting', sentAt: o.at, severity: g2.status, replyBy: o.replyBy,
          title: `Waiting for ${name(o.consultant)} to answer the offer`, why: `Offer sent ${fmtWhen(o.at)}. ${o.replyBy ? `If there is no answer by ${fmtWhen(o.replyBy)}, the next candidate is asked.` : 'If there is no answer, the next candidate is asked.'}`, evidence: [], due: c.due.G2 }, c);
      }
    } else if (g2.sub === 'tentative' && !g2.overdue && !nudgeExpired(c)) {
      const told = L.notified[g2.who];
      const waiting = told && told.at >= L.commitments[g2.who].at;
      const q = L.asks[g2.who];
      const answerBy = waiting && q && q.kind === 'nudge' && q.replyBy ? q.replyBy : Math.min(c.due.G2, replyWindow(c.playbook, now, bindTime(L, c.playbook, now)));
      add(`nudge:${g2.who}:${bk}`, { kind: 'nudge', klass: 'consultant_reminder', to: cons(g2.who), phase: waiting ? 'waiting' : 'todo', sentAt: waiting ? told.at : null, severity: 'waiting', replyBy: answerBy,
        title: `Ask ${name(g2.who)} for a yes or no`, why: `${g2.text} The planning sheet must not show ${name(g2.who)} as assigned.`, evidence: g2.evidence, due: c.due.G2 }, c);
    } else {
      const p = planFor(c.id);
      if (p && p.pick) {
        const pick = p.candidates.find((k) => k.id === p.pick);
        const others = p.broadcast ? p.candidates.filter((k) => k.feasible && k.id !== p.pick).map((k) => k.id) : [];
        // Ask for an answer within a third of the time that is left, so there is room to ask the next person.
        const replyBy = replyWindow(c.playbook, now, p.bind);
        const g = add(`offer:${p.pick}:${bk}`, { kind: 'offer', klass: 'consultant_offer', to: cons(p.pick), title: `Offer ${L.county}, ${fmtDate(L.schedule.date)} to ${pick.name}`,
          why: '', evidence: g2.evidence, due: Math.min(c.due.G2, p.bind) }, c);
        g.replyBy = Math.min(g.replyBy || Infinity, replyBy);
        g.alsoAsk = [...new Set([...(g.alsoAsk || []), ...others])];
        g.reasons = pick.reasons;
        const officeAsk = L.repRequest && L.repRequest.deadline ? ` ${L.county} wants the name by ${stop(fmtWhen(c.rule.G3, c.playbook.office.tz))}` : '';
        g.why = `${g2.text} ${pick.name} is the lowest expected cost: ${pick.reasons[1].replace('Chance of yes', 'chance of yes')}.${officeAsk}${others.length ? ` About ${Math.max(1, Math.round(p.workLeft))} working ${Math.round(p.workLeft) <= 1 ? 'hour is' : 'hours are'} left before ${p.bind < c.start ? 'the office needs the name' : 'the hearing'}, so ${others.map(name).join(', ')} ${others.length === 1 ? 'is' : 'are'} asked at the same time and the first yes wins.` : ''}`;
      } else {
        const tried = p ? p.candidates.filter((k) => !k.feasible).map((k) => `${k.name}: ${k.blockers[0]}`) : [];
        add(`escalate:${bk}`, { kind: 'escalate', klass: 'call_task', to: { kind: 'staff', name: 'Operations lead', channel: 'task' }, phase: L.escalated ? 'waiting' : 'todo', sentAt: L.escalated || null, tried,
          title: `No consultant available for ${L.county}, ${fmtDate(L.schedule.date)}`, why: `${g2.text} Every consultant on the roster is ruled out. A person decides: phone the consultants, find someone outside the roster, or ask ${L.county} to move the hearing.`, evidence: g2.evidence, due: Math.min(c.due.G2, bindTime(L, c.playbook, now)) }, c);
      }
    }
  }

  // ---- B1. a yes the firm cannot use: the consultant is told why, and the search for cover goes on
  for (const c of upcoming) {
    for (const [k, v] of Object.entries(c.ledger.commitments)) {
      if (v.status !== 'unusable' || v.told || !v.slot || v.slot.date !== c.ledger.schedule.date) continue;
      const g = add(`unusable:${k}:${v.why}:${blockKey(c)}`, { kind: 'unusable_yes', klass: 'unusable_yes', to: cons(k), reason: v.why, clashWith: [], severity: 'problem', title: `Tell ${name(k)} the firm cannot use the yes`,
        why: `${name(k)} said yes (message ${v.source}), but ${v.text}. The yes is kept on the record and does not count as cover. If the roster or the calendar is wrong, correct it before this goes out.`, evidence: [v.source], due: c.due.G2 }, c);
      if (v.with && !g.clashWith.includes(v.with)) g.clashWith.push(v.with);
    }
  }

  // ---- B2. a second yes for a hearing that is already covered
  for (const c of upcoming) {
    if (!c.committed) continue;
    for (const [k, v] of Object.entries(c.ledger.commitments)) {
      if (v.status !== 'surplus' || v.released) continue;
      add(`standdown:${k}:${blockKey(c)}`, { kind: 'stand_down', klass: 'consultant_update', to: cons(k), holder: c.committed.id, severity: 'waiting', title: `Tell ${name(k)} this is already covered`,
        why: `${name(k)} said yes after ${name(c.committed.id)} had accepted (message ${v.source}). Two people must not turn up for one hearing, and only one fee is due.`, evidence: [v.source], due: c.start }, c);
    }
  }

  // ... and the consultants whose offer closed because someone else said yes first
  for (const c of upcoming) {
    if (!c.committed) continue;
    for (const o of c.ledger.offers) {
      const said = c.ledger.commitments[o.consultant];
      if (o.status !== 'released' || o.toldAt || o.consultant === c.committed.id || (said && said.status === 'declined')) continue;
      const key = `standdown:${o.consultant}:${blockKey(c)}`;
      if (groups.has(key) && !groups.get(key).offerOnly) continue;      // already getting the fuller message
      const g = add(key, { kind: 'stand_down', klass: 'consultant_update', to: cons(o.consultant), holder: c.committed.id, offerOnly: true, stillOpen: [], severity: 'waiting', title: `Tell ${name(o.consultant)} the offer is closed`,
        why: `${name(c.committed.id)} accepted first. ${name(o.consultant)} was asked as well and should not keep the time free.`, evidence: [o.source], due: c.start }, c);
      // The same message offered other hearings that are still open. Say so, or the consultant
      // reads "now covered" as the end of the whole question.
      for (const other of upcoming) {
        if (other.id === c.id || blockKey(other) !== blockKey(c) || g.stillOpen.some((x) => x.view.id === other.id)) continue;
        const live = liveOffers(other).find((x) => x.consultant === o.consultant && x.source === o.source);
        const q = other.ledger.asks[o.consultant];
        if (live) g.stillOpen.push({ view: other, n: q && q.source === o.source ? q.n : null, replyBy: live.replyBy });
      }
      if (g.stillOpen.length) { g.title = `Tell ${name(o.consultant)} which hearing is covered and which is still open`; g.why = `${name(c.committed.id)} accepted ${g.cases.join(' and ')} first. ${name(o.consultant)} was asked about ${g.stillOpen.map((x) => x.view.id).join(' and ')} in the same message, and that question is still open.`; }
    }
  }

  // ---- C. phone-only schedule change (G1)
  // A hearing the office took off the calendar: everyone who was booked or asked is told at once.
  for (const c of view.cases) {
    const L = c.ledger, p = L.postponed;
    if (!p) continue;
    const same = (slot) => slot && slot.date === p.previous.date && (!slot.time || slot.time === p.previous.time);
    const who = new Set();
    for (const [k, v] of Object.entries(L.commitments)) if (['accepted', 'surplus'].includes(v.status) && same(v.slot)) who.add(k);
    for (const o of L.offers) if (o.status === 'sent' && same(o.slot)) who.add(o.consultant);
    for (const k of who) {
      if (L.notified[k] && L.notified[k].at >= p.at) continue;
      add(`postponed:${k}:${L.county}:${p.previous.date}`, { kind: 'postponed_notice', klass: 'consultant_update', to: cons(k), title: `Tell ${name(k)} the hearing is postponed`,
        why: `The ${L.county} office took it off the calendar (message ${p.source}). ${name(k)} must not travel or log in on ${fmtDate(p.previous.date)}.`, evidence: [p.source], due: toStart(p.previous, c.playbook) }, c);
    }
  }
  for (const c of upcoming) {
    const L = c.ledger;
    if (L.provisionalOff) {
      const chased = L.chased && L.chased.G1 >= L.provisionalOff.at;
      add(`written:off:${blockKey(c)}`, { kind: 'chase_written', klass: 'chaser', off: true, to: office(c), phase: chased ? 'waiting' : 'todo', sentAt: chased ? L.chased.G1 : null,
        title: `Ask ${L.county} to confirm the postponement in writing`, why: c.gates.G1.text, evidence: c.gates.G1.evidence, due: c.start }, c);
      continue;
    }
    if (!L.provisional) continue;
    const chased = L.chased && L.chased.G1 >= L.provisional.at;
    add(`written:${c.id}`, { kind: 'chase_written', klass: 'chaser', to: office(c), phase: chased ? 'waiting' : 'todo', sentAt: chased ? L.chased.G1 : null,
      title: `Ask ${L.county} to confirm the move in writing`, why: c.gates.G1.text, evidence: c.gates.G1.evidence, due: c.start }, c);
  }

  // ---- C2. statements about the schedule that settle nothing: hearsay from a party with no
  // authority, or a sentence from the office that is not a plain statement. The office is asked
  // through the address on file, once per message, however many hearings the message names.
  for (const c of view.cases) {
    if (c.stage === 'withdrawn' || c.stage === 'post_hearing') continue;
    const L = c.ledger;
    const leads = L.leads.filter((l) => l.open && (l.hedged ? SCHEDULE_CLAIMS.includes(l.type) : LEAD_TYPES.includes(l.type) && l.fields && l.fields.date));
    if (!leads.length) continue;
    const lead = leads[leads.length - 1];
    const asked = !!(L.chased && L.chased.lead >= lead.at);
    const g = add(`verify:${L.county}:${lead.source}`, { kind: 'verify_lead', klass: 'chaser', to: office(c), lead, leadBy: {}, hedged: !!lead.hedged, phase: 'waiting', sentAt: null, severity: 'waiting', title: '', why: '', evidence: [lead.source], due: c.start }, c);
    g.leadBy[c.id] = lead;
    if (!asked) g.unasked = true; else g.sentAt = Math.max(g.sentAt || 0, L.chased.lead);
  }
  for (const g of groups.values()) {
    if (g.kind !== 'verify_lead') continue;
    if (g.unasked) { g.phase = 'todo'; g.sentAt = null; }
    const county = g.caseViews[0].ledger.county, ids = g.cases.slice().sort().join(' and '), n = g.cases.length;
    if (g.hedged) {
      g.title = `Ask ${county} for a plain answer on ${ids}`;
      g.why = `${g.lead.voice === 'phone' ? `By phone (message ${g.lead.source}), the office` : `In message ${g.lead.source} the office`} mentioned a change without stating it: "${g.lead.text}" That confirms nothing, so the record stays as it is until the office says plainly, in writing, what applies.`;
    } else {
      g.title = `Ask ${county} whether ${ids} really moved`;
      g.why = `Message ${g.lead.source} says the ${n === 1 ? 'hearing' : 'hearings'} moved, but it did not come from the office. Nothing changes until the office answers at its address on file.`;
    }
  }

  // ---- D. tell consultants the official facts (beliefs, questions, phone reports)
  const threadKey = (c) => c.ledger.county;
  const explain = (c, k) => {
    const L = c.ledger, out = [];
    const cm = L.commitments[k];
    const onSlot = cm && cm.slot && L.schedule && cm.slot.date === L.schedule.date && (!cm.slot.time || cm.slot.time === L.schedule.time);
    const b = L.beliefs[k];
    if (b && b.date && L.schedule && b.date !== L.schedule.date) out.push(`your calendar shows ${fmtDate(b.date)}. That date was never approved by the office. The official date is ${fmtDate(L.schedule.date)}, so please change the entry.`);
    if (L.change && L.change.status === 'denied') out.push(`the request to move it${L.change.date ? ' to ' + fmtDate(L.change.date) : ''} was denied (message ${L.change.source}).`);
    if (L.change && (L.change.status === 'requested' || L.change.status === 'pending')) out.push(`a request to move it${L.change.date ? ' to ' + fmtDate(L.change.date) : ''} is still pending. Until the office approves it, the date above stands.`);
    const moved = L.scheduleHistory.filter((h) => h.kind === 'changed' && h.date).slice(-1)[0];
    if (moved && L.scheduleHistory.length > 1 && L.scheduleHistory[0].date !== L.schedule.date) out.push(`the office moved it from ${fmtDate(L.scheduleHistory[0].date)} to ${fmtDate(L.schedule.date)} (message ${moved.source})${L.homeownerChange && L.homeownerChange.kind === 'reschedule' ? ", at the homeowner's request" : ''}.`);
    if (L.provisional) out.push(`the clerk told us by phone it may move to ${fmtSlot(L.provisional)}. This is not official yet. Keep ${fmtSlot(L.schedule)} and tell us whether you could also attend the new time.`);
    if (L.obligations.some((o) => o.kind === 'withdrawal' && o.status !== 'cleared')) out.push('a withdrawal has been requested but the office has not processed it. The hearing stays listed, so please prepare for it.');
    if (cm && cm.status === 'declined' && onSlot) out.push(`you told us you cannot attend (message ${cm.source}), so we are arranging other cover. Reply YES only if that has changed.`);
    else if (c.committed && c.committed.id === k) out.push('you are confirmed.');
    else if (cm && cm.status === 'accepted' && !onSlot) out.push(`you accepted ${fmtSlot(cm.slot)}. Please tell us whether the new time works.`);
    return out;
  };
  const updates = new Map();
  for (const c of upcoming) {
    for (const i of c.issues) {
      if (i.code === 'BELIEF_MISMATCH' && i.who === 'shared_calendar') {
        add(`calendar:${blockKey(c)}`, { kind: 'calendar_fix', klass: 'consultant_update', to: { kind: 'system', name: 'Shared calendar', channel: 'calendar' }, title: 'Regenerate the shared calendar from the official schedule', why: i.detail, evidence: i.evidence }, c);
      } else if ((i.code === 'BELIEF_MISMATCH' || i.code === 'QUESTION' || i.code === 'DETAIL_UPDATE') && i.who) {
        const key = `update:${i.who}:${threadKey(c)}`;
        const u = updates.get(key) || { who: i.who, cases: [], question: false, evidence: [], news: {} };
        if (!u.cases.includes(c)) u.cases.push(c);
        if (i.code === 'QUESTION') u.question = true;
        if (i.code === 'DETAIL_UPDATE') { u.detail = true; u.news[c.id] = i.news; }
        u.evidence.push(...i.evidence);
        updates.set(key, u);
      }
    }
    const L = c.ledger;
    if (L.provisional && c.committed && !(L.notified[c.committed.id] && L.notified[c.committed.id].at >= L.provisional.at)) {
      const key = `update:${c.committed.id}:${threadKey(c)}`;
      const u = updates.get(key) || { who: c.committed.id, cases: [], question: false, evidence: [], news: {} };
      if (!u.cases.includes(c)) u.cases.push(c);
      u.evidence.push(L.provisional.source);
      updates.set(key, u);
    }
  }
  // A consultant who only asked "what is current?" and is about to get the current packet
  // gets one message, not two: the packet message carries the answer.
  const needsPacket = (c, k) => c.committed && c.committed.id === k && ['none', 'stale', 'unreadable'].includes(c.gates.G4.consStatus);
  const answeredByPacket = new Set();
  for (const [key, u] of updates) {
    // include the consultant's other hearings at the same office so the message is complete
    const block = upcoming.filter((c) => threadKey(c) === threadKey(u.cases[0]) && (c.ledger.commitments[u.who] || c.ledger.beliefs[u.who] || c.ledger.questions.some((q) => q.consultant === u.who)));
    const cases = [...new Set([...u.cases, ...block])].sort((a, b) => a.id.localeCompare(b.id));
    const byText = new Map();
    for (const c of cases) for (const t of [...(u.news[c.id] || []), ...explain(c, u.who)]) byText.set(t, [...(byText.get(t) || []), c.id]);
    const trivial = [...byText.keys()].every((t) => t === 'you are confirmed.');
    if (u.question && trivial && cases.every((c) => needsPacket(c, u.who))) { for (const c of cases) answeredByPacket.add(`${u.who}:${c.id}`); continue; }
    const fragments = [...byText].map(([t, ids]) => `${ids.join(' and ')}: ${t}`);
    if (u.question) fragments.unshift('To answer your question: the list above is the current official schedule.');
    for (const c of cases) add(key, { kind: 'consultant_update', klass: u.question ? 'answer_question' : 'consultant_update', to: cons(u.who), title: `${u.question ? 'Answer' : 'Update'} ${name(u.who)} with the official facts`,
      why: u.question ? `${name(u.who)} asked what is current. The answer comes straight from the ledger.` : u.detail ? `The office changed a detail after ${name(u.who)} accepted. Nobody has passed it on.` : `${name(u.who)} is working from a date the office never approved.`, evidence: u.evidence, fragments, due: c.start }, c);
  }

  // ---- E. representative recorded (G3)
  for (const c of upcoming) {
    const g3 = c.gates.G3, L = c.ledger, pb = c.playbook;
    if (g3.status === 'closed' || !c.committed) continue;
    const rep = c.committed.id, bk = blockKey(c);
    const drift = state.drift[L.county] && state.drift[L.county].status === 'proposed';
    const method = pb.staffing.method;
    const base = { to: office(c), repName: full(rep), evidence: g3.evidence, due: c.due.G3, blocked: drift ? `Review ${L.county}'s process change first. The saved process is out of date.` : null };
    const callBase = { ...base, kind: 'call_office', klass: 'call_task', to: { kind: 'staff', name: 'Coordinator', channel: 'phone' }, sentIn: L.repSubmission && L.repSubmission.source,
      openNote: officeOpen(pb, now) ? 'The office is open now.' : `The office is closed now. Next opening: ${fmtWhen(nextOpen(pb, now), pb.office.tz)}.` };
    const lastAsk = Math.max(L.repSubmission ? L.repSubmission.at : 0, L.repMissing ? L.repMissing.at : 0);
    const callLogged = L.called && L.called.at >= lastAsk;       // the call was made; its result has not been logged yet
    const callItem = (why) => add(`call:${rep}:${bk}`, { ...callBase, phase: callLogged ? 'waiting' : 'todo', sentAt: callLogged ? L.called.at : null, title: callLogged ? `Log what the ${L.county} clerk said` : `Call ${L.county} to have ${name(rep)} entered`, why }, c);
    if (g3.sub === 'mismatch') {
      add(`staffing:${rep}:${bk}`, { ...base, kind: 'staffing', klass: 'staffing_submission', replaces: full(L.rep.consultant), title: `Tell ${L.county} that ${name(rep)} replaces ${name(L.rep.consultant)}`, why: `${g3.text} ${pb.replacement.source_text}` }, c);
    } else if (g3.sub === 'outdated') {
      add(`staffing:${rep}:${bk}`, { ...base, kind: 'staffing', klass: 'staffing_submission', replaces: full(g3.was), title: `Tell ${L.county} that ${name(rep)} replaces ${name(g3.was)}`, why: `${g3.text} ${pb.replacement.source_text}` }, c);
    } else if (g3.sub === 'missing' || g3.sub === 'unsent') {
      add(`staffing:${rep}:${bk}`, { ...base, kind: 'staffing', klass: 'staffing_submission', title: `Send ${L.county} the staffing details naming ${name(rep)}`, why: `${g3.text} ${L.county}'s process: ${STAFFING_METHODS[method] ? STAFFING_METHODS[method].label.toLowerCase() : method}.` }, c);
    } else if (g3.sub === 'lost') {
      if (method === 'form_then_call') callItem(`${g3.text} ${L.county} now needs the form and then a call.`);
      else add(`chase:${rep}:${bk}`, { ...base, kind: 'chase_rep', klass: 'chaser', sentIn: L.repSubmission.source, title: `Chase ${L.county} for acknowledgment`, why: g3.text }, c);
    } else if (g3.sub === 'submitted') {
      if (method === 'form_then_call') callItem(`The form is sent. ${L.county}'s process needs a call to enter it on the list.`);
      else add(`staffing:${rep}:${bk}`, { ...base, kind: 'staffing', klass: 'staffing_submission', phase: 'waiting', severity: g3.status, sentAt: L.repSubmission.at, blocked: null, title: `Waiting for ${L.county} to acknowledge ${name(rep)}`, why: g3.text }, c);
    } else if (g3.sub === 'file_only') {
      add(`chase:${rep}:${bk}`, { ...base, kind: 'chase_rep', klass: 'chaser', fileOnly: g3.file, severity: g3.status, title: `Ask ${L.county} to confirm ${name(rep)} is on its record`, why: `${g3.text} A file in our folder is not the office's record.` }, c);
    } else if (g3.sub === 'phone') {
      const chased = L.chased && L.chased.G3 >= L.repProvisional.at;
      add(`chase:${rep}:${bk}`, { ...base, kind: 'chase_rep', klass: 'chaser', phone: true, blocked: null, phase: chased ? 'waiting' : 'todo', sentAt: chased ? L.chased.G3 : null, severity: 'waiting', title: `Ask ${L.county} to confirm ${name(rep)} in writing`, why: g3.text }, c);
    }
  }

  // ---- F. packets (G4)
  for (const c of upcoming) {
    const g4 = c.gates.G4, L = c.ledger, bk = blockKey(c);
    if (g4.status === 'closed') continue;
    if (g4.clerkOk) {
      // nothing to do for the clerk side
    } else if (g4.clerkStatus === 'none' || g4.clerkStatus === 'unreadable') {
      add(`packet:office:${bk}${g4.clerkStatus === 'unreadable' ? ':resend' : ''}`, { kind: 'send_packet', klass: 'packet_send', to: office(c), resend: g4.clerkStatus === 'unreadable', severity: g4.clerkStatus === 'unreadable' ? 'problem' : 'waiting',
        title: `${g4.clerkStatus === 'unreadable' ? 'Resend' : 'Send'} the current packet to ${L.county}`,
        why: g4.clerkStatus === 'unreadable' ? 'The clerk could not open the file.' : `Due ${c.playbook.packet.lead_hours} hours before the hearing: ${stop(fmtWhen(c.rule.G4, c.playbook.office.tz))}${c.due.G4 !== c.rule.G4 ? ` The office is closed then, so send by ${stop(fmtWhen(c.due.G4, c.playbook.office.tz))}` : ''}`, evidence: [L.packet.clerk.source], due: c.due.G4 }, c);
    } else if (g4.clerkStatus === 'sent') {
      add(`packet:office:${bk}:wait:${L.packet.clerk.source}`, { kind: 'send_packet', klass: 'packet_send', to: office(c), phase: 'waiting', severity: 'waiting', sentAt: g4.clerkAt, title: `Waiting for ${L.county} to confirm the packet`, why: 'Sent. A packet counts only when the clerk confirms it opened.', evidence: [L.packet.clerk.source], due: c.due.G4 }, c);
    }
    if (c.committed) {
      const k = c.committed.id;
      if (['none', 'stale', 'unreadable'].includes(g4.consStatus)) {
        const note = L.notes.map((x) => x.text).reverse().find((t) => /version \d/i.test(t));
        const answers = answeredByPacket.has(`${k}:${c.id}`);
        add(`packet:cons:${k}:${bk}`, { kind: 'send_packet', klass: 'packet_send', to: cons(k), stale: g4.consStatus === 'stale', whatChanged: g4.consStatus === 'stale' ? note : null, severity: g4.consStatus === 'none' ? 'waiting' : 'problem', answers,
          title: `Send ${name(k)} the current packet${g4.consStatus === 'stale' ? ' (their link is out of date)' : ''}`, why: (g4.consStatus === 'stale' ? `${name(k)}'s link opens an old version. The current one is ${L.packet.current}.` : `${name(k)} has not confirmed the current packet.`) + (answers ? ` This also answers ${name(k)}'s question.` : ''),
          evidence: [L.packet.versionIssue && L.packet.versionIssue.source, L.packet.cons[k] && L.packet.cons[k].source], due: c.due.G4 }, c);
      } else if (g4.consStatus === 'sent') {
        add(`packet:cons:${k}:${bk}:wait:${L.packet.cons[k] ? L.packet.cons[k].source : ''}`, { kind: 'send_packet', klass: 'packet_send', to: cons(k), phase: 'waiting', severity: 'waiting', sentAt: g4.consAt, title: `Waiting for ${name(k)} to confirm the packet`, why: 'Sent. Waiting for the consultant to say it is reviewed.', evidence: [], due: c.due.G4 }, c);
      }
    }
  }

  // ---- G. obligations (G5) and homeowner-initiated changes: any stage
  for (const c of view.cases) {
    const L = c.ledger, pb = c.playbook;
    const h = L.homeownerChange;
    if (c.stage === 'withdrawn') {
      // The worst case: the office processed a withdrawal the homeowner did not want.
      if (h && h.answer === 'declined') add(`reinstate:${c.id}`, { kind: 'reinstate', klass: 'call_task', to: { kind: 'staff', name: 'Operations lead', channel: 'phone' }, callee: office(c), phase: L.reinstateCalled ? 'waiting' : 'todo', sentAt: L.reinstateCalled || null,
        title: L.reinstateCalled ? `Follow up with ${L.county} on reinstating the appeal` : `Call ${L.county} today: withdrawal processed against the homeowner's wishes`,
        why: `${L.homeowner} told the firm they did not want to withdraw (message ${h.answerSource}), but the office processed the withdrawal (message ${L.withdrawnSource}). Only a person can ask for the appeal to be reinstated.`, evidence: [L.withdrawnSource, h.answerSource], due: now }, c);
      continue;
    }
    if (h && !h.acknowledged) {
      // A person makes the call, then logs the answer. The answer decides the next step.
      const again = h.called && now - h.called.at >= 24 * HOURS;
      const hb = { kind: 'homeowner', klass: 'homeowner_contact', change: h.kind, evidence: [h.source], due: c.start };
      if (!h.called || again) add(`homeowner:${c.id}`, { ...hb, to: { kind: 'homeowner', name: L.homeowner, channel: 'phone' }, again: !!again,
        title: again ? `Call ${L.homeowner} again: no answer logged` : `Call ${L.homeowner} about their request to ${L.county}`,
        why: h.kind === 'withdrawal' ? 'The office says the homeowner asked to withdraw. Only the homeowner can say whether that is what they want, and a withdrawal cannot be undone, so a person asks them before anything is confirmed.' : 'The homeowner contacted the county directly. Only a person should confirm what they want.' }, c);
      else add(`homeowner:${c.id}`, { ...hb, to: { kind: 'staff', name: 'Coordinator', channel: 'phone note' }, homeownerName: L.homeowner, phase: 'waiting', severity: 'problem', sentAt: h.called.at,
        title: `Log what ${L.homeowner} said`, why: 'The call was made. The answer decides the next step, so it has to be logged: yes, no, or no answer.' }, c);
    }
    if (L.moveDisputed && !L.moveDisputed.settledBy) {
      const sent = L.moveDisputed.sentAt;
      add(`dispute:${c.id}:move`, { kind: 'dispute', klass: sent ? 'chaser' : 'dispute_notice', dispute: 'move', to: office(c), phase: sent ? 'waiting' : 'todo', sentAt: sent || null, severity: 'problem',
        title: sent ? `Waiting for ${L.county} to confirm which date stands` : `Ask ${L.county} which date stands`,
        why: `${L.homeowner} told the firm they did not ask to move the hearing (message ${L.moveDisputed.source}). The official date stands until the office says otherwise in writing.`, evidence: [L.moveDisputed.source, L.schedule && L.schedule.source], due: c.start }, c);
    }
    L.obligations.forEach((o, i) => {
      if (o.status === 'cleared') return;
      const stated = o.deadline ? Date.parse(`${o.deadline}:00${pb.office.tz}`) : null;
      const dl = stated === null ? null : lastOpenBefore(pb, stated);
      const deadlineText = stated === null ? '' : stop(`Deadline ${fmtWhen(stated, pb.office.tz)}`) + (dl !== stated ? ` The office is closed then, so it must arrive by ${stop(fmtWhen(dl, pb.office.tz))}` : '');
      const expected = (L.rep && L.rep.consultant) || (c.committed && c.committed.id) || o.signer;
      const key = `ob:${c.id}:${o.kind}:${i}`;
      const base = { obligation: o, evidence: o.history.map((h) => h.source), due: dl || c.start };
      const label = { settlement: 'settlement', withdrawal: 'withdrawal statement', homeowner_statement: 'homeowner statement' }[o.kind];
      const approval = `${L.homeowner} has approved this ${label}. Consultants sign only after the homeowner approves.`;
      if (['awaiting_signature', 'rejected'].includes(o.status) && o.kind !== 'homeowner_statement') {
        const wrong = o.signer && expected && o.signer !== expected && o.status !== 'rejected';
        add(key, { ...base, kind: 'signature', klass: 'signature_request', to: cons(expected), title: `Send ${name(expected)} the ${label} to sign`, checks: [approval, `${name(expected)} is the representative on the office's record.`],
          why: o.rejected ? `The office rejected the first copy (message ${o.rejected.source}): it named someone other than the representative on its record. ${name(expected)} is the name on record.` : `The signer is checked against the office's record before anything is sent. ${name(expected)} is the representative on record.`,
          blocked: wrong ? `The request names ${name(o.signer)}, but the office has ${name(expected)} on record. Fix the signer first.` : null }, c);
      } else if (o.status === 'signature_requested') {
        add(key, { ...base, kind: 'signature', klass: 'signature_request', to: cons(o.signer || expected), phase: 'waiting', severity: 'waiting', sentAt: o.history[o.history.length - 1].at, title: `Waiting for ${name(o.signer || expected)} to sign the ${label}`, why: 'Sent for signature with a signing link.' }, c);
      } else if (o.status === 'signed') {
        const wrong = o.signer && expected && o.signer !== expected;
        add(key, { ...base, kind: 'obligation', klass: o.kind === 'withdrawal' ? 'withdrawal_confirmation' : 'obligation_submission', to: office(c), signed: true, title: `Send the signed ${label} to ${L.county}`, checks: ['The copy is readable: case number, date and signature.', approval],
          why: `${name(o.signer)} returned a signed copy. The office does not have it until the firm sends it, and the case stays open until the office confirms.`,
          blocked: wrong ? `Signed by ${name(o.signer)}, but the office has ${name(expected)} on record. It would be rejected.` : null }, c);
      } else if (o.status === 'unreadable') {
        const who = o.signer || expected;
        const fresh = o.copyRequested && now - o.copyRequested.at < 24 * HOURS && (!c.start || c.start - now > 48 * HOURS);
        if (fresh) add(key, { ...base, kind: 'clear_copy', klass: 'request_clear_copy', to: cons(who), phase: 'waiting', severity: 'problem', sentAt: o.copyRequested.at, title: `Waiting for ${name(who)}'s readable copy of the ${label}`, why: `Already asked in message ${o.copyRequested.source}, so no second request is sent. If nothing arrives within a day, a signing link goes out instead of another photo.` }, c);
        else add(key, { ...base, kind: 'clear_copy', klass: 'request_clear_copy', to: cons(who), title: `Send ${name(who)} a signing link for the ${label}`, why: o.copyRequested ? `Asked for a clearer copy in message ${o.copyRequested.source}. Nothing readable has arrived. A signing link avoids another unreadable photo.` : 'The photo cannot be read. A signing link or a flat scan avoids this.' }, c);
      } else if (o.status === 'needs_confirmation') {
        // handled by the homeowner call above; once the answer is logged the status becomes "confirmed" or "disputed"
      } else if (o.status === 'disputed') {
        add(key, { ...base, kind: 'dispute', klass: 'dispute_notice', dispute: 'withdrawal', to: office(c), sentBefore: o.disputeFrom === 'submitted' ? (o.history.find((x) => x.status === 'submitted') || {}).source : null, severity: 'problem',
          title: `Tell ${L.county} not to process the withdrawal`,
          why: `${L.homeowner} told the firm they do not want to withdraw (message ${h && h.answerSource}).${o.disputeFrom === 'submitted' ? ' The firm had already sent a withdrawal, so this is urgent.' : ''} A processed withdrawal cannot be undone.` }, c);
      } else if (o.status === 'dispute_sent') {
        add(key, { ...base, kind: 'dispute', klass: 'chaser', dispute: 'withdrawal', to: office(c), phase: 'waiting', severity: 'problem', sentAt: o.history[o.history.length - 1].at,
          title: `Waiting for ${L.county} to confirm the appeal stays active`, why: 'The office was told not to process the withdrawal. Only its written confirmation settles it.' }, c);
      } else if (o.status === 'confirmed') {
        add(key, { ...base, kind: 'obligation', klass: 'withdrawal_confirmation', to: office(c), title: `Confirm the withdrawal to ${L.county}`, why: 'The homeowner confirmed. The office asked the firm to confirm before it processes the withdrawal.' }, c);
      } else if (o.status === 'submitted') {
        const lastSent = o.history[o.history.length - 1];
        const relisted = L.evidence.find((e) => e.at > lastSent.at && (e.type === 'hearing_confirmed' || e.type === 'obligation_created'));
        const chased = L.chased && L.chased.G5 >= (relisted ? relisted.at : 0);
        if (relisted && !chased) add(key, { ...base, kind: 'obligation', klass: 'chaser', to: office(c), chase: true, sentIn: lastSent.source, title: `Chase ${L.county}: is the ${label} processed?`, why: `Sent in message ${lastSent.source}, but message ${relisted.msgId} still lists the hearing. Not processed means still scheduled.`,
          blocked: o.kind === 'withdrawal' && L.homeownerChange && !L.homeownerChange.acknowledged ? `Call ${L.homeowner} first. Nothing shows that the firm confirmed the withdrawal with the homeowner.` : null }, c);
        else add(key, { ...base, kind: 'obligation', klass: 'chaser', to: office(c), phase: 'waiting', severity: 'waiting', sentAt: Math.max(lastSent.at, (L.chased && L.chased.G5) || 0), title: `Waiting for ${L.county} to process the ${label}`, why: 'Sent. Done only when the office confirms.' }, c);
      } else if (o.status === 'open') {
        add(key, { ...base, kind: 'obligation', klass: 'obligation_submission', to: office(c), title: `Send the ${label} to ${L.county}`, why: `The office asked for it${o.reminders ? ` ${o.reminders + 1} times` : ''}. ${deadlineText} A person must get it from ${L.homeowner} and attach it.`.replace(/\s+/g, ' ') }, c);
      }
    });
  }

  // ---- release: a withdrawal the office has processed frees the consultant
  for (const c of view.cases) {
    const L = c.ledger;
    if (c.stage !== 'withdrawn' || !c.committed || !L.schedule) continue;
    const k = c.committed.id;
    if (L.notified[k] && L.notified[k].at >= (L.withdrawnAt || 0)) continue;
    const others = view.cases.filter((o) => o.id !== c.id && o.stage === 'upcoming' && o.ledger.county === L.county && o.ledger.schedule && o.ledger.schedule.date === L.schedule.date && o.committed && o.committed.id === k);
    add(`release:${k}:${c.id}`, { kind: 'release', klass: 'consultant_update', to: cons(k), severity: 'waiting', others, title: `Tell ${name(k)} that ${c.id} is withdrawn`,
      why: `The office processed the withdrawal (message ${L.withdrawnSource}). ${name(k)} is still holding the slot.`, evidence: [L.withdrawnSource], due: c.start }, c);
  }

  // ---- H. after the hearing
  for (const c of view.cases) {
    if (c.stage !== 'awaiting_outcome') continue;
    const L = c.ledger, bk = blockKey(c);
    if (c.committed) {
      const asked = L.outcomeRequested;
      add(`outcome:${c.committed.id}:${bk}`, { kind: 'outcome', klass: 'request_outcome', to: cons(c.committed.id), phase: asked ? 'waiting' : 'todo', sentAt: asked || null, title: `Ask ${name(c.committed.id)} for the outcome`, why: 'The hearing time has passed. The case is not done until the outcome is recorded.', evidence: [], due: c.end }, c);
    } else {
      add(`findout:${bk}`, { kind: 'find_out', klass: 'call_task', to: { kind: 'staff', name: 'Coordinator', channel: 'phone' }, phase: L.outcomeChecked ? 'waiting' : 'todo', sentAt: L.outcomeChecked || null,
        title: L.outcomeChecked ? `Waiting for the outcome at ${L.county}, ${fmtDate(L.schedule.date)}` : `Find out what happened at ${L.county}, ${fmtDate(L.schedule.date)}`, why: 'No consultant was confirmed for this slot and there is no outcome report.', evidence: [], due: c.end }, c);
    }
  }

  // ---- finish: silence timers, levels, drafts, replies, order
  const env = { dir, books, now };
  for (const [slot, g] of groups) {
    if (slot === g.key) continue;
    const twin = groups.get(g.key);
    (g.phase === 'waiting' ? g : twin).key = `${g.key}:wait`;
  }
  let items = [...groups.values()];
  for (const it of items) {
    it.caseViews.sort((a, b) => a.id.localeCompare(b.id));
    it.cases = it.caseViews.map((c) => c.id);
    it.county = it.county || (it.caseViews[0] ? it.caseViews[0].ledger.county : null);
  }
  const anyBook = Object.values(books)[0];

  // Silence timers. A message that should have been answered by now gets a reminder. After the
  // allowed number of reminders a person calls, and from then on it stays with a person.
  // (Offers and requests to confirm a new time are different: they expire and the next person is asked.)
  const callsBy = new Map();
  for (const it of items) {
    if (!(it.phase === 'waiting' && it.sentAt && it.to.kind !== 'staff' && it.to.kind !== 'system' && !['offer', 'reconfirm', 'clear_copy'].includes(it.kind))) continue;
    const pb = it.caseViews[0].playbook, T = pb.timers, w = it.caseViews[0].ledger.waits[it.key];
    const live = w && w.at >= it.sentAt;                                   // reminders belong to the send they follow
    const tries = live ? w.n : 0, calls = live ? w.calls || 0 : 0;
    const last = Math.max(it.sentAt, w ? w.at : 0);
    const quiet = (it.to.kind === 'office' ? T.office_reply_hours : T.consultant_reply_hours) * HOURS;
    const room = it.due && it.due > last ? (it.due - last) / 3 : quiet;     // never longer than a third of the time left
    let at = last + (calls ? quiet : Math.max(HOURS, Math.min(quiet, room)));
    at = it.to.kind === 'office' ? nextOpen(pb, at) : afterQuietHours(at, pb.office.tz, T.quiet_hours);   // offices answer in office hours; nobody is chased at night
    it.followUpAt = at;
    if (now < at) continue;
    it.firstSentAt = it.sentAt;
    if (tries >= T.max_reminders || calls) {
      const who = it.to.id || it.to.name;
      if (!callsBy.has(who)) callsBy.set(who, []);
      callsBy.get(who).push({ item: it, tries, calls });
    } else {
      it.phase = 'todo'; it.severity = 'problem'; it.reminder = tries + 1;
      it.klass = it.to.kind === 'office' ? 'chaser' : 'consultant_reminder';
      it.why = `No answer since ${fmtWhen(last)}. Reminder ${tries + 1} of ${T.max_reminders}. After that a person calls.`;
      it.title = it.title.startsWith('Waiting for ') ? it.title.replace('Waiting for ', 'Remind ') : `Reminder: ${it.title}`;
    }
  }
  // One call per person or office, however many things they have not answered.
  for (const [who, list] of callsBy) {
    // The call also covers everything else this person has not answered yet, even if its own timer has not run out.
    for (const it of items) {
      if (!it.followUpAt || (it.to.id || it.to.name) !== who || list.some((x) => x.item === it)) continue;
      const w = it.caseViews[0].ledger.waits[it.key], live = w && w.at >= it.sentAt;
      if (it.reminder) { it.title = it.title.replace('Remind ', 'Waiting for '); it.reminder = 0; it.phase = 'waiting'; }
      list.push({ item: it, tries: live ? w.n : 0, calls: live ? w.calls || 0 : 0 });
    }
    const first = list[0].item, pb = first.caseViews[0].playbook, to = first.to;
    const caseViews = [...new Map(list.flatMap((x) => x.item.caseViews).map((c) => [c.id, c])).values()].sort((a, b) => a.id.localeCompare(b.id));
    const again = list.some((x) => x.calls > 0);
    const due = Math.min(...list.map((x) => x.item.due ?? Infinity));
    items = items.filter((x) => !list.some((y) => y.item === x));
    items.push({
      key: `followcall:${who}`, kind: 'follow_up_call', klass: 'call_task', phase: 'todo', severity: 'problem', county: first.county, cases: caseViews.map((c) => c.id), caseViews,
      to: { kind: 'staff', name: 'Coordinator', channel: 'phone' }, callee: to,
      parts: list.map((x) => ({ key: x.item.key, cases: x.item.cases, tries: x.tries, calls: x.calls, title: x.item.title, sentAt: x.item.sentAt, item: x.item })),
      openNote: to.kind !== 'office' ? '' : officeOpen(pb, now) ? 'The office is open now.' : `The office is closed now. Next opening: ${fmtWhen(nextOpen(pb, now), pb.office.tz)}.`,
      title: again ? `Call ${to.name} again: still no answer` : `Call ${to.name}: no answer to ${list.length === 1 ? 'our messages' : `${list.length} requests`}`,
      why: `${to.name} has not answered after ${pb.timers.max_reminders} reminders${again ? ' and an earlier call' : ''}. A person calls once and covers ${list.length === 1 ? 'it' : `all ${list.length} open requests`}.`,
      evidence: [], due: Number.isFinite(due) ? due : null,
    });
  }

  for (const it of items) {
    const pb = it.caseViews[0] ? it.caseViews[0].playbook : anyBook;
    it.title = tidy(it.title);
    it.why = tidy(it.why);
    it.level = pb.autonomy[it.klass] || 'L1';
    if (it.kind !== 'playbook') { it.draft = renderDraft(it, env); it.replies = replyTemplates(it, env); }
    else { it.draft = null; it.replies = []; }
  }
  const rank = { human: 0, L0: 0, L1: 1, L2: 2 };
  items.sort((a, b) => (a.phase === b.phase ? 0 : a.phase === 'todo' ? -1 : 1) || ((a.due ?? Infinity) - (b.due ?? Infinity)) || (rank[a.level] - rank[b.level]) || a.key.localeCompare(b.key));
  return { items, staffing };
}

// What sending an action does to the ledger. The firm's own sends are facts the system knows
// first-hand, so they are written directly rather than read back out of an email.
// The yes/no question as the consultant sees it: which line of the numbered list is this hearing?
const ask = (c, item, id, now, outId) => ({ at: now, source: outId, n: item.cases.indexOf(id) + 1, kind: item.kind, replyBy: item.replyBy || null, slot: { date: c.schedule.date, time: c.schedule.time } });

export function applyOutbound(state, dir, item, now, outId) {
  const fx = [];
  // A person has read a message that the system could not use. Nothing else changes.
  if (item.kind === 'triage') { state.triage[item.message.id] = { at: now, source: outId }; return [item.title]; }
  // A follow-up call changes no fact. It records that a person called, for every request it covered.
  if (item.kind === 'follow_up_call') {
    for (const part of item.parts) for (const id of part.cases) {
      const c = state.cases[id];
      c.waits[part.key] = { at: now, n: part.tries, calls: (part.calls || 0) + 1 };
      c.evidence.push({ msgId: outId, at: now, type: 'done:follow_up_call', disposition: 'sent', quote: item.title });
    }
    return [item.title];
  }
  for (const id of item.cases) {
    const c = state.cases[id];
    const k = item.to && item.to.id;
    c.chased = c.chased || {};
    // A reminder changes no fact either. It only restarts the silence timer.
    if (item.reminder) {
      c.waits[item.key] = { at: now, n: item.reminder, calls: 0 };
      c.evidence.push({ msgId: outId, at: now, type: `sent:reminder:${item.kind}`, disposition: 'sent', quote: item.title });
      continue;
    }
    switch (item.kind) {
      case 'offer':
        for (const o of c.offers) if (o.status === 'sent' && o.replyBy && now > o.replyBy) o.status = 'no_answer';
        // an offer for a time the office has since changed is void
        for (const o of c.offers) if (o.status === 'sent' && o.slot && (o.slot.date !== c.schedule.date || o.slot.time !== c.schedule.time)) o.status = 'superseded';
        for (const who of [k, ...(item.alsoAsk || [])]) {
          if (!c.offers.some((o) => o.consultant === who && o.status === 'sent')) c.offers.push({ consultant: who, at: now, status: 'sent', source: outId, replyBy: item.replyBy || null, slot: { date: c.schedule.date, time: c.schedule.time } });
          c.asks[who] = ask(c, item, id, now, outId);
        }
        break;
      case 'nudge': case 'reconfirm':
        c.notified[k] = { at: now, source: outId };
        c.asks[k] = ask(c, item, id, now, outId);
        break;
      case 'confirm_assignment':
        c.commitments[k] = { status: 'accepted', slot: { date: c.schedule.date, time: c.schedule.time }, source: outId, at: now, via: 'confirmed_offer' };
        c.packet.cons[k] = { status: 'sent', source: outId, at: now };
        break;
      case 'consultant_update':
        c.notified[k] = { at: now, source: outId };
        for (const q of c.questions) if (q.consultant === k) q.answered = true;
        break;
      case 'calendar_fix':
        c.notified.shared_calendar = { at: now, source: outId };
        if (c.beliefs.shared_calendar) c.beliefs.shared_calendar = { date: c.schedule.date, source: outId, at: now };
        break;
      case 'staffing':
        c.repSubmission = { consultant: dir.consultants.find((x) => x.name === item.repName).id, kind: 'staffing', source: outId, at: now };
        break;
      case 'chase_rep': c.chased.G3 = now; if (!item.phone) c.repSubmission = { ...(c.repSubmission || {}), at: now, source: outId, consultant: dir.consultants.find((x) => x.name === item.repName).id, kind: 'staffing' }; break;
      case 'chase_written': c.chased.G1 = now; break;
      case 'verify_lead': c.chased.lead = now; break;
      case 'call_office': c.called = { at: now, source: outId }; break;
      case 'send_packet':
        if (item.to.kind === 'office') c.packet.clerk = { status: 'sent', source: outId, at: now };
        else {
          c.packet.cons[k] = { status: 'sent', source: outId, at: now }; c.packet.versionIssue = null;
          if (item.answers) { c.notified[k] = { at: now, source: outId }; for (const q of c.questions) if (q.consultant === k) q.answered = true; }
        }
        break;
      case 'signature': case 'clear_copy': {
        const o = item.obligation && c.obligations.find((x) => x.kind === item.obligation.kind && x.status !== 'cleared');
        if (o) { o.signer = k; o.copyRequested = null; o.status = 'signature_requested'; o.history.push({ status: 'signature_requested', source: outId, at: now }); }
        break;
      }
      case 'obligation': {
        const o = item.obligation && c.obligations.find((x) => x.kind === item.obligation.kind && x.status !== 'cleared');
        if (o) { if (item.chase) c.chased.G5 = now; else { o.status = 'submitted'; o.history.push({ status: 'submitted', source: outId, at: now }); } }
        break;
      }
      case 'homeowner': if (c.homeownerChange) c.homeownerChange.called = { at: now, source: outId }; break;   // the call was made; the answer arrives as a logged note
      case 'dispute': {
        if (item.dispute === 'withdrawal') {
          const o = c.obligations.find((x) => x.kind === 'withdrawal' && x.status === 'disputed');
          if (o) { o.status = 'dispute_sent'; o.history.push({ status: 'dispute_sent', source: outId, at: now }); }
        } else if (c.moveDisputed) c.moveDisputed.sentAt = now;
        break;
      }
      case 'reinstate': c.reinstateCalled = now; break;
      case 'release': c.notified[k] = { at: now, source: outId }; break;
      case 'postponed_notice':
        c.notified[k] = { at: now, source: outId };
        for (const o of c.offers) if (o.consultant === k && o.status === 'sent') { o.status = 'released'; o.toldAt = now; }
        break;
      case 'unusable_yes':
        if (c.commitments[k] && c.commitments[k].status === 'unusable') c.commitments[k].told = now;
        break;
      case 'stand_down':
        if (c.commitments[k] && c.commitments[k].status === 'surplus') c.commitments[k].released = now;
        for (const o of c.offers) if (o.consultant === k && o.status === 'released') o.toldAt = now;
        break;
      case 'outcome': c.outcomeRequested = now; break;
      case 'find_out': c.outcomeChecked = now; break;
      case 'escalate': c.escalated = now; break;
      default: break;
    }
    c.evidence.push({ msgId: outId, at: now, type: `sent:${item.kind}`, disposition: 'sent', quote: item.title });
  }
  fx.push(item.title);
  return fx;
}
