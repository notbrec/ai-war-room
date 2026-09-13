import { MODELS, ORG_CONFIG } from '../models-data.js';
import { MONO, EASE, AnimatedNumber, LivePulse, WordReveal } from './design.jsx';
import { LabLogo } from './LabLogo.jsx';
import FightArena from './FightArena.jsx';

/* ─────────────────────────────────────────────────────────────────────────
   <HeroArena/> — the opening of the home page.

   The clash clip is the centrepiece: full width, no card around it, and the
   two top-ranked models are the fighters. The clip's own background is the
   page background (screen / multiply, see FightArena) and the edges are
   masked to nothing, so the robots simply stand on the page — no rectangle,
   no panel, nothing to frame.

   Under the fight, the tale of the tape: champion on the left, challenger on
   the right, the ELO gap between them, and the size of the board.
   ────────────────────────────────────────────────────────────────────── */

/* soft rectangular fade on all four sides; the fighters live well inside it */
const MASK = 'linear-gradient(90deg, transparent 0, #000 9%, #000 91%, transparent 100%), linear-gradient(180deg, transparent 0, #000 7%, #000 96%, transparent 100%)';

function Fighter({ m, side, role, color, mobile, onNavigate }) {
  if (!m) return null;
  const left = side === 'left';
  return (
    <button
      onClick={() => onNavigate?.({ type: 'model', slug: m.slug })}
      className="aiwar-press-btn"
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0,
        display: 'flex', flexDirection: 'column', gap: 5,
        alignItems: left ? 'flex-start' : 'flex-end', textAlign: left ? 'left' : 'right',
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color, textTransform: 'uppercase' }}>
        {role}
      </span>
      <span style={{ fontSize: mobile ? 15.5 : 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15, overflowWrap: 'anywhere' }}>
        {m.name}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexDirection: left ? 'row' : 'row-reverse' }}>
        <LabLogo org={m.org} size={14} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{m.org}</span>
        {m.votesLabel && !mobile && <span style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, whiteSpace: 'nowrap' }}>{m.votesLabel} votes</span>}
      </span>
      <span style={{ fontFamily: MONO, fontSize: mobile ? 26 : 34, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginTop: 4 }}>
        <AnimatedNumber value={m.elo} format={v => Math.round(v).toString()} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted2)', letterSpacing: '0.08em', marginLeft: 6 }}>ELO</span>
      </span>
    </button>
  );
}

export default function HeroArena({ models, isLoaded, onNavigate, mobile, snap, stats }) {
  const data = models ?? MODELS;
  const champ = data[0];
  const chall = data[1];
  const gap = champ && chall ? Math.abs((champ.elo ?? 0) - (chall.elo ?? 0)) : null;

  return (
    <section style={{ paddingTop: mobile ? 32 : 52 }}>
      {/* headline */}
      <div style={{ textAlign: 'center', maxWidth: 820, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--card)', border: '0.5px solid var(--sep)', padding: '6px 12px 6px 10px',
          fontFamily: MONO, marginBottom: mobile ? 18 : 22,
          opacity: 0, animation: `aiwar-fade-in 600ms ${EASE} both`,
        }}>
          <LivePulse color="#5E9E70" size={7} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Live</span>
          <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.02em' }}>
            {snap.exact ? snap.count : `${snap.count}+`} models · {stats.orgs ?? '—'} labs · arena.ai + OpenRouter
          </span>
        </div>

        <h1 style={{
          fontSize: mobile ? 'clamp(38px,10.5vw,52px)' : 'clamp(52px,5.6vw,80px)',
          fontWeight: 700, letterSpacing: '-0.055em', lineHeight: 0.96,
          color: 'var(--text)', margin: '0 0 16px',
        }}>
          <WordReveal baseDelay={120} perWord={80}>Every AI model,</WordReveal>
          <br />
          <WordReveal baseDelay={420} perWord={80}>ranked by battle.</WordReveal>
        </h1>

        <p style={{
          fontSize: mobile ? 15.5 : 18, lineHeight: 1.5, color: 'var(--muted)', letterSpacing: '-0.015em',
          maxWidth: 620, margin: '0 auto',
          opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 760ms both`,
        }}>
          Real arena votes, live prices, real benchmarks — language, code, image, video and voice on one board.
          Nothing is typed in by hand.
        </p>
      </div>

      {/* the fight — full width, edge-masked, standing on the page */}
      <div style={{
        position: 'relative',
        margin: mobile ? '10px -18px 0' : '4px 0 0',
        opacity: 0, animation: `aiwar-fade-in 1100ms ${EASE} 520ms both`,
      }}>
        <FightArena
          clip="clash"
          aspect={mobile ? '16 / 9' : '2.25 / 1'}
          radius={0}
          border={false}
          surface="var(--bg)"
          alt={champ && chall ? `${champ.name} versus ${chall.name}` : 'Two robots fighting'}
          style={{ WebkitMaskImage: MASK, maskImage: MASK, WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }}
        />
        {/* the sparks between them, warmed: a soft accent glow at the point of impact */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 28% 36% at 50% 56%, rgba(205,92,78,0.22), rgba(205,92,78,0) 100%)',
        }} />
      </div>

      {/* tale of the tape */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center', gap: mobile ? 8 : 24,
        marginTop: mobile ? 6 : -4,
        opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 900ms both`,
      }}>
        <Fighter m={isLoaded ? champ : null} side="left" role="Champion · #1" color="var(--accent)" mobile={mobile} onNavigate={onNavigate} />
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontFamily: MONO, fontSize: mobile ? 14 : 20, fontWeight: 700, letterSpacing: '0.20em', color: 'var(--accent)', paddingLeft: '0.2em' }}>VS</span>
          {gap != null && isLoaded && (
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              Δ {Math.round(gap)} ELO
            </span>
          )}
        </div>
        <Fighter m={isLoaded ? chall : null} side="right" role="Challenger · #2" color="var(--muted)" mobile={mobile} onNavigate={onNavigate} />
      </div>

      {/* size of the board */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: mobile ? 18 : 40, flexWrap: 'wrap',
        marginTop: mobile ? 26 : 36, paddingTop: mobile ? 18 : 22, borderTop: '0.5px solid var(--sep)',
        opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 1050ms both`,
      }}>
        {[
          { v: snap.count, fmt: v => Math.round(v).toString(), suf: snap.exact ? '' : '+', l: 'Models ranked' },
          { v: isLoaded ? stats.orgs : null, l: 'Labs' },
          { v: isLoaded ? stats.votes : null, fmt: v => { const n = Math.round(v); return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}K`; }, l: 'Human votes' },
          { v: isLoaded ? stats.open : null, l: 'Open weights' },
        ].map(s => (
          <div key={s.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: mobile ? 20 : 24, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', fontFamily: MONO, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {s.v != null ? <AnimatedNumber value={s.v} format={s.fmt} suffix={s.suf || ''} /> : '—'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--muted2)', letterSpacing: '0.06em', marginTop: 6, fontFamily: MONO, textTransform: 'uppercase' }}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { ORG_CONFIG };
