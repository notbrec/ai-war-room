// ─── HOME — the war room, all of it on one page ─────────────────────────────
// Nothing is tucked away: the fight, every situation card, the picks for
// every job, the top ten, the labs, the tools, a real battle, every front.

import { lazy, Suspense, useMemo } from 'react';
import { MODELS, ORG_CONFIG } from '../models-data.js';
import { useMobile } from '../hooks/useTheme.js';
import { SF, MONO, EASE, Reveal, AnimatedNumber, LivePulse, ComparisonBar, Skeleton, TrendArrow } from '../components/design.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import HeroArena from '../components/HeroArena.jsx';
import FightArena from '../components/FightArena.jsx';
import PicksBoard from '../components/PicksBoard.jsx';
import ReplayTeaser from '../components/ReplayTeaser.jsx';
import WarRoomBoard, { useWarRoomCards } from '../components/WarRoomBoard.jsx';
import { DataStatus, Btn, eloColor, eloTier, GREEN, GOLD, RED } from '../components/ui.jsx';
import { SOURCES } from '../../shared/metrics.js';

const THEATRES = [
  { id: 'leaderboard', label: 'LLM Rankings', desc: 'Arena ELO, intelligence, price, speed, context — every language model.', prefetch: 'llms' },
  { id: 'coding',      label: 'Code Ops',     desc: 'Coding agents × models on SWE-bench, with cost per task.' },
  { id: 'images',      label: 'Image Arena',  desc: 'Text-to-image and editing quality ELO, price per image.' },
  { id: 'videos',      label: 'Video Arena',  desc: 'Text-to-video and image-to-video, price per second, audio.' },
  { id: 'speech',      label: 'Voice Comms',  desc: 'Transcription accuracy (WER), speech quality, speed.' },
  { id: 'providers',   label: 'Provider War', desc: 'Who hosts each model cheapest, with the most context and uptime.' },
  { id: 'benchmarks',  label: 'Benchmarks',   desc: 'The benchmark matrix — pick a test, compare models, read the method.' },
  { id: 'methodology', label: 'Methodology',  desc: 'Where every number comes from and how the merge works.' },
];

const TOOLS = [
  { id: 'compare', label: 'Battle Mode',     desc: 'Up to four models head to head, metric by metric.' },
  { id: 'race',    label: 'Speed Race',      desc: 'Real speed and latency measurements, animated as a race.' },
  { id: 'planner', label: 'Mission Planner', desc: 'Describe the job, weight what matters, get a ranked shortlist.' },
  { id: { type: 'videos', slug: 'replay' }, label: 'Battle Replay', desc: '800 real crowd-voted image and video duels — guess the winner.' },
];

function SectionHead({ eyebrow, title, action, mobile, sub }) {
  return (
    <Reveal>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: mobile ? 14 : 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 6px', fontFamily: MONO }}>{eyebrow}</p>
          <h2 style={{ fontSize: mobile ? 26 : 34, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', margin: 0, lineHeight: 1.05 }}>{title}</h2>
          {sub && <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '8px 0 0', lineHeight: 1.5, maxWidth: 640 }}>{sub}</p>}
        </div>
        {action}
      </div>
    </Reveal>
  );
}

/* ─── Top 10 ─────────────────────────────────────────────────────────────── */
function TopTen({ models, onNavigate, mobile, isLoaded }) {
  const top = (models ?? MODELS).slice(0, 10);
  const maxElo = top[0]?.elo ?? 1500;
  const minElo = top[top.length - 1]?.elo ?? 1300;
  const range  = Math.max(1, maxElo - minElo);
  return (
    <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', overflow: 'hidden', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: mobile ? '12px 14px' : '13px 18px', borderBottom: '0.5px solid var(--sep)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <LivePulse color={GREEN} size={7} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.10em', fontFamily: MONO, textTransform: 'uppercase' }}>Top 10 · language</span>
        </span>
        <button onClick={() => onNavigate('leaderboard')} className="aiwar-press-btn" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 11, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.04em' }}>
          ALL {(models ?? MODELS).length} →
        </button>
      </div>
      {!isLoaded
        ? Array.from({ length: 10 }).map((_, i) => <div key={i} style={{ padding: '12px 18px', borderBottom: i < 9 ? '0.5px solid var(--sep2)' : 'none' }}><Skeleton height={18} /></div>)
        : top.map((m, i) => {
          const tColor = eloColor(m.elo);
          const norm = (m.elo - minElo) / range;
          return (
            <div key={m.slug} onClick={() => onNavigate({ type: 'model', slug: m.slug })}
              style={{ display: 'grid', gridTemplateColumns: mobile ? '26px minmax(0,1fr) 56px' : '28px minmax(0,1.3fr) minmax(0,1fr) 72px', gap: mobile ? 10 : 14, alignItems: 'center', padding: mobile ? '10px 14px' : '10px 18px', borderBottom: i < top.length - 1 ? '0.5px solid var(--sep2)' : 'none', cursor: 'pointer', transition: 'background 200ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: i < 3 ? GOLD : 'var(--muted2)', fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <LabLogo org={m.org} size={11} />
                  <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{m.org}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: tColor, letterSpacing: '0.05em', fontFamily: MONO }}>{eloTier(m.elo)}</span>
                </div>
              </div>
              {!mobile && <ComparisonBar width={0.18 + norm * 0.82} color={tColor} height={3} />}
              <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 14.5, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedNumber value={m.elo} format={v => Math.round(v).toString()} />
                {!mobile && <span style={{ marginLeft: 5 }}><TrendArrow seed={m.elo + i} size={8} /></span>}
              </div>
            </div>
          );
        })}
    </div>
  );
}

