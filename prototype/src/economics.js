// THE BUSINESS CASE, as arithmetic anyone can check. One module computes every dollar figure in
// the write-up, the design document and the "Business case" page of the app, so they cannot
// drift apart.
//
// Nothing here is measured at the real firm. Each input carries a basis:
//   sourced    a public document says so (see research/)
//   packet     the firm's fictional example packet
//   simulated  counted in this prototype's simulation
//   estimate   my assumption, with a range
//   unknown    only the firm knows: the page asks for it
//
// The model is deliberately small. Per hearing:
//   cost           = consultant + coordination
//   coordination   = person-minutes x what a productive minute costs
//                    (paid hours cost money, only some of them are productive: one assumption,
//                     used for both the dollars and the head count)
//   fee            = first-year saving x chance of a reduction x fee share
// The fee is the weakest figure here: the public saving is an average per CUSTOMER, and most
// cases never reach a hearing. A hearing is a cost inside a customer's case, not a product with
// its own revenue. So the page leads with cost, which does not depend on the fee.
//
// Two changes, valued separately, because one needs no software:
//   the week-one kit   = misses prevented by the gates run by hand
//                        - the extra minutes it takes to keep the sheet
//                        (+ a block rate for consultants, which is NOT counted until agreed)
//   the tower          = the coordination minutes it removes against TODAY's process, after it
//                        has taken over the sheet (the kit already prevents the misses, so they
//                        are not counted twice)
// A missed hearing loses a share of this year's fee (the office's rules decide how much) and,
// when the client leaves, later fees too. Preventing it costs the consultant who now attends.
//
// What it leaves out, on purpose: the cost of winning the customer, case preparation, refunds,
// liability and reputation. All of them make a missed hearing worse than this model says; none
// is known here. Sources for the inputs marked "sourced": research/04 to research/07.

export const INPUTS = [
  { key: 'hearingsPerYear', label: 'Hearings a year', unit: 'count', min: 250, max: 50000, step: 250, value: 5000, low: 1000, high: 20000, basis: 'unknown', note: 'The firm knows this. Everything below scales with it.' },
  { key: 'firstYearSaving', label: 'First-year tax saving when an appeal wins', unit: 'usd', min: 200, max: 3000, step: 25, value: 774, low: 400, high: 1500, basis: 'sourced', note: 'One large competitor’s published average per customer (a company claim). It does not say whether customers who won nothing are counted.' },
  { key: 'winRate', label: 'Chance of a reduction', unit: 'pct', min: 0.2, max: 1, step: 0.01, value: 0.5, low: 0.4, high: 0.65, basis: 'sourced', note: 'Official: 50% of appellants at one large board (48% of those with a representative), about 40% at another. If the saving above already averages over losers, set this to 100%.' },
  { key: 'feeShare', label: 'The firm’s share of the first-year saving', unit: 'pct', min: 0.1, max: 0.5, step: 0.01, value: 0.25, low: 0.25, high: 0.5, basis: 'sourced', note: 'One large firm takes about 25% (press report), another 50% (its own terms).' },
  { key: 'consultantFee', label: 'Consultant fee per hearing', unit: 'usd', min: 25, max: 250, step: 5, value: 90, low: 75, high: 110, basis: 'packet', note: 'The example packet lists $75 to $110.' },
  { key: 'coordinatorRate', label: 'Coordinator cost per paid hour, with benefits', unit: 'usd', min: 20, max: 90, step: 0.5, value: 33, low: 27, high: 38, basis: 'sourced', note: 'Median US wage of an administrative assistant ($23.23) to a paralegal ($30.24) (labor statistics). The national benefits ratio of 1.43 gives $33 to $43; a small firm’s benefits are usually lighter, so $27 to $38.' },
  { key: 'productiveHours', label: 'Productive coordination hours in a 40-hour week', unit: 'h', min: 15, max: 40, step: 1, value: 30, low: 35, high: 25, basis: 'estimate', note: 'The rest is meetings, breaks and waiting. It sets both what a coordination minute costs and how many hearings one person carries.' },
  { key: 'minutesByHand', label: 'Coordination minutes per hearing today', unit: 'min', min: 5, max: 60, step: 0.1, value: 19.6, low: 19.6, high: 37.5, basis: 'estimate', note: '19.6 from the example week by desk estimate, 37.5 in the simulation. Nobody has timed the firm: payroll gives the top-down figure in week 1, and live week 1 times 25 hearings.' },
  { key: 'reduction', label: 'Share of coordination minutes the tower removes', unit: 'pct', min: 0, max: 0.95, step: 0.01, value: 0.6, low: 0.3, high: 0.84, basis: 'simulated', note: '60% to 84% in my own simulation, with simulated counterparties. That is not a measurement. 30% is the downside case.' },
  { key: 'missToday', label: 'Hearings missed today (nobody attends)', unit: 'pct', min: 0, max: 0.15, step: 0.0025, value: 0.02, low: 0.01, high: 0.05, basis: 'unknown', note: 'The firm knows this, and it is the first number to count. No hearing office publishes a rate. 2% is my guess. In the example week 5 of the 19 hearings ahead had no consultant named: that is an exposure, not a miss rate.' },
  { key: 'missAvoided', label: 'Share of those misses the gates prevent', unit: 'pct', min: 0, max: 1, step: 0.01, value: 0.25, low: 0.13, high: 0.5, basis: 'estimate', note: 'Evidence: reminder texts cut no-shows by 13% to 23% in court and hospital trials. A written yes per hearing and evidence on file should do more. Half is the season-one target, not evidence.' },
  { key: 'lossGivenMiss', label: 'Share of this year’s fee lost when nobody attends', unit: 'pct', min: 0, max: 1, step: 0.05, value: 0.75, low: 0.5, high: 1, basis: 'estimate', note: 'The office’s rules decide. Texas: a new hearing if a good-cause letter arrives within 4 days, or a decision on a sworn statement already on file. Florida and California: relief denied.' },
  { key: 'laterYears', label: 'Later yearly fees that leave with the client, on average per miss', unit: 'yr', min: 0, max: 5, step: 0.25, value: 1.5, low: 0, high: 3, basis: 'estimate', note: 'For example: half of the clients leave after a missed hearing, and each would have stayed three more years. Nobody publishes either number; renewals after a miss are on the day-one count.' },
  { key: 'kitMinutes', label: 'Extra minutes per hearing for the standing control (four checks)', unit: 'min', min: 0, max: 12, step: 0.5, value: 2, low: 4, high: 1, basis: 'estimate', note: 'A yes per slot, evidence on file, a day-before text, an arrival text. The full five-gate sheet, which the plan runs in all ten counties, is about 4 minutes; the plan\'s own minutes, with the reply rule and the readers, are in the volume table. Not timed.' },
  { key: 'blockDiscount', label: 'Consultant fee saved on hearings paid as a block', unit: 'pct', min: 0, max: 0.4, step: 0.01, value: 0, low: 0, high: 0.1, basis: 'unknown', note: 'Not counted until consultants agree in writing. They are the scarcest resource and also work for competitors, so the plan offers full mornings and fast payment for reliability, not for a lower price.' },
  { key: 'blockShare', label: 'Share of hearings that fall in blocks of four or more', unit: 'pct', min: 0, max: 1, step: 0.05, value: 0.6, low: 0.3, high: 0.8, basis: 'estimate', note: 'Same office, same day. Texas boards must put up to 20 of an agent’s hearings on one day on request. To be counted from last season’s calendar.' },
  { key: 'peakShare', label: 'Share of the year’s hearings in the 8 busiest weeks', unit: 'pct', min: 0.15, max: 0.9, step: 0.05, value: 0.6, low: 0.4, high: 0.8, basis: 'estimate', note: 'Texas boards hear most protests from May to August, and one large board finishes by mid-July. No office publishes hearings by month.' },
  { key: 'hearingsPerConsultantDay', label: 'Hearings one consultant attends in a day', unit: 'count', min: 1, max: 20, step: 1, value: 6, low: 4, high: 8, basis: 'packet', note: 'Decides how many consultants a peak week needs. The example packet’s six consultants take at most 4 to 8 hearings a day, although 14 of its 24 hearings are by video, 30 minutes apart on the calendar. A Texas board must put up to 20 of an agent’s hearings on one day on request. Stacking hearings is the cheapest way to add capacity.' },
];

