import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { CaseLink, LevelBadge, MessageLinks, StateBadge } from '../later/parts';
import { READINESS, when, words, type Item, type Msg, type Tower } from '../later/tower';

/** Ends a sentence with one period, so a time like 9:08 a.m. does not get a second one. */
const endSentence = (text: string) => (text.endsWith('.') ? text : `${text}.`);

const actionLabel = (it: Item): string => {
  if (it.kind === 'triage') return 'Read: nothing more to do';
  if (it.kind === 'playbook') return 'Approve the change';
  if (it.level === 'human') return it.to?.channel === 'phone note' ? 'Done' : 'Done: I did this';
  if (it.level === 'L0') return 'Checked: send it';
  if (it.level === 'L1') return 'Approve and send';
  return 'Send now';
};

const autoText = (n: number): string => (n ? ` ${n} automatic follow-up${n === 1 ? '' : 's'} went out.` : '');

function changeText(entry: Msg | null | undefined): string {
  if (!entry) return '';
  const bits = (entry.readinessChanges ?? []).map((r) => `${r.caseId} is now ${READINESS[r.to].label.toLowerCase()}.`);
  if (entry.attention && entry.attention.length) bits.push('A person needs to read it.');
  return bits.length ? bits.join(' ') : 'Nothing changed on the board.';
}

/** The draft or script the tower prepared, behind a disclosure. */
export function DraftBox({ draft }: { draft: NonNullable<Item['draft']> }) {
  return (
    <details className="group rounded-quote border border-border">
      <summary className="cursor-pointer px-3 py-2 text-body font-medium text-ink-2 hover:text-ink">
        {draft.subject ? 'Draft' : 'Script'}: <span className="text-ink">{draft.subject ?? 'what to say'}</span>
      </summary>
      <div className="border-t border-border px-3 py-3">
        {draft.to ? <p className="mb-2 text-small text-ink-2">To: {draft.to}</p> : null}
        <pre className="max-h-72 overflow-auto font-sans text-body whitespace-pre-wrap text-ink">{draft.body}</pre>
        {(draft.attachments ?? []).map((a) => (
          <p key={a.name} className="mt-2 text-small text-ink-2">Attachment: {a.name}</p>
        ))}
      </div>
    </details>
  );
}

/** One item of the work queue: who acts, what, why, the draft, and the one action. */
export function ItemCard({ it, t, testId }: { it: Item; t: Tower; testId: string }) {
  const [busy, setBusy] = useState(false);
  const todo = it.phase === 'todo';
  const overdue = it.due && it.due < t.now;
  const wait = it.followUpAt && it.followUpAt > t.now ? it.followUpAt : it.replyBy && it.replyBy > t.now ? it.replyBy : null;

  const act = (): void => {
    setBusy(true);
    const r = t.act(it.key);
    setBusy(false);
    const res = r?.result;
    if (!res) toast({ title: 'Nothing happened.' });
    else if (res.refused) toast({ title: 'Refused', body: res.reason });
    else toast({ title: `Done: ${res.title ?? it.title}.`, body: autoText(r.auto).trim() || undefined, tone: 'ok' });
  };

  return (
    <article data-testid={testId} className={cn('flex flex-col gap-3 rounded-card border bg-surface p-4', todo ? 'border-border' : 'border-dashed border-border-control')}>
      <div className="flex flex-col gap-1">
        <h3 className="text-body font-semibold text-pretty text-ink">{it.title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <LevelBadge level={it.level} />
          {it.due ? <span className={cn('text-small', overdue ? 'font-medium text-danger' : 'text-ink-2')}>{overdue ? 'Was due' : 'Due'} {when(it.due)}</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-body text-ink-2">
        {it.to ? <span>To <span className="font-medium text-ink">{it.to.name}</span>{it.to.channel ? `, ${it.to.channel}` : ''}</span> : null}
        {it.cases.map((id) => <CaseLink key={id} id={id} />)}
        <MessageLinks refs={it.evidence} />
      </div>
      <p className="line-clamp-2 text-body text-ink-2" title={it.why}>{it.why}</p>
      {it.kind === 'playbook' ? (
        <div className="flex flex-col gap-2">
          {it.driftQuote ? <blockquote className="border-l-2 border-border-control pl-3 text-body text-ink">{it.driftQuote}</blockquote> : null}
          {it.proposal?.length ? (
            <ul className="flex flex-col gap-1 text-body">
              {it.proposal.map((ch) => (
                <li key={ch.path}><span className="text-ink-2">{words(ch.path.split('.').pop() ?? ch.path)}</span>: {words(ch.from)} becomes <span className="font-semibold">{words(ch.to)}</span></li>
              ))}
            </ul>
          ) : <p className="text-body text-ink-2">The later tool could not turn this into a specific change. A person edits the county's process.</p>}
          <p className="text-small text-ink-2">Nothing goes to this office under the old process until a person decides.</p>
        </div>
      ) : null}
      {it.checks?.length && todo ? <details className="text-body text-ink-2"><summary className="cursor-pointer text-ink-2 hover:text-ink">Check before you act ({it.checks.length})</summary><ul className="mt-2 list-disc pl-4">{it.checks.map((c) => <li key={c}>{c}</li>)}</ul></details> : null}
      {it.draft ? <DraftBox draft={it.draft} /> : null}
      {it.blocked ? <InlineAlert tone="warn" title="Held back.">{it.blocked}</InlineAlert> : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {!t.live ? (
          <span className="text-small text-ink-2">History view: proposed at this moment.</span>
        ) : todo ? (
          <>
            <Button size="sm" variant="secondary" disabled={!!it.blocked || busy} onClick={act}>{actionLabel(it)}</Button>
            {it.kind === 'playbook' && it.county ? (
              <Button size="sm" variant="ghost" onClick={() => { t.dismiss(it.county!); toast({ title: `Dismissed: ${it.county}'s saved process stays as it is.` }); }}>Dismiss: the saved process is right</Button>
            ) : null}
          </>
        ) : (
          <>
            <span className="text-small text-ink-2">
              {it.sentAt ? `Sent ${endSentence(when(it.sentAt))} ` : ''}
              {it.followUpAt && it.followUpAt > t.now ? `If nobody answers, the later tool follows up ${endSentence(when(it.followUpAt))}` : it.replyBy && it.replyBy > t.now ? `If nobody answers by ${when(it.replyBy)}, the next person is asked.` : ''}
            </span>
            {it.replies?.length ? (
              <div className="flex w-full flex-wrap items-center gap-2">
                <span className="text-small font-medium text-ink-2">Simulate the answer:</span>
                {it.replies.map((r) => (
                  <Button
                    key={r.label}
                    size="sm"
                    title={r.message.body}
                    onClick={() => {
                      const out = t.reply(r.message, r.label);
                      if (out) toast({ title: `Answer delivered: "${r.label}"`, body: `${changeText(out.result)}${autoText(out.auto)}` });
                    }}
                  >
                    {r.label}
                  </Button>
                ))}
                {wait ? <Button size="sm" variant="ghost" onClick={() => { t.goto(wait + 60e3); toast({ title: `Nobody answered. The simulated clock is now ${when(t.now)}.` }); }}>Nobody answers</Button> : null}
              </div>
            ) : null}
          </>
        )}
        {!todo && !it.replies?.length ? <StateBadge tone="warn">Waiting</StateBadge> : null}
      </div>
    </article>
  );
}
