// ─── arena.ai adapter ───────────────────────────────────────────────────────
// Arena publishes every leaderboard as an official dataset on Hugging Face:
// lmarena-ai/leaderboard-dataset (CC BY 4.0), one subset per arena, updated
// with each leaderboard release. Since October 2026 the arena.ai pages sit
// behind a Cloudflare bot challenge (every server fetch gets a 403) and the
// site's JSON API was never public, so the dataset is the source.
//
// Each subset holds two parquet files: `latest` (the current board, every
// category) and `full` (every board ever published). Rows are sorted by
// category, then publish date, in row groups of ~1 000 rows, so row-group
// statistics locate the "overall" rows without reading the rest:
//   latest → the board itself
//   full   → only its last few "overall" row groups, to tell which models
//            joined the board in the past NEW_WINDOW_DAYS days.
//
// The dataset carries name, organisation, licence, rating, CI and votes. Prices
// and context come from OpenRouter / Artificial Analysis in merge.js, as before.

import { parquetMetadata, parquetMetadataAsync, parquetReadObjects } from 'hyparquet';
import { canonicalOrg, displayName, looseKey } from '../../../shared/ids.js';
import { APP_UA } from './http.js';

const DATASET = 'lmarena-ai/leaderboard-dataset';
export const ARENA_DATASET_URL = `https://huggingface.co/datasets/${DATASET}`;
const HUB = 'https://huggingface.co';

// `subset` is the dataset config. arena.ai's default text and vision boards are
// style-controlled; its default search board is not (checked against the
// numbers the pages showed before they were blocked: identical to ±0).
export const ARENA_BOARDS = {
  text:            { subset: 'text_style_control',   kind: 'llm',   label: 'Text',           minRows: 50 },
  vision:          { subset: 'vision_style_control', kind: 'llm',   label: 'Vision',         minRows: 20 },
  search:          { subset: 'search',               kind: 'llm',   label: 'Search',         minRows: 15 },
  webdev:          { subset: 'webdev',               kind: 'llm',   label: 'WebDev',         minRows: 20 },
  'text-to-image': { subset: 'text_to_image',        kind: 'image', label: 'Text to Image',  minRows: 15 },
  'image-edit':    { subset: 'image_edit',           kind: 'image', label: 'Image Editing',  minRows: 15 },
  'text-to-video': { subset: 'text_to_video',        kind: 'video', label: 'Text to Video',  minRows: 15 },
  'image-to-video':{ subset: 'image_to_video',       kind: 'video', label: 'Image to Video', minRows: 15 },
};

/** A model that first appeared on the board within this many days is "new". */
export const NEW_WINDOW_DAYS = 30;

// Anything that is *only* ever a licence must never end up in the org column.
// Deliberately excluded: bare "Nvidia", "DeepSeek", "Cohere", "NexusFlow" —
// arena publishes those as both a licence name and a real lab name.
export const LICENSE_WORDS = /^(proprietary|mit|modified mit|apache([\s-]?2\.0)?|open source|cc[\s-]?by[\w.\s-]*|non-?commercial|other|unknown license|llama[\s\d.-]*(community)?|gemma(\s?license)?|qwen|qianwen[\s\w]*|deepseek license|nvidia open([\s\w]*)?|jamba open|mrl|mistral research|dbrx[\s\w]*|yi license|openmdw[\s\w.-]*|tencent-hunyuan-community|minimax community license|ai2 impact.*|falcon.*)$/i;

