// Netlify Function — /api/leaderboard (legacy contract)
//
// The original endpoint the first version of the site read: the arena text
// board as { models: [{ rank, slug, name, org, license, elo, ci, votes,
// priceIn, priceOut, context, url, isNew }], count, fetchedAt, source, parser }.
//
// It now serves the same merged records as /api/warroom/llms: arena ratings
// from the official arena dataset (see lib/arena.js), prices and context from
// OpenRouter. Each upstream is cached on its own in lib/domains.js, so this
// adds no fetches of its own; a short blob cache keeps the response cheap and
// a stale copy is served in preference to an error.

import { getStore } from '@netlify/blobs';
import { loadLLMs } from './lib/domains.js';
import { setBackgroundRunner } from './lib/cache.js';

// Kept in Netlify's durable CDN cache and served stale while it revalidates
// (see warroom.js), so a visitor never waits for the merge below.
const CDN_CACHE = 'public, durable, s-maxage=300, stale-while-revalidate=604800';

const CACHE_KEY = 'leaderboard-v6'; // bumped: arena dataset source
const CACHE_TTL = 60 * 60 * 1000;   // 1 hour — the upstream caches set the real cadence

export function toLegacy(m) {
  return {
    rank: m.arena.rank,
    slug: m.slug,
    name: m.name,
    org: m.org,
    license: m.license ?? 'Proprietary',
    elo: m.arena.elo,
    ci: m.arena.ci,
    votes: m.arena.votes,
    priceIn: m.priceIn,
    priceOut: m.priceOut,
    context: m.contextLabel,
    url: m.arena.url ?? null,
    isNew: !!m.arena.isNew,
  };
}

export async function fetchFromArena() {
  const llms = await loadLLMs();
  if (!llms.ok) throw new Error(llms.error ?? 'arena board unavailable');
  const models = llms.models.filter(m => m.arena).sort((a, b) => a.arena.rank - b.arena.rank).map(toLegacy);
  if (models.length < 50) throw new Error(`arena board too small (${models.length})`);
  return {
    models,
    count: models.length,
    fetchedAt: llms.fetchedAt,
    published: llms.published ?? null,
    source: 'arena.ai',
    parser: 'dataset',
    stale: !!llms.stale,
  };
}

export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300',
    'Netlify-CDN-Cache-Control': CDN_CACHE,
  };
  const waitUntil = typeof context?.waitUntil === 'function' ? p => context.waitUntil(p) : null;
  setBackgroundRunner(waitUntil);
  try { return await respond(headers, waitUntil); }
  finally { setBackgroundRunner(null); }
};

async function rebuild(store) {
  const fresh = { ...(await fetchFromArena()), cachedAt: new Date().toISOString() };
  if (store) {
    try { await store.setJSON(CACHE_KEY, fresh); } catch (e) { console.warn('Cache write failed:', e.message); }
  }
  return fresh;
}

let rebuilding = null;

async function respond(headers, waitUntil) {

  let store = null;
  try { store = getStore('aiwar-cache'); } catch { /* blobs unavailable */ }

  let cached = null;
  if (store) {
    try { cached = await store.get(CACHE_KEY, { type: 'json' }); } catch { /* cold cache */ }
  }

  if (cached?.cachedAt) {
    const age = Date.now() - new Date(cached.cachedAt).getTime();
    if (age < CACHE_TTL) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { ...headers, 'X-Cache': 'HIT', 'X-Cache-Age': `${Math.round(age / 60000)}min`, 'X-Parser': cached.parser ?? '' },
      });
    }
    // Past the TTL: answer with the copy we have and rebuild after the response.
    if (waitUntil && age < CACHE_TTL * 6 && cached.models?.length) {
      if (!rebuilding) {
        rebuilding = rebuild(store).catch(e => console.error('Leaderboard background rebuild failed:', e.message)).finally(() => { rebuilding = null; });
        waitUntil(rebuilding);
      }
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { ...headers, 'X-Cache': 'REVALIDATING', 'X-Cache-Age': `${Math.round(age / 60000)}min`, 'X-Parser': cached.parser ?? '' },
      });
    }
  }

  try {
    const fresh = await rebuild(store);
    return new Response(JSON.stringify(fresh), {
      status: 200,
      headers: { ...headers, 'X-Cache': 'MISS', 'X-Parser': fresh.parser },
    });
  } catch (err) {
    console.error('Leaderboard fetch failed:', err.message);
    if (cached?.models?.length) {
      return new Response(JSON.stringify({ ...cached, stale: true }), {
        status: 200,
        headers: { ...headers, 'X-Cache': 'STALE', 'X-Error': err.message.slice(0, 180) },
      });
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...headers, 'Netlify-CDN-Cache-Control': 'no-store' } });
  }
}

export const config = { path: '/api/leaderboard' };
