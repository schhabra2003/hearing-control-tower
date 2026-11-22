/**
 * window.hearingDesk: a read-only view of the data for agents that browse the app. It reads through the typed data layer and the session store, and
 * has no method that writes: decisions are made on the pages, by the named buttons, and the sheet
 * is only ever changed by a person typing in it. Every answer is a fresh JSON copy.
 */

import { businessCase, defaults } from '@engine/src/economics.js';
import type { GateKey, Hearing } from '@/types/data';
import type {
  DeskAction,
  DeskFigure,
  DeskGate,
  DeskHearing,
  DeskHearingFilter,
  DeskHearingSummary,
  DeskOffice,
  DeskPendingChange,
  DeskProposal,
  DeskRoute,
  DeskTask,
  DeskView,
  FigureLabel,
  HearingDeskApi,
} from '@/types/hearingDesk';
import {
  approvalCells,
  byNearest,
  calendarEventCount,
  engine,
  evidence,
  hearingByCase,
  hearings,
  listPhrases,
  officeCell,
  officeOfHearing,
  offices,
  officesWithChangeWaiting,
  sheet,
  sheetToday,
  suggestions,
  type Office,
  type Suggestion,
} from './data';
import { allWaiting, needOf, proofCounts } from './decisions';
import { GATE_PARTS, GATE_VIEW_WORD, gateTitle, gateView } from './gates';
import { dateLong } from './format';
import { plainLine } from './sheetText';
import { clockLabel, getSession, proposalKey, type Session } from './store';
import { matchRoute, titleOf, type Location, type RouteDef } from './router';
import { measureBlocks } from '@/pages/b1/measures';
import { WORKFLOWS } from '@/layout/workflows';
import { getPageState } from '@/layout/Regions';
import { atRiskList, changesWaiting, checkRows, checkSummary, stepsFor, todayQueue, OWNER } from '@/layout/model';
import { deskIntegrations } from '@/pages/integrations/api';
import { notificationLog } from '@/components/feedback/Toast';
import { liveForAgents, liveLabel, getLive } from './live';
import { flagged, ordersCall, passDone } from './today';

export const DESK_API_VERSION = '1.0.0';

const json = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const text = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : String(v));
const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/* ---------- rules the API applies, stated once ---------- */

const RULES: Record<string, string> = {
  atRisk: 'A hearing is at risk when its daily list (Hearings X) starts with TOP OF LIST: due within a working day, blocked, or owed. The Hearings page filter "Top of list" (?filter=top) shows the same rows.',
  gates: 'Five gates, six parts: G1, G2, G3, G4 clerk, G4 consultant, G5. A part is proved when the sheet holds its proof link. "Accepted here" means a person accepted a reader proposal in this browser; it is not on the sheet.',
  owner: 'The owner of a printed line is the owner typed in Hearings Z. When none is typed, the line is the coordinator on duty\'s, as the daily passes assign it.',
  labels: 'Measured: counted by a command or by the sheet on the example data. Simulated: produced by the simulator. Estimate: a calculation from stated assumptions; every figure in minutes or dollars. Packet: taken from the fictional example packet.',
  writes: 'This API never writes. Accept, refuse, approve and reject are buttons on the pages; they are kept in this browser and a person types them on the sheet.',
};

/* ---------- routes ---------- */

/** Query parameters each route reads, by route id. */
const QUERY: Record<string, Record<string, string>> = {
  hearings: { filter: 'coming | top | ready | blocked | nobody', open: 'a case, for example AX-107 (selects that hearing)', tab: 'gates | lines | messages | office (with open)' },
  hearing: { tab: 'gates | lines | messages | office' },
  'today-9am': { open: 'a case (selects that hearing)', list: 'top | calls | questions' },
  'today-2pm': { open: 'a case (selects that hearing)', list: 'top | same-day | no-next' },
  suggestions: { filter: 'gates | cells | offices | repeats | questions' },
  office: { approve: '1 (starts the approval of the change that waits)' },
  offices: { approve: '1 (starts the approval of the change that waits)' },
  evidence: { filter: 'a label: measured | simulated | estimate | packet | sheet' },
  'later-queue': { case: 'a case' },
  'later-board': { open: 'a case' },
};