// "worth" says which value a way of doing it is measured against: the kit against what the kit
// achieves, the software against the minutes it removes from today's process.
export const BUILDS = [
  { key: 'phase0', label: 'The standing control, no software', yearly: 10000, worth: 'kit', basis: 'estimate', note: 'First year only: four weeks of the associate’s time (two for the count and the control, two to connect and check the readers), three days of a coordinator’s and three hours of the owner’s. A text line comes on top, about $1,000 a year at list price. The daily work of keeping the four checks is counted per hearing, not here.' },
  { key: 'lean', label: 'Lean build: the associate builds the tower with AI coding tools', yearly: 40000, worth: 'tower', basis: 'estimate', note: 'Every year: about a fifth of the associate’s time, hosting and models, and a contractor for a security review.' },
  { key: 'leanHigh', label: 'Lean build, with shadowing and season support counted', yearly: 70000, worth: 'tower', basis: 'estimate', note: 'Every year: the same once the shadow months, new counties and support during the season are counted as the associate’s time.' },
  { key: 'engineerLow', label: 'A dedicated engineer', yearly: 150000, worth: 'tower', basis: 'estimate', note: 'Loaded cost, low.' },
  { key: 'engineerHigh', label: 'A dedicated engineer', yearly: 200000, worth: 'tower', basis: 'estimate', note: 'Loaded cost, high.' },
];

export const PEAK_WEEKS = 8;
// A standby holds a morning free. Nobody does that for a fraction of one fee, so the price is a
// guaranteed minimum: half of a block of six hearings.
export const STANDBY_SHARE = 0.5;
export const PAID_HOURS_A_WEEK = 40;
export const PAID_HOURS_A_YEAR = 2080;
export const WORKING_DAYS_A_WEEK = 5;
// An illustration of paying a stacked morning by the half day and not by the hearing. Nothing here
// is asked or agreed: it is the question for the first three consultant calls. A consultant with
// six single hearings spread over a day earns six fees for a full day with travel; a guaranteed
// stacked morning pays less per hearing and more per hour.
export const BLOCK_HEARINGS = 6;          // a morning's block: the guaranteed minimum a standby would ask for is half of it
export const FULL_SHEET_MINUTES = 4;      // the full five-gate sheet by hand, which the plan runs in all ten counties
export const SIM_MINUTES_BY_HAND = 37.5;  // coordination minutes per hearing in the simulation's by-hand runs
// How the person in the room could cost less without asking contractors for a lower price: the
// firm's own seasonal representatives on video dockets in the peak. An illustration only: the
// wage is not known, and each state decides who may appear. 14 of the packet's 24 hearings are on video.
export const IN_HOUSE = { hourly: 50, hours: 8, perDay: [8, 12], videoShare: 14 / 24, share: 0.5 };

