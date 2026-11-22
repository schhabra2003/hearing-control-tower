// Two-reader cross-check: "two keys to close, one key to open".
//
// The two ways a reader can be wrong do not cost the same. A missed or held-back claim costs a
// reminder or one look by a person. A false claim that CLOSES something (an official date, a
// consultant's yes, a recorded representative, a processed withdrawal) can cost a hearing.
// So a claim that can close a gate, set an official fact, mark a step as done, end a follow-up
// or stand someone down is applied only when two independent readers produce it for the same
// case with the same key details. A claim that only opens work (a flag, a request, a question)
// is applied when either reader produces it. Whatever is held back is returned as `disputed`
// and goes to a person: nothing is dropped silently.
//
// Pure module: no Node imports. The two readers can be any two of: the AI reader, a second AI
// reader with different instructions or a different model, recorded reads, the offline rules
// reader. Both lists must already have passed normalizeClaims (prompt.js).

import { TYPE_LIST } from '../model.js';
import { normalizeClaims, looksLikeInstructions } from './prompt.js';

const SCHEDULE = ['hearing_scheduled', 'hearing_confirmed', 'schedule_changed'];

// Every claim type that always needs two keys, with the reason. Each reason was checked against
// what the type writes in ledger.js and what derive.js and plan.js do with it.
// keys: the details both readers must agree on, besides the case. A '*' means the value is
// resolved first: a missing date or time means "the current official one", a missing kind
// means "the first open obligation", a missing consultant means the consultant who wrote the
// message. Two readings agree when they would WRITE the same thing.
export const CLOSING = {
  hearing_scheduled: { keys: ['date*', 'time*'], why: 'Sets the official date and time (gate G1). A wrong one sends the consultant to the wrong slot. The room and the mode each need their own two keys.' },
  hearing_confirmed: { keys: ['date*', 'time*'], why: 'With a date or time it rewrites the official schedule exactly like a notice. Without one it still settles a disputed move and closes open leads about the schedule.' },
  schedule_changed: { keys: ['date*', 'time*'], why: 'Moves the official date, time or room, and makes every earlier acceptance stale.' },
  hearing_postponed: { keys: [], why: 'Takes the hearing off the calendar: staffing, recording and packets stop (G2 to G4 no longer apply) and the booked consultant is told not to attend.' },
  change_denied: { keys: [], why: 'Ends a request to move a hearing: the system stops waiting for the office and tells the consultant the move was refused.' },
  rep_recorded: { keys: ['consultant'], why: 'Closes gate G3: the office has this person on its record as representative.' },
  consultant_accepted: { keys: ['consultant*', 'date*', 'time*'], why: 'Closes gate G2 and releases every other open offer for the hearing (first yes wins). A second yes makes the system tell that person to stand down.' },
  consultant_conditional: { keys: ['consultant*', 'date'], why: 'Half of a commitment: with a calendar entry on the same date it closes G2 by itself once the office moves the hearing to that date.' },
  coverage_offered: { keys: ['consultant*', 'date*', 'time*'], why: 'Leads to a one-click "confirm the assignment" that closes G2 without another word from the consultant.' },
  packet_received: { keys: ['consultant*'], why: 'Closes a half of gate G4: the clerk or the consultant has the current packet.' },
  obligation_cleared: { keys: ['kind*'], why: 'Closes gate G5. For a withdrawal it also takes the hearing off the schedule and releases the consultant.' },
  withdrawal_cancelled: { keys: [], why: 'Closes a withdrawal as not processed: the appeal is treated as active and nothing more is chased.' },
  homeowner_confirmed: { keys: [], why: 'Ends the call-back task and lets the firm confirm a withdrawal to the office, which cannot be undone.' },
  homeowner_declined: { keys: [], why: 'Ends the call-back task and makes the firm tell the office not to process the request.' },
  outcome_reported: { keys: ['consultant*', 'result'], why: 'Moves the case to "after the hearing", where gates G2 to G4 no longer apply. Applied to a hearing that has not taken place, it would hide that hearing.' },
  document_submitted: { keys: ['kind*', 'consultant* (staffing details, or a document a consultant signed)'], why: 'Marks a step as sent: the system stops proposing to send it and waits for the office instead. Where a county counts "sent on time" as proof, a packet send closes the clerk half of G4.' },
};
// Needs two keys only in the stated situation.
export const CONDITIONAL = {
  calendar_edited: { when: 'the date in the calendar equals the official date of the case', keys: ['date', 'consultant*'], why: 'An agreeing calendar entry clears a calendar mismatch and, after a conditional yes, counts as the commitment that closes G2. An entry that disagrees with the official date only raises a mismatch, so one key is enough for it.' },
};
export const CLOSING_TYPES = TYPE_LIST.filter((t) => CLOSING[t]);
// What a second reader must look for (prompt.js, variant 'second').
export const TWO_KEY_TYPES = TYPE_LIST.filter((t) => CLOSING[t] || CONDITIONAL[t]);
export const OPENING_TYPES = TYPE_LIST.filter((t) => !CLOSING[t]);
export const isClosing = (type) => !!CLOSING[type];