const EXAMPLE: Record<string, string> = {
  hearing: '#/hearings/AX-107?tab=gates',
  office: '#/offices/tesswick',
  hearings: '#/hearings?filter=top',
  suggestions: '#/suggestions?filter=gates',
};

/** Titles of the routes whose title depends on the case or the office. */
const PATTERN_TITLE: Record<string, string> = { hearing: 'One hearing (full page)', office: 'One office' };

let routeTable: RouteDef[] = [];

function deskRoutes(): DeskRoute[] {
  // Redirects (old links that land on another route) are not pages: the count matches #/agents.
  return routeTable.filter((r) => !r.redirect).map((r) => ({
    id: r.id,
    pattern: `#${r.path}`,
    title: typeof r.title === 'string' ? r.title : (PATTERN_TITLE[r.id] ?? r.id),
    section: r.section,
    query: QUERY[r.id] ?? {},
    example: EXAMPLE[r.id] ?? `#${r.path}`,
    later: !!r.later,
  }));
}

/* ---------- hearings ---------- */

const atRisk = (h: Hearing): boolean => (h.dailyList ?? '').startsWith('TOP OF LIST');

function gatesOf(h: Hearing, s: Session): DeskGate[] {
  return GATE_PARTS.map((p) => {
    const g = h.gates[p.key];
    const view = gateView(h, p.key, s);
    const state: DeskGate['state'] = view === 'accepted' ? 'accepted-here' : view === 'proved' ? 'proved' : view === 'not-needed' ? 'not-needed' : 'missing';
    return {
      key: p.key,
      code: p.code,
      name: gateTitle(h, p.key),
      state,
      stateWords: view === 'missing-near' ? GATE_VIEW_WORD.missing : GATE_VIEW_WORD[view],
      cell: `Hearings ${g.linkColumn}${h.row}`,
      proofLink: g.link,
      proofMessage: g.message,
    };
  });
}

function summary(h: Hearing, s: Session): DeskHearingSummary {
  return {
    case: h.case,
    url: `#/hearings/${h.case}`,
    property: h.property,
    county: h.county,
    date: h.date,
    time: text(h.time),
    timeZone: h.timeZoneSentence,
    consultant: text(h.consultant),
    status: h.status,
    dailyList: listPhrases(h.dailyList),
    atRisk: atRisk(h),
    checksMissing: h.missing,
    workingDays: h.workingDays,
    gatesOpen: gatesOf(h, s).filter((g) => g.state === 'missing').map((g) => g.code),
    row: h.row,
  };
}

function matches(h: Hearing, f: DeskHearingFilter, s: Session): boolean {
  if (f.atRisk !== undefined && atRisk(h) !== f.atRisk) return false;
  if (f.status && !h.status.toLowerCase().startsWith(f.status.trim().toLowerCase())) return false;
  if (f.list && !listPhrases(h.dailyList).some((p) => same(p, f.list!) || p.toLowerCase().startsWith(f.list!.trim().toLowerCase()))) return false;
  if (f.county && !same(h.county, f.county)) return false;
  if (f.consultant === null && h.consultant) return false;
  if (typeof f.consultant === 'string' && !same(String(h.consultant ?? ''), f.consultant)) return false;
  if (f.gateOpen && gateView(h, f.gateOpen, s) !== 'missing' && gateView(h, f.gateOpen, s) !== 'missing-near') return false;
  if (f.coming !== undefined && ((h.date ?? '') >= sheetToday()) !== f.coming) return false;
  if (f.q) {
    const q = f.q.trim().toLowerCase();
    if (![h.case, h.property, h.county].some((v) => v.toLowerCase().includes(q))) return false;
  }
  return true;
}

