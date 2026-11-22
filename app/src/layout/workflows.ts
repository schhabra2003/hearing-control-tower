/**
 * The main tasks, written once. The "?" help on each page, the #/agents page and
 * window.hearingDesk.tasks() all read this list, so a person and an agent follow the same steps
 * with the same button names. Every page has the same regions: Page header, Summary, Toolbar,
 * List and Detail.
 */

import type { DeskTask } from '@/types/hearingDesk';

export interface Workflow extends DeskTask {
  /** The page ids whose "?" help shows this task. */
  pages: string[];
}

export const WORKFLOWS: Workflow[] = [
  {
    id: 'at-risk-today',
    title: 'See what is at risk today',
    url: '#/',
    pages: ['today'],
    steps: [
      'Open Today (#/). The page header says how many coming hearings have a consultant’s yes; the words "<n> need one now" are a link.',
      'The List region "Needs action today" starts with "Decisions only you make", then "At risk today": one row per hearing with what to do first, the owner and the deadline.',
      'Select a row, or its link "Open hearing <case>" (URL #/?case=<case>). The Detail region shows every step for today, each with a "Done" box, and the five checks.',
    ],
    verify: 'hearingDesk.hearings({ atRisk: true }) returns the same cases as the List region.',
  },
  {
    id: 'act-on-hearing',
    title: 'Act on one hearing',
    url: '#/hearings/AX-107',
    pages: ['hearings'],
    steps: [
      'Open #/hearings/<case>. The Detail region opens on "What to do today": up to four steps, each with an owner and a deadline.',
      'Do each step. A step that needs a decision has its own button, for example "Review Tesswick’s change".',
      'The checks below show which proofs are in. Back returns to the list with the same filter.',
    ],
    verify: 'hearingDesk.hearing("<case>") holds the same checks as the Detail region.',
  },
  {
    id: 'pass-0900',
    title: 'Run the 9:00 a.m. pass',
    url: '#/today/9am',
    pages: ['pass'],
    steps: [
      'Open #/today/9am. The Summary region holds the four steps; the current one is selected.',
      'Step 1: select each proof link in the List region and press "Accept" or "Refuse" in the Detail region. The next one opens by itself; "Undo" reverses a decision.',
      'Step 2: decide the office change, as in "Approve a process change".',
      'Steps 3 and 4: make each call and answer each question, then press "Mark step 3 done" and "Mark step 4 done".',
    ],
    verify: 'hearingDesk.proposalCounts().proofLinksWaiting is 0 and hearingDesk.pendingChanges() has no state "waiting".',
  },
  {
    id: 'approve-change',
    title: 'Approve a process change',
    url: '#/offices/tesswick?approve=1',
    pages: ['offices', 'pass', 'today'],
    steps: [
      'On Today, select the row under "Decisions only you make" (#/?decide=<office>), or open #/offices/<office>. The Detail region compares how we name our consultant now with what the office now asks.',
      'Press "Approve new process" (a dialog repeats the comparison) or "Keep old process" (then "Keep old process" again to confirm).',
      'Type your name in "Your name" and press "Approve new process" in the dialog. The footer then reads "Approved by <name>", with "Undo".',
      'The coordinator then types the approval on the sheet; until then the office shows "Approved here, not yet on the sheet".',
    ],
    verify: 'hearingDesk.pendingChanges() gives the state "approved-here-not-on-sheet" for that office.',
  },
  {
    id: 'paste-message',
    title: 'Paste a new message',
    url: '#/suggestions/paste',
    pages: ['pass'],
    steps: [
      'Open #/suggestions/paste and press "Read the example messages". Recorded answers are replayed; no AI model is called.',
      'Each new proof link joins step 1 of the 9:00 a.m. pass, where a person accepts or refuses it.',
    ],
    verify: 'hearingDesk.proposalCounts().waiting grows by the number of new proof links.',
  },
  {
    id: 'kpis-costs',
    title: 'See the KPIs and the costs',
    url: '#/measures',
    pages: ['measures'],
    steps: [
      'Open Measures (#/measures). The Summary region holds the four headline figures, each with its label: Measured or Estimate.',
      'Choose a goal in the Toolbar, then select a measure in the List region. The Detail region gives its target, how it is counted and its cell.',
    ],
    verify: 'hearingDesk.measures() returns every figure with its label and cell.',
  },
  {
    id: 'ai-limits',
    title: 'See what the AI does and does not do',
    url: '#/ai',
    pages: ['ai', 'today'],
    steps: [
      'Open What the AI does (#/ai). The List region says what the readers do; the Detail region says what they never do.',
      'Every suggestion waits for a person at step 1 of the 9:00 a.m. pass. Nothing is sent or filed by itself.',
    ],
    verify: 'hearingDesk.ai() returns both lists in full, with the reply rule and the office rule.',
  },
];

export const workflowsFor = (page: string): Workflow[] => WORKFLOWS.filter((w) => w.pages.includes(page));
