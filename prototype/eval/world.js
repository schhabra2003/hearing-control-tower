// A test world: the engine plus a clock, with small helpers to look at cases, take actions and
// send new messages. Pure code with no file access, so the same checks run in Node
// (cli/check.js) and in the browser (the Checks tab of the app).
//
//     const kit = createWorldKit({ packet, playbooks, messages, gold });
//     const w = kit.makeWorld('end');          // replay all example messages
//     const w = kit.makeWorld(17);             // the state right after example message 17

import { createEngine } from '../src/engine.js';
import { extractWithRules } from '../src/extract/rules.js';
import { auditRecords } from '../src/audit.js';
import { solveStaffing } from '../src/staffing.js';
import { scoreMessage, summarize } from '../src/score.js';
import { PROBLEMS } from './problems.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

// Wording faults a template can produce: a doubled full stop, or a value that was never filled in.
const GLITCH = [/\.\.(?!\.)/, /undefined/, /NaN/, /\[object/, /\bnull\b/];
export function glitchesIn(plan, view) {
  const out = [];
  const look = (where, text) => { for (const re of GLITCH) if (re.test(String(text || ''))) out.push(`${where}: ${String(text).slice(0, 140)}`); };
  for (const i of plan.items) {
    look(`${i.key} title`, i.title); look(`${i.key} why`, i.why);
    if (i.draft) { look(`${i.key} subject`, i.draft.subject); look(`${i.key} body`, i.draft.body); for (const a of i.draft.attachments || []) { look(`${i.key} attachment`, a.name); look(`${i.key} attachment`, a.text); } }
    for (const r of i.replies || []) look(`${i.key} reply`, r.message.body);
    for (const c of i.checks || []) look(`${i.key} check`, c);
  }
  for (const c of view.cases) {
    for (const [g, v] of Object.entries(c.gates)) look(`${c.id} ${g}`, v.text);
    for (const i of c.issues) { look(`${c.id} ${i.code}`, i.title); look(`${c.id} ${i.code}`, i.detail); }
  }
  return out;
}

// A cooperative world: take every proposed action, and let each request be answered ten
// minutes after it was sent with the first (cooperative) simulated reply. Every reply goes
// through the same reader, verifier and ledger as a real message.
export function runClosedLoop(w, { maxSteps = 900, only = null, replyDelay = 10 * 60e3 } = {}) {
  const log = [], byLevel = { L2: 0, L1: 0, L0: 0, human: 0 }, humanKinds = new Set(), glitches = [];
  let rejected = 0, unparsed = 0, sim = 0, steps = 0, reminders = 0, refused = 0;
  const mine = (i) => !only || i.cases.some((id) => only.includes(id));
  while (steps++ < maxSteps) {
    const plan = w.plan();
    for (const g of glitchesIn(plan, plan.view)) if (!glitches.includes(g)) glitches.push(g);
    const items = plan.items.filter(mine);
    const todo = items.find((i) => i.phase === 'todo' && !i.blocked);
    if (todo) {
      w.tick(1000);
      const r = w.act(todo);
      if (r && r.refused) { refused += 1; break; }
      byLevel[todo.level] += 1;
      if (todo.reminder || todo.kind === 'follow_up_call') reminders += 1;
      if (todo.level === 'human' || todo.level === 'L0') humanKinds.add(todo.kind);
      log.push({ type: 'act', level: todo.level, kind: todo.kind, title: todo.title, cases: todo.cases });
      continue;
    }
    const waits = items.filter((i) => i.phase === 'waiting' && i.replies.length).sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0));
    if (!waits.length) break;
    const wait = waits[0];
    w.goto(Math.max(w.now + 1000, (wait.sentAt || w.now) + replyDelay));
    const r = wait.replies[0];
    const e = w.eng.ingest({ id: `sim-${++sim}`, at: w.now, ...r.message });
    rejected += e.claims.filter((c) => c.disposition === 'rejected').length;
    if (!e.claims.length) unparsed += 1;
    log.push({ type: 'reply', label: r.label, body: r.message.body, claims: e.claims.map((c) => `${c.type}:${c.disposition}`) });
  }
  const v = w.view();
  return {
    steps: log.length, actions: log.filter((l) => l.type === 'act').length, replies: sim, rejected, unparsed, reminders, refused, byLevel, humanKinds: [...humanKinds], counts: v.counts, glitches,
    notReady: v.cases.filter((c) => c.stage === 'upcoming' && c.readiness !== 'ready' && (!only || only.includes(c.id))).map((c) => c.id), log,
  };
}

