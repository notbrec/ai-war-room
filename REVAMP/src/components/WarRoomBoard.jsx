// ─── WarRoomBoard — the command-center grid ─────────────────────────────────
// Ten questions, ten live cards. Each card is computed from the merged
// datasets (never hand-typed) and links to the page that explains it.

import { useMemo } from 'react';
import { MONO, SF, EASE, LivePulse, Reveal } from './design.jsx';
import { LabLogo } from './LabLogo.jsx';
import { ORG_CONFIG } from '../models-data.js';
import { useLLMs, useMedia, useCoding, useSpeech, useProviders } from '../data/useDomain.js';
import { fmtMetric, fmtAgo, isNum, NA, SOURCES } from '../../shared/metrics.js';
import { recommend } from '../../shared/recommend.js';
import { Label, Delta, SourceTag, eloColor, GREEN, GOLD, RED, BLUE, PURPLE } from './ui.jsx';
import { Skeleton } from './design.jsx';
import { llmCandidates } from '../data/candidates.js';

export function useWarRoomCards() {
  const llms = useLLMs(), media = useMedia(), coding = useCoding(), speech = useSpeech(), prov = useProviders();
  const cards = useMemo(() => {
    const M = llms.models;
    const ranked = M.filter(m => m.inArena);
    const top = ranked[0];
    const byIntel = [...M].filter(m => isNum(m.aa?.intelligence)).sort((a, b) => b.aa.intelligence - a.aa.intelligence)[0];
    const bySpeed = [...M].filter(m => isNum(m.aa?.speed)).sort((a, b) => b.aa.speed - a.aa.speed)[0];
    const byTtft = [...M].filter(m => isNum(m.aa?.ttft)).sort((a, b) => a.aa.ttft - b.aa.ttft)[0];
    const byCtx = [...M].filter(m => isNum(m.context)).sort((a, b) => b.context - a.context || (b.arena?.elo ?? 0) - (a.arena?.elo ?? 0))[0];
    const topOpen = ranked.find(m => m.isOpen);
    const value = ranked.length ? recommend('chat', llmCandidates(ranked.slice(0, 80)), { quality: 1, cost: 0.6, speed: 0, context: 0, open: 0 }).picks.bestValue : null;
    const cheapCapable = ranked.slice(0, 40).filter(m => isNum(m.priceBlended)).sort((a, b) => a.priceBlended - b.priceBlended)[0];
    const swe = coding.boards?.Verified?.[0];
    const byCode = coding.indexes?.[0];
    const t2i = media.boards?.['text-to-image']?.[0];
    const t2v = media.boards?.['text-to-video']?.[0];
    const tts = speech.tts?.[0];
    const stt = speech.stt?.[0];
    const topProvider = prov.providers?.[0];
    const cheapestHostFor = top && prov.models?.find(p => p.modelId === top.id);
    const cheapestEp = cheapestHostFor?.endpoints?.find(e => e.tag === cheapestHostFor.winners.cheapest);

    const llmCard = (m, extra = {}) => m ? ({ name: m.name, org: m.org, id: m.id, slug: m.slug, delta: m.history?.rankDelta7d ?? null, prevRank: m.history?.prevRank7d ?? null, rank: m.arena?.rank ?? null, ...extra }) : null;

    return [
      { key: 'overall', label: '#1 Overall', q: 'Who is the strongest?', color: GREEN, source: 'arena', route: 'leaderboard',
        ...(top ? llmCard(top, { value: fmtMetric('elo', top.arena.elo), unit: 'ELO', sub: `±${top.arena.ci ?? '—'} · ${fmtMetric('votes', top.arena.votes)} votes` }) : {}) },
      { key: 'intel', label: 'Highest Intelligence', q: 'Who is the smartest on benchmarks?', color: BLUE, source: 'aa', route: { type: 'leaderboard' },
        ...(byIntel ? llmCard(byIntel, { value: fmtMetric('intelligence', byIntel.aa.intelligence), unit: 'Index', sub: byIntel.inArena ? `Arena #${byIntel.arena.rank}` : 'Not on the arena board' }) : {}) },
      { key: 'value', label: 'Best Value', q: 'Best intelligence per dollar?', color: GOLD, source: 'internal', route: 'planner',
        ...(value ? llmCard(value.m, { value: fmtMetric('priceBlended', value.m.priceBlended), unit: 'blended / 1M', sub: `ELO ${value.m.arena?.elo ?? NA} · ${Math.round((value.parts.quality ?? 0) * 100)}% of top quality` }) : {}) },
      { key: 'speed', label: 'Fastest Model', q: 'Who is the fastest?', color: PURPLE, source: 'aa', route: 'race',
        ...(bySpeed ? llmCard(bySpeed, { value: fmtMetric('speed', bySpeed.aa.speed), unit: 'tok/s' }) : { na: 'Needs Artificial Analysis speed data' }) },
      { key: 'latency', label: 'Lowest Latency', q: 'Who answers first?', color: PURPLE, source: 'aa', route: 'race',
        ...(byTtft ? llmCard(byTtft, { value: fmtMetric('ttft', byTtft.aa.ttft), unit: 'to first token' }) : { na: 'Needs Artificial Analysis latency data' }) },
      { key: 'coder', label: 'Best Coder', q: 'Which coding agent should I use?', color: GREEN, source: 'swebench', route: 'coding',
        ...(swe ? { name: swe.model ?? swe.name, org: swe.modelOrg, value: fmtMetric('resolved', swe.resolved), unit: 'SWE-bench Verified', sub: `via ${swe.agent}${isNum(swe.costPerTask) ? ` · ${fmtMetric('costPerTask', swe.costPerTask)}/task` : ''}`, id: swe.linkedModelId, slug: null }
            : byCode ? { name: byCode.name, org: byCode.org, value: fmtMetric('codingIndex', byCode.codingIndex), unit: 'Coding Index', id: byCode.id } : {}) },
      { key: 'image', label: 'Best Image Model', q: 'Who generates the best images?', color: GOLD, source: 'arena', route: 'images',
        ...(t2i ? { name: t2i.name, org: t2i.org, value: fmtMetric('elo', t2i.elo), unit: 'Image ELO', sub: isNum(t2i.pricePerImage) ? `${fmtMetric('pricePerImage', t2i.pricePerImage)} / image` : `${fmtMetric('votes', t2i.votes)} votes`, id: t2i.id, kind: 'image' } : {}) },
      { key: 'video', label: 'Best Video Model', q: 'Who generates the best video?', color: GOLD, source: 'arena', route: 'videos',
        ...(t2v ? { name: t2v.name, org: t2v.org, value: fmtMetric('elo', t2v.elo), unit: 'Video ELO', sub: isNum(t2v.pricePerSecond) ? `${fmtMetric('pricePerSecond', t2v.pricePerSecond)} / s${t2v.hasAudio ? ' · audio' : ''}` : `${fmtMetric('votes', t2v.votes)} votes`, id: t2v.id, kind: 'video' } : {}) },
      { key: 'voice', label: 'Best Voice', q: 'Who has the best voice?', color: PURPLE, source: 'aa', route: 'speech',
        ...(tts ? { name: tts.name, org: tts.org, value: fmtMetric('ttsQuality', tts.elo), unit: 'Voice ELO' } : { na: 'Needs Artificial Analysis speech data' }) },
      { key: 'stt', label: 'Best Transcription', q: 'Which transcription is most accurate?', color: BLUE, source: 'openasr', route: 'speech',
        ...(stt ? { name: stt.name, org: stt.org, value: fmtMetric('wer', stt.wer), unit: 'WER · lower is better', sub: isNum(stt.rtfx) ? `${fmtMetric('rtfx', stt.rtfx)}× realtime` : stt.license } : {}) },
      { key: 'open', label: 'Best Open Weights', q: 'Strongest model I can self-host?', color: GREEN, source: 'arena', route: 'leaderboard',
        ...(topOpen ? llmCard(topOpen, { value: fmtMetric('elo', topOpen.arena.elo), unit: 'ELO', sub: `#${topOpen.arena.rank} overall · ${topOpen.license}` }) : {}) },
      { key: 'ctx', label: 'Biggest Context', q: 'Who reads the most at once?', color: BLUE, source: 'openrouter', route: 'leaderboard',
        ...(byCtx ? llmCard(byCtx, { value: fmtMetric('context', byCtx.context), unit: 'tokens', sub: byCtx.arena ? `ELO ${byCtx.arena.elo}` : 'unranked' }) : {}) },
      { key: 'cheap', label: 'Cheapest Capable', q: 'Cheapest model in the top 40?', color: GOLD, source: 'openrouter', route: 'leaderboard',
        ...(cheapCapable ? llmCard(cheapCapable, { value: fmtMetric('priceBlended', cheapCapable.priceBlended), unit: 'blended / 1M', sub: `#${cheapCapable.arena.rank} · ELO ${cheapCapable.arena.elo}` }) : {}) },
      { key: 'provider', label: 'Provider War', q: 'Which provider is fastest?', color: RED, source: 'openrouter', route: 'providers',
        ...(topProvider ? { name: cheapestEp ? `${cheapestEp.provider}` : topProvider.provider, org: null, value: cheapestEp ? fmtMetric('priceBlended', cheapestEp.priceBlended) : `${topProvider.models}`, unit: cheapestEp ? `cheapest host for ${top?.name}` : 'top models hosted',
            sub: prov.capabilities?.speed ? undefined : 'Fastest: N/A — no throughput source', id: top?.id } : {}) },
    ];
  }, [llms.models, media.boards, coding.boards, coding.indexes, speech.tts, speech.stt, prov.providers, prov.models, prov.capabilities]);

  const loading = llms.loading && !llms.models.length;
  const sources = { llms: llms.data?.sources, media: media.data?.sources, coding: coding.data?.sources, speech: speech.data?.sources, providers: prov.data?.sources };
  return { cards, loading, fetchedAt: llms.data?.fetchedAt, status: llms.status, sources, models: llms.models, capabilities: llms.capabilities };
}

