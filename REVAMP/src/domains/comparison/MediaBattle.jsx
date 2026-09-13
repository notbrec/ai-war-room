// ─── Image / Video Battle Mode ──────────────────────────────────────────────
// Up to four contestants side by side. The battle is computed from the
// board: the arena ELO gives a head-to-head win probability (Bradley-Terry,
// the model arena.ai fits its ratings with), and price, generation time and
// value each get a winner. Media appears only when a licensed sample exists
// for a model — nothing is scraped from other sites, and no paid generation
// call is ever made from the page.

import { useMemo, useRef, useState } from 'react';
import { MONO, SF, EASE } from '../../components/design.jsx';
import { LabLogo } from '../../components/LabLogo.jsx';
import { ORG_CONFIG } from '../../models-data.js';
import { Panel, Label, Btn, Chip, BadgeTag, EmptyState, GREEN, GOLD, PURPLE, BLUE } from '../../components/ui.jsx';
import { fmtMetric, isNum, NA } from '../../../shared/metrics.js';
import { labColor } from '../../components/charts/scale.js';

const DEFAULT_PROMPT = 'A weathered combat robot standing in a rain-soaked neon alley, cinematic lighting, 35mm, shallow depth of field';
const VIDEO_SECONDS = 5;
const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

/** P(a beats b) under the Bradley-Terry / Elo model arena.ai uses. */
export function winProbability(eloA, eloB) { return 1 / (1 + 10 ** ((eloB - eloA) / 400)); }

