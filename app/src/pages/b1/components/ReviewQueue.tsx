/**
 * ReviewQueue: the proof links that wait for a person's yes or no, as the List region of step 1 of
 * the 9:00 a.m. pass. Accept and Refuse on every row, a selection for batch answers that asks for
 * confirmation, Undo on every decided row, a count that goes down, and keys (J and K move, A accept,
 * R refuse, U undo, X select, Esc clear).
 *
 * The adopted 21st.dev component adapted from:
 * - "Approval Inbox" by aadixc0de (chatcn), https://21st.dev/r/aadixc0de/approval-inbox
 * - "Access Request Inbox" by uvain, https://21st.dev/r/uvain/access-request-inbox
 * - "Decision Inbox" by flohoeller, https://21st.dev/r/flohoeller/decision-inbox
 * - "Data Table Toolbar" by skovhm, https://21st.dev/r/skovhm/data-table-toolbar
 *
 * Changes for the five-region layout: the queue is the List region itself (one
 * card, the region's landmark and test id); a row's title selects it (a link to its URL, so Back
 * and reload work) and its message opens in the Detail region instead of expanding in place; text
 * on the type scale; spacing on the 8 px scale; no sticky header (the region scrolls inside).
 */

import { Check, Minus, Undo2, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { focusNextDecision } from '@/lib/focusNext';
import { isTyping, shortcutsEnabled } from '@/lib/keys';
import { Button } from '@/components/ui/Button';
import { ConfirmDecisionDialog, type DecisionFact } from '@/components/ui/ConfirmDecisionDialog';
import { Kbd } from '@/components/ui/Kbd';
import { toast, undoByKey } from '@/components/ui/Toast';

export type ReviewAnswer = 'accepted' | 'refused';

export interface ReviewItem {
  /** Stable id, also the end of every test id of the row: suggestion-<id>, suggestion-accept-<id>. */
  id: string;
  /** What the row decides, in plain words: "Date confirmed by the office". */
  title: ReactNode;
  /** The title as plain text, for toasts. */
  titleText: string;
  /** One line of context: the address, then who sent the message. */
  meta?: ReactNode;
  /** The row's URL: selecting it shows its message in the Detail region. */
  href: string;
  /** What a screen reader hears on each button. */
  name: string;
  decision?: { answer: ReviewAnswer; at: string } | null;
  /** One plain line shown once the row is decided. */
  resultLine: (answer: ReviewAnswer) => string;
}

export interface ReviewQueueProps {
  items: ReviewItem[];
  title: string;
  selected: string | null;
  onDecide: (ids: string[], answer: ReviewAnswer) => void;
  onUndo: (ids: string[]) => void;
  batchFacts?: (items: ReviewItem[], answer: ReviewAnswer) => DecisionFact[];
  dateText: string;
  noun?: [string, string];
  /** The whole list's figures, when the rows shown are filtered. */
  totals?: { total: number; accepted: number; refused: number };
  doneText?: string;
  emptyText?: string;
  testId?: string;
  /** The decision key of a row ("suggestion:10"). With it, a row's own Undo takes the decision back through its toast, so the notifications list records it. */
  actionKey?: (id: string) => string;
}

const plural = (n: number, [one, many]: [string, string]): string => `${n} ${n === 1 ? one : many}`;

function CheckBox({ checked, onChange, label, testId, rowFocus }: { checked: boolean | 'mixed'; onChange: (next: boolean) => void; label: string; testId?: string; rowFocus?: boolean }) {
  const on = checked !== false;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      data-row-focus={rowFocus ? '' : undefined}
      onClick={() => onChange(checked !== true)}
      className="group/check grid size-8 shrink-0 place-items-center rounded-nav"
    >
      <span
        aria-hidden
        className={cn(
          'grid size-4 place-items-center rounded-chip border transition-colors duration-[var(--dur-color)]',
          on ? 'border-accent bg-accent text-on-accent' : 'border-border-control bg-surface group-hover/check:border-ink-2',
        )}
      >
        {checked === 'mixed' ? <Minus className="size-3" strokeWidth={2.5} /> : on ? <Check className="size-3" strokeWidth={2.5} /> : null}
      </span>
    </button>
  );
}

