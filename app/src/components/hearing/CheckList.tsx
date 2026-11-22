/*
 * CheckList: the five checks of a hearing in plain words, done or missing, with the message that
 * proves each one a single click away. Rows start closed so the five fit on one screen, except the first
 * missing check when a suggestion for it waits for a decision. Gate codes and
 * cells only show inside the "Sheet reference" disclosure at the foot of the list.
 *
 * Adapted from "Onboarding Checklist" by ephraimduncan, https://21st.dev/r/ephraimduncan/onboarding-01
 * (a filled check for a done step and an outlined circle for an open one, "3 / 5 completed" in the
 * header, the first open step expanded, each step expands in place) and the expanding rows of
 * ("Pull Request Card" by aadixc0de, https://21st.dev/r/aadixc0de/pull-request-card;
 * "Row Expand" by f0rextasy, https://21st.dev/r/f0rextasy/row-expand).
 * Changes: no card and no circular progress ring (the count is words); five rows divided by
 * hairlines; the state is an icon plus a word in ink, with a small red dot only when a check is
 * missing close to the hearing; the proving message is quoted in Inter under a 1 px rule; reader
 * suggestions for the check sit in the open row; several rows may be open at once.
 */

import { Check, ChevronRight, Minus } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId, useState, type ReactNode } from 'react';
import type { GateKey, Hearing } from '@/types/data';
import { suggestionsFor } from '@/lib/data';
import { needOf } from '@/lib/decisions';
import { dateShort, workingDaysWords } from '@/lib/format';
import { DUR, tween } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { ProposalRow } from '@/components/ui/ProposalRow';
import { messageById, messageTime } from '@/pages/b1/components/MessageQuote';
import { CHECK_STATE_WORD, checkNote, isDone, type CheckPartView, type CheckState, type CheckView } from './checks';
import { engine } from '@/lib/data';
import { SheetReference } from './SheetReference';

const TEST_PART: Record<string, string> = { G1: 'G1', G2: 'G2', G3: 'G3', G4clerk: 'G4-clerk', G4consultant: 'G4-consultant', G5: 'G5' };

/** "The hearing is in 3 working days." or "The hearing was 3 working days ago." */
function nearSentence(h: Hearing): string {
  const d = h.workingDays;
  if (d === null) return '';
  if (d === 0) return 'The hearing is today.';
  return d < 0 ? `The hearing was ${workingDaysWords(d)}.` : `The hearing is ${workingDaysWords(d)}.`;
}

