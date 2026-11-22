// Replies that code can check.
//
// The first priority sends numbered offers ("1) 9:00 a.m. 14 Willow Lane 2) ..."), a Wednesday
// text that lists next week's dockets, a day-before text and an arrival request. Once a consultant holds hearings, two more messages go out: the case
// files with a version number ("Case files for Thursday, June 13, Caldmere, version 2: [links].
// Version 2 adds the homeowner statement. Reply GOT IT when every file opens.") and a change from
// the office to the room, link, time or date ("Change from the Harthmere office for Thursday,
// June 6: video room D instead of B. Times unchanged. Reply OK."). A consultant's answer to any of
// these is short and has a fixed form, so no model has to interpret it: code checks WHO sent it,
// WHICH message it answers and WHAT it says, and either files the proof or hands the reply to a
// person with the reason.
//
// The rule is deliberately narrow. Anything that is not exactly one of the expected forms goes to
// a person: a condition ("yes but not before 10"), a question ("which date is it now?"), a number
// that was not offered, a GOT IT for a version that is not the current one, a file that will not
// open, a consultant who cannot make a changed date, a reply from somebody other than the
// consultant the message was sent to.
//
// A reply arrives by text or by email. Four of the six example consultants prefer email (the
// packet's notice_preference), so the rule reads both. A text is read whole. An email is read by
// its first line: quoted lines (starting with ">") are dropped, and so is everything from a line
// that starts "On ... wrote:" or "-----Original Message-----" onward, which is the earlier message
// that the email client copied below the answer. The first non-empty line that is left must be one
// of the same fixed forms as a text. The rest of the email (a signature, "Sent from my phone", a
// second sentence) is not read: the reason says that the first line was used and how many lines
// were left unread, so that a person who checks the filed proof can see it.
//
// The daily cap. Each consultant has a largest number of hearings in one day (the packet's
// max_hearings_per_day, Bench E on the sheet). Offers for several dockets on one day go out
// together, so each one can fit the cap while all of them together do not. When the caller gives
// the day's numbers for the consultant (the cap, the hearings they already hold that day and the
// hearings still on offer to them on other dockets that day), a YES that would bring
//     held + on offer elsewhere + the hearings this YES takes
// above the cap is not filed: it goes to a person with the numbers in the reason. A person then
// files the YES and takes an offer back, or offers the last hearings to the next name. A NO is
// never held up by the cap. When the caller gives no numbers, the rule works as before and the cap
// is not checked, so the caller must say in its own output that it was not.

