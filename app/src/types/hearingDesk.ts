/**
 * The shapes window.hearingDesk returns. Every value is JSON (strings, numbers, booleans, null,
 * arrays and plain objects), so an agent can JSON.stringify any answer as it is.
 */

import type { GateKey } from './data';

/** The four labels every figure carries. */
export type FigureLabel = 'measured' | 'simulated' | 'estimate' | 'packet';

/** Where a value was read: a cell of the sheet, a file of the engine, or this browser's session. */
export interface DeskSource {
  /** "Hearings W14", "Measures B3", "engine.json scale", "this browser" */
  source: string;
  /** True when the value was made in this browser and is not on the sheet. */
  thisBrowserOnly?: boolean;
}

export type DeskGateState = 'proved' | 'missing' | 'not-needed' | 'accepted-here';

export interface DeskGate {
  key: GateKey;
  /** "G4 clerk" */
  code: string;
  /** The sheet's heading of the proof column without the code: "Consultant's own yes for this slot". */
  name: string;
  state: DeskGateState;
  /** "Proved", "Missing", "Not needed", "Accepted here, not yet on the sheet". */
  stateWords: string;
  /** The cell that holds the proof link: "Hearings J14". */
  cell: string;
  proofLink: string | null;
  proofMessage: string | null;
}

export interface DeskHearingSummary {
  case: string;
  /** "#/hearings/AX-107" */
  url: string;
  property: string;
  county: string;
  /** ISO date. */
  date: string | null;
  /** As the sheet types it, "09:00". */
  time: string | null;
  /** Hearings CB: "Times are Tesswick office time (UTC-05:00)." */
  timeZone: string | null;
  consultant: string | null;
  /** Hearings W, verbatim. */
  status: string;
  /** Hearings X split into its phrases, verbatim. */
  dailyList: string[];
  /** The daily list starts with TOP OF LIST (the "At risk" rule; see rules().atRisk). */
  atRisk: boolean;
  /** Hearings U: gate parts not proved. */
  checksMissing: number;
  /** Hearings V: working days to the hearing; negative when it is past. */
  workingDays: number | null;
  /** Gate codes not proved and not accepted here, for example ["G2", "G3"]. */
  gatesOpen: string[];
  row: number;
}

export interface DeskAction {
  /** The instruction in plain sentence case. */
  text: string;
  /** "the coordinator" as typed in Hearings Z, or "the coordinator on duty" when no owner is typed. */
  owner: string;
  ownerSource: string;
  /** As typed on the sheet, or null. */
  due: string | null;
  /** The cell the instruction was read from. */
  cell: string;
  /** The exact text as printed on the sheet. */
  printed: string;
}

export interface DeskHearing extends DeskHearingSummary {
  format: string | null;
  gates: DeskGate[];
  /** What to do today, in plain words: the sheet's next action (Y) first, then each printed line (BE). */
  today: DeskAction[];
  /** A next step a person set in this browser (2:00 p.m. review), not yet on the sheet. */
  nextStepHere: { action: string; owner: string; due: string; at: string } | null;
  office: { county: string; slug: string; url: string; changeWaiting: boolean } | null;
  /** Reader suggestions rows about this hearing. */
  proposals: DeskProposal[];
  /** The other deep links of this hearing. */
  links: { page: string; drawer: string; tabs: Record<'gates' | 'lines' | 'messages' | 'office', string> };
}

export interface DeskHearingFilter {
  /** Only hearings whose daily list starts with TOP OF LIST (true) or does not (false). */
  atRisk?: boolean;
  /** Status (Hearings W) starts with this text, any case: "OPEN", "READY", "RESULT DUE". */
  status?: string;
  /** Daily list (Hearings X) holds this phrase, any case: "NOTICE BLOCKED", "CALL THE HOMEOWNER". */
  list?: string;
  /** Office county, any case: "Tesswick". */
  county?: string;
  /** A consultant's name, any case, or null for hearings with nobody named. */
  consultant?: string | null;
  /** Hearings whose gate part is not proved: "G2", "G4clerk". */
  gateOpen?: GateKey;
  /** Hearing date on or after the day the sheet stands on. */
  coming?: boolean;
  /** Text found in the case, the property or the county. */
  q?: string;
}

export interface DeskOffice {
  county: string;
  slug: string;
  url: string;
  row: number;
  /** Offices D. */
  hoursLocal: string | null;
  /** Offices F. */
  howToNameRepresentative: string | null;
  /** Offices L. */
  lastConfirmedInWriting: string | null;
  /** Offices AV and what that number means, from the column heading. */
  routeState: { value: string | null; meaning: string | null; cell: string };
  /** Offices N, verbatim. */
  askAgain: string | null;
  changeWaiting: boolean;
  /** A decision made in this browser, not yet on the sheet. */
  decisionHere: { decision: 'approved' | 'rejected' | 'held'; name: string | null; at: string } | null;
}

