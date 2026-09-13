// ─── Domain loaders ─────────────────────────────────────────────────────────
// One loader per API domain. Each upstream source is cached on its own so a
// single outage degrades one column, not the page, and a cold lambda can
// fill the caches over a few requests instead of one long one.

import { cached, HOURS, readBlob, writeBlob, listBlobs, deleteBlob, hasDurableStore } from './cache.js';
import { fetchArenaBoard, ARENA_BOARDS } from './arena.js';
import { fetchORModels, fetchOREndpoints } from '../adapters/openrouter.js';
import { aaConfigured, fetchAALLMs, fetchAAMedia, fetchAASpeech } from '../adapters/artificialanalysis.js';
import { aaWebEnabled, fetchAAWebLLMs, fetchAAWebMedia, fetchAAWebSpeech } from '../adapters/aaweb.js';
import { fetchSWEBench } from '../adapters/swebench.js';
import { fetchOpenASR } from '../adapters/openasr.js';
import { fetchGenAIBench } from '../adapters/genaibench.js';
import { mergeLLMs, mergeMedia, summariseProviders } from './merge.js';
import { dateKey, snapshotLLMs, snapshotMedia, snapshotsEqual, diffRows, snapshotAtLeast, pruneKeys } from '../../../shared/history.js';
import { isNum } from '../../../shared/metrics.js';

const VERSION = 'v1';
const key = (name) => `warroom:${VERSION}:${name}`;

function status(entry) {
  if (!entry || entry.cache === 'NONE') return { status: 'unavailable', fetchedAt: null, error: entry?.error ?? 'no data' };
  return { status: entry.stale ? 'stale' : 'live', fetchedAt: entry.fetchedAt, error: entry.error ?? null };
}

// ── Source-level caches ────────────────────────────────────────────────────
const arenaBoard = (board, ttl = HOURS(6)) =>
  cached(key(`arena:${board}`), ttl, () => fetchArenaBoard(board), { minValid: d => Array.isArray(d) && d.length > 10 });

const orModels = () =>
  cached(key('openrouter:models'), HOURS(3), fetchORModels, { minValid: d => Array.isArray(d) && d.length > 50 });

// Artificial Analysis: the official Data API when a key is configured, else
// the published leaderboard pages (adapters/aaweb.js), else nothing.
const AA_OFF = { data: null, cache: 'NONE', stale: true, error: 'Artificial Analysis source disabled (no ARTIFICIAL_ANALYSIS_API_KEY and AA_WEB=0)' };
export const aaAvailable = () => aaConfigured() || aaWebEnabled();
const isList = min => d => Array.isArray(d) && d.length > min;

// LLMs: the Data API when a key is configured. If the API fails — quota spent,
// outage, key revoked — the published pages answer instead, and only if those
// fail too does the cache serve the last good copy (never an empty board, never
// a paid call). The pages' `deprecated` flags are copied onto API rows, which
// lack them, so retired models join the arena board but are not listed alone.
async function loadAALLMs() {
  if (!aaConfigured()) {
    if (aaWebEnabled()) return fetchAAWebLLMs();
    throw new Error('Artificial Analysis source disabled');
  }
  let rows = null;
  try { rows = await fetchAALLMs(); }
  catch (err) {
    if (!aaWebEnabled()) throw err;
    console.warn('[aa] Data API failed, reading the published pages instead:', err.message);
    return fetchAAWebLLMs();
  }
  if (!rows) return aaWebEnabled() ? fetchAAWebLLMs() : null;
  if (aaWebEnabled()) {
    // The pages measure more models than the API exposes (the API reports 0
    // for many), so every field the API leaves empty is filled from the page
    // row of the same slug; the API value wins wherever both exist.
    try {
      const web = await fetchAAWebLLMs();
      const bySlug = new Map(web.map(r => [r.slug, r]));
      const FILL = ['speed', 'ttft', 'ttfat', 'e2e', 'context', 'priceIn', 'priceOut', 'priceBlended', 'priceCacheRead', 'priceCacheWrite', 'releaseDate', 'isOpen'];
      for (const r of rows) {
        const w = bySlug.get(r.slug);
        if (!w) continue;
        if (w.deprecated) r.deprecated = true;
        for (const k of FILL) if (r[k] == null && w[k] != null) r[k] = w[k];
        if (w.benchmarks) { r.benchmarks = r.benchmarks ?? {}; for (const [k, v] of Object.entries(w.benchmarks)) if (r.benchmarks[k] == null && v != null) r.benchmarks[k] = v; }
        if (r.intelligence == null && w.intelligence != null) r.intelligence = w.intelligence;
      }
    } catch { /* the pages are optional here; the API rows stand on their own */ }
  }
  return rows;
}
const aaLLMs = () => (aaConfigured() || aaWebEnabled())
  ? cached(key('aa:llms:v3'), HOURS(3), loadAALLMs, { minValid: isList(10) })
  : Promise.resolve(AA_OFF);

