// ─── Command-center UI primitives ───────────────────────────────────────────
// Small, flat, hairline-bordered pieces that extend design.jsx. Everything
// here reads from the same tokens (--card, --sep, --muted, MONO) so the new
// sections sit next to the leaderboard without a seam.

import { useState, useRef, useEffect } from 'react';
import { MONO, SF, EASE, LivePulse } from './design.jsx';
import { metric, SOURCES, fmtAgo, NA, isNum } from '../../shared/metrics.js';

export const TIER = { S: '#5E9E70', A: '#5C81B8', B: '#C89150', C: '#CD5C4E' };
export const GREEN = '#5E9E70', BLUE = '#5C81B8', GOLD = '#C89150', RED = '#CD5C4E', PURPLE = '#5856D6';

export function eloColor(v) {
  if (!isNum(v)) return 'var(--muted2)';
  if (v >= 1490) return TIER.S;
  if (v >= 1450) return TIER.A;
  if (v >= 1420) return TIER.B;
  return TIER.C;
}
export function eloTier(v) {
  if (!isNum(v)) return '—';
  if (v >= 1490) return 'S';
  if (v >= 1450) return 'A';
  if (v >= 1420) return 'B';
  return 'C';
}

/** Rank-based tint for boards whose ELO scale differs from the text arena (image, video). */
export function rankColor(rank) {
  if (!isNum(rank)) return 'var(--muted2)';
  if (rank <= 10) return TIER.S;
  if (rank <= 25) return TIER.A;
  if (rank <= 50) return TIER.B;
  return 'var(--muted)';
}

/* ─── Label — the 10px MONO uppercase caption used everywhere ────────────── */
export function Label({ children, style, color = 'var(--muted2)' }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase',
      letterSpacing: '0.08em', fontFamily: MONO, ...style,
    }}>{children}</span>
  );
}

