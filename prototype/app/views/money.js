// Business case: what one hearing earns and costs, what the change is worth, and at what volume
// each way of building it pays for itself. Every figure comes from src/economics.js. Nothing here
// was measured at the firm, so every input is a slider with its basis next to it.

import { html, raw, pill } from '../ui.js';
import { INPUTS, OPERATIONAL, PEAK_WEEKS, businessCase, threeCases, criticsMath, feeRange, missTable, defaults, usd, count } from '../../src/economics.js';

const GROUPS = [
  ['The firm', ['hearingsPerYear', 'firstYearSaving', 'winRate', 'feeShare', 'consultantFee']],
  ['The work today', ['coordinatorRate', 'productiveHours', 'minutesByHand', 'missToday', 'lossGivenMiss', 'laterYears']],
  ['What the standing control achieves, and costs, without software', ['missAvoided', 'kitMinutes', 'blockDiscount', 'blockShare']],
  ['What the tower adds', ['reduction']],
  ['The season', ['peakShare', 'hearingsPerConsultantDay']],
];
const BASIS = {
  sourced: ['Sourced', 'info'], packet: ['Example packet', 'muted'], simulated: ['Simulated', 'info'],
  estimate: ['Estimate', 'wait'], unknown: ['Only the firm knows', 'bad'],
};
const BY_KEY = Object.fromEntries(INPUTS.map((i) => [i.key, i]));
const pct = (x, d = 0) => `${(100 * x).toFixed(d)}%`;

export function moneyDefaults() { return defaults(); }

// Cautious and hopeful move only what the change achieves and what the work costs today. The
// firm's own figures (volume, fee, consultant cost, season) stay as the visitor set them.
export function moneyPreset(m, id) {
  if (id === 'reset') return defaults();
  const which = id === 'cautious' ? 'low' : id === 'hopeful' ? 'high' : 'value';
  const next = { ...m };
  for (const i of INPUTS) if (OPERATIONAL.includes(i.key)) next[i.key] = i[which];
  return next;
}

export function showValue(key, v) {
  const i = BY_KEY[key];
  if (i.unit === 'usd') return usd(v, Number.isInteger(v) ? 0 : 2);
  if (i.unit === 'pct') return pct(v, Math.abs(v * 100 - Math.round(v * 100)) > 1e-9 ? 2 : 0);
  if (i.unit === 'min') return `${(+v).toFixed(1)} min`;
  if (i.unit === 'h') return `${v} hours`;
  if (i.unit === 'yr') return `${v} ${+v === 1 ? 'year' : 'years'}`;
  return count(v);
}

const slider = (key, m) => {
  const i = BY_KEY[key], [basis, tone] = BASIS[i.basis];
  return html`<div class="moneyrow">
    <label for="money-${key}">${i.label}</label>
    <output data-value-for="${key}">${showValue(key, m[key])}</output>
    <input id="money-${key}" type="range" min="${i.min}" max="${i.max}" step="${i.step}" value="${m[key]}" data-input="money-${key}" aria-describedby="money-note-${key}">
    <p class="muted small" id="money-note-${key}">${pill(basis, tone)} ${i.note}</p>
  </div>`;
};

