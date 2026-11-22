// The session behind the web app: one engine, a simulated clock, and a log of everything that
// happened after the examples. The log is the only state: undo, reset and "go back to message
// 17" all rebuild the engine by replaying it, exactly as the real system would after a restart.

import { createEngine } from '../src/engine.js';
import { extractWithRules } from '../src/extract/rules.js';
import { deepMerge } from '../src/playbook.js';
import { toTs, localParts, HOURS } from '../src/time.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
const arr = (v) => (Array.isArray(v) ? v : [v]);
const REPLY_DELAY = 10 * 60e3;

export function createSession(data, { reader = extractWithRules } = {}) {
  const N = data.messages.length;
  const s = { data, N, cursor: N, log: [], auto: true, eng: null, now: 0, version: 0 };
  let cache = null, seq = 0, group = 0;
  const subs = new Set();
  const emit = () => { cache = null; s.version += 1; for (const f of subs) f(s); };
  const live = () => s.cursor === N;

  // Counties and cases added in this session are part of the input, like the packet itself.
  function inputs() {
    const packet = clone(data.packet), playbooks = clone(data.playbooks);
    for (const ev of s.log) {
      if (ev.t !== 'county') continue;
      packet.counties.push(ev.record);
      playbooks.counties.push(ev.file);
      for (const k of packet.consultants) if (ev.eligible.includes(k.consultant_id)) k.eligible_counties = [...arr(k.eligible_counties), ev.record.county];
      packet.cases.push(...ev.cases);
      packet.documents.push(...ev.documents);
    }
    return { packet, playbooks };
  }

  function apply(ev) {
    const eng = s.eng;
    if (ev.at) s.now = Math.max(s.now, ev.at);
    switch (ev.t) {
      case 'msg': {
        const rawMsg = { id: ev.id, at: ev.at, ...ev.raw };
        if (ev.claims) {
          // The statements were produced outside this replay: forced in by a preset, or read by
          // the live AI readers. They are stored with the event, so a replay never asks a model
          // again, and they still pass through the verifier here like any other reading.
          const { msg } = eng.prepare(rawMsg);
          const entry = eng.commit(msg, ev.claims, { reader: ev.reader || 'entered by hand' });
          for (const why of ev.attention || []) if (!entry.attention.includes(why)) entry.attention.push(why);
          if (ev.reading) entry.reading = ev.reading;
          return entry;
        }
        return eng.ingest(rawMsg);
      }
      case 'act': return eng.act({ key: ev.key }, ev.at);
      case 'correct': return eng.correct(ev.msgId, ev.claims, ev.at);
      case 'dismiss': return eng.dismissChange(ev.county);
      case 'default': return eng.setDefaultPlaybook(deepMerge(eng.layers.default, ev.patch));
      default: return null;                       // 'clock' only moves the clock; 'county' is applied in inputs()
    }
  }

  function rebuild() {
    const { packet, playbooks } = inputs();
    s.eng = createEngine({ packet, playbooks, reader });
    for (const m of data.messages.slice(0, s.cursor)) s.eng.ingest(m);
    s.now = s.cursor ? s.eng.state.now : Date.parse(data.messages[0].at) - HOURS;
    if (live()) for (const ev of s.log) if (ev.t !== 'county') apply(ev);
    cache = null;
  }

  function push(ev) {
    s.log.push(ev);
    if (ev.t === 'county') { rebuild(); return null; }
    return apply(ev);
  }

  // The automatic lane: whatever needs no person is sent at once and logged.
  function settle() {
    if (!s.auto || !live()) return 0;
    let n = 0;
    for (let i = 0; i < 80; i += 1) {
      const it = s.eng.plan(s.now).items.find((x) => x.phase === 'todo' && !x.blocked && x.level === 'L2');
      if (!it) break;
      const r = push({ t: 'act', key: it.key, at: s.now, auto: true, g: group, title: it.title });
      if (!r || r.refused) { s.log.pop(); break; }
      n += 1;
    }
    return n;
  }

  function run(ev) {
    if (!live()) return null;
    group += 1;
    const r = push({ ...ev, g: group });
    const auto = settle();
    emit();
    return { result: r, auto };
  }

  function snap() {
    if (!cache) { const plan = s.eng.plan(s.now); cache = { plan, view: plan.view, items: plan.items, staffing: plan.staffing }; }
    return cache;
  }

  // The next moment at which something happens by itself: a reminder, an offer that runs out,
  // a deadline, a hearing.
  function nextTimer() {
    const { items, view } = snap();
    const c = [];
    for (const it of items) {
      if (it.phase === 'waiting' && it.followUpAt && it.followUpAt > s.now) c.push({ at: it.followUpAt, why: `the follow-up on "${it.title}"` });
      if (it.phase === 'waiting' && it.replyBy && it.replyBy > s.now) c.push({ at: it.replyBy + 60e3, why: `the reply-by time of "${it.title}"` });
      if (it.due && it.due > s.now) c.push({ at: it.due + 60e3, why: `the deadline of "${it.title}"` });
    }
    for (const cv of view.cases) {
      if (cv.stage === 'upcoming' && cv.end > s.now) c.push({ at: cv.end + 60e3, why: `the end of the hearing for ${cv.id}` });
    }
    c.sort((a, b) => a.at - b.at);
    return c[0] || null;
  }

  // One step of a cooperative world: take the next action, or let the oldest open request be
  // answered helpfully. Returns a line of text, or null when nothing is left to do.
  function step() {
    if (!live()) return null;
    const { items } = snap();
    const todo = items.find((i) => i.phase === 'todo' && !i.blocked);
    if (todo) {
      const r = push({ t: 'act', key: todo.key, at: s.now + 1000, g: group, title: todo.title });
      cache = null;
      if (!r || r.refused) { s.log.pop(); return null; }
      return { type: 'act', level: todo.level, text: todo.title };
    }
    const waits = items.filter((i) => i.phase === 'waiting' && i.replies && i.replies.length).sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0));
    if (!waits.length) return null;
    const w = waits[0], reply = w.replies[0];
    push({ t: 'msg', id: `L${++seq}`, at: Math.max(s.now + 1000, (w.sentAt || s.now) + REPLY_DELAY), g: group, raw: reply.message, via: 'reply', label: reply.label });
    cache = null;
    return { type: 'reply', text: reply.label };
  }

  const api = {
    s,
    get eng() { return s.eng; },
    get now() { return s.now; },
    get live() { return live(); },
    get view() { return snap().view; },
    get items() { return snap().items; },
    get plan() { return snap().plan; },
    get staffing() { return snap().staffing; },
    get messages() { return s.eng.state.messages; },
    get outbox() { return s.eng.state.outbox; },
    get canUndo() { return live() && s.log.some((e) => (e.g || 0) > 0); },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },

    act: (key) => run({ t: 'act', key, at: s.now }),
    reply: (message, label) => run({ t: 'msg', id: `L${++seq}`, at: s.now + REPLY_DELAY, raw: message, via: 'reply', label }),
    send: (rawMsg, claims = null, read = null) => run({ t: 'msg', id: `L${++seq}`, at: s.now + 60e3, raw: rawMsg, via: 'compose', claims, ...(read ? { reader: read.label, attention: read.attention, reading: read.reading } : {}) }),
    correct: (msgId, claims) => run({ t: 'correct', msgId, claims, at: s.now }),
    dismiss: (county) => run({ t: 'dismiss', county, at: s.now }),
    editDefault: (patch) => run({ t: 'default', patch, at: s.now }),
    addCounty: (county) => run({ t: 'county', ...county, at: s.now }),
    advance: (ms) => run({ t: 'clock', at: s.now + ms }),
    goto: (ts) => run({ t: 'clock', at: Math.max(ts, s.now) }),
    nextTimer,
    nextMorning() {
      let day = s.now;
      for (let i = 0; i < 8; i += 1) {
        const p = localParts(day);
        const nine = toTs(p.date, '09:00');
        if (p.dow >= 1 && p.dow <= 5 && nine > s.now) return nine;
        day = toTs(p.date, '00:00') + 26 * HOURS;
      }
      return s.now + 24 * HOURS;
    },
    step() { group += 1; const r = step(); if (r) { settle(); emit(); } return r; },
    // Run the cooperative world to the end: every action taken, every request answered helpfully.
    playForward(max = 400) {
      const counts = { L2: 0, L1: 0, L0: 0, human: 0, replies: 0 };
      group += 1;
      for (let i = 0; i < max; i += 1) {
        const r = step();
        if (!r) break;
        if (r.type === 'act') counts[r.level] += 1; else counts.replies += 1;
      }
      emit();
      return counts;
    },
    setAuto(on) { s.auto = !!on; if (s.auto) settle(); emit(); },
    undo() {
      if (!live() || !s.log.length) return;
      const g = s.log[s.log.length - 1].g || 0;                 // one user step and everything it set off
      while (s.log.length && (s.log[s.log.length - 1].g || 0) === g) s.log.pop();
      rebuild(); settle(); emit();
    },
    reset() { s.log = []; s.cursor = N; rebuild(); settle(); emit(); },
    seek(k) { s.cursor = Math.max(0, Math.min(N, k)); rebuild(); emit(); },
    countsByLevel() {
      const c = { L2: 0, L1: 0, L0: 0, human: 0 };
      for (const o of s.eng.state.outbox) if (c[o.level] != null) c[o.level] += 1;
      return c;
    },
  };

  rebuild();
  settle();
  return api;
}
