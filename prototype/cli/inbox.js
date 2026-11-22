'use strict';
// The inbox connector, on exported files.
//
//     node cli/inbox.js                         reads the example folder data/inbox-example/
//     node cli/inbox.js <folder>                reads every .eml file and every text-line .json file in a folder
//     node cli/inbox.js <folder> --json out.json --csv out.csv
//     node cli/inbox.js --autofile              marks reader proposals that both readers agree on and the verifier passes as "files itself"
//     node cli/inbox.js --rows hearings.csv     an export of Hearings columns A and B, to find the sheet row of each case
//     node cli/inbox.js --help
//
// It runs three things over the folder and writes ONE list of proposed filings:
//   1. the reply rule (src/replies.js): fixed forms such as YES 1 3, GOT IT, OK, matched to the
//      numbered message they answer (listed in sent.json in the folder);
//   2. the office rule (src/office_rule.js, when the file exists): an office's message sorted by
//      fixed code, with the cells a person should type;
//   3. the two AI readers, from their RECORDED answers (data/recorded_reads.json). No model is
//      called. A message without a recorded answer is handed to a person.
// Each line of the list has the tab, the row, the column, the value, the link, who proposed it,
// and "files itself" or "for a person". It sends nothing and writes to no sheet.
//
// Round 17 (K2): a repeat is not a fresh proposal. When a message of an office states for a cell
// nothing that an earlier message of the folder already stated, the connector prints
// "REPEAT of message n: no cell changes" and proposes nothing for that cell. A later receipt that
// names the case-file version when the first did not is NOT a repeat: it stays a proposal, and
// the version is proposed for Hearings AZ. A consultant's question is proposed for Hearings BN.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EXAMPLE = path.join(ROOT, 'data/inbox-example');

const HELP = `The inbox connector reads a folder of exported messages and writes one list of proposed filings.

  node cli/inbox.js [folder] [--json out.json] [--csv out.csv] [--autofile] [--rows hearings.csv]

Without a folder it reads the example folder data/inbox-example/, which holds 13 emails and 2 texts
from the case packet.

What it reads.
  *.eml        One email each, as a mail program exports it. The sender is taken from the From
               line and the hearings from the addresses named in the Subject line or the text.
  *.json       One incoming text each, as a text line's webhook delivers it: who it is from, the
               text, the time, and the number of the message it answers when the line knows it.
  sent.json    Optional. The numbered messages the firm sent (offer, day-before text, case files,
               change), so that a reply such as YES 1 3 can be matched to its docket.
  hearings-rows.csv   Optional. An export of Hearings columns A and B, to name the row of each case.

What it runs. The reply rule, the office rule and the two AI readers from their recorded answers.
No model is called and no key is needed. A message that has no recorded answer is not read by a
model here: it is handed to a person, and the output says so.

What it writes. One list. Each line has the tab, the row, the column, the value, the link, who
proposed it, and "files itself" or "for a person".
  A reply in a fixed form that the reply rule accepts files itself.
  Everything the office rule proposes is for a person. On 30 unseen office messages that rule
  sorted 13 right and handed 24 to a person, so its proposals are suggestions, never filings.
  A proposal of the AI readers is for a person unless you pass --autofile. With --autofile, a
  proposal that both readers agree on and the verifier passes is marked "files itself". Auto-file
  is OFF this season. The condition for switching it on is the sheet's own sentence (Reader
  suggestions A168): at the live-week-4 review, for one kind of proposal, only if the Friday
  sample found no wrong link of that kind in four weeks running. The firm's two-week log is the
  measurement that feeds that review. The numbers measured so far are in eval/autofile.json.
  A process change at an office is listed as HOLD and is always for a person. HOLD is a block:
  NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY. A person reads the
  change and types their name in Offices AQ and the date in Offices AR; the connector never
  proposes those two cells. After the approval the new route is the route, and the old route
  is a second route only while the office still accepts it (Offices AS: yes or not known).
  A repeat is not a proposal. When an office says again what an earlier message of the folder
  already said for a cell, the list prints REPEAT of message n: no cell changes, and nothing is
  typed: the cell keeps its first link. A later message replaces the first link only when it
  states something the cell needs that the first did not. The one case the code knows is the
  case-file version: "we have the current packets" after "both packets received" is not a
  repeat, so the link stays a proposal for Hearings L and the version is proposed for AZ.
  A consultant's question is proposed for Hearings BN, so that the sheet prints TELL until the
  answer is linked in BO.
  An office that cannot find our notice is proposed for Hearings CP, with the resend and the
  call as a task in Y and AA. A consultant who reports ill is proposed as a new row of the
  Availability tab with the reason illness, and the line names the hearings that consultant
  holds in the following 7 days, to be asked about the same day.
Nothing is sent and no sheet is changed: the list is for a person, or for a later step that
writes to the sheet.

What is not built. This command works on exported files. The live hookup to the firm's shared
mailbox and to its text line needs the firm's own accounts, which the case packet does not
describe. Two questions to ask the firm before it can be built:
  1. Which mail service holds the shared hearing mailbox, and who at the firm can give read-only
     access to it, or set a rule that saves each incoming message as an .eml file in a folder?
  2. Which service runs the text line that consultants answer, can it deliver each incoming text
     to a web address or export the texts as files, and which number does each consultant text from?`;

