#!/usr/bin/env node
// No key, no cost: starts the live server with --recorded, posts the paste example file to
// /api/read, and checks that the rows equal what `node cli/sheet.js --paste` writes for the same
// file. Also checks the status endpoint and that a page from another origin is refused.
//   node server/live-check.mjs [--prototype <dir>]
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const i = argv.indexOf('--prototype');
const PROTO = path.resolve(i >= 0 ? argv[i + 1] : [path.join(HERE, '..', '..', 'prototype'), path.join(process.cwd(), 'prototype')].find((p) => fs.existsSync(path.join(p, 'cli', 'sheet.js'))) || '');
const file = path.join(PROTO, 'data', 'paste-example', 'new-messages.json');
const port = 4300 + Math.floor(Math.random() * 500);
const env = { ...process.env };
delete env.OPENAI_API_KEY;

let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`); };

const srv = spawn(process.execPath, [path.join(HERE, 'live.mjs'), '--recorded', '--port', String(port), '--prototype', PROTO], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
srv.stdout.on('data', (d) => { log += d; });
srv.stderr.on('data', (d) => { log += d; });
const base = `http://127.0.0.1:${port}`;
try {
  for (let t = 0; t < 50; t += 1) { try { await fetch(`${base}/api/status`); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
  const st = await (await fetch(`${base}/api/status`)).json();
  check('status answers', st.mode === 'recorded' && st.live === false, `${st.mode}: ${st.reason}`);
  const foreign = await fetch(`${base}/api/status`, { headers: { origin: 'http://example.com' } });
  check('another origin is refused', foreign.status === 403);
  const messages = JSON.parse(fs.readFileSync(file, 'utf8')).messages;
  const res = await fetch(`${base}/api/read`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages }) });
  const out = await res.json();
  check('read answers', res.ok && out.mode === 'recorded', `${out.rows ? out.rows.length : 0} rows, ${out.ms} ms`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'live-check-'));
  const tsv = path.join(tmp, 'cli.tsv');
  execFileSync(process.execPath, ['cli/sheet.js', '--paste', file, '--out', tsv], { cwd: PROTO, env, stdio: 'ignore' });
  const cli = fs.readFileSync(tsv, 'utf8');
  const api = `${out.rows.map((r) => r.join('\t')).join('\n')}\n`;
  check('rows equal the command (node cli/sheet.js --paste)', cli === api, `${cli.trim().split('\n').length} rows from the command`);
  fs.rmSync(tmp, { recursive: true, force: true });
} catch (e) {
  check('the check ran', false, e.message);
  console.log(log);
} finally {
  srv.kill();
}
process.exit(failed ? 1 : 0);
