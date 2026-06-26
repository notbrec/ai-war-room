import { useMemo, useEffect, useRef } from 'react';

/**
 * Flat premium ambient background — NO gradients, NO grid, NO robots.
 *  - solid base colour (var(--bg))
 *  - ~22 solid "signal" dots that drift up + twinkle (neuron field)
 *  - a few faint connecting lines (idle neural net)
 */

export default function CyberBackground({ dark }) {
  const nodes = useMemo(() => {
    const N = 22;
    return Array.from({ length: N }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 8 + Math.random() * 84,
      size: 1.5 + Math.random() * 2.5,
      max:  0.22 + Math.random() * 0.34,
      dur:  20 + Math.random() * 24,
      delay: -Math.random() * 30,
      firePeriod: 6 + Math.random() * 14,
      fireDelay:  Math.random() * 12,
    }));
  }, []);

  const connections = useMemo(() => {
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 18) {
          out.push({
            id: `${i}-${j}`,
            x1: nodes[i].x, y1: nodes[i].y,
            x2: nodes[j].x, y2: nodes[j].y,
            dur:   18 + Math.random() * 24,
            delay: -Math.random() * 20,
          });
          if (out.length >= 12) return out;
        }
      }
    }
    return out;
  }, [nodes]);

  const svgRef   = useRef(null);
  const fieldRef = useRef(null);
  useEffect(() => {
    let raf, curField = 0;
    const tick = () => {
      const y = window.scrollY || 0;
      curField += (-y * 0.025 - curField) * 0.08;
      if (fieldRef.current) fieldRef.current.style.transform = `translate3d(0, ${curField.toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="aiwar-bg" aria-hidden>
      <div ref={fieldRef} style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
        <svg ref={svgRef} className="aiwar-bg-net" viewBox="0 0 100 100" preserveAspectRatio="none">
          {connections.map(c => (
            <line
              key={c.id}
              x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
              className="aiwar-bg-net-line"
              style={{ animation: `aiwar-net-pulse ${c.dur}s ease-in-out ${c.delay}s infinite` }}
            />
          ))}
        </svg>

        <div className="aiwar-bg-particles">
          {nodes.map(n => (
            <span
              key={n.id}
              className="aiwar-bg-particle"
              style={{
                left:  `${n.x}%`,
                top:   `${n.y}%`,
                width:  `${n.size}px`,
                height: `${n.size}px`,
                animation:
                  `aiwar-particle-rise ${n.dur}s ease-in-out ${n.delay}s infinite,
                   aiwar-particle-fire ${n.firePeriod}s ease-in-out ${n.fireDelay}s infinite`,
                ['--p-max']: n.max,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