// Does this claim, for this case, need two keys? env.facts is ctx.facts from engine.prepare.
export function needsTwoKeys(claim, caseId, env = {}, closing = CLOSING_TYPES) {
  if (closing.includes(claim.type)) return true;
  if (claim.type === 'calendar_edited' && env.agreeingCalendar !== false) {
    const fact = (env.facts || {})[caseId];
    return !!(claim.date && fact && fact.date === claim.date);
  }
  return false;
}

// The key details of a two-key claim for one case, as [name, value] pairs: exactly the values
// the ledger would write. env.sender is { role, consultant } of the message (optional): the
// ledger takes "who" from the claim, or else from a consultant who wrote the message.
export function closingKey(claim, id, env = {}) {
  const fact = (env.facts || {})[id] || {};
  const sender = env.sender || {};
  const who = claim.consultant || (sender.role === 'consultant' ? sender.consultant : '') || '';
  const slot = [['date', claim.date || fact.date || ''], ['time', claim.time || fact.time || '']];
  switch (claim.type) {
    case 'hearing_scheduled': case 'hearing_confirmed': case 'schedule_changed': return slot;
    case 'rep_recorded': return [['consultant', claim.consultant || '']];
    case 'packet_received': return sender.role && sender.role !== 'consultant' ? [] : [['consultant', who]];   // an office's receipt names nobody
    case 'consultant_accepted': case 'coverage_offered': return [['consultant', who], ...slot];
    case 'consultant_conditional': return [['consultant', who], ['date', claim.date || '']];
    case 'calendar_edited': return [['date', claim.date || ''], ['consultant', who]];
    case 'obligation_cleared': return [['kind', claim.kind || ((env.openObligations || {})[id] || [])[0] || '']];
    case 'outcome_reported': return [['consultant', who], ['result', claim.result || 'other']];
    case 'document_submitted': {
      const kind = claim.kind || 'packet';
      if (kind === 'staffing' || kind === 'staffing_form') return [['kind', kind], ['consultant', claim.consultant || '']];   // who the firm named
      if (kind !== 'packet' && sender.role === 'consultant') return [['kind', kind], ['consultant', who]];                    // who signed
      return [['kind', kind]];
    }
    default: return [];
  }
}

const one = (claim, id) => ({ ...claim, cases: [id] });
const fieldsOf = (claim) => Object.keys(claim).filter((k) => !['type', 'cases', 'quote'].includes(k)).sort();
const sig = (claim) => JSON.stringify([claim.type, fieldsOf(claim).map((k) => [k, claim[k]])]);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const differ = (a, b) => {
  const out = [];
  a.forEach(([k, v], i) => { const w = b[i] ? b[i][1] : ''; if (w !== v) out.push(`${k}: ${v || 'not stated'} against ${w || 'not stated'}`); });
  return out.join('; ') || 'the details differ';
};
const familyOf = (type) => (SCHEDULE.includes(type) ? 'schedule' : type);
// Two opening claims of one type are about the same thing unless they name different documents or people.
const sameSubject = (a, b) => !(a.kind && b.kind && a.kind !== b.kind) && !(a.consultant && b.consultant && a.consultant !== b.consultant);