/* ─── Panel — the solid card ─────────────────────────────────────────────── */
export function Panel({ children, style, pad = 16, title, action, hover = false, onClick, flat = false, className, ...rest }) {
  const cls = [flat ? '' : 'aiwar-surface', hover ? 'aiwar-card-hover' : '', className ?? ''].join(' ').trim() || undefined;
  return (
    <div onClick={onClick} className={cls} style={{
      ...(flat ? { background: 'var(--card)', border: '0.5px solid var(--sep)' } : {}),
      padding: pad, cursor: onClick ? 'pointer' : undefined, minWidth: 0,
      ...style,
    }} {...rest}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          {title && <Label color="var(--muted)">{title}</Label>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Chip — filter pill (same geometry as the leaderboard's Pill) ───────── */
export function Chip({ active, color = 'var(--text)', label, icon, onClick, small = false, title, dot }) {
  const on = !!active;
  const accent = color;
  return (
    <button onClick={onClick} className="aiwar-press-btn" title={title} style={{
      height: small ? 26 : 30, paddingInline: small ? 11 : 14, borderRadius: 980,
      display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
      background: on ? (accent === 'var(--text)' ? 'var(--text)' : `${accent}18`) : 'transparent',
      border: `0.5px solid ${on ? (accent === 'var(--text)' ? 'var(--text)' : accent + '88') : 'var(--sep)'}`,
      color: on ? (accent === 'var(--text)' ? 'var(--bg)' : accent) : 'var(--text)',
      fontSize: small ? 11.5 : 12, fontWeight: on ? 600 : 500, fontFamily: SF,
      cursor: 'pointer', letterSpacing: '-0.01em', whiteSpace: 'nowrap',
      boxShadow: on && accent !== 'var(--text)' ? `0 0 0 4px ${accent}14` : 'none',
    }}>
      {dot && <span data-round="1" style={{ width: 5, height: 5, background: dot }} />}
      {icon && <span style={{ fontSize: 11 }}>{icon}</span>}
      {label}
    </button>
  );
}

/* ─── Segmented — mutually exclusive tabs ────────────────────────────────── */
export function Segmented({ options, value, onChange, small = false }) {
  return (
    <div role="tablist" style={{ display: 'inline-flex', border: '0.5px solid var(--sep)', background: 'var(--card)', padding: 2, gap: 2, flexWrap: 'wrap' }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} role="tab" aria-selected={on} onClick={() => onChange(o.value)} className="aiwar-press-btn" style={{
            height: small ? 24 : 28, paddingInline: small ? 10 : 12,
            background: on ? 'var(--text)' : 'transparent', color: on ? 'var(--bg)' : 'var(--muted)',
            border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: small ? 10 : 10.5, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>{o.label}{isNum(o.count) && <span style={{ opacity: 0.6, marginLeft: 6 }}>{o.count}</span>}</button>
        );
      })}
    </div>
  );
}

/* ─── DataStatus — LIVE / UPDATED X AGO / CACHED / OFFLINE ───────────────── */
export function DataStatus({ status, fetchedAt, sources = [], loading, onRefresh, compact = false }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 60_000); return () => clearInterval(t); }, []);
  const cfg = status === 'offline'
    ? { color: RED, pulse: false, label: 'Offline — cached', title: 'Could not reach the API. Showing what this browser last loaded.' }
    : status === 'stale'
      ? { color: GOLD, pulse: false, label: `Cached · ${fmtAgo(fetchedAt)}`, title: 'An upstream source is unreachable. Serving the most recent successful fetch.' }
      : status === 'loading'
        ? { color: GOLD, pulse: false, label: 'Syncing…', title: '' }
        : { color: GREEN, pulse: true, label: fetchedAt ? (Date.now() - new Date(fetchedAt).getTime() < 120_000 ? 'Live' : `Updated ${fmtAgo(fetchedAt)}`) : 'Live', title: 'Fresh data from the sources listed.' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div title={cfg.title} className="aiwar-surface" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px' }}>
        {loading ? <span data-round="1" style={{ width: 6, height: 6, background: GOLD }} />
          : cfg.pulse ? <LivePulse color={cfg.color} size={6} /> : <span data-round="1" style={{ width: 6, height: 6, background: cfg.color }} />}
        <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: MONO, fontWeight: 500, letterSpacing: '-0.005em' }}>{loading ? 'Syncing…' : cfg.label}</span>
      </div>
      {!compact && sources.length > 0 && (
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: MONO }}>{sources.map(s => SOURCES[s]?.name ?? s).join(' + ')}</span>
      )}
      {onRefresh && (
        <button onClick={onRefresh} disabled={loading} className="aiwar-press-btn" style={{
          height: 28, paddingInline: 12, background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 600,
          border: '0.5px solid var(--sep)', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.4 : 1, fontFamily: SF, letterSpacing: '-0.01em',
        }}>Refresh</button>
      )}
    </div>
  );
}

/* ─── SourceTag — tiny provenance mark ───────────────────────────────────── */
export function SourceTag({ id, style }) {
  const s = SOURCES[id];
  if (!s) return null;
  return (
    <a href={s.url} target="_blank" rel="noreferrer noopener" title={s.note} onClick={e => e.stopPropagation()} style={{
      fontSize: 9.5, fontFamily: MONO, color: 'var(--muted2)', textDecoration: 'none', letterSpacing: '0.04em',
      border: '0.5px solid var(--sep)', padding: '1px 5px', whiteSpace: 'nowrap', flexShrink: 0, ...style,
    }}>{s.name}</a>
  );
}

