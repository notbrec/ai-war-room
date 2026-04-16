import { MODELS, RELEASE } from '../models-data.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";

const PRINCIPLES = [
  { icon: '⚔', color: '#FF3B30', bg: 'rgba(255,59,48,0.10)',  title: 'Arena battles',        body: 'Each model matchup is a real conversation shown to human voters. They pick the better response. No automated judging — only human preference.' },
  { icon: '♟', color: '#5856D6', bg: 'rgba(88,86,214,0.10)',  title: 'ELO rating system',    body: 'We use the same Elo system as competitive chess. Win against a stronger model and your rating rises faster. Lose to a weaker model and it drops more.' },
  { icon: '±',  color: '#007AFF', bg: 'rgba(0,122,255,0.10)',  title: 'Confidence intervals', body: 'The ±CI value shows rating uncertainty. A model with ±7 is precisely ranked. A model with ±23 needs more battles before its position stabilizes.' },
  { icon: '🔓', color: '#34C759', bg: 'rgba(52,199,89,0.10)',  title: 'Open weight models',   body: 'MIT, Apache 2.0 and similar licenses are tagged "Open". These models can be run locally or fine-tuned — a key distinction for real-world deployment.' },
  { icon: '$',  color: '#FF9500', bg: 'rgba(255,149,0,0.10)',  title: 'Live pricing',          body: 'Pricing is synced from OpenRouter every 30 minutes. Shows cost per 1M input and output tokens — the real numbers developers actually pay.' },
];

const ELO_TIERS = [
  { range: '≥ 1500', label: 'S-Tier',  color: '#34C759', desc: 'Elite. State-of-the-art performance across most tasks.'     },
  { range: '1400–1499', label: 'A-Tier', color: '#007AFF', desc: 'Excellent. Competes with the best, strong across the board.' },
  { range: '1300–1399', label: 'B-Tier', color: '#FF9500', desc: 'Good. Solid performers, competitive in specific domains.'   },
  { range: '< 1300',   label: 'C-Tier', color: '#FF3B30', desc: 'Developing. Useful for simpler or cost-sensitive tasks.'    },
];

export default function MethodologyPage() {
  const orgs      = new Set(MODELS.map(m => m.org)).size;
  const maxElo    = Math.max(...MODELS.map(m => m.elo));
  const totalVotes = MODELS.reduce((s, m) => s + m.votes, 0);

  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 72px' }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ paddingTop: 36, paddingBottom: 28 }}>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 46px)', fontWeight: 700, letterSpacing: '-0.042em', color: 'var(--text)', margin: '0 0 10px' }}>
            Methodology
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--muted)', letterSpacing: '-0.02em', maxWidth: 500, margin: 0 }}>
            AI WAR ROOM ranks models using ELO — the same system that ranks chess grandmasters.
            Every point is earned through real human votes.
          </p>
        </div>

        {/* ── Stat chips ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 44 }}>
          {[
            { v: MODELS.length,                          l: 'Models ranked'   },
            { v: orgs,                                   l: 'Organizations'   },
            { v: `${(totalVotes / 1000).toFixed(0)}K`,  l: 'Arena votes'     },
            { v: maxElo,                                 l: 'Highest ELO'     },
            { v: RELEASE,                                l: 'Current release' },
          ].map(s => (
            <div key={s.l} style={{ background: 'var(--card)', borderRadius: 12, padding: '10px 16px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.028em', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '-0.01em', marginTop: 1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* ── How it works ───────────────────────────────────────────── */}
        <section style={{ marginBottom: 44 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, paddingLeft: 2 }}>
            How It Works
          </p>
          <div style={{ background: 'var(--card)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            {PRINCIPLES.map((p, i) => (
              <div key={p.title}>
                <div style={{ display: 'grid', gridTemplateColumns: '46px 1fr', alignItems: 'flex-start', padding: '16px 16px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: p.color, flexShrink: 0 }}>
                    {p.icon}
                  </div>
                  <div style={{ paddingLeft: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, letterSpacing: '-0.015em' }}>{p.body}</div>
                  </div>
                </div>
                {i < PRINCIPLES.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: 60 }}/>}
              </div>
            ))}
          </div>
        </section>

        {/* ── ELO tiers ──────────────────────────────────────────────── */}
        <section style={{ marginBottom: 44 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, paddingLeft: 2 }}>
            ELO Tiers
          </p>
          <div style={{ background: 'var(--card)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            {ELO_TIERS.map((tier, i) => (
              <div key={tier.label}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 70px 1fr', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{tier.range}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: tier.color, letterSpacing: '-0.01em' }}>{tier.label}</span>
                  <span style={{ fontSize: 14, color: 'var(--muted)', letterSpacing: '-0.015em', lineHeight: 1.4 }}>{tier.desc}</span>
                </div>
                {i < ELO_TIERS.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: 16 }}/>}
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 44 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, paddingLeft: 2 }}>
            Pricing Data
          </p>
          <div style={{ background: 'var(--card)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            {[
              { label: 'Source',    value: 'OpenRouter API',    note: 'Live model pricing fetched every 30 minutes.' },
              { label: 'Unit',      value: '$ per 1M tokens',   note: 'Input price / output price shown separately.' },
              { label: 'Refresh',   value: 'Every 30 minutes',  note: 'Pricing updates silently in the background.' },
              { label: 'Coverage',  value: `${MODELS.filter(m => m.priceIn != null).length}/${MODELS.length} models`, note: 'Some models have no public pricing.' },
            ].map((row, i, arr) => (
              <div key={row.label}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, padding: '13px 16px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{row.label}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em' }}>{row.value}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, letterSpacing: '-0.01em', lineHeight: 1.4 }}>{row.note}</div>
                  </div>
                </div>
                {i < arr.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: 16 }}/>}
              </div>
            ))}
          </div>
        </section>

        <p style={{ fontSize: 13, color: 'var(--muted2)', textAlign: 'center', letterSpacing: '-0.01em' }}>
          AI WAR ROOM · aiwarroom.app · {RELEASE}
        </p>
      </div>
    </div>
  );
}
