// ─── Highlights — ranked bars, readable from across the room ────────────────
// One panel per metric. Every row is: rank · lab mark · name · a bar in the
// lab's colour on a hairline grid · the value · the gap to the leader. Names
// read left-to-right (never rotated), the leader is emphasised, and the
// axis is printed under the bars so a zoomed scale is never a secret. Flat,
// hairline, no chart library. The same panel draws the three-across
// highlight row, the full-width sections of a rankings page (`wide` → two
// columns of ten) and, with `flat`, a bare list inside another card.

import { useEffect, useMemo, useState } from 'react';
import { MONO, SF, EASE } from './design.jsx';
import { LabLogo } from './LabLogo.jsx';
import { ORG_CONFIG } from '../models-data.js';
import { isNum } from '../../shared/metrics.js';
import { GREEN, GOLD } from './ui.jsx';
import { fmtCompactNum as fmtNum, labColor } from './charts/scale.js';

/**
 * items: [{ id, name, org?, value, label, parts?: [{ value, opacity }], tag?, color? }]
 *   parts — stacked segments (e.g. input + output price); `value` is the total.
 *   tag   — a small node drawn after the name (a badge).
 * Items arrive best-first. Bars are proportional to `value` (also for
 * lower-is-better metrics, as on every benchmark site — the header says
 * which way is good). When every value sits in a narrow band (ELO:
 * 1493–1506) the axis starts below the smallest bar instead of at zero,
 * and the printed axis says so.
 *
 * emphasis — a Set of ids; when given, every other row is greyed back.
 * flat     — no card surface or padding (for embedding inside a panel).
 */
