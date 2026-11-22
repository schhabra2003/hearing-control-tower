/**
 * The Detail region's contents, the same on Today, Hearings and the 9:00 a.m. pass:
 * - a hearing: facts, "What to do today" (owner, deadline and a Mark done box per step), the five
 *   checks in words, and the sheet's own words behind "Sheet reference";
 * - an office's process change: the old and the new process side by side, what it affects, the
 *   hearings that wait, and the decision in the footer (Approve with a name, or Keep old process),
 *   then the result with Undo.
 * Owner's "Decisions only you make" card and the ops panel's per-step Mark done box are grafted
 * here. The status dot follows "Deployment Pipeline" by rmahammad,
 * https://21st.dev/r/rmahammad/deployment-pipeline (a word beside every state).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Hearing } from '@/types/data';
import { Button } from '@/components/ui/Button';
import { dateShort, sheetTime, workingDaysWords } from '@/lib/format';
import { APPROVAL_DIALOG, approvalCopy, askFirst, processCompare } from '@/lib/copy';
import type { Office } from '@/lib/data';
import { actions, replyKey, useSession } from '@/lib/store';
import { setQuery } from '@/lib/router';
import { OWNER, checkRows, checkSummary, comingAt, statusOf, stepsFor, street } from './model';
import { Block, SheetRef, State, type Tone } from './Regions';
import { CheckProgress } from '@/components/ui/Progress';
import { StepText } from '@/components/hearing/StepText';
import { checkNote } from '@/components/hearing/checks';
import { engine } from '@/lib/data';
import type { GateView } from '@/lib/gates';
import { ConsultantName, NO_CONSULTANT } from '@/components/hearing/ConsultantLink';

const VIEW_WORD: Record<GateView, string> = { proved: 'Proved', accepted: 'Accepted here', missing: 'Missing', 'missing-near': 'Missing, hearing near', 'not-needed': 'Not needed' };
const VIEW_TONE: Record<GateView, Tone> = { proved: 'ok', accepted: 'accent', missing: 'neutral', 'missing-near': 'danger', 'not-needed': 'neutral' };

/* ---------- head ---------- */

export interface Pager {
  index: number;
  total: number;
  prev: string | null;
  next: string | null;
}

const NO_STEPS: string[] = [];

/** "Mark done: <first clause>", at most 80 characters. */
function markDoneName(text: string): string {
  const first = (text.split(/(?<=[a-z0-9)”])[.;:,]\s/)[0] ?? text).trim();
  const name = `Mark done: ${first}`;
  return name.length > 80 ? `${name.slice(0, 79).trimEnd()}…` : name;
}

