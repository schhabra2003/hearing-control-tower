import { matchReply } from '@engine/src/replies.js';
import { Play } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { ReplyOut, ReplySent } from '@/types/data';
import { actions, useSession } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Block, State } from '@/layout/Regions';

type Kind = ReplySent['kind'];

export const KIND_WORDS: Record<Kind, string> = {
  offer: 'An offer',
  week: 'The Wednesday text',
  day_before: 'The day-before text',
  arrival: 'The arrival request',
  files: 'The case files',
  change: 'A change notice',
};

/** The consultant the try message goes to, as cli/replies.js --try sends it. */
const TRY_TO = 'Leo Arlen';
const DEFAULT_DOCKETS = 'Mon June 10, Larkmere, in person';
const FORMATS = ['in person', 'video', 'telephone'] as const;

interface Form {
  text: string;
  kind: Kind;
  from: string;
  channel: 'text' | 'email';
  open: string;
  held: string;
  dockets: string;
  version: string;
  format: (typeof FORMATS)[number];
  cap: string;
  heldToday: string;
  offeredToday: string;
}

const BLANK: Form = { text: '', kind: 'offer', from: TRY_TO, channel: 'text', open: '1', held: '1', dockets: DEFAULT_DOCKETS, version: '1', format: 'in person', cap: '', heldToday: '', offeredToday: '' };

/** The four runs of the prototype README, section 3, "Try a reply of your own". */
const PRESETS: { label: string; form: Partial<Form> }[] = [
  { label: 'YES 1 3 to an offer of 1 and 3', form: { text: 'YES 1 3', kind: 'offer', open: '1,3' } },
  { label: 'Got it 2, by email', form: { text: 'Got it 2\n> Reply GOT IT when every file opens.', kind: 'files', version: '2', held: '1,2', channel: 'email' } },
  { label: 'Yes, but not before 10', form: { text: 'Yes, but not before 10', kind: 'day_before', held: '1,2' } },
  { label: 'YES ALL over the daily cap', form: { text: 'YES ALL', kind: 'offer', open: '1,2', cap: '4', heldToday: '3', offeredToday: '0' } },
];

const USES: Record<Kind, (keyof Form)[]> = {
  offer: ['open', 'cap', 'heldToday', 'offeredToday'],
  week: ['dockets'],
  day_before: ['held'],
  arrival: ['held', 'format'],
  files: ['held', 'version'],
  change: ['held'],
};

interface Outcome {
  error?: string;
  message?: string;
  cap?: string;
  out?: ReplyOut;
}

const hearingsText = (a: number[]): string => `${a.length === 1 ? 'hearing' : 'hearings'} ${a.join(', ')}`;

/** What the rule does, worded as cli/replies.js prints it. */
export function doesText(out: ReplyOut): string {
  return out.byRule ? `${out.action ?? ''}${out.numbers.length ? ` for hearing ${out.numbers.join(', ')}` : ''}${out.version ? `, version ${out.version}` : ''}` : 'TO A PERSON';
}

