// Prints the business case as tables. Every dollar figure in the write-up and the design
// document comes from here.
//
//     node cli/economics.js                         the default inputs
//     node cli/economics.js hearingsPerYear=20000   change any input by name
//     node cli/economics.js --json
//
// The inputs and their basis (sourced, packet, simulated, estimate, unknown) are in src/economics.js.

import { INPUTS, BUILDS, DOCKET_WORK, VOLUME, PAID_HOURS_A_WEEK, businessCase, byVolume, threeCases, criticsMath, feeRange, missTable, defaults, usd, count } from '../src/economics.js';

const args = process.argv.slice(2);
const over = {};
for (const a of args) {
  const m = /^([A-Za-z]+)=([0-9.]+)$/.exec(a);
  if (m && m[1] in defaults()) over[m[1]] = +m[2];
  else if (a !== '--json') { console.error(`Unknown argument: ${a}. Inputs: ${INPUTS.map((i) => i.key).join(', ')}`); process.exit(1); }
}
const b = businessCase(over);
if (args.includes('--json')) { console.log(JSON.stringify({ case: b, three: threeCases(over), critic: criticsMath(), volume: byVolume(over) }, null, 1)); process.exit(0); }

const pct = (x, d = 0) => `${(100 * x).toFixed(d)}%`;
const show = (i, v) => (i.key === 'hearingsPerConsultantDay' ? `${v}` : i.unit === 'usd' ? usd(v, v % 1 ? 2 : 0) : i.unit === 'pct' ? pct(v, v * 100 % 1 ? 1 : 0) : i.unit === 'min' ? `${v} min` : i.unit === 'h' ? `${v} h` : i.unit === 'yr' ? `${v} yr` : count(v));
const line = (...cells) => console.log(`| ${cells.join(' | ')} |`);

console.log('INPUTS');
line('Input', 'Used', 'Cautious to hopeful', 'Basis');
for (const i of INPUTS) line(i.label, show(i, b.input[i.key]), `${show(i, i.low)} to ${show(i, i.high)}`, i.basis);

console.log('\nONE HEARING: WHAT IT COSTS (does not depend on the fee)');
line('', 'Today', 'With the control', 'With the tower');
line('Consultant', usd(b.input.consultantFee, 2), usd(b.consultantKit, 2), usd(b.consultantKit, 2));
line('Coordination', usd(b.coordToday, 2), usd(b.coordKit, 2), usd(b.coordAfter, 2), `at ${usd(b.perMinute * 60, 2)} a productive hour (${usd(b.input.coordinatorRate, 2)} a paid hour, ${b.input.productiveHours} productive hours in 40)`);
line('  minutes', b.input.minutesByHand.toFixed(1), b.minutesKit.toFixed(1), b.minutesAfter.toFixed(1));
line('Cost per hearing', usd(b.costToday, 2), usd(b.costKit, 2), usd(b.costAfter, 2));
line('The consultant is', pct(b.consultantShareOfCost), 'of the cost today');

console.log('\nONE HEARING: WHAT IT EARNS (the weakest figure: the public saving is per customer, not per hearing)');
const fr = feeRange(over);
line('Fee per hearing, range from public figures', fr.map((x) => usd(x, 2)).join(' / '), 'half won at a 25% share / all won at 25% / all won at 50%');
line('Fee used below', usd(b.fee, 2));
line('Margin before fixed costs', usd(b.marginToday, 2), usd(b.marginKit, 2), usd(b.marginAfter, 2));

