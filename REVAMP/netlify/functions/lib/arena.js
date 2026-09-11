// ─── arena.ai adapter ───────────────────────────────────────────────────────
// arena.ai is a Next.js App Router site: each leaderboard is NOT in the served
// HTML as a table — it ships inside the RSC flight payload, split across
// self.__next_f.push([1,"…"]) chunks. Concatenating the *unescaped* chunks
// reconstructs the stream, which contains "entries":[{rank, modelKey,
// modelDisplayName, rating, ratingUpper, ratingLower, votes, modelOrganization,
// modelUrl, license, inputPricePerMillion, outputPricePerMillion,
// contextLength, pricePerImage, pricePerSecond, releaseType}].
//
// The same parser serves every board: text (LLMs), vision, search,
// text-to-image, image-edit, text-to-video, image-to-video.

import { fetchText, BROWSER_UA } from './http.js';
import { canonicalOrg, ORG_ALIASES } from '../../../shared/ids.js';

export const ARENA_BOARDS = {
  text:            { path: 'text',           kind: 'llm',   label: 'Text' },
  vision:          { path: 'vision',         kind: 'llm',   label: 'Vision' },
  search:          { path: 'search',         kind: 'llm',   label: 'Search' },
  'text-to-image': { path: 'text-to-image',  kind: 'image', label: 'Text to Image' },
  'image-edit':    { path: 'image-edit',     kind: 'image', label: 'Image Editing' },
  'text-to-video': { path: 'text-to-video',  kind: 'video', label: 'Text to Video' },
  'image-to-video':{ path: 'image-to-video', kind: 'video', label: 'Image to Video' },
};

// Anything that is *only* ever a licence must never end up in the org column —
// a lossy table parser will happily shift the licence cell one column left.
// Deliberately excluded: bare "Nvidia", "DeepSeek", "Cohere", "NexusFlow" —
// arena.ai publishes those as both a licence name and a real lab name.
export const LICENSE_WORDS = /^(proprietary|mit|modified mit|apache([\s-]?2\.0)?|open source|cc[\s-]?by[\w.\s-]*|non-?commercial|other|unknown license|llama[\s\d.-]*(community)?|gemma(\s?license)?|qwen|qianwen[\s\w]*|deepseek license|nvidia open([\s\w]*)?|jamba open|mrl|mistral research|dbrx[\s\w]*|yi license|openmdw[\s\w.-]*|tencent-hunyuan-community|minimax community license|ai2 impact.*|falcon.*)$/i;