/* ─── Labs ───────────────────────────────────────────────────────────────── */
function Labs({ models, onNavigate, mobile, isLoaded }) {
  const labs = useMemo(() => {
    const by = {};
    for (const m of models ?? MODELS) {
      const e = by[m.org] ?? { org: m.org, count: 0, top: null };
      e.count++; if (!e.top || m.elo > e.top.elo) e.top = m;
      by[m.org] = e;
    }
    return Object.values(by).sort((a, b) => b.top.elo - a.top.elo).slice(0, 10);
  }, [models]);
  const maxElo = labs[0]?.top.elo ?? 1500;
  return (
    <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', overflow: 'hidden', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: mobile ? '12px 14px' : '13px 18px', borderBottom: '0.5px solid var(--sep)' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.10em', fontFamily: MONO, textTransform: 'uppercase' }}>Labs · by top model</span>
        <span style={{ fontSize: 10, color: 'var(--muted2)', fontFamily: MONO, letterSpacing: '0.04em' }}>{isLoaded ? `${new Set((models ?? MODELS).map(m => m.org)).size} LABS` : ''}</span>
      </div>
      {!isLoaded
        ? Array.from({ length: 10 }).map((_, i) => <div key={i} style={{ padding: '12px 18px', borderBottom: i < 9 ? '0.5px solid var(--sep2)' : 'none' }}><Skeleton height={18} /></div>)
        : labs.map((l, i) => {
          const color = (ORG_CONFIG[l.org] ?? { color: '#8E8E93' }).color;
          const w = Math.max(0.06, (l.top.elo - 1300) / Math.max(1, maxElo - 1300));
          return (
            <div key={l.org} onClick={() => onNavigate({ type: 'model', slug: l.top.slug })}
              style={{ display: 'grid', gridTemplateColumns: mobile ? '26px minmax(0,1fr) 52px' : '28px minmax(0,1fr) minmax(0,0.9fr) 52px', gap: mobile ? 10 : 14, alignItems: 'center', padding: mobile ? '10px 14px' : '10px 18px', borderBottom: i < labs.length - 1 ? '0.5px solid var(--sep2)' : 'none', cursor: 'pointer', transition: 'background 200ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted2)', fontFamily: MONO }}>{String(i + 1).padStart(2, '0')}</span>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <LabLogo org={l.org} size={14} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.org} <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)', fontWeight: 500 }}>×{l.count}</span></div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.top.name}</div>
                </div>
              </div>
              {!mobile && <ComparisonBar width={Math.min(1, w)} color={color === '#FFFFFF' ? 'var(--text)' : color} height={3} />}
              <span style={{ textAlign: 'right', fontFamily: MONO, fontSize: 13.5, fontWeight: 700, color: eloColor(l.top.elo), fontVariantNumeric: 'tabular-nums' }}>{l.top.elo}</span>
            </div>
          );
        })}
    </div>
  );
}

