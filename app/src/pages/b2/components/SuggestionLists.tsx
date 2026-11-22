import { ChevronRight, UserRound } from 'lucide-react';
import { SourceTag } from '@/components/ui/SourceTag';
import { sectionStarting, type Section } from '../lib';
import { SheetText } from './SheetText';

const text = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

/** The messages the two readers handed to a person: column D the message, E the sender, F why. */
export function HandedToPerson() {
  const s = sectionStarting('Messages handed to a person');
  if (!s) return null;
  return (
    <section aria-labelledby="handed-heading" data-testid="suggestions-handed" className="rounded-[var(--radius-card)] border border-warn/30 bg-warn-bg/60 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <UserRound aria-hidden className="mt-0.5 size-5 shrink-0 text-warn" />
        <div className="min-w-0 flex-1">
          <h3 id="handed-heading" className="text-h3 text-ink">Messages handed to a person</h3>
          <p className="mt-1 text-body leading-relaxed text-ink-2">
            {s.text} <SourceTag>{`Reader suggestions A${s.row}`}</SourceTag>
          </p>
        </div>
      </div>
      {s.rows.length ? (
        <ul className="mt-4 flex flex-col gap-2">
          {s.rows.map((r) => (
            <li key={r.row} className="grid gap-x-4 gap-y-1 rounded-[var(--radius-quote)] bg-surface px-4 py-3 @3xl:grid-cols-[140px_1fr]">
              <p className="text-body text-ink">
                <span className="font-semibold">Message {text(r.cells.D)}</span>
                <br />
                <span className="text-ink-2">{text(r.cells.E)}</span>
              </p>
              <p className="text-body leading-relaxed text-ink">{text(r.cells.F)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ListDisclosure({ s, title, testId }: { s: Section; title: string; testId: string }) {
  return (
    <details data-testid={testId} className="group rounded-[var(--radius-card)] bg-surface shadow-e1">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[var(--radius-card)] px-5 py-4 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted transition-transform duration-[var(--dur-pop)] group-open:rotate-90" />
        <span className="min-w-0 flex-1 text-body font-medium text-ink">{title}</span>
        <span className="text-body text-ink-2 tabular-nums">{s.rows.length} rows</span>
      </summary>
      <div className="overflow-x-auto px-5 pb-5">
        <SheetText as="p" text={s.text} cell={`Reader suggestions A${s.row}`} className="mb-3 max-w-[100ch] text-body leading-relaxed text-ink-2" />
        <table className="w-full min-w-[720px] border-collapse text-left text-body">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="text-eyebrow text-muted">
              <th scope="col" className="py-2 pr-4 font-semibold">Case</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Cell</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Message</th>
              <th scope="col" className="py-2 pr-4 font-semibold">From</th>
              <th scope="col" className="py-2 font-semibold">The words it relies on</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.row} className="border-t border-border align-top">
                <th scope="row" className="py-2.5 pr-4 text-left font-normal tabular-nums text-small whitespace-nowrap text-ink">{text(r.cells.A)}</th>
                <td className="py-2.5 pr-4 text-ink">{text(r.cells.B)}</td>
                <td className="py-2.5 pr-4 text-ink-2">{text(r.cells.D)}</td>
                <td className="py-2.5 pr-4 text-ink-2">{text(r.cells.E)}</td>
                <td className="py-2.5 text-ink">{text(r.cells.F)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** What a person added at the 9:00 a.m. pass in the example, and what each case-file receipt names. */
export function PersonAdded() {
  const lists = [
    { prefix: 'The 9:00 a.m. pass in the example', title: 'Filled by a person at 9:00', testId: 'suggestions-person-first' },
    { prefix: 'Missed by the readers', title: 'Missed by the readers', testId: 'suggestions-person-missed' },
    { prefix: 'The case files:', title: 'What each receipt names', testId: 'suggestions-case-files' },
  ]
    .map((l) => ({ ...l, s: sectionStarting(l.prefix) }))
    .filter((l): l is typeof l & { s: Section } => !!l.s && l.s.rows.length > 0);
  if (!lists.length) return null;
  return (
    <section aria-labelledby="person-added-heading" className="flex flex-col gap-3">
      <h3 id="person-added-heading" className="text-h2-card text-ink">What a person added in the example</h3>
      {lists.map((l) => (
        <ListDisclosure key={l.testId} s={l.s} title={l.title} testId={l.testId} />
      ))}
    </section>
  );
}
