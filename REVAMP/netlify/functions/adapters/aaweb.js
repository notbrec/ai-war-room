// ─── Artificial Analysis — web fallback (no API key) ────────────────────────
// artificialanalysis.ai is a Next.js site whose leaderboards ship inside the
// RSC flight payload, exactly like arena.ai. When no ARTIFICIAL_ANALYSIS_API_KEY
// is configured this adapter reads those payloads and normalises them to the
// same shapes the official Data API adapter returns, so the merge layer and
// the UI never know the difference. Attribution ("© Artificial Analysis") is
// shown wherever the numbers appear, as their terms ask. AA_WEB=0 turns it
// off; an official key always takes precedence.

import { fetchText, BROWSER_UA } from '../lib/http.js';
import { flightText } from '../lib/arena.js';
import { canonicalOrg, canonicalModelId, bareKey } from '../../../shared/ids.js';
import { blendedPrice } from '../../../shared/metrics.js';

const BASE = 'https://artificialanalysis.ai';
export const AA_WEB_PATHS = {
  llms: '/leaderboards/models',
  'text-to-image': '/image/models',
  'text-to-video': '/video/models',
  'image-to-video': '/video/models',
  'text-to-speech': '/text-to-speech/models',
  stt: '/speech-to-text/non-streaming',
};

export function aaWebEnabled() { return process.env.AA_WEB !== '0'; }

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

async function page(path) {
  const html = await fetchText(`${BASE}${path}`, {
    ua: BROWSER_UA, timeoutMs: 25_000,
    headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
  });
  const text = flightText(html);
  if (!text) throw new Error(`aa-web ${path}: no flight payload`);
  return text;
}

/** Balanced JSON slice starting at text[start] ('[' or '{'), string-aware. */
export function balanced(text, start) {
  const open = text[start], close = open === '{' ? '}' : ']';
  if (open !== '{' && open !== '[') return null;
  let depth = 0, inStr = false;
  for (let k = start; k < text.length; k++) {
    const ch = text[k];
    if (inStr) { if (ch === '\\') k++; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) return text.slice(start, k + 1); }
  }
  return null;
}

/**
 * The array of objects that contains the first object carrying `key` and
 * satisfying `test`. Walks back from the key to enclosing `":[` starts,
 * parsing each candidate until one is an array whose items pass the test.
 */
export function arrayWhere(text, key, test = () => true, { tries = 60 } = {}) {
  const needle = `"${key}":`;
  const parsed = new Map();   // array start → parsed array | null (each candidate is parsed once)
  let best = null;
  let idx = text.indexOf(needle);
  while (idx !== -1) {
    let from = idx;
    for (let t = 0; t < tries; t++) {
      const a = text.lastIndexOf('":[', from);
      if (a < 0) break;
      from = a - 1;
      const start = a + 2;
      let arr;
      if (parsed.has(start)) arr = parsed.get(start);
      else {
        arr = null;
        const raw = balanced(text, start);
        if (raw && raw.length >= needle.length && raw.indexOf(needle) !== -1) { try { arr = JSON.parse(raw); } catch { arr = null; } }
        if (!(Array.isArray(arr) && arr.length && arr.filter(o => o && typeof o === 'object' && test(o)).length >= Math.min(3, arr.length))) arr = null;
        parsed.set(start, arr);
      }
      if (arr) { if (!best || arr.length > best.length) best = arr; break; }
    }
    idx = text.indexOf(needle, idx + needle.length);
  }
  return best;
}

// ── LLMs ───────────────────────────────────────────────────────────────────
// The leaderboard page carries two `models` arrays of the same length: a
// light one (slug, release, creator, releaseDate) and the data one. Joined
// on slug.
const BENCH_KEYS = {
  gpqa: 'gpqa', hle: 'hle', scicode: 'scicode', ifbench: 'ifbench', lcr: 'lcr', tau2: 'tau2', tauBanking: 'tau_banking',
  terminalbenchHard: 'terminalbench_hard', terminalbenchV21: 'terminalbench_v21', terminalbenchV40: 'terminalbench_v40',
  mmmuPro: 'mmmu_pro', omniscience: 'aa_omniscience', critpt: 'critpt', gdpvalNormalized: 'gdpval', apexAgents: 'apex_agents',
  itbenchSre: 'itbench_sre', analystAgent: 'analyst_agent',
};

