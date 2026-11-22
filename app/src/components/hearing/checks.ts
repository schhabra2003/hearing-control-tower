/**
 * The five checks of a hearing in plain words. One check per gate; the
 * fourth check ("Files sent and received") has two parts on the sheet, the clerk's and the
 * consultant's, and is done only when both are. A check that is not needed (nothing is owed, so
 * there is nothing for the office to process) counts as done, so a list can say "3 of 5 done".
 * Gate codes and cells are kept for the "Sheet reference" disclosure only.
 */

import type { GateKey, Hearing } from '@/types/data';
import { gateView, type GateView } from '@/lib/gates';
import type { Session } from '@/lib/store';

export type CheckId = 'date' | 'yes' | 'name' | 'files' | 'owed';

export interface CheckDef {
  id: CheckId;
  /** "G1"; shown only behind "Sheet reference". */
  code: string;
  /** The name a lawyer reads: "Office has our consultant's name". */
  name: string;
  /** What counts as proof, in one sentence (from the sheet's column heading). */
  proof: string;
  parts: { key: GateKey; who?: string }[];
}

export const CHECKS: CheckDef[] = [
  { id: 'date', code: 'G1', name: 'Date confirmed by the office', proof: 'The office’s own written schedule for this hearing.', parts: [{ key: 'G1' }] },
  { id: 'yes', code: 'G2', name: 'Consultant said yes', proof: 'The consultant’s own yes for this date and time.', parts: [{ key: 'G2' }] },
  { id: 'name', code: 'G3', name: 'Office has our consultant’s name', proof: 'The office’s written word that our consultant is on its record for this case.', parts: [{ key: 'G3' }] },
  {
    id: 'files',
    code: 'G4',
    name: 'Files sent and received',
    proof: 'The clerk’s receipt of our files, and the consultant’s word that they have them.',
    parts: [
      { key: 'G4clerk', who: 'Clerk' },
      { key: 'G4consultant', who: 'Consultant' },
    ],
  },
  { id: 'owed', code: 'G5', name: 'Owed items received', proof: 'The office’s word that it processed the statement, signature or withdrawal we owed.', parts: [{ key: 'G5' }] },
];

/** done: proved, or nothing owed. accepted: a person accepted a suggestion here, not yet on the sheet. */
export type CheckState = 'done' | 'not-needed' | 'accepted' | 'missing' | 'missing-near';

export interface CheckPartView {
  key: GateKey;
  who?: string;
  view: GateView;
  /** The message number the sheet holds in the cell, counted or not. */
  message: string | null;
  /** "Hearings K16". */
  cell: string;
}

export interface CheckView extends CheckDef {
  state: CheckState;
  partViews: CheckPartView[];
}

const DONE_VIEWS: GateView[] = ['proved', 'not-needed'];

export function checkViews(h: Hearing, session: Pick<Session, 'proposals'>): CheckView[] {
  return CHECKS.map((c) => {
    const partViews = c.parts.map((p) => {
      const g = h.gates[p.key];
      return { key: p.key, who: p.who, view: gateView(h, p.key, session), message: g.message, cell: `Hearings ${g.linkColumn}${h.row}` };
    });
    const views = partViews.map((p) => p.view);
    let state: CheckState;
    if (views.every((v) => v === 'not-needed')) state = 'not-needed';
    else if (views.every((v) => DONE_VIEWS.includes(v))) state = 'done';
    else if (views.some((v) => v === 'missing-near')) state = 'missing-near';
    else if (views.some((v) => v === 'missing')) state = 'missing';
    else state = 'accepted';
    return { ...c, state, partViews };
  });
}

export const isDone = (s: CheckState): boolean => s === 'done' || s === 'not-needed';

export interface ChecksSummary {
  done: number;
  total: number;
  /** The first check that is not done, or null. */
  next: CheckView | null;
  /** "3 of 5 checks done". */
  count: string;
  /** "Next: office has our consultant's name", or "Nothing missing". */
  nextText: string;
}