// primary, secondary: lists of claims (each already through normalizeClaims).
// opts.facts: { [caseId]: { date, time, room?, mode? } }, the official schedule when the message
//             arrived (ctx.facts from engine.prepare; factsFor(engine, ids) adds room and mode).
// opts.openObligations: ctx.openObligations.
// opts.sender: { role, consultant } of the message, so that "who" is resolved as the ledger does.
// opts.closing: override the list of types that always need two keys.
// Returns { claims, disputed: [{ claim, by: 'primary' | 'secondary' | 'both', reason, other? }], notes: [text] }.
//   claims:   what may go on to the verifier.
//   disputed: closing claims that did not get two keys. Not applied. A person looks.
//   notes:    smaller decisions (a deadline taken from one reader, a field left out).
export function crossCheck(primary, secondary, opts = {}) {
  const env = { facts: opts.facts || {}, openObligations: opts.openObligations || {}, agreeingCalendar: opts.agreeingCalendar, sender: opts.sender || null };
  const closing = opts.closing || CLOSING_TYPES;
  const units = (list) => (list || []).flatMap((claim, i) => (claim.cases || []).map((id) => ({ claim, i, id, two: needsTwoKeys(claim, id, env, closing), used: false })));
  const A = units(primary), B = units(secondary);
  const applied = [], disputed = [], notes = [];
  const say = (text) => { if (!notes.includes(text)) notes.push(text); };

  for (const a of A) {
    // ---- two keys to close
    if (a.two) {
      const cands = B.filter((b) => b.id === a.id && familyOf(b.claim.type) === familyOf(a.claim.type));
      const strong = cands.filter((b) => b.two);
      const ka = closingKey(a.claim, a.id, env);
      const hits = strong.filter((b) => same(closingKey(b.claim, b.id, env), ka));
      const hit = hits.find((b) => b.claim.type === a.claim.type) || hits[0];
      if (!hit) {
        if (!cands.length) { disputed.push({ claim: one(a.claim, a.id), by: 'primary', reason: 'Only the first reader found it.' }); continue; }
        // The second reader read the same thing differently. Its closing version is not applied
        // either. A version of it that only opens work stays in play and is applied below.
        for (const b of strong) b.used = true;
        const other = strong[0] || cands[0];
        disputed.push({ claim: one(a.claim, a.id), other: one(other.claim, a.id), by: 'both', reason: `The two readers disagree (${differ(ka, closingKey(other.claim, a.id, env))}).` });
        continue;
      }
      for (const b of hits) b.used = true;
      const out = one(a.claim, a.id);
      if (familyOf(a.claim.type) === 'schedule') {
        // The slot has its two keys. The room and the mode are separate facts: each needs its own.
        // A reader may spread one statement over two claims ("room D instead of B" and "the times
        // are unchanged"), so all of a reader's schedule claims for the case are looked at together.
        const fact = env.facts[a.id] || {};
        const mine = A.filter((x) => x.two && x.id === a.id && familyOf(x.claim.type) === 'schedule');
        for (const k of ['room', 'mode']) {
          const pv = a.claim[k], fv = fact[k];
          const theirs = [...new Set(hits.map((b) => b.claim[k]).filter((v) => v !== undefined))];
          if (pv !== undefined && pv !== fv && !theirs.includes(pv)) {
            delete out[k];
            disputed.push({ claim: { type: a.claim.type, cases: [a.id], quote: a.claim.quote, [k]: pv }, by: theirs.length ? 'both' : 'primary',
              reason: `The date and time have two keys, the ${k} does not (${pv} against ${theirs.length ? theirs.join(', ') : 'not stated'}). The ${k} was not applied.` });
          }
          for (const sv of theirs) {
            if (sv === fv || mine.some((x) => x.claim[k] === sv)) continue;
            const from = hits.find((b) => b.claim[k] === sv);
            const d = { claim: { type: from.claim.type, cases: [a.id], quote: from.claim.quote, [k]: sv }, by: 'secondary', reason: `Only the second reader found a ${k} (${sv}). It was not applied.` };
            if (!disputed.some((x) => x.by === 'secondary' && x.reason === d.reason && x.claim.cases[0] === a.id)) disputed.push(d);
          }
        }
        // "The homeowner asked for this" opens a call-back: one key is enough.
        if (!out.homeowner_initiated && hits.some((b) => b.claim.homeowner_initiated)) { out.homeowner_initiated = true; say(`${a.claim.type} for ${a.id}: only the second reader says the homeowner asked for this. The call-back to the homeowner is opened.`); }
      }
      applied.push({ claim: out, src: 'a', i: a.i });
      continue;
    }

    // ---- one key to open
    const out = one(a.claim, a.id);
    const mates = B.filter((b) => !b.two && b.id === a.id && b.claim.type === a.claim.type && sameSubject(a.claim, b.claim));
    for (const b of mates) {
      b.used = true;
      const s = b.claim;
      for (const k of fieldsOf(s)) {
        if (k === 'version') continue;
        if (out[k] === undefined) {
          out[k] = s[k];
          if (k === 'deadline') say(`${out.type} for ${a.id}: only the second reader found a deadline (${s[k]}). It is used.`);
        } else if (out[k] !== s[k]) {
          if (k === 'deadline') { const early = s[k] < out[k] ? s[k] : out[k]; say(`${out.type} for ${a.id}: the readers give two deadlines (${out[k]} and ${s[k]}). The earlier one is used.`); out[k] = early; }
          else say(`${out.type} for ${a.id}: the readers differ on ${k} (${out[k]} against ${s[k]}). The first reader's value is used.`);
        }
      }
    }
    // The current packet version is a fact, not a flag: it needs both readers.
    if (out.type === 'packet_version_issue' && out.version && !mates.some((b) => b.claim.version === out.version)) {
      say(`packet_version_issue for ${a.id}: only one reader states the current version (${out.version}). The version was left out; the flag stands.`);
      delete out.version;
    }
    applied.push({ claim: out, src: 'a', i: a.i });
  }

  // ---- what only the second reader found
  for (const b of B) {
    if (b.used) continue;
    if (b.two) { disputed.push({ claim: one(b.claim, b.id), by: 'secondary', reason: 'Only the second reader found it.' }); continue; }
    if (b.claim.type === 'internal_note') continue;          // a note opens nothing; it would only hide "nothing was recognised"
    const add = one(b.claim, b.id);
    if (add.type === 'packet_version_issue' && add.version) delete add.version;
    applied.push({ claim: add, src: 'b', i: b.i });
    say(`${b.claim.type} for ${b.id}: found by the second reader only. Applied, because it only opens work.`);
  }

  // Put cases with identical details back into one claim, in the first reader's order.
  const groups = new Map();
  for (const u of applied) {
    const k = `${u.src}|${u.i}|${sig(u.claim)}`;
    if (!groups.has(k)) groups.set(k, { ...u.claim, cases: [] });
    groups.get(k).cases.push(u.claim.cases[0]);
  }
  const merged = [];
  for (const d of disputed) {
    const prev = merged.find((m) => m.by === d.by && m.reason === d.reason && sig(m.claim) === sig(d.claim) && m.claim.quote === d.claim.quote && (!m.other) === (!d.other) && (!m.other || sig(m.other) === sig(d.other)));
    if (prev) { prev.claim = { ...prev.claim, cases: [...prev.claim.cases, ...d.claim.cases] }; if (prev.other) prev.other = { ...prev.other, cases: [...prev.other.cases, ...d.other.cases] }; }
    else merged.push({ ...d });
  }
  return { claims: [...groups.values()], disputed: merged, notes };
}

