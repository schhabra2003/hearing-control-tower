// The web app: one page, no framework, no dependencies. Two things hold all state: the session
// store (the engine, the clock and the log of what happened) and `ui` (what is open on screen).
// Every change re-renders the page from those two.

import { createSession } from './store.js';
import { html, raw, esc, when, plural, READINESS } from './ui.js';
import { boardView, caseDrawer } from './views/board.js';
import { queueView } from './views/queue.js';
import { messagesView } from './views/messages.js';
import { composeView, composeDefaults, senders, PRESETS } from './views/compose.js';
import { countiesView, countyDefaults, parseRules, buildCounty } from './views/counties.js';
import { checksView } from './views/checks.js';
import { howView } from './views/how.js';
import { startView } from './views/start.js';
import { scaleView, scaleDefaults, runScale } from './views/scale.js';
import { moneyView, moneyDefaults, moneyResults, moneyPreset, showValue } from './views/money.js';
import { createWorldKit } from '../eval/world.js';
import { spansFromRecords, toJsonl } from '../src/telemetry.js';
import { probeLive, liveRead } from './live.js';

// "at 9 a.m.." -> "at 9 a.m.": a time that ends a sentence needs no second full stop, wherever the text came from.
const neat = (x) => String(x).split('a.m..').join('a.m.').split('p.m..').join('p.m.');

const TABS = [
  ['start', 'Start here'], ['board', 'Board'], ['queue', 'Work queue'], ['messages', 'Messages'], ['money', 'Business case'], ['scale', 'Scale'],
  ['compose', 'Try a message'], ['counties', 'Counties'], ['checks', 'Checks'], ['how', 'How it works'],
];
// The first six tabs carry the three flows of the Start page. The rest is reference, set apart in the bar.
const MORE_FROM = 'compose';
const VIEWS = { start: startView, board: boardView, queue: queueView, messages: messagesView, compose: composeView, counties: countiesView, scale: scaleView, money: moneyView, checks: checksView, how: howView };
const KEEP_SCROLL = ['#msglist', '.drawer-body'];
const LOGO = '<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect width="32" height="32" rx="7" class="logo-bg"></rect><path class="logo-fg" d="M8 17l5 5 11-12" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

async function loadData() {
  if (window.__DATA__) return window.__DATA__;
  const r = await fetch('/data.json');
  if (!r.ok) throw new Error(`could not load /data.json (status ${r.status})`);
  return r.json();
}