/** Builds the message from the form as the CLI builds it from its flags, and runs the rule once. */
function run(f: Form): Outcome {
  const numbers = (v: string, name: string): number[] | string => {
    const parts = v.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length || parts.some((s) => !/^[1-9]\d?$/.test(s))) return `${name} takes hearing numbers from 1 to 99 separated by commas, for example 1,3.`;
    return [...new Set(parts.map(Number))];
  };
  if (!f.text.trim()) return { error: 'Type a reply first.' };
  const sent: ReplySent = { kind: f.kind, to: TRY_TO };
  if (f.kind === 'offer') {
    const n = numbers(f.open, 'Open hearings');
    if (typeof n === 'string') return { error: n };
    sent.open = n;
  }
  if (USES[f.kind].includes('held')) {
    const n = numbers(f.held, 'Hearings held');
    if (typeof n === 'string') return { error: n };
    sent.held = n;
  }
  if (f.kind === 'week') sent.dockets = f.dockets.split(';').map((s) => s.trim()).filter(Boolean);
  if (f.kind === 'files') {
    if (!/^[1-9]\d{0,2}$/.test(f.version.trim())) return { error: 'The version takes a whole number from 1 up, for example 2.' };
    sent.version = Number(f.version.trim());
  }
  if (f.kind === 'arrival') sent.format = f.format;

  let day: { cap: number; held: number; offered: number } | null = null;
  if (f.kind === 'offer' && (f.cap || f.heldToday || f.offeredToday)) {
    if (!f.cap || !f.heldToday) return { error: 'The daily cap needs the cap and the hearings held that day together.' };
    const bad = [f.cap, f.heldToday, f.offeredToday || '0'].some((v) => !/^\d{1,3}$/.test(v.trim()));
    if (bad) return { error: 'The daily cap numbers take whole numbers from 0 up, for example 4.' };
    day = { cap: Number(f.cap), held: Number(f.heldToday), offered: Number(f.offeredToday || '0') };
  }

  const out = matchReply(sent, { from: f.from.trim() || TRY_TO, text: f.text, channel: f.channel }, [], day);
  const message = {
    offer: () => `an offer of ${hearingsText(sent.open ?? [])}. No earlier YES is counted, so no hearing is taken`,
    week: () => `the Wednesday text, listing ${sent.dockets?.length ? sent.dockets.join('; ') : 'no docket'}`,
    day_before: () => `the day-before text for ${hearingsText(sent.held ?? [])}`,
    arrival: () => `the arrival request for ${hearingsText(sent.held ?? [])}, ${sent.format}`,
    files: () => `case files version ${sent.version} for ${hearingsText(sent.held ?? [])}`,
    change: () => `a change notice for ${hearingsText(sent.held ?? [])}`,
  }[f.kind]();
  const cap =
    f.kind === 'offer'
      ? day
        ? `Daily cap numbers given: the cap is ${day.cap}, ${TRY_TO} holds ${day.held} that day, and ${day.offered} more ${day.offered === 1 ? 'is' : 'are'} on offer to them on other dockets that day.`
        : 'Daily cap: not checked, because the cap and the hearings held that day were not given.'
      : undefined;
  return { message: `Message built from the form (not sent), to ${TRY_TO}: ${message}.`, cap, out };
}

/** A labelled native select; the shared Field wires only text inputs. */
function SelectField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={['flex min-w-0 flex-col gap-2', className].filter(Boolean).join(' ')}>
      <span className="text-body font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

/** A native select drawn like the family's text inputs (40 px, full-strength edge, the focus ring). */
const SELECT =
  'h-10 w-full rounded-control border border-border-strong bg-surface px-3 text-body text-ink transition-colors duration-[var(--dur-color)] hover:border-ink-2 focus-visible:outline-2 focus-visible:outline-accent';

/**
 * Try a reply: the reply rule of prototype/src/replies.js, run in the browser on a
 * reply typed here, with the same message the command line builds from its flags. It sits in the
 * Replies Detail region (#/replies?try=1) as blocks divided by hairlines, not as a card of its own.
 */