// Media, voices and transcription: the Data API returns only ELO / rank / CI
// for these (no prices, no generation times) and has no speech-to-text
// endpoint at all, so the published pages stay the source even with a key.
const aaMedia = (board) => aaWebEnabled()
  ? cached(key(`aa-web:media:${board}`), HOURS(6), () => fetchAAWebMedia(board), { minValid: isList(3) })
  : aaConfigured() ? cached(key(`aa:media:${board}`), HOURS(6), () => fetchAAMedia(board), { minValid: isList(3) }) : Promise.resolve(AA_OFF);

const aaSpeech = (kind) => aaWebEnabled()
  ? cached(key(`aa-web:speech:${kind}`), HOURS(6), () => fetchAAWebSpeech(kind), { minValid: isList(3) })
  : aaConfigured() ? cached(key(`aa:speech:${kind}`), HOURS(6), () => fetchAASpeech(kind), { minValid: isList(3) }) : Promise.resolve(AA_OFF);

const swe = () => cached(key('swebench'), HOURS(12), fetchSWEBench, { minValid: d => d && Array.isArray(d.Verified) && d.Verified.length > 10 });
const asr = () => cached(key('openasr'), HOURS(24), fetchOpenASR, { minValid: d => Array.isArray(d) && d.length > 5 });
const genai = () => cached(key('genaibench'), HOURS(24), () => fetchGenAIBench(), { minValid: d => d && d.boards && Object.keys(d.boards).length > 0 });

// ── LLMs ───────────────────────────────────────────────────────────────────
export async function loadLLMs() {
  const [text, vision, search, or, aa] = await Promise.all([
    arenaBoard('text'), arenaBoard('vision'), arenaBoard('search'), orModels(), aaLLMs(),
  ]);
  if (!text.data) {
    return { ok: false, error: 'arena text board unavailable', sources: { arena: status(text), openrouter: status(or), aa: status(aa) } };
  }
  const models = mergeLLMs({ arena: text.data, vision: vision.data, search: search.data, or: or.data, aa: aa.data });
  const history = await attachHistory(models);
  return {
    ok: true,
    fetchedAt: text.fetchedAt,
    stale: text.stale,
    sources: {
      arena: status(text), arenaVision: status(vision), arenaSearch: status(search),
      openrouter: status(or), aa: status(aa),
    },
    capabilities: { aa: aaAvailable(), aaVia: aaConfigured() ? 'api' : aaWebEnabled() ? 'web' : null, history: history.available },
    counts: { models: models.length, inArena: models.filter(m => m.inArena).length, priced: models.filter(m => isNum(m.priceIn)).length, withIntelligence: models.filter(m => isNum(m.aa?.intelligence)).length },
    models,
  };
}

// ── Media ──────────────────────────────────────────────────────────────────
const MEDIA_BOARDS = ['text-to-image', 'image-edit', 'text-to-video', 'image-to-video'];

export async function loadMedia() {
  const arenaEntries = await Promise.all(MEDIA_BOARDS.map(b => arenaBoard(b)));
  const aaEntries = await Promise.all(MEDIA_BOARDS.map(b => aaMedia(b)));
  const boards = {};
  const sources = {};
  MEDIA_BOARDS.forEach((b, i) => {
    boards[b] = mergeMedia(b, arenaEntries[i].data ?? [], aaEntries[i].data ?? []);
    sources[`arena:${b}`] = status(arenaEntries[i]);
    sources[`aa:${b}`] = status(aaEntries[i]);
  });
  const anyArena = arenaEntries.some(e => e.data);
  const fetchedAt = arenaEntries.map(e => e.fetchedAt).filter(Boolean).sort().pop() ?? null;
  return {
    ok: anyArena,
    fetchedAt, stale: arenaEntries.some(e => e.stale),
    sources, capabilities: { aa: aaAvailable() },
    boards,
  };
}