function todayActions(h: Hearing, s: Session): DeskAction[] {
  const zCol = sheet.hearings.columns.owner;
  const typedOwner = text(h.owner);
  const owner = typedOwner ?? 'the coordinator on duty';
  const ownerSource = typedOwner && zCol ? `Hearings ${zCol}${h.row}` : 'No owner is typed on the sheet; the daily passes give it to the coordinator on duty.';
  const out: DeskAction[] = [];
  const next = text(h.nextAction);
  const yCol = sheet.hearings.columns.nextAction;
  if (next && yCol) out.push({ text: next, owner, ownerSource, due: text(h.due), cell: `Hearings ${yCol}${h.row}`, printed: next });
  const here = s.nextSteps[h.case];
  if (!next && here) out.push({ text: here.action, owner: here.owner, ownerSource: 'Set in this browser, not yet on the sheet.', due: here.due, cell: 'this browser', printed: here.action });
  for (const l of h.printedLines) {
    out.push({ text: plainLine(l.text), owner, ownerSource, due: null, cell: `Hearings ${l.column}${h.row}`, printed: l.text });
  }
  return out;
}

function detail(h: Hearing, s: Session): DeskHearing {
  const o = officeOfHearing(h);
  const waiting = new Set(officesWithChangeWaiting().map((x) => x.slug));
  const base = `#/hearings/${h.case}`;
  return {
    ...summary(h, s),
    format: text(h.format),
    gates: gatesOf(h, s),
    today: todayActions(h, s),
    nextStepHere: s.nextSteps[h.case] ?? null,
    office: o ? { county: o.county, slug: o.slug, url: `#/offices/${o.slug}`, changeWaiting: waiting.has(o.slug) && !s.changes[o.slug] } : null,
    proposals: suggestions().filter((x) => x.case === h.case).map((x) => proposal(x, s)),
    links: {
      page: base,
      drawer: `#/hearings?open=${h.case}`,
      tabs: { gates: base, lines: `${base}?tab=lines`, messages: `${base}?tab=messages`, office: `${base}?tab=office` },
    },
  };
}

/* ---------- offices ---------- */

function cellOf(o: Office, prefix: string): { ref: string; value: string | null; heading: string } | null {
  try {
    const c = officeCell(o, prefix);
    return { ref: c.ref, value: text(c.value), heading: c.heading };
  } catch {
    return null;
  }
}

/** "1" with the heading "Route state (formula): 0 no change; 1 a change waits..." gives "a change waits...". */
function routeMeaning(value: string | null, heading: string): string | null {
  if (value === null) return null;
  const m = new RegExp(`(?:^|[;:]\\s*)${value}\\s+([^;]+)`).exec(heading);
  return m ? m[1]!.trim() : null;
}

function office(o: Office, s: Session, waitingSlugs: Set<string>): DeskOffice {
  const route = cellOf(o, 'Route state');
  const d = s.changes[o.slug];
  return {
    county: o.county,
    slug: o.slug,
    url: `#/offices/${o.slug}`,
    row: o.row,
    hoursLocal: cellOf(o, 'Office hours')?.value ?? null,
    howToNameRepresentative: cellOf(o, 'How to name our representative')?.value ?? null,
    lastConfirmedInWriting: cellOf(o, 'Process last confirmed')?.value ?? null,
    routeState: { value: route?.value ?? null, meaning: route ? routeMeaning(route.value, route.heading) : null, cell: route ? `Offices ${route.ref}` : '' },
    askAgain: cellOf(o, 'Ask again?')?.value ?? null,
    changeWaiting: waitingSlugs.has(o.slug) && !d,
    decisionHere: d ? { decision: d.decision, name: d.name ?? null, at: d.at } : null,
  };
}

