import { useEffect, useRef, useState } from 'react';

/* ─── Design tokens ───────────────────────────────────────────────────────── */
export const SF   = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
export const MONO = "'SF Mono','JetBrains Mono',ui-monospace,'Menlo',monospace";
export const EASE = 'cubic-bezier(0.16,1,0.3,1)'; // Apple-style out-expo curve

/* ─── Animations always run — we don't auto-respect prefers-reduced-motion
   because users (and Windows defaults) often have it on unintentionally and
   the motion here is core to the product. */
function prefersReducedMotion() { return false; }

/* ─────────────────────────────────────────────────────────────────────────
   useSpring — damped spring interpolation per axis (rAF driven).
   Returns [value, setTarget]. Smoother than CSS transitions for hovers.
   ────────────────────────────────────────────────────────────────────── */
export function useSpring(initial, { stiffness = 120, damping = 18, mass = 1 } = {}) {
  const [value, setValue] = useState(initial);
  const stateRef = useRef({ value: initial, velocity: 0, target: initial });
  const rafRef   = useRef(null);

  const tick = () => {
    const s = stateRef.current;
    const dt = 1 / 60;
    const spring = -stiffness * (s.value - s.target);
    const damper = -damping * s.velocity;
    const accel  = (spring + damper) / mass;
    s.velocity  += accel * dt;
    s.value     += s.velocity * dt;
    setValue(s.value);
    if (Math.abs(s.value - s.target) < 0.001 && Math.abs(s.velocity) < 0.001) {
      s.value = s.target; s.velocity = 0;
      setValue(s.value);
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const setTarget = (t) => {
    stateRef.current.target = t;
    if (prefersReducedMotion()) {
      stateRef.current.value = t; stateRef.current.velocity = 0;
      setValue(t);
      return;
    }
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return [value, setTarget];
}

/* ─── useReveal — IntersectionObserver hook ──────────────────────────────── */
export function useReveal(options = { threshold: 0.12 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!ref.current || shown) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { setShown(true); obs.disconnect(); } });
    }, options);
    obs.observe(ref.current);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, shown];
}

/* ─── <Reveal> — wrap children for fade + slide-up on scroll ─────────────── */
export function Reveal({ children, delay = 0, y = 16, as: Tag = 'div', style, ...rest }) {
  const [ref, shown] = useReveal();
  return (
    <Tag ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0)' : `translateY(${y}px)`,
      transition: `opacity 800ms ${EASE} ${delay}ms, transform 900ms ${EASE} ${delay}ms`,
      willChange: 'opacity, transform',
      ...style,
    }} {...rest}>
      {children}
    </Tag>
  );
}

/* ─── useCountUp + AnimatedNumber ───────────────────────────────────────── */
export function useCountUp(target, duration = 1400, start = 0, shouldStart = true) {
  const [value, setValue] = useState(start);
  useEffect(() => {
    if (!shouldStart || target == null) return;
    if (prefersReducedMotion()) { setValue(target); return; }
    let raf;
    const t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3); // cubic-out
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      setValue(start + (target - start) * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start, shouldStart]);
  return value;
}

export function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString(), suffix = '', placeholder = '—', style }) {
  const [ref, shown] = useReveal({ threshold: 0.3 });
  const animated = useCountUp(typeof value === 'number' ? value : 0, 1500, 0, shown && typeof value === 'number');
  return (
    <span ref={ref} style={style}>
      {typeof value === 'number' ? `${format(animated)}${suffix}` : placeholder}
    </span>
  );
}

/* ─── LivePulse — animated dot ──────────────────────────────────────────── */
export function LivePulse({ color = '#34C759', size = 8 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: size/2, background: color,
        opacity: 0.4,
        animation: 'aiwar-ping 1.8s cubic-bezier(0,0,.2,1) infinite',
      }} />
      <span style={{
        position: 'relative', borderRadius: size/2, background: color,
        width: '100%', height: '100%', boxShadow: `0 0 6px ${color}`,
      }} />
    </span>
  );
}

