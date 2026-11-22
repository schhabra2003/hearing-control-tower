// Checks: the list of problems the prototype is tested against, and a button that runs all of
// them in this browser. Each check sets up a situation, lets the engine act, and tests the result.

import { html, raw, pill, empty, plural } from '../ui.js';
import { spansFromRecords, summarize, pairHealth, alerts } from '../../src/telemetry.js';

// AI operations: what every model call cost and how long it took, whether the two readers still
// agree, and what would raise an alarm. Computed in the browser from the recorded reads.
function opsSection(app) {
  const { data } = app;
  if (!data.recorded) return '';
  const spans = spansFromRecords(data.recorded), s = summarize(spans);
  const p = pairHealth(data.recorded, data.reader_results ? data.reader_results.per_message : null), a = alerts(s, p);
  const pct = (x) => (x === null || x === undefined ? 'n/a' : `${Math.round(100 * x)}%`);
  const sec = (ms) => (ms === null ? 'n/a' : `${(ms / 1000).toFixed(1)} s`);
  const n = (x) => Number(x).toLocaleString('en-US');
  return html`<section class="panel"><div class="panel-head"><h2>AI operations: every model call, counted</h2><button class="btn" data-action="download-trace" title="One line per model call, in OpenTelemetry's naming for generative AI. No message text.">Download the trace</button></div>
    <p>The readers are the only part of the tower that can drift without an error: a model version changes, a provider slows down, an edit to the instructions makes the two readers disagree more. So every call is recorded with its model, the hash of the instructions, tokens, cost and time. <b>${n(s.calls)} recorded calls for ${n(s.messages)} messages cost ${s.costUsd === null ? 'an unknown amount' : `$${s.costUsd.toFixed(2)}`}</b>${s.costPerMessage === null ? '' : `, ${(100 * s.costPerMessage).toFixed(2)} cents per message`}. Measured, from the usage the provider reported.</p>
    <div class="tablewrap"><table class="mini readers"><thead><tr><th>Reader</th><th class="num">Calls</th><th class="num">Failed</th><th class="num" title="Input tokens the provider read from its cache, at a tenth of the price or less. The instructions are identical for every message, so this should be high.">Input from cache</th><th class="num">Cost per call</th><th class="num">Median time</th><th class="num" title="19 calls in 20 are faster than this.">95th percentile</th><th>Instructions</th></tr></thead><tbody>
      ${s.byModel.map((m) => html`<tr><td><b>${m.model}</b> <span class="muted small">${m.role === 'second' ? 'second reader' : 'first reader'}, ${m.provider}</span></td><td class="num">${n(m.calls)}</td><td class="num">${m.errors}</td><td class="num">${pct(m.cacheShare)}</td><td class="num">${m.costPerCall === null ? 'n/a' : `$${m.costPerCall.toFixed(5)}`}</td><td class="num">${sec(m.p50Ms)}</td><td class="num">${sec(m.p95Ms)}</td><td class="muted small">${m.promptVersion} · ${m.promptHash}</td></tr>`)}
    </tbody></table></div>
    <div class="stats">
      <div class="stat"><div class="stat-v">${pct(p.agreement)}</div><div class="stat-l">of messages: the two readers agree on every statement that needs two keys</div><div class="muted small">${p.messagesWherePairAgrees} of ${p.messagesWithClosingStatements} messages that have such statements.</div></div>
      ${typeof p.scored === 'number' ? html`<div class="stat"><div class="stat-v">${pct(p.toPersonShare)}</div><div class="stat-l">of messages went to a person because of the reading</div><div class="muted small">${p.toPerson} of ${p.scored}. This is the number that turns into minutes.</div></div>
      <div class="stat"><div class="stat-v">${p.wrongClosings}</div><div class="stat-l">wrong closings on ${p.scored} labelled messages</div><div class="muted small">${p.droppedByGuard} statements were refused by the code guard, ${p.failedReads} reads failed.</div></div>` : ''}
    </div>
    <h3>What would raise an alarm</h3>
    ${a.length ? html`<ul class="tight">${a.map((x) => html`<li>${pill(x.code.split('_').join(' ').toLowerCase(), x.code === 'WRONG_CLOSING' ? 'bad' : 'wait')} ${x.text}</li>`)}</ul>` : html`<p>${pill('quiet', 'good')} Nothing is over its limit.</p>`}
    <p class="muted small">Limits: more than 35% of messages to a person, the pair agreeing on fewer than 60%, 1 call in 20 slower than 30 seconds, more than 2 cents per message, more than 2% of calls failing, less than half the input from cache, any wrong closing on a labelled message. A trace record holds hashes and counts, never the text of a message. In production the same records go to a tracing backend, and a run of the labelled messages on every change to the instructions or the model is the gate before anything ships. Reproduce with <code>node cli/trace.js</code>.</p>
  </section>`;
}

