import type { ReactNode } from 'react';
import { CLAIM_TYPES, DISPOSITIONS } from '@engine/src/model.js';
import { engine } from '@/lib/data';
import { SourceChip } from '@/components/data/SourceChip';
import { CaseLink, ReadinessBadge, StateBadge } from '../later/parts';
import { dateShort } from '@/lib/format';
import { DISPOSITION, claimLabel, fmtTime, when, type Claim, type Msg, type Tower } from '../later/tower';

const RESOLVED: Record<string, string> = {
  thread: 'the thread it arrived in',
  text: 'an address or case number in the text',
  homeowner: "the homeowner's own cases",
  person: 'a person filed it',
  question: 'the one open question the firm had asked this sender',
};

interface RecordedRow {
  failed?: boolean;
  exact?: boolean;
  for_person?: boolean;
  found: number;
  missed: string[];
  extra: string[];
  held?: { claim: string; reason: string }[];
}

/** What the two AI readers made of a packet message in the recorded run (engine.json reader_results). */
function recordedLine(m: Msg): ReactNode {
  const rr = engine.reader_results as { recorded?: { primary: string; second: string }; per_message?: Record<string, RecordedRow> } | null;
  const row = rr?.per_message?.[String(m.id)];
  if (!row || m.corrects || !rr?.recorded) return null;
  let text: ReactNode;
  if (row.failed) text = <><StateBadge tone="danger">Not read</StateBadge> The first reader gave no usable answer in the recorded run, so the message went to a person.</>;
  else if (row.exact && !row.for_person) text = <><StateBadge tone="ok">Same reading</StateBadge> They found exactly the statements of the hand labels{row.found ? ` (${row.found})` : ', which is none'}, and nothing was held back.</>;
  else {
    text = (
      <>
        <StateBadge tone={row.for_person ? 'warn' : 'danger'}>{row.for_person ? 'To a person' : 'Differs'}</StateBadge> {row.found} of {row.found + row.missed.length} labelled statements were applied
        {row.extra.length ? `, and ${row.extra.length} that the labels do not have (${row.extra.join('; ')})` : ''}.
        {row.missed.length ? ` Not applied: ${row.missed.join('; ')}.` : ''}
        {(row.held ?? []).map((h) => ` Held back for a person: ${h.claim}. ${h.reason}`).join('')}
      </>
    );
  }
  return (
    <div className="rounded-quote border border-border px-3 py-3 text-body text-ink">
      <p className="mb-1 flex flex-wrap items-center gap-2 font-semibold">The two AI readers on this message <SourceChip kind="measured" source="data/recorded_reads.json" counted="Recorded answers of the two AI readers, replayed. No model is called here." /></p>
      <p className="text-ink-2">Recorded run: {rr.recorded.primary}, checked by {rr.recorded.second}. No model is called on this page.</p>
      <p className="mt-2">{text}</p>
    </div>
  );
}

function whoIs(m: Msg, t: Tower): ReactNode {
  const how = m.address ? 'Identified by the address on file.' : 'Identified by name: the example messages carry no addresses. In production the address decides.';
  if (m.spoofSuspected) return <><StateBadge tone="danger">Unknown sender</StateBadge> The display name is one the firm knows, but the address is not the one on file. No authority.</>;
  if (m.role === 'government') return <><StateBadge tone="neutral">County office</StateBadge> {m.county}. {how}</>;
  if (m.role === 'consultant') return <><StateBadge tone="neutral">Consultant</StateBadge> {t.eng.dir.consultantById[m.consultant ?? '']?.name ?? m.consultant}. {how}</>;
  if (m.role === 'firm') return <><StateBadge tone="neutral">Firm staff</StateBadge> {m.verbal ? 'A phone note: it carries what someone told the firm by phone, so nothing in it counts as written.' : m.direction === 'out' ? "The firm's own message. It can record what the firm did, never what an office or a consultant decided." : ''}</>;
  if (m.role === 'homeowner') return <><StateBadge tone="warn">Homeowner</StateBadge> {m.homeowner}. A homeowner's message changes nothing by itself: a person calls them back on the number on file.</>;
  return <><StateBadge tone="danger">Unknown sender</StateBadge> Not an office, a consultant or a staff address the firm knows. No authority.</>;
}

/** The message body with the quoted parts marked. */
function Marked({ body, claims }: { body: string; claims: Claim[] }) {
  const marks: [number, number][] = [];
  for (const c of claims) {
    if (!c.quote) continue;
    const i = body.indexOf(c.quote);
    if (i >= 0 && c.quote.length < body.length) marks.push([i, i + c.quote.length]);
  }
  marks.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const m of marks) {
    const last = merged[merged.length - 1];
    if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
    else merged.push([...m]);
  }
  const out: ReactNode[] = [];
  let pos = 0;
  merged.forEach(([a, b]) => {
    out.push(body.slice(pos, a), <mark key={a} className="rounded-chip bg-accent-soft text-ink">{body.slice(a, b)}</mark>);
    pos = b;
  });
  out.push(body.slice(pos));
  return <>{out}</>;
}

