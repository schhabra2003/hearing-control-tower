/**
 * The command palette (Ctrl K or Cmd K): pages, hearings, offices, consultants, cells and commands.
 * The entries, the ranking and the five-per-group cap are the app's own. The view is drawn with the
 * Command parts adapted from the 21st.dev component "Command Menu" by uvain
 * (https://21st.dev/r/uvain/command-menu-palette). Every entry comes from the typed data layer.
 */

import { Building2, FileSpreadsheet, Scale, TerminalSquare, User, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { benchRows, hearingByRow, hearings, offices } from '@/lib/data';
import { dateShort, sheetTime } from '@/lib/format';
import { navigate, type PaletteEntry } from '@/lib/router';
import { useReturnFocus } from '@/lib/returnFocus';
import { getSession } from '@/lib/store';
import { checkRows, checkSummary, statusOf } from '@/layout/model';
import { consultantHref } from '@/components/hearing/ConsultantLink';
import { CommandDialog, CommandGroup, CommandItem } from './Command';
import { NAV } from './nav';

interface Entry {
  id: string;
  group: string;
  icon: LucideIcon;
  title: string;
  /** A hearing's case number, drawn in mono before the title. */
  caseId?: string;
  sub?: string;
  /** A hearing's status as the sheet prints it, drawn as a chip. */
  status?: string;
  words: string[];
  shortcut?: string;
  to?: string;
  run?: () => void;
}

const LATER = 'Later, not built';
const GROUP_ORDER = ['Hearings', 'Offices', 'Consultants', 'Pages', 'Commands', LATER];
const CELL = /^\s*(?:hearings\s+)?([A-Za-z]{1,3})(\d{1,4})\s*$/i;

/** Small words a person types that say nothing about the page: "start the 9:00 pass" matches on start, 9, 00, pass. */
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'for', 'my', 'our', 'and', 'do', 'i', 'is', 'it', 'me', 'show', 'open', 'go', 'page']);
const norm = (x: string): string => x.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const split = (x: string): string[] => norm(x).split(/[\s,.:;()/-]+/).filter(Boolean);
/** Long descriptions (an integration's examples) would match every query; only short words rank. */
const MAX_WORDS = 48;

/**
 * Ranking: the whole query at the start of the title or a keyword first, then inside one, then every
 * word of the query starting a word of the title or a keyword, then (titles only) the letters in
 * order. Season-one items outrank the later pages at equal match.
 */
function score(e: Entry, query: string): number {
  const qy = norm(query);
  const hay = [e.title, ...e.words].filter((w) => w.length <= MAX_WORDS).map(norm);
  const later = e.group === LATER ? 0.05 : 0;
  if (hay.some((h) => h === qy)) return 1.1 - later;
  if (hay.some((h) => h.startsWith(qy))) return 1 - later;
  if (hay.some((h) => h.includes(qy))) return 0.7 - later;
  const tokens = split(qy);
  const meaningful = tokens.filter((t) => !STOP.has(t));
  const need = meaningful.length ? meaningful : tokens;
  const words = new Set(hay.flatMap(split));
  if (need.length && need.every((t) => [...words].some((w) => w.startsWith(t)))) return 0.6 - later;
  if (qy.length >= 4 && !qy.includes(' ')) {
    let i = 0;
    for (const ch of norm(e.title)) if (ch === qy[i]) i += 1;
    if (i === qy.length) return 0.1 - later;
  }
  return 0;
}

/** Plain words a person may type for a page of the sidebar, beside its label. */
const PAGE_WORDS: Record<string, string[]> = {
  today: ['home', 'at risk', 'what needs action'],
  'today-9am': ['start the 9:00 pass', 'morning pass', '9am'],
  'today-2pm': ['afternoon review', '2pm'],
  hearings: ['all hearings', 'list', 'status'],
  suggestions: ['proof links', 'proposals', 'reader suggestions', 'messages to check', 'accept', 'refuse'],
  offices: ['office', 'county office', 'process change', 'tesswick'],
  bench: ['consultants', 'who can take it', 'rates'],
  replies: ['consultant replies', 'yes all', 'text replies'],
  calendar: ['calendar file', 'ics', 'export calendar'],
  integrations: ['mailbox', 'email', 'connect', 'systems'],
  measures: ['kpi', 'measures', 'targets'],
  evidence: ['how do we know', 'tests', 'proof', 'complete'],
  how: ['priorities', 'first next later', 'how done is proven', 'five checks'],
  ai: ['ai', 'agents', 'readers', 'what the agents do'],
  agents: ['api', 'json', 'agents'],
  'later-board': ['control tower', 'replay'],
  'later-scale': ['scale', 'simulation', 'volume'],
  'later-business': ['cost', 'savings', 'money', 'budget', 'business case'],
  'later-counties': ['add a county', 'new county', 'playbook'],
  'later-checks': ['tests', 'engine checks'],
};

