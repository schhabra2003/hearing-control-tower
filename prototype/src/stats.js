// Small statistics for the reader evaluation. Pure functions: they run in Node and in the browser.
//
// Why intervals: an accuracy figure from 72 or 180 messages is an estimate. Every proportion
// reported by eval/run.js therefore comes with a 95% interval, and "0 errors in n" is reported
// as an upper bound, never as "no errors".

// Wilson score interval for a proportion. Behaves sensibly at 0 and at n (unlike p +- 1.96 se).
export function wilson(k, n, z = 1.96) {
  if (!n) return { k, n, p: null, lo: null, hi: null };
  const p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { k, n, p, lo: Math.max(0, c - h), hi: Math.min(1, c + h) };
}

// "We saw no failure in n trials": the largest true rate that is still compatible with that,
// at 95% confidence (exact, one-sided). For n = 100 this is about 3%, the "rule of three".
export function upperBoundZero(n, level = 0.95) {
  if (!n) return null;
  return 1 - Math.pow(1 - level, 1 / n);
}

// Precision, recall and F1 from counts. Precision and recall get Wilson intervals (they are
// proportions of claims). F1 is not a simple proportion: use bootstrapPRF for its interval.
export function prf(tp, fp, fn) {
  const precision = wilson(tp, tp + fp), recall = wilson(tp, tp + fn);
  const f1 = 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null;
  return { tp, fp, fn, precision, recall, f1 };
}

// Deterministic random numbers, so that every run of the evaluation prints the same intervals.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quantile = (sorted, q) => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

// Percentile bootstrap over units (here: messages). Claims inside one message are not
// independent, so resampling whole messages gives a more honest interval than treating every
// claim as a separate coin flip.
export function bootstrap(units, stat, { B = 2000, seed = 7, level = 0.95 } = {}) {
  const est = stat(units);
  if (!units.length) return { est, lo: null, hi: null, B: 0 };
  const rnd = mulberry32(seed), vals = [];
  for (let b = 0; b < B; b += 1) {
    const sample = new Array(units.length);
    for (let i = 0; i < units.length; i += 1) sample[i] = units[Math.floor(rnd() * units.length)];
    const v = stat(sample);
    if (v !== null && !Number.isNaN(v)) vals.push(v);
  }
  vals.sort((a, b) => a - b);
  const a = (1 - level) / 2;
  return { est, lo: quantile(vals, a), hi: quantile(vals, 1 - a), B };
}

// rows: one { tp, fp, fn } per message (numbers). Message-level bootstrap for P, R and F1.
export function bootstrapPRF(rows, opts = {}) {
  const sum = (list, k) => list.reduce((n, r) => n + r[k], 0);
  const P = (l) => { const tp = sum(l, 'tp'), fp = sum(l, 'fp'); return tp + fp ? tp / (tp + fp) : null; };
  const R = (l) => { const tp = sum(l, 'tp'), fn = sum(l, 'fn'); return tp + fn ? tp / (tp + fn) : null; };
  const F = (l) => { const tp = sum(l, 'tp'), fp = sum(l, 'fp'), fn = sum(l, 'fn'); return 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null; };
  return { precision: bootstrap(rows, P, opts), recall: bootstrap(rows, R, opts), f1: bootstrap(rows, F, opts) };
}

const logFact = (() => { const memo = [0]; return (n) => { for (let i = memo.length; i <= n; i += 1) memo[i] = memo[i - 1] + Math.log(i); return memo[n]; }; })();
const binomPmf = (k, n, p) => Math.exp(logFact(n) - logFact(k) - logFact(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p));

// Exact McNemar test for paired yes/no results: b = only the first is right, c = only the second.
// Two-sided p-value under "both are equally good".
export function mcnemarExact(b, c) {
  const n = b + c;
  if (!n) return 1;
  const m = Math.min(b, c);
  let tail = 0;
  for (let k = 0; k <= m; k += 1) tail += binomPmf(k, n, 0.5);
  return Math.min(1, 2 * tail);
}

// Paired comparison of two readers on the same messages. a and b are arrays of true/false
// (for example "read exactly right"), in the same message order.
export function pairedCompare(a, b, opts = {}) {
  const n = Math.min(a.length, b.length);
  let both = 0, onlyA = 0, onlyB = 0, neither = 0;
  for (let i = 0; i < n; i += 1) {
    if (a[i] && b[i]) both += 1; else if (a[i]) onlyA += 1; else if (b[i]) onlyB += 1; else neither += 1;
  }
  const pairs = Array.from({ length: n }, (_, i) => [a[i] ? 1 : 0, b[i] ? 1 : 0]);
  const diff = bootstrap(pairs, (l) => (l.length ? l.reduce((s, x) => s + x[0] - x[1], 0) / l.length : null), opts);
  return { n, both, onlyA, onlyB, neither, rateA: n ? (both + onlyA) / n : null, rateB: n ? (both + onlyB) / n : null, difference: diff, p: mcnemarExact(onlyA, onlyB) };
}

export const pct = (x, digits = 1) => (x === null || x === undefined || Number.isNaN(x) ? 'n/a' : `${(100 * x).toFixed(digits)}%`);
// "94.4% (87.5 to 97.6, 68/72)"
export const fmtWilson = (w, digits = 1) => (w.p === null ? 'n/a (0 cases)' : `${pct(w.p, digits)} (${(100 * w.lo).toFixed(digits)} to ${(100 * w.hi).toFixed(digits)}; ${w.k}/${w.n})`);
export const fmtBoot = (b, digits = 1) => (b.est === null || b.est === undefined ? 'n/a' : `${pct(b.est, digits)} (${b.lo === null ? 'n/a' : (100 * b.lo).toFixed(digits)} to ${b.hi === null ? 'n/a' : (100 * b.hi).toFixed(digits)})`);
