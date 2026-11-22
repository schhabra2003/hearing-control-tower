import { useState } from 'react';
import { Send } from 'lucide-react';
import type { PageProps } from '@/lib/router';
import { engine } from '@/lib/data';
import { Button } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { SourceChip } from '@/components/data/SourceChip';
import { toast } from '@/components/ui/Toast';
import { Section } from '@/components/ui/Section';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { CaseLink, HistoryControls, LaterLayout, LevelBadge, SelectField } from './parts';
import { Trace } from '../components/Trace';
import { CHANNELS, FIRM, PRESETS, type Preset } from './presets';
import { addrOf, useTower, type ForcedClaim, type Tower } from './tower';

interface Form {
  sender: string;
  address: string;
  channel: string;
  cases: string[];
  body: string;
  claims: ForcedClaim[] | null;
  presetId: string | null;
}

const START: Form = { sender: 'Larkmere hearing office', address: 'clerk@larkmere.example', channel: 'email', cases: ['AX-121', 'AX-122'], body: '', claims: null, presetId: null };

function senders(t: Tower): { name: string; address: string; group: string }[] {
  const dir = t.eng.dir;
  return [
    ...dir.counties.map((c) => ({ name: `${c.county} hearing office`, address: c.office_email, group: 'County offices' })),
    ...dir.consultants.map((k) => ({ name: k.name, address: k.email ?? '', group: 'Consultants' })),
    { name: FIRM, address: '', group: 'The firm' },
    ...[...new Set(dir.cases.map((c) => c.homeowner))].map((h) => ({ name: h, address: '', group: 'Homeowners' })),
  ];
}

/** The steps the result will show, named before anything is delivered so the column is not empty. */
const STEPS = ['Who is speaking', 'Which hearings it is about', 'What it says, and what each statement does', 'Whether a person needs to read it', 'New work it creates'];
/** What each step will show, in one line, before a message is delivered. */
const STEP_HINT = [
  'The sender, and whether the address is one this office uses.',
  'The case numbers the message names, or the thread it belongs to.',
  'Each statement, with the words it rests on.',
  'Anything unclear, or anything that gives orders, goes to a person.',
  'The calls, replies and checks that follow from it.',
];

interface Result {
  msgId: number | string;
  newKeys: string[];
  auto: number;
}

