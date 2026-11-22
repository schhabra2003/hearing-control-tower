// Staffing agent: an exact search, not an AI call. Given the hearings that have no committed
// consultant, it ranks every consultant by expected cost and picks the cheapest feasible plan
// across all of them at once (so one person is never double-booked).
//
//   expected cost = fee + (1 - chance they accept) x cost of a failed offer + cost of a new thread
//
// The weights below are assumptions to be replaced by the firm's own history. They are shown
// in the interface next to every recommendation.

import { dayPart, minutesOf, HOURS, lastOpenBefore, workingHoursBetween } from './time.js';
import { committedConsultant, hearingStart } from './derive.js';

export const STAFFING_ASSUMPTIONS = {
  pAccept: { volunteered: 0.98, statedFree: 0.9, sameOfficeSameDay: 0.8, matchesPreference: 0.7, unknown: 0.5, againstPreference: 0.25 },
  ownTripFactor: 0.8,          // an in-person hearing that needs its own trip is accepted less often
  retryCost: [{ underHours: 24, cost: 100 }, { underHours: 72, cost: 50 }, { underHours: Infinity, cost: 30 }],   // a failed offer loses coordinator time and, more importantly, a day
  newThreadCost: 8,            // one more consultant at an office-day: one more notice, packet and reminder thread
  unassignedCost: 1000,
  broadcastUnderWorkingHours: 8,   // with about one working day left, offer to every feasible consultant at once
};

export function preferences(consultant) {
  const note = String(consultant.availability || '').toLowerCase();
  return {
    prefersPart: /usually mornings/.test(note) ? 'morning' : /afternoons preferred/.test(note) ? 'afternoon' : null,
    otherPartOk: /may accept mornings/.test(note),
    prefersMode: /remote hearings preferred/.test(note) ? 'video' : null,
  };
}

// Everything each consultant is already committed to, from the ledger (not from the old records).
export function busyCalendar(state, dir, books) {
  const cal = {};
  for (const rec of dir.cases) {
    const c = state.cases[rec.case_id];
    const cm = committedConsultant(c);
    if (!cm || !c.schedule || c.withdrawn) continue;
    const pb = books[c.county];
    (cal[cm.id] = cal[cm.id] || []).push({
      caseId: c.id, county: c.county, date: c.schedule.date, start: minutesOf(c.schedule.time),
      end: minutesOf(c.schedule.time) + pb.hearing_minutes, mode: c.schedule.mode || pb.hearing_mode,
    });
  }
  return cal;
}

// Can the firm use a yes from this consultant for this hearing? A yes is the consultant's to
// give, but the roster decides where they may appear and the clock decides whether they can be
// in two hearings at once. Travel gaps and the daily limit stay the consultant's own call when
// they say yes in so many words. Returns null, or { kind, text, with }.
export function whyUnusable(state, dir, books, caseId, k, at = null) {
  const c = state.cases[caseId], pb = books[c.county], who = dir.consultantById[k];
  if (!who) return null;
  if (!who.eligible.includes(c.county)) return { kind: 'not_eligible', text: `the roster does not list ${who.first} for ${c.county}` };
  const s = at && at.date && at.time ? at : c.schedule;
  if (!s || !s.date || !s.time) return null;
  const slot = { caseId, county: c.county, date: s.date, start: minutesOf(s.time), end: minutesOf(s.time) + pb.hearing_minutes, mode: (c.schedule && c.schedule.mode) || pb.hearing_mode };
  for (const m of (busyCalendar(state, dir, books)[k] || [])) {
    if (m.caseId === caseId || m.date !== slot.date) continue;
    if (m.end > slot.start && slot.end > m.start) return { kind: 'clash', with: m.caseId, text: `${who.first} already holds ${m.caseId} in ${m.county} at the same time` };
  }
  return null;
}

function gapNeeded(a, b, pb) {
  if (a.county === b.county) return pb.travel.same_block_gap_min;                 // same office, same day
  if (a.mode === 'video' && b.mode === 'video') return pb.travel.video_gap_min;   // separate video sessions
  return pb.travel.in_person_cross_county_gap_min;                                // travel involved (assumption for mixed modes)
}
function clash(a, b, pb) {
  if (a.date !== b.date) return null;
  const gap = gapNeeded(a, b, pb);
  if (a.end + gap <= b.start || b.end + gap <= a.start) return null;
  return a.end > b.start && b.end > a.start ? 'overlaps' : `needs ${gap} minutes between`;
}

