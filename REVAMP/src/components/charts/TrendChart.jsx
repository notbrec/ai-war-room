// ─── TrendChart — value over time, one 2px line per series ──────────────────
// series: [{ id, name, org, color?, points: [{ date: 'YYYY-MM-DD', value }] }]
// Solid hairline grid on nice ticks, end markers with a surface ring, the
// last value labelled, a crosshair that snaps to the nearest snapshot and
// one tooltip listing every series at that date. Two or more series get a
// legend; a single series is named by the panel it sits in.

import { useEffect, useMemo, useRef, useState } from 'react';
import { MONO, SF, EASE } from '../design.jsx';
import { ORG_CONFIG } from '../../models-data.js';
import { metric, isNum, fmtMetric } from '../../../shared/metrics.js';
import { Label, GREEN, RED } from '../ui.jsx';
import { niceTicks, fmtTick, fmtDay, labColor } from './scale.js';

const PAD = { top: 18, right: 58, bottom: 30, left: 56 };

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
  const integer = yKey === 'rank' || ym.unit === 'Elo';

  const { dates, lo, hi } = useMemo(() => {
    const ds = new Set(); let lo = Infinity, hi = -Infinity;
    for (const s of series) for (const p of s.points) { if (!isNum(p.value)) continue; ds.add(p.date); lo = Math.min(lo, p.value); hi = Math.max(hi, p.value); }
    const dates = [...ds].sort();
    if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.12;
    return { dates, lo: lo - pad, hi: hi + pad };
  }, [series]);
  const yTicks = useMemo(() => {
    let t = niceTicks(lo, hi, 4);
    if (integer) { t = t.filter(Number.isInteger); if (t.length < 2) t = [Math.floor(lo), Math.ceil(hi)]; }
    return t;
  }, [lo, hi, integer]);

  if (!dates.length || dates.length < 2) {
    return <div ref={wrapRef} style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, border: '0.5px dashed var(--sep)', textAlign: 'center', padding: 20 }}>{emptyText}</div>;
  }

  const y0 = Math.min(lo, yTicks[0] ?? lo), y1 = Math.max(hi, yTicks[yTicks.length - 1] ?? hi);
  const innerW = width - PAD.left - PAD.right, innerH = height - PAD.top - PAD.bottom;
  const t0 = new Date(dates[0]).getTime(), t1 = new Date(dates[dates.length - 1]).getTime();
  const sx = d => PAD.left + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * innerW;
  const sy = v => PAD.top + (invertY ? (v - y0) / (y1 - y0) : 1 - (v - y0) / (y1 - y0)) * innerH;
  const every = Math.max(1, Math.ceil(dates.length / (width < 480 ? 3 : 6)));
  const xTicks = dates.filter((_, i) => i % every === 0 || i === dates.length - 1);
  const hoverDate = hoverX == null ? null : dates.reduce((best, d) => Math.abs(sx(d) - hoverX) < Math.abs(sx(best) - hoverX) ? d : best, dates[0]);
  const colorOf = s => s.color ?? labColor(s.org, ORG_CONFIG);
  const multi = series.length > 1;
  const plotB = PAD.top + innerH;

  return (
    <div ref={wrapRef} style={{ position: 'relative', fontFamily: SF }}>
      {multi && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          {series.map(s => (
            <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text2)' }}>
              <span aria-hidden style={{ width: 14, borderTop: `2px solid ${colorOf(s)}` }} />{s.name}
            </span>
          ))}
        </div>
      )}
      <svg width={width} height={height} style={{ display: 'block' }}
        onPointerMove={e => { const r = wrapRef.current.getBoundingClientRect(); setHoverX(e.clientX - r.left); }}
        onPointerLeave={() => setHoverX(null)}>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={sy(t)} y2={sy(t)} stroke="var(--sep2)" strokeWidth="1" />
            <text x={PAD.left - 8} y={sy(t) + 3} textAnchor="end" fontSize="10" fontFamily={MONO} fill="var(--muted2)">{integer ? Math.round(t).toLocaleString('en-US') : fmtTick(yKey, t)}</text>
          </g>
        ))}
        {xTicks.map(d => (
          <text key={d} x={sx(d)} y={height - 8} textAnchor="middle" fontSize="10" fontFamily={MONO} fill="var(--muted2)">{fmtDay(d)}</text>
        ))}
        <line x1={PAD.left} x2={PAD.left + innerW} y1={plotB} y2={plotB} stroke="var(--sep)" strokeWidth="1" />
        {series.map(s => {
          const pts = s.points.filter(p => isNum(p.value)).sort((a, b) => (a.date < b.date ? -1 : 1));
          if (pts.length < 1) return null;
          const color = colorOf(s);
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.date)},${sy(p.value)}`).join(' ');
          const last = pts[pts.length - 1], first = pts[0];
          const area = `${d} L${sx(last.date)},${plotB} L${sx(first.date)},${plotB} Z`;
          const hp = hoverDate ? pts.find(x => x.date === hoverDate) : null;
          return (
            <g key={s.id}>
              {!multi && <path d={area} fill={color} fillOpacity="0.08" />}
              <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {hp && hp !== last && <circle cx={sx(hp.date)} cy={sy(hp.value)} r={4} fill={color} stroke="var(--card)" strokeWidth="2" />}
              <circle cx={sx(last.date)} cy={sy(last.value)} r={4} fill={color} stroke="var(--card)" strokeWidth="2" />
              {!multi && <text x={sx(last.date) + 8} y={sy(last.value) + 4} fontSize="11" fontFamily={MONO} fontWeight="700" fill="var(--text)" style={{ paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 3 }}>{fmtMetric(yKey, last.value)}</text>}
            </g>
          );
        })}
        {hoverDate && <line x1={sx(hoverDate)} x2={sx(hoverDate)} y1={PAD.top} y2={plotB} stroke="var(--text)" strokeOpacity="0.2" strokeWidth="1" />}
      </svg>

      {hoverDate && (
        <div className="aiwar-chart-tip" style={{ top: 8, left: sx(hoverDate) > width * 0.6 ? sx(hoverDate) - 224 : sx(hoverDate) + 10, width: 200, animation: `aiwar-fade-in 120ms ${EASE} both` }}>
          <Label>{fmtDay(hoverDate)} · {hoverDate.slice(0, 4)}</Label>
          {series.map(s => {
            const p = s.points.find(x => x.date === hoverDate);
            if (!p) return null;
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, marginTop: 4 }}>
                <span aria-hidden style={{ width: 10, borderTop: `2px solid ${colorOf(s)}`, flexShrink: 0 }} />
                <span style={{ color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{s.name}</span>
                <span style={{ fontFamily: MONO, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtMetric(yKey, p.value)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontFamily: MONO, color: 'var(--muted)', letterSpacing: '0.06em' }}>{ym.label.toUpperCase()} OVER TIME{invertY ? ' · LOWER IS BETTER' : ''}</span>
        <span style={{ display: 'inline-flex', gap: 12 }}>
          {!multi && (() => {
            const pts = series[0].points.filter(p => isNum(p.value)).sort((a, b) => (a.date < b.date ? -1 : 1));
            if (pts.length < 2) return null;
            const d = pts[pts.length - 1].value - pts[0].value;
            const good = invertY ? d < 0 : d > 0;
            return <span style={{ fontSize: 10, fontFamily: MONO, fontWeight: 700, color: d === 0 ? 'var(--muted2)' : good ? GREEN : RED }}>{d === 0 ? '= NO CHANGE' : `${d > 0 ? '▲ +' : '▼ −'}${fmtMetric(yKey, Math.abs(d))} SINCE ${fmtDay(pts[0].date).toUpperCase()}`}</span>;
          })()}
          <span style={{ fontSize: 10, fontFamily: MONO, color: 'var(--muted2)' }}>{dates.length} SNAPSHOTS</span>
        </span>
      </div>
    </div>
  );
}
