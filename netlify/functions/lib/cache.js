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

export async function readBlob(key) {
  if (memory.has(key)) return memory.get(key);
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
 * @param {object}   [opts]   { force: boolean, minValid: (data) => boolean }
 */
export async function cached(key, ttlMs, loader, { force = false, minValid = d => d != null } = {}) {
  const prior = await readBlob(key);
  const age = prior?.fetchedAt ? Date.now() - new Date(prior.fetchedAt).getTime() : Infinity;
  if (!force && prior && age < ttlMs && minValid(prior.data)) {
    return { ...prior, stale: false, cacheAge: age, cache: 'HIT' };
  }
  try {
    const data = await loader();
    if (!minValid(data)) throw new Error('loader returned invalid data');
    const entry = { data, fetchedAt: new Date().toISOString() };
    await writeBlob(key, entry);
    return { ...entry, stale: false, cacheAge: 0, cache: 'MISS' };
  } catch (err) {
    console.error(`[cache] ${key} refresh failed:`, err.message);
    if (prior && minValid(prior.data)) {
      return { ...prior, stale: true, cacheAge: age, cache: 'STALE', error: err.message.slice(0, 200) };
    }
    return { data: null, fetchedAt: null, stale: true, cacheAge: null, cache: 'NONE', error: err.message.slice(0, 200) };
  }
}

export const HOURS = h => h * 60 * 60 * 1000;