// When must the search for cover be over? When the office needs the name (pulled back to its
// opening hours). Once that has passed, the hearing itself is the limit.
export function bindTime(c, pb, now) {
  const start = hearingStart(c, pb);
  const rule = c.repRequest && c.repRequest.deadline ? Date.parse(`${c.repRequest.deadline}:00${pb.office.tz}`) : start - pb.deadlines.rep_hours_before * HOURS;
  const due = lastOpenBefore(pb, rule);
  return now < due ? due : start;
}

export function solveStaffing({ state, dir, books, now, targets, exclude = {} }) {
  const A = STAFFING_ASSUMPTIONS;
  const cal = busyCalendar(state, dir, books);
  const name = (id) => dir.consultantById[id].first;

  const slots = targets.map((caseId) => {
    const c = state.cases[caseId];
    const pb = books[c.county];
    const start = hearingStart(c, pb);
    const mode = c.schedule.mode || pb.hearing_mode;
    const slot = { caseId, county: c.county, date: c.schedule.date, start: minutesOf(c.schedule.time), end: minutesOf(c.schedule.time) + pb.hearing_minutes, mode };
    const hoursLeft = (Math.min(start, c.repRequest && c.repRequest.deadline ? Date.parse(`${c.repRequest.deadline}:00${pb.office.tz}`) : Infinity) - now) / HOURS;
    const retry = A.retryCost.find((r) => hoursLeft < r.underHours).cost;
    // The search has to end when the office needs the name, and that is counted in working time:
    // Friday 11 a.m. to a Friday 4 p.m. deadline is five hours, whatever the hearing date.
    const bind = bindTime(c, pb, now);
    const workLeft = workingHoursBetween(pb, now, bind);
    const part = dayPart(c.schedule.time);

    const candidates = dir.consultants.map((k) => {
      const blockers = [], reasons = [];
      const cmt = c.commitments[k.id];
      const mine = cal[k.id] || [];
      if (!k.eligible.includes(c.county)) blockers.push(`Not eligible in ${c.county}`);
      if (exclude[caseId] && exclude[caseId][k.id]) blockers.push(exclude[caseId][k.id]);
      if (cmt && cmt.status === 'declined' && cmt.slot && cmt.slot.date === slot.date) blockers.push(`Declined this slot (message ${cmt.source})`);
      const un = state.unavailable.find((u) => u.consultant === k.id && u.date === slot.date && u.caseId !== caseId
        && (u.reason === 'illness' || (u.time && dayPart(u.time) === part && !mine.some((m) => m.date === slot.date && dayPart(String(Math.floor(m.start / 60)).padStart(2, '0') + ':00') === part))));
      if (un) blockers.push(un.reason === 'illness' ? `Ill on ${slot.date} (message ${un.source})` : `Reported a conflict that ${part} (message ${un.source})`);
      const sameDay = mine.filter((m) => m.date === slot.date);
      if (sameDay.length + 1 > k.max_per_day) blockers.push(`Daily limit of ${k.max_per_day} reached`);
      for (const m of sameDay) {
        const why = clash(m, slot, pb);
        if (why) blockers.push(`${why} ${m.caseId} (${m.county}, ${m.mode === 'video' ? 'video' : 'in person'})`);
      }

      const pref = preferences(k);
      const sameOffice = sameDay.some((m) => m.county === c.county);
      const stated = state.availability.find((a) => a.consultant === k.id && a.date === slot.date && (a.part === part || a.part === 'day'));
      const volunteered = cmt && (cmt.status === 'offered' || cmt.status === 'surplus');
      const against = (pref.prefersPart && pref.prefersPart !== part && !pref.otherPartOk) || (pref.prefersMode && pref.prefersMode !== mode);
      const matches = (pref.prefersPart === part) || (pref.prefersMode && pref.prefersMode === mode);
      let p, basis;
      if (volunteered) { p = A.pAccept.volunteered; basis = cmt.status === 'surplus' ? `already said yes to this hearing (message ${cmt.source})` : `volunteered for this hearing (message ${cmt.source})`; }
      else if (stated) { p = A.pAccept.statedFree; basis = `said that ${part} is free (message ${stated.source})`; }
      else if (sameOffice) { p = A.pAccept.sameOfficeSameDay; basis = `already has ${sameDay.filter((m) => m.county === c.county).length} hearing(s) at ${c.county} that day`; }
      else if (against) { p = A.pAccept.againstPreference; basis = `roster note: "${k.availability}"`; }
      else if (matches) { p = A.pAccept.matchesPreference; basis = `roster note: "${k.availability}"`; }
      else { p = A.pAccept.unknown; basis = k.calendar_access === 'None' ? 'no calendar access, availability unknown' : `calendar access: ${k.calendar_access.toLowerCase()}, no entry seen`; }
      const ownTrip = mode === 'in_person' && !sameOffice && !volunteered;
      if (ownTrip) p *= A.ownTripFactor;
      const risk = (1 - p) * retry;
      const thread = sameOffice ? 0 : A.newThreadCost;
      reasons.push(`Fee $${k.rate}`);
      reasons.push(`Chance of yes ${Math.round(p * 100)}%: ${basis}${ownTrip ? ', and it needs its own trip' : ''}`);
      reasons.push(`A failed offer costs about $${retry} at this urgency, so risk adds $${risk.toFixed(0)}`);
      if (thread) reasons.push(`New consultant at this office that day: +$${thread} coordination`);
      return { id: k.id, name: k.first, feasible: !blockers.length, blockers, fee: k.rate, p, risk, thread, score: k.rate + risk + thread, reasons, sameOffice, noticeBy: k.notice_preference };
    }).sort((x, y) => (y.feasible - x.feasible) || (x.score - y.score));

    return { ...slot, hoursLeft, retry, candidates, bind, workLeft, broadcast: workLeft < A.broadcastUnderWorkingHours };
  });

  // Exact search over all open hearings together: lowest total expected cost with no double-booking.
  const order = slots.map((s, i) => i).sort((a, b) => (slots[a].date + String(slots[a].start).padStart(4, '0')).localeCompare(slots[b].date + String(slots[b].start).padStart(4, '0')));
  let best = { cost: Infinity, pick: [] };
  const lower = order.map((i) => Math.min(A.unassignedCost, ...slots[i].candidates.filter((k) => k.feasible).map((k) => k.fee + k.risk)));
  const suffix = lower.map((_, i) => lower.slice(i).reduce((x, y) => x + y, 0)).concat([0]);
  const pick = new Array(slots.length).fill(null);
  const added = {};   // consultant -> slots added in this plan
  const walk = (n, cost) => {
    if (cost + suffix[n] >= best.cost) return;
    if (n === order.length) { best = { cost, pick: [...pick] }; return; }
    const s = slots[order[n]];
    for (const k of s.candidates) {
      if (!k.feasible) continue;
      const mine = added[k.id] || [];
      const pb = books[s.county];
      if (mine.some((m) => clash(m, s, pb))) continue;
      const cap = dir.consultantById[k.id].max_per_day;
      const dayCount = (busyCount(k.id, s.date)) + mine.filter((m) => m.date === s.date).length;
      if (dayCount + 1 > cap) continue;
      const sharesThread = mine.some((m) => m.date === s.date && m.county === s.county);
      pick[order[n]] = k.id;
      (added[k.id] = mine).push(s);
      walk(n + 1, cost + k.fee + k.risk + (sharesThread ? 0 : k.thread));
      mine.pop();
    }
    pick[order[n]] = null;
    walk(n + 1, cost + A.unassignedCost);
  };
  const busyCount = (id, date) => (cal[id] || []).filter((m) => m.date === date).length;
  walk(0, 0);

  return {
    total: best.cost,
    plans: slots.map((s, i) => ({ caseId: s.caseId, county: s.county, date: s.date, hoursLeft: s.hoursLeft, retry: s.retry, broadcast: s.broadcast, bind: s.bind, workLeft: s.workLeft, pick: best.pick[i], candidates: s.candidates })),
    name,
  };
}