export default function MediaBattle({ kind, roster, candidates, priceKey, mobile, liveBattle, onAdd, onRemove, onClear, showRoster = true, onReplay }) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [pick, setPick] = useState('');
  const [preview, setPreview] = useState(null);
  const videos = useRef(new Map());
  const [muted, setMuted] = useState(true);
  const withMedia = roster.filter(r => r.sampleUrl);

  const winners = useMemo(() => {
    if (roster.length < 2) return null;
    const by = (get, min) => { const w = roster.filter(r => isNum(get(r))); if (!w.length) return null; return [...w].sort((a, b) => min ? get(a) - get(b) : get(b) - get(a))[0]; };
    const quality = by(r => r.elo, false);
    const speed = by(r => r.genTime, true);
    const price = by(r => r[priceKey], true);
    const value = (() => { const w = roster.filter(r => isNum(r[priceKey]) && r[priceKey] > 0 && isNum(r.elo)); if (!w.length) return null; return [...w].sort((a, b) => (b.elo / b[priceKey]) - (a.elo / a[priceKey]))[0]; })();
    return { quality, speed, price, value };
  }, [roster, priceKey]);

  const estimate = roster.map(r => ({ r, cost: isNum(r[priceKey]) ? (kind === 'video' ? r[priceKey] * VIDEO_SECONDS : r[priceKey]) : null }));
  const total = estimate.every(e => isNum(e.cost)) ? estimate.reduce((s, e) => s + e.cost, 0) : null;
  const all = fn => { for (const v of videos.current.values()) if (v) fn(v); };
  const priceLabel = kind === 'image' ? 'Price / image' : `Price / ${VIDEO_SECONDS}s clip`;
  const priceOf = r => (isNum(r[priceKey]) ? fmtMetric(priceKey, kind === 'video' ? r[priceKey] * VIDEO_SECONDS : r[priceKey]) : NA);
  const suggestions = candidates.filter(c => !roster.some(r => r.id === c.id)).slice(0, 10);
  const tag = (r, w, label, col) => (winners?.[w]?.id === r.id ? <BadgeTag key={w} color={col}>{label}</BadgeTag> : null);

  return (
    <div style={{ fontFamily: SF }}>
      {showRoster && (
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
      )}

      {roster.length < 2 ? (
        <EmptyState icon="⚔" title="Pick two to four models" body="Add contestants from the table (the Battle button) or the picker above. The arena ELO decides the odds; price, speed and value each get a winner." />
      ) : (
        <>
          <Verdict roster={roster} mobile={mobile} />

          {withMedia.length > 0 && kind === 'video' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '12px 0' }}>
              <Btn small solid onClick={() => all(v => v.play())}>▶ Play all</Btn>
              <Btn small onClick={() => all(v => v.pause())}>❚❚ Pause all</Btn>
              <Btn small onClick={() => all(v => { v.currentTime = 0; v.play(); })}>↻ Restart</Btn>
              <Btn small onClick={() => { setMuted(m => !m); all(v => { v.muted = !muted; }); }}>{muted ? 'Unmute' : 'Mute'}</Btn>
              <Btn small onClick={() => { const t = Math.min(...[...videos.current.values()].filter(Boolean).map(v => v.currentTime)); all(v => { v.currentTime = t; }); }}>Sync</Btn>
            </div>
          )}

          {/* Contestants */}
          <div style={{ display: mobile ? 'flex' : 'grid', gridTemplateColumns: `repeat(${roster.length}, minmax(0, 1fr))`, gap: 10, marginTop: 12, overflowX: mobile ? 'auto' : undefined, scrollSnapType: mobile ? 'x mandatory' : undefined, paddingBottom: mobile ? 6 : 0 }}>
            {roster.map((r, i) => {
              const color = labColor(r.org, ORG_CONFIG);
              return (
                <div key={r.id} className="aiwar-surface" style={{ minWidth: mobile ? '82vw' : 0, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', animation: `aiwar-fade-up 500ms ${EASE} ${i * 70}ms both` }}>
                  <div style={{ padding: '9px 12px', borderBottom: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span aria-hidden style={{ width: 8, height: 8, background: color, flexShrink: 0 }} />
                    <Label>Model {String.fromCharCode(65 + i)}</Label>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {tag(r, 'quality', 'Quality', GREEN)}{tag(r, 'speed', 'Speed', PURPLE)}{tag(r, 'price', 'Price', GOLD)}{tag(r, 'value', 'Value', BLUE)}
                    </span>
                  </div>
                  {r.sampleUrl && (
                    <div onClick={() => setPreview(r)} style={{ aspectRatio: kind === 'video' ? '16 / 9' : '1 / 1', background: '#000', position: 'relative', cursor: 'zoom-in', overflow: 'hidden' }}>
                      {kind === 'video'
                        ? <video ref={el => videos.current.set(r.id, el)} src={r.sampleUrl} muted={muted} loop playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <img src={r.sampleUrl} alt={`${r.name} sample`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                  )}
                  <div style={{ padding: '12px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 34, height: 34, background: 'var(--card2)', border: '0.5px solid var(--sep2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><LabLogo org={r.org} size={18} /></span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.025em', lineHeight: 1.15, ...ellipsis }}>{r.name}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3, ...ellipsis }}>{r.org}{isNum(r.rank) ? ` · #${r.rank} on the board` : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: MONO, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{isNum(r.elo) ? r.elo : NA}</div>
                        <div style={{ fontSize: 9.5, color: 'var(--muted2)', fontFamily: MONO, letterSpacing: '0.06em', marginTop: 4 }}>ELO ±{r.ci ?? '—'}</div>
                      </div>
                    </div>
                    <div style={{ borderTop: '0.5px solid var(--sep2)', paddingTop: 6 }}>
                      <Row k="Votes" v={fmtMetric('votes', r.votes)} />
                      <Row k={priceLabel} v={priceOf(r)} />
                      <Row k="Generation time" v={fmtMetric('genTime', r.genTime)} />
                      <Row k="Resolution" v={r.resolution ?? NA} />
                      {kind === 'video' && <Row k="Audio" v={r.hasAudio == null ? NA : r.hasAudio ? 'yes' : 'no'} />}
                      <Row k="Licence" v={r.license ?? NA} />
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: 4, display: 'flex', gap: 10 }}>
                      <button onClick={() => downloadMeta(r, kind, prompt)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', padding: 0 }}>METADATA ↓</button>
                      {r.url && <a href={r.url} target="_blank" rel="noreferrer noopener" style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted)', textDecoration: 'none', letterSpacing: '0.06em' }}>SOURCE ↗</a>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Winners on each axis */}
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
            {[
              ['Quality winner', winners.quality, GREEN, r => `ELO ${r.elo}`, 'no ELO on the board'],
              ['Speed winner', winners.speed, PURPLE, r => fmtMetric('genTime', r.genTime), 'needs Artificial Analysis generation times'],
              ['Price winner', winners.price, GOLD, r => priceOf(r), 'no listed price for these models'],
              ['Best value', winners.value, BLUE, r => `${(r.elo / r[priceKey] / 1000).toFixed(0)}K ELO per $`, 'needs both an ELO and a price'],
            ].map(([l, w, c, f, why]) => (
              <div key={l} className="aiwar-surface" style={{ padding: '10px 12px', minWidth: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden style={{ width: 8, height: 8, background: c }} /><Label color="var(--text)">{l}</Label></span>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: w ? 'var(--text)' : 'var(--muted2)', marginTop: 6, letterSpacing: '-0.02em', ...ellipsis }}>{w ? w.name : NA}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: MONO, marginTop: 2, ...ellipsis }}>{w ? f(w) : why}</div>
              </div>
            ))}
          </div>

          {/* Live generation — only when a server-side key exists; otherwise one honest line */}
          {liveBattle ? (
            <Panel title="Run live battle" style={{ marginTop: 12 }} action={<BadgeTag color={GREEN}>API configured</BadgeTag>}>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} style={{ width: '100%', resize: 'vertical', background: 'var(--card2)', border: '0.5px solid var(--sep)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, padding: 10, outline: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr auto', gap: 12, alignItems: 'end', marginTop: 10 }}>
                <div>
                  <Label>Estimated cost before running</Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6, fontSize: 12 }}>
                    {estimate.map(e => <span key={e.r.id} style={{ fontFamily: MONO, color: isNum(e.cost) ? 'var(--text)' : 'var(--muted2)' }}>{e.r.name}: {isNum(e.cost) ? `$${e.cost.toFixed(3)}` : 'unknown'}</span>)}
                    <span style={{ fontFamily: MONO, fontWeight: 700, color: total != null ? GOLD : 'var(--muted)' }}>Total: {total != null ? `$${total.toFixed(3)}` : 'cannot estimate — a model has no listed price'}</span>
                  </div>
                </div>
                <Btn solid disabled={total == null}>Run live battle</Btn>
              </div>
            </Panel>
          ) : (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              <span style={{ flex: 1, minWidth: 240 }}>Odds come from the arena ELO (Bradley-Terry), the same model arena.ai fits its ratings with. Generating new media is switched off on this deployment, so nothing here can make a paid call; real crowd-voted duels are in Battle Replay.</span>
              {onReplay && <Btn small onClick={onReplay}>Watch real duels →</Btn>}
            </div>
          )}
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

/* ─── Verdict — who is expected to win, from the arena ELO ──────────────── */
function Verdict({ roster, mobile }) {
  const rated = roster.filter(r => isNum(r.elo));
  if (rated.length < 2) return null;
  if (roster.length === 2 && rated.length === 2) {
    const [a, b] = roster;
    const p = winProbability(a.elo, b.elo);
    const gap = Math.abs(a.elo - b.elo);
    const tied = gap <= (a.ci ?? 0) + (b.ci ?? 0);
    const fav = p >= 0.5 ? a : b, pFav = Math.max(p, 1 - p);
    const ca = labColor(a.org, ORG_CONFIG), cb = labColor(b.org, ORG_CONFIG);
    return (
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <Label color="var(--muted)">Head to head · from arena ELO</Label>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted2)' }}>{gap} ELO apart · ±{a.ci ?? '—'} / ±{b.ci ?? '—'} CI</span>
        </div>
        <div style={{ fontSize: mobile ? 16 : 19, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', marginTop: 8, lineHeight: 1.2 }}>
          {tied ? <>Too close to call — the crowd would split about <span style={{ fontFamily: MONO }}>{Math.round(pFav * 100)}/{100 - Math.round(pFav * 100)}</span></> : <><span style={{ ...ellipsis, display: 'inline' }}>{fav.name}</span> wins about <span style={{ fontFamily: MONO }}>{Math.round(pFav * 100)}</span> of 100 battles</>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--text)', minWidth: 0 }}><LabLogo org={a.org} size={13} /><span style={{ ...ellipsis, maxWidth: mobile ? 110 : 220 }}>{a.name}</span><span style={{ fontFamily: MONO, color: 'var(--muted)' }}>{Math.round(p * 100)}%</span></span>
          <span style={{ position: 'relative', height: 10, background: 'var(--sep2)', display: 'block' }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `calc(${(p * 100).toFixed(1)}% - 1px)`, background: ca }} />
            <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `calc(${((1 - p) * 100).toFixed(1)}% - 1px)`, background: cb }} />
            <span aria-hidden style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1, background: 'var(--text)', opacity: 0.5 }} />
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--text)', minWidth: 0, flexDirection: 'row-reverse' }}><LabLogo org={b.org} size={13} /><span style={{ ...ellipsis, maxWidth: mobile ? 110 : 220 }}>{b.name}</span><span style={{ fontFamily: MONO, color: 'var(--muted)' }}>{Math.round((1 - p) * 100)}%</span></span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 8, lineHeight: 1.5 }}>
          {tied ? 'The two confidence intervals overlap, so the board cannot separate them: any single battle is close to a coin flip.' : 'Win chance = 1 / (1 + 10^((ELO B − ELO A) / 400)); the ratings are fitted from thousands of anonymous human votes.'}
        </div>
      </Panel>
    );
  }
  // three or four: pairwise grid
  return (
    <Panel>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <Label color="var(--muted)">Head to head · chance the row beats the column, from arena ELO</Label>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 120 + roster.length * 90 }}>
          <thead><tr><th style={{ textAlign: 'left', padding: '6px 10px', fontFamily: MONO, fontSize: 10, color: 'var(--muted)', letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid var(--sep)' }}>vs</th>
            {roster.map(c => <th key={c.id} style={{ textAlign: 'right', padding: '6px 10px', fontFamily: MONO, fontSize: 10, color: 'var(--muted)', letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid var(--sep)', whiteSpace: 'nowrap', maxWidth: 140, ...ellipsis }}>{c.name}</th>)}</tr></thead>
          <tbody>
            {roster.map(r => (
              <tr key={r.id}>
                <td style={{ padding: '7px 10px', borderBottom: '0.5px solid var(--sep2)', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><LabLogo org={r.org} size={12} />{r.name}</span></td>
                {roster.map(c => {
                  if (c.id === r.id) return <td key={c.id} style={{ padding: '7px 10px', borderBottom: '0.5px solid var(--sep2)', textAlign: 'right', color: 'var(--muted2)', fontFamily: MONO }}>—</td>;
                  if (!isNum(r.elo) || !isNum(c.elo)) return <td key={c.id} style={{ padding: '7px 10px', borderBottom: '0.5px solid var(--sep2)', textAlign: 'right', color: 'var(--muted2)', fontFamily: MONO }}>{NA}</td>;
                  const p = winProbability(r.elo, c.elo);
                  return <td key={c.id} style={{ padding: '7px 10px', borderBottom: '0.5px solid var(--sep2)', textAlign: 'right', fontFamily: MONO, fontSize: 12.5, fontWeight: p >= 0.5 ? 700 : 500, color: 'var(--text)', background: p >= 0.5 ? `${GREEN}14` : 'transparent', fontVariantNumeric: 'tabular-nums' }}>{Math.round(p * 100)}%</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, padding: '4px 0', borderBottom: '0.5px solid var(--sep2)' }}>
      <span style={{ color: 'var(--muted)' }}>{k}</span>
      <span style={{ fontFamily: MONO, color: v === NA ? 'var(--muted2)' : 'var(--text)', fontWeight: 500, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
    </div>
  );
}

function downloadMeta(r, kind, prompt) {
  const meta = { model: r.name, creator: r.org, board: r.board, kind, rank: r.rank, elo: r.elo, ci95: r.ci, votes: r.votes, pricePerImage: r.pricePerImage, pricePerSecond: r.pricePerSecond, generationTimeSeconds: r.genTime, resolution: r.resolution, audio: r.hasAudio, license: r.license, provider: r.provider, releaseDate: r.releaseDate, prompt, sources: r.sources, exportedAt: new Date().toISOString(), attribution: 'ELO © arena.ai; generation times © Artificial Analysis' };
  const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${r.slug ?? r.id}-metadata.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
