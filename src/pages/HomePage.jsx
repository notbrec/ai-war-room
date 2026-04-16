import { MODELS, ORG_CONFIG, RELEASE } from '../models-data.js';
import Logo from '../components/Logo.jsx';
import { useDark, useMobile } from '../hooks/useTheme.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";

const MEDALS = [
  { rank: 1, label: 'Gold',   textColor: '#7A5500', bg: '#FFF8E1', border: '#FFD70044', dot: '#FFD700' },
  { rank: 2, label: 'Silver', textColor: '#4A4A4A', bg: '#F5F5F5', border: '#C0C0C044', dot: '#C0C0C0' },
  { rank: 3, label: 'Bronze', textColor: '#5C3000', bg: '#FFF3EE', border: '#CD7F3244', dot: '#CD7F32' },
];

function eloColor(v) {
  if (v >= 1500) return '#34C759';
  if (v >= 1400) return '#007AFF';
  if (v >= 1300) return '#FF9500';
  return '#FF3B30';
}

function PodiumCard({ model, medal, onNavigate, dark }) {
  const org    = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
  const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;

  return (
    <div onClick={() => onNavigate('leaderboard')}
      style={{
        background: 'var(--card)', borderRadius: 18,
        border: `1px solid ${medal.border}`,
        padding: '18px 16px', cursor: 'pointer', flex: 1, minWidth: 0,
        transition: 'transform 0.18s, box-shadow 0.18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: medal.textColor, background: medal.bg,
          border: `1px solid ${medal.border}`, borderRadius: 5, padding: '2px 7px',
        }}>
          #{medal.rank} {medal.label}
        </span>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: org.color }}>
          {model.initials}
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.022em', lineHeight: 1.3, marginBottom: 2 }}>
        {model.name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '-0.01em', marginBottom: 14 }}>
        {model.org}
      </div>

      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: medal.dot, fontVariantNumeric: 'tabular-nums' }}>
          {model.elo}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>ELO</span>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Votes</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{model.votesLabel}</div>
        </div>
        {model.priceIn != null && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Price/M in</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>${model.priceIn.toFixed(2)}</div>
          </div>
        )}
        {model.context && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Context</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{model.context}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage({ onNavigate }) {
  const dark       = useDark();
  const mobile     = useMobile();
  const top3       = MODELS.slice(0, 3);
  const totalVotes = MODELS.reduce((s, m) => s + m.votes, 0);
  const orgs       = new Set(MODELS.map(m => m.org)).size;
  const openCount  = MODELS.filter(m => m.isOpen).length;

  const bestValue  = [...MODELS].filter(m => m.priceIn != null && m.elo >= 1350)
    .sort((a, b) => a.priceIn - b.priceIn)[0];
  const mostVoted  = [...MODELS].sort((a, b) => b.votes - a.votes)[0];
  const bestOpen   = [...MODELS].filter(m => m.isOpen)[0];

  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: mobile ? '0 16px 72px' : '0 24px 72px' }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          flexDirection: mobile ? 'column' : 'row',
          gap: mobile ? 0 : 48,
          paddingTop: mobile ? 40 : 64, paddingBottom: mobile ? 36 : 56,
        }}>
          {/* Left: text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Logo size={14} color="#FF3B30" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#FF3B30', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {RELEASE}
              </span>
            </div>

            <h1 style={{ fontSize: mobile ? 'clamp(38px,10vw,52px)' : 'clamp(48px,5vw,72px)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1.02, color: 'var(--text)', margin: '0 0 18px' }}>
              Track the<br />models at war.
            </h1>

            <p style={{ fontSize: mobile ? 16 : 18, lineHeight: 1.55, color: 'var(--muted)', letterSpacing: '-0.02em', maxWidth: 500, margin: '0 0 28px' }}>
              {MODELS.length} models ranked by ELO — earned from real arena battles, not benchmarks. Updated live from OpenRouter.
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => onNavigate('leaderboard')} style={{
                height: mobile ? 42 : 48, paddingInline: mobile ? 20 : 24, borderRadius: 980,
                background: 'var(--text)', color: 'var(--bg)',
                fontSize: mobile ? 14 : 15, fontWeight: 600, border: 'none', cursor: 'pointer', letterSpacing: '-0.015em',
              }}>
                View Rankings
              </button>
              <button onClick={() => onNavigate('methodology')} style={{
                height: mobile ? 42 : 48, paddingInline: mobile ? 20 : 24, borderRadius: 980,
                background: 'var(--pill)', color: 'var(--text)',
                fontSize: mobile ? 14 : 15, fontWeight: 600, border: 'none', cursor: 'pointer', letterSpacing: '-0.015em',
              }}>
                How it works
              </button>
            </div>

            <div style={{ display: 'flex', gap: mobile ? 20 : 32, marginTop: 36, flexWrap: 'wrap' }}>
              {[
                { v: MODELS.length,                         l: 'Models'      },
                { v: orgs,                                  l: 'Labs'        },
                { v: `${(totalVotes/1000).toFixed(0)}K`,   l: 'Votes cast'  },
                { v: openCount,                             l: 'Open weight' },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: mobile ? 22 : 28, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '-0.01em', marginTop: 1 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: decorative logo — only on wide screens */}
          {!mobile && (
            <div style={{ flexShrink: 0, opacity: 0.06, pointerEvents: 'none' }}>
              <Logo size={340} color="var(--text)" />
            </div>
          )}
        </div>

        {/* ── Top 3 ─────────────────────────────────────────────────── */}
        <section>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, paddingLeft: 2 }}>
            Top 3 — ELO Leaderboard
          </p>
          <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 8 }}>
            {top3.map((m, i) => <PodiumCard key={m.slug} model={m} medal={MEDALS[i]} onNavigate={onNavigate} dark={dark} />)}
          </div>
        </section>

        {/* ── Highlights ────────────────────────────────────────────── */}
        <section style={{ marginTop: 44 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, paddingLeft: 2 }}>
            Highlights
          </p>
          <div style={{ background: 'var(--card)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            {[
              { label: 'Best Value',         model: bestValue, note: 'Highest ELO per dollar',        color: '#34C759' },
              { label: 'Most Battle-Tested', model: mostVoted, note: 'Most arena votes',               color: '#007AFF' },
              { label: 'Best Open Weight',   model: bestOpen,  note: 'Top open-source / MIT / Apache', color: '#FF9500' },
            ].map((h, i, arr) => {
              if (!h.model) return null;
              const org    = ORG_CONFIG[h.model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
              const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;
              return (
                <div key={h.label}>
                  <div onClick={() => onNavigate('leaderboard')} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    alignItems: 'center', padding: '14px 16px', cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: org.color, flexShrink: 0 }}>
                        {h.model.initials}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: h.color, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h.label}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                          {h.model.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '-0.01em' }}>
                          {h.model.org} · {h.note}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: eloColor(h.model.elo), fontVariantNumeric: 'tabular-nums' }}>
                        {h.model.elo}
                      </span>
                      <svg width="6" height="11" viewBox="0 0 6 11" fill="none">
                        <path d="M1 1l4 4.5L1 10" stroke="var(--sep)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  {i < arr.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: 62 }}/>}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────── */}
        <section style={{ marginTop: 44 }}>
          <div style={{
            background: dark ? 'var(--card2)' : 'var(--text)',
            borderRadius: 18, padding: '26px 24px',
            border: dark ? '0.5px solid var(--sep)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: dark ? 'var(--text)' : 'var(--bg)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                See all {MODELS.length} models.
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, letterSpacing: '-0.01em' }}>
                Sort by ELO, votes, price, or context window.
              </div>
            </div>
            <button onClick={() => onNavigate('leaderboard')} style={{
              height: 40, paddingInline: 18, borderRadius: 980,
              background: dark ? 'var(--text)' : 'var(--bg)',
              color: dark ? 'var(--bg)' : 'var(--text)',
              fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', flexShrink: 0,
            }}>
              Full Leaderboard →
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
