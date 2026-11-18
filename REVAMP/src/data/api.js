// ─── Client data layer ──────────────────────────────────────────────────────
// One fetcher for /api/warroom/:domain with a cache that survives visits
// (localStorage), so a returning visitor sees the last data on the first
// frame and the refresh lands quietly underneath; a shared in-flight map so
// several components mounting at once produce one request. index.html starts
// the first requests before this bundle has even downloaded (window.__aiwarBoot);
// `take` hands those responses over. Nothing here knows about React.

const PREFIX = 'aiwar-warroom-v2:';
export const TS_PREFIX = 'aiwar-ts:'; // read by the boot script in index.html
const inflight = new Map();
const memory = new Map();
const listeners = new Map();

export const DOMAIN_TTL = {
  llms: 15 * 60 * 1000,
  media: 30 * 60 * 1000,
  providers: 30 * 60 * 1000,
  coding: 60 * 60 * 1000,
  speech: 60 * 60 * 1000,
  history: 60 * 60 * 1000,
  status: 5 * 60 * 1000,
};
// Older than this, a stored copy is not shown at all (a month-old champion
// swapping out on load is worse than a skeleton for 200 ms).
const MAX_SHOWN_AGE = 24 * 60 * 60 * 1000;
// history is several MB — memory only.
const NO_PERSIST = new Set(['history']);

/** The response index.html already requested for `key`, once. */
export function take(key) {
  try {
    const boot = window.__aiwarBoot;
    const p = boot?.[key];
    if (!p) return null;
    delete boot[key];
    return p;
  } catch { return null; }
}

function readStored(domain) {
  if (NO_PERSIST.has(domain)) return null;
  try {
    const raw = localStorage.getItem(PREFIX + domain);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !(Date.now() - parsed.loadedAt < MAX_SHOWN_AGE)) return null;
    return parsed;
  } catch { return null; }
}

const idle = cb => (typeof requestIdleCallback === 'function' ? requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 200));

function writeStored(domain, entry) {
  if (NO_PERSIST.has(domain)) return;
  // Stringifying ~1 MB is not free; keep it off the frame that renders the data.
  idle(() => {
    try {
      localStorage.setItem(PREFIX + domain, JSON.stringify(entry));
      localStorage.setItem(TS_PREFIX + domain, String(entry.loadedAt));
    } catch {
      // quota — memory still has it; drop the partial so the boot script refetches
      try { localStorage.removeItem(PREFIX + domain); localStorage.removeItem(TS_PREFIX + domain); } catch {}
    }
  });
}

/** Current cached entry (memory → stored), or null. */
export function peek(domain) {
  if (memory.has(domain)) return memory.get(domain);
  const s = readStored(domain);
  if (s) memory.set(domain, s);
  return s;
}

function emit(domain) {
  for (const fn of listeners.get(domain) ?? []) fn(memory.get(domain));
}
export function subscribe(domain, fn) {
  if (!listeners.has(domain)) listeners.set(domain, new Set());
  listeners.get(domain).add(fn);
  return () => listeners.get(domain)?.delete(fn);
}

/**
 * Load a domain. Resolves to { data, loadedAt, status } where status is
 * 'live' | 'stale' | 'offline'. `offline` means the request failed and the
 * data is whatever this browser last had (or null).
 */
export async function load(domain, { force = false } = {}) {
  const prior = peek(domain);
  const ttl = DOMAIN_TTL[domain] ?? 10 * 60 * 1000;
  const early = force ? null : take(domain);
  if (!early && !force && prior && Date.now() - prior.loadedAt < ttl) return prior;
  if (inflight.has(domain)) return inflight.get(domain);

  const p = (async () => {
    try {
      const res = await (early ?? fetch(`/api/warroom/${domain}`, { headers: { Accept: 'application/json' } }));
      const json = await res.json();
      if (!res.ok && !json?.models && !json?.boards) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const entry = { data: json, loadedAt: Date.now(), status: json.stale ? 'stale' : 'live', error: null };
      memory.set(domain, entry);
      writeStored(domain, entry);
      emit(domain);
      return entry;
    } catch (err) {
      const entry = { data: prior?.data ?? null, loadedAt: prior?.loadedAt ?? 0, status: 'offline', error: err.message };
      memory.set(domain, entry);
      emit(domain);
      return entry;
    } finally {
      inflight.delete(domain);
    }
  })();
  inflight.set(domain, p);
  return p;
}

/** Fire-and-forget warm-up used by the nav on hover. */
export function prefetch(domain) { load(domain).catch(() => {}); }

/** Warm every domain a page could open with, one at a time, when the browser is idle. */
export function prefetchAll(domains = ['llms', 'media', 'coding', 'speech', 'providers']) {
  let i = 0;
  const next = () => {
    if (i >= domains.length) return;
    const d = domains[i++];
    load(d).catch(() => {}).finally(() => idle(next));
  };
  idle(next);
}
