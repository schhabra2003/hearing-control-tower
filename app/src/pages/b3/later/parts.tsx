/**
 * The Later pages' presets over the shared, adopted 21st.dev components. Nothing here draws its
 * own chip, panel or frame: a state is a Badge (word first, a small quiet dot), a block is a
 * Section, a note is an InlineAlert, a header is PageHeader with the "Not built" tag.
 * Replaces the Tower kit (components/Tower.tsx) on these pages; How it works still uses that kit.
 */

import type { ReactNode } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';
import { GATES as SHARED_GATES } from '@/lib/gates';
import { PAGES, type PageId } from '@/lib/copy';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CheckProgress } from '@/components/ui/Progress';
import { NotBuiltTag } from '@/components/ui/NotBuiltTag';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { GATE_STATUS, LEVELS, READINESS, addrOf, useTower, when, type EvidenceRef, type GateId, type Level, type Readiness, type Tone, type TowerGate } from './tower';

/** The tower's five tones onto the Badge's: "info" is not a state, so it reads neutral. */
export const badgeTone = (t: Tone): BadgeTone => (t === 'info' ? 'neutral' : t);

/** A state word with a small quiet dot. */
export function StateBadge({ tone, children, testId }: { tone: Tone; children: ReactNode; testId?: string }) {
  return <Badge size="sm" tone={badgeTone(tone)} testId={testId}>{children}</Badge>;
}

/** The hearing's state on the board. "Outcome unknown" is a question, not an alarm: amber, not red. */
const READY_TONE: Record<Readiness, BadgeTone> = { ready: 'ok', in_progress: 'neutral', at_risk: 'danger', past: 'warn', post: 'neutral', closed: 'neutral' };
export function ReadinessBadge({ r }: { r: Readiness }) {
  return <Badge size="sm" tone={READY_TONE[r]} title={READINESS[r].help}>{READINESS[r].label}</Badge>;
}

/** Who would act, as plain words with no colour: Automatic, One click, Person sends, Person only. */
export function LevelBadge({ level }: { level: Level }) {
  return <Badge size="sm" plain title={LEVELS[level].help}>{LEVELS[level].label}</Badge>;
}

/** One gate's state. */
export function GateBadge({ status }: { status: TowerGate['status'] }) {
  return <StateBadge tone={GATE_STATUS[status].tone}>{GATE_STATUS[status].label}</StateBadge>;
}

/** The five checks as one bar with words ("3 of 5 checks done"); the open ones are in the hearing's sheet. */
export function CheckBar({ gates, caseId }: { gates: Record<GateId, TowerGate>; caseId: string }) {
  const done = SHARED_GATES.filter((g) => gates[g.id as GateId].status === 'closed' || gates[g.id as GateId].status === 'na').length;
  return <CheckProgress done={done} total={SHARED_GATES.length} className="min-w-[160px]" testId={`tower-checks-${caseId}`} />;
}

/** A hearing as a link that opens it on the Board: the street, with the hearing number for screen readers. */
export function CaseLink({ id, withAddress = false }: { id: string; withAddress?: boolean }) {
  const t = useTower();
  const c = t.eng.dir.caseById[id];
  const street = c ? addrOf(c.property) : id;
  return (
    <a href={`#/later/board?open=${id}`} className="text-body font-medium text-accent underline underline-offset-2 hover:text-ink">
      {withAddress || !c ? street : street}
      <span className="sr-only"> (hearing {id})</span>
    </a>
  );
}

/** Message numbers as links to the Messages page; "out-7" is something sent through the later tool. */
export function MessageLinks({ refs }: { refs: EvidenceRef[] }) {
  const ids = [...new Set(refs.filter((x): x is number | string => x != null && x !== ''))];
  if (!ids.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-2">
      {ids.map((id) =>
        /^out-/.test(String(id)) ? (
          <span key={id}>Sent message {String(id).replace('out-', '')}</span>
        ) : (
          <a key={id} href={`#/later/messages?msg=${id}`} className="text-accent underline underline-offset-2 hover:text-ink">
            Message {id}
          </a>
        ),
      )}
    </span>
  );
}

/** Every Later page: PageHeader with the words from the copy module and the "Not built" tag. */
export function LaterLayout({ id, testId, actions, toolbar, children }: { id: PageId; testId: string; actions?: ReactNode; toolbar?: ReactNode; children: ReactNode }) {
  const copy = PAGES[id];
  return (
    <div data-testid={testId} className="flex flex-col">
      <PageHeader title={copy.title} lede={copy.purpose} actions={actions} toolbar={toolbar} status={<NotBuiltTag testId="later-tag" />} />
      <div className="flex min-w-0 flex-col">{children}</div>
    </div>
  );
}

/** Undo and Reset for the later tool's simulated history; +1 hour and the jumps when `full`. One size. */
export function HistoryControls({ full = false }: { full?: boolean }) {
  const t = useTower();
  const timer = t.live ? t.nextTimer() : null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {full ? (
        <>
          <Button size="sm" disabled={!t.live} onClick={() => { t.advance(3600e3); toast({ title: `The simulated clock is now ${when(t.now)}.` }); }}>+1 hour</Button>
          <Button size="sm" disabled={!t.live} onClick={() => { t.goto(t.nextMorning()); toast({ title: `The simulated clock is now ${when(t.now)}.` }); }}>Next working morning</Button>
          <Button size="sm" disabled={!timer} title={timer ? `Jump to ${when(timer.at)}: ${timer.why}.` : 'Nothing is waiting on a time.'} onClick={() => { if (timer) { t.goto(timer.at); toast({ title: `Moved to ${when(timer.at)}`, body: `${timer.why}.` }); } }}>Next timer</Button>
        </>
      ) : null}
      <Button size="sm" variant="ghost" icon={<Undo2 aria-hidden />} aria-label="Undo the last step" disabled={!t.canUndo} onClick={() => { t.undo(); toast({ title: 'Took back the last step and everything it set off.' }); }}>Undo</Button>
      <Button size="sm" variant="ghost" icon={<RotateCcw aria-hidden />} aria-label="Reset to the example week" disabled={!(t.live && t.s.log.length)} onClick={() => { t.reset(); toast({ title: 'Back to the state right after the example messages.' }); }}>Reset</Button>
    </div>
  );
}

/** A plain table: hairline rows, 8 by 12 px cells, header cells with scope, sideways scroll inside. */
export function Table({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className={cn('min-w-0 overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-body [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-small [&_th]:font-medium [&_th]:text-ink-2 [&_tbody_th]:border-t [&_tbody_th]:border-b-0 [&_tbody_th]:align-top [&_tbody_th]:text-body [&_tbody_th]:font-normal [&_tbody_th]:text-ink">
        <caption className="sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}

/**
 * A labelled choice list in the look of the shared Field and TextInput (label above, 40 px control,
 * the control border). The shared Field has no Select yet; this is the stand-in until it does.
 */
export function SelectField({ label, value, onChange, children, className, testId }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string; testId?: string }) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className="text-body font-semibold text-ink">{label}</span>
      <select
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-control border border-border-strong bg-surface px-3 text-body text-ink hover:border-ink-2"
      >
        {children}
      </select>
    </label>
  );
}
