import { classifyOfficeReply, OFFICE_KINDS, type OfficeResult } from '@engine/src/office_rule.js';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { benchRows, engine, hearings, offices } from '@/lib/data';
import { Button } from '@/components/ui/Button';
import { Field, TextArea } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Block, State } from '@/layout/Regions';
import { sentenceCase } from '../lib';

type Channel = 'email' | 'phone note';

interface Preset {
  label: string;
  county: string;
  text: string;
  channel: Channel;
}

/** The README's example, and the packet's own messages from the Tesswick office and about it. */
function presets(): Preset[] {
  const out: Preset[] = [{ label: 'Example: the office cannot find the form', county: 'Tesswick', text: 'We cannot find your staffing form.', channel: 'email' }];
  const words: Record<number, string> = { 22: 'Example: the office changed its route (message 22)', 24: 'Example: the office cannot confirm the list (message 24)' };
  for (const id of [22, 24]) {
    const m = engine.messages.find((x) => x.id === id);
    if (m) out.push({ label: words[id]!, county: 'Tesswick', text: m.body, channel: m.channel === 'phone note' ? 'phone note' : 'email' });
  }
  return out;
}

interface Proposal {
  tab: string;
  column: string;
  value: string;
  why?: string;
  appliesTo?: string;
  header?: string;
}

/** Sheet words in plain reading: capitals in sentence case, asides that name cells left out. */
function plain(t: string): string {
  return cap1(sentenceCase(t.replace(/\s*\((?=[^)]*\b(?:[A-Z]{1,2}\d*|G\d)\b)[^)]*\)/g, '').trim()));
}
const cap1 = (x: string): string => (x ? x.charAt(0).toUpperCase() + x.slice(1) : x);

/** The office choice: a native select drawn like the family's text inputs (40 px, full-strength edge). */
const SELECT =
  'h-10 w-full rounded-control border border-border-strong bg-surface px-3 text-body text-ink transition-colors duration-[var(--dur-color)] hover:border-ink-2 focus-visible:outline-2 focus-visible:outline-accent';

/**
 * Try an office message: the office rule of prototype/src/office_rule.js, run in
 * the browser as node cli/office.js --try does, with the office's hearings and the bench as context.
 * It sits in the Offices Detail region (#/offices?try=1) as blocks, not as a card of its own.
 */
export function TryOffice({ defaultCounty }: { defaultCounty?: string }) {
  const list = presets();
  const counties = offices().map((o) => o.county);
  const [county, setCounty] = useState(defaultCounty && counties.includes(defaultCounty) ? defaultCounty : list[0]!.county);
  const [text, setText] = useState(list[0]!.text);
  const [channel, setChannel] = useState<Channel>(list[0]!.channel);
  const sort = (c: string, t: string, ch: Channel): OfficeResult => {
    const caseIds = hearings.filter((h) => h.county === c).map((h) => h.case);
    const consultants = benchRows().map((r) => String(r.cells.A));
    return classifyOfficeReply(t, { county: c, caseIds, consultants, channel: ch });
  };
  // The first example is sorted on open, so the result area shows what the rule does at once.
  const [result, setResult] = useState<OfficeResult | null>(() => sort(list[0]!.county, list[0]!.text, list[0]!.channel));

  const run = (c = county, t = text, ch = channel): void => {
    setResult(sort(c, t, ch));
  };

  const proposals = (result?.proposals ?? []) as Proposal[];

  return (
    <div data-testid="try-office" className="@3xl:grid @3xl:grid-cols-2 @3xl:[&>.l-block]:border-t-0! @3xl:[&>.l-block+.l-block]:shadow-[inset_1px_0_0_var(--border)]!">
      <Block title="The message">
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Examples">
            {list.map((p, i) => (
              <Button
                key={p.label}
                size="sm"
                variant="secondary"
                data-testid={`try-office-preset-${i + 1}`}
                onClick={() => {
                  setCounty(p.county);
                  setText(p.text);
                  setChannel(p.channel);
                  run(p.county, p.text, p.channel);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <label className="flex flex-col gap-2">
              <span className="text-body font-semibold text-ink">Office</span>
              <select data-testid="try-office-county" value={county} onChange={(e) => setCounty(e.target.value)} className={SELECT}>
                {counties.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-body font-semibold text-ink" id="try-office-channel">
                How it came
              </span>
              <SegmentedControl<Channel>
                label="How it came"
                value={channel}
                onValueChange={setChannel}
                options={[
                  { value: 'email', label: 'In writing', testId: 'try-office-channel-email' },
                  { value: 'phone note', label: 'By phone', testId: 'try-office-channel-phone' },
                ]}
              />
            </div>
          </div>
          <Field label="What the office said">
            <TextArea data-testid="try-office-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} className="resize-y" style={{ lineHeight: '20px' }} />
          </Field>
          <p className="l-small l-muted l-p" data-testid="try-office-context">
            The rule reads it with {county}’s {hearings.filter((h) => h.county === county).length} hearings and the {benchRows().length} consultants as context.
          </p>
          <div>
            <Button variant="primary" data-testid="try-office-run" icon={<Play aria-hidden className="size-4" />} onClick={() => run()}>
              Sort the message
            </Button>
          </div>
        </div>
      </Block>
      <Block title="What the rule suggests">
        <div data-testid="try-office-result" aria-live="polite" style={{ display: 'grid', gap: 12 }}>
          {result ? (
            <>
              <State tone={result.hold ? 'danger' : proposals.length ? 'ok' : 'warn'} testId="try-office-kind">
                {result.hold ? 'Hold: no notice goes' : proposals.length ? 'Suggestion ready' : 'For a person'}
              </State>
              <p className="l-body l-p">
                <span className="l-strong">{OFFICE_KINDS[result.kind] ?? result.kind}.</span> <span className="l-ink2">{plain(result.reason)}</span>
              </p>
              {proposals.length ? (
                <ul className="l-checks">
                  {proposals.map((p) => (
                    <li key={`${p.tab}${p.column}${p.appliesTo ?? ''}`} className="l-check">
                      <span className="l-check-name">
                        <span className="l-small l-muted">
                          {p.header ? sentenceCase(p.header.replace(/\s*\(.*$/, '')) : 'A cell'}
                          {p.appliesTo ? `, for ${p.appliesTo}` : ''}
                        </span>
                        <span className="l-p l-strong" style={{ maxWidth: 420 }}>
                          {plain(p.value)}
                        </span>
                        <details className="l-details">
                          <summary>Why, and the cell</summary>
                          <span className="l-small l-ink2 l-p" style={{ display: 'block', maxWidth: 420 }}>
                            {p.why ? `${sentenceCase(p.why)} ` : ''}
                            <span className="l-mono">
                              {p.tab} {p.column}
                            </span>
                          </span>
                        </details>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="l-small l-ink2 l-p">Nothing to type by rule. A person reads it and decides.</p>
              )}
              <p className="l-small l-muted l-p">The rule only suggests. A person types each change on the Offices tab.</p>
            </>
          ) : (
            <p className="l-small l-ink2 l-p">Pick an example or type a message, then sort it.</p>
          )}
        </div>
      </Block>
    </div>
  );
}
