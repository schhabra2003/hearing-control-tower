// SCALE SIMULATION. A synthetic world generator and an event-driven closed loop over the REAL
// engine (same reader, verifier, ledger, planner and drafts as the prototype).
//
// What it is for: measuring how human work per hearing behaves when hearings and counties grow,
// under noise (silence, declines, moves, lost notices, unreadable files, homeowner changes,
// signatures), and stress-testing the engine with random event orders at the same time.
//
// What it is not: evidence about the real world. Every rate and every minute value below is an
// ESTIMATE chosen by the author, exposed as a parameter. The reader is the offline pattern
// reader, and every counterparty message uses wording that reader is known to read (see
// verifyTemplates), so reading errors are outside this simulation.
//
// Pure ES module: no Node imports, no wall clock, no Math.random. Same seed, same result.

import { createEngine } from './engine.js';
import { extractWithRules } from './extract/rules.js';
import { resolvePlaybooks, proposeChange, applyChange } from './playbook.js';
import { toTs, localParts, fmtTime, nextOpen, HOURS } from './time.js';
import { longDate } from './drafts.js';

const MIN = 60e3, DAY = 24 * HOURS;
const clone = (o) => JSON.parse(JSON.stringify(o));
const FIRM = "Alice's Law Firm operations";

// ---------------------------------------------------------------- deterministic randomness
export function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
  return h >>> 0;
}
// One uniform number per (seed, key). Counterparty behaviour is keyed by the request it answers,
// so two runs of the same world with different autonomy settings meet the same counterparties.
const u01 = (seed, key) => mulberry32(hashStr(`${seed}|${key}`))();
function makeRng(seed) {
  const next = mulberry32(seed);
  const api = {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    between: (a, b) => a + next() * (b - a),
    weighted(pairs) { const total = pairs.reduce((s, p) => s + p[0], 0); let x = next() * total; for (const [w, v] of pairs) { x -= w; if (x < 0) return v; } return pairs[pairs.length - 1][1]; },
    shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
  return api;
}

class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].t < a[i].t || (a[p].t === a[i].t && a[p].n < a[i].n)) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; const less = (x, y) => a[x].t < a[y].t || (a[x].t === a[y].t && a[x].n < a[y].n); if (l < a.length && less(l, m)) m = l; if (r < a.length && less(r, m)) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
}

// ---------------------------------------------------------------- dates
const isoToUtc = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const isoAdd = (iso, days) => new Date(isoToUtc(iso) + days * DAY).toISOString().slice(0, 10);
const dowOf = (iso) => new Date(isoToUtc(iso)).getUTCDay();
const isWeekday = (iso) => { const d = dowOf(iso); return d >= 1 && d <= 5; };
const nextWeekday = (iso) => { let d = iso; while (!isWeekday(d)) d = isoAdd(d, 1); return d; };
const prevWeekday = (iso) => { let d = iso; while (!isWeekday(d)) d = isoAdd(d, -1); return d; };
const addWorkdays = (iso, n) => { let d = iso, left = Math.abs(n); const step = n < 0 ? -1 : 1; while (left > 0) { d = isoAdd(d, step); if (isWeekday(d)) left -= 1; } return d; };
const hhmm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const listAnd = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const addrOf = (property) => property.split(',')[0];
const slugOf = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const START_MONDAY = '2030-06-10';          // the examples' hearings start that week; the reader assumes the year 2030
// The first moment at or after ts inside [start, end) local time (Monday to Friday only when weekdays is set).
function within(ts, start, end, weekdays, tz) {
  let t = ts;
  for (let i = 0; i < 10; i += 1) {
    const p = localParts(t, tz);
    const dayOk = !weekdays || (p.dow >= 1 && p.dow <= 5);
    if (dayOk && p.time >= start && p.time < end) return t;
    if (dayOk && p.time < start) return toTs(p.date, start, tz);
    t = toTs(localParts(toTs(p.date, '12:00', tz) + DAY, tz).date, start, tz);
  }
  return t;
}

// ---------------------------------------------------------------- scenarios (all values are ESTIMATES)
// events: chance per hearing block unless stated (driftPerCounty: per county; wrongSigner,
// volunteerAfterDropout, postponeNewDate, statementAfterContinued: share of the event before them).
// behaviour: how counterparties answer a request. "silent" means no answer to that message.
export const SCENARIOS = {
  none: {
    label: 'No noise (control): every request is answered, nothing changes',
    events: { shortNotice: 0, deadlineInNotice: 0, moveWritten: 0, movePhone: 0, dropout: 0, volunteerAfterDropout: 0, repLost: 0, versionIssue: 0, question: 0, calendarBelief: 0,
      ownerWithdraw: 0, ownerMove: 0, settlement: 0, wrongSigner: 0, postpone: 0, postponeNewDate: 0, unknownSender: 0, unreadable: 0, noCaseNote: 0, driftPerCounty: 0, statementAfterContinued: 0, staleNoticeFile: 0 },
    behaviour: {
      offer: { accept: 1, decline: 0, unsure: 0, silent: 0, late: 0, partial: 0 },
      nudge: { accept: 1, decline: 0, unsure: 0, silent: 0 }, reconfirm: { accept: 1, decline: 0, unsure: 0, silent: 0 },
      receipt: { ok: 1, silent: 0 }, officeStaffing: { ok: 1, nothing: 0, silent: 0 }, officePacket: { ok: 1, unreadable: 0, silent: 0 },
      officeWritten: { ok: 1, other: 0, silent: 0 }, officeObligation: { ok: 1, relist: 0, silent: 0 }, officeDispute: { ok: 1, other: 0, silent: 0 },
      signature: { ok: 1, silent: 0 }, outcome: { heard: 1, continued: 0, silent: 0 }, calendarFix: { ok: 1, silent: 0 }, clerkPhone: { ok: 1, cannotFind: 0 },
      homeowner: { yes: 1, no: 0, noAnswer: 0 }, homeownerMove: { yes: 1, no: 0, noAnswer: 0 },
      answerAfterReminder: 1, answerAfterCall: 1, rescue: 1, phoneThenWritten: 1, noticesOwnClash: 1,
    },
  },
  calm: {
    label: 'Calm: almost everyone answers, few surprises',
    events: { shortNotice: 0.02, deadlineInNotice: 0.2, moveWritten: 0.015, movePhone: 0.005, dropout: 0.015, volunteerAfterDropout: 0.25, repLost: 0.01, versionIssue: 0.01, question: 0.02, calendarBelief: 0.01,
      ownerWithdraw: 0.005, ownerMove: 0.005, settlement: 0.02, wrongSigner: 0.1, postpone: 0.005, postponeNewDate: 0.7, unknownSender: 0.003, unreadable: 0.005, noCaseNote: 0.003, driftPerCounty: 0.01, statementAfterContinued: 0.6, staleNoticeFile: 0.01 },
    behaviour: {
      offer: { accept: 0.88, decline: 0.06, unsure: 0.03, silent: 0.03, late: 0.3, partial: 0.02 },
      nudge: { accept: 0.75, decline: 0.2, unsure: 0.02, silent: 0.03 }, reconfirm: { accept: 0.9, decline: 0.07, unsure: 0, silent: 0.03 },
      receipt: { ok: 0.97, silent: 0.03 }, officeStaffing: { ok: 0.95, nothing: 0.02, silent: 0.03 }, officePacket: { ok: 0.95, unreadable: 0.02, silent: 0.03 },
      officeWritten: { ok: 0.9, other: 0.07, silent: 0.03 }, officeObligation: { ok: 0.95, relist: 0.02, silent: 0.03 }, officeDispute: { ok: 0.95, other: 0.05, silent: 0 },
      signature: { ok: 0.95, silent: 0.05 }, outcome: { heard: 0.87, continued: 0.1, silent: 0.03 }, calendarFix: { ok: 0.95, silent: 0.05 }, clerkPhone: { ok: 0.9, cannotFind: 0.1 },
      homeowner: { yes: 0.75, no: 0.15, noAnswer: 0.1 }, homeownerMove: { yes: 0.85, no: 0.07, noAnswer: 0.08 },
      answerAfterReminder: 0.85, answerAfterCall: 0.97, rescue: 0.95, phoneThenWritten: 0.6, noticesOwnClash: 0.9,
    },
  },
  typical: {
    label: 'Typical: about one request in ten goes unanswered, some surprises',
    events: { shortNotice: 0.05, deadlineInNotice: 0.2, moveWritten: 0.06, movePhone: 0.02, dropout: 0.06, volunteerAfterDropout: 0.25, repLost: 0.04, versionIssue: 0.03, question: 0.04, calendarBelief: 0.03,
      ownerWithdraw: 0.02, ownerMove: 0.02, settlement: 0.04, wrongSigner: 0.15, postpone: 0.02, postponeNewDate: 0.7, unknownSender: 0.01, unreadable: 0.02, noCaseNote: 0.01, driftPerCounty: 0.03, statementAfterContinued: 0.6, staleNoticeFile: 0.03 },
    behaviour: {
      offer: { accept: 0.72, decline: 0.12, unsure: 0.06, silent: 0.1, late: 0.3, partial: 0.05 },
      nudge: { accept: 0.65, decline: 0.25, unsure: 0.05, silent: 0.05 }, reconfirm: { accept: 0.8, decline: 0.12, unsure: 0, silent: 0.08 },
      receipt: { ok: 0.92, silent: 0.08 }, officeStaffing: { ok: 0.86, nothing: 0.04, silent: 0.1 }, officePacket: { ok: 0.85, unreadable: 0.05, silent: 0.1 },
      officeWritten: { ok: 0.75, other: 0.15, silent: 0.1 }, officeObligation: { ok: 0.88, relist: 0.04, silent: 0.08 }, officeDispute: { ok: 0.9, other: 0.1, silent: 0 },
      signature: { ok: 0.88, silent: 0.12 }, outcome: { heard: 0.8, continued: 0.13, silent: 0.07 }, calendarFix: { ok: 0.9, silent: 0.1 }, clerkPhone: { ok: 0.8, cannotFind: 0.2 },
      homeowner: { yes: 0.7, no: 0.15, noAnswer: 0.15 }, homeownerMove: { yes: 0.8, no: 0.1, noAnswer: 0.1 },
      answerAfterReminder: 0.7, answerAfterCall: 0.95, rescue: 0.85, phoneThenWritten: 0.5, noticesOwnClash: 0.7,
    },
  },
  rough: {
    label: 'Rough: a quarter of requests go unanswered, frequent changes',
    events: { shortNotice: 0.12, deadlineInNotice: 0.3, moveWritten: 0.14, movePhone: 0.05, dropout: 0.14, volunteerAfterDropout: 0.2, repLost: 0.1, versionIssue: 0.07, question: 0.08, calendarBelief: 0.07,
      ownerWithdraw: 0.05, ownerMove: 0.05, settlement: 0.08, wrongSigner: 0.25, postpone: 0.05, postponeNewDate: 0.6, unknownSender: 0.03, unreadable: 0.05, noCaseNote: 0.02, driftPerCounty: 0.08, statementAfterContinued: 0.7, staleNoticeFile: 0.06 },
    behaviour: {
      offer: { accept: 0.5, decline: 0.22, unsure: 0.08, silent: 0.2, late: 0.4, partial: 0.08 },
      nudge: { accept: 0.5, decline: 0.3, unsure: 0.08, silent: 0.12 }, reconfirm: { accept: 0.62, decline: 0.2, unsure: 0, silent: 0.18 },
      receipt: { ok: 0.8, silent: 0.2 }, officeStaffing: { ok: 0.68, nothing: 0.1, silent: 0.22 }, officePacket: { ok: 0.68, unreadable: 0.1, silent: 0.22 },
      officeWritten: { ok: 0.6, other: 0.2, silent: 0.2 }, officeObligation: { ok: 0.72, relist: 0.08, silent: 0.2 }, officeDispute: { ok: 0.8, other: 0.2, silent: 0 },
      signature: { ok: 0.75, silent: 0.25 }, outcome: { heard: 0.7, continued: 0.15, silent: 0.15 }, calendarFix: { ok: 0.8, silent: 0.2 }, clerkPhone: { ok: 0.65, cannotFind: 0.35 },
      homeowner: { yes: 0.6, no: 0.2, noAnswer: 0.2 }, homeownerMove: { yes: 0.7, no: 0.15, noAnswer: 0.15 },
      answerAfterReminder: 0.55, answerAfterCall: 0.9, rescue: 0.7, phoneThenWritten: 0.4, noticesOwnClash: 0.5,
    },
  },
};

// How long things take, in hours unless stated (ESTIMATES).
export const DEFAULT_TIMING = {
  consultantHours: [0.2, 8],       // a consultant answers after this long, inside waking hours
  officeHours: [0.5, 10],          // an office answers after this long, inside its contact hours
  staffMinutes: [5, 60],           // a person picks an item from the queue after this long, inside staff hours
  statementHours: [4, 30],         // getting a statement from the homeowner
  staff: { start: '08:30', end: '17:30' },   // Monday to Friday
  waking: { start: '07:30', end: '21:30' },
  heartbeatHours: 3,               // the control loop also runs on a timer, not only on events
  tailDays: 4,                     // how long the run continues after the last hearing (outcomes)
  automationSeconds: 1,            // an automatic step goes out this long after the message that caused it
};

// Minutes of a person's time. ALL ESTIMATES. The middle column uses the same values as
// research/baseline_minutes.py and economics.py: read a routine message 2 (1 to 3), handle an
// exception 15 (8 to 25), write a message 5 (3 to 8), make a call 10 (5 to 15), approve a prepared
// draft 1 (2 when pessimistic), an exception that arrives with its context 7.5 (15 when pessimistic).
// The other values (review a sensitive draft, the longer person-only tasks) are the author's own.
export const MINUTES = {
  low: {
    approve: 0.5, draft: 2, statement: 5, triage: 4, signerFix: 3, phoneIn: 3,
    human: { homeowner: 5, call_office: 5, follow_up_call: 5, find_out: 8, escalate: 10, reinstate: 15, playbook: 8 }, humanDefault: 5,
    readRoutine: 1, readException: 8, write: 3,
  },
  mid: {
    approve: 1,          // one click (L1): read a prepared message and send it
    draft: 3,            // draft (L0): a person reviews a sensitive message and sends it personally
    statement: 10,       // the one draft that cannot just be sent: the statement has to be obtained from the homeowner
    triage: 7.5,         // read a message the system could not use, with its context on screen
    signerFix: 5,        // re-issue a signature request that named the wrong person
    phoneIn: 5,          // a clerk phones the firm: someone answers and logs it (same in both worlds)
    human: { homeowner: 10, call_office: 10, follow_up_call: 10, find_out: 15, escalate: 20, reinstate: 30, playbook: 15 },   // person-only tasks, same in both worlds
    humanDefault: 10,
    readRoutine: 2, readException: 15, write: 5,     // the manual world: read every message, write every message
  },
  high: {
    approve: 2, draft: 5, statement: 20, triage: 15, signerFix: 8, phoneIn: 8,
    human: { homeowner: 15, call_office: 15, follow_up_call: 15, find_out: 25, escalate: 30, reinstate: 45, playbook: 25 }, humanDefault: 15,
    readRoutine: 3, readException: 25, write: 8,
  },
};
export const DEFAULT_MINUTES = MINUTES.mid;

