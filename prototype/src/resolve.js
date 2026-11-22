// RESOLVE stage: map a raw message to entities (sender role, county, cases, consultants).
// Rule: a case match needs two independent keys (street number + street name inside a
// known thread, or an explicit case id). Anything else falls back to the thread's cases
// and is marked as an inferred scope so a human can see it.

import { norm } from './text.js';

export function buildDirectory(packet) {
  const cases = packet.cases.map((c) => {
    const [street] = c.property.split(',');
    const m = street.trim().match(/^(\d+)\s+(.+)$/);
    return { ...c, number: m[1], street: m[2], streetNorm: norm(m[2]) };
  });
  const consultants = packet.consultants.map((c) => ({
    ...c,
    id: c.consultant_id,
    first: c.name.split(' ')[0],
    max_per_day: +c.max_hearings_per_day,
    rate: +c.rate_per_hearing,
    eligible: Array.isArray(c.eligible_counties) ? c.eligible_counties : [c.eligible_counties],
    availability: Array.isArray(c.availability_note) ? c.availability_note.join('; ') : c.availability_note,
  }));
  return {
    cases,
    consultants,
    counties: packet.counties,
    caseById: Object.fromEntries(cases.map((c) => [c.case_id, c])),
    consultantById: Object.fromEntries(consultants.map((c) => [c.id, c])),
  };
}

function byName(dir, sender) {
  if (/hearing office/i.test(sender)) {
    const county = sender.replace(/\s*hearing office/i, '').trim();
    return { role: 'government', county };
  }
  if (/operations|law firm/i.test(sender)) return { role: 'firm' };
  const c = dir.consultants.find((x) => norm(x.name) === norm(sender) || norm(sender).startsWith(norm(x.first)));
  if (c) return { role: 'consultant', consultant: c.id };
  const h = dir.cases.find((x) => norm(x.homeowner) === norm(sender));
  if (h) return { role: 'homeowner', homeowner: h.homeowner };
  return { role: 'unknown' };
}

// Who is speaking? The packet gives display names only, so a name is accepted as given. When a
// message carries an address, the address decides: a display name that claims to be an office
// or a consultant but comes from another address has no authority. In production the address
// check is SPF, DKIM and DMARC plus the allow-list in the county playbook and the roster.
export function senderRole(dir, sender, address) {
  const named = byName(dir, sender);
  if (!address) return named;
  const a = String(address).toLowerCase().trim();
  const county = dir.counties.find((c) => String(c.office_email).toLowerCase() === a);
  const consultant = dir.consultants.find((c) => String(c.email).toLowerCase() === a);
  if (county) return { role: 'government', county: county.county };
  if (consultant) return { role: 'consultant', consultant: consultant.id };
  if (named.role === 'firm') return named;                     // the firm's own system; its domain is not in the packet
  if (named.role === 'homeowner') return named;                // the packet holds no homeowner address, and a homeowner's message never has an effect by itself
  if (named.role === 'unknown') return named;
  return { role: 'unknown', claimed: named, mismatch: true };   // claims a known identity from an unknown address
}

// Thread cases: in production this is the email thread / case link. In the packet it is
// the example's header line listing the properties.
export function threadCases(dir, properties) {
  const ids = [];
  for (const p of properties) {
    const c = dir.cases.find((x) => norm(x.property) === norm(p));
    if (c) ids.push(c.case_id);
  }
  return ids;
}

export function findConsultants(dir, s) {
  const out = [];
  for (const c of dir.consultants) {
    const re = new RegExp(`\\b${c.first}\\b`);
    if (re.test(s)) out.push(c.id);
  }
  return out;
}

// Which of the thread's cases does this sentence talk about?
// ctx: { caseIds, facts: { [caseId]: { date, time } } }  (facts = current official schedule)
// Returns { ids, explicit }.
export function casesInSentence(dir, s, ctx) {
  const pool = ctx.caseIds.map((id) => dir.caseById[id]);
  const hit = new Set();
  const lower = s.toLowerCase();

  // explicit case ids
  for (const m of s.matchAll(/\bAX-\d{3}\b/g)) if (dir.caseById[m[0]]) hit.add(m[0]);

  // "14 Willow Lane", "14 and 28 Willow Lane", "102 and 118 Willow Lane"
  for (const c of pool) {
    const street = c.street.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const direct = new RegExp(`\\b${c.number}\\s+${street}\\b`, 'i');
    const paired = new RegExp(`\\b${c.number}\\s+and\\s+\\d+\\s+${street}\\b`, 'i');
    if (direct.test(s) || paired.test(s)) hit.add(c.case_id);
  }
  if (hit.size) return { ids: [...hit], explicit: true };

  // "both", "either case", "these hearings" => whole thread
  if (/\b(both|either|all)\b/.test(lower)) return { ids: [...ctx.caseIds], explicit: true };

  return { ids: [...ctx.caseIds], explicit: false };
}

// Narrow by a time-of-day reference ("the 9:30 a.m. case", "the morning hearing").
export function narrowByTime(dir, ids, ctx, { hhmm, part, date }) {
  // Only the ledger's current official schedule is used here, never the legacy case record.
  const fact = (id) => ctx.facts?.[id] || {};
  let out = ids;
  if (hhmm) out = out.filter((id) => fact(id).time === hhmm);
  if (part === 'morning') out = out.filter((id) => fact(id).time && fact(id).time < '12:00');
  if (part === 'afternoon') out = out.filter((id) => fact(id).time && fact(id).time >= '12:00');
  if (date) out = out.filter((id) => fact(id).date === date);
  return out;
}