const clean = (t) => String(t || '').trim().toUpperCase().replace(/[.!,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
const person = (why) => ({ byRule: false, action: 'to a person', numbers: [], why });

/**
 * The lines of an email that the sender wrote: every non-empty line before the quoted earlier
 * message, without quoted lines. The quoted message starts at a line "On ... wrote:" or
 * "-----Original Message-----"; a quoted line starts with ">".
 * @param {string} text the body of the email
 * @returns {string[]} the lines, trimmed, in order
 */
export function ownEmailLines(text) {
  const lines = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (/^On\s.*\swrote:$/i.test(line) || /^-{3,}\s*Original Message\s*-{3,}$/i.test(line)) break;
    if (line.startsWith('>')) continue;
    if (line) lines.push(line);
  }
  return lines;
}

/**
 * @param {object} sent   the message this reply answers:
 *   { kind: 'offer' | 'week' | 'day_before' | 'arrival' | 'files' | 'change', to: consultant id, open: [numbers offered] (offers only),
 *     dockets: [the dockets the Wednesday text lists for this consultant next week] (week only),
 *     held: [numbers this consultant holds on the docket] (day_before, arrival and files; for a change, the ones it touches),
 *     format: 'in person' | 'video' | 'telephone' (arrival), version: the version number of the case files sent (files only),
 *     what: a few words on what changed, for the table only (change, optional; the rule does not read it) }
 * @param {object} reply  { from: consultant id, text, channel: 'text' | 'email' (optional, 'text' when left out) }
 *   from is the consultant as listed, which the connection to the text line or mailbox looks up from
 *   the number or address the reply came from. A number or address that is not listed is nobody, so
 *   the reply goes to a person.
 * @param {number[]} taken numbers on the same docket already filled by another consultant's earlier YES (offers only).
 *   The first YES wins: a YES for a number that is already taken goes to a person, so no hearing is booked twice.
 * @param {object|null} day the consultant's numbers for the day of this docket (offers only, optional):
 *   { cap: the most hearings this consultant takes in one day (Bench E),
 *     held: hearings they already hold that day with a yes that counts, on any docket, without this reply,
 *     offered: hearings still on offer to them on OTHER dockets that day (0 when left out) }.
 *   On the sheet both counts are the row of this consultant on "Who can take it" for that day. When day is
 *   null or left out the cap is not checked. Numbers that are not whole numbers from 0 up send a YES to a person.
 * @returns {{ byRule: boolean, action: string, numbers: number[], why: string, version?: number, day?: object }}
 *   version is set only when a reply to the case files is filed: the version the consultant has.
 *   day is set when the cap was checked on a YES: { cap, held, offered, taking, total }.
 *   For an email, why ends with the first line that was read.
 */
export function matchReply(sent, reply, taken = [], day = null) {
  if (!sent || !reply) return person('no message to match the reply to');
  if (reply.from !== sent.to) return person('the reply is not from the consultant the message was sent to');
  const channel = reply.channel ?? 'text';
  if (channel === 'text') return withCap(matchForm(sent, clean(reply.text), taken), sent, day);
  if (channel !== 'email') return person(`a reply by ${channel} is not read by the rule, only a text or an email`);
  const lines = ownEmailLines(reply.text);
  if (!lines.length) return person('the email has no line of its own above the quoted message');
  // Every line after the first must be a sign-off or the sender's own name. Anything else ("but not before 10",
  // "call me") could change the answer, so the email goes to a person.
  const extra = lines.slice(1).filter((l) => !isSignOff(l, reply.from));
  if (extra.length) return person(`the email says more than the fixed form: "${extra[0]}"`);
  const out = withCap(matchForm(sent, clean(lines[0]), taken), sent, day);
  const rest = lines.length - 1;
  const note = `first line of the email used: "${lines[0]}"${rest ? `; the other ${rest > 1 ? `${rest} lines are` : 'line is'} a sign-off or the sender's name` : ''}`;
  return { ...out, why: `${out.why} (${note})` };
}

/**
 * The daily cap, applied to a YES that the fixed form would file. Returns the result unchanged when
 * no numbers were given, when the reply is not a YES to an offer, or when the day stays within the cap.
 * @param {object} out   what matchForm returned
 * @param {object} sent  the message the reply answers
 * @param {object|null} day { cap, held, offered } as described at matchReply
 */
export function withCap(out, sent, day) {
  if (day === null || day === undefined) return out;
  if (!sent || sent.kind !== 'offer' || !out.byRule || !out.numbers.length) return out;
  const whole = (v) => Number.isInteger(v) && v >= 0;
  const offered = day.offered === undefined || day.offered === null ? 0 : day.offered;
  if (!whole(day.cap) || !whole(day.held) || !whole(offered)) {
    return person("the day's numbers for the daily cap are incomplete (the cap, the hearings held that day and the hearings on offer elsewhere must be whole numbers), so a person checks the cap before this YES is filed");
  }
  const taking = out.numbers.length, who = sent.to;
  const hearings = (n) => `${n} ${n === 1 ? 'hearing' : 'hearings'}`;
  const numbers = { cap: day.cap, held: day.held, offered, taking, total: day.held + offered + taking };
  if (day.held + taking > day.cap) {
    return { ...person(`over the daily cap: ${who} holds ${hearings(day.held)} that day and this YES takes ${taking} more, which makes ${day.held + taking}; the cap is ${day.cap}`), day: numbers };
  }
  if (numbers.total > day.cap) {
    return { ...person(`could go over the daily cap: ${who} holds ${hearings(day.held)} that day, this YES takes ${taking} and ${hearings(offered)} ${offered === 1 ? 'is' : 'are'} still on offer to them on other dockets that day, which makes ${numbers.total}; the cap is ${day.cap}. A person files this YES and takes an offer back, or offers the last ones to the next name`), day: numbers };
  }
  return { ...out, why: `${out.why}; within the daily cap (${numbers.total} of ${day.cap} that day, counting ${day.held} held and ${offered} on offer elsewhere)`, day: numbers };
}

/** A sign-off line: a closing word ("Thanks", "Best regards"), a phone's "Sent from my ..." line, or only the sender's own name. */
export function isSignOff(line, from) {
  const t = String(line || '').replace(/^[-–—\s]+/, '').trim();
  if (/^(thanks|thank you|thx|many thanks|best|best regards|kind regards|regards|cheers|all the best)[\s,.!]*$/i.test(t)) return true;
  if (/^(sent from my|get outlook for)\b/i.test(t)) return true;
  const name = String(from || '').toLowerCase().split(/\s+/).filter(Boolean);
  const words = t.toLowerCase().replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => name.includes(w) || (w.length === 1 && name.some((n) => n[0] === w)));
}

