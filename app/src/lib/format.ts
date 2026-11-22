/**
 * Dates, times and working-day words, as the interface writes them: US dates with the weekday,
 * "9:00 a.m.", and words for a past hearing ("3 working days ago"), never a signed number.
 * Office time zones are never computed here: the sheet's own sentence (Hearings CB) is shown.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Parses "2030-06-07" (or the date part of "2030-06-07T16:00") as a calendar date, with no time zone. */
export function parseIsoDate(iso: string): { y: number; m: number; d: number; weekday: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const weekday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return { y, m: mo, d, weekday };
}

/** "Friday, June 7, 2030" */
export function dateLong(iso: string | null | undefined): string {
  const p = iso ? parseIsoDate(iso) : null;
  if (!p) return '';
  return `${WEEKDAYS[p.weekday]}, ${MONTHS[p.m - 1]} ${p.d}, ${p.y}`;
}

/** "Fri, Jun 7, 2030" */
export function dateMedium(iso: string | null | undefined): string {
  const p = iso ? parseIsoDate(iso) : null;
  if (!p) return '';
  return `${WEEKDAYS[p.weekday]!.slice(0, 3)}, ${MONTHS[p.m - 1]!.slice(0, 3)} ${p.d}, ${p.y}`;
}

/** "Mon, Jun 10" */
export function dateShort(iso: string | null | undefined): string {
  const p = iso ? parseIsoDate(iso) : null;
  if (!p) return '';
  return `${WEEKDAYS[p.weekday]!.slice(0, 3)}, ${MONTHS[p.m - 1]!.slice(0, 3)} ${p.d}`;
}

/** Minutes after midnight as "9:00 a.m." or "2:30 p.m." */
export function clockText(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const mm = String(minutes % 60).padStart(2, '0');
  const suffix = h24 < 12 ? 'a.m.' : 'p.m.';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${suffix}`;
}

/** The sheet's "09:00" or "13:30" as "9:00 a.m." or "1:30 p.m."; other text is returned as typed. */
export function sheetTime(value: unknown): string {
  if (typeof value !== 'string') return value == null ? '' : String(value);
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return value;
  return clockText(Number(m[1]) * 60 + Number(m[2]));
}

/** Hearings V in words: "today", "in 1 working day", "in 3 working days", "3 working days ago". */
export function workingDaysWords(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  if (n === 0) return 'today';
  const abs = Math.abs(n);
  const unit = abs === 1 ? 'working day' : 'working days';
  return n > 0 ? `in ${abs} ${unit}` : `${abs} ${unit} ago`;
}

/** "1 hearing", "24 hearings" */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Bytes as "17.5 MB" or "442 KB", with the exact byte count kept for a tooltip by the caller. */
export function bytesText(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} KB`;
  return `${n} bytes`;
}

/** 1234567 as "1,234,567" */
export function groupDigits(n: number): string {
  return n.toLocaleString('en-US');
}

/** A fraction of the sheet (0.458) as a percent with one decimal, "45.8 percent". */
export function percentText(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)} percent`;
}

/** "06/07/2030", the way the sheet's date cells are typed. Other text is returned as given. */
export function dateTyped(iso: string | null | undefined): string {
  const p = iso ? parseIsoDate(iso) : null;
  if (!p) return iso ?? '';
  return `${String(p.m).padStart(2, '0')}/${String(p.d).padStart(2, '0')}/${p.y}`;
}

/** Every ISO date inside a text as "06/07/2030". */
export function datesTyped(text: string): string {
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_m, y: string, mo: string, d: string) => `${mo}/${d}/${y}`);
}