// ── Providers ──────────────────────────────────────────────────────────────
export async function loadProviders() {
  const [llms, or] = await Promise.all([loadLLMs(), orModels()]);
  if (!llms.ok || !or.data) return { ok: false, error: 'llms or openrouter unavailable', sources: { openrouter: status(or) } };
  // Top of the board with an OpenRouter listing — bounded so the cold path stays inside the function budget.
  const targets = llms.models.filter(m => m.or?.id).slice(0, 90);
  const ids = targets.map(m => m.or.id);
  const idToModel = Object.fromEntries(targets.map(m => [m.or.id, m.id]));
  const eps = await cached(key('openrouter:endpoints'), HOURS(6), async () => {
    const byOr = await fetchOREndpoints(ids, { limit: 8, modelIdFor: id => idToModel[id] });
    const byModel = {};
    for (const [orId, list] of Object.entries(byOr)) byModel[idToModel[orId]] = list;
    return byModel;
  }, { minValid: d => d && Object.keys(d).length > 5 });
  const summaries = summariseProviders(eps.data ?? {});
  const providerSet = new Map();
  for (const s of summaries) for (const e of s.endpoints) {
    const p = providerSet.get(e.provider) ?? { provider: e.provider, endpoints: 0, models: new Set(), uptime: [] };
    p.endpoints++; p.models.add(s.modelId); if (isNum(e.uptime30m)) p.uptime.push(e.uptime30m);
    providerSet.set(e.provider, p);
  }
  const providers = [...providerSet.values()].map(p => ({
    provider: p.provider, endpoints: p.endpoints, models: p.models.size,
    avgUptime: p.uptime.length ? p.uptime.reduce((a, b) => a + b, 0) / p.uptime.length : null,
  })).sort((a, b) => b.models - a.models);
  const modelMeta = Object.fromEntries(targets.map(m => [m.id, { name: m.name, org: m.org, elo: m.arena?.elo ?? null, intelligence: m.aa?.intelligence ?? null, isOpen: m.isOpen, context: m.context }]));
  return {
    ok: true, fetchedAt: eps.fetchedAt, stale: eps.stale,
    sources: { openrouter: status(eps), aa: { status: aaAvailable() ? 'live' : 'unavailable', error: aaAvailable() ? null : 'Artificial Analysis source disabled' } },
    capabilities: { speed: false, latency: false, aa: aaAvailable() },
    models: summaries, modelMeta, providers,
  };
}

// ── Coding ─────────────────────────────────────────────────────────────────
export async function loadCoding() {
  const [s, llms] = await Promise.all([swe(), loadLLMs()]);
  const boards = s.data ?? {};
  // Attach the canonical LLM record id where the SWE model matches an arena/OR model.
  const byId = new Map((llms.models ?? []).map(m => [m.id, m]));
  const byFamily = new Map();
  for (const m of llms.models ?? []) { if (!byFamily.has(`${m.org}|${m.family}`)) byFamily.set(`${m.org}|${m.family}`, m); }
  for (const rows of Object.values(boards)) for (const r of rows) {
    const hit = r.modelId && (byId.get(r.modelId) ?? byFamily.get(`${r.modelOrg}|${r.modelId.split(':')[1]}`));
    r.linkedModelId = hit?.id ?? null;
    r.linkedElo = hit?.arena?.elo ?? null;
    r.linkedCodingIndex = hit?.aa?.codingIndex ?? null;
  }
  const indexes = (llms.models ?? []).filter(m => isNum(m.aa?.codingIndex)).map(m => ({
    id: m.id, name: m.name, org: m.org, codingIndex: m.aa.codingIndex, agenticIndex: m.aa.agenticIndex, intelligence: m.aa.intelligence,
    priceBlended: m.priceBlended, elo: m.arena?.elo ?? null, isOpen: m.isOpen, via: m.aa.via,
  })).sort((a, b) => b.codingIndex - a.codingIndex);
  return {
    ok: !!s.data || indexes.length > 0,
    fetchedAt: s.fetchedAt, stale: s.stale,
    sources: { swebench: status(s), aa: llms.sources?.aa ?? { status: 'unavailable' }, openrouter: llms.sources?.openrouter },
    boards, indexes,
  };
}

// ── Speech ─────────────────────────────────────────────────────────────────
export async function loadSpeech() {
  const [stt, tts, sttAA, s2s] = await Promise.all([asr(), aaMedia('text-to-speech'), aaSpeech('stt'), aaSpeech('s2s')]);
  return {
    ok: !!stt.data || !!tts.data,
    fetchedAt: stt.fetchedAt ?? tts.fetchedAt, stale: stt.stale,
    sources: { openasr: status(stt), aaTTS: status(tts), aaSTT: status(sttAA), aaS2S: status(s2s) },
    capabilities: { aa: aaAvailable() },
    stt: stt.data ?? [], sttAA: sttAA.data ?? [], tts: tts.data ?? [], s2s: s2s.data ?? [],
  };
}

// ── Replays (open human-preference battles with media) ─────────────────────
export async function loadReplays() {
  const g = await genai();
  return {
    ok: !!g.data, fetchedAt: g.fetchedAt, stale: g.stale,
    sources: { genaibench: status(g) },
    license: g.data?.license ?? null, attribution: g.data?.attribution ?? null,
    boards: g.data?.boards ?? {},
    counts: Object.fromEntries(Object.entries(g.data?.boards ?? {}).map(([b, a]) => [b, a.length])),
  };
}

