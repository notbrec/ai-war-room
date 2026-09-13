// ─── Cross-source merging ───────────────────────────────────────────────────
// Pure functions: take normalised rows from each adapter, return the
// canonical records the site renders. Precedence rules live here and nowhere
// else:
//   price   → OpenRouter (live market) > arena listing > AA listing
//   context → OpenRouter > arena
//   ELO     → arena
//   speed / latency / benchmarks → Artificial Analysis
//   indexes → AA Data API > AA-via-OpenRouter

import { canonicalModelId, canonicalOrg, buildIndex, splitVariant, reasoningLevel, isReasoningName, bareKey } from '../../../shared/ids.js';
import { blendedPrice, parseContext, isNum } from '../../../shared/metrics.js';

const OPEN_RE = /^(proprietary|other|unknown)/i;
export function isOpenWeights(lic) {
  const s = String(lic ?? '').trim();
  return !!s && !OPEN_RE.test(s);
}

/** Wrap a lookup so a fuzzy hit across labs is rejected. */
function orgSafe(lookup) {
  return (raw, org) => {
    const hit = lookup(raw, org);
    if (!hit) return null;
    const a = bareKey(canonicalOrg(org)), b = bareKey(canonicalOrg(hit.org));
    if (a && b && a !== 'unknown' && b !== 'unknown' && a !== b) {
      // Same weights re-published under an alias (e.g. "SpaceXAI"/"xAI") already
      // collapse through canonicalOrg; a remaining mismatch is a real collision.
      return null;
    }
    return hit;
  };
}

function ctxLabel(tokens) {
  if (!isNum(tokens)) return null;
  if (tokens >= 1_000_000) return `${+(tokens / 1_000_000).toFixed(tokens % 1_000_000 ? 1 : 0)}M`;
  return `${Math.round(tokens / 1_000)}K`;
}

/**
 * @param {object} src  { arena: [...text rows], vision: [...], search: [...], or: [...OR models], aa: [...AA LLM rows] }
 * @returns merged LLM records
 */
export function mergeLLMs(src) {
  const arena = src.arena ?? [];
  const or = (src.or ?? []).filter(m => !/:(free|batch|exacto|extended|nitro|thinking|online)$/.test(m.id));
  const aa = src.aa ?? [];

  const findOR = orgSafe(buildIndex(or, m => [m.id, m.canonicalSlug, m.name].filter(Boolean)));
  const findAA = orgSafe(buildIndex(aa, m => [m.slug, m.name].filter(Boolean)));
  const findVision = orgSafe(buildIndex(src.vision ?? [], m => [m.slug, m.name]));
  const findSearch = orgSafe(buildIndex(src.search ?? [], m => [m.slug, m.name]));

  const out = [];
  const seen = new Set();

  for (const a of arena) {
    const orHit = findOR(a.slug, a.org) ?? findOR(a.name, a.org);
    const aaHit = findAA(a.slug, a.org) ?? findAA(a.name, a.org);
    const id = canonicalModelId(a.slug, a.org);
    seen.add(id);
    out.push(buildRecord({ id, arena: a, or: orHit, aa: aaHit, vision: findVision(a.slug, a.org), search: findSearch(a.slug, a.org) }));
  }

  // Models absent from the arena but carrying an intelligence signal are
  // still worth ranking on the non-ELO axes (marked inArena:false).
  for (const m of or) {
    if (!m.aa?.intelligence && !m.aa?.codingIndex) continue;
    if (!m.modalities.out.includes('text')) continue;
    if (seen.has(m.modelId)) continue;
    // A variant of an arena model (e.g. same family) may already be represented; skip exact family+variant dupes only.
    seen.add(m.modelId);
    const aaHit = findAA(m.id, m.org) ?? findAA(m.name, m.org);
    out.push(buildRecord({ id: m.modelId, arena: null, or: m, aa: aaHit, vision: null, search: null }));
  }

  for (const m of aa) {
    if (m.deprecated) continue;   // retired on AA: joins above, never listed on its own
    if (seen.has(m.modelId)) continue;
    if (!isNum(m.intelligence)) continue;
    seen.add(m.modelId);
    out.push(buildRecord({ id: m.modelId, arena: null, or: findOR(m.slug ?? m.name, m.org), aa: m, vision: null, search: null }));
  }

  // Rank: arena rank first, then intelligence for the rest.
  out.sort((x, y) => {
    const ax = x.arena?.rank ?? Infinity, ay = y.arena?.rank ?? Infinity;
    if (ax !== ay) return ax - ay;
    return (y.aa?.intelligence ?? -1) - (x.aa?.intelligence ?? -1);
  });
  return out;
}