export function CommandPalette({ open, onOpenChange, entries }: { open: boolean; onOpenChange: (o: boolean) => void; entries: PaletteEntry[] }) {
  const [q, setQ] = useState('');
  const onCloseAutoFocus = useReturnFocus(open);
  const close = (): void => {
    onOpenChange(false);
    setQ('');
  };
  const go = (to: string): void => {
    close();
    navigate(to);
  };
  const run = (f: () => void): void => {
    close();
    f();
  };

  const cellHit = useMemo(() => {
    const m = CELL.exec(q);
    if (!m) return null;
    const h = hearingByRow(Number(m[2]));
    return h ? { ref: `${m[1]!.toUpperCase()}${m[2]}`, h } : null;
  }, [q]);

  const all: Entry[] = useMemo(() => {
    const pages = NAV.flatMap((g) => g.items.map((it) => ({ it, later: !!g.later })));
    const fromEntries = (group: string, icon: LucideIcon) =>
      entries
        .filter((e) => e.group === group)
        .map((e): Entry => ({ id: e.id, group, icon, title: e.label, words: [e.label, ...(e.keywords ?? [])], shortcut: e.shortcut, to: e.to, run: e.run }));
    const list: Entry[] = [
      ...hearings.map((h): Entry => {
        const sum = checkSummary(checkRows(h, getSession()));
        return {
          id: `hearing-${h.case}`,
          group: 'Hearings',
          icon: Scale,
          title: h.property,
          caseId: h.case,
          sub: `${dateShort(h.date)}, ${sheetTime(h.time)}; ${statusOf(h).label}, ${sum.done} of ${sum.total} checks done`,
          words: [h.case, h.property, h.county, String(h.consultant ?? '')],
          to: `/hearings?open=${h.case}`,
        };
      }),
      ...offices().map((o): Entry => ({ id: `office-${o.slug}`, group: 'Offices', icon: Building2, title: `${o.county} office`, words: [o.county, 'office'], to: `/offices/${o.slug}` })),
      ...benchRows().map((r): Entry => {
        const n = String(r.cells.A);
        const href = consultantHref(n);
        return { id: `consultant-${r.row}`, group: 'Consultants', icon: User, title: n, sub: href ? 'The page the consultant sees on a phone' : 'On the Bench', words: [n], to: href ? href.slice(1) : '/bench' };
      }),
      ...pages.map(({ it, later }): Entry => ({ id: `page-${it.id}`, group: later ? LATER : 'Pages', icon: it.icon, title: it.label, words: [it.label, ...(PAGE_WORDS[it.id] ?? [])], shortcut: it.keys, to: it.to })),
      ...fromEntries('Pages', FileSpreadsheet),
      ...fromEntries('Commands', TerminalSquare),
    ];
    // One entry per id: a later entry with the same id (the Integrations page is both a sidebar item
    // and an entry of its own) adds its words to the first, so React keys stay unique.
    const byId = new Map<string, Entry>();
    for (const e of list) {
      const had = byId.get(e.id);
      if (had) had.words = [...had.words, ...e.words];
      else byId.set(e.id, { ...e, words: [...e.words] });
    }
    return [...byId.values()];
  }, [entries]);

  const groups = useMemo(() => {
    const query = q.trim();
    // A case number names one hearing: show that hearing only.
    const exactCase = /^[a-z]{2}-\d{3}$/i.test(query) ? all.find((e) => e.caseId?.toLowerCase() === query.toLowerCase()) : undefined;
    if (exactCase) return [{ g: 'Hearings', items: [exactCase] }];
    const scored = all
      .map((e) => ({ e, s: query ? score(e, query) : 1 }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s);
    const best = (g: string): number => scored.find((z) => z.e.group === g)?.s ?? 0;
    return GROUP_ORDER.map((g) => ({ g, items: scored.filter((x) => x.e.group === g).slice(0, query ? 5 : undefined).map((x) => x.e) }))
      .filter((x) => x.items.length > 0)
      .sort((x, y) => (query ? best(y.g) - best(x.g) : 0));
  }, [all, q]);

  const pick = (e: Entry): void => (e.to ? go(e.to) : e.run ? run(e.run) : undefined);

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
      label="Command palette"
      testId="cmdk"
      inputTestId="cmdk-input"
      value={q}
      onValueChange={setQ}
      placeholder="Search hearings, offices, cells or commands"
      empty={null}
      onCloseAutoFocus={onCloseAutoFocus}
      shouldFilter={false}
    >
      {cellHit ? (
        <CommandGroup heading="Cells">
          <CommandItem
            value={`cell-${cellHit.ref}`}
            testId={`cmdk-item-cell-${cellHit.ref}`}
            icon={<FileSpreadsheet aria-hidden />}
            hint={`Row ${cellHit.h.row}: ${cellHit.h.case}, ${cellHit.h.property}`}
            onSelect={() => go(`/hearings/${cellHit.h.case}`)}
          >
            {`Hearings ${cellHit.ref}`}
          </CommandItem>
        </CommandGroup>
      ) : null}
      {!cellHit && groups.length === 0 ? (
        <p role="status" data-testid="cmdk-empty" className="px-4 py-10 text-center text-body text-muted">
          No match for “{q.trim()}”. Try a case such as AX-107, an office, “start the 9:00 pass”, “cost” or “export calendar”.
        </p>
      ) : null}
      {groups.map(({ g, items }) => (
        <CommandGroup key={g} heading={g}>
          {items.map((e) => (
            <CommandItem
              key={e.id}
              value={e.id}
              testId={`cmdk-item-${e.id}`}
              icon={<e.icon aria-hidden />}
              hint={e.sub}
              shortcut={e.shortcut}
              onSelect={() => pick(e)}
            >
              {e.caseId ? <span className="mr-2 tabular-nums text-small text-ink-2">{e.caseId}</span> : null}
              {e.title}
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
    </CommandDialog>
  );
}