// ── History ────────────────────────────────────────────────────────────────
const HIST_PREFIX = key('history:');

// Listing + reading every daily blob on each request would dominate the
// function's runtime; the list is memoised per lambda instance for 15 min.
let snapMemo = { at: 0, snaps: null };
async function listSnapshots({ force = false } = {}) {
  if (!force && snapMemo.snaps && Date.now() - snapMemo.at < 15 * 60 * 1000) return snapMemo.snaps;
  const keys = await listBlobs(HIST_PREFIX);
  const snaps = [];
  for (const k of keys) { const s = await readBlob(k); if (s?.date) snaps.push(s); }
  snaps.sort((a, b) => (a.date < b.date ? -1 : 1));
  snapMemo = { at: Date.now(), snaps };
  return snaps;
}

/** Write today's snapshot if it differs from the last one. Returns the list. */
export async function ensureSnapshot({ models, boards }) {
  const snaps = await listSnapshots();
  const today = dateKey();
  const latest = snaps[snaps.length - 1];
  const next = { date: today, takenAt: new Date().toISOString(), llms: snapshotLLMs(models ?? []), media: snapshotMedia(boards ?? {}) };
  if (latest?.date === today) {
    if (!snapshotsEqual(latest, next)) { await writeBlob(`${HIST_PREFIX}${today}`, next); snaps[snaps.length - 1] = next; }
    return snaps;
  }
  if (latest && snapshotsEqual(latest, next)) return snaps; // identical to yesterday — don't store a duplicate
  await writeBlob(`${HIST_PREFIX}${today}`, next);
  snaps.push(next);
  // Retention
  for (const d of pruneKeys(snaps.map(s => s.date))) await deleteBlob(`${HIST_PREFIX}${d}`);
  return snaps;
}

async function attachHistory(models) {
  let snaps = [];
  try { snaps = await ensureSnapshot({ models }); } catch (e) { console.warn('history:', e.message); }
  const cur = snapshotLLMs(models);
  const d1 = snapshotAtLeast(snaps, 1), d7 = snapshotAtLeast(snaps, 7), d30 = snapshotAtLeast(snaps, 30);
  const m1 = d1 ? diffRows(cur, d1.llms) : null, m7 = d7 ? diffRows(cur, d7.llms) : null, m30 = d30 ? diffRows(cur, d30.llms) : null;
  for (const m of models) {
    const a = m1?.get(m.id), b = m7?.get(m.id), c = m30?.get(m.id);
    m.history = (a || b || c) ? {
      rankDelta1d: a?.rankDelta ?? null, eloDelta1d: a?.eloDelta ?? null,
      rankDelta7d: b?.rankDelta ?? null, eloDelta7d: b?.eloDelta ?? null, prevRank7d: b?.prevRank ?? null,
      rankDelta30d: c?.rankDelta ?? null, eloDelta30d: c?.eloDelta ?? null, priceDelta30d: c?.priceDelta ?? null,
      isNew7d: b ? !!b.isNew : null,
    } : null;
  }
  return { available: snaps.length > 1, days: snaps.length, oldest: snaps[0]?.date ?? null };
}

export async function loadHistory() {
  const snaps = await listSnapshots({ force: true });
  return {
    ok: true, fetchedAt: snaps[snaps.length - 1]?.takenAt ?? null, stale: false,
    durable: hasDurableStore(),
    days: snaps.length, oldest: snaps[0]?.date ?? null, newest: snaps[snaps.length - 1]?.date ?? null,
    snapshots: snaps,
  };
}

// ── Status ─────────────────────────────────────────────────────────────────
export async function loadStatus() {
  const entries = await Promise.all([
    readBlob(key('arena:text')), readBlob(key('openrouter:models')), readBlob(key('swebench')), readBlob(key('openasr')), readBlob(key('aa:llms:v3')),
  ]);
  const [a, o, s, r, aa] = entries;
  const st = e => e?.fetchedAt ? { status: 'cached', fetchedAt: e.fetchedAt } : { status: 'cold', fetchedAt: null };
  return {
    ok: true, fetchedAt: new Date().toISOString(),
    sources: { arena: st(a), openrouter: st(o), swebench: st(s), openasr: st(r), aa: aaAvailable() ? st(aa) : { status: 'unavailable', fetchedAt: null, error: 'Artificial Analysis source disabled' } },
    capabilities: {
      aa: aaAvailable(),
      history: hasDurableStore(),
      liveBattle: false, // no generation API keys are read server-side; the UI never incurs paid calls
      boards: Object.keys(ARENA_BOARDS),
    },
  };
}

export const DOMAINS = {
  llms: loadLLMs, media: loadMedia, providers: loadProviders, coding: loadCoding, speech: loadSpeech, history: loadHistory, status: loadStatus, replays: loadReplays,
};