// The right-hand side. Rendered by itself while a slider moves, so the slider is never replaced
// under the pointer.
export function moneyResults(m) {
  const b = businessCase(m), t = threeCases(m), c = criticsMath();
  const VOL = [300, 1000, 5000].map((v) => businessCase({ ...m, hearingsPerYear: v }));
  const lean = b.builds.find((x) => x.key === 'lean'), leanHi = b.builds.find((x) => x.key === 'leanHigh'), p0 = b.builds.find((x) => x.key === 'phase0');
  const engLo = b.builds.find((x) => x.key === 'engineerLow'), engHi = b.builds.find((x) => x.key === 'engineerHigh');
  const H = b.input.hearingsPerYear;
  const verdict = (x) => (x.pays ? pill('Pays at this volume', 'good') : pill('Does not pay in dollars', 'bad'));
  const span = (lo, hi) => (hi.pays ? pill('Pays at this volume', 'good') : lo.pays ? pill('Borderline', 'wait') : pill('Does not pay yet', 'bad'));
  const be = (c2, key) => c2.builds.find((x) => x.key === key).breakEven;
  const three = (key) => html`${count(be(t.hopeful, key))} to ${count(be(t.cautious, key))}`;
  const fr = feeRange(m), mt = missTable(m);
  const under = b.fee <= b.costToday;
  const mins = (x) => (Number.isFinite(x) ? x.toFixed(0) : 'no number of');
  const fewer = b.peak.coordinatorsToday - b.peak.coordinatorsAfter;
  const equal = b.missRateWhereRevenueEqualsTime;
  return html`
  <div class="stats">
    <div class="stat"><div class="stat-v">${usd(b.costToday, 0)} <span class="muted">to ${usd(b.costKit, 0)} to ${usd(b.costAfter, 0)}</span></div><div class="stat-l">cost per hearing: today, with the standing control, with the tower</div><div class="muted small">Consultant ${usd(b.input.consultantFee, 2)} (${pct(b.consultantShareOfCost)} of the cost)${b.blockValue > 0 ? html`, falling to ${usd(b.consultantKit, 2)} on a block rate` : ''}. Coordination ${usd(b.coordToday, 2)} today, ${usd(b.coordKit, 2)} with the control, ${usd(b.coordAfter, 2)} with the tower. None of it depends on the fee.</div></div>
    <div class="stat"><div class="stat-v">${usd(b.kitValue, 2)} <span class="muted">and ${usd(b.towerVsToday, 2)}</span></div><div class="stat-l">per hearing: the standing control, and the tower against today’s process</div><div class="muted small">Control: ${usd(b.missMargin, 2)} from misses prevented${b.blockValue > 0 ? html`, ${usd(b.blockValue, 2)} from a block rate` : ''}, less ${usd(b.kitWork, 2)} to keep it. Tower: ${b.minutesSavedVsToday.toFixed(1)} of today’s ${(+b.input.minutesByHand).toFixed(1)} minutes.</div></div>
    <div class="stat"><div class="stat-v">${usd(b.feeLostThisYear, 0)} <span class="muted">to ${usd(b.feeLostPerMiss, 0)}</span></div><div class="stat-l">fees lost with one missed hearing: this year, and with later years</div><div class="muted small">${pct(b.input.lossGivenMiss)} of this year’s fee, and ${b.input.laterYears} later ${+b.input.laterYears === 1 ? 'year' : 'years'} on average. The client loses about ${usd(b.input.lossGivenMiss * b.clientSaving, 0)}. At ${pct(b.input.missToday, 1)} missed that is ${count(b.year.missedToday)} hearings and ${usd(b.year.feesLostToMisses)} a year.</div></div>
    <div class="stat"><div class="stat-v">${b.peak.coordinatorsToday.toFixed(1)} <span class="muted">and ${count(b.peak.consultants)}</span></div><div class="stat-l">coordinators and consultants a peak week needs today</div><div class="muted small">${count(b.peak.hearingsAWeek)} hearings in a peak week. Coordinators: ${b.peak.coordinatorsKit.toFixed(1)} with the control, ${b.peak.coordinatorsAfter.toFixed(1)} with the tower (${count(b.peak.perCoordinatorToday)}, ${count(b.peak.perCoordinatorKit)} and ${count(b.peak.perCoordinatorAfter)} hearings a week each). Consultants: ${count(b.peak.consultantDaysAWeek)} consultant-days at ${b.input.hearingsPerConsultantDay} hearings a day. At 12 a day, which a stacked video docket allows, it is ${Math.ceil(b.peak.consultantsAt[12])} consultants.</div></div>
  </div>
  <p class="notice tone-border-wait"><b>What a hearing earns is the weakest figure on this page.</b> The public saving (${usd(b.input.firstYearSaving)}) is one company’s average per customer, not per hearing, and most cases never reach a hearing. Public figures bracket the fee per hearing between ${usd(fr[0], 0)} and ${usd(fr[2], 0)}. With the sliders as set it is ${usd(b.fee, 2)}, ${under ? html`which does not cover the ${usd(b.costToday, 2)} a hearing costs: on these figures every hearing loses ${usd(-b.marginToday, 2)}. That can be true and the firm still healthy, because a hearing is a cost inside a customer’s case and most cases settle before one` : html`against a cost of ${usd(b.costToday, 2)}`}. The fee per hearing, and the share of cases that reach one, are the first numbers to take from the firm’s accounts. The cost side below does not depend on them.</p>
  ${b.kitValue < 0 ? html`<p class="notice tone-border-wait"><b>The standing control is not a saving on missed hearings alone.</b> With the sliders as set it costs ${usd(-b.kitValue, 2)} a hearing, ${usd(-b.year.kitValue)} a year: its four checks take ${(+b.input.kitMinutes).toFixed(1)} extra minutes, and the misses it prevents bring back ${usd(b.year.missMargin)}. On misses it pays for itself only if a missed hearing costs the firm more than about ${usd(b.missCostRange.control, 0)} all in, against ${usd(b.feeLostPerMiss, 0)} in fees (${usd(b.missCostRange.ifWorse, 0)} if 5% are missed and half prevented, ${usd(b.missCostRange.ifBetter, 0)} at 1% and 13%). <b>It would pay if a consultant with the current file and the right date wins ${b.winPoint.controlPaysAt.toFixed(1)} points more often</b>: one point of win rate is ${usd(b.winPoint.yearFirm)} a year to the firm and ${usd(b.winPoint.yearClient)} to its clients. A difference that small needs about 60,000 hearings in each group to detect, so the plan does not rely on it: the control is recommended as the firm’s duty to clients it promised to represent, and as cheap insurance. The full five-gate sheet takes about 4 minutes and needs ${b.winPoint.fullSheetPaysAt.toFixed(1)} points, so it runs as a pilot in one county first.</p>` : ''}

  <h3>What pays for itself, and from how many hearings a year</h3>
  <div class="tablewrap"><table class="mini money"><thead><tr><th>Way to do it</th><th class="num">Cost a year</th><th class="num">Worth per hearing</th><th class="num">Pays from</th><th class="num">Hopeful to cautious</th><th>At ${count(H)} hearings</th></tr></thead><tbody>
    <tr><td><b>The standing control</b>, no software<div class="muted small">${p0.note}</div></td><td class="num">${usd(p0.yearly)}</td><td class="num">${usd(p0.perHearing, 2)}</td><td class="num"><b>${count(p0.breakEven)}</b></td><td class="num">${three('phase0')}</td><td>${verdict(p0)}</td></tr>
    <tr><td><b>Lean build</b> of the tower<div class="muted small">${lean.note} ${usd(leanHi.yearly)} once shadowing and season support are counted.</div></td><td class="num">${usd(lean.yearly)} to ${usd(leanHi.yearly)}</td><td class="num">${usd(lean.perHearing, 2)}</td><td class="num"><b>${count(lean.breakEven)} to ${count(leanHi.breakEven)}</b></td><td class="num">${count(be(t.hopeful, 'lean'))} to ${count(be(t.cautious, 'leanHigh'))}</td><td>${span(lean, leanHi)} <span class="muted small">${usd(lean.net)} to ${usd(leanHi.net)} a year</span></td></tr>
    <tr><td><b>A dedicated engineer</b><div class="muted small">Loaded cost ${usd(engLo.yearly)} to ${usd(engHi.yearly)}.</div></td><td class="num">${usd(engLo.yearly)} to ${usd(engHi.yearly)}</td><td class="num">${usd(engLo.perHearing, 2)}</td><td class="num"><b>${count(engLo.breakEven)} to ${count(engHi.breakEven)}</b></td><td class="num">${count(be(t.hopeful, 'engineerLow'))} to ${count(be(t.cautious, 'engineerHigh'))}</td><td>${span(engLo, engHi)}</td></tr>
  </tbody></table></div>
  <p class="notice"><b>The build decision as one number.</b> At ${count(H)} hearings a year the lean build pays only if it <b>removes ${mins(b.decision.removeLow)} to ${mins(b.decision.removeHigh)} coordinator-minutes a hearing</b>. All coordination today is ${(+b.input.minutesByHand).toFixed(1)} minutes by a desk estimate from the example week and 37.5 in my simulation, so the answer turns on a number nobody has. At the desk estimate the lean build nets ${usd(b.towerRange.netAtDesk[0])} to ${usd(b.towerRange.netAtDesk[1])} a year; at the simulation’s ${b.towerRange.simMinutes} minutes it nets ${usd(b.towerRange.netAtSim[0])} to ${usd(b.towerRange.netAtSim[1])}. <b>In cash</b> the tower saves ${usd(b.cash.towerYear)} a year, the seasonal coordinators not hired for the peak: on that figure the lean build nets ${usd(b.cash.towerNet[0])} to ${usd(b.cash.towerNet[1])} and pays from ${count(b.cash.towerPaysFrom[0])} to ${count(b.cash.towerPaysFrom[1])} hearings a year. My recommendation is not to build this season, and the firm’s payroll settles the rest. It comes top-down from the firm’s own hours: coordinator hours paid in last season’s busiest weeks, divided by the hearings held. What the software leaves comes from a read-only run beside the sheet, not from my simulation. With the share set on the left (${pct(b.input.reduction)}) the same rule reads: more than ${mins(b.decision.leanLow)} to ${mins(b.decision.leanHigh)} minutes a hearing today.</p>
  <p class="muted small">"Pays from" is the yearly cost divided by what that step is worth per hearing. The control is measured against the misses it prevents, less the minutes it takes, plus a block rate only once one is agreed. The software is measured against the minutes it removes from today’s process: it is not credited with removing the control’s extra minutes, and not with the misses, because the control already prevents those. "Hopeful to cautious" moves the eleven inputs about the work and the changes to both ends at once and keeps the firm’s fee, consultant cost and volume as set. "never" means that step is worth nothing in dollars at that end.</p>

  <h3>The plan at three volumes</h3>
  <p class="muted small">The case gives no yearly volume. The plan is written for about 300 hearings a year, which is what the example week implies; 1,000 and 5,000 test how it scales. The same model is shown at all three with your other inputs. Settling before a consultant is booked is unproven and not counted: it pays only above ${b.settle.breakEvenPoints.toFixed(1)} points, net of a ${b.settle.callMinutes}-minute call on every scheduled hearing.</p>
  <div class="tablewrap"><table class="mini money"><thead><tr><th>Hearings a year</th>${VOL.map((x) => html`<th class="num">${count(x.input.hearingsPerYear)}</th>`)}</tr></thead><tbody>
    ${[
      ['Hearings in a peak week', (x) => count(x.peak.hearingsAWeek)],
      ['Names on the bench at two days a week each, at 1.6 (today), 2.4 (the target) and 2.8 hearings a day', (x) => [1.6, 2.4, 2.8].map((d) => x.bench.names[d]).join(', ')],
      ['Coordinators a peak week needs: today, with the four checks by hand, with the tower', (x) => [x.peak.coordinatorsToday, x.peak.coordinatorsKit, x.peak.coordinatorsAfter].map((c) => c.toFixed(1)).join(', ')],
      ['The four checks cost, a year', (x) => usd(x.year.kitWork)],
      ['Missed hearings they prevent, a year', (x) => usd(x.year.missMargin)],
      ['Ten points more of scheduled hearings settled before booking, net of the call', (x) => usd(x.settle.netAt10)],
      ['The tower saves, in coordinator time and in cash', (x) => `${usd(x.towerRange.year[0])}, ${usd(x.cash.towerYear)}`],
      ['Cash a peak ties up, if fees arrive 12 weeks after the hearing', (x) => usd(x.cash.need)],
    ].map(([label, f]) => html`<tr><td>${label}</td>${VOL.map((x) => html`<td class="num">${f(x)}</td>`)}</tr>`)}
  </tbody></table></div>
  <h3>What the software is worth depends on how the peak is staffed</h3>
  <div class="tablewrap"><table class="mini money"><tbody>
    <tr><td>Coordinators paid for the hours worked, at ${b.input.productiveHours} productive hours in 40 <span class="muted">(the table above)</span></td><td class="num"><b>${usd(b.year.towerVsToday)}</b> a year</td></tr>
    <tr><td>Seasonal coordinators for the ${PEAK_WEEKS} peak weeks: ${fewer.toFixed(1)} fewer to hire and train each spring</td><td class="num"><b>${usd(b.peak.seasonalSaving)}</b> a year</td></tr>
    <tr><td class="muted">A what-if, not part of the case: ${b.peak.coordinatorsToday.toFixed(1)} coordinators kept all year for the peak. Coordination would then cost ${usd(b.peak.permanentCoordinationPerHearingToday, 2)} a hearing today, not ${usd(b.coordToday, 2)}, and ${fewer.toFixed(1)} fewer people would be worth</td><td class="num muted">${usd(b.peak.permanentSaving)} a year</td></tr>
  </tbody></table></div>
  <p class="muted small">People are not hired in minutes. Against the lean build’s ${usd(lean.yearly)} to ${usd(leanHi.yearly)} a year, the first two rows do not pay at this volume unless the minutes are higher than estimated. The third row is there because some firms do keep a peak-sized team all year: if this one does, its real cost per hearing is far above the table at the top, and the question to ask is how the firm staffs May to August.</p>

  <h3>Which lever is worth what, per hearing</h3>
  <div class="tablewrap"><table class="mini money"><tbody>
    <tr><td><b>Settle before a consultant is booked.</b> Every 10% of hearings settled with the office before a consultant is booked <span class="muted">(the plan keeps a person in the room at every hearing that is held)</span></td><td class="num"><b>${usd(b.attendance.tenthOnPaper, 2)}</b></td></tr>
    <tr><td class="muted">Sending a consultant pays the firm alone only where it raises the chance of a reduction by ${b.attendance.pointsNeeded.toFixed(0)} points at a 25% fee share (${b.attendance.pointsRange[1].toFixed(0)} at a 50% share). The client keeps most of the saving, so on the client’s and the firm’s money together the bar is about ${b.attendance.pointsOnWholeSaving.toFixed(0)} points. Between the two the firm would gain by staying away and the client would lose more, which is why no hearing goes without a person this season.</td><td class="num muted">${b.attendance.pointsOnWholeSaving.toFixed(0)} to ${b.attendance.pointsNeeded.toFixed(0)} points</td></tr>
    <tr><td><b>Who that person is.</b> The firm’s own seasonal representatives on video dockets in the peak, at ${usd(b.inHouse.hourly)} an hour all in and ${b.inHouse.perDay[0]} to ${b.inHouse.perDay[1]} hearings a day, cost ${usd(b.inHouse.perHearing[0], 0)} to ${usd(b.inHouse.perHearing[1], 0)} a hearing <span class="muted">(an illustration: the wage is not known, and each state decides who may appear. On half of the peak’s video hearings, ${count(b.inHouse.hearings)} a year, that is ${usd(b.inHouse.year[0])} to ${usd(b.inHouse.year[1])}, with ${b.inHouse.people[0].toFixed(1)} to ${b.inHouse.people[1].toFixed(1)} people. The plan does not ask contractors for a lower price.)</span></td><td class="num"><b>${usd(b.inHouse.saving[0], 2)} to ${usd(b.inHouse.saving[1], 2)}</b></td></tr>
    <tr><td>Time removed by the tower: ${b.minutesSavedVsToday.toFixed(1)} of today’s ${(+b.input.minutesByHand).toFixed(1)} minutes at ${usd(b.perMinute * 60, 2)} a productive hour</td><td class="num"><b>${usd(b.towerVsToday, 2)}</b></td></tr>
    <tr><td>Misses prevented: ${pct(b.missesAvoided, 2)} of hearings, after paying the consultant who now attends</td><td class="num"><b>${usd(b.missMargin, 2)}</b></td></tr>
    <tr><td class="muted">The same as fee income kept, and what the firm’s clients keep</td><td class="num">${usd(b.missRevenue, 2)} and ${usd(b.missClient, 2)}</td></tr>
    <tr><td>Keeping the control: ${(+b.input.kitMinutes).toFixed(1)} extra minutes a hearing</td><td class="num"><b>${usd(-b.kitWork, 2)}</b></td></tr>
    <tr><td>A flat discount for consultants: ${pct(b.input.blockDiscount)} off ${usd(b.input.consultantFee, 2)} on ${pct(b.input.blockShare)} of hearings <span class="muted">(a slider: not counted until agreed in writing)</span></td><td class="num"><b>${usd(b.blockValue, 2)}</b></td></tr>
    <tr><td>The consultant fee, for comparison: the largest cost of a hearing</td><td class="num"><b>${usd(b.input.consultantFee, 2)}</b> <span class="muted">(${pct(b.consultantShareOfCost)} of the cost)</span></td></tr>
  </tbody></table></div>

  <h3>What preventing misses is worth: three things nobody here knows</h3>
  <div class="tablewrap"><table class="mini money"><thead><tr><th>Missed today</th><th>Prevented by the gates</th>${fr.map((x) => html`<th class="num">Fee ${usd(x, 0)}</th>`)}</tr></thead><tbody>
    ${mt.map((r, n) => html`<tr><td>${pct(r.missToday)} <span class="muted">${n === 2 ? '(if the count is worse)' : '(my guess)'}</span></td><td>${pct(r.missAvoided)} <span class="muted">${r.missAvoided <= 0.25 ? '(what reminder trials support)' : '(the season-one target)'}</span></td>${r.cells.map((c2) => html`<td class="num"><b>${usd(c2.perHearing, 2)}</b> <span class="muted small">${usd(c2.aYear)} a year</span></td>`)}</tr>`)}
    <tr><td class="muted" colspan="2">Fee lost with one missed hearing, this year only</td>${mt[0].cells.map((c2) => html`<td class="num muted">${usd(c2.feeLostThisYear, 0)}</td>`)}</tr>
    <tr><td class="muted" colspan="2">The same with later yearly fees, as set</td>${mt[0].cells.map((c2) => html`<td class="num muted">${usd(c2.feeLostPerMiss, 0)}</td>`)}</tr>
  </tbody></table></div>
  <p class="muted small">Per scheduled hearing, after paying the consultant who now attends. One thing changes per row. On fee arithmetic alone, preventing misses is worth ${usd(mt[0].cells[0].perHearing, 2)} to ${usd(mt[2].cells[2].perHearing, 2)} a hearing: a guardrail, not the main prize. ${Number.isFinite(equal) && equal < 1 ? html`With the sliders as set, misses would have to run at ${pct(equal)} of hearings to be worth as much as the software.` : ''} What makes a missed hearing serious is what this table cannot price: a client who signed a contract and got no hearing, refunds, complaints, reviews, and the cost of winning that client. So the plan’s target is not a dollar figure. It is no appeal lost because nobody appeared, and evidence on file for every hearing, so that an office can decide even if the room is empty. The 12-month count of missed hearings is the first number to pull, on day one. A paid standby is not in the plan: nobody holds a morning free for a fraction of one fee, and as a guaranteed half block it costs ${usd(b.standby.fee)}, which on fees alone would need ${Number.isFinite(b.standby.paysFromHearingsPerOfficeDay) ? Math.ceil(b.standby.paysFromHearingsPerOfficeDay) : 'more'} hearings at one office on one day to pay. The cover is the evidence on file, and for video dockets a named person at the firm who may appear.</p>

  <h3>A check a critical reader ran, reproduced</h3>
  <p class="muted small">${c.minutes.toFixed(1)} minutes saved at $35 to $50 an hour is ${usd(c.perHearing[0], 2)} to ${usd(c.perHearing[1], 2)} per hearing. On that alone a dedicated engineer at $150,000 to $200,000 needs ${count(c.engineer[0])} to ${count(c.engineer[1])} hearings a year, and the lean build (at $40,000 to $70,000 a year) ${count(c.lean[0])} to ${count(c.lean[1])}. That is why the plan has no engineer in it until the firm’s volume passes the "pays from" line above.</p>`;
}

