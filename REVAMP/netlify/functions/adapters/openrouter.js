// ─── OpenRouter adapter ─────────────────────────────────────────────────────
// Public, unauthenticated catalogue: https://openrouter.ai/api/v1/models and
// /models/{id}/endpoints. Gives pricing (incl. cache read/write), context,
// max output, modalities, reasoning support, release timestamp, knowledge
// cutoff, and — relayed with attribution — Artificial Analysis indexes and
// Design Arena ELOs. Endpoints give the per-provider view.

import { fetchJSON, mapLimit } from '../lib/http.js';
import { canonicalOrg, canonicalModelId, isReasoningName } from '../../../shared/ids.js';

const MODELS_URL = 'https://openrouter.ai/api/v1/models';
const perM = s => (s == null || s === '' ? null : (Number.isFinite(parseFloat(s)) ? parseFloat(s) * 1_000_000 : null));
const perUnit = s => (s == null || s === '' ? null : (Number.isFinite(parseFloat(s)) ? parseFloat(s) : null));

function orgFromId(id, name) {
  const author = String(id).split('/')[0];
  const fromName = String(name ?? '').split(':')[0];
  return canonicalOrg(fromName && fromName.length < 30 && String(name).includes(':') ? fromName : author);
}

/** Normalise one /models entry. */
export function normaliseORModel(m) {
  const p = m.pricing ?? {};
  const org = orgFromId(m.id, m.name);
  const shortName = String(m.name ?? m.id).includes(':') ? String(m.name).split(':').slice(1).join(':').trim() : (m.name ?? m.id);
  const aa = m.benchmarks?.artificial_analysis ?? null;
  const design = Array.isArray(m.benchmarks?.design_arena) ? m.benchmarks.design_arena : [];
  const params = m.supported_parameters ?? [];
  const priceIn = perM(p.prompt), priceOut = perM(p.completion);
  const variable = priceIn != null && priceIn < 0; // "openrouter/auto" style routers
  return {
    id: m.id,
    canonicalSlug: m.canonical_slug ?? null,
    name: shortName,
    org,
    modelId: canonicalModelId(m.canonical_slug ?? m.id, org),
    description: m.description ?? null,
    created: m.created ? new Date(m.created * 1000).toISOString().slice(0, 10) : null,
    knowledgeCutoff: m.knowledge_cutoff ?? null,
    contextLength: m.context_length ?? m.top_provider?.context_length ?? null,
    maxOutput: m.top_provider?.max_completion_tokens ?? null,
    modalities: { in: m.architecture?.input_modalities ?? [], out: m.architecture?.output_modalities ?? [] },
    pricing: variable ? { priceIn: null, priceOut: null } : {
      priceIn, priceOut,
      priceCacheRead: perM(p.input_cache_read),
      priceCacheWrite: perM(p.input_cache_write),
      priceImageInput: perUnit(p.image),
      priceImageOutput: perUnit(p.image_output),
      priceAudioInput: perM(p.audio),
      priceAudioOutput: perM(p.audio_output),
      priceReasoning: perM(p.internal_reasoning),
    },
    supportsReasoning: params.includes('reasoning') || params.includes('include_reasoning') || m.reasoning === true,
    supportsTools: params.includes('tools'),
    supportsStructured: params.includes('structured_outputs') || params.includes('response_format'),
    isReasoningVariant: isReasoningName(m.id),
    aa: aa ? {
      intelligence: num(aa.intelligence_index),
      codingIndex: num(aa.coding_index),
      agenticIndex: num(aa.agentic_index),
    } : null,
    designArena: design.map(d => ({ arena: d.arena, category: d.category, elo: num(d.elo), winRate: num(d.win_rate), rank: d.rank ?? null })),
    huggingFaceId: m.hugging_face_id || null,
    isOpenWeights: !!m.hugging_face_id,
  };
}
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function fetchORModels() {
  const json = await fetchJSON(MODELS_URL, { timeoutMs: 25_000 });
  if (!Array.isArray(json?.data) || json.data.length < 50) throw new Error('openrouter: unexpected /models payload');
  return json.data.map(normaliseORModel);
}

/** Normalise one endpoint from /models/{id}/endpoints. */
export function normaliseOREndpoint(e, modelId) {
  const p = e.pricing ?? {};
  return {
    provider: e.provider_name ?? 'Unknown',
    tag: e.tag ?? null,
    region: (e.tag ?? '').includes('/') ? e.tag.split('/').slice(1).join('/') : null,
    modelId,
    orId: e.model_id ?? null,
    contextLength: e.context_length ?? null,
    maxOutput: e.max_completion_tokens ?? null,
    quantization: e.quantization && e.quantization !== 'unknown' ? e.quantization : null,
    priceIn: perM(p.prompt),
    priceOut: perM(p.completion),
    priceCacheRead: perM(p.input_cache_read),
    priceCacheWrite: perM(p.input_cache_write),
    discount: num(p.discount),
    uptime30m: num(e.uptime_last_30m),
    uptime1d: num(e.uptime_last_1d),
    latencyMs: num(e.latency_last_30m),        // exposed as null by the public API today
    throughput: num(e.throughput_last_30m),    // idem — kept so the schema is ready
    status: e.status ?? null,
    supportsTools: Array.isArray(e.supported_parameters) && e.supported_parameters.includes('tools'),
    supportsReasoning: Array.isArray(e.supported_parameters) && e.supported_parameters.includes('reasoning'),
    supportsCaching: e.supports_implicit_caching ?? null,
  };
}

/** Endpoints for a list of OpenRouter ids, bounded concurrency. */
export async function fetchOREndpoints(orIds, { limit = 6, modelIdFor = id => id } = {}) {
  const results = await mapLimit(orIds, limit, async (id) => {
    const json = await fetchJSON(`https://openrouter.ai/api/v1/models/${id}/endpoints`, { timeoutMs: 15_000 });
    const eps = Array.isArray(json?.data?.endpoints) ? json.data.endpoints : [];
    return eps.map(e => normaliseOREndpoint(e, modelIdFor(id)));
  });
  const out = {};
  orIds.forEach((id, i) => { if (results[i]) out[id] = results[i]; });
  return out;
}
