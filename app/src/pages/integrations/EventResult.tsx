/**
 * What a simulated event shows, read from the exports: the packet message, the rows the paste path
 * gives, the Reader suggestions rows it replays, the reply rule's and office rule's answers, and
 * rows of other sheet tabs. Real tables with captions and th scope, so an agent reads the same.
 */

import { OFFICE_KINDS } from '@engine/src/office_rule.js';
import type { ReactNode } from 'react';
import type { GateKey } from '@/types/data';
import { PASTE_GROUPS, pasteCount } from '@/lib/paste';
import { PASTE_WORDS } from '@/pages/b2/paste';
import { cn } from '@/lib/cn';
import type { SimEvent } from './integrations';
import type { EventResult as Result } from './simulate';

/** The five checks in plain words. */
const CHECK: Record<GateKey, string> = {
  G1: 'Date confirmed by the office',
  G2: 'Consultant said yes',
  G3: "Office has our consultant's name",
  G4clerk: 'Files sent and received (clerk)',
  G4consultant: 'Files sent and received (consultant)',
  G5: 'Result recorded',
};

/** The cell heading of a row, without its cell reference and gate code. */
function plainCell(b: string, gate: GateKey | null): string {
  if (gate) return CHECK[gate];
  const t = b
    .replace(/^(Hearings|Offices|Availability|Bench) [A-Z]{1,3}\d*:\s*/, '')
    .replace(/:\s*(Hearings|Offices) [A-Z]{1,3}$/, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : t;
}

/** The proposal in words: "close" and the codes said plainly, the rest as the sheet writes it. */
export function plainProposal(c: string): string {
  if (c === 'close') return 'Close the check with this message';
  if (c.startsWith('file this half')) return 'File this half; the check stays open';
  if (c.startsWith('do not close')) return `Do not close: ${c.replace(/^do not close:\s*/, '')}`;
  if (c.startsWith('leave open')) return 'Leave open';
  if (c.startsWith('names no version')) return 'Names no version: a person asks for it';
  if (c.startsWith('REPEAT')) return 'Repeat: the cell keeps its first link';
  if (c.startsWith('HOLD')) return 'Hold: no notice goes to this office until a person approves the change';
  if (c.startsWith('NOT READ')) return 'Not read: no recorded answer, a person reads it';
  if (c.startsWith('FOR A PERSON')) return 'For a person: the readers disagreed or could not place a passage';
  return c.replace(/^for a person:\s*/, 'For a person: ');
}

function Block({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} className="flex flex-col gap-2">
      <h4 className="text-small font-semibold text-ink">{title}</h4>
      {children}
    </section>
  );
}

const TH = 'px-3 py-2 text-left text-small font-medium text-muted';
const TD = 'px-3 py-2 align-top text-small text-ink';

