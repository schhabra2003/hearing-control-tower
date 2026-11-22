/**
 * Replies (#/replies, ?filter=rule|person, ?reply=R07, ?try=1), split 7 + 5:
 * - Summary: the example replies, filed by the rule, for a person, and tried here (this browser).
 * - Toolbar: filters by result, as links; "Try a reply" on the right.
 * - List: answers from the consultant pages first (when there are any), then each reply: who sent it
 *   and by which channel, its first line in full, and the result as one Badge.
 * - Detail: the reply in full, what it answers, what the rule does and why, and for a reply that goes
 *   to a person what that person does. ?try=1 shows the reply rule to try instead.
 */

import type { ReplyRow } from '@/types/data';
import { engine } from '@/lib/data';
import { REPLY_FILTERS } from '@/lib/copy';
import { dateLong } from '@/lib/format';
import type { PageProps } from '@/lib/router';
import { useSession } from '@/lib/store';
import { buttonClass } from '@/components/ui/Button';
import { Block, DetailRegion, ListRegion, Page, PageHeader, Seg, SheetRef, Src, Stat, State, Summary, Toolbar, Workspace, usePageState } from '@/layout/Regions';
import { ConsultantAnswers } from './components/ConsultantAnswers';
import { Facts, KeyValues, PagerLinks, RecordTable, pagerOf, type Pager, type RecordGroup, type RecordRow } from './components/RecordTable';
import { KIND_WORDS, TryReply } from './components/TryReply';

type Filter = keyof typeof REPLY_FILTERS;
const isFilter = (v: string | null): v is Filter => v === 'all' || v === 'rule' || v === 'person';
const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "Mon June 10, Larkmere, in person" as "Mon, Jun 10, Larkmere, in person". */
const docketText = (d: string): string => d.replace(/^(\w{3}) (\w{3})\w* (\d{1,2}),/, '$1, $2 $3,');

/** What the reply answers, in plain words. */
function answers(r: ReplyRow): string {
  const s = r.sent;
  const list = (a: number[] | undefined): string => (a?.length === 1 ? `hearing ${a[0]}` : `hearings ${(a ?? []).join(' and ')}`);
  switch (s.kind) {
    case 'offer':
      return `Offer of ${list(s.open)}`;
    case 'week':
      return 'The Wednesday text';
    case 'day_before':
      return 'The day-before text';
    case 'arrival':
      return 'The arrival request';
    case 'files':
      return `Case files, version ${s.version ?? 'unknown'}`;
    case 'change':
      return 'A change notice';
    default:
      return KIND_WORDS[s.kind] ?? String(s.kind);
  }
}

/** What the rule does with a reply it files, as a plain sentence. */
function ruleDoes(r: ReplyRow): string {
  const o = r.out;
  const n = o.numbers.length ? (o.numbers.length === 1 ? ` for hearing ${o.numbers[0]}` : ` for hearings ${o.numbers.join(' and ')}`) : '';
  const a = o.action ?? '';
  if (/^fill the YES proof/.test(a)) return `Records the yes as proof${n}.`;
  if (/^fill the day-before YES/.test(a)) return `Records the day-before yes${n}.`;
  if (/^declined/.test(a)) return 'Records the no, and offers the docket to the next person on the list.';
  if (/^type the arrival time/.test(a)) return `Records the arrival time${n}.`;
  if (/^record the files received/.test(a)) return `Records that the files arrived${o.version ? `, version ${o.version}` : ''}${n}.`;
  if (/^record that the consultant has the change/.test(a)) return `Records that the consultant has the change${n}.`;
  const kept = /^record that next week is kept \((.+)\)$/.exec(a);
  if (kept) return `Records that next week is kept: ${kept[1]}.`;
  return `${cap(a.replace(/\bYES\b/g, 'yes'))}${n}.`;
}