console.log('\nWHAT EACH CHANGE IS WORTH, PER SCHEDULED HEARING');
line('THE STANDING CONTROL (four checks, no software)', usd(b.kitValue, 2));
line('  Misses prevented, after paying the consultant', usd(b.missMargin, 2), `${pct(b.missesAvoided, 2)} of hearings`);
line('  Keeping the control', usd(-b.kitWork, 2), `${b.input.kitMinutes} extra minutes`);
line('  A block rate for consultants', usd(b.blockValue, 2), `${pct(b.input.blockDiscount)} off the fee on ${pct(b.input.blockShare)} of hearings: not counted until agreed in writing`);
line('  (fee income kept by preventing those misses)', usd(b.missRevenue, 2));
line('  (what clients keep because of it)', usd(b.missClient, 2));
line('THE TOWER, against today’s process', usd(b.towerVsToday, 2), `${b.minutesSavedVsToday.toFixed(1)} of today’s ${b.input.minutesByHand.toFixed(1)} minutes`);
line('  (against the control it takes over)', usd(b.towerValue, 2), `${b.minutesSaved.toFixed(1)} of ${b.minutesKit.toFixed(1)} minutes`);
line('Fee lost with one missed hearing, this year', usd(b.feeLostThisYear, 2), `${pct(b.input.lossGivenMiss)} of this year's fee`);
line('  with the later yearly fees that leave with the client', usd(b.feeLostPerMiss, 2), `${b.input.laterYears} later yearly fee(s) on average per miss`);
line('One percentage point of missed hearings', usd(b.pointRevenue, 2), 'fee income per scheduled hearing');
line('A standby per office-day, as a guaranteed half block, costs', usd(b.standby.fee, 2), `on fees alone it pays from ${Number.isFinite(b.standby.paysFromHearingsPerOfficeDay) ? Math.ceil(b.standby.paysFromHearingsPerOfficeDay) : 'never'} hearings at one office on one day: in practice never`);
line('Every 10% of hearings with no paid person in the room', usd(b.attendance.tenthOnPaper, 2), 'on paper: only where the result holds');
line('Sending a consultant pays the firm alone where it adds more than', `${b.attendance.pointsNeeded.toFixed(0)} points`, `of win chance at a 25% fee share, ${b.attendance.pointsRange[1].toFixed(0)} at a 50% share. On the client's and the firm's money together: ${b.attendance.pointsOnWholeSaving.toFixed(0)}. So every hearing keeps a person in the room`);
line('The control pays for itself if a missed hearing costs the firm more than', usd(b.missCostRange.control, 0), `all in (fees, a refund, rework, a claim), against ${usd(b.feeLostPerMiss, 0)} in fees. At 5% missed and half prevented: ${usd(b.missCostRange.ifWorse, 0)}. At 1% and 13%: ${usd(b.missCostRange.ifBetter, 0)}. The full five-gate sheet: ${usd(b.missCostRange.fullSheet, 0)}`);
line('One point of win rate is worth', `${usd(b.winPoint.yearFirm)} a year to the firm`, `${usd(b.winPoint.yearClient)} a year to its clients. The control pays for itself at ${b.winPoint.controlPaysAt.toFixed(1)} points, the full sheet at ${b.winPoint.fullSheetPaysAt.toFixed(1)}`);
line('The tower in cash: seasonal coordinators not hired in the peak', usd(b.cash.towerYear), `a year. A lean build then nets ${usd(b.cash.towerNet[1])} to ${usd(b.cash.towerNet[0])} and pays from ${count(b.cash.towerPaysFrom[0])} to ${count(b.cash.towerPaysFrom[1])} hearings a year`);
line('Cash a peak ties up', usd(b.cash.need), `paid out before the first peak fee arrives, at an assumed ${b.cash.weeksAssumed} weeks from hearing to fee (to count on day 1): the 8 peak weeks at ${usd(b.cash.weeklyPeakPayout)} a week, then ${b.cash.weeksAssumed - 8} ordinary weeks at ${usd(b.cash.ordinaryWeekPayout)}`);
line('Settling before a consultant is booked, net of the call', usd(b.settle.netAt10), `a year if 10 points more of scheduled hearings settle: ${usd(b.settle.perPoint, 2)} a scheduled hearing per point, less a ${b.settle.callMinutes}-minute call on every scheduled hearing (${usd(b.settle.callCost, 2)}). Pays above ${b.settle.breakEvenPoints.toFixed(1)} points. Gross ${usd(b.settle.grossAt10)}. Nothing here is counted or agreed`);
line('The bench in names, at two days a week each', [1.6, 2.4, 2.8, 6].map((n) => `${b.bench.names[n]} at ${n}`).join(', '), `hearings a consultant-day: 1.6 is a cautious case just below the example week on the sheet (1.7), 2.4 the same week with its open hearings staffed (the season target), 2.8 the most its calendar allows as whole dockets. At the 1.2 days a week the example week shows: ${[1.6, 2.4, 2.8, 6].map((n) => `${b.bench.namesAtSeenDays[n]} at ${n}`).join(', ')}. Recruit to the target with a fifth spare.` + '  Two days a week each is my assumption: in the example week of 10 June six consultants supply 7 consultant-days for the 13 of its 18 hearings that have a yes that counts');
line('Coordinators per 1,000 peak-week hearings', b.coordinatorsPer1000.map((x) => x.toFixed(1)).join(' / '), 'today / with the control / with the tower');
if (b.inHouse.yearWhole[0] > 0) line('  the in-house illustration with whole people', `${usd(b.inHouse.yearWhole[0])} to ${usd(b.inHouse.yearWhole[1])}`, `a year, with ${b.inHouse.wholePeople[0]} people at ${b.inHouse.perDay[0]} hearings a day or ${b.inHouse.wholePeople[1]} at ${b.inHouse.perDay[1]}; below ${b.inHouse.breakEvenPerDay.toFixed(1)} a day they cost more than a contractor`);
line('A docket rate, a later question (not asked in season one, not counted)', `${usd(b.docketRate.pay4)} for four hearings`, `${usd(b.docketRate.first)} for the first two hearings of an office-day, ${usd(b.docketRate.later)} from the third: ${usd(b.docketRate.perHearing4, 2)} a hearing, against ${usd(b.docketRate.twoSingles)} for two single hearings today. Worth ${usd(b.docketRate.year)} a year if ${pct(b.input.blockShare)} of hearings fall in dockets of four`);
line('Consultants a peak week needs, by hearings a consultant-day', [2.4, 2.8, 4, 6].map((n) => `${Math.ceil(b.peak.consultantsAt[n])} at ${n}`).join(', '), 'the example week runs at 1.7 staffed, 2.4 with its unstaffed hearings filled, 2.8 as whole dockets');
line(`Illustration, nothing agreed: the firm's own seasonal representatives on video dockets in the peak, at ${usd(b.inHouse.hourly)} an hour all in`, `${usd(b.inHouse.perHearing[0], 2)} to ${usd(b.inHouse.perHearing[1], 2)} a hearing`, `at ${b.inHouse.perDay[1]} to ${b.inHouse.perDay[0]} hearings a day. On ${count(b.inHouse.hearings)} hearings (half of the peak's video hearings): ${usd(b.inHouse.year[0])} to ${usd(b.inHouse.year[1])} a year, with ${b.inHouse.people[0].toFixed(1)} to ${b.inHouse.people[1].toFixed(1)} people`);