export function defaults() {
  return Object.fromEntries(INPUTS.map((i) => [i.key, i.value]));
}
export function corner(which) {
  return Object.fromEntries(INPUTS.map((i) => [i.key, i[which]]));
}

const finite = (x) => (Number.isFinite(x) ? x : 0);

// Everything about ONE hearing, then about one year.
export function businessCase(input = {}) {
  const i = { ...defaults(), ...input };
  // A paid hour costs the rate; only productiveHours of 40 are productive. One assumption for
  // the dollars and the head count.
  const perMinute = i.productiveHours > 0 ? (i.coordinatorRate * PAID_HOURS_A_WEEK) / i.productiveHours / 60 : 0;
  const fee = i.firstYearSaving * i.winRate * i.feeShare;                 // expected, per attended hearing
  const clientSaving = i.firstYearSaving * i.winRate - fee;               // what the homeowner keeps, expected

  // minutes: today, with the control, and with the tower doing most of the control's work too
  const minutesKit = i.minutesByHand + i.kitMinutes;
  const minutesAfter = minutesKit * (1 - i.reduction);
  const minutesSaved = minutesKit - minutesAfter;                         // against the sheet
  const minutesSavedVsToday = i.minutesByHand - minutesAfter;             // against today's process
  const coordToday = i.minutesByHand * perMinute;
  const coordKit = minutesKit * perMinute;
  const coordAfter = minutesAfter * perMinute;

  // value of the two changes, per scheduled hearing
  const kitWork = i.kitMinutes * perMinute;                               // the kit's own cost
  const blockValue = i.consultantFee * i.blockDiscount * i.blockShare;    // only if consultants agree
  const missesAvoided = i.missToday * i.missAvoided;                      // share of all hearings
  const feeLostThisYear = i.lossGivenMiss * fee;                          // per miss
  const feeLostPerMiss = feeLostThisYear + i.laterYears * fee;            // and the later yearly fees that leave with the client
  const missRevenue = missesAvoided * feeLostPerMiss;                     // fee income kept
  const missMargin = missesAvoided * (feeLostPerMiss - i.consultantFee);  // after paying the consultant who now attends
  const missClient = missesAvoided * i.lossGivenMiss * clientSaving;      // what the firm's clients keep
  const kitValue = blockValue + missMargin - kitWork;                     // needs no software
  const timeValue = minutesSaved * perMinute;                             // the tower, against the sheet
  const towerValue = timeValue;                                           // what the software adds on top of the kit
  const towerVsToday = minutesSavedVsToday * perMinute;                   // the cautious measure: against today's process
  const perHearing = kitValue + towerValue;                               // profit effect of both

  // cost and margin per hearing in the three states
  const consultantKit = i.consultantFee - blockValue;
  const costToday = i.consultantFee + coordToday;
  const costKit = consultantKit + coordKit;
  const costAfter = consultantKit + coordAfter;
  const marginToday = fee - costToday;
  const marginKit = marginToday + kitValue;
  const marginAfter = marginKit + towerValue;

  // one percentage point of missed hearings, and the miss rate at which misses equal the time saving
  const pointRevenue = 0.01 * feeLostPerMiss;
  const missRateWhereRevenueEqualsTime = feeLostPerMiss > 0 && i.missAvoided > 0 ? towerVsToday / (i.missAvoided * feeLostPerMiss) : Infinity;

  // Who has to be in the room. A consultant costs the fee; a percentage point of win chance earns
  // the firm one hundredth of its share of the saving. Attending pays only where it raises the
  // expected fee by more than the consultant costs.
  const feePerWinPoint = i.firstYearSaving * i.feeShare * 0.01;
  // The bar depends on a fee nobody here knows, so it is a range over the same three readings of
  // the public figures as feeRange: the saving as stated at a 25% share; the saving on a win twice
  // that (if the public average counts customers who won nothing) at 25%; and that at a 50% share.
  // The last also equals the bar on the client's and the firm's money together in the first reading.
  const points = (savingOnWin, share) => (savingOnWin * share > 0 ? i.consultantFee / (savingOnWin * share * 0.01) : Infinity);
  const attendance = {
    feePerWinPoint, pointsNeeded: feePerWinPoint > 0 ? i.consultantFee / feePerWinPoint : Infinity, tenthOnPaper: 0.1 * i.consultantFee,
    pointsRange: [points(i.firstYearSaving * 2, 0.5), points(i.firstYearSaving * 2, 0.25), points(i.firstYearSaving, 0.25)],
    pointsOnWholeSaving: points(i.firstYearSaving, 1),
  };
  // What a missed hearing has to cost the firm, all in (fee, refund, the client, the claim), for
  // the sheet to pay for itself: its upkeep per prevented miss, plus the consultant who attends.
  const missCostWhereSheetPays = missesAvoided > 0 ? kitWork / missesAvoided + i.consultantFee : Infinity;
  // The same break-even at other guesses of the two unknowns, and for the full five-gate sheet.
  const missCost = (minutes, missToday, missAvoided) => (missToday * missAvoided > 0 ? (minutes * perMinute) / (missToday * missAvoided) + i.consultantFee : Infinity);
  const missCostRange = { control: missCostWhereSheetPays, ifWorse: missCost(i.kitMinutes, 0.05, 0.5), ifBetter: missCost(i.kitMinutes, 0.01, 0.13), fullSheet: missCost(FULL_SHEET_MINUTES, i.missToday, i.missAvoided) };
  // "Fewer errors" is more than no-shows: a consultant with the current file and the right date
  // wins more often. One percentage point of win rate, and the points at which the control pays.
  const winPointFirm = 0.01 * i.firstYearSaving * i.feeShare, winPointClient = 0.01 * i.firstYearSaving * (1 - i.feeShare);
  const winPoint = {
    firm: winPointFirm, client: winPointClient, yearFirm: i.hearingsPerYear * winPointFirm, yearClient: i.hearingsPerYear * winPointClient,
    controlPaysAt: winPointFirm > 0 ? kitWork / winPointFirm : Infinity,
    fullSheetPaysAt: winPointFirm > 0 ? (FULL_SHEET_MINUTES * perMinute) / winPointFirm : Infinity,
  };
  // The tower at both of my estimates of today's minutes: the desk estimate (the input) and the
  // simulation's by-hand runs. The firm's payroll hours decide between them.
  const vsToday = (byHand) => (byHand - (byHand + i.kitMinutes) * (1 - i.reduction)) * perMinute;
  const simValue = vsToday(SIM_MINUTES_BY_HAND);
  const towerRange = {
    desk: towerVsToday, sim: simValue, simMinutes: SIM_MINUTES_BY_HAND, year: [i.hearingsPerYear * towerVsToday, i.hearingsPerYear * simValue],
    netAtDesk: [i.hearingsPerYear * towerVsToday - 70000, i.hearingsPerYear * towerVsToday - 40000], netAtSim: [i.hearingsPerYear * simValue - 70000, i.hearingsPerYear * simValue - 40000],
    paysFromAtSim: simValue > 0 ? [40000 / simValue, 70000 / simValue] : [Infinity, Infinity],
  };
  // The firm's own seasonal representatives on video dockets in the peak: an illustration, see IN_HOUSE.
  const inHouseDay = IN_HOUSE.hourly * IN_HOUSE.hours;
  const inHouseHearings = i.hearingsPerYear * i.peakShare * IN_HOUSE.videoShare * IN_HOUSE.share;
  const inHouse = {
    ...IN_HOUSE, day: inHouseDay, perHearing: [inHouseDay / IN_HOUSE.perDay[1], inHouseDay / IN_HOUSE.perDay[0]],
    saving: [i.consultantFee - inHouseDay / IN_HOUSE.perDay[0], i.consultantFee - inHouseDay / IN_HOUSE.perDay[1]],
    hearings: inHouseHearings, aWeek: inHouseHearings / PEAK_WEEKS,
    people: [inHouseHearings / PEAK_WEEKS / IN_HOUSE.perDay[1] / WORKING_DAYS_A_WEEK, inHouseHearings / PEAK_WEEKS / IN_HOUSE.perDay[0] / WORKING_DAYS_A_WEEK],
    year: [inHouseHearings * (i.consultantFee - inHouseDay / IN_HOUSE.perDay[0]), inHouseHearings * (i.consultantFee - inHouseDay / IN_HOUSE.perDay[1])],
    // With whole people hired for the peak's 40 days: [at the low hearings a day, at the high].
    wholePeople: IN_HOUSE.perDay.map((n) => Math.ceil(inHouseHearings / PEAK_WEEKS / n / WORKING_DAYS_A_WEEK)),
    yearWhole: IN_HOUSE.perDay.map((n) => inHouseHearings * i.consultantFee - Math.ceil(inHouseHearings / PEAK_WEEKS / n / WORKING_DAYS_A_WEEK) * PEAK_WEEKS * WORKING_DAYS_A_WEEK * inHouseDay),
    breakEvenPerDay: i.consultantFee > 0 ? inHouseDay / i.consultantFee : Infinity,
    consultantDayToday: i.hearingsPerConsultantDay * i.consultantFee,
  };

  // a standby, per office-day: it pays only where enough hearings sit on that day. This is the
  // most a standby can save, as if every miss were a consultant who did not come.
  const standbyFee = STANDBY_SHARE * BLOCK_HEARINGS * i.consultantFee;
  const standby = { fee: standbyFee, paysFromHearingsPerOfficeDay: i.missToday * feeLostPerMiss > 0 ? standbyFee / (i.missToday * feeLostPerMiss) : Infinity };

  // a year
  const H = i.hearingsPerYear;
  const year = {
    revenue: H * fee, consultants: H * i.consultantFee, coordinationToday: H * coordToday, coordinationKit: H * coordKit, coordinationAfter: H * coordAfter,
    costToday: H * costToday, costKit: H * costKit, costAfter: H * costAfter, marginToday: H * marginToday,
    timeValue: H * timeValue, towerVsToday: H * towerVsToday, blockValue: H * blockValue, kitWork: H * kitWork, missRevenue: H * missRevenue, missMargin: H * missMargin, missClient: H * missClient,
    kitValue: H * kitValue, towerValue: H * towerValue, value: H * perHearing, missedToday: H * i.missToday, missedAfter: H * i.missToday * (1 - i.missAvoided),
    feesLostToMisses: H * i.missToday * feeLostPerMiss,
    peakOutlay: H * i.peakShare * costToday, peakConsultantPay: H * i.peakShare * i.consultantFee,
  };

  // peak season: how many coordinators and consultants the busiest weeks need
  const peakWeek = (H * i.peakShare) / PEAK_WEEKS;
  const perCoordinator = (minutes) => (minutes > 0 ? (i.productiveHours * 60) / minutes : Infinity);
  const perCoordinatorToday = perCoordinator(i.minutesByHand), perCoordinatorKit = perCoordinator(minutesKit), perCoordinatorAfter = perCoordinator(minutesAfter);
  const coordinatorsToday = finite(peakWeek / perCoordinatorToday), coordinatorsKit = finite(peakWeek / perCoordinatorKit), coordinatorsAfter = finite(peakWeek / perCoordinatorAfter);
  const fewer = coordinatorsToday - coordinatorsAfter;
  const consultantDaysAWeek = i.hearingsPerConsultantDay > 0 ? peakWeek / i.hearingsPerConsultantDay : Infinity;
  const peak = {
    hearingsAWeek: peakWeek,
    coordinatorsToday, coordinatorsKit, coordinatorsAfter,
    perCoordinatorToday, perCoordinatorKit, perCoordinatorAfter,
    consultantDaysAWeek, consultants: consultantDaysAWeek / WORKING_DAYS_A_WEEK,
    consultantsAt: Object.fromEntries([2.4, 2.8, 4, 6, 8, 12].map((n) => [n, peakWeek / n / WORKING_DAYS_A_WEEK])),
    consultantsWithInHouse: i.hearingsPerConsultantDay > 0 ? Math.max(0, peakWeek - inHouse.aWeek) / i.hearingsPerConsultantDay / WORKING_DAYS_A_WEEK : Infinity,
    // what the tower saves if the peak is covered by seasonal people, against today's process
    seasonalSaving: fewer * PEAK_WEEKS * PAID_HOURS_A_WEEK * i.coordinatorRate,
    // a what-if, not part of the case: people kept all year for the peak. Under that staffing a
    // hearing costs far more than the table says, because most of their year is idle.
    permanentSaving: fewer * PAID_HOURS_A_YEAR * i.coordinatorRate,
    permanentCoordinationPerHearingToday: H > 0 ? (coordinatorsToday * PAID_HOURS_A_YEAR * i.coordinatorRate) / H : 0,
  };

  // break-even: how many hearings a year pay for a yearly cost
  const breakEven = (yearly, basis = perHearing) => (basis > 0 ? yearly / basis : Infinity);
  const worthOf = { kit: kitValue, tower: towerVsToday };
  const builds = BUILDS.map((b) => ({ ...b, perHearing: worthOf[b.worth], breakEven: breakEven(b.yearly, worthOf[b.worth]), pays: worthOf[b.worth] > 0 && H * worthOf[b.worth] >= b.yearly, net: H * worthOf[b.worth] - b.yearly }));

  // The build decision as one number: the timed minutes per hearing today above which a build of
  // a given yearly cost pays at this volume.
  const minutesWhereItPays = (yearly) => (H > 0 && perMinute > 0 && i.reduction > 0 ? (yearly / (H * perMinute) + i.kitMinutes * (1 - i.reduction)) / i.reduction : Infinity);
  // The same decision with no ratio in it: the minutes a build has to REMOVE per hearing, against
  // today, to pay for itself. Today's minutes come from the firm's hours, the remaining minutes
  // from a read-only run; neither comes from a simulation.
  const minutesToRemove = (yearly) => (H > 0 && perMinute > 0 ? yearly / (H * perMinute) : Infinity);
  // The same plan in cash. A saved coordinator minute is cash only if someone is not hired, so
  // the tower's cash saving is the seasonal coordinators not taken on in the peak. Cash needed in
  // a peak is what is paid out each week times the weeks until the fee for those hearings arrives.
  const cashPerHearing = H > 0 ? peak.seasonalSaving / H : 0;
  const weeklyPeakPayout = year.peakOutlay / PEAK_WEEKS;
  const WEEKS_TO_FEE = 12; // assumed weeks from a hearing to the fee received; counted on day 1
  const ordinaryWeekPayout = (year.costToday - year.peakOutlay) / (52 - PEAK_WEEKS);
  // Settling before a consultant is booked, net of the call it takes (an assumed 5 minutes a scheduled hearing).
  const SETTLE_CALL_MINUTES = 5;
  const settleCall = SETTLE_CALL_MINUTES * perMinute;
  const settle = {
    callMinutes: SETTLE_CALL_MINUTES, callCost: settleCall, perPoint: i.consultantFee / 100,
    breakEvenPoints: i.consultantFee > 0 ? settleCall / (i.consultantFee / 100) : Infinity,
    grossAt10: H * 0.1 * i.consultantFee, netAt10: H * (0.1 * i.consultantFee - settleCall),
  };
  // The bench in names: consultants are part-time, so a name gives the firm about two days a week.
  const BENCH_DAYS = 2;
  const bench = { daysEach: BENCH_DAYS, names: Object.fromEntries([1.6, 2, 2.4, 2.8, 4, 6].map((n) => [n, Math.ceil(peak.hearingsAWeek / n / BENCH_DAYS)])),
    // the same at the 1.2 days a week each that the example week shows (seven consultant-days from six people)
    namesAtSeenDays: Object.fromEntries([1.6, 2.4, 2.8, 6].map((n) => [n, Math.ceil(peak.hearingsAWeek / n / 1.2)])) };
  const coordinatorsPer1000 = peak.hearingsAWeek > 0 ? [peak.coordinatorsToday, peak.coordinatorsKit, peak.coordinatorsAfter].map((c) => (1000 * c) / peak.hearingsAWeek) : [0, 0, 0];
  const cash = {
    towerYear: peak.seasonalSaving, towerNet: [peak.seasonalSaving - 70000, peak.seasonalSaving - 40000],
    towerPaysFrom: cashPerHearing > 0 ? [40000 / cashPerHearing, 70000 / cashPerHearing] : [Infinity, Infinity],
    weeklyPeakPayout, weeksAssumed: WEEKS_TO_FEE, ordinaryWeekPayout,
    // Paid out before the first peak fee arrives: the peak's weeks, then ordinary weeks up to the lag.
    need: WEEKS_TO_FEE >= PEAK_WEEKS ? year.peakOutlay + (WEEKS_TO_FEE - PEAK_WEEKS) * ordinaryWeekPayout : weeklyPeakPayout * WEEKS_TO_FEE,
  };
  // A docket rate, asked for and not counted: the full fee for the first two hearings of a
  // consultant's office-day and a lower fee from the third. More pay per day, less per hearing.
  const DOCKET = { first: i.consultantFee, later: 70, firstN: 2 };
  const docketPay = (n) => Math.min(n, DOCKET.firstN) * DOCKET.first + Math.max(0, n - DOCKET.firstN) * DOCKET.later;
  const docketRate = {
    ...DOCKET, pay4: docketPay(4), pay6: docketPay(6), perHearing4: docketPay(4) / 4, perHearing6: docketPay(6) / 6, twoSingles: 2 * i.consultantFee,
    saving4: i.consultantFee - docketPay(4) / 4, year: H * i.blockShare * (i.consultantFee - docketPay(4) / 4),
  };
  const decision = { leanLow: minutesWhereItPays(40000), leanHigh: minutesWhereItPays(70000), removeLow: minutesToRemove(40000), removeHigh: minutesToRemove(70000) };

  return {
    input: i, perMinute, fee, clientSaving, minutesKit, minutesAfter, minutesSaved, minutesSavedVsToday, coordToday, coordKit, coordAfter,
    consultantKit, costToday, costKit, costAfter, marginToday, marginKit, marginAfter,
    marginBeforeCoordination: fee - i.consultantFee,
    consultantShareOfFee: fee > 0 ? i.consultantFee / fee : Infinity,
    consultantShareOfCost: costToday > 0 ? i.consultantFee / costToday : 0,
    timeValue, blockValue, kitWork, missesAvoided, feeLostThisYear, feeLostPerMiss, missRevenue, missMargin, missClient, kitValue, towerValue, towerVsToday, perHearing,
    pointRevenue, missRateWhereRevenueEqualsTime, attendance, missCostWhereSheetPays, missCostRange, winPoint, towerRange, inHouse, cash, settle, bench, coordinatorsPer1000, docketRate, standby, year, peak, builds, breakEven, decision,
  };
}

