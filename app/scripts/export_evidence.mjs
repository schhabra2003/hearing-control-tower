// Export the evidence to src/data/evidence.json.
//
//     node scripts/export_evidence.mjs
//
// Copies, verbatim, each check's command and the result line it prints, with the file and the line
// number it came from:
//   - every table with a "Command" column in prototype/README.md (sections 2, 3 and 5);
//   - the table of the newest checks section of the check log in the working notes (not published;
//     FACTS_SECTION, the checks re-run on the installed sheet), and the sheet md5 that section names, which must match
//     src/data/sheet.json;
//   - the results and limits of docs/outside-tests/live-reader-run.md, and the title and
//     first result lines of the other outside tests.
// Nothing is computed here: a sentence is either copied or left out.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The notes folder holds the audit notes this page quotes. Only part of it is published (docs/), so
// this script runs only when FAIRAPPEAL_NOTES names a full copy; the committed evidence.json is used otherwise.
const NOTES = process.env.FAIRAPPEAL_NOTES;
if (!NOTES) {
  process.stderr.write('export_evidence: skipped: set FAIRAPPEAL_NOTES to a full notes folder to regenerate src/data/evidence.json; the committed file is kept.\n');
  process.exit(0);
}
const OUT = path.join(APP, 'src', 'data', 'evidence.json');
/** The facts section whose check table the Evidence page shows, its round and the section that names the sheet. */
const FACTS_SECTION = '21.6';
const FACTS_SHEET_SECTION = '21.6';
const FACTS_ROUND = 'installed';

const SOURCES = {
  readme: { path: path.resolve(APP, '..', 'prototype', 'README.md'), shown: 'prototype/README.md' },
  facts: { path: path.join(NOTES, 'round15-facts.md'), shown: 'checks table (working notes, not published)' },
  live: { path: path.join(NOTES, 'outside-tests', 'live-reader-run.md'), shown: 'docs/outside-tests/live-reader-run.md' },
  excel: { path: path.join(NOTES, 'outside-tests', 'excel-test.md'), shown: 'docs/outside-tests/excel-test.md' },
  gsheets: { path: path.join(NOTES, 'outside-tests', 'google-sheets-test.md'), shown: 'docs/outside-tests/google-sheets-test.md' },
  calendar: { path: path.join(NOTES, 'outside-tests', 'calendar-test.md'), shown: 'docs/outside-tests/calendar-test.md' },
};

const fail = (msg) => {
  process.stderr.write(`export_evidence: FAILED: ${msg}\n`);
  process.exit(1);
};

const lines = (key) => {
  const p = SOURCES[key].path;
  if (!fs.existsSync(p)) fail(`missing source ${p}`);
  return fs.readFileSync(p, 'utf8').split('\n');
};