console.log('\nTHE PLAN AT THREE VOLUMES (the plan is written for 300, which is what the example week implies; 1,000 and 5,000 test how it scales)');
line('Hearings a year', ...[300, 1000, 5000].map((h) => count(h)));
{ const v = [300, 1000, 5000].map((h) => businessCase({ ...over, hearingsPerYear: h }));
  line('Hearings in a peak week', ...v.map((x) => x.peak.hearingsAWeek.toFixed(0)));
  line('Coordinators in a peak week, today', ...v.map((x) => x.peak.coordinatorsToday.toFixed(1)));
  line('Consultants in a peak week at 2.8, 4, 6 a day', ...v.map((x) => [2.8, 4, 6].map((n) => Math.ceil(x.peak.consultantsAt[n])).join(', ')));
  line('The four checks, a year', ...v.map((x) => usd(x.year.kitWork)));
  line('Misses prevented, a year', ...v.map((x) => usd(x.year.missMargin)));
  line('Every 10% settled before booking, a year', ...v.map((x) => usd(x.attendance.tenthOnPaper * x.input.hearingsPerYear)));
  line('A docket rate (a later question, not asked in season one), a year', ...v.map((x) => usd(x.docketRate.year)));
  line('The tower saves, in time and in cash', ...v.map((x) => `${usd(x.year.towerVsToday)}, ${usd(x.cash.towerYear)}`));
  line('Net of a 5-minute call, 10 points more settled before booking', ...v.map((x) => usd(x.settle.netAt10)));
  line('Names on the bench at two days a week, at 1.6, 2.4, 2.8 a day', ...v.map((x) => [1.6, 2.4, 2.8].map((n) => x.bench.names[n]).join(', ')));
  line('  the same at 1.2 days a week each', ...v.map((x) => [1.6, 2.4, 2.8].map((n) => x.bench.namesAtSeenDays[n]).join(', ')));
  line('Cash a peak ties up, 12 weeks to fee', ...v.map((x) => usd(x.cash.need)));
  // What is left after the plan's own costs. Set-up is the season-one budget of the kit (section 6): hand sums, not model output
  // (src/economics.js, VOLUME.setUp; at 5,000 the yearly overhead instead). Season one now runs the full sheet with the reply
  // rule, the scheduled texts and the readers from the start, by docket: its coordination is the plan's (byVolume), not the
  // four checks by hand. Every consultant is still paid the full fee in season one.
  const vol = byVolume(over), hs = vol.rows.map((r) => r.h);
  const left = (j) => vol.rows.map((r) => usd(r.seasonOne.left[j]));
  line(`Fee income at ${usd(vol.fees[0], 2)} and ${usd(vol.fees[1], 2)} a hearing`, ...hs.map((h) => `${usd(h * vol.fees[0])}, ${usd(h * vol.fees[1])}`));
  line(`SEASON ONE, the full sheet with the reply rule and the readers from the start, by docket, every consultant at ${usd(b.input.consultantFee)}: set-up (kit, section 6), and yearly overhead at scale`, ...vol.rows.map((r) => usd(r.seasonOne.setUp + r.seasonOne.yearly)));
  line('  cost per hearing in season one (consultant and coordination)', ...vol.rows.map((r) => usd(r.seasonOne.cost, 2)));
  line(`Season one: left after the plan's costs, at ${usd(vol.fees[1], 2)} a hearing`, ...left(1));
  line(`  the same at ${usd(vol.fees[0], 2)}`, ...left(0)); }

