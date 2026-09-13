// ─── Highlights — the numbers as bars, readable from across the room ────────
// One panel per metric: the value inside the bar, the lab mark and the
// model under it. Bars are the lab's colour, so a glance at the row says
// who is winning before a single name is read. Flat, hairline, no chart
// library. The same panel draws the three-across highlight row and the
// full-width sections of a rankings page (`wide`).

import { useEffect, useState } from 'react';
import { MONO, SF, EASE } from './design.jsx';
import { LabLogo } from './LabLogo.jsx';
import { ORG_CONFIG } from '../models-data.js';
import { isNum } from '../../shared/metrics.js';

const barColor = org => {
  const c = ORG_CONFIG[org]?.color ?? '#8E8E93';
  return c === '#FFFFFF' ? 'var(--text)' : c;
};
const inkOn = org => (ORG_CONFIG[org]?.color === '#FFFFFF' ? 'var(--bg)' : '#fff');

const short = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s ?? '');

/**
 * items: [{ id, name, org, value, label, parts?: [{ value, opacity }] }]
 *   parts — stacked segments (e.g. input + output price); `value` is the total.
 * Bars are proportional to `value` (also for lower-is-better metrics, as on
 * every benchmark site — the subtitle says which way is good). When every
 * value sits in a narrow band (ELO: 1493–1506) the axis starts below the
 * smallest bar instead of at zero, or the chart would be ten equal columns.
 */
export function BarPanel({ title, color = 'var(--text)', subtitle, items, higherIsBetter = true, mobile, onSelect, badge, height, limit, wide = false, baseline = 'auto', note }) {
  const list = items.filter(i => isNum(i.value)).slice(0, limit ?? (mobile ? 8 : 10));
  const max = Math.max(...list.map(i => i.value), 0) || 1;
  const min = Math.min(...list.map(i => i.value));
  let base = 0;
  if (baseline === 'auto' && list.length > 1 && min > 0 && min / max > 0.8) base = min - (max - min) * 0.9;
  else if (isNum(baseline)) base = baseline;
  const span = Math.max(max - base, 1e-9);
  const H = height ?? (wide ? (mobile ? 200 : 280) : (mobile ? 150 : 190));
  const many = list.length > (mobile ? 8 : 12);
  const gap = many ? (mobile ? 3 : 5) : (mobile ? 5 : 7);
  const minBarW = mobile ? 30 : 40;

  return (
    <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', padding: mobile ? '14px 12px 10px' : wide ? '22px 22px 14px' : '18px 18px 12px', minWidth: 0, fontFamily: SF }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span aria-hidden style={{ width: 10, height: 10, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: mobile ? 16 : wide ? 20 : 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        </span>
        {badge}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 16, fontFamily: MONO, letterSpacing: '0.01em' }}>
        {subtitle}{subtitle ? ' · ' : ''}{higherIsBetter ? 'Higher is better' : 'Lower is better'}{base > 0 ? ` · axis from ${Math.round(base).toLocaleString('en-US')}` : ''}
      </div>

      {!list.length ? (
        <div style={{ height: H + 78, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--muted2)', fontFamily: MONO }}>N/A</div>
      ) : (
        <div style={{ overflowX: many ? 'auto' : 'visible', scrollbarWidth: 'none' }}>
          <div style={{ position: 'relative', minWidth: many ? list.length * (minBarW + gap) : 0 }}>
            {[0.25, 0.5, 0.75].map(p => <div key={p} aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: H * (1 - p), height: '0.5px', background: 'var(--sep2)' }} />)}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap, height: H, position: 'relative' }}>
              {list.map((it, i) => {
                const h = Math.max(3, Math.round(((it.value - base) / span) * H));
                const inside = h >= 30;
                const parts = it.parts?.length ? it.parts : null;
                return (
                  <button key={it.id ?? i} onClick={() => onSelect?.(it)} title={`${it.name} — ${it.label}`} className="aiwar-bar" style={{
                    flex: 1, minWidth: 0, height: '100%', background: 'none', border: 'none', padding: 0, cursor: onSelect ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', position: 'relative',
                  }}>
                    {!inside && <span style={{ fontFamily: MONO, fontSize: many ? 9 : 10, fontWeight: 700, color: 'var(--text)', marginBottom: 3, whiteSpace: 'nowrap' }}>{it.label}</span>}
                    <span style={{
                      width: '100%', height: h, background: parts ? 'transparent' : barColor(it.org), position: 'relative',
                      display: 'flex', flexDirection: 'column-reverse',
                      transformOrigin: 'bottom', animation: `aiwar-bar-up 700ms ${EASE} ${Math.min(i, 20) * 40}ms both`,
                    }}>
                      {parts && parts.map((p, k) => (
                        <span key={k} style={{ height: `${(p.value / it.value) * 100}%`, background: barColor(it.org), opacity: p.opacity ?? 1, display: 'block' }} />
                      ))}
                      {inside && (
                        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 8, textAlign: 'center', fontFamily: MONO, fontSize: mobile || many ? 10 : 11, fontWeight: 700, color: inkOn(it.org), whiteSpace: 'nowrap', overflow: 'hidden', letterSpacing: '-0.02em' }}>{it.label}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap, borderTop: '0.5px solid var(--sep)', paddingTop: 8 }}>
              {list.map((it, i) => (
                <div key={it.id ?? i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <LabLogo org={it.org} size={mobile ? 12 : 14} />
                  <div style={{ position: 'relative', width: '100%', height: mobile ? 60 : wide ? 100 : 74 }}>
                    <span style={{
                      position: 'absolute', right: '50%', top: 0, transformOrigin: 'top right', transform: 'rotate(-55deg) translateY(2px)',
                      fontFamily: MONO, fontSize: mobile ? 8.5 : 9.5, color: 'var(--muted)', whiteSpace: 'nowrap', letterSpacing: '-0.01em', lineHeight: 1,
                    }}>{short(it.name, mobile ? 13 : wide ? 20 : 16)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {note && <div style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 6, lineHeight: 1.5 }}>{note}</div>}
      <style>{`
        @keyframes aiwar-bar-up { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .aiwar-bar > span:last-child { transition: filter 200ms; }
        .aiwar-bar:hover > span:last-child { filter: brightness(1.18); }
      `}</style>
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
