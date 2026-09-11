// Netlify Function — Live leaderboard from arena.ai
//
// arena.ai is a Next.js App Router site: the leaderboard is NOT in the served
// HTML (no <table>, no __NEXT_DATA__). It ships as an RSC flight payload split
// across self.__next_f.push([1,"…"]) chunks. The flight parser now lives in
// lib/arena.js (it also powers the image/video/vision boards); this function
// keeps the original /api/leaderboard contract byte-for-byte.
//
// Strategy order: flight → __NEXT_DATA__ → HTML table. Every result is
// validated before it is trusted, and a stale cache is served in preference
// to an error so the site never falls back to hardcoded data.
//
// Blob cache: arena.ai fetched at most once per 6h.

import { getStore } from '@netlify/blobs';
import {
  extractEntryArrays, toModel, validateBoard, fetchArenaHtml, normaliseOrg,
} from './lib/arena.js';

const CACHE_KEY = 'leaderboard-v5'; // bumped: RSC flight parser
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// ── Text helpers ───────────────────────────────────────────────────────────
function stripHtml(str) {
  return str.replace(/<[^>]+>/g, ' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}

function parsePrice(str) {
  if (!str || str === 'N/A' || str === '—' || str === '-') return null;
  const m = String(str).match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function parseVotes(str) {
  if (!str) return 0;
  return parseInt(String(str).replace(/,/g, ''), 10) || 0;
}

// ── Strategy 1: RSC flight payload (current arena.ai) ─────────────────────
function parseFlight(html) {
  const arrays = extractEntryArrays(html);
  if (!arrays.length) return null;
  // The overall text leaderboard is the largest snapshot on the page.
  return arrays[0].map(toModel);
}

// ── Strategy 2: __NEXT_DATA__ JSON (Next.js Pages Router) ─────────────────
function parseNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    const pp = data?.props?.pageProps ?? {};
    const arr = pp.entries ?? pp.models ?? pp.leaderboard ?? pp.rankings ?? pp.data ?? pp.rows;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map(toModel);
  } catch { return null; }
}

// ── Strategy 3: HTML table rows (legacy) ──────────────────────────────────
/** Split a combined "OrgName? model-slug OrgName · License" cell. */
function parseNameCell(cell) {
  let text = cell.trim();
  let license = 'Proprietary';
  let org = '';

  const dotIdx = text.lastIndexOf(' · ');
  if (dotIdx >= 0) {
    license = text.slice(dotIdx + 3).trim() || 'Proprietary';
    text = text.slice(0, dotIdx).trim();
  }

  const words = text.split(/\s+/);
  const orgWords = [];
  let cutAt = words.length;
  for (let i = words.length - 1; i >= 0; i--) {
    if (/^[A-Z0-9]/.test(words[i])) { orgWords.unshift(words[i]); cutAt = i; }
    else break;
  }
  if (orgWords.length > 0) {
    org = orgWords.join(' ');
    text = words.slice(0, cutAt).join(' ').trim();
    if (text.toLowerCase().startsWith(org.toLowerCase() + ' ')) {
      text = text.slice(org.length + 1).trim();
    }
  }

  return { name: text || cell.trim(), org, license };
}

function parseHTMLTable(html) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const models = [];

  for (const row of rows) {
    const tds = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    if (tds.length < 3) continue;
    const cells = tds.map(td => stripHtml(td[1]));

    const rank = parseInt(cells[0], 10);
    if (isNaN(rank) || rank < 1 || rank > 500) continue;

    // ELO spans roughly 900–1550 on the live board; anchoring at 1200 (as an
    // earlier revision did) silently dropped every model below that.
    let eloIdx = -1, elo = null, ci = null;
    for (let i = 1; i < cells.length; i++) {
      const m = cells[i].match(/^([89]\d{2}|1[0-7]\d{2})(?:[±+\s]+(\d+))?/);
      if (m) { elo = parseInt(m[1], 10); ci = m[2] ? parseInt(m[2], 10) : null; eloIdx = i; break; }
    }
    if (!elo || eloIdx < 0) continue;

    let name = '', org = '', license = 'Proprietary';
    if (eloIdx >= 4 && !/^\d{4}/.test(cells[3] ?? '')) {
      const p = parseNameCell(cells[2] ?? '');
      name = p.name || cells[2] || '';
      org = cells[3] || p.org;
      license = cells[4] || p.license;
    } else {
      ({ name, org, license } = parseNameCell(cells[eloIdx - 1] ?? ''));
    }

    let votes = 0;
    for (let i = eloIdx + 1; i < cells.length; i++) {
      const v = parseVotes(cells[i]);
      if (v > 50) { votes = v; break; }
    }

    let priceIn = null, priceOut = null, context = null;
    for (const cell of cells.slice(eloIdx + 1)) {
      if (/\$/.test(cell)) {
        const parts = cell.split('/');
        priceIn  = priceIn  ?? parsePrice(parts[0]);
        priceOut = priceOut ?? parsePrice(parts[1] ?? '');
      } else if (/^\d+\.?\d*[MK]$/.test(cell.trim())) {
        context = context ?? cell.trim();
      }
    }

    models.push(toModel({
      rank, name, license, votes, priceIn, priceOut,
      modelOrganization: normaliseOrg(org, null), rating: elo, ci, context,
    }, rank - 1));
  }

  return models.length > 5 ? models : null;
}