export function TryMessage(_props: PageProps) {
  const t = useTower();
  const [f, setF] = useState<Form>(START);
  const [res, setRes] = useState<Result | null>(null);
  const list = senders(t);
  const groups = [...new Set(list.map((x) => x.group))];
  const preset = PRESETS.find((p) => p.id === f.presetId) ?? null;
  const entry = res ? t.messages.find((m) => m.id === res.msgId && !m.corrects) ?? null : null;
  const created = res ? t.items.filter((i) => res.newKeys.includes(i.key)) : [];
  const head = (engine.reader_results as { headline?: { unseen_n: number; offline_recall: string; ai_recall: string } } | null)?.headline;

  const load = (p: Preset): void => {
    setF({ sender: p.raw.sender, address: p.raw.address, channel: p.raw.channel, cases: [...p.raw.caseIds], body: p.raw.body, claims: p.claims ? p.claims.map((c) => ({ ...c })) : null, presetId: p.id });
    setRes(null);
  };

  const deliver = (): void => {
    if (!f.body.trim()) {
      toast({ title: 'Write the text of the message first.' });
      return;
    }
    if (!t.live) return;
    const before = new Set(t.items.map((i) => i.key));
    const out = t.send({ sender: f.sender.trim() || 'Unknown sender', address: f.address.trim(), channel: f.channel, body: f.body.trim(), caseIds: [...f.cases] }, f.claims);
    const e = out?.result;
    if (!e || !out) return;
    setRes({ msgId: e.id, newKeys: t.items.filter((i) => !before.has(i.key)).map((i) => i.key), auto: out.auto });
    toast({ title: `Delivered as message ${e.id}`, body: e.readinessChanges.length ? e.readinessChanges.map((r) => `${r.caseId} changed state.`).join(' ') : 'Nothing changed on the board.' });
  };

  return (
    <LaterLayout id="later-try" testId="page-later-try" actions={<HistoryControls />}>
      <div className="grid grid-cols-[320px_minmax(0,1.2fr)_minmax(0,1fr)] gap-x-8 max-2xl:grid-cols-[288px_minmax(0,1fr)] max-lg:grid-cols-1">
        <Section title="Start from a situation" description="Loads an example into the form." rule={false} className="!pt-6 max-2xl:row-span-2 max-lg:row-span-1">
          <div className="flex flex-col gap-1 max-lg:grid max-lg:grid-cols-2 max-sm:grid-cols-1">
            {PRESETS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={f.presetId === p.id ? 'secondary' : 'ghost'}
                data-testid={`try-preset-${p.id}`}
                title={p.teaser}
                aria-pressed={f.presetId === p.id}
                onClick={() => load(p)}
                className="h-auto justify-start py-2 text-left whitespace-normal"
              >
                {p.title}
              </Button>
            ))}
          </div>
        </Section>
        <Section title="The message" rule={false} className="!pt-6">
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); deliver(); }}>
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)] gap-4 max-md:grid-cols-1">
              <SelectField
                label="From"
                value={list.some((x) => x.name === f.sender) ? f.sender : '__other'}
                onChange={(v) => {
                  const hit = list.find((x) => x.name === v);
                  setF({ ...f, sender: v === '__other' ? '' : v, address: hit?.address ?? '', presetId: null });
                }}
              >
                {groups.map((g) => (
                  <optgroup key={g} label={g}>{list.filter((x) => x.group === g).map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}</optgroup>
                ))}
                <option value="__other">Someone else</option>
              </SelectField>
              <Field label="Address it came from">
                <TextInput value={f.address} placeholder="None" onChange={(e) => setF({ ...f, address: e.target.value })} />
              </Field>
              <SelectField label="Channel" value={f.channel} onChange={(v) => setF({ ...f, channel: v })}>
                {CHANNELS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </SelectField>
            </div>
            {!list.some((x) => x.name === f.sender) ? (
              <Field label="Name"><TextInput value={f.sender} onChange={(e) => setF({ ...f, sender: e.target.value })} /></Field>
            ) : null}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-semibold text-ink">Hearings the thread is about</legend>
              <div className="grid max-h-36 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto rounded-control border border-border p-2 max-md:grid-cols-1">
                {t.eng.dir.cases.map((c) => (
                  <label key={c.case_id} className="flex min-h-8 items-center gap-2 text-body text-ink">
                    <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={f.cases.includes(c.case_id)} onChange={(e) => setF({ ...f, cases: e.target.checked ? [...f.cases, c.case_id] : f.cases.filter((x) => x !== c.case_id) })} />
                    {addrOf(c.property)} <span className="text-small text-ink-2">{c.case_id}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Text">
              <TextArea data-testid="try-message-text" rows={9} placeholder="Write the message here." value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
            </Field>
            {f.claims ? (
              <InlineAlert
                className="max-w-[var(--measure)]"
                tone="warn"
                title="The reader is skipped."
                action={<Button size="sm" variant="ghost" onClick={() => setF({ ...f, claims: null })}>Use the normal reader instead</Button>}
              >
                These statements are forced in, as if a reader were fooled: {f.claims.map((c) => c.type.replace(/_/g, ' ')).join(', ')}.
              </InlineAlert>
            ) : null}
            {preset ? <p className="text-body text-ink-2"><span className="font-semibold text-ink">Look for:</span> {preset.look}</p> : null}
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" size="md" variant="primary" data-testid="try-message-run" disabled={!t.live} icon={<Send aria-hidden />}>Deliver this message</Button>
              <span className="text-small text-ink-2">{t.live ? 'Simulated. Nothing is sent.' : 'Return to now on the Board first.'}</span>
            </div>
          </form>
        </Section>

        <Section title="What the later tool made of it" testId="try-message-result" rule={false} className="!pt-6 max-2xl:!pt-0">
          {entry && res ? (
            <div className="flex flex-col gap-6">
              <Trace m={entry} t={t} compact />
              <div>
                <h3 className="text-h3 mb-2 text-ink">New work this created ({created.length})</h3>
                {created.length ? (
                  <ul className="flex flex-col gap-2">
                    {created.map((i) => (
                      <li key={i.key} className="flex flex-wrap items-center gap-2 text-body">
                        <span className="text-ink">{i.title}</span> <LevelBadge level={i.level} /> {i.cases.map((id) => <CaseLink key={id} id={id} />)}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-body text-ink-2">{res.auto ? 'Nothing is waiting for a person.' : 'None.'}</p>}
                {res.auto ? <p className="mt-2 text-body text-ink-2">{res.auto} routine follow-ups would go out (simulated). See the <a className="text-accent underline underline-offset-2" href="#/later/queue">work queue</a>.</p> : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-body text-ink-2">Deliver a message to see, step by step:</p>
              <ol className="flex flex-col divide-y divide-border border-y border-border">
                {STEPS.map((x, i) => (
                  <li key={x} className="flex items-start gap-3 py-3 text-body text-ink-2">
                    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-small font-semibold tabular-nums">{i + 1}</span>
                    <span className="flex flex-col gap-1">
                      <span className="text-ink">{x}</span>
                      <span className="text-small text-ink-2">{STEP_HINT[i]}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <InlineAlert className="max-w-[var(--measure)]" title="Read by the offline pattern reader. No AI model is called.">
                What it does not recognise goes to a person.
                {head ? <span className="mt-1 flex flex-wrap items-center gap-2">On {head.unseen_n} unseen messages it found {head.offline_recall} of the statements; the AI readers found {head.ai_recall}. <SourceChip kind="measured" source="eval/reader_results.json" counted="Statements found on the unseen office messages, one labeller." /></span> : null}
              </InlineAlert>
            </div>
          )}
        </Section>
      </div>
    </LaterLayout>
  );
}
