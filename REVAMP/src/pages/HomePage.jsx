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
import FrontBoard from '../components/FrontBoard.jsx';
import Ticker from '../components/Ticker.jsx';
import { BarPanel, HighlightGrid } from '../components/Highlights.jsx';
import { useCoding, useMedia } from '../data/useDomain.js';
import { fmtMetric, isNum } from '../../shared/metrics.js';
import ReplayTeaser from '../components/ReplayTeaser.jsx';
import { useWarRoomCards } from '../components/WarRoomBoard.jsx';
import { DataStatus, Btn, eloColor, eloTier, GREEN, GOLD, RED } from '../components/ui.jsx';
import { SOURCES } from '../../shared/metrics.js';

const TOOLS = [
  { id: 'compare', label: 'Battle Mode',     desc: 'Up to four models head to head, metric by metric.' },
  { id: 'race',    label: 'Speed Race',      desc: 'Real speed and latency measurements, animated as a race.' },
  { id: 'planner', label: 'Mission Planner', desc: 'Describe the job, weight what matters, get a ranked shortlist.' },
  { id: { type: 'videos', slug: 'replay' }, label: 'Battle Replay', desc: '800 real crowd-voted image and video duels — guess the winner.' },
];

function SectionHead({ eyebrow, title, action, mobile, sub }) {
  return (
    <Reveal>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: mobile ? 16 : 22, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 6px', fontFamily: MONO }}>{eyebrow}</p>
          <h2 style={{ fontSize: mobile ? 28 : 40, fontWeight: 700, letterSpacing: '-0.045em', color: 'var(--text)', margin: 0, lineHeight: 1.02 }}>{title}</h2>
          {sub && <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '8px 0 0', lineHeight: 1.5, maxWidth: 640 }}>{sub}</p>}
        </div>
        {action}
      </div>
    </Reveal>
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

  // Highlights — the same numbers the board reads, as bars
  const coding = useCoding(), media = useMedia();
  const hl = useMemo(() => {
    const ranked = wr.models.filter(m => m.inArena);
    const top = ranked.slice(0, 10);
    const labs = {};
    for (const m of ranked) if (!labs[m.org]) labs[m.org] = m;
    const swe = (coding.boards?.Verified ?? []).slice(0, 10);
    const t2i = (media.boards?.['text-to-image'] ?? []).slice(0, 10);
    const t2v = (media.boards?.['text-to-video'] ?? []).slice(0, 10);
    return {
      elo:   top.map(m => ({ id: m.id, name: m.name, org: m.org, slug: m.slug, value: m.arena.elo, label: String(m.arena.elo) })),
      labs:  Object.values(labs).slice(0, 10).map(m => ({ id: m.org, name: m.org, org: m.org, slug: m.slug, value: m.arena.elo, label: String(m.arena.elo) })),
      price: top.filter(m => isNum(m.priceBlended)).sort((x, y) => x.priceBlended - y.priceBlended).map(m => ({ id: m.id, name: m.name, org: m.org, slug: m.slug, value: m.priceBlended, label: fmtMetric('priceBlended', m.priceBlended) })),
      swe:   swe.map(r => ({ id: r.id, name: r.model ?? r.name, org: r.modelOrg, value: r.resolved, label: fmtMetric('resolved', r.resolved) })),
      image: t2i.map(r => ({ id: r.id, name: r.name, org: r.org, kind: 'images', value: r.elo, label: String(r.elo) })),
      video: t2v.map(r => ({ id: r.id, name: r.name, org: r.org, kind: 'videos', value: r.elo, label: String(r.elo) })),
    };
  }, [wr.models, coding.boards, media.boards]);
  const openBar = it => it.slug ? onNavigate({ type: 'model', slug: it.slug }) : it.kind ? onNavigate({ type: it.kind, slug: it.id }) : onNavigate('coding');

  return (
    <div style={{ background: 'transparent', fontFamily: SF, minHeight: '100vh', position: 'relative' }}>
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: mobile ? '0 18px 80px' : '0 32px 112px' }}>

        <HeroArena models={liveModels} isLoaded={isLoaded} onNavigate={onNavigate} mobile={mobile} snap={snap} stats={stats} />

        {/* the tape */}
        <div style={{ margin: mobile ? '28px -18px 0' : '40px 0 0', opacity: 0, animation: `aiwar-fade-in 900ms ${EASE} 1200ms both` }}>
          <Ticker models={liveModels} onNavigate={onNavigate} mobile={mobile} />
        </div>

        {/* The board — who wins what, on every front */}
        <section style={{ marginTop: gapY }}>
          <SectionHead mobile={mobile} eyebrow="The board" title="Who wins what."
            sub="Every front, one winner — and the best-value alternative underneath. Scored from live sources; open a card for the model, or the planner for the arithmetic."
            action={<DataStatus status={wr.status} fetchedAt={wr.fetchedAt} sources={['arena', 'openrouter', 'swebench', 'openasr', ...(wr.capabilities?.aa ? ['aa'] : [])]} loading={wr.loading} compact={mobile} />} />
          <FrontBoard onNavigate={onNavigate} mobile={mobile} />
        </section>

        {/* Highlights — six charts, one glance */}
        <section style={{ marginTop: gapY }}>
          <SectionHead mobile={mobile} eyebrow="Highlights" title="The numbers, at a glance." action={<Btn small onClick={() => onNavigate('leaderboard')}>Full ranking →</Btn>} />
          <HighlightGrid mobile={mobile}>
            <Reveal><BarPanel mobile={mobile} title="Arena ELO" color={GREEN} subtitle="Top 10 language models · arena.ai" items={hl.elo} onSelect={openBar} /></Reveal>
            <Reveal delay={60}><BarPanel mobile={mobile} title="Labs" color="var(--accent)" subtitle="Each lab's best model · arena.ai" items={hl.labs} onSelect={openBar} /></Reveal>
            <Reveal delay={120}><BarPanel mobile={mobile} title="Price" color={GOLD} subtitle="Top 10 · $ per 1M blended · OpenRouter" items={hl.price} higherIsBetter={false} onSelect={openBar} /></Reveal>
            <Reveal><BarPanel mobile={mobile} title="Coding" color={GREEN} subtitle="SWE-bench Verified · % resolved" items={hl.swe} onSelect={openBar} /></Reveal>
            <Reveal delay={60}><BarPanel mobile={mobile} title="Image" color={GOLD} subtitle="Text-to-image ELO · arena.ai" items={hl.image} onSelect={openBar} /></Reveal>
            <Reveal delay={120}><BarPanel mobile={mobile} title="Video" color={GOLD} subtitle="Text-to-video ELO · arena.ai" items={hl.video} onSelect={openBar} /></Reveal>
          </HighlightGrid>
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

        {/* Sources */}
        <section style={{ marginTop: mobile ? 36 : 56 }}>
          <Reveal><SourcesStrip sources={wr.sources} mobile={mobile} onNavigate={onNavigate} /></Reveal>
        </section>

      </div>
    </div>
  );
}
