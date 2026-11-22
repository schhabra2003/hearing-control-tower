// Replies filed by rule: the one piece of code the first priority needs in season one.
//
//     node cli/replies.js            the example replies, what the rule does with each, and a self-test
//     node cli/replies.js --csv f    the same as a CSV to paste into the sheet's "Reader suggestions" tab
//     node cli/replies.js --try "<reply text>" --kind <offer|week|day_before|arrival|files|change> [--from "<name>"] [--open 1,3] [--held 1,2] [--dockets "a;b"] [--version 2] [--format "in person"|video|telephone] [--channel text|email] [--cap 4 --held-today 2 --offered-today 1]
//                                    the rule once on a reply of your own, against a message built from the flags
//
// The daily cap (--cap, --held-today, --offered-today, and "day" in the example file): when the
// caller gives the consultant's cap, the hearings they already hold that day and the hearings still
// on offer to them on other dockets that day, a YES that would bring the three together above the
// cap goes to a person. Without those numbers the cap is not checked, and the output says so.
//
// A consultant's answer to a numbered offer ("YES 1 3"), to the Wednesday text ("YES ALL"), to the day-before text ("YES"), to the
// arrival request ("ARRIVED", "IN"), to the case files with a version number ("GOT IT", "GOT IT 2")
// or to a change from the office to the room, link, time or date ("OK") has a fixed form, in a text
// or in the first line of an email. Code checks who sent it, which message it answers and what it
// says. It files the proof (for the case files, with the version the consultant has) or hands the
// reply to a person with the reason. No model is involved and nothing is sent.
//
// What is not built: the connection to a real mailbox or text line. Here the replies come from
// data/example_replies.json (fictional, written for the example week's dockets; the replies to the
// case files and to a change are drawn from the packet's Caldmere and Harthmere threads, and R22
// answers a hypothetical change that the packet does not contain, and R33 to R39 are hypothetical
// days near a consultant's daily cap, which the packet does not contain either).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { matchReply } from '../src/replies.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

// What the rule does, as the table and --try print it: the action and the hearings, or TO A PERSON.
const does = (out) => (out.byRule ? `${out.action}${out.numbers.length ? ` for hearing ${out.numbers.join(', ')}` : ''}${out.version ? `, version ${out.version}` : ''}` : 'TO A PERSON');

if (args.includes('--try')) tryOne();
else examples();

function examples() {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data/example_replies.json'), 'utf8'));
  // Replies are taken in the order they arrive. The numbers each YES fills are remembered per docket,
  // so a later YES for a hearing that is already taken goes to a person (the first YES wins).
  const filled = new Map();
  const rows = data.replies.map((r) => {
    const taken = filled.get(r.docket) || [];
    const out = matchReply(r.sent, r.reply, r.sent.kind === 'offer' ? taken : [], r.day ?? null);
    if (r.sent.kind === 'offer' && out.byRule && out.numbers.length) filled.set(r.docket, [...taken, ...out.numbers]);
    return { ...r, out };
  });
  // What the reply answers, as the table and the CSV show it: the kind of message, with the version
  // of the case files or a few words on what the office changed.
  const kindName = (s) => ({
    offer: 'offer',
    week: 'Wednesday text',
    day_before: 'day before',
    arrival: 'arrival',
    files: `case files version ${s.version ?? '?'}`,
    change: `change${s.what ? ` (${s.what})` : ''}`,
  }[s.kind] || `unknown kind "${s.kind}"`);
  // An email is shown on one line in the table: line breaks as \n, cut after 70 characters. The CSV
  // keeps the whole text.
  const shown = (reply) => {
    if (reply.channel !== 'email') return reply.text;
    const t = String(reply.text).replace(/\r?\n/g, '\\n');
    return t.length > 70 ? `${t.slice(0, 67)}...` : t;
  };
  // The day's numbers for the daily cap, as the caller supplied them with the reply.
  const dayText = (d) => (d ? `cap ${d.cap ?? 'not given'}, holds ${d.held ?? 'not given'} that day, ${d.offered ?? 0} on offer elsewhere` : '');
  console.log('Reply | Answers | From | Text | The rule does | Why');
  for (const r of rows) {
    const from = r.reply.channel === 'email' ? `${r.reply.from} by email` : r.reply.from;
    console.log(`${r.id} | ${kindName(r.sent)}, ${r.docket}${r.day ? ` (${dayText(r.day)})` : ''} | ${from} | "${shown(r.reply)}" | ${does(r.out)} | ${r.out.why}`);
  }
  const byRule = rows.filter((r) => r.out.byRule).length;
  const wrong = rows.filter((r) => (r.expect === 'rule') !== r.out.byRule);
  console.log(`\n${rows.length} replies: ${byRule} filed by rule, ${rows.length - byRule} handed to a person.`);
  const offers = rows.filter((r) => r.sent.kind === 'offer');
  const withDay = offers.filter((r) => r.day);
  const capStopped = withDay.filter((r) => !r.out.byRule && /daily cap/.test(r.out.why));
  console.log(`Daily cap: ${withDay.length} of the ${offers.length} replies to an offer come with the day's numbers (cap, held, on offer elsewhere); the cap sent ${capStopped.length} of those ${withDay.length} to a person${capStopped.length ? ` (${capStopped.map((r) => r.id).join(', ')})` : ''}. For the other ${offers.length - withDay.length} the caller gave no numbers, so the cap was not checked.`);
  console.log(`Self-test against what a coordinator would decide by hand: ${rows.length - wrong.length} of ${rows.length} agree${wrong.length ? `; DISAGREE: ${wrong.map((r) => r.id).join(', ')}` : ''}.`);
  console.log('These replies are fictional and written by the author of the rule, so this shows that the rule does what it says, not how often real replies fit it. That share is counted in the live weeks.');
  if (opt('--csv')) {
    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const out = [['Reply', 'Docket', 'Answers', 'From', 'Text', 'Filed by rule?', 'Hearings', 'Why', 'Daily cap numbers given with the reply']];
    for (const r of rows) out.push([r.id, r.docket, kindName(r.sent), r.reply.from, r.reply.text, r.out.byRule ? 'yes' : 'no: to a person', r.out.numbers.join(' '), r.out.why, r.sent.kind === 'offer' ? (dayText(r.day) || 'none: the cap was not checked') : '']);
    fs.writeFileSync(opt('--csv'), out.map((x) => x.map(q).join(',')).join('\n') + '\n');
  }
  process.exitCode = wrong.length ? 1 : 0;
}

