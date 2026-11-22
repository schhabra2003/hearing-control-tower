// EXTRACT stage, live AI reader on any OpenAI-compatible chat-completions endpoint.
//
// This is the adapter for open-weight models (and any other model) served by an inference
// provider or by the firm's own machine: OpenRouter, Together, Fireworks, Groq, DeepInfra,
// a local vLLM or Ollama server. They all accept POST <base>/chat/completions.
//
//   const read = createCompatReader({ baseUrl: 'https://openrouter.ai/api/v1', model: '<vendor>/<model>' });
//   const out = await read(msg, dir, ctx);            // same result shape as the other adapters
//
// The instructions, the output schema and the code guard are the SAME as for the other two
// adapters (prompt.js), so a comparison between models compares the models and nothing else.
// What differs between providers is how firmly the answer is held to the schema:
//   'schema'  response_format json_schema, strict. The provider constrains the output.
//   'object'  response_format json_object. Valid JSON, shape not guaranteed.
//   'prompt'  no response_format. The schema is in the instructions only.
// The adapter starts at the firmest mode asked for and steps down once when the endpoint
// rejects it (400). The mode that was used is reported with every read, because a model that
// only works in 'prompt' mode is a weaker guarantee even when its answers are right.
// Whatever the mode, the answer goes through normalizeClaims, the cross-check and the verifier.
//
// Prices are not built in: providers change them, and the same open model has a different price
// at each provider. Pass prices ({ input, cached, output } in USD per million tokens) or let the
// provider report the cost itself (OpenRouter returns usage.cost). Without either, the cost is
// null: a cost is never guessed.
//
// The key is read from the environment and never written anywhere. No SDK: plain fetch.

import { READER_SCHEMA, PROMPT_VERSION, buildReaderSystem, buildReaderInput, normalizeClaims, hashText } from './prompt.js';
import { TWO_KEY_TYPES } from './crosscheck.js';
import { ReaderError } from './claude.js';
import { STRICT_SCHEMA } from './openai.js';

export const PROVIDERS = {
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', keyEnv: 'OPENROUTER_API_KEY' },
  together: { baseUrl: 'https://api.together.xyz/v1', keyEnv: 'TOGETHER_API_KEY' },
  fireworks: { baseUrl: 'https://api.fireworks.ai/inference/v1', keyEnv: 'FIREWORKS_API_KEY' },
  groq: { baseUrl: 'https://api.groq.com/openai/v1', keyEnv: 'GROQ_API_KEY' },
  deepinfra: { baseUrl: 'https://api.deepinfra.com/v1/openai', keyEnv: 'DEEPINFRA_API_KEY' },
  local: { baseUrl: 'http://127.0.0.1:11434/v1', keyEnv: null },        // Ollama's default port; vLLM uses 8000
};
const MODES = ['schema', 'object', 'prompt'];

const env = (k) => (k && typeof process !== 'undefined' && process.env && process.env[k] ? process.env[k] : null);
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const dropNulls = (o) => (Array.isArray(o) ? o.map(dropNulls) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null).map(([k, v]) => [k, dropNulls(v)])) : o);

// Models that are not held to a schema often wrap the JSON in a code fence, or think aloud
// first. Take the last complete top-level object in the text; anything else is not an answer.
export function looseJson(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const t = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  try { return JSON.parse(t); } catch { /* fall through */ }
  let best = null;
  for (let start = t.indexOf('{'); start !== -1; start = t.indexOf('{', start + 1)) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < t.length; i += 1) {
      const ch = t[i];
      if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true;
      else if (ch === '{') depth += 1;
      else if (ch === '}') { depth -= 1; if (depth === 0) { try { const j = JSON.parse(t.slice(start, i + 1)); if (j && typeof j === 'object' && Array.isArray(j.claims)) best = j; } catch { /* not JSON */ } start = i; break; } }
    }
  }
  return best;
}

// Chat-completions usage, renamed to the names the rest of the code uses (Responses API names).
export function normalUsage(u) {
  if (!u) return null;
  const cached = (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) || 0;
  const reasoning = (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) || 0;
  return { input_tokens: u.prompt_tokens || 0, output_tokens: u.completion_tokens || 0, input_tokens_details: { cached_tokens: cached }, output_tokens_details: { reasoning_tokens: reasoning }, ...(typeof u.cost === 'number' ? { reported_cost_usd: u.cost } : {}) };
}
export function costOf(usage, prices) {
  if (!usage) return null;
  if (typeof usage.reported_cost_usd === 'number') return usage.reported_cost_usd;      // the provider's own figure wins
  if (!prices || typeof prices.input !== 'number' || typeof prices.output !== 'number') return null;
  const cached = (usage.input_tokens_details && usage.input_tokens_details.cached_tokens) || 0;
  return ((usage.input_tokens - cached) * prices.input + cached * (typeof prices.cached === 'number' ? prices.cached : prices.input) + usage.output_tokens * prices.output) / 1e6;
}

