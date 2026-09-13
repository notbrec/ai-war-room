// ─── Artificial Analysis adapter (official Data API) ────────────────────────
// https://artificialanalysis.ai/api-reference — requires an API key sent as
// `x-api-key`. Set ARTIFICIAL_ANALYSIS_API_KEY in the Netlify environment.
// The free tier requires attribution, which the UI shows wherever these
// numbers appear.
//
// When no key is configured every function here returns null and the site
// shows N/A for speed / latency / generation-time / TTS / STT quality —
// never a made-up number.

import { fetchJSON } from '../lib/http.js';
import { canonicalOrg, canonicalModelId } from '../../../shared/ids.js';

const BASE = 'https://artificialanalysis.ai/api/v2/data';

export function aaKey() {
  return process.env.ARTIFICIAL_ANALYSIS_API_KEY || process.env.AA_API_KEY || null;
}
export function aaConfigured() { return !!aaKey(); }

async function get(path) {
  const key = aaKey();
  if (!key) return null;
  const json = await fetchJSON(`${BASE}${path}`, { headers: { 'x-api-key': key }, timeoutMs: 25_000 });
  return Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : null);
}

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v) ? +v : null));
const pick = (obj, ...keys) => { for (const k of keys) { const v = num(obj?.[k]); if (v != null) return v; } return null; };
// A measurement of exactly 0 tokens/s or 0 s is the API's way of saying 'not measured'.
const pos = (obj, ...keys) => { const v = pick(obj, ...keys); return v != null && v > 0 ? v : null; };

/** LLM rows → normalised. Field names follow the v2 schema; each read is defensive. */
export function normaliseAALLM(m) {
  const org = canonicalOrg(m.model_creator?.name ?? m.model_creator?.slug ?? m.creator ?? '');
  const ev = m.evaluations ?? {};
  const pr = m.pricing ?? {};
  const name = m.name ?? m.slug ?? m.id;
  // Everything that is an evaluation score, minus the composite indexes.
  const benchmarks = {};
  for (const [k, v] of Object.entries(ev)) {
    if (/^artificial_analysis_/.test(k)) continue;
    const n = num(v);
    if (n != null) benchmarks[k] = n;
  }
  return {
    aaId: m.id ?? m.slug ?? null,
    slug: m.slug ?? null,
    name, org,
    modelId: canonicalModelId(m.slug ?? name, org),
    releaseDate: m.release_date ?? null,
    intelligence: pick(ev, 'artificial_analysis_intelligence_index'),
    codingIndex: pick(ev, 'artificial_analysis_coding_index'),
    mathIndex: pick(ev, 'artificial_analysis_math_index'),
    agenticIndex: pick(ev, 'artificial_analysis_agentic_index'),
    benchmarks,
    priceIn: pick(pr, 'price_1m_input_tokens'),
    priceOut: pick(pr, 'price_1m_output_tokens'),
    priceBlended: pick(pr, 'price_1m_blended_3_to_1'),
    speed: pos(m, 'median_output_tokens_per_second'),
    ttft: pos(m, 'median_time_to_first_token_seconds'),
    ttfat: pos(m, 'median_time_to_first_answer_token', 'median_time_to_first_answer_token_seconds'),
    e2e: pos(m, 'median_end_to_end_response_time_seconds', 'median_total_response_time_seconds'),
  };
}

export async function fetchAALLMs() {
  const rows = await get('/llms/models');
  return rows ? rows.map(normaliseAALLM) : null;
}

/** Media rows (text-to-image, image-editing, text-to-video, image-to-video, text-to-speech). */
export function normaliseAAMedia(m) {
  const org = canonicalOrg(m.model_creator?.name ?? m.creator ?? '');
  const name = m.name ?? m.slug ?? m.id;
  return {
    aaId: m.id ?? null, slug: m.slug ?? null, name, org,
    modelId: canonicalModelId(m.slug ?? name, org),
    releaseDate: m.release_date ?? null,
    elo: pick(m, 'elo', 'arena_elo', 'quality_elo'),
    ci: pick(m, 'ci_95', 'ci95'),
    rank: m.rank ?? null,
    genTime: pick(m, 'median_generation_time_seconds', 'generation_time_seconds', 'median_generation_time'),
    genTimeP25: pick(m, 'generation_time_p25_seconds'),
    genTimeP75: pick(m, 'generation_time_p75_seconds'),
    pricePerImage: pick(m, 'price_per_image', 'price_per_image_usd'),
    pricePer1kImages: pick(m, 'price_per_1k_images'),
    pricePerSecond: pick(m, 'price_per_second', 'price_per_video_second'),
    pricePer1mChars: pick(m, 'price_per_1m_characters', 'price_1m_characters'),
    charsPerSecond: pick(m, 'characters_per_second'),
    ttft: pick(m, 'time_to_first_audio_seconds', 'median_time_to_first_audio'),
    resolution: m.resolution ?? m.max_resolution ?? null,
    hasAudio: typeof m.supports_audio === 'boolean' ? m.supports_audio : (typeof m.audio === 'boolean' ? m.audio : null),
    provider: m.provider?.name ?? m.api_provider ?? null,
    isOpen: typeof m.open_weights === 'boolean' ? m.open_weights : null,
  };
}

export const AA_MEDIA_PATHS = {
  'text-to-image':  '/media/text-to-image',
  'image-edit':     '/media/image-editing',
  'text-to-video':  '/media/text-to-video',
  'image-to-video': '/media/image-to-video',
  'text-to-speech': '/media/text-to-speech',
};

export async function fetchAAMedia(board) {
  const path = AA_MEDIA_PATHS[board];
  if (!path) return null;
  const rows = await get(path);
  return rows ? rows.map(normaliseAAMedia) : null;
}

/** Speech-to-text and speech-to-speech, if the account has access. */
export async function fetchAASpeech(kind) {
  const path = kind === 'stt' ? '/media/speech-to-text' : '/media/speech-to-speech';
  try {
    const rows = await get(path);
    return rows ? rows.map(normaliseAAMedia) : null;
  } catch { return null; }
}
