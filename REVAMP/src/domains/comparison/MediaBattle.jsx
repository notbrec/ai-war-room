// ─── Image / Video Battle Mode ──────────────────────────────────────────────
// Up to four contestants side by side (stacked / swipeable on phones), the
// metrics that matter for the modality, a battle result, and a live-battle
// panel that always prices the run before anything could be charged. No
// benchmark media is bundled — we don't scrape it — so the visual slot shows
// licensed samples only when a configured source provides them.

import { useMemo, useRef, useState } from 'react';
import { MONO, SF, EASE } from '../../components/design.jsx';
import { LabLogo } from '../../components/LabLogo.jsx';
import { ORG_CONFIG } from '../../models-data.js';
import { Panel, Label, Btn, Chip, BadgeTag, EmptyState, GREEN, GOLD, PURPLE, BLUE, RED } from '../../components/ui.jsx';
import { fmtMetric, isNum, NA } from '../../../shared/metrics.js';

const DEFAULT_PROMPT = 'A weathered combat robot standing in a rain-soaked neon alley, cinematic lighting, 35mm, shallow depth of field';
const VIDEO_SECONDS = 5;

export default function MediaBattle({ kind, roster, candidates, priceKey, mobile, liveBattle, onAdd, onRemove, onClear }) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [pick, setPick] = useState('');
  const [preview, setPreview] = useState(null);
  const videos = useRef(new Map());
  const [muted, setMuted] = useState(true);

  const winners = useMemo(() => {
    if (roster.length < 2) return null;
    const by = (get, min) => { const w = roster.filter(r => isNum(get(r))); if (!w.length) return null; return w.sort((a, b) => min ? get(a) - get(b) : get(b) - get(a))[0]; };
    const quality = by(r => r.elo, false);
    const speed = by(r => r.genTime, true);
    const price = by(r => r[priceKey], true);
    const value = (() => { const w = roster.filter(r => isNum(r[priceKey]) && r[priceKey] > 0 && isNum(r.elo)); if (!w.length) return null; return w.sort((a, b) => (b.elo / b[priceKey]) - (a.elo / a[priceKey]))[0]; })();
    return { quality, speed, price, value };
  }, [roster, priceKey]);

  const estimate = roster.map(r => ({ r, cost: isNum(r[priceKey]) ? (kind === 'video' ? r[priceKey] * VIDEO_SECONDS : r[priceKey]) : null }));
  const total = estimate.every(e => isNum(e.cost)) ? estimate.reduce((s, e) => s + e.cost, 0) : null;

  const all = fn => { for (const v of videos.current.values()) if (v) fn(v); };
  const controls = kind === 'video' && (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
      <Btn small solid onClick={() => all(v => v.play())} disabled={!roster.some(r => r.sampleUrl)}>▶ Play all</Btn>
      <Btn small onClick={() => all(v => v.pause())} disabled={!roster.some(r => r.sampleUrl)}>❚❚ Pause all</Btn>
      <Btn small onClick={() => all(v => { v.currentTime = 0; v.play(); })} disabled={!roster.some(r => r.sampleUrl)}>↻ Restart</Btn>
      <Btn small onClick={() => { setMuted(m => !m); all(v => { v.muted = !muted; }); }} disabled={!roster.some(r => r.sampleUrl)}>{muted ? 'Unmute' : 'Mute'}</Btn>
      <Btn small onClick={() => { const t = Math.min(...[...videos.current.values()].filter(Boolean).map(v => v.currentTime)); all(v => { v.currentTime = t; }); }} disabled={!roster.some(r => r.sampleUrl)}>Sync</Btn>
      {!roster.some(r => r.sampleUrl) && <span style={{ fontSize: 10.5, color: 'var(--muted2)', fontFamily: MONO }}>Controls activate when licensed sample clips are available.</span>}
    </div>
  );

  const suggestions = candidates.filter(c => !roster.some(r => r.id === c.id)).slice(0, 10);

  return (
    <div style={{ fontFamily: SF }}>
      {/* Roster picker */}
      <Panel style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Label>Contestants {roster.length}/4</Label>
          {roster.map(r => <Chip key={r.id} active color={ORG_CONFIG[r.org]?.color ?? 'var(--text)'} label={`${r.name} ×`} onClick={() => onRemove(r.id)} />)}
          {roster.length < 4 && (
            <select value={pick} onChange={e => { const r = candidates.find(c => c.id === e.target.value); if (r) onAdd(r); setPick(''); }} style={{ height: 30, paddingInline: 10, background: 'var(--card)', border: '0.5px solid var(--sep)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12.5, maxWidth: 260 }}>
              <option value="">+ Add a model…</option>
              {candidates.filter(c => !roster.some(r => r.id === c.id)).map(c => <option key={c.id} value={c.id}>#{c.rank ?? '—'} {c.name} — {c.org}</option>)}
            </select>
          )}
          {roster.length > 0 && <button onClick={onClear} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em' }}>CLEAR</button>}
        </div>
        {roster.length < 2 && suggestions.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Label>Quick add</Label>
            {suggestions.map(c => <Chip key={c.id} small label={`#${c.rank ?? '—'} ${c.name}`} onClick={() => onAdd(c)} />)}
          </div>
        )}
      </Panel>

      {roster.length < 2 ? (
        <EmptyState icon="⚔" title="Pick two to four models" body="Add contestants from the table (the Battle button) or the picker above. The same prompt, side by side, with quality, speed, price and value called out." />
      ) : (
        <>
          {controls}
          {/* Cards */}
          <div style={{ display: mobile ? 'flex' : 'grid', gridTemplateColumns: `repeat(${roster.length}, 1fr)`, gap: 10, overflowX: mobile ? 'auto' : undefined, scrollSnapType: mobile ? 'x mandatory' : undefined, paddingBottom: mobile ? 6 : 0 }}>
            {roster.map((r, i) => {
              const color = ORG_CONFIG[r.org]?.color ?? '#8E8E93';
              const tag = (w, label, col) => winners?.[w]?.id === r.id ? <BadgeTag color={col}>{label}</BadgeTag> : null;
              return (
                <div key={r.id} style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', borderTop: `2px solid ${color === '#FFFFFF' ? 'var(--text)' : color}`, minWidth: mobile ? '82vw' : 0, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', animation: `aiwar-fade-up 500ms ${EASE} ${i * 70}ms both` }}>
                  <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Label>Model {String.fromCharCode(65 + i)}</Label>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {tag('quality', 'Quality', GREEN)}{tag('speed', 'Speed', PURPLE)}{tag('price', 'Price', GOLD)}{tag('value', 'Value', BLUE)}
                    </span>
                  </div>
                  {/* Visual slot */}
                  <div onClick={() => r.sampleUrl && setPreview(r)} style={{ aspectRatio: kind === 'video' ? '16 / 9' : '1 / 1', background: 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: r.sampleUrl ? 'zoom-in' : 'default', overflow: 'hidden' }}>
                    {r.sampleUrl ? (
                      kind === 'video'
                        ? <video ref={el => videos.current.set(r.id, el)} src={r.sampleUrl} muted={muted} loop playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <img src={r.sampleUrl} alt={`${r.name} sample`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 16 }}>
                        <div style={{ opacity: 0.25, marginBottom: 8, display: 'flex', justifyContent: 'center' }}><LabLogo org={r.org} size={40} /></div>
                        <div style={{ fontSize: 10.5, color: 'var(--muted2)', fontFamily: MONO, letterSpacing: '0.06em', lineHeight: 1.5 }}>NO LICENSED SAMPLE<br /><span style={{ letterSpacing: 0, fontFamily: SF, fontSize: 11, color: 'var(--muted)' }}>Benchmark media isn't redistributed; a configured generation source fills this slot.</span></div>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <LabLogo org={r.org} size={14} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.org} · #{r.rank ?? '—'}{r.provider ? ` · ${r.provider}` : ''}</div>
                      </div>
                    </div>
                    <Row k="Quality ELO" v={`${r.elo} ±${r.ci ?? '—'}`} strong />
                    <Row k={kind === 'image' ? 'Price / image' : `Price / ${VIDEO_SECONDS}s clip`} v={isNum(r[priceKey]) ? fmtMetric(priceKey, kind === 'video' ? r[priceKey] * VIDEO_SECONDS : r[priceKey]) : NA} />
                    <Row k="Generation time" v={fmtMetric('genTime', r.genTime)} />
                    <Row k="Resolution" v={r.resolution ?? NA} />
                    {kind === 'video' && <Row k="Audio" v={r.hasAudio ? 'yes' : 'no'} />}
                    <Row k="Votes" v={fmtMetric('votes', r.votes)} />
                    <Row k="Licence" v={r.license ?? NA} />
                    <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', gap: 8 }}>
                      <button onClick={() => downloadMeta(r, kind, prompt)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', padding: 0 }}>METADATA ↓</button>
                      {r.url && <a href={r.url} target="_blank" rel="noreferrer noopener" style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted)', textDecoration: 'none', letterSpacing: '0.06em' }}>SOURCE ↗</a>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Result */}
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
            {[['Quality winner', winners.quality, GREEN, r => `ELO ${r.elo}`], ['Speed winner', winners.speed, PURPLE, r => fmtMetric('genTime', r.genTime)], ['Price winner', winners.price, GOLD, r => fmtMetric(priceKey, r[priceKey])], ['Best value', winners.value, BLUE, r => `${(r.elo / r[priceKey] / 1000).toFixed(0)}K ELO/$`]].map(([l, w, c, f]) => (
              <div key={l} style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', borderLeft: `3px solid ${c}`, padding: '10px 12px', minWidth: 0 }}>
                <Label color={c}>{l}</Label>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginTop: 4, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w ? w.name : NA}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: MONO }}>{w ? f(w) : 'no data on this axis'}</div>
              </div>
            ))}
          </div>

          {/* Live battle */}
          <Panel title="Run live battle" style={{ marginTop: 12 }} action={<BadgeTag color={liveBattle ? GREEN : RED}>{liveBattle ? 'API configured' : 'No generation API configured'}</BadgeTag>}>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} style={{ width: '100%', resize: 'vertical', background: 'var(--card2)', border: '0.5px solid var(--sep)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, padding: 10, outline: 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr auto', gap: 12, alignItems: 'end', marginTop: 10 }}>
              <div>
                <Label>Estimated cost before running</Label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6, fontSize: 12 }}>
                  {estimate.map(e => <span key={e.r.id} style={{ fontFamily: MONO, color: isNum(e.cost) ? 'var(--text)' : 'var(--muted2)' }}>{e.r.name}: {isNum(e.cost) ? `$${e.cost.toFixed(3)}` : 'unknown'}</span>)}
                  <span style={{ fontFamily: MONO, fontWeight: 700, color: total != null ? GOLD : RED }}>Total: {total != null ? `$${total.toFixed(3)}` : 'cannot estimate — a model has no listed price'}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--muted2)', margin: '6px 0 0', lineHeight: 1.5 }}>
                  {kind === 'video' ? `Assumes one ${VIDEO_SECONDS}-second clip per model at listed per-second prices.` : 'One image per model at listed per-image prices.'} Paid calls never run without this estimate and your explicit confirmation.
                </p>
              </div>
              <Btn solid disabled={!liveBattle || total == null} title={liveBattle ? 'Generate with every contestant' : 'Configure generation API keys server-side to enable'}>Run live battle</Btn>
            </div>
          </Panel>
        </>
      )}

      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          {kind === 'video' ? <video src={preview.sampleUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <img src={preview.sampleUrl} alt={preview.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
          <div style={{ position: 'absolute', bottom: 20, left: 24, color: '#fff', fontFamily: MONO, fontSize: 11 }}>{preview.name} · {preview.org} · ELO {preview.elo}</div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, borderBottom: '0.5px solid var(--sep2)', paddingBottom: 4 }}>
      <span style={{ color: 'var(--muted)' }}>{k}</span>
      <span style={{ fontFamily: MONO, color: v === NA ? 'var(--muted2)' : 'var(--text)', fontWeight: strong ? 700 : 500, textAlign: 'right' }}>{v}</span>
    </div>
  );
}

function downloadMeta(r, kind, prompt) {
  const meta = { model: r.name, creator: r.org, board: r.board, kind, rank: r.rank, elo: r.elo, ci95: r.ci, votes: r.votes, pricePerImage: r.pricePerImage, pricePerSecond: r.pricePerSecond, generationTimeSeconds: r.genTime, resolution: r.resolution, audio: r.hasAudio, license: r.license, provider: r.provider, releaseDate: r.releaseDate, prompt, sources: r.sources, exportedAt: new Date().toISOString(), attribution: 'ELO © arena.ai; generation times © Artificial Analysis' };
  const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${r.slug ?? r.id}-metadata.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