// WHAT FALLS WITH VOLUME. Two kinds of lever, both without the tower. The model and every assumption are in
// src/economics.js (VOLUME, DOCKET_WORK and byVolume); this only prints them.
// Consultant-days: more hearings in the same ten offices fill days (the pooled-day and in-person estimates).
// Coordinator minutes: split into a part counted per hearing and a part counted per docket (one office, one day, one
// format), so the minutes a hearing fall as dockets fill. The levers apply from season one: the full gate sheet in all
// ten counties, the reply rule and the scheduled texts on the firm's text line, two AI readers proposing the office proofs.
// All are estimates until the live weeks' timings (two timings of 25 hearings).
console.log('\nWHAT FALLS WITH VOLUME (running cost in a normal year, no set-up; assumptions marked)');
{ const vol = byVolume(over), rows = vol.rows, D = DOCKET_WORK, m1 = (x) => x.toFixed(1), last = rows[rows.length - 1];
  line('Hearings a year', ...rows.map((r) => count(r.h)));
  line('  assumed: video hearings on pooled full days of six; in-person hearings a consultant-day', ...rows.map((r, k) => `${Math.round(VOLUME.pooled[k] * 100)}%; ${VOLUME.inPerson[k]}`));
  line('Consultant cost per hearing', ...rows.map((r) => usd(r.consultant, 2)));
  line('Consultant-days in a peak week', ...rows.map((r) => r.days.toFixed(1)));
  line('Names on the bench (two days a week to 1.2 days)', ...rows.map((r) => `${r.names[0]} to ${r.names[1]}`));
  line('Names per 1,000 peak-week hearings', ...rows.map((r) => `${Math.round(1000 * r.names[0] / r.peakWeek)} to ${Math.round(1000 * r.names[1] / r.peakWeek)}`));
  line('Coordinator minutes a hearing (productive), the plan: full sheet in ten counties, reply rule, readers, by docket', ...rows.map((r) => m1(r.minutes)));
  line('  counted per hearing', ...rows.map((r) => m1(r.perHearingPart)), `today's ${m1(vol.input.minutesByHand)} less its ${m1(D.messagesByHearing / D.hearings)} messages a hearing (${D.messagesByHearing} for the example week's ${D.hearings} hearings) at ${D.minutesPerMessage} minutes. All of it kept per hearing: the cautious split`);
  line('  counted per docket, shared by its hearings', ...rows.map((r) => m1(r.perDocketPart)), `${m1(vol.perDocket)} minutes a docket: ${D.messagesByDocket} messages for the example week's ${D.dockets} dockets at ${D.minutesPerMessage} minutes (${m1(vol.docketParts.messages)}); ${D.officeProofs} office proofs proposed by the readers, accepted in one daily pass at ${vol.cell} minutes each as by hand (${m1(vol.docketParts.proofs)}); ${D.consultantCells} consultant replies filed by the rule, one in four handed to a person at ${vol.cell} (${m1(vol.docketParts.replies)}; one in four is an estimate)`);
  line('  assumed: hearings a docket', ...rows.map((r) => r.perDocketHearings.toFixed(1)), `the example week's ${D.hearings} hearings in ${D.dockets} dockets at ${count(rows[0].h)}, rising as hearings a consultant-day rise (${rows.map((r) => r.perDay.toFixed(1)).join(', ')})`);
  line('  the same minutes if a docket held as many hearings as a consultant-day', ...rows.map((r) => m1(r.minutesIfDayIsDocket)));
  line(`Paid coordinator minutes a hearing (x ${PAID_HOURS_A_WEEK} / ${vol.input.productiveHours})`, ...rows.map((r) => m1(r.paidMinutes)));
  line('  for comparison at every volume, productive: today, the four checks by hand, the full sheet by hand, the tower', `${m1(vol.byHand.today)}, ${m1(vol.byHand.shortForm)}, ${m1(vol.byHand.fullForm)}, ${m1(vol.byHand.tower)}`);
  line('Hearings one coordinator carries in a peak week, the plan', ...rows.map((r) => count(r.perCoordinator)));
  line('Coordinators per 1,000 peak-week hearings, the plan', ...rows.map((r) => m1(r.coordPer1000)));
  line('  today, the four checks by hand, the full sheet by hand, the tower (the same at every volume)', [vol.per1000.today, vol.per1000.shortForm, vol.per1000.fullForm, vol.per1000.tower].map(m1).join(', '));
  line('Coordinators in a peak week, the plan', ...rows.map((r) => r.coordinators.toFixed(2)));
  line('Coordination per hearing, the plan', ...rows.map((r) => usd(r.coord, 2)));
  line('Bench manager and tools per hearing', ...rows.map((r) => usd(r.overhead, 2)));
  line('Running cost per hearing, all in, the plan', ...rows.map((r) => usd(r.cost, 2)));
  line(`  the same with the tower in place of the plan's coordination (${usd(VOLUME.towerBuild)} build)`, ...rows.map((r) => usd(r.towerCost, 2)));
  line('  against today', usd(b.costToday, 2));
  line(`Left after running costs at ${usd(vol.fees[0], 2)} a hearing`, ...rows.map((r) => usd(r.left[0])));
  line(`Left after running costs at ${usd(vol.fees[1], 2)} a hearing`, ...rows.map((r) => usd(r.left[1])));
  line(`From ${count(rows[0].h)} to ${count(last.h)} hearings (x${vol.growth.hearings.toFixed(1)}), coordinators in a peak week rise x${vol.growth.coordinators.toFixed(1)}`, `the minutes a hearing fall ${pct(vol.growth.minutesFall)}. Coordination still grows nearly in a straight line: ${m1(vol.perHearing)} of the minutes are counted per hearing, and only the docket part (${m1(rows[0].perDocketPart)} at ${count(rows[0].h)}, ${m1(last.perDocketPart)} at ${count(last.h)}) falls`);
  line(`These minutes are estimates, anchored to today's ${m1(vol.input.minutesByHand)} and the kit's counts of the example week`, 'timed minutes from the live weeks (two timings of 25 hearings, each minute marked per hearing or per docket) replace them'); }


