// ─── ScatterChart — the war room's positioning plot ─────────────────────────
// Pure SVG, no chart library. Hairline grid, MONO ticks, lab-coloured
// markers, Pareto frontier, best-value zone, wheel/drag zoom, hover
// tooltip with the lab logo, click-to-select. Points: { id, name, org, x, y,
// color?, r?, extra? }.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MONO, SF, EASE } from '../design.jsx';
import { LabLogo } from '../LabLogo.jsx';
import { ORG_CONFIG } from '../../models-data.js';
import { metric, isNum, fmtMetric } from '../../../shared/metrics.js';
import { paretoFrontier, bestValueZone, inZone } from '../../../shared/pareto.js';
import { Label, GREEN } from '../ui.jsx';

const PAD = { top: 18, right: 18, bottom: 44, left: 58 };

function niceTicks(lo, hi, n = 5, log = false) {
  if (!isNum(lo) || !isNum(hi) || hi <= lo) return [];
  if (log) {
    const out = [];
    const a = Math.floor(Math.log10(Math.max(lo, 1e-9))), b = Math.ceil(Math.log10(hi));
    for (let e = a; e <= b; e++) for (const m of [1, 2, 5]) { const v = m * 10 ** e; if (v >= lo && v <= hi) out.push(v); }
    // thin to ~n+2 ticks
    while (out.length > n + 3) for (let i = out.length - 2; i > 0; i -= 2) out.splice(i, 1);
    return out;
  }
  const span = hi - lo;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n + 1) ?? mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

function fmtTick(key, v) {
  const m = metric(key);
  if (m.unit === '$/1M tok' || m.unit === '$' || m.unit.startsWith('$')) return v < 1 ? `$${+v.toFixed(3)}` : `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : +v.toFixed(v < 10 ? 1 : 0)}`;
  if (m.unit === 'tokens') return v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(v);
  if (m.unit === 's') return v < 1 ? `${Math.round(v * 1000)}ms` : `${+v.toFixed(1)}s`;
  if (m.unit === '%') return `${+v.toFixed(1)}%`;
  return Math.abs(v) >= 1000 ? `${Math.round(v)}` : `${+v.toFixed(1)}`;
}