/* ─── Eyebrow — MONO uppercase tag with optional animated underline ─────── */
export function Eyebrow({ children, color = 'var(--muted2)', line = false }) {
  return (
    <p style={{
      fontSize: 12, fontWeight: 600, color,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      margin: '0 0 6px', fontFamily: MONO,
      display: 'inline-flex', alignItems: 'center',
    }}>
      {children}
      {line && <span className="aiwar-eyebrow-line" aria-hidden />}
    </p>
  );
}

/* ─── WordReveal: stagger each word of a headline on entry ──────────────── */
export function WordReveal({ children, baseDelay = 0, perWord = 80, style, as: Tag = 'span' }) {
  const text = typeof children === 'string' ? children : '';
  const words = text.split(/(\s+)/);
  return (
    <Tag style={style}>
      {words.map((w, i) => {
        if (/^\s+$/.test(w)) return <span key={i}>{w}</span>;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: 0,
              animation: `aiwar-word-up 900ms ${EASE} ${baseDelay + i * perWord}ms both`,
              willChange: 'opacity, transform',
            }}
          >{w}</span>
        );
      })}
    </Tag>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   <ClickEffects/> — global JS-driven click glitch.
   Listens to mousedown on the document. When it lands on any button/anchor,
   adds .aiwar-clicked for 600ms so the full keyframe sequence completes
   even on very quick clicks (where :active would end before animation).
   ────────────────────────────────────────────────────────────────────── */
export function ClickEffects() {
  useEffect(() => {
    const handler = (e) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      const btn = t.closest('button, a, [role="button"]');
      if (!btn || btn.hasAttribute('disabled')) return;
      btn.classList.remove('aiwar-clicked');
      // Force reflow so the class re-trigger restarts the animation
      void btn.offsetWidth;
      btn.classList.add('aiwar-clicked');
      window.setTimeout(() => btn.classList.remove('aiwar-clicked'), 620);
    };
    document.addEventListener('mousedown', handler, { passive: true });
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
   <CursorSpotlight/> — soft radial light follows the mouse.
   Pure DOM manipulation via rAF + damping. No React re-render on move.
   Auto-disables on touch devices (no hover capability).
   ────────────────────────────────────────────────────────────────────── */
export function CursorSpotlight({ size = 440, color = 'rgba(255,255,255,0.10)' }) {
  const ref       = useRef(null);
  const targetRef = useRef({ x: -1000, y: -1000 });
  const posRef    = useRef({ x: -1000, y: -1000 });
  const visibleRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Skip on touch-primary devices
    if (window.matchMedia('(hover: none)').matches) return;

    const onMove = (e) => {
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
      if (!visibleRef.current && ref.current) {
        ref.current.style.opacity = '1';
        visibleRef.current = true;
      }
    };
    const onLeave = () => {
      if (ref.current) ref.current.style.opacity = '0';
      visibleRef.current = false;
    };

    let raf;
    const tick = () => {
      // Damping: ease pos towards target
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.18;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.18;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${(posRef.current.x - size/2).toFixed(2)}px, ${(posRef.current.y - size/2).toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [size]);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0,
        width: size, height: size,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0,
        transition: 'opacity 400ms ease',
        background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
        mixBlendMode: 'screen',
        willChange: 'transform, opacity',
      }}
    />
  );
}