// ---- WHAT FALLS WITH VOLUME: the plan's running cost at 300, 1,000 and 5,000 hearings a year,
// and season one with its set-up. Two kinds of lever, both without the tower.
//
// 1. Consultant-days. More hearings in the same ten offices fill days. Assumptions (estimates, to
//    replace with the firm's calendar): the share of video hearings pooled within a state into full
//    days of six (paid $400 a day), and in-person hearings a consultant-day where offices put our
//    hearings on one day. Video hearings that are not pooled run at the season target of 2.4 a day.
export const VOLUME = {
  hearings: [300, 1000, 5000],
  pooled: [0, 0.5, 0.9],          // estimate: share of video hearings on full pooled days of six
  inPerson: [2.4, 3, 4],          // estimate: in-person hearings a consultant-day as offices fill days
  videoShare: 14 / 24,            // packet: 14 of its 24 hearings are by video
  pooledDay: 6, dayRate: 400,     // a pooled video day: six hearings for $400
  seasonTarget: 2.4,              // estimate: hearings a consultant-day, the example week (18 hearings, June 10 to 14) with its open hearings staffed on 7 or 8 consultant-days (2.3 to 2.6)
  overhead: [0, 0, 44000],        // a year: at 5,000 a half-time bench manager ($40,000) and tools ($4,000)
  setUp: [12000, 23000, 0],       // season one: the kit's set-up budget (section 6), hand sums, not model output
  towerBuild: 40000,              // the lean build, for the comparison line
};