// The dataset leaves `organization` empty for ~60 older or third-party models.
// Their lab follows from the name (what the arena pages used to show).
const NAME_ORGS = [
  [/^trinity\b/i, 'Arcee AI'], [/^intellect/i, 'Prime Intellect'], [/^yi\b/i, '01.AI'],
  [/^starling lm 7b beta/i, 'NexusFlow'], [/^athene\b/i, 'NexusFlow'], [/^(starling|koala)\b/i, 'Berkeley'],
  [/^jamba\b/i, 'AI21 Labs'], [/^reka\b/i, 'Reka'], [/simpo/i, 'Princeton NLP'],
  [/^(zephyr|smollm)/i, 'Hugging Face'], [/^(dbrx|mpt|dolly)\b/i, 'Databricks'], [/^intern(lm|vl)/i, 'InternLM'],
  [/^openchat\b/i, 'OpenChat'], [/^snowflake\b/i, 'Snowflake'], [/^tulu\b/i, 'Ai2'],
  [/^(openhermes|nous hermes)/i, 'Nous Research'], [/^stripedhyena/i, 'Together AI'], [/^(vicuna|fastchat)/i, 'LMSYS'],
  [/^dolphin\b/i, 'Cognitive Computations'], [/^falcon\b/i, 'TII'], [/^guanaco\b/i, 'Tim Dettmers'],
  [/^alpaca\b/i, 'Stanford'], [/^gpt4all\b/i, 'Nomic AI'], [/^chatglm/i, 'Z.ai'], [/^rwkv/i, 'BlinkDL'],
  [/^openassistant\b/i, 'OpenAssistant'], [/^(stablelm|stable diffusion)/i, 'Stability AI'], [/^llava\b/i, 'LLaVA'],
  [/^minicpm/i, 'OpenBMB'], [/^pixverse\b/i, 'PixVerse'], [/^ltx/i, 'Lightricks'], [/^kat-coder/i, 'Kwaipilot'],
  [/^p-(image|video)\b/i, 'Pruna AI'],
];

