import { describe, it, expect } from 'vitest';
import { recommend, MISSIONS } from '../shared/recommend.js';
import { buildLanes, laneProgress } from '../shared/race.js';
import { diffRows, snapshotAtLeast, snapshotsEqual, pruneKeys, series } from '../shared/history.js';

const rows = [
  { id: 'frontier', name: 'Frontier', isReasoning: true,  metrics: { elo: 1500, intelligence: 60, codingIndex: 70, priceBlended: 15,  speed: 40,  context: 1_000_000, open: false } },
  { id: 'value',    name: 'Value',    isReasoning: true,  metrics: { elo: 1480, intelligence: 55, codingIndex: 65, priceBlended: 2,   speed: 120, context: 262_000,  open: false } },
  { id: 'cheap',    name: 'Cheap',    isReasoning: false, metrics: { elo: 1440, intelligence: 40, codingIndex: 50, priceBlended: 0.2, speed: 200, context: 128_000,  open: true } },
  { id: 'free',     name: 'Free',     isReasoning: false, metrics: { elo: 1300, intelligence: 20, codingIndex: 30, priceBlended: 0,   speed: 90,  context: 32_000,   open: true } },
  { id: 'nospeed',  name: 'NoSpeed',  isReasoning: true,  metrics: { elo: 1495, intelligence: 58, codingIndex: 68, priceBlended: 10,  speed: null, context: 400_000, open: false } },
  { id: 'unknown',  name: 'Unknown',  isReasoning: false, metrics: { elo: null, intelligence: null, priceBlended: 1 } },
];

describe('recommend', () => {
  it('picks the highest quality as primary when quality dominates', () => {
    const r = recommend('chat', rows, { quality: 1, cost: 0, speed: 0, context: 0, open: 0 });
    expect(r.picks.primary.id).toBe('frontier');
    expect(r.picks.primary.why.length).toBeGreaterThan(0);
  });
  it('drops candidates that lack the quality metric entirely', () => {
    const r = recommend('chat', rows);
    expect(r.scored.find(x => x.id === 'unknown')).toBeUndefined();
  });
  it('budget pick is the cheapest with mid-pack quality (a $0 endpoint is allowed)', () => {
    const r = recommend('chat', rows);
    expect(['cheap', 'free', 'value']).toContain(r.picks.budget.id);
    expect(r.picks.budget.metrics.priceBlended).toBeLessThanOrEqual(2);
  });
  it('fastest pick uses the speed metric', () => {
    const r = recommend('fast-api', rows);
    expect(r.picks.fastest.metrics.speed).toBe(200);
  });
  it('does not score a missing dimension as zero', () => {
    const r = recommend('chat', rows, { quality: 1, cost: 0, speed: 1, context: 0, open: 0 });
    const ns = r.scored.find(x => x.id === 'nospeed');
    expect(ns.parts.speed).toBeUndefined();
    expect(ns.coverage).toBeLessThan(1);
    expect(ns.score).toBeGreaterThan(0);
  });
  it('reasoning mission prefers reasoning variants when enough exist', () => {
    const r = recommend('reasoning', rows);
    expect(r.scored.every(x => x.isReasoning)).toBe(true);
  });
  it('lower-is-better quality (WER) ranks the lowest value first', () => {
    const stt = [
      { id: 'a', metrics: { wer: 4.2, pricePerMinute: 0.01, rtfx: 100 } },
      { id: 'b', metrics: { wer: 9.9, pricePerMinute: 0.001, rtfx: 900 } },
    ];
    const r = recommend('transcription', stt, { quality: 1, cost: 0, speed: 0, context: 0, open: 0 });
    expect(r.picks.primary.id).toBe('a');
  });
  it('reports missing speed source instead of inventing one', () => {
    const noSpeed = rows.map(r => ({ ...r, metrics: { ...r.metrics, speed: null } }));
    const r = recommend('chat', noSpeed);
    expect(r.picks.fastest).toBeNull();
    expect(r.missing.speed).toMatch(/not configured/);
  });
  it('every mission id is unique', () => {
    expect(new Set(MISSIONS.map(m => m.id)).size).toBe(MISSIONS.length);
  });
});

