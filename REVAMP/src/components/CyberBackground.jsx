import { useMemo, useEffect, useRef } from 'react';
import { RobotAnim } from './RobotAnim.jsx';

/**
 * Flat premium ambient background — NO gradients, NO grid.
 *  - solid base colour (var(--bg))
 *  - a sparse, scattered "crowd" of faint ANIMATED robots (the real moving
 *    art) that drift on scroll-parallax — edge-anchored so they never fight
 *    the content.
 *  - ~22 solid "signal" dots that drift up + twinkle (neuron field)
 *  - a few faint connecting lines (idle neural net)
 */

// Edge-anchored scatter so the centre column (content) stays clean.
const SCATTER = [
  { kind: 'two',   w: 220, top: '7%',  left: '-4%',  op: 0.10, depth: 0.06, hideSm: false },
  { kind: 'brawl', w: 150, top: '31%', right: '3%',  op: 0.09, depth: 0.10, hideSm: true  },
  { kind: 'two',   w: 150, top: '55%', left: '4%',   op: 0.08, depth: 0.14, hideSm: true  },
  { kind: 'brawl', w: 260, top: '72%', right: '-5%', op: 0.10, depth: 0.05, hideSm: false },
  { kind: 'two',   w: 130, top: '90%', left: '10%',  op: 0.08, depth: 0.12, hideSm: true  },
];

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

  const svgRef    = useRef(null);
  const fieldRef  = useRef(null);
  const markRefs  = useRef([]);
  useEffect(() => {
    let raf, curField = 0;
    const cur = SCATTER.map(() => 0);
    const tick = () => {
      const y = window.scrollY || 0;
      curField += (-y * 0.025 - curField) * 0.08;
      if (fieldRef.current) fieldRef.current.style.transform = `translate3d(0, ${curField.toFixed(2)}px, 0)`;
      for (let i = 0; i < SCATTER.length; i++) {
        const target = -y * SCATTER[i].depth;
        cur[i] += (target - cur[i]) * 0.08;
        if (markRefs.current[i]) markRefs.current[i].style.transform = `translate3d(0, ${cur[i].toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="aiwar-bg" aria-hidden>
      {/* scattered faint crowd of ANIMATED robots */}
      {SCATTER.map((s, i) => (
        <div
          key={i}
          ref={el => (markRefs.current[i] = el)}
          className={`aiwar-bg-mark${s.hideSm ? ' aiwar-bg-mark--hide-sm' : ''}`}
          style={{
            top: s.top, left: s.left, right: s.right,
            ['--mark-op']: s.op,
            willChange: 'transform',
          }}
        >
          <RobotAnim kind={s.kind} width={s.w} />
        </div>
      ))}

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