// 2. Coordinator minutes, split by what they are counted on. Much of the coordination is per DOCKET
//    (one office, one day, one format), not per hearing: one offer, one Wednesday list line, one
//    day-before text per consultant, one arrival watch, one result text, one notice to the office
//    naming the representatives, one schedule proof and one record proof per docket. The plan runs
//    from season one with the full gate sheet (five checks) in all ten counties, the reply rule and
//    the scheduled texts on the firm's text line, and two AI readers proposing the office proofs.
//    Every figure below comes from an existing one, except the one marked ESTIMATE.
export const DOCKET_WORK = {
  hearings: 19, dockets: 9,       // packet: the 19 hearings ahead of Friday, June 7 (18 in June 10 to 14, and 9 Orchard Road on June 18) form 9 dockets
  messagesByHearing: 57,          // the kit's count of that work, one hearing at a time: 3 a hearing
  messagesByDocket: 30,           // the kit's count of the same work, one docket at a time (about 30)
  minutesPerMessage: 2,           // estimate already in the plan (the whole-docket offer saved 1.2 messages at 2 minutes)
  shortFormChecks: 4,             // kitMinutes (+2) was estimated for four checks: 0.5 minutes a cell kept by hand
  consultantCells: 5,             // yes for the slot, day-before YES, arrival, result, case files received: filed by the rule
  officeProofs: 3,                // schedule, our name on the county's record, the clerk's receipt: proposed by the readers
  toPerson: 0.25,                 // ESTIMATE: one consultant reply in four is not in a fixed form and goes to a person
};
// How the parts are counted:
//   per hearing  today's minutes less today's messages: 19.6 - 57/19 x 2 = 13.6. All of it is kept per
//                hearing (reading and filing the hearing's mail, its case file, its result, its bill),
//                although some of it (reading the office's one schedule notice for a docket) is per
//                docket: the cautious split. The 57 messages are taken as part of today's 19.6.
//   per docket   messages: 30 for 9 dockets at 2 minutes = 6.7 (at the example week's 2.1 hearings a
//                docket this is the old lever: 57 - 30 = 27 messages, 1.4 a hearing, at 2 minutes);
//                office proofs: 3 a docket, proposed by the readers and accepted by a person in one
//                daily pass, at the 0.5 minutes a cell takes by hand (the readers get no time credit) = 1.5;
//                consultant replies: the rule files the 5 consultant cells from fixed-form replies (the
//                old 1.5 minutes were 3 such cells of the short form at 0.5 each); one in four goes to a
//                person at 0.5 = 0.6. Scheduled texts are still counted at 2 minutes a message.
//   check        the full sheet by hand, one hearing at a time, is 8 cells at 0.5 = 4.0 minutes: the
//                existing estimate of the five-gate sheet (FULL_SHEET_MINUTES).
// Hearings a docket: the example week's 19 in 9 (2.1) at 300, rising in proportion to hearings a
// consultant-day (2.4 at 300, then the pooled days and fuller in-person days above). At 5,000 this
// gives 3.6, below the 3.75 that ten offices, five days and two formats already force on a peak week
// of 375 hearings, so it is cautious. If a docket held as many hearings as a consultant-day, the
// figures would be a little better: the page prints that line too.
// These are estimates. Timed minutes from the live weeks (two timings of 25 hearings, each minute
// marked per hearing or per docket) replace them.
export function byVolume(input = {}) {
  const i = { ...defaults(), ...input }, V = VOLUME, D = DOCKET_WORK;
  const cell = i.kitMinutes / D.shortFormChecks;                                       // 0.5 by default
  const fullByHand = (D.consultantCells + D.officeProofs) * cell;                       // 4.0 = FULL_SHEET_MINUTES
  const messagesToday = (D.messagesByHearing / D.hearings) * D.minutesPerMessage;       // 6.0 of today's 19.6
  const perHearing = Math.max(0, i.minutesByHand - messagesToday);                      // 13.6
  const docketParts = {
    messages: (D.messagesByDocket / D.dockets) * D.minutesPerMessage,                   // 6.7
    proofs: D.officeProofs * cell,                                                      // 1.5
    replies: D.consultantCells * D.toPerson * cell,                                     // 0.6
  };
  const perDocket = docketParts.messages + docketParts.proofs + docketParts.replies;    // 8.8
  const exampleDensity = D.hearings / D.dockets;                                        // 2.1 hearings a docket (19 in 9)
  const minutesPerProductiveWeek = i.productiveHours * 60;
  const fees = feeRange(i).slice(0, 2);                                                 // $96.75 and $193.50: half won, all won
  const base = businessCase(i);
  const byHand = { today: i.minutesByHand, shortForm: base.minutesKit, fullForm: i.minutesByHand + fullByHand, tower: base.minutesAfter };
  let density0 = 0;
  const rows = V.hearings.map((h, k) => {
    const b = businessCase({ ...i, hearingsPerYear: h }), wk = b.peak.hearingsAWeek, f = V.pooled[k], video = V.videoShare;
    const consultant = (1 - video) * i.consultantFee + video * (f * (V.dayRate / V.pooledDay) + (1 - f) * i.consultantFee);
    const days = (wk * (1 - video)) / V.inPerson[k] + (wk * video * f) / V.pooledDay + (wk * video * (1 - f)) / V.seasonTarget;
    const perDay = days > 0 ? wk / days : 0;                                            // hearings a consultant-day
    if (k === 0) density0 = perDay;
    const perDocketHearings = density0 > 0 ? exampleDensity * (perDay / density0) : exampleDensity;
    const minutes = perHearing + perDocket / perDocketHearings;
    const minutesIfDayIsDocket = perDay > 0 ? perHearing + perDocket / perDay : minutes;
    const coord = minutes * b.perMinute;
    const overhead = h > 0 ? V.overhead[k] / h : 0;
    const cost = consultant + coord + overhead;
    const towerCost = consultant + b.coordAfter + V.towerBuild / h + overhead;
    // Season one: every consultant at the full fee, the plan's coordination from the start, and the set-up.
    const costSeasonOne = b.consultantKit + coord;
    return {
      h, peakWeek: wk, consultant, days, perDay, names: [Math.ceil(days / 2), Math.ceil(days / 1.2)],
      perDocketHearings, minutes, minutesIfDayIsDocket, perHearingPart: perHearing, perDocketPart: perDocket / perDocketHearings,
      paidMinutes: minutes * PAID_HOURS_A_WEEK / i.productiveHours,
      perCoordinator: minutesPerProductiveWeek / minutes, coordPer1000: (1000 * minutes) / minutesPerProductiveWeek, coordinators: (wk * minutes) / minutesPerProductiveWeek,
      coord, overhead, cost, towerCost, left: fees.map((fe) => h * (fe - cost)),
      seasonOne: { setUp: V.setUp[k], yearly: V.overhead[k], cost: costSeasonOne, left: fees.map((fe) => h * (fe - costSeasonOne) - V.setUp[k] - V.overhead[k]) },
    };
  });
  const per1000 = (m) => (1000 * m) / minutesPerProductiveWeek;
  const first = rows[0], last = rows[rows.length - 1];
  return {
    input: i, cell, fullByHand, messagesToday, perHearing, docketParts, perDocket, exampleDensity, fees, byHand,
    per1000: { today: per1000(byHand.today), shortForm: per1000(byHand.shortForm), fullForm: per1000(byHand.fullForm), tower: per1000(byHand.tower) },
    rows,
    // how far coordination is from a straight line between the first and the last volume
    growth: { hearings: last.h / first.h, coordinators: last.coordinators / first.coordinators, minutesFall: 1 - last.minutes / first.minutes },
  };
}