export function TryReply() {
  const [f, setF] = useState<Form>({ ...BLANK, ...PRESETS[0]!.form });
  const [result, setResult] = useState<Outcome | null>(null);
  const tried = useSession((s) => s.repliesTried);
  const set = <K extends keyof Form>(k: K, v: Form[K]): void => setF((x) => ({ ...x, [k]: v }));

  const go = (form: Form): void => {
    const r = run(form);
    setResult(r);
    if (r.out) actions.recordReplyTry({ text: form.text, kind: form.kind, byRule: r.out.byRule, why: r.out.why });
  };

  return (
    <div data-testid="try-reply">
      <Block title="The reply">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Examples">
            {PRESETS.map((p, i) => (
              <Button
                key={p.label}
                size="sm"
                variant="secondary"
                data-testid={`try-reply-preset-${i + 1}`}
                onClick={() => {
                  const next = { ...BLANK, ...p.form };
                  setF(next);
                  go(next);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <Field label="What the consultant wrote">
            <TextArea data-testid="try-reply-text" value={f.text} onChange={(e) => set('text', e.target.value)} rows={2} className="resize-y" style={{ lineHeight: '20px' }} />
          </Field>

          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <SelectField label="It answers">
              <select data-testid="try-reply-kind" value={f.kind} onChange={(e) => set('kind', e.target.value as Kind)} className={SELECT}>
                {(Object.keys(KIND_WORDS) as Kind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_WORDS[k]}
                  </option>
                ))}
              </select>
            </SelectField>
            <Field label="From">
              <TextInput value={f.from} onChange={(e) => set('from', e.target.value)} />
            </Field>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-body font-semibold text-ink" aria-hidden>
                Channel
              </span>
              <SegmentedControl<'text' | 'email'>
                label="Channel"
                value={f.channel}
                onValueChange={(v) => set('channel', v)}
                options={[
                  { value: 'text', label: 'Text' },
                  { value: 'email', label: 'Email' },
                ]}
              />
            </div>
            {f.kind === 'offer' ? (
              <Field label="Open hearings" className="w-32">
                <TextInput value={f.open} onChange={(e) => set('open', e.target.value)} inputMode="numeric" />
              </Field>
            ) : null}
            {USES[f.kind].includes('held') ? (
              <Field label="Hearings held" className="w-32">
                <TextInput value={f.held} onChange={(e) => set('held', e.target.value)} inputMode="numeric" />
              </Field>
            ) : null}
            {f.kind === 'files' ? (
              <Field label="Version" className="w-24">
                <TextInput value={f.version} onChange={(e) => set('version', e.target.value)} inputMode="numeric" />
              </Field>
            ) : null}
            {f.kind === 'arrival' ? (
              <SelectField label="Format" className="w-36">
                <select value={f.format} onChange={(e) => set('format', e.target.value as Form['format'])} className={SELECT}>
                  {FORMATS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </SelectField>
            ) : null}
            {f.kind === 'week' ? (
              <Field label="Dockets, separated by ;" className="min-w-[240px] flex-1">
                <TextInput value={f.dockets} onChange={(e) => set('dockets', e.target.value)} />
              </Field>
            ) : null}
          </div>

          {f.kind === 'offer' ? (
            <details className="l-details" data-testid="try-reply-cap">
              <summary>Check the daily cap too</summary>
              <div className="grid grid-cols-3 items-end gap-4">
                <Field label="Cap">
                  <TextInput value={f.cap} onChange={(e) => set('cap', e.target.value)} inputMode="numeric" />
                </Field>
                <Field label="Held that day">
                  <TextInput value={f.heldToday} onChange={(e) => set('heldToday', e.target.value)} inputMode="numeric" />
                </Field>
                <Field label="Offered that day">
                  <TextInput value={f.offeredToday} onChange={(e) => set('offeredToday', e.target.value)} inputMode="numeric" />
                </Field>
              </div>
            </details>
          ) : null}

          <div>
            <Button variant="primary" data-testid="try-reply-run" icon={<Play aria-hidden className="size-4" />} onClick={() => go(f)}>
              Run the rule
            </Button>
          </div>
        </div>
      </Block>

      <Block title="What the rule does" meta={tried.length ? `${tried.length} tried here` : undefined}>
        <div data-testid="try-reply-result" aria-live="polite" style={{ display: 'grid', gap: 8 }}>
          {result?.error ? (
            <p role="alert" className="l-body l-danger l-p">
              {result.error}
            </p>
          ) : result?.out ? (
            <>
              <State tone={result.out.byRule ? 'ok' : 'warn'} testId="try-reply-outcome">
                {result.out.byRule ? 'Filed by the rule' : 'For a person'}
              </State>
              <p className="l-body l-p">
                {result.out.byRule ? `${cap(doesText(result.out))}.` : 'A person reads it and answers.'} <span className="l-ink2">Why: {result.out.why}</span>
              </p>
              <details className="l-details">
                <summary>The message it answered</summary>
                <p className="l-p">{result.message}</p>
                {result.cap ? <p className="l-p">{result.cap}</p> : null}
              </details>
            </>
          ) : (
            <p className="l-small l-ink2 l-p">Pick an example or type a reply, then run the rule. Nothing is sent.</p>
          )}
          {tried.length ? (
            <ul className="l-checks" data-testid="try-reply-tried" style={{ marginTop: 8 }}>
              {tried
                .slice(-3)
                .reverse()
                .map((t) => (
                  <li key={`${t.at}-${t.text}`} className="l-check">
                    <span className="l-check-name">
                      <span className="l-clip">“{t.text.split('\n')[0]}”</span>
                      <span className="l-small l-muted">{t.at}</span>
                    </span>
                    <span className="l-small l-ink2">{t.byRule ? 'Filed by the rule' : 'For a person'}</span>
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      </Block>
    </div>
  );
}

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
