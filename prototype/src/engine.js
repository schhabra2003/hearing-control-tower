// The engine: INGEST -> RESOLVE -> EXTRACT -> VERIFY -> RECONCILE, then DERIVE and PLAN.
// It runs unchanged in Node and in the browser. State is rebuilt only from messages, so the
// whole history can be replayed with a different reader and compared.

import { buildDirectory, senderRole, threadCases } from './resolve.js';
import { createState, applyClaim, claimOrder } from './ledger.js';
import { verifyClaim, mentionsCase } from './verify.js';
import { deriveCase } from './derive.js';
import { resolvePlaybooks, proposeChange, applyChange } from './playbook.js';
import { planActions, applyOutbound } from './plan.js';
import { localParts } from './time.js';
import { isWritten, isVerbal } from './model.js';
import { tidy } from './text.js';

// Nothing is dropped silently. An incoming message that the system could not use in full goes
// to a person, with the reasons. The firm's own outgoing messages are not checked, but a phone
// note is: it carries what someone told the firm.
const LEAD_TYPES = ['schedule_changed', 'hearing_scheduled', 'hearing_confirmed'];
export function attentionFor(msg, claims) {
  if (msg.direction !== 'in' && !msg.verbal) return [];
  const why = [];
  if (msg.resolvedBy === 'none') why.push('No case could be matched to this message.');
  if (msg.spoofSuspected) why.push('The display name is one the firm knows, but the address is not the one on file.');
  else if (msg.role === 'unknown') why.push('The sender is not a known office, consultant or staff address.');
  if (msg.role === 'homeowner') why.push('A homeowner wrote to the firm. Homeowners are answered by a person, on the number on file.');
  for (const c of claims) if (c.disposition === 'rejected') why.push(`A reading failed the checks: ${c.reason}`);
  if (msg.askedUnclear && !claims.some((c) => c.effects && c.effects.length)) why.push('Two questions to this consultant are open, so a short answer could belong to either one.');
  if (msg.resolvedBy !== 'none' && !claims.length) why.push('Nothing in this message was recognised.');
  if (claims.some((c) => c.person)) why.push('A consultant who holds a hearing wrote about it in words that are not a plain yes. Nothing was changed.');
  // A lead about the schedule has its own follow-up (the office is asked). Other statements from
  // a party with no authority over them have none, so a person looks.
  // A lead that only repeats the official record needs nobody. A held claim (the right party, but
  // not a plain statement) keeps its gate open, and the gate's own follow-up continues.
  const loose = claims.filter((c) => c.disposition === 'signal' && !c.settled && !(LEAD_TYPES.includes(c.type) && c.date));
  if (loose.length && !why.length) why.push(`${loose.length === 1 ? 'One statement comes' : `${loose.length} statements come`} from a party with no authority over ${loose.length === 1 ? 'it' : 'them'}.`);
  return [...new Set(why)];
}

