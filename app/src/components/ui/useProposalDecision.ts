/**
 * One way to decide a row of the Reader suggestions tab, used by the Reader suggestions page, the
 * hearing drawer and the hearing page, so a decision reads the same everywhere: the same cells to
 * type, the same Undo, and rows for the same cell decided as one choice.
 */

import type { Suggestion } from '@/lib/data';
import { answerCell, messageLink, proposedWords, rivalsOf, targetCell } from '@/lib/decisions';
import { cellLabel } from '@/lib/cellLabels';
import { GATE_PARTS } from '@/lib/gates';
import { actions, getSession, proposalKey, useSession, type Decision } from '@/lib/store';
import { toast, undoByKey } from './Toast';

const SCOPE = 'suggestion';

export interface ProposalDecision {
  decision: Decision | undefined;
  /** Where the value goes: "Hearings I11". */
  cell: string;
  /** The yes or no cell: "Reader suggestions G10". */
  answer: string;
  /** The link to paste, for a proof row. */
  link: string | null;
  /** What a person types after accepting, in one line. */
  acceptText: string;
  /** What a person types after refusing, in one line. */
  refuseText: string;
  /** Other rows for the same cell that wait; accepting this one refuses them. */
  rivals: Suggestion[];
  accept: () => void;
  refuse: () => void;
  undo: () => void;
}

/** "AX-103, Date confirmed by the office": the plain name of a decision for a toast. */
function shortName(s: Suggestion): string {
  const part = s.gate ? GATE_PARTS.find((p) => p.key === s.gate)?.name : null;
  const name = part ?? cellLabel(s.cell);
  return `${s.case}, ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

export function useProposalDecision(s: Suggestion): ProposalDecision {
  const decision = useSession((st) => st.proposals[proposalKey(SCOPE, s.row)]);
  const cell = targetCell(s);
  const answer = answerCell(s.row);
  const link = s.gate && s.message ? messageLink(s.message) : null;
  const rivals = rivalsOf(s);
  const acceptText = s.gate ? `Paste the link in ${cell}. Type yes in ${answer}.` : `Type it in ${cell}. Type yes in ${answer}.`;
  const refuseText = `Type no in ${answer}. Nothing is typed in ${cell}.`;

  const key = proposalKey(SCOPE, s.row);
  /** A row's own Undo goes through the toast's Undo when it can still run, so the notifications list records it. */
  const undo = (): void => {
    const answered = getSession().proposals[key]?.decision === 'refused' ? 'Refused' : 'Accepted';
    undoByKey(key, () => actions.undoProposal(SCOPE, s.row), `${answered}: ${shortName(s)}`);
  };
  const accept = (): void => {
    const before = getSession().proposals;
    const refused = rivals.filter((r) => !before[proposalKey(SCOPE, r.row)]);
    actions.acceptProposal(SCOPE, s.row, cell);
    for (const r of refused) actions.refuseProposal(SCOPE, r.row, cell);
    toast({
      title: `Accepted: ${shortName(s)}. ${s.gate ? 'Paste the link on the sheet.' : `Type ${proposedWords(s)} on the sheet.`}${refused.length ? ` Message ${refused.map((r) => r.message).join(', ')} refused.` : ''}`,
      body: `Sheet reference: ${cell}, yes in ${answer}.`,
      tone: 'success',
      action: {
        label: 'Undo',
        run: () => {
          actions.undoProposal(SCOPE, s.row);
          for (const r of refused) actions.undoProposal(SCOPE, r.row);
        },
      },
      key,
    });
  };
  const refuse = (): void => {
    actions.refuseProposal(SCOPE, s.row, cell);
    toast({ title: `Refused: ${shortName(s)}. Type no on the sheet.`, body: `Sheet reference: ${answer}.`, action: { label: 'Undo', run: () => actions.undoProposal(SCOPE, s.row) }, key });
  };
  return { decision, cell, answer, link, acceptText, refuseText, rivals, accept, refuse, undo };
}
