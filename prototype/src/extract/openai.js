// EXTRACT stage, live AI reader on the OpenAI Responses API: one request per message.
//
//   const read = createOpenAIReader();                  // key from OPENAI_API_KEY
//   const out = await read(msg, dir, ctx);              // msg, ctx from engine.prepare(raw)
//   out = { claims, dropped, unclassified, fixed, usage, costUsd, ms, model, requestId }
//
// The instructions, the output schema and the code guard are the same as for the Claude adapter
// (prompt.js). Only the transport differs:
//   - The instructions are the `instructions` field. They are identical for every message, so
//     after the first request the provider reads them from its prompt cache (automatic for
//     prompts of 1,024 tokens or more; cached tokens are reported and priced separately).
//   - The message, with the sender as checked by code and the thread's official facts, is the
//     user input.
//   - The answer is constrained to the reader schema with structured outputs in strict mode.
//     Strict mode wants every property listed as required, so optional fields become nullable
//     here and nulls are removed again before the code guard sees the answer.
//   - No tools, and store: false. The reader can report, never act, and nothing is kept.
// The answer is never trusted as it is: it goes through normalizeClaims here, then through the
// cross-check (crosscheck.js) and the verifier (verify.js).
//
// The key is read from the environment and never written anywhere. No SDK: plain fetch.
// Behind a proxy, start Node with NODE_USE_ENV_PROXY=1 (Node 22.21 or newer).

import { READER_SCHEMA, PROMPT_VERSION, buildReaderSystem, buildReaderInput, normalizeClaims, hashText } from './prompt.js';
import { TWO_KEY_TYPES } from './crosscheck.js';
import { ReaderError } from './claude.js';

// The default pair was chosen from the measurements in eval/reader_results.json: with this first
// reader the fewest messages went to a person on the larger labelled set, and the cheapest model
// as the second key costs a twentieth of a cent per message. A person's minute costs far more
// than either, so the stronger first reader pays for itself. On the 30 unseen messages the
// models could not be told apart, so the cheap pair (both gpt-6-luna) is a fair choice as well.
export const DEFAULT_MODEL = 'gpt-6.1-sol';
export const DEFAULT_SECOND_MODEL = 'gpt-6-luna';
export const ENDPOINT = 'https://api.openai.com/v1/responses';

// USD per million tokens: input, cached input, output. CHECK CURRENT PRICING before relying on
// any cost figure: https://developers.openai.com/api/docs/pricing
// Source: that page, read on 2026-11-17. A model that is not listed here gets no cost (null):
// a cost is never guessed.
export const PRICES = {
  'gpt-6.1-sol': { input: 2.00, cached: 0.10, output: 10.00 },
  'gpt-6.1-terra': { input: 1.00, cached: 0.05, output: 5.00 },
  'gpt-6-sol': { input: 2.00, cached: 0.20, output: 10.00 },
  'gpt-6-astra': { input: 10.00, cached: 1.00, output: 50.00 },
  'gpt-6-luna': { input: 0.10, cached: 0.01, output: 0.50 },
  'gpt-5.6-sol': { input: 4.00, cached: 0.40, output: 20.00 },
  'gpt-5.6-terra': { input: 2.00, cached: 0.20, output: 12.00 },
  'gpt-5.6-luna': { input: 0.20, cached: 0.02, output: 1.20 },
  'gpt-5.5': { input: 5.00, cached: 0.50, output: 30.00 },
  'gpt-5.4': { input: 2.50, cached: 0.25, output: 15.00 },
  'gpt-5.4-mini': { input: 0.75, cached: 0.075, output: 4.50 },
  'gpt-5.4-nano': { input: 0.20, cached: 0.02, output: 1.25 },
};

// usage.input_tokens counts all input, cached or not; the cached part is priced lower.
// usage.output_tokens includes reasoning tokens.
export function costOf(usage, model) {
  const p = PRICES[model] || PRICES[Object.keys(PRICES).sort((a, b) => b.length - a.length).find((k) => String(model || '').startsWith(k))];
  if (!p || !usage) return null;
  const cached = (usage.input_tokens_details && usage.input_tokens_details.cached_tokens) || 0;
  return (((usage.input_tokens || 0) - cached) * p.input + cached * p.cached + (usage.output_tokens || 0) * p.output) / 1e6;
}

