/**
 * The machine-readable view of the app's data, for agents that browse it: plain
 * JSON built from the typed data layer and the session. window.hearingDesk exposes these as
 * read-only getters, and "Export as JSON" downloads them.
 */

import { hearings, measureRows, offices, suggestions } from './data';
import { needOf, proposedBy, targetCell } from './decisions';
import { downloadFile } from './download';
import { GATE_PARTS, gateLabel, gateView } from './gates';
import { getSession, proposalKey, type Session } from './store';

export function exportHearings(s: Pick<Session, 'proposals'> = getSession()) {
  return hearings.map((h) => ({
    case: h.case,
    property: h.property,
    county: h.county,
    date: h.date,
    time: h.time,
    consultant: h.consultant ?? null,
    status: h.status,
    dailyList: h.dailyList ?? null,
    workingDays: h.workingDays,
    gates: Object.fromEntries(
      GATE_PARTS.map((p) => [gateLabel(p.key), { state: gateView(h, p.key, s), link: h.gates[p.key].link, cell: `Hearings ${h.gates[p.key].linkColumn}${h.row}` }]),
    ),
    printedLines: h.printedLines.map((l) => ({ cell: `Hearings ${l.column}${h.row}`, text: l.text })),
    url: `#/hearings/${h.case}`,
  }));
}

export function exportOffices() {
  return offices().map((o) => ({ county: o.county, slug: o.slug, row: o.row, cells: o.cells, url: `#/offices/${o.slug}` }));
}

export function exportSuggestions(p: Session['proposals'] = getSession().proposals) {
  return suggestions().map((x) => ({
    row: x.row,
    case: x.case,
    cell: targetCell(x),
    proposal: x.proposal,
    message: x.message || null,
    from: x.from || null,
    proposedBy: proposedBy(x),
    need: needOf(x),
    decisionHere: p[proposalKey('suggestion', x.row)]?.decision ?? null,
  }));
}

export function exportMeasures() {
  return measureRows().map((r) => ({ row: r.row, cells: r.cells }));
}

/** Hands the viewer a JSON file. Nothing is sent anywhere. */
export function downloadJson(name: string, data: unknown): void {
  downloadFile(name, `${JSON.stringify(data, null, 2)}\n`, 'application/json');
}
