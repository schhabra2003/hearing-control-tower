/**
 * Paste new messages (#/suggestions/paste, ?item=<message id>, ?show=decide, ?add=1),
 * split 5 + 7 on the shared regions (layout/Regions.tsx):
 * - Header: the one primary action. Before the read: "Read the example messages" or "Read the
 *   messages" ("Read with live AI" when the local server reads with a key). After it: "Copy N rows"
 *   with Download beside it.
 * - Summary: messages, proposals, waiting for a decision, not read.
 * - Toolbar: what to show (everything, or only what waits), and "Add a message" and "Start again".
 * - List: the messages, two lines each, with how they were read as one Badge.
 * - Detail: before the read, where messages are added (a file, the example, or one pasted message);
 *   during a live read, its progress; after it, what the readers proposed, grouped, each row with
 *   Accept and Refuse. Selecting a message shows only its proposals and its full text.
 *
 * The rows are the --paste command's, replayed from recorded answers (or read live by the local
 * server, lib/live.ts); every row shows at once, with no staged loading. 21st.dev sources: the run
 * steps after "ReUI trace - CSV import" by sean0205 (https://21st.dev/r/sean0205/reui-trace-15) and
 * "Steps" by mahmoudilyan (https://21st.dev/r/mahmoudilyan/steps); the
 * accept and refuse rows after "Approval Inbox" by aadixc0de (https://21st.dev/r/aadixc0de/approval-inbox).
 */

import { ArrowRight, Check, Copy, Download, FileJson, Play, Plus, RotateCcw, Undo2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cellLabel } from '@/lib/cellLabels';
import { copyText, downloadFile } from '@/lib/download';
import { datesTyped, dateMedium, plural } from '@/lib/format';
import { engine } from '@/lib/data';
import { navigate, type PageProps } from '@/lib/router';
import { actions, proposalKey, useSession } from '@/lib/store';
import { forgetServerRun, readOnServer, useLive, usd, type LiveMessage } from '@/lib/live';
import { ActionButton } from '@/components/ui/ActionButton';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { FileDropZone } from '@/components/ui/FileDropZone';
import { Progress } from '@/components/ui/Progress';
import { toast, undoByKey } from '@/components/ui/Toast';
import { EmptyState } from '@/components/feedback/EmptyState';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { Block, DetailRegion, ListRegion, Page, PageHeader, Seg, SheetRef, Src, Stat, Summary, Toolbar, Workspace, usePageState } from '@/layout/Regions';
import { Facts, PagerLinks, RecordTable, pagerOf, type RecordGroup, type RecordRow } from './components/RecordTable';
import { SheetText } from './components/SheetText';
import { PASTE_DECIDE, PASTE_GROUPS, PASTE_WORDS, pasteCell, pasteCount, pasteFiles, pasteGroupOf, pasteIsOverridden, pasteLinesPlain, pastePath, pasteSource, type PasteGroup } from './paste';

type Path = 'example' | 'recorded' | 'missing' | 'live' | 'failed' | 'pending' | 'waiting';

/** How a message is (or will be) read, as one Badge word and tone. */
const PATH: Record<Path, { word: string; tone: BadgeTone }> = {
  example: { word: 'Packet example', tone: 'neutral' },
  recorded: { word: 'Recorded answer', tone: 'neutral' },
  missing: { word: 'Not read', tone: 'warn' },
  live: { word: 'Read live', tone: 'ok' },
  failed: { word: 'Live read failed', tone: 'warn' },
  pending: { word: 'To read live', tone: 'neutral' },
  waiting: { word: 'Not read yet', tone: 'neutral' },
};

const NO_TYPED: Typed[] = [];
const NOT_READ = 'No reader answer is recorded for this message. Read it yourself.';

interface Typed {
  id: string;
  sender: string;
  body: string;
}

interface Msg {
  id: string;
  sender: string;
  channel: string;
  body: string;
  at: string | null;
  path: Path;
}

/** The messages in a dropped file: an array of messages, or an object with "messages". */
function messagesOf(json: unknown): Typed[] | null {
  const list = Array.isArray(json) ? json : json && typeof json === 'object' && Array.isArray((json as { messages?: unknown }).messages) ? (json as { messages: unknown[] }).messages : null;
  if (!list) return null;
  const text = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
  return list.map((m, i) => {
    const o = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>;
    return { id: text(o.id) || `file-${i + 1}`, sender: text(o.sender ?? o.from) || 'Sender not given', body: text(o.body ?? o.text) };
  });
}

