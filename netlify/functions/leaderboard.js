// Netlify Function — Live leaderboard from arena.ai
// Supports both __NEXT_DATA__ JSON and HTML table parsing
// Blob cache: arena.ai fetched max once per 6h

import { getStore } from '@netlify/blobs';

const CACHE_KEY = 'leaderboard-v2';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Strip HTML tags and clean text
function stripHtml(str) {
  return str.replace(/<[^>]+>/g, ' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}

// Parse price string like "$5" or "5" → float or null
function parsePrice(str) {
  if (!str || str === 'N/A' || str === '—' || str === '-') return null;
  const m = str.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

// Parse context like "1M", "128K", "202.8K" → normalized string
function parseContext(str) {
  if (!str || str === 'N/A' || str === '—') return null;
  str = str.trim().toUpperCase();
  if (str.includes('M')) return `${parseFloat(str)}M`;
  if (str.includes('K')) return `${Math.round(parseFloat(str))}K`;
  const n = parseInt(str);
  if (n >= 1_000_000) return `${Math.round(n/1_000_000)}M`;
  if (n >= 1_000)     return `${Math.round(n/1_000)}K`;
  return null;
}

// Parse votes like "2,618" or "2618" → integer
function parseVotes(str) {
  if (!str) return 0;
  return parseInt(str.replace(/,/g,'')) || 0;
}

// ── Strategy 1: Parse __NEXT_DATA__ JSON (Next.js Pages Router) ──────────
function parseNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    const pp = data?.props?.pageProps ?? {};
    const arr = pp.models ?? pp.leaderboard ?? pp.rankings ?? pp.data ?? pp.rows;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((r, i) => ({
      rank:     r.rank ?? i + 1,
      slug:     (r.modelDisplayName ?? r.slug ?? r.id ?? '').toLowerCase().replace(/\s+/g,'-'),
      name:     r.modelDisplayName ?? r.name ?? r.slug ?? '',
      org:      r.modelOrganization ?? r.org ?? r.organization ?? 'Unknown',
      license:  r.license ?? 'Proprietary',
      elo:      Math.round(r.rating ?? r.elo ?? r.score ?? 1200),
      ci:       r.ratingUpper && r.ratingLower ? Math.round((r.ratingUpper - r.ratingLower) / 2) : null,
      votes:    r.votes ?? r.battles ?? 0,
      priceIn:  r.inputPricePerMillion  ?? r.priceIn  ?? null,
      priceOut: r.outputPricePerMillion ?? r.priceOut ?? null,
      context:  r.contextLength ? parseContext(String(r.contextLength)) : null,
    }));
  } catch { return null; }
}

// ── Strategy 2: HTML table row parsing ────────────────────────────────────
function parseHTMLTable(html) {
  const models = [];

  // Find all <tr> blocks
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

  for (const row of rows) {
    const tds = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    if (tds.length < 3) continue;

    const cells = tds.map(td => stripHtml(td[1]));

    // First cell must be a rank integer 1–500
    const rank = parseInt(cells[0]);
    if (isNaN(rank) || rank < 1 || rank > 500) continue;

    // Find ELO cell — 4-digit number 1200–1700 (optionally followed by ±CI)
    let eloIdx = -1, elo = null, ci = null;
    for (let i = 1; i < cells.length; i++) {
      const m = cells[i].match(/^(1[2-7]\d{2})(?:[±\+\s]+(\d+))?/);
      if (m) { elo = parseInt(m[1]); ci = m[2] ? parseInt(m[2]) : null; eloIdx = i; break; }
    }
    if (!elo || eloIdx < 0) continue;

    // Model name and org: cells just before elo
    // Could be: [rank][rankRange][name][org][license][elo]
    // or:       [rank][rankRange][name+org combined][elo]
    let name = '', org = 'Unknown', license = 'Proprietary';

    if (eloIdx >= 4) {
      // Likely: [rank, rankRange, name, org, license, elo, ...]
      name    = cells[2] || '';
      org     = cells[3] || 'Unknown';
      license = cells[4] || 'Proprietary';
    } else if (eloIdx >= 3) {
      name    = cells[2] || '';
      org     = cells[3] || 'Unknown';
    } else {
      name    = cells[1] || '';
    }

    // Votes: first integer > 50 after eloIdx
    let votes = 0;
    for (let i = eloIdx + 1; i < cells.length; i++) {
      const v = parseVotes(cells[i]);
      if (v > 50) { votes = v; break; }
    }

    // Price and context — look in remaining cells
    let priceIn = null, priceOut = null, context = null;
    const remaining = cells.slice(eloIdx + 1);
    for (const cell of remaining) {
      // Price pattern: "$5/$25" or "$2.50" or "5"
      if (/\$/.test(cell)) {
        const parts = cell.split('/');
        priceIn  = priceIn  ?? parsePrice(parts[0]);
        priceOut = priceOut ?? parsePrice(parts[1] ?? '');
        continue;
      }
      // Context pattern: "1M", "128K", "1.1M"
      if (/^\d+\.?\d*[MK]$/.test(cell.trim())) {
        context = context ?? parseContext(cell);
        continue;
      }
    }

    models.push({ rank, slug: name.toLowerCase().replace(/\s+/g,'-'), name, org, license, elo, ci, votes, priceIn, priceOut, context });
  }

  return models.length > 5 ? models : null;
}

// ── Strategy 3: Search for data patterns directly in script tags ──────────
function parseScriptData(html) {
  // Next.js App Router RSC format — look for JSON arrays embedded in script tags
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const s of scripts) {
    const content = s[1];
    // Look for arrays that look like leaderboard data
    const arrMatches = [...content.matchAll(/\[(\{[^[\]]*"rating"[^[\]]*\}(?:,\{[^[\]]*\})*)\]/g)];
    for (const arr of arrMatches) {
      try {
        const data = JSON.parse('[' + arr[1] + ']');
        if (Array.isArray(data) && data.length > 5 && data[0].rating) {
          return data.map((r, i) => ({
            rank: r.rank ?? i + 1,
            slug: (r.modelDisplayName ?? r.name ?? '').toLowerCase().replace(/\s+/g,'-'),
            name: r.modelDisplayName ?? r.name ?? '',
            org:  r.modelOrganization ?? r.org ?? 'Unknown',
            license: r.license ?? 'Proprietary',
            elo:  Math.round(r.rating ?? 1200),
            ci:   null,
            votes: r.votes ?? 0,
            priceIn:  r.inputPricePerMillion ?? null,
            priceOut: r.outputPricePerMillion ?? null,
            context:  r.contextLength ? parseContext(String(r.contextLength)) : null,
          }));
        }
      } catch { continue; }
    }
  }
  return null;
}

