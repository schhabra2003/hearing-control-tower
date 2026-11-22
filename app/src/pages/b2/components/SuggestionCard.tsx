import { ArrowRight, BookOpenCheck, Check, Undo2, X } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { hearingByCase, officeSlug, type Suggestion } from '@/lib/data';
import { proposedBy, proposedValue, proposedWords } from '@/lib/decisions';
import { cellLabel } from '@/lib/cellLabels';
import { datesTyped } from '@/lib/format';
import { actions, proposalKey, useSession } from '@/lib/store';
import { CopyValue } from '@/components/ui/CopyValue';
import { decisionKey, focusNextDecision } from '@/lib/focusNext';
import { gateLabel } from '@/lib/gates';
import { plainLine } from '@/lib/sheetText';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { CopyLink } from '@/components/ui/CopyLink';
import { useProposalDecision } from '@/components/ui/useProposalDecision';
import { askOf } from '../lib';
import { messageById, messageTime } from '@/pages/b1/components/MessageQuote';

/** "Message 7, Velloran hearing office, email, Thu, May 30, 9:18 a.m.": who sent it, how and when. */
export function messageMeta(id: string, from: string): string {
  const m = id ? messageById(id) : undefined;
  const who = from || m?.sender || '';
  const how = m?.channel ? `, ${m.channel}` : '';
  const when = m?.at ? `, ${messageTime(m.at)}` : ', no date in the message';
  return `Message ${id}${who ? `, ${who}` : ''}${how}${when}`;
}


/** A row inside a hearing's group: a hairline between rows instead of a card of its own. */
const ROW = 'border-b border-border last:border-b-0';

/** The reasoning a rule or a reader wrote, without its rule code and the sheet's "In the example" notes. */
const why = (w: string): string => w.replace(/^Rule [A-Z]\d+[a-z]?\.\s*/, '').replace(/\s*\((?:rule|Rule) [A-Z]\d+[a-z]?\)/g, '').replace(/\b[Rr]ule [A-Z]\d+[a-z]?\b\s*/g, 'The rule ').replace(/\s*In the example the cell[^.]*(\.[^.]*)?\.?$/, '').trim();

/** The first sentence of the reason, whole; the rest goes behind Details. */
function whyParts(w: string): { first: string; rest: string } {
  const t = why(w);
  const m = /^(.+?[.!?])\s+(.+)$/s.exec(t);
  return m ? { first: m[1]!, rest: m[2]! } : { first: t, rest: '' };
}

/** True when column F holds the message's own words (a proposal to close, from the sender). */
const isQuote = (s: Suggestion): boolean => s.closes && !!s.message && !/person/i.test(s.from);

/** "G1 proof link for AX-101, message 1": the name a screen reader hears on each button. */
function accessibleName(s: Suggestion): string {
  return `${s.gate ? `${gateLabel(s.gate)} proof link` : cellLabel(s.cell)} for ${s.case}${s.message ? `, message ${s.message}` : ''}`;
}

function Subject({ s }: { s: Suggestion }) {
  const h = hearingByCase(s.case);
  const office = s.case.replace(/^Office: /, '');
  const href = h ? `#/hearings/${h.case}` : /^[A-Z][a-z]/.test(office) && s.cell.startsWith('Offices') ? `#/offices/${officeSlug(office)}` : null;
  const body = (
    <>
      <span className="text-body font-medium tabular-nums">{s.case}</span>
      {h ? <span className="text-body text-ink-2">{h.property}</span> : null}
    </>
  );
  return href ? (
    <a href={href} className="inline-flex min-h-6 min-w-0 items-center gap-2 rounded-[var(--radius-chip)] text-ink hover:text-accent hover:underline">{body}</a>
  ) : (
    <span className="inline-flex min-w-0 items-baseline gap-2 text-ink">{body}</span>
  );
}

/**
 * One row of the Reader suggestions tab. A row that waits shows what the readers propose, the
 * message's own words (quoted) or the reason (plain), and Accept or Refuse. A decided row collapses
 * to one line with Undo, and focus moves on to the next proposal. Rows that need no decision
 * (already on the sheet, a repeat, a version to ask for) are one line with no buttons.
 */
/**
 * One row of the Reader suggestions tab. A row that waits shows who proposed it (the readers or a
 * rule), the proposal, the message's own words (quoted) or the first sentence of the reason, and
 * Accept or Refuse in its header. A decided row collapses to one line with what to type and Undo.
 * Rows that need no decision (already on the sheet, a repeat, a version to ask for) are one line.
 */