/** "12 of 17 wait", the accepted and refused counts, and one thin bar (flohoeller's open count). */
export function ReviewProgress({ total, accepted, refused, noun = ['decision', 'decisions'], className }: { total: number; accepted: number; refused: number; noun?: [string, string]; className?: string }) {
  const left = total - accepted - refused;
  const pct = (n: number): string => `${total ? (n / total) * 100 : 0}%`;
  return (
    <div data-testid="suggestions-summary" className={cn('flex min-w-0 flex-col gap-2', className)}>
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-small text-ink-2">
        <span data-testid="summary-waiting" aria-live="polite" className="text-body text-ink">
          {left ? (
            <>
              <span className="font-semibold tabular-nums">{left}</span> of {plural(total, noun)} wait
            </>
          ) : (
            <span className="font-semibold">Every {noun[0]} has an answer</span>
          )}
        </span>
        <span data-testid="summary-accepted"><span className="font-semibold text-ink tabular-nums">{accepted}</span> accepted</span>
        <span data-testid="summary-refused"><span className="font-semibold text-ink tabular-nums">{refused}</span> refused</span>
      </p>
      <div aria-hidden className="flex h-1 w-full gap-px overflow-hidden rounded-full bg-surface-2">
        <span className="h-full bg-accent transition-[width] duration-[var(--dur-step)]" style={{ width: pct(accepted) }} />
        <span className="h-full bg-border-strong transition-[width] duration-[var(--dur-step)]" style={{ width: pct(refused) }} />
      </div>
    </div>
  );
}

