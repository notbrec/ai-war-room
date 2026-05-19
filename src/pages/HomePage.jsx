import { useEffect, useRef, useState } from 'react';
import { MODELS, ORG_CONFIG, RELEASE } from '../models-data.js';
import Logo from '../components/Logo.jsx';
import { useDark, useMobile } from '../hooks/useTheme.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
const MONO = "'SF Mono','JetBrains Mono',ui-monospace,'Menlo',monospace";

const MEDALS = [
  { rank: 1, label: 'Gold',   dot: '#D4AF37', soft: 'rgba(212,175,55,0.10)'  },
  { rank: 2, label: 'Silver', dot: '#A8A8A8', soft: 'rgba(168,168,168,0.10)' },
  { rank: 3, label: 'Bronze', dot: '#B87333', soft: 'rgba(184,115,51,0.10)' },
];

function eloColor(v) {
  if (v >= 1500) return '#34C759';
  if (v >= 1400) return '#007AFF';
  if (v >= 1300) return '#FF9500';
  return '#FF3B30';
}

/* ─────────────────────────────────────────────────────────────────────────────
   useReveal — IntersectionObserver hook: fade + slide up when in view
   ────────────────────────────────────────────────────────────────────────── */
function useReveal(options = { threshold: 0.12 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!ref.current || shown) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { setShown(true); obs.disconnect(); } });
    }, options);
    obs.observe(ref.current);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, shown];
}

function Reveal({ children, delay = 0, y = 16 }) {
  const [ref, shown] = useReveal();
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0)' : `translateY(${y}px)`,
      transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      willChange: 'opacity, transform',
    }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   useCountUp — animate a number from 0 to target over duration ms
   ────────────────────────────────────────────────────────────────────────── */
function useCountUp(target, duration = 1400, start = 0, shouldStart = true) {
  const [value, setValue] = useState(start);
  useEffect(() => {
    if (!shouldStart || target == null) return;
    let raf;
    const t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3); // cubic-out
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      setValue(start + (target - start) * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start, shouldStart]);
  return value;
}

/* ─────────────────────────────────────────────────────────────────────────────
   AnimatedNumber — renders a number that counts up when it enters view
   ────────────────────────────────────────────────────────────────────────── */
