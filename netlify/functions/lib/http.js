// Shared fetch helpers for the Netlify functions.

export const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const APP_UA     = 'AIWarRoom/2.0 (+https://aiwarroom.app; data aggregation with attribution)';

/** fetch() with a hard timeout. Throws on non-2xx. */
export async function fetchText(url, { timeoutMs = 20_000, headers = {}, ua = APP_UA } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': ua, ...headers }, signal: ctrl.signal });
    if (!res.ok) {
      const err = new Error(`${new URL(url).hostname} ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchJSON(url, opts = {}) {
  const text = await fetchText(url, { ...opts, headers: { Accept: 'application/json', ...(opts.headers ?? {}) } });
  return JSON.parse(text);
}

/** Run `fn` over items with bounded concurrency; failures resolve to null. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await fn(items[idx], idx); }
      catch { out[idx] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