// The fee per hearing is not known. Public figures bracket it: the published saving counted as
// won half the time or every time, at a quarter or a half share.
export function feeRange(input = {}) {
  const i = { ...defaults(), ...input };
  return [i.firstYearSaving * 0.5 * 0.25, i.firstYearSaving * 1 * 0.25, i.firstYearSaving * 1 * 0.5];
}

// What preventing misses is worth per hearing, across the three things nobody here knows: the
// miss rate, how many of them the gates prevent, and the fee. One thing changes per row.
export function missTable(input = {}) {
  const fees = [{ winRate: 0.5, feeShare: 0.25 }, { winRate: 1, feeShare: 0.25 }, { winRate: 1, feeShare: 0.5 }];
  const rates = [{ missToday: 0.02, missAvoided: 0.25 }, { missToday: 0.02, missAvoided: 0.5 }, { missToday: 0.05, missAvoided: 0.5 }];
  return rates.map((r) => ({ ...r, cells: fees.map((f) => { const b = businessCase({ ...input, ...r, ...f }); return { fee: b.fee, feeLostThisYear: b.feeLostThisYear, feeLostPerMiss: b.feeLostPerMiss, perHearing: b.missMargin, feeIncome: b.missRevenue, aYear: b.year.missMargin }; }) }));
}