// ---- the reading pipeline ------------------------------------------------------------------------
// prepare -> reader(s) -> normalizeClaims -> crossCheck -> engine.commit, and a task for a person
// for everything that was not applied.

// Official facts for the cross-check, including room and mode (engine.prepare gives date and time).
export function factsFor(engine, caseIds) {
  const out = {};
  for (const id of caseIds || []) {
    const s = engine.state.cases[id] && engine.state.cases[id].schedule;
    if (s) out[id] = { date: s.date, time: s.time, room: s.room, mode: s.mode || undefined };
  }
  return out;
}

const listOf = (r) => (Array.isArray(r) ? r : r && Array.isArray(r.claims) ? r.claims : null);
const extraOf = (r, k) => (r && Array.isArray(r[k]) ? r[k] : []);
const label = (claim) => `${String(claim.type).replace(/_/g, ' ')} for ${(claim.cases || []).join(', ')}`;

// Reasons for a person to look at a message, in plain words.
export function attentionFrom({ dropped = [], disputed = [], unclassified = [], body = null, failures = [] } = {}) {
  const why = [...failures];
  for (const d of dropped) why.push(`Part of the reading was not used: ${d.reason}`);
  for (const d of disputed) why.push(`Held back, not applied: ${label(d.claim)}. ${d.reason}`);
  for (const u of unclassified) why.push(`The reader could not classify a passage${u.quote ? `: "${u.quote}"` : ''}${u.note ? ` (${u.note})` : ''}.`);
  const inj = body === null ? null : looksLikeInstructions(body);
  if (inj) why.push(`The message contains text addressed to an automated reader ("${inj}"). It was treated as text, not as an instruction.`);
  return [...new Set(why)];
}