export function createEngine({ packet, playbooks, reader }) {
  const dir = buildDirectory(packet);
  const layers = JSON.parse(JSON.stringify(playbooks));
  let books = resolvePlaybooks(layers);
  const state = createState(dir, packet);

  // RESOLVE: who sent this, and which cases is it about?
  function prepare(raw) {
    const who = senderRole(dir, raw.sender, raw.address);
    let caseIds = raw.caseIds || threadCases(dir, raw.properties || []);
    let resolvedBy = 'thread';
    if (!caseIds.length) {
      // No thread link: fall back to cases named in the text (address or case id), limited to
      // the sender's county when the sender is an office.
      caseIds = dir.cases.filter((c) => mentionsCase(dir, raw.body, c.case_id) && (who.role !== 'government' || c.county === who.county)).map((c) => c.case_id);
      resolvedBy = caseIds.length ? 'text' : 'none';
      if (!caseIds.length && who.role === 'homeowner') {
        caseIds = dir.cases.filter((c) => c.homeowner === who.homeowner).map((c) => c.case_id);   // a homeowner writes about their own cases
        resolvedBy = caseIds.length ? 'homeowner' : 'none';
      }
    }
    const ts = typeof raw.at === 'number' ? raw.at : Date.parse(raw.at);
    // The yes/no question this consultant has open, as the numbered list they were sent. A reply
    // with no thread and no case named is read as the answer to it. Two open questions from two
    // different messages make a bare "yes" unclear, so then nothing is assumed.
    let asked = [], askedUnclear = false;
    if (who.role === 'consultant') {
      let open = [];
      for (const rec of dir.cases) {
        const q = state.cases[rec.case_id].asks[who.consultant];
        if (q && !q.answered && q.at <= ts && (!q.slot || !q.slot.date || Date.parse(`${q.slot.date}T23:59:00Z`) >= ts - 12 * 3600e3)) open.push({ id: rec.case_id, n: q.n, source: q.source });
      }
      if (caseIds.length) open = open.filter((q) => caseIds.includes(q.id));
      const sources = new Set(open.map((q) => q.source));
      if (sources.size === 1) asked = open.sort((x, y) => x.n - y.n).map(({ id, n }) => ({ id, n }));
      else if (sources.size > 1) askedUnclear = true;
      if (!caseIds.length && asked.length) { caseIds = asked.map((q) => q.id); resolvedBy = 'question'; }
    }
    const msg = {
      id: raw.id, at: raw.at, ts, sender: raw.sender, address: raw.address || null, channel: raw.channel, body: raw.body,
      role: who.role, county: who.county || null, consultant: who.consultant || null, homeowner: who.homeowner || null,
      claimed: who.claimed || null, spoofSuspected: !!who.mismatch,
      caseIds, resolvedBy, askedUnclear, written: isWritten(raw.channel), verbal: isVerbal(raw.channel), direction: raw.direction || (who.role === 'firm' ? 'out' : 'in'),
    };
    const facts = {}, openObligations = {};
    for (const id of caseIds) {
      const c = state.cases[id];
      if (c.schedule) facts[id] = { date: c.schedule.date, time: c.schedule.time };
      openObligations[id] = c.obligations.filter((o) => o.status !== 'cleared').map((o) => o.kind);
    }
    return { msg, ctx: { caseIds, facts, openObligations, asked, askedUnclear } };
  }

  const issuesAt = (now) => {
    const map = new Map();
    for (const rec of dir.cases) {
      const c = state.cases[rec.case_id];
      for (const i of deriveCase(c, { now, pb: books[c.county], dir, drift: state.drift[c.county] }).issues) map.set(i.key, i);
    }
    return map;
  };
  const readinessAt = (now) => Object.fromEntries(dir.cases.map((rec) => {
    const c = state.cases[rec.case_id];
    return [rec.case_id, deriveCase(c, { now, pb: books[c.county], dir, drift: state.drift[c.county] }).readiness];
  }));

  // VERIFY + RECONCILE: apply claims that pass, in a fixed order, and report what changed.
  // What the firm is waiting for from the sender of a message, about the hearings in its thread.
  function awaitedFrom(msg) {
    const mine = (i) => i.phase === 'waiting' && i.cases.some((id) => msg.caseIds.includes(id)) && i.to
      && ((msg.role === 'consultant' && i.to.id === msg.consultant) || (msg.role === 'government' && i.to.kind === 'office' && dir.caseById[i.cases[0]].county === msg.county));
    const open = plan(msg.ts).items.filter(mine);
    return open.length ? open.map((i) => i.title.replace(/^Waiting: /, '')).slice(0, 2).join('; ') : null;
  }

  function commit(msg, claims, meta = {}) {
    if (claims.some((c) => c.type === 'acknowledgement')) msg.awaited = awaitedFrom(msg);
    const before = issuesAt(msg.ts), readyBefore = readinessAt(msg.ts);
    const out = [];
    const ordered = claims.map((c, i) => ({ c, i })).sort((a, b) => claimOrder(a.c.type) - claimOrder(b.c.type) || a.i - b.i);
    for (const { c: read } of ordered) {
      const { hedged: _h, settled: _s, person: _p, ...claim } = read;        // only the verifier and the ledger may set these
      const v = verifyClaim(claim, msg, dir, { plain: meta.reader === 'person' });
      const effects = [];
      let settled = v.disposition === 'signal', person = false;
      if (v.disposition !== 'rejected') {
        const applied = v.hedged ? { ...claim, hedged: v.hedged } : claim;
        for (const caseId of claim.cases) {
          const fx = applyClaim(state, dir, msg, applied, v.disposition, caseId, books);
          if (!fx.settled) settled = false;
          if (fx.person) person = true;
          for (const text of fx) effects.push({ caseId, text: tidy(text) });
        }
      }
      out.push({ ...claim, disposition: v.disposition, reason: v.reason, effects, ...(v.hedged ? { hedged: v.hedged } : {}), ...(settled ? { settled: true } : {}), ...(person ? { person: true } : {}) });
    }
    if (msg.role === 'consultant') {
      for (const id of msg.caseIds) {
        const c = state.cases[id];
        if (c.schedule && c.schedule.room && new RegExp(`room ${c.schedule.room}\\b`, 'i').test(msg.body)) c.roomKnown[msg.consultant] = c.schedule.room;
      }
    }
    const after = issuesAt(msg.ts), readyAfter = readinessAt(msg.ts);
    const opened = [...after.values()].filter((i) => !before.has(i.key));
    const closed = [...before.values()].filter((i) => !after.has(i.key));
    const readinessChanges = Object.keys(readyAfter).filter((id) => readyAfter[id] !== readyBefore[id]).map((id) => ({ caseId: id, from: readyBefore[id], to: readyAfter[id] }));
    // Hearings this message changed without naming them (a sick note opens every hearing that day).
    const alsoCases = [...new Set([...readinessChanges.map((r) => r.caseId), ...opened.map((i) => i.caseId), ...closed.map((i) => i.caseId)])].filter((id) => id && !msg.caseIds.includes(id));
    const entry = { ...msg, claims: out, opened, closed, readinessChanges, alsoCases, reader: meta.reader || null, unresolved: msg.resolvedBy === 'none', attention: attentionFor(msg, out) };
    state.messages.push(entry);
    state.now = Math.max(state.now || 0, msg.ts);
    return entry;
  }

  // Synchronous path for readers that do not need the network (rules, recorded runs).
  function ingest(raw, useReader = reader) {
    const { msg, ctx } = prepare(raw);
    const claims = msg.resolvedBy === 'none' ? [] : useReader(msg, dir, ctx);
    const entry = commit(msg, claims, { reader: useReader.label || 'rules' });
    // Passages the reader could not place go to a person with the passage quoted.
    for (const u of claims.unclassified || []) {
      const why = `The reader could not classify a passage: "${u.quote}"${u.note ? ` (${u.note})` : ''}.`;
      if (!entry.attention.includes(why)) entry.attention.push(why);
    }
    if ((claims.unclassified || []).length) entry.reading = { ...(entry.reading || {}), unclassified: claims.unclassified };
    return entry;
  }

  // A person corrects a reading. They can change WHAT a message says and which case it belongs
  // to, never WHO said it: the corrected claims pass through the same checks, with the authority
  // of the original sender and channel.
  function correct(msgId, claims, now = state.now) {
    const old = state.messages.find((m) => m.id === msgId);
    if (!old) return null;
    const named = [...new Set(claims.flatMap((c) => c.cases || []))].filter((id) => dir.caseById[id]);
    const msg = { id: old.id, at: old.at, ts: old.ts, sender: old.sender, address: old.address, channel: old.channel, body: old.body, role: old.role, county: old.county, consultant: old.consultant, homeowner: old.homeowner,
      claimed: old.claimed, spoofSuspected: old.spoofSuspected, written: old.written, verbal: old.verbal, direction: old.direction,
      caseIds: [...new Set([...old.caseIds, ...named])], resolvedBy: old.resolvedBy === 'none' && named.length ? 'person' : old.resolvedBy };
    const entry = commit(msg, claims.map((c) => ({ quote: msg.body, ...c })), { reader: 'person' });
    entry.corrects = msgId; entry.correctedAt = now;
    state.triage[msgId] = { at: now, corrected: true };
    return entry;
  }

  function view(now = state.now) {
    const cases = dir.cases.map((rec) => {
      const c = state.cases[rec.case_id];
      const pb = books[c.county];
      return { ...deriveCase(c, { now, pb, dir, drift: state.drift[c.county] }), ledger: c, record: rec, playbook: pb };
    });
    const counts = { ready: 0, in_progress: 0, at_risk: 0, past: 0, post: 0, closed: 0 };
    for (const c of cases) counts[c.readiness] += 1;
    return { now, cases, counts, issues: cases.flatMap((c) => c.issues), drift: state.drift };
  }

  // PLAN: next actions for the current state and clock.
  function plan(now = state.now) {
    const v = view(now);
    return { view: v, ...planActions({ view: v, state, dir, books, now }) };
  }

  // ACT: send (or complete) one planned action. Writes to the outbox and the ledger.
  // The plan is recomputed first, so a second click, a stale approval or a blocked item sends nothing.
  function act(stale, now = state.now) {
    const item = plan(now).items.find((i) => i.key === stale.key);
    if (!item || item.phase !== 'todo') return { refused: true, key: stale.key, reason: 'Nothing was sent. The evidence no longer calls for this action.' };
    if (item.blocked) return { refused: true, key: stale.key, reason: item.blocked };
    const id = `out-${++state.seq}`;
    state.now = Math.max(state.now || 0, now);
    if (item.kind === 'playbook') return approveChange(item.county, now, id);
    applyOutbound(state, dir, item, now, id);
    const entry = { id, key: item.key, at: now, kind: item.kind, level: item.level, cases: item.cases, county: item.county, to: item.to, title: item.title, draft: item.draft, reminder: item.reminder || 0 };
    state.outbox.push(entry);
    return entry;
  }

  // A person approves a proposed playbook change: the county file gets a new version.
  function approveChange(county, now = state.now, id = `out-${++state.seq}`) {
    const d = state.drift[county];
    if (!d || d.status !== 'proposed') return null;
    const changes = proposeChange(books[county], d.text);
    const i = layers.counties.findIndex((c) => c.county === county);
    layers.counties[i] = applyChange(layers.counties[i], changes, { date: localParts(now).date, source: `Message ${d.source}, approved by the operations lead` });
    books = resolvePlaybooks(layers);
    d.status = 'approved'; d.approvedAt = now; d.changes = changes;
    const entry = { id, at: now, kind: 'playbook', level: 'human', cases: [], county, to: { kind: 'staff', name: 'Operations lead' }, title: `${county} playbook is now version ${books[county].version}`, draft: null, changes };
    state.outbox.push(entry);
    return entry;
  }
  function dismissChange(county) { if (state.drift[county]) state.drift[county].status = 'dismissed'; }

  return {
    dir, state, prepare, commit, ingest, correct, view, plan, act, approveChange, dismissChange,
    get books() { return books; },
    get layers() { return layers; },
    setCountyPlaybook(county, next) {
      const i = layers.counties.findIndex((c) => c.county === county);
      if (i >= 0) layers.counties[i] = next; else layers.counties.push(next);
      books = resolvePlaybooks(layers);
    },
    setDefaultPlaybook(next) { layers.default = next; books = resolvePlaybooks(layers); },
  };
}
