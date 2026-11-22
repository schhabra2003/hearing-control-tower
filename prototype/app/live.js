// The live AI readers, as the web app sees them.
//
// The page builds the reader's instructions and the message input itself: it knows the
// directory, including counties added in this session. It posts both texts to the dev server
// (app/server.js), which adds the key, asks the model, and returns the raw answer. The answer is
// not trusted. It goes through the same code as every other reading: the guard, the cross-check
// of the two readers, and, when the message is delivered, the verifier.
//
// Opened as a single file (no server), none of this is available, and the page says so.

import { buildReaderSystem, buildReaderInput } from '../src/extract/prompt.js';
import { TWO_KEY_TYPES, settleRead, attentionFrom, factsFor } from '../src/extract/crosscheck.js';
import { extractWithRules } from '../src/extract/rules.js';

// Is a live reader there? { live: true, provider, primary, second, measured } or { live: false, reason }.
export async function probeLive() {
  if (typeof location === 'undefined' || location.protocol === 'file:') return { live: false, reason: 'single-file' };
  try {
    const r = await fetch('/api/reader');
    return r.ok ? await r.json() : { live: false, reason: 'no-server' };
  } catch { return { live: false, reason: 'no-server' }; }
}

async function ask(variant, system, input) {
  const r = await fetch('/api/read', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ variant, system, input }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'the reader gave no answer');
  return j;
}

// Reads one message with both AI readers, at the same time. Returns what the store needs to
// deliver it: { claims, attention, reading, label }. It never throws. When a reader fails, the
// offline pattern reader takes its place for that key and the failure becomes a reason for a
// person to look, so a network problem can make more work but never a wrong fact.
export async function liveRead(S, rawMsg) {
  const eng = S.eng;
  const { msg, ctx } = eng.prepare({ id: 'live', at: S.now + 60e3, ...rawMsg });
  if (msg.resolvedBy === 'none') return { claims: [], attention: [], reading: null, label: 'not read: no hearing matched' };
  const failures = [];
  const input = buildReaderInput(msg, eng.dir, ctx);
  const run = async (variant) => {
    const role = variant === 'second' ? 'second reader' : 'reader';
    try {
      const a = await ask(variant, buildReaderSystem(eng.dir, variant === 'second' ? { variant: 'second', closing: TWO_KEY_TYPES } : {}), input);
      return { label: a.model, out: { claims: (a.raw && a.raw.claims) || [], unclassified: (a.raw && a.raw.unclassified) || [] }, meta: { reader: role, model: a.model, usage: a.usage, costUsd: a.costUsd ?? null, ms: a.ms ?? null } };
    } catch (e) {
      failures.push(`The ${role} could not read this message (${e && e.message ? e.message : e}). The offline pattern reader was used in its place.`);
      return { label: 'offline pattern reader', out: extractWithRules(msg, eng.dir, ctx), meta: null };
    }
  };
  const [first, second] = await Promise.all([run('primary'), run('second')]);
  const r = settleRead(msg, eng.dir, ctx, first.out, second.out, { facts: { ...(ctx.facts || {}), ...factsFor(eng, ctx.caseIds) } });
  const attention = attentionFrom({ dropped: r.dropped, disputed: r.disputed, unclassified: r.unclassified, failures, body: msg.body });
  const usage = [first.meta, second.meta].filter(Boolean);
  return {
    claims: r.claims, attention,
    reading: { dropped: r.dropped, disputed: r.disputed, unclassified: r.unclassified, notes: r.notes, crossChecked: true, live: true, usage,
      costUsd: usage.reduce((a, u) => a + (u.costUsd || 0), 0), ms: Math.max(0, ...usage.map((u) => u.ms || 0)) },
    label: `${first.label}, checked by ${second.label} (live)`,
  };
}
