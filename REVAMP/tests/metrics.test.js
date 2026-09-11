import { describe, it, expect } from 'vitest';
import { normalise, extent, blendedPrice, parseContext, fmtPrice, fmtTokens, fmtSeconds, fmtMetric, METRICS, record, pctDiff, NA } from '../shared/metrics.js';
import { paretoFrontier, bestValueZone, inZone } from '../shared/pareto.js';

describe('normalise', () => {
  it('maps higher-is-better to 1 at max', () => {
    expect(normalise(10, 0, 10, true)).toBe(1);
    expect(normalise(0, 0, 10, true)).toBe(0);
  });
  it('inverts lower-is-better metrics', () => {
    expect(normalise(0, 0, 10, false)).toBe(1);
    expect(normalise(10, 0, 10, false)).toBe(0);
  });
  it('returns null (not 0) for a missing metric', () => {
    expect(normalise(null, 0, 10)).toBeNull();
    expect(normalise(undefined, 0, 10)).toBeNull();
    expect(normalise(NaN, 0, 10)).toBeNull();
  });
  it('handles a zero-dollar endpoint on a log scale without blowing up', () => {
    const v = normalise(0, 0, 100, false, { log: true });
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
    expect(v).toBe(1); // cheapest possible
  });
  it('handles a degenerate range', () => {
    expect(normalise(5, 5, 5, true)).toBe(1);
  });
});

describe('extent', () => {
  it('ignores non-numbers', () => {
    expect(extent([{ v: 3 }, { v: null }, { v: 'x' }, { v: 9 }], r => r.v)).toEqual([3, 9]);
    expect(extent([{ v: null }], r => r.v)).toEqual([null, null]);
  });
});

describe('prices and units', () => {
  it('blends at 3:1', () => {
    expect(blendedPrice(1, 5)).toBe(2);
    expect(blendedPrice(null, 5)).toBe(5);
    expect(blendedPrice(null, null)).toBeNull();
  });
  it('parses context labels', () => {
    expect(parseContext('262K')).toBe(262_000);
    expect(parseContext('1.1M')).toBe(1_100_000);
    expect(parseContext(1048576)).toBe(1048576);
    expect(parseContext(null)).toBeNull();
    expect(parseContext('—')).toBeNull();
  });
  it('formats without ever printing 0 for unknown', () => {
    expect(fmtPrice(null)).toBe(NA);
    expect(fmtPrice(0)).toBe('$0');
    expect(fmtPrice(0.000375)).toBe('$0.0004');
    expect(fmtTokens(10_000_000)).toBe('10M');
    expect(fmtTokens(null)).toBe(NA);
    expect(fmtSeconds(0.42)).toBe('420ms');
    expect(fmtSeconds(75)).toBe('1m 15s');
  });
  it('very large context windows format sanely', () => {
    expect(fmtTokens(100_000_000)).toBe('100M');
  });
  it('fmtMetric respects the registry', () => {
    expect(fmtMetric('wer', 4.34125)).toBe('4.34%');
    expect(fmtMetric('ci', 7.4)).toBe('±7');
    expect(METRICS.wer.higherIsBetter).toBe(false);
    expect(METRICS.elo.higherIsBetter).toBe(true);
  });
  it('pctDiff', () => {
    expect(pctDiff(100, 150)).toBe(50);
    expect(pctDiff(0, 1)).toBeNull();
  });
});

describe('record envelope', () => {
  it('carries provenance and direction', () => {
    const r = record({ key: 'elo', value: 1500, modelId: 'x:y', source: 'arena' });
    expect(r.higher_is_better).toBe(true);
    expect(r.source).toBe('arena');
    expect(r.source_url).toContain('arena.ai');
    expect(r.retrieved_at).toBeTruthy();
  });
});

describe('pareto', () => {
  const pts = [
    { id: 'a', x: 1, y: 10 }, { id: 'b', x: 2, y: 12 }, { id: 'c', x: 3, y: 11 },
    { id: 'd', x: 4, y: 15 }, { id: 'e', x: 0.5, y: 5 }, { id: 'f', x: null, y: 9 },
  ];
  it('finds the frontier for min-x / max-y', () => {
    const f = paretoFrontier(pts, { maxX: false, maxY: true }).map(p => p.id);
    expect(f).toEqual(['e', 'a', 'b', 'd']);
  });
  it('finds the frontier for max-x / max-y', () => {
    const f = paretoFrontier(pts, { maxX: true, maxY: true }).map(p => p.id);
    expect(f).toEqual(['d']);
  });
  it('builds a best-value zone', () => {
    const z = bestValueZone(pts, { maxX: false, maxY: true, yTol: 0.5 });
    expect(z).not.toBeNull();
    expect(inZone({ x: 2, y: 12 }, z)).toBe(true);
    expect(inZone({ x: 4, y: 15 }, z)).toBe(false);
  });
});
