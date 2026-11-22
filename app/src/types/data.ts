/**
 * The shapes of the three generated data files (src/data/*.json). The files are written by
 * scripts/export_sheet.py, scripts/export_engine.mjs and scripts/export_evidence.mjs
 * section 2. Read them only through src/lib/data.ts.
 */

export type CellValue = string | number | boolean;
export type Cells = Record<string, CellValue>;

export interface TabRow {
  row: number;
  cells: Cells;
}

export interface Tab {
  headerRow: number | null;
  headers: Record<string, string>;
  rows: TabRow[];
  maxRow: number;
  maxColumn: number;
}

export type GateKey = 'G1' | 'G2' | 'G3' | 'G4clerk' | 'G4consultant' | 'G5';
export type GateState = 'proved' | 'missing' | 'not-needed';

export interface Gate {
  state: GateState;
  /** The Hearings column that holds the proof link (I, J, K, L, M, O). */
  linkColumn: string;
  link: string | null;
  /** The message number in the link, for example "55". */
  message: string | null;
}

export interface PrintedLine {
  n: number;
  /** The column whose formula writes this line (CD, CE, CM, CZ, DP, EA) or BE for its own parts. */
  column: string;
  text: string;
  trailing: string;
}

type V = CellValue | null;

/** One row of the Hearings tab. Named fields are found by heading text; `cells` holds every cell by letter. */
export interface Hearing {
  row: number;
  case: string;
  property: string;
  county: string;
  /** ISO date, "2030-06-10". */
  date: string | null;
  /** As the sheet types it, "09:00". */
  time: V;
  format: V;
  stillOn: V;
  consultant: V;
  g1Link: V;
  g2Link: V;
  g3Link: V;
  g4ClerkLink: V;
  g4ConsultantLink: V;
  owed: V;
  g5Link: V;
  dayBeforeYes: V;
  arrived: V;
  result: V;
  /** Hearings U. */
  missing: number;
  /** Hearings V: working days to the hearing; negative when it is past. */
  workingDays: number | null;
  /** Hearings W, verbatim. */
  status: string;
  /** Hearings X, verbatim; empty when the row is not on the daily list. */
  dailyList: string | null;
  nextAction: V;
  owner: V;
  due: V;
  readerNote: V;
  dayBeforeTexts: V;
  room: V;
  filesCurrent: V;
  filesConsultant: V;
  filesClerk: V;
  nameOnRecord: V;
  /** Hearings BE, verbatim. */
  printed: string | null;
  tellConsultant: V;
  toldConsultant: V;
  owedNotProcessed: V;
  yesCounts: V;
  gotItFrom: V;
  /** Hearings CB, for example "Times are Tesswick office time (UTC-05:00)." */
  timeZoneSentence: string | null;
  linkCheck: V;
  routeState: V;
  homeowner: V;
  homeownerNumber: V;
  homeownerContact: V;
  officeRow: V;
  recordCountsForDate: V;
  officeAddress: V;
  gates: Record<GateKey, Gate>;
  printedLines: PrintedLine[];
  cells: Cells;
}

export interface SheetMeta {
  source: string;
  md5: string;
  /** What the release is, for a known md5 (scripts/export_sheet.py RELEASES); null for any other sheet. */
  release: string | null;
  bytes: number;
  modified: string;
  exportedAt: string;
  openpyxl: string;
  tabs: { name: string; maxRow: number; maxColumn: number }[];
  gateCheck: string;
}

export interface SheetData {
  meta: SheetMeta;
  hearingHeaders: Record<string, string>;
  hearings: {
    /** Named field to column letter, found by heading text. */
    columns: Record<string, string>;
    printedParts: string[];
    rows: Hearing[];
  };
  calendarFile: { summary: string | null; lineCheck: string | null; lines: string[] } | null;
  tabs: Record<string, Tab>;
}

/* ---------- engine.json ---------- */

export interface EngineMessage {
  id: number | string;
  sender: string;
  channel: string;
  body: string;
  at: string;
  address?: string;
  caseIds?: string[];
  /** The property addresses the message is about. */
  properties?: string[];
  [key: string]: unknown;
}