// Strict structured outputs: every property required, additionalProperties false, optional
// fields nullable. Built from the shared schema, so the two adapters cannot drift apart.
export function toStrictSchema(schema) {
  const nullable = (n) => ({ ...n, type: Array.isArray(n.type) ? [...new Set([...n.type, 'null'])] : [n.type, 'null'], ...(n.enum ? { enum: [...n.enum, null] } : {}) });
  const walk = (node) => {
    if (!node || typeof node !== 'object') return node;
    if (node.type === 'object' && node.properties) {
      const required = new Set(node.required || []);
      const properties = {};
      for (const [k, v] of Object.entries(node.properties)) properties[k] = required.has(k) ? walk(v) : nullable(walk(v));
      return { ...node, properties, required: Object.keys(properties), additionalProperties: false };
    }
    if (node.type === 'array' && node.items) return { ...node, items: walk(node.items) };
    return { ...node };
  };
  return walk(schema);
}
export const STRICT_SCHEMA = toStrictSchema(READER_SCHEMA);

const dropNulls = (o) => (Array.isArray(o) ? o.map(dropNulls) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null).map(([k, v]) => [k, dropNulls(v)])) : o);

const NO_KEY = 'No OpenAI API key was found. Put a line OPENAI_API_KEY=... in a file named .env in the prototype folder (or set the environment variable) and start again. Without a key the prototype still runs: it uses the recorded reads and the offline rules reader.';
const envKey = () => (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY : null);
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

