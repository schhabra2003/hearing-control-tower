// The hearing calendar as an iCalendar file, in UTC.
//
//     node cli/calendar.js                    writes hearings.ics into the current folder, then checks the file it wrote
//     node cli/calendar.js --out <file>       writes it somewhere else
//     node cli/calendar.js --stdout           prints the file and writes nothing
//     node cli/calendar.js --check <file>     checks a file written earlier against the same hearings
//     node cli/calendar.js --help
//
// The events are the hearings that `node cli/sheet.js --dockets` lists: the hearings of the example
// week as the two recorded readers see them (still on, with a date, on or after the example day).
// Every start and end is written in UTC with the letter Z, so a calendar shows the hearing at the
// right hour whatever time zone it is set to. The local time and the office's hours from UTC are
// repeated in the description.
//
// Hours from UTC. Each office's standard offset is read from the packet ("UTC-05:00"). Whether an
// office changes its clocks is not in the packet: the gate sheet asks each office (Offices AU), and
// until an office answers yes the standard offset is used all year, exactly as the sheet does. When
// the answer is yes (--clocks "Larkmere=yes"), one hour is added from the second Sunday of March up
// to the day before the first Sunday of November (the United States rule, by whole days; the
// 2:00 a.m. switch itself is not modelled).
//
// Where (round 18, rule K5 of the sheet): the LOCATION of a hearing in person is "<County> hearing office: " and the
// office's street address, room and place to report as typed in Offices BA (--address "County=..."), or
// "ADDRESS NOT ON RECORD: Offices BA<row>" until the office answers, word for word as the sheet's Calendar tab prints it.
//
// The check is built in and runs after every write: the file is read back with a small parser
// written from RFC 5545 (unfolding, escapes, required properties, line length) and each event's
// UTC start must equal the hearing's local time minus the office's hours from UTC. For an office at
// UTC-05:00 that is the local time plus five hours.
//
// Zero dependencies. Nothing is sent and no calendar is touched. Importing the file into a real
// calendar product was not tried here: no calendar program is installed on this machine. (The file of the same form from
// the gate sheet's "Calendar file" tab was imported into Apple Calendar on 21 November 2026: docs/outside-tests/.)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './load.js';
import { readMailbox, docketHearings } from './sheet.js';

export const HEARING_MINUTES = 30; // Settings B11 of the gate sheet: the length of one hearing, our suggestion

// ---- hours from UTC ------------------------------------------------------------------------------------
/** "UTC-05:00 (fixed for this exercise)" gives -5. Returns null when the text holds no offset. */
export function standardOffset(text) {
  const m = /UTC\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?/i.exec(String(text || ''));
  if (!m) return null;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) + Number(m[3] || 0) / 60);
}
const nthSunday = (year, month, n) => { const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); return 1 + ((7 - first) % 7) + 7 * (n - 1); };
/** Is this date (YYYY-MM-DD) in United States daylight time: second Sunday of March up to the day before the first Sunday of November. */
export function inUsDaylightTime(date) {
  const [y, m, d] = date.split('-').map(Number);
  const key = m * 100 + d;
  return key >= 300 + nthSunday(y, 3, 2) && key < 1100 + nthSunday(y, 11, 1);
}
/** The office's hours from UTC on a date: the standard offset, plus one only when the office has said yes to changing its clocks. */
export function offsetOn(date, standard, changesClocks) {
  if (standard === null || standard === undefined) return null;
  return standard + (String(changesClocks || '').trim().toLowerCase() === 'yes' && inUsDaylightTime(date) ? 1 : 0);
}
const pad = (n, w = 2) => String(n).padStart(w, '0');
const sayOffset = (h) => `UTC${h < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(h)))}:${pad(Math.round((Math.abs(h) % 1) * 60))}`;
/** Local date and time at an office with that many hours from UTC, as a UTC stamp YYYYMMDDTHHMMSSZ. */
export function toUtcStamp(date, time, offsetHours, addMinutes = 0) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi) - offsetHours * 3600000 + addMinutes * 60000);
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00Z`;
}

// ---- the hearings -----------------------------------------------------------------------------------------
/** The hearings of the --dockets list (docketHearings in cli/sheet.js, the one filter both tools use), with the office's offset. */
// addresses: { County: 'street address, room and where to report' }, the office's answer typed in Offices BA (round 18).
export function calendarHearings(out, packet, clocks = {}, addresses = {}) {
  const list = [];
  for (const c of docketHearings(out)) {
    const d = c.schedule;
    const office = packet.counties.find((o) => o.county === c.county) || {};
    const officeRow = packet.counties.indexOf(office) + 2; // the office's row on the Offices tab: the packet's order from row 2
    const standard = standardOffset(office.timezone);
    const answer = clocks[c.county] || 'ASK';
    list.push({ id: c.id, property: c.property, county: c.county, date: d.date, time: d.time || null, mode: d.mode, holder: c.committed ? c.committed.name : null,
      standard, clocks: answer, offset: offsetOn(d.date, standard, answer), officeRow, address: String(addresses[c.county] || '').trim() || null });
  }
  return list.sort((a, b) => `${a.date} ${a.time || ''} ${a.county} ${a.id}`.localeCompare(`${b.date} ${b.time || ''} ${b.county} ${b.id}`));
}

// ---- writing ----------------------------------------------------------------------------------------------
export const escapeText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
export const unescapeText = (s) => String(s).replace(/\\([\\;,nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));
/** One content line folded at 75 octets (RFC 5545 section 3.1): a continuation line starts with one space, and no character is cut in two. */
export function fold(line) {
  const out = [];
  let cur = '', size = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, 'utf8');
    if (size + n > 75) { out.push(cur); cur = ' '; size = 1; }
    cur += ch; size += n;
  }
  out.push(cur);
  return out;
}
const sayTime = (hm) => { const [h, m] = hm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'a.m.' : 'p.m.'}`; };