// opts:
//   provider    a name from PROVIDERS, or give baseUrl yourself
//   baseUrl     for example https://openrouter.ai/api/v1 (no trailing /chat/completions)
//   apiKey      default: the provider's environment variable, then READER_API_KEY
//   model       required: the provider's own name for the model
//   variant     'primary' (default) or 'second' (the sceptical second reader, crosscheck.js)
//   mode        'schema' (default) | 'object' | 'prompt': the firmest JSON mode to try first
//   prices      { input, cached, output } USD per million tokens, when the provider reports no cost
//   maxTokens   default 4000 (open reasoning models think inside the same limit)
//   temperature default 0
//   extra       object merged into the request body (for example { provider: { order: [...] } })
//   fetchImpl, timeoutMs, maxRetries, cutOffRetries   as in the OpenAI adapter
export function createCompatReader({ provider, baseUrl, apiKey, model, variant = 'primary', mode = 'schema', prices = null, maxTokens = 4000, temperature = 0, extra = {}, cutOffRetries = 1, fetchImpl = null, timeoutMs = 120000, maxRetries = 3 } = {}) {
  const preset = provider ? PROVIDERS[provider] : null;
  if (provider && !preset) throw new Error(`createCompatReader: unknown provider "${provider}". Known: ${Object.keys(PROVIDERS).join(', ')}.`);
  const base = String(baseUrl || env('READER_BASE_URL') || (preset && preset.baseUrl) || '').replace(/\/+$/, '');
  if (!base) throw new ReaderError('No endpoint was given. Pass a provider name or a base URL (READER_BASE_URL).', { code: 'no_endpoint' });
  if (!model) throw new ReaderError('No model was named. Use the provider\'s own name for the model.', { code: 'no_model' });
  if (!MODES.includes(mode)) throw new Error(`createCompatReader: unknown mode "${mode}".`);
  if (!['primary', 'second'].includes(variant)) throw new Error(`createCompatReader: unknown variant "${variant}".`);
  const key = apiKey || env(preset && preset.keyEnv) || env('READER_API_KEY');
  const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/.test(base);
  if (!fetchImpl && !key && !isLocal) throw new ReaderError(`No API key was found for ${base}. Set ${(preset && preset.keyEnv) || 'READER_API_KEY'} in the environment or in the .env file.`, { code: 'no_key' });
  const doFetch = fetchImpl || ((...a) => fetch(...a));
  const isOpenRouter = /openrouter\.ai/.test(base);

  const systems = new WeakMap();
  const systemFor = (dir) => {
    if (!systems.has(dir)) systems.set(dir, buildReaderSystem(dir, variant === 'second' ? { variant: 'second', closing: TWO_KEY_TYPES } : {}));
    return systems.get(dir);
  };
  const SHAPE = `\n\nAnswer with one JSON object and nothing else. It must match this JSON Schema:\n${JSON.stringify(READER_SCHEMA)}`;
  let useMode = mode;                       // steps down at most once per rejected mode, and stays there
  const paramsFor = (system, input, cap, m = useMode) => ({
    model,
    messages: [{ role: 'system', content: m === 'schema' ? system : system + SHAPE }, { role: 'user', content: input }],
    ...(m === 'schema' ? { response_format: { type: 'json_schema', json_schema: { name: 'reader_output', strict: true, schema: STRICT_SCHEMA } } } : m === 'object' ? { response_format: { type: 'json_object' } } : {}),
    temperature,
    max_tokens: cap,
    // OpenRouter: report the cost of the request, and route only to hosts that honour the
    // response_format, so 'schema' means schema. Other providers ignore neither field: omitted.
    ...(isOpenRouter ? { usage: { include: true }, ...(m === 'prompt' ? {} : { provider: { require_parameters: true } }) } : {}),
    ...extra,
  });

  async function call(params) {
    let last = null;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const res = await doFetch(`${base}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify(params), signal: ctl.signal });
        clearTimeout(timer);
        const requestId = res.headers && res.headers.get ? (res.headers.get('x-request-id') || res.headers.get('x-generation-id')) : null;
        if (res.ok) return { json: await res.json(), requestId };
        let detail = '';
        try { const j = await res.json(); detail = j && j.error ? (j.error.message || JSON.stringify(j.error).slice(0, 300)) : ''; } catch { detail = ''; }
        const mk = (code, text, retryable = false) => new ReaderError(text, { code, retryable, requestId });
        if (res.status === 401) throw mk('auth', 'The API key was not accepted (401).');
        if (res.status === 402) throw mk('permission', `The account has no credit for this request (402). ${detail}`.trim());
        if (res.status === 403) throw mk('permission', `The API key is not allowed to do this (403). ${detail}`.trim());
        if (res.status === 404) throw mk('bad_request', `The model "${model}" was not found at this endpoint (404). ${detail}`.trim());
        if (res.status === 400 || res.status === 422) throw mk('bad_request', `The API rejected the request (${res.status}): ${detail || 'no details'}`);
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

  // A 400 that is about the response format means this host cannot hold the model to a schema.
  const formatRejected = (e) => e && e.code === 'bad_request' && /response_format|json_schema|json_object|structured|schema|require_parameters|No endpoints found/i.test(e.message) && !/not found at this endpoint/.test(e.message);

  async function ask(system, input) {
    const t = reader.totals;
    let cap = maxTokens, wasted = 0, last = null;
    for (let attempt = 0; attempt <= cutOffRetries; attempt += 1) {
      const t0 = Date.now();
      let got;
      for (;;) {
        try { got = await call(paramsFor(system, input, cap)); break; } catch (e) {
          const next = MODES[MODES.indexOf(useMode) + 1];
          if (formatRejected(e) && next) { useMode = next; reader.mode = next; t.modeStepDowns += 1; continue; }
          t.failures += 1; throw e;
        }
      }
      const res = got.json, requestId = got.requestId || res.id || null;
      const ms = Date.now() - t0;
      const usage = normalUsage(res.usage);
      const cost = costOf(usage, prices);
      const costUsd = cost === null ? null : cost + wasted;
      t.requests += 1; t.ms += ms;
      if (usage) { t.inputTokens += usage.input_tokens; t.outputTokens += usage.output_tokens; t.cachedTokens += usage.input_tokens_details.cached_tokens; t.reasoningTokens += usage.output_tokens_details.reasoning_tokens; }
      if (cost !== null) t.costUsd += cost;

      const fail = (code, text) => Object.assign(new ReaderError(text, { code, requestId }), { usage, costUsd, ms });
      const choice = (res.choices || [])[0] || null;
      if (!choice) { t.failures += 1; throw fail('bad_json', `The endpoint returned no answer${res.error ? `: ${String(res.error.message || '').slice(0, 200)}` : '.'}`); }
      if (choice.finish_reason === 'length') {
        last = fail('max_tokens', `The answer was cut off at a limit of ${cap} tokens${attempt ? `, after ${attempt + 1} attempts` : ''}.`);
        t.cutOff += 1; wasted += cost || 0; cap *= 2;
        continue;
      }
      const m = choice.message || {};
      if (m.refusal) { t.failures += 1; throw fail('refusal', 'The model declined to read this message.'); }
      const text = typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map((x) => (x && x.text) || '').join('') : '';
      const loose = looseJson(text);
      const parsed = loose ? dropNulls(loose) : null;
      if (!parsed || !Array.isArray(parsed.claims)) { t.failures += 1; t.badJson += 1; throw fail('bad_json', 'The answer was not the expected JSON object.'); }
      return { raw: parsed, usage, costUsd, ms, model: res.model || model, servedBy: res.provider || null, mode: useMode, requestId, attempts: attempt + 1 };
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
  reader.label = `${model} at ${base.replace(/^https?:\/\//, '').split('/')[0]} (${PROMPT_VERSION}${variant === 'second' ? ', second reader' : ''})`;
  reader.model = model;
  reader.variant = variant;
  reader.mode = useMode;
  reader.endpoint = base;
  reader.buildParams = (msg, dir, ctx) => paramsFor(systemFor(dir), buildReaderInput(msg, dir, ctx), maxTokens);
  reader.promptHash = (dir) => hashText(systemFor(dir));
  reader.totals = { requests: 0, failures: 0, cutOff: 0, badJson: 0, modeStepDowns: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, reasoningTokens: 0, costUsd: 0, ms: 0 };
  return reader;
}
