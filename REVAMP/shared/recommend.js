// ─── Mission Planner — deterministic recommendation engine ──────────────────
// No LLM in the loop. Every pick is a weighted sum of normalised metrics
// the caller supplies; every pick comes with the numbers that produced it.
//
// A candidate is { id, name, org, metrics: { quality, cost, speed, latency, context, open } }
// where each metric is a raw number (or null/undefined = unknown) and the
// mission says what "quality" and "cost" mean for that pool.

import { isNum, normalise, extent, fmtMetric } from './metrics.js';

export const MISSIONS = [
  { id: 'chat',        label: 'Chat',             pool: 'llm',   quality: 'elo',          cost: 'priceBlended',   speed: 'speed',  desc: 'Conversational assistant — human-preference ELO leads.' },
  { id: 'reasoning',   label: 'Reasoning',        pool: 'llm',   quality: 'intelligence', cost: 'priceBlended',   speed: 'speed',  desc: 'Hard multi-step problems — Intelligence Index leads.', requireReasoning: true },
  { id: 'coding',      label: 'Coding',           pool: 'llm',   quality: 'codingIndex',  cost: 'priceBlended',   speed: 'speed',  desc: 'Software engineering — Coding Index leads.' },
  { id: 'rag',         label: 'RAG',              pool: 'llm',   quality: 'elo',          cost: 'priceIn',        speed: 'ttft',   desc: 'Retrieval pipelines — input price and context matter most.', contextWeightBoost: 1.5 },
  { id: 'agents',      label: 'Agents',           pool: 'llm',   quality: 'agenticIndex', cost: 'priceBlended',   speed: 'speed',  desc: 'Tool-using agents — Agentic Index leads.' },
  { id: 'cheap-api',   label: 'Cheap API',        pool: 'llm',   quality: 'elo',          cost: 'priceBlended',   speed: 'speed',  desc: 'Volume workloads — cost dominates.', preset: { quality: 0.4, cost: 1, speed: 0.3, context: 0.1, open: 0 } },
  { id: 'fast-api',    label: 'Fast API',         pool: 'llm',   quality: 'elo',          cost: 'priceBlended',   speed: 'speed',  desc: 'Latency-sensitive products — speed dominates.', preset: { quality: 0.5, cost: 0.3, speed: 1, context: 0.1, open: 0 } },
  { id: 'long-context', label: 'Long context',    pool: 'llm',   quality: 'elo',          cost: 'priceIn',        speed: 'speed',  desc: 'Whole-repo / multi-document work — context window dominates.', preset: { quality: 0.6, cost: 0.3, speed: 0.1, context: 1, open: 0 } },
  { id: 'image-gen',   label: 'Image generation', pool: 'image', quality: 'elo',          cost: 'pricePerImage',  speed: 'genTime', desc: 'Text-to-image — quality ELO vs price per image.' },
  { id: 'image-edit',  label: 'Image editing',    pool: 'image-edit', quality: 'elo',     cost: 'pricePerImage',  speed: 'genTime', desc: 'Instruction-based image editing.' },
  { id: 'video-gen',   label: 'Video generation', pool: 'video', quality: 'elo',          cost: 'pricePerSecond', speed: 'genTime', desc: 'Text-to-video — quality ELO vs price per second.' },
  { id: 'voice',       label: 'Voice',            pool: 'tts',   quality: 'ttsQuality',   cost: 'pricePer1mChars', speed: 'ttft',  desc: 'Text-to-speech — voice quality vs price.' },
  { id: 'transcription', label: 'Transcription',  pool: 'stt',   quality: 'wer',          cost: 'pricePerMinute', speed: 'rtfx',   desc: 'Speech-to-text — word error rate leads (lower is better).' },
];

export const DEFAULT_WEIGHTS = { quality: 1, cost: 0.5, speed: 0.3, context: 0.2, open: 0 };

const DIRECTION = {
  elo: true, intelligence: true, codingIndex: true, agenticIndex: true, ttsQuality: true, wer: false,
  priceBlended: false, priceIn: false, pricePerImage: false, pricePerSecond: false, pricePer1mChars: false, pricePerMinute: false,
  speed: true, rtfx: true, ttft: false, genTime: false,
  context: true, open: true,
};

function dimNorm(rows, get, higher, log) {
  const [lo, hi] = extent(rows, get);
  return r => normalise(get(r), lo, hi, higher, { log });
}

/**
 * Score candidates for a mission.
 * @param mission  one of MISSIONS (or its id)
 * @param rows     candidates; each has .metrics[key]
 * @param weights  { quality, cost, speed, context, open } in 0..1
 * @returns { picks: { primary, bestValue, budget, fastest }, scored, dims }
 */
