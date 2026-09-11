// ─── RaceLanes — the Speed Race track ───────────────────────────────────────
// Lanes come from shared/race.js (real values, normalised finish times).
// The animation is driven by one rAF clock so every lane is on the same
// timeline and the finishing order is exactly the data's order.

import { useEffect, useRef, useState } from 'react';
import { MONO, SF, EASE } from '../design.jsx';
import { LabLogo } from '../LabLogo.jsx';
import { ORG_CONFIG } from '../../models-data.js';
import { laneProgress } from '../../../shared/race.js';
import { fmtMetric } from '../../../shared/metrics.js';
import { Label, Btn, GREEN, GOLD } from '../ui.jsx';

export default function RaceLanes({ lanes, metricKey, unit, mobile, autoplay = true }) {
  const [speed, setSpeed] = useState(1);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const raf = useRef(null), start = useRef(0), base = useRef(0);
  const total = lanes.reduce((m, l) => Math.max(m, l.finishMs), 0);

  const stop = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; setRunning(false); };
  const play = (from = t) => {
    stop();
    base.current = from >= total ? 0 : from;
    start.current = performance.now();
    setRunning(true);
    const tick = now => {
      const el = base.current + (now - start.current) * speed;
      setT(Math.min(total, el));
      if (el < total) raf.current = requestAnimationFrame(tick);
      else { raf.current = null; setRunning(false); }
    };
    raf.current = requestAnimationFrame(tick);
  };
  const replay = () => { setT(0); play(0); };

  useEffect(() => { setT(0); if (autoplay && lanes.length) play(0); return stop; /* eslint-disable-line */ }, [lanes]);
  useEffect(() => { if (running) play(t); /* eslint-disable-line */ }, [speed]);

  if (!lanes.length) return null;
  const done = t >= total;
  const winner = lanes[0];

  return (
    <div style={{ fontFamily: SF }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Btn small solid onClick={() => (running ? stop() : play(t))}>{running ? '❚❚ Pause' : done ? '↻ Replay' : '▶ Play'}</Btn>
        <Btn small onClick={replay}>Restart</Btn>
        <div style={{ display: 'inline-flex', border: '0.5px solid var(--sep)', marginLeft: 4 }}>
          {[1, 2, 5].map(s => (
            <button key={s} onClick={() => setSpeed(s)} className="aiwar-press-btn" style={{
              height: 28, paddingInline: 10, border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 700,
              background: speed === s ? 'var(--text)' : 'transparent', color: speed === s ? 'var(--bg)' : 'var(--muted)',
            }}>{s}×</button>
          ))}
        </div>
        <span style={{ fontSize: 10.5, fontFamily: MONO, color: 'var(--muted2)', letterSpacing: '0.06em', marginLeft: 'auto' }}>
          CLOCK {(t / 1000).toFixed(2)}s · ANIMATION NORMALISED · VALUES REAL
        </span>
      </div>

      {/* Track */}
      <div style={{ border: '0.5px solid var(--sep)', background: 'var(--card)', position: 'relative', overflow: 'hidden' }}>
        {/* finish line */}
        <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, right: mobile ? 96 : 150, width: 0, borderLeft: '1px dashed var(--muted2)', opacity: 0.6 }} />
        {lanes.map((l, i) => {
          const p = laneProgress(l, t);
          const finished = t >= l.finishMs;
          const color = ORG_CONFIG[l.org]?.color ?? 'var(--text)';
          return (
            <div key={l.id} style={{
              display: 'grid', gridTemplateColumns: mobile ? '110px 1fr 96px' : '200px 1fr 150px',
              alignItems: 'center', gap: mobile ? 8 : 14, padding: mobile ? '10px 10px' : '12px 16px',
              borderBottom: i < lanes.length - 1 ? '0.5px solid var(--sep2)' : 'none',
              background: finished && l.winner ? `${GREEN}0d` : 'transparent', transition: 'background 400ms',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)', width: 14 }}>{finished ? l.rank : '·'}</span>
                <LabLogo org={l.org} size={14} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: mobile ? 12 : 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                  {!mobile && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{l.org}</div>}
                </div>
              </div>
              <div style={{ position: 'relative', height: 14, background: 'var(--sep2)' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p * 100}%`, background: color, opacity: finished ? 1 : 0.85, transition: 'none' }} />
                {/* head marker */}
                <div style={{ position: 'absolute', top: -3, left: `calc(${p * 100}% - 2px)`, width: 4, height: 20, background: 'var(--text)', opacity: finished ? 0 : 0.8 }} />
              </div>
              <div style={{ textAlign: 'right', fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
                <div style={{ fontSize: mobile ? 12 : 14, fontWeight: 700, color: finished ? (l.winner ? GREEN : 'var(--text)') : 'var(--muted2)', letterSpacing: '-0.02em', transition: 'color 300ms' }}>
                  {finished ? (metricKey ? fmtMetric(metricKey, l.value) : `${l.value}${unit ?? ''}`) : '…'}
                </div>
                <div style={{ fontSize: 9.5, color: l.winner ? GREEN : GOLD, letterSpacing: '0.06em', height: 12 }}>
                  {finished ? (l.winner ? 'WINNER' : `+${l.pctSlower.toFixed(0)}% SLOWER`) : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Result */}
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 8, marginTop: 10, opacity: done ? 1 : 0.35, transition: `opacity 500ms ${EASE}` }}>
        <Res label="Winner" value={winner.name} color={GREEN} />
        <Res label="Result" value={metricKey ? fmtMetric(metricKey, winner.value) : String(winner.value)} />
        <Res label="Runner-up" value={lanes[1] ? lanes[1].name : '—'} />
        <Res label="Margin" value={lanes[1] ? `${(lanes[1].ratio * 100 - 100).toFixed(0)}% ` : '—'} sub={lanes[1] ? `${lanes[1].ratio.toFixed(2)}× the winner` : ''} />
      </div>
      {lanes.some(l => l.capped) && (
        <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 8 }}>Lanes more than 6× slower than the winner are drawn at 6× so the race stays watchable — the printed values are exact.</p>
      )}
    </div>
  );
}

function Res({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', padding: '10px 12px', minWidth: 0 }}>
      <Label>{label}</Label>
      <div style={{ fontSize: 14, fontWeight: 700, color: color ?? 'var(--text)', marginTop: 4, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: MONO }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