function StateIcon({ state }: { state: CheckState }) {
  if (state === 'done')
    return (
      <span aria-hidden className="grid size-5 place-items-center rounded-full bg-ink text-surface">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  if (state === 'not-needed')
    return (
      <span aria-hidden className="grid size-5 place-items-center rounded-full border border-border bg-sunken text-muted">
        <Minus className="size-3" strokeWidth={2.5} />
      </span>
    );
  return (
    <span
      aria-hidden
      className={cn('size-5 rounded-full border-[1.5px]', state === 'accepted' ? 'border-dashed border-accent' : state === 'missing-near' ? 'border-[var(--dot-danger)]' : 'border-border-strong')}
    />
  );
}

/** "Tesswick hearing office" as "Tesswick office"; people keep their names. */
const shortSender = (sender: string): string => sender.replace(/ hearing office$/, ' office').replace(/^Alice’s Law Firm operations$/, 'Our office');

/** The collapsed row's proof words: "Tesswick office, Mon, Jun 3", "No message yet", "Clerk done, consultant not yet". */
function proofWords(c: CheckView): string {
  if (c.state === 'not-needed') return 'Nothing owed';
  const p = c.partViews;
  if (p.length > 1) {
    const done = p.filter((x) => x.view === 'proved');
    if (done.length === p.length) return 'Clerk and consultant both confirmed';
    if (done.length === 0) return p.some((x) => x.message) ? 'Receipts linked, not counted yet' : 'No receipt from either yet';
    return p.map((x, i) => `${i === 0 ? x.who : x.who?.toLowerCase()} ${x.view === 'proved' ? 'done' : 'not yet'}`).join(', ');
  }
  const one = p[0]!;
  if (one.view === 'proved' && one.message) {
    const m = messageById(one.message);
    return m ? `${shortSender(m.sender)}, ${dateShort(m.at)}` : `Message ${one.message}`;
  }
  if (one.view === 'accepted') return 'Accepted here, not on the sheet yet';
  return one.message ? `Message ${one.message} not counted yet` : 'No message yet';
}

/** "Files with the clerk: done, message 34, version 2", one visible line per receipt of the files check. */
function receiptLine(h: Hearing, p: CheckPartView): string {
  const m = p.message ? messageById(p.message) : undefined;
  const state = p.view === 'proved' ? 'done' : p.view === 'accepted' ? 'accepted here' : 'not yet';
  // The sheet's own words first ("the consultant confirmed version 2; the clerk confirmed none"), then the message.
  const printed = /\(the consultant confirmed (?:version (\d+)|none); the clerk confirmed (?:version (\d+)|none)\)/.exec(h.printed ?? '');
  const onSheet = printed ? (p.who === 'Clerk' ? printed[2] : printed[1]) : undefined;
  const version = onSheet ?? (m ? (/\bversion (\d+)/i.exec(m.body)?.[1] ?? /\bv(\d+)\b/.exec(m.body)?.[1]) : undefined);
  const msg = p.message ? `, message ${p.message}${m ? (version ? `, version ${version}` : ', no version named') : ''}` : ', no receipt yet';
  return `Files with the ${String(p.who).toLowerCase()}: ${state}${msg}`;
}

function PartProof({ part, multi }: { part: CheckPartView; multi: boolean }) {
  const m = part.message ? messageById(part.message) : undefined;
  const counted = part.view === 'proved';
  const head = multi ? `Files with the ${String(part.who).toLowerCase()}: ` : '';
  let lead: string;
  if (part.view === 'not-needed') lead = 'Nothing is owed, so nothing needs proof.';
  else if (part.view === 'accepted') lead = 'You accepted a suggestion here. A person pastes the link on the sheet at the 9:00 a.m. pass.';
  else if (counted) lead = multi ? 'Done.' : '';
  else if (m) lead = `Message ${m.id} is linked on the sheet, but the sheet does not count it as proof yet.`;
  else lead = 'No message proves this yet.';
  return (
    <div className="flex flex-col gap-2">
      {head || lead ? (
        <p className="text-body text-ink">
          {head ? <span className="font-semibold">{head}</span> : null}
          {lead}
        </p>
      ) : null}
      {m ? (
        <figure className="flex flex-col gap-1">
          <figcaption className="text-small text-muted">
            Message {m.id} from {m.sender}, {m.channel}, {messageTime(m.at)}
          </figcaption>
          <blockquote className="max-w-[75ch] border-l border-border-strong pl-3 text-body text-ink">{m.body}</blockquote>
        </figure>
      ) : null}
    </div>
  );
}

/**
 * A reader note without sheet codes: the reader's words carry gate codes and cells ("G4, the clerk:
 * "packets received" (55). BW gets the sender"), so only the quoted words and the message stay.
 */
function plainNote(words: string | null | undefined, message: string | number | null | undefined): string {
  const quotes = [...(words ?? '').matchAll(/"([^"]+)"/g)].map((q) => `“${q[1]}”`);
  const where = message ? ` in message ${message}` : '';
  return quotes.length ? `the software found ${quotes.join(' and ')}${where}. A person decides whether it counts.` : `the software has a note on this check${where}.`;
}

/** Whether a suggestion for this check waits for a person's yes or no. */
function hasWaiting(h: Hearing, c: CheckView): boolean {
  const keys = c.partViews.map((p) => p.key);
  return suggestionsFor(h.case).some((s) => s.gate !== null && keys.includes(s.gate) && needOf(s) === 'decide');
}

/** Reader suggestions for the check's parts: notes, and the ones that wait for a yes or no. */
function useSuggestionExtras(h: Hearing, c: CheckView): { node: ReactNode; waiting: number } {
  const keys = c.partViews.map((p) => p.key);
  const rows = suggestionsFor(h.case).filter((s): s is typeof s & { gate: GateKey } => s.gate !== null && keys.includes(s.gate));
  const pending = rows.filter((s) => needOf(s) === 'decide');
  const notes = rows.filter((s) => needOf(s) === 'ask-version' || needOf(s) === 'info');
  if (!pending.length && !notes.length) return { node: null, waiting: 0 };
  return {
    waiting: pending.length,
    node: (
      <div className="flex flex-col gap-2">
        {notes.map((s) => (
          <p key={`n${s.row}`} data-testid={`note-${h.case}-${TEST_PART[s.gate]}-${s.row}`} className="text-body text-ink-2">
            <span className="font-medium text-ink">For information: </span>
            {needOf(s) === 'ask-version'
              ? `message ${s.message} names no case-file version; a person asks the sender.`
              : s.proposal.startsWith('do not close')
                ? `the software read ${s.message ? `message ${s.message}` : 'the messages'} and says it does not prove this yet.`
                : s.proposal === 'leave open'
                  ? 'the software found no message that proves it.'
                  : plainNote(s.words, s.message)}
          </p>
        ))}
        {pending.map((s, i) => (
          <ProposalRow
            key={`p${s.row}`}
            s={s}
            proposal={s.proposal === 'close' ? `Mark done with message ${s.message}` : s.proposal}
            quote={s.words}
            from={s.from || undefined}
            name={`${c.name} for ${h.case}${s.message ? `, message ${s.message}` : ''}`}
            testIdBase={i === 0 ? `${h.case}-${TEST_PART[s.gate]}` : `${h.case}-${TEST_PART[s.gate]}-${s.row}`}
          />
        ))}
      </div>
    ),
  };
}

function Row({ h, c, first, open, onToggle, onShowMessage }: { h: Hearing; c: CheckView; first: boolean; open: boolean; onToggle: () => void; onShowMessage?: (id: string) => void }) {
  const panelId = `${useId()}-panel`;
  const reduce = useReducedMotion();
  const extras = useSuggestionExtras(h, c);
  const near = c.state === 'missing-near';
  const shown = c.partViews.map((p) => p.message).filter((x): x is string => !!x && !!messageById(x));
  return (
    <li data-testid={`check-${c.id}`} data-state={c.state} className={cn(!first && 'border-t border-border')}>
      <button
        type="button"
        data-testid={`proof-link-${h.case}-${c.code}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          'group grid min-h-12 w-full grid-cols-[20px_minmax(0,1fr)_16px] items-center gap-x-3 gap-y-1 px-3 py-2 text-left @2xl:grid-cols-[20px_minmax(0,1fr)_120px_minmax(0,240px)_16px]',
          'transition-colors duration-[var(--dur-color)] hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
          open && 'bg-surface-2',
        )}
      >
        <StateIcon state={c.state} />
        <span className="min-w-0 text-body font-medium text-ink">{c.name}</span>
        <span className="hidden items-center gap-2 text-body text-ink @2xl:inline-flex">
          {near ? <span aria-hidden className="size-1.5 rounded-full bg-[var(--dot-danger)]" /> : null}
          {CHECK_STATE_WORD[c.state]}
          {extras.waiting ? <span className="text-small text-muted">, {extras.waiting} to decide</span> : null}
        </span>
        <span className={cn('hidden truncate text-body @2xl:block', isDone(c.state) ? 'text-ink-2' : 'text-muted')}>{proofWords(c)}</span>
        <ChevronRight aria-hidden className={cn('size-4 text-muted transition-transform duration-[var(--dur-pop)] group-hover:text-ink motion-reduce:transition-none', open && 'rotate-90')} />
        <span className="col-start-2 text-small text-ink-2 @2xl:hidden">
          {CHECK_STATE_WORD[c.state]}: {proofWords(c)}
          {extras.waiting ? `, ${extras.waiting} to decide` : ''}
        </span>
      </button>
      {c.partViews.length > 1 && c.partViews.some((p) => p.message) ? (
        <ul className="flex flex-col gap-1 pr-3 pb-3 pl-[44px] text-small text-ink-2" data-testid={`receipts-${h.case}`}>
          {c.partViews.map((p) => (
            <li key={p.key} data-testid={`receipt-${h.case}-${TEST_PART[p.key]}`}>
              {p.message && onShowMessage && messageById(p.message) ? (
                <button type="button" onClick={() => onShowMessage(p.message!)} className="-my-1 inline-flex items-center rounded-control py-1 text-left hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                  {receiptLine(h, p)}
                </button>
              ) : (
                receiptLine(h, p)
              )}
            </li>
          ))}
        </ul>
      ) : null}
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="panel"
            id={panelId}
            role="region"
            aria-label={`${c.name}: proof`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={tween(DUR.pop, reduce)}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 pt-1 pr-3 pb-4 pl-[44px]">
              {c.state !== 'not-needed' ? (
                <p className="text-body text-ink-2">
                  <span className="font-medium text-ink">{isDone(c.state) ? 'Why it counts: ' : 'What proves it: '}</span>
                  {c.proof}
                  {near ? <span className="font-medium text-ink"> {nearSentence(h)}</span> : null}
                </p>
              ) : null}
              {!isDone(c.state) && checkNote(h, c.id, engine.messages) ? (
                <p className="text-body font-medium text-ink" data-testid={`check-note-${h.case}-${c.code}`}>
                  {checkNote(h, c.id, engine.messages)}
                </p>
              ) : null}
              {c.partViews.map((p) => (
                <PartProof key={p.key} part={p} multi={c.partViews.length > 1} />
              ))}
              {extras.node}
              {shown.length && onShowMessage ? (
                <div>
                  <button
                    type="button"
                    data-testid={`check-${c.id}-show`}
                    onClick={() => onShowMessage(shown[0]!)}
                    className="inline-flex h-8 items-center rounded-control px-2 -ml-2 text-small font-medium text-accent transition-colors duration-[var(--dur-color)] hover:bg-accent-soft"
                  >
                    Show in the messages
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export function CheckList({ hearing: h, views, summary, onShowMessage, className }: { hearing: Hearing; views: CheckView[]; summary: string; onShowMessage?: (id: string) => void; className?: string }) {
  const next = views.find((v) => !isDone(v.state));
  // Rows start closed so all five checks show at 1920 x 1080. The one exception is the first
  // missing check when a suggestion for it waits for a yes or no: that decision is the next action.
  const [open, setOpen] = useState<Set<string>>(() => new Set(next && hasWaiting(h, next) ? [next.id] : []));
  const headingId = `checks-${h.case}`;
  const toggle = (id: string): void =>
    setOpen((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  return (
    <section data-testid="gates" aria-labelledby={headingId} className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 id={headingId} className="text-[16px] leading-6 font-semibold text-ink">
          Checks
        </h3>
        <span data-testid="checks-count" className="text-small text-ink-2 tabular-nums">
          <span data-testid="hearing-checks-summary">
            {summary}
            {next && !summary.includes('Next') ? `. Next: ${next.name.charAt(0).toLowerCase()}${next.name.slice(1)}` : ''}
          </span>
        </span>
      </div>
      <ol aria-label={`Checks for ${h.case}`} className="flex flex-col border-y border-border">
        {views.map((c, i) => (
          <Row key={c.id} h={h} c={c} first={i === 0} open={open.has(c.id)} onToggle={() => toggle(c.id)} onShowMessage={onShowMessage} />
        ))}
      </ol>
      <SheetReference testId={`checks-ref-${h.case}`}>
        <ul className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
          {views.flatMap((c) =>
            c.partViews.map((p) => (
              <li key={p.key} className="contents">
                <span className="font-mono">
                  {c.code}
                  {p.who ? ` ${p.who.toLowerCase()}` : ''}, {p.cell}
                </span>
                <span>
                  {c.name}
                  {p.who ? ` (${p.who.toLowerCase()})` : ''}
                </span>
              </li>
            )),
          )}
        </ul>
      </SheetReference>
    </section>
  );
}
