// EXTRACT stage, deterministic baseline ("rules" mode).
// Pattern rules that turn one message into typed claims. This is the offline fallback and the
// baseline the Claude extractor is measured against. It was written while looking at the 72
// packet messages, so its score on them is a development score, not evidence it generalises
// (see eval/run.js for the held-out set).

import { sentences, findDates, findTimes, findDeadline, courtesyOnly } from '../text.js';
import { casesInSentence, narrowByTime, findConsultants } from '../resolve.js';

const RE = {
  repRequested: /please (tell us who will attend|send the name of the representative|identify the representative|confirm your representative|confirm who will attend|return the staffing notices?)/i,
  repNotRecorded: /(have not|haven't|do not yet have|not yet) (recorded )?a representative|have not received an assignment|cannot confirm who is on the list|cannot find the form|no list of representatives entry was confirmed|still waiting for (the|a|your) (staffing|representative)/i,
  repRecorded: /\b(is|are) recorded\b|recorded as representative|listed as representative|representative on our record|naming \w+ have been accepted/i,
  aboutRep: /\brepresentative\b|\bof record\b|\bassignment\b|\bstaffing\b/i,
  scheduleCue: /\bhearings?\b|\bappeals?\b|\bscheduled\b|\bset for\b|\blisted\b|\bwill be heard\b|\btakes? place\b|\bsitting\b|\bsession\b/i,
  notSchedule: /\b(by|before|until|no later than|not later than|due)\b[^.]{0,40}(\d{1,2}(:\d\d)?\s*(a\.?m\.?|p\.?m\.?)|\bnoon\b)|\bdeadline\b|\b(reopens?|re-opens?|closes|is closed|will be closed|office hours|contact hours|opening hours)\b|\b(send|file|submit|provide|deliver|return|upload|email|forward)\b[^.]{0,60}\b(by|before|no later than)\b/i,
  confirmed: /\bremains?\b|unchanged|unaffected|has not changed|no changes|confirmation again|\bis confirmed\b|still listed/i,
  moved: /\bmoved (it|them|the hearings?|both|both hearings|these hearings)?\s*(from|to)\b|has been moved|have been moved|\bcan move\b|instead of/i,
  denied: /must stay|cannot move|can't move|unable to move|schedule is full|cannot be moved/i,
  pending: /still reviewing|under review/i,
  withdrawReq: /homeowner.*(asked|requested).*withdraw/i,
  obligation: /(submit|send|waiting for).*(statement|document|material)/i,
  decisionPending: /awaiting a written decision|decision is pending/i,
  instruction: /please arrive|arrive \d+ minutes|\bbring\b.*\b(id|identification|copies)\b|dial[- ]in|join (by|using|with) the link/i,
  received: /confirming receipt|packets? received|received and readable|we have the current packets|\bopened\b|have reviewed the current|i have (both|the) (case )?files|files reviewed|received and reviewed/i,
  unreadable: /unreadable|cannot read|could not read|can't read|illegible/i,
  sigRejected: /names \w+, but \w+ is the representative|signed by the wrong|corrected statement/i,
  sigRequired: /ready for \w+ to sign|signed by \w+\b|needs? (your|a) signature/i,
  ruleChanged: /no longer enough|new procedure|process has changed|now require/i,
  accept: /\bI accept\b|^accepted\b|\bI can (cover|take)\b|^can (cover|take)\b|\bI can (do|attend|make) (it|both|them|this|that|these|those|all)\b|\bI('ll| will) (take|cover|do|attend) (it|both|them|this one|that one|these|those|all|the (hearings?|cases?))\b/i,
  conditional: /\bI could\b.*\bif\b|\bonly if\b|\bprovided that\b|that date works for me/i,
  availability: /left the (morning|afternoon|day) free|no other hearings that (morning|afternoon|day)|\bfree (that|all) (morning|afternoon|day)/i,
  cleared: /\b(received|processed|accepted) (the |your )?(signed |requested )?(homeowner statement|withdrawal|settlement)|(withdrawal|settlement|statement) (has been|was) (processed|received|accepted)/i,
  tentative: /usually free|need to check|before I can say yes|not sure yet|will let you know/i,
  decline: /\bcannot\b|\bcan't\b|\bunable\b|\bconflict\b|^not\b|\bam ill\b/i,
  calendar: /(moved|put|changed).*(calendar|hearings? (to|on))|shared calendar events/i,
  question: /which date|has anything changed|should i\b|let me know what|\?\s*$/i,
  versionIssue: /links? (open|still point to) v(ersion )?\s?1|still point to v1|outdated (packet|version)/i,
  submittedPacket: /(packets?|files?|both) (were |are )?(sent|attached)|current packets sent/i,
  submittedStaffing: /staffing details on your form|\bwill attend\b/i,
  signedDoc: /(signed|emailed) (the |a )?(corrected )?(withdrawal|settlement)/i,
  changeRequest: /could (we|you) move|please move|request(ing)? to move|can (we|you) move/i,
  outcomeContinued: /giving us more time|continued|adjourned/i,
  outcomeHeard: /was heard|were heard/i,
  internalMark: /marked .*(internally|awaiting)|planning sheet/i,
  withdrawCancelled: /will not process the withdrawal|withdrawal (request )?(has been|was|is) cancell?ed|appeal (remains|stays) active/i,
  ownerSpoke: /\b(called|spoke with|spoke to|phoned|rang) (the )?homeowner\b|\bhomeowner (said|says|confirmed|confirms|told|did not|does not|wants)\b/i,
  ownerNo: /\b(did not|didn't|never) ask\b|\b(does|do) not want\b|\bdoesn't want\b|\bwants? (the appeal|it) to continue\b|changed (his|her|their) mind|\bnot (to )?withdraw\b/i,
  ownerYes: /\bconfirm(s|ed)?\b|\bdid ask\b|\bwants? to withdraw\b|\basked for (it|this|the)\b/i,
  ownerSilent: /no answer|voicemail|could not reach|did not pick up/i,
  negated: /\b(not|never|cannot|couldn't|unable)\b|n't\b/i,
  postponed: /\bpostponed\b|\badjourned\b|off the calendar\b|will not take place\b|\b(has|have) been cancell?ed\b|\b(is|are) cancell?ed\b/i,
};

// A reply in the form the firm's own messages ask for: "YES", "NO", "YES 1, NO 2", "1 yes, 2 no".
// asked: the numbered list this consultant was sent, [{ id, n }]. Returns [{ id, yes }], or null
// when the sentence is not exactly such a reply. Then the other rules get the sentence, and if
// they find nothing a person reads the message. Nothing is guessed from a half-match.
const YES_WORDS = new Set(['yes', 'yep', 'yeah', 'ok', 'okay', 'sure', 'confirmed', 'confirm', 'accepted', 'accept', 'agreed']);
const NO_WORDS = new Set(['no', 'nope', 'declined', 'decline']);
const NUM_FILL = new Set(['to', 'for', 'on', 'and', 'number', 'hearing', 'hearings', 'case', 'is', 'a', 'the']);
const YES_FILL = new Set(['both', 'all', 'to', 'for', 'of', 'them', 'these', 'those', 'the', 'hearings', 'hearing', 'please', 'thanks', 'thank', 'you', 'that', 'works', 'fine', 'great', 'good', 'happy', 'i', 'me', 'with', 'it', 'is']);
const NO_FILL = new Set(['both', 'all', 'to', 'for', 'of', 'them', 'these', 'those', 'the', 'hearings', 'hearing', 'sorry', 'thanks', 'thank', 'you', 'i', 'am']);
export function shortAnswer(sentence, asked) {
  if (!asked || !asked.length) return null;
  const text = sentence.trim().toLowerCase().replace(/[’‘]/g, "'");
  if (/\?/.test(text)) return null;
  const tokens = text.split(/[\s,;:.!()#&/\-–]+/).filter(Boolean);
  if (!tokens.length || tokens.length > 12) return null;
  const kind = (t) => (YES_WORDS.has(t) ? 'yes' : NO_WORDS.has(t) ? 'no' : /^\d$/.test(t) ? 'num' : null);
  const byLine = new Map(asked.map((q) => [q.n, q.id]));

  if (tokens.some((t) => /^\d+$/.test(t))) {
    // numbered: every token must be an answer word, a line number or a filler
    const seq = [];
    for (const t of tokens) {
      const k = kind(t);
      if (k) seq.push({ k, t });
      else if (!NUM_FILL.has(t)) return null;
    }
    if (!seq.length || !seq.some((x) => x.k !== 'num')) return null;
    const out = new Map();
    const set = (num, yes) => {
      const id = byLine.get(+num);
      if (!id || out.has(id)) return false;
      out.set(id, yes);
      return true;
    };
    if (seq[0].k !== 'num') {                       // "YES 1, NO 2"
      let cur = null, used = true;
      for (const x of seq) {
        if (x.k === 'num') { if (cur === null || !set(x.t, cur)) return null; used = true; } else { if (!used) return null; cur = x.k === 'yes'; used = false; }
      }
      if (!used) return null;
    } else {                                        // "1 yes, 2 no"
      let pending = [];
      for (const x of seq) {
        if (x.k === 'num') pending.push(x.t);
        else { if (!pending.length) return null; for (const n of pending) if (!set(n, x.k === 'yes')) return null; pending = []; }
      }
      if (pending.length) return null;
    }
    return [...out].map(([id, yes]) => ({ id, yes }));
  }

  // bare: one answer for every hearing in the question
  const words = tokens.filter((t) => kind(t));
  if (!words.length || tokens.length > 8 || !kind(tokens[0]) && !['both', 'all'].includes(tokens[0])) return null;
  const yes = words.every((t) => YES_WORDS.has(t)), no = words.every((t) => NO_WORDS.has(t));
  if (yes === no) return null;
  const fill = yes ? YES_FILL : NO_FILL;
  if (tokens.some((t) => !kind(t) && !fill.has(t))) return null;
  return asked.map((q) => ({ id: q.id, yes }));
}

function modeOf(s) {
  if (/in person/i.test(s)) return 'in_person';
  if (/video/i.test(s)) return 'video';
  return undefined;
}
function roomOf(s) {
  const m = s.match(/room ([A-Z])\b(?! instead)/) || s.match(/room ([A-Z]) instead/);
  return m ? m[1] : undefined;
}

// ---- One sentence, several values. The reader pairs them exactly or says it cannot.

// Where in the sentence is this hearing named? -1 when it is not named itself ("both hearings").
export function mentionAt(dir, s, id) {
  const i = s.indexOf(id);
  if (i >= 0) return i;
  const c = dir.caseById[id];
  const street = c.street.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${c.number}\\b(?=[^.;]{0,40}?\\b${street})`, 'ig');
  let m;
  while ((m = re.exec(s))) if (!/(january|february|march|april|may|june|july|august|september|october|november|december)\s+$/i.test(s.slice(0, m.index))) return m.index;
  return -1;
}

// The old value is not the statement: "moved from 9 a.m. to 8:30 a.m.", "8:30 a.m. instead of 9 a.m.".
// Returns the stretches of the sentence that only say what used to be true.
export function oldSpans(s) {
  const spans = [];
  const re = /\b(from|instead of|rather than|no longer|was at|was on|previously|originally)\s+(?:at\s+|on\s+)?(?=\d|January|February|March|April|May|June|July|August|September|October|November|December)/gi;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const rest = s.slice(start);
    let end;
    if (/^from$/i.test(m[1])) { const to = rest.search(/\s+to\s+/i); if (to < 0) continue; end = start + to; }
    else { const stop = rest.search(/[,;]|\s+(?:and is now|but|so)\b/i); end = stop < 0 ? s.length : start + stop; }
    spans.push([start, end]);
  }
  return spans;
}
const outside = (items, spans) => items.filter((x) => !spans.some(([a, b]) => x.index >= a && x.index < b));

// Which time belongs to which hearing? { per: { caseId: 'HH:MM' } } or { abstain: reason }.
export function timesFor(dir, s, ids, times, ctx) {
  const n = ids.length, m = times.length;
  if (!m) return { per: {} };
  if (n === 1) return m === 1 ? { per: { [ids[0]]: times[0].hhmm } } : { abstain: `the sentence gives ${m} times for one hearing` };
  if (m === 1) return { abstain: `the sentence gives one time for ${n} hearings` };
  if (m !== n) return { abstain: `the sentence gives ${m} times for ${n} hearings` };
  const at = ids.map((id) => mentionAt(dir, s, id));
  const named = at.every((i) => i >= 0) && new Set(at).size === n;
  let order;
  if (named) order = ids.slice().sort((a, b) => at[ids.indexOf(a)] - at[ids.indexOf(b)]);
  else {
    // "Both hearings have been moved to 1 p.m. and 1:30 p.m.": the hearings keep the order they have now.
    const cur = ids.map((id) => ctx.facts && ctx.facts[id] && ctx.facts[id].time);
    if (cur.some((t) => !t) || new Set(cur).size !== n) return { abstain: `the sentence gives ${m} times for ${n} hearings and does not say which is which` };
    order = ids.slice().sort((a, b) => cur[ids.indexOf(a)].localeCompare(cur[ids.indexOf(b)]));
  }
  const sorted = times.slice().sort((a, b) => a.index - b.index);
  return { per: Object.fromEntries(order.map((id, i) => [id, sorted[i].hhmm])), inferred: !named };
}

// Which consultant is named for which hearing? Names and hearings must alternate ("Leo is recorded
// for 14 Willow Lane and Maya for 28 Willow Lane"). { per: { caseId: consultantId } } or { abstain }.
export function namesFor(dir, s, ids) {
  if (ids.length < 2) return { per: {} };          // one hearing: the caller's own rule picks the name
  const found = [];
  for (const k of dir.consultants) {
    const re = new RegExp(`\\b${k.first}\\b`, 'g');
    let m;
    while ((m = re.exec(s))) found.push({ index: m.index, name: k.id });
  }
  const distinct = [...new Set(found.map((f) => f.name))];
  if (distinct.length <= 1) return { per: Object.fromEntries(ids.map((id) => [id, distinct[0]])) };
  const unclear = { abstain: `the sentence names ${distinct.length} consultants and it is not clear which hearing each one is recorded for` };
  const marks = ids.map((id) => ({ index: mentionAt(dir, s, id), id }));
  if (marks.some((x) => x.index < 0)) return unclear;
  const seq = [...found, ...marks].sort((a, b) => a.index - b.index);
  const per = {};
  let cur = null, used = true;
  for (const x of seq) {
    if (x.name) { if (!used) return unclear; cur = x.name; used = false; } else { if (!cur) return unclear; per[x.id] = cur; used = true; }
  }
  return used ? { per } : unclear;
}

// Group hearings that got the same value, so one statement stays one claim where it can.
const groupBy = (ids, valueOf) => {
  const groups = new Map();
  for (const id of ids) { const v = valueOf(id) || ''; groups.set(v, [...(groups.get(v) || []), id]); }
  return [...groups].map(([value, list]) => ({ value: value || undefined, ids: list }));
};

export function extractWithRules(msg, dir, ctx) {
  const claims = [];
  const quoted = new Set();          // every sentence that produced a reading
  const add = (type, cases, quote, fields = {}, explicit = true) => {
    if (!cases.length) return;
    quoted.add(quote);
    // a reading the reader could not make exactly stands on its own: it never merges into a good one
    if (fields.abstain) { claims.push({ type, cases, quote, confidence: 0.3, abstain: fields.abstain }); return; }
    const kindKey = fields.kind || '';
    const existing = claims.find((c) => c.type === type && (c.kind || '') === kindKey && c.cases.join() === cases.join());
    if (existing) {
      for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null && existing[k] === undefined) existing[k] = v;
      return;
    }
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== null));
    claims.push({ type, cases, quote, confidence: explicit ? 0.9 : 0.6, ...clean });
  };

  // An unknown sender is read as the role it claims (or as an office, the most consequential
  // reading) so that the content is kept as a lead. Verification removes all authority.
  const role = msg.role === 'unknown' ? (msg.claimed ? msg.claimed.role : 'government') : msg.role;
  const verbalGov = role === 'firm' && /phone/.test(msg.channel);      // firm's note of what a clerk said
  const govVoice = role === 'government' || verbalGov;
  const body = msg.body;
  const homeowner = /homeowner (request|asked)|homeowner for .* has asked/i.test(body);
  const docKind = /withdrawal/i.test(body) ? 'withdrawal' : /settlement/i.test(body) ? 'settlement' : undefined;
  const isOffer = /confirm the assignment|have not seen these cases/i.test(body);
  const noFurther = /no further hearing/i.test(body);
  // A firm note of speaking with the homeowner: the homeowner's own answer, not a clerk's statement.
  const owners = [...new Set((ctx.caseIds || []).map((id) => dir.caseById[id].homeowner))];
  const ownerCall = role === 'firm' && (owners.some((o) => body.includes(o)) || RE.ownerSpoke.test(body));
  let lastDate;           // most recent date mentioned earlier in the message ("That date works for me")

  let prevExplicit = null;
  const scopeOf = (s) => {
    const r = casesInSentence(dir, s, ctx);
    if (r.explicit) { prevExplicit = r.ids; return r; }
    if (prevExplicit && /\b(it|that one|this one|the hearing|the withdrawal|statement)\b/i.test(s)) return { ids: prevExplicit, explicit: true };
    if (docKind && ctx.openObligations) {
      const narrowed = r.ids.filter((id) => (ctx.openObligations[id] || []).includes(docKind));
      if (narrowed.length) return { ids: narrowed, explicit: true };
    }
    return r;
  };

  for (const sentence of sentences(body)) {
    if (msg.role === 'consultant') {
      const short = shortAnswer(sentence, ctx.asked);
      if (short) {
        for (const a of short) add(a.yes ? 'consultant_accepted' : 'consultant_declined', [a.id], sentence, a.yes ? { consultant: msg.consultant } : { consultant: msg.consultant, reason: 'no_reason' }, false);
        continue;
      }
    }
    let clauses = role === 'consultant' ? sentence.split(/,?\s+but\s+/i) : [sentence];
    if (govVoice) {
      // "Maya is recorded for 28 Willow Lane, but we are still waiting for the notice for 14 Willow Lane":
      // two statements about two hearings. Split only when each part names its own hearing.
      const parts = sentence.split(/[,;]?\s+(?:but|while|whereas|however)\s+/i);
      const named = parts.map((p) => (ctx.caseIds || []).filter((id) => mentionAt(dir, p, id) >= 0));
      if (parts.length > 1 && named.every((n) => n.length) && named.every((n, i) => named.every((o, j) => i === j || !n.some((id) => o.includes(id))))) clauses = parts;
    }
    for (const s of clauses) {
      const scope = scopeOf(s);
      const ids = scope.ids;
      const ex = scope.explicit;
      const deadline = findDeadline(s);
      const sNoDeadline = deadline ? s.replace(/\bby\s+.*$/i, '') : s;
      const dates = findDates(sNoDeadline);
      const times = findTimes(sNoDeadline);
      const names = findConsultants(dir, s);
      const negated = RE.negated.test(s);

      if (ownerCall) {
        if (RE.ownerNo.test(s)) add('homeowner_declined', ids, s, {}, ex);
        else if (RE.ownerYes.test(s)) add('homeowner_confirmed', ids, s, {}, ex);
        else if (RE.ownerSilent.test(s)) add('internal_note', ids, s, {}, ex);
        continue;
      }

      if (govVoice) {
        if (RE.repRequested.test(s)) add('rep_requested', ids, s, { deadline }, ex);
        if (RE.repNotRecorded.test(s)) add('rep_not_recorded', ids, s, {}, ex);
        if (RE.sigRejected.test(s) && /names \w+, but/i.test(s)) add('signature_rejected', ids, s, { kind: docKind }, ex);
        // "We can record Leo" or "we will record Leo" is an offer, not a record. Only a statement
        // that someone IS recorded closes anything.
        if (RE.repRecorded.test(s) && !/\b(can|could|will|would|may|able to)\s+(record|list)\b/i.test(s) && !/\b(no|nobody|no one|none|not|never)\b/i.test(s)) {
          const nf = namesFor(dir, s, ids);
          if (nf.abstain) add('rep_recorded', ids, s, { abstain: nf.abstain }, ex);
          else if (new Set(Object.values(nf.per)).size > 1) for (const g of groupBy(ids, (id) => nf.per[id])) add('rep_recorded', g.ids, s, { consultant: g.value }, ex);
          else {
            const m = s.match(/(\w+) is (?:recorded|listed|the representative)/) || s.match(/naming (\w+)/);
            const named = m && dir.consultants.find((c) => c.first === m[1]);
            const consultant = named ? named.id : names[names.length - 1];
            if (consultant) add('rep_recorded', ids, s, { consultant }, ex);
          }
        }
        if (/corrected statement signed by/i.test(s)) add('signature_required', ids, s, { kind: docKind, consultant: names[names.length - 1] }, ex);
        if (RE.ruleChanged.test(s)) add('process_rule_changed', ids, s, {}, ex);
        if (RE.pending.test(s)) add('change_pending', ids, s, {}, ex);
        if (RE.withdrawReq.test(s)) add('withdrawal_requested', ids, s, { homeowner_initiated: true }, ex);
        if (RE.withdrawCancelled.test(s)) add('withdrawal_cancelled', ids, s, {}, ex);
        if (RE.decisionPending.test(s)) add('decision_pending', ids, s, {}, ex);
        if (RE.instruction.test(s) && role === 'government') add('hearing_instruction', ids, s, {}, ex);
        if (RE.cleared.test(s) && !negated) {
          const m = s.match(RE.cleared);
          const word = (m[4] || m[5] || '').toLowerCase();
          add('obligation_cleared', ids, s, { kind: /withdrawal/.test(word) ? 'withdrawal' : /settlement/.test(word) ? 'settlement' : 'homeowner_statement' }, ex);
          continue;
        }
        if (RE.obligation.test(s) || (deadline && /send it/i.test(s))) {
          if (!RE.repRequested.test(s) && !/staffing form/i.test(s)) add('obligation_created', ids, s, { kind: 'homeowner_statement', deadline, no_further_hearing: noFurther || undefined }, ex);
        }
        if (RE.unreadable.test(s)) add('doc_unreadable', ids, s, { kind: docKind || 'packet' }, ex);
        else if (RE.received.test(s) && !negated) add('packet_received', ids, s, { by: 'clerk' }, ex);

        // What the sentence states now, without the old values it only mentions ("from 9 a.m. to 8:30 a.m.").
        const old = oldSpans(sNoDeadline);
        const nowDates = old.length ? outside(dates, old) : dates;
        const nowTimes = old.length ? outside(times, old) : times;
        const lastDateBeforeTime = () => {
          if (!nowDates.length) return undefined;
          if (!nowTimes.length) return nowDates[nowDates.length - 1].iso;
          const before = nowDates.filter((d) => d.index < nowTimes[0].index);
          return (before.length ? before[before.length - 1] : nowDates[nowDates.length - 1]).iso;
        };
        // One time per hearing, paired exactly. If that cannot be done the claim says so and a person reads it.
        const tf = timesFor(dir, sNoDeadline, ids, nowTimes, ctx);
        const sched = (type, fields) => {
          if (tf.abstain) return add(type, ids, s, { abstain: tf.abstain }, ex);
          for (const g of groupBy(ids, (id) => tf.per[id])) add(type, g.ids, s, { ...fields, time: g.value }, ex && !tf.inferred);
          return undefined;
        };

        // "Postponed, a new date will follow" takes the hearing off the calendar. "Postponed to June 20" is a move.
        if (RE.postponed.test(s) && !/withdraw/i.test(s) && !(dates.length && /\b(to|until)\b/i.test(s))) {
          add('hearing_postponed', ids, s, {}, ex);
          continue;
        }
        if (RE.denied.test(s)) {
          add('change_denied', ids, s, { date: /schedule is full|cannot move|can't move|unable to move/i.test(s) && !/stay|remain/i.test(s) ? undefined : lastDateBeforeTime() }, ex);
        } else if (RE.moved.test(s)) {
          sched('schedule_changed', { date: lastDateBeforeTime(), room: roomOf(s), homeowner_initiated: homeowner || undefined, verbal: verbalGov || /phone/.test(msg.channel) || undefined });
        } else if (RE.confirmed.test(s)) {
          // "Owen remains the representative of record" confirms a person, not a schedule.
          if (!RE.repNotRecorded.test(s) && !(RE.aboutRep.test(s) && !RE.scheduleCue.test(s) && !nowDates.length)) {
            sched('hearing_confirmed', { date: lastDateBeforeTime(), room: roomOf(s) });
          }
        } else if (nowDates.length && nowTimes.length && !RE.notSchedule.test(s) && (RE.scheduleCue.test(s) || ids.some((id) => mentionAt(dir, s, id) >= 0))) {
          // A date and a time are a hearing time only in a sentence about a hearing. A deadline, the
          // office's opening hours or a request to send something are not: those go to a person.
          sched('hearing_scheduled', { date: lastDateBeforeTime(), mode: modeOf(s), room: roomOf(s) });
        }
        if (verbalGov && !claims.length && /voicemail/i.test(s)) add('internal_note', ids, s, {}, ex);
        continue;
      }

      if (role === 'consultant') {
        const t = times[0];
        const part = /morning/i.test(s) ? 'morning' : /afternoon/i.test(s) ? 'afternoon' : undefined;
        let narrowed = ids;
        if (t || part) {
          const n = narrowByTime(dir, ids, ctx, { hhmm: t?.hhmm, part });
          if (n.length) narrowed = n;
        } else if (dates.length === 1 && !/\bboth\b/i.test(s)) {
          const n = narrowByTime(dir, ids, ctx, { date: dates[0].iso });
          if (n.length) narrowed = n;
        }
        const nx = ex || narrowed.length < ids.length;
        const consultant = msg.consultant;

        // "YES - 14 Willow Lane", "No for AX-104": an answer word and the hearing it is for, nothing else.
        const lead = ex && !/\?/.test(s) && s.trim().match(/^(yes|yep|yeah|ok|okay|confirmed|no|nope)\b(.*)$/i);
        if (lead) {
          let rest = lead[2].replace(/\bAX-\d{3}\b/g, ' ');
          for (const id of ids) rest = rest.split(dir.caseById[id].number).join(' ').replace(new RegExp(dir.caseById[id].street.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
          if (!rest.replace(/\b(to|for|on|at|and|the|hearings?|cases?|both)\b/gi, ' ').replace(/[\s,;:.!\-–]+/g, '')) {
            const yes = !/^no/i.test(lead[1]);
            add(yes ? 'consultant_accepted' : 'consultant_declined', ids, s, yes ? { consultant } : { consultant, reason: 'no_reason' }, true);
            continue;
          }
        }

        if (RE.outcomeContinued.test(s) && /attending|hearing|time on/i.test(s)) { add('outcome_reported', narrowed, s, { result: 'continued' }, nx); continue; }
        if (RE.outcomeHeard.test(s)) { add('outcome_reported', narrowed, s, { result: 'heard' }, nx); continue; }
        if (RE.signedDoc.test(s)) { add('document_submitted', narrowed, s, { kind: s.match(RE.signedDoc)[4].toLowerCase() }, nx); continue; }
        if (RE.versionIssue.test(s)) add('packet_version_issue', narrowed, s, {}, nx);
        // A consultant relaying that a hearing "has been moved" is hearsay about the schedule.
        if (/\b(has|have|was|were) been moved\b|\b(was|were) moved\b/i.test(s) && !RE.calendar.test(s)) { add('schedule_changed', narrowed, s, { date: dates[dates.length - 1]?.iso, time: times[0]?.hhmm }, nx); continue; }
        if (RE.calendar.test(s)) add('calendar_edited', narrowed, s, { date: dates[dates.length - 1]?.iso }, nx);
        if (RE.availability.test(s) && !/\busually\b|\bprobably\b|\bmight\b/i.test(s)) add('availability_stated', narrowed, s, { consultant, part: (s.match(/morning|afternoon|day/i) || ['day'])[0].toLowerCase() }, nx);
        if (RE.tentative.test(s)) { add('consultant_tentative', narrowed, s, { consultant }, nx); continue; }
        if (RE.conditional.test(s)) {
          const whole = /that date/i.test(s) ? ids : narrowed;
          add('consultant_conditional', whole, s, { consultant, date: dates[0]?.iso || lastDate }, nx);
          if (dates.length) lastDate = dates[dates.length - 1].iso;
          continue;
        }
        if (RE.accept.test(s) && !/^please\b/i.test(s)) add(isOffer ? 'coverage_offered' : 'consultant_accepted', narrowed, s, { consultant, date: dates.length === 1 ? dates[0].iso : undefined }, nx);
        else if (RE.decline.test(s) && !RE.question.test(s) && !/not seen/i.test(s)) add('consultant_declined', narrowed, s, { consultant, reason: /ill\b/i.test(s) ? 'illness' : 'conflict' }, nx);
        if (RE.received.test(s) && !/will review/i.test(s.split(/\band\b/).find((p) => /review|files|packets/i.test(p)) || s)) add('packet_received', narrowed, s, { by: 'consultant' }, nx);
        if (RE.question.test(s)) add('consultant_question', narrowed, s, { consultant }, nx);
        if (dates.length) lastDate = dates[dates.length - 1].iso;
        continue;
      }

      // firm (email / calendar activity) and unknown senders
      if (/calendar/.test(msg.channel) || RE.calendar.test(s)) {
        if (/calendar events|shared calendar/i.test(s)) add('calendar_edited', ids, s, { date: dates[dates.length - 1]?.iso }, ex);
        continue;
      }
      if (RE.changeRequest.test(s)) add('change_requested', ids, s, { date: dates[dates.length - 1]?.iso }, ex);
      if (RE.sigRequired.test(s) && /ready for/i.test(s)) add('signature_required', ids, s, { kind: docKind, consultant: names[names.length - 1] }, ex);
      if (RE.unreadable.test(s)) add('doc_unreadable', ids, s, { kind: docKind || 'packet' }, ex);
      if (RE.versionIssue.test(s)) add('packet_version_issue', ids, s, { version: (body.match(/-(v\d)\.txt/) || [])[1] }, ex);
      if (RE.signedDoc.test(s)) add('document_submitted', ids, s, { kind: s.match(RE.signedDoc)[4].toLowerCase() }, ex);
      else if (RE.submittedStaffing.test(s)) add('document_submitted', ids, s, { kind: /form/i.test(s) ? 'staffing_form' : 'staffing', consultant: names[0] }, ex);
      else if (RE.submittedPacket.test(s)) add('document_submitted', ids, s, { kind: 'packet' }, ex);
      if (RE.internalMark.test(s)) add('internal_note', ids, s, {}, ex);
    }
  }

  // A mode stated once for the whole message ("Both are by video") applies to its hearings.
  const modes = [...new Set((body.match(/\bin person\b|\bvideo\b/gi) || []).map((m) => (/video/i.test(m) ? 'video' : 'in_person')))];
  if (modes.length === 1) for (const c of claims) if (c.type === 'hearing_scheduled' && !c.mode) c.mode = modes[0];
  // "The hearings remain June 11. The June 13 schedule is full": the denial keeps the confirmed date.
  for (const c of claims) {
    if (c.type !== 'change_denied' || c.date) continue;
    const kept = claims.find((k) => k.type === 'hearing_confirmed' && k.date && k.cases.some((id) => c.cases.includes(id)));
    if (kept) c.date = kept.date;
  }
  if (!claims.length && role === 'firm') add('internal_note', ctx.caseIds, body, {}, false);
  if (!claims.length && role !== 'firm' && ctx.caseIds.length && courtesyOnly(body)) add('acknowledgement', ctx.caseIds, body.trim(), {}, false);
  // One message that says both yes and no for the same hearing is not read either way.
  if (role === 'consultant') {
    for (const y of claims.filter((c) => c.type === 'consultant_accepted')) {
      const clash = y.cases.filter((id) => claims.some((n) => n.type === 'consultant_declined' && n.cases.includes(id)));
      if (!clash.length) continue;
      for (const n of claims.filter((c) => c.type === 'consultant_declined')) n.cases = n.cases.filter((id) => !clash.includes(id));
      y.cases = y.cases.filter((id) => !clash.includes(id));
      claims.push({ type: 'consultant_accepted', cases: clash, quote: y.quote, confidence: 0.3, consultant: msg.consultant, abstain: 'the message says both yes and no for this hearing' });
    }
    return claims.filter((c) => c.cases.length);
  }
  // What the offline reader did not understand must not disappear. A sentence from outside the
  // firm that names a date or a time and produced no reading is passed on, and a person reads it.
  if (role !== 'firm') {
    const left = [];
    for (const sentence of sentences(body)) {
      if ([...quoted].some((q) => q === sentence || q.includes(sentence) || sentence.includes(q))) continue;
      if (findDates(sentence).length || findTimes(sentence).length) left.push({ quote: sentence, note: 'a date or a time the offline reader could not place' });
    }
    if (left.length) claims.unclassified = left;
  }
  return claims;
}
