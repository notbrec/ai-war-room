import { useEffect, useRef, useState } from 'react';
import { MONO, SF } from './design.jsx';
import FightArena from './FightArena.jsx';

/* ─────────────────────────────────────────────────────────────────────────
   <LoadingScreen/> — the AI WAR ROOM intro.

   Two robots clash while the arena "boots". A flat, premium full-screen
   panel (no gradients): brand mark, the fighters, a boot log that types in,
   and a determinate progress rail. When the bar fills the panel wipes up and
   unmounts, revealing the site beneath.

   Shows once per browser session (sessionStorage) so internal navigation
   never re-triggers it. Click / key / scroll skips ahead instantly.
   ────────────────────────────────────────────────────────────────────── */

const BOOT_LINES = [
  'Linking arena feed · arena.ai',
  'Pulling live pricing · OpenRouter',
  'Indexing models · ranking by ELO',
  'Combatants ready · entering the war room',
];

const DURATION = 2600; // ms to fill

export default function LoadingScreen({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving]   = useState(false);
  const [lineIdx, setLineIdx]   = useState(0);
  const doneRef = useRef(false);
  const rafRef  = useRef(null);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setProgress(100);
    setLeaving(true);
    window.setTimeout(() => onDone?.(), 620); // match wipe duration
  };

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / DURATION);
      // ease-out so the bar decelerates into the clash
      const eased = 1 - Math.pow(1 - p, 2);
      setProgress(eased * 100);
      setLineIdx(Math.min(BOOT_LINES.length - 1, Math.floor(p * BOOT_LINES.length)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else finish();
    };
    rafRef.current = requestAnimationFrame(tick);

    const skip = () => finish();
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    window.addEventListener('wheel', skip, { passive: true });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('wheel', skip);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: SF,
        transform: leaving ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'transform 600ms cubic-bezier(0.76,0,0.24,1)',
        willChange: 'transform',
        userSelect: 'none', cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', width: 'min(620px, 90vw)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* brand mark */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, marginBottom: 'clamp(20px,5vh,40px)',
          opacity: 0, animation: 'aiwar-fade-in 600ms cubic-bezier(0.16,1,0.3,1) both',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--accent)' }} />
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.34em',
            color: 'var(--text)', paddingLeft: 2,
          }}>AI WAR ROOM</span>
        </div>

        {/* the clash — red champion vs white challenger, the full exchange */}
        <div style={{
          width: '100%',
          opacity: 0, animation: 'aiwar-fade-up 700ms cubic-bezier(0.16,1,0.3,1) 120ms both',
        }}>
          <FightArena clip="clash" border={false} surface="var(--bg)" alt="Two robots fighting" />
        </div>

        {/* boot log line */}
        <div style={{
          height: 18, marginTop: 'clamp(18px,4vh,34px)', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 8,
          opacity: 0, animation: 'aiwar-fade-in 700ms ease 360ms both',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: 3, background: 'var(--accent)',
            animation: 'aiwar-ping 1.4s cubic-bezier(0,0,.2,1) infinite',
          }} />
          <span key={lineIdx} style={{
            fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.02em',
            color: 'var(--muted)',
            animation: 'aiwar-fade-in 320ms ease both',
          }}>
            {BOOT_LINES[lineIdx]}
          </span>
        </div>

        {/* progress rail + percent */}
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          opacity: 0, animation: 'aiwar-fade-in 700ms ease 420ms both',
        }}>
          <div style={{
            position: 'relative', flex: 1, height: 2,
            background: 'var(--sep)', borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0, transformOrigin: 'left',
              transform: `scaleX(${progress / 100})`,
              background: 'var(--text)',
              transition: 'transform 80ms linear',
            }} />
          </div>
          <span style={{
            fontFamily: MONO, fontSize: 11, fontWeight: 600,
            color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
            minWidth: 34, textAlign: 'right',
          }}>{String(Math.round(progress)).padStart(2, '0')}%</span>
        </div>

        {/* skip hint */}
        <div style={{
          marginTop: 16, fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--muted2)',
          opacity: 0, animation: 'aiwar-fade-in 800ms ease 900ms both',
        }}>
          Click to skip
        </div>
      </div>
    </div>
  );
}
