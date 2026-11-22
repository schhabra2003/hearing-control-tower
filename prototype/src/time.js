// Time helpers. Every county in the packet uses a fixed UTC-05:00 offset, so local wall-clock
// strings ("2030-06-10", "09:30") plus an offset are enough. Nothing here depends on the
// time zone of the computer that runs the prototype.

export const DEFAULT_TZ = '-05:00';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR = 3600e3;

const offsetMs = (tz) => {
  const m = /^([+-])(\d\d):(\d\d)$/.exec(tz) || ['', '-', '05', '00'];
  return (m[1] === '-' ? -1 : 1) * (+m[2] * HOUR + +m[3] * 60e3);
};
const two = (n) => String(n).padStart(2, '0');

export const toTs = (date, time = '00:00', tz = DEFAULT_TZ) => Date.parse(`${date}T${time}:00${tz}`);
export const parseLocal = (s, tz = DEFAULT_TZ) => Date.parse(s.length === 16 ? `${s}:00${tz}` : s);

// Local wall-clock parts of a timestamp in the given offset.
export function localParts(ts, tz = DEFAULT_TZ) {
  const d = new Date(ts + offsetMs(tz));
  return {
    date: `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())}`,
    time: `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`,
    dow: d.getUTCDay(),
  };
}

export function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? ':' + two(m) : ''} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}
export function fmtDate(date) {
  if (!date) return '';
  const [y, mo, d] = date.split('-').map(Number);
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return `${DAYS[dow]} ${MONTHS_SHORT[mo - 1]} ${d}`;
}
export const fmtSlot = (s) => (s && s.date ? `${fmtDate(s.date)}${s.time ? ', ' + fmtTime(s.time) : ''}` : 'no date');
export function fmtWhen(ts, tz = DEFAULT_TZ) {
  const p = localParts(ts, tz);
  return `${fmtDate(p.date)}, ${fmtTime(p.time)}`;
}
export function fmtDuration(ms) {
  const neg = ms < 0;
  const mins = Math.round(Math.abs(ms) / 60e3);
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  const txt = d ? `${d}d ${h}h` : h ? `${h}h ${two(m)}m` : `${m}m`;
  return neg ? `${txt} ago` : txt;
}
export const dayPart = (hhmm) => (hhmm < '12:00' ? 'morning' : 'afternoon');
export const addMinutes = (hhmm, mins) => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + mins;
  return `${two(Math.floor(t / 60))}:${two(t % 60)}`;
};
export const minutesOf = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// Office contact hours, from the playbook: { days: "Mon-Fri", start: "09:00", end: "16:00" }.
export function officeOpen(playbook, ts) {
  const ch = playbook.office.contact_hours;
  const p = localParts(ts, playbook.office.tz);
  const weekday = p.dow >= 1 && p.dow <= 5;
  return weekday && p.time >= ch.start && p.time < ch.end;
}
export function nextOpen(playbook, ts) {
  const ch = playbook.office.contact_hours;
  const tz = playbook.office.tz;
  if (officeOpen(playbook, ts)) return ts;
  let p = localParts(ts, tz);
  let day = toTs(p.date, '00:00', tz);
  for (let i = 0; i < 8; i++) {
    const q = localParts(day, tz);
    const open = toTs(q.date, ch.start, tz);
    if (q.dow >= 1 && q.dow <= 5 && open > ts) return open;
    day += 24 * HOUR;
  }
  return ts;
}
// Last moment the office is open at or before a deadline (for "send by" hints).
export function lastOpenBefore(playbook, ts) {
  const ch = playbook.office.contact_hours;
  const tz = playbook.office.tz;
  let day = ts;
  for (let i = 0; i < 8; i++) {
    const q = localParts(day, tz);
    if (q.dow >= 1 && q.dow <= 5) {
      const open = toTs(q.date, ch.start, tz), close = toTs(q.date, ch.end, tz);
      if (ts >= close) return close;
      if (ts >= open) return ts;
    }
    day = toTs(q.date, '00:00', tz) - 1;
    ts = Math.min(ts, day);
  }
  return ts;
}
// Working time. People answer in working hours, so reply windows and urgency are counted in
// them. "24 hours" on a Friday morning is one working afternoon, not a day.
export function workingHoursBetween(playbook, a, b) {
  if (b <= a) return 0;
  const ch = playbook.office.contact_hours, tz = playbook.office.tz;
  let total = 0, day = toTs(localParts(a, tz).date, '00:00', tz);
  for (let i = 0; i < 400 && day < b; i++) {
    const q = localParts(day + 12 * HOUR, tz);
    if (q.dow >= 1 && q.dow <= 5) {
      const open = toTs(q.date, ch.start, tz), close = toTs(q.date, ch.end, tz);
      total += Math.max(0, Math.min(b, close) - Math.max(a, open));
    }
    day += 24 * HOUR;
  }
  return total / HOUR;
}
export function addWorkingHours(playbook, ts, hours) {
  const ch = playbook.office.contact_hours, tz = playbook.office.tz;
  let left = hours * HOUR, t = nextOpen(playbook, ts);
  for (let i = 0; i < 400; i++) {
    const close = toTs(localParts(t, tz).date, ch.end, tz);
    if (t + left <= close) return t + left;
    left -= close - t;
    t = nextOpen(playbook, close);
  }
  return t;
}
// How long to wait for an answer: a third of the working time that is left, at least one working
// hour and at most one working day, so there is always room to ask the next person.
export function replyWindow(playbook, now, bind) {
  const ch = playbook.office.contact_hours;
  const dayHours = (Date.parse(`2030-01-01T${ch.end}:00Z`) - Date.parse(`2030-01-01T${ch.start}:00Z`)) / HOUR;
  const left = workingHoursBetween(playbook, now, bind);
  return addWorkingHours(playbook, now, Math.min(dayHours, Math.max(1, left / 3)));
}
// Push a time out of the night: nobody should get a routine reminder at 2 a.m.
export function afterQuietHours(ts, tz = DEFAULT_TZ, quiet = { start: '21:00', end: '08:00' }) {
  const p = localParts(ts, tz);
  if (p.time < quiet.end) return toTs(p.date, quiet.end, tz);
  if (p.time >= quiet.start) return toTs(localParts(ts + 24 * HOUR, tz).date, quiet.end, tz);
  return ts;
}
export const HOURS = HOUR;