// opts:
//   apiKey      default: process.env.OPENAI_API_KEY
//   model       default: gpt-6.1-sol (DEFAULT_MODEL)
//   variant     'primary' (default), or 'second': the sceptical second reader that reports only
//               claims that need two keys (crosscheck.js)
//   effort      reasoning effort ('none' | 'low' | 'medium' | 'high'). Not sent unless given, so
//               the model's own default applies. The lowest value a model accepts differs.
//   maxOutputTokens  default 2000. Reasoning counts towards it. Measured on 204 answers: the longest
//                    was 953 tokens, and an answer either stays in that range or runs away to the
//                    limit, so a low limit makes a runaway cheap and the retry gives a long
//                    message its room (2,000, then 4,000, then 8,000).
//   cutOffRetries    default 2. An answer that is cut off at the limit is asked again with twice
//                    the limit, this many times at most.
//   fetchImpl   a fetch function, used instead of the global one (tests)
//   timeoutMs, maxRetries   per request (defaults 90000 and 3; 429 and 5xx are retried)
export function createOpenAIReader({ apiKey, model = DEFAULT_MODEL, variant = 'primary', effort, maxOutputTokens = 2000, cutOffRetries = 2, fetchImpl = null, timeoutMs = 90000, maxRetries = 3, endpoint = ENDPOINT } = {}) {
  const key = apiKey || envKey();
  if (!fetchImpl && !key) throw new ReaderError(NO_KEY, { code: 'no_key' });
  if (!['primary', 'second'].includes(variant)) throw new Error(`createOpenAIReader: unknown variant "${variant}".`);
  const doFetch = fetchImpl || ((...a) => fetch(...a));

  const systems = new WeakMap();
  const systemFor = (dir) => {
    if (!systems.has(dir)) systems.set(dir, buildReaderSystem(dir, variant === 'second' ? { variant: 'second', closing: TWO_KEY_TYPES } : {}));
    return systems.get(dir);
  };
  const paramsFor = (system, input) => ({
    model,
    instructions: system,
    input: [{ role: 'user', content: input }],
    text: { format: { type: 'json_schema', name: 'reader_output', strict: true, schema: STRICT_SCHEMA } },
    ...(effort ? { reasoning: { effort } } : {}),
    max_output_tokens: maxOutputTokens,
    store: false,
  });
  const buildParams = (msg, dir, ctx) => paramsFor(systemFor(dir), buildReaderInput(msg, dir, ctx));

  async function call(params) {
    let last = null;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const res = await doFetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify(params), signal: ctl.signal });
        clearTimeout(timer);
        const requestId = res.headers && res.headers.get ? res.headers.get('x-request-id') : null;
        if (res.ok) return { json: await res.json(), requestId };
        let detail = '';
        try { const j = await res.json(); detail = j && j.error && j.error.message ? j.error.message : ''; } catch { detail = ''; }
        const mk = (code, text, retryable = false) => new ReaderError(text, { code, retryable, requestId });
        if (res.status === 401) throw mk('auth', 'The OpenAI API key was not accepted (401). Check the key in the .env file.');
        if (res.status === 403) throw mk('permission', `The API key is not allowed to do this (403). ${detail}`.trim());
        if (res.status === 404) throw mk('bad_request', `The model "${model}" was not found for this key (404). ${detail}`.trim());
        if (res.status === 400) throw mk('bad_request', `The API rejected the request (400): ${detail || 'no details'}`);
        last = mk(res.status === 429 ? 'rate_limit' : 'api', res.status === 429 ? `The API rate limit was reached (429). ${detail}`.trim() : `The API request failed (${res.status}). ${detail}`.trim(), true);
        if (res.status !== 429 && res.status < 500) throw last;
      } catch (e) {
        clearTimeout(timer);
        if (e instanceof ReaderError && !e.retryable) throw e;
        last = e instanceof ReaderError ? e : new ReaderError('The API could not be reached (network or timeout).', { code: 'connection', retryable: true, cause: e });
      }
      if (attempt < maxRetries) await sleep(600 * 2 ** attempt);
    }
    throw last;
  }

  // One request, with the instructions and the input given as text. reader() uses it, and so does
  // the dev server (app/server.js), where the browser builds both texts and the key stays on the
  // server. Returns the model's answer as parsed JSON: it has NOT been through the code guard yet.
  async function ask(system, input) {
    const t = reader.totals;
    let cap = maxOutputTokens, wasted = 0, last = null;
    // The model thinks before it answers, and its thinking counts towards the output limit. Now
    // and then it thinks far longer than usual and the answer is cut off (measured: 2 of 72
    // first reads at a limit of 6,000 in the recorded run). The answer is then not used, and the message is read
    // again with twice the room. What the cut-off attempt cost is added to the cost reported.
    for (let attempt = 0; attempt <= cutOffRetries; attempt += 1) {
      const t0 = Date.now();
      let got;
      try { got = await call({ ...paramsFor(system, input), max_output_tokens: cap }); } catch (e) { t.failures += 1; throw e; }
      const res = got.json, requestId = got.requestId;
      const ms = Date.now() - t0;
      const usage = res.usage || null;
      const cost = costOf(usage, res.model || model);
      const costUsd = cost === null ? null : cost + wasted;
      t.requests += 1; t.ms += ms;
      if (usage) {
        t.inputTokens += usage.input_tokens || 0; t.outputTokens += usage.output_tokens || 0;
        t.cachedTokens += (usage.input_tokens_details && usage.input_tokens_details.cached_tokens) || 0;
        t.reasoningTokens += (usage.output_tokens_details && usage.output_tokens_details.reasoning_tokens) || 0;
      }
      if (cost !== null) t.costUsd += cost;

      const fail = (code, text) => Object.assign(new ReaderError(text, { code, requestId }), { usage, costUsd, ms });
      if (res.status === 'incomplete') {
        last = fail('max_tokens', `The answer was cut off (${(res.incomplete_details && res.incomplete_details.reason) || 'incomplete'}) at a limit of ${cap} tokens${attempt ? `, after ${attempt + 1} attempts` : ''}.`);
        t.cutOff += 1; wasted += cost || 0; cap *= 2;
        continue;
      }
      const parts = (res.output || []).filter((o) => o && o.type === 'message').flatMap((o) => o.content || []);
      const refusal = parts.find((x) => x && x.type === 'refusal');
      if (refusal) { t.failures += 1; throw fail('refusal', 'The model declined to read this message.'); }
      const text = parts.filter((x) => x && x.type === 'output_text').map((x) => x.text).join('');
      let parsed = null;
      try { parsed = text ? dropNulls(JSON.parse(text)) : null; } catch { parsed = null; }
      if (!parsed || !Array.isArray(parsed.claims)) { t.failures += 1; throw fail('bad_json', 'The answer was not the expected JSON object.'); }
      return { raw: parsed, usage, costUsd, ms, model: res.model || model, requestId, attempts: attempt + 1 };
    }
    t.failures += 1;
    throw last;
  }

  async function reader(msg, dir, ctx) {
    const a = await ask(systemFor(dir), buildReaderInput(msg, dir, ctx));
    const g = normalizeClaims(a.raw, msg, dir, ctx);
    return { claims: g.claims, dropped: g.dropped, unclassified: g.unclassified, fixed: g.fixed, ...a };
  }
  reader.ask = ask;
  reader.label = `${model} (${PROMPT_VERSION}${variant === 'second' ? ', second reader' : ''}${effort ? `, effort ${effort}` : ''})`;
  reader.model = model;
  reader.variant = variant;
  reader.buildParams = buildParams;
  reader.promptHash = (dir) => hashText(systemFor(dir));
  reader.totals = { requests: 0, failures: 0, cutOff: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, reasoningTokens: 0, costUsd: 0, ms: 0 };
  return reader;
}

export const createSecondReader = (opts = {}) => createOpenAIReader({ ...opts, variant: 'second' });
