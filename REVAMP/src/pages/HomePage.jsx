// ─── HOME — the war room as a command center ────────────────────────────────
// One screen on a wide monitor: the main event, the ranking (five ways), who
// wins every front, the value map and the four arenas; under it what moved
// this week, the labs, the tools and a real crowd-voted battle. The grid
// re-flows by the width the page actually has (container queries in
// styles/layout.css), from twelve columns down to one on a phone.

import { useEffect, useMemo, useState } from 'react';
import { MODELS } from '../models-data.js';
import { useMobile } from '../hooks/useTheme.js';
import { useShell } from '../hooks/useShell.js';
import { MONO, EASE, Reveal } from '../components/design.jsx';
import HeroArena from '../components/HeroArena.jsx';
import Ticker from '../components/Ticker.jsx';
import { BarPanel } from '../components/Highlights.jsx';
import { useCoding, useMedia, useSpeech } from '../data/useDomain.js';
import { fmtMetric, SOURCES, isNum } from '../../shared/metrics.js';
import ReplayTeaser from '../components/ReplayTeaser.jsx';
import { useWarRoomCards } from '../components/WarRoomBoard.jsx';
import { Board, BoardLink } from '../components/board.jsx';
import HeroBout from '../components/home/HeroBout.jsx';
import RankBoard from '../components/home/RankBoard.jsx';
import PicksList from '../components/home/PicksList.jsx';
import ValueMap from '../components/home/ValueMap.jsx';
import MoversPanel from '../components/home/MoversPanel.jsx';
import LabsPanel from '../components/home/LabsPanel.jsx';
import ToolsPanel from '../components/home/ToolsPanel.jsx';
import { GREEN, GOLD, RED, BLUE, PURPLE } from '../components/ui.jsx';
import { topByIntelligence, asFighters } from '../domains/models/ranking.js';

/* ─── Sources strip (phones and tablets; the sidebar shows it on desktop) ─── */
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
    <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 10 : 16, flexWrap: 'wrap', padding: mobile ? '12px 14px' : '12px 18px', background: 'var(--card)', border: '0.5px solid var(--sep)', marginTop: 'var(--gap)' }}>
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

/* A ranked-bar panel as one tile of the grid. */
function BarTile({ area, onMore, more, ...props }) {
  return (
    <div className="aw-bar-tile" style={{ gridArea: area }}>
      <BarPanel {...props} badge={onMore ? <button type="button" className="aw-link" onClick={onMore}>{more} →</button> : undefined} />
    </div>
  );
}