console.log('\nMISSES PREVENTED, PER HEARING: THREE THINGS NOBODY HERE KNOWS');
line('Missed today', 'Prevented', ...fr.map((x) => `Fee ${usd(x, 0)}`));
for (const r of missTable(over)) line(pct(r.missToday), pct(r.missAvoided), ...r.cells.map((c2) => `${usd(c2.perHearing, 2)} (${usd(c2.aYear)} a year)`));
line('Fee lost with one miss, this year', '', ...missTable(over)[0].cells.map((c2) => usd(c2.feeLostThisYear, 0)));
line('  with later yearly fees', '', ...missTable(over)[0].cells.map((c2) => usd(c2.feeLostPerMiss, 0)));

console.log(`\nA YEAR AT ${count(b.input.hearingsPerYear)} HEARINGS`);
line('Fee income', usd(b.year.revenue));
line('Cost today', usd(b.year.costToday), `consultants ${usd(b.year.consultants)}, coordination ${usd(b.year.coordinationToday)}`);
line('Cost with the control', usd(b.year.costKit));
line('Cost with the tower', usd(b.year.costAfter));
line('Hearings missed today', count(b.year.missedToday), `fees lost ${usd(b.year.feesLostToMisses)}`);
line('The control is worth', usd(b.year.kitValue), `misses ${usd(b.year.missMargin)}, keeping it ${usd(-b.year.kitWork)}, block rate ${usd(b.year.blockValue)}`);
line('The tower against today’s process', usd(b.year.towerVsToday), `lean build ${usd(40000)} to ${usd(70000)} a year: net ${usd(b.year.towerVsToday - 40000)} to ${usd(b.year.towerVsToday - 70000)}`);
line('The tower if today takes the simulation\'s minutes', usd(b.towerRange.year[1]), `${b.towerRange.simMinutes} minutes a hearing by hand, not ${b.input.minutesByHand}: ${usd(b.towerRange.sim, 2)} a hearing, net ${usd(b.towerRange.netAtSim[1])} to ${usd(b.towerRange.netAtSim[0])}; pays from ${count(b.towerRange.paysFromAtSim[0])} to ${count(b.towerRange.paysFromAtSim[1])} hearings a year`);
line('Control and tower together', usd(b.year.value));
line('Paid out in the 8 peak weeks', usd(b.year.peakOutlay), `of which consultants ${usd(b.year.peakConsultantPay)}; fees arrive later`);
line('The lean build pays if it removes', `${b.decision.removeLow.toFixed(0)} to ${b.decision.removeHigh.toFixed(0)} coordinator-minutes a hearing`, `of today's ${b.input.minutesByHand} (desk estimate; the simulation says 37.5; nobody has counted the firm's hours)`);
line('  the same as timed minutes today, if the tower removes the share set above', `${b.decision.leanLow.toFixed(0)} to ${b.decision.leanHigh.toFixed(0)} minutes`);