export function eventOf(h, stamp) {
  const video = h.mode !== 'in_person';
  const who = h.holder || 'OPEN, nobody yet';
  const summary = `${who}: ${h.county} hearing, ${h.property} (${h.id})${video ? ' by video' : ''}`;
  // Round 18 (K5): an in-person hearing carries the office's street address, room and where to report, as the sheet's
  // Calendar tab prints it (column H), or ADDRESS NOT ON RECORD and the cell, until the office answers.
  const location = video ? `${h.county} board, by video` : `${h.county} hearing office: ${h.address || `ADDRESS NOT ON RECORD: Offices BA${h.officeRow > 1 ? h.officeRow : ''}`}`;
  const zone = h.offset === null
    ? 'The packet gives no hours from UTC for this office, so the time is the office\'s local time as written.'
    : `Times are ${h.county} office time (${sayOffset(h.offset)}${h.clocks === 'yes' ? ', the office changes its clocks' : ''}).${h.time ? ` Local start ${sayTime(h.time)}` : ''}`;
  const description = `Case ${h.id}, ${h.property}. ${zone} This calendar is rebuilt from the readers' list: an edit here moves nothing. Only the county moves a hearing, in writing.`;
  const day = h.date.replace(/-/g, '');
  const lines = ['BEGIN:VEVENT', `UID:${h.id}-${day}@firm.example`, `DTSTAMP:${stamp}`];
  if (!h.time) {
    const next = new Date(Date.UTC(...h.date.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0))) + 86400000);
    lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`);
  } else if (h.offset === null) {
    lines.push(`DTSTART:${day}T${h.time.replace(':', '')}00`, `DTEND:${toUtcStamp(h.date, h.time, 0, HEARING_MINUTES).replace(/Z$/, '')}`);
  } else {
    lines.push(`DTSTART:${toUtcStamp(h.date, h.time, h.offset)}`, `DTEND:${toUtcStamp(h.date, h.time, h.offset, HEARING_MINUTES)}`);
  }
  lines.push(`SUMMARY:${escapeText(summary)}`, `LOCATION:${escapeText(location)}`, `DESCRIPTION:${escapeText(description)}`, 'END:VEVENT');
  return { lines, summary, location, description };
}

/** The whole file as text, with CRLF line ends and folded lines. now: an ISO time for DTSTAMP. */
export function buildIcs(hearings, now) {
  const t = new Date(now);
  const stamp = `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}${pad(t.getUTCSeconds())}Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hearing coordination prototype//Hearing calendar//EN', 'CALSCALE:GREGORIAN'];
  for (const h of hearings) lines.push(...eventOf(h, stamp).lines);
  lines.push('END:VCALENDAR');
  return lines.flatMap(fold).join('\r\n') + '\r\n';
}