// ── Main fetch ─────────────────────────────────────────────────────────────
async function fetchFromArena() {
  const res = await fetch('https://arena.ai/leaderboard/text', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`arena.ai ${res.status}`);
  const html = await res.text();

  const models =
    parseNextData(html)   ||
    parseScriptData(html) ||
    parseHTMLTable(html);

  if (!models || models.length === 0) throw new Error('No models parsed from arena.ai');

  return { models, fetchedAt: new Date().toISOString(), source: 'arena.ai' };
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const store = getStore('aiwar-cache');

    // Try cache first
    let cached = null;
    try { cached = await store.get(CACHE_KEY, { type: 'json' }); } catch {}

    if (cached?.fetchedAt) {
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_TTL) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { ...headers, 'X-Cache': 'HIT', 'X-Cache-Age': `${Math.round(age/60000)}min` },
        });
      }
    }

    // Fetch fresh data
    const fresh = await fetchFromArena();
    try { await store.setJSON(CACHE_KEY, fresh); } catch (e) { console.warn('Cache write failed:', e.message); }

    return new Response(JSON.stringify(fresh), {
      status: 200,
      headers: { ...headers, 'X-Cache': 'MISS' },
    });

  } catch (err) {
    console.error('Leaderboard function error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers,
    });
  }
};

export const config = { path: '/api/leaderboard' };