export function BarPanel({ title, color = 'var(--text)', subtitle, items, higherIsBetter = true, mobile, onSelect, badge, limit, wide = false, baseline = 'auto', note, fmtDelta, emphasis = null, flat = false, barColor: fixedColor, rank = true, gap = true }) {
  const list = useMemo(() => items.filter(i => isNum(i.value)).slice(0, limit ?? (mobile ? 8 : 10)), [items, limit, mobile]);
  const [hover, setHover] = useState(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });
  useEffect(() => { setHover(null); }, [list]);

  const values = list.map(i => i.value);
  const max = Math.max(...values, 0) || 1;
  const min = Math.min(...values);
  let base = 0;
  if (baseline === 'auto' && list.length > 1 && min > 0 && min / max > 0.8) base = min - (max - min) * 0.9;
  else if (isNum(baseline)) base = baseline;
  const span = Math.max(max - base, 1e-9);
  const leader = list[0]?.value;
  const truncated = base > 0;

  const delta = (it, i) => {
    if (i === 0 || !isNum(leader)) return '';
    if (fmtDelta) return fmtDelta(it.value, leader);
    if (higherIsBetter) { const d = it.value - leader; return d === 0 ? '=' : `−${fmtNum(Math.abs(d))}`; }
    const r = it.value / leader;
    return r <= 1.005 ? '=' : `${r >= 10 ? Math.round(r) : +r.toFixed(1)}×`;
  };

  const twoCol = wide && !mobile && list.length > 10;
  const columns = twoCol ? [list.slice(0, Math.ceil(list.length / 2)), list.slice(Math.ceil(list.length / 2))] : [list];
  const nameW = mobile ? 112 : twoCol ? 150 : wide ? 210 : 108;
  const rowH = mobile ? 28 : 30;
  // the gap-to-leader column only fits the wide layout; compact panels keep it in the tooltip
  const showDelta = !mobile && gap && wide;
  const grid = `${rank ? '20px ' : ''}16px ${nameW}px minmax(56px, 1fr) ${mobile ? 54 : wide ? 64 : 56}px${showDelta ? ' 40px' : ''}`;
  const onMove = e => { const r = e.currentTarget.getBoundingClientRect(); setTip({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }); };
  const isDim = it => !!(emphasis && emphasis.size > 0 && !emphasis.has(it.id));

  const body = !list.length ? (
    <div style={{ height: rowH * 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--muted2)', fontFamily: MONO }}>N/A</div>
  ) : (
    <div style={{ display: 'grid', gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr', gap: twoCol ? 28 : 0 }}>
      {columns.map((col, ci) => (
        <div key={ci}>
          {col.map((it, k) => {
            const i = ci * columns[0].length + k;
            const w = Math.max(0.012, (it.value - base) / span);
            const parts = it.parts?.length ? it.parts : null;
            const lead = i === 0;
            const on = hover === it;
            const c = fixedColor ?? it.color ?? labColor(it.org, ORG_CONFIG, color);
            const faded = isDim(it);
            return (
              <button key={it.id ?? i} type="button" onClick={onSelect ? () => onSelect(it) : undefined} onMouseEnter={() => setHover(it)}
                className="aiwar-rb-row" data-click={onSelect ? '1' : '0'} data-dim={faded ? '1' : '0'}
                style={{ gridTemplateColumns: grid, columnGap: 8, height: rowH, fontFamily: SF }}>
                {rank && <span style={{ fontFamily: MONO, fontSize: 10.5, color: lead ? 'var(--text)' : 'var(--muted2)', fontWeight: lead ? 700 : 500, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>}
                <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center', alignItems: 'center' }}>
                  {it.org ? <LabLogo org={it.org} size={13} /> : <span aria-hidden style={{ width: 7, height: 7, background: c, opacity: faded ? 0.35 : 1 }} />}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span title={it.name} style={{ fontSize: mobile ? 12 : 12.5, fontWeight: lead ? 700 : 500, color: faded ? 'var(--muted)' : lead ? 'var(--text)' : 'var(--text2)', letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{it.name}</span>
                  {it.tag}
                </span>
                <span className="aiwar-rb-plot" aria-hidden style={{ height: rowH }}>
                  {parts ? parts.map((p, pi) => {
                    const left = parts.slice(0, pi).reduce((s, q) => s + q.value, 0);
                    const l = ((left - (pi === 0 ? base : 0)) / span) * 100, pw = (p.value / span) * 100;
                    return <span key={pi} className="aiwar-rb-bar" style={{ left: `calc(${l}% + ${pi ? 2 : 0}px)`, width: `calc(${pw}% - ${pi ? 2 : 0}px)`, background: c, opacity: (p.opacity ?? 1) * (lead || on ? 1 : 0.78), animationDelay: `${Math.min(i, 24) * 25}ms` }} />;
                  }) : (
                    <span className="aiwar-rb-bar" style={{ width: `${w * 100}%`, background: c, opacity: lead || on ? 1 : 0.78, animationDelay: `${Math.min(i, 24) * 25}ms` }} />
                  )}
                </span>
                <span style={{ fontFamily: MONO, fontSize: mobile ? 11.5 : 12.5, fontWeight: lead ? 700 : 600, color: faded ? 'var(--muted)' : 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{it.label}</span>
                {showDelta && <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{delta(it, i)}</span>}
              </button>
            );
          })}
          {/* Axis — printed under the bars, always */}
          <div style={{ display: 'grid', gridTemplateColumns: grid, columnGap: 8, marginTop: 4 }}>
            {rank && <span />}<span /><span />
            <span className="aiwar-rb-axis" style={{ fontFamily: MONO, borderTop: '1px solid var(--sep)' }}>
              <span style={{ left: 0 }}>{truncated ? `⫽ ${fmtNum(base)}` : '0'}</span>
              {wide && !twoCol && <span style={{ left: '50%', transform: 'translateX(-50%)' }}>{fmtNum(base + span / 2)}</span>}
              <span style={{ right: 0 }}>{fmtNum(max)}</span>
            </span>
            <span />{showDelta && <span />}
          </div>
        </div>
      ))}
    </div>
  );

  const notes = [
    truncated ? `Axis starts at ${fmtNum(base)} so small gaps stay visible` : null,
    note ?? (truncated && showDelta ? 'grey figure = gap to #1' : null),
  ].filter(Boolean);
  const pad = flat ? 0 : mobile ? '14px 12px 12px' : wide ? '18px 20px 14px' : '16px 16px 12px';

  return (
    <div className={flat ? undefined : 'aiwar-surface'} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ padding: pad, minWidth: 0, fontFamily: SF, position: 'relative' }}>
      {(title || subtitle || badge) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            {title && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, maxWidth: '100%' }}>
                <span aria-hidden style={{ width: 8, height: 8, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: mobile ? 15 : wide ? 17 : 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.025em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
              </span>
            )}
            {subtitle && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, letterSpacing: '-0.005em' }}>{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {badge}
            <span title={higherIsBetter ? 'Higher values rank first' : 'Lower values rank first'} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 20, paddingInline: 7, border: '0.5px solid var(--sep)', fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              <span style={{ color: higherIsBetter ? GREEN : GOLD }}>{higherIsBetter ? '▲' : '▼'}</span>{higherIsBetter ? 'higher wins' : 'lower wins'}
            </span>
          </div>
        </div>
      )}

      {body}

      {notes.length > 0 && (
        <div style={{ fontSize: 10.5, color: 'var(--muted2)', fontFamily: MONO, marginTop: 8, lineHeight: 1.5 }}>{notes.join(' · ')}</div>
      )}

      {/* Tooltip — value first, identity second */}
      {hover && !mobile && (
        <div className="aiwar-chart-tip" style={{ left: Math.min((tip.w ?? 400) - 224, Math.max(0, tip.x + 14)), top: tip.y + 14, animation: `aiwar-fade-in 120ms ${EASE} both` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            {hover.org && <LabLogo org={hover.org} size={13} />}
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hover.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{hover.label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{hover.org ?? ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted2)', fontFamily: MONO, marginTop: 4 }}>
            <span>#{list.indexOf(hover) + 1} of {list.length}</span>
            <span>{list.indexOf(hover) === 0 ? 'leader' : `${delta(hover, list.indexOf(hover))} vs #1`}</span>
          </div>
          {onSelect && <div style={{ marginTop: 5, fontSize: 9, color: 'var(--muted2)', fontFamily: MONO, letterSpacing: '0.08em' }}>CLICK TO OPEN</div>}
        </div>
      )}
    </div>
  );
}

/** A row of panels; three across on desktop, stacked on phones. */
export function HighlightGrid({ children, mobile, cols = 3 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : `repeat(${cols}, minmax(0, 1fr))`, gap: 12 }}>
      {children}
    </div>
  );
}

/** Section frame for a rankings page: eyebrow, big title, one line of copy, the chart. */
export function ChartSection({ id, eyebrow, title, sub, action, mobile, children }) {
  return (
    <section id={id} data-section={id} style={{ marginTop: mobile ? 40 : 60, scrollMarginTop: 110 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          {eyebrow && <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 6px', fontFamily: MONO }}>{eyebrow}</p>}
          <h2 style={{ fontSize: mobile ? 24 : 32, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', margin: 0, lineHeight: 1.05 }}>{title}</h2>
          {sub && <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '6px 0 0', lineHeight: 1.5, maxWidth: 680 }}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ─── SectionNav — the page's table of contents, stuck under the nav ─────
   Programmatic scroll, never a hash link: the router owns the hash. */
export function SectionNav({ sections, mobile }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + 130;
      let cur = sections[0]?.id;
      for (const s of sections) { const el = document.getElementById(s.id); if (el && el.offsetTop <= y) cur = s.id; }
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);
  const go = id => { const el = document.getElementById(id); if (!el) return; window.scrollTo({ top: el.offsetTop - 96, behavior: 'smooth' }); };
  return (
    <div style={{ position: 'sticky', top: mobile ? 50 : 79, zIndex: 40, margin: mobile ? '0 -16px' : 0, background: 'var(--nav)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '0.5px solid var(--sep)', borderTop: '0.5px solid var(--sep)' }}>
      <div className="aiwar-strip" style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingInline: mobile ? 8 : 4, scrollbarWidth: 'none' }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => go(s.id)} style={{ height: 36, paddingInline: 11, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, position: 'relative', fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: active === s.id ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', transition: 'color 150ms' }}>
            {s.label}
            <span aria-hidden style={{ position: 'absolute', left: 11, right: 11, bottom: 0, height: 2, background: 'var(--accent)', transform: active === s.id ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left', transition: `transform 300ms ${EASE}` }} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default BarPanel;