/** Lab display name from the dataset's organisation slug, else from the model name. */
export function normaliseOrg(raw, name) {
  const s = String(raw ?? '').trim();
  if (s && !LICENSE_WORDS.test(s)) return canonicalOrg(s);
  const hit = NAME_ORGS.find(([re]) => re.test(String(name ?? '')));
  return hit ? hit[1] : 'Unknown';
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

/** URL-safe slug that keeps version dots: "Claude Opus 4.6 (High)" → "claude-opus-4.6-high". */
export function slugify(name) {
  return String(name ?? '').toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Most names arrive display-ready; the few bare slugs ("gemini-omni-flash") are prettified. */
export function tidyName(raw) {
  const s = String(raw ?? '').trim();
  return /^[a-z][a-z0-9.]*(-[a-z0-9.]+)+$/.test(s) ? displayName(s) : s;
}

// ── Row → model ────────────────────────────────────────────────────────────
const n = v => (typeof v === 'bigint' ? Number(v) : (typeof v === 'number' && Number.isFinite(v) ? v : null));

/** Text-board wire shape (the /api/leaderboard contract). */
export function toModel(r, i = 0) {
  const name = tidyName(r.model_name ?? r.name ?? '');
  const rating = n(r.rating);
  const up = n(r.rating_upper), lo = n(r.rating_lower);
  const lic = String(r.license ?? '').trim();
  return {
    rank:     n(r.rank) ?? i + 1,
    slug:     slugify(name),
    name,
    org:      normaliseOrg(r.organization, name),
    license:  lic && lic !== '-' ? lic : 'Proprietary',
    elo:      rating != null ? Math.round(rating) : null,
    rating,
    ci:       up != null && lo != null ? Math.max(0, Math.round((up - lo) / 2)) : null,
    votes:    n(r.vote_count) ?? 0,
    priceIn:  null,
    priceOut: null,
    context:  null,
    url:      null,
    isNew:    false,
    firstSeen: null,
    published: r.leaderboard_publish_date ?? null,
  };
}

/** Media boards: the same row plus the per-unit price fields merge.js fills from AA. */
export function toMediaRow(r, i = 0) {
  return { ...toModel(r, i), pricePerImage: null, pricePerSecond: null };
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

// ── Parquet access ─────────────────────────────────────────────────────────
async function timedFetch(url, { headers = {}, timeoutMs = 20_000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': APP_UA, ...headers }, signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) { const e = new Error(`huggingface.co ${res.status}`); e.status = res.status; throw e; }
    return await res.arrayBuffer();
  } finally { clearTimeout(t); }
}

/** Parquet shards of one split, with sizes (one listing call, robust to resharding). */
export async function listShards(subset, split) {
  const raw = await timedFetch(`${HUB}/api/datasets/${DATASET}/tree/main/${subset}`, { timeoutMs: 15_000 });
  const entries = JSON.parse(new TextDecoder().decode(raw));
  return entries
    .filter(e => e.type === 'file' && e.path.startsWith(`${subset}/${split}-`) && e.path.endsWith('.parquet'))
    .sort((a, b) => (a.path < b.path ? -1 : 1))
    .map(e => ({ url: `${HUB}/datasets/${DATASET}/resolve/main/${e.path}`, size: e.size }));
}

/** hyparquet AsyncBuffer over HTTP range requests — reads only the bytes it needs. */
function rangeBuffer(url, byteLength) {
  return {
    byteLength,
    async slice(start, end = byteLength) {
      return timedFetch(url, { headers: { Range: `bytes=${start}-${end - 1}` }, timeoutMs: 20_000 });
    },
  };
}

const colIndex = (md, name) => md.row_groups[0]?.columns.findIndex(c => c.meta_data?.path_in_schema?.[0] === name) ?? -1;
function stat(rg, ci) {
  if (ci < 0) return {};
  const s = rg.columns[ci]?.meta_data?.statistics ?? {};
  return { min: s.min_value ?? s.min ?? null, max: s.max_value ?? s.max ?? null };
}

/** Row groups with their row offsets and whether they can hold "overall" rows. */
export function rowGroups(md) {
  const ci = colIndex(md, 'category'), di = colIndex(md, 'leaderboard_publish_date');
  let start = 0;
  return md.row_groups.map(rg => {
    const rows = Number(rg.num_rows);
    const c = stat(rg, ci), d = stat(rg, di);
    const overall = c.min == null || c.max == null || (String(c.min) <= 'overall' && String(c.max) >= 'overall');
    // Only a group holding nothing but "overall" rows has date stats that describe them.
    const pure = c.min != null && String(c.min) === 'overall' && String(c.max) === 'overall';
    const g = { start, end: start + rows, overall, pure, minDate: d.min != null ? String(d.min) : null, maxDate: d.max != null ? String(d.max) : null };
    start += rows;
    return g;
  });
}

const OVERALL = r => (r.category ?? 'overall') === 'overall';

/** The current "overall" board of one subset. */
async function readLatest(subset) {
  const shards = await listShards(subset, 'latest');
  if (!shards.length) throw new Error(`arena ${subset}: no latest file`);
  const out = [];
  for (const s of shards) {
    const buf = await timedFetch(s.url, { timeoutMs: 20_000 });
    const md = parquetMetadata(buf);
    const groups = rowGroups(md).filter(g => g.overall);
    if (!groups.length) continue;
    const rows = await parquetReadObjects({ file: buf, metadata: md, rowStart: groups[0].start, rowEnd: groups[groups.length - 1].end });
    out.push(...rows.filter(OVERALL));
  }
  return out;
}

/**
 * Models that joined the board recently: those absent from the last publish on
 * or before (latestDate − windowDays). Reads only the tail "overall" row groups
 * of the `full` file — two extra groups in front so that baseline publish is
 * complete. Returns { baseline, firstSeen: { model_name: 'YYYY-MM-DD' } } or null.
 */
export async function readNewcomers(subset, latestDate, { windowDays = NEW_WINDOW_DAYS } = {}) {
  if (!latestDate) return null;
  const cutoff = new Date(Date.parse(`${latestDate}T00:00:00Z`) - windowDays * 86_400_000).toISOString().slice(0, 10);
  const shards = await listShards(subset, 'full');
  const rows = [];
  for (const s of shards) {
    const file = rangeBuffer(s.url, s.size);
    const md = await parquetMetadataAsync(file);
    const groups = rowGroups(md).filter(g => g.overall);
    if (!groups.length) continue;
    // First pure-"overall" group that reaches the cutoff; a small board with no
    // pure group is read whole (it is only a few hundred rows).
    let first = groups.findIndex(g => g.pure && (g.maxDate == null || g.maxDate >= cutoff));
    first = first < 0 ? 0 : Math.max(0, first - 2);
    const part = await parquetReadObjects({
      file, metadata: md, rowStart: groups[first].start, rowEnd: groups[groups.length - 1].end,
      columns: ['model_name', 'category', 'leaderboard_publish_date', 'rating', 'vote_count'],
    });
    rows.push(...part.filter(OVERALL));
  }
  return newcomersFrom(rows, cutoff);
}

/**
 * Pure part of readNewcomers. Walks the publishes after the baseline in order.
 * Arena renamed every model in October 2026 (slugs → display names, sometimes
 * reworded: "mistral-medium-2508" → "Mistral Medium 3.1 (2508)"), so a name
 * that appears is first compared by a spelling-proof key, then — if a model
 * vanished in that same publish with the same rating and vote count — treated
 * as that model renamed rather than a newcomer.
 */
export function newcomersFrom(rows, cutoff) {
  const byDate = new Map();
  for (const r of rows) {
    const d = r.leaderboard_publish_date;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push({ name: r.model_name, key: looseKey(r.model_name), rating: n(r.rating), votes: n(r.vote_count) ?? 0 });
  }
  const dates = [...byDate.keys()].sort();
  const baseline = dates.filter(d => d <= cutoff).pop();
  if (!baseline) return null;               // board younger than the window

  const since = new Map();                  // key → first date (null = on the board at the baseline)
  for (const r of byDate.get(baseline)) since.set(r.key, null);
  let prev = byDate.get(baseline);
  for (const d of dates.filter(x => x > baseline)) {
    const cur = byDate.get(d);
    const curKeys = new Set(cur.map(r => r.key));
    const gone = prev.filter(p => !curKeys.has(p.key));
    for (const r of cur) {
      if (since.has(r.key)) continue;
      // closest vanished model with (almost) the same rating and vote count —
      // counts can drop slightly between publishes (arena de-duplicates votes)
      let best = null, bestScore = Infinity;
      for (const p of gone) {
        if (r.rating == null || p.rating == null) continue;
        const dr = Math.abs(r.rating - p.rating);
        if (dr > 5 || r.votes < p.votes * 0.97 - 50 || r.votes > p.votes * 1.25 + 200) continue;
        const score = dr + Math.abs(r.votes - p.votes) / 1000;
        if (score < bestScore) { best = p; bestScore = score; }
      }
      if (best) { since.set(r.key, since.get(best.key) ?? null); gone.splice(gone.indexOf(best), 1); }
      else since.set(r.key, d);
    }
    prev = cur;
  }
  const firstSeen = {};
  for (const r of byDate.get(dates[dates.length - 1])) { const d = since.get(r.key); if (d) firstSeen[r.name] = d; }
  return { baseline, firstSeen };
}

/** Fetch + normalise one board, sorted by rating. Newcomer detection is best-effort. */
export async function fetchArenaBoard(boardId) {
  const board = ARENA_BOARDS[boardId];
  if (!board) throw new Error(`unknown arena board ${boardId}`);
  const raw = await readLatest(board.subset);
  const rows = raw.map(board.kind === 'llm' ? toModel : toMediaRow).filter(m => m.elo != null && m.name);
  const problem = validateBoard(rows, { minRows: board.minRows });
  if (problem) throw new Error(`arena ${boardId}: ${problem}`);

  const latestDate = raw.map(r => r.leaderboard_publish_date).filter(Boolean).sort().pop() ?? null;
  let fresh = null;
  try { fresh = await readNewcomers(board.subset, latestDate); }
  catch (e) { console.warn(`[arena] ${boardId}: newcomer check skipped —`, e.message); }
  if (fresh) {
    const byName = new Map(raw.map(r => [tidyName(r.model_name), r.model_name]));
    for (const m of rows) {
      const d = fresh.firstSeen[byName.get(m.name) ?? m.name];
      if (d) { m.isNew = true; m.firstSeen = d; }
    }
  }

  rows.sort((a, b) => (b.rating ?? b.elo) - (a.rating ?? a.elo));
  return rows.map((m, i) => ({ ...m, rank: i + 1 }));
}