// ---- reading the files ---------------------------------------------------------------------------------
function decodeBody(text, encoding) {
  const e = String(encoding || '').toLowerCase().trim();
  if (e === 'base64') return Buffer.from(text.replace(/\s+/g, ''), 'base64').toString('utf8');
  if (e === 'quoted-printable') {
    const bytes = [];
    const s = text.replace(/=\r?\n/g, '');
    for (let i = 0; i < s.length; i += 1) {
      if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) { bytes.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; } else bytes.push(...Buffer.from(s[i], 'utf8'));
    }
    return Buffer.from(bytes).toString('utf8');
  }
  return text;
}
// A header value with encoded words (=?UTF-8?B?...?= or =?UTF-8?Q?...?=) as plain text.
const decodeWords = (v) => String(v || '').replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, cs, kind, data) => (kind.toUpperCase() === 'B' ? Buffer.from(data, 'base64').toString('utf8') : decodeBody(data.replace(/_/g, ' '), 'quoted-printable')));

function splitHeaders(text) {
  const at = text.search(/\r?\n\r?\n/);
  const head = at < 0 ? text : text.slice(0, at), body = at < 0 ? '' : text.slice(at).replace(/^\r?\n\r?\n/, '');
  const headers = {};
  for (const line of head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const m = /^([A-Za-z0-9-]+):\s*(.*)$/.exec(line);
    if (m && headers[m[1].toLowerCase()] === undefined) headers[m[1].toLowerCase()] = m[2].trim();
  }
  return { headers, body };
}

// One .eml file as { from, address, subject, at, body, messageId }. A multipart message gives its first text/plain part.
function parseEml(text) {
  let { headers, body } = splitHeaders(text);
  const top = headers;
  const boundary = /boundary="?([^";]+)"?/i.exec(headers['content-type'] || '');
  if (boundary) {
    const parts = body.split(`--${boundary[1]}`).slice(1).filter((p) => !p.startsWith('--')).map((p) => splitHeaders(p.replace(/^\r?\n/, '')));
    const plain = parts.find((p) => /text\/plain/i.test(p.headers['content-type'] || 'text/plain')) || parts[0];
    if (plain) ({ headers, body } = { headers: { ...plain.headers }, body: plain.body });
  }
  body = decodeBody(body, headers['content-transfer-encoding']).replace(/\r\n/g, '\n').trim();
  const from = decodeWords(top.from || '');
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]*)>\s*$/.exec(from);
  const when = top.date ? new Date(top.date) : null;
  return {
    from: (m ? m[1] : from).trim(), address: m && m[2].trim() ? m[2].trim() : null, subject: decodeWords(top.subject || ''),
    at: when && !Number.isNaN(when.getTime()) ? when.toISOString() : null, body, messageId: (top['message-id'] || '').replace(/^<|>$/g, '') || null,
  };
}

