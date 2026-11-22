/**
 * The sheet prints its lines in capitals, which is hard to read at length. The interface shows
 * each line in sentence case and keeps the exact capitals one click away ("As printed on the
 * sheet"). Only runs of capital words are re-cased: words the sheet already writes in mixed case
 * (names it copies in, dates, links) stay exactly as typed. Names, places, cell references and the
 * sheet's own marker words keep their capitals.
 */

import { benchRows, hearings, offices } from '@/lib/data';

/** Words of one or two letters that are English words; any other short capital word is a column or a code. */
const SHORT_WORDS = new Set(['A', 'AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'GO', 'HE', 'IF', 'IN', 'IS', 'IT', 'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE']);

/** Abbreviations that stay in capitals. */
const KEEP = new Set(['OK', 'UTC', 'PDF', 'ICS', 'TSV', 'SMS', 'ID', 'CC']);

/** Words a person types in a reply: shown lower case in quotes, so they read as the word to type. */
const QUOTED = new Set(['YES', 'ARRIVED']);

/** Marker phrases that stay in capitals as a whole. */
const KEEP_PHRASES = ['ASK:'];

const CALENDAR: Record<string, string> = Object.fromEntries(
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    .flatMap((w) => [[w.toUpperCase(), w], [w.slice(0, 3).toUpperCase(), w.slice(0, 3)]]),
);

let names: { phrases: [string, string][]; words: Map<string, string> } | null = null;

/** Proper names from the data: consultants, counties, homeowners and the streets of the properties. */
function properNames(): NonNullable<typeof names> {
  if (names) return names;
  const raw = new Set<string>();
  for (const r of benchRows()) raw.add(String(r.cells.A).trim());
  for (const o of offices()) raw.add(o.county.trim());
  for (const h of hearings) {
    raw.add(h.county.trim());
    if (h.homeowner) raw.add(String(h.homeowner).trim());
    for (const part of h.property.split(',')) raw.add(part.replace(/^\d+\s*/, '').trim());
  }
  const phrases: [string, string][] = [];
  const words = new Map<string, string>();
  for (const n of raw) {
    if (!n) continue;
    if (n.includes(' ')) phrases.push([n.toUpperCase(), n]);
    else words.set(n.toUpperCase(), n);
  }
  // A first name alone ("OWEN") is a name too; it is never an English word in this data.
  for (const r of benchRows()) {
    const first = String(r.cells.A).trim().split(' ')[0];
    if (first) words.set(first.toUpperCase(), first);
  }
  phrases.sort((a, b) => b[0].length - a[0].length);
  names = { phrases, words };
  return names;
}

const isCaps = (w: string): boolean => /[A-Z]/.test(w) && w === w.toUpperCase();

/** One capital word, re-cased. */
function recaseWord(w: string, map: Map<string, string>): string {
  const bare = w.replace(/['’]S$/, '');
  if (KEEP.has(w) || /\d/.test(w)) return w;
  if (QUOTED.has(w)) return `"${w.toLowerCase()}"`;
  if (map.has(bare)) return map.get(bare)! + w.slice(bare.length).toLowerCase();
  if (CALENDAR[w]) return CALENDAR[w]!;
  if (w === 'I') return w;
  if (w.length <= 2 && !SHORT_WORDS.has(w)) return w;
  return w.toLowerCase();
}

/** "OWEN TARRIS SAID THEY ARRIVE AT 10:45 AM" becomes "Owen Tarris said they arrive at 10:45 AM". */
export function sentenceCase(text: string): string {
  if (!text) return text;
  const { phrases, words } = properNames();
  const slots: string[] = [];
  let work = text;
  // Protect names and marker phrases first, so the word pass cannot lower them.
  const protect = (find: string, put: string): void => {
    let at = work.indexOf(find);
    while (at >= 0) {
      const before = at === 0 ? ' ' : work[at - 1]!;
      const after = work[at + find.length] ?? ' ';
      if (!/[A-Za-z]/.test(before) && !/[A-Za-z]/.test(after)) {
        const token = `\u0000${slots.length}\u0000`;
        slots.push(put);
        work = work.slice(0, at) + token + work.slice(at + find.length);
        at = work.indexOf(find, at + token.length);
      } else {
        at = work.indexOf(find, at + 1);
      }
    }
  };
  for (const [up, proper] of phrases) protect(up, proper);
  for (const p of KEEP_PHRASES) protect(p, p);
  // A column named after its tab keeps its letters ("Offices AS", "Hearings BN").
  work = work.replace(/\b(Offices|Hearings|Bench|Settings|Measures|Availability|OFFICES|HEARINGS|BENCH|SETTINGS|MEASURES|AVAILABILITY) ([A-Z]{1,3})(?![A-Za-z])/g, (_m, tab: string, col: string) => {
    const token = `\u0000${slots.length}\u0000`;
    slots.push(`${tab.charAt(0)}${tab.slice(1).toLowerCase()} ${col}`);
    return token;
  });

  // A capital word that starts a sentence keeps one capital; "a.m." and an ellipsis do not end one.
  const startsSentence = (at: number): boolean => {
    const before = work.slice(0, at);
    if (/^[\s"'(]*$/.test(before)) return true;
    if (!/[.!?]["')]?\s+$/.test(before)) return false;
    return !/(\.\.\.|…)\s+$/.test(before) && !/\b[AaPp]\.[Mm]\.\s+$/.test(before);
  };
  const cap = (x: string): string => x.replace(/[a-z]/, (c) => c.toUpperCase());
  const out = work
    .replace(/[A-Za-z][A-Za-z'’-]*/g, (w, at: number) => {
      if (!isCaps(w)) return w;
      const r = w.split('-').map((p) => (p ? recaseWord(p, words) : p)).join('-');
      return startsSentence(at) ? cap(r) : r;
    })
    .replace(/""([a-z]+)""/g, '"$1"');
  // eslint-disable-next-line no-control-regex -- the NUL marks are slots this function inserted itself.
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => slots[Number(i)]!);
}

/** True when a text has enough capital words that sentence case changes how it reads. */
export function isShouted(text: string | null | undefined): boolean {
  if (!text) return false;
  const words = text.match(/[A-Za-z]{3,}/g) ?? [];
  return words.filter(isCaps).length >= 2;
}

const MONTH = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
const DAY = '(Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
const ampm = (x: string): string => (x.toUpperCase() === 'AM' ? 'a.m.' : 'p.m.');

/**
 * The sheet's own date style ("Fri 7 Jun at 1:00 PM", "10:45 AM") in the app's one US style
 * ("Fri, Jun 7, 1:00 p.m.", "10:45 a.m."). The printed text stays one click away.
 */
export function appDates(text: string): string {
  return text
    .replace(new RegExp(`\\b${DAY} (\\d{1,2}) ${MONTH}(?: at (\\d{1,2}:\\d{2}) ?(AM|PM))?`, 'g'), (_m, d: string, n: string, mo: string, t?: string, ap?: string) =>
      `${d}, ${mo} ${n}${t && ap ? `, ${t} ${ampm(ap)}` : ''}`)
    .replace(/\b(\d{1,2}:\d{2}) ?(AM|PM)\b/g, (_m, t: string, ap: string) => `${t} ${ampm(ap)}`)
    .replace(/([ap])\.m\.\./g, '$1.m.');
}

/** A printed line as the interface shows it: sentence case and the app's dates. */
export function plainLine(text: string): string {
  return appDates(sentenceCase(text));
}

/** The first sentence of a printed line: the first instruction, whole. */
export function firstSentence(text: string): string {
  const m = /^(.+?[.!?])\s+(?=[A-Z])/.exec(text);
  const head = m ? m[1]! : text;
  // Never stop inside a time ("4:00 P.M. Friday"): only a full stop after a word of two or more letters ends it.
  return /\b[A-Za-z]\.$/.test(head) ? text : head;
}

/**
 * The one line a list shows for a hearing: the first instruction of what the sheet prints, in
 * plain case, with what is owed named when the sheet's line only says "OWED: SEND BY".
 */
export function firstInstruction(line: string, owed?: string | null): string {
  let s = plainLine(firstSentence(line));
  const what = owed ? owed.split(':')[0]!.trim() : '';
  if (what && /^Owed: send by /.test(s)) s = s.replace(/^Owed: send by /, `Send the ${what.toLowerCase()} by `);
  // The list words ("top of list") already show beside the line; the line keeps only the instruction.
  return s.replace(/[,:]\s*top of list(?:[:,][^.]*)?\.$/i, '.');
}
