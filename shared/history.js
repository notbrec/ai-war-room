// ─── Historical snapshots ───────────────────────────────────────────────────
// A snapshot is { date: 'YYYY-MM-DD', takenAt, llms: [{ id, rank, elo, priceIn, priceOut, intelligence }], media: { board: [{ id, rank, elo }] } }.
// Kept deliberately compact — one row per model per day.

import { isNum } from './metrics.js';

export function dateKey(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}

/** Compact snapshot rows from full LLM records. */
export function snapshotLLMs(models) {
  return models
    .filter(m => isNum(m.arena?.elo) || isNum(m.aa?.intelligence))
    .map(m => ({
      id: m.id,
      rank: m.arena?.rank ?? null,
      elo: m.arena?.elo ?? null,
      priceIn: m.priceIn ?? null,
      priceOut: m.priceOut ?? null,
      intelligence: m.aa?.intelligence ?? null,
      speed: m.aa?.speed ?? null,
      ttft: m.aa?.ttft ?? null,
    }));
}

export function snapshotMedia(boards) {
  const out = {};
  for (const [board, rows] of Object.entries(boards ?? {})) {
    out[board] = (rows ?? []).map(r => ({ id: r.id, rank: r.rank ?? null, elo: r.elo ?? null, price: r.pricePerImage ?? r.pricePerSecond ?? null, genTime: r.genTime ?? null }));
  }
  return out;
}

/** Two snapshots are "the same" when every tracked number matches — avoids storing daily duplicates. */
export function snapshotsEqual(a, b) {
  if (!a || !b) return false;
  const key = s => JSON.stringify({ l: s.llms ?? [], m: s.media ?? {} });
  return key(a) === key(b);
}

/**
 * Compare `current` rows against an older snapshot's rows by id.
 * Returns Map id → { rankDelta, eloDelta, prevRank, prevElo, priceDelta }.
 * rankDelta is positive when the model moved UP (rank number decreased).
 */
export function diffRows(current, previous) {
  const prev = new Map((previous ?? []).map(r => [r.id, r]));
  const out = new Map();
  for (const r of current ?? []) {
    const p = prev.get(r.id);
    if (!p) { out.set(r.id, { isNew: true }); continue; }
    out.set(r.id, {
      isNew: false,
      prevRank: p.rank ?? null,
      prevElo: p.elo ?? null,
      rankDelta: isNum(r.rank) && isNum(p.rank) ? p.rank - r.rank : null,
      eloDelta:  isNum(r.elo)  && isNum(p.elo)  ? r.elo - p.elo   : null,
      priceDelta: isNum(r.priceIn) && isNum(p.priceIn) ? r.priceIn - p.priceIn : null,
    });
  }
  return out;
}

/** Pick the newest snapshot at least `days` old (by date key), or null. */
export function snapshotAtLeast(snapshots, days, today = new Date()) {
  const cutoff = new Date(today); cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const ck = dateKey(cutoff);
  return [...(snapshots ?? [])].filter(s => s.date <= ck).sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
}

/** Series for one id across snapshots: [{ date, value }]. */
export function series(snapshots, id, field, { board = null } = {}) {
  const out = [];
  for (const s of [...(snapshots ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const rows = board ? s.media?.[board] : s.llms;
    const r = rows?.find(x => x.id === id);
    if (r && isNum(r[field])) out.push({ date: s.date, value: r[field] });
  }
  return out;
}

/**
 * Retention: keep every snapshot from the last `dailyDays`, then one per
 * week for `weeklyWeeks`, then one per month. Returns the keys to delete.
 */
export function pruneKeys(dates, { dailyDays = 60, weeklyWeeks = 52, today = new Date() } = {}) {
  const keep = new Set();
  const sorted = [...dates].sort();
  const dayCut = new Date(today); dayCut.setUTCDate(dayCut.getUTCDate() - dailyDays);
  const weekCut = new Date(today); weekCut.setUTCDate(weekCut.getUTCDate() - weeklyWeeks * 7);
  const seenWeek = new Set(), seenMonth = new Set();
  for (const d of sorted) {
    const dt = new Date(d + 'T00:00:00Z');
    if (dt >= dayCut) { keep.add(d); continue; }
    if (dt >= weekCut) {
      const wk = `${dt.getUTCFullYear()}-${Math.floor((dt - new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))) / 604800000)}`;
      if (!seenWeek.has(wk)) { seenWeek.add(wk); keep.add(d); }
      continue;
    }
    const mo = d.slice(0, 7);
    if (!seenMonth.has(mo)) { seenMonth.add(mo); keep.add(d); }
  }
  return sorted.filter(d => !keep.has(d));
}
