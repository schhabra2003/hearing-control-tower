// SCALE RUNS. Generates synthetic firms of different sizes and runs the real engine over each
// one in a closed loop with simulated counterparties (see src/sim.js). Writes eval/scale.json,
// which the Scale page of the app shows.
//
//   node cli/scale.js              all runs, three seeds each (several minutes, uses all cores)
//   node cli/scale.js --quick      one seed and smaller sizes (under a minute), does not overwrite
//   node cli/scale.js --out FILE   write somewhere else
//
// What is measured: counts of actions by who had to do them, and broken rules. What is
// estimated: how often surprises happen (the scenario) and how many minutes each kind of work
// takes (MINUTES in src/sim.js). The output says which is which.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { loadAll, ROOT } from './load.js';
import { makeSyntheticWorld, runSim, SCENARIOS, promote, MINUTES, SAFETY_CHECKS, FAULT_CHECKS, ONE_CLICK_CLASSES, verifyTemplates } from '../src/sim.js';
import { addReading } from './reading.js';

const WEEKS = 4;

function runCell(cell, base) {
  const t0 = performance.now();
  const world = makeSyntheticWorld({ base, hearings: cell.hearings, counties: cell.counties, weeks: WEEKS, seed: cell.seed, mix: { scenario: cell.scenario } });
  const r = runSim(world, { scenario: cell.scenario, autonomy: cell.autonomy === 'more' ? promote() : {} });
  const ms = performance.now() - t0;
  const nz = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v));
  return {
    ...cell, ms: Math.round(ms),
    meta: { counties: r.meta.counties, consultants: r.meta.consultants, pods: r.meta.pods, shards: r.meta.shards, blocks: r.meta.blocks, stateLayers: r.meta.stateLayers },
    hearings: r.hearings, held: r.held, ready: r.ready, readyAudited: r.readyAudited, covered: r.covered, coveredAudited: r.coveredAudited, fate: r.fate,
    inbound: r.inbound, inboundException: r.inboundException, out: r.out, work: r.work, kinds: r.kinds, reminders: r.reminders, calls: r.calls, triage: r.triage,
    minutes: r.minutes, humanTouches: r.humanTouches, peakDay: r.peakDay, hearingDays: r.hearingDays, days: Object.keys(r.days || {}).length,
    safetyViolations: r.safetyViolations, faults: r.faults, limitsHit: r.limitsHit, invariants: nz(r.invariants), abortedShards: r.abortedShards, lostHearings: r.lostHearings,
    notReady: r.notReady, waitingOn: r.waitingOn, plans: r.plans, steps: r.steps, slowestPlanMs: r.slowestPlanMs, peakOpen: r.peakOpen,
    incidents: (r.incidents || []).slice(0, 3),
  };
}

