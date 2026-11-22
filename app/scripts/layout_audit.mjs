// Layout audit: measures how much of each page's width and height the content uses.
// Opens the built file at 1920x1080 and 1440x900, light theme, on every route, and measures:
//   empty  (1) no empty region larger than 240 x 160 px inside the content area above the fold
//              (text, controls, images and progress bars count as content; the largest empty
//              rectangle is found on an 8 px grid);
//   lines  (2) no text block longer than 75 characters per line, and no heading whose last line
//              is a single word;
//   groups (3) buttons in one group share height and baseline; at most one primary button per
//              region; the page header's primary action is its right-most action;
//   scale  (4) spacing on the 8 px scale (0, 4, 8, 12, 16, 24, 32, 48; 1 and 2 px hairlines
//              allowed) and type on the scale (24/32, 16/24, 14/20, 13/18, 28/32);
//   frame  (5) on a page with the five regions: gaps 24, 24, 16; one figure baseline; equal summary
//              cells; list and detail ending on one line; one h1; no horizontal overflow.
// It prints a table (route by size by check) and the first findings of each kind, and exits 1 when
// anything is found.
//     npm run layout                        (after npm run build)
//     ROUTES=/,/hearings SIZES=1920x1080 npm run layout
//     DETAIL=20 npm run layout              (more findings per route and check)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(path.resolve(process.argv[2] || path.join(APP, 'dist', 'index.html'))).href;

const ALL_ROUTES = [
  '/', '/?list=all', '/today/9am', '/today/2pm', '/hearings', '/hearings/AX-107', '/suggestions', '/suggestions/paste',
  '/offices', '/offices/tesswick', '/bench', '/replies', '/calendar', '/integrations', '/integrations/mailbox',
  '/measures', '/evidence', '/how', '/ai', '/agents',
  '/later/board', '/later/queue', '/later/messages', '/later/try', '/later/counties', '/later/scale', '/later/business', '/later/checks', '/later/how', '/consultant/owen-tarris',
];
const ROUTES = process.env.ROUTES ? process.env.ROUTES.split(',') : ALL_ROUTES;
const SIZES = (process.env.SIZES || '1920x1080,1440x900').split(',').map((s) => s.split('x').map(Number));
const DETAIL = Number(process.env.DETAIL || 3);
const CHECKS = ['empty', 'lines', 'groups', 'scale', 'frame'];