export default function WarRoomBoard({ onNavigate, mobile, compact = false }) {
  const { cards, loading, fetchedAt } = useWarRoomCards();
  const list = compact ? cards.slice(0, mobile ? 6 : 8) : cards;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : compact ? 'repeat(4, 1fr)' : 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
        {loading
          ? Array.from({ length: list.length || 8 }).map((_, i) => <div key={i} style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', padding: 14 }}><Skeleton height={12} width="50%" style={{ marginBottom: 12 }} /><Skeleton height={22} /><Skeleton height={10} width="70%" style={{ marginTop: 10 }} /></div>)
          : list.map((c, i) => <Card key={c.key} c={c} i={i} mobile={mobile} onNavigate={onNavigate} fetchedAt={fetchedAt} />)}
      </div>
    </div>
  );
}

function Card({ c, i, mobile, onNavigate, fetchedAt }) {
  const has = !!c.name;
  const orgColor = c.org ? (ORG_CONFIG[c.org]?.color ?? '#8E8E93') : c.color;
  const go = () => {
    if (c.slug) return onNavigate({ type: 'model', slug: c.slug });
    if (c.kind && c.id) return onNavigate({ type: c.kind === 'image' ? 'images' : 'videos', slug: c.id });
    if (typeof c.route === 'string') return onNavigate(c.route === 'providers' && c.id ? { type: 'providers', slug: c.id } : c.route);
    onNavigate(c.route);
  };
  return (
    <div onClick={go} className="aiwar-surface aiwar-card-hover" role="link" tabIndex={0} onKeyDown={e => e.key === 'Enter' && go()} style={{
      borderTop: `2px solid ${c.color}`, padding: mobile ? '12px 12px 10px' : '14px 16px 12px',
      cursor: 'pointer', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6,
      opacity: 0, animation: `aiwar-fade-up 600ms ${EASE} ${80 + i * 40}ms both`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <Label color="var(--text)">{c.label}</Label>
        {c.key === 'overall' && <LivePulse color={GREEN} size={6} />}
      </div>
      {has ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {c.org && <LabLogo org={c.org} size={14} />}
            <span style={{ fontSize: mobile ? 13 : 14.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.025em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            {isNum(c.rank) && !mobile && <span style={{ fontSize: 10, fontFamily: MONO, color: 'var(--muted2)', flexShrink: 0 }}>#{c.rank}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: mobile ? 18 : 22, fontWeight: 700, color: orgColor === '#FFFFFF' ? 'var(--text)' : c.color, letterSpacing: '-0.04em', fontFamily: MONO, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{c.value}</span>
            <span style={{ fontSize: 10, color: 'var(--muted2)', fontFamily: MONO, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.unit}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, minWidth: 0, marginTop: 'auto' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.delta != null && c.delta !== 0 ? <><Delta value={c.delta} /> <span style={{ color: 'var(--muted2)' }}>was #{c.prevRank}</span></> : c.delta === 0 ? <span style={{ fontFamily: MONO, color: 'var(--muted2)' }}>= 7d</span> : (c.sub ?? '')}
            </span>
            <SourceTag id={c.source} />
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted2)', fontFamily: MONO }}>{NA}</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>{c.na ?? 'Source unavailable right now'}</div>
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><span style={{ fontSize: 10, color: 'var(--muted2)', minWidth: 0 }}>{c.q}</span><SourceTag id={c.source} /></div>
        </>
      )}
    </div>
  );
}
