// A sentence that guesses, asks, sets a condition, promises or denies confirms nothing.
//
// This check sits in the verifier, after the reader and before the ledger, so it holds for
// every reader: the offline rules, an AI model, a second AI model. It looks only at claims
// that would CLOSE something (CLOSING_CLAIMS in model.js) and that the sender has the
// authority to make. Holding such a claim costs one more question to the sender. Accepting a
// wrong one can cost a hearing. So the patterns may hold a little too much, and they never
// change what a claim says: a held claim is kept, shown with the reason, and changes nothing.
//
// What a person enters by hand (engine.correct) is not second-guessed here.

import { sentences, findDates, findTimes } from './text.js';
import { CLOSING_CLAIMS, SCHEDULE_CLAIMS } from './model.js';

const squash = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

export const HEDGE_KINDS = {
  question: 'a question',
  unsure: 'a guess',
  conditional: 'a condition',
  future: 'a promise about later',
  negated: 'the opposite',
};

// A conditional yes is hedged by definition and has its own claim type.
const EXEMPT = new Set(['consultant_conditional']);
// Schedules are about the future by nature, and notices carry boilerplate ("unless you hear otherwise").
const SCHEDULE = new Set(SCHEDULE_CLAIMS);
// A yes from a consultant: "I can do it if ..." is the classic conditional.
const COMMIT = new Set(['consultant_accepted', 'coverage_offered']);
// Claims where a "not" next to the verb turns the meaning around.
const NEGATABLE = new Set(['rep_recorded', 'packet_received', 'obligation_cleared', 'consultant_accepted', 'coverage_offered', 'document_submitted', 'homeowner_confirmed']);

