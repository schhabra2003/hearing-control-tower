/**
 * Every office change that waits for a person, in one list: the ones the sheet holds (Offices N
 * says "no notice goes") and, once the example messages were pasted, the change a pasted message
 * announced (H036, Caldmere). Today's step 2, the sidebar, the Overview, the Reader suggestions tab
 * and the Offices page all count from this list, so they never disagree.
 */

import { approvalCells, engine, officeBySlug, officeCell, officesWithChangeWaiting, type Office } from './data';
import { pastedOfficeChange, pasteSource } from './paste';
import type { Session } from './store';

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

export interface ChangeMessage {
  id: string;
  sender: string;
  channel: string;
  at: string | null;
  body: string;
}

export interface OfficeChange {
  slug: string;
  office: Office;
  county: string;
  /** "sheet": written in Offices M; "pasted": found in a pasted message, not yet on the sheet. */
  source: 'sheet' | 'pasted';
  /** ISO date the office said it. */
  saidOn: string;
  /** How the office said it: "phone", "email". */
  channel: string;
  /** The route the office now asks for, in its own words. */
  newRoute: string;
  /** Offices AS as typed, or what the pasted row proposes. */
  oldRouteAccepted: string;
  /** "Written confirmation asked for, not received." when the sheet says so. */
  writing: string | null;
  message: ChangeMessage | null;
  /** The cells a person types: the change (M), the approver's name (AQ) and the date (AR). */
  cells: { change: string; saidOn: string; still: string; name: string; date: string };
}

function sheetChange(o: Office): OfficeChange {
  const change = officeCell(o, 'Changed since');
  const saidOn = officeCell(o, 'Change said on');
  const still = officeCell(o, 'Does the office still accept');
  const text = str(change.value);
  const msgNo = /message (\d+)/.exec(text)?.[1];
  const m = msgNo ? engine.messages.find((x) => String(x.id) === msgNo) : undefined;
  const route = text.split(':').slice(1).join(':').split(/\.\s|\. Written/)[0]!.trim();
  const channel = /^phone/i.test(text) ? 'phone' : (m?.channel ?? 'message');
  const cells = approvalCells(o);
  return {
    slug: o.slug,
    office: o,
    county: o.county,
    source: 'sheet',
    saidOn: str(saidOn.value),
    channel,
    newRoute: route ? route.charAt(0).toUpperCase() + route.slice(1) : text,
    oldRouteAccepted: str(still.value),
    writing: /written confirmation asked/i.test(text) ? 'Written confirmation asked for, not received.' : null,
    message: m ? { id: String(m.id), sender: m.sender, channel: m.channel ?? channel, at: m.at ?? null, body: m.body } : null,
    cells: { change: `Offices ${change.ref}`, saidOn: `Offices ${saidOn.ref}`, still: `Offices ${still.ref}`, name: `Offices ${cells.name}`, date: `Offices ${cells.date}` },
  };
}

function pastedChange(): OfficeChange | null {
  const c = pastedOfficeChange();
  const o = c ? officeBySlug(c.slug) : undefined;
  if (!c || !o) return null;
  const r = c.row.row;
  const msg = pasteSource().messages.find((m) => String(m.id) === String(r[3]));
  const quoted = /To type: "([^"]+)"/.exec(r[5] ?? '')?.[1] ?? '';
  const sibling = (col: string): string =>
    str(pasteSource().rows.find((x) => x[3] === r[3] && (x[1] ?? '').startsWith(`Offices ${col}:`))?.[2]).replace(/^for a person:\s*/i, '');
  const at = typeof msg?.at === 'string' ? msg.at : null;
  const cells = approvalCells(o);
  return {
    slug: o.slug,
    office: o,
    county: o.county,
    source: 'pasted',
    saidOn: sibling('AT') || (at ? at.slice(0, 10) : ''),
    channel: msg?.channel ?? 'email',
    newRoute: quoted,
    oldRouteAccepted: sibling('AS'),
    writing: /Written confirmation asked/i.test(r[5] ?? '') ? 'Written confirmation asked for, not received.' : null,
    message: msg ? { id: String(msg.id), sender: msg.sender, channel: msg.channel ?? 'email', at, body: msg.body } : null,
    cells: {
      change: `Offices ${officeCell(o, 'Changed since').ref}`,
      saidOn: `Offices ${officeCell(o, 'Change said on').ref}`,
      still: `Offices ${officeCell(o, 'Does the office still accept').ref}`,
      name: `Offices ${cells.name}`,
      date: `Offices ${cells.date}`,
    },
  };
}

/** The changes a person must decide: the sheet's, plus the pasted one once the example was pasted. */
export function officeChanges(pasted: boolean | undefined): OfficeChange[] {
  const list = officesWithChangeWaiting().map(sheetChange);
  const p = pasted ? pastedChange() : null;
  if (p && !list.some((c) => c.slug === p.slug)) list.push(p);
  return list;
}

/** Undecided changes wait; held ones are counted apart, so a step can say "1 on hold". */
export function changeCounts(s: Pick<Session, 'changes' | 'pasted'>) {
  const all = officeChanges(s.pasted);
  const waiting = all.filter((c) => !s.changes[c.slug]);
  const held = all.filter((c) => s.changes[c.slug]?.decision === 'held');
  return { all, waiting, held };
}