/** Domain / Hugging Face owner → lab display name, for blank-org models. */
export function orgFromUrl(url) {
  if (!url) return null;
  let host = '', path = '';
  try { const u = new URL(url); host = u.hostname.replace(/^www\./, ''); path = u.pathname; }
  catch { return null; }

  if (host === 'huggingface.co') {
    const owner = path.split('/').filter(Boolean)[0];
    if (owner) {
      const hit = ORG_ALIASES[owner.toLowerCase()];
      if (hit) return hit;
      return owner.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return null;
  }

  const label = host.split('.').slice(-2)[0] || host;
  const hit = ORG_ALIASES[label.toLowerCase()] || ORG_ALIASES[host.toLowerCase()];
  if (hit) return hit;
  if (!label || label.length < 2) return null;
  return label.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Canonical lab name: alias-mapped, licence-scrubbed, URL-inferred. */
export function normaliseOrg(raw, url) {
  const s = String(raw ?? '').trim();
  if (s && !LICENSE_WORDS.test(s)) return canonicalOrg(s);
  return orgFromUrl(url) ?? 'Unknown';
}

/** Context length → compact label. Accepts a number or a "128K"/"1M" string. */
export function fmtContext(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || v <= 0) return null;
    if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`;
    if (v >= 1_000)     return `${Math.round(v / 1_000)}K`;
    return String(v);
  }
  const str = String(v).trim().toUpperCase();
  if (!str || str === 'N/A' || str === '—') return null;
  if (str.includes('M')) return `${parseFloat(str)}M`;
  if (str.includes('K')) return `${Math.round(parseFloat(str))}K`;
  return fmtContext(parseInt(str, 10));
}

// ── Flight payload parsing ────────────────────────────────────────────────
/** Reconstruct the flight stream by unescaping every __next_f chunk. */
export function flightText(html) {
  let out = '';
  const re = /self\.__next_f\.push\(\[\d+\s*,\s*("(?:[^"\\]|\\.)*")/g;
  let m;
  while ((m = re.exec(html))) {
    try { out += JSON.parse(m[1]); } catch { /* partial chunk — skip */ }
  }
  return out;
}

/** Bracket-match a JSON array literal beginning at `start`. */
export function sliceArray(s, start) {
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (inStr) { if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return s.slice(start, i + 1); }
  }
  return null;
}

/** Every well-formed "entries":[…] array of rated rows, largest first. */
export function extractEntryArrays(html) {
  const text = flightText(html);
  if (!text) return [];
  const candidates = [];
  const NEEDLE = '"entries":';
  let idx = 0;
  while ((idx = text.indexOf(NEEDLE, idx)) !== -1) {
    const raw = sliceArray(text, idx + NEEDLE.length);
    idx += NEEDLE.length;
    if (!raw) continue;
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 5 && arr[0] && typeof arr[0].rating === 'number') candidates.push(arr);
    } catch { /* not the array we want */ }
  }
  return candidates.sort((a, b) => b.length - a.length);
}

/** Wire shape the frontend consumes for the text board (unchanged contract). */
export function toModel(r, i) {
  const name = r.modelDisplayName ?? r.name ?? r.slug ?? r.modelKey ?? '';
  const ci = (typeof r.ratingUpper === 'number' && typeof r.ratingLower === 'number')
    ? Math.max(0, Math.round((r.ratingUpper - r.ratingLower) / 2))
    : (r.ci ?? null);
  return {
    rank:     r.rank ?? i + 1,
    slug:     String(name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9.-]/g, ''),
    name:     String(name),
    org:      normaliseOrg(r.modelOrganization ?? r.org ?? r.organization, r.modelUrl),
    license:  String(r.license ?? 'Proprietary').trim() || 'Proprietary',
    elo:      Math.round(r.rating ?? r.elo ?? r.score ?? 1200),
    ci,
    votes:    r.votes ?? r.battles ?? 0,
    priceIn:  r.inputPricePerMillion  ?? r.priceIn  ?? null,
    priceOut: r.outputPricePerMillion ?? r.priceOut ?? null,
    context:  fmtContext(r.contextLength ?? r.context ?? null),
    url:      r.modelUrl ?? null,
    isNew:    r.releaseType === 'co_release' || r.releaseType === 'pre_release',
  };
}

/** Richer shape for media boards: keeps the raw rating precision and per-unit prices. */
export function toMediaRow(r, i) {
  const base = toModel(r, i);
  return {
    ...base,
    rating: r.rating ?? null,
    rankUpper: r.rankUpper ?? null,
    rankLower: r.rankLower ?? null,
    // arena publishes 0 where it has no price for a hosted model (e.g. a
    // proprietary image model at $0/image). Zero is not a price — treat as unknown.
    pricePerImage:  typeof r.pricePerImage  === 'number' && r.pricePerImage  > 0 ? r.pricePerImage  : null,
    pricePerSecond: typeof r.pricePerSecond === 'number' && r.pricePerSecond > 0 ? r.pricePerSecond : null,
    modelKey: r.modelKey ?? null,
    releaseType: r.releaseType ?? null,
  };
}

// ── Validation ─────────────────────────────────────────────────────────────
export function validateBoard(models, { minRows = 50 } = {}) {
  if (!Array.isArray(models) || models.length < minRows) return 'too few models';
  const elos = models.map(m => m.elo);
  if (elos.some(e => !Number.isFinite(e) || e < 500 || e > 3000)) return 'ELO out of range';
  if (Math.max(...elos) - Math.min(...elos) < 50) return 'ELO spread too small';
  const named = models.filter(m => m.name && m.name.length > 1).length;
  if (named / models.length < 0.9) return 'missing model names';
  const leaked = models.filter(m => LICENSE_WORDS.test(m.org)).length;
  if (leaked > 0) return `${leaked} rows have a licence in the org field`;
  return null;
}

export async function fetchArenaHtml(boardPath) {
  return fetchText(`https://arena.ai/leaderboard/${boardPath}`, {
    ua: BROWSER_UA, timeoutMs: 25_000,
    headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
  });
}

/** Fetch + parse one board. Returns sorted rows re-ranked by rating. */
export async function fetchArenaBoard(boardId) {
  const board = ARENA_BOARDS[boardId];
  if (!board) throw new Error(`unknown arena board ${boardId}`);
  const html = await fetchArenaHtml(board.path);
  const arrays = extractEntryArrays(html);
  if (!arrays.length) throw new Error(`arena ${boardId}: no entries in flight payload`);
  const rows = arrays[0].map(board.kind === 'llm' ? toModel : toMediaRow);
  const problem = validateBoard(rows, { minRows: board.kind === 'llm' ? (boardId === 'text' ? 50 : 20) : 15 });
  if (problem) throw new Error(`arena ${boardId}: ${problem}`);
  rows.sort((a, b) => b.elo - a.elo);
  return rows.map((m, i) => ({ ...m, rank: i + 1 }));
}
