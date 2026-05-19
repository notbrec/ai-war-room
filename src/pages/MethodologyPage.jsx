import { MODELS, RELEASE } from '../models-data.js';
import { useMobile } from '../hooks/useTheme.js';
import {
  SF, MONO, EASE,
  Reveal, AnimatedNumber, Eyebrow, GlobalMotion,
} from '../components/design.jsx';

const PRINCIPLES = [
  { num: 1, accent: '#FF3B30', title: 'Arena battles',        body: 'Each model matchup is a real conversation shown to human voters. They pick the better response. No automated judging — only human preference.' },
  { num: 2, accent: '#5856D6', title: 'ELO rating system',    body: 'The same statistical system that ranks chess grandmasters. Win against a stronger model and your rating rises faster. Lose to a weaker model and it drops more.' },
  { num: 3, accent: '#007AFF', title: 'Confidence intervals', body: 'The ±CI value shows rating uncertainty. A model with ±7 is precisely ranked. A model with ±23 needs more battles before its position stabilises.' },
  { num: 4, accent: '#34C759', title: 'Open-weight models',   body: 'MIT, Apache 2.0 and similar licences are tagged "Open". These models can be run locally or fine-tuned — a key distinction for real-world deployment.' },
  { num: 5, accent: '#FF9500', title: 'Live pricing',          body: 'Pricing is synced from OpenRouter every 30 minutes. Cost per 1M input and output tokens — the real numbers developers actually pay.' },
];

const ELO_TIERS = [
  { range: '≥ 1500',    label: 'S-Tier', color: '#34C759', desc: 'Elite. State-of-the-art performance across most tasks.' },
  { range: '1400–1499', label: 'A-Tier', color: '#007AFF', desc: 'Excellent. Competes with the best, strong across the board.' },
  { range: '1300–1399', label: 'B-Tier', color: '#FF9500', desc: 'Good. Solid performers, competitive in specific domains.' },
  { range: '< 1300',    label: 'C-Tier', color: '#FF3B30', desc: 'Developing. Useful for simpler or cost-sensitive tasks.' },
];

const PRICING_ROWS = [
  { label: 'Source',    value: 'OpenRouter API',   note: 'Live model pricing fetched every 30 minutes.' },
  { label: 'Unit',      value: '$ per 1M tokens',  note: 'Input price / output price shown separately.' },
  { label: 'Refresh',   value: 'Every 30 minutes', note: 'Pricing updates silently in the background.' },
];