/* Runs in the page. Returns { empty, lines, groups, scale, frame }: arrays of finding strings. */
function measure() {
  const out = { empty: [], lines: [], groups: [], scale: [], frame: [] };
  const main = document.querySelector('main');
  if (!main) return { ...out, frame: ['no main landmark'] };
  const W = innerWidth;
  const H = innerHeight;
  const name = (e) => {
    const t = e.getAttribute('data-testid');
    const cls = typeof e.className === 'string' ? e.className.split(' ').filter((c) => c && !c.includes(':') && !c.includes('[')).slice(0, 2).join('.') : '';
    const txt = (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 32);
    return `${e.tagName.toLowerCase()}${t ? `[${t}]` : cls ? `.${cls}` : ''}${txt ? ` "${txt}"` : ''}`;
  };
  const shown = (e) => {
    if (e.closest('.sr-only,.l-sr,[aria-hidden="true"],[hidden]')) return false;
    const s = getComputedStyle(e);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // What a sighted person sees: aria-hidden content (a chart drawn beside its own text alternative,
  // an icon) is still on the screen, so the empty-area check counts it.
  const seen = (e) => {
    if (e.closest('.sr-only,.l-sr,[hidden]')) return false;
    const s = getComputedStyle(e);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  /* (1) the largest empty rectangle in the content area above the fold, on an 8 px grid */
  const area = main.getBoundingClientRect();
  const x0 = Math.max(0, Math.round(area.left));
  const bar = document.querySelector('[data-testid="topbar"]');
  const y0 = Math.max(0, Math.round(area.top), bar ? Math.round(bar.getBoundingClientRect().bottom) : 0);
  const x1 = Math.min(W, Math.round(area.right));
  const y1 = Math.min(H, Math.round(area.bottom));
  const C = 8;
  const cols = Math.max(0, Math.floor((x1 - x0) / C));
  const rows = Math.max(0, Math.floor((y1 - y0) / C));
  const full = Array.from({ length: rows }, () => new Uint8Array(cols));
  const mark = (r) => {
    if (r.width <= 0 || r.height <= 0) return;
    const a = Math.max(0, Math.floor((r.left - x0) / C));
    const b = Math.min(cols - 1, Math.floor((r.right - 1 - x0) / C));
    const c = Math.max(0, Math.floor((r.top - y0) / C));
    const d = Math.min(rows - 1, Math.floor((r.bottom - 1 - y0) / C));
    for (let y = c; y <= d; y += 1) for (let x = a; x <= b; x += 1) full[y][x] = 1;
  };
  // The visible box of an element: clipped by every scrolling or clipping ancestor inside main.
  const clip = (e, r) => {
    let box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY)) {
        const q = p.getBoundingClientRect();
        box = { left: Math.max(box.left, q.left), top: Math.max(box.top, q.top), right: Math.min(box.right, q.right), bottom: Math.min(box.bottom, q.bottom) };
      }
    }
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.right - box.left, height: box.bottom - box.top };
  };
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim() || !n.parentElement || !seen(n.parentElement)) continue;
    const rg = document.createRange();
    rg.selectNodeContents(n);
    for (const r of rg.getClientRects()) mark(clip(n.parentElement, r));
  }
  for (const e of main.querySelectorAll('img,svg,canvas,video,input,select,textarea,button,[role="progressbar"],hr,.l-dot,[data-region="summary"]')) {
    if (seen(e)) mark(clip(e, e.getBoundingClientRect()));
  }
  // Structure counts as content too: hairlines (borders and 1 px shadows) and tinted bands (a group
  // row, a selected row), so a region crossed by a rule is not one empty area.
  const bgOf = (e) => { for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return ''; };
  for (const e of main.querySelectorAll('*')) {
    const r = e.getBoundingClientRect();
    if (r.bottom < y0 || r.top > y1 || r.width < 1 || r.height < 1) continue;
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    const v = clip(e, r);
    const edge = (side, wpx) => {
      if (side === 'top') mark({ left: v.left, right: v.right, top: r.top, bottom: r.top + wpx, width: v.width, height: wpx });
      if (side === 'bottom') mark({ left: v.left, right: v.right, top: r.bottom - wpx, bottom: r.bottom, width: v.width, height: wpx });
      if (side === 'left') mark({ left: r.left, right: r.left + wpx, top: v.top, bottom: v.bottom, width: wpx, height: v.height });
      if (side === 'right') mark({ left: r.right - wpx, right: r.right, top: v.top, bottom: v.bottom, width: wpx, height: v.height });
    };
    for (const side of ['top', 'bottom', 'left', 'right']) {
      const cap = side[0].toUpperCase() + side.slice(1);
      if (parseFloat(s[`border${cap}Width`]) > 0 && s[`border${cap}Style`] !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(s[`border${cap}Color`])) edge(side, 1);
    }
    if (s.boxShadow && s.boxShadow !== 'none') for (const side of ['top', 'bottom', 'left', 'right']) edge(side, 1);
    const bg = s.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && r.height <= 64 && e.parentElement && bgOf(e.parentElement) !== bg) mark(v);
  }
  // Maximal empty rectangle: a histogram per row, then the largest rectangle under each histogram.
  const hist = new Array(cols).fill(0);
  let best = { w: 0, h: 0, x: 0, y: 0, area: 0 };
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) hist[x] = full[y][x] ? 0 : hist[x] + 1;
    const stack = [];
    for (let x = 0; x <= cols; x += 1) {
      const h = x === cols ? 0 : hist[x];
      let start = x;
      while (stack.length && stack[stack.length - 1][1] >= h) {
        const [s, sh] = stack.pop();
        const w = x - s;
        // Only rectangles that break the rule count: both sides over the limit.
        if (w * C > 240 && sh * C > 160 && w * sh > best.area) best = { w: w * C, h: sh * C, x: x0 + s * C, y: y0 + (y - sh + 1) * C, area: w * sh };
        start = s;
      }
      stack.push([start, h]);
    }
  }
  if (best.area) out.empty.push(`empty ${best.w} x ${best.h} px at (${best.x}, ${best.y})`);

  /* (2) line length and single-word last lines in headings */
  const blocks = new Set();
  const walker2 = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = walker2.nextNode(); n; n = walker2.nextNode()) {
    if (!n.textContent.trim() || !n.parentElement) continue;
    let b = n.parentElement;
    while (b && b !== main && /^(inline|contents)$/.test(getComputedStyle(b).display)) b = b.parentElement;
    if (b && b !== main && shown(b)) blocks.add(b);
  }
  const lineChars = (el) => {
    const tops = new Map();
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let budget = 3000;
    for (let n = w.nextNode(); n && budget > 0; n = w.nextNode()) {
      const s = n.textContent;
      for (let i = 0; i < s.length && budget > 0; i += 1, budget -= 1) {
        if (/\s/.test(s[i])) continue;
        const r = document.createRange();
        r.setStart(n, i);
        r.setEnd(n, i + 1);
        const rect = r.getBoundingClientRect();
        if (!rect.width) continue;
        const k = Math.round(rect.top / 4);
        const line = tops.get(k) ?? { n: 0, first: rect.left, last: rect.right };
        line.n += 1;
        line.last = Math.max(line.last, rect.right);
        tops.set(k, line);
      }
    }
    return [...tops.values()];
  };
  for (const b of blocks) {
    const text = b.textContent.trim();
    const heading = /^H[1-6]$/.test(b.tagName);
    if (text.length <= 75 && !heading) continue;
    const r = b.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H) continue;
    if (b.closest('pre,code,table [data-wide],.font-mono')) continue;
    const lines = lineChars(b);
    if (!lines.length) continue;
    // Characters per line, counting the spaces: a line's letters plus its word gaps.
    const longest = Math.max(...lines.map((l) => l.n));
    const words = text.split(/\s+/).length;
    const perLine = Math.round(longest * (1 + (words - 1) / Math.max(1, text.replace(/\s+/g, '').length)));
    if (perLine > 75) out.lines.push(`${perLine} characters per line: ${name(b)}`);
    if (heading && lines.length > 1) {
      const lastWords = (text.split(/\s+/).length);
      const last = lines[lines.length - 1];
      if (lastWords > 1 && last.n <= text.split(/\s+/).pop().length) out.lines.push(`heading ends with one word on its last line: ${name(b)}`);
    }
  }

  /* (3) button groups, one primary per region, primary at the header's right */
  const isButton = (e) => e.tagName === 'BUTTON' || e.hasAttribute('data-variant') || (e.tagName === 'A' && /\b(min-h-8|min-h-10|min-h-12)\b/.test(e.className));
  const isPrimary = (e) => e.getAttribute('data-variant') === 'primary' || (typeof e.className === 'string' && /(^|\s)bg-primary(\s|$)/.test(e.className));
  const parents = new Map();
  for (const e of main.querySelectorAll('button,a')) {
    if (!isButton(e) || !shown(e) || e.closest('table,[role="tablist"],.l-seg,nav,[role="toolbar"] .l-seg')) continue;
    const r = e.getBoundingClientRect();
    if (r.height < 28 || r.width < 32) continue; // icon-size and inline controls are not group buttons
    const p = e.parentElement;
    if (!parents.has(p)) parents.set(p, []);
    parents.get(p).push(e);
  }
  for (const [p, list] of parents) {
    if (list.length < 2) continue;
    const d = getComputedStyle(p);
    if (!/flex|grid/.test(d.display) || (d.display.includes('flex') && d.flexDirection.startsWith('column'))) continue;
    const boxes = list.map((e) => e.getBoundingClientRect());
    const sameRow = boxes.filter((b) => Math.abs(b.top - boxes[0].top) < boxes[0].height);
    if (sameRow.length < 2) continue;
    const hs = new Set(sameRow.map((b) => Math.round(b.height)));
    const bs = new Set(sameRow.map((b) => Math.round(b.bottom)));
    if (hs.size > 1 || bs.size > 1) out.groups.push(`buttons of different height or baseline (${[...hs].join(', ')} px): ${name(p)}`);
  }
  for (const region of main.querySelectorAll('[data-region], section, [role="region"], [role="dialog"]')) {
    if (region.parentElement?.closest('[data-region]') && !region.hasAttribute('data-region')) continue;
    const prim = [...region.querySelectorAll('button,a')].filter((e) => isPrimary(e) && shown(e) && e.closest('[data-region], section, [role="region"], [role="dialog"]') === region);
    if (prim.length > 1) out.groups.push(`${prim.length} primary buttons in one region: ${name(region)}`);
  }
  const head = main.querySelector('[data-region="header"], [data-testid="page-header"]');
  if (head) {
    const acts = [...head.querySelectorAll('button,a')].filter((e) => isButton(e) && shown(e));
    const prim = acts.find(isPrimary);
    if (prim) {
      const right = Math.max(...acts.map((e) => e.getBoundingClientRect().right));
      if (Math.round(prim.getBoundingClientRect().right) < Math.round(right)) out.groups.push(`the header's primary action is not right-most: ${name(prim)}`);
    }
  }

  /* (4) the 8 px scale and the type scale */
  const SPACE = new Set([0, 1, 2, 4, 8, 12, 16, 24, 32, 48]);
  const TYPE = new Set(['24/32', '16/24', '14/20', '13/18', '28/32']);
  const offScale = new Map();
  const offType = new Map();
  const add = (m, k, e) => { if (!m.has(k)) m.set(k, name(e)); };
  for (const e of main.querySelectorAll('*')) {
    const r = e.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H || !shown(e)) continue;
    const s = getComputedStyle(e);
    for (const prop of ['marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'rowGap', 'columnGap']) {
      const v = s[prop];
      if (!v || v === 'normal' || v === 'auto') continue;
      const px = Math.abs(parseFloat(v));
      if (!Number.isFinite(px) || SPACE.has(Math.round(px * 10) / 10)) continue;
      if (/^margin(Left|Right)$/.test(prop) && (s.display === 'block' || s.display === 'flex' || s.display === 'grid')) continue; // auto margins centre a block
      add(offScale, `${prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} ${Math.round(px * 10) / 10}px`, e);
    }
    const own = [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
    if (own && !e.closest('svg')) {
      const fs = Math.round(parseFloat(s.fontSize));
      const lh = s.lineHeight === 'normal' ? 'normal' : Math.round(parseFloat(s.lineHeight));
      const pair = `${fs}/${lh}`;
      if (!TYPE.has(pair)) add(offType, `type ${pair}`, e);
    }
  }
  for (const [k, v] of offScale) out.scale.push(`${k}: ${v}`);
  for (const [k, v] of offType) out.scale.push(`${k}: ${v}`);

  /* (5) the frame of a five-region page */
  const box = (sel) => { const e = main.querySelector(sel); return e ? e.getBoundingClientRect() : null; };
  const hd = box('[data-region="header"]');
  const sm = box('[data-region="summary"]');
  const tb = box('[data-region="toolbar"]');
  const ls = box('[data-region="list"]');
  const dt = box('[data-region="detail"]');
  if (document.querySelectorAll('h1').length !== 1) out.frame.push(`${document.querySelectorAll('h1').length} h1 elements`);
  if (document.documentElement.scrollWidth > W) out.frame.push(`page wider than the window (${document.documentElement.scrollWidth} px)`);
  if (hd && sm && tb && ls) {
    const g = [Math.round(sm.top - hd.bottom), Math.round(tb.top - sm.bottom), Math.round(ls.top - tb.bottom)];
    if (g[0] !== 24 || g[1] !== 24 || g[2] !== 16) out.frame.push(`region gaps ${g.join(', ')} (want 24, 24, 16)`);
  }
  if (sm) {
    const figs = new Set([...main.querySelectorAll('.l-stat .l-figure')].map((e) => Math.round(e.getBoundingClientRect().bottom)));
    const cells = new Set([...main.querySelectorAll('.l-stat')].map((e) => Math.round(e.getBoundingClientRect().height)));
    if (figs.size > 1) out.frame.push(`summary figures on ${figs.size} baselines`);
    if (cells.size > 1) out.frame.push(`summary cells of ${cells.size} heights`);
  }
  if (ls && dt && Math.round(ls.bottom) !== Math.round(dt.bottom)) out.frame.push(`list ends at ${Math.round(ls.bottom)}, detail at ${Math.round(dt.bottom)}`);
  return out;
}

