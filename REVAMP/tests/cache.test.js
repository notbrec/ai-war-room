import { describe, it, expect, vi, afterEach } from 'vitest';
import { cached, cachedSWR, setBackgroundRunner, HOURS } from '../netlify/functions/lib/cache.js';

// No Netlify Blobs in tests, so the memory tier is exercised; the durable
// tier follows the same fetchedAt / failedAt contract.
afterEach(() => vi.useRealTimers());

describe('cached() — metered upstream cap', () => {
  it('serves the fresh copy within the window without calling the loader', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-17T00:00:00Z') });
    const loader = vi.fn(async () => [1, 2, 3]);
    const a = await cached('t:hit', HOURS(12), loader);
    vi.setSystemTime(new Date('2026-09-17T11:59:00Z'));
    const b = await cached('t:hit', HOURS(12), loader);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(a.cache).toBe('MISS');
    expect(b.cache).toBe('HIT');
    vi.setSystemTime(new Date('2026-09-17T12:01:00Z'));
    await cached('t:hit', HOURS(12), loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('does not retry a failed refresh until retryAfterMs has passed', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-17T00:00:00Z') });
    let fail = false;
    const loader = vi.fn(async () => { if (fail) throw new Error('quota'); return [1, 2, 3]; });
    const opts = { retryAfterMs: HOURS(12) };
    await cached('t:retry', HOURS(12), loader, opts);
    fail = true;
    vi.setSystemTime(new Date('2026-09-17T13:00:00Z'));
    const stale = await cached('t:retry', HOURS(12), loader, opts);
    expect(stale.cache).toBe('STALE');
    expect(stale.data).toEqual([1, 2, 3]);
    expect(loader).toHaveBeenCalledTimes(2);
    // Every visitor for the next 12 h gets the stale copy, no upstream call.
    vi.setSystemTime(new Date('2026-09-17T20:00:00Z'));
    const again = await cached('t:retry', HOURS(12), loader, opts);
    expect(again.cache).toBe('STALE');
    expect(loader).toHaveBeenCalledTimes(2);
    // After the back-off a refresh is attempted, and a success clears failedAt.
    fail = false;
    vi.setSystemTime(new Date('2026-09-18T01:30:00Z'));
    const ok = await cached('t:retry', HOURS(12), loader, opts);
    expect(ok.cache).toBe('MISS');
    expect(ok.failedAt).toBeUndefined();
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it('without retryAfterMs a failure is retried on the next call (old behaviour)', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-17T00:00:00Z') });
    let fail = false;
    const loader = vi.fn(async () => { if (fail) throw new Error('down'); return [1]; });
    await cached('t:plain', HOURS(1), loader);
    fail = true;
    vi.setSystemTime(new Date('2026-09-17T02:00:00Z'));
    await cached('t:plain', HOURS(1), loader);
    await cached('t:plain', HOURS(1), loader);
    expect(loader).toHaveBeenCalledTimes(3);
  });
});

describe('cachedSWR() — stale-while-revalidate with a background runner', () => {
  afterEach(() => setBackgroundRunner(null));

  it('serves a copy past its TTL at once and refreshes it in the background', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-18T00:00:00Z') });
    let n = 0;
    const loader = vi.fn(async () => [++n]);
    await cachedSWR('t:swr', HOURS(1), loader);
    const bg = [];
    setBackgroundRunner(p => bg.push(p));
    vi.setSystemTime(new Date('2026-11-18T01:30:00Z')); // past TTL, inside 2× grace
    const served = await cachedSWR('t:swr', HOURS(1), loader);
    expect(served.data).toEqual([1]);
    expect(served.cache).toBe('REVALIDATING');
    expect(bg).toHaveLength(1);
    await Promise.all(bg);
    expect(loader).toHaveBeenCalledTimes(2);
    const next = await cachedSWR('t:swr', HOURS(1), loader);
    expect(next.data).toEqual([2]);
    expect(next.cache).toBe('HIT');
  });

  it('refreshes inline when the copy is older than the grace window', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-18T00:00:00Z') });
    let n = 0;
    const loader = vi.fn(async () => [++n]);
    await cachedSWR('t:swr-old', HOURS(1), loader);
    const bg = [];
    setBackgroundRunner(p => bg.push(p));
    vi.setSystemTime(new Date('2026-11-18T03:00:00Z'));
    const served = await cachedSWR('t:swr-old', HOURS(1), loader);
    expect(served.data).toEqual([2]);
    expect(served.cache).toBe('MISS');
    expect(bg).toHaveLength(0);
  });
});