export function SuggestionCard({ s, inGroup = false }: { s: Suggestion; inGroup?: boolean }) {
  const d = useProposalDecision(s);
  const ref = useRef<HTMLElement>(null);
  const ask = askOf(s);
  const name = accessibleName(s);
  const by = proposedBy(s) === 'readers' ? 'From the readers' : 'From the rules';
  const title = s.gate ? gateLabel(s.gate) : cellLabel(s.cell);
  const read = useSession((st) => st.proposals[proposalKey('read', s.row)]);

  const undo = (): void => {
    d.undo();
    window.requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[data-accept]')?.focus());
  };
  const accept = (): void => {
    d.accept();
    focusNextDecision(ref.current);
  };
  const refuse = (): void => {
    d.refuse();
    focusNextDecision(ref.current);
  };
  const onKey = (e: KeyboardEvent<HTMLElement>): void => {
    if (ask !== 'yes-no') return;
    const k = decisionKey(e);
    if (!k) return;
    if (!d.decision && k === 'a') { e.preventDefault(); accept(); }
    else if (!d.decision && k === 'r') { e.preventDefault(); refuse(); }
    else if (d.decision && k === 'u') { e.preventDefault(); undo(); }
  };

  if (ask === 'yes-no' && d.decision) {
    const accepted = d.decision.decision === 'accepted';
    return (
      <article ref={ref} tabIndex={-1} data-testid={`suggestion-${s.row}`} onKeyDown={onKey} aria-label={`${name}: ${d.decision.decision}`} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 outline-offset-[-2px]', inGroup ? ROW : 'rounded-[var(--radius-card)] border', accepted ? 'border-accent/40 bg-accent-soft/60' : 'border-border bg-surface-2')}>
        {accepted ? <Check aria-hidden className="size-4 text-accent" strokeWidth={2.5} /> : <X aria-hidden className="size-4 text-ink-2" strokeWidth={2.5} />}
        <div className="min-w-0 flex-1 text-body text-ink">
          <p data-testid={`suggestion-state-${s.row}`}>
            <span className="font-semibold">{accepted ? 'Accepted' : 'Refused'}</span>
            <span className="text-ink-2">{inGroup ? '' : ` ${s.case},`} {title}. {accepted ? (s.gate ? 'Paste the link on the sheet.' : 'Type it on the sheet.') : 'Type no on the sheet.'}</span>
          </p>
          <p className="text-small text-ink-2" data-testid={`suggestion-ref-${s.row}`}>Sheet reference: {accepted ? `${d.cell}, yes in ${d.answer}` : `no in ${d.answer}`}</p>
          {accepted && d.link ? <CopyLink link={d.link} className="mt-1" /> : null}
          {accepted && !d.link ? <CopyValue label="To type" value={proposedValue(s)} testId={`suggestion-value-${s.row}`} className="mt-1" /> : null}
        </div>
        <Button size="sm" variant="ghost" data-undo aria-label={`Undo: ${name}`} aria-keyshortcuts="u" icon={<Undo2 aria-hidden className="size-4" />} data-testid={`suggestion-undo-${s.row}`} onClick={undo}>
          Undo
        </Button>
      </article>
    );
  }

  if (ask === 'rule-says') {
    return (
      <article ref={ref} data-testid={`suggestion-${s.row}`} className={cn('flex flex-col gap-1.5 bg-surface px-4 py-3', inGroup ? ROW : 'rounded-[var(--radius-card)] border border-border')}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {inGroup ? null : <Subject s={s} />}
          <span className="min-w-0 flex-1 text-body font-semibold text-ink">{title}</span>
          {read ? (
            <span className="inline-flex items-center gap-2 text-body text-ink-2">
              Read
              <Button size="sm" variant="ghost" data-testid={`suggestion-unread-${s.row}`} aria-label={`Undo read: ${name}`} icon={<Undo2 aria-hidden className="size-4" />} onClick={() => actions.undoProposal('read', s.row)}>
                Undo
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="secondary" data-testid={`suggestion-read-${s.row}`} aria-label={`Mark as read: ${name}`} icon={<BookOpenCheck aria-hidden className="size-4" />} onClick={() => actions.acceptProposal('read', s.row, d.cell)}>
              Mark as read
            </Button>
          )}
        </div>
        <p className="text-body text-ink">
          <span className="text-ink-2">Rule says: </span>
          {plainLine(proposedWords(s))}
        </p>
        <p className="text-small text-ink-2">Nothing to accept. Read the message{s.message ? ` (message ${s.message})` : ''} and type the value you find in {d.cell}.</p>
      </article>
    );
  }

  if (ask === 'on-sheet' || ask === 'ask-version' || ask === 'repeat' || ask === 'open' || ask === 'nothing') {
    const line =
      ask === 'nothing' ? `Nothing to type. ${d.cell} stays empty.`
      : ask === 'on-sheet' ? `Already on the sheet in ${d.cell}.`
        : ask === 'ask-version' ? 'Names no case-file version. A person asks the sender which version they have.'
          : ask === 'repeat' ? `Repeat of message ${/message (\d+)/.exec(s.proposal)?.[1] ?? s.message}: type nothing.`
            : s.proposal.startsWith('do not close') ? `For information: ${d.cell} stays open.`
              : `For information: ${plainLine(s.proposal.replace(/^for a person:\s*/, ''))}.`;
    return (
      <article ref={ref} data-testid={`suggestion-${s.row}`} className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-1 border-border bg-surface px-4 py-2.5', inGroup ? ROW : 'rounded-[var(--radius-card)] border')}>
        {inGroup ? null : <Subject s={s} />}
        <span className="text-body font-medium text-ink">{title}</span>
        <span className="min-w-0 flex-1 text-body text-ink-2">{line}</span>
      </article>
    );
  }

  const reason = s.words && !isQuote(s) && ask !== 'hold' ? whyParts(s.words) : null;
  return (
    <article
      ref={ref}
      data-testid={`suggestion-${s.row}`}
      tabIndex={-1}
      onKeyDown={onKey}
      aria-label={name}
      className={cn('group flex flex-col gap-2 bg-surface p-4 outline-offset-[-2px]', inGroup ? `${ROW} pl-12` : 'rounded-[var(--radius-card)] border border-border hover:border-border-strong/60')}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {inGroup ? null : <Subject s={s} />}
        <span className="min-w-0 flex-1 text-body font-semibold text-ink">{title}</span>
        {ask === 'hold' ? (
          <a
            href={`#/offices/${officeSlug(s.case.replace(/^Office: /, ''))}?approve=1`}
            className="-my-1 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-border-strong bg-surface px-3 text-body font-medium text-ink hover:bg-surface-2"
          >
            Decide on the Offices page
            <ArrowRight aria-hidden className="size-4" />
          </a>
        ) : (
          <span className="-my-1 flex items-center gap-2">
            <span className="text-small text-ink-2" data-testid={`suggestion-role-${s.row}`}>Coordinator decides</span>
            <Button size="md" variant="secondary" data-accept aria-label={`Accept: ${name}`} aria-keyshortcuts="a" icon={<Check aria-hidden className="size-4" />} data-testid={`suggestion-accept-${s.row}`} onClick={accept} className="group-focus-within:border-accent group-focus-within:bg-accent group-focus-within:text-on-accent">
              Accept
            </Button>
            <Button size="md" variant="ghost" aria-label={`Refuse: ${name}`} aria-keyshortcuts="r" icon={<X aria-hidden className="size-4" />} data-testid={`suggestion-refuse-${s.row}`} onClick={refuse}>
              Refuse
            </Button>
          </span>
        )}
      </div>

      <p className="text-body text-ink">
        {ask === 'hold' ? (
          'The office says it changed its route. No notice goes to it until a person decides the change on the Offices page.'
        ) : (
          <>
            <span className="text-ink-2">{by}: </span>
            {s.closes ? `Close with message ${s.message}` : plainLine(proposedWords(s))}
          </>
        )}
      </p>

      {s.words && isQuote(s) ? (
        <figure>
          <figcaption className="mb-1 text-small text-ink-2" data-testid={`suggestion-meta-${s.row}`}>{messageMeta(s.message, s.from)}</figcaption>
          <blockquote className="text-quote max-w-[var(--measure)] border-l-2 border-border-strong pl-3 text-ink">{s.words}</blockquote>
        </figure>
      ) : null}
      {s.message && !(s.words && isQuote(s)) ? <p className="text-small text-ink-2" data-testid={`suggestion-meta-${s.row}`}>{messageMeta(s.message, s.from)}</p> : null}
      {reason ? (
        <div className="text-body text-ink-2">
          <p><span className="font-medium text-ink">Why: </span>{datesTyped(plainLine(reason.first))}{s.message ? ` (message ${s.message})` : ''}</p>
          {reason.rest ? (
            <details className="mt-1">
              <summary className="cursor-pointer text-small font-medium hover:text-ink">Details</summary>
              <p className="mt-1 max-w-[80ch]">{plainLine(reason.rest)}</p>
            </details>
          ) : null}
        </div>
      ) : null}
      {d.rivals.length ? (
        <p className="text-small text-ink-2">
          One choice: {d.rivals.length + 1} proposals for {d.cell}. Accepting this one refuses message {d.rivals.map((r) => r.message).join(', ')}.
          {d.rivals.some((r) => Number(r.message) > Number(s.message)) ? ' A newer message proposes the other.' : ' This is the newer message.'}
        </p>
      ) : null}
    </article>
  );
}