/** "Fri, Jun 7, 2030, 12:15 p.m." from the message's own time, as written (no time zone change). */
function whenOf(at: string | null): string | null {
  if (!at) return null;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(at);
  if (!m) return null;
  const h = Number(m[2]);
  return `${dateMedium(m[1])}, ${h % 12 === 0 ? 12 : h % 12}:${m[3]} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}

/** "Jun 7, 12:15 p.m." for a list row. */
function whenShort(at: string | null): string | null {
  const w = whenOf(at);
  return w ? w.replace(/^\w{3}, /, '').replace(/, \d{4},/, ',') : null;
}

/** The message's first sentence, at most about 110 characters, for line 2 of a list row. */
function firstLine(body: string): string {
  const one = body.split('\n')[0]!.trim();
  const sentence = /^(.+?[.!?])(\s|$)/.exec(one)?.[1] ?? one;
  return sentence.length > 110 ? `${sentence.slice(0, 106).replace(/\s+\S*$/, '')}…` : sentence;
}

/** The heading of a pasted row in plain words: "Clerk has the files", "Old route still accepted". */
function rowTitle(r: string[]): string {
  return r[1] ? cellLabel(r[1]) : '';
}

/** What a person accepts on a pasted row, in plain words. */
function proposalWords(group: PasteGroup, r: string[]): string {
  const c = r[2] ?? '';
  if (group === 'proof') return 'The clerk has the files. Record this message as the clerk’s half; the consultant’s half stays open.';
  if (group === 'office') return `Approve the ${r[0] ?? ''} change`;
  const v = datesTyped(c.replace(/^for a person:\s*/i, ''));
  if (v.startsWith('the link to this message')) return `The link to message ${r[3]}${/in place of the link of message (\w+)/.exec(v) ? `, in place of the link to message ${/in place of the link of message (\w+)/.exec(v)![1]}` : ''}`;
  if (/^the number of the current version/.test(v)) return 'The version number the receipt calls “current”. Read it in the message.';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/** "Repeat of message 67: nothing to type." from the command's REPEAT text. */
function repeatLine(c: string): string {
  const m = /as message (\w+)/.exec(c);
  return m ? `Repeat of message ${m[1]}: nothing to type.` : 'A repeat: nothing to type.';
}

/** Accept or refuse one pasted row, kept as proposalKey('paste', n), with Undo. Also used on Proof links. */
export function PasteDecision({ n, group, r }: { n: number; group: PasteGroup; r: string[] }) {
  const d = useSession((s) => s.proposals[proposalKey('paste', n)]);
  const cell = pasteCell(r);
  const name = `${r[0] || 'row'}, ${rowTitle(r) || cell}, message ${r[3]}`;
  const acceptText = group === 'office' ? `Type your name in Offices AQ and the date in Offices AR.` : group === 'proof' ? `Paste the link in ${cell}.` : `Type it in ${cell}.`;
  if (d) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Badge tone={d.decision === 'accepted' ? 'ok' : 'neutral'} size="sm" title={d.decision === 'accepted' ? acceptText : `Type nothing in ${cell}.`}>
          {d.decision === 'accepted' ? 'Accepted' : 'Refused'}
        </Badge>
        <Button size="sm" variant="ghost" data-testid={`undo-paste-${n}`} aria-label={`Undo: ${name}`} icon={<Undo2 aria-hidden />} onClick={() => undoByKey(`paste:${n}`, () => actions.undoProposal('paste', n), `${d.decision === 'accepted' ? 'Accepted' : 'Refused'}: ${r[0] || 'row'}, ${rowTitle(r) || 'value'}`)}>
          Undo
        </Button>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', gap: 8 }}>
      <Button
        size="md"
        variant="ghost"
        data-testid={`refuse-paste-${n}`}
        aria-label={`Refuse: ${name}`}
        icon={<X aria-hidden />}
        onClick={() => {
          actions.refuseProposal('paste', n, cell);
          toast({ title: `Refused: ${r[0] || 'row'}, ${rowTitle(r) || 'value'}. Type nothing.`, action: { label: 'Undo', run: () => actions.undoProposal('paste', n) }, key: `paste:${n}` });
        }}
      >
        Refuse
      </Button>
      <Button
        size="md"
        variant="secondary"
        data-testid={`accept-paste-${n}`}
        aria-label={`Accept: ${name}`}
        icon={<Check aria-hidden />}
        onClick={() => {
          actions.acceptProposal('paste', n, cell);
          toast({ title: `Accepted: ${r[0] || 'row'}, ${rowTitle(r) || 'value'}. ${group === 'office' ? 'Record the approval on the sheet.' : group === 'proof' ? 'Paste the link on the sheet.' : 'Type it on the sheet.'}`, body: `Sheet reference: ${group === 'office' ? 'Offices AQ and AR' : cell}.`, tone: 'ok', action: { label: 'Undo', run: () => actions.undoProposal('paste', n) }, key: `paste:${n}` });
        }}
      >
        Accept
      </Button>
    </span>
  );
}

/** Where the rows came from, with the time and the cost of a live read. */
function RunLine() {
  const r = useLive((x) => x.run.result);
  if (!r || !pasteIsOverridden()) return <span className="l-small l-muted">From both readers’ recorded answers. No AI model was asked.</span>;
  if (r.mode !== 'live') return <span className="l-small l-muted" data-testid="paste-run-line">From recorded answers on the server. No AI model was asked.</span>;
  return (
    <span className="l-small l-muted l-num" data-testid="paste-run-line">
      Read live in {(r.ms / 1000).toFixed(1)} s for {usd(r.costUsd)} ({plural(r.requests, 'request')}).{r.failed.length ? ` ${plural(r.failed.length, 'message')} went to a person.` : ''}
    </span>
  );
}

/** The live read in progress: answers received out of expected, the message being read, the seconds. */
function LiveProgress() {
  const run = useLive((x) => x.run);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(t);
  }, []);
  const secs = run.startedAt ? Math.max(0, Math.round((Date.now() - run.startedAt) / 1000)) : 0;
  return (
    <DetailRegion
      testId="paste-result"
      head={
        <div className="l-detailhead-row">
          <h2 className="l-section">{run.total ? 'Reading with live AI' : 'Getting ready to read'}</h2>
        </div>
      }
    >
      <Block title="Answers received" testId="paste-live-progress">
        <div aria-busy="true" style={{ display: 'grid', gap: 8 }}>
          <Progress value={run.done} max={run.total || 1} label="Reader answers received" hideLabel />
          <p className="l-small l-ink2 l-num" data-testid="paste-live-progress-line">
            {run.done} of {run.total} answers{run.current ? `, now message ${run.current}` : ''}, {secs} s
          </p>
          <p className="l-small l-muted">Each message goes to both readers. A person decides every proposal.</p>
        </div>
      </Block>
    </DetailRegion>
  );
}

/** One pasted row: what it is about, what the readers propose, and the decision. */
function ResultRow({ r, n, group, showMessage }: { r: string[]; n: number; group: PasteGroup; showMessage: boolean }) {
  const decide = PASTE_DECIDE.includes(group);
  const subject = (r[0] || r[4] || 'No case').replace(/^Office: /, '');
  return (
    <li data-testid={`paste-row-${n}`} className="l-check" style={{ display: 'block', padding: '12px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'start' }}>
        <div className="l-check-name" style={{ padding: 0 }}>
          <span className="l-body">
            <span className="l-strong">{subject}</span>
            {r[1] ? <span className="l-ink2">, {rowTitle(r)}</span> : null}
            {showMessage ? (
              <span className="l-muted">
                {', '}
                <a className="l-link" href={`#/suggestions/paste?item=${encodeURIComponent(r[3] ?? '')}`}>
                  message {r[3]}
                </a>
              </span>
            ) : null}
          </span>
          {group === 'notRead' ? (
            <span data-testid="paste-not-read" className="l-body l-strong">
              {NOT_READ}
            </span>
          ) : group === 'repeat' ? (
            <span className="l-body">{repeatLine(r[2] ?? '')}</span>
          ) : group === 'open' ? (
            <span className="l-body l-p">Stays open. {r[5]}</span>
          ) : group === 'office' ? (
            <span className="l-body l-p">
              The office says it changed how filings reach it. No notice goes until a person decides.{' '}
              <a href="#/offices" data-testid="paste-office-link" className="l-link">
                Decide it on Offices
              </a>
            </span>
          ) : group === 'person' ? (
            <span className="l-body">The two readers disagreed. Read message {r[3]} yourself.</span>
          ) : (
            <span className="l-body l-p">
              <span className="l-ink2">Proposed: </span>
              {proposalWords(group, r)}
            </span>
          )}
        </div>
        {decide ? <PasteDecision n={n} group={group} r={r} /> : null}
      </div>
      {group !== 'notRead' && group !== 'open' && r[5] ? (
        <details className="l-details" style={{ marginTop: 4 }}>
          <summary>Why</summary>
          <div className="l-small l-ink2" style={{ display: 'grid', gap: 4, maxWidth: 'var(--measure)', marginTop: 4 }}>
            {/(Hearings|Offices) [A-Z]/.test(r[1] ?? '') ? <span>Goes in {pasteCell(r)}.</span> : null}
            <SheetText as="p" text={r[5] ?? ''} cell={`Row ${n}, column F`} heading="As the command writes it" />
          </div>
        </details>
      ) : null}
    </li>
  );
}