console.log('\nBREAK-EVEN: HEARINGS A YEAR THAT PAY FOR IT');
const t = threeCases(over);
line('Option', 'Yearly cost', 'Measured against', 'Hopeful', 'Chosen inputs', 'Cautious');
for (const bd of BUILDS) {
  const k = (c) => count(c.builds.find((x) => x.key === bd.key).breakEven);
  line(bd.label, usd(bd.yearly), bd.worth === 'kit' ? 'misses prevented, less its upkeep' : 'minutes removed from today’s process', k(t.hopeful), k(t.chosen), k(t.cautious));
}
line('Kit, value per hearing', '', '', usd(t.hopeful.kitValue, 2), usd(t.chosen.kitValue, 2), usd(t.cautious.kitValue, 2));
line('Tower, value per hearing', '', '', usd(t.hopeful.towerVsToday, 2), usd(t.chosen.towerVsToday, 2), usd(t.cautious.towerVsToday, 2));
const nb = businessCase({ ...over, blockDiscount: 0.1 });
line('Kit if consultants agree a 10% block rate', '', '', '', usd(nb.kitValue, 2), Number.isFinite(nb.builds[0].breakEven) ? `pays from ${count(nb.builds[0].breakEven)}` : 'does not pay in dollars');
const r30 = businessCase({ ...over, reduction: 0.3 });
line('Lean build if the tower removes 30% of the minutes, not 60%', '', '', '', usd(r30.towerVsToday, 2), `pays from ${count(r30.builds[1].breakEven)} to ${count(r30.builds[2].breakEven)}`);

