// EXTRACT stage, live AI reader: one Claude request per message.
//
//   const read = createClaudeReader();                  // key from ANTHROPIC_API_KEY
//   const out = await read(msg, dir, ctx);              // msg, ctx from engine.prepare(raw)
//   out = { claims, dropped, unclassified, fixed, usage, costUsd, ms, model, stopReason, requestId }
//
// What the request is, and why:
//   - The instructions (the job, the claim vocabulary, the reading rules, the roster) are the
//     SYSTEM prompt, sent as one text block with a cache breakpoint. They are identical for every
//     message, so after the first request they are read from the cache at a fraction of the price.
//   - The message, with the sender as checked by code and the thread's official facts, is the
//     USER turn. It comes after the breakpoint, so it never disturbs the cached part.
//   - The answer is constrained to READER_SCHEMA with structured outputs (output_config.format).
//   - No tools. The reader can report, never act.
//   - No temperature, top_p or top_k: the current models reject them (HTTP 400). Thinking is
//     always on for claude-opus-5-5 and is not configured here. `effort` is the one dial.
// The model's answer is never trusted as it is: it goes through normalizeClaims here, then
// through the cross-check (crosscheck.js) and the verifier (verify.js).
//
// The key is read from the environment and never written anywhere. The SDK is imported only when
// the first request is made, so everything else in the prototype runs without it.

import { READER_SCHEMA, PROMPT_VERSION, buildReaderSystem, buildReaderInput, normalizeClaims, hashText } from './prompt.js';
import { TWO_KEY_TYPES } from './crosscheck.js';

export const DEFAULT_MODEL = 'claude-opus-5-5';

// USD per million tokens. CHECK CURRENT PRICING before relying on any cost figure:
// https://platform.claude.com/docs/en/about-claude/pricing
// Source: the Claude API reference bundled with this session, read on 2026-11-17. For the first two
// models every number is stated there outright. For claude-haiku-5-5 only input and output are
// stated (for prompts of 100,000 tokens or fewer); its cache prices are derived from the general
// multiples in the same reference (read 0.1x, 5-minute write 1.25x, 1-hour write 2x of input).
export const PRICES = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.20, cacheWrite5m: 5, cacheWrite1h: 8, batchDiscount: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.10, cacheWrite5m: 2.5, cacheWrite1h: 4, batchDiscount: 0.5 },
  'claude-haiku-5-5': { input: 0.10, output: 0.50, cacheRead: 0.01, cacheWrite5m: 0.125, cacheWrite1h: 0.20, batchDiscount: 0.5, derived: ['cacheRead', 'cacheWrite5m', 'cacheWrite1h'] },
};

// Cost of one response from its usage block. Returns null for a model that is not in PRICES
// (a cost is never guessed). usage.input_tokens is the uncached remainder only; cached tokens are
// reported, and priced, separately.
export function costOf(usage, model, { cacheTtl = '5m', batch = false } = {}) {
  const p = PRICES[model] || PRICES[Object.keys(PRICES).find((k) => String(model || '').startsWith(k))];
  if (!p || !usage) return null;
  const split = usage.cache_creation || null;
  const w5 = split ? split.ephemeral_5m_input_tokens || 0 : cacheTtl === '1h' ? 0 : usage.cache_creation_input_tokens || 0;
  const w1 = split ? split.ephemeral_1h_input_tokens || 0 : cacheTtl === '1h' ? usage.cache_creation_input_tokens || 0 : 0;
  const usd = ((usage.input_tokens || 0) * p.input + (usage.output_tokens || 0) * p.output + (usage.cache_read_input_tokens || 0) * p.cacheRead + w5 * p.cacheWrite5m + w1 * p.cacheWrite1h) / 1e6;
  return batch ? usd * p.batchDiscount : usd;
}