function buildRecord({ id, arena, or, aa, vision, search }) {
  const name = arena?.name ?? or?.name ?? aa?.name ?? id;
  const org = canonicalOrg(arena?.org ?? or?.org ?? aa?.org ?? 'Unknown');
  const license = arena?.license ?? (or?.isOpenWeights ? 'Open weights' : null);
  const { family, variant } = splitVariant(arena?.slug ?? or?.id ?? aa?.slug ?? name);

  const priceIn  = or?.pricing?.priceIn  ?? arena?.priceIn  ?? aa?.priceIn  ?? null;
  const priceOut = or?.pricing?.priceOut ?? arena?.priceOut ?? aa?.priceOut ?? null;
  const context  = or?.contextLength ?? parseContext(arena?.context) ?? null;
  const releaseDate = aa?.releaseDate ?? or?.created ?? null;

  const aaBlock = (aa || or?.aa) ? {
    intelligence: aa?.intelligence ?? or?.aa?.intelligence ?? null,
    codingIndex:  aa?.codingIndex  ?? or?.aa?.codingIndex  ?? null,
    agenticIndex: aa?.agenticIndex ?? or?.aa?.agenticIndex ?? null,
    mathIndex:    aa?.mathIndex ?? null,
    speed: aa?.speed ?? null, ttft: aa?.ttft ?? null, e2e: aa?.e2e ?? null,
    benchmarks: aa?.benchmarks ?? null,
    via: aa ? (aa.via ?? 'aa-api') : 'openrouter',
  } : null;

  const sources = [];
  if (arena) sources.push('arena');
  if (or) sources.push('openrouter');
  if (aa || or?.aa) sources.push('aa');
  if (or?.designArena?.length) sources.push('designarena');

  return {
    id, slug: arena?.slug ?? (or?.id ? or.id.split('/').pop() : bareKey(name)), name, org,
    family, variant: variant.join('-') || null,
    license, isOpen: license ? isOpenWeights(license) : !!or?.isOpenWeights,
    isThinking: isReasoningName(arena?.slug ?? name) || (!arena && !!or?.isReasoningVariant),
    reasoningLevel: reasoningLevel(arena?.slug ?? or?.id ?? name),
    supportsReasoning: or?.supportsReasoning ?? null,
    supportsTools: or?.supportsTools ?? null,
    modalities: or?.modalities ?? null,
    inArena: !!arena,
    arena: arena ? { rank: arena.rank, elo: arena.elo, ci: arena.ci, votes: arena.votes, url: arena.url, isNew: arena.isNew } : null,
    arenas: {
      vision: vision ? { rank: vision.rank, elo: vision.elo, ci: vision.ci, votes: vision.votes } : null,
      search: search ? { rank: search.rank, elo: search.elo, ci: search.ci, votes: search.votes } : null,
    },
    or: or ? {
      id: or.id, created: or.created, knowledgeCutoff: or.knowledgeCutoff, maxOutput: or.maxOutput,
      designArena: or.designArena?.length ? or.designArena : null,
      huggingFaceId: or.huggingFaceId,
    } : null,
    aa: aaBlock,
    priceIn, priceOut, priceBlended: blendedPrice(priceIn, priceOut),
    priceCacheRead: or?.pricing?.priceCacheRead ?? null,
    priceCacheWrite: or?.pricing?.priceCacheWrite ?? null,
    priceSource: or?.pricing?.priceIn != null ? 'openrouter' : (arena?.priceIn != null ? 'arena' : (aa?.priceIn != null ? 'aa' : null)),
    context, contextLabel: ctxLabel(context), maxOutput: or?.maxOutput ?? null,
    releaseDate,
    sources,
  };
}