function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString(), suffix = '', placeholder = '—', style }) {
  const [ref, shown] = useReveal({ threshold: 0.3 });
  const animated = useCountUp(typeof value === 'number' ? value : 0, 1500, 0, shown && typeof value === 'number');
  return (
    <span ref={ref} style={style}>
      {typeof value === 'number' ? `${format(animated)}${suffix}` : placeholder}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LivePulse — small animated green dot
   ────────────────────────────────────────────────────────────────────────── */
function LivePulse({ color = '#34C759' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 4, background: color,
        opacity: 0.4,
        animation: 'aiwar-ping 1.8s cubic-bezier(0,0,.2,1) infinite',
      }} />
      <span style={{
        position: 'relative', borderRadius: 4, background: color,
        width: '100%', height: '100%', boxShadow: `0 0 6px ${color}`,
      }} />
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PodiumCard — refined Apple-style card with subtle hover lift
   ────────────────────────────────────────────────────────────────────────── */
function PodiumCard({ model, medal, onNavigate, dark, mobile, delay }) {
  const org    = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
  const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;
  const isFirst = medal.rank === 1;

  return (
    <Reveal delay={delay}>
      <div onClick={() => onNavigate('leaderboard')}
        style={{
          position: 'relative', cursor: 'pointer',
          background: 'var(--card)',
          borderRadius: 22,
          border: '0.5px solid var(--sep)',
          padding: mobile ? '22px 20px' : (isFirst ? '30px 24px 26px' : '24px 22px'),
          overflow: 'hidden',
          transition: 'transform 500ms cubic-bezier(0.16,1,0.3,1), box-shadow 500ms cubic-bezier(0.16,1,0.3,1), border-color 300ms',
          boxShadow: dark
            ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 18px rgba(0,0,0,0.30)'
            : '0 1px 0 rgba(255,255,255,0.7) inset, 0 4px 18px rgba(0,0,0,0.04)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-6px)';
          e.currentTarget.style.boxShadow = dark
            ? `0 1px 0 rgba(255,255,255,0.04) inset, 0 22px 50px rgba(0,0,0,0.40), 0 0 0 0.5px ${medal.dot}80`
            : `0 1px 0 rgba(255,255,255,0.7) inset, 0 22px 50px rgba(0,0,0,0.10), 0 0 0 0.5px ${medal.dot}80`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = dark
            ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 18px rgba(0,0,0,0.30)'
            : '0 1px 0 rgba(255,255,255,0.7) inset, 0 4px 18px rgba(0,0,0,0.04)';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: 4, background: medal.dot,
              boxShadow: `0 0 8px ${medal.dot}`,
            }} />
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              fontFamily: MONO,
            }}>
              {String(medal.rank).padStart(2, '0')} · {medal.label}
            </span>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: 11, background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: org.color,
          }}>
            {model.initials}
          </div>
        </div>

        <div style={{
          fontSize: isFirst ? 20 : 18, fontWeight: 600,
          color: 'var(--text)', letterSpacing: '-0.026em', lineHeight: 1.2, marginBottom: 4,
        }}>
          {model.name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: '-0.01em', marginBottom: 22 }}>
          {model.org}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 18 }}>
          <AnimatedNumber
            value={model.elo}
            format={v => Math.round(v).toString()}
            style={{
              fontSize: isFirst ? 56 : 48, fontWeight: 700, letterSpacing: '-0.055em',
              color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
              lineHeight: 0.95,
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--muted2)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>ELO</span>
        </div>

        <div style={{ display: 'flex', gap: 16, paddingTop: 16, borderTop: '0.5px solid var(--sep)' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, fontFamily: MONO }}>Votes</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', marginTop: 3 }}>{model.votesLabel}</div>
          </div>
          {model.priceIn != null && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, fontFamily: MONO }}>$/M in</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 3 }}>${model.priceIn.toFixed(2)}</div>
            </div>
          )}
          {model.context && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, fontFamily: MONO }}>Context</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 3 }}>{model.context}</div>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HighlightCard — clean Apple-style card with single accent dot
   ────────────────────────────────────────────────────────────────────────── */
function HighlightCard({ label, model, note, accent, dark, onNavigate, mobile, delay }) {
  if (!model) return null;
  const org    = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
  const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;

  return (
    <Reveal delay={delay}>
      <div onClick={() => onNavigate('leaderboard')} style={{
        position: 'relative', cursor: 'pointer',
        background: 'var(--card)',
        borderRadius: 18,
        padding: mobile ? '20px 18px' : '22px 20px',
        border: '0.5px solid var(--sep)',
        transition: 'transform 500ms cubic-bezier(0.16,1,0.3,1), box-shadow 500ms cubic-bezier(0.16,1,0.3,1)',
        boxShadow: dark
          ? '0 4px 18px rgba(0,0,0,0.28)'
          : '0 4px 18px rgba(0,0,0,0.04)',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = dark
            ? '0 18px 40px rgba(0,0,0,0.36)'
            : '0 18px 40px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = dark
            ? '0 4px 18px rgba(0,0,0,0.28)'
            : '0 4px 18px rgba(0,0,0,0.04)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: accent }} />
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: MONO,
            }}>
              {label}
            </span>
          </div>
          <div style={{
            width: 30, height: 30, borderRadius: 9, background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: org.color, flexShrink: 0,
          }}>
            {model.initials}
          </div>
        </div>

        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.025em', marginBottom: 4, lineHeight: 1.2 }}>
          {model.name}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', letterSpacing: '-0.01em', marginBottom: 18 }}>
          {model.org} · {note}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingTop: 14, borderTop: '0.5px solid var(--sep)' }}>
          <span style={{
            fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>
            {model.elo}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted2)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>ELO</span>
        </div>
      </div>
    </Reveal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   StepCard — How-it-works numbered step
   ────────────────────────────────────────────────────────────────────────── */
function StepCard({ num, title, body, mobile, delay }) {
  return (
    <Reveal delay={delay}>
      <div style={{
        position: 'relative',
        background: 'var(--card)', borderRadius: 18,
        padding: mobile ? '22px 20px' : '26px 22px',
        border: '0.5px solid var(--sep)',
        height: '100%',
        transition: 'transform 500ms cubic-bezier(0.16,1,0.3,1), border-color 300ms',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.borderColor = 'var(--text)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'var(--sep)';
        }}
      >
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--muted2)',
          letterSpacing: '0.08em', fontFamily: MONO, marginBottom: 18,
        }}>
          {String(num).padStart(2, '0')} / 03
        </div>
        <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.025em', marginBottom: 8, lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', letterSpacing: '-0.01em' }}>
          {body}
        </div>
      </div>
    </Reveal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LiveTicker — horizontally scrolling marquee of top model names + ELO
   ────────────────────────────────────────────────────────────────────────── */
