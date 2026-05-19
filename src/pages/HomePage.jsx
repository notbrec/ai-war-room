import { MODELS, ORG_CONFIG, RELEASE } from '../models-data.js';
import Logo from '../components/Logo.jsx';
import { useDark, useMobile } from '../hooks/useTheme.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
const MONO = "'SF Mono','JetBrains Mono',ui-monospace,'Menlo',monospace";

const MEDALS = [
  { rank: 1, label: 'Gold',   textColor: '#7A5500', bg: '#FFF8E1', border: '#FFD700', dot: '#FFD700', glow: 'rgba(255,215,0,0.28)'  },
  { rank: 2, label: 'Silver', textColor: '#4A4A4A', bg: '#F5F5F5', border: '#C0C0C0', dot: '#C0C0C0', glow: 'rgba(192,192,192,0.22)' },
  { rank: 3, label: 'Bronze', textColor: '#5C3000', bg: '#FFF3EE', border: '#CD7F32', dot: '#CD7F32', glow: 'rgba(205,127,50,0.22)' },
];

function eloColor(v) {
  if (v >= 1500) return '#34C759';
  if (v >= 1400) return '#007AFF';
  if (v >= 1300) return '#FF9500';
  return '#FF3B30';
}

// ── Tiny live-pulse dot ──────────────────────────────────────────────────────
function LivePulse({ color = '#34C759' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 4, background: color,
        opacity: 0.35,
        animation: 'aiwar-ping 1.6s cubic-bezier(0,0,.2,1) infinite',
      }} />
      <span style={{
        position: 'relative', borderRadius: 4, background: color,
        width: '100%', height: '100%', boxShadow: `0 0 8px ${color}`,
      }} />
    </span>
  );
}

