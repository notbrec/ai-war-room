import { MODELS, ORG_CONFIG, RELEASE } from '../models-data.js';
import Logo from '../components/Logo.jsx';
import { useDark, useMobile } from '../hooks/useTheme.js';
import {
  SF, MONO, EASE,
  Reveal, AnimatedNumber, LivePulse, WordReveal,
  Tilt, Magnetic, AmbientDots, TrendArrow,
} from '../components/design.jsx';

const MEDALS = [
  { rank: 1, label: 'Gold',   dot: '#D4AF37' },
  { rank: 2, label: 'Silver', dot: '#A8A8A8' },
  { rank: 3, label: 'Bronze', dot: '#B87333' },
];

function eloColor(v) {
  if (v >= 1500) return '#34C759';
  if (v >= 1400) return '#007AFF';
  if (v >= 1300) return '#FF9500';
  return '#FF3B30';
}

/* ─── PodiumCard ─────────────────────────────────────────────────────────── */
function PodiumCard({ model, medal, onNavigate, dark, mobile, delay }) {
  const org    = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
  const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;
  const isFirst = medal.rank === 1;

  return (
    <Reveal delay={delay} style={{ display: 'flex' }}>
      <Tilt
        max={5} scale={1.015}
        spotlightColor={dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
        style={{ flex: 1, cursor: 'pointer' }}
      >
        <div onClick={() => onNavigate('leaderboard')}
          style={{
            position: 'relative',
            background: 'var(--card)',
            borderRadius: 22,
            border: '0.5px solid var(--sep)',
            padding: mobile ? '22px 20px' : (isFirst ? '30px 24px 26px' : '24px 22px'),
            overflow: 'hidden',
            height: '100%',
          }}>
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
            <TrendArrow seed={model.elo + medal.rank} />
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
      </Tilt>
    </Reveal>
  );
}

/* ─── HighlightCard ──────────────────────────────────────────────────────── */
function HighlightCard({ label, model, note, accent, dark, onNavigate, mobile, delay }) {
  if (!model) return null;
  const org    = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
  const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;

  return (
    <Reveal delay={delay} style={{ display: 'flex' }}>
      <Tilt
        max={4} scale={1.012}
        spotlightColor={`${accent}26`}
        style={{ flex: 1, cursor: 'pointer' }}
      >
        <div onClick={() => onNavigate('leaderboard')} style={{
          position: 'relative',
          background: 'var(--card)',
          borderRadius: 18,
          padding: mobile ? '20px 18px' : '22px 20px',
          border: '0.5px solid var(--sep)',
          height: '100%',
        }}>
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
            <TrendArrow seed={model.elo + label.length} />
          </div>
        </div>
      </Tilt>
    </Reveal>
  );
}

/* ─── StepCard ───────────────────────────────────────────────────────────── */
function StepCard({ num, title, body, mobile, delay }) {
  return (
    <Reveal delay={delay} style={{ display: 'flex' }}>
      <Tilt max={3} scale={1.008} spotlight={false} style={{ flex: 1 }}>
        <div style={{
          position: 'relative',
          background: 'var(--card)', borderRadius: 18,
          padding: mobile ? '22px 20px' : '26px 22px',
          border: '0.5px solid var(--sep)',
          height: '100%',
        }}>
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
      </Tilt>
    </Reveal>
  );
}

/* ─── LiveTicker — pausable marquee ──────────────────────────────────────── */
function LiveTicker({ models }) {
  if (!models || models.length === 0) return null;
  const items = models.slice(0, 16);
  const doubled = [...items, ...items];

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
      <div
        className="aiwar-marquee-pausable"
        style={{
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

/* ─── StatBlock ──────────────────────────────────────────────────────────── */
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

/* ─── HomePage ───────────────────────────────────────────────────────────── */
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
    <div style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh', position: 'relative' }}>
      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: mobile ? '0 18px 96px' : '0 24px 112px' }}>

        {/* ─────────────────────────────────────────────────────────
           HERO
           ───────────────────────────────────────────────────────── */}
        <section style={{
          position: 'relative',
          paddingTop: mobile ? 56 : 96,
          paddingBottom: mobile ? 48 : 80,
          textAlign: mobile ? 'left' : 'center',
        }}>
          {/* Ambient floating dots (decorative) */}
          {!mobile && <AmbientDots count={18} opacity={0.30} />}

          {/* Live badge */}
          <div style={{
            position: 'relative',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--card)', border: '0.5px solid var(--sep)',
            padding: '6px 12px 6px 10px', borderRadius: 980,
            marginBottom: mobile ? 24 : 32,
            boxShadow: 'var(--shadow)',
            fontFamily: MONO,
            opacity: 0, animation: `aiwar-fade-in 600ms ${EASE} both`,
          }}>
            <LivePulse color="#34C759" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.04em' }}>
              LIVE
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '-0.005em' }}>
              · arena.ai + OpenRouter · refreshed every 30 min
            </span>
          </div>

          {/* Headline with word-by-word reveal */}
          <h1 style={{
            position: 'relative',
            fontSize: mobile ? 'clamp(44px,12vw,60px)' : 'clamp(64px,7vw,104px)',
            fontWeight: 700, letterSpacing: '-0.062em', lineHeight: 0.95,
            color: 'var(--text)', margin: '0 0 24px',
            maxWidth: mobile ? '100%' : 900,
            marginInline: mobile ? 0 : 'auto',
          }}>
            <WordReveal baseDelay={120} perWord={90}>Track the models</WordReveal>
            <br />
            <WordReveal baseDelay={460} perWord={90}>at war.</WordReveal>
          </h1>

          {/* Subhead */}
          <p style={{
            position: 'relative',
            fontSize: mobile ? 17 : 22, lineHeight: 1.4,
            color: 'var(--muted)', letterSpacing: '-0.022em',
            maxWidth: mobile ? '100%' : 640,
            margin: mobile ? '0 0 32px' : '0 auto 40px',
            fontWeight: 400,
            opacity: 0, animation: `aiwar-fade-up 900ms ${EASE} 720ms both`,
          }}>
            {snap.exact ? `${snap.count}` : `${snap.count}+`} of the world's strongest AI models, ranked by
            real human votes — not benchmarks. Live pricing. Daily refreshes.
          </p>

          {/* CTAs */}
          <div style={{
            position: 'relative',
            display: 'flex', gap: 10, flexWrap: 'wrap',
            justifyContent: mobile ? 'flex-start' : 'center',
            marginBottom: mobile ? 48 : 72,
            opacity: 0, animation: `aiwar-fade-up 900ms ${EASE} 840ms both`,
          }}>
            <Magnetic strength={0.20}>
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
            </Magnetic>
            <Magnetic strength={0.18}>
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
            </Magnetic>
          </div>

          {/* Stat row with count-up animations */}
          <div style={{
            position: 'relative',
            display: 'flex', gap: mobile ? 28 : 56, flexWrap: 'wrap',
            justifyContent: mobile ? 'flex-start' : 'center',
            borderTop: mobile ? 'none' : '0.5px solid var(--sep)',
            paddingTop: mobile ? 0 : 32,
            opacity: 0, animation: `aiwar-fade-up 900ms ${EASE} 960ms both`,
          }}>
            <StatBlock
              value={snap.count}
              format={v => Math.round(v).toString()}
              suffix={snap.exact ? '' : '+'}
              label="Models"
              isLoaded={true}
              mobile={mobile}
            />
            <StatBlock value={orgs} label="Labs" isLoaded={isLoaded} mobile={mobile} />
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
            <StatBlock value={openCount} label="Open weight" isLoaded={isLoaded} mobile={mobile} />
          </div>
        </section>

        {/* ── Live ticker (pausable) ──────────────────────────────── */}
        {isLoaded && (
          <Reveal>
            <div style={{ marginBottom: mobile ? 56 : 88 }}>
              <LiveTicker models={data} />
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
              {topLabs.map((lab, i) => {
                const cfg = ORG_CONFIG[lab] ?? { color: '#8E8E93' };
                return (
                  <button key={lab} onClick={() => onNavigate('leaderboard')}
                    style={{
                      height: 30, paddingInline: 14, borderRadius: 980,
                      background: 'var(--card)', border: '0.5px solid var(--sep)',
                      color: 'var(--text)', fontSize: 12.5, fontWeight: 500,
                      cursor: 'pointer', letterSpacing: '-0.01em',
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      transition: `background 200ms, color 200ms, transform 200ms ${EASE}, border-color 200ms`,
                      opacity: 0, animation: `aiwar-fade-up 600ms ${EASE} ${i * 50}ms both`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--text)';
                      e.currentTarget.style.color = 'var(--bg)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--card)';
                      e.currentTarget.style.color = 'var(--text)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
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
                className="aiwar-press-btn aiwar-link-underline"
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
                    delay={i * 100}
                  />
                ))
              : MEDALS.map((medal, i) => (
                  <div key={i} className="aiwar-shimmer" style={{
                    borderRadius: 22, border: '0.5px solid var(--sep)',
                    padding: '24px 22px', minHeight: 240,
                  }} />
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
           CTA
           ───────────────────────────────────────────────────────── */}
        <Reveal>
          <section>
            <Tilt max={3} scale={1.005} spotlight={false}>
              <div style={{
                position: 'relative', overflow: 'hidden',
                borderRadius: 26,
                padding: mobile ? '40px 24px' : '64px 56px',
                background: '#0a0a0c',
                border: '0.5px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}>
                <AmbientDots count={20} color="#ffffff" opacity={0.15} />

                <div style={{ position: 'relative' }}>
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
                  <Magnetic strength={0.20}>
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
                  </Magnetic>

                  <div style={{
                    marginTop: 36, paddingTop: 24,
                    borderTop: '0.5px solid rgba(255,255,255,0.08)',
                    fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.005em',
                    fontFamily: MONO,
                  }}>
                    {RELEASE} · Independent · No affiliation with arena.ai or OpenRouter
                  </div>
                </div>
              </div>
            </Tilt>
          </section>
        </Reveal>

      </div>
    </div>
  );
}