export default function ScatterChart({
  points, xKey, yKey, xLog = false, yLog = false,
  maxX = null, maxY = null,               // direction for the frontier; default from the metric registry
  showPareto = true, showZone = true, showLabels = true,
  highlight = null,                       // Set<id>
  selected = null,                        // Set<id>
  onSelect, height = 420, tooltipExtra, emptyText = 'No points with both values',
}) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState(null);
  const [view, setView] = useState(null);   // { x0, x1, y0, y1 } in data space, null = fit
  const dragRef = useRef(null);

  const xm = metric(xKey), ym = metric(yKey);
  const mx = maxX ?? (xm.higherIsBetter !== false);
  const my = maxY ?? (ym.higherIsBetter !== false);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const valid = useMemo(() => points.filter(p => isNum(p.x) && isNum(p.y) && (!xLog || p.x > 0) && (!yLog || p.y > 0)), [points, xLog, yLog]);
  const fit = useMemo(() => {
    if (!valid.length) return null;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of valid) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const padX = xLog ? 0 : (x1 - x0 || 1) * 0.06, padY = yLog ? 0 : (y1 - y0 || 1) * 0.08;
    return { x0: xLog ? x0 / 1.4 : x0 - padX, x1: xLog ? x1 * 1.4 : x1 + padX, y0: yLog ? y0 / 1.2 : y0 - padY, y1: yLog ? y1 * 1.2 : y1 + padY };
  }, [valid, xLog, yLog]);
  const v = view ?? fit;

  const innerW = width - PAD.left - PAD.right, innerH = height - PAD.top - PAD.bottom;
  const sx = useCallback(x => {
    if (!v) return 0;
    const t = xLog ? (Math.log10(x) - Math.log10(v.x0)) / (Math.log10(v.x1) - Math.log10(v.x0)) : (x - v.x0) / (v.x1 - v.x0);
    return PAD.left + t * innerW;
  }, [v, xLog, innerW]);
  const sy = useCallback(y => {
    if (!v) return 0;
    const t = yLog ? (Math.log10(y) - Math.log10(v.y0)) / (Math.log10(v.y1) - Math.log10(v.y0)) : (y - v.y0) / (v.y1 - v.y0);
    return PAD.top + (1 - t) * innerH;
  }, [v, yLog, innerH]);
  const inv = useCallback((px, py) => {
    if (!v) return null;
    const tx = (px - PAD.left) / innerW, ty = 1 - (py - PAD.top) / innerH;
    const x = xLog ? 10 ** (Math.log10(v.x0) + tx * (Math.log10(v.x1) - Math.log10(v.x0))) : v.x0 + tx * (v.x1 - v.x0);
    const y = yLog ? 10 ** (Math.log10(v.y0) + ty * (Math.log10(v.y1) - Math.log10(v.y0))) : v.y0 + ty * (v.y1 - v.y0);
    return { x, y };
  }, [v, xLog, yLog, innerW, innerH]);

  const frontier = useMemo(() => showPareto ? paretoFrontier(valid, { maxX: mx, maxY: my }) : [], [valid, mx, my, showPareto]);
  const frontierIds = useMemo(() => new Set(frontier.map(p => p.id)), [frontier]);
  const zone = useMemo(() => showZone ? bestValueZone(valid, { maxX: mx, maxY: my }) : null, [valid, mx, my, showZone]);

  const xTicks = v ? niceTicks(v.x0, v.x1, width < 480 ? 3 : 5, xLog) : [];
  const yTicks = v ? niceTicks(v.y0, v.y1, 5, yLog) : [];

  // ── interaction ──
  const onWheel = e => {
    if (!v) return;
    e.preventDefault();
    const rect = wrapRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const c = inv(px, py); if (!c) return;
    const f = e.deltaY > 0 ? 1.18 : 1 / 1.18;
    const zoomAxis = (lo, hi, at, log) => {
      if (log) { const L = Math.log10; const a = L(lo) + (L(at) - L(lo)) * (1 - f), b = L(hi) - (L(hi) - L(at)) * (1 - f); return [10 ** a, 10 ** b]; }
      return [at - (at - lo) * f, at + (hi - at) * f];
    };
    const [x0, x1] = zoomAxis(v.x0, v.x1, c.x, xLog);
    const [y0, y1] = zoomAxis(v.y0, v.y1, c.y, yLog);
    setView({ x0, x1, y0, y1 });
  };
  const onPointerDown = e => {
    if (e.button !== 0) return;
    dragRef.current = { px: e.clientX, py: e.clientY, view: v, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = e => {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (dragRef.current && v) {
      const d = dragRef.current;
      const dx = e.clientX - d.px, dy = e.clientY - d.py;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      if (d.moved) {
        const shift = (lo, hi, dpx, size, log) => {
          if (log) { const L = Math.log10; const k = (L(hi) - L(lo)) * dpx / size; return [10 ** (L(lo) - k), 10 ** (L(hi) - k)]; }
          const k = (hi - lo) * dpx / size; return [lo - k, hi - k];
        };
        const [x0, x1] = shift(d.view.x0, d.view.x1, dx, innerW, xLog);
        const [y0, y1] = shift(d.view.y0, d.view.y1, -dy, innerH, yLog);
        setView({ x0, x1, y0, y1 });
        return;
      }
    }
    // nearest point within 18px
    let best = null, bd = 18 * 18;
    for (const p of valid) {
      const dx = sx(p.x) - px, dy = sy(p.y) - py;
      const dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = p; }
    }
    setHover(best ? { p: best, px: sx(best.x), py: sy(best.y) } : null);
  };
  const onPointerUp = e => {
    const d = dragRef.current; dragRef.current = null;
    if (d && !d.moved && hover && onSelect) onSelect(hover.p);
  };

  useEffect(() => { setView(null); }, [xKey, yKey, xLog, yLog]);

  const isLight = typeof document !== 'undefined' && !document.documentElement.classList.contains('dark');
  const dim = highlight && highlight.size > 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', userSelect: 'none', fontFamily: SF }}>
      {/* Controls */}
      <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4, zIndex: 2 }}>
        {view && <button onClick={() => setView(null)} className="aiwar-press-btn" style={ctlBtn}>Reset</button>}
        <button onClick={() => onWheel({ preventDefault() {}, clientX: wrapRef.current.getBoundingClientRect().left + width / 2, clientY: wrapRef.current.getBoundingClientRect().top + height / 2, deltaY: -1 })} className="aiwar-press-btn" style={ctlBtn} aria-label="Zoom in">+</button>
        <button onClick={() => onWheel({ preventDefault() {}, clientX: wrapRef.current.getBoundingClientRect().left + width / 2, clientY: wrapRef.current.getBoundingClientRect().top + height / 2, deltaY: 1 })} className="aiwar-press-btn" style={ctlBtn} aria-label="Zoom out">−</button>
      </div>

      {!valid.length ? (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, border: '0.5px dashed var(--sep)' }}>{emptyText}</div>
      ) : (
        <svg width={width} height={height} style={{ display: 'block', cursor: dragRef.current ? 'grabbing' : 'crosshair', touchAction: 'none' }}
          onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={() => { setHover(null); dragRef.current = null; }}
          onDoubleClick={() => setView(null)}>
          <defs>
            <clipPath id="aiwar-scatter-clip"><rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} /></clipPath>
          </defs>

          {/* Grid + ticks */}
          {yTicks.map(t => (
            <g key={`y${t}`}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={sy(t)} y2={sy(t)} stroke="var(--sep2)" strokeWidth="1" />
              <text x={PAD.left - 8} y={sy(t) + 3} textAnchor="end" fontSize="10" fontFamily={MONO} fill="var(--muted2)">{fmtTick(yKey, t)}</text>
            </g>
          ))}
          {xTicks.map(t => (
            <g key={`x${t}`}>
              <line y1={PAD.top} y2={PAD.top + innerH} x1={sx(t)} x2={sx(t)} stroke="var(--sep2)" strokeWidth="1" />
              <text y={PAD.top + innerH + 16} x={sx(t)} textAnchor="middle" fontSize="10" fontFamily={MONO} fill="var(--muted2)">{fmtTick(xKey, t)}</text>
            </g>
          ))}
          <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} fill="none" stroke="var(--sep)" strokeWidth="0.5" />

          {/* Axis titles */}
          <text x={PAD.left + innerW / 2} y={height - 8} textAnchor="middle" fontSize="10" fontFamily={MONO} fill="var(--muted)" letterSpacing="0.08em">{xm.label.toUpperCase()}{xLog ? ' · LOG' : ''} {mx ? '→' : '←'}</text>
          <text transform={`translate(12 ${PAD.top + innerH / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fontFamily={MONO} fill="var(--muted)" letterSpacing="0.08em">{ym.label.toUpperCase()} {my ? '→' : '←'}</text>

          <g clipPath="url(#aiwar-scatter-clip)">
            {/* Best-value zone */}
            {zone && (
              <g>
                <rect x={Math.min(sx(zone.x0), sx(zone.x1))} y={Math.min(sy(zone.y0), sy(zone.y1))}
                  width={Math.abs(sx(zone.x1) - sx(zone.x0))} height={Math.abs(sy(zone.y1) - sy(zone.y0))}
                  fill={GREEN} fillOpacity="0.07" stroke={GREEN} strokeOpacity="0.5" strokeDasharray="3 3" strokeWidth="1" />
                <text x={Math.min(sx(zone.x0), sx(zone.x1)) + 6} y={Math.min(sy(zone.y0), sy(zone.y1)) + 12} fontSize="9" fontFamily={MONO} fill={GREEN} letterSpacing="0.1em">BEST VALUE ZONE</text>
              </g>
            )}
            {/* Pareto frontier */}
            {frontier.length > 1 && (
              <polyline points={frontier.map(p => `${sx(p.x)},${sy(p.y)}`).join(' ')} fill="none" stroke="var(--text)" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="5 4" />
            )}
            {/* Points */}
            {valid.map(p => {
              const color = p.color ?? ORG_CONFIG[p.org]?.color ?? '#8E8E93';
              const isSel = selected?.has(p.id);
              const isHi = highlight?.has(p.id);
              const onF = frontierIds.has(p.id);
              const r = p.r ?? (onF ? 5.5 : 4);
              const faded = dim && !isHi && !isSel;
              const strokeColor = color.toLowerCase() === '#ffffff' ? (isLight ? '#000' : '#fff') : color;
              return (
                <g key={p.id} style={{ transition: `opacity 300ms ${EASE}` }} opacity={faded ? 0.18 : 1}>
                  {(isSel || isHi) && <circle cx={sx(p.x)} cy={sy(p.y)} r={r + 6} fill={strokeColor} fillOpacity="0.18" />}
                  <circle cx={sx(p.x)} cy={sy(p.y)} r={isSel ? r + 1.5 : r} fill={strokeColor} fillOpacity={onF || isSel ? 1 : 0.8} stroke="var(--card)" strokeWidth="1.2" />
                  {isSel && <circle cx={sx(p.x)} cy={sy(p.y)} r={r + 3} fill="none" stroke="var(--text)" strokeWidth="1" />}
                </g>
              );
            })}
            {/* Labels for frontier / selected points */}
            {showLabels && valid.filter(p => frontierIds.has(p.id) || selected?.has(p.id) || (p.label && !dim)).slice(0, 40).map(p => (
              <text key={`l${p.id}`} x={sx(p.x) + 8} y={sy(p.y) - 6} fontSize="10" fontFamily={SF} fontWeight="600" fill="var(--text)" opacity={dim && !highlight.has(p.id) && !selected?.has(p.id) ? 0.25 : 0.9}
                style={{ paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 3, strokeLinejoin: 'round' }}>{p.name}</text>
            ))}
            {/* Hover crosshair */}
            {hover && (
              <g pointerEvents="none">
                <line x1={hover.px} x2={hover.px} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--text)" strokeOpacity="0.2" strokeWidth="1" />
                <line y1={hover.py} y2={hover.py} x1={PAD.left} x2={PAD.left + innerW} stroke="var(--text)" strokeOpacity="0.2" strokeWidth="1" />
                <circle cx={hover.px} cy={hover.py} r={8} fill="none" stroke="var(--text)" strokeWidth="1" />
              </g>
            )}
          </g>
        </svg>
      )}

      {/* Tooltip */}
      {hover && (
        <div style={{
          position: 'absolute', left: Math.min(width - 230, Math.max(0, hover.px + 14)), top: Math.max(0, hover.py - 10),
          transform: hover.py > height * 0.6 ? 'translateY(-100%)' : 'none',
          pointerEvents: 'none', zIndex: 3, width: 220, background: 'var(--card)', border: '0.5px solid var(--text)',
          padding: '10px 12px', boxShadow: 'var(--shadow)', animation: `aiwar-fade-in 120ms ${EASE} both`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <LabLogo org={hover.p.org} size={14} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hover.p.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{hover.p.org}{frontierIds.has(hover.p.id) ? ' · Pareto frontier' : inZone(hover.p, zone) ? ' · Best value zone' : ''}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px', fontSize: 11.5 }}>
            <Label>{xm.short}</Label><span style={{ fontFamily: MONO, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMetric(xKey, hover.p.x)}</span>
            <Label>{ym.short}</Label><span style={{ fontFamily: MONO, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMetric(yKey, hover.p.y)}</span>
            {tooltipExtra && tooltipExtra(hover.p).map(([k, val]) => (
              <span key={k} style={{ display: 'contents' }}><Label>{k}</Label><span style={{ fontFamily: MONO, color: 'var(--muted)', textAlign: 'right' }}>{val}</span></span>
            ))}
          </div>
          {onSelect && <div style={{ marginTop: 6, fontSize: 9.5, color: 'var(--muted2)', fontFamily: MONO, letterSpacing: '0.06em' }}>CLICK TO SELECT</div>}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {showPareto && <span style={{ fontSize: 10, fontFamily: MONO, color: 'var(--muted)', letterSpacing: '0.06em' }}><span style={{ display: 'inline-block', width: 18, borderTop: '1px dashed var(--text)', verticalAlign: 'middle', marginRight: 6, opacity: 0.6 }} />PARETO FRONTIER</span>}
          {showZone && zone && <span style={{ fontSize: 10, fontFamily: MONO, color: 'var(--muted)', letterSpacing: '0.06em' }}><span style={{ display: 'inline-block', width: 12, height: 8, background: `${GREEN}22`, border: `1px dashed ${GREEN}88`, verticalAlign: 'middle', marginRight: 6 }} />BEST VALUE ZONE</span>}
        </div>
        <span style={{ fontSize: 10, fontFamily: MONO, color: 'var(--muted2)', letterSpacing: '0.04em' }}>{valid.length} MODELS · SCROLL TO ZOOM · DRAG TO PAN</span>
      </div>
    </div>
  );
}

const ctlBtn = {
  height: 24, minWidth: 24, paddingInline: 8, background: 'var(--card)', color: 'var(--text)', border: '0.5px solid var(--sep)',
  cursor: 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 700,
};