export function normaliseWebLLM(r, meta) {
  const org = canonicalOrg(r.modelCreatorName ?? meta?.creator?.name ?? '');
  const name = r.shortName ?? r.name ?? r.slug;
  const benchmarks = {};
  for (const [k, out] of Object.entries(BENCH_KEYS)) { const v = num(r[k]); if (v != null) benchmarks[out] = v; }
  const priceIn = num(r.price1mInputTokens), priceOut = num(r.price1mOutputTokens);
  return {
    aaId: r.slug ?? null, slug: r.slug ?? null, name, org,
    modelId: canonicalModelId(r.slug ?? name, org),
    releaseDate: meta?.releaseDate ?? r.releaseDate ?? null,
    intelligence: num(r.intelligenceIndex), intelligenceEstimated: r.intelligenceIndexIsEstimated === true,
    codingIndex: null, mathIndex: null, agenticIndex: null,
    benchmarks,
    priceIn, priceOut, priceBlended: blendedPrice(priceIn, priceOut),
    priceCacheRead: num(r.cacheHitPrice), priceCacheWrite: num(r.cacheWritePrice),
    speed: num(r.medianOutputTokensPerSecond), ttft: num(r.medianTimeToFirstTokenSeconds),
    ttfat: num(r.medianTimeToFirstAnswerTokenSeconds), e2e: num(r.medianEndToEndResponseTimeSeconds),
    context: num(r.contextWindowTokens),
    isOpen: typeof r.isOpenWeights === 'boolean' ? r.isOpenWeights : null,
    isReasoning: r.isReasoning === true, deprecated: r.deprecated === true,
    via: 'aa-web',
  };
}

export async function fetchAAWebLLMs() {
  const text = await page(AA_WEB_PATHS.llms);
  const data = arrayWhere(text, 'intelligenceIndex', o => 'slug' in o && 'price1mInputTokens' in o);
  if (!data) throw new Error('aa-web llms: model rows not found');
  const meta = arrayWhere(text, 'releaseDate', o => 'slug' in o && 'creator' in o && !('intelligenceIndex' in o)) ?? [];
  const bySlug = new Map(meta.map(m => [m.slug, m]));
  // deprecated rows are kept for joining with the arena board but never appended on their own
  const rows = data.filter(r => r && r.slug).map(r => normaliseWebLLM(r, bySlug.get(r.slug)));
  if (rows.length < 10) throw new Error(`aa-web llms: only ${rows.length} rows`);
  return rows;
}

// ── Image / video / speech (host-model rows → one row per model) ───────────
function normaliseHostModel(h, kind, board) {
  const m = h.model ?? {};
  const org = canonicalOrg(m.creator?.name ?? '');
  const perf = h.performance ?? {};
  let elo = null, lo = null, hi = null;
  if (kind === 'image' || kind === 'tts') { elo = num(m.qualityElo); lo = num(m.qualityEloCi95Lower); hi = num(m.qualityEloCi95Upper); }
  else if (board === 'image-to-video') { elo = num(m.imageToVideoElo); lo = num(m.imageToVideoEloCi95Lower); hi = num(m.imageToVideoEloCi95Upper); }
  else { elo = num(m.textToVideoElo); lo = num(m.textToVideoEloCi95Lower); hi = num(m.textToVideoEloCi95Upper); }
  const name = m.name ?? h.name;
  return {
    aaId: m.id ?? h.id ?? null, slug: m.slug ?? null, name, org,
    modelId: canonicalModelId(m.slug ?? name, org),
    releaseDate: m.releaseDate ?? null,
    elo, ci: lo != null && hi != null ? (hi - lo) / 2 : null, rank: null,
    genTime: num(perf.medianGenerationTimeSeconds), genTimeP25: num(perf.quartile25GenerationTimeSeconds), genTimeP75: num(perf.quartile75GenerationTimeSeconds),
    pricePerImage: kind === 'image' && num(h.pricePer1kImages) != null ? h.pricePer1kImages / 1000 : null,
    pricePer1kImages: kind === 'image' ? num(h.pricePer1kImages) : null,
    pricePerSecond: kind === 'video' && num(h.pricePerMinute) != null ? h.pricePerMinute / 60 : null,
    pricePer1mChars: kind === 'tts' ? num(h.pricePer1mCharacters) : null,
    charsPerSecond: kind === 'tts' ? num(perf.medianCharactersPerSecond) : null,
    ttft: null, resolution: null, hasAudio: null,
    provider: h.host?.name ?? null,
    endpointClass: h.endpointClassification ?? null,
    isOpen: typeof m.isOpenWeights === 'boolean' ? m.isOpenWeights : null,
    representative: h.isRepresentative === true,
    via: 'aa-web',
  };
}