function pending(s: Session): DeskPendingChange[] {
  return officesWithChangeWaiting().map((o) => {
    const d = s.changes[o.slug];
    const cells = approvalCells(o);
    return {
      county: o.county,
      slug: o.slug,
      url: `#/offices/${o.slug}`,
      approveUrl: `#/offices/${o.slug}?approve=1`,
      changed: cellOf(o, 'Changed since')?.value ?? null,
      oldRouteAccepted: cellOf(o, 'Does the office still accept the old route')?.value ?? null,
      changeSaidOn: cellOf(o, 'Change said on')?.value ?? null,
      hearingsBlocked: hearings.filter((h) => h.county === o.county && listPhrases(h.dailyList).includes('NOTICE BLOCKED')).sort(byNearest).map((h) => h.case),
      sheetCells: { approvedBy: `Offices ${cells.name}`, approvedOn: `Offices ${cells.date}` },
      state: !d ? 'waiting' : d.decision === 'held' ? 'held-here' : d.decision === 'approved' ? 'approved-here-not-on-sheet' : 'rejected-here-not-on-sheet',
      decisionHere: d ? { decision: d.decision, name: d.name ?? null, at: d.at } : null,
    };
  });
}

/* ---------- proposals ---------- */

function proposal(x: Suggestion, s: Session): DeskProposal {
  const d = s.proposals[proposalKey('suggestion', x.row)];
  const need = needOf(x);
  return {
    row: x.row,
    case: x.case,
    cell: x.cell,
    proposal: x.proposal,
    message: x.message,
    from: x.from,
    words: x.words,
    gate: x.gate,
    need,
    decisionHere: d ? { decision: d.decision, at: d.at } : null,
    waiting: need === 'decide' && !d,
  };
}

/* ---------- figures ---------- */

