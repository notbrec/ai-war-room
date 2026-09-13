import { MONO } from './design.jsx';
import { LabLogo } from './LabLogo.jsx';
import { eloColor } from './ui.jsx';

/* ─── Ticker — the tape. Top of the board scrolling by, terminal style. ──── */
export default function Ticker({ models, onNavigate, mobile, count = 24 }) {
  const items = (models ?? []).slice(0, count);
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{ borderTop: '0.5px solid var(--sep)', borderBottom: '0.5px solid var(--sep)', overflow: 'hidden', background: 'var(--card)',
      maskImage: 'linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)', WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)' }}>
      <div className="aiwar-marquee-track" style={{ display: 'flex', width: 'max-content', animation: `aiwar-marquee ${Math.max(40, items.length * 3.2)}s linear infinite` }}>
        {doubled.map((m, i) => (
          <button key={i} onClick={() => onNavigate({ type: 'model', slug: m.slug })} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, height: mobile ? 36 : 40, paddingInline: mobile ? 12 : 16,
            background: 'none', border: 'none', borderRight: '0.5px solid var(--sep2)', cursor: 'pointer', fontFamily: MONO, whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 10, color: 'var(--muted2)', fontVariantNumeric: 'tabular-nums' }}>{String((i % items.length) + 1).padStart(2, '0')}</span>
            <LabLogo org={m.org} size={11} />
            <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600, letterSpacing: '-0.01em' }}>{m.name}</span>
            <span style={{ fontSize: 11.5, color: eloColor(m.elo), fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{m.elo}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