// The same firm (same fee, same consultant cost, same volume) under a cautious and a hopeful view
// of what the changes achieve. Only the operational inputs move: "cautious" is the case against
// acting (cheap coordinators who are productive all week, few minutes today, a tower that removes
// little, few misses, little prevented, no block rate, a sheet that takes long to keep),
// "hopeful" the case for it. One input cuts both ways: a sheet that is slow to keep counts
// against the kit and, a little, for the software that takes it over.
export const OPERATIONAL = ['coordinatorRate', 'productiveHours', 'minutesByHand', 'reduction', 'missToday', 'missAvoided', 'lossGivenMiss', 'laterYears', 'blockDiscount', 'blockShare', 'kitMinutes'];
export function threeCases(input = {}) {
  const base = { ...defaults(), ...input };
  const pick = (which) => Object.fromEntries(INPUTS.filter((x) => OPERATIONAL.includes(x.key)).map((x) => [x.key, x[which]]));
  return { cautious: businessCase({ ...base, ...pick('low') }), chosen: businessCase(base), hopeful: businessCase({ ...base, ...pick('high') }) };
}

// The check a critical reader ran on an earlier version of this work, reproduced exactly:
// 12.4 minutes saved at $35 to $50 an hour, against an engineer at $150,000 to $200,000.
export function criticsMath() {
  const minutes = 19.6 - 7.2;
  const lo = (minutes / 60) * 35, hi = (minutes / 60) * 50;
  return { minutes, perHearing: [lo, hi], engineer: [150000 / hi, 200000 / lo], lean: [40000 / hi, 70000 / lo] };
}

export const usd = (x, d = 0) => (Number.isFinite(x) ? `${x < 0 ? '-' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}` : 'never');
export const count = (x) => (Number.isFinite(x) ? Math.round(x).toLocaleString('en-US') : 'never');