function Stage({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[28px_1fr] gap-3">
      <span aria-hidden className="grid size-7 place-items-center rounded-full border border-border text-small font-semibold text-ink-2 tabular-nums">{n}</span>
      <div className="min-w-0">
        <h3 className="text-h3 mb-2 text-ink">{title}</h3>
        <div className="flex max-w-[var(--measure)] flex-col gap-2 text-body text-ink">{children}</div>
      </div>
    </li>
  );
}

/** What the tower made of one message: who, which hearings, what it says, what moved, a person or not. */
export function Trace({ m, t, compact = false }: { m: Msg; t: Tower; compact?: boolean }) {
  const dir = t.eng.dir;
  const nameOf = (id?: string): string => (id ? dir.consultantById[id]?.name ?? id : '');
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-body font-semibold text-ink">{m.sender}{m.address ? <span className="font-normal text-ink-2"> &lt;{m.address}&gt;</span> : null}</p>
        <p className="text-small text-ink-2">{m.channel} · {when(m.ts)} · message {m.id}{m.reader && !m.corrects ? ` · read by ${m.reader}` : ''}</p>
      </div>
      <ol className="flex flex-col gap-6">
        <Stage n={1} title="Who is speaking?"><p>{whoIs(m, t)}</p></Stage>
        <Stage n={2} title="Which hearings?">
          {m.caseIds.length ? (
            <p className="flex flex-wrap items-center gap-2">
              {m.caseIds.map((id) => <CaseLink key={id} id={id} withAddress />)}
              <span className="text-ink-2">matched by {RESOLVED[m.resolvedBy] ?? m.resolvedBy}.</span>
            </p>
          ) : <p><StateBadge tone="danger">No case matched</StateBadge> The message names no case and sits in no known thread. A person files it.</p>}
        </Stage>
        <Stage n={3} title="What does it say?">
          <blockquote className="border-l-2 border-border-control pl-3 text-body whitespace-pre-wrap text-ink">
            <Marked body={m.body} claims={m.claims} />
          </blockquote>
          {m.claims.length ? (
            <ul className="flex flex-col gap-3">
              {m.claims.map((c, i) => {
                const d = DISPOSITION[c.disposition] ?? { label: c.disposition, tone: 'neutral' as const };
                return (
                  <li key={i} className="border-t border-border pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold" title={CLAIM_TYPES[c.type]}>{claimLabel(c.type)}</span>
                      {c.cases.map((id) => <CaseLink key={id} id={id} />)}
                      {c.date || c.time || c.consultant ? <span className="text-small text-ink-2">{[c.date ? dateShort(c.date) : '', c.time ? fmtTime(c.time) : '', nameOf(c.consultant)].filter(Boolean).join(', ')}</span> : null}
                      <span className="ml-auto"><span title={DISPOSITIONS[c.disposition]}><StateBadge tone={d.tone}>{d.label}</StateBadge></span></span>
                    </div>
                    {c.quote && c.quote !== m.body ? <p className="mt-2 text-body text-ink-2">"{c.quote}"</p> : null}
                    <p className="mt-1 text-body text-ink-2">{c.reason}</p>
                    {c.effects.length ? (
                      <ul className="mt-2 list-disc pl-4 text-body">{c.effects.map((e, j) => <li key={j}><span className="text-small text-ink-2">{e.caseId}</span> {e.text}</li>)}</ul>
                    ) : <p className="mt-1 text-small text-muted">It changed nothing.</p>}
                  </li>
                );
              })}
            </ul>
          ) : <p><StateBadge tone="warn">Nothing recognised</StateBadge> The reader found no statement it knows. The message is not dropped.</p>}
          {compact ? null : recordedLine(m)}
        </Stage>
        {compact ? null : (
          <Stage n={4} title="What changed on the board?">
            {m.readinessChanges.length || m.opened.length || m.closed.length ? (
              <>
                {m.readinessChanges.map((r) => (
                  <p key={r.caseId} className="flex flex-wrap items-center gap-2"><CaseLink id={r.caseId} /> <ReadinessBadge r={r.from} /> <span className="text-ink-2">became</span> <ReadinessBadge r={r.to} /></p>
                ))}
                {m.opened.length ? <p><span className="font-semibold">Opened:</span> {m.opened.map((i) => `${i.caseId} ${i.title}`).join('; ')}</p> : null}
                {m.closed.length ? <p><span className="font-semibold">Closed:</span> {m.closed.map((i) => `${i.caseId} ${i.title}`).join('; ')}</p> : null}
              </>
            ) : <p className="text-ink-2">Nothing. No check opened or closed.</p>}
          </Stage>
        )}
        <Stage n={compact ? 4 : 5} title="Does a person need to read it?">
          {m.attention?.length ? (
            <p><StateBadge tone="danger">Yes</StateBadge> {m.attention.join(' ')} It stays in the work queue until someone has read it.</p>
          ) : (
            <p><StateBadge tone="ok">No</StateBadge> {m.direction === 'out' && !m.verbal ? "The firm's own message." : 'Every statement was understood and handled by the rules above.'}</p>
          )}
        </Stage>
      </ol>
    </div>
  );
}

