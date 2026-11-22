/**
 * Small pieces every control tower page uses: state chips with a word and a shape, the five gate
 * marks, links to a hearing or a message, the page frame and the tower's own simulated clock.
 */

import type { ReactNode } from 'react';
import { AlertTriangle, Check, Clock3, Minus, MoreHorizontal, RotateCcw, Undo2 } from 'lucide-react';
import { GATES as SHARED_GATES } from '@/lib/gates';
import { CheckProgress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { NotBuiltTag } from '@/components/ui/NotBuiltTag';
import { Tooltip } from '@/components/ui/Tooltip';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { GATE_STATUS, LEVELS, READINESS, addrOf, useTower, when, type EvidenceRef, type GateId, type Level, type Readiness, type Tone, type TowerGate } from '../later/tower';

/** Chips are text first: ink on the surface with a hairline; only the small glyph carries the tone. */
export const TONE: Record<Tone, string> = {
  ok: 'bg-surface text-ink border-border [&>svg]:text-dot-ok',
  warn: 'bg-surface text-ink border-border [&>svg]:text-dot-warn',
  danger: 'bg-surface text-ink border-border [&>svg]:text-dot-danger',
  neutral: 'bg-surface text-ink-2 border-border [&>svg]:text-muted',
  info: 'bg-surface text-ink border-border [&>svg]:text-accent',
};

const GLYPH: Record<Tone, ReactNode> = {
  ok: <Check aria-hidden className="size-3" strokeWidth={3} />,
  warn: <MoreHorizontal aria-hidden className="size-3" strokeWidth={3} />,
  danger: <AlertTriangle aria-hidden className="size-3" strokeWidth={2.5} />,
  neutral: <Minus aria-hidden className="size-3" strokeWidth={3} />,
  info: <Clock3 aria-hidden className="size-3" strokeWidth={2.5} />,
};

/** A square state chip: a glyph and a word, so the state never rests on colour alone. */
export function ToneChip({ tone, children, title, className }: { tone: Tone; children: ReactNode; title?: string; className?: string }) {
  const chip = (
    <span className={cn('inline-flex h-6 items-center gap-1 rounded-[var(--radius-chip)] border px-2 text-small leading-[18px] font-medium whitespace-nowrap', TONE[tone], className)}>
      {GLYPH[tone]}
      {children}
    </span>
  );
  return title ? (
    <Tooltip content={title}>
      <span className="relative inline-flex rounded-[var(--radius-chip)]">
        {chip}
        <span className="sr-only">. {title}</span>
      </span>
    </Tooltip>
  ) : chip;
}

export function ReadinessChip({ r }: { r: Readiness }) {
  return <ToneChip tone={READINESS[r].tone} title={READINESS[r].help}>{READINESS[r].label}</ToneChip>;
}

const LEVEL_LOOK: Record<Level, string> = {
  L2: 'border-dashed border-border-strong text-ink-2',
  L1: 'border-accent/60 text-accent',
  L0: 'border-warn/60 text-warn',
  human: 'border-ink/70 text-ink',
};

/** Who acts: Automatic, One click, Person sends, Person only. An outlined pill, one style per level. */
export function LevelChip({ level }: { level: Level }) {
  return (
    <Tooltip content={LEVELS[level].help}>
      <span className={cn('relative inline-flex h-6 shrink-0 items-center rounded-full border bg-surface px-2 text-small font-semibold whitespace-nowrap', LEVEL_LOOK[level])}>
        {LEVELS[level].label}
      </span>
    </Tooltip>
  );
}

/** The five checks as the tower reads them: one Progress with the count in words, and the open ones named (no squares). */
export function GateMarks({ gates, caseId }: { gates: Record<GateId, TowerGate>; caseId: string }) {
  const done = SHARED_GATES.filter((g) => gates[g.id].status === 'closed' || gates[g.id].status === 'na').length;
  const open = SHARED_GATES.filter((g) => gates[g.id].status === 'waiting' || gates[g.id].status === 'problem');
  return (
    <span className="flex min-w-0 flex-col gap-1" data-testid={`tower-checks-${caseId}`}>
      <CheckProgress done={done} total={SHARED_GATES.length} />
      {open.length ? <span className="text-small text-ink-2">Open: {open.map((g) => `${g.name.charAt(0).toLowerCase()}${g.name.slice(1)} (${GATE_STATUS[gates[g.id].status].label.toLowerCase()})`).join('; ')}</span> : null}
    </span>
  );
}

/** The line that says whose reading the checks are (the tower's, not the sheet's). */
export function GateLegend() {
  return <span className="text-small text-ink-2">The tower's own reading of the messages, not the sheet.</span>;
}

/** A hearing, as a link that opens it on the Board. */
export function CaseRef({ id, withAddress = false }: { id: string; withAddress?: boolean }) {
  const t = useTower();
  const c = t.eng.dir.caseById[id];
  return (
    <a href={`#/later/board?open=${id}`} className="inline-flex h-6 items-center gap-1 rounded-[var(--radius-chip)] border border-border bg-surface-2 px-1.5 text-small tabular-nums text-ink hover:border-accent hover:text-accent">
      {id}
      {withAddress && c ? <span className="font-sans text-ink-2">{addrOf(c.property)}</span> : null}
    </a>
  );
}

/** Message numbers as links to the Messages page; "out-7" is something the firm sent through the tower. */
export function Evidence({ refs }: { refs: EvidenceRef[] }) {
  const ids = [...new Set(refs.filter((x): x is number | string => x != null && x !== ''))];
  if (!ids.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {ids.map((id) =>
        /^out-/.test(String(id)) ? (
          <span key={id} className="inline-flex h-6 items-center rounded-[var(--radius-chip)] bg-sunken px-1.5 font-mono text-small text-ink-2">sent #{String(id).replace('out-', '')}</span>
        ) : (
          <a key={id} href={`#/later/messages?msg=${id}`} className="inline-flex h-6 items-center rounded-[var(--radius-chip)] bg-sunken px-1.5 font-mono text-small text-ink-2 hover:text-accent">
            msg {id}
          </a>
        ),
      )}
    </span>
  );
}

/** Every tower page: the header, then the content inside the dashed later frame. */
export function LaterPage({ testId, title, lede, actions, children }: { testId: string; title: string; lede: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div data-testid={testId} className="flex flex-col gap-6">
      <PageHeader title={title} lede={lede} actions={actions} status={<NotBuiltTag testId="later-tag" />} />
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

/** A white panel inside the later frame. */
export function Panel({ title, description, actions, children, className, testId }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; testId?: string }) {
  return (
    <section data-testid={testId} className={cn('min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-e1', className)}>
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-h2-card text-ink">{title}</h2> : null}
            {description ? <p className="mt-1 max-w-[80ch] text-body text-ink-2">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * The replay clock, shown in the top bar's clock slot on every later page (season one's clock does
 * not apply there). Simulated: it starts after the last example message.
 */
export function ReplayClock() {
  const t = useTower();
  return (
    <span className="inline-flex h-9 w-[272px] items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-small text-ink" title="The tower's own simulated clock, set after the last example message. Season one's clock does not apply here.">
      <Clock3 aria-hidden className="size-4" />
      <span className="font-semibold max-lg:sr-only">Simulated replay</span>
      <span className="font-semibold tabular-nums" data-testid="tower-clock">{when(t.now)}</span>
    </span>
  );
}

/** The tower's history controls (+1 hour, Undo, Reset). Its clock is in the top bar (ReplayClock). */
export function TowerClock({ compact = false }: { compact?: boolean }) {
  const t = useTower();
  const timer = t.live ? t.nextTimer() : null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {compact ? null : (
        <>
          <Button size="md" disabled={!t.live} onClick={() => { t.advance(3600e3); toast({ title: `The tower clock is now ${when(t.now)}.` }); }}>+1 hour</Button>
          <Button size="md" disabled={!t.live} onClick={() => { t.goto(t.nextMorning()); toast({ title: `The tower clock is now ${when(t.now)}.` }); }}>Next working morning</Button>
          <Tooltip content={timer ? `Jump to ${when(timer.at)}: ${timer.why}.` : 'No timer is running.'}>
            <span tabIndex={timer ? -1 : 0}>
              <Button size="md" disabled={!timer} onClick={() => { if (timer) { t.goto(timer.at); toast({ title: `Moved to ${when(timer.at)}`, body: `${timer.why}.` }); } }}>Next timer</Button>
            </span>
          </Tooltip>
        </>
      )}
      <Button size="sm" variant="ghost" icon={<Undo2 aria-hidden className="size-4" />} disabled={!t.canUndo} onClick={() => { t.undo(); toast({ title: 'Took back the last step and everything it set off.' }); }}>Undo</Button>
      <Button size="sm" variant="ghost" icon={<RotateCcw aria-hidden className="size-4" />} disabled={!(t.live && t.s.log.length)} onClick={() => { t.reset(); toast({ title: 'Back to the state right after the example messages.' }); }}>Reset</Button>
    </div>
  );
}

/** A note in a muted band: "Nothing is sent", "History view", and so on. */
export function Note({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'danger' | 'ok'; className?: string }) {
  const look = { neutral: 'bg-surface-2 text-ink-2', warn: 'bg-warn-bg text-ink', danger: 'bg-danger-bg text-ink', ok: 'bg-ok-bg text-ink' }[tone];
  return <div className={cn('rounded-[var(--radius-quote)] px-4 py-3 text-body leading-relaxed', look, className)}>{children}</div>;
}

/** A simple table frame with horizontal scroll inside, never on the page. */
export function TableWrap({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto rounded-[var(--radius-quote)] border border-border">
      <table className="w-full border-collapse text-left text-body [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-small [&_th]:font-semibold [&_th]:text-ink-2 [&_tbody_th]:border-t [&_tbody_th]:border-border [&_tbody_th]:bg-transparent [&_tbody_th]:align-top [&_tbody_th]:text-body [&_tbody_th]:text-ink">
        <caption className="sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}
