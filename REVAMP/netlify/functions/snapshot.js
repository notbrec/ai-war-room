// Netlify Scheduled Function — daily history snapshot
//
// Runs every 6 hours, refreshes the LLM + media datasets (which fills the
// caches for visitors too) and stores a compact snapshot for the day if the
// numbers moved. Identical snapshots are not stored; retention thins old
// days to weekly, then monthly (see shared/history.js).

import { loadLLMs, loadMedia, ensureSnapshot } from './lib/domains.js';

export default async () => {
  const t0 = Date.now();
  const [llms, media] = await Promise.all([loadLLMs(), loadMedia()]);
  if (!llms.ok) {
    console.warn('[snapshot] llms unavailable — skipped');
    return new Response(JSON.stringify({ ok: false, reason: 'llms unavailable' }), { status: 503 });
  }
  const snaps = await ensureSnapshot({ models: llms.models, boards: media.boards ?? {} });
  console.log(`[snapshot] ${snaps.length} days stored (${Date.now() - t0}ms)`);
  return new Response(JSON.stringify({ ok: true, days: snaps.length, ms: Date.now() - t0 }), { status: 200 });
};

export const config = { schedule: '0 */6 * * *' };