console.log('\nPEAK SEASON');
line('Hearings in a peak week', count(b.peak.hearingsAWeek));
line('Coordinators needed today', b.peak.coordinatorsToday.toFixed(1), `${count(b.peak.perCoordinatorToday)} hearings a week each`);
line('Coordinators needed with the control', b.peak.coordinatorsKit.toFixed(1), `${count(b.peak.perCoordinatorKit)} hearings a week each`);
line('Coordinators needed with the tower', b.peak.coordinatorsAfter.toFixed(1), `${count(b.peak.perCoordinatorAfter)} hearings a week each`);
line('Consultant-days in a peak week', count(b.peak.consultantDaysAWeek), `${count(b.peak.hearingsAWeek / 8)} to ${count(b.peak.hearingsAWeek / 4)} at 8 to 4 hearings a day`);
line('Consultants a peak week needs', count(b.peak.consultants), `${count(b.peak.hearingsAWeek / 8 / 5)} to ${count(b.peak.hearingsAWeek / 4 / 5)}, at five days a week each; the example packet lists six`);
line('  at 6, 8 and 12 hearings a consultant-day', [6, 8, 12].map((n) => b.peak.consultantsAt[n].toFixed(1)).join(' / '), `whole people: ${[6, 8, 12].map((n) => Math.ceil(b.peak.consultantsAt[n])).join(', ')}. Stacking raises hearings a day; no consultant in the packet accepts more than 8, and the example week runs at 1.6`);
line('  with the in-house representatives of the illustration', b.peak.consultantsWithInHouse.toFixed(1), `they take ${count(b.inHouse.aWeek)} of the week's hearings`);
line('The tower, if the peak is covered by seasonal staff', usd(b.peak.seasonalSaving), 'a year: the temps not hired for 8 weeks, against today’s head count');
line('What-if, not part of the case: a peak-sized team kept all year', usd(b.peak.permanentSaving), `a year; coordination would then cost ${usd(b.peak.permanentCoordinationPerHearingToday, 2)} a hearing today`);

const c = criticsMath();
console.log(`\nA READER'S CHECK, REPRODUCED: ${c.minutes.toFixed(1)} minutes saved at $35 to $50 an hour is ${usd(c.perHearing[0], 2)} to ${usd(c.perHearing[1], 2)} per hearing. An engineer at $150,000 to $200,000 breaks even at ${count(c.engineer[0])} to ${count(c.engineer[1])} hearings a year, the lean build (at $40,000 to $70,000 a year) at ${count(c.lean[0])} to ${count(c.lean[1])}.`);