/* ─── InfoTip — "?" that explains a metric (what / how / direction / source) ─ */
export function InfoTip({ metricKey, children, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const m = metricKey ? metric(metricKey) : null;
  useEffect(() => {
    if (!open) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  const src = m ? SOURCES[m.source] : null;
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {children}
      <button aria-label="What is this?" onClick={e => { e.stopPropagation(); setOpen(o => !o); }} style={{
        width: 14, height: 14, padding: 0, background: open ? 'var(--text)' : 'transparent', color: open ? 'var(--bg)' : 'var(--muted2)',
        border: '0.5px solid var(--sep)', cursor: 'help', fontSize: 9, fontFamily: MONO, fontWeight: 700, lineHeight: 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>?</button>
      {open && (
        <div role="tooltip" onClick={e => e.stopPropagation()} style={{
          position: 'absolute', top: 'calc(100% + 6px)', [align]: 0, zIndex: 50, width: 260,
          background: 'var(--card)', border: '0.5px solid var(--text)', padding: '10px 12px',
          boxShadow: 'var(--shadow)', textAlign: 'left', textTransform: 'none', letterSpacing: 0, fontFamily: SF,
          animation: `aiwar-pop-in 260ms ${EASE} both`, whiteSpace: 'normal', fontWeight: 400,
        }}>
          {m && <>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{m.label}{m.unit ? <span style={{ color: 'var(--muted2)', fontFamily: MONO, fontSize: 10, marginLeft: 6 }}>{m.unit}</span> : null}</div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--muted)' }}>{m.description}</div>
            {m.method && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--muted)', marginTop: 6 }}><span style={{ color: 'var(--muted2)', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.06em' }}>HOW · </span>{m.method}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--sep)' }}>
              <Label color={m.higherIsBetter === null ? 'var(--muted2)' : m.higherIsBetter ? GREEN : GOLD}>{m.higherIsBetter === null ? 'Informational' : m.higherIsBetter ? '▲ Higher is better' : '▼ Lower is better'}</Label>
              {src && <a href={src.url} target="_blank" rel="noreferrer noopener" style={{ fontSize: 10, fontFamily: MONO, color: 'var(--text)', textDecoration: 'none' }}>{src.name} ↗</a>}
            </div>
          </>}
        </div>
      )}
    </span>
  );
}