function Row({ item, current, checked, onSelect, onAnswer, onUndo }: { item: ReviewItem; current: boolean; checked: boolean; onSelect: (next: boolean) => void; onAnswer: (a: ReviewAnswer, row: HTMLElement | null) => void; onUndo: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const d = item.decision;
  const onKey = (e: KeyboardEvent<HTMLLIElement>): void => {
    if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || !shortcutsEnabled()) return;
    const k = e.key.toLowerCase();
    if (!d && k === 'a') onAnswer('accepted', ref.current);
    else if (!d && k === 'r') onAnswer('refused', ref.current);
    else if (d && k === 'u') onUndo();
    else if (!d && k === 'x') onSelect(!checked);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };
  const titleLink = (
    <a href={item.href} aria-label={item.name} aria-current={current ? 'true' : undefined} className="block min-w-0 text-body font-semibold text-ink hover:underline" data-testid={`suggestion-open-${item.id}`}>
      {item.title}
    </a>
  );
  return (
    <li
      ref={ref}
      data-testid={`suggestion-${item.id}`}
      data-review-row
      data-decided={d?.answer}
      onKeyDown={onKey}
      aria-keyshortcuts={d ? 'u' : 'a r x'}
      className={cn('border-t border-border transition-colors duration-[var(--dur-color)] first:border-t-0', current ? 'bg-accent-soft' : checked ? 'bg-surface-2' : 'hover:bg-surface-2')}
    >
      <div className="flex items-start gap-2 py-3 pr-4 pl-2">
        {d ? (
          <span className="grid size-8 shrink-0 place-items-center" aria-hidden>
            {d.answer === 'accepted' ? <Check className="size-4 text-accent" strokeWidth={2.5} /> : <X className="size-4 text-ink-2" strokeWidth={2.5} />}
          </span>
        ) : (
          <CheckBox checked={checked} onChange={onSelect} label={`Select: ${item.name}`} testId={`review-select-${item.id}`} rowFocus />
        )}
        <div className="min-w-0 flex-1 pt-1">
          {titleLink}
          {d ? (
            <p data-testid={`suggestion-state-${item.id}`} className="mt-1 text-small text-ink-2">
              <span className="font-medium text-ink">{d.answer === 'accepted' ? 'Accepted here.' : 'Refused here.'}</span> {item.resultLine(d.answer)}
            </p>
          ) : item.meta ? (
            <p className="mt-1 text-small text-ink-2">{item.meta}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {d ? (
            <Button size="md" variant="ghost" data-row-focus aria-label={`Undo: ${item.name}`} aria-keyshortcuts="u" icon={<Undo2 aria-hidden />} data-testid={`suggestion-undo-${item.id}`} onClick={onUndo}>
              Undo
            </Button>
          ) : (
            <>
              <Button size="md" variant="ghost" aria-label={`Refuse: ${item.name}`} aria-keyshortcuts="r" data-testid={`suggestion-refuse-${item.id}`} onClick={() => onAnswer('refused', ref.current)}>
                Refuse
              </Button>
              <Button size="md" variant="secondary" data-accept aria-label={`Accept: ${item.name}`} aria-keyshortcuts="a" data-testid={`suggestion-accept-${item.id}`} onClick={() => onAnswer('accepted', ref.current)}>
                Accept
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export function ReviewQueue({ items, title, selected, onDecide, onUndo, batchFacts, dateText, noun = ['proposal', 'proposals'], totals, doneText, emptyText, testId = 'review', actionKey }: ReviewQueueProps) {
  const headingId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [chosenIds, setChosenIds] = useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = useState<ReviewAnswer | null>(null);

  const waitingItems = useMemo(() => items.filter((i) => !i.decision), [items]);
  const fig = totals ?? { total: items.length, accepted: items.filter((i) => i.decision?.answer === 'accepted').length, refused: items.filter((i) => i.decision?.answer === 'refused').length };

  const waitingKey = waitingItems.map((i) => i.id).join('|');
  useEffect(() => {
    const present = new Set(waitingKey.split('|'));
    setChosenIds((prev) => {
      const next = new Set([...prev].filter((id) => present.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [waitingKey]);

  const chosen = waitingItems.filter((i) => chosenIds.has(i.id));
  const all: boolean | 'mixed' = chosen.length === 0 ? false : chosen.length === waitingItems.length ? true : 'mixed';
  const toggle = (id: string, next: boolean): void =>
    setChosenIds((prev) => {
      const out = new Set(prev);
      if (next) out.add(id);
      else out.delete(id);
      return out;
    });

  const answerOne = (item: ReviewItem, answer: ReviewAnswer, row: HTMLElement | null): void => {
    onDecide([item.id], answer);
    toast({
      title: `${answer === 'accepted' ? 'Accepted' : 'Refused'} here: ${item.titleText}`,
      body: item.resultLine(answer),
      tone: answer === 'accepted' ? 'success' : 'info',
      action: { label: 'Undo', run: () => onUndo([item.id]) },
      key: actionKey?.(item.id),
    });
    focusNextDecision(row);
  };

  /** A row's own Undo: the same path as the toast's Undo, so the notifications list says "Undone". */
  const undoRow = (item: ReviewItem): void => {
    const answered = item.decision?.answer === 'refused' ? 'Refused' : 'Accepted';
    undoByKey(actionKey?.(item.id) ?? `${testId}:${item.id}`, () => onUndo([item.id]), `${answered} here: ${item.titleText}`);
  };

  const answerBatch = (answer: ReviewAnswer): void => {
    const ids = chosen.map((i) => i.id);
    onDecide(ids, answer);
    setChosenIds(new Set());
    toast({
      title: `${answer === 'accepted' ? 'Accepted' : 'Refused'} ${plural(ids.length, noun)} here`,
      body: 'Kept in this browser. A person types each answer on the sheet.',
      tone: answer === 'accepted' ? 'success' : 'info',
      action: { label: 'Undo', run: () => onUndo(ids) },
      duration: 8000,
    });
    window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>('[data-accept]')?.focus());
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>): void => {
    if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
    if (e.key === 'Escape' && chosenIds.size) {
      e.preventDefault();
      setChosenIds(new Set());
      return;
    }
    const k = e.key.toLowerCase();
    const down = e.key === 'ArrowDown' || (k === 'j' && shortcutsEnabled());
    const up = e.key === 'ArrowUp' || (k === 'k' && shortcutsEnabled());
    if (!down && !up) return;
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-review-row]') ?? [])];
    const at = rows.findIndex((r) => r.contains(document.activeElement));
    const next = rows[Math.max(0, Math.min(rows.length - 1, at < 0 ? 0 : at + (down ? 1 : -1)))];
    const target = next?.querySelector<HTMLElement>('[data-row-focus]');
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    target.focus();
    target.scrollIntoView({ block: 'nearest' });
  };

  const batch = chosen.length > 0;
  const facts = confirm ? (batchFacts?.(chosen, confirm) ?? []) : [];

  return (
    <section className="l-card l-list" aria-label="List" aria-describedby={headingId} data-region="list" data-testid="region-list">
      <div className="border-b border-border px-4 py-3" data-testid={testId}>
        <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-2">
          {waitingItems.length ? (
            <span className="-ml-2">
              <CheckBox checked={all} onChange={(next) => setChosenIds(next ? new Set(waitingItems.map((i) => i.id)) : new Set())} label={`Select every ${noun[0]} that waits`} testId={`${testId}-select-all`} />
            </span>
          ) : null}
          <h2 id={headingId} className="min-w-0 text-section text-ink">{batch ? `${chosen.length} selected` : title}</h2>
          <span role="status" className="sr-only">{batch ? `${chosen.length} selected` : ''}</span>
          {batch ? (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setChosenIds(new Set())} data-testid={`${testId}-clear`}>Clear</Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirm('refused')} data-testid={`${testId}-batch-refuse`}>Refuse {chosen.length}</Button>
              <Button size="sm" variant="primary" onClick={() => setConfirm('accepted')} data-testid={`${testId}-batch-accept`}>Accept {chosen.length}</Button>
            </div>
          ) : null}
        </div>
        <ReviewProgress total={fig.total} accepted={fig.accepted} refused={fig.refused} noun={noun} className="mt-2" />
      </div>
      <div className="l-scroll">
        {fig.total > 0 && fig.accepted + fig.refused === fig.total && doneText ? (
          <p data-testid={`${testId}-done`} className="flex items-center gap-2 border-b border-border px-4 py-4 text-body text-ink">
            <Check aria-hidden className="size-4 text-accent" strokeWidth={2.5} />
            {doneText}
          </p>
        ) : null}
        {items.length ? (
          <ul ref={listRef} onKeyDown={onListKey} className="m-0 list-none p-0" aria-labelledby={headingId}>
            {items.map((item) => (
              <Row
                key={item.id}
                item={item}
                current={item.id === selected}
                checked={chosenIds.has(item.id)}
                onSelect={(next) => toggle(item.id, next)}
                onAnswer={(answer, row) => answerOne(item, answer, row)}
                onUndo={() => undoRow(item)}
              />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-body text-ink-2">{emptyText ?? 'Nothing here.'}</p>
        )}
      </div>
      <div className="l-cardfoot text-small text-ink-2 max-sm:hidden">
        <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1"><Kbd className="leading-[18px]!">J</Kbd><Kbd className="leading-[18px]!">K</Kbd> Move</span>
          <span className="inline-flex items-center gap-1"><Kbd className="leading-[18px]!">A</Kbd> Accept</span>
          <span className="inline-flex items-center gap-1"><Kbd className="leading-[18px]!">R</Kbd> Refuse</span>
          <span className="inline-flex items-center gap-1"><Kbd className="leading-[18px]!">U</Kbd> Undo a decided row</span>
          <span className="inline-flex items-center gap-1"><Kbd className="leading-[18px]!">X</Kbd> Select</span>
        </span>
        <span>Nothing files itself.</span>
      </div>
      <ConfirmDecisionDialog
        open={confirm !== null}
        onOpenChange={(o) => {
          if (!o) setConfirm(null);
        }}
        title={confirm ? `${confirm === 'accepted' ? 'Accept' : 'Refuse'} ${plural(chosen.length, noun)}` : ''}
        description="Kept in this browser. Undo stays on every row."
        facts={facts}
        dateText={dateText}
        confirmLabel={confirm ? `${confirm === 'accepted' ? 'Accept' : 'Refuse'} ${chosen.length}` : ''}
        tone="primary"
        onConfirm={() => {
          if (confirm) answerBatch(confirm);
        }}
        testIdBase={`${testId}-batch`}
      />
    </section>
  );
}
