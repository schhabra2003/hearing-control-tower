/**
 * An office's process change in the Offices Detail region, for a change the
 * sheet holds (Tesswick) or one a pasted message announced (Caldmere):
 * - head: the change's name, the pager, one state Badge, and three facts (Who decides, Due, Affects);
 * - body: old beside new (the shared Compare for a sheet change, so the testid tesswick-compare and
 *   the words match Today's decision), what the office said, the hearings that wait, and the cells
 *   behind "Sheet reference";
 * - foot: Keep on hold, Keep old process and Approve new process. Approve and Keep on hold record a
 *   name in the shared ConfirmDecisionDialog (21st.dev "Alert Dialog" by shadcn); Keep old process asks
 *   an inline confirm in the footer, as on Today. After a decision: one status line and a named Undo.
 *
 * It replaces ProcessChangeCard (a boxed card with its own header, icon tile and button column).
 */

import { useEffect, useRef, useState } from 'react';
import { approvalCopy, processCompare, plainRoute } from '@/lib/copy';
import { dateShort, sheetTime } from '@/lib/format';
import type { OfficeChange } from '@/lib/officeChanges';
import { setQuery } from '@/lib/router';
import { actions, clockLabel, useSession, type ChangeDecision } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { ConfirmDecisionDialog } from '@/components/ui/ConfirmDecisionDialog';
import { CopyValue } from '@/components/ui/CopyValue';
import { toast } from '@/components/ui/Toast';
import { Compare } from '@/layout/Detail';
import { OWNER, comingAt, street } from '@/layout/model';
import { Block, SheetRef, State, type Tone } from '@/layout/Regions';
import { Facts, PagerLinks, type Pager } from './RecordTable';

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "06/07/2030" from "2030-06-07": the date as a person types it in Offices AR. */
function typedDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

/** "Fri, Jun 7, 9:06 a.m." from "Friday, June 7, 2030, 9:06 a.m.". */
function shortAt(at: string): string {
  const m = /^(\w{3})\w*, (\w{3})\w* (\d+), \d{4}, (.+)$/.exec(at);
  return m ? `${m[1]}, ${m[2]} ${m[3]}, ${m[4]}` : at;
}

/** Adds a full stop unless the text already ends with one ("9:00 a.m."). */
const endStop = (t: string): string => (t.endsWith('.') ? t : `${t}.`);

/** One state for the change, the same words in the list row, the Detail head and the API. */
export function changeState(c: OfficeChange, d: ChangeDecision | undefined): { word: string; tone: Tone } {
  if (d?.decision === 'held') return { word: 'On hold, notices still wait', tone: 'warn' };
  if (d) return { word: approvalCopy(c.office, d).badge.text, tone: 'warn' };
  return { word: 'Waiting for your decision', tone: 'danger' };
}

/** The short word for the list row: "Decide today", "On hold", "Waiting to be recorded". */
export function changeRowWord(d: ChangeDecision | undefined): { word: string; tone: Tone } {
  if (!d) return { word: 'Decide today', tone: 'danger' };
  if (d.decision === 'held') return { word: 'On hold', tone: 'warn' };
  return { word: d.decision === 'approved' ? 'Approved, to record' : 'Kept, to record', tone: 'warn' };
}

/** "Said by phone on Jun 4. Written confirmation asked for, not received." */
function saidLine(c: OfficeChange): string {
  const on = dateShort(c.saidOn) || c.saidOn;
  return `Said by ${c.channel}${on ? ` on ${on}` : ''}.${c.writing ? ` ${c.writing}` : ''}`;
}

/** "Told by phone only (clerk Ren, Tue, Jun 4). Not confirmed in writing.": the risk, from the change cell. */
function riskLine(c: OfficeChange): string {
  const typed = String(c.office.cells[c.cells.change.replace(/^Offices ([A-Z]+)\d+$/, '$1')] ?? '');
  const who = /\b(clerk [A-Z][a-z]+)/.exec(typed)?.[1];
  const on = dateShort(c.saidOn) || c.saidOn;
  const parts = [who, on].filter(Boolean).join(', ');
  const how = c.channel === 'phone' ? 'Told by phone only' : `Said by ${c.channel}`;
  return `${how}${parts ? ` (${parts})` : ''}.${c.writing || c.channel === 'phone' ? ' Not confirmed in writing.' : ''}`;
}

