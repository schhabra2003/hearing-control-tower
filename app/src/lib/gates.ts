/**
 * The five gates and their six parts: one list of names for every
 * screen. G4 has two parts, the clerk's and the consultant's; they share the code G4 and are told
 * apart by their names. The sheet's own heading of each proof column stays in gateTitle().
 */

import type { GateKey, Hearing } from '@/types/data';
import { sheet, suggestionsFor } from './data';
import { proposalKey, type Session } from './store';

export interface GatePart {
  key: GateKey;
  /** The gate's digit, as the strip prints it: 1 to 5 (both G4 parts print 4). */
  short: string;
  /** "G4": the sheet's code, shown only in the Sheet reference. */
  code: string;
  /** The plain name of this part: "Clerk has the files". */
  name: string;
}

/** The five gates in plain words, one list for every screen. */
export const GATES: { id: 'G1' | 'G2' | 'G3' | 'G4' | 'G5'; short: string; name: string }[] = [
  { id: 'G1', short: '1', name: 'Date confirmed by the office' },
  { id: 'G2', short: '2', name: 'Consultant said yes' },
  { id: 'G3', short: '3', name: "Office has our consultant's name" },
  { id: 'G4', short: '4', name: 'Files sent and received' },
  { id: 'G5', short: '5', name: 'Owed items received' },
];

/** The six parts the sheet checks: gate 4 has the clerk's part and the consultant's part. */
export const GATE_PARTS: GatePart[] = [
  { key: 'G1', short: '1', code: 'G1', name: 'Date confirmed by the office' },
  { key: 'G2', short: '2', code: 'G2', name: 'Consultant said yes' },
  { key: 'G3', short: '3', code: 'G3', name: "Office has our consultant's name" },
  { key: 'G4clerk', short: '4', code: 'G4', name: 'Clerk has the files' },
  { key: 'G4consultant', short: '4', code: 'G4', name: 'Consultant has the files' },
  { key: 'G5', short: '5', code: 'G5', name: 'Owed items received' },
];

/** The plain name of a gate part, the same on every screen: "Clerk has the files". */
export function gateLabel(key: GateKey): string {
  return GATE_PARTS.find((x) => x.key === key)!.name;
}

/** The sheet's code of a gate part, for the Sheet reference only: "G4, clerk's part". */
export function gateCode(key: GateKey): string {
  return key === 'G4clerk' ? "G4, clerk's part" : key === 'G4consultant' ? "G4, consultant's part" : key;
}

/** The sheet's heading of the gate's proof column, without "G1 ": "Schedule: county, in writing (per docket)". */
export function gateTitle(h: Hearing, key: GateKey): string {
  const col = h.gates[key].linkColumn;
  const heading = sheet.hearingHeaders[col] ?? col;
  return heading.replace(/^G\d\s+/, '');
}

export type GateView = 'proved' | 'missing-near' | 'missing' | 'not-needed' | 'accepted';

/**
 * How a gate part shows: the sheet's state, plus "accepted here" when a person accepted, in this
 * session, a Reader suggestions row that proposes to close it (key "suggestion:<row>") (never "proved"), plus "missing near" when the
 * hearing is within three working days or past.
 */
export function gateView(h: Hearing, key: GateKey, session: Pick<Session, 'proposals'>): GateView {
  const g = h.gates[key];
  if (g.state === 'proved') return 'proved';
  if (g.state === 'not-needed') return 'not-needed';
  const accepted = suggestionsFor(h.case).some(
    (s) => s.gate === key && s.closes && session.proposals[proposalKey('suggestion', s.row)]?.decision === 'accepted',
  );
  if (accepted) return 'accepted';
  const near = h.workingDays !== null && h.workingDays <= 3;
  return near ? 'missing-near' : 'missing';
}

export const GATE_VIEW_WORD: Record<GateView, string> = {
  proved: 'Proved',
  'missing-near': 'Missing, due soon or past',
  missing: 'Missing',
  'not-needed': 'Not needed',
  accepted: 'Accepted here, not yet on the sheet',
};

/** The state of a gate part in one sentence for its tooltip: past hearings say so. */
export function gateStateSentence(h: Hearing, view: GateView): string {
  if (view !== 'missing-near') return `${GATE_VIEW_WORD[view]}.`;
  const d = h.workingDays;
  if (d !== null && d < 0) return `Missing, hearing was ${-d} working ${d === -1 ? 'day' : 'days'} ago.`;
  if (d === 0) return 'Missing, hearing is today.';
  return `Missing, hearing in ${d} working ${d === 1 ? 'day' : 'days'}.`;
}