export interface ReplySent {
  kind: 'offer' | 'week' | 'day_before' | 'arrival' | 'files' | 'change';
  to?: string;
  open?: number[];
  held?: number[];
  dockets?: string[];
  version?: number;
  format?: string;
  what?: string;
  [key: string]: unknown;
}

export interface ReplyOut {
  byRule: boolean;
  action?: string;
  numbers: number[];
  version?: number;
  why: string;
  [key: string]: unknown;
}

export interface ReplyRow {
  id: string;
  docket: string;
  sent: ReplySent;
  reply: { from: string; text: string; channel?: string };
  day: { cap?: number; held?: number; offered?: number } | null;
  expect: string;
  out: ReplyOut;
}

export interface PasteResult {
  command: string;
  messages: { id?: string | number; sender: string; channel?: string; body: string; [key: string]: unknown }[];
  /** The seven columns of the Reader suggestions tab, as the TSV file holds them. */
  rows: string[][];
  count: Record<string, number>;
  how: { id: string | number; path: string; sender: string; why?: string }[];
  replayed: (string | number)[];
  missing: (string | number)[];
  nothingProposed: (string | number)[];
  readerLabels: string[];
  /** The lines the command prints, verbatim. */
  lines: string[];
}

export interface EngineData {
  meta: { exportedAt: string; snapshot: string; node: string };
  packet: Record<string, unknown>;
  timeline: { note: string; record_snapshot: unknown };
  playbooks: { default: unknown; states: Record<string, unknown>; counties: unknown[] };
  messages: EngineMessage[];
  gold: unknown;
  coverage: unknown;
  scale: ScaleData | null;
  recorded: unknown;
  reader_results: unknown;
  heldout: unknown;
  replies: {
    note: string | null;
    rows: ReplyRow[];
    byRule: number;
    toPerson: number;
    agree: number;
    summary: string;
    selfTest: string;
    caveat: string;
  };
  paste: PasteResult;
}

/* ---------- evidence.json ---------- */

export interface EvidenceCommandRow {
  source: string;
  line: number;
  section: string;
  columns: string[];
  cells: string[];
  command: string;
  /** For the gate-sheet test only: its pass and FAIL line counts, read by the export. */
  passLines?: { pass: number; fail: number };
}

export interface EvidenceReport {
  id: string;
  source: string;
  title: string;
  titleLine: number;
  sections: { heading: string; line: number; items: { line: number; text: string }[] }[];
}

export interface EvidenceData {
  meta: { exportedAt: string; sources: string[]; factsSection: string; factsRound: string; sheetMd5: string };
  /** Reader figures that the README states only in prose, read by the export. */
  readers: {
    source: string;
    unseen2: { messages: number; agreed: number; right: number; pct: number; low: number; high: number; line: number };
    offline: { found: number; of: number; messages: number; line: number };
  };
  readmeChecks: EvidenceCommandRow[];
  factsChecks: EvidenceCommandRow[];
  outsideTests: EvidenceReport[];
}

/** engine.json's scale block, written by the prototype's cli/scale.js. */
export interface ExpPoint {
  x: number;
  counties: number;
  tower: number;
  towerLow: number;
  towerHigh: number;
  manual: number;
  manualLow: number;
  manualHigh: number;
  towerBy?: Record<string, number>;
}

export interface ExpRow {
  first: string;
  setting?: string;
  towerSpread?: string;
  manualSpread?: string;
  _?: ExpPoint;
  [key: string]: unknown;
}

export interface Experiment {
  id: string;
  title: string;
  question: string;
  chart?: string | null;
  note?: string;
  columns: { key: string; label: string; num?: boolean; help?: string }[];
  rows: ExpRow[];
  _?: { low: number; high: number; tower: number; manual: number };
}

export interface ScaleSetting {
  scenario: string;
  autonomy: string;
  perRun: number;
  counties: number;
  countiesMade: number;
  tower: number;
  towerLow: number;
  towerHigh: number;
  manual: number;
  manualLow: number;
  manualHigh: number;
  readyRate: number;
  coveredRate: number;
}

export interface ScaleData {
  generated: string;
  base: { hearings: number; counties: number };
  weekMinutes: number;
  totals: { runs: number; hearings: number; safety: number; safetyRules: string[] };
  experiments: Experiment[];
  findings: string[];
  limits: string[];
  settings: ScaleSetting[];
}