// Guard and cross-check two reader outputs without touching the engine. `first` and `second` are
// what a reader returned: a list of claims, or { claims, unclassified, dropped }. `second` may be
// null (no cross-check). Pass opts.facts from factsFor to include room and mode.
export function settleRead(msg, dir, ctx, first, second = null, opts = {}) {
  const a = normalizeClaims({ claims: listOf(first), unclassified: extraOf(first, 'unclassified') }, msg, dir, ctx, opts.guard);
  const seen = new Set(a.dropped.map((d) => d.reason));
  let dropped = [...a.dropped, ...extraOf(first, 'dropped').filter((d) => d && d.reason && !seen.has(d.reason))];
  let claims = a.claims, disputed = [], notes = [...a.fixed];
  const crossChecked = second !== null && second !== undefined;
  if (crossChecked) {
    const b = normalizeClaims({ claims: listOf(second), unclassified: [] }, msg, dir, ctx, opts.guard);
    const x = crossCheck(a.claims, b.claims, { facts: opts.facts || ctx.facts, openObligations: ctx.openObligations, sender: { role: msg.role, consultant: msg.consultant }, closing: opts.closing, agreeingCalendar: opts.agreeingCalendar });
    claims = x.claims; disputed = x.disputed; notes = notes.concat(b.fixed, x.notes);
    dropped = dropped.concat([...b.dropped, ...extraOf(second, 'dropped')].filter((d) => d && d.reason).map((d) => ({ ...d, reason: `(second reader) ${d.reason}` })));
  }
  return { claims, disputed, dropped, notes, unclassified: a.unclassified, crossChecked, first: a.claims };
}