/* ─── Delta — rank / value change with direction ─────────────────────────── */
export function Delta({ value, suffix = '', invert = false, size = 10, placeholder = null }) {
  if (!isNum(value) || value === 0) return placeholder != null ? <span style={{ fontSize: size, color: 'var(--muted2)', fontFamily: MONO }}>{placeholder}</span> : null;
  const up = invert ? value < 0 : value > 0;
  return (
    <span style={{ fontSize: size, fontWeight: 700, fontFamily: MONO, color: up ? GREEN : RED, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
      {up ? '▲' : '▼'} {Math.abs(value) % 1 === 0 ? Math.abs(value) : Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

/* ─── StatTile — label · value · optional delta and sparkline ────────────── */
export function StatTile({ label, value, sub, color, metricKey, mono = true, style, delta, trend, trendColor, invertTrend = false }) {
  const hasTrend = Array.isArray(trend) && trend.filter(isNum).length >= 2;
  return (
    <div className="aiwar-surface" style={{ padding: '12px 14px', minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
        {metricKey ? <InfoTip metricKey={metricKey}><Label>{label}</Label></InfoTip> : <Label>{label}</Label>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 21, fontWeight: 700, color: color ?? 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1, fontFamily: mono ? MONO : SF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value ?? NA}</span>
            {delta}
          </div>
          {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
        </div>
        {hasTrend && <Sparkline values={trend} color={trendColor ?? color ?? 'var(--text)'} invert={invertTrend} />}
      </div>
    </div>
  );
}

/* ─── Sparkline — a small trend line for a stat tile ─────────────────────── */
export function Sparkline({ values, color = 'var(--text)', width = 64, height = 22, invert = false }) {
  const xs = values.filter(isNum);
  if (xs.length < 2) return null;
  const lo = Math.min(...xs), hi = Math.max(...xs);
  const span = hi - lo || 1;
  const pts = xs.map((v, i) => [2 + (i / (xs.length - 1)) * (width - 4), 2 + (invert ? (v - lo) / span : 1 - (v - lo) / span) * (height - 4)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden style={{ flexShrink: 0, overflow: 'visible' }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} stroke="var(--card)" strokeWidth="1.5" />
    </svg>
  );
}

/* ─── EmptyState ─────────────────────────────────────────────────────────── */
export function EmptyState({ title = 'No data', body, action, icon = '◌' }) {
  return (
    <div className="aiwar-surface" style={{ padding: '40px 20px', textAlign: 'center', borderStyle: 'dashed' }}>
      <div style={{ fontSize: 22, color: 'var(--muted2)', marginBottom: 8, fontFamily: MONO }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{title}</div>
      {body && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, maxWidth: 460, marginInline: 'auto', lineHeight: 1.5 }}>{body}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/* ─── Unavailable — inline "source not configured" note for a metric ────── */
export function Unavailable({ what = 'This metric', source = 'Artificial Analysis', env = 'ARTIFICIAL_ANALYSIS_API_KEY' }) {
  return (
    <div style={{ padding: '10px 12px', border: '0.5px dashed var(--sep)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
      <span style={{ fontFamily: MONO, color: 'var(--muted2)', fontSize: 10, letterSpacing: '0.06em' }}>N/A · </span>
      {what} needs the {source} data source, which is not configured on this deployment (<code style={{ fontFamily: MONO, fontSize: 11 }}>{env}</code>). Nothing is estimated in its place.
    </div>
  );
}

/* ─── Small utilities ────────────────────────────────────────────────────── */
export function Hairline({ v = false, style }) {
  return <div style={v ? { width: '0.5px', alignSelf: 'stretch', background: 'var(--sep)', ...style } : { height: '0.5px', background: 'var(--sep)', ...style }} />;
}

export function BadgeTag({ children, color = 'var(--muted)', bg }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, color, background: bg ?? `${color}18`, padding: '2px 5px',
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: MONO,
    }}>{children}</span>
  );
}

/** Button in the two house styles: solid (var(--text)) or outline. */
export function Btn({ children, onClick, solid = false, small = false, disabled, title, style }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className="aiwar-press-btn" style={{
      height: small ? 28 : 36, paddingInline: small ? 12 : 16, borderRadius: 980,
      background: solid ? 'var(--text)' : 'transparent', color: solid ? 'var(--bg)' : 'var(--text)',
      border: `0.5px solid ${solid ? 'var(--text)' : 'var(--sep)'}`, cursor: disabled ? 'default' : 'pointer',
      fontSize: small ? 12 : 13.5, fontWeight: 600, fontFamily: SF, letterSpacing: '-0.015em', opacity: disabled ? 0.4 : 1,
      display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', ...style,
    }}>{children}</button>
  );
}

/** Page frame shared by every command-center page. */
export function PageFrame({ children, mobile, wide = false }) {
  return (
    <div className="page-enter" style={{ background: 'transparent', fontFamily: SF, minHeight: '100vh' }}>
      <div style={{ maxWidth: wide ? 1200 : 1100, margin: '0 auto', padding: mobile ? '36px 16px 96px' : '56px 24px 112px' }}>
        {children}
      </div>
    </div>
  );
}

/** Page header in the leaderboard's style (eyebrow, big title, status row). */
export function PageTitle({ eyebrow, title, subtitle, mobile, status, right }) {
  return (
    <header style={{ marginBottom: mobile ? 24 : 32 }}>
      <div style={{ opacity: 0, animation: `aiwar-fade-up 700ms ${EASE} both` }}>
        <Label color="var(--muted2)" style={{ fontSize: 12, fontWeight: 600 }}>{eyebrow}</Label>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', margin: '10px 0 14px', opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 80ms both` }}>
        <h1 style={{ fontSize: mobile ? 'clamp(32px,8vw,44px)' : 'clamp(40px,4.6vw,60px)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.98, color: 'var(--text)', margin: 0 }}>{title}</h1>
        {right}
      </div>
      {subtitle && <p style={{ fontSize: mobile ? 15 : 17, lineHeight: 1.45, color: 'var(--muted)', letterSpacing: '-0.015em', margin: '0 0 14px', maxWidth: 720, opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 140ms both` }}>{subtitle}</p>}
      {status && <div style={{ opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 200ms both` }}>{status}</div>}
    </header>
  );
}
