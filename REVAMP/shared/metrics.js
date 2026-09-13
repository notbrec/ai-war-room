// ─── Metric registry + formatting ───────────────────────────────────────────
// One place that knows what every number on the site *is*: label, unit,
// direction, source, and how to print it. Nothing in the UI should hardcode
// "higher is better" or a "$" — it looks the metric up here.

export const SOURCES = {
  arena:      { id: 'arena',      name: 'arena.ai',            url: 'https://arena.ai/leaderboard',        note: 'Crowd-sourced human preference battles (Elo/Bradley-Terry).' },
  openrouter: { id: 'openrouter', name: 'OpenRouter',          url: 'https://openrouter.ai/models',        note: 'Public model & endpoint catalogue: pricing, context, providers, uptime.' },
  aa:         { id: 'aa',         name: 'Artificial Analysis', url: 'https://artificialanalysis.ai',       note: 'Independent benchmarks & performance measurements (© Artificial Analysis, shown with attribution).' },
  swebench:   { id: 'swebench',   name: 'SWE-bench',           url: 'https://www.swebench.com',            note: 'Open software-engineering benchmark; results published by the SWE-bench team.' },
  openasr:    { id: 'openasr',    name: 'Open ASR Leaderboard', url: 'https://huggingface.co/spaces/hf-audio/open_asr_leaderboard', note: 'Hugging Face open speech-recognition evaluation (WER / RTFx).' },
  designarena:{ id: 'designarena', name: 'Design Arena',       url: 'https://www.designarena.ai',          note: 'Human-preference arena for UI/design/code generation, relayed via OpenRouter.' },
  internal:   { id: 'internal',   name: 'AI WAR ROOM',         url: 'https://aiwarroom.app/#methodology',  note: 'Derived by AI WAR ROOM from the sources above.' },
};

// Formatting primitives ─────────────────────────────────────────────────────
export const NA = 'N/A';
export const isNum = v => typeof v === 'number' && Number.isFinite(v);