// ── Podium card with size variation (#1 taller, #2 #3 shorter) ──────────────
function PodiumCard({ model, medal, onNavigate, dark, mobile }) {
  const org    = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
  const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;
  const isFirst = medal.rank === 1;

  return (
    <div onClick={() => onNavigate('leaderboard')}
      style={{
        position: 'relative', flex: 1, minWidth: 0, cursor: 'pointer',
        background: 'var(--card)',
        borderRadius: 20,
        border: `1px solid ${medal.border}33`,
        padding: mobile ? '20px 18px' : (isFirst ? '28px 22px 24px' : '22px 20px'),
        overflow: 'hidden',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
        boxShadow: dark
          ? `0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)`
          : `0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 24px rgba(0,0,0,0.06)`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 16px 40px ${medal.glow}`;
        e.currentTarget.style.borderColor = `${medal.border}99`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = dark
          ? `0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)`
          : `0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 24px rgba(0,0,0,0.06)`;
        e.currentTarget.style.borderColor = `${medal.border}33`;
      }}
    >
      {/* Top glow stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent 0%, ${medal.dot} 50%, transparent 100%)`,
        opacity: 0.9,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: medal.dot,
          background: `${medal.dot}1A`,
          border: `1px solid ${medal.border}55`,
          borderRadius: 6, padding: '3px 8px',
        }}>
          #{medal.rank} · {medal.label}
        </span>
        <div style={{
          width: 34, height: 34, borderRadius: 10, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: org.color,
        }}>
          {model.initials}
        </div>
      </div>

      <div style={{
        fontSize: isFirst ? 18 : 16, fontWeight: 600,
        color: 'var(--text)', letterSpacing: '-0.024em', lineHeight: 1.25, marginBottom: 4,
      }}>
        {model.name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '-0.01em', marginBottom: 18 }}>
        {model.org}
      </div>

      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontSize: isFirst ? 44 : 38, fontWeight: 700, letterSpacing: '-0.045em',
          color: medal.dot, fontVariantNumeric: 'tabular-nums',
          textShadow: `0 0 20px ${medal.glow}`,
          lineHeight: 1,
        }}>
          {model.elo}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted2)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>ELO</span>
      </div>

      <div style={{ display: 'flex', gap: 14, paddingTop: 12, borderTop: '0.5px solid var(--sep)' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Votes</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', marginTop: 2 }}>{model.votesLabel}</div>
        </div>
        {model.priceIn != null && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>$/M in</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>${model.priceIn.toFixed(2)}</div>
          </div>
        )}
        {model.context && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Context</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{model.context}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Highlight card with glass effect ────────────────────────────────────────
function HighlightCard({ label, model, note, color, dark, onNavigate, mobile }) {
  if (!model) return null;
  const org    = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
  const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;

  return (
    <div onClick={() => onNavigate('leaderboard')} style={{
      position: 'relative', flex: 1, minWidth: 0, cursor: 'pointer',
      background: 'var(--card)',
      borderRadius: 16,
      padding: mobile ? '18px 16px' : '20px 18px',
      overflow: 'hidden',
      border: `1px solid ${color}1F`,
      transition: 'transform 0.18s, border-color 0.18s, box-shadow 0.18s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = `${color}5C`;
        e.currentTarget.style.boxShadow = `0 12px 32px ${color}22`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = `${color}1F`;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Decorative gradient corner */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 120, height: 120,
        background: `radial-gradient(circle, ${color}24 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em',
          background: `${color}14`, padding: '3px 8px', borderRadius: 5,
        }}>
          {label}
        </span>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: org.color, flexShrink: 0,
        }}>
          {model.initials}
        </div>
      </div>

      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.022em', marginBottom: 2 }}>
        {model.name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '-0.01em', marginBottom: 14 }}>
        {model.org} · {note}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingTop: 12, borderTop: '0.5px solid var(--sep)' }}>
        <span style={{
          fontSize: 24, fontWeight: 700, color: eloColor(model.elo), letterSpacing: '-0.035em',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {model.elo}
        </span>
        <span style={{ fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>ELO</span>
      </div>
    </div>
  );
}

// ── How-it-works step card ──────────────────────────────────────────────────
function StepCard({ num, title, body, accent, mobile }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, position: 'relative',
      background: 'var(--card)', borderRadius: 16,
      padding: mobile ? '20px 18px' : '24px 20px',
      border: '0.5px solid var(--sep)',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 10,
        background: `${accent}1A`, color: accent,
        fontSize: 14, fontWeight: 700, fontFamily: MONO, letterSpacing: '-0.02em',
        marginBottom: 14,
      }}>
        0{num}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.022em', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--muted)', letterSpacing: '-0.01em' }}>
        {body}
      </div>
    </div>
  );
}

export default function HomePage({ onNavigate, liveModels, countSnapshot }) {
  const dark       = useDark();
  const mobile     = useMobile();
  const isLoaded   = !!liveModels;
  const data       = liveModels ?? MODELS;
  const top3       = isLoaded ? data.slice(0, 3) : [];
  const totalVotes = data.reduce((s, m) => s + m.votes, 0);
  const orgs       = new Set(data.map(m => m.org)).size;
  const openCount  = data.filter(m => m.isOpen).length;
  const SKEL       = '—';

  const snap          = countSnapshot ?? { count: 280, exact: false };
  const modelCountStr = snap.exact ? String(snap.count) : `${snap.count}+`;
  const modelLabel    = snap.exact ? `${snap.count} models` : `${snap.count}+ models`;

  const bestValue  = isLoaded ? [...data].filter(m => m.priceIn != null && m.elo >= 1350)
    .sort((a, b) => a.priceIn - b.priceIn)[0] : null;
  const mostVoted  = isLoaded ? [...data].sort((a, b) => b.votes - a.votes)[0] : null;
  const bestOpen   = isLoaded ? [...data].filter(m => m.isOpen)[0] : null;

  const topLabs = isLoaded ? [...new Set(data.slice(0, 30).map(m => m.org))].slice(0, 8) : [];

  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Inline keyframes for live pulse + gradient sheen */}
      <style>{`
        @keyframes aiwar-ping {
          0%   { transform: scale(1);    opacity: 0.7; }
          75%, 100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes aiwar-sheen {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .aiwar-gradient-text {
          background: linear-gradient(90deg, #FF3B30 0%, #FF9500 25%, #FF3B30 50%, #FF9500 75%, #FF3B30 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: aiwar-sheen 8s linear infinite;
        }
        .aiwar-cta-glow:hover {
          box-shadow: 0 12px 40px rgba(255,59,48,0.45) !important;
          transform: translateY(-1px);
        }
        .aiwar-lab-pill {
          transition: background 0.18s, color 0.18s, border-color 0.18s;
        }
        .aiwar-lab-pill:hover {
          background: var(--text) !important;
          color: var(--bg) !important;
        }
      `}</style>

      {/* Decorative ambient glow */}
      <div aria-hidden style={{
        position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
        width: 1200, height: 600, pointerEvents: 'none',
        background: dark
          ? 'radial-gradient(ellipse at center, rgba(255,59,48,0.10) 0%, transparent 60%)'
          : 'radial-gradient(ellipse at center, rgba(255,59,48,0.06) 0%, transparent 60%)',
      }} />

      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: mobile ? '0 16px 80px' : '0 24px 88px' }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          flexDirection: mobile ? 'column' : 'row',
          gap: mobile ? 0 : 48,
          paddingTop: mobile ? 44 : 80, paddingBottom: mobile ? 40 : 64,
        }}>
          {/* Left: text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Live badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--card)', border: '0.5px solid var(--sep)',
              padding: '6px 12px 6px 10px', borderRadius: 980,
              marginBottom: 22,
              boxShadow: 'var(--shadow)',
            }}>
              <LivePulse color="#34C759" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.02em' }}>
                LIVE
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '-0.01em' }}>
                · {RELEASE} · arena.ai + OpenRouter
              </span>
            </div>

            <h1 style={{
              fontSize: mobile ? 'clamp(42px,11vw,58px)' : 'clamp(56px,5.6vw,82px)',
              fontWeight: 700, letterSpacing: '-0.055em', lineHeight: 0.98,
              color: 'var(--text)', margin: '0 0 22px',
            }}>
              Track the{' '}
              <span className="aiwar-gradient-text">
                models
              </span>
              <br />at war.
            </h1>

            <p style={{
              fontSize: mobile ? 17 : 19, lineHeight: 1.55,
              color: 'var(--muted)', letterSpacing: '-0.018em',
              maxWidth: 520, margin: '0 0 32px',
            }}>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{modelLabel}</span> ranked by ELO —
              earned from real human arena battles, not benchmarks. Live pricing, daily refreshes.
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 40 }}>
              <button onClick={() => onNavigate('leaderboard')}
                className="aiwar-cta-glow"
                style={{
                  height: mobile ? 46 : 52, paddingInline: mobile ? 22 : 26, borderRadius: 980,
                  background: 'linear-gradient(135deg, #FF3B30 0%, #FF6B35 100%)',
                  color: '#fff', fontSize: mobile ? 14 : 15, fontWeight: 600,
                  border: 'none', cursor: 'pointer', letterSpacing: '-0.015em',
                  boxShadow: '0 6px 22px rgba(255,59,48,0.30)',
                  transition: 'transform 0.18s, box-shadow 0.18s',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                View Rankings
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button onClick={() => onNavigate('guide')} style={{
                height: mobile ? 46 : 52, paddingInline: mobile ? 22 : 26, borderRadius: 980,
                background: 'var(--card)', color: 'var(--text)',
                fontSize: mobile ? 14 : 15, fontWeight: 600,
                border: '0.5px solid var(--sep)', cursor: 'pointer', letterSpacing: '-0.015em',
                transition: 'background 0.18s, border-color 0.18s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)'; }}
              >
                Read the Guide
              </button>
            </div>

            {/* Stat row */}
            <div style={{ display: 'flex', gap: mobile ? 22 : 36, flexWrap: 'wrap' }}>
              {[
                { v: modelCountStr,                                                                                                       l: 'Models',       confirmed: snap.exact },
                { v: isLoaded ? orgs                                                                                              : SKEL, l: 'Labs',         confirmed: isLoaded },
                { v: isLoaded ? (totalVotes >= 1_000_000 ? `${(totalVotes/1_000_000).toFixed(1)}M` : `${(totalVotes/1000).toFixed(0)}K`) : SKEL, l: 'Votes cast', confirmed: isLoaded },
                { v: isLoaded ? openCount                                                                                         : SKEL, l: 'Open weight',  confirmed: isLoaded },
              ].map(s => (
                <div key={s.l}>
                  <div style={{
                    fontSize: mobile ? 24 : 30, fontWeight: 700, letterSpacing: '-0.04em',
                    color: s.confirmed ? 'var(--text)' : 'var(--muted2)',
                    fontVariantNumeric: 'tabular-nums', transition: 'color 0.25s',
                    lineHeight: 1,
                  }}>{s.v}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '-0.01em', marginTop: 6 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: decorative logo */}
          {!mobile && (
            <div style={{ flexShrink: 0, position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: -40,
                background: 'radial-gradient(circle, rgba(255,59,48,0.12) 0%, transparent 65%)',
                filter: 'blur(20px)', pointerEvents: 'none',
              }} />
              <div style={{ opacity: dark ? 0.10 : 0.07, position: 'relative' }}>
                <Logo size={360} color="var(--text)" />
              </div>
            </div>
          )}
        </div>

        {/* ── Top labs strip ───────────────────────────────────────── */}
        {topLabs.length > 0 && (
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
            marginBottom: mobile ? 44 : 56,
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginRight: 4 }}>
              Top labs
            </span>
            {topLabs.map(lab => {
              const cfg = ORG_CONFIG[lab] ?? { color: '#8E8E93' };
              return (
                <button key={lab} onClick={() => onNavigate('leaderboard')}
                  className="aiwar-lab-pill"
                  style={{
                    height: 28, paddingInline: 12, borderRadius: 980,
                    background: 'var(--card)', border: `1px solid ${cfg.color}33`,
                    color: 'var(--text)', fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', letterSpacing: '-0.01em',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: cfg.color }} />
                  {lab}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Top 3 podium ─────────────────────────────────────────── */}
        <section style={{ marginBottom: mobile ? 44 : 56 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, paddingLeft: 2 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              The Podium · Top 3
            </p>
            <button onClick={() => onNavigate('leaderboard')} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 12, color: '#FF3B30', fontWeight: 600, letterSpacing: '-0.01em',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              See all →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 12 }}>
            {isLoaded
              ? top3.map((m, i) => <PodiumCard key={m.slug} model={m} medal={MEDALS[i]} onNavigate={onNavigate} dark={dark} mobile={mobile} />)
              : MEDALS.map((medal, i) => (
                  <div key={i} style={{
                    background: 'var(--card)', borderRadius: 20, border: `1px solid ${medal.border}33`,
                    padding: '22px 20px', flex: 1, minHeight: 220,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--muted2)', letterSpacing: '-0.01em' }}>Loading…</span>
                  </div>
                ))
            }
          </div>
        </section>

        {/* ── How it works (3 steps) ───────────────────────────────── */}
        <section style={{ marginBottom: mobile ? 44 : 56 }}>
          <div style={{ marginBottom: 16, paddingLeft: 2 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
              How it works
            </p>
            <h2 style={{ fontSize: mobile ? 22 : 26, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
              Real battles. Real numbers. No marketing.
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 10 }}>
            <StepCard num={1} accent="#FF3B30" mobile={mobile}
              title="Humans pick the winner"
              body="Each matchup is a real conversation with two anonymous responses. Hundreds of thousands of human voters decide which one wins." />
            <StepCard num={2} accent="#007AFF" mobile={mobile}
              title="ELO does the math"
              body="The same statistical system that ranks chess grandmasters. Beat a stronger model — gain more points. Lose to a weaker — lose more." />
            <StepCard num={3} accent="#34C759" mobile={mobile}
              title="We sync it live"
              body="ELO refreshes every 30 minutes from arena.ai. Prices live from OpenRouter. New models appear within hours of public release." />
          </div>
        </section>

        {/* ── Highlights ──────────────────────────────────────────── */}
        <section style={{ marginBottom: mobile ? 44 : 56 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, paddingLeft: 2 }}>
            Highlights
          </p>
          <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 12 }}>
            <HighlightCard label="Best Value"         model={bestValue} note="Highest ELO per dollar"          color="#34C759" dark={dark} onNavigate={onNavigate} mobile={mobile} />
            <HighlightCard label="Most Battle-Tested" model={mostVoted} note="Most arena votes"                 color="#007AFF" dark={dark} onNavigate={onNavigate} mobile={mobile} />
            <HighlightCard label="Best Open Weight"   model={bestOpen}  note="Top open-source / MIT / Apache"  color="#FF9500" dark={dark} onNavigate={onNavigate} mobile={mobile} />
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <section>
          <div style={{
            position: 'relative', overflow: 'hidden',
            borderRadius: 22,
            padding: mobile ? '28px 22px' : '36px 32px',
            background: dark
              ? 'linear-gradient(135deg, #1a1a1d 0%, #0d0d10 100%)'
              : 'linear-gradient(135deg, #1d1d1f 0%, #000 100%)',
            border: dark ? '0.5px solid var(--sep)' : 'none',
          }}>
            {/* Decorative glow */}
            <div aria-hidden style={{
              position: 'absolute', top: -120, right: -120, width: 300, height: 300,
              background: 'radial-gradient(circle, rgba(255,59,48,0.30) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
            <div aria-hidden style={{
              position: 'absolute', bottom: -100, left: -80, width: 240, height: 240,
              background: 'radial-gradient(circle, rgba(0,122,255,0.22) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />

            <div style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, flexWrap: 'wrap',
            }}>
              <div>
                <div style={{
                  fontSize: mobile ? 22 : 28, fontWeight: 700,
                  color: '#fff', letterSpacing: '-0.035em', lineHeight: 1.15, marginBottom: 6,
                }}>
                  {snap.exact ? `See all ${snap.count} models.` : `See all ${snap.count}+ models.`}
                </div>
                <div style={{ fontSize: mobile ? 13 : 14, color: 'rgba(255,255,255,0.55)', letterSpacing: '-0.01em' }}>
                  Sort by ELO, votes, price, or context window. Filter open-weight, thinking, or by lab.
                </div>
              </div>
              <button onClick={() => onNavigate('leaderboard')}
                className="aiwar-cta-glow"
                style={{
                  height: 44, paddingInline: 20, borderRadius: 980,
                  background: '#fff', color: '#000',
                  fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                  flexShrink: 0, letterSpacing: '-0.015em',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  transition: 'transform 0.18s, box-shadow 0.18s',
                }}>
                Full Leaderboard
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