/** One row per model: the representative host, else the cheapest, else the first. */
function pickPerModel(rows, priceKey) {
  const by = new Map();
  for (const r of rows) { const k = r.slug ?? r.name; if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
  return [...by.values()].map(list => {
    const rep = list.find(r => r.representative);
    if (rep) return rep;
    const priced = list.filter(r => num(r[priceKey]) != null).sort((a, b) => a[priceKey] - b[priceKey]);
    return priced[0] ?? list[0];
  });
}

/** The array literally keyed `"<key>":[` whose items carry an ELO (the chart series: one row per model). */
function keyedArray(text, key) {
  const needle = `"${key}":[`;
  let idx = text.indexOf(needle);
  while (idx !== -1) {
    const raw = balanced(text, idx + needle.length - 1);
    if (raw) { try { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length > 3 && arr.some(o => o && num(o.elo) != null)) return arr; } catch { /* not it */ } }
    idx = text.indexOf(needle, idx + 1);
  }
  return null;
}

// The media pages carry two things: a chart series per board (every model,
// with ELO, 95% CI, creator and list price) and the host-model rows (the
// hosts each model is served on, with generation times). One row per model:
// the series row, enriched with its representative host's timing.
const SERIES_KEYS = { 'text-to-image': ['textToImage'], 'image-edit': ['imageEditing', 'imageEdit'], 'text-to-video': ['textToVideo'], 'image-to-video': ['imageToVideo'] };

