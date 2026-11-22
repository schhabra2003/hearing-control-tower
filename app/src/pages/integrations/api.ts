/**
 * The integrations for agents: window.hearingDesk.integrations() returns this, a fresh JSON copy
 * of the map with each card's status, flows, permission, fills, approvals, agent scope, unlocking
 * questions, cost and simulate events, plus what was simulated in this browser. Read-only: an
 * agent simulates with the same buttons a person uses (test ids in the README).
 */

import { INTEGRATIONS, statusCounts, statusSentence, EXAMPLE_NOTE } from './integrations';
import { getSimState } from './simulate';

export function deskIntegrations() {
  const s = getSimState();
  const json = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
  return json({
    note: `Nothing here is connected. Status words: Simulated (played on example files), Proposed, Not connected. ${EXAMPLE_NOTE}`,
    strip: statusSentence(),
    counts: statusCounts(),
    integrations: INTEGRATIONS.map((i) => ({
      slug: i.slug,
      name: i.name,
      examples: i.examples,
      url: `#/integrations/${i.slug}`,
      testId: `integration-${i.slug}`,
      status: i.counted,
      statuses: i.statuses,
      today: i.today,
      in: i.flowsIn,
      out: i.flowsOut,
      permission: i.permission,
      fills: i.fills,
      fillsRef: i.fillsRef,
      approves: i.approves,
      agent: i.agent,
      unlock: i.unlock,
      cost: i.cost,
      gaps: i.gaps ?? [],
      events: i.events.map((e, n) => ({
        id: e.id,
        title: e.title,
        source: e.source,
        ref: e.ref,
        shows: e.shows,
        lands: `#${e.lands.to}`,
        run: `button [data-testid="integration-${i.slug}-event-${n + 1}-run"] on #/integrations/${i.slug}`,
        undo: `button [data-testid="integration-${i.slug}-event-${n + 1}-undo"]`,
        simulatedHere: s.runs[e.id] ? { at: s.runs[e.id]!.at } : null,
      })),
    })),
    log: s.log,
  });
}