// ---- reading it back ----------------------------------------------------------------------------------------
/** A small parser from RFC 5545. Returns { problems: string[], events: [{ props: {NAME: {params, value}} }], longest }. */
export function parseIcs(text) {
  const problems = [];
  if (!text.endsWith('\r\n')) problems.push('the file does not end with CRLF');
  const raw = text.split('\r\n');
  if (raw[raw.length - 1] === '') raw.pop();
  let longest = 0;
  raw.forEach((l, i) => {
    if (/[\r\n]/.test(l)) problems.push(`line ${i + 1} holds a bare CR or LF`);
    const n = Buffer.byteLength(l, 'utf8');
    if (n > longest) longest = n;
    if (n > 75) problems.push(`line ${i + 1} has ${n} octets, more than 75`);
  });
  const lines = [];
  for (const l of raw) {
    if (/^[ \t]/.test(l)) { if (!lines.length) problems.push('the file starts with a continuation line'); else lines[lines.length - 1] += l.slice(1); } else lines.push(l);
  }
  const parsed = lines.map((l, i) => {
    const m = /^([A-Za-z0-9-]+)((?:;[A-Za-z0-9-]+=(?:"[^"]*"|[^;:,"]*)(?:,(?:"[^"]*"|[^;:,"]*))*)*):(.*)$/.exec(l);
    if (!m) { problems.push(`content line ${i + 1} is not NAME[;PARAM=value]:value: ${l.slice(0, 40)}`); return null; }
    return { name: m[1].toUpperCase(), params: m[2], value: m[3] };
  }).filter(Boolean);
  if (!parsed.length || parsed[0].name !== 'BEGIN' || parsed[0].value !== 'VCALENDAR') problems.push('the first line is not BEGIN:VCALENDAR');
  if (!parsed.length || parsed[parsed.length - 1].name !== 'END' || parsed[parsed.length - 1].value !== 'VCALENDAR') problems.push('the last line is not END:VCALENDAR');
  const events = [];
  const top = {};
  let cur = null;
  for (const p of parsed.slice(1, -1)) {
    if (p.name === 'BEGIN') { if (p.value !== 'VEVENT' || cur) problems.push(`unexpected BEGIN:${p.value}`); cur = { props: {} }; continue; }
    if (p.name === 'END') { if (p.value !== 'VEVENT' || !cur) problems.push(`unexpected END:${p.value}`); else events.push(cur); cur = null; continue; }
    const bag = cur ? cur.props : top;
    if (bag[p.name]) problems.push(`${p.name} appears twice${cur ? ' in one event' : ''}`);
    bag[p.name] = { params: p.params, value: p.value };
  }
  if (cur) problems.push('an event is not closed');
  if (!top.VERSION || top.VERSION.value !== '2.0') problems.push('VERSION:2.0 is missing');
  if (!top.PRODID || !top.PRODID.value) problems.push('PRODID is missing');
  const uids = new Set();
  events.forEach((e, i) => {
    const p = e.props;
    for (const need of ['UID', 'DTSTAMP', 'DTSTART', 'DTEND', 'SUMMARY']) if (!p[need]) problems.push(`event ${i + 1} has no ${need}`);
    if (p.UID) { if (uids.has(p.UID.value)) problems.push(`the UID ${p.UID.value} appears twice`); uids.add(p.UID.value); }
    if (p.DTSTAMP && !/^\d{8}T\d{6}Z$/.test(p.DTSTAMP.value)) problems.push(`event ${i + 1}: DTSTAMP is not a UTC time`);
    for (const k of ['SUMMARY', 'LOCATION', 'DESCRIPTION']) if (p[k] && /(^|[^\\])(?:\\\\)*[;,]/.test(p[k].value)) problems.push(`event ${i + 1}: ${k} holds a comma or a semicolon that is not escaped`);
    if (p.DTSTART && p.DTEND && !/VALUE=DATE/.test(p.DTSTART.params) && p.DTEND.value <= p.DTSTART.value) problems.push(`event ${i + 1}: DTEND is not after DTSTART`);
  });
  return { problems, events, longest, lines: raw.length };
}

