import { useEffect, useState, useCallback } from 'react';
import { load, peek, subscribe } from './api.js';

/**
 * useDomain('llms') → { data, status, loading, error, loadedAt, reload }
 *   status: 'loading' | 'live' | 'stale' | 'offline'
 * Data from the previous visit is returned synchronously, then refreshed.
 */
export function useDomain(domain, { enabled = true } = {}) {
  const [entry, setEntry] = useState(() => peek(domain));
  const [loading, setLoading] = useState(() => !peek(domain));

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const unsub = subscribe(domain, e => { if (alive) setEntry(e); });
    setLoading(!peek(domain));
    load(domain).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; unsub(); };
  }, [domain, enabled]);

  const reload = useCallback(async () => {
    setLoading(true);
    try { return await load(domain, { force: true }); }
    finally { setLoading(false); }
  }, [domain]);

  return {
    data: entry?.data ?? null,
    status: entry ? entry.status : 'loading',
    loading,
    error: entry?.error ?? null,
    loadedAt: entry?.loadedAt ?? null,
    reload,
  };
}

/** Convenience: the merged LLM list (or []) plus the envelope. */
export function useLLMs() {
  const d = useDomain('llms');
  return { ...d, models: d.data?.models ?? [], sources: d.data?.sources ?? {}, capabilities: d.data?.capabilities ?? {} };
}
export function useMedia() {
  const d = useDomain('media');
  return { ...d, boards: d.data?.boards ?? {}, sources: d.data?.sources ?? {}, capabilities: d.data?.capabilities ?? {} };
}
export function useCoding() {
  const d = useDomain('coding');
  return { ...d, boards: d.data?.boards ?? {}, indexes: d.data?.indexes ?? [], sources: d.data?.sources ?? {} };
}
export function useSpeech() {
  const d = useDomain('speech');
  return { ...d, stt: d.data?.stt ?? [], sttAA: d.data?.sttAA ?? [], tts: d.data?.tts ?? [], s2s: d.data?.s2s ?? [], sources: d.data?.sources ?? {}, capabilities: d.data?.capabilities ?? {} };
}
export function useProviders() {
  const d = useDomain('providers');
  return { ...d, models: d.data?.models ?? [], modelMeta: d.data?.modelMeta ?? {}, providers: d.data?.providers ?? [], sources: d.data?.sources ?? {}, capabilities: d.data?.capabilities ?? {} };
}
export function useHistory() {
  const d = useDomain('history');
  return { ...d, snapshots: d.data?.snapshots ?? [], days: d.data?.days ?? 0 };
}