// --try: the rule once on a reply of your own. The message it answers is built from the flags and
// addressed to TRY_TO, a consultant from the example packet. --from names who replied (TRY_TO when
// left out), so another name shows the sender check. Every flag that is left out takes the default
// below, and the output names each default it used. In the reply text, \n starts a new line, so an
// email with a quoted message can be typed on one line. No earlier YES is counted, so no hearing is
// taken. Nothing is sent and nothing is saved.
function tryOne() {
  const KINDS = ['offer', 'week', 'day_before', 'arrival', 'files', 'change'];
  const FORMATS = ['in person', 'video', 'telephone'];
  const TRY_TO = 'Leo Arlen';
  const DEFAULT_DOCKETS = 'Mon June 10, Larkmere, in person';
  const FLAGS = ['--try', '--kind', '--from', '--open', '--held', '--dockets', '--version', '--format', '--channel', '--cap', '--held-today', '--offered-today'];
  const CAP_FLAGS = ['--cap', '--held-today', '--offered-today'];
  // The flags each kind of message reads. A flag given for another kind is reported as ignored.
  const USES = { offer: ['--open', ...CAP_FLAGS], week: ['--dockets'], day_before: ['--held'], arrival: ['--held', '--format'], files: ['--held', '--version'], change: ['--held'] };
  const usage = 'node cli/replies.js --try "<reply text>" --kind <offer|week|day_before|arrival|files|change> [--from "<name>"] [--open 1,3] [--held 1,2] [--dockets "a;b"] [--version 2] [--format "in person"|video|telephone] [--channel text|email] [--cap 4 --held-today 2 --offered-today 1]';
  const stop = (msg) => { console.error(`${msg}\nUsage: ${usage}`); process.exit(2); };

  // Every argument is a known flag followed by its value. A word that follows no flag usually
  // means the reply text was not put in quotes.
  const flags = new Map();
  for (let i = 0; i < args.length; i += 2) {
    const a = args[i];
    if (a === '--csv') stop('--csv writes the table of example replies and does not go with --try.');
    if (!FLAGS.includes(a)) stop(a.startsWith('--') ? `Unknown flag ${a}.` : `"${a}" does not follow a flag. Put the reply text in quotes, for example --try "YES 1 3".`);
    const v = args[i + 1];
    if (v === undefined || v.startsWith('--')) stop(`${a} needs a value.`);
    flags.set(a, v);
  }
  const defaults = [];
  const get = (name, fallback, shownAs = fallback) => {
    if (flags.has(name)) return flags.get(name);
    defaults.push(`${name} ${shownAs}`);
    return fallback;
  };
  const numbers = (name) => {
    const v = get(name, '1');
    const parts = v.split(',').map((s) => s.trim());
    if (parts.some((s) => !/^[1-9]\d?$/.test(s))) stop(`${name} takes hearing numbers from 1 to 99 separated by commas, for example 1,3.`);
    return [...new Set(parts.map(Number))];
  };

  const text = flags.get('--try').replace(/\\n/g, '\n');
  const kind = flags.get('--kind');
  if (!KINDS.includes(kind)) stop(`--kind must be one of: ${KINDS.join(', ')}.`);
  const from = get('--from', TRY_TO, `"${TRY_TO}"`);
  const channel = get('--channel', 'text');
  if (channel !== 'text' && channel !== 'email') stop('--channel must be text or email.');
  const ignored = [...flags.keys()].filter((f) => ['--open', '--held', '--dockets', '--version', '--format', ...CAP_FLAGS].includes(f) && !USES[kind].includes(f));
  // The daily cap is checked only when --cap and --held-today are both given (--offered-today is 0 when left out).
  let day = null;
  if (kind === 'offer' && CAP_FLAGS.some((f) => flags.has(f))) {
    const count = (name, fallback) => {
      if (!flags.has(name)) return fallback;
      if (!/^\d{1,3}$/.test(flags.get(name))) stop(`${name} takes a whole number from 0 up, for example 4.`);
      return Number(flags.get(name));
    };
    if (!flags.has('--cap') || !flags.has('--held-today')) stop('The daily cap needs --cap and --held-today together (and --offered-today when offers are out on other dockets that day).');
    day = { cap: count('--cap'), held: count('--held-today'), offered: count('--offered-today', 0) };
  }

  const sent = { kind, to: TRY_TO };
  if (kind === 'offer') sent.open = numbers('--open');
  if (USES[kind].includes('--held')) sent.held = numbers('--held');
  if (kind === 'week') sent.dockets = get('--dockets', DEFAULT_DOCKETS, `"${DEFAULT_DOCKETS}"`).split(';').map((s) => s.trim()).filter(Boolean);
  if (kind === 'files') {
    const v = get('--version', '1');
    if (!/^[1-9]\d{0,2}$/.test(v)) stop('--version takes a whole number from 1 up, for example 2.');
    sent.version = Number(v);
  }
  if (kind === 'arrival') {
    sent.format = get('--format', 'in person', '"in person"');
    if (!FORMATS.includes(sent.format)) stop(`--format must be one of: ${FORMATS.map((f) => `"${f}"`).join(', ')}.`);
  }

  const out = matchReply(sent, { from, text, channel }, [], day);

  const hearings = (a) => `${a.length === 1 ? 'hearing' : 'hearings'} ${a.join(', ')}`;
  const message = {
    offer: () => `an offer of ${hearings(sent.open)}. No earlier YES is counted, so no hearing is taken`,
    week: () => `the Wednesday text, listing ${sent.dockets.length ? sent.dockets.join('; ') : 'no docket'}`,
    day_before: () => `the day-before text for ${hearings(sent.held)}`,
    arrival: () => `the arrival request for ${hearings(sent.held)}, ${sent.format}`,
    files: () => `case files version ${sent.version} for ${hearings(sent.held)}`,
    change: () => `a change notice for ${hearings(sent.held)}`,
  }[kind]();
  console.log(`Message built from the flags (not sent), to ${TRY_TO}: ${message}.`);
  if (defaults.length) console.log(`Defaults used: ${defaults.join(', ')}.`);
  if (ignored.length) console.log(`Ignored for this kind of message: ${ignored.join(', ')}.`);
  if (kind === 'offer') console.log(day ? `Daily cap numbers given: the cap is ${day.cap}, ${TRY_TO} holds ${day.held} that day, and ${day.offered} more ${day.offered === 1 ? 'is' : 'are'} on offer to them on other dockets that day.` : 'Daily cap: not checked, because --cap and --held-today were not given.');
  if (text.includes('\n')) console.log(`Reply from ${from} by ${channel}:\n${text.split('\n').map((l) => `    ${l}`).join('\n')}`);
  else console.log(`Reply from ${from} by ${channel}: "${text}"`);
  console.log(out.byRule ? `The rule files it: ${does(out)}. Why: ${out.why}` : `The rule hands it TO A PERSON. Why: ${out.why}`);
}
