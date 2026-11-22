// Scale: what happens to the work of people when hearings and counties grow. The numbers come
// from a simulation that drives the real engine with a synthetic firm: generated counties,
// consultants, hearings and counterparties who answer, decline, stay silent or change things.
// Every rate and every minute value in it is an estimate, shown as a setting.

import { html, raw, pill, empty, plural } from '../ui.js';
import { makeSyntheticWorld, runSimAsync, SCENARIOS, MINUTES, ONE_CLICK_CLASSES, SAFETY_CHECKS, FAULT_CHECKS, promote } from '../../src/sim.js';

const SIZES = [[100, 10], [300, 15], [1000, 30]];
const one = (x) => (x == null || Number.isNaN(x) ? 'n/a' : x.toFixed(1));
const two = (x) => (x == null || Number.isNaN(x) ? 'n/a' : x.toFixed(2));
const pct = (x, d = 0) => (x == null || Number.isNaN(x) ? 'n/a' : `${(100 * x).toFixed(d)}%`);
const num = (n) => Number(n).toLocaleString('en-US');

export function scaleDefaults() {
  return { form: { hearings: 300, counties: 15, scenario: 'typical', autonomy: 'default', seed: 1 }, runs: [], running: null, error: null };
}

export async function runScale(app, repaint, toast) {
  const sc = app.ui.scale;
  if (sc.running) return;
  const f = { ...sc.form };
  sc.running = { done: 0, total: 1 }; sc.error = null;
  repaint();
  await new Promise((r) => setTimeout(r, 30));
  const t0 = performance.now();
  try {
    const world = makeSyntheticWorld({ base: { packet: app.data.packet, playbooks: app.data.playbooks }, hearings: +f.hearings, counties: +f.counties, weeks: 4, seed: +f.seed, mix: { scenario: f.scenario } });
    const res = await runSimAsync(world, { scenario: f.scenario, autonomy: f.autonomy === 'more' ? promote() : {}, onProgress: (p) => { sc.running = p; if (app.ui.tab === 'scale') repaint(); } });
    sc.runs.unshift({ ...f, ms: performance.now() - t0, res });
    toast(`Simulated ${plural(res.hearings, 'hearing', 'hearings')} in ${((performance.now() - t0) / 1000).toFixed(1)} seconds: ${one(res.perHearing.towerMinutes)} minutes of a person's time per hearing with the tower, ${one(res.perHearing.manualMinutes)} by hand.`, 'good');
  } catch (e) {
    sc.error = String(e && e.message ? e.message : e);
    toast(`The simulation stopped: ${sc.error}`, 'bad');
  }
  sc.running = null;
  repaint();
}