/** What follows an approval, for the hearings that wait on it. */
function nextLine(c: OfficeChange): string {
  const names = [...new Set(comingAt(c.office).map((h) => String(h.consultant ?? '')).filter(Boolean))];
  return `Next, the coordinator follows the new process (${c.newRoute.replace(/\.$/, '').toLowerCase()})${names.length ? ` for ${names.join(' and ')}` : ''}.`;
}

export function ChangeHead({ change: c, pager }: { change: OfficeChange; pager?: Pager }) {
  const d = useSession((s) => s.changes[c.slug]);
  const st = changeState(c, d);
  const n = comingAt(c.office).length;
  return (
    <>
      <div className="l-detailhead-row">
        <h2 className="l-section l-clip" data-testid="detail-title">
          {c.county}’s new process
        </h2>
        {pager ? <PagerLinks p={pager} /> : null}
      </div>
      <State tone={st.tone} testId={`change-status-${c.slug}`}>
        {st.word}
      </State>
      <Facts
        items={[
          { term: 'Who decides', value: OWNER },
          { term: 'Due', value: d ? (d.decision === 'held' ? 'On hold' : 'Decided') : 'Today' },
          { term: 'Affects', value: n === 1 ? '1 coming hearing' : `${n} coming hearings` },
        ]}
      />
    </>
  );
}

/** Old beside new for a change that came from a pasted message (the sheet's cells do not hold it yet). */
function PastedCompare({ c }: { c: OfficeChange }) {
  return (
    <div className="l-compare" data-testid={`change-compare-${c.slug}`}>
      <div>
        <span className="l-small l-muted">How we name our consultant now</span>
        <span>{plainRoute(String(c.office.cells.F ?? ''))}</span>
      </div>
      <div data-new="">
        <span className="l-small l-muted">What {c.county} now asks</span>
        <span data-testid={`new-route-${c.slug}`}>{cap(c.newRoute)}</span>
      </div>
    </div>
  );
}

