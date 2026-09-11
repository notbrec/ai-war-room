// ─── TrendChart — value over time, one hairline per model ───────────────────
// series: [{ id, name, org, color?, points: [{ date: 'YYYY-MM-DD', value }] }]

import { useEffect, useMemo, useRef, useState } from 'react';
import { MONO, SF } from '../design.jsx';
import { ORG_CONFIG } from '../../models-data.js';
import { metric, isNum, fmtMetric } from '../../../shared/metrics.js';
import { Label } from '../ui.jsx';

const PAD = { top: 14, right: 16, bottom: 30, left: 54 };

export default function TrendChart({ series, yKey, height = 300, invertY = false, emptyText = 'No history yet — snapshots accumulate daily.' }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(720);
  const [hoverX, setHoverX] = useState(null);
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const ym = metric(yKey);

  const { dates, lo, hi } = useMemo(() => {
    const ds = new Set(); let lo = Infinity, hi = -Infinity;
    for (const s of series) for (const p of s.points) { if (!isNum(p.value)) continue; ds.add(p.date); lo = Math.min(lo, p.value); hi = Math.max(hi, p.value); }
    const dates = [...ds].sort();
    if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.1;
    return { dates, lo: lo - pad, hi: hi + pad };
  }, [series]);

  if (!dates.length || dates.length < 2) {
    return <div ref={wrapRef} style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, border: '0.5px dashed var(--sep)', textAlign: 'center', padding: 20 }}>{emptyText}</div>;
  }

  const innerW = width - PAD.left - PAD.right, innerH = height - PAD.top - PAD.bottom;
  const t0 = new Date(dates[0]).getTime(), t1 = new Date(dates[dates.length - 1]).getTime();
  const sx = d => PAD.left + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * innerW;
  const sy = v => PAD.top + (invertY ? (v - lo) / (hi - lo) : 1 - (v - lo) / (hi - lo)) * innerH;
  const yTicks = Array.from({ length: 5 }, (_, i) => lo + (hi - lo) * i / 4);
  const xTicks = dates.filter((_, i) => i % Math.max(1, Math.ceil(dates.length / (width < 480 ? 3 : 6))) === 0 || i === dates.length - 1);

  const hoverDate = hoverX == null ? null : dates.reduce((best, d) => Math.abs(sx(d) - hoverX) < Math.abs(sx(best) - hoverX) ? d : best, dates[0]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', fontFamily: SF }}>
      <svg width={width} height={height} style={{ display: 'block' }}
        onPointerMove={e => { const r = wrapRef.current.getBoundingClientRect(); setHoverX(e.clientX - r.left); }}
        onPointerLeave={() => setHoverX(null)}>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={sy(t)} y2={sy(t)} stroke="var(--sep2)" />
            <text x={PAD.left - 8} y={sy(t) + 3} textAnchor="end" fontSize="10" fontFamily={MONO} fill="var(--muted2)">{fmtMetric(yKey, t)}</text>
          </g>
        ))}
        {xTicks.map(d => (
          <text key={d} x={sx(d)} y={height - 8} textAnchor="middle" fontSize="10" fontFamily={MONO} fill="var(--muted2)">{d.slice(5)}</text>
        ))}
        <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} fill="none" stroke="var(--sep)" strokeWidth="0.5" />
        {series.map(s => {
          const pts = s.points.filter(p => isNum(p.value)).sort((a, b) => (a.date < b.date ? -1 : 1));
          if (pts.length < 1) return null;
          const color = s.color ?? ORG_CONFIG[s.org]?.color ?? 'var(--text)';
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.date)},${sy(p.value)}`).join(' ');
          return (
            <g key={s.id}>
              <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
              {pts.map(p => <circle key={p.date} cx={sx(p.date)} cy={sy(p.value)} r={hoverDate === p.date ? 4 : 2} fill={color} stroke="var(--card)" strokeWidth="1" />)}
              <text x={sx(pts[pts.length - 1].date) + 6} y={sy(pts[pts.length - 1].value) + 3} fontSize="10" fontFamily={SF} fontWeight="600" fill={color} style={{ paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 3 }}>{s.name}</text>
            </g>
          );
        })}
        {hoverDate && <line x1={sx(hoverDate)} x2={sx(hoverDate)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--text)" strokeOpacity="0.25" />}
      </svg>
      {hoverDate && (
        <div style={{ position: 'absolute', top: 8, left: Math.min(width - 200, Math.max(0, sx(hoverDate) + 10)), width: 190, background: 'var(--card)', border: '0.5px solid var(--text)', padding: '8px 10px', pointerEvents: 'none', boxShadow: 'var(--shadow)' }}>
          <Label>{hoverDate}</Label>
          {series.map(s => {
            const p = s.points.find(x => x.date === hoverDate);
            if (!p) return null;
            return (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, marginTop: 3 }}>
                <span style={{ color: s.color ?? ORG_CONFIG[s.org]?.color ?? 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                <span style={{ fontFamily: MONO, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtMetric(yKey, p.value)}</span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, fontFamily: MONO, color: 'var(--muted)', letterSpacing: '0.06em' }}>{ym.label.toUpperCase()} OVER TIME</span>
        <span style={{ fontSize: 10, fontFamily: MONO, color: 'var(--muted2)' }}>{dates.length} SNAPSHOTS</span>
      </div>
    </div>
  );
}