/** Checks a file against the hearings it should hold. Returns { ok, problems, events, timed, longest, lines }. */
export function checkIcs(text, hearings) {
  const r = parseIcs(text);
  const problems = [...r.problems];
  if (r.events.length !== hearings.length) problems.push(`${r.events.length} events for ${hearings.length} hearings`);
  let timed = 0;
  for (const h of hearings) {
    const day = h.date.replace(/-/g, '');
    const e = r.events.find((x) => x.props.UID && x.props.UID.value === `${h.id}-${day}@firm.example`);
    if (!e) { problems.push(`${h.id} has no event`); continue; }
    const want = eventOf(h, '');
    for (const [k, v] of [['SUMMARY', want.summary], ['LOCATION', want.location], ['DESCRIPTION', want.description]]) {
      if (!e.props[k] || unescapeText(e.props[k].value) !== v) problems.push(`${h.id}: ${k} does not read back as it was written`);
    }
    if (!h.time || h.offset === null) continue;
    timed += 1;
    const s = e.props.DTSTART ? e.props.DTSTART.value : '', en = e.props.DTEND ? e.props.DTEND.value : '';
    if (!/^\d{8}T\d{6}Z$/.test(s) || !/^\d{8}T\d{6}Z$/.test(en)) { problems.push(`${h.id}: DTSTART or DTEND is not a UTC time with Z`); continue; }
    // Independent of toUtcStamp: turn the stamp back into minutes and compare with the local time minus the offset.
    const utc = Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)), Number(s.slice(9, 11)), Number(s.slice(11, 13)));
    const [y, mo, d] = h.date.split('-').map(Number), [hh, mi] = h.time.split(':').map(Number);
    const local = Date.UTC(y, mo - 1, d, hh, mi);
    if ((utc - local) / 3600000 !== -h.offset) problems.push(`${h.id}: the UTC start ${s} is not the local time ${h.date} ${h.time} minus ${h.offset} hours`);
    const end = Date.UTC(Number(en.slice(0, 4)), Number(en.slice(4, 6)) - 1, Number(en.slice(6, 8)), Number(en.slice(9, 11)), Number(en.slice(11, 13)));
    if ((end - utc) / 60000 !== HEARING_MINUTES) problems.push(`${h.id}: the event is not ${HEARING_MINUTES} minutes long`);
  }
  return { ok: problems.length === 0, problems, events: r.events.length, timed, longest: r.longest, lines: r.lines };
}

// ---- command line -------------------------------------------------------------------------------------------
const HELP = `The hearing calendar as an iCalendar file, in UTC.

  node cli/calendar.js [--out <file>] [--stdout] [--check <file>] [--clocks "County=yes,County=no"]
                      [--address "County=street address, room and where to report"] (repeat for each office)

Without options it writes hearings.ics into the current folder and then checks the file it wrote.
The events are the hearings that node cli/sheet.js --dockets lists. Every start and end is in UTC
(the letter Z), so a calendar shows each hearing at the right hour whatever zone it is set to.
The check reads the file back with a parser written from RFC 5545 and compares each UTC start with
the local time and the office's hours from UTC.
--clocks sets an office's answer to "Does this office change its clocks?" (Offices AU on the gate
sheet). Without it every office is ASK, and its standard hours from UTC are used all year.
--address gives an office's answer to the address question (Offices BA on the gate sheet). Without it
the LOCATION of a hearing in person reads ADDRESS NOT ON RECORD and names the cell, as the sheet's
Calendar tab does; the packet gives no street address for any office.
Nothing is sent. The file this command writes was not imported into a calendar product here. The file of the same
form from the gate sheet's "Calendar file" tab was imported into Apple Calendar on 21 November 2026 with no error.`;