// ---- chart: two lines (with the tower, by hand) over the steps of one experiment.
// Colours are the two first slots of a validated categorical palette (checked for colour-blind
// separation and contrast on this app's light and dark panel). Text never wears the series colour.
function lineChart(rows, xLabel) {
  const pts = rows.map((r) => r._).filter(Boolean);
  if (pts.length < 2) return '';
  const W = 720, H = 268, L = 46, R = 148, T = 14, B = 44;
  const top = Math.max(...pts.map((p) => p.manualHigh));
  const step = top > 60 ? 20 : top > 30 ? 10 : 5;
  const yMax = Math.ceil(top / step) * step;
  const x = (i) => L + (i * (W - L - R)) / (pts.length - 1);
  const y = (v) => T + (H - T - B) * (1 - v / yMax);
  const line = (f) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(f(p)).toFixed(1)}`).join(' ');
  const band = (lo, hi) => `${pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(hi(p)).toFixed(1)}`).join(' ')} ${pts.map((p, i) => [x(i), y(lo(p))]).reverse().map(([a, b]) => `L${a.toFixed(1)},${b.toFixed(1)}`).join(' ')} Z`;
  const ticks = []; for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(v);
  const last = pts[pts.length - 1], xe = x(pts.length - 1);
  const half = Math.max(14, (W - L - R) / (pts.length - 1) / 2);
  const series = [
    { cls: 's2', name: 'By hand', f: (p) => p.manual, lo: (p) => p.manualLow, hi: (p) => p.manualHigh },
    { cls: 's1', name: 'With the tower', f: (p) => p.tower, lo: (p) => p.towerLow, hi: (p) => p.towerHigh },
  ];
  const tip = (p, i) => {
    const tw = 300, th = 64, tx = Math.min(Math.max(x(i) - tw / 2, 2), W - tw - 2), ty = Math.max(y(p.manual) - th - 12, 2);
    return `<g class="tip" transform="translate(${tx.toFixed(1)},${ty.toFixed(1)})"><rect width="${tw}" height="${th}" rx="6"></rect>
      <text x="10" y="18" class="tip-h">${num(xLabel === 'counties' ? p.counties : p.x)} ${xLabel}</text>
      <circle cx="14" cy="34" r="4" class="pt s2"></circle><text x="24" y="38">By hand: ${one(p.manual)} min (${one(p.manualLow)} to ${one(p.manualHigh)})</text>
      <circle cx="14" cy="50" r="4" class="pt s1"></circle><text x="24" y="54">With the tower: ${one(p.tower)} min (${one(p.towerLow)} to ${one(p.towerHigh)})</text></g>`;
  };
  return raw(`<figure class="viz">
    <div class="viz-legend"><span><i class="key s2"></i>By hand</span><span><i class="key s1"></i>With the tower</span><span class="muted">Line: middle estimate of the minutes. Shaded: low to high estimate.</span></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Person-minutes per hearing by ${xLabel}: by hand ${one(pts[0].manual)} to ${one(last.manual)}, with the tower ${one(pts[0].tower)} to ${one(last.tower)}. The table below has every value.">
      ${ticks.map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"></line><text class="axis" x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join('')}
      ${pts.map((p, i) => `<text class="axis" x="${x(i).toFixed(1)}" y="${H - B + 18}" text-anchor="middle">${num(xLabel === 'counties' ? p.counties : p.x)}</text>`).join('')}
      <text class="axis" x="${((L + W - R) / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${xLabel === 'counties' ? 'Counties (same number of hearings)' : 'Hearings in four weeks'}</text>
      ${series.map((s) => `<path class="band ${s.cls}" d="${band(s.lo, s.hi)}"></path>`).join('')}
      ${series.map((s) => `<path class="ln ${s.cls}" d="${line(s.f)}"></path>${pts.map((p, i) => `<circle class="pt ${s.cls}" cx="${x(i).toFixed(1)}" cy="${y(s.f(p)).toFixed(1)}" r="4"></circle>`).join('')}`).join('')}
      ${series.map((s) => `<text class="end" x="${xe + 12}" y="${(y(s.f(last)) + 4).toFixed(1)}">${s.name} ${one(s.f(last))} min</text>`).join('')}
      ${pts.map((p, i) => `<g class="hit"><rect x="${(x(i) - half).toFixed(1)}" y="${T}" width="${(2 * half).toFixed(1)}" height="${H - T - B}"></rect><line class="cross" x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${T}" y2="${H - B}"></line>${tip(p, i)}</g>`).join('')}
    </svg></figure>`);
}

function experiment(e) {
  const cell = (row, c) => (c.key === 'safety' ? pill(row[c.key], row[c.key] === '0' ? 'good' : 'bad')
    : c.key === 'tower' ? html`<b>${row.tower}</b><div class="muted small">${row.towerSpread}</div>`
      : c.key === 'manual' ? html`${row.manual}<div class="muted small">${row.manualSpread}</div>` : row[c.key]);
  return html`<section class="panel">
    <div class="panel-head"><h2>${e.title}</h2></div>
    <p>${e.question}</p>
    ${e.chart ? lineChart(e.rows, e.chart === 'counties' ? 'counties' : 'hearings') : ''}
    <table class="mini scale"><thead><tr>${e.columns.map((c) => html`<th class="${c.num ? 'num' : ''}" title="${c.help || ''}">${c.label}</th>`)}</tr></thead>
      <tbody>${e.rows.map((row) => html`<tr>${e.columns.map((c) => html`<td class="${c.num ? 'num' : ''}">${cell(row, c)}</td>`)}</tr>`)}</tbody></table>
    ${e.note ? html`<p class="muted small">${e.note}</p>` : ''}
  </section>`;
}

// Where the remaining person-minutes go, per world. One hue: every bar is tower time.
const BY = [['calls', 'Phone calls and decisions that only a person makes'], ['approve', 'One-click approvals'], ['draft', 'Sensitive drafts reviewed and sent, statements, signatures'], ['triage', 'Messages the tower could not use'], ['phoneIn', 'Calls from a clerk, answered']];
function whereItGoes(scale) {
  const e = (scale.experiments || []).find((x) => x.id === 'noise');
  if (!e) return '';
  const rows = e.rows.filter((r) => r._ && r._.towerBy);
  const max = Math.max(...rows.flatMap((r) => Object.values(r._.towerBy)));
  return html`<section class="panel">
    <div class="panel-head"><h2>Where the remaining person time goes</h2></div>
    <p>Minutes of a person's time per hearing with the tower, by kind of work, in each world. Reading and writing routine messages is no longer in the list. What is left is what the firm keeps for people on purpose, and chasing those who do not answer.</p>
    <table class="mini scale bars"><thead><tr><th>Kind of work</th>${rows.map((r) => html`<th>${r.first.split(':')[0].replace(' (control)', '')}</th>`)}</tr></thead>
      <tbody>${BY.map(([k, label]) => html`<tr><td>${label}</td>${rows.map((r) => html`<td><div class="barcell" title="${two(r._.towerBy[k])} minutes per hearing"><span>${two(r._.towerBy[k])}</span><i style="width:${Math.max(r._.towerBy[k] > 0 ? 2 : 0, Math.round(110 * r._.towerBy[k] / max))}px"></i></div></td>`)}</tr>`)}
      <tr class="sum"><td><b>All person time, minutes per hearing</b></td>${rows.map((r) => html`<td><b>${one(r._.tower)}</b></td>`)}</tr></tbody></table>
  </section>`;
}

function headline(scale) {
  const t = scale.totals || {};
  const base = (scale.settings || []).find((p) => p.scenario === 'typical' && p.autonomy === 'default' && p.perRun === scale.base.hearings && p.counties === scale.base.counties);
  if (!base) return '';
  const re = (scale.experiments || []).find((e) => e.id === 'reading');
  const rd = re && re._ ? re._ : null;
  const tile = (value, label, sub) => html`<div class="stat"><div class="stat-v">${value}</div><div class="stat-l">${label}</div>${sub ? html`<div class="muted small">${sub}</div>` : ''}</div>`;
  return html`<div class="stats">
    ${rd ? tile(html`${one(rd.low)} to ${one(rd.high)} <span class="muted">vs ${one(base.manual)}</span>`, 'person-minutes per hearing: with the tower, by hand', `With reading as measured on the two labelled sets. It would be ${one(base.tower)} if every message were read without a person, which is what the runs below simulate. Typical world, ${num(base.perRun)} hearings, ${base.countiesMade} counties. The minutes are estimates.`)
      : tile(html`${one(base.tower)} <span class="muted">vs ${one(base.manual)}</span>`, 'person-minutes per hearing: with the tower, by hand', `Typical world, ${num(base.perRun)} hearings, ${base.countiesMade} counties. Estimate range ${one(base.towerLow)} to ${one(base.towerHigh)} vs ${one(base.manualLow)} to ${one(base.manualHigh)}.`)}
    ${rd ? tile(html`${num(Math.round(scale.weekMinutes / rd.high))} to ${num(Math.round(scale.weekMinutes / rd.low))} <span class="muted">vs ${num(Math.round(scale.weekMinutes / base.manual))}</span>`, 'hearings a week one coordinator can carry', 'Estimate: 30 productive hours a week divided by the minutes per hearing.')
      : tile(html`${num(Math.round(scale.weekMinutes / base.tower))} <span class="muted">vs ${num(Math.round(scale.weekMinutes / base.manual))}</span>`, 'hearings a week one coordinator can carry', 'Estimate: 30 productive hours a week divided by the minutes per hearing.')}
    ${tile(String(t.safety), `safety rules broken in ${num(t.hearings)} simulated hearings`, `${(t.safetyRules || []).length} rules checked after every step of ${t.runs} runs. Measured.`)}
    ${tile(pct(base.readyRate, 1), 'of hearings held with all five gates closed', `Typical world. ${pct(base.coveredRate, 1)} had a committed consultant. The others were shown as open before they started.`)}
  </div>`;
}

function runRow(r) {
  const x = r.res, p = x.perHearing;
  const saved = p.manualMinutes ? 1 - p.towerMinutes / p.manualMinutes : null;
  return html`<tr>
    <td><b>${num(x.hearings)}</b> hearings<div class="muted small">${x.meta.counties} counties · ${x.meta.consultants} consultants</div></td>
    <td>${SCENARIOS[r.scenario].label.split(':')[0]}<div class="muted small">${r.autonomy === 'more' ? 'one-click classes automatic' : 'as shipped'} · seed ${r.seed}</div></td>
    <td class="num"><b>${one(p.towerMinutes)}</b> min<div class="muted small">by hand: ${one(p.manualMinutes)} min</div></td>
    <td class="num">${saved == null ? 'n/a' : pct(saved)}</td>
    <td class="num">${two(p.humanTouches)}<div class="muted small">of ${one(p.outbound)} messages out</div></td>
    <td class="num">${pct(x.rates.automaticShare)}</td>
    <td class="num">${pct(x.rates.ready, 1)}<div class="muted small">${x.ready} of ${x.held} held</div></td>
    <td class="num">${pct(x.rates.covered, 1)}</td>
    <td class="num">${pill(String(x.safetyViolations), x.safetyViolations ? 'bad' : 'good')}<div class="muted small">faults: ${x.faults}</div></td>
    <td class="num muted">${(r.ms / 1000).toFixed(1)} s</td>
  </tr>`;
}

const MIN_ROWS = [
  ['approve', 'One click: read a prepared message and send it', 'tower'],
  ['draft', 'Sensitive draft: a person reviews it and sends it personally', 'tower'],
  ['triage', 'Read a message the tower could not use, with its context on screen', 'tower'],
  ['statement', 'Get a statement from the homeowner and send it', 'both'],
  ['phoneIn', 'A clerk phones: answer and log it', 'both'],
  ['readRoutine', 'Read a routine message and update the record', 'hand'],
  ['readException', 'Read an exception and work out what it means', 'hand'],
  ['write', 'Write a message', 'hand'],
];
const HUMAN_ROWS = [['follow_up_call', 'Call someone who did not answer'], ['call_office', 'Call an office'], ['homeowner', 'Call a homeowner'], ['find_out', 'Find out what happened at a hearing'], ['playbook', "Review a change to a county's process"], ['escalate', 'Find a consultant by phone when nobody is available'], ['reinstate', 'Ask an office to put a hearing back']];

export function scaleView({ ui, data }) {
  const sc = ui.scale, f = sc.form, S = data.scale;
  const where = { tower: 'with the tower', hand: 'by hand', both: 'both' };
  const exp = (id) => ((S && S.experiments) || []).filter((e) => e.id === id).map(experiment);
  return html`
  <section class="panel">
    <div class="panel-head"><h2>More hearings, more counties, the same people</h2></div>
    <p>The firm asked how the approach handles more hearings and different local processes without adding the same amount of human work. This page answers with a measurement. A synthetic firm of any size is generated, and the <b>real engine</b> (the same reader, checks, record, planner and drafts as on the other pages) runs every hearing from the first notice to the outcome, against simulated offices, consultants and homeowners who answer, decline, stay silent or change things.</p>
    <p class="muted small"><b>Measured:</b> how many actions needed a person, and how many broke a rule. <b>Estimated:</b> how often each surprise happens (the four worlds) and how many minutes each kind of work takes (the table at the bottom, with a low and a high set). The simulated people write in wording the offline reader is known to read, so reading is outside the runs. It is measured on the Checks page, and the table "What reading adds" below puts it back in.</p>
    ${S ? headline(S) : ''}
  </section>

  ${S ? html`
    ${exp('volume')}
    ${exp('counties')}
    ${exp('noise')}
    ${whereItGoes(S)}
    ${exp('autonomy')}
    <section class="panel">
      <div class="panel-head"><h2>What the runs show, and what they do not</h2></div>
      <div class="split"><div><h3>They show</h3><ul class="tight">${(S.findings || []).map((t) => html`<li>${t}</li>`)}</ul></div>
      <div><h3>They do not show</h3><ul class="tight">${(S.limits || []).map((t) => html`<li>${t}</li>`)}</ul></div></div>
      <p class="muted small">${S.generated} Rules checked after every step: ${SAFETY_CHECKS.length} safety rules and ${FAULT_CHECKS.length} outcome faults. Reproduce with <code>node cli/scale.js</code>.</p>
    </section>` : html`<section class="panel">${empty('No recorded runs in this build. Run node cli/scale.js to create them, or use the form below.')}</section>`}

  <section class="panel">
    <div class="panel-head"><h2>Run it yourself, in this browser</h2></div>
    <div class="formrow">
      <label>Size <select data-change="scale-size">${SIZES.map(([h, c]) => html`<option value="${h}:${c}" ${+f.hearings === h ? raw('selected') : ''}>${num(h)} hearings in ${c} counties</option>`)}</select></label>
      <label>World <select data-change="scale-scenario">${Object.entries(SCENARIOS).map(([k, v]) => html`<option value="${k}" ${f.scenario === k ? raw('selected') : ''}>${v.label}</option>`)}</select></label>
      <label>Autonomy <select data-change="scale-autonomy"><option value="default" ${f.autonomy === 'default' ? raw('selected') : ''}>As shipped: a person approves each one-click action</option><option value="more" ${f.autonomy === 'more' ? raw('selected') : ''}>Later: the ${ONE_CLICK_CLASSES.length} one-click classes go out by themselves</option></select></label>
      <label>Seed <input type="number" min="1" max="9999" data-input="scale-seed" value="${f.seed}" style="width:5.5rem"></label>
      <button class="btn btn-primary" data-action="run-scale" ${sc.running ? raw('disabled') : ''}>${sc.running ? `Running… part ${sc.running.done} of ${sc.running.total}` : 'Run the simulation'}</button>
    </div>
    <p class="muted small">Same seed, same world, same result. Expect about three seconds for every hundred hearings; the page stays usable while it runs.</p>
    ${sc.error ? html`<p class="notice tone-border-bad">The simulation stopped: ${sc.error}</p>` : ''}
    ${sc.runs.length ? html`<table class="mini scale"><thead><tr>
      <th>Size</th><th>World</th><th class="num" title="Minutes of a person's time per hearing, with the tower. Below it: the same hearings handled by hand, counted with the same minute values.">Person-minutes per hearing</th>
      <th class="num">Less</th><th class="num" title="Things a person approved, sent, read or did, per hearing.">Things a person does per hearing</th><th class="num" title="Share of all outgoing messages that needed no person.">Sent with no person</th>
      <th class="num" title="Hearings that were held with all five gates closed, of all hearings held.">Ready when held</th><th class="num" title="Hearings held with a committed consultant.">Consultant committed</th>
      <th class="num" title="Safety rules: a hearing shown ready without the authority's evidence, an automatic message to a homeowner, routine work on a closed hearing, a message dropped without a task, and three more. Faults: a consultant held twice at one time or after reporting sick, a message sent again while waiting, a hearing that is not ready with nothing queued.">Safety rules broken</th><th class="num">Run time</th></tr></thead>
      <tbody>${sc.runs.map(runRow)}</tbody></table>` : empty('No runs yet. Try 300 hearings, then 1,000, and compare the first column.')}
  </section>

  <section class="panel">
    <div class="panel-head"><h2>The estimates behind the minutes</h2></div>
    <div class="split">
      <table class="mini"><thead><tr><th>Kind of work</th><th>Counted</th><th class="num">Low</th><th class="num">Middle</th><th class="num">High</th></tr></thead><tbody>
        ${MIN_ROWS.map(([k, label, w]) => html`<tr><td>${label}</td><td class="muted">${where[w]}</td><td class="num">${MINUTES.low[k]}</td><td class="num"><b>${MINUTES.mid[k]}</b></td><td class="num">${MINUTES.high[k]}</td></tr>`)}
      </tbody></table>
      <table class="mini"><thead><tr><th>Only a person does these, in both worlds</th><th class="num">Low</th><th class="num">Middle</th><th class="num">High</th></tr></thead><tbody>
        ${HUMAN_ROWS.map(([k, label]) => html`<tr><td>${label}</td><td class="num">${MINUTES.low.human[k]}</td><td class="num"><b>${MINUTES.mid.human[k]}</b></td><td class="num">${MINUTES.high.human[k]}</td></tr>`)}
      </tbody></table>
    </div>
    <p class="muted small">These are the author's estimates, not measurements of the firm. The first thing to do in a pilot is to replace them with the firm's own timings. The comparison between sizes does not depend on them: it depends on how many actions need a person, which is counted, not estimated.</p>
  </section>`;
}