function LiveTicker({ models, dark }) {
  if (!models || models.length === 0) return null;
  const items = models.slice(0, 16);
  const doubled = [...items, ...items]; // duplicate for seamless loop

  return (
    <div style={{
      position: 'relative',
      maskImage: 'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
      overflow: 'hidden',
      padding: '14px 0',
      borderTop: '0.5px solid var(--sep)',
      borderBottom: '0.5px solid var(--sep)',
    }}>
      <div style={{
        display: 'flex', gap: 36, whiteSpace: 'nowrap',
        animation: 'aiwar-marquee 60s linear infinite',
        width: 'max-content',
      }}>
        {doubled.map((m, i) => (
          <div key={`${m.slug}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: eloColor(m.elo) }} />
            <span style={{ fontSize: 13, color: 'var(--text)', letterSpacing: '-0.015em', fontWeight: 500 }}>
              {m.name}
            </span>
            <span style={{
              fontSize: 12, color: 'var(--muted)', letterSpacing: '-0.01em',
              fontFamily: MONO, fontVariantNumeric: 'tabular-nums',
            }}>
              {m.elo}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   StatBlock — animated count-up stat
   ────────────────────────────────────────────────────────────────────────── */
function StatBlock({ value, label, isLoaded, mobile, format, suffix = '' }) {
  return (
    <div>
      <div style={{
        fontSize: mobile ? 26 : 34, fontWeight: 700, letterSpacing: '-0.045em',
        color: isLoaded ? 'var(--text)' : 'var(--muted2)',
        fontVariantNumeric: 'tabular-nums',
        transition: 'color 300ms', lineHeight: 1,
      }}>
        {isLoaded
          ? <AnimatedNumber value={value} format={format} suffix={suffix} />
          : '—'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '-0.005em', marginTop: 8, fontFamily: MONO }}>
        {label}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HomePage
   ────────────────────────────────────────────────────────────────────────── */
export default function HomePage({ onNavigate, liveModels, countSnapshot }) {
  const dark       = useDark();
  const mobile     = useMobile();
  const isLoaded   = !!liveModels;
  const data       = liveModels ?? MODELS;
  const top3       = isLoaded ? data.slice(0, 3) : [];
  const totalVotes = data.reduce((s, m) => s + m.votes, 0);
  const orgs       = new Set(data.map(m => m.org)).size;
  const openCount  = data.filter(m => m.isOpen).length;

  const snap = countSnapshot ?? { count: 280, exact: false };

  const bestValue  = isLoaded ? [...data].filter(m => m.priceIn != null && m.elo >= 1350)
    .sort((a, b) => a.priceIn - b.priceIn)[0] : null;
  const mostVoted  = isLoaded ? [...data].sort((a, b) => b.votes - a.votes)[0] : null;
  const bestOpen   = isLoaded ? [...data].filter(m => m.isOpen)[0] : null;

  const topLabs = isLoaded
    ? [...new Set(data.slice(0, 30).map(m => m.org))].slice(0, mobile ? 6 : 9)
    : [];

  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh', position: 'relative' }}>

      {/* ── Global animations / micro-CSS ───────────────────────────── */}
      <style>{`
        @keyframes aiwar-ping {
          0%   { transform: scale(1);   opacity: 0.6; }
          75%, 100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes aiwar-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes aiwar-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiwar-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .aiwar-hero-h1 {
          animation: aiwar-fade-up 900ms cubic-bezier(0.16,1,0.3,1) both;
        }
        .aiwar-hero-sub {
          animation: aiwar-fade-up 900ms cubic-bezier(0.16,1,0.3,1) 120ms both;
        }
        .aiwar-hero-cta {
          animation: aiwar-fade-up 900ms cubic-bezier(0.16,1,0.3,1) 240ms both;
        }
        .aiwar-hero-stats {
          animation: aiwar-fade-up 900ms cubic-bezier(0.16,1,0.3,1) 360ms both;
        }
        .aiwar-hero-badge {
          animation: aiwar-fade-in 600ms cubic-bezier(0.16,1,0.3,1) both;
        }
        .aiwar-press-btn {
          transition: transform 200ms cubic-bezier(0.16,1,0.3,1), background 200ms, color 200ms, border-color 200ms;
        }
        .aiwar-press-btn:hover  { transform: translateY(-1px); }
        .aiwar-press-btn:active { transform: translateY(0) scale(0.98); }
        .aiwar-lab-pill {
          transition: background 200ms, color 200ms, transform 200ms;
        }
        .aiwar-lab-pill:hover {
          background: var(--text) !important;
          color: var(--bg) !important;
          transform: translateY(-1px);
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.001ms !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>

      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: mobile ? '0 18px 96px' : '0 24px 112px' }}>

        {/* ─────────────────────────────────────────────────────────
           HERO
           ───────────────────────────────────────────────────────── */}
        <section style={{
          paddingTop: mobile ? 56 : 96,
          paddingBottom: mobile ? 48 : 80,
          textAlign: mobile ? 'left' : 'center',
        }}>
          {/* Live badge */}
          <div className="aiwar-hero-badge" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--card)', border: '0.5px solid var(--sep)',
            padding: '6px 12px 6px 10px', borderRadius: 980,
            marginBottom: mobile ? 24 : 32,
            boxShadow: 'var(--shadow)',
            fontFamily: MONO,
          }}>
            <LivePulse color="#34C759" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.04em' }}>
              LIVE
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '-0.005em' }}>
              · arena.ai + OpenRouter · refreshed every 30 min
            </span>
          </div>

          {/* Headline */}
          <h1 className="aiwar-hero-h1" style={{
            fontSize: mobile ? 'clamp(44px,12vw,60px)' : 'clamp(64px,7vw,104px)',
            fontWeight: 700, letterSpacing: '-0.062em', lineHeight: 0.95,
            color: 'var(--text)', margin: '0 0 24px',
            maxWidth: mobile ? '100%' : 900,
            marginInline: mobile ? 0 : 'auto',
          }}>
            Track the models<br />at&nbsp;war.
          </h1>

          {/* Subhead */}
          <p className="aiwar-hero-sub" style={{
            fontSize: mobile ? 17 : 22, lineHeight: 1.4,
            color: 'var(--muted)', letterSpacing: '-0.022em',
            maxWidth: mobile ? '100%' : 640,
            margin: mobile ? '0 0 32px' : '0 auto 40px',
            fontWeight: 400,
          }}>
            {snap.exact ? `${snap.count}` : `${snap.count}+`} of the world's strongest AI models, ranked by
            real human votes — not benchmarks. Live pricing. Daily refreshes.
          </p>

          {/* CTAs */}
          <div className="aiwar-hero-cta" style={{
            display: 'flex', gap: 10, flexWrap: 'wrap',
            justifyContent: mobile ? 'flex-start' : 'center',
            marginBottom: mobile ? 48 : 72,
          }}>
            <button onClick={() => onNavigate('leaderboard')}
              className="aiwar-press-btn"
              style={{
                height: mobile ? 48 : 54, paddingInline: mobile ? 24 : 28, borderRadius: 980,
                background: 'var(--text)', color: 'var(--bg)',
                fontSize: mobile ? 15 : 16, fontWeight: 600,
                border: 'none', cursor: 'pointer', letterSpacing: '-0.018em',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
              View Rankings
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button onClick={() => onNavigate('guide')}
              className="aiwar-press-btn"
              style={{
                height: mobile ? 48 : 54, paddingInline: mobile ? 24 : 28, borderRadius: 980,
                background: 'transparent', color: 'var(--text)',
                fontSize: mobile ? 15 : 16, fontWeight: 600,
                border: '0.5px solid var(--sep)', cursor: 'pointer', letterSpacing: '-0.018em',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.borderColor = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--sep)'; }}
            >
              Read the Guide
            </button>
          </div>

          {/* Stat row with count-up animations */}
          <div className="aiwar-hero-stats" style={{
            display: 'flex', gap: mobile ? 28 : 56, flexWrap: 'wrap',
            justifyContent: mobile ? 'flex-start' : 'center',
            borderTop: mobile ? 'none' : '0.5px solid var(--sep)',
            paddingTop: mobile ? 0 : 32,
          }}>
            <StatBlock
              value={snap.count}
              format={v => Math.round(v).toString()}
              suffix={snap.exact ? '' : '+'}
              label="Models"
              isLoaded={true}
              mobile={mobile}
            />
            <StatBlock
              value={orgs}
              label="Labs"
              isLoaded={isLoaded}
              mobile={mobile}
            />
            <StatBlock
              value={totalVotes}
              format={v => {
                const n = Math.round(v);
                if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
                return `${Math.round(n/1000)}K`;
              }}
              label="Votes cast"
              isLoaded={isLoaded}
              mobile={mobile}
            />
            <StatBlock
              value={openCount}
              label="Open weight"
              isLoaded={isLoaded}
              mobile={mobile}
            />
          </div>
        </section>

        {/* ── Live ticker ─────────────────────────────────────────── */}
        {isLoaded && (
          <Reveal>
            <div style={{ marginBottom: mobile ? 56 : 88 }}>
              <LiveTicker models={data} dark={dark} />
            </div>
          </Reveal>
        )}

        {/* ── Top labs ────────────────────────────────────────────── */}
        {topLabs.length > 0 && (
          <Reveal>
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
              marginBottom: mobile ? 56 : 88,
              justifyContent: mobile ? 'flex-start' : 'center',
            }}>
              <span style={{
                fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase',
                letterSpacing: '0.08em', fontWeight: 600, marginRight: 4, fontFamily: MONO,
              }}>
                Tracking
              </span>
              {topLabs.map(lab => {
                const cfg = ORG_CONFIG[lab] ?? { color: '#8E8E93' };
                return (
                  <button key={lab} onClick={() => onNavigate('leaderboard')}
                    className="aiwar-lab-pill"
                    style={{
                      height: 30, paddingInline: 14, borderRadius: 980,
                      background: 'var(--card)', border: '0.5px solid var(--sep)',
                      color: 'var(--text)', fontSize: 12.5, fontWeight: 500,
                      cursor: 'pointer', letterSpacing: '-0.01em',
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                    }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: cfg.color }} />
                    {lab}
                  </button>
                );
              })}
            </div>
          </Reveal>
        )}

        {/* ─────────────────────────────────────────────────────────
           PODIUM
           ───────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: mobile ? 56 : 96 }}>
          <Reveal>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 24, paddingLeft: 2,
            }}>
              <div>
                <p style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--muted2)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px',
                  fontFamily: MONO,
                }}>
                  THE PODIUM
                </p>
                <h2 style={{
                  fontSize: mobile ? 28 : 36, fontWeight: 700,
                  letterSpacing: '-0.035em', color: 'var(--text)',
                  margin: 0, lineHeight: 1.1,
                }}>
                  Today's top three.
                </h2>
              </div>
              <button onClick={() => onNavigate('leaderboard')}
                className="aiwar-press-btn"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 13, color: 'var(--text)', fontWeight: 600, letterSpacing: '-0.01em',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                See all
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </Reveal>

          <div style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 14,
          }}>
            {isLoaded
              ? top3.map((m, i) => (
                  <PodiumCard
                    key={m.slug}
                    model={m}
                    medal={MEDALS[i]}
                    onNavigate={onNavigate}
                    dark={dark}
                    mobile={mobile}
                    delay={i * 80}
                  />
                ))
              : MEDALS.map((medal, i) => (
                  <div key={i} style={{
                    background: 'var(--card)', borderRadius: 22, border: '0.5px solid var(--sep)',
                    padding: '24px 22px', minHeight: 240,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--muted2)' }}>Loading…</span>
                  </div>
                ))
            }
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────
           HOW IT WORKS
           ───────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: mobile ? 56 : 96 }}>
          <Reveal>
            <div style={{ marginBottom: 24, paddingLeft: 2 }}>
              <p style={{
                fontSize: 12, fontWeight: 600, color: 'var(--muted2)',
                textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px',
                fontFamily: MONO,
              }}>
                HOW IT WORKS
              </p>
              <h2 style={{
                fontSize: mobile ? 28 : 36, fontWeight: 700,
                letterSpacing: '-0.035em', color: 'var(--text)',
                margin: 0, lineHeight: 1.1, maxWidth: 720,
              }}>
                Real battles. Real numbers. No marketing.
              </h2>
            </div>
          </Reveal>

          <div style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 14,
          }}>
            <StepCard num={1} mobile={mobile} delay={0}
              title="Humans pick the winner"
              body="Each matchup is a real conversation with two anonymous responses. Hundreds of thousands of voters decide which answer is better." />
            <StepCard num={2} mobile={mobile} delay={80}
              title="ELO does the math"
              body="The same statistical system that ranks chess grandmasters. Beat a stronger model — gain more points. Lose to a weaker one — lose more." />
            <StepCard num={3} mobile={mobile} delay={160}
              title="We sync it live"
              body="Ratings refresh every 30 minutes from arena.ai. Prices live from OpenRouter. New models appear within hours of public release." />
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────
           HIGHLIGHTS
           ───────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: mobile ? 56 : 96 }}>
          <Reveal>
            <div style={{ marginBottom: 24, paddingLeft: 2 }}>
              <p style={{
                fontSize: 12, fontWeight: 600, color: 'var(--muted2)',
                textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px',
                fontFamily: MONO,
              }}>
                HIGHLIGHTS
              </p>
              <h2 style={{
                fontSize: mobile ? 28 : 36, fontWeight: 700,
                letterSpacing: '-0.035em', color: 'var(--text)',
                margin: 0, lineHeight: 1.1,
              }}>
                Picks worth knowing.
              </h2>
            </div>
          </Reveal>

          <div style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 14,
          }}>
            <HighlightCard label="Best Value"         model={bestValue} note="Highest ELO per dollar"          accent="#34C759" dark={dark} onNavigate={onNavigate} mobile={mobile} delay={0} />
            <HighlightCard label="Most Battle-Tested" model={mostVoted} note="Most arena votes"                 accent="#007AFF" dark={dark} onNavigate={onNavigate} mobile={mobile} delay={80} />
            <HighlightCard label="Best Open Weight"   model={bestOpen}  note="Top open-source / MIT / Apache"  accent="#FF9500" dark={dark} onNavigate={onNavigate} mobile={mobile} delay={160} />
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────
           CTA — dark Apple-style panel
           ───────────────────────────────────────────────────────── */}
        <Reveal>
          <section>
            <div style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: 26,
              padding: mobile ? '40px 24px' : '64px 56px',
              background: dark ? '#0a0a0c' : '#0a0a0c',
              border: '0.5px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <p style={{
                fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px',
                fontFamily: MONO,
              }}>
                FULL LEADERBOARD
              </p>
              <h2 style={{
                fontSize: mobile ? 32 : 52, fontWeight: 700,
                color: '#fff', letterSpacing: '-0.045em', lineHeight: 1.05,
                margin: '0 0 14px',
              }}>
                See every model.<br />Pick yours in minutes.
              </h2>
              <p style={{
                fontSize: mobile ? 15 : 17, color: 'rgba(255,255,255,0.6)',
                letterSpacing: '-0.015em', margin: '0 auto 32px', maxWidth: 540,
                lineHeight: 1.45,
              }}>
                Sort by ELO, votes, price, or context window. Filter open-weight, thinking, or by lab.
              </p>
              <button onClick={() => onNavigate('leaderboard')}
                className="aiwar-press-btn"
                style={{
                  height: 50, paddingInline: 26, borderRadius: 980,
                  background: '#fff', color: '#000',
                  fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
                  letterSpacing: '-0.015em',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                Open Leaderboard
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div style={{
                marginTop: 36, paddingTop: 24,
                borderTop: '0.5px solid rgba(255,255,255,0.08)',
                fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.005em',
                fontFamily: MONO,
              }}>
                {RELEASE} · Independent · No affiliation with arena.ai or OpenRouter
              </div>
            </div>
          </section>
        </Reveal>

      </div>
    </div>
  );
}
