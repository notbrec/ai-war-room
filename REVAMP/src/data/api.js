// ─── Client data layer ──────────────────────────────────────────────────────
// One fetcher for /api/warroom/:domain with a sessionStorage cache so page
// changes are instant, and a shared in-flight map so several components
// mounting at once produce one request. Nothing here knows about React.

const PREFIX = 'aiwar-warroom-v1:';
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

function readSession(domain) {
  try {
    const raw = sessionStorage.getItem(PREFIX + domain);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ? parsed : null;
  } catch { return null; }
}
function writeSession(domain, entry) {
  try { sessionStorage.setItem(PREFIX + domain, JSON.stringify(entry)); }
  catch { /* quota — fine, memory still has it */ }
}

/** Current cached entry (memory → session), or null. */
export function peek(domain) {
  if (memory.has(domain)) return memory.get(domain);
  const s = readSession(domain);
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
  if (!force && prior && Date.now() - prior.loadedAt < ttl) return prior;
  if (inflight.has(domain)) return inflight.get(domain);

  const p = (async () => {
    try {
      const res = await fetch(`/api/warroom/${domain}`, { headers: { Accept: 'application/json' } });
      const json = await res.json();
      if (!res.ok && !json?.models && !json?.boards) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const entry = { data: json, loadedAt: Date.now(), status: json.stale ? 'stale' : 'live', error: null };
      memory.set(domain, entry);
      writeSession(domain, entry);
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
