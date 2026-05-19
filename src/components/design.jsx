import { useEffect, useRef, useState } from 'react';

/* ─── Design tokens ───────────────────────────────────────────────────────── */
export const SF   = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
export const MONO = "'SF Mono','JetBrains Mono',ui-monospace,'Menlo',monospace";
export const EASE = 'cubic-bezier(0.16,1,0.3,1)'; // Apple's signature out-expo-like curve

/* ─── prefers-reduced-motion helper ─────────────────────────────────────── */
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
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
      transition: `opacity 700ms ${EASE} ${delay}ms, transform 700ms ${EASE} ${delay}ms`,
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

/* ─── Eyebrow — MONO uppercase tag ──────────────────────────────────────── */
export function Eyebrow({ children, color = 'var(--muted2)' }) {
  return (
    <p style={{
      fontSize: 12, fontWeight: 600, color,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      margin: '0 0 6px', fontFamily: MONO,
    }}>
      {children}
    </p>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   NEW — WordReveal: stagger each word of a headline on entry
   ────────────────────────────────────────────────────────────────────── */
export function WordReveal({ children, baseDelay = 0, perWord = 80, style, as: Tag = 'span' }) {
  const text = typeof children === 'string' ? children : '';
  // Split by spaces but keep <br/> markers as-is via explicit \n handling
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
              animation: `aiwar-word-up 800ms ${EASE} ${baseDelay + i * perWord}ms both`,
              willChange: 'opacity, transform',
            }}
          >{w}</span>
        );
      })}
    </Tag>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   NEW — <ScrollProgress/> 2px progress bar fixed to top of viewport
   ────────────────────────────────────────────────────────────────────── */
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
        transition: 'width 60ms linear',
        boxShadow: `0 0 8px ${color === 'var(--text)' ? 'rgba(255,255,255,0.3)' : color}`,
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   NEW — <Tilt/> 3D mouse-tilt wrapper.
   Wraps a card. On mousemove, applies a subtle perspective rotation
   towards the cursor. Adds a moving radial spotlight if `spotlight` is on.
   ────────────────────────────────────────────────────────────────────── */
export function Tilt({ children, max = 6, scale = 1.01, spotlight = true, spotlightColor = 'rgba(255,255,255,0.10)', style, ...rest }) {
  const ref = useRef(null);
  const [rot, setRot] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });

  const onMove = (e) => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width;   // 0..1
    const py = y / rect.height;
    const ry = (px - 0.5) * 2 * max;   // tilt around Y axis
    const rx = -(py - 0.5) * 2 * max;  // tilt around X axis (negative so cursor "pulls" surface)
    setRot({ rx, ry, mx: px * 100, my: py * 100, active: true });
  };
  const onLeave = () => setRot(r => ({ ...r, rx: 0, ry: 0, active: false }));

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: rot.active
          ? `perspective(900px) rotateX(${rot.rx}deg) rotateY(${rot.ry}deg) scale(${scale})`
          : 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)',
        transition: rot.active
          ? 'transform 120ms ease-out'
          : `transform 600ms ${EASE}`,
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
          background: `radial-gradient(circle at ${rot.mx}% ${rot.my}%, ${spotlightColor} 0%, transparent 45%)`,
          opacity: rot.active ? 1 : 0,
          transition: 'opacity 300ms',
          mixBlendMode: 'screen',
        }} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   NEW — <Magnetic/> button wrapper that subtly follows the cursor
   ────────────────────────────────────────────────────────────────────── */
export function Magnetic({ children, strength = 0.25, style, ...rest }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const onMove = (e) => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) * strength;
    const y = (e.clientY - (rect.top + rect.height / 2)) * strength;
    setPos({ x, y });
  };
  const onLeave = () => setPos({ x: 0, y: 0 });
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        display: 'inline-flex',
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: `transform 400ms ${EASE}`,
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
   NEW — <AmbientDots/> slowly drifting dots in a section background
   ────────────────────────────────────────────────────────────────────── */
export function AmbientDots({ count = 14, color = 'var(--muted2)', opacity = 0.35 }) {
  // Generate stable positions once on mount
  const [dots] = useState(() => Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 2 + Math.random() * 4,
    delay: -Math.random() * 14,
    duration: 14 + Math.random() * 10,
  })));

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
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   NEW — <TrendArrow/> small ↑/↓ for ELO changes (decorative — uses
   deterministic pseudo-randomness so it doesn't flicker)
   ────────────────────────────────────────────────────────────────────── */
export function TrendArrow({ seed = 0, size = 10 }) {
  // Deterministic up/down based on seed
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

/* ─── PageHeader — eyebrow + huge H1 + subtitle (shared shell) ──────────── */
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

/* ─── Global animation CSS — inject once via <GlobalMotion/> ────────────── */
export function GlobalMotion() {
  return (
    <style>{`
      @keyframes aiwar-ping {
        0%   { transform: scale(1);   opacity: 0.6; }
        75%, 100% { transform: scale(2.6); opacity: 0; }
      }
      @keyframes aiwar-marquee {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
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
      .aiwar-press-btn {
        transition: transform 200ms cubic-bezier(0.16,1,0.3,1), background 200ms, color 200ms, border-color 200ms, box-shadow 200ms;
      }
      .aiwar-press-btn:hover  { transform: translateY(-1px); }
      .aiwar-press-btn:active { transform: translateY(0) scale(0.98); }
      .aiwar-card-hover {
        transition: transform 500ms cubic-bezier(0.16,1,0.3,1), border-color 300ms, box-shadow 500ms cubic-bezier(0.16,1,0.3,1);
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
        transition: transform 400ms cubic-bezier(0.16,1,0.3,1);
      }
      .aiwar-link-underline:hover::after {
        transform: scaleX(1); transform-origin: left;
      }
      .aiwar-marquee-pausable {
        animation-play-state: running;
      }
      .aiwar-marquee-pausable:hover {
        animation-play-state: paused;
      }
      .aiwar-shimmer {
        background: linear-gradient(90deg, var(--card) 0%, var(--hover) 50%, var(--card) 100%);
        background-size: 200% 100%;
        animation: aiwar-shimmer 2.4s linear infinite;
      }
      .aiwar-page-enter {
        animation: aiwar-fade-up 500ms cubic-bezier(0.16,1,0.3,1) both;
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          transition-duration: 0.001ms !important;
        }
      }
    `}</style>
  );
}