const splitRow = (line) => {
  const cells = [];
  let cur = '';
  let code = false;
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (const ch of body) {
    if (ch === '`') code = !code;
    if (ch === '|' && !code) { cells.push(cur.trim()); cur = ''; } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
};

// Every markdown table whose header has a "Command" column, with the section heading above it.
function commandTables(key) {
  const ls = lines(key);
  const rows = [];
  let section = '';
  for (let i = 0; i < ls.length; i += 1) {
    if (/^#{2,4} /.test(ls[i])) section = ls[i].replace(/^#+ /, '');
    if (!ls[i].startsWith('|') || !ls[i + 1] || !/^\|[\s|:-]+\|$/.test(ls[i + 1].trim())) continue;
    const head = splitRow(ls[i]);
    const cmd = head.findIndex((h) => /^Command$/i.test(h));
    if (cmd < 0) { i += 1; continue; }
    let j = i + 2;
    for (; j < ls.length && ls[j].startsWith('|'); j += 1) {
      const cells = splitRow(ls[j]);
      const rec = { source: SOURCES[key].shown, line: j + 1, section, columns: head, cells };
      rec.command = cells[cmd];
      rows.push(rec);
    }
    i = j;
  }
  return rows;
}

// The bullets under each "## " heading of a short report.
function bullets(key) {
  const ls = lines(key);
  const out = { title: (ls.find((l) => l.startsWith('# ')) || '').replace(/^# /, ''), titleLine: ls.findIndex((l) => l.startsWith('# ')) + 1, sections: [] };
  let cur = null;
  ls.forEach((l, i) => {
    if (l.startsWith('## ')) { cur = { heading: l.replace(/^## /, ''), line: i + 1, items: [] }; out.sections.push(cur); return; }
    if (cur && /^- /.test(l)) cur.items.push({ line: i + 1, text: l.replace(/^- /, '') });
  });
  return { source: SOURCES[key].shown, ...out };
}

const readme = commandTables('readme');
const facts = commandTables('facts').filter((r) => r.section.startsWith(`${FACTS_SECTION} `));
if (!readme.length) fail('no command table found in prototype/README.md');
if (!facts.length) fail(`no command table found in section ${FACTS_SECTION} of round15-facts.md`);

// The sheet the facts section was run on must be the sheet the app exported.
const factLines = lines('facts');
const sheetAt = factLines.findIndex((l) => l.startsWith(`### ${FACTS_SHEET_SECTION} `));
const named = sheetAt < 0 ? null : /md5 ([0-9a-f]{32})/.exec(factLines.slice(sheetAt, sheetAt + 6).join(' '))?.[1];
if (!named) fail(`section ${FACTS_SHEET_SECTION} of round15-facts.md names no md5`);
const sheetMd5 = JSON.parse(fs.readFileSync(path.join(APP, 'src', 'data', 'sheet.json'), 'utf8')).meta.md5;
if (named !== sheetMd5) fail(`facts ${FACTS_SHEET_SECTION} names sheet md5 ${named}, but src/data/sheet.json was exported from ${sheetMd5}`);

// The figure of the gate-sheet test is its pass-line count, never the last "N of N" in the cell.
const passLines = (cell) => {
  const m = /(\d+) pass lines, (\d+) FAIL/.exec(cell);
  if (m) return { pass: Number(m[1]), fail: Number(m[2]) };
  const r = /(\d+) lines start with `pass` and none with `FAIL`/.exec(cell);
  return r ? { pass: Number(r[1]), fail: 0 } : null;
};
for (const r of [...facts, ...readme]) {
  if (!/sheet_threads\.py/.test(r.command ?? '')) continue;
  const res = r.cells.find((c) => passLines(c));
  if (!res) fail(`no "N pass lines, N FAIL" in the sheet_threads.py row at ${r.source}:${r.line}`);
  r.passLines = passLines(res);
}
// Figures of the readers that live only in the README's prose, read into typed fields.
const readmeText = lines('readme');
const findLine = (re, what) => {
  const i = readmeText.findIndex((l) => re.test(l));
  if (i < 0) fail(`prototype/README.md: no line for ${what}`);
  return { m: re.exec(readmeText[i]), line: i + 1 };
};
const set2 = findLine(/Of the (\d+) agreed and passed: right (\d+) \(([\d.]+)%, 95% interval ([\d.]+)% to ([\d.]+)%\)/, 'the second unseen set');
const set2Size = findLine(/A second unseen set, (\d+) messages/, 'the size of the second unseen set');
const offline = findLine(/"messages":(\d+),"found":(\d+),"missed":(\d+)`? for the third \(the offline pattern reader on unseen wording\)/, 'the offline reader on unseen wording');
const readers = {
  source: SOURCES.readme.shown,
  unseen2: {
    messages: Number(set2Size.m[1]),
    agreed: Number(set2.m[1]),
    right: Number(set2.m[2]),
    pct: Number(set2.m[3]),
    low: Number(set2.m[4]),
    high: Number(set2.m[5]),
    line: set2.line,
  },
  offline: { found: Number(offline.m[2]), of: Number(offline.m[2]) + Number(offline.m[3]), messages: Number(offline.m[1]), line: offline.line },
};

const outside = ['live', 'excel', 'gsheets', 'calendar'].filter((k) => fs.existsSync(SOURCES[k].path)).map((k) => ({ id: k, ...bullets(k) }));

const out = {
  meta: {
    exportedAt: new Date().toISOString(),
    sources: Object.values(SOURCES).map((s) => s.shown),
    factsSection: FACTS_SECTION,
    factsRound: FACTS_ROUND,
    sheetMd5: named,
  },
  readers,
  readmeChecks: readme,
  factsChecks: facts,
  outsideTests: outside,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(`${OUT}.tmp`, JSON.stringify(out));
fs.renameSync(`${OUT}.tmp`, OUT);
console.log(`export_evidence: wrote ${path.relative(APP, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB): ${readme.length} command rows from the README, ${facts.length} from facts ${FACTS_SECTION}, ${outside.length} outside tests.`);