// One text-line webhook file. The field names of text services differ, so the common ones are accepted.
function parseText(text) {
  const j = JSON.parse(text);
  const m = j.message && typeof j.message === 'object' ? { ...j, ...j.message } : j;
  const from = m.from && typeof m.from === 'object' ? m.from : { name: m.from_name || m.contact || null, number: typeof m.from === 'string' ? m.from : m.From || null };
  const when = new Date(m.received_at || m.timestamp || m.date || m.DateSent || '');
  return {
    from: from.name || null, number: from.number || null, body: String(m.text ?? m.body ?? m.Body ?? '').trim(),
    at: Number.isNaN(when.getTime()) ? null : when.toISOString(), inReplyTo: m.in_reply_to || m.inReplyTo || null, messageId: m.id || m.MessageSid || null,
  };
}

function csvRows(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ---- the cells the reply rule fills -----------------------------------------------------------------------
// Column letters and headers of the gate sheet's Hearings tab, word for word as row 1 of the installed
// sheet has them (compared with a dump of the sheet (working notes, not published) on 20 Nov 2026; cli/check.js R15D-HEADERS
// keeps them fixed). BW and BX are the round-15 columns that name whose GOT IT and whose day-before YES
// a link is.
const REPLY_CELLS = {
  'fill the YES proof': [['J', 'G2 Consultant\'s own yes for this slot', 'link'], ['H', 'Consultant', 'name']],
  'declined: offer the docket to the next person': [['BC', 'Declined by (names)', 'add name']],
  'fill the day-before YES': [['Q', 'Day-before YES (video or phone: with the link or number)', 'link'], ['BX', 'Day-before YES is from (type the name with the link in Q)', 'name']],
  'type the arrival time': [['R', 'Arrived or joined (time)', 'time']],
  'record the files received': [['M', 'G4 Consultant has the packet', 'link'], ['AY', 'Case files: version the consultant confirmed (GOT IT)', 'version'], ['BW', "GOT IT is from (type the consultant's name with the link in M)", 'name']],
  'record that the consultant has the change': [['BO', 'Told, or they already have it: link to their own message or their OK', 'link']],
};

// ---- the run ---------------------------------------------------------------------------------------------
// opts: { autofile: boolean, rowsFile: path or null }. Returns the whole result; writes nothing.
async function runInbox(folder = EXAMPLE, opts = {}) {
  const { loadAll } = await import('./load.js');
  const sheet = await import('./sheet.js');
  const { matchReply } = await import('../src/replies.js');
  const { bodyHash } = await import('../src/extract/recorded.js');
  const { buildDirectory, senderRole } = await import('../src/resolve.js');
  let officeRule = null;
  try { officeRule = require('../src/office_rule.js'); } catch { officeRule = null; }

  const data = loadAll();
  const dir = buildDirectory(data.packet);
  const records = data.readJson('data/recorded_reads.json');
  const recordedId = new Map(records.sets.primary.reads.map((r) => [r.body_hash, r.id]));
  const rel = (f) => path.relative(ROOT, path.join(folder, f)).split(path.sep).join('/');
  const propertiesIn = (text) => dir.cases.filter((c) => String(text || '').includes(c.property) || String(text || '').includes(c.case_id)).map((c) => c.property);

  // The numbered messages the firm sent, newest last.
  const sentFile = path.join(folder, 'sent.json');
  const sent = fs.existsSync(sentFile) ? (JSON.parse(fs.readFileSync(sentFile, 'utf8')).sent || []) : [];
  // The sheet row of each case, when an export of Hearings columns A and B is at hand.
  const rowsFile = opts.rowsFile || (fs.existsSync(path.join(folder, 'hearings-rows.csv')) ? path.join(folder, 'hearings-rows.csv') : null);
  const rowOf = new Map();
  if (rowsFile) csvRows(fs.readFileSync(rowsFile, 'utf8')).forEach((r, i) => { if (/^[A-Z]+-\d+$/.test((r[0] || '').trim())) rowOf.set(r[0].trim(), /^\d+$/.test((r[2] || '').trim()) ? Number(r[2]) : i + 1); });
  const caseOf = (property) => dir.cases.find((c) => c.property === property);
  const place = (caseId) => ({ case: caseId, property: dir.caseById[caseId] ? dir.caseById[caseId].property : '', row: rowOf.has(caseId) ? rowOf.get(caseId) : null });

  // 1. Every file as one message.
  const names = fs.readdirSync(folder).filter((f) => /\.(eml|json)$/i.test(f) && f !== 'sent.json').sort();
  const items = [], unreadable = [];
  for (const f of names) {
    try {
      const text = fs.readFileSync(path.join(folder, f), 'utf8');
      if (/\.eml$/i.test(f)) {
        const e = parseEml(text);
        if (!e.body || !e.at) throw new Error(!e.body ? 'the email has no text' : 'the email has no readable Date line');
        const props = propertiesIn(e.subject);
        items.push({ file: f, kind: 'email', link: rel(f), sent: null, raw: { at: e.at, sender: e.from, address: e.address, channel: 'email', properties: props, body: e.body } });
      } else {
        const t = parseText(text);
        if (!t.body || !t.at || !t.from) throw new Error(!t.body ? 'the text is empty' : !t.at ? 'the text has no time' : 'the text names no sender the roster knows');
        const answers = sent.find((s) => t.inReplyTo && s.id === t.inReplyTo) || [...sent].reverse().find((s) => s.to === t.from && (!s.at || Date.parse(s.at) <= Date.parse(t.at))) || null;
        items.push({ file: f, kind: 'text', link: rel(f), sent: answers, raw: { at: t.at, sender: t.from, address: null, channel: 'text', properties: answers ? (answers.hearings || []) : [], body: t.body } });
      }
    } catch (e) { unreadable.push({ file: f, why: e && e.message ? e.message : String(e) }); }
  }
  items.sort((a, b) => Date.parse(a.raw.at) - Date.parse(b.raw.at) || a.file.localeCompare(b.file));
  for (const it of items) {
    const id = recordedId.get(bodyHash(it.raw.body));
    it.recorded = id !== undefined;
    it.raw.id = it.recorded ? (/^\d+$/.test(id) ? Number(id) : id) : it.file;
    it.who = senderRole(dir, it.raw.sender, it.raw.address);
    // An email from a consultant may also answer a numbered message.
    if (it.kind === 'email' && it.who.role === 'consultant') it.sent = [...sent].reverse().find((s) => s.to === dir.consultantById[it.who.consultant].name && s.channel === 'email' && (!s.at || Date.parse(s.at) <= Date.parse(it.raw.at))) || null;
  }
  const byMsg = new Map(items.map((it) => [it.raw.id, it]));

  const filings = [], forPerson = [], holds = [];
  const person = (it, by, why) => { let e = forPerson.find((x) => x.file === it.file); if (!e) { e = { file: it.file, link: it.link, from: it.raw.sender, why: [] }; forPerson.push(e); } const line = `${by}: ${why}`; if (!e.why.includes(line)) e.why.push(line); };
  const add = (f) => {
    const same = filings.find((x) => x.tab === f.tab && x.column === f.column && x.case === f.case && x.link === f.link && String(x.value) === String(f.value));
    if (!same) { filings.push(f); return; }
    if (!same.proposedBy.includes(f.proposedBy)) same.proposedBy += `; ${f.proposedBy}`;
    if (f.files === 'files itself') same.files = 'files itself';
    if (f.note && !String(same.note || '').includes(f.note)) same.note = [same.note, f.note].filter(Boolean).join(' ');
  };

  // 2. The reply rule, on every message that answers a numbered message.
  const taken = new Map();                                // sent id -> numbers that already have a yes
  let replyChecked = 0, replyFiled = 0;
  for (const it of items) {
    if (it.who.role !== 'consultant') continue;
    const name = dir.consultantById[it.who.consultant].name;
    if (!it.sent) { if (it.kind === 'text') person(it, 'The reply rule', 'no numbered message to this sender is on record in sent.json, so the fixed forms cannot be matched'); continue; }
    replyChecked += 1;
    const s = it.sent;
    const key = s.docket || s.id;
    const out = matchReply({ kind: s.kind, to: s.to, open: s.open, held: s.held, dockets: s.dockets, version: s.version, format: s.format }, { from: name, text: it.raw.body, channel: it.kind === 'email' ? 'email' : 'text' }, s.kind === 'offer' ? (taken.get(key) || []) : [], s.kind === 'offer' && s.day ? s.day : null);
    it.reply = { answers: s.id, kind: s.kind, byRule: out.byRule, action: out.action, numbers: out.numbers, why: out.why, capChecked: !!(s.kind === 'offer' && s.day) };
    if (!out.byRule) { person(it, 'The reply rule', `${out.why} (it answers the ${s.kind.replace('_', '-')} message ${s.id}${s.docket ? `, ${s.docket}` : ''})`); continue; }
    replyFiled += 1;
    if (s.kind === 'offer' && out.numbers.length) taken.set(key, [...(taken.get(key) || []), ...out.numbers]);
    const cells = REPLY_CELLS[out.action] || [];
    const numbers = out.numbers.length ? out.numbers : (out.action.startsWith('declined') ? (s.open || []) : []);
    const capNote = s.kind === 'offer' ? (s.day ? '' : ' The daily cap was not checked, because sent.json gives no numbers for that day.') : '';
    if (!cells.length) filings.push({ tab: 'Dockets', row: null, case: null, property: null, column: null, header: null, value: out.action, link: it.link, proposedBy: 'the reply rule (fixed code)', files: 'files itself', note: `${out.why}. No cell on the Hearings tab: the docket stays as it is.`, message: it.raw.id, file: it.file });
    for (const n of numbers) {
      const c = caseOf((s.hearings || [])[n - 1]);
      for (const [column, header, what] of cells) {
        const value = what === 'link' ? it.link : what === 'name' ? name : what === 'add name' ? `add ${name}` : what === 'version' ? out.version : new Date(it.raw.at).toISOString();
        add({ tab: 'Hearings', ...(c ? place(c.case_id) : { case: null, property: (s.hearings || [])[n - 1] || `hearing ${n} of ${s.docket || s.id}`, row: null }), column, header, value, link: it.link, proposedBy: 'the reply rule (fixed code)', files: 'files itself', note: `${out.why}.${capNote}`, message: it.raw.id, file: it.file });
      }
    }
  }

  // 3. The recorded readers, the verifier and the process-change detector, as cli/sheet.js runs them.
  const read = sheet.readMailbox(items.map((it) => it.raw), data, { noFallback: true });
  for (const p of [...read.proposals.filter((x) => x.proposal === 'close'), ...read.halfProofs]) {
    const it = byMsg.get(p.message);
    if (!it) continue;
    const self = !!opts.autofile && p.agreedAndVerified;
    add({ tab: p.cell.tab, ...place(p.case), column: p.cell.column, header: p.cell.header, value: it.link, link: it.link, proposedBy: 'the two AI readers (recorded answers)',
      files: self ? 'files itself' : 'for a person',
      note: `${p.agreedAndVerified ? 'Both readers agree and the verifier passes it.' : 'The readers do not both agree, or the verifier does not pass it.'} Words: "${p.gateQuote || p.quote}"${p.half ? ' This is one half of G4; the gate stays open.' : ''}`, message: it.raw.id, file: it.file });
  }
  for (const t of read.toPerson) { const it = byMsg.get(t.message); if (it) for (const why of t.why) person(it, 'The AI readers', why); }
  // 3b. An illness report (round 16, rule X17): a new row of the Availability tab, by fixed code, always for a person.
  for (const p of (read.newCellProposals || []).filter((x) => x.rule === 'X17')) {
    const it = byMsg.get(p.message);
    if (!it) continue;
    add({ tab: 'Availability', row: 'new', case: null, property: p.consultant, column: p.column, header: p.header, value: p.value, link: it.link, proposedBy: 'the illness check (fixed code)', files: 'for a person', note: p.why, message: it.raw.id, file: it.file });
    if (p.column === 'I') person(it, 'The illness check', p.why);
  }
  for (const it of items) if (!it.recorded) person(it, 'The AI readers', 'there is no recorded answer for this message and no model is called here, so the readers did not read it');

  // 4. The office rule, on every message from an office. Its proposals are suggestions for a person.
  // Round 17 (K2): each message is compared with the earlier messages of the same office in the folder.
  // What it repeats is listed as a repeat and is not proposed again.
  let officeChecked = 0;
  const repeats = [];
  const said = new Map();                                 // county -> [{ message, text, proposals }], oldest first
  const namedIn = (p) => (p.tab === 'Hearings' ? [...new Set((String(p.appliesTo || '').match(/[A-Z]+-\d+/g) || []).concat(dir.cases.filter((c) => String(p.appliesTo || '').includes(c.property.split(',')[0])).map((c) => c.case_id)))] : []);
  const rowKeys = (p) => { const n = namedIn(p); return n.length ? n : [String(p.appliesTo || '')]; };
  for (const it of items) {
    if (!officeRule || it.who.role !== 'government') continue;
    officeChecked += 1;
    const ids = it.raw.properties.map((p) => caseOf(p)).filter(Boolean).map((c) => c.case_id);
    const r = officeRule.classifyOfficeReply(it.raw.body, { county: it.who.county, caseIds: ids, consultants: dir.consultants.map((c) => c.name), channel: it.raw.channel });
    it.office = { kind: r.kind, hold: !!r.hold, forPerson: !!r.forPerson };
    if (r.hold) holds.push({ county: it.who.county, file: it.file, link: it.link, why: r.reason });
    if (r.forPerson) person(it, 'The office rule', r.reason);
    const before = said.get(it.who.county) || [];
    const marked = officeRule.markRepeats({ message: it.raw.id, text: it.raw.body, proposals: r.proposals || [] }, before, rowKeys);
    said.set(it.who.county, [...before, { message: it.raw.id, text: it.raw.body, proposals: r.proposals || [] }]);
    for (const p of marked) {
      const value = p.value === 'the link to this message' ? it.link : String(p.value).replace(/the link to this message/g, it.link);
      const named = namedIn(p);
      const targets = named.length ? named.map(place) : [{ case: null, property: p.appliesTo || null, row: null }];
      if (p.repeatOf !== undefined) {
        targets.forEach((t, i) => repeats.push({ tab: p.tab, ...t, column: p.column, header: p.header, repeatOf: (p.repeatOfByRow || [])[i] !== undefined && named.length === (p.repeatOfByRow || []).length ? p.repeatOfByRow[i] : p.repeatOf, message: it.raw.id, file: it.file, link: it.link, foundBy: 'the office rule (fixed code)' }));
        continue;
      }
      const extra = p.firstLink !== undefined ? ` ${p.notARepeatText}: this link replaces the first one${p.alsoType ? `, and the version goes in ${p.alsoType.tab} ${p.alsoType.column}` : ''}.` : '';
      for (const t of targets) {
        add({ tab: p.tab, ...t, column: p.column, header: p.header, value, link: it.link, proposedBy: 'the office rule (fixed code)', files: 'for a person', note: `${r.hold ? `HOLD: ${officeRule.BLOCK}. The approval is typed by a person in Offices AQ and AR. ` : ''}${p.why}${extra}`, message: it.raw.id, file: it.file, ...(p.firstLink !== undefined ? { firstLink: p.firstLink, adds: p.adds } : {}) });
        if (p.alsoType) add({ tab: p.alsoType.tab, ...t, column: p.alsoType.column, header: p.alsoType.header, value: p.alsoType.value, link: it.link, proposedBy: 'the office rule (fixed code)', files: 'for a person', note: `Message ${p.firstLink} named no version, so this cell could not be filled from it. This message names it.`, message: it.raw.id, file: it.file, firstLink: p.firstLink, adds: p.adds });
      }
    }
  }
  // 4b. The readers' own repeats (cli/sheet.js, repeatProposals): what both readers read in a message that an earlier link already proves.
  for (const p of (read.repeatProposals || []).filter((x) => x.repeatOf !== undefined)) {
    const it = byMsg.get(p.message);
    if (!it || repeats.some((x) => x.tab === p.tab && x.column === p.column && x.case === p.case && x.message === p.message)) continue;
    repeats.push({ tab: p.tab, ...place(p.case), column: p.column, header: p.header, repeatOf: p.repeatOf, message: it.raw.id, file: it.file, link: it.link, foundBy: 'the two AI readers (recorded answers) and the repeat test (fixed code)' });
  }
  // 4c. A consultant's question (round 17, I3): a proposal for Hearings BN, always for a person.
  for (const p of read.questionProposals || []) {
    const it = byMsg.get(p.message);
    if (!it) continue;
    add({ tab: p.tab, ...place(p.case), column: p.column, header: p.header, value: p.value, link: it.link, proposedBy: 'the question check (the readers and fixed code)', files: 'for a person', note: p.why, message: it.raw.id, file: it.file });
  }

  const order = (f) => [typeof f.row === 'number' ? f.row : 1e9, f.case || '', f.tab, f.column || '', String(f.message)];
  filings.sort((a, b) => { const x = order(a), y = order(b); for (let i = 0; i < x.length; i += 1) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; } return 0; });
  const self = filings.filter((f) => f.files === 'files itself').length;
  return {
    folder: path.relative(ROOT, folder).split(path.sep).join('/') || '.',
    autofile: !!opts.autofile,
    readers: read.reader,
    files: names.length, unreadable,
    messages: items.map((it) => ({ file: it.file, kind: it.kind, message: it.raw.id, at: it.raw.at, from: it.raw.sender, checkedAs: it.who.role, about: it.raw.properties, recordedAnswer: it.recorded, reply: it.reply || null, office: it.office || null })),
    filings, forPerson, holds, repeats,
    summary: {
      repeats: repeats.length, repeatMessages: [...new Set(repeats.map((x) => x.message))].length,
      files: names.length, emails: items.filter((i) => i.kind === 'email').length, texts: items.filter((i) => i.kind === 'text').length, unreadable: unreadable.length,
      withRecordedAnswer: items.filter((i) => i.recorded).length,
      repliesMatchedToANumberedMessage: replyChecked, repliesFiledByRule: replyFiled,
      officeMessagesChecked: officeChecked, officeRule: officeRule ? 'src/office_rule.js' : 'not available: src/office_rule.js is missing',
      proposedFilings: filings.length, fileThemselves: self, forAPerson: filings.length - self,
      messagesForAPerson: forPerson.length, holds: holds.length, rowsKnown: rowOf.size > 0,
    },
    notLive: 'This run read exported files. The live hookup to the firm\'s mailbox and text line needs the firm\'s accounts (see node cli/inbox.js --help for the two questions to ask).',
  };
}