const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/** Counted as layout/model checkSummary counts: over all five, with not needed and accepted here as done. */
const counts = (s: CheckState): boolean => isDone(s) || s === 'accepted';

export function summarize(views: CheckView[]): ChecksSummary {
  const done = views.filter((v) => counts(v.state)).length;
  const next = views.find((v) => !counts(v.state)) ?? null;
  return {
    done,
    total: views.length,
    next,
    count: `${done} of ${views.length} checks done`,
    nextText: next ? `Next: ${lowerFirst(next.name)}` : 'Nothing missing',
  };
}

export const CHECK_STATE_WORD: Record<CheckState, string> = {
  done: 'Done',
  'not-needed': 'Not needed',
  accepted: 'Accepted here',
  missing: 'Missing',
  'missing-near': 'Missing',
};

/* ---------- a check's note, from the row and the messages ---------- */

const SHEET_DAY = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?: at (\d{1,2}:\d{2}) ?(AM|PM))?/;
const sheetDay = (m: RegExpExecArray): string => `${m[1]}, ${m[3]} ${m[2]}${m[4] ? `, ${m[4]} ${m[5] === 'AM' ? 'a.m.' : 'p.m.'}` : ''}`;

/**
 * One plain line under a check that is still open, when the row says more than "missing": the
 * office's deadline and how often it asked (N2), why a call is not proof (N5), which file version
 * each side holds (N7, MSG-35), what is owed (N6), and a video link still to come (N12).
 */
export function checkNote(h: Hearing, id: CheckId | 'G1' | 'G2' | 'G3' | 'G4' | 'G5', messages: { id: string | number; sender: string; channel: string; properties?: string[] }[]): string | null {
  const all = h.printed ?? '';
  const key = ({ date: 'G1', yes: 'G2', name: 'G3', files: 'G4', owed: 'G5' } as Record<string, string>)[id] ?? id;
  const parts: string[] = [];
  if (key === 'G1' && /VIDEO ROOM ONLY, NO LINK/.test(all)) parts.push('Stays open until a video link is on record.');
  if (key === 'G3') {
    const dl = /OFFICE DEADLINE ([^.]+)\./.exec(all);
    const d = dl ? SHEET_DAY.exec(dl[1]!) : null;
    const asked = /THE OFFICE HAS ASKED (\d+) TIMES/.exec(all)?.[1];
    if (d) parts.push(`Office deadline ${sheetDay(d)}${asked ? `; the office asked ${asked} times` : ''}.`);
    const calls = messages.filter((m) => m.properties?.includes(h.property) && /phone|voicemail/i.test(m.channel));
    const ids = calls.map((m) => String(m.id));
    const list = ids.length > 1 ? `${ids.slice(0, -1).join(', ')} and ${ids.at(-1)}` : ids[0];
    if (calls.length && h.gates.G3.state !== 'proved') parts.push(`The phone ${calls.length === 1 ? 'note' : 'notes'} (message${calls.length === 1 ? '' : 's'} ${list}) ${calls.length === 1 ? 'is' : 'are'} not proof: calls and voicemail never close a check.`);
  }
  if (key === 'G4') {
    const v = /SEND CASE FILES VERSION (\d+)[^(]*\(the consultant confirmed (version \d+|none); the clerk confirmed (version \d+|none)\)/.exec(all);
    if (v) parts.push(`Current version ${v[1]}. Files with the consultant: ${v[2] === 'none' ? 'none confirmed' : v[2]}. Files with the clerk: ${v[3] === 'none' ? 'none confirmed' : v[3]}.`);
  }
  if (key === 'G5' && typeof h.owed === 'string' && h.owed.trim()) parts.push(`Owed: ${h.owed.trim().replace(/\.?$/, '.')}`);
  return parts.length ? parts.join(' ') : null;
}
