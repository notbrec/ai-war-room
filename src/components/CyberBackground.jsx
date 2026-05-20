import { useMemo } from 'react';

/**
 * Clean premium ambient background:
 *  - very subtle static grain (texture only, no motion)
 *  - one giant soft glow at top breathing slowly
 *  - ~22 small floating particles that drift upward + twinkle
 *  - corner vignette
 * No grid, no neon, no purple, no military feel.
 */
export default function CyberBackground({ dark }) {
  const particles = useMemo(() => {
    const N = 22;
    return Array.from({ length: N }, (_, i) => ({
      id: i,
      left: Math.random() * 100,            // %
      top:  10 + Math.random() * 80,         // % (avoid extreme edges)
      size: 1.5 + Math.random() * 2.5,       // px
      max:  0.22 + Math.random() * 0.36,     // peak opacity
      dur:  18 + Math.random() * 22,         // s
      delay: -Math.random() * 30,            // s (negative so they start mid-cycle)
    }));
  }, []);

  return (
    <div className="aiwar-bg" aria-hidden>
      <div className="aiwar-bg-glow" />
      <div className="aiwar-bg-particles">
        {particles.map(p => (
          <span
            key={p.id}
            className="aiwar-bg-particle"
            style={{
              left:  `${p.left}%`,
              top:   `${p.top}%`,
              width:  `${p.size}px`,
              height: `${p.size}px`,
              animation: `aiwar-particle-rise ${p.dur}s ease-in-out ${p.delay}s infinite`,
              ['--p-max']: p.max,
            }}
          />
        ))}
      </div>
      <div className="aiwar-bg-vignette" />
    </div>
  );
}
