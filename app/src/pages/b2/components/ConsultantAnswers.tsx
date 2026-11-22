/**
 * ConsultantAnswers: the answers consultants gave on their own page (#/consultant/<id>), on the
 * coordinator's Replies page. Each is a proposal like any other: a person accepts or refuses it,
 * and the sheet cells to type sit behind "Sheet reference". Undo on every decision.
 */

import { Check, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast, undoByKey } from '@/components/ui/Toast';
import { hearingByCase, hearingColumn, sheet } from '@/lib/data';
import { dateShort, sheetTime } from '@/lib/format';
import { actions, proposalKey, useSession, type ConsultantReply } from '@/lib/store';

const SCOPE = 'consultant';

/** A Hearings column letter by the start of its heading, for the columns the data layer does not name. */
function columnByHeading(start: string): string {
  const hit = Object.entries(sheet.hearingHeaders).find(([, h]) => h.startsWith(start));
  if (!hit) throw new Error(`No Hearings column starts with "${start}".`);
  return hit[0];
}

function what(r: ConsultantReply): string {
  switch (r.kind) {
    case 'yes':
      return r.detail === 'by text' ? 'Replied YES to the day-before text' : 'Yes, will attend';
    case 'no':
      return 'No, not taking it';
    case 'cannot':
      return r.detail === 'ill' ? 'Can’t make it: ill' : 'Can’t make it';
    case 'files':
      return `Has the case files, version ${r.detail ?? ''}`.trim();
    case 'signed':
      return r.detail === 'drawn' ? 'Signed the agreement (drawn)' : `Signed the agreement as “${r.detail ?? ''}”`;
  }
}

/** Where a person types the answer on the sheet, in one line. */
function where(r: ConsultantReply): { cell: string; text: string } {
  const h = hearingByCase(r.case);
  const row = h?.row ?? 0;
  const at = (col: string): string => `Hearings ${col}${row}`;
  switch (r.kind) {
    case 'yes': {
      if (h?.gates.G2?.state === 'proved') {
        const q = at(hearingColumn('dayBeforeYes'));
        return { cell: q, text: `Paste the link in ${q}. Type ${r.consultant} in ${at(columnByHeading('Day-before YES is from'))}.` };
      }
      const j = at(hearingColumn('g2Link'));
      return { cell: j, text: `Paste the link in ${j}.` };
    }
    case 'no': {
      const bc = at(columnByHeading('Declined by'));
      return { cell: bc, text: `Type ${r.consultant} in ${bc} and clear ${at(columnByHeading('Offer out to'))}. Offer it down Ask next.` };
    }
    case 'cannot':
      return {
        cell: 'Availability',
        text: `Add a not free row on the Availability tab for ${r.consultant}${r.detail === 'ill' ? ', reason illness' : ''}, with the link. Offer the hearing down Ask next.`,
      };
    case 'files': {
      const ay = at(hearingColumn('filesConsultant'));
      return { cell: ay, text: `Type ${r.detail ?? ''} in ${ay}, paste the link in ${at(hearingColumn('g4ConsultantLink'))}, type ${r.consultant} in ${at(hearingColumn('gotItFrom'))}.` };
    }
    case 'signed': {
      const n = at(hearingColumn('owed'));
      return { cell: n, text: `Send the signed copy to the office and update ${n}. The office's receipt goes in ${at(hearingColumn('g5Link'))}.` };
    }
  }
}

function AnswerRow({ k, r }: { k: string; r: ConsultantReply }) {
  const decision = useSession((s) => s.proposals[proposalKey(SCOPE, k)]);
  const h = hearingByCase(r.case);
  const w = where(r);
  const place = h ? `${h.property.split(',')[0]}, ${dateShort(h.date)}, ${sheetTime(h.time)}` : r.case;
  const testId = `consultant-answer-${k.replace(':', '-')}`;
  const decide = (accept: boolean): void => {
    if (accept) actions.acceptProposal(SCOPE, k, w.cell);
    else actions.refuseProposal(SCOPE, k, w.cell);
    toast({ title: `${accept ? 'Accepted' : 'Refused'}: ${r.consultant}, ${place}`, tone: accept ? 'success' : 'info', action: { label: 'Undo', run: () => actions.undoProposal(SCOPE, k) }, key: `${SCOPE}:${k}` });
  };
  return (
    <li data-testid={testId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 text-body leading-5">
        <p className="font-medium text-ink">
          {r.consultant}: {what(r)}
        </p>
        <p className="text-ink-2">
          {place}{place.endsWith('.') ? '' : '.'} Answered {r.at.replace(/^\w+, /, '')}
        </p>
        <details className="l-details mt-1">
          <summary>Sheet reference</summary>
          <p className="l-small l-ink2 l-p">{w.text}</p>
        </details>
      </div>
      {decision ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-body font-medium text-ink" data-testid={`${testId}-decision`}>
            {decision.decision === 'accepted' ? 'Accepted' : 'Refused'}
          </span>
          <Button size="sm" variant="ghost" icon={<Undo2 className="size-4" aria-hidden />} onClick={() => undoByKey(`${SCOPE}:${k}`, () => actions.undoProposal(SCOPE, k), `${decision.decision === 'accepted' ? 'Accepted' : 'Refused'}: ${r.consultant}, ${place}`)} aria-label={`Undo the decision on ${r.consultant}'s answer for ${place}`} data-testid={`${testId}-undo`}>
            Undo
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 gap-2">
          <Button size="md" variant="secondary" icon={<Check className="size-4" aria-hidden />} onClick={() => decide(true)} aria-label={`Accept ${r.consultant}'s answer for ${place}`} data-testid={`${testId}-accept`}>
            Accept
          </Button>
          <Button size="md" variant="ghost" icon={<X className="size-4" aria-hidden />} onClick={() => decide(false)} aria-label={`Refuse ${r.consultant}'s answer for ${place}`} data-testid={`${testId}-refuse`}>
            Refuse
          </Button>
        </div>
      )}
    </li>
  );
}

/** Shown on Replies only when a consultant has answered on their page in this session. */
export function ConsultantAnswers() {
  const replies = useSession((s) => s.consultantReplies);
  const list = Object.entries(replies ?? {});
  if (list.length === 0) return null;
  return (
    <section className="l-block" data-testid="consultant-answers" aria-labelledby="consultant-answers-title" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="l-blockhead">
        <h3 id="consultant-answers-title">From the consultant pages</h3>
        <span className="l-small l-muted">Simulated. Accept each to type it on the sheet.</span>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {list.map(([k, r]) => (
          <AnswerRow key={k} k={k} r={r} />
        ))}
      </ul>
    </section>
  );
}