export async function fetchAAWebMedia(board) {
  const path = AA_WEB_PATHS[board] ?? (board === 'image-edit' ? AA_WEB_PATHS['text-to-image'] : null);
  if (!path) return null;
  const kind = board === 'text-to-speech' ? 'tts' : /video/.test(board) ? 'video' : 'image';
  const text = await page(path);
  const hosts = arrayWhere(text, kind === 'tts' ? 'pricePer1mCharacters' : kind === 'video' ? 'pricePerMinute' : 'pricePer1kImages', o => o.model && typeof o.model === 'object') ?? [];
  const hostRows = pickPerModel(hosts.map(h => normaliseHostModel(h, kind, board)), kind === 'image' ? 'pricePerImage' : kind === 'video' ? 'pricePerSecond' : 'pricePer1mChars');

  if (kind === 'tts') {
    const rows = hostRows.filter(r => r.name && (num(r.elo) != null || num(r.pricePer1mChars) != null));
    if (rows.length < 3) throw new Error(`aa-web ${board}: only ${rows.length} rows`);
    rows.sort((a, b) => (b.elo ?? -1) - (a.elo ?? -1));
    return rows.map((r, i) => ({ ...r, rank: num(r.elo) != null ? i + 1 : null }));
  }

  let series = null;
  for (const k of SERIES_KEYS[board] ?? []) { series = keyedArray(text, k); if (series) break; }
  if (!series) throw new Error(`aa-web ${board}: model series not found`);
  const hostByKey = new Map();
  for (const h of hostRows) { for (const k of [h.slug, h.name].filter(Boolean)) hostByKey.set(bareKey(k), h); }
  const rows = series.filter(s => s && s.name).map(s => {
    const org = canonicalOrg(s.creator?.name ?? '');
    const h = hostByKey.get(bareKey(s.slug ?? '')) ?? hostByKey.get(bareKey(s.name));
    const lo = num(s.lower95ci), hi = num(s.upper95ci);
    const price = num(s.price);   // video: USD per minute · image: USD per 1,000 images
    return {
      aaId: s.id ?? null, slug: s.slug ?? null, name: s.name, org,
      modelId: canonicalModelId(s.slug ?? s.name, org),
      releaseDate: h?.releaseDate ?? null,
      elo: num(s.elo), ci: lo != null && hi != null ? (hi - lo) / 2 : null, rank: null,
      genTime: h?.genTime ?? null, genTimeP25: h?.genTimeP25 ?? null, genTimeP75: h?.genTimeP75 ?? null,
      pricePerImage: kind === 'image' && price != null ? price / 1000 : null,
      pricePer1kImages: kind === 'image' ? price : null,
      pricePerSecond: kind === 'video' && price != null ? price / 60 : null,
      pricePer1mChars: null, charsPerSecond: null, ttft: null, resolution: null, hasAudio: null,
      provider: h?.provider ?? null, isOpen: h?.isOpen ?? null, via: 'aa-web',
    };
  }).filter(r => num(r.elo) != null || num(r.pricePerImage) != null || num(r.pricePerSecond) != null);
  if (rows.length < 3) throw new Error(`aa-web ${board}: only ${rows.length} rows`);
  rows.sort((a, b) => (b.elo ?? -1) - (a.elo ?? -1));
  return rows.map((r, i) => ({ ...r, rank: num(r.elo) != null ? i + 1 : null }));
}

/** Hosted transcription APIs: WER index, price per minute, speed factor. */
export async function fetchAAWebSpeech(kind) {
  if (kind !== 'stt') return null;
  const text = await page(AA_WEB_PATHS.stt);
  const apis = arrayWhere(text, 'hostApiId', o => o.model && typeof o.model === 'object' && 'pricePer1kMinutes' in o);
  if (!apis) throw new Error('aa-web stt: api rows not found');
  const by = new Map();
  for (const a of apis) {
    const m = a.model ?? {};
    let name = m.name ?? a.displayName ?? a.name;
    if (!name) continue;
    // "Scribe v2, ElevenLabs" → "Scribe v2": the host is its own column
    const host = a.host?.name ?? null;
    if (host && name.endsWith(`, ${host}`)) name = name.slice(0, -(host.length + 2));
    const org = canonicalOrg(m.creator?.name ?? a.host?.name ?? '');
    const werIdx = num(a.aaWerIndex), werAvg = num(a.wer?.werWeightedAvg);
    const wer = werIdx ?? werAvg;
    const row = {
      id: canonicalModelId(name, org), aaId: a.id ?? null, name, org,
      provider: a.host?.name ?? null, hostApiId: a.hostApiId ?? null,
      wer: wer != null ? wer * 100 : null, werIndex: werIdx != null ? werIdx * 100 : null,
      pricePerMinute: num(a.pricePer1kMinutes) != null ? a.pricePer1kMinutes / 1000 : null, pricePer1kMinutes: num(a.pricePer1kMinutes),
      speedFactor: num(a.performance?.medianSpeedFactor),
      isOpen: typeof m.openWeights === 'boolean' ? m.openWeights : null, releaseDate: m.releaseDate ?? null,
      best: m.bestWerHostModelId != null && m.bestWerHostModelId === a.id, via: 'aa-web',
    };
    const k = row.id;
    const cur = by.get(k);
    if (!cur || (row.best && !cur.best) || (!cur.best && (row.wer ?? 1e9) < (cur.wer ?? 1e9))) by.set(k, row);
  }
  const rows = [...by.values()].filter(r => r.wer != null || r.pricePerMinute != null);
  if (rows.length < 3) throw new Error(`aa-web stt: only ${rows.length} rows`);
  rows.sort((a, b) => (a.wer ?? 1e9) - (b.wer ?? 1e9));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