/* ─── <ScrollProgress/> 2px progress bar fixed to top ───────────────────── */
export function ScrollProgress({ color = 'var(--text)' }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handler = () => {
      const doc = document.documentElement;
      const scrollable = (doc.scrollHeight - doc.clientHeight) || 1;
      setProgress(Math.min(1, Math.max(0, doc.scrollTop / scrollable)));
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 9999,
      pointerEvents: 'none', background: 'transparent',
    }}>
      <div style={{
        height: '100%', width: `${progress * 100}%`,
        background: color, transformOrigin: 'left',
        transition: 'width 80ms linear',
        boxShadow: `0 0 8px ${color === 'var(--text)' ? 'rgba(255,255,255,0.3)' : color}`,
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   <Tilt/> — spring-physics 3D mouse tilt with optional spotlight
   ────────────────────────────────────────────────────────────────────── */
export function Tilt({ children, max = 6, scale = 1.01, spotlight = true, spotlightColor = 'rgba(255,255,255,0.10)', style, ...rest }) {
  const ref = useRef(null);
  const [rx, setRx] = useSpring(0, { stiffness: 140, damping: 18, mass: 1 });
  const [ry, setRy] = useSpring(0, { stiffness: 140, damping: 18, mass: 1 });
  const [sc, setSc] = useSpring(1, { stiffness: 160, damping: 22, mass: 1 });
  const [mx, setMx] = useState(50);
  const [my, setMy] = useState(50);
  const [active, setActive] = useState(false);

  const onMove = (e) => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;
    setRy((px - 0.5) * 2 * max);
    setRx(-(py - 0.5) * 2 * max);
    setSc(scale);
    setMx(px * 100);
    setMy(py * 100);
    if (!active) setActive(true);
  };
  const onLeave = () => {
    setRx(0); setRy(0); setSc(1);
    setActive(false);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: `perspective(1000px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${sc.toFixed(4)})`,
        willChange: 'transform',
        ...style,
      }}
      {...rest}
    >
      {children}
      {spotlight && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          borderRadius: 'inherit',
          background: `radial-gradient(circle at ${mx}% ${my}%, ${spotlightColor} 0%, transparent 50%)`,
          opacity: active ? 1 : 0,
          transition: 'opacity 400ms ease',
          mixBlendMode: 'screen',
        }} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   <Magnetic/> — spring-physics magnetic button
   ────────────────────────────────────────────────────────────────────── */
export function Magnetic({ children, strength = 0.22, style, ...rest }) {
  const ref = useRef(null);
  const [x, setX] = useSpring(0, { stiffness: 180, damping: 22 });
  const [y, setY] = useSpring(0, { stiffness: 180, damping: 22 });

  const onMove = (e) => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setX((e.clientX - (rect.left + rect.width / 2)) * strength);
    setY((e.clientY - (rect.top + rect.height / 2)) * strength);
  };
  const onLeave = () => { setX(0); setY(0); };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        display: 'inline-flex',
        transform: `translate(${x.toFixed(3)}px, ${y.toFixed(3)}px)`,
        willChange: 'transform',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   <AmbientDots/> drifting decorative dots with scroll parallax option
   ────────────────────────────────────────────────────────────────────── */
