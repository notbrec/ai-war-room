// ─── PriceStrip — every host of one model on a single price axis ────────────
// One dot per endpoint, stacked where hosts list the same price, so the
// shape of the market reads at a glance: a single tall stack means everyone
// charges the same; a long tail to the right is what the wrong host costs.
// The axis runs from the cheapest to the priciest listing (log scale once
// the spread passes 8×). Hollow dots are endpoints quantised to 4-bit.

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MONO } from '../design.jsx';
import { fmtMetric, isNum } from '../../../shared/metrics.js';
import { GOLD, BLUE, GREEN, RED } from '../ui.jsx';

export const LOW_PRECISION = /int4|fp4/i;   // int4, fp4, mxfp4, nvfp4
const MAX_ROWS = 8;

export default function PriceStrip({ endpoints, winners = {}, picked, onPick, mobile }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const set = () => setWidth(Math.max(240, el.clientWidth));
    set();
    const ro = new ResizeObserver(set); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plot = useMemo(() => {
    const rows = endpoints.filter(e => isNum(e.priceBlended) && e.priceBlended > 0).sort((a, b) => a.priceBlended - b.priceBlended);
    if (!rows.length) return null;
    const lo = rows[0].priceBlended, hi = rows[rows.length - 1].priceBlended;
    const log = hi / lo > 8;
    const r = mobile ? 4.5 : 5, step = 2 * r + 2;
    const padL = r + 2, padR = r + 2;
    const f = v => (log ? Math.log10(v) : v);
    const x = v => (hi === lo ? width / 2 : padL + ((f(v) - f(lo)) / (f(hi) - f(lo))) * (width - padL - padR));
    // stack dots that fall into the same column
    const cols = new Map();
    const dots = rows.map(e => {
      const cx0 = x(e.priceBlended);
      const key = Math.round(cx0 / step);
      const n = cols.get(key) ?? 0; cols.set(key, n + 1);
      return { e, key, n, cx: hi === lo ? cx0 : Math.min(width - padR, Math.max(padL, key * step)) };
    });
    // a few round prices between the two ends, so a cluster can be read off the axis
    const ticks = [];
    if (hi > lo) {
      const cand = [];
      if (log) { for (let k = Math.floor(Math.log10(lo)) - 1; k <= Math.ceil(Math.log10(hi)); k++) for (const m of [1, 2, 5]) cand.push(m * 10 ** k); }
      else { const raw = (hi - lo) / 4, mag = 10 ** Math.floor(Math.log10(raw)), st = [1, 2, 2.5, 5, 10].map(m => m * mag).find(v => v >= raw); for (let v = Math.ceil(lo / st) * st; v < hi; v += st) cand.push(+v.toPrecision(6)); }
      let last = -Infinity;
      for (const v of cand) {
        if (v <= lo || v >= hi) continue;
        const px = x(v);
        if (px < 64 || px > width - 64 || px - last < 58) continue;
        ticks.push({ v, px }); last = px;
      }
    }
    const tallest = Math.max(...cols.values());
    const shownRows = Math.min(tallest, MAX_ROWS);
    const base = shownRows * step + 6;
    return { rows, lo, hi, log, r, step, dots, cols, base, height: base + 34, x, ticks };
  }, [endpoints, width, mobile]);

  if (!plot) return <div ref={ref} style={{ padding: '18px 0', fontSize: 12.5, color: 'var(--muted)' }}>No host lists a price for this model.</div>;
  const { rows, lo, hi, log, r, step, dots, cols, base, height, ticks } = plot;
  const cheapest = rows[0], priciest = rows[rows.length - 1];
  const styleOf = e => {
    const low = LOW_PRECISION.test(e.quantization ?? '');
    const color = e.tag === winners.cheapest ? GOLD : e.tag === winners.bestValue ? BLUE : 'var(--text)';
    const strong = e.tag === winners.cheapest || e.tag === winners.bestValue;
    return { low, color, opacity: strong ? 1 : 0.5 };
  };
  const h = hover != null ? dots[hover] : null;
  const anyLow = rows.some(e => LOW_PRECISION.test(e.quantization ?? ''));
  const bestValueShown = winners.bestValue && winners.bestValue !== winners.cheapest && rows.some(e => e.tag === winners.bestValue);

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={`Blended price per host: ${fmtMetric('priceBlended', lo)} to ${fmtMetric('priceBlended', hi)}`} style={{ display: 'block', overflow: 'visible' }}>
        <line x1={0} x2={width} y1={base} y2={base} stroke="var(--sep)" strokeWidth="1" />
        {ticks.map(t => (
          <g key={t.v}>
            <line x1={t.px} x2={t.px} y1={base} y2={base + 4} stroke="var(--muted2)" strokeWidth="1" />
            <text x={t.px} y={base + 16} textAnchor="middle" fontFamily={MONO} fontSize="10" fill="var(--muted2)">{fmtMetric('priceBlended', t.v)}</text>
          </g>
        ))}
        {dots.map((d, i) => {
          if (d.n >= MAX_ROWS) return null;
          const s = styleOf(d.e);
          const on = hover === i || picked === d.e.tag;
          const cy = base - 3 - r - d.n * step;
          return (
            <circle key={d.e.tag ?? i} cx={d.cx} cy={cy} r={on ? r + 1.5 : r} data-round="1"
              fill={s.low ? 'var(--surface-bot)' : s.color} fillOpacity={s.low ? 1 : (on ? 1 : s.opacity)}
              stroke={s.low ? s.color : on ? 'var(--text)' : 'none'} strokeOpacity={s.low && !on ? Math.max(0.6, s.opacity) : 1} strokeWidth={s.low ? 1.6 : 1.5}
              style={{ cursor: onPick ? 'pointer' : 'default', transition: 'r 120ms ease' }}
              onMouseEnter={() => setHover(i)} onClick={() => { setHover(i); onPick?.(d.e.tag); }} />
          );
        })}
        {[...cols.entries()].filter(([, n]) => n > MAX_ROWS).map(([key, n]) => (
          <text key={key} x={Math.min(width - 14, Math.max(14, key * step))} y={base - MAX_ROWS * step - 4} textAnchor="middle" fontFamily={MONO} fontSize="9.5" fill="var(--muted)">×{n}</text>
        ))}
        {/* the two ends of the market */}
        <text x={hi === lo ? width / 2 : 0} y={base + 16} textAnchor={hi === lo ? 'middle' : 'start'} fontFamily={MONO} fontSize="12" fontWeight="700" fill={GOLD}>{fmtMetric('priceBlended', lo)}</text>
        <text x={hi === lo ? width / 2 : 0} y={base + 29} textAnchor={hi === lo ? 'middle' : 'start'} fontSize="10.5" fill="var(--muted)">{hi === lo ? `every host · ${rows.length} listed` : `cheapest · ${cheapest.provider}`}</text>
        {hi !== lo && <>
          <text x={width} y={base + 16} textAnchor="end" fontFamily={MONO} fontSize="12" fontWeight="700" fill="var(--text)">{fmtMetric('priceBlended', hi)}</text>
          <text x={width} y={base + 29} textAnchor="end" fontSize="10.5" fill="var(--muted)">priciest · {priciest.provider}</text>
        </>}
      </svg>
      {h && (
        <div role="tooltip" style={{
          position: 'absolute', left: Math.min(width - 200, Math.max(0, h.cx - 100)), top: base - 3 - 2 * r - Math.min(h.n, MAX_ROWS - 1) * step - 8, transform: 'translateY(-100%)', width: 200, zIndex: 20, pointerEvents: 'none',
          background: 'var(--card)', border: '0.5px solid var(--text)', boxShadow: 'var(--shadow)', padding: '8px 10px',
        }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{h.e.provider}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.e.tag}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 10px', marginTop: 7, fontSize: 11.5, color: 'var(--muted)' }}>
            <span>Blended</span><b style={{ fontFamily: MONO, color: 'var(--text)', textAlign: 'right' }}>{fmtMetric('priceBlended', h.e.priceBlended)}</b>
            <span>Precision</span><span style={{ fontFamily: MONO, color: LOW_PRECISION.test(h.e.quantization ?? '') ? GOLD : 'var(--text)', textAlign: 'right' }}>{h.e.quantization ?? 'full'}</span>
            <span>Uptime 30m</span><span style={{ fontFamily: MONO, color: !isNum(h.e.uptime30m) ? 'var(--muted2)' : h.e.uptime30m >= 99.5 ? GREEN : h.e.uptime30m >= 97 ? GOLD : RED, textAlign: 'right' }}>{isNum(h.e.uptime30m) ? fmtMetric('uptime', h.e.uptime30m) : 'N/A'}</span>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '4px 14px', flexWrap: 'wrap', marginTop: 10, fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted2)' }}>
        <Key color={GOLD}>Cheapest</Key>
        {bestValueShown && <Key color={BLUE}>Best value · fp8 or better</Key>}
        <Key color="var(--text)" dim>Other hosts</Key>
        {anyLow && <Key color="var(--text)" hollow>4-bit quantised</Key>}
        <span style={{ marginLeft: 'auto' }}>{log ? 'log scale · ' : ''}$ per 1M tokens · 3:1 in:out</span>
      </div>
    </div>
  );
}

function Key({ color, children, dim, hollow }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <span data-round="1" style={{ width: 8, height: 8, background: hollow ? 'transparent' : color, border: hollow ? `1.5px solid ${color}` : 'none', opacity: dim || hollow ? 0.55 : 1 }} />
      {children}
    </span>
  );
}