function PagerLinks({ p }: { p: Pager }) {
  return (
    <span className="l-pager" data-testid="detail-pager">
      <span>{p.index} of {p.total}</span>
      {p.prev ? (
        <a href={p.prev} aria-label="Previous item" data-testid="detail-prev">
          <ChevronLeft aria-hidden size={16} />
        </a>
      ) : (
        <span aria-disabled="true" data-testid="detail-prev">
          <ChevronLeft aria-hidden size={16} />
        </span>
      )}
      {p.next ? (
        <a href={p.next} aria-label="Next item" data-testid="detail-next">
          <ChevronRight aria-hidden size={16} />
        </a>
      ) : (
        <span aria-disabled="true" data-testid="detail-next">
          <ChevronRight aria-hidden size={16} />
        </span>
      )}
    </span>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Why a hearing is not ready, in one line: its first missing check, said about the people in it (UX-6). */
function notReadyLine(h: Hearing, proposals: Parameters<typeof checkRows>[1]['proposals']): string | null {
  if (!/^OPEN/.test(h.status)) return null;
  const miss = checkRows(h, { proposals }).find((r) => !['proved', 'accepted', 'not-needed'].includes(r.state));
  const c = h.consultant ? String(h.consultant) : null;
  switch (miss?.id) {
    case 'G1': return `The ${h.county} office has not confirmed the date in writing.`;
    case 'G2': return c ? `${c} has not said yes to this hearing.` : 'No consultant has said yes to this hearing.';
    case 'G3': return c ? `${h.county} has not confirmed ${c} is on its list.` : `${h.county} has no consultant of ours on its list.`;
    case 'G4': return 'The current files are not confirmed received by the clerk and the consultant.';
    case 'G5': return 'What we owe the office is not confirmed received.';
    default: return null;
  }
}

/** How the hearing is held, with the video link's state in words (N4, N13). */
function formatWords(h: Hearing): string {
  const f = String(h.format ?? '').trim();
  const all = h.printed ?? '';
  if (/VIDEO ROOM ONLY, NO LINK/.test(all)) return 'Video room only, no link yet';
  if (/NO VIDEO LINK YET/.test(all)) return 'Video, no link yet';
  return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'Not on record';
}

export function HearingHead({ h, pager }: { h: Hearing; pager?: Pager }) {
  const changes = useSession((s) => s.changes);
  const st = statusOf(h, changes);
  const proposals = useSession((s) => s.proposals);
  const why = notReadyLine(h, proposals);
  const past = h.workingDays !== null && h.workingDays < 0;
  const notice = /NO HOMEOWNER NOTICE ON RECORD/.test(h.printed ?? '') ? 'None on record' : null;
  return (
    <>
      <div className="l-detailhead-row">
        <h2 className="l-section l-clip" data-testid="detail-title">
          <span className="l-num l-muted" style={{ marginRight: 4 }}>{h.case}</span>{' '}
          {street(h)}
        </h2>
        {pager ? <PagerLinks p={pager} /> : null}
      </div>
      <State tone={st.tone}>{st.label}</State>
      {why ? <p className="l-small l-ink2 l-p" data-testid="not-ready-why">{why}</p> : null}
      <dl className="l-facts">
        <Fact term="Hearing">
          <span className="l-num">{dateShort(h.date)}, {sheetTime(h.time)}</span>
          <span className={past ? 'l-small l-danger' : 'l-small l-muted'} style={{ display: 'block' }}>{workingDaysWords(h.workingDays)}</span>
        </Fact>
        <Fact term="Office">{h.county}</Fact>
        <Fact term="Consultant"><ConsultantName name={h.consultant} caseId={h.case} /></Fact>
        <Fact term="How">{formatWords(h)}</Fact>
        {notice ? <Fact term="Homeowner notice">{notice}</Fact> : null}
      </dl>
    </>
  );
}

/* ---------- a hearing ---------- */

export function TodaySteps({ h }: { h: Hearing }) {
  const changes = useSession((s) => s.changes);
  const done = useSession((s) => s.todayDone ?? NO_STEPS);
  const { actions: list, more } = stepsFor(h, changes);
  /* A consultant who said no on the phone page puts "Find a replacement" first (UX-17). */
  const answer = useSession((s) => s.consultantReplies?.[replyKey(h.case, 'attend')]);
  const dropped = answer && (answer.kind === 'cannot' || answer.kind === 'no') ? answer : null;
  const replaceKey = `${h.case}:replace`;
  const replaceDone = done.includes(replaceKey);
  const next = dropped ? askFirst(h)?.name : null;
  const replaceText = dropped
    ? `Find a replacement: ${dropped.consultant} can no longer attend${dropped.detail ? ` (${dropped.detail})` : ''}. Offer it to ${next && next !== dropped.consultant ? next : 'the next free consultant on Ask next'}, re-send the files and tell the office.`
    : '';
  const left = list.filter((a) => !done.includes(`${h.case}:${a.id}`)).length + (dropped && !replaceDone ? 1 : 0);
  return (
    <Block title="What to do today" meta={left ? `${left} to do today${more ? `, ${more} more later` : ''}` : 'All done'} testId="drawer-today">
      <ol className="l-steps">
        {dropped ? (
          <li className="l-step" data-done={replaceDone ? '' : undefined} data-testid={`today-action-${h.case}-replace`}>
            <span className="l-step-text"><StepText text={replaceText} /></span>
            <label className="l-step-done">
              <input type="checkbox" aria-label={`Mark done: find a replacement for ${h.case}`} checked={replaceDone} onChange={(e) => actions.markTodayStep(h.case, 'replace', e.target.checked)} data-testid={`step-done-${h.case}-replace`} />
              <span aria-hidden>Done</span>
            </label>
            <span className="l-step-meta">
              <span>Owner <b>Coordinator on duty</b></span>
              <span>Due <b className="l-warn">Now</b></span>
              <a className="l-link" href="#/replies">Open the reply</a>
            </span>
          </li>
        ) : null}
        {list.map((a) => {
          const key = `${h.case}:${a.id}`;
          const isDone = done.includes(key);
          return (
            <li key={a.id} className="l-step" data-done={isDone ? '' : undefined} data-testid={`today-action-${h.case}-${a.id}`}>
              <span className="l-step-text"><StepText text={a.text} /></span>
              <label className="l-step-done">
                <input type="checkbox" aria-label={markDoneName(a.text)} checked={isDone} onChange={(e) => actions.markTodayStep(h.case, a.id, e.target.checked)} data-testid={`step-done-${h.case}-${a.id}`} />
                <span aria-hidden>Done</span>
              </label>
              <span className="l-step-meta">
                <span>Owner <b>{a.owner.name}</b></span>
                <span>Due <b className={a.due.kind === 'now' || /today/i.test(a.due.text) ? 'l-warn' : undefined}>{a.due.text}</b>{a.due.zone ? `, ${a.due.zone}` : ''}</span>
                {a.href ? <a className="l-link" href={a.href}>{a.href.includes('/offices/') ? 'Open the decision' : 'Open'}</a> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </Block>
  );
}

export function Checks({ h }: { h: Hearing }) {
  const proposals = useSession((s) => s.proposals);
  const rows = checkRows(h, { proposals });
  const sum = checkSummary(rows);
  return (
    <Block
      title="Checks"
      meta={
        <span data-testid="hearing-checks-summary" aria-label={`${sum.done} of ${sum.total} checks done${sum.next ? `. Next: ${sum.next.toLowerCase()}` : ''}`}>
          <CheckProgress done={sum.done} total={sum.total} testId="checks-count" />
          {sum.next ? <span className="l-small l-ink2"> Next: {sum.next.toLowerCase()}</span> : null}
        </span>
      }
      testId="gates"
    >
      <ul className="l-checks">
        {rows.map((r) => (
          <li key={r.id} className="l-check" data-testid={`gate-${r.id}`}>
            <span className="l-check-name">
              <span className="l-clip">{r.name}</span>
              {r.parts ? <span className="l-small l-muted">{r.parts.map((p) => `Files with the ${p.name.toLowerCase()}: ${VIEW_WORD[p.state].toLowerCase()}`).join('. ')}.</span> : null}
              {!['proved', 'accepted', 'not-needed'].includes(r.state) && checkNote(h, r.id, engine.messages) ? (
                <span className="l-small l-ink2" data-testid={`check-note-${h.case}-${r.id}`}>{checkNote(h, r.id, engine.messages)}</span>
              ) : null}
            </span>
            <span className="l-check-right" data-testid={`proof-link-${h.case}-${r.id}`}>
              {r.messages.length ? <span className="l-small l-muted">Message {r.messages.join(' and ')}</span> : null}
              <State tone={VIEW_TONE[r.state]}>{VIEW_WORD[r.state]}</State>
            </span>
          </li>
        ))}
      </ul>
    </Block>
  );
}

export function SheetLines({ h }: { h: Hearing }) {
  return (
    <div className="l-block">
      <SheetRef testId={`more-lines-${h.case}`}>
        {h.printedLines.map((l) => (
          <span key={l.n}>
            <span className="l-mono l-muted">Hearings {l.column}{h.row}</span> {l.text}
          </span>
        ))}
      </SheetRef>
    </div>
  );
}

/* ---------- an office's process change ---------- */

export function Compare({ o }: { o: Office }) {
  const cmp = processCompare(o);
  return (
    <div className="l-compare" data-testid="tesswick-compare">
      <div>
        <span className="l-small l-muted">{cmp.oldHeading}</span>
        <span>{cmp.old}</span>
      </div>
      <div data-new="">
        <span className="l-small l-muted">{cmp.newHeading}</span>
        <span>{cmp.next}</span>
      </div>
    </div>
  );
}

export function DecisionHead({ o, pager }: { o: Office; pager?: Pager }) {
  const d = useSession((s) => s.changes[o.slug]);
  const ap = approvalCopy(o, d);
  return (
    <>
      <div className="l-detailhead-row">
        <h2 className="l-section l-clip" data-testid="detail-title">{o.county}’s new process</h2>
        {pager ? <PagerLinks p={pager} /> : null}
      </div>
      <State tone={ap.badge.tone}>{ap.badge.text}</State>
      <dl className="l-facts">
        <Fact term="Who decides">{OWNER}</Fact>
        <Fact term="Due">{d ? 'Decided' : 'Today'}</Fact>
        <Fact term="Affects">{comingAt(o).length} coming hearings</Fact>
      </dl>
    </>
  );
}

export function DecisionBody({ o }: { o: Office }) {
  const d = useSession((s) => s.changes[o.slug]);
  const ap = approvalCopy(o, d);
  const cmp = processCompare(o);
  const waiting = comingAt(o);
  return (
    <>
      <Block title="The change" meta={cmp.oldAccepted ? 'Old process no longer accepted' : undefined} testId="change-block">
        <div style={{ display: 'grid', gap: 12 }}>
          <Compare o={o} />
          <p className="l-small l-muted l-p">{cmp.source}</p>
        </div>
      </Block>
      <Block title="Hearings that wait on it" meta={`${waiting.length}`} testId="change-affects">
        <ul className="l-checks">
          {waiting.map((h) => (
            <li key={h.case} className="l-check">
              <span className="l-check-name">
                <span className="l-clip">
                  <a className="l-link l-num" href={`#/?case=${h.case}`} style={{ marginRight: 4 }}>{h.case}</a>{' '}
                  {street(h)}
                </span>
                <span className="l-small l-muted">Consultant: {h.consultant ? String(h.consultant) : NO_CONSULTANT}</span>
              </span>
              <span className="l-small l-muted l-num">{dateShort(h.date)}, {sheetTime(h.time)}</span>
            </li>
          ))}
        </ul>
        <p className="l-small l-muted l-p" style={{ marginTop: 8 }}>{ap.body}</p>
      </Block>
      <div className="l-block">
        <SheetRef>
          {(['F', 'K', 'M', 'AS', 'AV'] as const).map((col) => (
            <span key={col}>
              <span className="l-mono l-muted">Offices {col}{o.row}</span> {String(o.cells[col] ?? '')}
            </span>
          ))}
        </SheetRef>
      </div>
    </>
  );
}

function ApproveDialog({ o, onClose }: { o: Office; onClose: () => void }) {
  const cmp = processCompare(o);
  const [name, setName] = useState('');
  const [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const confirm = () => {
    if (!name.trim()) {
      setError(true);
      input.current?.focus();
      return;
    }
    actions.approveChange(o.slug, name);
    onClose();
  };
  return (
    <>
      <div className="l-scrim" onClick={onClose} />
      <div className="l-dialog" role="dialog" aria-modal="true" aria-labelledby="approve-title" data-testid="approve-dialog">
        <div className="l-cardhead">
          <h2 id="approve-title">{APPROVAL_DIALOG.approveTitle(o.county)}</h2>
        </div>
        <div className="l-cardbody" style={{ display: 'grid', gap: 16 }}>
          <Compare o={o} />
          {/not yet confirmed in writing/i.test(cmp.source) ? <p className="l-body l-strong l-p" data-testid="approve-risk">{cmp.source}</p> : null}
          <p className="l-small l-ink2 l-p">{cmp.affects} {APPROVAL_DIALOG.approveNext(o.county)}</p>
          <p className="l-small l-ink2 l-p" data-testid="approve-saved-note">{APPROVAL_DIALOG.approveConsequence}</p>
          <label className="l-field">
            <span className="l-small l-ink2">{APPROVAL_DIALOG.nameLabel}</span>
            <input ref={input} value={name} onChange={(e) => { setName(e.target.value); setError(false); }} data-testid="approve-name" aria-invalid={error || undefined} aria-describedby={error ? 'approve-error' : undefined} onKeyDown={(e) => { if (e.key === 'Enter') confirm(); }} />
            {error ? <span id="approve-error" className="l-small l-danger">{APPROVAL_DIALOG.nameError}</span> : null}
          </label>
        </div>
        <div className="l-cardfoot" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="md" onClick={onClose} data-testid="approve-cancel">{APPROVAL_DIALOG.cancel}</Button>
          <Button variant="primary" size="md" onClick={confirm} data-testid="approve-confirm">{APPROVAL_DIALOG.approveButton}</Button>
        </div>
      </div>
    </>
  );
}

/** The decision, in the Detail footer like every other decision: two choices, then the result and a named Undo. */
export function DecisionFoot({ o, approveOpen }: { o: Office; approveOpen?: boolean }) {
  const d = useSession((s) => s.changes[o.slug]);
  const ap = approvalCopy(o, d);
  const [dialog, setDialog] = useState(false);
  const [keep, setKeep] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const keepConfirm = useRef<HTMLButtonElement>(null);
  const consumed = useRef(false);
  useEffect(() => {
    if (approveOpen && !d && !consumed.current) {
      consumed.current = true;
      setDialog(true);
    }
  }, [approveOpen, d]);
  useEffect(() => {
    if (keep) keepConfirm.current?.focus();
  }, [keep]);
  const close = () => {
    setDialog(false);
    if (approveOpen) setQuery('approve', null);
    window.requestAnimationFrame(() => opener.current?.focus());
  };
  return (
    <>
      {d ? (
        <>
          <span role="status" className="l-small" data-testid="change-state">
            <span className="l-strong">{d.decision === 'approved' ? `Approved by ${d.name ?? 'a person'}, ${d.at.replace(/\.$/, '')}.` : `Old process kept, ${d.at.replace(/\.$/, '')}.`}</span>{' '}
            <span className="l-ink2">{ap.badge.text}.</span>
          </span>
          <Button size="md" variant="secondary" onClick={() => actions.undoChange(o.slug)} aria-label={APPROVAL_DIALOG.undo(o.county, d.decision === 'approved' ? 'approval' : 'rejection')} data-testid="change-undo">Undo</Button>
        </>
      ) : keep ? (
        <>
          <span role="status" className="l-small l-ink2" data-testid="change-state">Keep the old process for {o.county}?</span>
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <Button variant="ghost" size="md" onClick={() => setKeep(false)} data-testid="keep-cancel">Cancel</Button>
            <Button ref={keepConfirm} variant="primary" size="md" onClick={() => { actions.rejectChange(o.slug); setKeep(false); }} data-testid="keep-confirm">Keep old process</Button>
          </span>
        </>
      ) : (
        <>
          <span role="status" className="l-small l-muted" data-testid="change-state"><span className="l-wide">A person decides.</span></span>
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <Button variant="secondary" size="md" onClick={() => setKeep(true)} data-testid={`reject-${o.slug}`} aria-label={`Keep old process, ${o.county}`}>Keep old process</Button>
            <Button ref={opener} variant="primary" size="md" onClick={() => setDialog(true)} data-testid={`approve-${o.slug}`} aria-label={`${APPROVAL_DIALOG.approveButton}, ${o.county}`}>{APPROVAL_DIALOG.approveButton}</Button>
          </span>
        </>
      )}
      {dialog ? <ApproveDialog o={o} onClose={close} /> : null}
    </>
  );
}
