// ─── Battle Replay — real human-preference battles you can watch ────────────
// Two models, one prompt, side by side; guess the winner, then see how the
// crowd voted. Synced video playback, fullscreen, zoom. Source: GenAI-Bench
// (TIGER-Lab, CC-BY-4.0) — the models are 2024-era open models, so this is a
// replay archive rather than the current board.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MONO, SF, EASE } from '../../components/design.jsx';
import { LabLogo } from '../../components/LabLogo.jsx';
import { ORG_CONFIG } from '../../models-data.js';
import { Panel, Label, Btn, Chip, BadgeTag, EmptyState, Segmented, GREEN, GOLD, RED, BLUE } from '../../components/ui.jsx';

const BOARD_LABEL = { 'text-to-image': 'Text to image', 'image-edit': 'Image editing', 'text-to-video': 'Text to video' };

function useSyncedVideos() {
  const refs = useRef(new Map());
  const set = useCallback((key, el) => { if (el) refs.current.set(key, el); else refs.current.delete(key); }, []);
  const all = fn => { for (const v of refs.current.values()) fn(v); };
  return {
    set,
    playAll: () => all(v => v.play().catch(() => {})),
    pauseAll: () => all(v => v.pause()),
    restart: () => all(v => { v.currentTime = 0; v.play().catch(() => {}); }),
    sync: () => { const vs = [...refs.current.values()]; if (!vs.length) return; const t = Math.min(...vs.map(v => v.currentTime)); all(v => { v.currentTime = t; }); },
    setMuted: m => all(v => { v.muted = m; }),
  };
}

