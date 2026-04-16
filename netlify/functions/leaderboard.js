// Netlify Function — Live leaderboard with Blob cache
// Arena.ai se fetcha JEDNOM svaka 6 sati i sprema u Netlify Blobs.
// Svi korisnici dobivaju isti cached odgovor — nula load na arena.ai.

import { getStore } from '@netlify/blobs';

const CACHE_KEY = 'leaderboard-v1';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 sati

async function fetchFromArena() {
  const res = await fetch('https://arena.ai/leaderboard/text', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AIWarRoom/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`arena.ai ${res.status}`);

  const html  = await res.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('__NEXT_DATA__ not found');

  const nextData  = JSON.parse(match[1]);
  const pageProps = nextData?.props?.pageProps ?? {};
  const models    =
    pageProps.models      ??
    pageProps.leaderboard ??
    pageProps.rankings    ??
    pageProps.data        ??
    null;

  if (!Array.isArray(models)) throw new Error('Model array not found');

  const fmt = (n) => {
    if (!n) return null;
    if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
    return `${Math.round(n / 1_000)}K`;
  };

  return {
    models: models.map((m, i) => ({
      rank:     m.rank ?? i + 1,
      slug:     (m.modelDisplayName ?? '').toLowerCase().replace(/\s+/g, '-'),
      name:     m.modelDisplayName ?? '',
      org:      m.modelOrganization ?? 'Unknown',
      license:  m.license ?? 'Proprietary',
      elo:      Math.round(m.rating ?? m.elo ?? 1200),
      ci:       m.ratingUpper && m.ratingLower
                  ? Math.round((m.ratingUpper - m.ratingLower) / 2)
                  : null,
      votes:    m.votes ?? 0,
      priceIn:  m.inputPricePerMillion  ?? null,
      priceOut: m.outputPricePerMillion ?? null,
      context:  fmt(m.contextLength),
    })),
    fetchedAt: new Date().toISOString(),
  };
}

export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const store = getStore('aiwar-cache');

    // Provjeri cache
    let cached = null;
    try {
      cached = await store.get(CACHE_KEY, { type: 'json' });
    } catch { /* cache miss */ }

    if (cached?.fetchedAt) {
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_TTL) {
        // Cache je svjež — vrati odmah, nula poziva prema arena.ai
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { ...headers, 'X-Cache': 'HIT', 'X-Cache-Age': `${Math.round(age / 60000)}min` },
        });
      }
    }

    // Cache je star ili ne postoji — fetcha jednom i spremi
    const fresh = await fetchFromArena();
    try {
      await store.setJSON(CACHE_KEY, fresh);
    } catch (e) {
      console.warn('Cache write failed:', e.message);
    }

    return new Response(JSON.stringify(fresh), {
      status: 200,
      headers: { ...headers, 'X-Cache': 'MISS' },
    });

  } catch (err) {
    // Ako sve padne — vrati grešku, frontend koristiti fallback
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers,
    });
  }
};

export const config = { path: '/api/leaderboard' };