/* ─── Sources strip ──────────────────────────────────────────────────────── */
function SourcesStrip({ sources, mobile, onNavigate }) {
  const rank = { live: 3, stale: 2, unavailable: 1 };
  const agg = {};
  for (const domain of Object.values(sources)) {
    for (const [key, s] of Object.entries(domain ?? {})) {
      const id = key.split(':')[0];
      if (!SOURCES[id]) continue;
      const cur = agg[id];
      if (!cur || (rank[s.status] ?? 0) > (rank[cur.status] ?? 0)) agg[id] = { id, status: s.status };
    }
  }
  const list = Object.values(agg);
  if (!list.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 10 : 16, flexWrap: 'wrap', padding: mobile ? '12px 14px' : '12px 18px', background: 'var(--card)', border: '0.5px solid var(--sep)' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted2)', letterSpacing: '0.10em', fontFamily: MONO, textTransform: 'uppercase' }}>Sources</span>
      {list.map(s => {
        const color = s.status === 'live' ? GREEN : s.status === 'stale' ? GOLD : RED;
        return (
          <a key={s.id} href={SOURCES[s.id].url} target="_blank" rel="noreferrer noopener" title={SOURCES[s.id].note} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--text)', fontSize: 12 }}>
            <span data-round="1" style={{ width: 6, height: 6, background: color, flexShrink: 0 }} />
            {SOURCES[s.id].name}
            {s.status !== 'live' && <span style={{ fontFamily: MONO, fontSize: 9.5, color, letterSpacing: '0.06em' }}>{s.status === 'stale' ? 'CACHED' : 'OFF'}</span>}
          </a>
        );
      })}
      <button onClick={() => onNavigate('methodology')} className="aiwar-press-btn" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, fontFamily: MONO, letterSpacing: '0.04em' }}>METHODOLOGY →</button>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function HomePage({ onNavigate, liveModels, countSnapshot }) {
  const mobile   = useMobile();
  const isLoaded = !!liveModels;
  const data     = liveModels ?? MODELS;
  const wr       = useWarRoomCards();

  const stats = useMemo(() => ({
    orgs: new Set(data.map(m => m.org)).size,
    votes: data.reduce((s, m) => s + (m.votes ?? 0), 0),
    open: data.filter(m => m.isOpen).length,
  }), [data]);
  const snap = countSnapshot ?? { count: 350, exact: false };
  const gapY = mobile ? 52 : 84;

  return (
    <div style={{ background: 'transparent', fontFamily: SF, minHeight: '100vh', position: 'relative' }}>
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: mobile ? '0 18px 80px' : '0 32px 112px' }}>

        <HeroArena models={liveModels} isLoaded={isLoaded} onNavigate={onNavigate} mobile={mobile} snap={snap} stats={stats} />

        {/* Situation board — every front, every card */}
        <section style={{ marginTop: gapY }}>
          <SectionHead mobile={mobile} eyebrow="Situation board" title="Who holds every front."
            action={<DataStatus status={wr.status} fetchedAt={wr.fetchedAt} sources={['arena', 'openrouter', 'swebench', 'openasr', ...(wr.capabilities?.aa ? ['aa'] : [])]} loading={wr.loading} compact={mobile} />} />
          <WarRoomBoard onNavigate={onNavigate} mobile={mobile} />
        </section>

        {/* Picks */}
        <section style={{ marginTop: gapY }}>
          <SectionHead mobile={mobile} eyebrow="Picks" title="Which model should I use?"
            sub="The top pick and the best-value pick for each job, scored from the live data with the Mission Planner's default weights. Open a card to see the arithmetic or change the weights."
            action={<Btn small onClick={() => onNavigate('planner')}>Mission Planner →</Btn>} />
          <PicksBoard onNavigate={onNavigate} mobile={mobile} />
        </section>

        {/* Top 10 + labs */}
        <section style={{ marginTop: gapY }}>
          <SectionHead mobile={mobile} eyebrow="The ranking" title="Top of the arena." action={<Btn small onClick={() => onNavigate('leaderboard')}>Full ranking →</Btn>} />
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.15fr 1fr', gap: 12 }}>
            <Reveal><TopTen models={liveModels} onNavigate={onNavigate} mobile={mobile} isLoaded={isLoaded} /></Reveal>
            <Reveal delay={80}><Labs models={liveModels} onNavigate={onNavigate} mobile={mobile} isLoaded={isLoaded} /></Reveal>
          </div>
        </section>

        {/* Tools — the second fight clip earns its place here */}
        <section style={{ marginTop: gapY }}>
          <SectionHead mobile={mobile} eyebrow="Tools" title="Put them in the ring." />
          <Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12, alignItems: 'stretch' }}>
              <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <FightArena clip="jab" aspect={mobile ? '16 / 9' : '16 / 10'} radius={0} border={false} surface="var(--card)" alt="Two robots sparring" style={{ flex: 1 }} />
                <div style={{ padding: mobile ? '12px 14px' : '14px 18px', borderTop: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>Pick up to four contestants anywhere on the site, then compare them metric by metric.</span>
                  <Btn small solid onClick={() => onNavigate('compare')}>Battle Mode →</Btn>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: 10 }}>
                {TOOLS.map((t, i) => (
                  <div key={t.label} onClick={() => onNavigate(t.id)} className="aiwar-card-hover" role="link" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onNavigate(t.id)}
                    style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', padding: mobile ? '12px 14px' : '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted2)', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.025em' }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, marginTop: 2 }}>{t.desc}</div>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--muted2)', flexShrink: 0 }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* A real battle */}
        <section style={{ marginTop: gapY }}>
          <SectionHead mobile={mobile} eyebrow="Battle Replay" title="Watch a real one."
            sub="Two models, one prompt, and the crowd already voted. Pick the better clip — the names appear after." />
          <ReplayTeaser onNavigate={onNavigate} mobile={mobile} />
        </section>

        {/* Every front */}
        <section style={{ marginTop: gapY }}>
          <SectionHead mobile={mobile} eyebrow="Theatres of operation" title="Every front, one terminal." />
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10 }}>
            {THEATRES.map((s, i) => (
              <Reveal key={s.id} delay={i * 40} y={16}>
                <div onClick={() => onNavigate(s.id)} className="aiwar-card-hover" role="link" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onNavigate(s.id)}
                  style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', padding: mobile ? '12px 12px' : '16px 18px', cursor: 'pointer', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: mobile ? 13 : 14.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.025em' }}>{s.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)' }}>{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div style={{ fontSize: mobile ? 11.5 : 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Sources */}
        <section style={{ marginTop: mobile ? 36 : 56 }}>
          <Reveal><SourcesStrip sources={wr.sources} mobile={mobile} onNavigate={onNavigate} /></Reveal>
        </section>

      </div>
    </div>
  );
}
