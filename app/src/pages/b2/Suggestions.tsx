import { ChevronRight, ClipboardPaste, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Suggestion } from '@/lib/data';
import { hearingByCase } from '@/lib/data';
import { decided, needOf, proposalCounts, waiting } from '@/lib/decisions';
import { dateShort, plural } from '@/lib/format';
import { navigate, setQuery, type PageProps } from '@/lib/router';
import { proposalKey, useSession } from '@/lib/store';
import { changeCounts } from '@/lib/officeChanges';
import { questionGroups } from '@/lib/today';
import { cellLabel } from '@/lib/cellLabels';
import { PASTE_GROUPS, pasteDecisionRows, type PasteDecisionRow } from '@/lib/paste';
import { PasteDecision } from './Paste';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExportJsonButton } from '@/components/ui/ExportJsonButton';
import { exportSuggestions } from '@/lib/agentData';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChecksCell } from '@/components/hearing/ChecksCell';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { sectionStarting, suggestionsByTab, type SuggestionTab } from './lib';
import { SheetText } from './components/SheetText';
import { SuggestionCard } from './components/SuggestionCard';
import { HandedToPerson, PersonAdded } from './components/SuggestionLists';

const TABS: { id: SuggestionTab; label: string }[] = [
  { id: 'gates', label: 'Proof links' },
  { id: 'cells', label: 'Other cells' },
  { id: 'offices', label: 'Office changes' },
  { id: 'repeats', label: 'Repeats' },
  { id: 'questions', label: 'Questions' },
];

/** The heading row of the sheet that opens each list: shown behind Details. */
const INTRO: Record<SuggestionTab, string | null> = {
  gates: null,
  cells: 'Proposals for the cells the sheet gained',
  offices: 'Proposals for the Offices tab',
  repeats: 'Repeats and questions',
  questions: 'Repeats and questions',
};

type Tab = SuggestionTab | 'pasted';
const isTab = (v: string | null, pasted: boolean): v is Tab => TABS.some((t) => t.id === v) || (pasted && v === 'pasted');

