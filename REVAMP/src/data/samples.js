// ─── Sample media: replays (open archive) + our own generated samples ───────
// replays.json  — GenAI-Bench battles (CC-BY-4.0), fetched at deploy time.
// samples/manifest.json — media AI WAR ROOM generated itself for board
// models (populated by scripts/gen-samples when a generation provider is
// funded). Both are static files; nothing here scrapes anyone's media.

import { useEffect, useState } from 'react';

const cache = new Map();
async function loadStatic(url, fallback) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return await res.json();
    } catch (e) {
      if (fallback) { try { const r = await fetch(fallback); if (r.ok) return await r.json(); } catch {} }
      return null;
    }
  })();
  cache.set(url, p);
  return p;
}

export function useReplays() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let alive = true; loadStatic('/replays.json', '/api/warroom/replays').then(d => { if (alive) { setData(d); setLoading(false); } }); return () => { alive = false; }; }, []);
  return { data, boards: data?.boards ?? {}, loading, license: data?.license ?? 'CC-BY-4.0', attribution: data?.attribution ?? null, fetchedAt: data?.fetchedAt ?? null };
}

/** Manifest of self-generated samples: items [{ modelId, board, kind, prompt, url, poster?, durationSec?, provider, generatedAt }]. */
export function useSamples() {
  const [data, setData] = useState(null);
  useEffect(() => { let alive = true; loadStatic('/samples/manifest.json').then(d => { if (alive) setData(d); }); return () => { alive = false; }; }, []);
  const items = data?.items ?? [];
  const byModel = new Map();
  for (const it of items) { const k = it.modelId; if (!byModel.has(k)) byModel.set(k, []); byModel.get(k).push(it); }
  return { items, byModel, license: data?.license ?? null, note: data?.note ?? null };
}

/** Attach sampleUrl / samplePrompt to media rows (first sample for the row's board wins). */
export function attachSamples(rows, byModel, board) {
  if (!byModel?.size) return rows;
  return rows.map(r => {
    const list = byModel.get(r.id) ?? byModel.get(r.slug);
    if (!list) return r;
    const s = list.find(x => !board || x.board === board) ?? list[0];
    return { ...r, sampleUrl: s.url, samplePoster: s.poster ?? null, samplePrompt: s.prompt, sampleProvider: s.provider ?? null };
  });
}