// Every failure of the live reader is one of these. `code` is stable; never match on the message.
//   no_key, no_sdk, auth, permission, rate_limit, bad_request, connection, api,
//   refusal, max_tokens, bad_json
export class ReaderError extends Error {
  constructor(message, { code, retryable = false, requestId = null, cause } = {}) {
    super(message);
    this.name = 'ReaderError';
    this.code = code;
    this.retryable = retryable;
    this.requestId = requestId;
    if (cause) this.cause = cause;
  }
}

const NO_KEY = 'No Anthropic API key was found. Put a line ANTHROPIC_API_KEY=... in a file named .env in the prototype folder (or set the environment variable) and start again. Without a key the prototype still runs: it uses the recorded reads and the offline rules reader.';
const NO_SDK = 'The Anthropic SDK is not installed. Run "npm install @anthropic-ai/sdk" in the prototype folder and start again. Without it the prototype still runs with the recorded reads and the offline rules reader.';
const envKey = () => (typeof process !== 'undefined' && process.env && process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY : null);

function toReaderError(e, sdk) {
  if (e instanceof ReaderError) return e;
  const requestId = (e && (e.requestID || e.request_id)) || null;
  const is = (name) => !!(sdk && sdk[name] && e instanceof sdk[name]);
  const status = e && typeof e.status === 'number' ? e.status : null;
  const mk = (code, text, retryable = false) => new ReaderError(text, { code, retryable, requestId, cause: e });
  if (is('AuthenticationError') || status === 401) return mk('auth', 'The Anthropic API key was not accepted (401). Check the key in the .env file.');
  if (is('PermissionDeniedError') || status === 403) return mk('permission', 'The API key is not allowed to use this model (403).');
  if (is('RateLimitError') || status === 429) return mk('rate_limit', 'The API rate limit was reached (429). The request was retried and still refused.', true);
  if (is('BadRequestError') || status === 400) return mk('bad_request', `The API rejected the request (400): ${e && e.message ? e.message : 'no details'}`);
  if (is('APIConnectionError') || (status === null && e && /connect|network|timed? ?out|fetch failed/i.test(String(e.name) + String(e.message)))) return mk('connection', 'The API could not be reached (network or timeout).', true);
  return mk('api', `The API request failed${status ? ` (${status})` : ''}: ${e && e.message ? e.message : e}`, status !== null && status >= 500);
}

