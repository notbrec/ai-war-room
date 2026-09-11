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

import { DOMAINS } from './lib/domains.js';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800',
};

export default async (req, context) => {
  const domain = context?.params?.domain ?? new URL(req.url).pathname.split('/').pop();
  const loader = DOMAINS[domain];
  if (!loader) {
    return new Response(JSON.stringify({ error: `unknown domain "${domain}"`, domains: Object.keys(DOMAINS) }), { status: 404, headers: HEADERS });
  }
  try {
    const t0 = Date.now();
    const data = await loader();
    const body = JSON.stringify({ domain, generatedAt: new Date().toISOString(), ...data });
    return new Response(body, {
      status: data?.ok === false ? 503 : 200,
      headers: { ...HEADERS, 'X-Domain': domain, 'X-Build-Ms': String(Date.now() - t0), 'X-Stale': data?.stale ? '1' : '0' },
    });
  } catch (err) {
    console.error(`[warroom:${domain}]`, err);
    return new Response(JSON.stringify({ domain, ok: false, error: err.message }), { status: 500, headers: HEADERS });
  }
};

export const config = { path: '/api/warroom/:domain' };