function start(data) {
  const S = createSession(data);
  const kit = createWorldKit({ packet: data.packet, playbooks: data.playbooks, messages: data.messages, gold: data.gold });
  const ui = {
    tab: 'start', boardFilter: 'all', caseId: null,
    queueCase: null, openDrafts: new Set(), focusItem: null, correct: null, showSent: false,
    msgId: null, msgCase: '', msgSearch: '', msgAttention: false,
    compose: composeDefaults(), composeResult: null,
    reader: { info: { live: false, reason: 'checking' }, mode: 'offline', busy: false },
    county: countyDefaults(), countySel: null, countyResult: null, leadResult: null,
    checks: { results: new Map(), running: false, done: false, ms: 0 }, devScore: null, openGroups: new Set(),
    scale: scaleDefaults(data), money: moneyDefaults(), resetArmed: false, toasts: [],
  };
  const app = { S, ui, data, kit };
  let toastSeq = 0, afterRender = [];

  const root = document.getElementById('app');
  root.innerHTML = '<div id="bar"></div><main id="main"></main><div id="toasts" aria-live="polite"></div>';
  const $bar = document.getElementById('bar'), $main = document.getElementById('main'), $toasts = document.getElementById('toasts');

  // ------------------------------------------------------------------ rendering
  function timelineText() {
    const N = S.s.N, k = S.s.cursor;
    if (S.live) return html`All ${N} example messages are read. <b>Live:</b> act, answer for the other side, or move the clock.`;
    const last = k ? S.messages[S.messages.length - 1] : null;
    return html`<b>History view.</b> ${k ? html`After ${plural(k, 'message', 'messages')} of ${N}${last ? html` (the latest is message ${last.id})` : ''}: what the tower knew on ${when(S.now)}.` : 'Before the first message: only the firm’s old case records exist.'} Actions are switched off.`;
  }

  function bar() {
    const live = S.live, N = S.s.N, k = S.s.cursor;
    const todo = S.items.filter((i) => i.phase === 'todo').length;
    const timer = live ? S.nextTimer() : null;
    const off = live ? '' : raw('disabled');
    return html`
    <header class="top">
      <div class="brand">${raw(LOGO)}<div><b>Hearing Control Tower</b><span class="brand-sub">Alice’s Law Firm · working prototype · nothing here is really sent</span></div></div>
      <div class="clock">
        <span class="clock-box" title="The tower’s simulated clock. The example messages end on Friday June 7, 2030."><span class="clock-label">Tower clock</span><b class="clock-now">${when(S.now)}</b></span>
        <button class="btn btn-top" data-action="clock-hour" ${off} title="Move the clock one hour forward.">+1 hour</button>
        <button class="btn btn-top" data-action="clock-morning" ${off} title="Move the clock to 9 a.m. on the next working day.">Next working morning</button>
        <button class="btn btn-top" data-action="clock-timer" ${timer ? '' : raw('disabled')} title="${timer ? `Jump to ${when(timer.at)}: ${timer.why}.` : 'No timer is running.'}">Next timer</button>
        <span class="sep"></span>
        <button class="btn btn-top" data-action="undo" ${S.canUndo ? '' : raw('disabled')} title="Take back the last step and everything it set off.">Undo</button>
        <button class="btn btn-top ${ui.resetArmed ? 'btn-danger' : ''}" data-action="reset" ${live && S.s.log.length ? '' : raw('disabled')} title="Return to the state right after the example messages.">${ui.resetArmed ? 'Click again to reset' : 'Reset'}</button>
      </div>
    </header>
    <div class="timeline ${live ? '' : 'timeline-history'}">
      <span class="timeline-label">Replay the week</span>
      <button class="btn btn-icon" data-action="seek-first" title="Before the first message" aria-label="Before the first message" ${k === 0 ? raw('disabled') : ''}>⏮</button>
      <button class="btn btn-icon" data-action="seek-prev" title="One message back" aria-label="One message back" ${k === 0 ? raw('disabled') : ''}>◀</button>
      <input type="range" min="0" max="${N}" step="1" value="${k}" data-input="seek" aria-label="Position in the example messages">
      <button class="btn btn-icon" data-action="seek-next" title="One message forward" aria-label="One message forward" ${k === N ? raw('disabled') : ''}>▶</button>
      <span class="timeline-pos">${timelineText()}</span>
      ${live ? '' : html`<button class="btn btn-primary" data-action="seek-live">Return to now</button>`}
    </div>
    <nav class="tabs" aria-label="Sections">${TABS.map(([id, label], n) => html`${id === MORE_FROM ? html`<span class="tabsep" aria-hidden="true">More</span>` : ''}<button class="tab ${n >= TABS.findIndex(([x]) => x === MORE_FROM) ? 'tab-more' : ''} ${ui.tab === id ? 'active' : ''}" data-action="nav" data-id="${id}" ${ui.tab === id ? raw('aria-current="page"') : ''}>${label}${id === 'queue' && todo ? html` <span class="count">${todo}</span>` : ''}</button>`)}</nav>`;
  }

  function main() {
    const view = VIEWS[ui.tab] || startView;
    return html`<div class="view view-${ui.tab}">${view(app)}</div>
      ${ui.caseId ? html`<div class="backdrop" data-action="close-drawer"></div>${caseDrawer(app, ui.caseId)}` : ''}`;
  }

  function keepFocus(container, paint) {
    const a = document.activeElement;
    let key = null, sel = null;
    if (a && container.contains(a)) {
      key = a.getAttribute('data-input') ? `[data-input="${a.getAttribute('data-input')}"]` : a.getAttribute('data-change') ? `[data-change="${a.getAttribute('data-change')}"]` : null;
      try { if (typeof a.selectionStart === 'number') sel = [a.selectionStart, a.selectionEnd]; } catch (e) { sel = null; }
    }
    const scroll = KEEP_SCROLL.map((q) => { const el = container.querySelector(q); return el ? el.scrollTop : null; });
    paint();
    KEEP_SCROLL.forEach((q, i) => { const el = container.querySelector(q); if (el && scroll[i] != null) el.scrollTop = scroll[i]; });
    if (key) {
      const el = container.querySelector(key);
      if (el) { el.focus({ preventScroll: true }); try { if (sel && typeof el.setSelectionRange === 'function') el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* this input type has no caret */ } }
    }
  }

  function renderBar() { keepFocus($bar, () => { $bar.innerHTML = neat(bar()); }); }
  function renderMain() {
    keepFocus($main, () => { $main.innerHTML = neat(main()); });
    const todo = afterRender; afterRender = [];
    for (const f of todo) f();
  }
  function renderToasts() {
    $toasts.innerHTML = ui.toasts.map((t) => html`<div class="toast tone-border-${t.tone}" data-action="toast-close" data-id="${t.id}" role="status">${t.text}</div>`).map(neat).join('');
  }
  function render() { renderBar(); renderMain(); }

  function toast(text, tone = 'info') {
    const id = ++toastSeq;
    ui.toasts = [...ui.toasts.slice(-2), { id, text, tone }];
    renderToasts();
    setTimeout(() => { ui.toasts = ui.toasts.filter((t) => t.id !== id); renderToasts(); }, 9000);
  }
  const show = (selector) => afterRender.push(() => { const el = typeof selector === 'string' ? document.querySelector(selector) : selector(); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); });

  const showMsg = () => afterRender.push(() => { const row = document.querySelector('#msglist .msgrow.selected'), list = document.getElementById('msglist'); if (row && list) list.scrollTop = Math.max(0, row.offsetTop - list.offsetTop - 80); });

  function go(tab, { top = true } = {}) {
    if (!VIEWS[tab]) return;
    if (tab !== 'queue') ui.focusItem = null;
    ui.tab = tab;
    try { history.replaceState(null, '', `#${tab}`); } catch (e) { /* some browsers refuse this on file pages */ }
    if (top) window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------ small helpers
  const realMsgId = (id) => { const m = S.messages.find((x) => String(x.id) === String(id)); return m ? m.id : id; };
  const autoText = (n) => (n ? ` ${plural(n, 'automatic follow-up', 'automatic follow-ups')} went out.` : '');
  function changeText(entry) {
    if (!entry) return '';
    const bits = (entry.readinessChanges || []).map((r) => `${r.caseId} is now ${READINESS[r.to].label.toLowerCase()}.`);
    if (entry.attention && entry.attention.length) bits.push('A person needs to read it.');
    return bits.length ? ` ${bits.join(' ')}` : ' Nothing changed on the board.';
  }
  function seek(k) {
    S.seek(k);
    ui.msgId = null; ui.composeResult = null; ui.correct = null; ui.focusItem = null; ui.resetArmed = false;
    if (ui.caseId && !S.view.cases.some((c) => c.id === ui.caseId)) ui.caseId = null;
  }

  async function runChecks() {
    const run = ui.checks;
    if (run.running) return;
    run.results = new Map(); run.running = true; run.done = false;
    const t0 = performance.now();
    renderMain();
    const cache = {};
    for (const p of kit.problems) {
      run.results.set(p.id, kit.runOne(p, cache));
      if (run.results.size % 3 === 0) { if (ui.tab === 'checks') renderMain(); await new Promise((r) => setTimeout(r, 0)); }
    }
    run.running = false; run.done = true; run.ms = performance.now() - t0;
    try { ui.devScore = kit.makeWorld('end').devScore(); } catch (e) { ui.devScore = null; }
    const pass = [...run.results.values()].filter((r) => r.ok).length;
    if (ui.tab === 'checks') renderMain();
    toast(`${pass} of ${run.results.size} checks pass, run in this browser just now.`, pass === run.results.size ? 'good' : 'bad');
  }

  // ------------------------------------------------------------------ actions (clicks)
  const actions = {
    nav: (el) => { go(el.dataset.id); if (el.dataset.id === 'messages') showMsg(); },
    'tour-go': (el) => {
      const after = el.dataset.after;
      if (after) {
        const k = data.messages.findIndex((m) => String(m.id) === after) + 1;
        if (k > 0) { seek(k); toast(`This is the week right after message ${after} arrived. “Return to now” at the top brings back the whole week.`); }
      }
      go(el.dataset.id);
      if (el.dataset.case && S.view.cases.some((c) => c.id === el.dataset.case)) ui.caseId = el.dataset.case;
      if (el.dataset.id === 'messages') showMsg();
    },
    'toast-close': (el) => { ui.toasts = ui.toasts.filter((t) => String(t.id) !== el.dataset.id); renderToasts(); return false; },

    // clock and history
    'clock-hour': () => { S.advance(3600e3); toast(`The clock is now ${when(S.now)}.`); },
    'clock-morning': () => { S.goto(S.nextMorning()); toast(`The clock is now ${when(S.now)}.`); },
    'clock-timer': () => { const t = S.nextTimer(); if (t) { S.goto(t.at); toast(`Moved to ${when(t.at)}: ${t.why}.`); } },
    undo: () => { S.undo(); ui.composeResult = null; ui.countyResult = null; ui.leadResult = null; ui.correct = null; toast('Took back the last step and everything it set off.'); },
    reset: () => {
      if (!ui.resetArmed) { ui.resetArmed = true; setTimeout(() => { if (ui.resetArmed) { ui.resetArmed = false; renderBar(); } }, 4000); return; }
      ui.resetArmed = false; S.reset();
      ui.composeResult = null; ui.countyResult = null; ui.leadResult = null; ui.correct = null; ui.focusItem = null; ui.queueCase = null;
      toast('Back to the state right after the example messages.');
    },
    'seek-first': () => seek(0),
    'seek-prev': () => seek(S.s.cursor - 1),
    'seek-next': () => seek(S.s.cursor + 1),
    'seek-live': () => seek(S.s.N),

    // board and drawer
    'board-filter': (el) => { ui.boardFilter = el.dataset.id; },
    'open-case': (el) => { ui.caseId = el.dataset.id; },
    'close-drawer': () => { ui.caseId = null; },
    'goto-item': (el) => { ui.focusItem = el.dataset.id; ui.queueCase = null; ui.caseId = null; go('queue', { top: false }); show(() => document.getElementById(`item-${el.dataset.id}`)); },
    'queue-case': (el) => { ui.queueCase = el.dataset.id; ui.caseId = null; go('queue'); },

    // messages
    'open-msg': (el) => {
      if (ui.tab !== 'messages') { ui.msgCase = ''; ui.msgSearch = ''; ui.msgAttention = false; }
      ui.msgId = el.dataset.id; ui.caseId = null;
      const away = ui.tab !== 'messages';
      go('messages', { top: away });
      if (away) showMsg();
    },
    'msg-attention': (el) => { ui.msgAttention = el.checked; ui.msgId = null; },

    // work queue
    act: (el) => {
      const r = S.act(el.dataset.id);
      if (!r) return;
      const res = r.result;
      if (!res) toast('Nothing happened.', 'wait');
      else if (res.refused) toast(res.reason, 'bad');
      else toast(`Done: ${res.title}.${autoText(r.auto)}`, 'good');
    },
    reply: (el) => {
      const it = S.items.find((i) => i.key === el.dataset.id);
      const r = it && it.replies ? it.replies[+el.dataset.i] : null;
      if (!r) return;
      const out = S.reply(r.message, r.label);
      if (out) toast(`Answer delivered: “${r.label}”.${changeText(out.result)}${autoText(out.auto)}`);
    },
    goto: (el) => { S.goto(+el.dataset.ts); toast(`Nobody answered. The clock is now ${when(S.now)}.`, 'wait'); },
    'toggle-auto': (el) => { S.setAuto(el.checked); toast(el.checked ? 'Automatic actions go out by themselves again.' : 'Automatic actions now wait in the queue. Nothing is sent without a click.'); },
    step: () => { const r = S.step(); toast(r ? (r.type === 'act' ? `Done: ${r.text}.` : `Answer delivered: “${r.text}”.`) : 'Nothing is left to do right now: every open item is finished, held back, or waits for a timer.', r ? 'good' : 'wait'); },
    play: () => {
      const c = S.playForward();
      const n = c.L2 + c.L1 + c.L0 + c.human;
      toast(n || c.replies ? `Ran to the end: ${plural(n, 'action', 'actions')} (${c.L2} automatic, ${c.L1} one click, ${c.L0} drafted for a person, ${c.human} by a person) and ${plural(c.replies, 'simulated answer', 'simulated answers')}.` : 'Nothing is left to do right now.', 'good');
    },
    'queue-all': () => { ui.queueCase = null; },
    'toggle-draft': (el) => { const k = el.dataset.id; if (ui.openDrafts.has(k)) ui.openDrafts.delete(k); else ui.openDrafts.add(k); },
    'correct-open': (el) => { ui.correct = { msgId: realMsgId(el.dataset.id), type: 'schedule_changed', case: el.dataset.case || '', date: '', time: '', consultant: '' }; },
    'correct-cancel': () => { ui.correct = null; },
    'confirm-held': (el) => {
      const id = realMsgId(el.dataset.id);
      const m = S.messages.find((x) => x.id === id && !x.corrects);
      const held = m && m.reading && m.reading.disputed ? m.reading.disputed.map((d) => d.claim) : [];
      if (!held.length) return;
      const out = S.correct(id, held);
      const entry = out && out.result;
      if (!entry) { toast('That message could not be found.', 'bad'); return; }
      toast(`Confirmed by a person and checked: ${entry.claims.map((c) => c.reason).join(' ')}${changeText(entry)}${autoText(out.auto)}`, entry.claims.some((c) => c.disposition === 'rejected') ? 'bad' : 'good');
    },
    dismiss: (el) => { S.dismiss(el.dataset.id); toast(`Dismissed: ${el.dataset.id}'s saved process stays as it is.`); },

    // try a message
    preset: (el) => {
      const p = PRESETS.find((x) => x.id === el.dataset.id);
      if (!p) return;
      ui.compose = { sender: p.raw.sender, address: p.raw.address || '', channel: p.raw.channel, cases: [...(p.raw.caseIds || [])], body: p.raw.body, claims: p.claims ? JSON.parse(JSON.stringify(p.claims)) : null, presetId: p.id };
      ui.composeResult = null;
      show('form[data-form="compose"]');
    },
    'compose-unforce': () => { ui.compose.claims = null; },
    'reader-mode': (el) => { if (!ui.reader.busy) ui.reader.mode = el.dataset.mode === 'live' && ui.reader.info.live ? 'live' : 'offline'; },

    // counties
    'county-sel': (el) => { ui.countySel = el.dataset.id || null; },
    'county-parse': () => {
      const got = parseRules(ui.county.text);
      Object.assign(ui.county, got);
      const n = Object.keys(got).length;
      toast(n ? `Read the description and filled ${plural(n, 'setting', 'settings')}. Check them before you approve.` : 'Nothing recognised in the description. Fill the settings by hand.', n ? 'good' : 'wait');
    },
    'county-sign': (el) => { ui.county.sign = el.checked; },
    lead: (el) => {
      const hours = +el.dataset.id;
      const dueOf = () => Object.fromEntries(S.view.cases.filter((c) => c.stage === 'upcoming').map((c) => [c.id, c.rule ? c.rule.G4 : null]));
      const before = dueOf();
      S.editDefault({ packet: { lead_hours: hours } });
      const after = dueOf();
      const ids = Object.keys(after);
      ui.leadResult = { changed: ids.filter((id) => before[id] !== after[id]).length, total: ids.length };
    },

    // checks and scale
    'run-checks': () => { runChecks(); return false; },
    'download-trace': () => {
      const text = toJsonl(spansFromRecords(data.recorded || {}));
      const url = URL.createObjectURL(new Blob([text], { type: 'application/x-ndjson' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: 'reader-traces.jsonl' });
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Saved reader-traces.jsonl: one line per model call, no message text.');
      return false;
    },
    'run-scale': () => { runScale(app, renderMain, toast); return false; },
    'scale-preset': (el) => { Object.assign(ui.scale.form, JSON.parse(el.dataset.json || '{}')); },
    'money-preset': (el) => { ui.money = moneyPreset(ui.money, el.dataset.id); },
  };

  // ------------------------------------------------------------------ typing and choosing
  const countyField = (key) => key.slice(7);
  function onInput(el) {
    const key = el.dataset.input;
    if (key === 'seek') { seek(+el.value); renderMain(); const pos = $bar.querySelector('.timeline-pos'), clock = $bar.querySelector('.clock-now'), tl = $bar.querySelector('.timeline'); if (pos) pos.innerHTML = neat(timelineText()); if (clock) clock.textContent = when(S.now); if (tl) tl.classList.toggle('timeline-history', !S.live); return; }
    if (key === 'msg-search') { ui.msgSearch = el.value; ui.msgId = null; renderMain(); return; }
    if (key.startsWith('money-')) {
      // Only the results are redrawn while a slider moves, so the slider is never replaced under the pointer.
      const k = key.slice(6), v = +el.value;
      if (!Number.isFinite(v)) return;
      ui.money[k] = v;
      const out = document.getElementById('money-out'), label = document.querySelector(`[data-value-for="${k}"]`);
      if (label) label.textContent = showValue(k, v);
      if (out) out.innerHTML = neat(moneyResults(ui.money));
      return;
    }
    if (key === 'compose-senderOther') { ui.compose.sender = el.value; ui.compose.presetId = null; return; }
    if (key === 'compose-address') { ui.compose.address = el.value; return; }
    if (key === 'compose-body') { ui.compose.body = el.value; return; }
    if (key.startsWith('county-')) { ui.county[countyField(key)] = el.value; if (key === 'county-name') renderMain(); return; }
    if (key.startsWith('scale-')) { ui.scale.form[key.slice(6)] = el.type === 'number' || el.type === 'range' ? +el.value : el.value; if (el.type === 'range') renderMain(); }
  }
  function onChange(el) {
    const key = el.dataset.change;
    if (el.dataset.input === 'seek') { render(); return; }
    if (!key) return;
    if (key === 'msg-case') { ui.msgCase = el.value; ui.msgId = null; }
    else if (key === 'compose-sender') {
      if (el.value === '__other') { ui.compose.sender = ''; ui.compose.address = ''; }
      else { const hit = senders(S).find((x) => x.name === el.value); ui.compose.sender = el.value; ui.compose.address = hit ? hit.address || '' : ''; }
      ui.compose.presetId = null;
    } else if (key === 'compose-channel') ui.compose.channel = el.value;
    else if (key === 'compose-cases') ui.compose.cases = [...el.selectedOptions].map((o) => o.value);
    else if (key.startsWith('county-')) ui.county[countyField(key)] = key === 'county-lead' ? +el.value : el.value;
    else if (key === 'scale-size') { const [h, c] = el.value.split(':').map(Number); ui.scale.form.hearings = h; ui.scale.form.counties = c; }
    else if (key.startsWith('scale-')) ui.scale.form[key.slice(6)] = el.value;
    render();
  }

  // ------------------------------------------------------------------ forms
  const forms = {
    compose: async () => {
      const f = ui.compose;
      if (!f.body.trim()) { toast('Write the text of the message first.', 'wait'); return; }
      if (!S.live || ui.reader.busy) return;
      const rawMsg = { sender: f.sender.trim() || 'Unknown sender', address: f.address.trim(), channel: f.channel, body: f.body.trim(), caseIds: [...f.cases] };
      // The live AI readers answer in a few seconds. The statements they return are stored with
      // the message, so undo, reset and replay never ask a model again.
      let read = null, waited = false;
      if (ui.reader.mode === 'live' && ui.reader.info.live && !f.claims) {
        waited = true;
        ui.reader.busy = true; render();
        try { read = await liveRead(S, rawMsg); } catch (e) { read = null; toast(`The live readers could not be reached (${e && e.message ? e.message : e}). The offline pattern reader read this message.`, 'bad'); }
        ui.reader.busy = false;
        if (!S.live) { render(); return; }
      }
      const before = new Set(S.items.map((i) => i.key));
      const out = S.send(rawMsg, read ? read.claims : f.claims, read);
      const entry = out && out.result;
      if (!entry) { if (waited) render(); return; }
      ui.composeResult = { msgId: entry.id, newKeys: S.items.filter((i) => !before.has(i.key)).map((i) => i.key), autoSent: out.auto };
      const livePart = read && read.reading ? ` Read live in ${(read.reading.ms / 1000).toFixed(1)} s${read.reading.costUsd ? ` for $${read.reading.costUsd.toFixed(4)}` : ''}.` : '';
      toast(`Delivered as message ${entry.id}.${livePart}${changeText(entry)}${autoText(out.auto)}`);
      if (waited) render();
    },
    correct: (form) => {
      const v = Object.fromEntries(new FormData(form).entries());
      if (!v.case) { toast('Choose the hearing this message is about.', 'wait'); return; }
      const claim = { type: v.type, cases: [v.case] };
      if (v.date) claim.date = v.date;
      if (v.time) claim.time = v.time;
      if (v.consultant) claim.consultant = v.consultant;
      const out = S.correct(realMsgId(form.dataset.id), [claim]);
      const entry = out && out.result;
      ui.correct = null;
      if (!entry) { toast('That message could not be found.', 'bad'); return; }
      const c = entry.claims[0];
      toast(`Entered by a person and checked: ${c ? c.reason : 'no statement'}${changeText(entry)}${autoText(out.auto)}`, c && c.disposition === 'rejected' ? 'bad' : 'good');
    },
    county: () => {
      const f = ui.county;
      if (!S.live || !f.name.trim()) return;
      f.name = f.name.trim();
      const built = buildCounty(f, S);
      S.addCounty({ record: built.record, file: built.file, eligible: built.eligible, cases: built.cases, documents: built.documents });
      const out = S.send(built.notice);
      const pb = S.eng.books[f.name];
      ui.countyResult = { county: f.name, own: pb.own_fields, inherited: pb.inherited_fields, caseId: built.caseId };
      ui.countySel = f.name;
      toast(`${f.name} is live: a county file, one hearing, and the office's first notice.${autoText(out ? out.auto : 0)}`, 'good');
    },
  };

  // ------------------------------------------------------------------ wiring
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const f = actions[el.dataset.action];
    if (!f) return;
    if (el.tagName === 'A') e.preventDefault();
    if (f(el) !== false) render();
  });
  document.addEventListener('input', (e) => { const el = e.target.closest('[data-input]'); if (el) onInput(el); });
  document.addEventListener('change', (e) => { const el = e.target.closest('[data-change], [data-input="seek"]'); if (el) onChange(el); });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const f = forms[form.dataset.form];
    if (f) { f(form); render(); }
  });
  // "toggle" does not bubble, so it is caught on the way down.
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (!d || d.tagName !== 'DETAILS') return;
    if (d.dataset.toggle) ui[d.dataset.toggle] = d.open;
    else if (d.dataset.toggleGroup) { if (d.open) ui.openGroups.add(d.dataset.toggleGroup); else ui.openGroups.delete(d.dataset.toggleGroup); }
    else if (d.classList.contains('draft')) {
      const card = d.closest('article.card');
      if (card && card.id.startsWith('item-')) { const k = card.id.slice(5); if (d.open) ui.openDrafts.add(k); else ui.openDrafts.delete(k); }
    }
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ui.caseId) { ui.caseId = null; renderMain(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr[data-action]')) { e.preventDefault(); e.target.click(); }
  });
  window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (VIEWS[t] && t !== ui.tab) { ui.tab = t; render(); } });

  const first = location.hash.slice(1);
  if (VIEWS[first]) ui.tab = first;
  try { ui.devScore = kit.makeWorld('end').devScore(); } catch (e) { ui.devScore = null; }
  render();
  window.__tower = app;                                    // for the browser console and the automated tests
  // Is a live AI reader there? Only when the page comes from the dev server and that has a key.
  probeLive().then((info) => { ui.reader.info = info || { live: false, reason: 'no-server' }; if (ui.reader.info.live) ui.reader.mode = 'live'; render(); }).catch(() => {});
}

loadData().then(start).catch((e) => {
  document.getElementById('app').innerHTML = `<p class="boot boot-error">The prototype could not start: ${esc(e && e.message ? e.message : e)}</p>`;
  console.error(e);
});
