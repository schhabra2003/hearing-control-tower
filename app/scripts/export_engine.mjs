// Export the engine's data to src/data/engine.json.
//
//     node scripts/export_engine.mjs
//
// Reads only the engine in ../prototype and does not change it. It reuses the
// prototype's own assembly (prototype/cli/appdata.js: packet, timeline, playbooks, messages, recorded
// reads, coverage, scale) and adds two precomputed results:
//   - the reply rule on the 39 example replies, exactly as `node cli/replies.js` runs it;
//   - `node cli/sheet.js --paste data/paste-example/new-messages.json` with NO key: the paste
//     function gets an empty environment, so it can only replay recorded answers. No model is
//     called and no key is read.
// The export stops with an error when a result disagrees with the line the prototype README
// quotes for it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = path.resolve(APP, '..', 'prototype');
const OUT = path.join(APP, 'src', 'data', 'engine.json');
const PASTE_FILE = 'data/paste-example/new-messages.json';

const fail = (msg) => {
  process.stderr.write(`export_engine: FAILED: ${msg}\n`);
  process.exit(1);
};

const { assembleData } = await import(path.join(ENGINE, 'cli', 'appdata.js'));
const { loadAll } = await import(path.join(ENGINE, 'cli', 'load.js'));
const { matchReply } = await import(path.join(ENGINE, 'src', 'replies.js'));
const { pasteNewMail, pasteLines } = await import(path.join(ENGINE, 'cli', 'sheet.js'));

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ENGINE, rel), 'utf8'));

// The reply rule, in the order the replies arrive; the first YES for a hearing wins (cli/replies.js).
function replyResults() {
  const data = readJson('data/example_replies.json');
  const filled = new Map();
  const rows = data.replies.map((r) => {
    const taken = filled.get(r.docket) || [];
    const out = matchReply(r.sent, r.reply, r.sent.kind === 'offer' ? taken : [], r.day ?? null);
    if (r.sent.kind === 'offer' && out.byRule && out.numbers.length) filled.set(r.docket, [...taken, ...out.numbers]);
    return { id: r.id, docket: r.docket, sent: r.sent, reply: r.reply, day: r.day ?? null, expect: r.expect, out };
  });
  const byRule = rows.filter((r) => r.out.byRule).length;
  const agree = rows.filter((r) => (r.expect === 'rule') === r.out.byRule).length;
  const summary = `${rows.length} replies: ${byRule} filed by rule, ${rows.length - byRule} handed to a person.`;
  const selfTest = `Self-test against what a coordinator would decide by hand: ${agree} of ${rows.length} agree.`;
  return { note: data.note ?? null, rows, byRule, toPerson: rows.length - byRule, agree, summary, selfTest,
    caveat: 'These replies are fictional and written by the author of the rule, so this shows that the rule does what it says, not how often real replies fit it. That share is counted in the live weeks.' };
}

async function pasteResult() {
  const file = readJson(PASTE_FILE);
  const list = Array.isArray(file) ? file : file.messages;
  const data = loadAll();
  const r = await pasteNewMail(list, data, { env: {} });
  if (r.live || r.keySet) fail('the paste run was not offline');
  const target = 'reader-suggestions-paste.tsv';
  return {
    command: `node cli/sheet.js --paste ${PASTE_FILE} --out ${target}`,
    messages: list,
    rows: r.rows,
    count: r.count,
    how: r.how,
    replayed: r.replayed,
    missing: r.missing,
    nothingProposed: r.nothingProposed,
    readerLabels: r.readerLabels,
    lines: pasteLines(r, PASTE_FILE, target),
  };
}

const assembled = assembleData();
const replies = replyResults();
const paste = await pasteResult();

const README_REPLIES = '39 replies: 17 filed by rule, 22 handed to a person.';
if (replies.summary !== README_REPLIES) fail(`reply rule: "${replies.summary}" is not the README's "${README_REPLIES}"`);
const wroteLine = paste.lines.find((l) => l.startsWith('Wrote '));
if (!wroteLine || !wroteLine.includes('26 rows for 6 new messages')) fail(`paste: unexpected result line: ${wroteLine}`);

const out = {
  meta: {
    exportedAt: new Date().toISOString(),
    snapshot: 'prototype/ in the same repository',
    node: process.version,
  },
  ...assembled,
  replies,
  paste,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(`${OUT}.tmp`, JSON.stringify(out));
fs.renameSync(`${OUT}.tmp`, OUT);
console.log(`export_engine: wrote ${path.relative(APP, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB). ${replies.summary} ${replies.selfTest} Paste: ${paste.rows.length} rows for ${paste.messages.length} messages, not read: ${paste.missing.join(', ') || 'none'}.`);