/** What the person does with a reply the rule hands over, from the rule's reason. */
function personDoes(r: ReplyRow): string {
  const who = r.reply.from;
  const w = r.out.why;
  if (/already has another consultant's yes/.test(w)) return `Tell ${who} the hearing is taken, and offer another if there is one.`;
  if (/YES without numbers/.test(w)) return `Ask ${who} which hearings they mean.`;
  if (/was not offered/.test(w)) return `Ask ${who} which of the offered hearings they mean.`;
  if (/not from the consultant the message was sent to/.test(w)) return `Check with the consultant the message went to before anything is recorded.`;
  if (/daily cap/.test(w)) return `Check ${who}’s daily cap, then file the yes and take an offer back, or offer the last hearings to the next name.`;
  if (/version/.test(w)) return `Send ${who} the current files again and ask them to confirm the new version.`;
  if (/a person phones/.test(w)) return `Phone ${who} to find out which day they hand back.`;
  if (/change is not a plain OK/.test(w)) return `Answer ${who}’s question about the change, then record their OK.`;
  if (/arrival reply/.test(w)) return `Call ${who} and record when they will arrive.`;
  return `Read it, answer ${who}, and type the result on the sheet yourself.`;
}

export function Replies({ query }: PageProps) {
  const rep = engine.replies;
  const tried = useSession((s) => s.repliesTried);
  const answered = useSession((s) => s.consultantReplies);
  const answersCount = Object.keys(answered ?? {}).length;
  const filter: Filter = isFilter(query.get('filter')) ? (query.get('filter') as Filter) : 'all';
  const trying = query.get('try') === '1';
  const rows = rep.rows.filter((r) => (filter === 'all' ? true : filter === 'rule' ? r.out.byRule : !r.out.byRule));
  const keep = filter === 'all' ? '' : `filter=${filter}&`;
  const hrefOf = (r: ReplyRow): string => `#/replies?${keep}reply=${r.id}`;

  const groups: RecordGroup[] = [
    {
      id: 'replies',
      title: 'Example replies',
      rows: rows.map(
        (r): RecordRow => ({
          key: r.id,
          href: hrefOf(r),
          testId: `reply-row-${Number(r.id.replace(/\D/g, ''))}`,
          title: r.reply.from,
          linkLabel: `Open reply ${r.id} from ${r.reply.from}`,
          meta: `${r.id}, by ${r.reply.channel === 'email' ? 'email' : 'text'}`,
          line: <span>“{r.reply.text.split('\n')[0]}”</span>,
          side: (
            <>
              <State tone={r.out.byRule ? 'ok' : 'warn'}>{r.out.byRule ? REPLY_FILTERS.rule : REPLY_FILTERS.person}</State>
            </>
          ),
          right: answers(r),
          rightSub: docketText(r.docket).split(',').slice(0, 2).join(','),
        }),
      ),
    },
  ];

  const asked = (query.get('reply') ?? '').toUpperCase();
  const selected = rep.rows.find((r) => r.id === asked) ?? rows[0];
  const pager = selected ? pagerOf(groups, selected.id) : undefined;
  const filterHref = (f: Filter): string => `#/replies${f === 'all' ? '' : `?filter=${f}`}`;
  const base = selected && asked ? hrefOf(selected) : filterHref(filter);

  usePageState({ page: 'replies', filter, listCount: rows.length, selected: selected?.id ?? null, trying, consultantAnswers: answersCount });

  return (
    <Page fit>
      <div data-testid="page-replies" style={{ display: 'contents' }}>
        <PageHeader title="Replies" line="How the reply rule sorts replies, and which need a person." />
        <Summary label="The reply rule in four figures" testId="replies-summary">
          <Stat
            testId="replies-all"
            label="Example replies"
            value={rep.rows.length}
            foot={`Self-test: ${rep.agree} of ${rep.rows.length} match a coordinator`}
            source={<Src kind="measured" cell={`node cli/replies.js, ${dateLong(engine.meta.exportedAt)}`} />}
            href={filterHref('all')}
            current={filter === 'all' && !trying}
            name={`${rep.rows.length} example replies. Show them all`}
          />
          <Stat
            testId="replies-by-rule"
            label={REPLY_FILTERS.rule}
            value={rep.byRule}
            of={`of ${rep.rows.length}`}
            foot="Plain forms such as YES 1 3"
            source={<Src kind="measured" cell="node cli/replies.js" />}
            href={filterHref('rule')}
            current={filter === 'rule'}
            name={`${rep.byRule} replies filed by the rule. Show them`}
          />
          <Stat
            testId="replies-to-person"
            label={REPLY_FILTERS.person}
            value={rep.toPerson}
            of={`of ${rep.rows.length}`}
            foot="Anything unclear: a person answers"
            source={<Src kind="measured" cell="node cli/replies.js" />}
            href={filterHref('person')}
            current={filter === 'person'}
            name={`${rep.toPerson} replies go to a person. Show them`}
          />
          <Stat
            testId="replies-tried"
            label="Tried here"
            value={tried.length}
            foot={tried.length ? 'In this browser only' : 'Try a reply of your own'}
            source={<Src kind="simulated" cell="This browser's session" />}
            href={`${base}${base.includes('?') ? '&' : '?'}try=1`}
            current={trying}
            name={`${tried.length} replies tried here. Try a reply`}
          />
        </Summary>
        <Toolbar
          left={<Seg label="Which replies" current={trying ? '' : filter} items={(['all', 'rule', 'person'] as Filter[]).map((f) => ({ id: f, label: REPLY_FILTERS[f], count: f === 'all' ? rep.rows.length : f === 'rule' ? rep.byRule : rep.toPerson, href: filterHref(f) }))} />}
          right={
            <a className={buttonClass({ variant: trying ? 'primary' : 'secondary', size: 'sm' })} href={trying ? base : `${base}${base.includes('?') ? '&' : '?'}try=1`} data-testid="try-reply-open" aria-current={trying ? 'page' : undefined}>
              {trying ? 'Close the reply rule' : 'Try a reply'}
            </a>
          }
        />
        <Workspace split="7-5">
          <ListRegion
            title={filter === 'all' ? 'Example replies' : REPLY_FILTERS[filter]}
            meta={<span className="l-num">{rows.length === 1 ? '1 reply' : `${rows.length} replies`}</span>}
            foot={
              <details className="l-details" data-testid="replies-caveat">
                <summary>About these replies</summary>
                <p className="l-small l-ink2 l-p">{rep.caveat}</p>
              </details>
            }
          >
            <ConsultantAnswers />
            <RecordTable groups={groups} selected={trying ? null : (selected?.id ?? null)} caption="The example replies and what the rule does with each" heads={['Reply', 'Result', 'It answers']} sideWidth={176} rightWidth={184} testId="replies-table" />
          </ListRegion>
          {trying ? (
            <DetailRegion
              testId="region-detail-try"
              head={
                <div className="l-detailhead-row">
                  <h2 className="l-section">Try a reply</h2>
                  <span className="l-small l-muted">Runs in your browser</span>
                </div>
              }
              foot={
                <>
                  <span className="l-small l-muted">Nothing is sent.</span>
                  <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={base}>
                    Back to the reply
                  </a>
                </>
              }
            >
              <TryReply />
            </DetailRegion>
          ) : selected ? (
            <ReplyDetail r={selected} pager={pager} tryHref={`${base}${base.includes('?') ? '&' : '?'}try=1`} />
          ) : null}
        </Workspace>
      </div>
    </Page>
  );
}

function ReplyDetail({ r, pager, tryHref }: { r: ReplyRow; pager?: Pager; tryHref: string }) {
  const others = engine.replies.rows.filter((x) => x.reply.from === r.reply.from && x.id !== r.id);
  const [first, ...rest] = r.reply.text.split('\n');
  const more = rest.join('\n').trim();
  return (
    <DetailRegion
      testId={`reply-detail-${r.id}`}
      head={
        <>
          <div className="l-detailhead-row">
            <h2 className="l-section l-clip" data-testid="detail-title">
              Reply from {r.reply.from}
            </h2>
            {pager ? <PagerLinks p={pager} /> : null}
          </div>
          <State tone={r.out.byRule ? 'ok' : 'warn'} testId="reply-result">
            {r.out.byRule ? REPLY_FILTERS.rule : REPLY_FILTERS.person}
          </State>
          <Facts
            items={[
              { term: 'It answers', value: answers(r) },
              { term: 'Docket', value: docketText(r.docket) },
              { term: 'Came by', value: r.reply.channel === 'email' ? 'Email' : 'Text' },
            ]}
          />
        </>
      }
      foot={
        <>
          <span className="l-small l-muted">The rule suggests. A person types the result.</span>
          <a className={buttonClass({ variant: 'secondary', size: 'md' })} href={tryHref} data-testid="reply-try">
            Try a reply like it
          </a>
        </>
      }
    >
      <Block title="What they wrote" meta={r.id}>
        <blockquote className="l-body l-p" style={{ margin: 0, paddingLeft: 12, boxShadow: 'inset 2px 0 0 var(--border-strong)' }} data-testid="reply-text">
          {first}
        </blockquote>
        {more ? (
          <details className="l-details" style={{ marginTop: 8 }}>
            <summary>The rest of the email</summary>
            <p className="l-small l-ink2 l-p" style={{ whiteSpace: 'pre-line' }}>
              {more}
            </p>
          </details>
        ) : null}
      </Block>
      <Block title={r.out.byRule ? 'What the rule records' : 'Why a person reads it'} testId="reply-rule">
        <KeyValues
          items={[
            { term: r.out.byRule ? 'It records' : 'The rule', value: r.out.byRule ? ruleDoes(r) : 'Files nothing. It hands the reply to a person.' },
            { term: 'Why', value: cap(r.out.why.replace(/\s*\(first line of the email used:.*$/, '')) },
          ]}
        />
      </Block>
      {r.out.byRule ? null : (
        <Block title="What the person does" testId="reply-person-step">
          <p className="l-body l-p">{personDoes(r)}</p>
        </Block>
      )}
      {others.length ? (
        <Block title={`Other replies from ${r.reply.from}`} meta={`${others.length}`} testId="reply-others">
          <ul className="l-checks">
            {others.slice(0, 4).map((x) => (
              <li key={x.id} className="l-check">
                <span className="l-check-name">
                  <span className="l-clip">
                    <a className="l-link" href={`#/replies?reply=${x.id}`}>
                      “{x.reply.text.split('\n')[0]}”
                    </a>
                  </span>
                  <span className="l-small l-muted">
                    {x.id}, {answers(x).toLowerCase()}
                  </span>
                </span>
                <span className="l-small l-ink2">{x.out.byRule ? REPLY_FILTERS.rule : REPLY_FILTERS.person}</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
      <div className="l-block">
        <SheetRef>
          <span>
            Reply <span className="l-mono">{r.id}</span> in the example replies; the rule is <span className="l-mono">src/replies.js</span>.
          </span>
          <span>
            Rule output: <span className="l-mono">{r.out.action ?? 'to a person'}</span>
            {r.out.numbers.length ? `, hearings ${r.out.numbers.join(', ')}` : ''}. Reason as printed: {r.out.why}
          </span>
        </SheetRef>
      </div>
    </DetailRegion>
  );
}