// ── Fetch ──────────────────────────────────────────────────────────────────
export async function fetchFromArena() {
  const html = await fetchArenaHtml('text');

  const strategies = [
    ['flight',     parseFlight],
    ['next-data',  parseNextData],
    ['html-table', parseHTMLTable],
  ];

  const problems = [];
  for (const [label, fn] of strategies) {
    let models = null;
    try { models = fn(html); } catch (e) { problems.push(`${label}: threw ${e.message}`); continue; }
    if (!models) { problems.push(`${label}: no match`); continue; }

    const problem = validateBoard(models);
    if (problem) { problems.push(`${label}: ${problem}`); continue; }

    models.sort((a, b) => b.elo - a.elo);
    models = models.map((m, i) => ({ ...m, rank: i + 1 }));

    return {
      models,
      count: models.length,
      fetchedAt: new Date().toISOString(),
      source: 'arena.ai',
      parser: label,
    };
  }

  throw new Error(`No usable data from arena.ai — ${problems.join('; ')}`);
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300',
  };

  let store = null;
  try { store = getStore('aiwar-cache'); } catch { /* blobs unavailable */ }

  let cached = null;
  if (store) {
    try { cached = await store.get(CACHE_KEY, { type: 'json' }); } catch { /* cold cache */ }
  }

  if (cached?.fetchedAt) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < CACHE_TTL) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { ...headers, 'X-Cache': 'HIT', 'X-Cache-Age': `${Math.round(age / 60000)}min` },
      });
    }
  }

  try {
    const fresh = await fetchFromArena();
    if (store) {
      try { await store.setJSON(CACHE_KEY, fresh); } catch (e) { console.warn('Cache write failed:', e.message); }
    }
    return new Response(JSON.stringify(fresh), {
      status: 200,
      headers: { ...headers, 'X-Cache': 'MISS', 'X-Parser': fresh.parser },
    });
  } catch (err) {
    console.error('Leaderboard fetch failed:', err.message);

    // Stale data beats no data — the alternative is the site showing its
    // hardcoded snapshot as if it were live.
    if (cached?.models?.length) {
      return new Response(JSON.stringify({ ...cached, stale: true }), {
        status: 200,
        headers: { ...headers, 'X-Cache': 'STALE', 'X-Error': err.message.slice(0, 180) },
      });
    }

    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};

export const config = { path: '/api/leaderboard' };