export function ChangeBody({ change: c }: { change: OfficeChange }) {
  const d = useSession((s) => s.changes[c.slug]);
  const clock = useSession((s) => s.clock);
  const waiting = comingAt(c.office);
  const cmp = c.source === 'sheet' ? processCompare(c.office) : null;
  return (
    <>
      <Block title="The change" meta={cmp?.oldAccepted ? 'Old process no longer accepted' : undefined} testId="change-block">
        <div style={{ display: 'grid', gap: 12 }}>
          {c.source === 'sheet' ? <Compare o={c.office} /> : <PastedCompare c={c} />}
          <p className="l-small l-ink2 l-p" data-testid={`change-said-${c.slug}`}>
            {saidLine(c)}
          </p>
        </div>
      </Block>
      <div className="@3xl:grid @3xl:grid-cols-2 @3xl:[&>.l-block]:border-t-0! @3xl:[&>.l-block+.l-block]:shadow-[inset_1px_0_0_var(--border)]!" style={{ borderTop: '1px solid var(--border)' }}>
      {c.message ? (
        <Block title="What the office said" meta={`Message ${c.message.id.replace(/^H0*/, '')}`} testId="change-message">
          <figure style={{ margin: 0, display: 'grid', gap: 4 }}>
            <figcaption className="l-small l-muted">
              <span className="l-strong l-ink2">{c.message.sender}</span>, by {c.message.channel}
              {c.message.at ? `, ${dateShort(c.message.at)}` : ''}
            </figcaption>
            <blockquote className="l-body l-p" style={{ margin: 0, paddingLeft: 12, boxShadow: 'inset 2px 0 0 var(--border-strong)', color: 'var(--ink)' }}>
              {c.message.body}
            </blockquote>
          </figure>
        </Block>
      ) : null}
      <Block title="Hearings that wait on it" meta={`${waiting.length}`} testId="change-affects">
        {waiting.length ? (
          <ul className="l-checks">
            {waiting.map((h) => (
              <li key={h.case} className="l-check">
                <span className="l-check-name">
                  <span className="l-clip">
                    <a className="l-link" href={`#/hearings/${h.case}`}>
                      {street(h)}
                    </a>{' '}
                    <span className="l-num l-muted">{h.case}</span>
                  </span>
                  <span className="l-small l-muted">Consultant: {h.consultant ? String(h.consultant) : 'No consultant named'}</span>
                </span>
                <span className="l-small l-ink2 l-num">
                  {dateShort(h.date)}, {sheetTime(h.time)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="l-small l-muted l-p">No coming hearing at this office.</p>
        )}
      </Block>
      </div>
      {d?.decision === 'approved' ? (
        <div style={{ borderTop: '1px solid var(--border)' }}>
        <Block title="What the coordinator types on the sheet" testId={`approved-state-${c.slug}`}>
          <div style={{ display: 'grid', gap: 8 }}>
            <CopyValue label="Approved by" value={d.name ?? ''} testId={`type-name-${c.slug}`} />
            <CopyValue label="Approved on" value={typedDate(clock.day)} testId={`type-date-${c.slug}`} />
          </div>
        </Block>
        </div>
      ) : null}
      <div className="l-block" style={{ borderTop: '1px solid var(--border)' }}>
        <SheetRef>
          <span>
            The change: <span className="l-mono">{c.cells.change}</span>
            {c.source === 'pasted' ? ' (not typed yet; it came from a pasted message)' : ''}
          </span>
          <span>
            Said on <span className="l-mono">{c.cells.saidOn}</span>. Old route still accepted: <span className="l-mono">{c.cells.still}</span>
            {c.oldRouteAccepted ? ` (${c.oldRouteAccepted})` : ''}.
          </span>
          <span>
            To approve, a name in <span className="l-mono">{c.cells.name}</span> and the date in <span className="l-mono">{c.cells.date}</span>. To keep the old process, clear{' '}
            <span className="l-mono">{c.cells.change}</span>.
          </span>
        </SheetRef>
      </div>
    </>
  );
}

/** The decision in the Detail footer: Keep on hold, Keep old process, Approve new process; then the result and Undo. */
export function ChangeFoot({ change: c, approveOpen }: { change: OfficeChange; approveOpen?: boolean }) {
  const { county, slug } = c;
  const d = useSession((s) => s.changes[slug]);
  const clock = useSession((s) => s.clock);
  const [dialog, setDialog] = useState<'approve' | 'hold' | null>(null);
  const [keep, setKeep] = useState(false);
  const approveRef = useRef<HTMLButtonElement>(null);
  const holdRef = useRef<HTMLButtonElement>(null);
  const keepConfirm = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const consumed = useRef(false);
  const cmp = c.source === 'sheet' ? processCompare(c.office) : null;
  const affects = cmp?.affects ?? '';
  const said = saidLine(c);

  // ?approve=1 opens the dialog once, with focus in the name field, and drops itself on close (E28).
  useEffect(() => {
    if (approveOpen && !d && !consumed.current) {
      consumed.current = true;
      setDialog('approve');
    }
  }, [approveOpen, d]);
  useEffect(() => {
    if (keep) keepConfirm.current?.focus();
  }, [keep]);

  const openChange = (which: 'approve' | 'hold') => (open: boolean) => {
    setDialog(open ? which : null);
    if (!open && approveOpen) setQuery('approve', null);
  };
  const closeFocus = (): boolean => {
    const el = undoRef.current ?? (dialog === 'hold' ? holdRef.current : approveRef.current);
    if (!el) return false;
    window.requestAnimationFrame(() => (undoRef.current ?? el).focus());
    return true;
  };
  const undo = (): void => actions.undoChange(slug);

  let body;
  if (d && d.decision !== 'held') {
    body = (
      <>
        <span role="status" className="l-small" data-testid="change-state">
          <span className="l-strong">{d.decision === 'approved' ? `Approved by ${d.name ?? 'a person'}, ${endStop(shortAt(d.at))}` : `Old process kept, ${endStop(shortAt(d.at))}`}</span>{' '}
          <span className="l-ink2">Waiting for the coordinator to record it.</span>
        </span>
        <Button ref={undoRef} size="md" variant="secondary" onClick={undo} aria-label={`Undo the ${d.decision === 'approved' ? 'approval' : 'rejection'} of ${county}’s change`} data-testid={`undo-change-${slug}`}>
          Undo
        </Button>
      </>
    );
  } else if (keep) {
    body = (
      <>
        <span role="status" className="l-small l-ink2" data-testid="change-state">
          Keep the old process for {county}?
        </span>
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <Button variant="ghost" size="md" onClick={() => setKeep(false)} data-testid="keep-cancel">
            Cancel
          </Button>
          <Button
            ref={keepConfirm}
            variant="primary"
            size="md"
            onClick={() => {
              actions.rejectChange(slug);
              setKeep(false);
              toast({ title: `Old process kept for ${county}`, action: { label: 'Undo', run: undo } });
            }}
            data-testid="keep-confirm"
          >
            Keep old process
          </Button>
        </span>
      </>
    );
  } else {
    body = (
      <>
        <span role="status" className="l-small l-muted" data-testid="change-state">
          {d?.decision === 'held' ? (
            <>
              <span className="l-strong l-ink2">On hold by {d.name ?? 'a person'}:</span> {d.reason}
            </>
          ) : (
            <>
              A person decides.<span className="l-wide"> No notice goes until then.</span>
            </>
          )}
        </span>
        <span style={{ display: 'inline-flex', gap: 8 }}>
          {d?.decision === 'held' ? (
            <Button ref={undoRef} variant="ghost" size="md" onClick={undo} aria-label={`Undo the hold on ${county}’s change`} data-testid={`undo-change-${slug}`}>
              Undo
            </Button>
          ) : (
            <Button ref={holdRef} variant="ghost" size="md" onClick={() => setDialog('hold')} aria-label={`Keep on hold, ${county}’s change`} data-testid={`hold-${slug}`}>
              Keep on hold
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={() => setKeep(true)} aria-label={`Keep old process, ${county}`} data-testid={`reject-${slug}`}>
            Keep old process
          </Button>
          <Button ref={approveRef} variant="primary" size="md" onClick={() => setDialog('approve')} aria-label={`Approve new process, ${county}`} data-testid={`approve-${slug}`}>
            Approve new process
          </Button>
        </span>
      </>
    );
  }

  return (
    <>
      {body}
      <ConfirmDecisionDialog
        open={dialog === 'approve'}
        onOpenChange={openChange('approve')}
        onCloseFocus={closeFocus}
        title={`Approve ${county}’s new process`}
        description={
          <>
            New process: {cap(c.newRoute).replace(/\.?$/, '.')} {affects}
            <strong className="l-strong" style={{ display: 'block', marginTop: 8 }} data-testid="approve-risk">
              {riskLine(c)}
            </strong>
            <span style={{ display: 'block', marginTop: 8 }} data-testid="approve-next">
              {nextLine(c)}
            </span>
          </>
        }
        nameLabel="Your name"
        dateText={clockLabel(clock)}
        dateLabel="Simulated clock"
        confirmLabel="Approve new process"
        onConfirm={(name) => {
          actions.approveChange(slug, name);
          toast({ title: `Approved: ${county}’s new process`, tone: 'success', action: { label: 'Undo', run: undo } });
        }}
        testIdBase="approve"
      />
      <ConfirmDecisionDialog
        open={dialog === 'hold'}
        onOpenChange={openChange('hold')}
        onCloseFocus={closeFocus}
        title={`Keep ${county}’s change on hold`}
        description={
          <>
            {said} No notice goes to {county} while it is on hold.
          </>
        }
        nameLabel="Your name"
        reasonLabel="Reason"
        reasonDefault="Waiting for written confirmation"
        dateText={clockLabel(clock)}
        dateLabel="Simulated clock"
        confirmLabel="Keep on hold"
        tone="primary"
        onConfirm={(name, reason) => {
          actions.holdChange(slug, reason, name);
          toast({ title: `On hold: ${county}’s change`, action: { label: 'Undo', run: undo } });
        }}
        testIdBase="hold"
      />
    </>
  );
}