export function AmbientDots({ count = 14, color = 'var(--muted2)', opacity = 0.35, parallax = false }) {
  const [dots] = useState(() => Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 2 + Math.random() * 4,
    delay: -Math.random() * 14,
    duration: 14 + Math.random() * 10,
    pSpeed: 0.1 + Math.random() * 0.3,
  })));
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (!parallax) return;
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [parallax]);

  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
    }}>
      {dots.map(d => (
        <span key={d.id} style={{
          position: 'absolute',
          left: `${d.left}%`, top: `${d.top}%`,
          width: d.size, height: d.size, borderRadius: d.size / 2,
          background: color, opacity,
          animation: `aiwar-drift ${d.duration}s linear ${d.delay}s infinite`,
          willChange: 'transform',
          ...(parallax && { marginTop: `${-scrollY * d.pSpeed}px` }),
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   <ComparisonBar/> — animated horizontal bar with label
   width is a 0–1 fraction; bar grows from 0 to width when in view.
   ────────────────────────────────────────────────────────────────────── */
export function ComparisonBar({ width = 0.5, color = 'var(--text)', height = 4, label, valueText, mono = true, animate = true }) {
  const [ref, shown] = useReveal({ threshold: 0.2 });
  const target = Math.max(0, Math.min(1, width));
  const pct = shown ? target * 100 : 0;
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {(label || valueText) && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8,
        }}>
          {label && (
            <span style={{
              fontSize: 10.5, color: 'var(--muted2)', textTransform: 'uppercase',
              letterSpacing: '0.08em', fontFamily: MONO, fontWeight: 600,
            }}>{label}</span>
          )}
          {valueText && (
            <span style={{
              fontSize: 12, color: 'var(--text)', fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              fontFamily: mono ? MONO : SF, letterSpacing: '-0.005em',
            }}>{valueText}</span>
          )}
        </div>
      )}
      <div style={{
        position: 'relative', width: '100%', height,
        background: 'var(--sep2)', borderRadius: height/2, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: color,
          borderRadius: height/2,
          transition: animate
            ? `width 1200ms cubic-bezier(0.16,1,0.3,1)`
            : 'none',
          willChange: 'width',
        }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   <EditorialNote/> — analyst commentary card with hover lift
   ────────────────────────────────────────────────────────────────────── */
export function EditorialNote({ author = 'Analyst', date, kicker, title, children }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '0.5px solid var(--sep)',
        borderRadius: 18,
        padding: '22px 24px',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        transition: `transform 500ms ${EASE}, border-color 350ms ${EASE}, box-shadow 500ms ${EASE}`,
        cursor: 'default',
        height: '100%',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'var(--text)';
        e.currentTarget.style.boxShadow = '0 18px 40px rgba(0,0,0,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--sep)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)' }} />
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--accent)',
          textTransform: 'uppercase', letterSpacing: '0.10em', fontFamily: MONO,
        }}>{kicker || 'Analyst note'}</span>
      </div>
      {title && (
        <div style={{
          fontSize: 18, fontWeight: 600, color: 'var(--text)',
          letterSpacing: '-0.024em', lineHeight: 1.25, marginBottom: 10,
        }}>{title}</div>
      )}
      <div style={{
        fontSize: 14.5, lineHeight: 1.6, color: 'var(--muted)',
        letterSpacing: '-0.01em',
      }}>
        {children}
      </div>
      {(author || date) && (
        <div style={{
          marginTop: 16, paddingTop: 14, borderTop: '0.5px solid var(--sep)',
          fontSize: 11.5, color: 'var(--muted2)', fontFamily: MONO,
          letterSpacing: '-0.005em',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>{author}</span>
          {date && <span>{date}</span>}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   <Skeleton/> — premium loading shimmer
   ────────────────────────────────────────────────────────────────────── */
export function Skeleton({ width = '100%', height = 14, radius = 8, style }) {
  return (
    <div className="aiwar-shimmer" style={{
      width, height, borderRadius: radius,
      ...style,
    }} />
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   <TrendArrow/> seeded ↑/↓
   ────────────────────────────────────────────────────────────────────── */
export function TrendArrow({ seed = 0, size = 10 }) {
  const up = ((seed * 9301 + 49297) % 233280) / 233280 > 0.5;
  const color = up ? '#34C759' : '#FF3B30';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      color, fontSize: size + 1, fontWeight: 600,
      animation: 'aiwar-bob 2.4s ease-in-out infinite',
    }}>
      {up ? '↑' : '↓'}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   <Marquee3D/> — smooth perspective carousel.
   Track translation runs as a pure CSS keyframe animation so it ALWAYS
   scrolls (no rAF, no JS gating, no headless-tab throttling).
   rAF is layered on top to compute per-item 3D depth (scale/z/opacity/blur)
   based on each item's distance from the viewport centre — when rAF is
   available the items get the full premium 3D effect; when it isn't, items
   simply ride the CSS marquee with their default styling. Either way the
   ticker is alive.
   ────────────────────────────────────────────────────────────────────── */
export function Marquee3D({ items, renderItem, speed = 60, gap = 32, height = 64 }) {
  const trackRef     = useRef(null);
  const containerRef = useRef(null);
  const itemRefs     = useRef([]);
  const hoverIdxRef  = useRef(-1);
  const [duration, setDuration] = useState(40);

  const doubled = [...items, ...items];

  // Measure track width and convert chosen speed (px/s) into CSS animation duration
  useEffect(() => {
    const update = () => {
      if (!trackRef.current) return;
      const half = trackRef.current.scrollWidth / 2;
      // duration so that half the track scrolls past in `half / speed` seconds
      setDuration(Math.max(20, half / speed));
    };
    update();
    const ro = new ResizeObserver(update);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, [items, speed]);

  // rAF — depth-update layer (bonus: only enhances; never required for motion)
  useEffect(() => {
    let raf;
    const tick = () => {
      if (containerRef.current) {
        const cRect = containerRef.current.getBoundingClientRect();
        const center = cRect.left + cRect.width / 2;
        const half = cRect.width / 2 || 1;
        const hoverIdx = hoverIdxRef.current;

        for (let i = 0; i < itemRefs.current.length; i++) {
          const el = itemRefs.current[i];
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          const itemCenter = r.left + r.width / 2;
          const norm = Math.min(1, Math.abs(itemCenter - center) / half);

          const z        = (1 - norm) * 30 - 8;
          const scale    = 0.86 + (1 - norm) * 0.20;
          const liftY    = (1 - norm) * -3;
          const blur     = norm * 1.2;
          const opacity  = 0.50 + (1 - norm) * 0.50;

          const isHover  = hoverIdx === i;
          const hoverZ   = isHover ? 40 : 0;
          const hoverY   = isHover ? -8 : 0;
          const hoverSc  = isHover ? 1.08 : 1;
          const hoverBlur = isHover ? 0 : blur;
          const hoverOp   = isHover ? 1 : opacity;

          el.style.transform = `translate3d(0, ${(liftY + hoverY).toFixed(2)}px, ${(z + hoverZ).toFixed(2)}px) scale(${(scale * hoverSc).toFixed(4)})`;
          el.style.filter    = `blur(${hoverBlur.toFixed(2)}px)`;
          el.style.opacity   = hoverOp.toFixed(3);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        perspective: 1400,
        perspectiveOrigin: '50% 50%',
        height: height + 40,
        overflow: 'hidden',
        maskImage: 'linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)',
        cursor: 'default',
      }}
    >
      <div
        ref={trackRef}
        className="aiwar-marquee-track"
        style={{
          display: 'flex', gap, alignItems: 'center', height: '100%',
          whiteSpace: 'nowrap', width: 'max-content',
          transformStyle: 'preserve-3d', willChange: 'transform',
          paddingInline: gap,
          animation: `aiwar-marquee ${duration}s linear infinite`,
        }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            ref={(el) => { itemRefs.current[i] = el; }}
            onMouseEnter={() => { hoverIdxRef.current = i; }}
            onMouseLeave={() => { if (hoverIdxRef.current === i) hoverIdxRef.current = -1; }}
            style={{
              flexShrink: 0,
              transformStyle: 'preserve-3d',
              willChange: 'transform, filter, opacity',
              cursor: 'pointer',
              transition: 'filter 350ms cubic-bezier(0.16,1,0.3,1), opacity 350ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Section eyebrow + H2 ──────────────────────────────────────────────── */
export function SectionTitle({ eyebrow, title, mobile, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 16, marginBottom: 24,
    }}>
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 style={{
          fontSize: mobile ? 26 : 34, fontWeight: 700,
          letterSpacing: '-0.038em', color: 'var(--text)',
          margin: 0, lineHeight: 1.1,
        }}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/* ─── PageHeader ─────────────────────────────────────────────────────────── */
export function PageHeader({ eyebrow, title, subtitle, meta, mobile, align = 'left' }) {
  return (
    <header style={{ marginBottom: mobile ? 32 : 48, textAlign: align }}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 style={{
        fontSize: mobile ? 'clamp(34px,8.5vw,46px)' : 'clamp(48px,5.6vw,76px)',
        fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1.0,
        color: 'var(--text)', margin: '8px 0 18px',
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          fontSize: mobile ? 17 : 21, lineHeight: 1.45,
          color: 'var(--muted)', letterSpacing: '-0.02em',
          margin: 0, maxWidth: 680,
          marginInline: align === 'center' ? 'auto' : 0,
        }}>
          {subtitle}
        </p>
      )}
      {meta && (
        <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 18, letterSpacing: '-0.01em', fontFamily: MONO }}>
          {meta}
        </div>
      )}
    </header>
  );
}

/* ─── Global animation CSS ──────────────────────────────────────────────── */
export function GlobalMotion() {
  return (
    <style>{`
      @keyframes aiwar-ping {
        0%   { transform: scale(1);   opacity: 0.6; }
        75%, 100% { transform: scale(2.6); opacity: 0; }
      }
      @keyframes aiwar-marquee {
        0%   { transform: translate3d(0, 0, 0); }
        100% { transform: translate3d(-50%, 0, 0); }
      }
      .aiwar-marquee-track { animation-play-state: running; }
      .aiwar-marquee-track:hover { animation-play-state: paused; }
      @keyframes aiwar-fade-up {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes aiwar-fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes aiwar-word-up {
        from { opacity: 0; transform: translateY(28px); filter: blur(6px); }
        to   { opacity: 1; transform: translateY(0);     filter: blur(0); }
      }
      @keyframes aiwar-drift {
        0%   { transform: translate(0, 0); opacity: 0; }
        10%  { opacity: 1; }
        50%  { transform: translate(40px, -30px); }
        90%  { opacity: 1; }
        100% { transform: translate(0, 0); opacity: 0; }
      }
      @keyframes aiwar-bob {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-2px); }
      }
      @keyframes aiwar-shimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes aiwar-glow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(52,199,89,0.0); }
        50%      { box-shadow: 0 0 0 6px rgba(52,199,89,0.12); }
      }
      /* Soft pulse-glow for the #1 leader card / live signal cells */
      @keyframes aiwar-leader-pulse {
        0%, 100% {
          box-shadow:
            inset 0 0 0 0.5px rgba(255,255,255,0.06),
            0 0 0 0 rgba(255,255,255,0.0);
        }
        50% {
          box-shadow:
            inset 0 0 0 0.5px rgba(255,255,255,0.16),
            0 0 18px 0 rgba(255,255,255,0.06);
        }
      }
      .aiwar-leader-pulse { animation: aiwar-leader-pulse 4s ease-in-out infinite; }

      /* Slowly drawing eyebrow underline — for section titles */
      @keyframes aiwar-eyebrow-underline {
        from { transform: scaleX(0); }
        to   { transform: scaleX(1); }
      }
      .aiwar-eyebrow-line {
        display: inline-block; vertical-align: middle;
        width: 32px; height: 1px; background: currentColor; opacity: 0.4;
        transform-origin: left; margin-left: 10px;
        animation: aiwar-eyebrow-underline 1200ms cubic-bezier(0.16,1,0.3,1) 400ms both;
      }

      /* Animated underline on nav links */
      .aiwar-nav-link {
        position: relative;
      }
      .aiwar-nav-link::after {
        content: ''; position: absolute; left: 12px; right: 12px; bottom: 4px;
        height: 1px; background: currentColor; opacity: 0.5;
        transform: scaleX(0); transform-origin: right;
        transition: transform 420ms cubic-bezier(0.16,1,0.3,1);
      }
      .aiwar-nav-link:hover::after,
      .aiwar-nav-link[data-active="true"]::after {
        transform: scaleX(1); transform-origin: left;
      }
      .aiwar-press-btn {
        transition: transform 220ms cubic-bezier(0.16,1,0.3,1), background 220ms, color 220ms, border-color 220ms, box-shadow 220ms, filter 200ms, text-shadow 80ms;
        position: relative;
      }
      .aiwar-press-btn:hover  { transform: translateY(-1px); }

      /* Click glitch — fires on any button/anchor via .aiwar-clicked
         (added by <ClickEffects/> JS) AND :active for instant fallback. */
      .aiwar-clicked,
      .aiwar-press-btn:active {
        animation: aiwar-glitch-pulse 480ms cubic-bezier(0.16,1,0.3,1) both;
      }
      .aiwar-clicked {
        position: relative;
      }
      @keyframes aiwar-glitch-pulse {
        0% {
          transform: translate(0, 0) scale(1);
          filter: brightness(1) saturate(1);
          text-shadow: none;
        }
        8% {
          transform: translate(-2px, 1px) scale(0.93);
          filter: brightness(1.25) saturate(1.5) contrast(1.1);
          text-shadow:
             2px 0 0 rgba(255,59,48,0.65),
            -2px 0 0 rgba(52,199,89,0.65);
        }
        16% {
          transform: translate(2px, -1px) scale(0.94);
          filter: brightness(1.20) saturate(1.4) contrast(1.06);
          text-shadow:
            -1.5px 0 0 rgba(255,59,48,0.55),
             1.5px 0 0 rgba(52,199,89,0.55);
        }
        24% {
          transform: translate(-1px, 0) scale(0.94);
          text-shadow:
             1px 0 0 rgba(255,59,48,0.35),
            -1px 0 0 rgba(52,199,89,0.35);
        }
        40% {
          transform: translate(0, 0) scale(0.96);
          filter: brightness(1.08) saturate(1.2);
          text-shadow: none;
        }
        100% {
          transform: translate(0, 0) scale(1);
          filter: brightness(1) saturate(1);
          text-shadow: none;
        }
      }
      .aiwar-card-hover {
        transition: transform 600ms cubic-bezier(0.16,1,0.3,1), border-color 350ms, box-shadow 600ms cubic-bezier(0.16,1,0.3,1);
      }
      .aiwar-card-hover:hover {
        transform: translateY(-4px);
        border-color: var(--text) !important;
      }
      .aiwar-link-underline {
        position: relative;
      }
      .aiwar-link-underline::after {
        content: ''; position: absolute; left: 0; right: 0; bottom: -2px;
        height: 1px; background: currentColor;
        transform: scaleX(0); transform-origin: right;
        transition: transform 500ms cubic-bezier(0.16,1,0.3,1);
      }
      .aiwar-link-underline:hover::after {
        transform: scaleX(1); transform-origin: left;
      }
      .aiwar-shimmer {
        background: linear-gradient(90deg, var(--card) 0%, var(--hover) 50%, var(--card) 100%);
        background-size: 200% 100%;
        animation: aiwar-shimmer 2.4s linear infinite;
      }
      .aiwar-page-enter {
        animation: aiwar-fade-up 600ms cubic-bezier(0.16,1,0.3,1) both;
      }
      /* Glitch / press flash — dual expanding ring + brighten core */
      @keyframes aiwar-click-flash {
        0% {
          box-shadow:
            0 0 0 0 rgba(255,255,255,0.55),
            0 0 0 0 rgba(255,255,255,0.30);
          background: rgba(255,255,255,0.20);
        }
        60% {
          box-shadow:
            0 0 0 12px rgba(255,255,255,0.10),
            0 0 0 24px rgba(255,255,255,0);
          background: rgba(255,255,255,0.04);
        }
        100% {
          box-shadow:
            0 0 0 28px rgba(255,255,255,0),
            0 0 0 40px rgba(255,255,255,0);
          background: rgba(255,255,255,0);
        }
      }
      .aiwar-press-btn:active::after,
      .aiwar-clicked::after {
        content: '';
        position: absolute; inset: 0; border-radius: inherit;
        animation: aiwar-click-flash 540ms cubic-bezier(0.16,1,0.3,1) both;
        pointer-events: none;
        mix-blend-mode: screen;
      }
      /* Highlight sweep left → right */
      @keyframes aiwar-click-sweep {
        0%   { transform: translateX(-110%); opacity: 0.0; }
        25%  { opacity: 0.75; }
        100% { transform: translateX(120%);  opacity: 0;   }
      }
      .aiwar-press-btn:active::before,
      .aiwar-clicked::before {
        content: '';
        position: absolute; inset: 0; border-radius: inherit;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%);
        animation: aiwar-click-sweep 460ms cubic-bezier(0.16,1,0.3,1) both;
        pointer-events: none;
        mix-blend-mode: screen;
        overflow: hidden;
      }
    `}</style>
  );
}