describe('race lanes', () => {
  it('higher-is-better: fastest tokens/sec wins with the base duration', () => {
    const lanes = buildLanes([{ id: 'a', value: 100 }, { id: 'b', value: 50 }, { id: 'c', value: null }], { higherIsBetter: true, baseMs: 1000 });
    expect(lanes.map(l => l.id)).toEqual(['a', 'b']);
    expect(lanes[0].finishMs).toBe(1000);
    expect(lanes[1].finishMs).toBe(2000);
    expect(lanes[1].pctSlower).toBeCloseTo(100);
  });
  it('lower-is-better: lowest latency wins', () => {
    const lanes = buildLanes([{ id: 'slow', value: 2.4 }, { id: 'fast', value: 1.2 }], { higherIsBetter: false, baseMs: 3000 });
    expect(lanes[0].id).toBe('fast');
    expect(lanes[0].winner).toBe(true);
    expect(lanes[1].ratio).toBeCloseTo(2);
  });
  it('caps extreme ratios but reports the real number', () => {
    const lanes = buildLanes([{ id: 'a', value: 1 }, { id: 'b', value: 100 }], { higherIsBetter: false, baseMs: 1000, maxRatio: 6 });
    expect(lanes[1].finishMs).toBe(6000);
    expect(lanes[1].capped).toBe(true);
    expect(lanes[1].ratio).toBe(100);
  });
  it('progress is clamped', () => {
    const lane = { finishMs: 1000 };
    expect(laneProgress(lane, 500)).toBe(0.5);
    expect(laneProgress(lane, 5000)).toBe(1);
  });
});

describe('history', () => {
  const cur = [{ id: 'a', rank: 1, elo: 1500, priceIn: 5 }, { id: 'b', rank: 2, elo: 1490, priceIn: 1 }, { id: 'new', rank: 3, elo: 1480 }];
  const old = [{ id: 'a', rank: 2, elo: 1490, priceIn: 6 }, { id: 'b', rank: 1, elo: 1495, priceIn: 1 }];
  it('positive rankDelta means moved up', () => {
    const d = diffRows(cur, old);
    expect(d.get('a').rankDelta).toBe(1);
    expect(d.get('b').rankDelta).toBe(-1);
    expect(d.get('a').eloDelta).toBe(10);
    expect(d.get('a').priceDelta).toBe(-1);
    expect(d.get('new').isNew).toBe(true);
  });
  it('snapshotAtLeast picks the newest snapshot older than N days', () => {
    const today = new Date('2026-09-11T12:00:00Z');
    const snaps = [{ date: '2026-09-01' }, { date: '2026-09-04' }, { date: '2026-09-10' }, { date: '2026-09-11' }];
    expect(snapshotAtLeast(snaps, 7, today).date).toBe('2026-09-04');
    expect(snapshotAtLeast(snaps, 1, today).date).toBe('2026-09-10');
    expect(snapshotAtLeast(snaps, 30, today)).toBeNull();
  });
  it('detects identical snapshots', () => {
    expect(snapshotsEqual({ llms: cur, media: {} }, { llms: cur, media: {} })).toBe(true);
    expect(snapshotsEqual({ llms: cur, media: {} }, { llms: old, media: {} })).toBe(false);
  });
  it('prunes to weekly then monthly', () => {
    const today = new Date('2026-09-11T00:00:00Z');
    const dates = [];
    for (let i = 0; i < 400; i++) { const d = new Date(today); d.setUTCDate(d.getUTCDate() - i); dates.push(d.toISOString().slice(0, 10)); }
    const del = pruneKeys(dates, { today });
    const kept = dates.filter(d => !del.includes(d));
    expect(kept.length).toBeLessThan(140);
    expect(kept).toContain('2026-09-11');
    expect(kept).toContain('2026-08-01');
  });
  it('builds a series', () => {
    const snaps = [{ date: '2026-09-02', llms: [{ id: 'a', elo: 1 }] }, { date: '2026-09-01', llms: [{ id: 'a', elo: 0 }] }];
    expect(series(snaps, 'a', 'elo').map(p => p.value)).toEqual([0, 1]);
  });
});