// opts:
//   apiKey      default: process.env.ANTHROPIC_API_KEY
//   model       default: claude-opus-5-5
//   client      an object with messages.create(params, options), used instead of the SDK (tests)
//   variant     'primary' (default), or 'second': the sceptical second reader that reports only
//               claims that need two keys (crosscheck.js)
//   effort      'low' | 'medium' | 'high' | 'xhigh' | 'max'. Not sent unless given, so the
//               model's own default applies
//   maxTokens   default 8000. Thinking counts towards it, so it is far above the size of the answer
//   cacheTtl    '5m' (default) or '1h' for a mailbox that is quiet for more than five minutes at a time
//   timeoutMs, maxRetries   passed to the SDK for each request (defaults 60000 and 2)
export function createClaudeReader({ apiKey, model = DEFAULT_MODEL, client = null, variant = 'primary', effort, maxTokens = 8000, cacheTtl = '5m', timeoutMs = 60000, maxRetries = 2 } = {}) {
  const key = apiKey || envKey();
  if (!client && !key) throw new ReaderError(NO_KEY, { code: 'no_key' });
  if (!['primary', 'second'].includes(variant)) throw new Error(`createClaudeReader: unknown variant "${variant}".`);

  let sdk = null, live = client;
  async function connect() {
    if (live) return live;
    const name = '@anthropic-ai/sdk';                    // a variable, so that bundlers leave it alone
    try { sdk = (await import(name)).default; } catch (e) { throw new ReaderError(NO_SDK, { code: 'no_sdk', cause: e }); }
    live = new sdk({ apiKey: key });
    return live;
  }

  // The instructions are built once per directory, so every request sends byte-identical text
  // and the cache breakpoint keeps hitting.
  const systems = new WeakMap();
  const systemFor = (dir) => {
    if (!systems.has(dir)) systems.set(dir, buildReaderSystem(dir, variant === 'second' ? { variant: 'second', closing: TWO_KEY_TYPES } : {}));
    return systems.get(dir);
  };
  const paramsFor = (system, input) => ({
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: system, cache_control: cacheTtl === '1h' ? { type: 'ephemeral', ttl: '1h' } : { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: input }],
    output_config: { format: { type: 'json_schema', schema: READER_SCHEMA }, ...(effort ? { effort } : {}) },
  });
  const buildParams = (msg, dir, ctx) => paramsFor(systemFor(dir), buildReaderInput(msg, dir, ctx));

  // One request, with the instructions and the input given as text. reader() uses it, and so does
  // the dev server (app/server.js). The answer has NOT been through the code guard yet.
  async function ask(system, input) {
    const t0 = Date.now();
    let res;
    try {
      const c = await connect();
      res = await c.messages.create(paramsFor(system, input), { timeout: timeoutMs, maxRetries });
    } catch (e) {
      reader.totals.failures += 1;
      throw toReaderError(e, sdk);
    }
    const ms = Date.now() - t0;
    const usage = res.usage || null;
    const costUsd = costOf(usage, res.model || model, { cacheTtl });
    const requestId = res._request_id || null;
    const t = reader.totals;
    t.requests += 1; t.ms += ms;
    if (usage) { t.inputTokens += usage.input_tokens || 0; t.outputTokens += usage.output_tokens || 0; t.cacheReadTokens += usage.cache_read_input_tokens || 0; t.cacheWriteTokens += usage.cache_creation_input_tokens || 0; }
    if (costUsd !== null) t.costUsd += costUsd;

    // With these two stop reasons the answer may not follow the schema. It is not used at all.
    const fail = (code, text) => { t.failures += 1; return Object.assign(new ReaderError(text, { code, requestId }), { usage, costUsd, ms }); };
    if (res.stop_reason === 'refusal') throw fail('refusal', `The model declined to read this message${res.stop_details && res.stop_details.category ? ` (${res.stop_details.category})` : ''}.`);
    if (res.stop_reason === 'max_tokens') throw fail('max_tokens', `The answer was cut off at ${maxTokens} tokens. Raise maxTokens.`);
    const block = (res.content || []).find((b) => b && b.type === 'text');
    let parsed = null;
    try { parsed = block ? JSON.parse(block.text) : null; } catch { parsed = null; }
    if (!parsed || !Array.isArray(parsed.claims)) throw fail('bad_json', 'The answer was not the expected JSON object.');

    return { raw: parsed, usage, costUsd, ms, model: res.model || model, stopReason: res.stop_reason || null, requestId };
  }

  async function reader(msg, dir, ctx) {
    const a = await ask(systemFor(dir), buildReaderInput(msg, dir, ctx));
    const g = normalizeClaims(a.raw, msg, dir, ctx);
    return { claims: g.claims, dropped: g.dropped, unclassified: g.unclassified, fixed: g.fixed, ...a };
  }
  reader.ask = ask;
  reader.label = `${model} (${PROMPT_VERSION}${variant === 'second' ? ', second reader' : ''})`;
  reader.model = model;
  reader.variant = variant;
  reader.buildParams = buildParams;                                    // the exact request, for tests and for the Batches API
  reader.promptHash = (dir) => hashText(systemFor(dir));               // goes into the provenance of recorded reads
  reader.totals = { requests: 0, failures: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0, ms: 0 };
  return reader;
}

// The second key: the same message, read by a reader with different, more sceptical instructions
// that reports only claims which can close something. Give it another model for more independence.
export const createSecondReader = (opts = {}) => createClaudeReader({ ...opts, variant: 'second' });
