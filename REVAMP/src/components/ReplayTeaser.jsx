// ─── ReplayTeaser — one real crowd-voted video battle, on the home page ─────
// The archive is 1 MB, so nothing loads until the section scrolls into view.
// Two clips play side by side; pick the better one and the names and the
// crowd's verdict appear. The full archive lives in Battle Replay.

import { useEffect, useMemo, useRef, useState } from 'react';
import { MONO, EASE, useReveal } from './design.jsx';
import { LabLogo } from './LabLogo.jsx';
import { Label, Btn, BadgeTag, GREEN, GOLD, RED } from './ui.jsx';
import { Skeleton } from './design.jsx';
import { useReplays } from '../data/samples.js';

function Inner({ onNavigate, mobile }) {
  const { boards, loading } = useReplays();
  const list = boards['text-to-video'] ?? [];
  const [seed] = useState(() => Math.random());
  const battle = useMemo(() => list.length ? list[Math.floor(seed * list.length)] : null, [list, seed]);
  const [guess, setGuess] = useState(null);
  const refs = useRef({});

  useEffect(() => { for (const v of Object.values(refs.current)) v?.play?.().catch(() => {}); }, [battle?.id]);

  if (loading) return <Skeleton height={mobile ? 420 : 300} />;
  if (!battle) return null;

  const total = Object.values(boards).reduce((s, a) => s + a.length, 0);
  const pane = side => {
    const m = battle[side];
    const won = guess && battle.vote === side;
    const lost = guess && (battle.vote === (side === 'left' ? 'right' : 'left') || battle.vote === 'bothbad');
    return (
      <div key={side} style={{ background: 'var(--card)', border: `0.5px solid ${won ? GREEN : 'var(--sep)'}`, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#000', overflow: 'hidden' }}>
          <video ref={el => { refs.current[side] = el; }} src={m.url} muted loop playsInline autoPlay preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', minHeight: 40 }}>
          <Label>{side === 'left' ? 'A' : 'B'}</Label>
          {guess ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, animation: `aiwar-fade-in 300ms ${EASE} both` }}>
              <LabLogo org={m.org} size={12} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{m.org}</span>
            </span>
          ) : (
            <button onClick={() => setGuess(side)} className="aiwar-press-btn" style={{ marginLeft: 'auto', height: 26, paddingInline: 10, background: 'transparent', color: 'var(--text)', border: '0.5px solid var(--sep)', cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
              {side === 'left' ? 'A' : 'B'} IS BETTER
            </button>
          )}
          <span style={{ marginLeft: 'auto' }}>
            {won && <BadgeTag color={GREEN}>Crowd winner</BadgeTag>}
            {lost && battle.vote !== 'bothbad' && <BadgeTag color={RED}>Lost</BadgeTag>}
          </span>
        </div>
      </div>
    );
  };

  const verdict = !guess ? null
    : battle.vote === 'tie' ? 'The crowd called it a tie'
    : battle.vote === 'bothbad' ? 'The crowd said both were bad'
    : battle.vote === guess ? 'The crowd agreed with you' : 'The crowd disagreed';

  return (
    <div>
      <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Label>Prompt</Label>
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.4, marginTop: 3 }}>{battle.prompt || '—'}</div>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: !guess ? 'var(--muted2)' : battle.vote === guess ? GREEN : battle.vote === 'tie' || battle.vote === 'bothbad' ? GOLD : RED, fontFamily: MONO }}>
          {guess ? verdict : 'Names hidden until you pick'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 }}>
        {pane('left')}
        {pane('right')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <Btn small solid onClick={() => onNavigate({ type: 'videos', slug: 'replay' })}>All {total} battles →</Btn>
        <span style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO }}>GenAI-Bench (TIGER-Lab) · CC-BY-4.0 · 2024-era open models</span>
      </div>
    </div>
  );
}

export default function ReplayTeaser({ onNavigate, mobile }) {
  const [ref, shown] = useReveal({ rootMargin: '600px 0px', threshold: 0 });
  return (
    <div ref={ref} style={{ minHeight: 200 }}>
      {shown ? <Inner onNavigate={onNavigate} mobile={mobile} /> : <Skeleton height={mobile ? 420 : 300} />}
    </div>
  );
}