/** Merge one arena media board with the matching AA media board. */
export function mergeMedia(board, arenaRows, aaRows) {
  const findAA = orgSafe(buildIndex(aaRows ?? [], m => [m.slug, m.name].filter(Boolean)));
  const kind = /video/.test(board) ? 'video' : 'image';
  const out = (arenaRows ?? []).map(a => {
    const hit = findAA(a.slug, a.org) ?? findAA(a.name, a.org);
    const id = canonicalModelId(a.slug, a.org);
    const nameL = a.name.toLowerCase();
    const resFromName = (nameL.match(/(\d{3,4})p\b/) || [])[1] ? `${nameL.match(/(\d{3,4})p\b/)[1]}p` : (/\b4k\b/.test(nameL) ? '4K' : null);
    const pricePerImage = a.pricePerImage ?? hit?.pricePerImage ?? null;
    const pricePerSecond = a.pricePerSecond ?? hit?.pricePerSecond ?? null;
    return {
      id, board, kind,
      slug: a.slug, name: a.name, org: a.org, license: a.license, isOpen: isOpenWeights(a.license),
      rank: a.rank, elo: a.elo, rating: a.rating, ci: a.ci, votes: a.votes, url: a.url, isNew: a.isNew,
      pricePerImage, pricePer1kImages: isNum(pricePerImage) ? pricePerImage * 1000 : null,
      pricePerSecond, pricePerMinute: isNum(pricePerSecond) ? pricePerSecond * 60 : null,
      genTime: hit?.genTime ?? null, genTimeP25: hit?.genTimeP25 ?? null, genTimeP75: hit?.genTimeP75 ?? null,
      hasAudio: kind === 'video' ? (hit?.hasAudio ?? /audio/.test(nameL)) : null,
      resolution: hit?.resolution ?? resFromName,
      releaseDate: hit?.releaseDate ?? null,
      provider: hit?.provider ?? null,
      sources: ['arena', ...(hit ? ['aa'] : [])],
    };
  });
  // Rows Artificial Analysis rates but arena.ai does not are deliberately NOT appended: AA's
  // ELO is fitted on a different pool and scale, so mixing the two into one ranked column
  // would mislead. AA only enriches the arena board here (times, prices, providers).
  return out;
}

/** Group endpoint rows per model and mark the winners on each axis. */
export function summariseProviders(endpointsByModel) {
  const out = [];
  for (const [modelId, eps] of Object.entries(endpointsByModel)) {
    if (!eps?.length) continue;
    const rows = eps.map(e => ({ ...e, priceBlended: blendedPrice(e.priceIn, e.priceOut) }));
    const min = (k) => rows.filter(r => isNum(r[k])).sort((a, b) => a[k] - b[k])[0] ?? null;
    const max = (k) => rows.filter(r => isNum(r[k])).sort((a, b) => b[k] - a[k])[0] ?? null;
    const cheapest = min('priceBlended');
    const fastest = max('throughput');
    const lowestLatency = min('latencyMs');
    const bestUptime = max('uptime30m');
    // Best value = cheapest among endpoints with the full context & no quantisation below fp8.
    const full = rows.filter(r => !r.quantization || /fp8|bf16|fp16|fp32|int8/.test(r.quantization));
    const bestValue = (full.length ? full : rows).filter(r => isNum(r.priceBlended)).sort((a, b) => a.priceBlended - b.priceBlended)[0] ?? null;
    out.push({
      modelId,
      count: rows.length,
      endpoints: rows,
      winners: {
        cheapest: cheapest?.tag ?? null,
        fastest: fastest?.tag ?? null,
        lowestLatency: lowestLatency?.tag ?? null,
        bestUptime: bestUptime?.tag ?? null,
        bestValue: bestValue?.tag ?? null,
      },
    });
  }
  return out;
}
