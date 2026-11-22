// Scoring for the test harness: compare a reader's claims with hand labels.
// A claim counts as correct when its type and case match a label ("pair"). Fields (date, time,
// consultant, deadline and so on) are scored separately on the pairs that matched.

import { CLAIM_FIELDS } from './model.js';

export const SCORED_FIELDS = Object.keys(CLAIM_FIELDS).filter((f) => !['reason', 'version', 'part'].includes(f)).concat(['part']);

const pairsOf = (claims) => {
  const m = new Map();
  for (const c of claims) for (const id of c.cases || []) {
    const key = `${c.type}|${id}|${['document_submitted', 'doc_unreadable', 'signature_required', 'signature_rejected', 'obligation_cleared'].includes(c.type) ? c.kind || '' : ''}`;
    if (!m.has(key)) m.set(key, c);
  }
  return m;
};

export function scoreMessage(pred, gold) {
  const P = pairsOf(pred), Gd = pairsOf(gold);
  const tp = [], fp = [], fn = [];
  const fields = { right: 0, wrong: 0, missing: 0, errors: [] };
  for (const [key, g] of Gd) {
    if (!P.has(key)) { fn.push(key); continue; }
    tp.push(key);
    const p = P.get(key);
    for (const f of SCORED_FIELDS) {
      if (g[f] === undefined) continue;
      if (p[f] === undefined || p[f] === null) { fields.missing += 1; fields.errors.push(`${key} ${f}: missing (want ${g[f]})`); }
      else if (String(p[f]) === String(g[f])) fields.right += 1;
      else { fields.wrong += 1; fields.errors.push(`${key} ${f}: got ${p[f]} (want ${g[f]})`); }
    }
  }
  for (const key of P.keys()) if (!Gd.has(key)) fp.push(key);
  return { tp, fp, fn, fields, exact: !fp.length && !fn.length && !fields.wrong && !fields.missing };
}

// Wilson score interval for a proportion (95%).
export function wilson(k, n, z = 1.96) {
  if (!n) return { p: null, lo: null, hi: null };
  const p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { p, lo: Math.max(0, c - h), hi: Math.min(1, c + h) };
}

export function summarize(rows) {
  const sum = { tp: 0, fp: 0, fn: 0, fRight: 0, fWrong: 0, fMissing: 0, exact: 0, n: rows.length, byType: {} };
  for (const r of rows) {
    sum.tp += r.tp.length; sum.fp += r.fp.length; sum.fn += r.fn.length;
    sum.fRight += r.fields.right; sum.fWrong += r.fields.wrong; sum.fMissing += r.fields.missing;
    if (r.exact) sum.exact += 1;
    for (const [k, list] of [['tp', r.tp], ['fp', r.fp], ['fn', r.fn]]) for (const key of list) {
      const t = key.split('|')[0];
      (sum.byType[t] = sum.byType[t] || { tp: 0, fp: 0, fn: 0 })[k] += 1;
    }
  }
  sum.precision = wilson(sum.tp, sum.tp + sum.fp);
  sum.recall = wilson(sum.tp, sum.tp + sum.fn);
  sum.fieldAccuracy = wilson(sum.fRight, sum.fRight + sum.fWrong + sum.fMissing);
  sum.exactMessages = wilson(sum.exact, sum.n);
  return sum;
}