function StatCard({ value, label, mobile, format, suffix }) {
  return (
    <div style={{
      background: 'var(--card)', borderRadius: 16,
      padding: mobile ? '16px 18px' : '18px 22px',
      border: '0.5px solid var(--sep)',
      flex: 1, minWidth: mobile ? 'calc(50% - 5px)' : 140,
    }}>
      <div style={{
        fontSize: mobile ? 22 : 28, fontWeight: 700,
        color: 'var(--text)', letterSpacing: '-0.04em',
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>
        {typeof value === 'number'
          ? <AnimatedNumber value={value} format={format} suffix={suffix} />
          : value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, fontFamily: MONO, letterSpacing: '-0.005em' }}>
        {label}
      </div>
    </div>
  );
}

export default function MethodologyPage({ liveModels, countSnapshot }) {
  const mobile     = useMobile();
  const isLoaded   = !!liveModels;
  const data       = liveModels ?? MODELS;
  const orgs       = new Set(data.map(m => m.org)).size;
  const maxElo     = Math.max(...data.map(m => m.elo));
  const totalVotes = data.reduce((s, m) => s + m.votes, 0);

  const snap          = countSnapshot ?? { count: 280, exact: false };
  const modelCount    = snap.count;
  const modelSuffix   = snap.exact ? '' : '+';

  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh' }}>
      <GlobalMotion />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: mobile ? '40px 18px 96px' : '72px 24px 112px' }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header style={{ marginBottom: mobile ? 36 : 56 }}>
          <div style={{ opacity: 0, animation: `aiwar-fade-up 700ms ${EASE} both` }}>
            <Eyebrow>Methodology</Eyebrow>
          </div>
          <h1 style={{
            fontSize: mobile ? 'clamp(36px,9vw,48px)' : 'clamp(56px,6vw,80px)',
            fontWeight: 700, letterSpacing: '-0.052em', lineHeight: 0.98,
            color: 'var(--text)', margin: '10px 0 18px',
            opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 80ms both`,
          }}>
            How the ranking works.
          </h1>
          <p style={{
            fontSize: mobile ? 17 : 21, lineHeight: 1.45,
            color: 'var(--muted)', letterSpacing: '-0.02em',
            margin: 0, maxWidth: 640,
            opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 160ms both`,
          }}>
            ELO — the same system that ranks chess grandmasters. Every point earned through real human votes.
          </p>
        </header>

        {/* ── Stats row ──────────────────────────────────────────── */}
        <Reveal>
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap',
            marginBottom: mobile ? 56 : 80,
          }}>
            <StatCard value={modelCount} suffix={modelSuffix} format={v => Math.round(v).toString()} label="Models ranked" mobile={mobile} />
            <StatCard value={isLoaded ? orgs : '—'} label="Organisations" mobile={mobile} />
            <StatCard
              value={isLoaded ? totalVotes : '—'}
              format={v => {
                const n = Math.round(v);
                if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
                return `${Math.round(n/1000)}K`;
              }}
              label="Arena votes" mobile={mobile} />
            <StatCard value={isLoaded ? maxElo : '—'} label="Highest ELO" mobile={mobile} />
            <StatCard value={RELEASE} label="Release" mobile={mobile} />
          </div>
        </Reveal>

        {/* ── Principles ─────────────────────────────────────────── */}
        <section style={{ marginBottom: mobile ? 56 : 80 }}>
          <Reveal>
            <div style={{ marginBottom: 24 }}>
              <Eyebrow>How it works</Eyebrow>
              <h2 style={{
                fontSize: mobile ? 26 : 34, fontWeight: 700,
                letterSpacing: '-0.038em', color: 'var(--text)',
                margin: 0, lineHeight: 1.1,
              }}>
                The five core principles.
              </h2>
            </div>
          </Reveal>

          <div style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={i * 60}>
                <div className="aiwar-card-hover" style={{
                  background: 'var(--card)', borderRadius: 18,
                  padding: mobile ? '22px 20px' : '26px 24px',
                  border: '0.5px solid var(--sep)',
                  height: '100%',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: p.accent }} />
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--muted2)',
                      textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO,
                    }}>
                      {String(p.num).padStart(2, '0')} / 05
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.025em', marginBottom: 8, lineHeight: 1.2 }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', letterSpacing: '-0.01em' }}>
                    {p.body}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── ELO Tiers ──────────────────────────────────────────── */}
        <section style={{ marginBottom: mobile ? 56 : 80 }}>
          <Reveal>
            <div style={{ marginBottom: 24 }}>
              <Eyebrow>Tiers</Eyebrow>
              <h2 style={{
                fontSize: mobile ? 26 : 34, fontWeight: 700,
                letterSpacing: '-0.038em', color: 'var(--text)',
                margin: 0, lineHeight: 1.1,
              }}>
                Reading the ranks.
              </h2>
            </div>
          </Reveal>

          <Reveal>
            <div style={{
              background: 'var(--card)', borderRadius: 18,
              border: '0.5px solid var(--sep)', overflow: 'hidden',
            }}>
              {ELO_TIERS.map((tier, i) => (
                <div key={tier.label}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: mobile ? '90px 60px 1fr' : '120px 80px 1fr',
                    alignItems: 'center', gap: mobile ? 10 : 16,
                    padding: mobile ? '16px 20px' : '20px 24px',
                  }}>
                    <span style={{
                      fontSize: 13, color: 'var(--muted)', letterSpacing: '-0.01em',
                      fontVariantNumeric: 'tabular-nums', fontFamily: MONO,
                    }}>
                      {tier.range}
                    </span>
                    <span style={{
                      fontSize: 15, fontWeight: 700, color: tier.color,
                      letterSpacing: '-0.015em',
                    }}>
                      {tier.label}
                    </span>
                    <span style={{
                      fontSize: 14.5, color: 'var(--text)',
                      letterSpacing: '-0.012em', lineHeight: 1.5, opacity: 0.86,
                    }}>
                      {tier.desc}
                    </span>
                  </div>
                  {i < ELO_TIERS.length - 1 && (
                    <div style={{ height: '0.5px', background: 'var(--sep)', marginInline: mobile ? 20 : 24 }} />
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Pricing data ───────────────────────────────────────── */}
        <section style={{ marginBottom: mobile ? 56 : 80 }}>
          <Reveal>
            <div style={{ marginBottom: 24 }}>
              <Eyebrow>Pricing data</Eyebrow>
              <h2 style={{
                fontSize: mobile ? 26 : 34, fontWeight: 700,
                letterSpacing: '-0.038em', color: 'var(--text)',
                margin: 0, lineHeight: 1.1,
              }}>
                Where the prices come from.
              </h2>
            </div>
          </Reveal>

          <Reveal>
            <div style={{
              background: 'var(--card)', borderRadius: 18,
              border: '0.5px solid var(--sep)', overflow: 'hidden',
            }}>
              {[
                ...PRICING_ROWS,
                {
                  label: 'Coverage',
                  value: isLoaded ? `${data.filter(m => m.priceIn != null).length}/${data.length} models` : 'Loading…',
                  note: 'Some models have no public pricing.',
                },
              ].map((row, i, arr) => (
                <div key={row.label}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: mobile ? '100px 1fr' : '160px 1fr',
                    gap: 16, padding: mobile ? '16px 20px' : '20px 24px',
                    alignItems: 'flex-start',
                  }}>
                    <span style={{
                      fontSize: 13, color: 'var(--muted)', fontFamily: MONO,
                      letterSpacing: '-0.005em',
                    }}>
                      {row.label}
                    </span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.018em' }}>
                        {row.value}
                      </div>
                      <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 4, letterSpacing: '-0.01em', lineHeight: 1.5 }}>
                        {row.note}
                      </div>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ height: '0.5px', background: 'var(--sep)', marginInline: mobile ? 20 : 24 }} />
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <Reveal>
          <p style={{
            fontSize: 13, color: 'var(--muted2)', textAlign: 'center',
            letterSpacing: '-0.005em', fontFamily: MONO, marginTop: 24,
          }}>
            AI WAR ROOM · aiwarroom.app · {RELEASE}
          </p>
        </Reveal>
      </div>
    </div>
  );
}