const UNSURE = [
  /\b(?:believes?|thinks?|assum(?:e|es|ed|ing)|suppos(?:e|es|ing)|suspects?|imagines?|presum(?:e|es|ed|ably)|guess(?:es|ing)?|reckons?)\b/i,
  /\bhop(?:e|es|ing|efully)\b(?!\s+(?:this|that|it)\s+(?:helps|is\s+helpful|answers|clarifies|makes\s+sense|works)|\s+you\b|\s+your\b|\s+all\b)/i,
  /\bexpect(?:s|ed|ing)?\s+(?:to|that)\b(?!\s+(?:arrive|attend|bring|check|sign|join|log|wear|present|be\s+(?:present|on\s+time|there|ready)))/i,
  /\b(?:i|we)\s+(?:understand|gather|heard|hear|was\s+told|were\s+told|have\s+been\s+told|am\s+told|are\s+told)\b(?!\s+(?:back|from))/i,
  /\b(?:probably|possibly|perhaps|maybe|supposedly|apparently|seemingly|likely|unlikely|tentative(?:ly)?|provisional(?:ly)?|in\s+principle|in\s+theory|more\s+or\s+less|rumou?r(?:s|ed)?|supposed\s+to)\b/i,
  /(?<!\byou\s)(?<!\battendees\s)(?<!\brepresentatives?\s)(?<!\bparties\s)\b(?:might|may|could)\s+(?:\w+\s+)?(?:be|have|still|move|change|need|not|well)\b/i,
  /\bshould\s+(?:now\s+|still\s+|already\s+|all\s+)?(?:be\s+(?:recorded|listed|fine|ok|okay|all\s+right|alright|processed|received|done|confirmed|moved|set|sorted|through|cleared|in\s+(?:the|our)\s+system|on\s+(?:the|our)\s+(?:list|record|file|system))|have\s+(?:been|gone|it|arrived|received))\b/i,
  /\bnot\s+(?:\w+\s+)?(?:sure|certain|positive)\b|\bunsure\b|\buncertain\b|\b(?:fairly|pretty|quite|reasonably|almost|nearly)\s+(?:sure|certain|confident)\b|\b(?:i|we)(?:'m|'re|\s+am|\s+are)\s+(?:sure|confident|certain)\b/i,
  /\bas\s+far\s+as\s+(?:i|we)\b|\bto\s+(?:my|our)\s+knowledge\b|\bif\s+(?:i|we)\s+(?:remember|recall)\b|\bnot\s+mistaken\b|\b(?:i|we)\s+(?:seem\s+to|vaguely)\s+(?:remember|recall)\b|\bdon't\s+quote\s+me\b|\bas\s+(?:i|we)\s+recall\b/i,
  /\b(?:i|we)(?:'ll|'d)?\s+(?:\w+\s+){0,2}(?:need|have|must|got|going)\s+to\s+(?:double[- ]?check|check(?!\s*-?\s*in\b)|verify|look\s+into|look\s+up|find\s+out|ask|confirm\s+(?:with|whether|if|first))\b|\b(?:i|we)\s+want\s+to\s+(?:double[- ]?check|check(?!\s*-?\s*in\b)|verify)\b|\blet\s+me\s+(?:double[- ]?check|check(?!\s*-?\s*in\b)|verify|look|find\s+out|ask)\b|\b(?:i|we)(?:'ll|\s+will|\s+shall)\s+(?:double[- ]?check|check(?!\s*-?\s*in\b)|verify|look\s+into|find\s+out|get\s+back|ask)\b/i,
  /(?<!\b(?:room|location|venue|link|mode|format)\b[^.;,]{0,24})\b(?:to\s+be\s+confirmed|tbc)\b|\bnot\s+(?:yet\s+)?(?:been\s+)?confirmed\b|\bawaiting\s+confirmation\b|\bsubject\s+to\s+(?:confirmation|approval)\b|\bpending\s+(?:confirmation|approval)\b|\bunconfirmed\b|\bunofficial(?:ly)?\b|\bnot\s+official\b/i,
];

const QUESTION = /^\W*(?:is|are|was|were|do|does|did|has|have|had|can|could|will|would|should|shall|may|might|who|what|when|where|which|why|how)\b[^?]*\?\s*["')\]]?\s*$|,\s*(?:right|correct|yes|no|ok|okay|is\s+it|isn't\s+it|is\s+she|is\s+he|are\s+they|did\s+it|has\s+it)\s*\?\s*["')\]]?\s*$/i;

const CONDITION_START = /^\W*(?:if|assuming|provided|supposing)\b/i;
const CONDITION_ANY = /\b(?:only\s+if|provided\s+that|as\s+long\s+as|on\s+(?:the\s+)?condition|assuming\s+that)\b/i;
// For everything except schedule notices, "unless", "once" and "as soon as" make the statement wait for something.
const CONDITION_STATE = /\bunless\b|^\W*(?:once|as\s+soon\s+as)\b/i;
// For a consultant's yes, any "if" matters, except the polite ones ("let me know if anything changes").
const CONDITION_COMMIT = /(?<!\b(?:know|me|us|ask|asked|check|see|wonder|wondering|confirm|decide|even)\s)\bif\b(?!\s+(?:anything|something|needed|necessary|required|possible|so|not|you\s+(?:need|want|like|prefer|wish|would\s+like|still\s+need))\b)/i;

// "Will be recorded" is not "is recorded". One pattern per claim type, on the verbs of that type.
const FUTURE = {
  rep_recorded: /\bwill\s+(?:\w+\s+){0,2}be\s+(?:recorded|listed|added|entered)\b|\b(?:will|shall|can|could|would|able\s+to|going\s+to|about\s+to|happy\s+to|glad\s+to)\s+(?:\w+\s+)?(?:record|list|add|enter|note|put)\b/i,
  packet_received: /\bwill\s+(?:\w+\s+){0,2}(?:be\s+)?(?:receive|received|download|downloaded|check\s+for|look\s+for)\b/i,
  obligation_cleared: /\bwill\s+(?:\w+\s+){0,2}(?:be\s+)?(?:process|processed|review|reviewed|clear|cleared|accept|accepted|handle|handled|enter|entered)\b|\b(?:going|about|due|expected|scheduled)\s+to\s+(?:be\s+)?(?:process|review)/i,
  document_submitted: /\bwill\s+(?:\w+\s+){0,2}(?:be\s+)?(?:send|sent|submit|submitted|sign|signed|file|filed|email|emailed|return|returned|forward|forwarded)\b|\b(?:going|about|plan|planning|intend|intending)\s+to\s+(?:send|submit|sign|file|email|return|forward)\b/i,
  outcome_reported: /\bwill\s+be\s+heard\b|\b(?:going|due|scheduled|set|expected)\s+to\s+be\s+heard\b|\bto\s+be\s+heard\s+(?:on|at|next)\b/i,
  homeowner_confirmed: /\bwill\s+(?:\w+\s+)?(?:call|confirm|decide|let\s+us\s+know|think|get\s+back)\b|\bwants?\s+to\s+think\b|\bneeds?\s+(?:more\s+)?time\b|\bhas\s+not\s+decided\b|\bundecided\b/i,
  homeowner_declined: /\bwill\s+(?:\w+\s+)?(?:call|confirm|decide|let\s+us\s+know|think|get\s+back)\b|\bwants?\s+to\s+think\b|\bneeds?\s+(?:more\s+)?time\b|\bhas\s+not\s+decided\b|\bundecided\b/i,
};
const NOT_YET = /\bnot\s+yet\b|\b(?:has|have)\s+yet\s+to\b|\bstill\s+(?:waiting|pending|outstanding|to\s+be|needs?)\b|\bin\s+progress\b/i;

const NEGATION = /\b(?:not|never)\s+(?:yet\s+|been\s+|currently\s+|actually\s+|be\s+|able\s+to\s+|have\s+|had\s+|got\s+)*(?:recorded|listed|received|processed|accepted|cleared|signed|submitted|sent|seen|opened|readable|shown|showing|appear\w*|confirm\w*|attend\w*|cover\w*|accept\w*|ask\w*|want\w*|request\w*|agree\w*|take|make|do|come|there|available|free)\b|n't\s+(?:yet\s+|been\s+|be\s+|have\s+|got\s+)*(?:recorded|listed|received|processed|accepted|cleared|signed|submitted|sent|seen|opened|shown|showing|appear\w*|confirm\w*|attend\w*|cover\w*|accept\w*|ask\w*|want\w*|request\w*|agree\w*|take|make|do|come|available|free|have|see|find)\b|\bcannot\b|\bcan't\b|\bunable\s+to\b|\bno\s+(?:record|representative|packet|receipt|file|entry|one|assignment)\b|\bnobody\b|\bdeclin(?:e|es|ed)\b|\brefus(?:e|es|ed)\b/i;

// A short sentence right after the statement that takes it back: "At least I think so."
const RETRACT = /\b(?:i|we)\s+(?:think|believe|hope|guess|assume)\s+so\b|\bat\s+least\s+(?:i|we)\s+(?:think|hope|believe)\b|\b(?:i|we)(?:'m|\s+am|'re|\s+are)\s+not\s+(?:100%\s+|entirely\s+|completely\s+|totally\s+|quite\s+)?(?:sure|certain)\b|\bbut\s+(?:i|we)(?:'ll|\s+will)?\s+(?:need\s+to\s+|have\s+to\s+)?(?:double[- ]?)?check\b|\b(?:i|we)(?:'ll|\s+will|\s+need\s+to|\s+have\s+to)\s+(?:double[- ]?check|check|verify|confirm)(?:\s+(?:that|this|it|again|the\s+list|our\s+list|the\s+record|our\s+records?|to\s+be\s+sure|first))?\s*[.!]*$|\blet\s+me\s+(?:double[- ]?check|check|verify|confirm)(?:\s+(?:that|this|it|again|the\s+list|our\s+list|the\s+record|our\s+records?|to\s+be\s+sure|first))?\s*[.!]*$|\bdon't\s+quote\s+me\b|\bfingers\s+crossed\b|\bunless\s+(?:i|we)(?:'m|\s+am|\s+are)\s+(?:wrong|mistaken)\b|\bif\s+(?:i|we)\s+(?:remember|recall)\s+(?:correctly|right)\b/i;

const CLAUSE_SPLIT = /\s*(?:;|,?\s+but\b|,?\s+however\b|,?\s+although\b|,?\s+though\b|,?\s+except\b|\s+whereas\b|\s+while\b)\s*/i;

// The sentence (or sentences) of the body that hold the quote, and the sentence that follows.
// `locate(quote, text)` finds a quote that leaves words out (elidedQuoteIn in verify.js). It is
// passed in because verify.js imports this module, and the bundler (cli/build.js) refuses an
// import cycle. Its rule splits sentences at least wherever sentences() in text.js does, so such a
// quote lies inside one of these sentences.
function context(quote, body, locate = null) {
  const q = squash(quote);
  const all = sentences(String(body || '')).map(squash);
  const idx = [];
  all.forEach((s, i) => { if (s.includes(q) || (s.length >= 8 && q.includes(s))) idx.push(i); });
  if (!idx.length && locate) all.forEach((s, i) => { if (locate(q, s)) idx.push(i); });
  if (!idx.length) {
    const head = q.slice(0, 24), tail = q.slice(-24);
    all.forEach((s, i) => { if (s.includes(head) || s.includes(tail)) idx.push(i); });
  }
  if (!idx.length) return { text: q, next: '' };
  return { text: idx.map((i) => all[i]).join(' '), next: all[idx[idx.length - 1] + 1] || '' };
}

const found = (kind, shown) => ({ kind, why: `${{ question: 'The sentence is a question', unsure: 'The sentence is a guess', conditional: 'The sentence sets a condition', future: 'The sentence is about something that has not happened yet', negated: 'The sentence says the opposite' }[kind]}${shown ? ` ("${shown.trim()}")` : ''}.` });

// Returns null when the sentence is a plain statement, or { kind, why } when it is not.
// `mentions(text, caseId)` tells whether a piece of text names a case. It lets a sentence such
// as "I can do 102 Willow Lane, but I am not sure about 118" be judged per hearing.
// `locate(quote, text)`, optional, finds a quote that leaves words out (see context above).
export function notPlain(claim, msg, mentions = () => false, locate = null) {
  if (!claim || !CLOSING_CLAIMS.includes(claim.type) || EXEMPT.has(claim.type)) return null;
  const t = claim.type;
  const { text, next } = context(claim.quote, msg.body, locate);

  // Judge the statement itself, not its neighbours. A sentence can hold several clauses:
  //   "I can take the 9:30 case, but cannot get there for 9."      -> two hearings, two answers
  //   "She is recorded for 14 Willow Lane, but I need to check."   -> one statement, taken back
  // A clause is left out when it is only about another hearing: it names another case, or the
  // reader quoted a different clause and this one carries a date or time the quote does not.
  const q = squash(claim.quote);
  const parts = [];
  let pos = 0;
  for (const piece of text.split(CLAUSE_SPLIT).filter(Boolean)) { const i = Math.max(text.indexOf(piece, pos), pos); parts.push({ t: piece, a: i, b: i + piece.length }); pos = i + piece.length; }
  // Where the quote sits in the text. A quote that leaves words out is not a substring: it sits
  // from the position of its first token to the end of its last token.
  let at = text.indexOf(q), len = q.length;
  if (at < 0 && locate) { const hit = locate(q, text); if (hit) { at = hit.start; len = hit.end - hit.start; } }
  const quoted = (x) => at < 0 || (x.a < at + len && x.b > at);
  const others = (msg.caseIds || []).filter((id) => !(claim.cases || []).includes(id));
  const otherCase = (x) => others.some((id) => mentions(x.t, id)) && !(claim.cases || []).some((id) => mentions(x.t, id));
  const stamps = (x) => [...findDates(x).map((d) => d.iso), ...findTimes(x + ' ').map((h) => h.hhmm)];
  const inQuote = new Set(stamps(q));
  const elsewhere = (x) => !quoted(x) && stamps(x.t).some((v) => !inQuote.has(v));
  let near = parts.filter((x) => quoted(x) && !otherCase(x));
  if (!near.length) near = parts.filter(quoted);
  let kept = parts.filter((x) => near.includes(x) || (!otherCase(x) && !elsewhere(x)));
  if (!kept.length) kept = parts;
  const scope = kept.map((x) => x.t).join('; ');
  const local = near.map((x) => x.t).join('; ');
  const hasEnd = kept.includes(parts[parts.length - 1]);

  let m;
  if (hasEnd && QUESTION.test(scope)) return found('question');
  for (const re of UNSURE) if ((m = scope.match(re))) return found('unsure', m[0]);
  if ((m = scope.match(CONDITION_START)) || (m = scope.match(CONDITION_ANY)) || (!SCHEDULE.has(t) && (m = scope.match(CONDITION_STATE))) || (COMMIT.has(t) && (m = scope.match(CONDITION_COMMIT)))) return found('conditional', m[0]);
  if (FUTURE[t] && ((m = scope.match(FUTURE[t])) || (m = scope.match(NOT_YET)))) return found('future', m[0]);
  if (NEGATABLE.has(t) && (m = local.match(NEGATION))) return found('negated', m[0]);
  if (next && next.split(' ').length <= 14 && (m = next.match(RETRACT))) return found('unsure', m[0]);
  return null;
}