export default function BattleReplay({ boards, kind, loading, license, attribution, mobile, initialBoard }) {
  const available = Object.keys(boards).filter(b => (kind === 'video' ? /video/ : /image/).test(b) && boards[b]?.length);
  const [board, setBoard] = useState(initialBoard && available.includes(initialBoard) ? initialBoard : available[0]);
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [modelFilter, setModelFilter] = useState('');
  const [muted, setMuted] = useState(true);
  const [full, setFull] = useState(null);   // 'left' | 'right' | null
  const [zoom, setZoom] = useState(false);
  const videos = useSyncedVideos();

  useEffect(() => { if (!board && available[0]) setBoard(available[0]); }, [available.join(','), board]); // eslint-disable-line
  const list = useMemo(() => {
    const all = boards[board] ?? [];
    return modelFilter ? all.filter(b => b.left.name === modelFilter || b.right.name === modelFilter) : all;
  }, [boards, board, modelFilter]);
  const models = useMemo(() => { const s = new Map(); for (const b of boards[board] ?? []) { s.set(b.left.name, b.left); s.set(b.right.name, b.right); } return [...s.values()].sort((a, b) => a.name.localeCompare(b.name)); }, [boards, board]);
  const battle = list[Math.min(idx, Math.max(0, list.length - 1))];

  const go = useCallback(n => { setIdx(i => (list.length ? (i + n + list.length) % list.length : 0)); setGuess(null); setZoom(false); }, [list.length]);
  const random = () => { setIdx(Math.floor(Math.random() * list.length)); setGuess(null); setZoom(false); };
  useEffect(() => { setIdx(0); setGuess(null); }, [board, modelFilter]);
  useEffect(() => {
    const onKey = e => { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Escape') setFull(null); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [go]);
  useEffect(() => { if (kind === 'video' && battle) setTimeout(() => videos.playAll(), 150); }, [battle?.id]); // eslint-disable-line

  const reveal = side => {
    if (guess || !battle) return;
    setGuess(side);
    setScore(s => ({ right: s.right + (battle.vote === side ? 1 : 0), total: s.total + 1 }));
  };

  if (loading) return <EmptyState icon="…" title="Loading the battle archive" />;
  if (!available.length) return <EmptyState title="No replay archive for this arena" body="The open GenAI-Bench archive covers text-to-image, image editing and text-to-video." />;
  if (!battle) return <EmptyState title="No battles match" action={<Btn small onClick={() => setModelFilter('')}>Clear filter</Btn>} />;

  const verdict = guess ? (battle.vote === 'tie' ? 'Crowd called it a tie' : battle.vote === 'bothbad' ? 'Crowd said both were bad' : battle.vote === guess ? 'Crowd agreed with you' : 'Crowd disagreed') : null;
  const verdictColor = !guess ? 'var(--muted)' : battle.vote === guess ? GREEN : battle.vote === 'tie' || battle.vote === 'bothbad' ? GOLD : RED;

  // Rendered as a function (not a nested component) so re-renders never remount the <video>s.
  const renderPane = side => {
    const m = battle[side];
    const color = ORG_CONFIG[m.org]?.color ?? 'var(--text)';
    const won = guess && battle.vote === side;
    const lost = guess && (battle.vote === (side === 'left' ? 'right' : 'left') || battle.vote === 'bothbad');
    return (
      <div style={{ background: 'var(--card)', border: `0.5px solid ${won ? GREEN : 'var(--sep)'}`, borderTop: `2px solid ${color}`, minWidth: mobile ? '84vw' : 0, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', animation: `aiwar-fade-in 300ms ${EASE} both` }}>
        <div style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Label>Model {side === 'left' ? 'A' : 'B'}</Label>
          {guess ? (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}><LabLogo org={m.org} size={12} /><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span><span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{m.org}</span></span>)
            : <span style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO }}>hidden until you pick</span>}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>{won && <BadgeTag color={GREEN}>Crowd winner</BadgeTag>}{lost && battle.vote !== 'bothbad' && <BadgeTag color={RED}>Lost</BadgeTag>}</span>
        </div>
        <div onClick={() => (kind === 'image' ? setFull(side) : null)} style={{ position: 'relative', aspectRatio: kind === 'video' ? '16 / 9' : '1 / 1', background: '#000', overflow: 'hidden', cursor: kind === 'image' ? 'zoom-in' : 'default' }}>
          {kind === 'video'
            ? <video key={m.url} ref={el => videos.set(side, el)} src={m.url} muted={muted} loop playsInline preload="auto" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} onClick={e => { e.stopPropagation(); e.currentTarget.paused ? videos.playAll() : videos.pauseAll(); }} />
            : <img key={m.url} src={m.url} alt={`${side} output`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />}
          {kind === 'video' && <button onClick={e => { e.stopPropagation(); setFull(side); }} aria-label="Fullscreen" style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', border: '0.5px solid rgba(255,255,255,0.3)', fontFamily: MONO, fontSize: 10, padding: '3px 7px', cursor: 'pointer' }}>⤢ FULL</button>}
        </div>
        <button onClick={() => reveal(side)} disabled={!!guess} className="aiwar-press-btn" style={{
          margin: 10, height: 34, background: guess === side ? 'var(--text)' : 'transparent', color: guess === side ? 'var(--bg)' : 'var(--text)',
          border: '0.5px solid var(--sep)', cursor: guess ? 'default' : 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        }}>{guess ? (guess === side ? 'YOUR PICK' : '—') : `${side === 'left' ? 'A' : 'B'} IS BETTER`}</button>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: SF }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <Segmented small value={board} onChange={setBoard} options={available.map(b => ({ value: b, label: BOARD_LABEL[b] ?? b, count: boards[b].length }))} />
        <select value={modelFilter} onChange={e => setModelFilter(e.target.value)} style={{ height: 28, paddingInline: 8, background: 'var(--card)', border: '0.5px solid var(--sep)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, maxWidth: 220 }}>
          <option value="">All models</option>
          {models.map(m => <option key={m.name} value={m.name}>{m.name} — {m.org}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5, color: 'var(--muted)' }}>
          BATTLE {idx + 1}/{list.length} · YOUR CALLS {score.right}/{score.total}{score.total ? ` (${Math.round(score.right / score.total * 100)}%)` : ''}
        </span>
      </div>

      {/* Prompt */}
      <Panel style={{ marginBottom: 10 }} pad={12}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Label>Prompt</Label>
            <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.45, marginTop: 4 }}>{battle.prompt || '—'}</div>
          </div>
          {battle.source && <img src={battle.source} alt="source" style={{ width: 88, height: 88, objectFit: 'cover', border: '0.5px solid var(--sep)' }} title="Source image (editing task)" />}
          <div style={{ minWidth: 160 }}>
            <Label>Crowd verdict</Label>
            <div style={{ fontSize: 13, fontWeight: 700, color: verdictColor, marginTop: 4 }}>{guess ? verdict : 'Pick A or B first'}</div>
            {guess && <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: MONO }}>vote: {battle.vote}</div>}
          </div>
        </div>
      </Panel>

      {kind === 'video' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <Btn small solid onClick={videos.playAll}>▶ Play all</Btn>
          <Btn small onClick={videos.pauseAll}>❚❚ Pause all</Btn>
          <Btn small onClick={videos.restart}>↻ Restart</Btn>
          <Btn small onClick={videos.sync}>Sync</Btn>
          <Btn small onClick={() => { setMuted(m => !m); videos.setMuted(!muted); }}>{muted ? 'Unmute' : 'Mute'}</Btn>
        </div>
      )}

      <div style={{ display: mobile ? 'flex' : 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, overflowX: mobile ? 'auto' : undefined, scrollSnapType: mobile ? 'x mandatory' : undefined, paddingBottom: mobile ? 6 : 0 }}>
        {renderPane('left')}
        {renderPane('right')}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn small onClick={() => go(-1)}>← Prev</Btn>
        <Btn small solid onClick={() => go(1)}>Next battle →</Btn>
        <Btn small onClick={random}>Random</Btn>
        <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)', marginLeft: 6 }}>← → keys</span>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--muted2)', fontFamily: MONO }}>
          {license} · <a href="https://huggingface.co/datasets/TIGER-Lab/GenAI-Bench" target="_blank" rel="noreferrer noopener" style={{ color: 'var(--muted)', textDecoration: 'none' }}>GenAI-Bench (TIGER-Lab) ↗</a>
        </span>
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10, lineHeight: 1.55 }}>
        These are real anonymous battles from the open GenAI Arena archive: the crowd saw exactly these two outputs and voted. Model names stay hidden until you pick, the same way the arena works. The archive covers 2024-era open models; today's frontier models are ranked above but their outputs are not redistributable, so they appear here only when AI WAR ROOM generates its own samples.
      </p>

      {full && (
        <div onClick={() => setFull(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: mobile ? 8 : 24, cursor: 'zoom-out' }}>
          {kind === 'video'
            ? <video src={battle[full].url} controls autoPlay loop muted={muted} style={{ maxWidth: '100%', maxHeight: '100%' }} onClick={e => e.stopPropagation()} />
            : <img src={battle[full].url} alt="" onClick={e => { e.stopPropagation(); setZoom(z => !z); }} style={{ maxWidth: zoom ? 'none' : '100%', maxHeight: zoom ? 'none' : '100%', width: zoom ? '200%' : undefined, cursor: zoom ? 'zoom-out' : 'zoom-in', objectFit: 'contain' }} />}
          <div style={{ position: 'absolute', bottom: 16, left: 20, color: '#fff', fontFamily: MONO, fontSize: 11 }}>{guess ? `${battle[full].name} · ${battle[full].org}` : `Model ${full === 'left' ? 'A' : 'B'}`} · {kind === 'image' ? 'click image to zoom · ' : ''}Esc to close</div>
          {zoom && <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }} onClick={() => setFull(null)}><img src={battle[full].url} alt="" style={{ width: '200%', maxWidth: 'none' }} onClick={e => { e.stopPropagation(); setZoom(false); }} /></div>}
        </div>
      )}
    </div>
  );
}
