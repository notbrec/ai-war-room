// ─── Two-tier cache: Netlify Blobs (durable) + module memory (warm lambda / dev)
//
//   cached('llms', 6h, loader) → { data, fetchedAt, stale, error }
//
// Fresh blob within TTL → served. Otherwise the loader runs; if it throws,
// the last good copy is served with stale:true so one upstream outage never
// takes a page down. Locally (no Blobs) the memory tier does the same job.

import { getStore } from '@netlify/blobs';

const memory = new Map();
let store = null;
let storeTried = false;

function blobs() {
  if (storeTried) return store;
  storeTried = true;
  try { store = getStore('aiwar-cache'); } catch { store = null; }
  return store;
}

export async function readBlob(key, { fresh = false } = {}) {
  if (!fresh && memory.has(key)) return memory.get(key);
  const s = blobs();
  if (!s) return null;
  try {
    const v = await s.get(key, { type: 'json' });
    if (v) memory.set(key, v);
    return v ?? null;
  } catch { return null; }
}

export async function writeBlob(key, value) {
  memory.set(key, value);
  const s = blobs();
  if (!s) return false;
  try { await s.setJSON(key, value); return true; }
  catch (e) { console.warn(`blob write failed (${key}):`, e.message); return false; }
}

export async function listBlobs(prefix) {
  const s = blobs();
  if (!s) return [...memory.keys()].filter(k => k.startsWith(prefix));
  try {
    const { blobs: items } = await s.list({ prefix });
    return items.map(b => b.key);
  } catch { return []; }
}

export async function deleteBlob(key) {
  memory.delete(key);
  const s = blobs();
  if (!s) return;
  try { await s.delete(key); } catch { /* ignore */ }
}

export function hasDurableStore() { return !!blobs(); }

/**
 * @param {string}   key      cache key
 * @param {number}   ttlMs    freshness window
 * @param {Function} loader   async () => data
 * @param {object}   [opts]   { force, minValid, retryAfterMs }
 *   retryAfterMs — after a failed refresh, serve the stale copy without calling
 *   the loader again until this much time has passed (caps calls to a
 *   metered upstream even while it is failing).
 */
export async function cached(key, ttlMs, loader, { force = false, minValid = d => d != null, retryAfterMs = 0 } = {}) {
  let prior = await readBlob(key);
  const ageOf = e => e?.fetchedAt ? Date.now() - new Date(e.fetchedAt).getTime() : Infinity;
  const isFresh = e => e && ageOf(e) < ttlMs && minValid(e.data);
  // The warm-lambda copy may be older than the durable one when another
  // instance already refreshed; re-read the store before spending a call.
  if (!force && prior && !isFresh(prior) && memory.has(key) && blobs()) {
    const durable = await readBlob(key, { fresh: true });
    if (durable) { prior = durable; memory.set(key, durable); }
  }
  const age = ageOf(prior);
  if (!force && isFresh(prior)) {
    return { ...prior, stale: false, cacheAge: age, cache: 'HIT' };
  }
  if (!force && retryAfterMs > 0 && prior?.failedAt && Date.now() - new Date(prior.failedAt).getTime() < retryAfterMs && minValid(prior.data)) {
    return { ...prior, stale: true, cacheAge: age, cache: 'STALE', error: prior.lastError ?? 'refresh failed recently' };
  }
  try {
    const data = await loader();
    if (!minValid(data)) throw new Error('loader returned invalid data');
    const entry = { data, fetchedAt: new Date().toISOString() }; // a success clears failedAt
    await writeBlob(key, entry);
    return { ...entry, stale: false, cacheAge: 0, cache: 'MISS' };
  } catch (err) {
    console.error(`[cache] ${key} refresh failed:`, err.message);
    if (prior && minValid(prior.data)) {
      if (retryAfterMs > 0) await writeBlob(key, { ...prior, failedAt: new Date().toISOString(), lastError: err.message.slice(0, 200) });
      return { ...prior, stale: true, cacheAge: age, cache: 'STALE', error: err.message.slice(0, 200) };
    }
    return { data: null, fetchedAt: null, stale: true, cacheAge: null, cache: 'NONE', error: err.message.slice(0, 200) };
  }
}

export const HOURS = h => h * 60 * 60 * 1000;