const fixed1 = (x: number): string => x.toFixed(1);
const pct1 = (x: number): string => `${(100 * x).toFixed(1)}%`;
const usd0 = (x: number): string => `${x < 0 ? '-' : ''}$${Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function figures(): DeskFigure[] {
  const out: DeskFigure[] = [];
  for (const b of measureBlocks()) {
    for (const m of b.measures) {
      out.push({ id: `measures-${m.ref}`, name: m.title, value: m.value ?? (m.raw || null), display: m.display || 'No value on the sheet', label: 'measured', source: `Measures ${m.ref}`, target: m.target || undefined, counted: m.how || undefined, group: `Measures tab: ${b.title}` });
    }
  }
  out.push({ id: 'packet-hearings', name: 'Hearings in the example', value: hearings.length, display: String(hearings.length), label: 'packet', source: 'Hearings tab rows', group: 'The example' });
  out.push({ id: 'packet-messages', name: 'Messages in the example packet', value: engine.messages.length, display: String(engine.messages.length), label: 'packet', source: 'engine.json messages', group: 'The example' });
  out.push({ id: 'calendar-events', name: 'Events in the calendar file', value: calendarEventCount(), display: String(calendarEventCount()), label: 'measured', source: 'Calendar file tab, column A', group: 'The example' });

  const sc = engine.scale;
  const base = sc?.settings.find((p) => p.scenario === 'typical' && p.autonomy === 'default' && p.perRun === sc.base.hearings && p.counties === sc.base.counties);
  if (sc && base) {
    const src = 'eval/scale.json (node cli/scale.js)';
    const group = 'Scale, typical world (later control tower, not built)';
    const rd = sc.experiments.find((e) => e.id === 'reading')?._;
    out.push({ id: 'scale-minutes-tower', name: 'Person-minutes per hearing with the tower', value: rd ? `${fixed1(rd.low)} to ${fixed1(rd.high)}` : base.tower, display: rd ? `${fixed1(rd.low)} to ${fixed1(rd.high)}` : fixed1(base.tower), label: 'estimate', source: src, counted: 'Minutes per task are estimates; reading as measured.', group });
    out.push({ id: 'scale-minutes-hand', name: 'Person-minutes per hearing by hand', value: base.manual, display: fixed1(base.manual), label: 'estimate', source: src, counted: 'Minutes per task are estimates.', group });
    out.push({ id: 'scale-safety', name: 'Safety rules broken', value: sc.totals.safety, display: String(sc.totals.safety), label: 'simulated', source: src, counted: `In ${sc.totals.hearings.toLocaleString('en-US')} simulated hearings, ${sc.totals.runs} runs.`, group });
    out.push({ id: 'scale-ready', name: 'Held with all gates closed', value: base.readyRate, display: pct1(base.readyRate), label: 'simulated', source: src, group });
    out.push({ id: 'scale-covered', name: 'Held with a consultant', value: base.coveredRate, display: pct1(base.coveredRate), label: 'simulated', source: src, group });
  }

  const bc = businessCase(defaults()) as { costToday?: number; costKit?: number; costAfter?: number; feeLostThisYear?: number };
  const group = 'Business case, default inputs (later control tower, not built)';
  const src = 'prototype/src/economics.js businessCase()';
  const money: [string, string, number | undefined][] = [
    ['business-cost-today', 'Cost per hearing today', bc.costToday],
    ['business-cost-kit', 'Cost per hearing with the season-one control', bc.costKit],
    ['business-cost-tower', 'Cost per hearing with the tower', bc.costAfter],
    ['business-fee-lost', 'Fees lost per missed hearing', bc.feeLostThisYear],
  ];
  for (const [id, name, v] of money) {
    if (typeof v === 'number' && Number.isFinite(v)) out.push({ id, name, value: v, display: usd0(v), label: 'estimate', source: src, group });
  }
  return out;
}

/* ---------- the AI, the tasks ---------- */


const AI_BASE = {
  does: [
    'Two readers read each message and propose a proof link for a gate, or a value for another cell, with the words they rely on.',
    'The reply rule files a reply that matches a fixed rule and hands every other reply to a person.',
    "The office rule sorts an office's message by fixed code and proposes where it goes on the sheet; a change of process waits for a person's approval.",
  ],
  doesNot: [
    'No mailbox, drive, calendar, phone line or signing service is connected; the Integrations page simulates them with example data.',
    'Nothing files itself. A person accepts or refuses every proposal at the 9:00 a.m. pass. Auto-filing is off.',
    'Nothing writes the sheet. A person types each decision in the cell the app names.',
    'The simulated clock changes nothing on the sheet.',
    'The control tower pages under Later are not built for this season.',
  ],
};

/** What the AI does, with the readers' source said honestly: live only when the local server reports live. */
function aiNow(): { does: string[]; doesNot: string[]; readers: string } {
  const live = liveLabel(getLive()) === 'Live AI';
  const readers = live
    ? 'The two readers run live on the model provider through the local server, on fictional example messages only. The key stays on the server.'
    : "In this app the readers' answers are recorded once and replayed. No model is called.";
  return { does: [AI_BASE.does[0]!, readers, ...AI_BASE.does.slice(1)], doesNot: AI_BASE.doesNot, readers: live ? 'live' : 'recorded' };
}

const OLD_TASKS: DeskTask[] = [
  {
    id: 'pass-0900',
    title: 'Run the 9:00 a.m. pass',
    url: '#/today/9am',
    steps: [
      'Open #/today/9am. The four steps are a list; each has a "Mark done" button.',
      'Step 1: open #/suggestions. For each proposal press "Accept: <proposal>" or "Refuse: <proposal>" (test ids accept-<case>-<gate> and refuse-<case>-<gate>). "Undo: <proposal>" reverses it.',
      'Step 2: approve or reject each office change, as in the task "Approve an office change".',
      'Steps 3 and 4: make the calls that are due and answer consultants\' questions, then press "Mark done".',
    ],
    verify: 'hearingDesk.proposalCounts().waiting is 0 and hearingDesk.pendingChanges() has no state "waiting".',
  },
  {
    id: 'approve-change',
    title: 'Approve an office change',
    url: '#/offices/tesswick?approve=1',
    steps: [
      'Open hearingDesk.pendingChanges()[0].approveUrl. If no dialog is open, press the button with test id approve-<slug> (labelled "Approve change").',
      'Type a name in the field "Your name" (test id approve-name).',
      'Press the dialog\'s confirm button (test id approve-confirm).',
      'The decision is kept in this browser. A person types the name and the date in the two cells sheetCells names.',
    ],
    verify: 'hearingDesk.pendingChanges() gives state "approved-here-not-on-sheet" for that office.',
  },
  {
    id: 'export-calendar',
    title: 'Export the calendar file',
    url: '#/calendar',
    steps: ['Open #/calendar.', 'Press "Download hearings.ics" (test id export-ics). The file is the sheet\'s own Calendar file tab.'],
    verify: 'hearingDesk.calendar().events is the number of events in the file.',
  },
  {
    id: 'add-county',
    title: 'Add a county (later tool, simulated)',
    url: '#/later/counties',
    steps: [
      'Open #/later/counties and press "Add a county" (test id county-add-open).',
      'Paste the office\'s description in the text box (test id county-text) and press "Read the description" (test id county-read). Simple word matching, no AI.',
      'Check each setting it filled (name, state, office hours, packet deadline) and correct any by hand.',
      'Press "Approve the file and add the county" (test id county-add). A person approves; nothing is sent.',
    ],
    verify: 'The new county shows as a row on #/later/counties with its own file.',
  },
  {
    id: 'review-1400',
    title: 'Run the 2:00 p.m. review',
    url: '#/today/2pm',
    steps: [
      'Open #/today/2pm. The focus card shows the next flagged hearing.',
      'Open it, fill "Next action", "Owner" and "Due" (test ids next-step-action, next-step-owner, next-step-due) and press the button with test id save-next.',
      'Export the calendar file as the last step.',
    ],
    verify: 'hearingDesk.hearing("<case>").nextStepHere holds the step.',
  },
];

/** The tasks: the layout's workflows, then the older ones they do not cover. */
const TASKS: DeskTask[] = [
  ...WORKFLOWS.map(({ pages: _pages, ...t }) => t),
  ...OLD_TASKS.filter((t) => !WORKFLOWS.some((w) => w.id === t.id)),
];

/** The Today queue in order: decisions only the owner makes, then hearings at risk, with what to do. */
function queue(): Record<string, unknown>[] {
  const s = getSession();
  const q = todayQueue(s, 'today', []);
  return [
    ...q.decisions.map((i) => (i.kind === 'decision' ? { kind: 'decision', url: i.href, office: i.office.county, slug: i.office.slug, reason: `Approve or keep ${i.office.county}’s new process for naming our consultant.`, owner: OWNER, deadline: 'Today', decided: s.changes[i.office.slug]?.decision ?? null } : {})),
    ...q.hearings.map((i) => {
      if (i.kind !== 'hearing') return {};
      const h = i.hearing;
      const steps = stepsFor(h, s.changes).actions;
      const sum = checkSummary(checkRows(h, s));
      return {
        kind: 'hearing',
        url: i.href,
        case: h.case,
        reason: 'At risk today',
        firstStep: steps[0]?.text ?? null,
        owner: steps[0]?.owner.name ?? null,
        deadline: steps[0]?.due.text ?? null,
        steps: steps.map((a) => ({ id: a.id, text: a.text, owner: a.owner.name, due: a.due.text, done: (s.todayDone ?? []).includes(`${h.case}:${a.id}`) })),
        checks: `${sum.done} of ${sum.total} checks done`,
        nextCheck: sum.next,
      };
    }),
  ];
}

/* ---------- the current view ---------- */

let currentLocation: Location | null = null;

function viewSummary(routeId: string | null, params: Record<string, string>, q: URLSearchParams, s: Session): Record<string, unknown> {
  const open = q.get('open');
  const withOpen = (o: Record<string, unknown>): Record<string, unknown> => {
    const h = open ? hearingByCase(open) : undefined;
    return h ? { ...o, openHearing: summary(h, s) } : o;
  };
  switch (routeId) {
    case 'overview': {
      const p = proofCounts(s.proposals);
      return { atRisk: atRiskList().length, proofLinksToDecide: p.waiting, officeChanges: changesWaiting(s).length, callsDue: flagged().filter(ordersCall).length, passStepsDone: passDone(s, '0900').length, selected: q.get('case') ?? q.get('decide') ?? null };
    }
    case 'hearings': {
      const f = q.get('filter') ?? 'all';
      const today = sheetToday();
      const test: Record<string, (h: Hearing) => boolean> = {
        all: () => true,
        coming: (h) => (h.date ?? '') >= today,
        top: atRisk,
        'at-risk': atRisk,
        ready: (h) => /^(READY|CONFIRMED)/.test(h.status),
        blocked: (h) => listPhrases(h.dailyList).includes('NOTICE BLOCKED'),
        nobody: (h) => !h.consultant,
      };
      const rows = hearings.filter(test[f] ?? test.all!).sort(byNearest);
      return withOpen({ filter: f, rows: rows.length, cases: rows.map((h) => h.case), atRisk: rows.filter(atRisk).length });
    }
    case 'hearing': {
      const h = hearingByCase(params.case ?? '');
      return h ? { hearing: summary(h, s), tab: q.get('tab') ?? 'gates' } : { hearing: null };
    }
    case 'today-9am':
    case 'today-2pm': {
      const pass = routeId === 'today-9am' ? '0900' : '1400';
      return withOpen({ pass, stepsDone: s.passSteps[pass], proposalsWaiting: allWaiting(s.proposals), changesWaiting: pending(s).filter((p) => p.state === 'waiting').length, dailyList: hearings.filter((h) => h.dailyList).length });
    }
    case 'suggestions':
      return { filter: q.get('filter') ?? 'gates', waiting: allWaiting(s.proposals), proofLinks: proofCounts(s.proposals) };
    case 'offices':
    case 'office': {
      const waitingSlugs = new Set(officesWithChangeWaiting().map((o) => o.slug));
      const one = params.slug ? offices().find((o) => o.slug === params.slug) : undefined;
      return { office: one ? office(one, s, waitingSlugs) : null, pendingChanges: pending(s).map((p) => ({ county: p.county, state: p.state })) };
    }
    case 'calendar':
      return { events: calendarEventCount(), downloadedHere: !!s.icsDownloaded };
    case 'measures':
      return { measures: figures().filter((f) => f.group.startsWith('Measures tab')).length };
    default:
      return {};
  }
}

function view(): DeskView {
  const loc = currentLocation ?? { path: '/', query: new URLSearchParams(), hash: '' };
  const { route, params } = matchRoute(routeTable, loc);
  const s = getSession();
  return {
    route: route?.id ?? null,
    path: `#${loc.path}`,
    query: Object.fromEntries(loc.query.entries()),
    title: route ? titleOf(route, { params, query: loc.query }) : 'Not found',
    summary: viewSummary(route?.id ?? null, params, loc.query, s),
    page: getPageState(),
    regions: ['Page header', 'Summary', 'Toolbar', 'List', 'Detail'],
    clock: clockLabel(s.clock),
    sheetDay: sheetToday(),
  };
}

