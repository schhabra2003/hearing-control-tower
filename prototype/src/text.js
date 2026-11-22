// Small text utilities shared by the extractors and the resolver.

// "at 9 a.m.." -> "at 9 a.m." An abbreviation that ends a sentence needs no second full stop.
export const tidy = (t) => (t == null ? t : String(t).replace(/([ap]\.m\.)\.(?=\s|$|["')])/g, '$1'));

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

export function sentences(text) {
  // Split on sentence enders while keeping "a.m." / "p.m." intact, unless the abbreviation
  // itself ends the sentence ("... at 9 a.m. The hearing for ...").
  const protectedText = text.replace(/\b([ap])\.m\.(?!\s+[A-Z])/g, (m, p) => `${p}m§`);
  return protectedText
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.replace(/([ap])m§/gi, (m, p) => `${p}.m.`).trim())
    .filter(Boolean);
}

const pad = (n) => String(n).padStart(2, '0');

// "June 10" -> "2030-06-10" (year taken from context)
export function findDates(s, year = 2030) {
  const out = [];
  const re = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi;
  let m;
  while ((m = re.exec(s))) out.push({ iso: `${year}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(+m[2])}`, index: m.index, text: m[0] });
  const re2 = /\b(20\d\d)-(\d\d)-(\d\d)\b/g;
  while ((m = re2.exec(s))) out.push({ iso: `${m[1]}-${m[2]}-${m[3]}`, index: m.index, text: m[0] });
  return out.sort((a, b) => a.index - b.index);
}

// "9 a.m." / "9:30 a.m." / "1 p.m." / "14:00" -> "HH:MM". A bare "and 9:30 a.m." inherits meridiem.
export function findTimes(s) {
  const out = [];
  const re = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|noon)?(?=[\s,.;)]|$)/gi;
  let m;
  while ((m = re.exec(s))) {
    const [full, h, min, mer] = m;
    const prev = s.slice(Math.max(0, m.index - 12), m.index).toLowerCase();
    if (!mer && !min) continue;                      // bare numbers are not times
    if (/(june|july|may|august|lane|street|road|avenue|room)\s*$/.test(prev)) continue;
    let hour = +h;
    const meridiem = mer ? mer[0].toLowerCase() : null;
    if (meridiem === 'p' && hour < 12) hour += 12;
    if (meridiem === 'a' && hour === 12) hour = 0;
    if (hour > 23) continue;
    out.push({ hhmm: `${pad(hour)}:${min || '00'}`, index: m.index, explicit: !!mer, text: full });
  }
  // propagate meridiem forward/backward to bare HH:MM tokens in the same sentence
  const withMer = out.filter((t) => t.explicit);
  for (const t of out) {
    if (t.explicit) continue;
    const ref = withMer.find((w) => w.index > t.index) || withMer[withMer.length - 1];
    if (ref && +ref.hhmm.slice(0, 2) >= 12 && +t.hhmm.slice(0, 2) < 12) t.hhmm = `${pad(+t.hhmm.slice(0, 2) + 12)}:${t.hhmm.slice(3)}`;
  }
  return out;
}

export function findDeadline(s, year = 2030) {
  // "by 4 p.m. on June 7" / "by June 8 at 4 p.m."
  const m1 = s.match(/by\s+(\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?)\s+on\s+([A-Z][a-z]+\s+\d{1,2})/i);
  const m2 = s.match(/by\s+([A-Z][a-z]+\s+\d{1,2})\s+at\s+(\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?)/i);
  const pick = m1 ? { t: m1[1], d: m1[2] } : m2 ? { t: m2[2], d: m2[1] } : null;
  if (!pick) return null;
  const d = findDates(pick.d, year)[0];
  const t = findTimes(pick.t + ' ')[0];
  return d && t ? `${d.iso}T${t.hhmm}` : null;
}

export function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// "Thanks", "Understood, thank you", "Noted. Many thanks for the update." and nothing else.
// Deliberately narrow: every part of the message must be a known courtesy phrase. Anything with a
// date, a number, a name, a question or another word is not a courtesy and is read normally.
const COURTESY = [
  /^(many |ok(ay)?,? |great,? |perfect,? |well noted,? )?(thanks|thank you|thx|ta|cheers)( (very|so) much| a lot| again| all)?( for (the |your |this )?(update|message|note|email|confirmation|information|info|heads[- ]up|reminder|help|quick reply|reply)| for (letting|telling) (me|us) know| for (confirming|checking|sorting (this|that|it) out))?$/,
  /^(ok(ay)?|all good|understood|noted|well noted|duly noted|got that|great|perfect|fine|no problem|no worries|sounds good|appreciated|much appreciated|will keep that in mind)$/,
  /^(best|kind|warm) regards$/, /^(regards|best|sincerely)$/, /^(hi|hello|dear)( [a-z]+){0,3}$/, /^(good (morning|afternoon|evening))( [a-z]+){0,2}$/,
];
export function courtesyOnly(body) {
  const text = String(body || '').replace(/[‘’]/g, "'").trim();
  if (!text || text.length > 160 || /\d|\?/.test(text)) return false;
  const parts = text.toLowerCase().split(/[.!,;:\n\u2013\u2014-]+/).map((x) => x.trim()).filter(Boolean);
  if (!parts.length || parts.length > 6) return false;
  // At least one part must be a real thanks or "understood"; a greeting alone is not a message.
  let real = 0;
  for (const part of parts) {
    const i = COURTESY.findIndex((re) => re.test(part));
    if (i < 0) return false;
    if (i < 2) real += 1;
  }
  return real > 0;
}
