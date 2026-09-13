// ─── ScatterChart — the war room's positioning plot ─────────────────────────
// Pure SVG, no chart library. Solid hairline grid on nice ticks, MONO ticks,
// one dot per model in its lab's colour with a surface ring, the Pareto
// frontier as a thin solid step line, direct labels only for the frontier
// and the selection, nearest-point hover with a crosshair and one tooltip,
// wheel/drag zoom, and a lab legend that focuses one lab at a time.
// Points: { id, name, org, x, y, color?, r?, label? }.

import { useEffect, useId, useMemo, useRef, useState, useCallback } from 'react';
import { MONO, SF, EASE } from '../design.jsx';
import { LabLogo } from '../LabLogo.jsx';
import { ORG_CONFIG } from '../../models-data.js';
import { metric, isNum, fmtMetric } from '../../../shared/metrics.js';
import { paretoFrontier } from '../../../shared/pareto.js';
import { Label } from '../ui.jsx';
import { niceTicks, fmtTick, labColor } from './scale.js';

const PAD = { top: 22, right: 22, bottom: 46, left: 60 };
const HIT = 24; // px — the hit area is bigger than the mark

/** Greedy label placement: keep each label off the ones already placed and inside the plot. */
function placeLabels(pts, sx, sy, plotLeft, plotRight, plotTop, plotBottom) {
  const placed = [];
  const out = new Map();
  const ordered = [...pts].sort((a, b) => sy(a.y) - sy(b.y));
  for (const p of ordered) {
    const w = p.name.length * 6 + 4, h = 12;
    const px = sx(p.x), py = sy(p.y);
    const cands = [[px + 9, py - 5], [px + 9, py + 13], [px - 9 - w, py - 5], [px - 9 - w, py + 13], [px - w / 2, py - 12], [px - w / 2, py + 20]];
    let pick = null;
    for (const [x, y] of cands) {
      if (x < plotLeft - 2 || x + w > plotRight + 4 || y - h < plotTop - 2 || y > plotBottom + 2) continue;
      if (!placed.some(b => x < b.x + b.w && x + w > b.x && y - h < b.y && y > b.y - b.h)) { pick = { x, y }; break; }
    }
    if (!pick) continue;
    placed.push({ x: pick.x, y: pick.y, w, h });
    out.set(p.id, pick);
  }
  return out;
}

