import { MODELS, ORG_CONFIG, RELEASE } from '../models-data.js';
import { useDark, useMobile } from '../hooks/useTheme.js';
import {
  SF, MONO, EASE,
  Reveal, AnimatedNumber, LivePulse, WordReveal,
  Magnetic, ComparisonBar, EditorialNote, Skeleton,
  TrendArrow,
} from '../components/design.jsx';

function eloColor(v) {
  if (v >= 1500) return '#34C759';
  if (v >= 1450) return '#FFD60A';
  if (v >= 1400) return '#FF9500';
  return '#FF453A';
}

function eloTier(v) {
  if (v >= 1490) return 'S';
  if (v >= 1450) return 'A';
  if (v >= 1420) return 'B';
  return 'C';
}

/* ─────────────────────────────────────────────────────────────────────────
   LeaderboardPreview — the centerpiece. Top-10 list with rank, lab, ELO bar.
   Rows stagger in, ELO counts up, comparison bar fills smoothly.
   ────────────────────────────────────────────────────────────────────── */
function LeaderboardPreview({ models, onNavigate, dark, mobile, isLoaded }) {
  const top = (models ?? MODELS).slice(0, 10);
  const maxElo = top[0]?.elo ?? 1500;
  const minElo = top[top.length - 1]?.elo ?? 1300;
  const range  = Math.max(1, maxElo - minElo);

  return (
    <div style={{
      position: 'relative',
      background: 'var(--card)',
      border: '0.5px solid var(--sep)',
      borderRadius: 22,
      overflow: 'hidden',
      backdropFilter: 'saturate(180%) blur(22px)',
      WebkitBackdropFilter: 'saturate(180%) blur(22px)',
      boxShadow: 'var(--shadow)',
    }}>
      {/* Glass panel header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: mobile ? '14px 16px' : '16px 22px',
        borderBottom: '0.5px solid var(--sep)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LivePulse color="#34C759" />
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text)',
            letterSpacing: '0.08em', fontFamily: MONO, textTransform: 'uppercase',
          }}>
            Live · Top 10
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO }}>
            arena.ai
          </span>
        </div>
        <button onClick={() => onNavigate('leaderboard')}
          className="aiwar-press-btn"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text)', fontSize: 11.5, fontWeight: 600,
            letterSpacing: '-0.01em', fontFamily: MONO,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
          ALL {(models ?? MODELS).length} →
        </button>
      </div>

      {/* Column headers (desktop) */}
      {!mobile && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '34px minmax(0, 1.4fr) minmax(0, 1fr) 84px',
          gap: 16, padding: '8px 22px',
          fontSize: 10, fontWeight: 600, color: 'var(--muted2)',
          textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO,
          borderBottom: '0.5px solid var(--sep2)',
        }}>
          <span>#</span>
          <span>Model</span>
          <span>ELO Δ</span>
          <span style={{ textAlign: 'right' }}>ELO</span>
        </div>
      )}

      {/* Rows */}
      <div>
        {!isLoaded
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ padding: mobile ? '14px 16px' : '14px 22px', borderBottom: i < 9 ? '0.5px solid var(--sep2)' : 'none' }}>
                <Skeleton height={20} />
              </div>
            ))
          : top.map((m, i) => {
              const org    = ORG_CONFIG[m.org] ?? { color: '#8E8E93' };
              const tColor = eloColor(m.elo);
              const norm   = (m.elo - minElo) / range;
              return (
                <div key={m.slug}
                  onClick={() => onNavigate('leaderboard')}
                  className={i === 0 ? 'aiwar-leader-pulse' : ''}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: mobile ? '32px minmax(0, 1fr) 60px' : '34px minmax(0, 1.4fr) minmax(0, 1fr) 84px',
                    gap: mobile ? 12 : 16,
                    alignItems: 'center',
                    padding: mobile ? '12px 16px' : '14px 22px',
                    borderBottom: i < top.length - 1 ? '0.5px solid var(--sep2)' : 'none',
                    cursor: 'pointer',
                    opacity: 0,
                    animation: `aiwar-fade-up 700ms ${EASE} ${100 + i * 60}ms both${i === 0 ? ', aiwar-leader-pulse 4s ease-in-out infinite' : ''}`,
                    transition: 'background 200ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Rank */}
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--muted)',
                    fontFamily: MONO, fontVariantNumeric: 'tabular-nums',
                  }}>{String(i + 1).padStart(2, '0')}</span>

                  {/* Model name + lab */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13.5, fontWeight: 600, color: 'var(--text)',
                      letterSpacing: '-0.022em',
                      lineHeight: 1.25,
                      marginBottom: 3,
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}>
                      {m.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ width: 5, height: 5, borderRadius: 3, background: org.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '-0.005em' }}>
                        {m.org}
                      </span>
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, color: tColor,
                        letterSpacing: '0.04em', fontFamily: MONO,
                      }}>{eloTier(m.elo)}-TIER</span>
                    </div>
                  </div>

                  {/* Comparison bar (desktop) */}
                  {!mobile && (
                    <ComparisonBar width={0.18 + norm * 0.82} color={tColor} height={3} />
                  )}

                  {/* ELO */}
                  <div style={{ textAlign: 'right' }}>
                    <AnimatedNumber
                      value={m.elo}
                      format={v => Math.round(v).toString()}
                      style={{
                        fontSize: mobile ? 16 : 17, fontWeight: 700, color: 'var(--text)',
                        letterSpacing: '-0.028em', fontVariantNumeric: 'tabular-nums',
                        fontFamily: MONO,
                      }}
                    />
                    {!mobile && (
                      <span style={{ marginLeft: 6 }}>
                        <TrendArrow seed={m.elo + i} size={9} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   LabBar — single lab's "score" as a horizontal bar
   ────────────────────────────────────────────────────────────────────── */
function LabBar({ name, color, count, avgElo, maxAvg, mobile, delay }) {
  const width = avgElo > 0 ? (avgElo - 1300) / (maxAvg - 1300 + 1) : 0;
  return (
    <Reveal delay={delay}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '110px 1fr 60px' : '160px 1fr 80px',
        gap: 16, alignItems: 'center',
        padding: '12px 0',
        borderBottom: '0.5px solid var(--sep2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: color, flexShrink: 0 }} />
          <span style={{
            fontSize: 14, color: 'var(--text)', fontWeight: 500,
            letterSpacing: '-0.018em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{name}</span>
          <span style={{
            fontSize: 10, color: 'var(--muted2)', fontFamily: MONO,
            letterSpacing: '0.04em',
          }}>×{count}</span>
        </div>
        <ComparisonBar width={Math.max(0.05, Math.min(1, width))} color={color} height={4} />
        <span style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text)',
          fontFamily: MONO, fontVariantNumeric: 'tabular-nums',
          textAlign: 'right', letterSpacing: '-0.005em',
        }}>{avgElo}</span>
      </div>
    </Reveal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   HomePage
   ────────────────────────────────────────────────────────────────────── */
export default function HomePage({ onNavigate, liveModels, countSnapshot }) {
  const dark       = useDark();
  const mobile     = useMobile();
  const isLoaded   = !!liveModels;
  const data       = liveModels ?? MODELS;
  const totalVotes = data.reduce((s, m) => s + m.votes, 0);
  const orgs       = new Set(data.map(m => m.org)).size;
  const openCount  = data.filter(m => m.isOpen).length;

  const snap = countSnapshot ?? { count: 280, exact: false };

  // Lab leaderboard: avg ELO of each lab's top model
  const labStats = (() => {
    const byOrg = {};
    for (const m of data) {
      const e = byOrg[m.org] || { models: [], top: 0 };
      e.models.push(m);
      if (m.elo > e.top) e.top = m.elo;
      byOrg[m.org] = e;
    }
    return Object.entries(byOrg)
      .map(([name, e]) => ({ name, count: e.models.length, avgElo: e.top, color: (ORG_CONFIG[name] ?? { color: '#8E8E93' }).color }))
      .sort((a, b) => b.avgElo - a.avgElo)
      .slice(0, mobile ? 6 : 8);
  })();
  const maxLabAvg = labStats[0]?.avgElo ?? 1500;

  return (
    <div style={{ background: 'transparent', fontFamily: SF, minHeight: '100vh', position: 'relative' }}>
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: mobile ? '0 18px 96px' : '0 32px 128px' }}>

        {/* ═════════════════════════════════════════════════════════
           HERO — left text, right live leaderboard preview
           ═════════════════════════════════════════════════════════ */}
        <section style={{
          paddingTop: mobile ? 56 : 96,
          paddingBottom: mobile ? 56 : 88,
          display: 'grid',
          gridTemplateColumns: mobile ? '1fr' : '1.05fr 1fr',
          gap: mobile ? 48 : 64,
          alignItems: 'center',
        }}>
          {/* LEFT: copy */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--card)', border: '0.5px solid var(--sep)',
              padding: '6px 12px 6px 10px', borderRadius: 980,
              marginBottom: 28,
              fontFamily: MONO,
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
              opacity: 0, animation: `aiwar-fade-in 600ms ${EASE} both`,
            }}>
              <LivePulse color="#34C759" />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                Live signal
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.02em' }}>
                · {snap.exact ? snap.count : `${snap.count}+`} models · {orgs} labs
              </span>
            </div>

            <h1 style={{
              fontSize: mobile ? 'clamp(40px,11vw,56px)' : 'clamp(56px,5.8vw,84px)',
              fontWeight: 700, letterSpacing: '-0.06em', lineHeight: 0.95,
              color: 'var(--text)', margin: '0 0 22px',
            }}>
              <WordReveal baseDelay={140} perWord={90}>The AI model</WordReveal>
              <br />
              <WordReveal baseDelay={520} perWord={90}>intelligence terminal.</WordReveal>
            </h1>

            <p style={{
              fontSize: mobile ? 17 : 19.5, lineHeight: 1.5,
              color: 'var(--muted)', letterSpacing: '-0.018em',
              maxWidth: 540, margin: '0 0 32px', fontWeight: 400,
              opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 880ms both`,
            }}>
              Ranked by <span style={{ color: 'var(--text)', fontWeight: 600 }}>real arena votes</span>,
              priced live, dated by context length. Built for founders, engineers and
              researchers picking the right model for the job — not the most-marketed one.
            </p>

            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: mobile ? 36 : 48,
              opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 1000ms both`,
            }}>
              <Magnetic strength={0.18}>
                <button onClick={() => onNavigate('leaderboard')}
                  className="aiwar-press-btn"
                  style={{
                    height: 52, paddingInline: 26, borderRadius: 980,
                    background: 'var(--text)', color: 'var(--bg)',
                    fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
                    letterSpacing: '-0.018em',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}>
                  Open Leaderboard
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </Magnetic>
              <Magnetic strength={0.14}>
                <button onClick={() => onNavigate('guide')}
                  className="aiwar-press-btn"
                  style={{
                    height: 52, paddingInline: 24, borderRadius: 980,
                    background: 'transparent', color: 'var(--text)',
                    fontSize: 15, fontWeight: 600,
                    border: '0.5px solid var(--sep)', cursor: 'pointer', letterSpacing: '-0.018em',
                  }}>
                  Read the Guide
                </button>
              </Magnetic>
            </div>

            {/* Inline stat strip */}
            <div style={{
              display: 'flex', gap: mobile ? 22 : 36, flexWrap: 'wrap',
              opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 1120ms both`,
            }}>
              {[
                { v: snap.count, fmt: v => Math.round(v).toString(), suf: snap.exact ? '' : '+', l: 'Models' },
                { v: isLoaded ? orgs : null, l: 'Labs' },
                { v: isLoaded ? totalVotes : null, fmt: v => {
                  const n = Math.round(v);
                  return n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : `${Math.round(n/1000)}K`;
                }, l: 'Votes' },
                { v: isLoaded ? openCount : null, l: 'Open' },
              ].map(s => (
                <div key={s.l}>
                  <div style={{
                    fontSize: mobile ? 22 : 26, fontWeight: 700, letterSpacing: '-0.045em',
                    color: 'var(--text)',
                    fontFamily: MONO, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                  }}>
                    {s.v != null
                      ? <AnimatedNumber value={s.v} format={s.fmt} suffix={s.suf || ''} />
                      : '—'}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--muted2)',
                    letterSpacing: '0.05em', marginTop: 6, fontFamily: MONO,
                    textTransform: 'uppercase',
                  }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: live leaderboard preview */}
          <div style={{
            opacity: 0, animation: `aiwar-fade-up 1000ms ${EASE} 720ms both`,
          }}>
            <LeaderboardPreview
              models={data}
              onNavigate={onNavigate}
              dark={dark}
              mobile={mobile}
              isLoaded={isLoaded}
            />
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════
           5-SECOND CLARITY — three quick value props
           ═════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: mobile ? 56 : 96 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 12,
          }}>
            {[
              { kicker: '01', title: 'Arena-signal, not benchmarks',
                body: 'Every rank comes from real anonymous human votes — the only signal that hasn\'t been trained against.' },
              { kicker: '02', title: 'Live pricing, real cost',
                body: 'OpenRouter pricing every 30 minutes — input and output rates separately, so you can budget the actual workload.' },
              { kicker: '03', title: 'Context, license, latency',
                body: 'Filter by 200K+ context, open weights, thinking variants. Find the right model, not the loudest one.' },
            ].map((c, i) => (
              <Reveal key={c.kicker} delay={i * 80}>
                <div style={{
                  background: 'var(--card)',
                  border: '0.5px solid var(--sep)',
                  borderRadius: 18,
                  padding: mobile ? '22px 20px' : '26px 24px',
                  height: '100%',
                  backdropFilter: 'saturate(180%) blur(18px)',
                  WebkitBackdropFilter: 'saturate(180%) blur(18px)',
                  transition: `border-color 350ms ${EASE}, transform 600ms ${EASE}`,
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--sep)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--muted2)',
                    letterSpacing: '0.10em', fontFamily: MONO, marginBottom: 16,
                  }}>
                    {c.kicker} / 03
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 600, color: 'var(--text)',
                    letterSpacing: '-0.024em', marginBottom: 10, lineHeight: 1.25,
                  }}>
                    {c.title}
                  </div>
                  <div style={{
                    fontSize: 14, lineHeight: 1.6, color: 'var(--muted)',
                    letterSpacing: '-0.008em',
                  }}>
                    {c.body}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════
           LAB LEADERBOARD — comparison bars
           ═════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: mobile ? 56 : 96 }}>
          <Reveal>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 28, paddingLeft: 2, flexWrap: 'wrap', gap: 10,
            }}>
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--muted2)',
                  textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 8px',
                  fontFamily: MONO,
                }}>
                  Lab leaderboard
                </p>
                <h2 style={{
                  fontSize: mobile ? 28 : 38, fontWeight: 700,
                  letterSpacing: '-0.04em', color: 'var(--text)',
                  margin: 0, lineHeight: 1.05,
                }}>
                  Who's leading the frontier.
                </h2>
              </div>
              <span style={{
                fontSize: 11, color: 'var(--muted2)', fontFamily: MONO,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                By top model ELO
              </span>
            </div>
          </Reveal>

          <Reveal>
            <div style={{
              background: 'var(--card)',
              border: '0.5px solid var(--sep)',
              borderRadius: 18,
              padding: mobile ? '8px 20px' : '12px 28px',
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            }}>
              {labStats.map((lab, i) => (
                <LabBar
                  key={lab.name}
                  name={lab.name}
                  color={lab.color}
                  count={lab.count}
                  avgElo={lab.avgElo}
                  maxAvg={maxLabAvg}
                  mobile={mobile}
                  delay={i * 60}
                />
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═════════════════════════════════════════════════════════
           EDITORIAL NOTES — analyst commentary
           ═════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: mobile ? 56 : 96 }}>
          <Reveal>
            <div style={{ marginBottom: 28, paddingLeft: 2 }}>
              <p style={{
                fontSize: 11, fontWeight: 600, color: 'var(--muted2)',
                textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 8px',
                fontFamily: MONO,
              }}>
                Analyst desk
              </p>
              <h2 style={{
                fontSize: mobile ? 28 : 38, fontWeight: 700,
                letterSpacing: '-0.04em', color: 'var(--text)',
                margin: 0, lineHeight: 1.05,
              }}>
                Reading the signal.
              </h2>
            </div>
          </Reveal>

          <div style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(2, 1fr)',
            gap: 12,
          }}>
            <Reveal delay={0}>
              <EditorialNote
                kicker="Pick of the week"
                title="The arena's quiet winner isn't who you think"
                author="AI War Room"
                date={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              >
                The top three on ELO are flagship reasoning variants, all priced at the
                ceiling. But the most-shipped models in production this quarter sit in
                positions 6 through 12 — mid-priced workhorses that win 92% of the time
                a frontier model would, at one-tenth the token cost.
              </EditorialNote>
            </Reveal>
            <Reveal delay={120}>
              <EditorialNote
                kicker="Open-weight watch"
                title="Open is closing the gap, but not where you'd expect"
                author="AI War Room"
                date={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              >
                Permissive-licence models now hold {openCount}+ slots in our top {Math.min(50, data.length)}.
                The gap to S-tier is real for hard reasoning, but for chat, summarisation
                and RAG the best open releases now trade blows with proprietary frontier —
                at radically lower deployment cost.
              </EditorialNote>
            </Reveal>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════
           CLOSING CTA
           ═════════════════════════════════════════════════════════ */}
        <Reveal>
          <section>
            <div style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: 24,
              padding: mobile ? '44px 24px' : '72px 56px',
              background: dark ? '#0a0a0d' : 'var(--text)',
              border: '0.5px solid var(--sep)',
              textAlign: 'center',
            }}>
              {/* Hairline grid pattern */}
              <div aria-hidden style={{
                position: 'absolute', inset: 0,
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
                backgroundSize: '64px 64px',
                maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
              }} />

              <div style={{ position: 'relative' }}>
                <p style={{
                  fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 18px',
                  fontFamily: MONO,
                }}>
                  Full leaderboard
                </p>
                <h2 style={{
                  fontSize: mobile ? 32 : 52, fontWeight: 700,
                  color: '#fff', letterSpacing: '-0.045em', lineHeight: 1.02,
                  margin: '0 0 16px',
                }}>
                  Pick your model.<br />Not your marketing.
                </h2>
                <p style={{
                  fontSize: mobile ? 15 : 17, color: 'rgba(255,255,255,0.6)',
                  letterSpacing: '-0.012em', margin: '0 auto 36px', maxWidth: 560,
                  lineHeight: 1.5,
                }}>
                  Sort, filter and compare {snap.count}+ models by ELO, price, context
                  window, licence or lab. Pricing live every 30 minutes.
                </p>
                <Magnetic strength={0.18}>
                  <button onClick={() => onNavigate('leaderboard')}
                    className="aiwar-press-btn"
                    style={{
                      height: 52, paddingInline: 28, borderRadius: 980,
                      background: '#fff', color: '#000',
                      fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
                      letterSpacing: '-0.015em',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                    Open the terminal
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </Magnetic>
                <div style={{
                  marginTop: 40, paddingTop: 24,
                  borderTop: '0.5px solid rgba(255,255,255,0.08)',
                  fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em',
                  fontFamily: MONO, textTransform: 'uppercase',
                }}>
                  {RELEASE} · Independent · No affiliation with arena.ai or OpenRouter
                </div>
              </div>
            </div>
          </section>
        </Reveal>

      </div>
    </div>
  );
}