export interface DeskPendingChange {
  county: string;
  slug: string;
  url: string;
  /** Opens the approve dialog on the office page. */
  approveUrl: string;
  /** Offices M: what changed, when, who said it. */
  changed: string | null;
  /** Offices AS. */
  oldRouteAccepted: string | null;
  /** Offices AT. */
  changeSaidOn: string | null;
  /** Cases on this office whose daily list holds NOTICE BLOCKED. */
  hearingsBlocked: string[];
  /** Where a person types the approval on the sheet. */
  sheetCells: { approvedBy: string; approvedOn: string };
  /** "waiting", or the decision made in this browser and not yet on the sheet. */
  state: 'waiting' | 'held-here' | 'approved-here-not-on-sheet' | 'rejected-here-not-on-sheet';
  decisionHere: DeskOffice['decisionHere'];
}

export type DeskNeed = 'decide' | 'on-sheet' | 'ask-version' | 'repeat' | 'hold' | 'info' | 'rule-says' | 'nothing';

export interface DeskProposal {
  /** Row of the Reader suggestions tab. */
  row: number;
  case: string;
  /** Column B: the proof cell or the cell, in the sheet's words. */
  cell: string;
  /** Column C, verbatim. */
  proposal: string;
  message: string;
  from: string;
  words: string;
  gate: GateKey | null;
  need: DeskNeed;
  /** A yes or no given in this browser, not yet typed in Reader suggestions G. */
  decisionHere: { decision: 'accepted' | 'refused'; at: string } | null;
  waiting: boolean;
}

export interface DeskProposalFilter {
  case?: string;
  need?: DeskNeed;
  /** Only rows that still wait for a yes or no in this browser. */
  waiting?: boolean;
  gate?: GateKey;
}

export interface DeskFigure {
  id: string;
  name: string;
  value: number | string | null;
  /** The value as the app shows it. */
  display: string;
  label: FigureLabel;
  source: string;
  target?: string;
  counted?: string;
  group: string;
}

export interface DeskRoute {
  id: string;
  /** "#/hearings/:case" */
  pattern: string;
  title: string;
  section: string;
  /** Query parameters the page reads, with their values. */
  query: Record<string, string>;
  /** A working example. */
  example: string;
  /** Not built for this season. */
  later: boolean;
}

export interface DeskTask {
  id: string;
  title: string;
  url: string;
  steps: string[];
  /** How to check the result through this API. */
  verify: string;
}

export interface DeskView {
  route: string | null;
  path: string;
  query: Record<string, string>;
  title: string;
  /** The view's own summary: counts, the open hearing, the active filter. */
  summary: Record<string, unknown>;
  clock: string;
  sheetDay: string;
  /** What the page shows and its primary action (layout/Regions usePageState). */
  page?: Record<string, unknown>;
  /** The landmark names every work page has, in order. */
  regions?: string[];
}

export interface HearingDeskApi {
  readonly version: string;
  readonly readOnly: true;
  /** One plain-text page: what the app holds and how to use this API. */
  help(): string;
  about(): { sheetDay: string; sheetMd5: string; exportedAt: string; clock: string; counts: Record<string, number> };
  routes(): DeskRoute[];
  rules(): Record<string, string>;
  hearings(filter?: DeskHearingFilter): DeskHearingSummary[];
  hearing(caseId: string): DeskHearing | null;
  statusCounts(): { status: string; count: number; source: string }[];
  offices(): DeskOffice[];
  pendingChanges(): DeskPendingChange[];
  proposals(filter?: DeskProposalFilter): DeskProposal[];
  proposalCounts(): { rows: number; waiting: number; proofLinks: number; proofLinksOnSheet: number; proofLinksToDecide: number; proofLinksWaiting: number; askVersion: number };
  measures(filter?: { label?: FigureLabel; group?: string }): DeskFigure[];
  calendar(): { file: string; events: number; summary: string | null; source: string; download: string };
  ai(): { does: string[]; doesNot: string[]; readers: string };
  tasks(): DeskTask[];
  /** The Today queue in order: decisions only the owner makes, then hearings at risk. */
  queue(): Record<string, unknown>[];
  /** The integrations map (all simulated, proposed or not connected) and what was simulated here. */
  integrations(): unknown;
  /** The notifications log of this session, newest first. */
  notifications(): unknown[];
  /** Where the readers' answers come from: live AI (only when the local server reports live) or recorded answers. */
  live(): unknown;
  /** The current view, the same JSON as <script id="desk-state">. */
  state(): DeskView;
  /** What a person decided in this browser. Nothing here is on the sheet. */
  session(): Record<string, unknown>;
}