export function createWorldKit(data) {
  function makeWorld(at, { packet = data.packet, playbooks = data.playbooks, messages = data.messages } = {}) {
    const eng = createEngine({ packet, playbooks, reader: extractWithRules });
    const entries = new Map();
    const stop = at === 'end' ? Infinity : Date.parse(messages.find((m) => m.id === at).at);
    for (const m of messages) { if (Date.parse(m.at) > stop) break; entries.set(m.id, eng.ingest(m)); }
    let now = eng.state.now, extra = 0, lastEntry = null;
    const w = {
      eng, entries,
      get now() { return now; },
      tick(ms) { now += ms; return now; },
      goto(ts) { now = Math.max(now, ts); return now; },
      name: (id) => eng.dir.consultantById[id].name,
      view: () => eng.view(now),
      C: (id) => eng.view(now).cases.find((c) => c.id === id),
      L: (id) => eng.state.cases[id],
      plan: () => eng.plan(now),
      items: (pred = () => true) => eng.plan(now).items.filter(pred),
      act: (item) => eng.act(item, now),
      staffing(caseId) {
        const p = eng.plan(now).staffing;
        const hit = p && p.plans.find((x) => x.caseId === caseId);
        return hit || solveStaffing({ state: eng.state, dir: eng.dir, books: eng.books, now, targets: [caseId] }).plans[0];
      },
      claims: (n) => entries.get(n).claims,
      entry: (n) => entries.get(n),
      last: () => lastEntry,
      say(raw) { now += 60e3; lastEntry = eng.ingest({ id: `x${++extra}`, at: now, ...raw }); return lastEntry; },
      forge(raw, claims) { now += 60e3; const { msg } = eng.prepare({ id: `x${++extra}`, at: now, ...raw }); lastEntry = eng.commit(msg, claims, { reader: 'forged' }); return lastEntry; },
      audit: () => auditRecords(eng.view(now), eng.dir),
      fresh: () => makeWorld(at, { packet, playbooks, messages }),
      devScore() {
        const gold = data.gold.labels;
        const rows = messages.filter((m) => gold[String(m.id)]).map((m) => scoreMessage(entries.get(m.id).claims, gold[String(m.id)]));
        const sum = summarize(rows);
        return { n: rows.length, tp: sum.tp, fp: sum.fp, fn: sum.fn, exact: sum.exact, fieldsWrong: sum.fWrong + sum.fMissing };
      },
      glitches() { const p = eng.plan(now); return glitchesIn(p, p.view); },
      snapshot: () => JSON.stringify(eng.view(now).cases.map((c) => [c.id, c.stage, c.readiness, c.gates, c.issues.map((i) => i.key)])),
    };
    return w;
  }

  // An eleventh county, added as data only.
  function newCountyWorld() {
    const packet = clone(data.packet), playbooks = clone(data.playbooks);
    packet.counties.push({ county: 'Kestrel Bay', state: 'Asterland', office_email: 'clerk@kestrelbay.example', hearing_mode: 'video' });
    for (const k of packet.consultants) k.eligible_counties = [...(Array.isArray(k.eligible_counties) ? k.eligible_counties : [k.eligible_counties]), 'Kestrel Bay'];
    packet.cases.push({ property: '5 Harbor Row, Kestrel Bay', case_id: 'AX-201', customer_id: 'H101', homeowner: 'Quinn Marsh', county: 'Kestrel Bay', state: 'Asterland', tax_year: '2029',
      hearing_date: '', hearing_time: '', timezone: 'UTC-05:00', consultant_id: '', status: 'new', packet_reference: '5-harbor-row-packet-v1.txt', record_updated_at: '2030-06-07T12:00:00-05:00' });
    packet.documents.push({ name: '5-harbor-row-packet-v1.txt', kind: 'packet', version: 1, case_id: 'AX-201', text: 'Property: 5 Harbor Row, Kestrel Bay\nHomeowner: Quinn Marsh\nCase: AX-201\nCounty: Kestrel Bay\nTax year: 2029\nPacket version: 1' });
    const county = {
      id: 'kestrel-bay', layer: 'county', county: 'Kestrel Bay', state: 'Asterland', version: 1, verified_at: '2030-06-07', verified_from: 'Clerk email of June 7, 2030 (simulated)',
      office: { email: 'clerk@kestrelbay.example', contact_hours: { days: 'Mon-Fri', start: '10:00', end: '15:00' } },
      hearing_mode: 'video',
      staffing: { method: 'email_case_ids', template: 'email', source_text: 'Email the case IDs and representative name to the clerk.' },
      replacement: { method: 'email_replacement', source_text: 'Email the replacement name and case IDs.' },
      packet: { lead_hours: 72 },
    };
    playbooks.counties.push(county);
    const w = makeWorld('end', { packet, playbooks });
    w.say({ sender: 'Kestrel Bay hearing office', channel: 'email', body: 'The hearing for 5 Harbor Row, Kestrel Bay is scheduled for June 24 at 10 a.m. by video. Please confirm your representative.', caseIds: ['AX-201'] });
    const packetDue = w.C('AX-201').due.G4;
    const loop = runClosedLoop(w, { only: ['AX-201'] });
    w.newCountyResult = { ready: w.C('AX-201').readiness === 'ready', ownFields: w.eng.books['Kestrel Bay'].own_fields, inherited: w.eng.books['Kestrel Bay'].inherited_fields, packetDue, countyFile: county, actions: loop.actions, replies: loop.replies };
    return w;
  }

  // One edit to the shared layer: the packet rule goes from 48 to 72 hours everywhere.
  function leadChangeWorld() {
    const base = makeWorld('end');
    const playbooks = clone(data.playbooks);
    playbooks.default.packet.lead_hours = 72;
    const w = makeWorld('end', { playbooks });
    const ids = base.view().cases.filter((c) => c.stage === 'upcoming').map((c) => c.id);
    const changed = ids.filter((id) => w.C(id).rule.G4 === base.C(id).rule.G4 - 24 * 3600e3).length;
    w.leadChangeResult = { total: ids.length, changed };
    return w;
  }

  // Run one problem. Returns { id, group, at, problem, expect, ok, error }.
  function runOne(p, cache = {}) {
    let ok = false, error = null;
    try {
      let w;
      if (p.world === 'newCounty') w = newCountyWorld();
      else if (p.world === 'leadChange') w = leadChangeWorld();
      else if (p.world === 'closedLoop') { w = makeWorld('end'); w.loop = cache.loop || (cache.loop = runClosedLoop(makeWorld('end'))); }
      else w = makeWorld(p.at);
      if (p.act) p.act(w);
      ok = p.test(w) === true;
    } catch (e) { error = String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' | '); }
    return { id: p.id, group: p.group, at: p.at, problem: p.problem, expect: p.expect, ok, error };
  }

  function runChecks() {
    const cache = {};
    const results = PROBLEMS.map((p) => runOne(p, cache));
    return { results, loop: cache.loop || runClosedLoop(makeWorld('end')) };
  }

  return { makeWorld, newCountyWorld, leadChangeWorld, runOne, runChecks, problems: PROBLEMS };
}
