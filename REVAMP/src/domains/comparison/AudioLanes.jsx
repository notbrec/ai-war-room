// ─── AudioLanes — side-by-side voice comparison ─────────────────────────────
// One lane per model: play all in sequence or one at a time, scrub, and see
// duration. Lanes without a licensed sample say so instead of faking one.

import { useEffect, useRef, useState } from 'react';
import { MONO, SF } from '../../components/design.jsx';
import { LabLogo } from '../../components/LabLogo.jsx';
import { ORG_CONFIG } from '../../models-data.js';
import { Label, Btn, BadgeTag, GREEN, PURPLE } from '../../components/ui.jsx';
import { fmtMetric, isNum, NA } from '../../../shared/metrics.js';

export default function AudioLanes({ rows, mobile, prompt }) {
  const refs = useRef(new Map());
  const [playing, setPlaying] = useState(null);
  const [pos, setPos] = useState({});
  const withAudio = rows.filter(r => r.sampleUrl);

  const stopAll = () => { for (const a of refs.current.values()) { a.pause(); } setPlaying(null); };
  const play = id => {
    stopAll();
    const a = refs.current.get(id); if (!a) return;
    a.currentTime = 0; a.play().catch(() => {}); setPlaying(id);
  };
  const playAll = () => {
    const ids = withAudio.map(r => r.id);
    if (!ids.length) return;
    let i = 0;
    const next = () => { if (i >= ids.length) { setPlaying(null); return; } const id = ids[i++]; const a = refs.current.get(id); if (!a) return next(); a.currentTime = 0; a.onended = next; a.play().catch(next); setPlaying(id); };
    stopAll(); next();
  };
  useEffect(() => () => stopAll(), []); // eslint-disable-line

  return (
    <div style={{ fontFamily: SF }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <Btn small solid onClick={playAll} disabled={!withAudio.length}>▶ Play all in sequence</Btn>
        <Btn small onClick={stopAll} disabled={!playing}>■ Stop</Btn>
        {prompt && <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 6 }}>Text: “{prompt}”</span>}
      </div>
      <div style={{ border: '0.5px solid var(--sep)', background: 'var(--card)' }}>
        {rows.map((r, i) => {
          const color = ORG_CONFIG[r.org]?.color ?? 'var(--text)';
          const active = playing === r.id;
          const p = pos[r.id] ?? { t: 0, d: 0 };
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '220px 1fr 140px', gap: mobile ? 6 : 14, alignItems: 'center', padding: '10px 14px', borderBottom: i < rows.length - 1 ? '0.5px solid var(--sep2)' : 'none', background: active ? `${PURPLE}0d` : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <LabLogo org={r.org} size={14} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.org}{isNum(r.elo) ? ` · ELO ${r.elo}` : ''}{isNum(r.ttft) ? ` · ${fmtMetric('ttft', r.ttft)} first audio` : ''}</div>
                </div>
              </div>
              {r.sampleUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => (active ? stopAll() : play(r.id))} aria-label={active ? 'Stop' : 'Play'} style={{ width: 30, height: 30, background: active ? 'var(--text)' : 'transparent', color: active ? 'var(--bg)' : 'var(--text)', border: '0.5px solid var(--sep)', cursor: 'pointer', fontFamily: MONO, fontSize: 11, flexShrink: 0 }}>{active ? '■' : '▶'}</button>
                  <div onClick={e => { const a = refs.current.get(r.id); if (!a || !p.d) return; const rect = e.currentTarget.getBoundingClientRect(); a.currentTime = ((e.clientX - rect.left) / rect.width) * p.d; }} style={{ flex: 1, height: 8, background: 'var(--sep2)', cursor: 'pointer', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p.d ? (p.t / p.d) * 100 : 0}%`, background: color }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted)', width: 70, textAlign: 'right' }}>{p.d ? `${p.t.toFixed(1)}s / ${p.d.toFixed(1)}s` : '—'}</span>
                  <audio ref={el => { if (el) refs.current.set(r.id, el); else refs.current.delete(r.id); }} src={r.sampleUrl} preload="metadata"
                    onTimeUpdate={e => setPos(s => ({ ...s, [r.id]: { t: e.currentTarget.currentTime, d: e.currentTarget.duration || 0 } }))}
                    onLoadedMetadata={e => setPos(s => ({ ...s, [r.id]: { t: 0, d: e.currentTarget.duration || 0 } }))}
                    onEnded={() => setPlaying(pl => (pl === r.id ? null : pl))} />
                </div>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO }}>{NA} · no licensed sample for this voice yet</span>
              )}
              <div style={{ textAlign: mobile ? 'left' : 'right', display: 'flex', gap: 4, justifyContent: mobile ? 'flex-start' : 'flex-end', flexWrap: 'wrap' }}>
                {isNum(r.pricePer1mChars) && <BadgeTag color="var(--muted)">{fmtMetric('pricePer1mChars', r.pricePer1mChars)}/1M ch</BadgeTag>}
                {r.sampleProvider && <BadgeTag color={GREEN}>{r.sampleProvider}</BadgeTag>}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 8 }}>{withAudio.length}/{rows.length} lanes have audio. Samples are generated by AI WAR ROOM from the same text for every voice; nothing is copied from other sites.</p>
    </div>
  );
}