/** The rows to copy: those a person accepted, and those that need no decision (repeats, open checks, notes). */
function rowsToCopy(proposals: Record<string, unknown>): { rows: string[][]; accepted: number } {
  let accepted = 0;
  const rows = pasteSource().rows.filter((r, i) => {
    const g = pasteGroupOf(r);
    if (!PASTE_DECIDE.includes(g)) return true;
    const d = proposals[proposalKey('paste', i + 1)] as { decision?: string } | undefined;
    if (d?.decision === 'accepted') {
      accepted += 1;
      return true;
    }
    return false;
  });
  return { rows, accepted };
}

const tsvOf = (rows: string[][]): string => `${rows.map((r) => r.join('\t')).join('\n')}\n`;

export function Paste({ query }: PageProps) {
  const liveRun = useLive((x) => x.run);
  const onServer = useLive((x) => x.server === 'up');
  const liveNow = useLive((x) => x.server === 'up' && !!x.status?.live);
  const files = pasteFiles();
  const pasted = useSession((s) => !!s.pasted);
  const typed = useSession((s) => s.pastedExtra ?? NO_TYPED);
  const proposals = useSession((s) => s.proposals);
  const [loaded, setLoaded] = useState(false);
  const stage: 'empty' | 'loaded' | 'done' = pasted ? 'done' : loaded || typed.length ? 'loaded' : 'empty';
  const [fileError, setFileError] = useState<string | null>(null);
  const [sender, setSender] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  // On the live server a loaded file is read as it is; without it the example file is replayed.
  const [fileMsgs, setFileMsgs] = useState<LiveMessage[] | null>(null);
  const baseList: LiveMessage[] = fileMsgs ?? engine.paste.messages.map((m) => ({ ...m, id: m.id, sender: m.sender, body: m.body }) as LiveMessage);
  const running = liveRun.state === 'running';
  const toCopy = rowsToCopy(proposals);
  const adding = query.get('add') === '1' || stage !== 'done';
  const show: 'all' | 'decide' = query.get('show') === 'decide' ? 'decide' : 'all';

  /* ---------- the messages ---------- */
  const done = pasteIsOverridden() || pasted;
  const pathOf = (id: string): Path => (stage === 'done' ? pastePath(id) : liveNow ? (pastePath(id) === 'example' ? 'example' : 'pending') : 'waiting');
  const source = pasteIsOverridden() ? pasteSource().messages : onServer ? baseList : engine.paste.messages;
  const msgs: Msg[] =
    stage === 'empty'
      ? []
      : [
          ...source.map((m) => ({ id: String(m.id ?? ''), sender: m.sender, channel: m.channel ?? 'email', body: m.body, at: typeof m.at === 'string' ? m.at : null, path: pathOf(String(m.id ?? '')) })),
          ...(pasteIsOverridden() ? [] : typed.map((t) => ({ id: t.id, sender: t.sender, channel: 'added here', body: t.body, at: null, path: (stage === 'done' ? 'missing' : liveNow ? 'pending' : 'waiting') as Path }))),
        ];
  const rows = done ? pasteSource().rows.map((r, i) => ({ r, n: i + 1, group: pasteGroupOf(r) })) : [];
  const rowsOf = (id: string) => rows.filter((x) => x.r[3] === id);
  const waiting = rows.filter((x) => PASTE_DECIDE.includes(x.group) && !proposals[proposalKey('paste', x.n)]).length;
  const notRead = done ? rows.filter((x) => x.group === 'notRead').length + (pasteIsOverridden() ? 0 : typed.length) : 0;

  const asked = query.get('item');
  const selected = stage === 'done' && !query.get('add') ? (msgs.find((m) => m.id === asked) ?? null) : null;
  const keep = show === 'decide' ? 'show=decide&' : '';
  const hrefOf = (m: Msg): string => `#/suggestions/paste?${keep}item=${encodeURIComponent(m.id)}`;
  const groups: RecordGroup[] = [
    {
      id: 'messages',
      title: 'New messages',
      rows: msgs.map((m): RecordRow => {
        const own = rowsOf(m.id).length;
        const when = whenShort(m.at);
        return {
          key: m.id,
          href: hrefOf(m),
          testId: `paste-message-${m.id}`,
          title: m.sender,
          linkLabel: `Open message ${m.id} from ${m.sender}`,
          meta: `${m.id}${when ? `, ${when}` : ''}`,
          line: <span>{firstLine(m.body)}</span>,
          side: (
            <>
              <Badge tone={PATH[m.path].tone} size="sm">
                {PATH[m.path].word}
              </Badge>
              {stage === 'done' && own ? <span className="l-small l-muted l-num">{plural(own, 'proposal')}</span> : null}
            </>
          ),
        };
      }),
    },
  ];
  const pager = selected ? pagerOf(groups, selected.id) : undefined;
  // Before anything is added, the list shows what the example file holds, so the first screen is not empty.
  const preview: RecordGroup[] = [
    {
      id: 'examples',
      title: 'Example messages',
      rows: engine.paste.messages.map((m): RecordRow => {
        const when = whenShort(typeof m.at === 'string' ? m.at : null);
        return {
          key: String(m.id),
          href: '#/suggestions/paste',
          testId: `paste-example-${m.id}`,
          title: m.sender,
          linkLabel: `Example message ${m.id} from ${m.sender}, not added yet`,
          meta: `${m.id}${when ? `, ${when}` : ''}`,
          line: <span>{firstLine(m.body)}</span>,
          side: (
            <Badge tone="neutral" size="sm" plain>
              Not added yet
            </Badge>
          ),
        };
      }),
    },
  ];

  usePageState({ page: 'paste', stage, listCount: msgs.length, selected: selected?.id ?? null, proposals: rows.length, waiting, primaryAction: stage === 'done' ? 'Copy rows' : 'Read the messages' });

  /* ---------- actions ---------- */
  const useExample = (): void => {
    setFileError(null);
    setFileMsgs(null);
    setLoaded(true);
    setStatus(`${plural(engine.paste.messages.length, 'example message')} added.`);
  };

  const readFile = async (f: File): Promise<void> => {
    let list: Typed[] | null = null;
    let raw: unknown = null;
    try {
      raw = JSON.parse(await f.text());
      list = messagesOf(raw);
    } catch {
      list = null;
    }
    if (!list) {
      setFileError(`${f.name} is not a saved mailbox file. Save the messages from the shared mailbox as .json, or use the example messages.`);
      return;
    }
    setFileError(null);
    setLoaded(true);
    if (onServer) {
      const all = (Array.isArray(raw) ? raw : (raw as { messages: unknown[] }).messages) as Record<string, unknown>[];
      setFileMsgs(all.filter((m) => m && typeof m === 'object' && String(m.body ?? m.text ?? '').trim()).map((m, i) => ({ ...(m as object), id: (m.id as string | number | undefined) ?? `file-${i + 1}`, sender: String(m.sender ?? m.from ?? 'Sender not given'), body: String(m.body ?? m.text) }) as LiveMessage));
      setStatus(`${f.name}: ${plural(all.length, 'message')} added.`);
      return;
    }
    const example = engine.paste.messages.map((m) => String(m.id));
    const own = list.filter((m) => !example.includes(m.id) && m.body.trim());
    if (own.length) {
      actions.setPastedExtra([...typed, ...own.filter((m) => !typed.some((t) => t.id === m.id))]);
      setStatus(`${f.name}: ${plural(own.length, 'message')} with no recorded reader answer. ${own.length === 1 ? 'It shows' : 'They show'} as not read, for a person to read.`);
    }
  };

  const addTyped = (): void => {
    if (!body.trim()) return;
    const id = `typed-${typed.length + 1}`;
    actions.setPastedExtra([...typed, { id, sender: sender.trim() || 'Sender not given', body: body.trim() }]);
    setSender('');
    setBody('');
    setStatus(`Message from ${sender.trim() || 'an unnamed sender'} added.`);
  };

  const run = (): void => {
    if (stage === 'empty') setLoaded(true);
    if (onServer) {
      const sent: LiveMessage[] = [...baseList, ...typed.map((t) => ({ id: t.id, sender: t.sender, channel: 'email', body: t.body }))];
      setStatus(`Reading ${plural(sent.length, 'message')}.`);
      readOnServer(sent)
        .then((r) => {
          setStatus(`${plural(r.rows.length, 'proposal')} for ${plural(sent.length, 'message')}. ${r.mode === 'live' ? `Read live in ${(r.ms / 1000).toFixed(0)} seconds for ${usd(r.costUsd)}.` : 'From recorded answers.'}`);
          navigate('/suggestions/paste', { replace: true });
          window.requestAnimationFrame(() => heading.current?.focus());
        })
        .catch((e: unknown) => {
          const why = e instanceof Error ? e.message : String(e);
          setStatus(`The read failed. ${why}`);
        });
      return;
    }
    forgetServerRun();
    actions.markPasted();
    const count = engine.paste.messages.length + typed.length;
    setStatus(`${plural(pasteSource().rows.length, 'proposal')} for ${plural(count, 'message')}. ${plural((engine.paste.count.notRead ?? 0) + typed.length, 'message')} not read.`);
    navigate('/suggestions/paste', { replace: true });
    window.requestAnimationFrame(() => heading.current?.focus());
  };

  const copy = async (): Promise<boolean> => {
    const ok = await copyText(tsvOf(toCopy.rows));
    toast(
      ok
        ? { title: `Copied ${toCopy.rows.length} rows: ${toCopy.accepted} accepted and ${toCopy.rows.length - toCopy.accepted} that need no decision`, body: 'Paste them in column A of the first empty row of the Reader suggestions tab.', tone: 'ok' }
        : { title: 'The browser did not allow copying. Download the file instead.', tone: 'warn' },
    );
    return ok;
  };

  const reset = (): void => {
    forgetServerRun();
    setFileMsgs(null);
    actions.clearPasted();
    setLoaded(false);
    setFileError(null);
    setStatus('Started again. No messages are loaded.');
    navigate('/suggestions/paste', { replace: true });
  };

  /* ---------- header, summary, toolbar ---------- */
  const runLabel = stage === 'empty' ? (liveNow ? 'Read the examples with live AI' : 'Read the example messages') : liveNow ? 'Read with live AI' : 'Read the messages';
  const headerActions =
    stage === 'done' ? (
      <>
        <ActionButton size="md" icon={<Download aria-hidden />} successLabel="Downloaded" disabled={!toCopy.accepted} onAction={() => downloadFile(files.output, tsvOf(toCopy.rows), 'text/tab-separated-values;charset=utf-8')} data-testid="paste-download">
          Download
        </ActionButton>
        <ActionButton variant="primary" size="md" icon={<Copy aria-hidden />} successLabel="Copied" errorLabel="Copy failed" disabled={!toCopy.accepted} onAction={copy} data-testid="paste-copy">
          {toCopy.accepted ? `Copy ${toCopy.rows.length} rows for the sheet` : 'Accept a proposal to copy'}
        </ActionButton>
      </>
    ) : (
      <Button variant="primary" size="md" data-testid="paste-run" data-mode={liveNow ? 'live' : 'recorded'} icon={<Play aria-hidden />} onClick={run} loading={running} disabled={running}>
        {runLabel}
      </Button>
    );

  const shownRows = rows.filter((x) => (selected ? x.r[3] === selected.id : true)).filter((x) => (show === 'decide' ? PASTE_DECIDE.includes(x.group) && !proposals[proposalKey('paste', x.n)] : true));
  const exampleCount = engine.paste.messages.length;

  return (
    <Page fit>
      <div data-testid="page-paste" style={{ display: 'contents' }}>
        <PageHeader
          title="Paste new messages"
          line={liveNow ? 'Both AI readers propose what each message proves. You decide.' : 'The readers propose what each message proves. You decide.'}
          actions={headerActions}
        />
        <p role="status" data-testid="paste-status" className="l-sr">
          {status}
        </p>
        <Summary label="The new messages in four figures" testId="paste-summary">
          <Stat testId="paste-count-messages" label="Messages" value={msgs.length} foot={stage === 'empty' ? 'None added yet' : typed.length ? `${plural(typed.length, 'message')} added by hand` : 'Fictional example messages'} source={<Src kind="simulated" cell={msgs.length ? 'data/paste-example/new-messages.json, fictional' : 'Counted on this page; none added yet'} />} />
          <Stat
            testId="paste-count-proposals"
            label="Proposals"
            value={rows.length}
            foot={done ? (liveRun.result?.mode === 'live' && pasteIsOverridden() ? 'Read live just now' : 'From recorded answers') : 'Read the messages first'}
            source={done ? <Src kind="measured" cell={liveRun.result?.mode === 'live' && pasteIsOverridden() ? pasteSource().command : `Recorded run: ${pasteSource().command}`} /> : <Src kind="simulated" cell="Counted on this page once the messages are read" />}
          />
          <Stat
            testId="paste-count-waiting"
            label="Waiting for you"
            value={waiting}
            foot={waiting ? 'Accept or refuse each' : done ? 'Nothing waits' : 'Nothing yet'}
            href={done ? '#/suggestions/paste?show=decide' : undefined}
            current={show === 'decide'}
            name={`${waiting} proposals wait for a decision. Show them`}
            source={<Src kind="simulated" cell="Counted on this page from the proposals" />}
          />
          <Stat testId="paste-count-not-read" label="Not read" value={notRead} foot={notRead ? 'A person reads these' : done ? 'Every message was read' : 'Nothing read yet'} source={<Src kind="simulated" cell="Counted on this page from the read" />} />
        </Summary>
        <Toolbar
          left={
            stage === 'done' ? (
              <Seg
                label="Which proposals"
                current={show}
                items={[
                  { id: 'all', label: 'Everything', count: rows.length, href: `#/suggestions/paste${selected ? `?item=${encodeURIComponent(selected.id)}` : ''}` },
                  { id: 'decide', label: 'Waiting for you', count: waiting, href: `#/suggestions/paste?show=decide${selected ? `&item=${encodeURIComponent(selected.id)}` : ''}` },
                ]}
              />
            ) : (
              <span className="l-small l-ink2">
                <span className="l-strong">1</span> Add messages <span className="l-muted">then</span> <span className="l-strong">2</span> read them <span className="l-muted">then</span> <span className="l-strong">3</span> accept or refuse each proposal
              </span>
            )
          }
          right={
            stage === 'empty' ? (
              <span className="l-small l-muted">Only fictional example messages belong here.</span>
            ) : (
              <>
                {stage === 'done' ? (
                  <a className={buttonClass({ variant: 'ghost', size: 'sm' })} href="#/suggestions/paste?add=1" data-testid="paste-add-open" aria-current={query.get('add') === '1' ? 'page' : undefined}>
                    <Plus aria-hidden /> Add a message
                  </a>
                ) : null}
                <Button size="sm" variant="ghost" icon={<RotateCcw aria-hidden />} onClick={reset} data-testid="paste-reset">
                  Start again
                </Button>
              </>
            )
          }
        />
        <Workspace split="5-7">
          <ListRegion
            title={msgs.length ? 'New messages' : 'The example file'}
            meta={<span className="l-num">{msgs.length ? (msgs.length === 1 ? '1 message' : `${msgs.length} messages`) : `${exampleCount} fictional messages`}</span>}
            foot={
              stage === 'done' ? (
                <>
                  <a className="l-link l-small" href={`#/suggestions/paste${show === 'decide' ? '?show=decide' : ''}`} aria-current={!selected && !query.get('add') ? 'page' : undefined} data-testid="paste-all">
                    Show proposals for every message
                  </a>
                  <span className="l-small l-muted">Dates are simulated</span>
                </>
              ) : undefined
            }
          >
            {msgs.length ? (
              <RecordTable groups={groups} selected={selected?.id ?? null} caption="The new messages and how each was read" heads={['Message', 'Read by']} sideWidth={184} testId="paste-messages" />
            ) : (
              <RecordTable groups={preview} selected={null} caption="The messages of the example file, not added yet" heads={['Message', 'Status']} sideWidth={184} testId="paste-examples" />
            )}
          </ListRegion>

          {running ? (
            <LiveProgress />
          ) : adding ? (
            <DetailRegion
              testId="paste-result"
              head={
                <div className="l-detailhead-row">
                  <h2 className="l-section" ref={heading} tabIndex={-1} data-testid="paste-result-heading">
                    {stage === 'empty' ? 'Add new messages' : stage === 'loaded' ? `${plural(msgs.length, 'message')} ready to read` : 'Add a message'}
                  </h2>
                </div>
              }
              foot={
                <>
                  <span className="l-small l-muted">{stage === 'loaded' ? 'Then choose Read the messages, above.' : 'A person decides every proposal.'}</span>
                  {stage === 'done' ? (
                    <a className={buttonClass({ variant: 'secondary', size: 'md' })} href="#/suggestions/paste">
                      Back to the proposals
                    </a>
                  ) : (
                    <Button variant="secondary" size="md" data-testid="paste-use-example" icon={<FileJson aria-hidden />} onClick={useExample} disabled={stage === 'loaded' && !fileMsgs && loaded}>
                      {stage === 'loaded' && loaded && !fileMsgs ? `${exampleCount} example messages added` : `Use the ${exampleCount} example messages`}
                    </Button>
                  )}
                </>
              }
            >
              {liveRun.state === 'error' ? (
                <div className="l-block" data-testid="paste-live-error">
                  <InlineAlert tone="warn" title={`The read failed: ${liveRun.error ?? 'no answer from the server'}`}>
                    Nothing was changed. Try again, or start again to use the recorded answers.
                  </InlineAlert>
                </div>
              ) : null}
              <Block title="From a saved mailbox file">
                <div style={{ display: 'grid', gap: 12 }}>
                  <FileDropZone
                    data-testid="paste-dropzone"
                    accept=".json,application/json"
                    title="Drop a messages file here, or choose one"
                    hint="A .json file saved from the shared mailbox"
                    rejectText="Only .json files are read here"
                    inputLabel="Choose a messages file"
                    onFiles={(f) => {
                      if (f[0]) void readFile(f[0]);
                    }}
                    onReject={(r) => setFileError(`${r[0]?.file.name ?? 'That file'} is not a saved mailbox file. Save the messages from the shared mailbox as .json, or use the example messages.`)}
                  />
                  {fileError ? (
                    <InlineAlert tone="warn" title="That file could not be used" testId="paste-file-error">
                      {fileError}
                    </InlineAlert>
                  ) : null}
                </div>
              </Block>
              <Block title="Or paste one message">
                <form
                  style={{ display: 'grid', gap: 12 }}
                  aria-label="Paste a message"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addTyped();
                  }}
                >
                  <Field label="Sender">
                    <TextInput data-testid="paste-sender" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="Velloran hearing office" />
                  </Field>
                  <Field label="Message text">
                    <TextArea data-testid="paste-text" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
                  </Field>
                  <div>
                    <Button type="submit" size="sm" variant="secondary" data-testid="paste-add" icon={<Plus aria-hidden />} disabled={!body.trim()}>
                      Add the message
                    </Button>
                  </div>
                </form>
                <p className="l-small l-muted l-p" style={{ marginTop: 12 }}>
                  {liveNow ? 'A pasted message is read live with the others.' : 'With no recorded answer, a pasted message shows as not read, for a person to read.'}
                </p>
              </Block>
            </DetailRegion>
          ) : (
            <DetailRegion
              testId="paste-result"
              head={
                <>
                  <div className="l-detailhead-row">
                    <h2 className="l-section l-clip" ref={heading} tabIndex={-1} data-testid="paste-result-heading">
                      {selected ? `Message ${selected.id} from ${selected.sender}` : `${plural(rows.length, 'proposal')} for ${plural(msgs.length, 'message')}`}
                    </h2>
                    {pager ? <PagerLinks p={pager} /> : null}
                  </div>
                  {selected ? (
                    <Facts
                      items={[
                        { term: 'Sent', value: whenOf(selected.at) ? `${whenOf(selected.at)} (simulated)` : 'No date in the message' },
                        { term: 'By', value: selected.channel === 'email' ? 'Email' : selected.channel },
                        { term: 'Read by', value: PATH[selected.path].word },
                      ]}
                    />
                  ) : (
                    <Facts
                      items={[
                        { term: 'Waiting for you', value: plural(waiting, 'proposal') },
                        { term: 'Accepted', value: plural(toCopy.accepted, 'proposal') },
                        { term: 'Not read', value: plural(notRead, 'message') },
                      ]}
                    />
                  )}
                </>
              }
              foot={
                <>
                  <RunLine />
                  <a className={buttonClass({ variant: 'secondary', size: 'md' })} href="#/suggestions?filter=pasted" data-testid="paste-open-proof-links">
                    Open in Proof links <ArrowRight aria-hidden />
                  </a>
                </>
              }
            >
              {selected ? (
                <Block title="What the message says">
                  <blockquote className="l-body l-p" style={{ margin: 0, paddingLeft: 12, whiteSpace: 'pre-line', boxShadow: 'inset 2px 0 0 var(--border-strong)' }} data-testid="paste-message-text">
                    {selected.body}
                  </blockquote>
                </Block>
              ) : null}
              {PASTE_GROUPS.map((g) => {
                const list = shownRows.filter((x) => x.group === g.id);
                const extra = g.id === 'notRead' && !pasteIsOverridden() && show === 'all' ? typed.filter((t) => !selected || t.id === selected.id) : [];
                if (!list.length && !extra.length) return null;
                return (
                  <Block key={g.id} title={PASTE_WORDS[g.id].title} meta={plural(list.length + extra.length, 'row')} testId={`paste-group-${g.id}`}>
                    <p className="l-small l-muted l-p" style={{ marginTop: -4 }}>{PASTE_WORDS[g.id].detail}</p>
                    <ul className="l-checks">
                      {list.map(({ r, n, group }) => (
                        <ResultRow key={n} r={r} n={n} group={group} showMessage={!selected} />
                      ))}
                      {extra.map((t) => (
                        <li key={t.id} data-testid={`paste-row-${t.id}`} className="l-check" style={{ display: 'block', padding: '12px 0' }}>
                          <span className="l-check-name" style={{ padding: 0 }}>
                            <span className="l-body">
                              <span className="l-strong">{t.sender}</span>
                              <span className="l-muted">, added here</span>
                            </span>
                            <span className="l-body l-strong">{NOT_READ}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Block>
                );
              })}
              {!shownRows.length && !(show === 'all' && typed.length) ? (
                <div className="l-block">
                  <EmptyState title={show === 'decide' ? 'Nothing waits for you here' : 'No proposals for this message'} description={show === 'decide' ? 'Every proposal here is decided.' : 'The readers found nothing to record in it.'} />
                </div>
              ) : null}
              <div className="l-block" data-testid="paste-lines">
                <SheetRef>
                  <span className="l-mono" style={{ overflowWrap: 'anywhere' }}>{pasteSource().command.replace(/^node /, '')}</span>
                  {pasteLinesPlain().map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                  {PASTE_GROUPS.filter((g) => pasteCount(g) > 0).map((g) => (
                    <span key={g.id}>
                      {g.title}: {pasteCount(g)}
                    </span>
                  ))}
                </SheetRef>
              </div>
            </DetailRegion>
          )}
        </Workspace>
      </div>
    </Page>
  );
}