export default function HomePage({ onNavigate, liveModels, countSnapshot }) {
  const mobile   = useMobile();
  const shell    = useShell();
  const isLoaded = !!liveModels;
  const data     = liveModels ?? MODELS;
  const wr       = useWarRoomCards();

  // The first row paints first; everything under it mounts right after that
  // frame, so a slow phone shows the page instead of waiting on the whole board.
  const [below, setBelow] = useState(false);
  useEffect(() => {
    let t = null;
    const raf = requestAnimationFrame(() => { t = setTimeout(() => setBelow(true), 0); });
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, []);

  const legacyStats = useMemo(() => ({
    orgs: new Set(data.map(m => m.org)).size,
    votes: data.reduce((s, m) => s + (m.votes ?? 0), 0),
    open: data.filter(m => m.isOpen).length,
  }), [data]);
  const stats = useMemo(() => {
    const M = wr.models;
    if (!M.length) return null;
    const ranked = M.filter(m => m.inArena);
    return { models: M.length, labs: new Set(M.map(m => m.org).filter(Boolean)).size, votes: ranked.reduce((s, m) => s + (m.arena?.votes ?? 0), 0), open: ranked.filter(m => m.isOpen).length };
  }, [wr.models]);
  const snap = countSnapshot ?? { count: 350, exact: false };
  // Champion and challenger: the two best models by Intelligence Index.
  const fighters = useMemo(() => asFighters(topByIntelligence(wr.models, 2)), [wr.models]);

  // The four arenas as ranked bars — the same numbers their pages read
  const coding = useCoding(), media = useMedia(), speech = useSpeech();
  const hl = useMemo(() => {
    const top = wr.models.filter(m => m.inArena).slice(0, 10);
    // one row per model (its best agent), and only rows that name a model
    const seen = new Set();
    const swe = (coding.boards?.Verified ?? []).filter(r => {
      const k = r.model ?? r.name;
      if (!k || /^multiple$/i.test(k) || seen.has(k)) return false;
      seen.add(k); return true;
    }).slice(0, 10);
    const t2i = (media.boards?.['text-to-image'] ?? []).slice(0, 10);
    const t2v = (media.boards?.['text-to-video'] ?? []).slice(0, 10);
    return {
      elo:   top.map(m => ({ id: m.id, name: m.name, org: m.org, slug: m.slug, value: m.arena.elo, label: String(m.arena.elo) })),
      swe:   swe.map(r => ({ id: r.id, name: r.model ?? r.name, org: r.modelOrg, value: r.resolved, label: fmtMetric('resolved', r.resolved) })),
      image: t2i.map(r => ({ id: r.id, name: r.name, org: r.org, kind: 'images', value: r.elo, label: String(r.elo) })),
      video: t2v.map(r => ({ id: r.id, name: r.name, org: r.org, kind: 'videos', value: r.elo, label: String(r.elo) })),
      tts:   [...speech.tts].filter(r => isNum(r.elo)).sort((a, b) => b.elo - a.elo).slice(0, 10).map(r => ({ id: r.id ?? r.slug, name: r.name, org: r.org, kind: 'speech', value: r.elo, label: String(Math.round(r.elo)) })),
      stt:   [...speech.stt].filter(r => isNum(r.wer)).sort((a, b) => a.wer - b.wer).slice(0, 10).map(r => ({ id: r.id, name: r.name, org: r.org, kind: 'speech', value: r.wer, label: fmtMetric('wer', r.wer) })),
    };
  }, [wr.models, coding.boards, media.boards, speech.tts, speech.stt]);
  const openBar = it => it.slug ? onNavigate({ type: 'model', slug: it.slug }) : it.kind === 'speech' ? onNavigate('speech') : it.kind ? onNavigate({ type: it.kind, slug: it.id }) : onNavigate('coding');
  const xl = shell.width >= 2100;
  const rowH = xl ? 36 : undefined;

  return (
    <div className="aw-page aw-home">
      {mobile && <>
        <HeroArena models={liveModels} fighters={fighters} isLoaded={fighters.length >= 2 || (isLoaded && !wr.loading)} onNavigate={onNavigate} mobile snap={snap} stats={legacyStats} />
        <div style={{ margin: '28px -18px 24px', opacity: 0, animation: `aiwar-fade-in 280ms ${EASE} both` }}>
          <Ticker models={liveModels} onNavigate={onNavigate} mobile />
        </div>
      </>}

      <div className="aw-home-grid">
        {!mobile && <HeroBout area="hero" fighters={fighters.length >= 2 ? fighters : null} stats={stats} onNavigate={onNavigate} />}
        <RankBoard area="rank" models={wr.models} loading={wr.loading} onNavigate={onNavigate} mobile={mobile} rows={shell.width >= 1900 ? 14 : 12} />
        <PicksList area="picks" onNavigate={onNavigate} />

        {below && <>
          <ValueMap area="map" models={wr.models} onNavigate={onNavigate} height={mobile ? 340 : xl ? 330 : 420} />
          <BarTile area="elo" mobile={mobile} rowHeight={rowH} title="Arena ELO" color={GREEN} subtitle="Blind human votes · arena.ai" items={hl.elo} onSelect={openBar} onMore={() => onNavigate('leaderboard')} more="LLMS" />
          <BarTile area="code" mobile={mobile} rowHeight={rowH} title="Coding" color={GREEN} subtitle="SWE-bench Verified · % resolved" items={hl.swe} onSelect={openBar} onMore={() => onNavigate('coding')} more="CODE" />
          <BarTile area="img" mobile={mobile} rowHeight={rowH} title="Text to image" color={GOLD} subtitle="Image arena ELO · arena.ai" items={hl.image} onSelect={openBar} onMore={() => onNavigate('images')} more="IMAGE" />
          <BarTile area="vid" mobile={mobile} rowHeight={rowH} title="Text to video" color={BLUE} subtitle="Video arena ELO · arena.ai" items={hl.video} onSelect={openBar} onMore={() => onNavigate('videos')} more="VIDEO" />
          <BarTile area="tts" mobile={mobile} title="Text to speech" color={PURPLE} subtitle="Voice quality ELO · Artificial Analysis" items={hl.tts} onSelect={openBar} onMore={() => onNavigate('speech')} more="VOICE" />
          <BarTile area="stt" mobile={mobile} title="Transcription" color={PURPLE} subtitle="Word error rate · Open ASR Leaderboard" items={hl.stt} higherIsBetter={false} onSelect={openBar} onMore={() => onNavigate('speech')} more="VOICE" />

          <MoversPanel area="moves" models={wr.models} onNavigate={onNavigate} limit={mobile ? 6 : 10} />
          <LabsPanel area="labs" models={wr.models} onNavigate={onNavigate} limit={mobile ? 8 : 10} />

          <Board area="replay" className="aw-replay" eyebrow="Battle Replay" title="Watch a real one"
            sub="Two models, one prompt, and the crowd already voted. Pick the better clip — the names appear after."
            right={<BoardLink onClick={() => onNavigate({ type: 'videos', slug: 'replay' })}>ALL BATTLES →</BoardLink>}>
            <ReplayTeaser onNavigate={onNavigate} mobile={mobile} />
          </Board>
          <ToolsPanel area="tools" onNavigate={onNavigate} />
        </>}
      </div>

      {below && !shell.desktop && (
        <Reveal><SourcesStrip sources={wr.sources} mobile={mobile} onNavigate={onNavigate} /></Reveal>
      )}
    </div>
  );
}