/** The AppShell reports each location here, so state() and <script id="desk-state"> follow the page. */
export function setDeskLocation(loc: Location): void {
  currentLocation = loc;
}

/** The current view as JSON, for <script id="desk-state">. */
export function deskViewJson(): string {
  return JSON.stringify(view());
}

/* ---------- the API ---------- */

function help(): string {
  const s = getSession();
  return [
    `Hearing Desk ${DESK_API_VERSION}. A read-only view of a fictional firm's gate sheet, as it stands on ${dateLong(sheetToday())} (Settings B2).`,
    `The simulated clock reads ${clockLabel(s.clock)} and changes nothing on the sheet.`,
    `It holds ${hearings.length} hearings, ${offices().length} offices, ${suggestions().length} reader proposals and ${calendarEventCount()} calendar events.`,
    'Methods: help, about, routes, rules, hearings(filter), hearing(case), statusCounts, offices, pendingChanges, proposals(filter), proposalCounts, measures(filter), calendar, ai, tasks, queue, integrations, notifications, live, state, session.',
    'Nothing here writes. Decisions are buttons on the pages; see tasks(). The page #/agents explains the same in words.',
  ].join('\n');
}

const api: HearingDeskApi = {
  version: DESK_API_VERSION,
  readOnly: true,
  help,
  about: () =>
    json({
      sheetDay: sheetToday(),
      sheetMd5: sheet.meta.md5,
      exportedAt: sheet.meta.exportedAt,
      clock: clockLabel(getSession().clock),
      counts: { hearings: hearings.length, offices: offices().length, proposals: suggestions().length, calendarEvents: calendarEventCount(), evidenceChecks: evidence.readmeChecks.length + evidence.factsChecks.length },
    }),
  routes: () => json(deskRoutes()),
  rules: () => json(RULES),
  hearings: (filter = {}) => {
    const s = getSession();
    return json(hearings.filter((h) => matches(h, filter, s)).sort(byNearest).map((h) => summary(h, s)));
  },
  hearing: (caseId) => {
    const h = hearingByCase(String(caseId).trim().toUpperCase());
    return h ? json(detail(h, getSession())) : null;
  },
  statusCounts: () => {
    const col = sheet.hearings.columns.status ?? 'W';
    const counts = new Map<string, number>();
    for (const h of hearings) counts.set(h.status, (counts.get(h.status) ?? 0) + 1);
    return json([...counts].map(([status, count]) => ({ status, count, source: `Hearings ${col}` })).sort((a, b) => b.count - a.count || a.status.localeCompare(b.status)));
  },
  offices: () => {
    const s = getSession();
    const waitingSlugs = new Set(officesWithChangeWaiting().map((o) => o.slug));
    return json(offices().map((o) => office(o, s, waitingSlugs)));
  },
  pendingChanges: () => json(pending(getSession())),
  proposals: (filter = {}) => {
    const s = getSession();
    return json(
      suggestions()
        .map((x) => proposal(x, s))
        .filter((p) => (!filter.case || same(p.case, filter.case)) && (!filter.need || p.need === filter.need) && (filter.waiting === undefined || p.waiting === filter.waiting) && (!filter.gate || p.gate === filter.gate)),
    );
  },
  proposalCounts: () => {
    const s = getSession();
    const p = proofCounts(s.proposals);
    return { rows: suggestions().length, waiting: allWaiting(s.proposals), proofLinks: p.total, proofLinksOnSheet: p.onSheet, proofLinksToDecide: p.decide, proofLinksWaiting: p.waiting, askVersion: p.askVersion };
  },
  measures: (filter = {}) => json(figures().filter((f) => (!filter.label || f.label === filter.label) && (!filter.group || f.group.toLowerCase().includes(filter.group.toLowerCase())))),
  calendar: () => json({ file: 'hearings.ics', events: calendarEventCount(), summary: sheet.calendarFile?.summary ?? null, source: 'Calendar file tab, column A', download: '#/calendar, button "Download hearings.ics" (test id export-ics)' }),
  ai: () => json(aiNow()),
  tasks: () => json(TASKS),
  queue: () => json(queue()),
  integrations: () => deskIntegrations(),
  notifications: () => json([...notificationLog()]),
  live: () => json(liveForAgents()),
  state: () => view(),
  session: () => {
    const s = getSession();
    return json({ note: 'Kept in this browser only. Nothing here is on the sheet.', clock: clockLabel(s.clock), proposals: s.proposals, changes: s.changes, nextSteps: s.nextSteps, passSteps: s.passSteps, todayDone: s.todayDone ?? [], consultantReplies: s.consultantReplies ?? {}, calendarDownloaded: !!s.icsDownloaded });
  },
};

declare global {
  interface Window {
    hearingDesk?: HearingDeskApi;
  }
}

/** Installs window.hearingDesk once, frozen, with the app's route table. */
export function installHearingDesk(routes: RouteDef[]): void {
  routeTable = routes;
  if (window.hearingDesk) return;
  Object.defineProperty(window, 'hearingDesk', { value: Object.freeze(api), writable: false, configurable: false, enumerable: true });
}

/** Read by the #/agents page, so the page and the API say the same thing. */
export const deskDocs = { routes: deskRoutes, tasks: (): DeskTask[] => TASKS, ai: aiNow, rules: () => RULES, help };

export type { FigureLabel, GateKey };