function Table({ caption, head, rows, testId }: { caption: string; head: string[]; rows: ReactNode[][]; testId?: string }) {
  return (
    <div className="overflow-x-auto rounded-control border border-border bg-surface">
      <table data-testid={testId} className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-2">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className={cn(TD, 'text-left font-normal whitespace-nowrap tabular-nums text-ink-2')}>{c}</th>
                ) : (
                  <td key={j} className={cn(TD, j === 1 && typeof c === 'string' && c.length <= 14 && 'whitespace-nowrap')}>{c}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TAB_COLUMNS: Record<string, string[]> = {
  'Record check': ['A', 'B', 'D', 'H', 'I', 'J', 'K', 'L'],
  'Notices on file': ['A', 'B', 'D', 'G', 'I', 'O'],
};

export function EventResultView({ e, r }: { e: SimEvent; r: Result }) {
  const kinds = OFFICE_KINDS as Record<string, string>;
  return (
    <div data-testid={`event-result-${e.id}`} className="flex flex-col gap-4">
      {r.messages.length ? (
        <Block title={r.messages.length === 1 ? 'The example message' : 'The example messages'}>
          <ul className="flex flex-col gap-3">
            {r.messages.map((m) => (
              <li key={m.id} className="border-l-2 border-border pl-3">
                <p className="text-small text-muted">
                  Message {m.id}, {m.sender}, {m.channel}
                </p>
                <p className="mt-1 max-w-[var(--measure)] text-body text-ink">{m.body}</p>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {r.replies.length ? (
        <Block title="The reply rule, run in this browser" testId={`event-replies-${e.id}`}>
          <Table
            caption="Replies run through the reply rule"
            head={['Reply', 'From', 'Text', 'Answers', 'The rule']}
            rows={r.replies.map((x) => [
              x.id,
              x.row.reply.from,
              <span className="font-mono whitespace-nowrap">{x.row.reply.text}</span>,
              `${x.row.sent.kind === 'offer' ? 'An offer of hearing' : x.row.sent.kind} ${(x.row.sent.open ?? x.row.sent.held ?? []).join(', ')}`,
              x.out.byRule ? `Filed by rule: ${x.out.action ?? ''}${x.out.numbers.length ? ` for hearing ${x.out.numbers.join(', ')}` : ''}` : `To a person: ${x.out.why}`,
            ])}
          />
        </Block>
      ) : null}

      {r.office ? (
        <Block title="The office rule, run in this browser" testId={`event-office-${e.id}`}>
          <p className="max-w-[var(--measure)] text-body text-ink">
            <span className="font-medium">{kinds[r.office.kind] ?? r.office.kind}.</span> {r.office.reason}
            {r.office.hold ? ' A hold: no notice goes to this office until a person approves the change.' : ''}
          </p>
          {r.office.proposals.length ? (
            <details className="text-small text-ink-2">
              <summary className="cursor-pointer font-medium hover:text-ink">Sheet reference: {r.office.proposals.length} proposed {r.office.proposals.length === 1 ? 'cell' : 'cells'}</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {r.office.proposals.map((p, i) => (
                  <li key={i}>
                    <span className="font-mono">{p.tab} {p.column}</span>: {p.value}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Block>
      ) : null}

      {r.pasted.length && e.ref.paste === 'all' ? (
        <Block title="What the example file of new messages gives" testId={`event-pasted-${e.id}`}>
          <Table
            caption="Rows of the paste result by group"
            head={['Rows', 'Group', 'What a person does']}
            rows={PASTE_GROUPS.filter((g) => pasteCount(g) > 0).map((g) => [pasteCount(g), PASTE_WORDS[g.id].title, PASTE_WORDS[g.id].detail])}
          />
        </Block>
      ) : r.pasted.length ? (
        <Block title={`What the readers proposed for this message (${r.pasted.length})`} testId={`event-pasted-${e.id}`}>
          <Table
            caption="Rows the paste path gives for this message"
            head={['Row', 'Case or office', 'Check or fact', 'Proposal']}
            rows={r.pasted.map((x) => [x.n, x.row[0] || 'None', plainCell(x.row[1] ?? '', null) || 'None', plainProposal(x.row[2] ?? '')])}
          />
        </Block>
      ) : null}

      {r.readerRows.length ? (
        <Block title={`Proposals shown in Check messages (${r.readerRows.length})`} testId={`event-rows-${e.id}`}>
          <Table
            caption="Proposals this example shows in Check messages"
            head={['Row', 'Case', 'Check or fact', 'Proposal', 'From']}
            rows={r.readerRows.map((s) => [s.row, s.case, plainCell(s.cell, s.gate), plainProposal(s.proposal), s.from])}
          />
        </Block>
      ) : null}

      {r.tabRows ? (
        <Block title={`${r.tabRows.tab} tab, ${r.tabRows.rows.length} ${r.tabRows.rows.length === 1 ? 'row' : 'rows'}`} testId={`event-tab-${e.id}`}>
          <Table
            caption={`Rows of the ${r.tabRows.tab} tab`}
            head={['Row', ...(TAB_COLUMNS[r.tabRows.tab] ?? []).map((c) => r.tabRows!.headers[c]?.replace(/\s*\((?:formula|as the notice says)[^)]*\)/g, '') ?? c)]}
            rows={r.tabRows.rows.map((row) => [row.row, ...(TAB_COLUMNS[r.tabRows!.tab] ?? []).map((c) => (row.cells[c] === undefined ? '' : String(row.cells[c])))])}
          />
        </Block>
      ) : null}

      {r.printed.length ? (
        <Block title="The sheet's own next action" testId={`event-printed-${e.id}`}>
          <ul className="flex flex-col gap-2">
            {r.printed.map((p, i) => (
              <li key={i} className="max-w-[var(--measure)] text-body text-ink">
                <span className="font-medium">{p.case}, {p.property}:</span> {p.text}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
    </div>
  );
}