// ---- output ------------------------------------------------------------------------------------------------
function table(r) {
  const cut = (s, n) => { const t = String(s ?? ''); return t.length > n ? `${t.slice(0, n - 3)}...` : t.padEnd(n); };
  const lines = [];
  lines.push(`Inbox folder ${r.folder}: ${r.summary.files} files (${r.summary.emails} emails, ${r.summary.texts} texts${r.summary.unreadable ? `, ${r.summary.unreadable} could not be read` : ''}). Nothing was sent and no sheet was changed.`);
  lines.push(`Readers: ${r.readers}. A recorded answer exists for ${r.summary.withRecordedAnswer} of the ${r.summary.emails + r.summary.texts} messages. No model was called.`);
  lines.push('');
  lines.push(`${cut('Tab', 13)}${cut('Row', 5)}${cut('Case', 8)}${cut('Col', 5)}${cut('Value', 44)}${cut('Proposed by', 37)}${cut('Filing', 14)}Link`);
  for (const f of r.filings) lines.push(`${cut(f.tab, 13)}${cut(f.row === null ? '?' : f.row, 5)}${cut(f.case || '', 8)}${cut(f.column || '', 5)}${cut(f.value === f.link ? 'the link (last column)' : f.value, 43)} ${cut(f.proposedBy.replace(/ \((?:fixed code|recorded answers)\)/g, ''), 36)} ${cut(f.files, 14)}${f.link}`);
  lines.push('');
  lines.push(`Proposed filings: ${r.summary.proposedFilings}. Files itself: ${r.summary.fileThemselves}. For a person: ${r.summary.forAPerson}.`);
  lines.push(r.autofile ? 'Auto-file is ON for this run only (--autofile): a reader proposal that both readers agree on and the verifier passes is marked "files itself". The plan for this season keeps it off; switching it on waits for the live-week-4 review (Reader suggestions A168).' : 'Auto-file is OFF, as the plan for this season has it: every proposal of the AI readers is for a person. Pass --autofile to see the list with agreed and verified proposals filing themselves.');
  lines.push(`Replies matched to a numbered message: ${r.summary.repliesMatchedToANumberedMessage}; filed by the reply rule: ${r.summary.repliesFiledByRule}. Office messages checked by the office rule: ${r.summary.officeMessagesChecked}. Everything the office rule proposes is for a person.`);
  if (!r.summary.rowsKnown) lines.push('Rows are shown as "?": no export of Hearings columns A and B was given (--rows), so find the row by the case ID in column A.');
  if (r.holds.length) { lines.push(''); for (const h of r.holds) lines.push(`HOLD, ${h.county}: ${h.why} (${h.link})`); }
  lines.push('');
  lines.push(`Repeats: ${(r.repeats || []).length}. A repeat is not a proposal: the cell keeps its first link and nothing is typed.`);
  for (const x of r.repeats || []) lines.push(`  REPEAT of message ${x.repeatOf}: no cell changes. ${x.tab} ${x.column}${x.case ? `, ${x.case}` : ''}${typeof x.row === 'number' ? ` (row ${x.row})` : ''}: message ${x.message} says the same again (${x.link}).`);
  lines.push('');
  lines.push(`Messages for a person: ${r.forPerson.length} of ${r.summary.emails + r.summary.texts}.`);
  for (const p of r.forPerson) { lines.push(`  ${p.file}, from ${p.from}`); for (const w of p.why) lines.push(`      ${w}`); }
  for (const u of r.unreadable) lines.push(`  ${u.file} could not be read: ${u.why}.`);
  lines.push('');
  lines.push(r.notLive);
  return lines.join('\n');
}