export function recommend(missionOrId, rows, weights = DEFAULT_WEIGHTS) {
  const mission = typeof missionOrId === 'string' ? MISSIONS.find(m => m.id === missionOrId) : missionOrId;
  if (!mission) throw new Error('unknown mission');
  const w = { ...DEFAULT_WEIGHTS, ...(mission.preset ?? {}), ...weights };
  if (mission.contextWeightBoost) w.context = Math.min(1, w.context * mission.contextWeightBoost);

  const qKey = mission.quality, cKey = mission.cost, sKey = mission.speed;
  let pool = rows.filter(r => isNum(r.metrics?.[qKey]));
  if (mission.requireReasoning) {
    const reasoning = pool.filter(r => r.isReasoning);
    if (reasoning.length >= 3) pool = reasoning;
  }
  if (pool.length === 0) return { picks: {}, scored: [], dims: [], reason: `No candidates carry a ${qKey} value.` };

  const nQ = dimNorm(pool, r => r.metrics[qKey], DIRECTION[qKey] !== false, false);
  const nC = dimNorm(pool, r => r.metrics[cKey], false, true);
  const nS = dimNorm(pool, r => r.metrics[sKey], DIRECTION[sKey] !== false, false);
  const nX = dimNorm(pool, r => r.metrics.context, true, true);
  const nO = r => (r.metrics.open ? 1 : 0);

  const dims = [
    { key: 'quality', metric: qKey, weight: w.quality, norm: nQ },
    { key: 'cost',    metric: cKey, weight: w.cost,    norm: nC },
    { key: 'speed',   metric: sKey, weight: w.speed,   norm: nS },
    { key: 'context', metric: 'context', weight: w.context, norm: nX },
    { key: 'open',    metric: 'open', weight: w.open,  norm: nO },
  ].filter(d => d.weight > 0);

  const scored = pool.map(r => {
    let sum = 0, wsum = 0;
    const parts = {};
    for (const d of dims) {
      const n = d.norm(r);
      if (n == null) continue;             // unknown → dimension skipped, never scored as 0
      parts[d.key] = n;
      sum += d.weight * n;
      wsum += d.weight;
    }
    // Missing dimensions shrink the denominator, but a candidate that lacks
    // cost or speed data must not outrank one that has it purely by omission:
    // apply a small coverage penalty.
    const coverage = wsum / dims.reduce((s, d) => s + d.weight, 0);
    const score = wsum ? (sum / wsum) * (0.85 + 0.15 * coverage) : 0;
    return { ...r, score, parts, coverage };
  }).sort((a, b) => b.score - a.score);

  const q = r => r.parts.quality ?? 0;
  const qFloor = t => scored.filter(r => q(r) >= t);

  const primary = scored[0];

  // Best value: strongest quality-per-dollar among candidates with cost data.
  const withCost = scored.filter(r => isNum(r.metrics[cKey]));
  const bestValue = withCost
    .map(r => ({ r, v: 0.5 * q(r) + 0.5 * (r.parts.cost ?? 0) }))
    .filter(x => q(x.r) >= 0.55)
    .sort((a, b) => b.v - a.v)[0]?.r ?? withCost.sort((a, b) => (0.5 * q(b) + 0.5 * (b.parts.cost ?? 0)) - (0.5 * q(a) + 0.5 * (a.parts.cost ?? 0)))[0] ?? null;

  // Budget: cheapest candidate that is still at least mid-pack on quality.
  const budgetPool = (qFloor(0.5).filter(r => isNum(r.metrics[cKey])).length ? qFloor(0.5) : scored).filter(r => isNum(r.metrics[cKey]));
  const budget = [...budgetPool].sort((a, b) => a.metrics[cKey] - b.metrics[cKey])[0] ?? null;

  // Fastest: best speed metric among at-least-mid-pack quality.
  const speedPool = (qFloor(0.5).filter(r => isNum(r.metrics[sKey])).length ? qFloor(0.5) : scored).filter(r => isNum(r.metrics[sKey]));
  const higherSpeed = DIRECTION[sKey] !== false;
  const fastest = [...speedPool].sort((a, b) => higherSpeed ? b.metrics[sKey] - a.metrics[sKey] : a.metrics[sKey] - b.metrics[sKey])[0] ?? null;

  const explain = (r, role) => {
    if (!r) return null;
    const lines = [];
    const qv = r.metrics[qKey], cv = r.metrics[cKey], sv = r.metrics[sKey];
    if (role === 'primary') lines.push(`Highest weighted score (${(r.score * 100).toFixed(0)}/100) across ${Object.keys(r.parts).length} dimensions.`);
    if (role === 'bestValue') lines.push(`Best quality-per-dollar: ${Math.round(q(r) * 100)}% of the top quality at ${fmtMetric(cKey, cv)}.`);
    if (role === 'budget') lines.push(`Cheapest option that still scores ≥ mid-pack on ${qKey}.`);
    if (role === 'fastest') lines.push(`Best ${sKey} (${fmtMetric(sKey, sv)}) among mid-pack-or-better quality.`);
    lines.push(`${qKey}: ${fmtMetric(qKey, qv)}${isNum(cv) ? ` · ${cKey}: ${fmtMetric(cKey, cv)}` : ' · cost: N/A'}${isNum(sv) ? ` · ${sKey}: ${fmtMetric(sKey, sv)}` : ''}`);
    if (r.coverage < 1) lines.push('Some dimensions had no data and were excluded from the score.');
    return lines;
  };

  return {
    mission, weights: w, dims: dims.map(d => ({ key: d.key, metric: d.metric, weight: d.weight })),
    scored,
    picks: {
      primary:   primary   ? { ...primary,   why: explain(primary, 'primary') }     : null,
      bestValue: bestValue ? { ...bestValue, why: explain(bestValue, 'bestValue') } : null,
      budget:    budget    ? { ...budget,    why: explain(budget, 'budget') }       : null,
      fastest:   fastest   ? { ...fastest,   why: explain(fastest, 'fastest') }     : null,
    },
    missing: {
      cost: !withCost.length ? `No ${cKey} data for these candidates.` : null,
      speed: !speedPool.length ? `No ${sKey} data — speed source not configured.` : null,
    },
  };
}