// After the readers have answered: guard, cross-check, commit, and make sure a person sees
// everything that was not applied.
export function finishRead(engine, msg, ctx, first, second = null, opts = {}) {
  const r = settleRead(msg, engine.dir, ctx, first, second, { ...opts, facts: { ...(ctx.facts || {}), ...factsFor(engine, ctx.caseIds) } });
  const entry = engine.commit(msg, r.claims, { reader: opts.label || 'reader' });
  // engine.commit returns the entry it stored in state.messages. The planner turns every message
  // that has an attention reason into a task for a person, so reasons added here are not lost.
  const extra = attentionFrom({ dropped: r.dropped, disputed: r.disputed, unclassified: r.unclassified, failures: opts.failures || [], body: opts.checkInstructions === false ? null : msg.body });
  for (const why of extra) if (!entry.attention.includes(why)) entry.attention.push(why);
  entry.reading = { dropped: r.dropped, disputed: r.disputed, unclassified: r.unclassified, notes: r.notes, crossChecked: r.crossChecked };
  return entry;
}

const nameOf = (reader, fallbackName) => (reader && reader.label) || fallbackName;
const hasTwoKeyType = (out) => (listOf(out) || []).some((c) => c && TWO_KEY_TYPES.includes(String(c.type || '').toLowerCase()));

// One message through the whole pipeline. `reader` and `second` are functions
// (msg, dir, ctx) => claims or { claims, ... }, synchronous or returning a promise.
// opts.fallback:   a synchronous reader (the rules reader) used when a reader fails. The failure
//                  is added to the reasons for a person to look.
// opts.secondWhen: 'always' (default) asks the second reader for every message, so that a closing
//                  claim the first reader MISSED also reaches a person. 'closing' asks it only
//                  when the first reading contains a two-key claim: no false closing can get
//                  through either way, and most messages then cost one request, not two.
export async function readMessage(engine, raw, { reader, second = null, fallback = null, secondWhen = 'always', label: name, ...opts } = {}) {
  const { msg, ctx } = engine.prepare(raw);
  if (msg.resolvedBy === 'none') return finishRead(engine, msg, ctx, [], null, { ...opts, label: name || nameOf(reader, 'reader') });
  const failures = [];
  const run = async (fn, role) => {
    try { const out = await fn(msg, engine.dir, ctx); return { out, label: nameOf(fn, role) }; }
    catch (e) {
      if (!fallback) throw e;
      failures.push(`The ${role} could not read this message (${e && e.message ? e.message : e}). The offline pattern reader was used in its place.`);
      return { out: fallback(msg, engine.dir, ctx), label: nameOf(fallback, 'rules') };
    }
  };
  let first, other = null;
  if (second && secondWhen === 'closing') {
    first = await run(reader, 'reader');
    if (hasTwoKeyType(first.out)) other = await run(second, 'second reader');
  } else [first, other] = await Promise.all([run(reader, 'reader'), second ? run(second, 'second reader') : null]);
  // With 'closing' and no two-key claim there is nothing to cross-check: the reading goes on as it is.
  const entry = finishRead(engine, msg, ctx, first.out, other ? other.out : null, { ...opts, failures, label: name || `${first.label}${other ? ` + ${other.label}` : ''}` });
  entry.reading.usage = [first, other].filter((r) => r && r.out && !Array.isArray(r.out) && r.out.usage).map((r) => ({ reader: r.label, model: r.out.model || null, usage: r.out.usage, costUsd: r.out.costUsd ?? null, ms: r.out.ms ?? null }));
  return entry;
}

// The same for readers that answer at once (rules, recorded reads). Used for offline replays,
// in Node and in the browser.
export function readMessageSync(engine, raw, { reader, second = null, label: name, ...opts } = {}) {
  const { msg, ctx } = engine.prepare(raw);
  if (msg.resolvedBy === 'none') return finishRead(engine, msg, ctx, [], null, { ...opts, label: name || nameOf(reader, 'reader') });
  const first = reader(msg, engine.dir, ctx);
  const firstLabel = nameOf(reader, 'reader');          // read after the call: a recorded reader names the path that answered
  const other = second ? second(msg, engine.dir, ctx) : null;
  return finishRead(engine, msg, ctx, first, second ? other : null, { ...opts, label: name || `${firstLabel}${second ? ` + ${nameOf(second, 'second reader')}` : ''}` });
}