// How well messages are read: every run that was made, the fair test first.
function readerTable(rows, caption) {
  const detail = (r) => (r.kind === 'recorded' ? 'The answers saved in data/recorded_reads.json. Replays offline, with no key.'
    : r.kind === 'offline' ? 'No model and no key.'
      : `Live run${r.failed_reads ? `. ${r.failed_reads} answer${r.failed_reads === 1 ? ' was' : 's were'} cut off and counted as not read` : ''}.`);
  return html`<h3>${caption}</h3>
  <div class="tablewrap"><table class="mini readers"><thead><tr><th>Reader</th><th class="num" title="Of the statements in the labels, how many the reading applied. With a 95% interval.">Statements found</th><th class="num" title="Of the statements the reading applied, how many are in the labels.">Of those applied, right</th><th class="num">Messages read exactly</th><th class="num" title="A statement that can close a gate or set an official fact, and that the labels do not have or have with another date, time or person.">Wrong closings</th><th class="num" title="Because of the reading: a statement only one reader found, a passage nobody could place, or an answer the code guard refused.">Messages to a person</th><th class="num">Cost per message</th></tr></thead><tbody>
    ${rows.map((r) => html`<tr class="${r.kind === 'recorded' ? 'selected' : ''}"><td><b>${r.reader}</b> ${r.kind === 'recorded' ? pill('recorded', 'info') : ''}<div class="muted small">${detail(r)}</div></td>
      <td class="num">${r.found}</td><td class="num">${r.right}</td><td class="num">${r.exact}</td><td class="num">${r.wrong_closings}</td><td class="num">${r.to_person}</td><td class="num">${r.cost_per_message || (r.kind === 'offline' ? 'nothing' : 'see notes')}</td></tr>`)}
  </tbody></table></div>`;
}

function unseenList(data) {
  const set = data.heldout, rr = data.reader_results;
  if (!set || !set.messages || !rr || !rr.per_message) return '';
  const outcome = (row) => (!row ? pill('no record', 'muted') : row.failed ? pill('not read', 'bad') : row.exact && !row.for_person ? pill('same as the labels', 'good') : row.for_person ? pill('to a person', 'wait') : pill('differs', 'bad'));
  const said = (c) => `${c.type.split('_').join(' ')} ${(c.cases || []).join(', ')}${c.date ? `, ${c.date}` : ''}${c.time ? ` ${c.time}` : ''}${c.consultant ? `, ${c.consultant}` : ''}`;
  return html`<details class="unseen"><summary><b>The ${set.messages.length} unseen messages, one by one</b> <span class="muted small">what each says, what the labels say, and what the two recorded AI readers made of it</span></summary>
    <p class="muted small">${set.note}</p>
    ${set.messages.map((m) => { const row = rr.per_message[String(m.id)]; return html`<details class="unseen-one"><summary><b>${m.id}</b> ${m.sender} · ${m.channel} ${outcome(row)}</summary>
      <blockquote class="body">${m.body}</blockquote>
      <p class="small"><b>Labels:</b> ${m.claims.length ? m.claims.map(said).join('; ') : 'no statement'}${m.expect_no_effect ? '. Must change nothing on the record.' : ''}</p>
      ${row ? html`<p class="small"><b>The two AI readers applied:</b> ${row.applied.length ? row.applied.join('; ') : 'nothing'}${row.missed.length ? html`. <b>Not found:</b> ${row.missed.map((x) => x.split('|').slice(0, 2).join(' ')).join('; ')}` : ''}${row.extra.length ? html`. <b>Not in the labels:</b> ${row.extra.map((x) => x.split('|').slice(0, 2).join(' ')).join('; ')}` : ''}${(row.held || []).length ? html`. <b>Held back for a person:</b> ${row.held.map((h) => `${h.claim} (${h.reason})`).join('; ')}` : ''}${(row.not_classified || []).length ? html`. <b>Passed to a person as text they could not place:</b> ${row.not_classified.map((q) => `"${q}"`).join(' ')}` : ''}</p>` : ''}
      ${m.trap ? html`<p class="small muted"><b>Why it is hard:</b> ${m.trap}</p>` : ''}
    </details>`; })}
  </details>`;
}