// Work counted in one run, priced with a minutes table. Returns minutes for both worlds:
// tower = the firm with the control tower; manual = a person reads every incoming message and
// writes every outgoing one, and does the same person-only tasks.
export function priceWork(work, table = DEFAULT_MINUTES) {
  const human = Object.entries(work.human || {}).reduce((s, [k, n]) => s + n * (table.human[k] ?? table.humanDefault), 0);
  const tower = work.approve * table.approve + work.draft * table.draft + work.statement * table.statement + work.triage * table.triage + work.signerFix * table.signerFix + work.phoneIn * table.phoneIn + human;
  const manual = work.readRoutine * table.readRoutine + work.readException * table.readException + work.write * table.write + work.statement * Math.max(table.statement, table.write) + work.signerFix * table.write + work.phoneIn * table.phoneIn + human;
  return { tower, manual };
}

// One-click classes in the default playbook. Promoting them to L2 is the "more autonomy" setting.
export const ONE_CLICK_CLASSES = ['confirm_assignment', 'staffing_submission', 'packet_send', 'chaser', 'change_request', 'request_clear_copy'];
export const promote = (classes = ONE_CLICK_CLASSES, to = 'L2') => Object.fromEntries(classes.map((k) => [k, to]));

// ---------------------------------------------------------------- name pools (fictional)
const CONSULTANT_FIRST = ['Maya', 'Leo', 'Nora', 'Owen', 'Priya', 'Eli', 'Anya', 'Bruno', 'Carys', 'Dario', 'Elsa', 'Farid', 'Greta', 'Hugo', 'Ines', 'Jonas', 'Kira', 'Lars', 'Mina', 'Nico', 'Odile', 'Pavel', 'Rhea', 'Soren', 'Tilda', 'Umar', 'Vera', 'Wim',
  'Xenia', 'Yusuf', 'Zora', 'Abel', 'Bianca', 'Cyrus', 'Delia', 'Emil', 'Freya', 'Goran', 'Hana', 'Ivo', 'Jelena', 'Kofi', 'Livia', 'Milan', 'Nadia', 'Oskar', 'Petra', 'Rafael', 'Selma', 'Tomas', 'Ulla', 'Viktor', 'Wanda', 'Yara', 'Zeno',
  'Agnes', 'Boris', 'Clara', 'Dmitri', 'Edda', 'Felix', 'Gilda', 'Henrik', 'Ilse', 'Jorge', 'Katya', 'Luca', 'Marta', 'Nils', 'Olga', 'Pablo', 'Rosalind', 'Stellan', 'Tariq', 'Ursula', 'Valentin', 'Wren', 'Ximena', 'Yann', 'Zelda',
  'Amara', 'Bastian', 'Cosima', 'Darius', 'Estelle', 'Florian', 'Gwen', 'Horatio', 'Imogen', 'Jasper', 'Kalinda', 'Lorcan', 'Mirela', 'Nestor', 'Ottilie', 'Percival', 'Quentin', 'Rumi', 'Sunniva', 'Thaddeus', 'Ulrich', 'Vesna', 'Wolfram', 'Yolanda', 'Zdenka',
  'Anselm', 'Brigid', 'Caspian', 'Dagny', 'Evander', 'Fenella', 'Gideon', 'Hedda', 'Ignatius', 'Juno', 'Kaspar', 'Leontyne', 'Magnus', 'Nerys', 'Orla', 'Phineas', 'Rosamund', 'Silas', 'Tamsin', 'Ulysses', 'Viola', 'Wilhelmina', 'Yevgeny', 'Zinnia'];
const CONSULTANT_LAST = ['Venn', 'Arlen', 'Pell', 'Tarris', 'Marden', 'Corven', 'Holt', 'Brandt', 'Keane', 'Voss', 'Lindqvist', 'Okafor', 'Reyes', 'Tanaka', 'Novak', 'Haddad', 'Castell', 'Dunmore', 'Ferris', 'Galen', 'Ibarra', 'Jansen', 'Kovac', 'Larkin', 'Moreau', 'Nakata', 'Oyelaran', 'Petrov', 'Quist', 'Rahal', 'Sorley', 'Tennant', 'Ueda', 'Varga', 'Wolcott', 'Yilmaz', 'Zamora'];
const OWNER_FIRST = ['Jamie', 'Alex', 'Sam', 'Riley', 'Cameron', 'Morgan', 'Casey', 'Devon', 'Emery', 'Finley', 'Harper', 'Jordan', 'Kendall', 'Logan', 'Marley', 'Noel', 'Parker', 'Reese', 'Skyler', 'Taylor', 'Blair', 'Corey', 'Ellis', 'Frankie', 'Hollis', 'Jules', 'Robin', 'Shay', 'Toby', 'Drew', 'Kerry', 'Lennox', 'Micah', 'Peyton', 'Sasha', 'Tatum'];
const OWNER_LAST = ['Vale', 'Fern', 'Briar', 'Hale', 'Marsh', 'Stone', 'Brooks', 'Carver', 'Dalton', 'Ember', 'Frost', 'Garner', 'Hayes', 'Irwin', 'Jarvis', 'Keller', 'Lowe', 'Mercer', 'Nash', 'Orton', 'Pryce', 'Quill', 'Rudd', 'Sloane', 'Thorne', 'Underhill', 'Vance', 'Whitby', 'Yates', 'Ashby', 'Bexley', 'Colby', 'Denholm', 'Eastman', 'Fairley', 'Gresham'];
const STREET_WORDS = ['Willow', 'Garden', 'Orchard', 'Meadow', 'Birch', 'Elm', 'Brook', 'Linden', 'Maple', 'Clover', 'Alder', 'Aspen', 'Cedar', 'Cypress', 'Magnolia', 'Poplar', 'Spruce', 'Sycamore', 'Thistle', 'Hawthorn', 'Chestnut', 'Walnut', 'Hickory', 'Larch', 'Tamarack', 'Yarrow', 'Bramble', 'Sorrel', 'Tansy', 'Fennel',
  'Quince', 'Medlar', 'Privet', 'Osier', 'Sumac', 'Beech', 'Hemlock', 'Mulberry', 'Dogwood', 'Redwood', 'Cottonwood', 'Buckthorn', 'Foxglove', 'Primrose', 'Bluebell', 'Lavender', 'Marigold', 'Saffron', 'Mallow', 'Bracken', 'Gorse', 'Lupin', 'Campion', 'Vetch', 'Teasel', 'Sedge', 'Pebble', 'Quarry', 'Harbor', 'Ferry',
  'Chapel', 'Abbey', 'Castle', 'Forge', 'Tannery', 'Granary', 'Windmill', 'Lantern', 'Beacon', 'Compass', 'Anchor', 'Cobble', 'Copper', 'Silver', 'Amber', 'Flint', 'Slate', 'Granite', 'Marble', 'Juniper'];
const STREET_SUFFIX = ['Lane', 'Street', 'Road', 'Avenue', 'Court', 'Drive', 'Way', 'Place', 'Close', 'Row', 'Terrace', 'Crescent'];
const COUNTY_PRE = ['Ald', 'Bram', 'Corr', 'Dun', 'Eld', 'Fal', 'Garr', 'Hal', 'Isen', 'Jor', 'Kel', 'Lorn', 'Marr', 'Nor', 'Oster', 'Pem', 'Quen', 'Rav', 'Sel', 'Thorn', 'Ulver', 'Vern', 'Wex', 'Yar', 'Zel'];
const COUNTY_SUF = ['mere', 'wick', 'fen', 'ford', 'holt', 'stead', 'marsh', 'dale', 'combe', 'haven', 'croft', 'bury'];
const NEW_STATES = ['Farrowmark', 'Greyfell', 'Highmoor', 'Ironvale', 'Kestrelshire', 'Lowmarch', 'Mistral', 'Northreach', 'Oakhollow', 'Pinecrest', 'Queensmere', 'Redwater', 'Stonebridge', 'Tidewater', 'Umberland', 'Westmark'];
const AVAILABILITY = [['Usually mornings', 'confirm each assignment'], ['Weekday afternoons preferred', 'may accept mornings'], ['Confirm by email', 'no standing commitment'], 'Work calendar excludes personal commitments', 'Remote hearings preferred', 'Contact for each batch'];
const HOURS_OPTIONS = [null, null, null, { days: 'Mon-Fri', start: '08:00', end: '15:00' }, { days: 'Mon-Fri', start: '08:30', end: '16:30' }, { days: 'Mon-Fri', start: '10:00', end: '15:00' }, { days: 'Mon-Fri', start: '09:00', end: '12:30' }];
const RULE_TEXT = {
  staffing_notice: 'Staffing notice naming the representative; government acknowledgment required before coverage is recorded as accepted.',
  email_case_ids: 'Email case IDs and representative name to clerk; government acknowledgment required.',
  form_then_call: 'Send the county staffing form, then call the clerk to have it entered on the list of representatives.',
};

// ---------------------------------------------------------------- message templates
// Every counterparty message the simulation writes itself (replies otherwise come from the
// engine's own reply templates in drafts.js). verifyTemplates() checks each against the reader.
const modeText = (mode) => (mode === 'video' ? 'by video' : 'in person');
const stop = (t) => (/[.!?]$/.test(t) ? t : `${t}.`);          // "at 9 a.m." already ends the sentence
export const TEMPLATES = {
  notice(variant, { props, date, times, mode, room, noticeDate, deadline, method }) {
    const P = listAnd(props), A = listAnd(props.map(addrOf)), D = longDate(date), T = listAnd(times.map(fmtTime)), n = props.length;
    const ask = deadline
      ? (method === 'staffing_notice' ? `Please return the staffing ${n === 1 ? 'notice' : 'notices'} for ${A} by ${fmtTime(deadline.time)} on ${longDate(deadline.date)}.` : `Please send the name of the representative by ${fmtTime(deadline.time)} on ${longDate(deadline.date)}.`)
      : null;
    switch (variant) {
      case 1: return { channel: 'email', body: `The ${n === 1 ? 'hearing' : 'hearings'} for ${P} ${n === 1 ? 'is' : 'are'} scheduled for ${D}, ${T} ${modeText(mode)}.${ask ? ' ' + ask : ''}` };
      case 2: return { channel: 'email', body: `${P}: ${D} at ${T} ${modeText(mode)}. ${ask || 'Please confirm your representative.'}` };
      case 3: return { channel: 'email', body: `${A} will be heard ${D} at ${T} ${modeText(mode)}. ${ask || 'Please send the name of the representative attending each hearing.'}` };
      case 4: return { channel: 'email', body: `Please identify the representative for ${P}, ${D} at ${T} ${modeText(mode)}.` };
      case 5: return { channel: 'mail transcript', body: `Notice dated ${longDate(noticeDate)}: ${P}, ${D} at ${T}, ${mode === 'video' ? 'video ' : ''}room ${room || 'B'}.${ask ? ' ' + ask : ''}` };
      default: return { channel: 'email', body: `We have set ${P} for ${D} at ${T}, ${modeText(mode)}. ${ask || 'Please tell us who will attend.'}` };
    }
  },
  moveWritten: (items) => items.map((i) => stop(`The hearing for ${i.addr} has been moved to ${longDate(i.date)} at ${fmtTime(i.time)}`)).join(' '),
  movePhone: (items) => `County clerk called: ${items.map((i, k) => stop(`${k ? 'The' : 'the'} hearing for ${i.addr} has been moved to ${longDate(i.date)} at ${fmtTime(i.time)}`)).join(' ')} A written notice will follow.`,
  dropout: (date, ill) => (ill ? `I am ill and cannot attend on ${longDate(date)}. I am sorry for the short notice.` : `I cannot attend on ${longDate(date)}. I have a conflict.`),
  volunteer: (addrs, date) => `I can cover ${addrs.length === 1 ? `the hearing for ${addrs[0]}` : addrs.length === 2 ? 'both hearings' : 'all of these hearings'} on ${longDate(date)}. Please confirm the assignment and send the files; I have not seen these cases.`,
  acceptEach: (addrs, date) => addrs.map((a) => `I accept the hearing for ${a} on ${longDate(date)}.`).join(' '),
  partial: (yes, no) => `${yes.map((a) => `I accept the hearing for ${a}.`).join(' ')} ${no.map((a) => `I cannot attend the hearing for ${a}.`).join(' ')}`,
  repLost: (addrs) => `We have not received an assignment for ${addrs.join(' and ')}.`,
  versionIssue: () => 'My links open version 1. Please send the current files.',
  question: () => 'Has anything changed? Please let me know what is current.',
  calendarBelief: (n, date) => `I have put ${n === 1 ? 'the hearing' : n === 2 ? 'both hearings' : 'all of these hearings'} on ${longDate(date)} in my calendar.`,
  ownerWithdraw: (addr) => `The homeowner for ${addr} has asked our office to withdraw the appeal. Please confirm the request with us so we can process it.`,
  ownerMove: (addr, from, to, time) => `The homeowner asked us to move the hearing for ${addr}. We have approved the request and moved it from ${longDate(from)} to ${stop(`${longDate(to)} at ${fmtTime(time)}`)}`,
  settlement: (addr, first) => `The settlement offer for ${addr} is ready for ${first} to sign.`,
  resign: (doc, addr, first) => `The ${doc} for ${addr} is ready for ${first} to sign.`,
  postpone: (addrs, date) => `The ${addrs.length === 1 ? 'hearing' : 'hearings'} for ${listAnd(addrs)} on ${longDate(date)} ${addrs.length === 1 ? 'is' : 'are'} postponed. A new date will follow.`,
  newDate: (addrs, date, times, mode) => `The ${addrs.length === 1 ? 'hearing' : 'hearings'} for ${listAnd(addrs)} ${addrs.length === 1 ? 'is' : 'are'} now set for ${longDate(date)} at ${listAnd(times.map(fmtTime))}, ${modeText(mode)}.`,
  unknownSender: (county, addr, date, time) => `I am the new clerk for ${county}. ${stop(`The hearing for ${addr} has been moved to ${longDate(date)} at ${fmtTime(time)}`)}`,
  unreadable: () => 'Thanks so much, have a good weekend!',
  noCaseNote: () => 'Our office will be closed for staff training next Friday.',
  driftForm: () => 'Emailing names is no longer enough. Please send the staffing form, then call to have it entered on the list of representatives.',
  driftLead: () => 'Our process has changed: case packets are now required 72 hours before the hearing.',
  statement: (addr, date) => `For ${addr}, submit the requested homeowner statement by ${longDate(date)} at 4 p.m. No further hearing is scheduled.`,
  packetPartly: (opened, bad) => `The ${opened.length === 1 ? 'attachment' : 'attachments'} for ${listAnd(opened)} opened. The file for ${bad} was unreadable. Please resend it.`,
};

