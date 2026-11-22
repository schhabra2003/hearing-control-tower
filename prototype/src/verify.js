// VERIFY stage. Every claim from a reader passes through here before it can touch the ledger.
// Two questions: (1) is the claim well formed and really in the message, and (2) what is this
// sender allowed to do with a claim of this type? The answer is a *disposition*.

import { TYPE_LIST, GOV_ESTABLISH, GOV_FLAG, CONSULTANT_ONLY, ANYONE_FLAG, HOMEOWNER_ONLY } from './model.js';
import { notPlain } from './hedge.js';
import { courtesyOnly } from './text.js';

const squash = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

export function quoteFound(quote, body) {
  const q = squash(quote), b = squash(body);
  // Word for word first. A quote that leaves words out is the fallback, under the rule below.
  if (q.length >= 3) return b.includes(q) || !!elidedQuoteIn(q, b);
  // A two-letter answer ("NO", "OK") is a quote only as a whole word, never as part of one.
  if (!/^[A-Za-z]{2}$/.test(q)) return false;
  return b.split(/[^A-Za-z0-9']+/).includes(q);
}

// ---- a quote that leaves words out --------------------------------------------------------------
// A reader sometimes quotes one property's part of a sentence that names two, by leaving words
// out. Message 19 says "... for 37 Meadow Avenue, Tesswick and 52 Meadow Avenue, Tesswick, June 12
// at 11 a.m. and 11:30 a.m. in person." and the reader quotes "37 Meadow Avenue, Tesswick, June 12
// at 11 a.m. and 11:30 a.m. in person". Such a quote is accepted only under this rule:
//   a) The text is compared as words (tokens) of the squashed text. "11:30", "2.5" and "a.m." are
//      one token each; "a.m" and "a.m." are the same token. Case matters, as it does word for word.
//   b) The quote's tokens appear in the same order inside ONE sentence of the message. A sentence
//      ends at . ! or ? followed by a space or the end of the text. A decimal point never ends
//      one, and the full stop of "a.m." or "p.m." ends one only when a capital letter follows.
//   c) The quote has at least 4 tokens and keeps at least half of the tokens of the stretch of the
//      sentence it is drawn from (the shortest stretch that holds all its tokens in order).
//   d) No word left out inside that stretch is a negation or a condition (SKIP_BLOCKS). If any
//      stretch that meets rule c leaves out such a word, the quote is rejected, even when another
//      stretch would not.
// Returns null when the rule does not hold. Otherwise { start, end, sentence }: start is the
// position of the quote's first token in the squashed body, end the position just after its last
// token, and sentence the squashed sentence it comes from.
// Used by findQuote (extract/prompt.js), by quoteFound (above) and, passed in, by hedge.js.
const ELIDED_MIN_TOKENS = 4;
const TOKEN = /(?<![A-Za-z0-9])[AaPp]\.[Mm]\.?(?![A-Za-z0-9])|\d+(?:[:.,]\d+)*(?![A-Za-z0-9])|[A-Za-z0-9]+(?:'[A-Za-z]+)*/g;
// The words that may not be left out: the listed negations and conditions with their inflected
// forms, plus a few words that turn a hearing's status around ("postponed", "off").
const SKIP_BLOCKS = /^(?:not|no|never|cannot|unable|nobody|none|neither|nor|without|unless|if|except|but|only|instead|rather|refus(?:e|es|ed|ing|al)|declin(?:e|es|ed|ing)|cancel(?:s|ed|led|ing|ling|lation)?|withdr(?:aw|aws|awn|ew|awing|awal|awals)|postpon(?:e|es|ed|ing|ement)|adjourn(?:s|ed|ing|ment)?|vacat(?:e|es|ed|ing)|off)$|n't$/;

function tokensOf(text, offset = 0) {
  const out = [];
  for (const m of text.matchAll(TOKEN)) {
    const w = /^[ap]\.m\.?$/i.test(m[0]) ? `${m[0][0].toLowerCase()}.m.` : m[0];
    out.push({ w, a: offset + m.index, b: offset + m.index + m[0].length });
  }
  return out;
}

// [start, end) of each sentence of a squashed text.
function sentenceSpans(text) {
  const out = [];
  let start = 0;
  for (const m of text.matchAll(/[.!?]+(?=\s|$)/g)) {
    const end = m.index + m[0].length;
    if (/(?:^|[^A-Za-z0-9])[ap]\.m\.$/i.test(text.slice(Math.max(0, end - 5), end)) && !/^\s+[A-Z]/.test(text.slice(end))) continue;
    out.push([start, end]);
    start = end;
  }
  if (start < text.length) out.push([start, text.length]);
  return out;
}

export function elidedQuoteIn(quote, body) {
  const q = tokensOf(squash(quote)).map((t) => t.w);
  if (q.length < ELIDED_MIN_TOKENS) return null;
  const B = squash(body);
  const count = new Map();
  for (const w of q) count.set(w, (count.get(w) || 0) + 1);
  let best = null, blocked = false;
  for (const [s, e] of sentenceSpans(B)) {
    const t = tokensOf(B.slice(s, e), s);
    for (let i = 0; i < t.length; i += 1) {
      if (t[i].w !== q[0]) continue;
      // The shortest stretch that starts here: each next quote token is matched as early as possible.
      let j = 1, k = i + 1;
      for (; j < q.length && k < t.length; k += 1) if (t[k].w === q[j]) j += 1;
      if (j < q.length) break;                     // a later start cannot hold the whole quote either
      const last = k - 1, span = last - i + 1;
      if (q.length * 2 < span) continue;           // rule c: too much left out
      // The words left out are the stretch less the quote's own words, whichever way they are matched.
      const left = new Map(count);
      let bad = false;
      for (let x = i; x <= last; x += 1) {
        const w = t[x].w;
        if (left.get(w) > 0) left.set(w, left.get(w) - 1);
        else if (SKIP_BLOCKS.test(w.toLowerCase())) bad = true;
      }
      if (bad) { blocked = true; continue; }       // rule d
      if (!best || span < best.span) best = { start: t[i].a, end: t[last].b, span, sentence: B.slice(s, e).trim() };
    }
  }
  if (blocked || !best) return null;
  return { start: best.start, end: best.end, sentence: best.sentence };
}

// ---- the sentence that carries a consultant's yes ------------------------------------------------
// A reader sometimes quotes a true sentence of an accepting message that is not the acceptance
// itself. Message 62 says "I accept both. I have left the morning free for these hearings." and
// the reader quotes the second sentence. The proposal for the consultant's own yes (gate G2) should
// show the words that say yes. This is fixed code on the message text; no model is called.
//   a) When the reader's quote itself holds an acceptance, nothing changes (null is returned).
//   b) Otherwise the first sentence of the message that holds an acceptance and no negation or
//      condition (the SKIP_BLOCKS words above, so "I can take the 9:30 case, but not the 9:00" is
//      never chosen) is returned, exactly as the message has it.
//   c) When no sentence qualifies, null is returned and the reader's words stay.
// An acceptance is a first-person "I accept", "I can cover", "I can take", "I can attend",
// "I will cover", "I will take", "I will attend", or the word "Accepted", "Yes" or "Confirmed".
// A sentence qualifies only when it BEGINS with one of these, so "Please send me the files for the
// one I can cover" (message 5) is not taken for a yes.
const ACCEPT_WORDS = '(?:(?:I|we)\\s+(?:accept|can\\s+(?:cover|take|attend)|will\\s+(?:cover|take|attend))|accepted|yes|confirmed)\\b';
const ACCEPTANCE = new RegExp(`(?:^|[^A-Za-z0-9'])${ACCEPT_WORDS}`, 'i');
const ACCEPTANCE_FIRST = new RegExp(`^\\s*${ACCEPT_WORDS}`, 'i');
export const holdsAcceptance = (text) => ACCEPTANCE.test(squash(text));
export function acceptanceSentence(quote, body) {
  if (holdsAcceptance(quote)) return null;
  const B = squash(body);
  for (const [s, e] of sentenceSpans(B)) {
    const sentence = B.slice(s, e).trim();
    if (!ACCEPTANCE_FIRST.test(sentence)) continue;
    if (tokensOf(sentence).some((t) => SKIP_BLOCKS.test(t.w.toLowerCase()))) continue;
    return sentence;
  }
  return null;
}

function validDate(s) {
  if (!/^\d{4}-\d\d-\d\d$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function mentionsCase(dir, body, caseId) {
  const c = dir.caseById[caseId];
  if (!c) return false;
  if (body.includes(caseId)) return true;
  const street = c.street.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${c.number}\\s+(and\\s+\\d+\\s+)?${street}\\b`, 'i').test(body);
}

const rej = (reason) => ({ disposition: 'rejected', reason });
const ok = (disposition, reason) => ({ disposition, reason });

// msg: { role, county?, consultant?, written, verbal, caseIds, body }
// Third question, asked last and only of claims that would close something and that this sender
// may make: is the sentence a plain statement? "I believe she is recorded" from the right office
// is still not a confirmation. Such a claim is held: kept, shown with the reason, changes nothing.
// opts.plain: the claim was entered by a person who read the message, and is not second-guessed.
export function verifyClaim(claim, msg, dir, opts = {}) {
  const v = authorityOf(claim, msg, dir);
  if (opts.plain || !['fact', 'provisional', 'flag'].includes(v.disposition)) return v;
  const h = notPlain(claim, msg, (text, id) => mentionsCase(dir, text, id), elidedQuoteIn);
  if (!h) return v;
  return { disposition: 'held', reason: `${h.why} It confirms nothing, so nothing was changed.`, hedged: h.kind };
}

function authorityOf(claim, msg, dir) {
  if (!claim || !TYPE_LIST.includes(claim.type)) return rej('Unknown claim type.');
  // A reader that cannot read a sentence exactly says so instead of guessing. The claim is kept
  // as a rejected reading, so the message goes to a person with the reason.
  if (claim.abstain) return rej(`The reader could not read this exactly: ${String(claim.abstain).replace(/[.\s]+$/, '')}. Nothing was changed.`);
  if (!Array.isArray(claim.cases) || !claim.cases.length) return rej('The claim names no case.');
  for (const id of claim.cases) if (!dir.caseById[id]) return rej(`Unknown case ${id}.`);
  for (const id of claim.cases) {
    if (!msg.caseIds.includes(id) && !mentionsCase(dir, msg.body, id)) return rej(`${id} is not in this thread and is not named in the message.`);
  }
  if (!quoteFound(claim.quote, msg.body)) return rej('The quoted text is not in the message.');
  if (claim.date && !validDate(claim.date)) return rej(`Invalid date ${claim.date}.`);
  if (claim.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(claim.time)) return rej(`Invalid time ${claim.time}.`);
  if (claim.deadline && !(/^\d{4}-\d\d-\d\dT([01]\d|2[0-3]):[0-5]\d$/.test(claim.deadline) && validDate(claim.deadline.slice(0, 10)))) return rej(`Invalid deadline ${claim.deadline}.`);
  if (claim.consultant && !dir.consultantById[claim.consultant]) return rej(`Unknown consultant ${claim.consultant}.`);
  if (msg.role === 'government') {
    const other = claim.cases.find((id) => dir.caseById[id].county !== msg.county);
    if (other) return rej(`${other} is not in ${msg.county}. An office can only speak for its own cases.`);
  }

  const t = claim.type;
  if (t === 'internal_note') return ok('note', 'Internal note. No effect on the record.');
  // "Thanks" needs nobody, but only when the code agrees it is nothing more than thanks, and
  // only when the firm is not waiting for an answer from this sender: "got it" may be that answer.
  if (t === 'acknowledgement') {
    if (!courtesyOnly(msg.body)) return rej('The message says more than thanks, so it is not treated as a plain acknowledgement.');
    if (msg.awaited) return rej(`The firm is waiting for an answer from this sender (${msg.awaited}), and a short reply may be that answer.`);
    return ok('note', 'Thanks or "understood" and nothing else. Recorded. Nothing to do.');
  }
  if (msg.role === 'unknown') return ok('signal', 'The sender is not a verified office, consultant or staff address. No authority.');
  if (msg.role === 'homeowner') return ok('signal', 'A homeowner wrote to the firm. Nothing changes until a person has spoken to them on the number on file.');
  if (HOMEOWNER_ONLY.has(t)) {
    if (msg.role === 'firm') return ok('fact', "The homeowner's own answer, recorded by firm staff.");
    return ok('signal', 'Only the homeowner can say what the homeowner wants. A person confirms it with them.');
  }

  // A firm phone note records what a clerk said on a call: government voice, but not in writing.
  const govVoice = msg.role === 'government' || (msg.role === 'firm' && msg.verbal);

  if (GOV_ESTABLISH.has(t)) {
    if (msg.role === 'government' && msg.written) return ok('fact', 'Government, in writing.');
    if (govVoice) return ok('provisional', 'Government, by phone. Held until confirmed in writing.');
    return ok('signal', 'Only the government can establish this.');
  }
  if (GOV_FLAG.has(t)) {
    if (govVoice) return ok('flag', msg.written ? 'Government, in writing.' : 'Government, by phone. Opening work does not need writing.');
    return ok('signal', 'Only the government can state this.');
  }
  if (CONSULTANT_ONLY.has(t)) {
    if (msg.role === 'consultant' && (!claim.consultant || claim.consultant === msg.consultant)) return ok('fact', 'The consultant, about themselves.');
    return ok('signal', 'Only the consultant can commit themselves.');
  }
  if (t === 'packet_received') {
    if (msg.role === 'consultant') return ok('fact', 'Receipt from the consultant.');
    if (msg.role === 'government' && msg.written) return ok('fact', 'Receipt from the clerk, in writing.');
    if (govVoice) return ok('provisional', 'Receipt by phone. Held until confirmed in writing.');
    return ok('signal', 'A receipt must come from the recipient.');
  }
  if (t === 'consultant_declined') {
    if (msg.role === 'consultant' && claim.consultant && claim.consultant !== msg.consultant) return ok('signal', 'A consultant can only decline for themselves.');
    if (msg.role === 'consultant' || msg.role === 'firm') return ok('flag', 'Anyone can raise a flag. This one opens the consultant gate.');
    return ok('signal', 'Not the consultant or the firm.');
  }
  if (ANYONE_FLAG.has(t)) return ok('flag', 'Anyone can raise a flag. Only the authority can clear it.');
  if (t === 'calendar_edited') return ok('belief', 'A calendar entry shows what someone believes. It never moves a hearing.');
  if (t === 'change_requested') return ok('request', 'A request. Only the government can approve a change.');
  if (t === 'document_submitted') {
    if (msg.role === 'firm' || msg.role === 'consultant') return ok('fact', 'The sender reports its own submission. It still needs an acknowledgment.');
    return ok('signal', 'Not the party that sent it.');
  }
  return ok('signal', 'No rule gives this sender authority over this claim.');
}
