/**
 * Proves that the engine modules the pages need import and run in a browser build Built by vite.engine-check.config.ts and opened from file:// by
 * scripts/engine_check.mjs, which reads window.__ENGINE_CHECK__.
 */

import engineJson from '@data/engine.json';
import type { EngineData } from '@/types/data';
import { matchReply } from '@engine/src/replies.js';
import { classifyOfficeReply } from '@engine/src/office_rule.js';
import { extractWithRules } from '@engine/src/extract/rules.js';
import { makeRecordedReader } from '@engine/src/extract/recorded.js';
import { readMessageSync } from '@engine/src/extract/crosscheck.js';
import { createEngine } from '@engine/src/engine.js';
import { createSession } from '@engine/app/store.js';
import { makeSyntheticWorld, runSim } from '@engine/src/sim.js';
import { businessCase, defaults } from '@engine/src/economics.js';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

declare global {
  interface Window {
    __ENGINE_CHECK__?: { done: boolean; checks: Check[] };
  }
}

const data = engineJson as EngineData;
const checks: Check[] = [];

function check(name: string, run: () => { ok: boolean; detail: string }): void {
  try {
    checks.push({ name, ...run() });
  } catch (e) {
    checks.push({ name, ok: false, detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  }
}

check('reply rule', () => {
  const first = data.replies.rows[0];
  if (!first) return { ok: false, detail: 'engine.json has no example replies' };
  // In arrival order; the first YES for a hearing takes its numbers (as cli/replies.js does).
  const filled = new Map<string, number[]>();
  const yes = matchReply({ kind: 'offer', to: 'consultant', open: [1, 3] }, { from: 'consultant', text: 'YES 1 3' });
  let same = 0;
  for (const r of data.replies.rows) {
    const taken = filled.get(r.docket) ?? [];
    const out = matchReply(r.sent, r.reply, r.sent.kind === 'offer' ? taken : [], r.day as { cap: number; held: number; offered: number } | null);
    if (r.sent.kind === 'offer' && out.byRule && out.numbers.length) filled.set(r.docket, [...taken, ...out.numbers]);
    if (JSON.stringify(out) === JSON.stringify(r.out)) same += 1;
  }
  return {
    ok: same === data.replies.rows.length && yes.byRule && yes.numbers.join() === '1,3',
    detail: `${same} of ${data.replies.rows.length} example replies match the node export; "YES 1 3" to an offer of 1 and 3 is ${yes.byRule ? 'filed by rule' : 'handed to a person'} with numbers ${yes.numbers.join(' and ')}`,
  };
});

check('office rule', () => {
  const r = classifyOfficeReply('We cannot find your staffing form.', { county: 'Tesswick' });
  return { ok: r.kind === 'cannot_find', detail: `kind ${r.kind}, ${r.proposals.length} proposals` };
});

check('try a message (offline pattern reader and recorded answers)', () => {
  const eng = createEngine({ packet: data.packet, playbooks: data.playbooks, reader: extractWithRules });
  const first = makeRecordedReader(data.recorded, { set: 'primary', fallback: extractWithRules });
  const second = makeRecordedReader(data.recorded, { set: 'second', fallback: extractWithRules });
  let read = 0;
  let withClaims = 0;
  for (const m of data.messages) {
    const entry = readMessageSync(eng, m, { reader: first, second });
    read += 1;
    if (Array.isArray(entry.claims) && entry.claims.length > 0) withClaims += 1;
  }
  const typed = readMessageSync(eng, { id: 'try-1', sender: 'Velloran hearing office', channel: 'email', body: 'Both packets received.' }, { reader: extractWithRules });
  return {
    ok: read === data.messages.length && withClaims > 0 && first.stats.missing === 0,
    detail: `${read} messages read, ${withClaims} with readings that passed, ${first.stats.missing} missing recorded answers; a typed message gave ${Array.isArray(typed.claims) ? typed.claims.length : 0} readings`,
  };
});

check('session store (control tower replay)', () => {
  const s = createSession(data);
  return { ok: Array.isArray(s.items) || typeof s.subscribe === 'function', detail: `session made, ${Object.keys(s).length} fields` };
});

check('counties', () => {
  const counties = data.playbooks.counties.length;
  const eng = createEngine({ packet: data.packet, playbooks: data.playbooks, reader: extractWithRules });
  return { ok: counties === 10 && eng.dir !== undefined, detail: `${counties} county playbooks loaded into the engine` };
});

check('scale run (small)', () => {
  const world = makeSyntheticWorld({ base: { packet: data.packet, playbooks: data.playbooks }, hearings: 40, counties: 3, weeks: 1, seed: 1 });
  const res = runSim(world);
  return { ok: typeof res === 'object' && res !== null, detail: `result fields: ${Object.keys(res).slice(0, 8).join(', ')}` };
});

check('economics', () => {
  const bc = businessCase(defaults());
  return { ok: Object.keys(bc).length > 0, detail: `business case fields: ${Object.keys(bc).slice(0, 8).join(', ')}` };
});

window.__ENGINE_CHECK__ = { done: true, checks };
const out = document.getElementById('out');
if (out) out.textContent = checks.map((c) => `${c.ok ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`).join('\n');