function parseClocks(text) {
  const out = {};
  for (const part of String(text || '').split(',').map((s) => s.trim()).filter(Boolean)) { const [k, v] = part.split('='); if (k && v) out[k.trim()] = v.trim().toLowerCase(); }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const VALUE = ['--out', '--check', '--clocks', '--address'];
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const unknown = args.filter((a, i) => a.startsWith('--') ? ![...VALUE, '--stdout', '--help'].includes(a) : !VALUE.includes(args[i - 1]));
  if (args.includes('--help')) { console.log(HELP); process.exit(0); }
  if (unknown.length || VALUE.some((v) => args.includes(v) && (opt(v) === undefined || opt(v) === null || String(opt(v)).startsWith('--')))) { console.error(`Unknown or incomplete option${unknown.length ? ` ${unknown.join(', ')}` : ''}.\n\n${HELP}`); process.exit(2); }
  const data = loadAll();
  const out = readMailbox(data.messages, data);
  const addresses = {};
  args.forEach((a, i) => { if (a === '--address' && args[i + 1]) { const t = args[i + 1]; const k = t.indexOf('='); if (k > 0) addresses[t.slice(0, k).trim()] = t.slice(k + 1).trim(); } });
  const hearings = calendarHearings(out, data.packet, parseClocks(opt('--clocks')), addresses);
  const report = (file, text) => {
    const r = checkIcs(text, hearings);
    const zones = [...new Set(hearings.map((h) => (h.offset === null ? 'no offset' : sayOffset(h.offset))))];
    console.log(`Checked ${file}: ${r.events} events for ${hearings.length} hearings, ${r.lines} lines, the longest ${r.longest} octets (limit 75).`);
    for (const p of r.problems) console.log(`  PROBLEM: ${p}`);
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: every event ${r.ok ? 'parses' : 'must parse'}, and the UTC start of ${r.timed} of ${r.timed} timed events ${r.ok ? 'equals' : 'must equal'} the local time minus the office's hours from UTC (${zones.join(', ')}; for UTC-05:00 that is local time plus 5 hours).`);
    return r.ok;
  };
  if (opt('--check')) {
    const f = path.resolve(opt('--check'));
    if (!fs.existsSync(f)) { console.error(`There is no file at ${f}.`); process.exit(2); }
    process.exit(report(opt('--check'), fs.readFileSync(f, 'utf8')) ? 0 : 1);
  }
  const text = buildIcs(hearings, out.now);
  if (args.includes('--stdout')) { process.stdout.write(text); process.exit(0); }
  const file = path.resolve(opt('--out') || 'hearings.ics');
  fs.writeFileSync(file, text);
  const asked = hearings.filter((h) => h.clocks !== 'yes' && h.clocks !== 'no');
  console.log(`Wrote ${opt('--out') || 'hearings.ics'}: ${hearings.length} hearings, the ones node cli/sheet.js --dockets lists (${hearings.filter((h) => h.holder).length} held, ${hearings.filter((h) => !h.holder).length} open). Nothing sent, no calendar touched.`);
  console.log(`Times are in UTC. ${asked.length ? `For ${new Set(asked.map((h) => h.county)).size} of ${new Set(hearings.map((h) => h.county)).size} offices the packet does not say whether the office changes its clocks, so the standard hours from UTC are used all year, as on the gate sheet (Offices AU: ASK).` : 'Every office has answered whether it changes its clocks.'}`);
  const noAddress = hearings.filter((h) => h.mode === 'in_person' && !h.address);
  console.log(`Hearings in person: ${hearings.filter((h) => h.mode === 'in_person').length}. ${noAddress.length ? `For ${noAddress.length} of them (${[...new Set(noAddress.map((h) => h.county))].join(', ')}) the office's street address, room and place to report are not on record, so LOCATION reads ADDRESS NOT ON RECORD and names the cell of Offices BA, as the gate sheet does. Give an answer with --address "County=...".` : 'Every office that hears in person has its address on record.'}`);
  const ok = report(opt('--out') || 'hearings.ics', fs.readFileSync(file, 'utf8'));
  console.log('This file was not imported into a calendar product: no calendar program is installed here. The file of the same form that the gate sheet prints on its "Calendar file" tab (17 events) was imported into Apple Calendar on 21 November 2026 with no error; Google Calendar and Outlook were not tried.');
  process.exit(ok ? 0 : 1);
}