if (!isMainThread) {
  const data = loadAll();
  const base = { packet: data.packet, playbooks: data.playbooks };
  parentPort.on('message', (cell) => {
    if (cell === 'stop') { process.exit(0); }
    try { parentPort.postMessage({ ok: true, result: runCell(cell, base) }); } catch (e) { parentPort.postMessage({ ok: false, cell, error: String(e && e.stack ? e.stack : e) }); }
  });
} else {
  const argv = process.argv.slice(2);
  const quick = argv.includes('--quick');
  const outArg = argv.indexOf('--out');
  const outFile = outArg >= 0 ? path.resolve(argv[outArg + 1]) : path.join(ROOT, quick ? 'eval/scale_quick.json' : 'eval/scale.json');
  const seeds = quick ? [1] : [1, 2, 3];
  const BASE = quick ? { hearings: 200, counties: 10 } : { hearings: 800, counties: 20 };
  const volumes = quick ? [50, 100, 200, 400] : [100, 200, 400, 800, 1600, 3200];
  const countySteps = quick ? [5, 10, 20, 40] : [5, 10, 20, 40, 80, 160];

  const key = (c) => `${c.hearings}|${c.counties}|${c.scenario}|${c.autonomy}`;
  const configs = new Map();
  const want = (c) => { const full = { scenario: 'typical', autonomy: 'default', ...BASE, ...c }; configs.set(key(full), full); return key(full); };
  const EXP = {
    volume: volumes.map((hearings) => want({ hearings })),
    counties: countySteps.map((counties) => want({ counties })),
    noise: Object.keys(SCENARIOS).map((scenario) => want({ scenario })),
    autonomy: ['calm', 'typical', 'rough'].flatMap((scenario) => [want({ scenario }), want({ scenario, autonomy: 'more' })]),
  };
  const cells = [...configs.values()].flatMap((c) => seeds.map((seed) => ({ ...c, seed }))).sort((a, b) => b.hearings - a.hearings);

  const data = loadAll();
  const tpl = verifyTemplates({ packet: data.packet, playbooks: data.playbooks });
  if (!tpl.ok) { console.error(`The simulation's own wording is not read correctly by the offline reader (${tpl.failed.length} of ${tpl.total}). Fix that first.`); process.exit(1); }

  const t0 = performance.now();
  const results = [];
  const errors = [];
  const nWorkers = Math.max(1, Math.min(cells.length, os.cpus().length));
  console.log(`${cells.length} runs (${configs.size} settings, ${seeds.length} seed${seeds.length > 1 ? 's' : ''} each), ${cells.reduce((s, c) => s + c.hearings, 0)} simulated hearings, on ${nWorkers} threads.`);
  await new Promise((resolve) => {
    let next = 0, live = nWorkers;
    for (let i = 0; i < nWorkers; i += 1) {
      const w = new Worker(new URL(import.meta.url));
      const give = () => { if (next < cells.length) w.postMessage(cells[next++]); else { w.postMessage('stop'); live -= 1; if (!live) resolve(); } };
      w.on('message', (m) => {
        if (m.ok) { results.push(m.result); const r = m.result; process.stdout.write(`  ${String(results.length).padStart(3)}/${cells.length}  ${String(r.hearings).padStart(5)} hearings ${String(r.meta.counties).padStart(3)} counties ${r.scenario.padEnd(8)} ${r.autonomy.padEnd(7)} seed ${r.seed}: ${(r.minutes.tower / r.hearings).toFixed(2)} vs ${(r.minutes.manual / r.hearings).toFixed(2)} min/hearing, safety ${r.safetyViolations}, faults ${r.faults}, ${(r.ms / 1000).toFixed(1)} s\n`); }
        else { errors.push(m); console.error(`  FAILED ${JSON.stringify(m.cell)}: ${m.error.split('\n')[0]}`); }
        give();
      });
      w.on('error', (e) => { errors.push({ error: String(e) }); live -= 1; if (!live) resolve(); });
      give();
    }
  });
  const wall = performance.now() - t0;

  // ---- pool the seeds of one setting
  const add = (a, b) => { for (const [k, v] of Object.entries(b || {})) { if (typeof v === 'number') a[k] = (a[k] || 0) + v; else if (v && typeof v === 'object' && !Array.isArray(v)) a[k] = add(a[k] || {}, v); } return a; };
  const price = (work, t) => {
    const human = Object.entries(work.human || {}).reduce((s, [k, n]) => s + n * (t.human[k] ?? t.humanDefault), 0);
    return {
      tower: { approve: work.approve * t.approve, draft: work.draft * t.draft + work.statement * t.statement + work.signerFix * t.signerFix, triage: work.triage * t.triage, phoneIn: work.phoneIn * t.phoneIn, calls: human },
      manual: work.readRoutine * t.readRoutine + work.readException * t.readException + work.write * t.write + work.statement * Math.max(t.statement, t.write) + work.signerFix * t.write + work.phoneIn * t.phoneIn + human,
    };
  };
  const total = (o) => Object.values(o).reduce((s, v) => s + v, 0);
  const pooled = (k) => {
    const runs = results.filter((r) => key(r) === k).sort((a, b) => a.seed - b.seed);
    if (!runs.length) return null;
    const c = configs.get(k);
    const sum = { hearings: 0, held: 0, ready: 0, readyAudited: 0, covered: 0, coveredAudited: 0, inbound: 0, inboundException: 0, reminders: 0, calls: 0, humanTouches: 0, safetyViolations: 0, faults: 0, limitsHit: 0, ms: 0, plans: 0, lostHearings: 0 };
    const work = {}, out = {}, fate = {}, inv = {}, human = {}, waitingOn = {}, notReady = {};
    for (const r of runs) { for (const f of Object.keys(sum)) sum[f] += r[f] || 0; add(work, r.work); add(out, r.out); add(fate, r.fate); add(inv, r.invariants); add(human, r.work.human); add(waitingOn, r.waitingOn); add(notReady, r.notReady); }
    const h = sum.hearings;
    const per = (r, f) => f(r) / r.hearings;
    const range = (f) => { const v = runs.map((r) => per(r, f)); return [Math.min(...v), Math.max(...v)]; };
    const mid = price(work, MINUTES.mid), low = price(work, MINUTES.low), high = price(work, MINUTES.high);
    const outAll = out.L2 + out.L1 + out.L0 + out.human;
    const peak = runs.reduce((b, r) => (r.peakDay.minutes / r.hearings > b.share ? { share: r.peakDay.minutes / r.hearings, minutes: r.peakDay.minutes, hearings: r.hearings, date: r.peakDay.date } : b), { share: 0, minutes: 0, hearings: 1, date: null });
    return {
      ...c, seeds: runs.map((r) => r.seed), runs: runs.length, hearings: h, perRun: Math.round(h / runs.length),
      countiesMade: runs[0].meta.counties, consultants: Math.round(runs.reduce((s, r) => s + r.meta.consultants, 0) / runs.length), pods: runs[0].meta.pods,
      held: sum.held, ready: sum.ready, readyAudited: sum.readyAudited, covered: sum.covered, fate,
      tower: total(mid.tower) / h, towerLow: total(low.tower) / h, towerHigh: total(high.tower) / h, towerRange: range((r) => r.minutes.mid.tower),
      manual: mid.manual / h, manualLow: low.manual / h, manualHigh: high.manual / h, manualRange: range((r) => r.minutes.mid.manual),
      towerBy: Object.fromEntries(Object.entries(mid.tower).map(([k2, v]) => [k2, v / h])),
      touches: sum.humanTouches / h, touchesRange: range((r) => r.humanTouches),
      outbound: outAll / h, automaticShare: outAll ? out.L2 / outAll : null, out: { L2: out.L2 / h, L1: out.L1 / h, L0: out.L0 / h, human: out.human / h },
      inbound: sum.inbound / h, exceptionsIn: sum.inboundException / h, reminders: sum.reminders / h, calls: sum.calls / h,
      readyRate: sum.held ? sum.ready / sum.held : null, readyRange: runs.map((r) => (r.held ? r.ready / r.held : null)), coveredRate: sum.held ? sum.covered / sum.held : null,
      readyEqualsAudited: sum.ready === sum.readyAudited,
      safety: sum.safetyViolations, faults: sum.faults, limits: sum.limitsHit, invariants: inv, lostHearings: sum.lostHearings, waitingOn, notReady,
      human, work: { approve: work.approve, draft: work.draft, statement: work.statement, triage: work.triage, signerFix: work.signerFix, phoneIn: work.phoneIn },
      peakDayMinutesPerHearingRun: peak.share, peakDay: peak,
      msPerHearing: sum.ms / h, plansPerHearing: sum.plans / h,
    };
  };

  const f1 = (x) => (x == null || Number.isNaN(x) ? 'n/a' : x.toFixed(1));
  const f2 = (x) => (x == null || Number.isNaN(x) ? 'n/a' : x.toFixed(2));
  const pct = (x, d = 0) => (x == null || Number.isNaN(x) ? 'n/a' : `${(100 * x).toFixed(d)}%`);
  const num = (n) => n.toLocaleString('en-US');
  const WEEK_MIN = 5 * 6 * 60;      // one coordinator: five days of six productive hours (assumption)
  const label = (s) => SCENARIOS[s].label.split(':')[0].replace(' (control)', '');

  const row = (p, first) => ({
    first,
    setting: `${num(p.perRun)} hearings, ${p.countiesMade} counties, ${p.consultants} consultants`,
    tower: f1(p.tower), towerSpread: `${f1(p.towerLow)} to ${f1(p.towerHigh)}`, manual: f1(p.manual), manualSpread: `${f1(p.manualLow)} to ${f1(p.manualHigh)}`,
    saved: pct(1 - p.tower / p.manual), touches: f2(p.touches), automatic: pct(p.automaticShare),
    perCoordinator: `${num(Math.round(WEEK_MIN / p.tower))} vs ${num(Math.round(WEEK_MIN / p.manual))}`,
    ready: pct(p.readyRate, 1), covered: pct(p.coveredRate, 1), safety: String(p.safety), faults: String(p.faults),
    n: num(p.hearings), _: { x: p.perRun, counties: p.countiesMade, tower: p.tower, towerLow: p.towerLow, towerHigh: p.towerHigh, manual: p.manual, manualLow: p.manualLow, manualHigh: p.manualHigh, touches: p.touches, ready: p.readyRate, towerRange: p.towerRange, manualRange: p.manualRange, towerBy: p.towerBy },
  });
  const COLS = (firstLabel) => [
    { key: 'first', label: firstLabel },
    { key: 'tower', label: 'Person-minutes per hearing, with the tower', num: true, help: 'Estimated minutes, middle values. Measured: how many actions of each kind a person had to do.' },
    { key: 'manual', label: 'By hand', num: true, help: 'The same messages read and written by a person, same minute values.' },
    { key: 'saved', label: 'Less', num: true },
    { key: 'touches', label: 'Things a person does per hearing', num: true, help: 'Measured: approvals, reviewed drafts, messages read by a person, calls and decisions.' },
    { key: 'automatic', label: 'Sent with no person', num: true, help: 'Measured share of outgoing messages.' },
    { key: 'perCoordinator', label: 'Hearings a week per coordinator (tower vs by hand)', num: true, help: 'Estimate: 30 productive hours a week divided by the minutes per hearing.' },
    { key: 'ready', label: 'Ready when held', num: true, help: 'Measured in the simulated world: all five gates closed at the start of the hearing.' },
    { key: 'safety', label: 'Safety rules broken', num: true },
    { key: 'n', label: 'Hearings simulated', num: true },
  ];

  const P = Object.fromEntries([...configs.keys()].map((k) => [k, pooled(k)]));
  const experiments = [];
  const vol = EXP.volume.map((k) => P[k]).filter(Boolean);
  experiments.push({ id: 'volume', title: `More hearings, same ${BASE.counties} counties`, question: 'Does the work of people per hearing grow when the firm handles more hearings?', chart: 'x',
    columns: COLS('Hearings in four weeks'), rows: vol.map((p) => row(p, `${num(p.perRun)} (${p.consultants} consultants)`)) });
  const cty = EXP.counties.map((k) => P[k]).filter(Boolean);
  experiments.push({ id: 'counties', title: `More counties, same ${num(BASE.hearings)} hearings`, question: 'Does it grow when the same hearings are spread over more offices, each with its own process?', chart: 'counties',
    columns: COLS('Counties'), rows: cty.map((p) => row(p, `${p.countiesMade} (${f1(p.perRun / p.countiesMade)} hearings each)`)) });
  const noi = EXP.noise.map((k) => P[k]).filter(Boolean);
  experiments.push({ id: 'noise', title: 'A harder world', question: 'What happens when more people stay silent and more things change?',
    columns: COLS('World'), rows: noi.map((p) => row(p, SCENARIOS[p.scenario].label)) });
  const aut = EXP.autonomy.map((k) => P[k]).filter(Boolean);
  experiments.push({ id: 'autonomy', title: 'More autonomy, once it is earned', question: `What changes when the ${ONE_CLICK_CLASSES.length} one-click classes are allowed to go out without a click?`,
    columns: COLS('World and setting'), rows: aut.map((p) => row(p, `${label(p.scenario)}, ${p.autonomy === 'more' ? 'one-click classes automatic' : 'as shipped'}`)) });

  // ---- what the runs show, written from the numbers
  const all = Object.values(P).filter(Boolean);
  const totalHearings = results.reduce((s, r) => s + r.hearings, 0);
  const safetyAll = results.reduce((s, r) => s + r.safetyViolations, 0), faultsAll = results.reduce((s, r) => s + r.faults, 0), limitsAll = results.reduce((s, r) => s + r.limitsHit, 0);
  const lostAll = results.reduce((s, r) => s + (r.lostHearings || 0), 0);
  const invAll = {}; for (const r of results) add(invAll, r.invariants);
  const spread = (list, f) => { const v = list.map(f); return [Math.min(...v), Math.max(...v)]; };
  const findings = [], limits = [];
  if (vol.length > 1) {
    const [a, b] = [vol[0], vol[vol.length - 1]];
    const [lo, hi] = spread(vol, (p) => p.tower);
    findings.push(`From ${num(a.perRun)} to ${num(b.perRun)} hearings (${Math.round(b.perRun / a.perRun)} times more), a person's time per hearing stays between ${f1(lo)} and ${f1(hi)} minutes with the tower. By hand it is ${f1(Math.min(...vol.map((p) => p.manual)))} to ${f1(Math.max(...vol.map((p) => p.manual)))} minutes. People are added in proportion to exceptions, not to messages.`);
  }
  if (cty.length > 1) {
    const [lo, hi] = spread(cty, (p) => p.tower);
    const a = cty[0], b = cty[cty.length - 1];
    const callsPer = (p) => (p.human.call_office || 0) / p.hearings;
    findings.push(`From ${a.countiesMade} to ${b.countiesMade} counties with the same ${num(BASE.hearings)} hearings, it goes from ${f1(a.tower)} to ${f1(b.tower)} minutes (lowest ${f1(lo)}, highest ${f1(hi)}). A new county is a data file (how to name the representative, deadlines, office hours), not new code. The increase is phone calls: one in five generated counties uses a "send the form, then call the clerk" process that none of the ten example counties has, and calls to an office go from ${f2(callsPer(a))} to ${f2(callsPer(b))} per hearing. Work does not grow with the number of counties. It grows with the share of counties whose own process needs a person.`);
  }
  if (noi.length > 1) {
    const calm = noi[0], rough = noi[noi.length - 1];
    const calls = rough.towerBy.calls / rough.tower;
    findings.push(`Noise is what costs people time: ${f1(calm.tower)} minutes per hearing in the quietest world, ${f1(rough.tower)} in the roughest (by hand: ${f1(calm.manual)} and ${f1(rough.manual)}). In the roughest world ${pct(calls)} of the remaining person time is phone calls and decisions after someone stayed silent. That is the next thing to attack: fewer silent counterparties, not more reading.`);
  }
  const typD = P[want({})], typM = P[want({ autonomy: 'more' })];
  if (typD && typM) findings.push(`Letting the one-click classes go out by themselves, after a pilot has shown they are right, takes the typical world from ${f2(typD.touches)} to ${f2(typM.touches)} things a person does per hearing and from ${f1(typD.tower)} to ${f1(typM.tower)} minutes. The engine is the same; only a setting per county and class changes.`);
  findings.push(`Rules checked on every step of every run (${num(totalHearings)} simulated hearings in ${results.length} runs): ${SAFETY_CHECKS.length} safety rules, such as "never shown ready without the authority's evidence" and "never an automatic message to a homeowner". Broken: ${safetyAll}. Outcome faults, such as a consultant held for two hearings at once or still held after reporting sick: ${faultsAll}.${limitsAll ? ` Search limits reached: ${limitsAll}.` : ''}${lostAll ? ` Hearings lost to a stopped run: ${lostAll}.` : ''}`);
  for (const p of [P[want({})], P[want({ scenario: 'rough' })]].filter(Boolean)) {
    const open = p.held - p.ready;
    const top = Object.entries(p.waitingOn || {}).sort((x, y) => y[1] - x[1]);
    const n = top.reduce((t, [, v]) => t + v, 0);
    if (open > 0 && n) findings.push(`${label(p.scenario)} world: ${pct(p.readyRate, 1)} of hearings were held with all five gates closed and ${pct(p.coveredRate, 1)} with a committed consultant. The ${num(open)} that were not fully ready were shown as open before they started, waiting on: ${top.slice(0, 4).map(([k, v]) => `${k} (${pct(v / n)})`).join(', ')}. The tower cannot make an office answer; it makes sure nobody learns that at the hearing.`);
  }
  findings.push(`"Ready" was audited against what was true in the simulated world (the consultant really can attend, the office really has the name and the file): shown ready and audited ready agree in ${all.filter((p) => p.readyEqualsAudited).length} of ${all.length} settings.`);
  limits.push('The minutes are estimates, shown with a low and a high set. The comparison between sizes does not depend on them; the absolute saving does.');
  limits.push('The simulated people write in wording the offline reader is known to read, so reading mistakes are outside these runs. Reading quality is measured separately on the Checks page.');
  limits.push('How often surprises happen is an assumption (the four worlds). The firm\'s own rates are the first thing a pilot would measure.');
  limits.push('By hand is a favourable baseline: a person who reads every message, writes every message and makes no mistakes. Real manual work also has errors and rework, which are not counted.');
  limits.push('The firm is cut into regional pods (counties that share consultants), about 30 hearings a week each, and each pod runs on its own. That is also how the real system would be cut, but nothing here tests one very large pod.');

  const outJson = {
    title: 'Recorded runs',
    generated: `Generated by node cli/scale.js${quick ? ' --quick' : ''}: ${results.length} runs, ${num(totalHearings)} simulated hearings, ${seeds.length} seed${seeds.length > 1 ? 's' : ''} per setting, ${(wall / 1000).toFixed(0)} seconds on ${nWorkers} threads (${f1(results.reduce((s, r) => s + r.ms, 0) / totalHearings)} ms of computing per hearing).`,
    intro: 'Each row pools the runs of one setting. The engine is the real one. The counterparties, their rates and the minutes are simulated or estimated.',
    weeks: WEEKS, seeds, base: BASE, templatesChecked: tpl.total,
    minutes: MINUTES, weekMinutes: WEEK_MIN,
    totals: { runs: results.length, hearings: totalHearings, safety: safetyAll, faults: faultsAll, limits: limitsAll, lost: lostAll, invariants: invAll, safetyRules: SAFETY_CHECKS, faultRules: FAULT_CHECKS, seconds: Math.round(wall / 1000) },
    experiments, findings, limits,
    settings: all,
    errors: errors.map((e) => e.error.split('\n')[0]),
  };
  fs.writeFileSync(outFile, JSON.stringify(outJson, null, 1));
  if (!quick) addReading(outFile);                    // what measured reading adds, when the reader runs are there
  console.log(`\n${results.length} runs, ${num(totalHearings)} hearings, ${(wall / 1000).toFixed(0)} s. Safety rules broken: ${safetyAll}. Faults: ${faultsAll}. Limits: ${limitsAll}.${errors.length ? ` FAILED RUNS: ${errors.length}.` : ''}`);
  for (const e of experiments) { console.log(`\n${e.title}`); for (const r of e.rows) console.log(`  ${r.first.padEnd(58)} tower ${r.tower.padStart(5)} (${r.towerSpread})  by hand ${r.manual.padStart(5)}  less ${r.saved.padStart(4)}  touches ${r.touches}  auto ${r.automatic}  ready ${r.ready}  safety ${r.safety} faults ${r.faults}`); }
  console.log(`\nWritten: ${path.relative(process.cwd(), outFile)}`);
  process.exit(errors.length ? 1 : 0);
}
