// Netlify Function — /api/warroom/:domain
//
// The normalised, cross-source dataset behind the command center:
//   llms       arena ELO + OpenRouter pricing/context + AA indexes/speed
//   media      text-to-image, image-edit, text-to-video, image-to-video
//   providers  per-provider endpoints for the top models
//   coding     SWE-bench (agent × model) + coding indexes
//   speech     Open ASR (STT) + AA TTS/S2S when configured
//   history    daily snapshots
//   status     source freshness + capabilities
//
// Every domain caches each upstream separately and serves stale-but-valid
// data when a source fails. A failing source shows as `unavailable` in
// `sources`, never as zeros.
//
// Speed: a good response is kept in Netlify's durable CDN cache (shared by
// every edge node) and served stale while the CDN revalidates in the
// background, so visitors get it in tens of milliseconds and never wait for
// this function to merge the sources. Inside the function, a source past its
// TTL is served immediately and refreshed after the response (waitUntil).

import { DOMAINS } from './lib/domains.js';
import { setBackgroundRunner } from './lib/cache.js';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800',
};
export const CDN_CACHE = 'public, durable, s-maxage=300, stale-while-revalidate=604800';
/* a response missing a part it normally has (e.g. history) is served, but replaced within a minute */
export const CDN_CACHE_SHORT = 'public, durable, s-maxage=60, stale-while-revalidate=60';

export default async (req, context) => {
  const domain = context?.params?.domain ?? new URL(req.url).pathname.split('/').pop();
  const loader = DOMAINS[domain];
  if (!loader) {
    return new Response(JSON.stringify({ error: `unknown domain "${domain}"`, domains: Object.keys(DOMAINS) }), { status: 404, headers: { ...HEADERS, 'Netlify-CDN-Cache-Control': 'no-store' } });
  }
  setBackgroundRunner(typeof context?.waitUntil === 'function' ? p => context.waitUntil(p) : null);
  try {
    const t0 = Date.now();
    const data = await loader();
    const body = JSON.stringify({ domain, generatedAt: new Date().toISOString(), ...data });
    const ok = data?.ok !== false;
    return new Response(body, {
      status: ok ? 200 : 503,
      headers: {
        ...HEADERS,
        // never pin an outage at the edge
        'Netlify-CDN-Cache-Control': !ok ? 'no-store' : data?.degraded ? CDN_CACHE_SHORT : CDN_CACHE,
        'X-Domain': domain, 'X-Build-Ms': String(Date.now() - t0), 'X-Stale': data?.stale ? '1' : '0',
      },
    });
  } catch (err) {
    console.error(`[warroom:${domain}]`, err);
    return new Response(JSON.stringify({ domain, ok: false, error: err.message }), { status: 500, headers: { ...HEADERS, 'Netlify-CDN-Cache-Control': 'no-store' } });
  } finally {
    setBackgroundRunner(null);
  }
};

export const config = { path: '/api/warroom/:domain' };