export function moneyView({ ui }) {
  const m = ui.money;
  return html`
  <section class="panel">
    <div class="panel-head"><h2>The business case, with your numbers</h2>
      <div class="btnrow"><button class="btn" data-action="money-preset" data-id="cautious">Cautious</button><button class="btn" data-action="money-preset" data-id="default">Middle</button><button class="btn" data-action="money-preset" data-id="hopeful">Hopeful</button><button class="btn" data-action="money-preset" data-id="reset" title="Put every slider back where it started.">Start again</button></div></div>
    <p>Nothing on this page was measured at the firm. The example packet gives consultant fees and nothing else about money, so every other input is a public figure or an estimate, and two of them only the firm knows: how many hearings it runs and how many it misses. Move the sliders. The starting values are public figures where one exists (sources in the <code>research</code> folder) and sit at the cautious end, so the result is nearer a floor than a forecast: no consultant discount is counted, the control prevents a quarter of the misses and costs two extra minutes a hearing. <b>Cautious</b>, <b>Middle</b> and <b>Hopeful</b> move the eleven inputs about the work and the changes, and leave the firm’s own figures as you set them.</p>
    <div class="moneygrid">
      <div class="moneyin">
        ${GROUPS.map(([title, keys]) => html`<fieldset><legend>${title}</legend>${keys.map((k) => slider(k, m))}</fieldset>`)}
      </div>
      <div class="moneyout" id="money-out" aria-live="polite">${moneyResults(m)}</div>
    </div>
  </section>

  <section class="panel">
    <div class="panel-head"><h2>What this page leaves out</h2></div>
    <ul class="tight">
      <li><b>What it costs to win a customer and to prepare a case.</b> Both are spent before the hearing, so a missed hearing wastes them. Unknown here.</li>
      <li><b>Reviews and referrals.</b> The page counts later yearly fees lost with a client, as a slider. It cannot count the clients who never sign up because of a bad review.</li>
      <li><b>Whether a prepared person in the room wins more often.</b> The consultant is most of a hearing’s cost, and in the example week 11 of 24 case records were contradicted by newer messages. Whether a consultant with the current file and the right date wins more often is not published anywhere, and a two-week test cannot show it: detecting a five-point difference in the win rate takes about 1,500 hearings on each side. The plan reads it from last season’s results, for hearings with and without such an error.</li>
      <li><b>The result itself.</b> A consultant with twelve hearings in a morning may win less on each. The plan measures the reduction won per hearing, by consultant and by format.</li>
      <li><b>Seasonal hiring.</b> Coordinators hired for eight weeks need recruiting and training and make more mistakes. The staffing table counts their pay only.</li>
      <li><b>Cash.</b> Paying consultants within seven days moves cash out earlier than the fee comes in. At ${count(m.hearingsPerYear)} hearings and a peak of eight weeks that is working capital the firm has to hold.</li>
    </ul>
    <p class="muted small">Reproduce every figure with <code>node cli/economics.js</code>, and change any input by name, for example <code>node cli/economics.js hearingsPerYear=20000 missToday=0.05</code>.</p>
  </section>`;
}