// ---------------------------------------------------------------- world generator
function resolveScenario(name) {
  const s = typeof name === 'string' ? SCENARIOS[name] : name;
  if (!s) throw new Error(`Unknown scenario ${name}`);
  return s;
}

function prefixFree(names, taken) {
  const out = [];
  const low = (s) => s.toLowerCase();
  for (const n of names) {
    const clash = [...taken, ...out].some((t) => low(t).startsWith(low(n)) || low(n).startsWith(low(t)));
    if (!clash) out.push(n);
  }
  return out;
}

// makeSyntheticWorld({ base: { packet, playbooks }, hearings, counties, weeks, seed, mix })
// Returns { packet, playbooks, messages } in the shapes the engine takes, plus `shards`: the same
// world cut into independent pieces (one regional pod of consultants, one hearing week) that
// runSim runs one after another, and `meta`.
export function makeSyntheticWorld({ base, hearings = 100, counties = 10, weeks = 4, seed = 1, mix = {} } = {}) {
  if (!base || !base.packet || !base.playbooks) throw new Error('makeSyntheticWorld needs base: { packet, playbooks }');
  const scenario = resolveScenario(mix.scenario || 'typical');
  const EV = { ...scenario.events, ...(mix.events || {}) };
  const rng = makeRng(hashStr(`world|${seed}`));
  const tz = base.playbooks.default.office.tz;
  const defaultPb = base.playbooks.default;
  const blockSizes = mix.blockSizes || [[0.25, 1], [0.5, 2], [0.18, 3], [0.07, 4]];
  const leadDays = mix.leadDays || [7, 21];
  const shardHearings = mix.shardHearings || 30;

  // ---- counties: the real ones first, then generated ones that differ only as data
  const countyRecs = [], countyFiles = [], stateLayers = {};
  const realN = Math.min(counties, base.packet.counties.length);
  for (let i = 0; i < realN; i += 1) {
    const rec = base.packet.counties[i];
    countyRecs.push(clone(rec));
    countyFiles.push(clone(base.playbooks.counties.find((c) => c.county === rec.county)));
    if (base.playbooks.states && base.playbooks.states[rec.state]) stateLayers[rec.state] = clone(base.playbooks.states[rec.state]);
  }
  const taken = new Set(base.packet.counties.map((c) => c.county));
  const namePool = rng.shuffle(COUNTY_PRE.flatMap((p) => COUNTY_SUF.map((s) => p + s))).filter((n) => !taken.has(n));
  const newCount = Math.max(0, counties - realN);
  const perState = 6;
  for (let i = 0; i < newCount; i += 1) {
    const name = namePool[i % namePool.length] + (i >= namePool.length ? ` ${Math.floor(i / namePool.length) + 1}` : '');
    const state = NEW_STATES[Math.floor(i / perState) % NEW_STATES.length] + (Math.floor(i / perState) >= NEW_STATES.length ? ' East' : '');
    if (!stateLayers[state]) {
      // About a third of the new states set a rule for all their counties, so a county file there is even smaller.
      const kind = rng.weighted([[0.65, 'none'], [0.2, 'lead72'], [0.15, 'hours']]);
      stateLayers[state] = { id: `state-${slugOf(state)}`, layer: 'state', state, version: 1 };
      if (kind === 'lead72') stateLayers[state].packet = { lead_hours: 72, source_text: `${state} boards require case packets 72 hours before the hearing.` };
      if (kind === 'hours') stateLayers[state].office = { contact_hours: { days: 'Mon-Fri', start: '08:30', end: '16:30' } };
    }
    const method = rng.weighted([[0.45, 'staffing_notice'], [0.35, 'email_case_ids'], [0.2, 'form_then_call']]);
    const mode = rng.chance(0.6) ? 'video' : 'in_person';
    const hours = rng.pick(HOURS_OPTIONS);
    const slug = slugOf(name);
    const file = {
      id: slug, layer: 'county', county: name, state, version: 1, verified_at: '2030-05-20', verified_from: 'Onboarding call with the clerk (simulated)',
      office: { email: `clerk@${slug}.example`, ...(hours ? { contact_hours: hours } : {}) },
      hearing_mode: mode,
      staffing: { method, template: method === 'staffing_notice' ? 'staffing_notice' : method === 'form_then_call' ? 'staffing_form' : 'staffing_email', ...(method === 'form_then_call' ? { channel: 'email, then phone' } : {}), source_text: RULE_TEXT[method] },
      replacement: method === 'staffing_notice' ? { method: 'updated_staffing_notice', source_text: 'Submit an updated staffing notice naming the replacement for each changed case.' } : { method: 'email_replacement', source_text: 'Email the replacement name and affected case IDs.' },
    };
    const statePacket = stateLayers[state].packet;
    if (!statePacket && rng.chance(0.2)) file.packet = { lead_hours: 72, source_text: 'Send the current case packet at least 72 hours before the hearing.' };
    if (rng.chance(0.18)) file.packet = { ...(file.packet || {}), clerk_evidence: 'sent_on_time', clerk_evidence_source: 'The clerk does not send receipts (onboarding call, simulated).' };
    if (rng.chance(0.25)) file.signatures = { attending_consultant_signs: true, source_text: 'This county requires the attending consultant\'s signature.' };
    countyFiles.push(file);
    const ch = hours || (stateLayers[state].office && stateLayers[state].office.contact_hours) || defaultPb.office.contact_hours;
    countyRecs.push({ county: name, state, office_email: file.office.email, timezone: 'UTC-05:00 (fixed for this exercise)', hearing_mode: mode, staffing_rule: RULE_TEXT[method], replacement_rule: file.replacement.source_text,
      schedule_rule: defaultPb.schedule_changes.source_text, packet_rule: (file.packet && file.packet.source_text) || (statePacket && statePacket.source_text) || defaultPb.packet.source_text, contact_hours: `${ch.start}-${ch.end} local, Monday-Friday` });
  }
  const layersAll = { default: clone(defaultPb), states: stateLayers, counties: countyFiles };
  const booksAll = resolvePlaybooks(layersAll);

  // ---- pods: neighbouring counties that share a group of consultants
  const perWeek = hearings / weeks;
  const podCount = Math.max(1, Math.min(countyRecs.length, Math.round(perWeek / shardHearings)));
  const order = countyRecs.map((c, i) => ({ c, i })).sort((a, b) => a.c.state.localeCompare(b.c.state) || a.i - b.i).map((x) => x.c.county);
  const podOf = {};
  order.forEach((name, i) => { podOf[name] = Math.min(podCount - 1, Math.floor(i * podCount / order.length)); });
  const podCounties = Array.from({ length: podCount }, (_, p) => order.filter((n) => podOf[n] === p));

  // ---- blocks of hearings (same county, same day, consecutive slots)
  const weightOf = {};
  rng.shuffle(countyRecs.map((c) => c.county)).forEach((name, i) => { weightOf[name] = 1 / (1 + 0.12 * i); });
  const countyPick = countyRecs.map((c) => [weightOf[c.county], c.county]);
  const blocks = [];
  let left = hearings;
  const usedSlots = {};
  while (left > 0) {
    const size = Math.min(left, rng.weighted(blockSizes));
    const county = rng.weighted(countyPick);
    let date, start;
    for (let tries = 0; tries < 20; tries += 1) {
      date = isoAdd(START_MONDAY, 7 * rng.int(0, weeks - 1) + rng.int(0, 4));
      start = 540 + 30 * rng.int(0, Math.max(0, 12 - size + 1));
      const key = `${county}|${date}`;
      const used = usedSlots[key] || (usedSlots[key] = new Set());
      const slots = Array.from({ length: size }, (_, k) => start + 30 * k);
      if (slots.some((s) => used.has(s)) && tries < 19) continue;
      slots.forEach((s) => used.add(s));
      break;
    }
    blocks.push({ county, date, start, size });
    left -= size;
  }

  // ---- consultants: a roster per pod, sized by the pod's weekly volume
  const podWeekly = podCounties.map((names) => blocks.filter((b) => names.includes(b.county)).reduce((s, b) => s + b.size, 0) / weeks);
  const firstNames = prefixFree(CONSULTANT_FIRST, [...STREET_WORDS, ...countyRecs.map((c) => c.county)]);
  const consultants = [];
  const podRoster = podCounties.map(() => []);
  let ci = 0;
  for (let p = 0; p < podCount; p += 1) {
    const n = Math.max(5, Math.min(14, Math.ceil(podWeekly[p] / 5)));
    for (let k = 0; k < n; k += 1) {
      const first = firstNames[ci % firstNames.length] + (ci >= firstNames.length ? `${Math.floor(ci / firstNames.length) + 1}` : '');
      const last = CONSULTANT_LAST[(ci * 7 + 3) % CONSULTANT_LAST.length];
      ci += 1;
      const names = podCounties[p];
      const all = k < 2 || rng.chance(0.55);
      const eligible = all ? [...names] : names.filter(() => rng.chance(0.6));
      const rec = {
        name: `${first} ${last}`, consultant_id: `R${String(ci).padStart(2, '0')}`, email: `${first.toLowerCase()}@consultants.example`,
        eligible_counties: eligible.length ? eligible : [rng.pick(names)],
        calendar_access: rng.weighted([[0.5, 'None'], [0.25, 'Free/busy only'], [0.25, 'Shared work calendar']]),
        availability_note: rng.pick(AVAILABILITY), max_hearings_per_day: String(rng.int(4, 8)),
        notice_preference: rng.weighted([[0.65, 'email'], [0.2, 'text'], [0.15, 'phone']]), rate_per_hearing: String(75 + 5 * rng.int(0, 7)),
      };
      consultants.push(rec);
      podRoster[p].push(rec);
    }
    // every county needs at least three eligible consultants
    for (const name of podCounties[p]) {
      const have = podRoster[p].filter((k) => k.eligible_counties.includes(name));
      for (const k of rng.shuffle(podRoster[p])) { if (have.length >= 3) break; if (!k.eligible_counties.includes(name)) { k.eligible_counties.push(name); have.push(k); } }
    }
  }
  const consFirst = new Set(consultants.map((k) => k.name.split(' ')[0].toLowerCase()));
  const ownerFirst = OWNER_FIRST.filter((n) => ![...consFirst].some((f) => n.toLowerCase().startsWith(f) || f.startsWith(n.toLowerCase())));

  // ---- playbook drift: an office changes its process during the run
  const drift = {};
  for (const rec of countyRecs) {
    if (!rng.chance(EV.driftPerCounty)) continue;
    const mine = blocks.filter((b) => b.county === rec.county);
    if (!mine.length) continue;
    const pb = booksAll[rec.county];
    const type = pb.staffing.method !== 'form_then_call' ? 'form' : pb.packet.lead_hours === 48 ? 'lead' : null;
    if (!type) continue;
    const b = rng.pick(mine);
    drift[rec.county] = { county: rec.county, type, at: toTs(addWorkdays(b.date, -rng.int(6, 12)), '10:00', tz), text: type === 'form' ? TEMPLATES.driftForm() : TEMPLATES.driftLead() };
  }

  // ---- cases, documents, notices and the script of outside events
  const cases = [], documents = [], messages = [], scripts = [];
  const usedStreet = new Set(), usedOwner = new Set();
  let caseSeq = 1000, custSeq = 1000, msgSeq = 0;
  const styleOf = (county) => hashStr(`style|${county}`) % 6;
  const sortedBlocks = blocks.map((b, i) => ({ ...b, index: i })).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start || a.index - b.index);
  for (const b of sortedBlocks) {
    const pb = booksAll[b.county];
    const rec = countyRecs.find((c) => c.county === b.county);
    let street;
    for (let tries = 0; tries < 50; tries += 1) { street = `${rng.pick(STREET_WORDS)} ${rng.pick(STREET_SUFFIX)}`; if (!usedStreet.has(street)) break; }
    const reused = usedStreet.has(street);
    usedStreet.add(street);
    const owner = () => { let n; for (let t = 0; t < 30; t += 1) { n = `${rng.pick(ownerFirst)} ${rng.pick(OWNER_LAST)}`; if (!usedOwner.has(n)) break; } usedOwner.add(n); return n; };
    const shared = rng.chance(0.6) ? owner() : null;
    const hasV2 = rng.chance(0.35);
    const ids = [], props = [], times = [];
    let num = (reused ? 200 + 13 * (cases.length % 50) : 0) + rng.int(3, 40);
    for (let k = 0; k < b.size; k += 1) {
      const property = `${num} ${street}, ${b.county}`;
      num += rng.int(8, 30);
      const id = `AX-${++caseSeq}`;
      const homeowner = shared || owner();
      const time = hhmm(b.start + 30 * k);
      const slug = slugOf(addrOf(property));
      cases.push({ property, case_id: id, customer_id: `H${++custSeq}`, homeowner, county: b.county, state: rec.state, tax_year: '2029', hearing_date: b.date, hearing_time: time, timezone: 'UTC-05:00', consultant_id: '', status: 'hearing_scheduled',
        packet_reference: `${slug}-packet-v${hasV2 ? 2 : 1}.txt`, record_updated_at: `${isoAdd(b.date, -5)}T18:00:00${tz}` });
      for (let v = 1; v <= (hasV2 ? 2 : 1); v += 1) {
        documents.push({ name: `${slug}-packet-v${v}.txt`, kind: 'packet', version: v, case_id: id,
          text: `FICTIONAL TRAINING DOCUMENT\nProperty: ${property}\nHomeowner: ${homeowner}\nCase: ${id}\nCounty: ${b.county}\nTax year: 2029\nPacket version: ${v}\nPrepared: 2030-05-2${v}\nContents: appeal summary, property worksheet${v > 1 ? ', homeowner statement' : ''}.\nThis fixture contains no real evidence or legal analysis.` });
      }
      if (rng.chance(EV.staleNoticeFile)) {
        const who = rng.pick(podRoster[podOf[b.county]]);
        const status = rng.chance(0.5) ? 'recorded (simulated)' : 'not yet submitted';
        documents.push({ name: `${slug}-assignment-v1.txt`, kind: 'staffing_notice', version: 1, case_id: id, text: `FICTIONAL STAFFING NOTICE\nProperty: ${property}\nCase: ${id}\nCounty: ${b.county}\nRepresentative: ${who.name}\nStatus: ${status}` });
      }
      ids.push(id); props.push(property); times.push(time);
    }
    const mode = pb.hearing_mode;
    const firstStart = toTs(b.date, times[0], tz);
    const short = rng.chance(EV.shortNotice);
    const lead = short ? rng.int(3, 5) : rng.int(leadDays[0], leadDays[1]);
    const noticeDate = prevWeekday(isoAdd(b.date, -lead));
    const ch = pb.office.contact_hours;
    const opens = +ch.start.slice(0, 2) * 60 + +ch.start.slice(3), closes = +ch.end.slice(0, 2) * 60 + +ch.end.slice(3);
    const noticeAt = toTs(noticeDate, hhmm(opens + rng.int(0, Math.max(1, closes - opens - 1))), tz);
    const variant = styleOf(b.county);
    const withDeadline = !short && rng.chance(EV.deadlineInNotice) && variant !== 4;
    const deadline = withDeadline ? { date: addWorkdays(b.date, -rng.int(2, 3)), time: '16:00' } : null;
    const room = variant === 5 ? rng.pick(['A', 'B', 'C', 'D']) : null;
    const t = TEMPLATES.notice(variant, { props, date: b.date, times, mode, room, noticeDate, deadline, method: pb.staffing.method });
    const week = Math.floor((isoToUtc(b.date) - isoToUtc(START_MONDAY)) / (7 * DAY));
    const block = { index: b.index, county: b.county, pod: podOf[b.county], week, date: b.date, times, ids, props, mode, hasV2, noticeAt, firstStart };
    messages.push({ id: `n${++msgSeq}`, at: noticeAt, block: b.index, sender: `${b.county} hearing office`, address: rec.office_email, channel: t.channel, body: t.body, caseIds: ids });

    // outside events for this block, at times fixed now (as a share of the time between notice and
    // hearing). Offices write and phone in their contact hours, consultants in waking hours.
    const span = firstStart - noticeAt;
    const when = (lo, hi) => noticeAt + rng.between(lo, hi) * span;
    const FROM_CONSULTANT = ['dropout', 'version_issue', 'question', 'calendar_belief', 'unreadable', 'unknown_sender'];
    const add = (type, raw, extra = {}) => {
      const at = FROM_CONSULTANT.includes(type) ? within(raw, DEFAULT_TIMING.waking.start, DEFAULT_TIMING.waking.end, false, tz)
        : type === 'settlement' ? within(raw, DEFAULT_TIMING.staff.start, DEFAULT_TIMING.staff.end, true, tz) : nextOpen(pb, raw);
      scripts.push({ type, at, block: b.index, pod: block.pod, week, county: b.county, ids, ...extra });
    };
    const one = () => rng.int(0, ids.length - 1);
    if (rng.chance(EV.moveWritten)) add('move_written', when(0.25, 0.85), { part: rng.chance(0.4) && ids.length > 1 ? one() : null, plusDays: rng.int(2, 7) });
    if (rng.chance(EV.movePhone)) add('move_phone', when(0.25, 0.8), { part: one(), plusDays: rng.int(2, 7) });
    if (rng.chance(EV.dropout)) add('dropout', when(0.45, 0.98), { ill: rng.chance(0.4), volunteer: rng.chance(EV.volunteerAfterDropout) });
    if (rng.chance(EV.repLost)) add('rep_lost', when(0.4, 0.92));
    if (hasV2 && rng.chance(EV.versionIssue / 0.35)) add('version_issue', when(0.4, 0.9));
    if (rng.chance(EV.question)) add('question', when(0.3, 0.9));
    if (rng.chance(EV.calendarBelief)) add('calendar_belief', when(0.3, 0.85));
    if (rng.chance(EV.ownerWithdraw)) add('owner_withdraw', when(0.2, 0.85), { part: one() });
    if (rng.chance(EV.ownerMove)) add('owner_move', when(0.2, 0.8), { part: one(), plusDays: rng.int(3, 8) });
    if (rng.chance(EV.settlement)) add('settlement', when(0.35, 0.85), { part: one(), wrong: rng.chance(EV.wrongSigner) });
    if (rng.chance(EV.postpone)) add('postpone', when(0.3, 0.9), { newDate: rng.chance(EV.postponeNewDate), afterDays: rng.int(2, 5), plusDays: rng.int(5, 12) });
    if (rng.chance(EV.unknownSender)) add('unknown_sender', when(0.2, 0.9), { part: one(), plusDays: rng.int(1, 4) });
    if (rng.chance(EV.unreadable)) add('unreadable', when(0.2, 0.95));
    if (rng.chance(EV.noCaseNote)) add('no_case_note', when(0.1, 0.9));
    blocks[b.index] = block;
  }
  for (const d of Object.values(drift)) if (d.type === 'lead') { const b = blocks.find((x) => x.county === d.county && x.noticeAt <= d.at && x.firstStart > d.at + 2 * DAY) || null; if (b) scripts.push({ type: 'drift_lead', at: d.at, block: b.index, pod: b.pod, week: b.week, county: d.county, ids: b.ids }); }

  // ---- shards: one pod, one hearing week. Notices in a shard are kept at least 20 minutes apart.
  const shards = [];
  for (let p = 0; p < podCount; p += 1) {
    const weeksHere = [...new Set(blocks.filter((b) => b.pod === p).map((b) => b.week))].sort((a, b) => a - b);
    for (const w of weeksHere) {
      const mine = blocks.filter((b) => b.pod === p && b.week === w);
      const idSet = new Set(mine.flatMap((b) => b.ids));
      const names = podCounties[p];
      const msgs = messages.filter((m) => idSet.has(m.caseIds[0])).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)).map((m) => ({ ...m }));
      for (let i = 1; i < msgs.length; i += 1) if (msgs[i].at < msgs[i - 1].at + 20 * MIN) msgs[i].at = msgs[i - 1].at + 20 * MIN;
      const firstNotice = msgs.length ? msgs[0].at : 0;
      // A process change that was approved before this shard's first notice is already in its playbook.
      const files = countyFiles.filter((f) => names.includes(f.county)).map((f) => {
        const d = drift[f.county];
        if (!d || firstNotice < d.at + 2 * DAY) return clone(f);
        const changes = proposeChange(booksAll[f.county], d.text);
        return changes.length ? applyChange(clone(f), changes, { date: localParts(d.at + DAY, tz).date, source: 'Approved in an earlier week (simulated)' }) : clone(f);
      });
      const states = Object.fromEntries(Object.entries(stateLayers).filter(([s]) => countyRecs.some((c) => names.includes(c.county) && c.state === s)).map(([s, v]) => [s, clone(v)]));
      const liveDrift = Object.values(drift).filter((d) => names.includes(d.county) && firstNotice < d.at + 2 * DAY && d.type === 'form').map((d) => ({ ...d }));
      shards.push({
        id: `pod${p + 1}-week${w + 1}`, pod: p, week: w, seed: hashStr(`shard|${seed}|${p}|${w}`),
        packet: { messages: [], cases: cases.filter((c) => idSet.has(c.case_id)), consultants: clone(podRoster[p]), counties: countyRecs.filter((c) => names.includes(c.county)).map(clone), documents: documents.filter((d) => idSet.has(d.case_id)) },
        playbooks: { default: clone(defaultPb), states, counties: files },
        messages: msgs, scripts: scripts.filter((s) => idSet.has(s.ids[0])).map((s) => ({ ...s })), blocks: mine.map((b) => ({ ...b })), drift: liveDrift,
      });
    }
  }

  const countySummary = countyFiles.map((f) => ({ county: f.county, state: f.state, real: base.packet.counties.some((c) => c.county === f.county), method: booksAll[f.county].staffing.method, mode: booksAll[f.county].hearing_mode,
    lead_hours: booksAll[f.county].packet.lead_hours, clerk_evidence: booksAll[f.county].packet.clerk_evidence, hours: `${booksAll[f.county].office.contact_hours.start}-${booksAll[f.county].office.contact_hours.end}`,
    own_fields: booksAll[f.county].own_fields, inherited_fields: booksAll[f.county].inherited_fields, layers: booksAll[f.county].layers, hearings: blocks.filter((b) => b.county === f.county).reduce((s, b) => s + b.size, 0) }));
  return {
    meta: { hearings, counties: countyRecs.length, weeks, seed, scenario: typeof (mix.scenario || 'typical') === 'string' ? (mix.scenario || 'typical') : 'custom', pods: podCount, consultants: consultants.length, blocks: blocks.length, shards: shards.length,
      stateLayers: Object.values(stateLayers).filter((s) => s.packet || s.office).length, drift: Object.values(drift).map((d) => ({ county: d.county, type: d.type })), start: START_MONDAY },
    packet: { messages: [], cases, consultants, counties: countyRecs, documents },
    playbooks: layersAll,
    messages: messages.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)),
    shards, counties: countySummary,
  };
}