function readingSection(app, dev) {
  const { data } = app;
  const rr = data.reader_results;
  if (!rr || !rr.rows) {
    return html`<section class="panel"><div class="panel-head"><h2>How well are messages read?</h2></div>
      <p>${dev ? html`The offline pattern reader reads <b>${dev.exact} of ${dev.n}</b> example messages exactly. That is an upper bound, not an accuracy figure: the patterns were written while looking at these messages.` : 'Run the checks to compute the offline reader\'s score on the examples.'}</p>
      <p class="muted small">Results on unseen messages, and for the AI readers, are added here when those runs are recorded. See the README for how to run them with an API key.</p></section>`;
  }
  const h = rr.headline, unseen = rr.rows.filter((r) => r.set === 'unseen'), examples = rr.rows.filter((r) => r.set === 'examples');
  return html`<section class="panel">
    <div class="panel-head"><h2>How well are messages read?</h2></div>
    <p>Reading is the only step where a model is used, and the only one that can be wrong in a new way. So it is measured separately, on messages nobody had seen when the reader was built. ${h ? html`On ${h.unseen_n} unseen office messages the two AI readers together found <b>${h.ai_found}</b> of the labelled statements, <b>${h.ai_right}</b> of what they applied was right, and <b>${h.ai_to_person}</b> messages went to a person. The offline pattern reader, which this page uses when there is no key, found ${h.offline_recall}.` : ''}</p>
    ${readerTable(unseen, 'The fair test: 30 unseen office messages (57 labelled statements)')}
    ${readerTable(examples, 'The 72 example messages (215 labelled statements). Not a fair test: every reader here was built with these in view')}
    <h3>What these numbers do and do not show</h3>
    <ul class="notes">${(rr.notes || []).map((n) => html`<li>${n}</li>`)}</ul>
    ${(rr.reproduce || []).length ? html`<h3>Run it yourself</h3><table class="mini"><tbody>${rr.reproduce.map((x) => html`<tr><td>${x.what}</td><td><code>${x.command}</code></td></tr>`)}</tbody></table>` : ''}
    <p class="muted small">All paid runs listed here cost $${rr.spend_usd.toFixed(2)} in total. Only fictional example messages were sent.</p>
    ${unseenList(data)}
  </section>`;
}

export function checksView(app) {
  const { ui, kit, data } = app;
  const problems = kit.problems;
  const run = ui.checks;                                   // { results: Map(id -> result), running, done, ms }
  const stored = data.coverage;
  const groups = [...new Set(problems.map((p) => p.group))];
  const resultOf = (p) => (run.results.get(p.id) || null);
  const ran = run.results.size;
  const passed = [...run.results.values()].filter((r) => r.ok).length;
  const dev = ui.devScore;

  return html`
  <section class="panel">
    <div class="panel-head"><h2>${problems.length} problems the engine is tested against</h2></div>
    <p>Each one is a real situation: most come straight from the firm's example messages and operating rules, the rest from asking "what if" (silence, a second yes, a forged sender, a postponement, an eleventh county). A check replays the examples up to a point, lets the engine act, and tests what it did.</p>
    <div class="formrow">
      <button class="btn btn-primary" data-action="run-checks" ${run.running ? raw('disabled') : ''}>${run.running ? `Running… ${ran} of ${problems.length}` : ran ? 'Run them again' : 'Run all of them now, in this browser'}</button>
      ${ran ? html`<span>${pill(`${passed} of ${ran} pass`, passed === ran ? 'good' : 'bad')}${run.done ? html` <span class="muted small">in ${(run.ms / 1000).toFixed(1)} seconds, on this computer, just now.</span>` : ''}</span>`
      : stored ? html`<span class="muted small">Last full run when this file was built: ${stored.pass} of ${stored.total} pass.</span>` : ''}
    </div>
    <p class="muted small">What this proves, and what it does not: the checks prove the logic (who may establish what, what happens next, what is never done automatically) on the reader's output. They do not measure how well a reader understands new wording. That is a separate measurement, below.</p>
  </section>

  ${readingSection(app, dev)}
  ${opsSection(app)}

  ${groups.map((g) => { const list = problems.filter((p) => p.group === g); const done = list.filter((p) => resultOf(p)); const ok = done.filter((p) => resultOf(p).ok).length;
    return html`<section class="panel"><details ${ui.openGroups.has(g) ? raw('open') : ''} data-toggle-group="${g}">
      <summary><h2 class="inline">${g}</h2> <span class="count">${list.length}</span> ${done.length ? pill(`${ok} of ${done.length} pass`, ok === done.length ? 'good' : 'bad') : ''}</summary>
      <table class="mini checks"><thead><tr><th></th><th>Problem</th><th>What the tower must do</th></tr></thead><tbody>
        ${list.map((p) => { const r = resultOf(p); return html`<tr><td class="nowrap"><b>${p.id}</b> ${r ? pill(r.ok ? 'pass' : 'FAIL', r.ok ? 'good' : 'bad') : ''}</td><td>${p.problem}${r && r.error ? html`<div class="tone-text-bad small">${r.error}</div>` : ''}</td><td>${p.expect}</td></tr>`; })}
      </tbody></table></details></section>`; })}`;
}