const browser = await chromium.launch();
const table = [];
const details = [];
let total = 0;
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('hd.firstrun.v1', 'skip'); } catch { /* storage blocked */ }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${file}#/?reset=1&theme=light`);
  await page.waitForSelector('[data-testid="app-shell"]');
  for (const r of ROUTES) {
    await page.evaluate((x) => { window.location.hash = x; }, r);
    await page.waitForSelector('main h1', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    const res = await page.evaluate(measure);
    if (errors.length) res.frame.push(`page error: ${errors.splice(0).join(' | ').slice(0, 160)}`);
    const row = { route: r, size: `${w}x${h}` };
    for (const c of CHECKS) {
      row[c] = res[c].length;
      total += res[c].length;
      for (const f of res[c].slice(0, DETAIL)) details.push(`${r} ${w}x${h} ${c}: ${f}`);
      if (res[c].length > DETAIL) details.push(`${r} ${w}x${h} ${c}: and ${res[c].length - DETAIL} more`);
    }
    table.push(row);
  }
  await ctx.close();
}
await browser.close();

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('route', 26)}${pad('size', 11)}${CHECKS.map((c) => pad(c, 8)).join('')}`);
for (const r of table) console.log(`${pad(r.route, 26)}${pad(r.size, 11)}${CHECKS.map((c) => pad(r[c] || '.', 8)).join('')}`);
const sums = Object.fromEntries(CHECKS.map((c) => [c, table.reduce((n, r) => n + r[c], 0)]));
console.log(`${pad('total', 37)}${CHECKS.map((c) => pad(sums[c], 8)).join('')}`);
console.log('');
for (const d of details) console.log(d);
console.log(total ? `\n${total} layout violations on ${ROUTES.length} routes at ${SIZES.map((s) => s.join('x')).join(' and ')}.` : `\n0 layout violations on ${ROUTES.length} routes at ${SIZES.map((s) => s.join('x')).join(' and ')}.`);
process.exitCode = total ? 1 : 0;