export function fmtPrice(v, { digits } = {}) {
  if (!isNum(v)) return NA;
  if (v === 0) return '$0';
  if (digits != null) return `$${v.toFixed(digits)}`;
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 1) return `$${v.toFixed(2)}`;
  if (v < 100) return `$${v.toFixed(2).replace(/\.?0+$/, '')}`;
  return `$${Math.round(v).toLocaleString()}`;
}
export function fmtInt(v) { return isNum(v) ? Math.round(v).toLocaleString() : NA; }
export function fmtNum(v, d = 1) { return isNum(v) ? (Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : v.toFixed(d)) : NA; }
export function fmtPct(v, d = 1) { return isNum(v) ? `${v.toFixed(d)}%` : NA; }
export function fmtSeconds(v) {
  if (!isNum(v)) return NA;
  if (v < 1) return `${Math.round(v * 1000)}ms`;
  if (v < 60) return `${v.toFixed(v < 10 ? 2 : 1)}s`;
  const m = Math.floor(v / 60); return `${m}m ${Math.round(v - m * 60)}s`;
}
export function fmtTokens(v) {
  if (!isNum(v)) return NA;
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(Math.round(v));
}
export function fmtCompact(v) {
  if (!isNum(v)) return NA;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v < 10_000 ? 1 : 0)}K`;
  return String(Math.round(v));
}
export function fmtDate(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
export function fmtAgo(iso, now = Date.now()) {
  if (!iso) return NA;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return NA;
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

/** "262K" / "1.1M" / 1048576 → tokens (number) or null. */
export function parseContext(v) {
  if (v == null || v === '') return null;
  if (isNum(v)) return v > 0 ? v : null;
  const m = String(v).trim().match(/^([\d.]+)\s*([MK])?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const u = (m[2] ?? '').toUpperCase();
  return u === 'M' ? n * 1_000_000 : u === 'K' ? n * 1_000 : n;
}

/** Blended $/1M at the industry-standard 3:1 input:output ratio. */
export function blendedPrice(priceIn, priceOut) {
  if (!isNum(priceIn) && !isNum(priceOut)) return null;
  if (!isNum(priceIn)) return priceOut;
  if (!isNum(priceOut)) return priceIn;
  return (3 * priceIn + priceOut) / 4;
}

// Registry ──────────────────────────────────────────────────────────────────
// key → { label, short, unit, higherIsBetter, format, source, description, method }
export const METRICS = {
  elo:            { label: 'Arena ELO',            short: 'ELO',      unit: 'Elo',       higherIsBetter: true,  format: fmtInt,  source: 'arena',
                    description: 'Human-preference rating from anonymous head-to-head battles.', method: 'Bradley-Terry model over pairwise votes; ±CI is the 95% interval.' },
  ci:             { label: 'Confidence interval',  short: '±CI',      unit: 'Elo',       higherIsBetter: false, format: v => isNum(v) ? `±${Math.round(v)}` : NA, source: 'arena',
                    description: 'Half-width of the 95% confidence interval on the ELO.', method: 'Narrower means more battles and a more settled rank.' },
  votes:          { label: 'Votes',                short: 'Votes',    unit: 'votes',     higherIsBetter: true,  format: fmtCompact, source: 'arena',
                    description: 'Number of human battles the rating is based on.', method: 'Raw count of pairwise votes involving the model.' },
  intelligence:   { label: 'Intelligence Index',   short: 'Intel',    unit: 'index',     higherIsBetter: true,  format: v => fmtNum(v, 1), source: 'aa',
                    description: 'Composite of reasoning, knowledge, coding and math evaluations.', method: 'Artificial Analysis Intelligence Index (relayed via OpenRouter or the AA Data API).' },
  codingIndex:    { label: 'Coding Index',         short: 'Code',     unit: 'index',     higherIsBetter: true,  format: v => fmtNum(v, 1), source: 'aa',
                    description: 'Composite of coding benchmarks (e.g. LiveCodeBench, SciCode, Terminal-Bench).', method: 'Artificial Analysis Coding Index.' },
  agenticIndex:   { label: 'Agentic Index',        short: 'Agent',    unit: 'index',     higherIsBetter: true,  format: v => fmtNum(v, 1), source: 'aa',
                    description: 'Composite of agentic / tool-use evaluations.', method: 'Artificial Analysis Agentic Index.' },
  priceIn:        { label: 'Input price',          short: 'In $/M',   unit: '$/1M tok',  higherIsBetter: false, format: fmtPrice, source: 'openrouter',
                    description: 'USD per one million input (prompt) tokens.', method: 'Cheapest listed endpoint price on OpenRouter, else arena.ai listed price.' },
  priceOut:       { label: 'Output price',         short: 'Out $/M',  unit: '$/1M tok',  higherIsBetter: false, format: fmtPrice, source: 'openrouter',
                    description: 'USD per one million output (completion) tokens.', method: 'As above.' },
  priceBlended:   { label: 'Blended price',        short: 'Blend $/M', unit: '$/1M tok', higherIsBetter: false, format: fmtPrice, source: 'internal',
                    description: 'Weighted price at a 3:1 input:output token ratio.', method: '(3 × input + output) ÷ 4.' },
  priceCacheRead: { label: 'Cached input price',   short: 'Cache rd', unit: '$/1M tok',  higherIsBetter: false, format: fmtPrice, source: 'openrouter',
                    description: 'USD per 1M tokens read from a prompt cache.', method: 'OpenRouter input_cache_read.' },
  priceCacheWrite:{ label: 'Cache write price',    short: 'Cache wr', unit: '$/1M tok',  higherIsBetter: false, format: fmtPrice, source: 'openrouter',
                    description: 'USD per 1M tokens written to a prompt cache.', method: 'OpenRouter input_cache_write.' },
  context:        { label: 'Context window',       short: 'Context',  unit: 'tokens',    higherIsBetter: true,  format: fmtTokens, source: 'openrouter',
                    description: 'Maximum tokens the model can attend to in one request.', method: 'OpenRouter context_length, else arena.ai listing.' },
  maxOutput:      { label: 'Max output',           short: 'Max out',  unit: 'tokens',    higherIsBetter: true,  format: fmtTokens, source: 'openrouter',
                    description: 'Maximum completion tokens per request.', method: 'OpenRouter top_provider.max_completion_tokens.' },
  speed:          { label: 'Output speed',         short: 'Tok/s',    unit: 'tokens/s',  higherIsBetter: true,  format: v => fmtNum(v, 0), source: 'aa',
                    description: 'Median output tokens generated per second.', method: 'Artificial Analysis performance benchmark, median across measurements.' },
  ttft:           { label: 'Time to first token',  short: 'TTFT',     unit: 's',         higherIsBetter: false, format: fmtSeconds, source: 'aa',
                    description: 'Latency from request until the first token arrives.', method: 'Artificial Analysis, median.' },
  e2e:            { label: 'End-to-end time',      short: 'E2E',      unit: 's',         higherIsBetter: false, format: fmtSeconds, source: 'aa',
                    description: 'Total wall time for a 500-token reference response.', method: 'Artificial Analysis, median.' },
  releaseDate:    { label: 'Release date',         short: 'Released', unit: 'date',      higherIsBetter: null,  format: fmtDate, source: 'openrouter',
                    description: 'Public release date.', method: 'OpenRouter listing date, else Artificial Analysis release date.' },
  uptime:         { label: 'Uptime (30 min)',      short: 'Uptime',   unit: '%',         higherIsBetter: true,  format: v => fmtPct(v, 1), source: 'openrouter',
                    description: 'Share of successful requests to this endpoint in the last 30 minutes.', method: 'OpenRouter endpoint uptime_last_30m.' },
  // Media
  pricePerImage:  { label: 'Price per image',      short: '$/img',    unit: '$/image',   higherIsBetter: false, format: v => fmtPrice(v, { digits: 3 }), source: 'arena',
                    description: 'Listed USD per generated image.', method: 'arena.ai listing (default settings).' },
  pricePer1kImages:{ label: 'Price per 1,000 images', short: '$/1K img', unit: '$/1K',   higherIsBetter: false, format: fmtPrice, source: 'internal',
                    description: 'Listed per-image price × 1,000.', method: 'Derived.' },
  pricePerSecond: { label: 'Price per second',     short: '$/s',      unit: '$/s video', higherIsBetter: false, format: v => fmtPrice(v, { digits: 3 }), source: 'arena',
                    description: 'Listed USD per second of generated video.', method: 'arena.ai listing.' },
  pricePerMinute: { label: 'Price per minute',     short: '$/min',    unit: '$/min',     higherIsBetter: false, format: fmtPrice, source: 'internal',
                    description: 'Listed per-second price × 60.', method: 'Derived.' },
  genTime:        { label: 'Generation time',      short: 'Gen time', unit: 's',         higherIsBetter: false, format: fmtSeconds, source: 'aa',
                    description: 'Median wall time to generate one output.', method: 'Artificial Analysis media benchmarks.' },
  // Coding
  resolved:       { label: 'Resolved',             short: '% solved', unit: '%',         higherIsBetter: true,  format: v => fmtPct(v, 1), source: 'swebench',
                    description: 'Share of benchmark tasks whose tests pass after the agent\'s patch.', method: 'SWE-bench harness, pass@1 unless the submission is tagged with multiple attempts.' },
  costPerTask:    { label: 'Cost per task',        short: '$/task',   unit: '$',         higherIsBetter: false, format: v => fmtPrice(v, { digits: 3 }), source: 'swebench',
                    description: 'Average USD API spend per benchmark instance.', method: 'Reported by the submitter; only submissions that disclose cost are shown.' },
  callsPerTask:   { label: 'API calls per task',   short: 'Calls',    unit: 'calls',     higherIsBetter: false, format: v => fmtNum(v, 1), source: 'swebench',
                    description: 'Average number of model calls (turns) per instance.', method: 'Reported by the submitter.' },
  // Speech
  wer:            { label: 'Word error rate',      short: 'WER',      unit: '%',         higherIsBetter: false, format: v => fmtPct(v, 2), source: 'openasr',
                    description: 'Share of words transcribed incorrectly. Lower is better.', method: 'Average WER across the Open ASR English test sets, normalised transcripts.' },
  rtfx:           { label: 'Speed (RTFx)',         short: 'RTFx',     unit: '×realtime', higherIsBetter: true,  format: v => fmtNum(v, 0), source: 'openasr',
                    description: 'Inverse real-time factor: how many seconds of audio are transcribed per second of compute.', method: 'Open ASR Leaderboard, batched inference on the reference GPU.' },
  ttsQuality:     { label: 'Voice quality ELO',    short: 'ELO',      unit: 'Elo',       higherIsBetter: true,  format: fmtInt, source: 'aa',
                    description: 'Human-preference rating of speech quality.', method: 'Artificial Analysis Speech Arena.' },
  pricePer1mChars:{ label: 'Price per 1M characters', short: '$/1M ch', unit: '$/1M',    higherIsBetter: false, format: fmtPrice, source: 'aa',
                    description: 'USD per one million input characters synthesised.', method: 'Provider list price.' },
  paramsB:        { label: 'Parameters',           short: 'Params',   unit: 'B',         higherIsBetter: null,  format: v => isNum(v) ? `${v}B` : NA, source: 'openasr',
                    description: 'Model size in billions of parameters, when disclosed.', method: 'Model card.' },
};

export function metric(key) { return METRICS[key] ?? { label: key, short: key, unit: '', higherIsBetter: true, format: v => (v == null ? NA : String(v)), source: 'internal', description: '', method: '' }; }
export function fmtMetric(key, v) { return metric(key).format(v); }

/**
 * Normalise a value to 0..1 within [min,max] honouring direction: 1 is always
 * "best". Missing values return null (never 0 — 0 would be a real score).
 */
export function normalise(value, min, max, higherIsBetter = true, { log = false } = {}) {
  if (!isNum(value) || !isNum(min) || !isNum(max)) return null;
  if (max === min) return 1;
  let v = value, lo = min, hi = max;
  if (log) {
    const f = x => Math.log10(Math.max(x, 1e-6));
    v = f(v); lo = f(lo); hi = f(hi);
    if (hi === lo) return 1;
  }
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return higherIsBetter ? t : 1 - t;
}

/** Min/max of a numeric field across rows, ignoring non-numbers. */
export function extent(rows, get) {
  let lo = Infinity, hi = -Infinity, n = 0;
  for (const r of rows) {
    const v = get(r);
    if (!isNum(v)) continue;
    n++;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return n ? [lo, hi] : [null, null];
}

/** Percent difference of `b` relative to `a` (positive means b is larger). */
export function pctDiff(a, b) {
  if (!isNum(a) || !isNum(b) || a === 0) return null;
  return ((b - a) / Math.abs(a)) * 100;
}

/** Wrap a raw value in the provenance envelope every stored metric carries. */
export function record({ value, key, source, sourceUrl, measuredAt, retrievedAt, modelId, providerId = null, variant = null, confidence = null, methodology = null }) {
  const m = metric(key);
  return {
    key, value: isNum(value) ? value : (value ?? null),
    unit: m.unit, higher_is_better: m.higherIsBetter,
    source: source ?? m.source, source_url: sourceUrl ?? SOURCES[source ?? m.source]?.url ?? null,
    measured_at: measuredAt ?? null, retrieved_at: retrievedAt ?? new Date().toISOString(),
    methodology: methodology ?? m.method, confidence, model_id: modelId, provider_id: providerId, variant,
  };
}