// The fixed forms, the same for a text and for the first line of an email. t is the reply after
// clean(): capitals, punctuation removed, single spaces.
function matchForm(sent, t, taken) {
  if (!t) return person('empty reply');

  if (sent.kind === 'offer') {
    const open = sent.open || [];
    if (t === 'NO' || t === 'NO THANKS' || t === 'NO THANK YOU') return { byRule: true, action: 'declined: offer the docket to the next person', numbers: [], why: 'a plain NO' };
    if (t === 'YES ALL' && open.some((n) => taken.includes(n))) return person(`hearing ${open.filter((n) => taken.includes(n)).join(', ')} already has another consultant's yes`);
    if (t === 'YES ALL') return { byRule: true, action: 'fill the YES proof', numbers: [...open], why: 'YES ALL to a numbered offer' };
    if (t === 'YES') {
      if (open.length === 1 && taken.includes(open[0])) return person(`hearing ${open[0]} already has another consultant's yes`);
      if (open.length === 1) return { byRule: true, action: 'fill the YES proof', numbers: [...open], why: 'YES to an offer of one hearing' };
      return person('YES without numbers, and more than one hearing was offered');
    }
    const m = t.match(/^YES((?: \d{1,2})+)$/);
    if (m) {
      const nums = [...new Set(m[1].trim().split(' ').map(Number))];
      const notOffered = nums.filter((n) => !open.includes(n));
      if (notOffered.length) return person(`number ${notOffered.join(', ')} was not offered`);
      const already = nums.filter((n) => taken.includes(n));
      if (already.length) return person(`hearing ${already.join(', ')} already has another consultant's yes`);
      return { byRule: true, action: 'fill the YES proof', numbers: nums, why: 'YES with offered numbers' };
    }
    return person('not one of the expected forms (YES ALL, YES and numbers, NO)');
  }

  // The Wednesday text lists next week's dockets for one consultant ("Reply YES ALL, or call ...
  // about any you cannot keep"). YES ALL keeps them all; a plain YES counts only when one docket is
  // listed. Anything else (a docket handed back, a condition, a question) goes to a person, and no
  // YES ALL by Thursday noon means a phone call.
  if (sent.kind === 'week') {
    const dockets = sent.dockets || [];
    if (!dockets.length) return person('the Wednesday text lists no docket for this consultant');
    if (t === 'YES ALL') return { byRule: true, action: `record that next week is kept (${dockets.join('; ')})`, numbers: [], why: 'YES ALL to the Wednesday text' };
    if (t === 'YES' && dockets.length === 1) return { byRule: true, action: `record that next week is kept (${dockets[0]})`, numbers: [], why: 'YES to a Wednesday text with one docket' };
    if (t === 'YES') return person('YES without ALL, and more than one docket was listed');
    return person('not YES ALL: a docket may be handed back, so a person phones');
  }

  if (sent.kind === 'day_before') {
    if (t === 'YES') return { byRule: true, action: 'fill the day-before YES', numbers: [...(sent.held || [])], why: 'a plain YES to the day-before text' };
    return person('the day-before reply is not a plain YES');
  }

  if (sent.kind === 'arrival') {
    const word = sent.format === 'in person' ? 'ARRIVED' : 'IN';
    if (t === word) return { byRule: true, action: 'type the arrival time', numbers: [...(sent.held || [])], why: `${word} on the day` };
    return person(`the arrival reply is not exactly ${word}`);
  }

  // Case files: GOT IT means every file of THIS version opens. GOT IT with a number must name the
  // current version; GOT IT 1 to version 2 means the consultant may be reading the old files.
  if (sent.kind === 'files') {
    const v = sent.version;
    const held = sent.held || [];
    if (!Number.isInteger(v) || v < 1) return person('the files message has no version number');
    if (!held.length) return person('the files message names no hearing this consultant holds');
    const m = t.match(/^GOT IT(?: (\d{1,3}))?$/);
    if (m && m[1] !== undefined && Number(m[1]) !== v) return person(`confirms version ${Number(m[1])}, the current version is ${v}`);
    if (m) return { byRule: true, action: 'record the files received', numbers: [...held], why: m[1] === undefined ? `GOT IT to version ${v} of the files` : `GOT IT ${v}, the current version`, version: v };
    const other = (t.match(/\bVERSION (\d{1,3})\b/) || [])[1];
    if (other !== undefined && Number(other) !== v) return person(`mentions version ${Number(other)}, the current version is ${v}`);
    return person(`not one of the expected forms (GOT IT, GOT IT ${v})`);
  }

  // A change from the office (room, link, time or date) after the consultant said YES: a plain OK
  // records that the consultant has it. A question or "I cannot do the new date" goes to a person.
  if (sent.kind === 'change') {
    const held = sent.held || [];
    if (!held.length) return person('the change names no hearing this consultant holds');
    if (t === 'OK' || t === 'OK THANKS' || t === 'OK THANK YOU') return { byRule: true, action: 'record that the consultant has the change', numbers: [...held], why: 'a plain OK to the change' };
    return person('the reply to the change is not a plain OK');
  }
  return person('unknown kind of message');
}