export default function ScatterChart({
  points, xKey, yKey, xLog = false, yLog = false,
  maxX = null, maxY = null,               // direction for the frontier; default from the metric registry
  showPareto = true, showLabels = true, legend = true,
  highlight = null,                       // Set<id>
  selected = null,                        // Set<id>
  onSelect, height = 420, tooltipExtra, emptyText = 'No points with both values',
}) {
  const wrapRef = useRef(null);
  const clipId = `aiwar-clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState(null);
  const [view, setView] = useState(null);   // { x0, x1, y0, y1 } in data space, null = fit
  const [labFocus, setLabFocus] = useState(null);
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
  const xTicks = v ? niceTicks(v.x0, v.x1, width < 480 ? 3 : 5, xLog) : [];
  const yTicks = v ? niceTicks(v.y0, v.y1, 5, yLog) : [];

  // Lab legend: the labs with the most points on the plot; click one to focus it.
  const labs = useMemo(() => {
    const c = new Map();
    for (const p of valid) if (p.org) c.set(p.org, (c.get(p.org) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [valid]);
  const focusSet = useMemo(() => (labFocus ? new Set(valid.filter(p => p.org === labFocus).map(p => p.id)) : null), [labFocus, valid]);
  const hi = focusSet ?? highlight;
  const dim = !!(hi && hi.size > 0);
  useEffect(() => { setView(null); setLabFocus(null); }, [xKey, yKey, xLog, yLog]);

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
  const zoomAt = dir => {
    const r = wrapRef.current.getBoundingClientRect();
    onWheel({ preventDefault() {}, clientX: r.left + width / 2, clientY: r.top + height / 2, deltaY: dir });
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
    // nearest point within the hit radius; a focused / highlighted point wins a tie
    let best = null, bd = HIT * HIT;
    for (const p of valid) {
      const dx = sx(p.x) - px, dy = sy(p.y) - py;
      const dd = dx * dx + dy * dy + (dim && !hi.has(p.id) ? 40 : 0);
      if (dd < bd) { bd = dd; best = p; }
    }
    setHover(best ? { p: best, px: sx(best.x), py: sy(best.y) } : null);
  };
  const onPointerUp = () => {
    const d = dragRef.current; dragRef.current = null;
    if (d && !d.moved && hover && onSelect) onSelect(hover.p);
  };

  const colorOf = p => p.color ?? labColor(p.org, ORG_CONFIG, '#8E8E93');
  const plotL = PAD.left, plotR = PAD.left + innerW, plotT = PAD.top, plotB = PAD.top + innerH;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', userSelect: 'none', fontFamily: SF }}>
      {/* Controls */}
      <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 3, zIndex: 2 }}>
        {view && <button onClick={() => setView(null)} className="aiwar-press-btn" style={ctlBtn}>Reset</button>}
        <button onClick={() => zoomAt(-1)} className="aiwar-press-btn" style={ctlBtn} aria-label="Zoom in">+</button>
        <button onClick={() => zoomAt(1)} className="aiwar-press-btn" style={ctlBtn} aria-label="Zoom out">−</button>
      </div>

      {!valid.length ? (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, border: '0.5px dashed var(--sep)', textAlign: 'center', padding: 20 }}>{emptyText}</div>
      ) : (
        <svg width={width} height={height} style={{ display: 'block', cursor: dragRef.current ? 'grabbing' : 'crosshair', touchAction: 'none' }}
          onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={() => { setHover(null); dragRef.current = null; }}
          onDoubleClick={() => setView(null)}>
          <defs>
            <clipPath id={clipId}><rect x={plotL} y={plotT} width={innerW} height={innerH} /></clipPath>
          </defs>

          {/* Grid + ticks — solid hairlines, one step off the surface */}
          {yTicks.map(t => (
            <g key={`y${t}`}>
              <line x1={plotL} x2={plotR} y1={sy(t)} y2={sy(t)} stroke="var(--sep2)" strokeWidth="1" />
              <text x={plotL - 8} y={sy(t) + 3} textAnchor="end" fontSize="10" fontFamily={MONO} fill="var(--muted2)">{fmtTick(yKey, t)}</text>
            </g>
          ))}
          {xTicks.map(t => (
            <g key={`x${t}`}>
              <line y1={plotT} y2={plotB} x1={sx(t)} x2={sx(t)} stroke="var(--sep2)" strokeWidth="1" />
              <text y={plotB + 16} x={sx(t)} textAnchor="middle" fontSize="10" fontFamily={MONO} fill="var(--muted2)">{fmtTick(xKey, t)}</text>
            </g>
          ))}
          <line x1={plotL} x2={plotR} y1={plotB} y2={plotB} stroke="var(--sep)" strokeWidth="1" />
          <line x1={plotL} x2={plotL} y1={plotT} y2={plotB} stroke="var(--sep)" strokeWidth="1" />

          {/* Axis titles, and which way is good */}
          <text x={plotL + innerW / 2} y={height - 8} textAnchor="middle" fontSize="10" fontFamily={MONO} fill="var(--muted)" letterSpacing="0.08em">{xm.label.toUpperCase()}{xLog ? ' · LOG' : ''}</text>
          {width >= 480 && <text x={mx ? plotR : plotL} y={height - 8} textAnchor={mx ? 'end' : 'start'} fontSize="9" fontFamily={MONO} fill="var(--muted2)" letterSpacing="0.1em">{mx ? 'BETTER →' : '← BETTER'}</text>}
          <text transform={`translate(12 ${plotT + innerH / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fontFamily={MONO} fill="var(--muted)" letterSpacing="0.08em">{ym.label.toUpperCase()}{yLog ? ' · LOG' : ''}</text>
          <text x={plotL + 6} y={my ? plotT + 11 : plotB - 6} fontSize="9" fontFamily={MONO} fill="var(--muted2)" letterSpacing="0.1em">{my ? '▲ BETTER' : '▼ BETTER'}</text>

          <g clipPath={`url(#${clipId})`}>
            {/* Pareto frontier — a thin solid step line */}
            {frontier.length > 1 && (
              <polyline points={frontier.map(p => `${sx(p.x)},${sy(p.y)}`).join(' ')} fill="none" stroke="var(--text)" strokeOpacity="0.38" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
            )}
            {/* Points — lab colour, surface ring */}
            {valid.map(p => {
              const color = colorOf(p);
              const isSel = selected?.has(p.id);
              const isHi = hi?.has(p.id);
              const onF = frontierIds.has(p.id);
              const r = p.r ?? (onF ? 5 : 4);
              const faded = dim && !isHi && !isSel;
              return (
                <g key={p.id} style={{ transition: `opacity 300ms ${EASE}` }} opacity={faded ? 0.14 : 1}>
                  {(isSel || (isHi && dim)) && <circle cx={sx(p.x)} cy={sy(p.y)} r={r + 5} fill={color} fillOpacity="0.18" />}
                  <circle cx={sx(p.x)} cy={sy(p.y)} r={isSel ? r + 1.5 : r} fill={color} fillOpacity={onF || isSel || isHi ? 1 : 0.85} stroke="var(--card)" strokeWidth="2" />
                  {isSel && <circle cx={sx(p.x)} cy={sy(p.y)} r={r + 4} fill="none" stroke="var(--text)" strokeWidth="1" />}
                </g>
              );
            })}
            {/* Direct labels — only the frontier, the selection and a focused lab */}
            {showLabels && (() => {
              const lab = valid.filter(p => frontierIds.has(p.id) || selected?.has(p.id) || (dim && hi.has(p.id)) || (p.label && !dim)).slice(0, 48);
              const pos = placeLabels(lab, sx, sy, plotL, plotR, plotT, plotB);
              return lab.filter(p => pos.has(p.id)).map(p => {
                const { x, y } = pos.get(p.id);
                const faded = dim && !hi.has(p.id) && !selected?.has(p.id);
                return (
                  <text key={`l${p.id}`} x={x} y={y} fontSize="10.5" fontFamily={SF} fontWeight="600" fill="var(--text)" opacity={faded ? 0.2 : 0.92}
                    style={{ paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 3, strokeLinejoin: 'round' }}>{p.name}</text>
                );
              });
            })()}
            {/* Hover crosshair */}
            {hover && (
              <g pointerEvents="none">
                <line x1={hover.px} x2={hover.px} y1={plotT} y2={plotB} stroke="var(--text)" strokeOpacity="0.18" strokeWidth="1" />
                <line y1={hover.py} y2={hover.py} x1={plotL} x2={plotR} stroke="var(--text)" strokeOpacity="0.18" strokeWidth="1" />
                <circle cx={hover.px} cy={hover.py} r={9} fill="none" stroke="var(--text)" strokeWidth="1" />
              </g>
            )}
          </g>
        </svg>
      )}

      {/* Tooltip — the value leads, the label follows */}
      {hover && (
        <div className="aiwar-chart-tip" style={{
          left: Math.min(width - 224, Math.max(0, hover.px + 14)), top: Math.max(0, hover.py - 10),
          transform: hover.py > height * 0.6 ? 'translateY(-100%)' : 'none', animation: `aiwar-fade-in 120ms ${EASE} both`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <LabLogo org={hover.p.org} size={14} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hover.p.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{hover.p.org}{frontierIds.has(hover.p.id) ? ' · on the Pareto frontier' : ''}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 10px', fontSize: 11.5, alignItems: 'baseline' }}>
            <Label>{xm.short}</Label><span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMetric(xKey, hover.p.x)}</span>
            <Label>{ym.short}</Label><span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMetric(yKey, hover.p.y)}</span>
            {tooltipExtra && tooltipExtra(hover.p).map(([k, val]) => (
              <span key={k} style={{ display: 'contents' }}><Label>{k}</Label><span style={{ fontFamily: MONO, fontSize: 11.5, color: 'var(--muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{val}</span></span>
            ))}
          </div>
          {onSelect && <div style={{ marginTop: 6, fontSize: 9, color: 'var(--muted2)', fontFamily: MONO, letterSpacing: '0.08em' }}>CLICK TO SELECT</div>}
        </div>
      )}

      {/* Legend — labs on the plot (click to focus) and the frontier key */}
      {valid.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {legend && labs.map(([org, n]) => {
              const on = labFocus === org;
              return (
                <button key={org} type="button" onClick={() => setLabFocus(on ? null : org)} className="aiwar-legend-btn" title={`${n} model${n === 1 ? '' : 's'} · click to focus`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, paddingInline: 7, cursor: 'pointer',
                  background: on ? 'var(--text)' : 'transparent', color: on ? 'var(--bg)' : 'var(--muted)', border: `0.5px solid ${on ? 'var(--text)' : 'var(--sep)'}`,
                  fontFamily: SF, fontSize: 11, fontWeight: 500, letterSpacing: '-0.01em', opacity: labFocus && !on ? 0.55 : 1,
                }}>
                  <span data-round="1" style={{ width: 7, height: 7, background: labColor(org, ORG_CONFIG), flexShrink: 0 }} />{org}<span style={{ fontFamily: MONO, fontSize: 9.5, opacity: 0.6 }}>{n}</span>
                </button>
              );
            })}
            {showPareto && frontier.length > 1 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: MONO, color: 'var(--muted)', letterSpacing: '0.05em', marginLeft: 6 }}>
                <span aria-hidden style={{ width: 16, borderTop: '1.5px solid var(--text)', opacity: 0.5 }} />PARETO FRONTIER
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, fontFamily: MONO, color: 'var(--muted2)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            {valid.length} MODELS{width >= 560 ? ' · SCROLL TO ZOOM · DRAG TO PAN' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

const ctlBtn = {
  height: 24, minWidth: 24, paddingInline: 8, background: 'var(--card)', color: 'var(--text)', border: '0.5px solid var(--sep)',
  cursor: 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 700,
};