/** The rows of the pasted messages a person decides, with Accept and Refuse, grouped as on the paste page. */
function PastedList() {
  const proposals = useSession((s) => s.proposals);
  const rows = pasteDecisionRows();
  const groups = PASTE_GROUPS.map((g) => ({ g, list: rows.filter((x) => x.group === g.id) })).filter((x) => x.list.length);
  const line = (x: PasteDecisionRow): string => {
    const v = (x.row[2] ?? '').replace(/^for a person:\s*/i, '');
    return x.group === 'proof' ? 'File this half. The gate stays open.' : v.startsWith('the link to this message') ? `The link to message ${x.row[3]}` : v.charAt(0).toUpperCase() + v.slice(1);
  };
  return (
    <div className="flex flex-col gap-3" data-testid="pasted-list">
      {groups.map(({ g, list }) => (
        <section key={g.id} aria-label={g.title} className="scroll-mt-32 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-e1">
          <h3 className="border-b border-border px-4 py-2.5 text-body font-semibold text-ink">{g.title}</h3>
          <ul>
            {list.map((x) => (
              <li key={x.n} data-testid={`pasted-row-${x.n}`} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1 text-body text-ink">
                  <p>
                    <span className="font-medium">{(x.row[0] ?? '').replace(/^Office: /, '')}</span>
                    <span className="text-ink-2"> · {cellLabel(x.row[1] ?? '')} · message {x.row[3]}</span>
                  </p>
                  <p className="mt-0.5"><span className="text-ink-2">Proposed: </span>{line(x)}</p>
                </div>
                <PasteDecision n={x.n} group={x.group} r={x.row} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-body text-ink-2">
        {rows.filter((x) => !proposals[proposalKey('paste', x.n)]).length} of {rows.length} still to decide. The rest of the pasted rows need no decision; they are on the <a className="font-medium text-accent hover:underline" href="#/suggestions/paste">paste page</a>.
      </p>
    </div>
  );
}

/** The rows of a list that need no decision, counted for the line under the list title. */
function noDecision(rows: Suggestion[]): { count: number; detail: string } {
  const n = (k: ReturnType<typeof needOf>) => rows.filter((s) => needOf(s) === k).length;
  const parts = [
    n('on-sheet') ? `${n('on-sheet')} already on the sheet` : '',
    n('ask-version') ? `${n('ask-version')} to ask for a version` : '',
    n('repeat') ? plural(n('repeat'), 'repeat') : '',
    n('info') ? `${n('info')} for information` : '',
    n('rule-says') ? `${n('rule-says')} to read, with nothing to accept` : '',
    n('nothing') ? `${n('nothing')} with nothing to type` : '',
    n('hold') ? `${plural(n('hold'), 'office change')} decided on the Offices page` : '',
  ].filter(Boolean);
  return { count: rows.length - n('decide'), detail: parts.join(', ') };
}

/** The sticky progress header: the one count of waiting proposals, the same words as the sidebar and the pass. */
function Progress() {
  const proposals = useSession((s) => s.proposals);
  const pasted = useSession((s) => s.pasted === true);
  const c = proposalCounts(proposals, pasted);
  const mine = (k: string): boolean => k.startsWith('suggestion:') || (pasted && k.startsWith('paste:'));
  const accepted = Object.entries(proposals).filter(([k, d]) => mine(k) && d.decision === 'accepted').length;
  const refused = Object.entries(proposals).filter(([k, d]) => mine(k) && d.decision === 'refused').length;
  const done = c.total ? (c.total - c.waiting) / c.total : 0;
  return (
    <div data-testid="suggestions-summary" className="z-[5] rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 sm:sticky sm:top-[var(--topbar-height)]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <p data-testid="summary-waiting" className="text-body text-ink">
          <span className="text-figure mr-2">{c.waiting}</span>
          {c.waiting === 1 ? 'suggestion waits' : 'suggestions wait'}, {c.gateLinks} of them proof links for a check
          {pasted ? (
            <>
              {', '}
              <a href="#/suggestions?filter=pasted" data-testid="summary-pasted" className="text-accent underline underline-offset-2">
                {c.pastedWaiting} from pasted messages
              </a>
            </>
          ) : null}
        </p>
        <p data-testid="summary-accepted" className="text-body text-ink-2"><span className="font-semibold text-ink tabular-nums">{accepted}</span> accepted</p>
        <p data-testid="summary-refused" className="text-body text-ink-2"><span className="font-semibold text-ink tabular-nums">{refused}</span> refused</p>
        <p className="ml-auto text-body text-ink-2">Kept in this browser. A person types each on the sheet.</p>
      </div>
      {done > 0 ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-[width] duration-[var(--dur-step)]" style={{ width: `${done * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
}

/** One hearing's rows, open while something waits, collapsed once it is done. */
function HearingGroup({ caseId, list }: { caseId: string; list: Suggestion[] }) {
  const proposals = useSession((s) => s.proposals);
  const h = hearingByCase(caseId);
  const left = waiting(list, proposals).length;
  // Open while something waits or was decided here, so a decided row keeps its Undo after leaving the page.
  const [open, setOpen] = useState(left > 0 || list.some((s) => decided(s, proposals)));
  const ordered = [...list].sort((a, b) => Number(decided(a, proposals)) - Number(decided(b, proposals)));
  return (
    <section aria-labelledby={`case-${caseId}`} className="scroll-mt-32 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-e1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
        <button type="button" aria-expanded={open} aria-controls={`case-body-${caseId}`} aria-label={`${open ? 'Hide' : 'Show'} the proposals for ${caseId}`} onClick={() => setOpen((o) => !o)} className="-m-2 grid size-8 place-items-center rounded-[var(--radius-control)] text-muted transition-colors duration-[var(--dur-color)] hover:bg-surface-2 hover:text-ink">
          <ChevronRight aria-hidden className={`size-4 transition-transform duration-[var(--dur-pop)] ${open ? 'rotate-90' : ''}`} />
        </button>
        <h3 id={`case-${caseId}`} className="m-0 flex min-w-0 flex-wrap items-center gap-x-3">
          <a href={`#/hearings/${caseId}`} className="inline-flex min-h-6 items-center text-body font-medium tabular-nums text-ink hover:text-accent hover:underline">{caseId}</a>
          {h ? <span className="text-body font-normal text-ink">{h.property}</span> : null}
          {h?.date ? <span className="text-body font-normal text-ink-2">{dateShort(h.date)}</span> : null}
        </h3>
        {h ? <ChecksCell hearing={h} showNext={false} className="ml-2" /> : null}
        <span className={`ml-auto text-body ${left ? 'font-medium text-ink' : 'text-ink-2'}`}>{left ? `${left} to decide` : 'Done'}</span>
      </div>
      {open ? (
        <div id={`case-body-${caseId}`} className="flex flex-col border-t border-border">
          {ordered.map((s) => <SuggestionCard key={s.row} s={s} inGroup />)}
        </div>
      ) : null}
    </section>
  );
}

function GateLinks({ rows, showAll }: { rows: Suggestion[]; showAll: boolean }) {
  const proposals = useSession((s) => s.proposals);
  const shown = showAll ? rows : rows.filter((s) => needOf(s) === 'decide');
  const byCase = useMemo(() => {
    const m = new Map<string, Suggestion[]>();
    for (const s of shown) m.set(s.case, [...(m.get(s.case) ?? []), s]);
    return [...m.entries()];
  }, [shown]);
  const left = waiting(rows, proposals).length;
  return (
    <div className="flex flex-col gap-3">
      {left === 0 && !showAll ? (
        <Card>
          <EmptyState icon={<ShieldCheck aria-hidden className="size-6" />} title="Every proof link has a yes or no" description="Type each one in column G of the Reader suggestions tab." />
        </Card>
      ) : null}
      {byCase.map(([caseId, list]) => <HearingGroup key={caseId} caseId={caseId} list={list} />)}
      <HandedToPerson />
      <PersonAdded />
    </div>
  );
}

/** Reader suggestions: every proposal on the tab, accept or refuse, in five lists. */
export function Suggestions({ query }: PageProps) {
  const byTab = useMemo(() => suggestionsByTab(), []);
  const proposals = useSession((s) => s.proposals);
  const pasted = useSession((s) => s.pasted === true);
  const changes = useSession((s) => s.changes);
  const [showAll, setShowAll] = useState(false);
  const f = query.get('filter');
  const tab: Tab = isTab(f, pasted) ? f : 'gates';
  const tabs = pasted ? [...TABS, { id: 'pasted' as const, label: 'Pasted' }] : TABS;
  const meta = tabs.find((t) => t.id === tab)!;
  const rows = tab === 'pasted' ? [] : byTab[tab];
  const intro = tab !== 'pasted' && INTRO[tab] ? sectionStarting(INTRO[tab]!) : undefined;
  const pastedLeft = pasted ? pasteDecisionRows().filter((x) => !proposals[proposalKey('paste', x.n)]).length : 0;
  const left = tab === 'pasted' ? pastedLeft : waiting(rows, proposals).length;
  const other = noDecision(rows);
  const listed = showAll ? rows : rows.filter((s) => needOf(s) === 'decide' || needOf(s) === 'hold' || needOf(s) === 'rule-says');
  const nothing = showAll ? [] : rows.filter((s) => needOf(s) === 'nothing');
  const cc = changeCounts({ changes, pasted });
  const qs = questionGroups();
  const qHearings = qs.reduce((n, g) => n + g.hearings.length, 0);

  return (
    <div data-testid="page-suggestions" className="@container flex flex-col gap-6">
      <PageHeader
        title="Check messages"
        lede="The readers and the rules suggest a proof link or a value from each message. The coordinator decides each row, then types it on the Reader suggestions tab."
        actions={
          <>
            <ExportJsonButton name={`reader-suggestions-${tab}.json`} testId="export-json-suggestions" rows={() => { const shown = new Set((tab === 'gates' && !showAll ? rows.filter((s) => needOf(s) === 'decide') : showAll ? rows : [...listed, ...nothing]).map((s) => s.row)); return exportSuggestions(proposals).filter((r) => shown.has(r.row)); }} />
            <Button variant="primary" size="md" data-testid="open-paste" icon={<ClipboardPaste aria-hidden className="size-[18px]" />} onClick={() => navigate('/suggestions/paste')}>
              Paste new messages
            </Button>
          </>
        }
      />

      <Progress />

      <div className="flex flex-col gap-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <SegmentedControl<Tab>
            label="Lists of proposals"
            value={tab}
            onValueChange={(v) => setQuery('filter', v === 'gates' ? null : v)}
            options={tabs.map((x) => ({ value: x.id, label: x.label, count: x.id === 'pasted' ? pastedLeft : x.id === 'repeats' ? byTab.repeats.filter((s) => needOf(s) === 'repeat').length : waiting(byTab[x.id], proposals).length, testId: `suggestions-tab-${x.id}` }))}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-h2 text-ink">{meta.label}</h2>
            <p className="mt-1 text-body text-ink-2">
              <span data-testid="tab-waiting" className="font-semibold text-ink">{left} {left === 1 ? 'suggestion waits' : 'suggestions wait'}.</span>
              {tab === 'offices' && cc.waiting.length ? (
                <span data-testid="tab-office-changes">
                  {' '}
                  {cc.waiting.length === 1 ? '1 office change waits' : `${cc.waiting.length} office changes wait`}; decide {cc.waiting.length === 1 ? 'it' : 'them'} on the <a className="font-medium text-accent hover:underline" href="#/offices">Offices page</a>.
                </span>
              ) : null}
              {tab === 'questions' ? <span data-testid="tab-questions"> {plural(qs.length, 'question')} to answer today, on {plural(qHearings, 'hearing')}. Send the answers from the <a className="font-medium text-accent hover:underline" href="#/today/9am?filter=answers">9:00 a.m. pass</a>.</span> : null}
              {other.count && tab !== 'pasted' ? <span title={other.detail}> {other.count} more {other.count === 1 ? 'row needs' : 'rows need'} no decision.</span> : null}
            </p>
          </div>
          <SegmentedControl<'asks' | 'all'>
            label="Rows to show"
            size="sm"
            value={showAll ? 'all' : 'asks'}
            onValueChange={(v) => setShowAll(v === 'all')}
            options={[
              { value: 'asks', label: 'To decide', testId: 'gates-show-asks' },
              { value: 'all', label: 'Every row', count: rows.length, testId: 'gates-show-all' },
            ]}
          />
        </div>
        {intro ? (
          <details className="text-body text-ink-2">
            <summary className="cursor-pointer font-medium text-ink-2 hover:text-ink">Details</summary>
            <SheetText as="p" text={intro.text} cell={`Reader suggestions A${intro.row}`} className="mt-2 max-w-[80ch] leading-relaxed" />
            {other.detail ? <p className="mt-1">No decision: {other.detail}.</p> : null}
          </details>
        ) : null}

        {tab === 'pasted' ? (
          <PastedList />
        ) : tab === 'gates' ? (
          <GateLinks rows={rows} showAll={showAll} />
        ) : listed.length || nothing.length ? (
          <div className="flex flex-col gap-2">
            {listed.map((s) => <SuggestionCard key={s.row} s={s} />)}
            {nothing.length ? (
              <section aria-labelledby="nothing-to-type" className="mt-2 flex flex-col gap-2" data-testid="nothing-to-type">
                <h3 id="nothing-to-type" className="text-body font-semibold text-ink">Nothing to type</h3>
                {nothing.map((s) => <SuggestionCard key={s.row} s={s} />)}
              </section>
            ) : null}
          </div>
        ) : (
          <Card>
            <EmptyState title="Nothing to decide in this list" description="Choose Every row to see what the readers noted." />
          </Card>
        )}
      </div>
    </div>
  );
}