function toCsv(r) {
  const q = (s) => `"${String(s ?? '').replace(/"/g, '""').replace(/\s+/g, ' ').trim()}"`;
  const rows = [['Tab', 'Row', 'Case', 'Property', 'Column', 'Column header', 'Value', 'Link', 'Proposed by', 'Files itself or for a person', 'Note']];
  for (const f of r.filings) rows.push([f.tab, f.row === null ? '' : f.row, f.case, f.property, f.column, f.header, f.value, f.link, f.proposedBy, f.files, f.note]);
  return rows.map((x) => x.map(q).join(',')).join('\n') + '\n';
}

module.exports = { runInbox, parseEml, parseText, table, toCsv, HELP, EXAMPLE, REPLY_CELLS };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
  const VALUE = ['--json', '--csv', '--rows'];
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const unknown = args.filter((a) => a.startsWith('--') && !VALUE.includes(a) && a !== '--autofile');
  if (unknown.length) { console.error(`Unknown option ${unknown.join(', ')}. Run node cli/inbox.js --help for the options.`); process.exit(2); }
  const folderArg = args.find((a, i) => !a.startsWith('--') && !VALUE.includes(args[i - 1]));
  const folder = folderArg ? path.resolve(folderArg) : EXAMPLE;
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) { console.error(`There is no folder at ${folder}.`); process.exit(2); }
  runInbox(folder, { autofile: args.includes('--autofile'), rowsFile: opt('--rows') ? path.resolve(opt('--rows')) : null }).then((r) => {
    if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(r, null, 1) + '\n');
    if (opt('--csv')) fs.writeFileSync(opt('--csv'), toCsv(r));
    console.log(table(r));
  }).catch((e) => { console.error(e); process.exit(1); });
}