// ---------------------------------------------------------------- the closed loop for one shard
const GLITCH = [/\.\.(?!\.)/, /undefined/, /NaN/, /\[object/, /\bnull\b/];
const SCHEDULE_TYPES = ['hearing_scheduled', 'hearing_confirmed', 'schedule_changed'];
const REPLY_MAP = {
  offer: ['offer', ['accept', 'decline', 'unsure']], nudge: ['nudge', ['accept', 'decline', 'unsure']], reconfirm: ['reconfirm', ['accept', 'decline', 'unsure']],
  staffing: ['officeStaffing', ['ok', 'nothing']], chase_rep: ['officeStaffing', ['ok', 'nothing']], call_office: ['clerkPhone', ['ok', 'cannotFind']],
  verify_lead: ['officeWritten', ['ok', 'other']], chase_written: ['officeWritten', ['ok', 'other']], confirm_assignment: ['receipt', ['ok']],
  signature: ['signature', ['ok']], clear_copy: ['signature', ['ok']], obligation: ['officeObligation', ['ok', 'relist']], dispute: ['officeDispute', ['ok', 'other']],
  outcome: ['outcome', ['heard', 'continued']], consultant_update: ['calendarFix', ['ok']],
};
const CLOSED_OK = ['release', 'postponed_notice', 'stand_down'];           // the only routine messages about a hearing that is off
const DOCUMENT_WORK = ['obligation', 'dispute', 'signature', 'clear_copy'];   // paperwork that continues whatever happens to the hearing
const PERSON_ONLY = ['homeowner', 'call_office', 'follow_up_call', 'find_out', 'escalate', 'reinstate', 'playbook'];   // calls and decisions: a person does them in both worlds
const PHONE_TASKS = ['homeowner', 'call_office', 'follow_up_call', 'find_out', 'escalate', 'reinstate'];
// Which queue items work on which gate (to say what a hearing that is not ready is waiting on).
const GATE_KINDS = { G1: ['chase_written', 'verify_lead'], G2: ['offer', 'confirm_assignment', 'reconfirm', 'nudge', 'escalate'], G3: ['staffing', 'chase_rep', 'call_office', 'playbook'], G4: ['send_packet'], G5: ['signature', 'clear_copy', 'obligation', 'dispute', 'homeowner', 'reinstate'] };

export function mergeMinutes(base, over) {
  if (!over) return base;
  return { ...base, ...over, human: { ...base.human, ...(over.human || {}) } };
}
function resolveOptions(options = {}) {
  const scenario = resolveScenario(options.scenario || 'typical');
  const behaviour = { ...clone(scenario.behaviour), ...(options.behaviour || {}) };
  const timing = { ...DEFAULT_TIMING, ...(options.timing || {}) };
  const minutes = mergeMinutes(DEFAULT_MINUTES, options.minutes);
  return { behaviour, timing, minutes, autonomy: options.autonomy || {}, events: { ...scenario.events, ...(options.events || {}) }, maxOpenTargets: options.maxOpenTargets || 22, collectLog: !!options.collectLog, maxSteps: options.maxSteps || 40000 };
}

// SAFETY: must be zero. FAULTS: engine behaviour that is wrong but not unsafe. LIMITS: where the run had to stop.
export const SAFETY_CHECKS = ['readyWithoutAuthority', 'autoToHomeowner', 'routineOnClosedHearing', 'dropped', 'attentionWithoutTask', 'templateFaults', 'engineErrors'];
export const FAULT_CHECKS = ['doubleBooked', 'committedWhileIll', 'resentWhileWaiting', 'notReadyNothingQueued', 'neverScheduled', 'tooManyEvents'];
export const LIMIT_CHECKS = ['searchLimit'];

function emptyStats() {
  return {
    hearings: 0, held: 0, ready: 0, readyAudited: 0, readyButNobodyCanAttend: 0, coreReady: 0, covered: 0, coveredAudited: 0, uncovered: 0, notReady: {}, waitingOn: {}, fate: { withdrawn: 0, postponed: 0, later: 0, never: 0, lostToAbort: 0 },
    selfDeclined: { ill: 0, clash: 0, missed: 0 },
    inbound: 0, inboundException: 0, inboundBy: {}, logs: 0, phoneIn: 0, firmNotes: 0,
    out: { L2: 0, L1: 0, L0: 0, human: 0 }, kinds: {}, reminders: 0, calls: 0, triage: 0, stale: 0, refused: 0, fixes: 0, rescued: 0, heldBack: 0, scriptsFired: {}, scriptsSkipped: {},
    work: { approve: 0, draft: 0, statement: 0, triage: 0, signerFix: 0, phoneIn: 0, human: {}, readRoutine: 0, readException: 0, write: 0 },
    days: {}, steps: 0, plans: 0, noteOnly: 0, restated: 0, blockedAtStart: 0, paperworkOnClosed: 0, auditBlind: 0, auditBlindWhy: {},
    invariants: Object.fromEntries([...SAFETY_CHECKS, ...FAULT_CHECKS, ...LIMIT_CHECKS].map((k) => [k, 0])),
    incidents: [], examples: [], aborted: null, peakOpen: 0, slowestPlanMs: 0, slowestPlanOpen: 0,
  };
}

export function runShard(shard, options = {}) {
  const o = resolveOptions(options);
  const B = o.behaviour, TM = o.timing, MN = o.minutes;
  const playbooks = clone(shard.playbooks);
  Object.assign(playbooks.default.autonomy, o.autonomy);
  const eng = createEngine({ packet: shard.packet, playbooks, reader: extractWithRules });
  const dir = eng.dir, state = eng.state;
  const tz = playbooks.default.office.tz;
  const seed = shard.seed;
  const U = (key) => u01(seed, key);
  const between = (key, range) => range[0] + U(key) * (range[1] - range[0]);
  const stats = emptyStats();
  stats.hearings = shard.packet.cases.length;
  const clock = typeof options.clock === 'function' ? options.clock : null;   // only to measure how long a plan takes; never used for logic
  const log = [];
  const note = (type, text) => { if (o.collectLog) log.push({ at: now, type, text }); };
  const incident = (type, detail) => { stats.invariants[type] = (stats.invariants[type] || 0) + 1; if (stats.incidents.length < 40) stats.incidents.push({ type, shard: shard.id, seed: shard.seed, at: now ? `${localParts(now, tz).date} ${localParts(now, tz).time}` : '', detail: String(detail).slice(0, 400) }); };

  // ---- clock and windows
  let now = 0, seq = 0, inSeq = 0;
  const Q = new Heap();
  const push = (t, type, data = {}) => Q.push({ t: Math.max(t, now), n: seq++, type, ...data });
  const staffAt = (t) => within(t, TM.staff.start, TM.staff.end, true, tz);
  const wakingAt = (t) => within(t, TM.waking.start, TM.waking.end, false, tz);
  // An office answers in its contact hours. Mail that waited overnight is answered some time in
  // the first hour and a half, not all at the opening minute.
  const officeAt = (county, t, key) => {
    const pb = eng.books[county];
    const open = nextOpen(pb, t);
    return open === t || !key ? open : nextOpen(pb, open + U(`open|${key}`) * 90 * MIN);
  };
  const dayRec = () => { const d = localParts(now, tz).date; return stats.days[d] || (stats.days[d] = { tower: 0, touches: 0, hearings: 0 }); };
  const person = (cls, mins, kind) => {            // a person spent time: count the class of work and the minutes of that day
    if (cls === 'human') stats.work.human[kind] = (stats.work.human[kind] || 0) + 1; else stats.work[cls] += 1;
    const d = dayRec(); d.tower += mins; d.touches += 1;
  };

  // ---- bookkeeping
  const byId = new Map();              // message id -> ledger entry, for the authority audit
  const hearingAt = {};                // case -> start time the evaluation is booked for
  const evaluated = {};                // case -> result at its start
  const pendingStaff = new Map();      // item key -> time a person will handle it
  const sendCount = new Map(), staffCount = new Map(), wakes = new Set(), scanned = new Set(), fixed = new Set(), needTwin = [];
  const lastActed = new Map(), stuck = new Map();   // actions that are still listed as to do right after they were sent
  const illDays = new Map();           // consultant -> days they reported sick (what is true in the simulated world)
  const pendingAttention = [];
  const bump = (map, key) => { const n = (map.get(key) || 0) + 1; map.set(key, n); return n; };
  const ownerNames = new Set(dir.cases.map((c) => c.homeowner));
  const toHomeowner = (it) => !!it.to && (it.to.kind === 'homeowner' || ownerNames.has(it.to.name) || it.klass === 'homeowner_contact');
  const sig = (it) => `${it.phase}|${it.reminder || 0}|${it.kind}|${it.cases.join('+')}|${(it.to && (it.to.id || it.to.name)) || ''}`;
  const firstOf = (id) => dir.consultantById[id].first;
  const caseAddr = (id) => addrOf(dir.caseById[id].property);
  let lastStart = Math.max(0, ...shard.blocks.map((b) => b.firstStart));
  let failed = false;

  const safe = (what, fn) => {
    try { return fn(); } catch (e) {
      failed = true;
      incident('engineErrors', `${what}: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
      stats.aborted = stats.aborted || `engine threw during ${what}`;
      return null;
    }
  };

  function scan(where, text) {
    const s = String(text == null ? '' : text);
    for (const re of GLITCH) if (re.test(s)) { incident('templateFaults', `${where}: ${s.slice(0, 200)}`); return; }
  }
  function scanItem(it) {
    const k = `${it.key}|${it.title}|${it.phase}`;
    if (scanned.has(k)) return;
    scanned.add(k);
    scan(`${it.key} title`, it.title); scan(`${it.key} why`, it.why);
    if (it.draft) { scan(`${it.key} subject`, it.draft.subject); scan(`${it.key} body`, it.draft.body); for (const a of it.draft.attachments || []) { scan(`${it.key} attachment`, typeof a === 'string' ? a : a.name); if (a && a.text) scan(`${it.key} attachment`, a.text); } }
    for (const r of it.replies || []) scan(`${it.key} reply`, r.message.body);
    for (const c of it.checks || []) scan(`${it.key} check`, c);
  }

  // ---- incoming messages
  function deliver(raw, kind) {
    if (failed) return null;
    const entry = safe('ingest', () => eng.ingest({ id: `in-${++inSeq}`, at: now, ...raw }));
    if (!entry) return null;
    stats.steps += 1;
    byId.set(entry.id, entry);
    const exception = entry.opened.some((i) => i.severity === 'problem') || entry.attention.length > 0;
    if (kind === 'log') stats.logs += 1;                                   // a person logging their own call: part of that task
    else if (kind === 'firm') stats.firmNotes += 1;                        // the firm's own message entering the record
    else if (kind === 'phone_in') { stats.phoneIn += 1; person('phoneIn', MN.phoneIn); }   // a clerk phones: someone answers, in both worlds
    else {
      stats.inbound += 1;
      stats.inboundBy[entry.role] = (stats.inboundBy[entry.role] || 0) + 1;
      if (exception) { stats.inboundException += 1; stats.work.readException += 1; } else stats.work.readRoutine += 1;
    }
    // Nothing is dropped silently: an incoming message has an effect, a follow-up, or a task for a person.
    if (entry.direction === 'in' || entry.verbal) {
      const used = entry.claims.some((c) => !['rejected', 'signal', 'note'].includes(c.disposition));
      const lead = entry.claims.some((c) => c.disposition === 'signal' && SCHEDULE_TYPES.includes(c.type) && c.date);
      if (used && !entry.attention.length && !entry.claims.some((c) => c.effects && c.effects.length)) { stats.restated += 1; note('restated', entry.body); }   // understood, and the record already said so
      if (entry.attention.length) pendingAttention.push(entry.id);
      else if (!used && !lead) {
        if (entry.claims.length && entry.claims.every((c) => c.disposition === 'note')) { stats.noteOnly += 1; note('note_only', entry.body); }
        else incident('dropped', `${entry.sender} (${entry.channel}): ${entry.body}`);
      }
    }
    note('in', `${entry.sender} [${entry.channel}] ${entry.body} => ${entry.claims.map((c) => `${c.type}:${c.disposition}`).join(', ') || 'nothing'}`);
    // book the evaluation of every hearing this message scheduled or moved
    for (const id of entry.caseIds) {
      const L = state.cases[id];
      const start = L.schedule && L.schedule.date && L.schedule.time ? toTs(L.schedule.date, L.schedule.time, tz) : null;
      if (start && hearingAt[id] !== start) { hearingAt[id] = start; push(start - 1, 'hearing', { id, start }); lastStart = Math.max(lastStart, start); }
      if (!start) hearingAt[id] = null;
    }
    // a continued hearing is often followed by a request for a homeowner statement
    for (const c of entry.claims) {
      if (c.type !== 'outcome_reported' || c.disposition !== 'fact' || c.result !== 'continued') continue;
      for (const id of c.cases) if (U(`stmt|${id}`) < o.events.statementAfterContinued) push(officeAt(dir.caseById[id].county, now + between(`stmtAt|${id}`, [4, 30]) * HOURS, `stmt|${id}`), 'script', { s: { type: 'statement', ids: [id], county: dir.caseById[id].county } });
    }
    return entry;
  }
  const officeMsg = (county, body, caseIds, channel = 'email') => ({ sender: `${county} hearing office`, address: dir.counties.find((c) => c.county === county).office_email, channel, body, ...(caseIds ? { caseIds } : {}) });
  const consChannel = (k) => ({ email: 'email', text: 'text note', phone: 'phone note' }[k.notice_preference] || 'email');
  const consMsg = (id, body, caseIds) => { const k = dir.consultantById[id]; const channel = consChannel(k); return { sender: k.name, ...(channel === 'email' ? { address: k.email } : {}), channel, body, caseIds }; };
  function withAddress(message) {
    if (message.address || message.channel !== 'email') return message;
    const m = /^(.*) hearing office$/.exec(message.sender);
    if (m) { const c = dir.counties.find((x) => x.county === m[1]); return c ? { ...message, address: c.office_email } : message; }
    const k = dir.consultants.find((x) => x.name === message.sender);
    return k ? { ...message, address: k.email } : message;
  }

  // ---- counterparties
  function choose(table, names, key, forceAnswer) {
    const w = B[table];
    const pairs = names.map((n) => [w[n] || 0, n]);
    if (!forceAnswer && w.silent) pairs.push([w.silent, 'silent']);
    const total = pairs.reduce((s, p) => s + p[0], 0);
    if (total <= 0) return names[0];
    let x = U(key) * total;
    for (const [wt, n] of pairs) { x -= wt; if (x < 0) return n; }
    return pairs[pairs.length - 1][1];
  }
  function scheduleReply(it, { tag, forceAnswer = false, twinReplies = null } = {}) {
    const key = `${it.key}|${tag}`;
    const replies = twinReplies || it.replies || [];
    if (!replies.length) return;
    let table, names;
    if (it.kind === 'send_packet') [table, names] = it.to.kind === 'office' ? ['officePacket', ['ok', 'unreadable']] : ['receipt', ['ok']];
    else if (it.kind === 'homeowner') [table, names] = [it.change === 'withdrawal' ? 'homeowner' : 'homeownerMove', ['yes', 'no', 'noAnswer']];
    else if (REPLY_MAP[it.kind]) [table, names] = REPLY_MAP[it.kind];
    else return;
    const county = it.county;
    // an office that never sends receipts stays silent about packets
    if (it.kind === 'send_packet' && it.to.kind === 'office' && eng.books[county].packet.clerk_evidence === 'sent_on_time' && !forceAnswer) return;
    // the office answers a staffing email by announcing a new process
    const d = it.kind === 'staffing' && shard.drift.find((x) => x.county === county && now >= x.at && !x.done);
    if (d && eng.books[county].staffing.method !== 'form_then_call') {
      d.done = true;
      push(officeAt(county, now + between(`${key}|d`, TM.officeHours) * HOURS, `${key}|d`), 'msg', { raw: officeMsg(county, d.text, it.cases), kind: 'reply' });
      return;
    }
    const branch = choose(table, names, key, forceAnswer);
    const n = it.cases.length;
    // A yes is checked again when it is delivered: the simulated consultant does not say yes for a
    // day they reported sick, and usually notices a clash with a hearing they already hold.
    const guard = ['offer', 'nudge', 'reconfirm'].includes(it.kind) ? { consultant: it.to.id, cases: it.cases, key } : null;
    if (branch === 'silent') {
      // some consultants answer an offer after it has expired
      if (it.kind === 'offer' && it.replyBy && U(`${key}|late`) < (B.offer.late || 0)) push(wakingAt(it.replyBy + between(`${key}|lateAt`, [0.5, 12]) * HOURS), 'msg', { raw: withAddress(replies[0].message), kind: 'reply', guard });
      return;
    }
    let message = (replies[names.indexOf(branch)] || replies[0]).message;
    if (it.kind === 'offer' && branch === 'accept' && n >= 2 && U(`${key}|partial`) < (B.offer.partial || 0)) {
      const addrs = it.cases.map(caseAddr);
      message = { ...message, body: TEMPLATES.partial(addrs.slice(0, 1), addrs.slice(1)) };
    }
    if (it.kind === 'send_packet' && it.to.kind === 'office' && branch === 'unreadable' && n >= 2) {
      const addrs = it.cases.map(caseAddr);
      message = { ...message, body: TEMPLATES.packetPartly(addrs.slice(1), addrs[0]) };
    }
    const isLog = it.kind === 'call_office' || it.kind === 'homeowner';
    const toOffice = /hearing office$/.test(message.sender);
    const t = isLog ? now + between(`${key}|t`, [3, 15]) * MIN
      : toOffice ? officeAt(county, now + between(`${key}|t`, TM.officeHours) * HOURS, key)
        : wakingAt(now + between(`${key}|t`, TM.consultantHours) * HOURS);
    push(t, 'msg', { raw: withAddress(message), kind: isLog ? 'log' : 'reply', guard: guard && branch === 'accept' ? guard : null });
  }
  // What the simulated consultant knows about their own day.
  const isIll = (k, date) => !!(illDays.get(k) && illDays.get(k).has(date));
  function holdsClash(view, k, cases) {
    const mine = view.cases.filter((c) => cases.includes(c.id) && c.start);
    const held = view.cases.filter((c) => !cases.includes(c.id) && c.stage === 'upcoming' && c.committed && c.committed.id === k);
    return mine.some((c) => held.some((h) => h.start < c.end && c.start < h.end));
  }
  function guarded(ev) {
    const g = ev.guard;
    const v = safe('view', () => eng.view(now));
    if (!v) return ev.raw;
    const mine = v.cases.filter((c) => g.cases.includes(c.id) && c.ledger.schedule && c.stage === 'upcoming');
    if (!mine.length) return ev.raw;
    const date = mine[0].ledger.schedule.date;
    if (mine.some((c) => isIll(g.consultant, c.ledger.schedule.date))) { stats.selfDeclined.ill += 1; return { ...ev.raw, body: TEMPLATES.dropout(date, true) }; }
    if (holdsClash(v, g.consultant, g.cases)) {
      if (U(`diary|${g.key}`) < B.noticesOwnClash) { stats.selfDeclined.clash += 1; return { ...ev.raw, body: TEMPLATES.dropout(date, false) }; }
      stats.selfDeclined.missed += 1; note('diary', `${g.consultant} says yes although they hold another hearing at that time`);
    }
    return ev.raw;
  }
  // The operations lead works the phones for a hearing nobody on the roster could be offered.
  function rescue(it, n) {
    if (U(`rescue|${it.key}|${n}`) >= B.rescue) return;
    const cv = it.caseViews[0], L = cv.ledger;
    if (!L.schedule) return;
    const v = lastPlan ? lastPlan.view : null;
    const pool = dir.consultants.filter((k) => k.eligible.includes(L.county) && !isIll(k.id, L.schedule.date) && !(v && holdsClash(v, k.id, it.cases))
      && !it.caseViews.some((c) => c.ledger.commitments[k.id] && c.ledger.commitments[k.id].status === 'declined' && c.ledger.commitments[k.id].slot && c.ledger.commitments[k.id].slot.date === L.schedule.date));
    if (!pool.length) return;
    const k = pool[Math.floor(U(`rescueWho|${it.key}|${n}`) * pool.length)];
    stats.rescued += 1;
    push(wakingAt(now + between(`rescueAt|${it.key}|${n}`, [1, 4]) * HOURS), 'msg', { raw: consMsg(k.id, TEMPLATES.acceptEach(it.cases.map(caseAddr), L.schedule.date), it.cases), kind: 'reply', guard: { consultant: k.id, cases: it.cases, key: `rescue|${it.key}|${n}` } });
  }

  // ---- the firm's side
  function doAct(it) {
    if (failed) return false;
    scanItem(it);
    if (toHomeowner(it) && it.level !== 'human') incident('autoToHomeowner', `${it.key} at level ${it.level}: ${it.title}`);
    if (it.level === 'L2' || it.level === 'L1') {
      for (const cv of it.caseViews || []) {
        const off = cv.ledger.withdrawn || (!cv.ledger.schedule && cv.ledger.postponed);
        if (!off || CLOSED_OK.includes(it.kind)) continue;
        if (DOCUMENT_WORK.includes(it.kind)) stats.paperworkOnClosed += 1;          // chasing the office about the withdrawal or settlement itself
        else incident('routineOnClosedHearing', `${it.kind} (${it.level}) for ${cv.id}, which is ${cv.ledger.withdrawn ? 'withdrawn' : 'postponed'}: ${it.title}`);
      }
    }
    const r = safe(`act ${it.kind}`, () => eng.act(it, now));
    if (!r) return false;
    if (r.refused) { stats.refused += 1; return false; }
    stats.steps += 1;
    lastActed.set(it.key, { at: now, sig: sig(it) });
    const level = it.level;
    stats.out[level] += 1;
    (stats.kinds[it.kind] = stats.kinds[it.kind] || { L2: 0, L1: 0, L0: 0, human: 0 })[level] += 1;
    if (it.reminder) stats.reminders += 1;
    if (PHONE_TASKS.includes(it.kind)) stats.calls += 1;
    if (it.kind === 'triage') stats.triage += 1;
    // A person's time. The class of work decides the minutes. A person-only task costs the same in
    // the manual world; every other message is one a person would have had to write there.
    const isStatement = it.kind === 'obligation' && it.obligation && it.obligation.kind === 'homeowner_statement' && !it.chase;
    if (it.kind === 'triage') person('triage', MN.triage);
    else if (PERSON_ONLY.includes(it.kind)) person('human', MN.human[it.kind] ?? MN.humanDefault, it.kind);
    else if (isStatement) person('statement', MN.statement);            // whatever its level, a person has to obtain the statement
    else {
      if (level === 'L1') person('approve', MN.approve);
      else if (level === 'L0') person('draft', MN.draft);
      else if (level === 'human') person('human', MN.humanDefault, it.kind);
      stats.work.write += 1;
    }
    note('act', `${level} ${it.kind}: ${it.title}`);
    // what the other side does next
    const n = bump(sendCount, it.key);
    if (it.kind === 'follow_up_call') { for (const part of it.parts) if (U(`call|${part.key}|${n}`) < B.answerAfterCall) scheduleReply(part.item, { tag: `c${n}`, forceAnswer: true }); }
    else if (it.reminder) { if (U(`rem|${it.key}|${n}`) < B.answerAfterReminder) scheduleReply(it, { tag: `r${n}`, forceAnswer: true }); }
    else if (it.kind === 'homeowner') needTwin.push({ key: it.key, n, change: it.change, county: it.county });
    else if (it.kind === 'escalate') rescue(it, n);
    else scheduleReply(it, { tag: `s${n}` });
    return true;
  }

  function scheduleStaff(it) {
    const n = bump(staffCount, it.key);
    let base = now + between(`staff|${it.key}|${n}`, TM.staffMinutes) * MIN;
    if (it.kind === 'obligation' && it.obligation && it.obligation.kind === 'homeowner_statement' && !it.signed && !it.chase) base = now + between(`stmt|${it.key}|${n}`, TM.statementHours) * HOURS;
    let t = staffAt(base);
    const needsOffice = it.kind === 'call_office' || it.kind === 'reinstate' || (it.kind === 'follow_up_call' && it.callee && it.callee.kind === 'office');
    if (needsOffice && it.county) for (let i = 0; i < 6; i += 1) { const t2 = staffAt(officeAt(it.county, t)); if (t2 === t) break; t = t2; }
    pendingStaff.set(it.key, t);
    push(t, 'staff', { key: it.key });
  }
  // A person repairs a signature request that names someone the office does not have on record.
  function repairSigner(it) {
    if (fixed.has(it.key) || !/on record/.test(it.blocked || '') || !['signature', 'obligation'].includes(it.kind)) return;
    fixed.add(it.key);
    const cv = it.caseViews[0], L = cv.ledger;
    const expected = (L.rep && L.rep.consultant) || (cv.committed && cv.committed.id);
    if (!expected || !it.obligation) return;
    const doc = it.obligation.kind === 'withdrawal' ? 'withdrawal statement' : 'settlement offer';
    stats.fixes += 1; person('signerFix', MN.signerFix);
    push(staffAt(now + between(`fix|${it.key}`, TM.staffMinutes) * MIN), 'msg', { raw: { sender: FIRM, channel: 'email', body: TEMPLATES.resign(doc, caseAddr(cv.id), firstOf(expected)), caseIds: [cv.id] }, kind: 'firm' });
  }

  function openTargets(view) {
    let n = 0;
    for (const c of view.cases) {
      if (c.stage !== 'upcoming' || c.gates.G2.status === 'closed' || c.ledger.escalated) continue;
      const g = c.gates.G2;
      if (['declined', 'none', 'offered', 'no_answer', 'stale', 'condition'].includes(g.sub) || (g.sub === 'tentative' && g.overdue)) n += 1;
    }
    return n;
  }

  let lastPlan = null;
  function settle() {
    for (let round = 0; round < 80 && !failed; round += 1) {
      // The staffing search is exact and its time grows very fast with the number of hearings that
      // have nobody at once. Stop before it can hang (see eval/scale_findings.md).
      const v = safe('view', () => eng.view(now));
      if (!v) return;
      const open = openTargets(v);
      if (open > stats.peakOpen) stats.peakOpen = open;
      if (open > o.maxOpenTargets) { failed = true; incident('searchLimit', `${open} hearings without a consultant at the same time`); stats.aborted = `stopped before the staffing search: ${open} hearings without a consultant at once`; return; }
      const t0 = clock ? clock() : 0;
      const plan = safe('plan', () => eng.plan(now));
      if (!plan) return;
      if (clock) { const ms = clock() - t0; if (ms > stats.slowestPlanMs) { stats.slowestPlanMs = ms; stats.slowestPlanOpen = open; } }
      stats.plans += 1;
      lastPlan = plan;
      // every message that needed a person has a task
      while (pendingAttention.length) { const id = pendingAttention.pop(); if (!state.triage[id] && !plan.items.some((i) => i.kind === 'triage' && i.message && i.message.id === id)) incident('attentionWithoutTask', `message ${id}: ${byId.get(id).body}`); }
      // answers to calls a person has just made to a homeowner
      while (needTwin.length) { const t = needTwin.pop(); const twin = plan.items.find((i) => i.key === t.key && i.phase === 'waiting'); if (twin) scheduleReply(twin, { tag: `h${t.n}`, forceAnswer: true }); }
      // An action that is still listed as to do right after it was sent would be sent again on
      // every pass of the loop. That is an engine fault: it is counted once per action, and the
      // action is held back until the plan changes (so the run goes on as the engine intends).
      for (const [key, s] of stuck) { const cur = plan.items.find((i) => i.key === key); if (!cur || sig(cur) !== s) stuck.delete(key); }
      let acted = 0;
      for (const it of plan.items) {
        scanItem(it);
        if (toHomeowner(it) && it.level !== 'human') incident('autoToHomeowner', `${it.key} planned at level ${it.level}: ${it.title}`);
        if (it.phase !== 'todo') continue;
        if (it.blocked) { repairSigner(it); continue; }
        if (stuck.has(it.key)) { stats.heldBack += 1; continue; }
        const la = lastActed.get(it.key);
        if (la && la.at === now && la.sig === sig(it)) {
          stuck.set(it.key, la.sig);
          incident('resentWhileWaiting', `${it.key} (${it.level}) is still listed as to do right after it was sent: ${it.title} [${(it.caseViews || []).slice(0, 2).map((c) => `${c.id} G2 ${c.gates.G2.sub || c.gates.G2.status}`).join(', ')}]`);
          continue;
        }
        if (it.level === 'L2') { if (doAct(it)) acted += 1; } else if (!pendingStaff.has(it.key)) scheduleStaff(it);
      }
      for (const it of plan.items) {
        for (const t of [it.followUpAt, it.replyBy, it.kind === 'homeowner' && it.phase === 'waiting' && it.sentAt ? it.sentAt + 24 * HOURS : null, it.kind === 'clear_copy' && it.phase === 'waiting' && it.sentAt ? it.sentAt + 24 * HOURS : null]) {
          if (!t || t <= now) continue;
          const k = Math.round(t / MIN);
          if (!wakes.has(k)) { wakes.add(k); push(t + MIN, 'wake'); }
        }
      }
      if (!acted) break;
    }
  }

  // ---- authority audit: is a hearing shown as ready really backed by the right sources?
  function auditReady(cv) {
    const L = cv.ledger, pb = cv.playbook, bad = [];
    const fact = (id, pred) => { const m = byId.get(id); return !!m && m.claims.some((c) => c.disposition === 'fact' && c.cases.includes(L.id) && pred(c, m)); };
    const gov = (m) => m.role === 'government' && m.written;
    if (!L.schedule || !fact(L.schedule.source, (c, m) => SCHEDULE_TYPES.includes(c.type) && gov(m))) bad.push(`G1 rests on ${L.schedule ? L.schedule.source : 'nothing'}, not on a written government notice`);
    const cm = cv.committed;
    if (!cm) bad.push('G2 has nobody');
    else {
      const com = L.commitments[cm.id];
      const own = (m) => m.role === 'consultant' && m.consultant === cm.id;
      if (com && com.via === 'confirmed_offer') { if (![...byId.values()].some((m) => own(m) && m.claims.some((c) => c.type === 'coverage_offered' && c.disposition === 'fact' && c.cases.includes(L.id)))) bad.push('G2: the firm confirmed an offer the consultant never made'); }
      else if (cm.via === 'accepted') { if (!fact(cm.source, (c, m) => c.type === 'consultant_accepted' && own(m))) bad.push(`G2 rests on ${cm.source}, not on the consultant's own yes`); }
      else { const m = byId.get(cm.source); if (!m || !own(m)) bad.push(`G2 (condition) rests on ${cm.source}, not on the consultant's own message`); }
      if (!L.rep || L.rep.consultant !== cm.id || !fact(L.rep.source, (c, m) => c.type === 'rep_recorded' && c.consultant === cm.id && gov(m))) bad.push(`G3 rests on ${L.rep ? L.rep.source : 'nothing'}, not on the office's written record of ${cm.id}`);
      const r = L.packet.cons[cm.id];
      if (!r || r.status !== 'received' || !fact(r.source, (c, m) => c.type === 'packet_received' && own(m))) bad.push(`G4: no receipt from ${cm.id}`);
    }
    const clerk = L.packet.clerk;
    const onTime = clerk.status === 'sent' && pb.packet.clerk_evidence === 'sent_on_time' && clerk.at <= cv.rule.G4 && String(clerk.source).startsWith('out-');
    if (!(onTime || (clerk.status === 'received' && fact(clerk.source, (c, m) => c.type === 'packet_received' && gov(m))))) bad.push(`G4: clerk status ${clerk.status} from ${clerk.source}`);
    for (const ob of L.obligations) {
      const last = ob.history[ob.history.length - 1];
      if (ob.status !== 'cleared' || !last || !fact(last.source, (c, m) => ['obligation_cleared', 'withdrawal_cancelled'].includes(c.type) && gov(m))) bad.push(`G5: ${ob.kind} is ${ob.status}`);
    }
    return bad;
  }

  function evaluate(id) {
    const v = safe('view', () => eng.view(now));
    if (!v) return;
    const cv = v.cases.find((c) => c.id === id);
    if (!cv || cv.stage !== 'upcoming') { if (cv && cv.stage === 'withdrawn') return; if (cv) note('eval_skip', `${id} is ${cv.stage}`); return; }
    const g = cv.gates;
    const st = (k) => g[k].status;
    const ok = (k) => st(k) === 'closed' || st(k) === 'na';
    const ready = cv.readiness === 'ready';
    const coreReady = ['G1', 'G2', 'G3', 'G4'].every(ok);
    const covered = st('G1') === 'closed' && st('G2') === 'closed';
    const first = ['G1', 'G2', 'G3', 'G4', 'G5'].find((k) => !ok(k));
    let why = null, waitingOn = null;
    if (first) {
      const open = cv.ledger.obligations.find((x) => x.status !== 'cleared') || {};
      why = first === 'G4' ? `G4 ${!g.G4.clerkOk ? `clerk: ${g.G4.clerkStatus}` : `consultant: ${g.G4.consStatus}`}` : first === 'G5' ? `G5 ${open.kind || ''}: ${open.status || ''}` : `${first} ${g[first].sub || st(first)}`;
    }
    // The independent audit must agree both ways: nothing wrong when the engine says ready, and
    // something wrong when it says not ready (otherwise the audit would be blind).
    const bad = auditReady(cv);
    if (ready && bad.length) incident('readyWithoutAuthority', `${id}: ${bad.join('; ')}`);
    const auditBlind = !ready && !bad.length;
    for (const [k, gate] of Object.entries(g)) scan(`${id} ${k}`, gate.text);
    for (const i of cv.issues) { scan(`${id} ${i.code}`, i.title); scan(`${id} ${i.code}`, i.detail); }
    // Two places at once: the same consultant committed to two hearings whose times overlap.
    // Of such a pair, the hearing with the later case number is counted as one nobody can attend.
    let doubleBooked = false;
    if (cv.committed) {
      for (const other of v.cases) {
        if (other.id >= id || other.stage !== 'upcoming' || !other.committed || other.committed.id !== cv.committed.id) continue;
        if (!(other.start < cv.end && cv.start < other.end)) continue;
        doubleBooked = true;
        incident('doubleBooked', `${firstOf(cv.committed.id)} (${cv.committed.id}) is committed to ${other.id} (${other.ledger.county}, ${other.ledger.schedule.time}) and ${id} (${cv.ledger.county}, ${cv.ledger.schedule.time}) on ${cv.ledger.schedule.date}, and both are shown as ${other.readiness} and ${cv.readiness}`);
      }
    }
    // A consultant who reported sick for the day (in another thread) but still holds this hearing.
    const ill = !!cv.committed && isIll(cv.committed.id, cv.ledger.schedule.date);
    if (ill) incident('committedWhileIll', `${firstOf(cv.committed.id)} (${cv.committed.id}) reported sick for ${cv.ledger.schedule.date} in another thread, is still the committed consultant for ${id} (${cv.ledger.county}, ${cv.ledger.schedule.time}), and the hearing is shown as ${cv.readiness}`);
    // Who or what is a hearing that is not ready waiting on? Read it from the queue itself.
    let nothingQueued = false, blocked = false;
    if (!ready) {
      const plan = safe('plan', () => eng.plan(now));
      if (!plan) return;
      stats.plans += 1;
      lastPlan = plan;
      const kinds = GATE_KINDS[first] || [];
      const all = plan.items.filter((i) => i.cases.includes(id));
      const forGate = all.filter((i) => kinds.includes(i.kind) || (i.kind === 'follow_up_call' && i.parts.some((p) => p.cases.includes(id) && kinds.includes(p.item.kind))));
      const mine = forGate.length ? forGate : all;
      const todo = mine.filter((i) => i.phase === 'todo');
      if (!mine.length) { waitingOn = 'nothing in the queue'; nothingQueued = true; }
      else if (todo.length && todo.every((i) => i.blocked)) { waitingOn = /process change/.test(todo[0].blocked) ? 'a person: review of a process change' : 'a person: a blocked item'; blocked = true; }
      else if (todo.length) {
        const it = todo.find((i) => !i.blocked);
        waitingOn = stuck.has(it.key) ? 'the answer to an automatic message (see resentWhileWaiting)' : it.kind === 'follow_up_call' ? 'a person: a phone call that is due' : it.level === 'human' ? 'a person: a person-only task' : it.level === 'L0' ? 'a person: a draft to send' : it.level === 'L1' ? 'a person: a one-click approval' : 'an automatic step';
      } else {
        const it = mine[0];
        waitingOn = it.to.kind === 'office' ? 'the office: no answer yet' : it.to.kind === 'consultant' ? 'a consultant: no answer yet' : it.kind === 'escalate' ? 'a person: finding a consultant by phone' : 'a person: a task in progress';
      }
    }
    evaluated[id] = { ready, coreReady, covered, why, waitingOn, nothingQueued, blocked, doubleBooked, ill, auditBlind, readiness: cv.readiness, date: localParts(now + 1, tz).date };
    note('hearing', `${id} at start: ${cv.readiness}${why ? ` (${why}; waiting on ${waitingOn})` : ''}`);
    push(cv.end + MIN, 'wake');
  }

  // ---- outside events
  function fire(s) {
    const live = (id) => { const L = state.cases[id]; return L.schedule && !L.withdrawn && toTs(L.schedule.date, L.schedule.time, tz) > now + 3 * HOURS; };
    const ids = (s.ids || []).filter(live);
    const committedOf = (id) => { const cv = lastPlan && lastPlan.view.cases.find((c) => c.id === id); return cv && cv.committed ? cv.committed.id : null; };
    const done = () => { stats.scriptsFired[s.type] = (stats.scriptsFired[s.type] || 0) + 1; };
    const skip = () => { stats.scriptsSkipped[s.type] = (stats.scriptsSkipped[s.type] || 0) + 1; };
    const county = s.county;
    const view = safe('view', () => eng.view(now));
    if (!view) return;
    lastPlan = lastPlan || { view, items: [] };
    lastPlan.view = view;
    switch (s.type) {
      case 'move_written': case 'move_phone': {
        const pick = s.part == null ? ids : ids.filter((id) => id === s.ids[s.part]);
        if (!pick.length) return skip();
        const items = pick.map((id) => { const L = state.cases[id]; return { addr: caseAddr(id), date: nextWeekday(isoAdd(L.schedule.date, s.plusDays)), time: L.schedule.time }; });
        if (s.type === 'move_written') deliver(officeMsg(county, TEMPLATES.moveWritten(items), s.ids), 'exo');
        else {
          deliver({ sender: FIRM, channel: 'phone note', body: TEMPLATES.movePhone(items), caseIds: s.ids }, 'phone_in');
          if (U(`ptw|${s.block}`) < B.phoneThenWritten) push(officeAt(county, now + between(`ptwAt|${s.block}`, [4, 30]) * HOURS), 'msg', { raw: officeMsg(county, TEMPLATES.moveWritten(items), s.ids), kind: 'exo' });
        }
        return done();
      }
      case 'dropout': {
        const k = ids.map(committedOf).find(Boolean);
        if (!k) return skip();
        const mine = ids.filter((id) => committedOf(id) === k);
        const date = state.cases[mine[0]].schedule.date;
        // An ill consultant is ill for the whole day, and says so once, in this thread.
        if (s.ill) { if (!illDays.has(k)) illDays.set(k, new Set()); illDays.get(k).add(date); }
        deliver(consMsg(k, TEMPLATES.dropout(date, s.ill), mine), 'exo');
        if (s.volunteer) {
          const pool = dir.consultants.filter((x) => x.id !== k && x.eligible.includes(county) && !isIll(x.id, date) && !holdsClash(view, x.id, mine));
          if (pool.length) { const vnt = pool[Math.floor(U(`vol|${s.block}`) * pool.length)]; push(wakingAt(now + between(`volAt|${s.block}`, [0.5, 2]) * HOURS), 'msg', { raw: consMsg(vnt.id, TEMPLATES.volunteer(mine.map(caseAddr), date), mine), kind: 'exo' }); }
        }
        return done();
      }
      case 'rep_lost': {
        const hit = ids.filter((id) => { const cv = view.cases.find((c) => c.id === id); return cv && (cv.gates.G3.status === 'closed' || cv.gates.G3.sub === 'submitted'); });
        if (!hit.length) return skip();
        deliver(officeMsg(county, TEMPLATES.repLost(hit.map(caseAddr)), s.ids), 'exo');
        return done();
      }
      case 'version_issue': case 'question': case 'calendar_belief': {
        const k = ids.map(committedOf).find(Boolean);
        if (!k) return skip();
        const mine = ids.filter((id) => committedOf(id) === k);
        const L = state.cases[mine[0]];
        if (s.type === 'version_issue' && !(L.packet.cons[k] && ['sent', 'received'].includes(L.packet.cons[k].status))) return skip();
        const body = s.type === 'version_issue' ? TEMPLATES.versionIssue() : s.type === 'question' ? TEMPLATES.question() : TEMPLATES.calendarBelief(mine.length, isoAdd(L.schedule.date, 1));
        deliver(consMsg(k, body, mine), 'exo');
        return done();
      }
      case 'owner_withdraw': {
        const id = s.ids[s.part];
        if (!live(id) || state.cases[id].homeownerChange) return skip();
        deliver(officeMsg(county, TEMPLATES.ownerWithdraw(caseAddr(id)), s.ids), 'exo');
        return done();
      }
      case 'owner_move': {
        const id = s.ids[s.part];
        if (!live(id) || state.cases[id].homeownerChange) return skip();
        const L = state.cases[id];
        deliver(officeMsg(county, TEMPLATES.ownerMove(caseAddr(id), L.schedule.date, nextWeekday(isoAdd(L.schedule.date, s.plusDays)), L.schedule.time), s.ids), 'exo');
        return done();
      }
      case 'settlement': {
        const id = s.ids[s.part];
        const k = live(id) ? committedOf(id) : null;
        if (!k) return skip();
        const others = dir.consultants.filter((x) => x.id !== k);
        const named = s.wrong && others.length ? others[Math.floor(U(`wrong|${s.block}`) * others.length)].id : k;
        deliver({ sender: FIRM, channel: 'email', body: TEMPLATES.settlement(caseAddr(id), firstOf(named)), caseIds: s.ids }, 'firm');
        return done();
      }
      case 'postpone': {
        if (!ids.length) return skip();
        const date = state.cases[ids[0]].schedule.date;
        const same = ids.filter((id) => state.cases[id].schedule.date === date);
        const times = same.map((id) => state.cases[id].schedule.time);
        deliver(officeMsg(county, TEMPLATES.postpone(same.map(caseAddr), date), s.ids), 'exo');
        if (s.newDate) push(officeAt(county, now + s.afterDays * DAY), 'script', { s: { type: 'new_date', ids: same, all: s.ids, county, date: nextWeekday(isoAdd(date, s.plusDays)), times, block: s.block } });
        return done();
      }
      case 'new_date': {
        const still = s.ids.filter((id) => !state.cases[id].schedule && state.cases[id].postponed && !state.cases[id].withdrawn);
        if (!still.length) return skip();
        const times = still.map((id) => s.times[s.ids.indexOf(id)]);
        deliver(officeMsg(county, TEMPLATES.newDate(still.map(caseAddr), s.date, times, eng.books[county].hearing_mode), s.all), 'exo');
        return done();
      }
      case 'unknown_sender': {
        const id = s.ids[s.part];
        if (!live(id)) return skip();
        const L = state.cases[id];
        deliver({ sender: 'Dana Whitlock', address: 'dana@new-clerk.example', channel: 'email', body: TEMPLATES.unknownSender(county, caseAddr(id), nextWeekday(isoAdd(L.schedule.date, s.plusDays)), L.schedule.time) }, 'exo');
        return done();
      }
      case 'unreadable': {
        const k = (s.ids.map(committedOf).find(Boolean)) || dir.consultants.find((x) => x.eligible.includes(county)).id;
        deliver(consMsg(k, TEMPLATES.unreadable(), s.ids), 'exo');
        return done();
      }
      case 'no_case_note': deliver(officeMsg(county, TEMPLATES.noCaseNote(), null), 'exo'); return done();
      case 'drift_lead': {
        if (eng.books[county].packet.lead_hours !== 48 || (state.drift[county] && state.drift[county].status === 'proposed')) return skip();
        deliver(officeMsg(county, TEMPLATES.driftLead(), s.ids), 'exo');
        return done();
      }
      case 'statement': {
        const id = s.ids[0];
        if (state.cases[id].withdrawn) return skip();
        deliver(officeMsg(county, TEMPLATES.statement(caseAddr(id), addWorkdays(localParts(now, tz).date, 4)), s.ids), 'exo');
        return done();
      }
      default: return skip();
    }
  }

  // ---- run
  for (const m of shard.messages) Q.push({ t: m.at, n: seq++, type: 'msg', raw: { sender: m.sender, address: m.address, channel: m.channel, body: m.body, caseIds: m.caseIds }, kind: 'notice' });
  for (const s of shard.scripts) Q.push({ t: s.at, n: seq++, type: 'script', s });
  const first = shard.messages.length ? shard.messages[0].at : 0;
  const react = TM.automationSeconds * 1000;
  Q.push({ t: within(first + HOURS, '08:00', '20:00', false, tz), n: seq++, type: 'beat' });
  let guard = 0;
  while (Q.size && !failed) {
    const ev = Q.pop();
    const end = lastStart + TM.tailDays * DAY;
    if (ev.t > end) break;
    if (++guard > o.maxSteps) { failed = true; incident('tooManyEvents', `more than ${o.maxSteps} events in one shard`); stats.aborted = 'too many events'; break; }
    now = Math.max(now, ev.t);
    if (ev.type === 'msg') { deliver(ev.guard ? guarded(ev) : ev.raw, ev.kind); now += react; settle(); }
    else if (ev.type === 'script') { fire(ev.s); now += react; settle(); }
    else if (ev.type === 'staff') {
      pendingStaff.delete(ev.key);
      const plan = safe('plan', () => eng.plan(now));
      if (plan) {
        stats.plans += 1;
        const it = plan.items.find((i) => i.key === ev.key);
        if (!it || it.phase !== 'todo') stats.stale += 1;
        else if (it.blocked) repairSigner(it);
        else doAct(it);
        settle();
      }
    } else if (ev.type === 'hearing') { if (hearingAt[ev.id] === ev.start) evaluate(ev.id); }   // a hearing the office moved is judged again at its new time
    else if (ev.type === 'wake') settle();
    else if (ev.type === 'beat') {
      settle();
      const next = within(now + TM.heartbeatHours * HOURS, '08:00', '20:00', false, tz);
      if (next <= end && (Q.size || (lastPlan && lastPlan.items.length))) Q.push({ t: next, n: seq++, type: 'beat' });
    }
  }

  // ---- what became of every hearing (the last judgement of each one counts)
  for (const rec of shard.packet.cases) {
    const id = rec.case_id, e = evaluated[id], L = state.cases[id];
    if (failed) { stats.fate.lostToAbort += 1; continue; }
    if (!e) {
      if (L.withdrawn) stats.fate.withdrawn += 1;
      else if (!L.schedule && L.postponed) stats.fate.postponed += 1;
      else if (L.schedule) stats.fate.later += 1;
      else { stats.fate.never += 1; incident('neverScheduled', `${id} never got an official date from its notice`); }
      continue;
    }
    stats.held += 1;
    if (e.ready) stats.ready += 1;
    const attendable = !e.doubleBooked && !e.ill;                   // the consultant is not booked elsewhere at that time and did not report sick
    if (e.ready && attendable) stats.readyAudited += 1;
    if (e.coreReady) stats.coreReady += 1;
    if (e.covered) stats.covered += 1; else stats.uncovered += 1;
    if (e.covered && attendable) stats.coveredAudited += 1;
    if (e.ready && !attendable) stats.readyButNobodyCanAttend += 1;
    (stats.days[e.date] = stats.days[e.date] || { tower: 0, touches: 0, hearings: 0 }).hearings += 1;
    if (e.ready) continue;
    stats.notReady[e.why] = (stats.notReady[e.why] || 0) + 1;
    stats.waitingOn[e.waitingOn] = (stats.waitingOn[e.waitingOn] || 0) + 1;
    if (e.blocked) stats.blockedAtStart += 1;
    if (e.auditBlind) { stats.auditBlind += 1; stats.auditBlindWhy[e.why] = (stats.auditBlindWhy[e.why] || 0) + 1; }
    if (e.nothingQueued) incident('notReadyNothingQueued', `${id} was not ready at its start (${e.why}) and nothing in the queue mentioned it`);
    if (stats.examples.length < 6) stats.examples.push({ shard: shard.id, seed: shard.seed, id, county: L.county, covered: e.covered, why: e.why, waitingOn: e.waitingOn });
  }
  stats.id = shard.id;
  if (o.collectLog) stats.log = log;
  return stats;
}

// ---------------------------------------------------------------- whole run
// Adds up the shards. A shard that had to stop is left out of every total and rate, and its
// hearings are reported as lost (its safety and fault counts are still added).
export function mergeResults(world, parts, options = {}) {
  const total = emptyStats();
  const addInto = (a, b) => { for (const [k, v] of Object.entries(b)) { if (typeof v === 'number') a[k] = (a[k] || 0) + v; else if (v && typeof v === 'object' && !Array.isArray(v)) a[k] = addInto(a[k] || {}, v); } return a; };
  let lostHearings = 0, abortedShards = 0;
  for (const p of parts) {
    const { incidents, examples, aborted, id, log, peakOpen, slowestPlanMs, slowestPlanOpen, ...nums } = p;
    total.incidents.push(...incidents);
    if (peakOpen > total.peakOpen) total.peakOpen = peakOpen;
    if (slowestPlanMs > total.slowestPlanMs) { total.slowestPlanMs = slowestPlanMs; total.slowestPlanOpen = slowestPlanOpen; }
    if (aborted) {
      abortedShards += 1; lostHearings += p.hearings;
      addInto(total.invariants, p.invariants);
      total.aborted = `${total.aborted ? total.aborted + '; ' : ''}${id}: ${aborted}`;
      continue;
    }
    addInto(total, nums);
    total.examples.push(...examples);
  }
  total.incidents = total.incidents.slice(0, 60);
  total.examples = total.examples.slice(0, 12);
  const h = Math.max(1, total.hearings);
  const out = total.out.L2 + total.out.L1 + total.out.L0 + total.out.human;
  const w = total.work;
  const personOnly = Object.values(w.human).reduce((s, n) => s + n, 0);
  const touches = w.approve + w.draft + w.statement + w.triage + w.signerFix + personOnly;
  const table = mergeMinutes(DEFAULT_MINUTES, options.minutes);
  const price = { used: priceWork(w, table), low: priceWork(w, MINUTES.low), mid: priceWork(w, MINUTES.mid), high: priceWork(w, MINUTES.high) };
  const sum = (keys) => keys.reduce((s, k) => s + (total.invariants[k] || 0), 0);
  const dayList = Object.entries(total.days).sort((a, b) => a[0].localeCompare(b[0]));
  const peak = dayList.reduce((best, [date, d]) => (d.tower > best.minutes ? { date, minutes: d.tower, touches: d.touches, hearings: d.hearings } : best), { date: null, minutes: 0, touches: 0, hearings: 0 });
  const hearingDays = dayList.filter(([, d]) => d.hearings > 0).length;
  return {
    meta: world.meta, shards: parts.length, abortedShards, lostHearings, ...total,
    minutes: { tower: price.used.tower, manual: price.used.manual, low: price.low, mid: price.mid, high: price.high },
    humanTouches: touches,
    perHearing: {
      inbound: total.inbound / h, outbound: out / h, automatic: total.out.L2 / h, oneClick: total.out.L1 / h, drafts: total.out.L0 / h, personOnly: total.out.human / h,
      humanTouches: touches / h, towerMinutes: price.used.tower / h, manualMinutes: price.used.manual / h,
      towerMinutesLow: price.low.tower / h, towerMinutesHigh: price.high.tower / h, manualMinutesLow: price.low.manual / h, manualMinutesHigh: price.high.manual / h,
      reminders: total.reminders / h, calls: total.calls / h, triage: total.triage / h, exceptionsIn: total.inboundException / h,
    },
    rates: { ready: total.held ? total.ready / total.held : null, readyAudited: total.held ? total.readyAudited / total.held : null, coreReady: total.held ? total.coreReady / total.held : null,
      covered: total.held ? total.covered / total.held : null, coveredAudited: total.held ? total.coveredAudited / total.held : null, automaticShare: out ? total.out.L2 / out : null },
    peakDay: peak, hearingDays,
    safetyViolations: sum(SAFETY_CHECKS), faults: sum(FAULT_CHECKS), limitsHit: sum(LIMIT_CHECKS),
  };
}

export function runSim(world, options = {}) {
  const parts = [];
  world.shards.forEach((s, i) => { parts.push(runShard(s, options)); if (options.onProgress) options.onProgress({ done: i + 1, total: world.shards.length, shard: s.id }); });
  return mergeResults(world, parts, options);
}

// The same, yielding between shards so a browser stays responsive.
export async function runSimAsync(world, options = {}) {
  const parts = [];
  for (let i = 0; i < world.shards.length; i += 1) {
    parts.push(runShard(world.shards[i], options));
    if (options.onProgress) options.onProgress({ done: i + 1, total: world.shards.length, shard: world.shards[i].id });
    await new Promise((resolve) => { setTimeout(resolve, 0); });
  }
  return mergeResults(world, parts, options);
}

// ---------------------------------------------------------------- self-test of the wording
// Every message the simulation writes is read by the offline reader in a small real world, and
// the claims are compared with what the message is meant to say.
export function verifyTemplates(base) {
  const results = [];
  const mk = () => {
    const packet = clone(base.packet), playbooks = clone(base.playbooks);
    packet.messages = [];
    packet.cases = [10, 22, 36, 48].map((num, i) => ({ property: `${num} Tansy Court, Larkmere`, case_id: `AX-90${i + 1}`, customer_id: `H90${i + 1}`, homeowner: i < 2 ? 'Jules Carver' : 'Robin Thorne', county: 'Larkmere', state: 'Asterland', tax_year: '2029', hearing_date: '2030-06-18', hearing_time: hhmm(600 + 30 * i), timezone: 'UTC-05:00', consultant_id: '', status: 'hearing_scheduled', packet_reference: 'x', record_updated_at: '2030-06-01T12:00:00-05:00' }));
    packet.documents = packet.cases.map((c) => ({ name: `${slugOf(addrOf(c.property))}-packet-v2.txt`, kind: 'packet', version: 2, case_id: c.case_id, text: `Property: ${c.property}\nHomeowner: ${c.homeowner}\nCase: ${c.case_id}\nCounty: Larkmere\nTax year: 2029\nPacket version: 2` }));
    const eng = createEngine({ packet, playbooks, reader: extractWithRules });
    let t = toTs('2030-06-03', '09:00', '-05:00'), n = 0;
    const say = (raw) => { t += 10 * MIN; return eng.ingest({ id: `t${++n}`, at: t, ...raw }); };
    return { eng, say, ids: packet.cases.map((c) => c.case_id), props: packet.cases.map((c) => c.property) };
  };
  const office = (body, caseIds, channel = 'email') => ({ sender: 'Larkmere hearing office', address: 'clerk@larkmere.example', channel, body, ...(caseIds ? { caseIds } : {}) });
  const cons = (body, caseIds) => ({ sender: 'Leo Arlen', address: 'leo@consultants.example', channel: 'email', body, caseIds });
  const times = ['10:00', '10:30', '11:00', '11:30'];
  const check = (name, entry, want, extra = () => true) => {
    const got = entry.claims.map((c) => ({ type: c.type, cases: c.cases.join('+'), disposition: c.disposition, date: c.date, time: c.time, consultant: c.consultant, kind: c.kind }));
    const ok = want.every((w) => got.some((g) => Object.entries(w).every(([k, v]) => g[k] === v))) && !entry.claims.some((c) => c.disposition === 'rejected') && extra(entry) === true && !GLITCH.some((re) => re.test(entry.body));
    results.push({ name, ok, body: entry.body, want, got });
  };
  // 1. scheduling notices, every style, one to four hearings, with and without a deadline
  for (let variant = 0; variant < 6; variant += 1) for (let size = 1; size <= 4; size += 1) for (const dl of [false, true]) {
    if (dl && variant === 4) continue;
    const w = mk();
    const ids = w.ids.slice(0, size);
    const t = TEMPLATES.notice(variant, { props: w.props.slice(0, size), date: '2030-06-18', times: times.slice(0, size), mode: variant % 2 ? 'video' : 'in_person', room: 'C', noticeDate: '2030-06-03', deadline: dl ? { date: '2030-06-14', time: '16:00' } : null, method: 'staffing_notice' });
    const e = w.say(office(t.body, ids, t.channel));
    check(`notice style ${variant}, ${size} hearing(s)${dl ? ', deadline' : ''}`, e, ids.map((id, i) => ({ type: 'hearing_scheduled', cases: id, disposition: 'fact', date: '2030-06-18', time: times[i] })),
      () => ids.every((id, i) => w.eng.state.cases[id].schedule && w.eng.state.cases[id].schedule.time === times[i]) && (!dl || ids.every((id) => w.eng.state.cases[id].repRequest && w.eng.state.cases[id].repRequest.deadline === '2030-06-14T16:00')) && e.attention.length === 0);
  }
  // 2. everything else, in a world where three hearings are scheduled and Leo has accepted
  const ready = (size = 3) => {
    const w = mk();
    const ids = w.ids.slice(0, size);
    w.say(office(TEMPLATES.notice(0, { props: w.props.slice(0, size), date: '2030-06-18', times: times.slice(0, size), mode: 'in_person' }).body, ids));
    w.say(cons(size === 1 ? 'I accept the hearing for 10 Tansy Court on June 18.' : 'I accept all of these hearings on June 18.', ids));
    return { ...w, ids };
  };
  const A = ['10 Tansy Court', '22 Tansy Court', '36 Tansy Court'];
  let w = ready();
  check('written move, each hearing its own time', w.say(office(TEMPLATES.moveWritten(A.map((addr, i) => ({ addr, date: '2030-06-24', time: times[i] }))), w.ids)), w.ids.map((id, i) => ({ type: 'schedule_changed', cases: id, disposition: 'fact', date: '2030-06-24', time: times[i] })));
  w = ready();
  check('move reported by phone', w.say({ sender: FIRM, channel: 'phone note', body: TEMPLATES.movePhone([{ addr: A[1], date: '2030-06-24', time: '10:30' }]), caseIds: w.ids }), [{ type: 'schedule_changed', cases: w.ids[1], disposition: 'provisional', date: '2030-06-24', time: '10:30' }], (e) => w.eng.state.cases[w.ids[1]].schedule.date === '2030-06-18' && e.claims.length === 1);
  w = ready();
  check('consultant drops out (conflict)', w.say(cons(TEMPLATES.dropout('2030-06-18', false), w.ids)), w.ids.map(() => ({ type: 'consultant_declined', cases: w.ids.join('+'), disposition: 'flag' })));
  w = ready();
  check('consultant drops out (ill)', w.say(cons(TEMPLATES.dropout('2030-06-18', true), w.ids)), [{ type: 'consultant_declined', cases: w.ids.join('+'), disposition: 'flag' }], (e) => e.claims.length === 1 && w.eng.state.unavailable.some((u) => u.reason === 'illness'));
  for (const size of [1, 2, 3]) {
    w = ready(size);
    check(`another consultant volunteers (${size})`, w.say({ sender: 'Nora Pell', address: 'nora@consultants.example', channel: 'email', body: TEMPLATES.volunteer(A.slice(0, size), '2030-06-18'), caseIds: w.ids }), [{ type: 'coverage_offered', cases: w.ids.join('+'), disposition: 'fact' }], (e) => e.claims.length === 1);
  }
  w = ready();
  check('a consultant accepts each hearing by address', w.say({ sender: 'Nora Pell', address: 'nora@consultants.example', channel: 'email', body: TEMPLATES.acceptEach(A, '2030-06-18'), caseIds: w.ids }), w.ids.map((id) => ({ type: 'consultant_accepted', cases: id })));
  w = mk();
  w.say(office(TEMPLATES.notice(0, { props: w.props.slice(0, 3), date: '2030-06-18', times: times.slice(0, 3), mode: 'in_person' }).body, w.ids.slice(0, 3)));
  check('yes to one hearing, no to the others', w.say(cons(TEMPLATES.partial(A.slice(0, 1), A.slice(1)), w.ids.slice(0, 3))), [{ type: 'consultant_accepted', cases: w.ids[0], disposition: 'fact' }, { type: 'consultant_declined', cases: w.ids[1], disposition: 'flag' }, { type: 'consultant_declined', cases: w.ids[2], disposition: 'flag' }], (e) => e.claims.length === 3);
  w = ready();
  check('office has no assignment', w.say(office(TEMPLATES.repLost(A.slice(0, 2)), w.ids)), [{ type: 'rep_not_recorded', cases: w.ids.slice(0, 2).join('+'), disposition: 'flag' }], (e) => e.claims.length === 1);
  w = ready();
  check('consultant has an old packet version', w.say(cons(TEMPLATES.versionIssue(), w.ids)), [{ type: 'packet_version_issue', cases: w.ids.join('+'), disposition: 'flag' }], (e) => e.claims.length === 1);
  w = ready();
  check('consultant asks what is current', w.say(cons(TEMPLATES.question(), w.ids)), [{ type: 'consultant_question', cases: w.ids.join('+'), disposition: 'fact' }], (e) => e.claims.length === 1);
  w = ready();
  check('consultant puts a wrong date in the calendar', w.say(cons(TEMPLATES.calendarBelief(3, '2030-06-19'), w.ids)), [{ type: 'calendar_edited', cases: w.ids.join('+'), disposition: 'belief', date: '2030-06-19' }], (e) => e.claims.length === 1 && w.eng.state.cases[w.ids[0]].schedule.date === '2030-06-18');
  w = ready();
  check('homeowner asks the county to withdraw', w.say(office(TEMPLATES.ownerWithdraw(A[1]), w.ids)), [{ type: 'withdrawal_requested', cases: w.ids[1], disposition: 'flag' }], (e) => e.claims.length === 1);
  w = ready();
  check('homeowner asks the county to move', w.say(office(TEMPLATES.ownerMove(A[1], '2030-06-18', '2030-06-25', '10:30'), w.ids)), [{ type: 'schedule_changed', cases: w.ids[1], disposition: 'fact', date: '2030-06-25', time: '10:30' }], (e) => e.claims.length === 1 && !!w.eng.state.cases[w.ids[1]].homeownerChange);
  w = ready();
  check('settlement ready to sign', w.say({ sender: FIRM, channel: 'email', body: TEMPLATES.settlement(A[0], 'Leo'), caseIds: w.ids }), [{ type: 'signature_required', cases: w.ids[0], disposition: 'flag', consultant: 'R02', kind: 'settlement' }], (e) => e.claims.length === 1);
  w = ready();
  check('signature request re-issued for a withdrawal', w.say({ sender: FIRM, channel: 'email', body: TEMPLATES.resign('withdrawal statement', A[0], 'Leo'), caseIds: [w.ids[0]] }), [{ type: 'signature_required', cases: w.ids[0], disposition: 'flag', consultant: 'R02', kind: 'withdrawal' }]);
  for (const size of [1, 3]) {
    w = ready(size);
    const e1 = w.say(office(TEMPLATES.postpone(A.slice(0, size), '2030-06-18'), w.ids));
    check(`postponed with no new date (${size})`, e1, w.ids.map(() => ({ type: 'hearing_postponed', cases: w.ids.join('+'), disposition: 'fact' })), (e) => e.claims.length === 1 && w.ids.every((id) => !w.eng.state.cases[id].schedule));
    check(`new date after a postponement (${size})`, w.say(office(TEMPLATES.newDate(A.slice(0, size), '2030-06-27', times.slice(0, size), 'in_person'), w.ids)), w.ids.map((id, i) => ({ type: 'hearing_scheduled', cases: id, disposition: 'fact', date: '2030-06-27', time: times[i] })));
  }
  w = ready();
  check('unknown sender claims a move', w.say({ sender: 'Dana Whitlock', address: 'dana@new-clerk.example', channel: 'email', body: TEMPLATES.unknownSender('Larkmere', A[0], '2030-06-20', '10:00') }), [{ type: 'schedule_changed', cases: w.ids[0], disposition: 'signal' }], (e) => e.role === 'unknown' && e.attention.length > 0 && w.eng.state.cases[w.ids[0]].schedule.date === '2030-06-18');
  w = ready();
  check('a message with nothing to read', w.say(cons(TEMPLATES.unreadable(), w.ids)), [], (e) => e.claims.length === 0 && e.attention.length === 1);
  w = ready();
  check('an office note about no case', w.say(office(TEMPLATES.noCaseNote(), null)), [], (e) => e.claims.length === 0 && e.attention.length === 1 && e.unresolved === true);
  w = ready();
  check('office announces a form and a call', w.say(office(TEMPLATES.driftForm(), w.ids)), [{ type: 'process_rule_changed', disposition: 'flag', cases: w.ids.join('+') }], (e) => e.claims.length === 1 && proposeChange(w.eng.books.Larkmere, e.body).some((c) => c.to === 'form_then_call'));
  w = ready();
  check('office announces a 72 hour packet rule', w.say(office(TEMPLATES.driftLead(), w.ids)), [{ type: 'process_rule_changed', disposition: 'flag', cases: w.ids.join('+') }], (e) => e.claims.length === 1 && proposeChange(w.eng.books.Larkmere, e.body).some((c) => c.path === 'packet.lead_hours' && c.to === 72));
  w = ready();
  check('statement requested after a hearing', w.say(office(TEMPLATES.statement(A[0], '2030-06-25'), w.ids)), [{ type: 'obligation_created', cases: w.ids[0], disposition: 'flag', kind: 'homeowner_statement' }], (e) => e.claims.length === 1 && e.claims[0].deadline === '2030-06-25T16:00');
  w = ready();
  check('one file unreadable, the others opened', w.say(office(TEMPLATES.packetPartly(A.slice(1), A[0]), w.ids)), [{ type: 'doc_unreadable', cases: w.ids[0], disposition: 'flag' }, { type: 'packet_received', cases: w.ids.slice(1).join('+'), disposition: 'fact' }], (e) => e.claims.length === 2);
  return { ok: results.every((r) => r.ok), total: results.length, failed: results.filter((r) => !r.ok), results };
}
