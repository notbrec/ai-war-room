import { useEffect, useRef, useState } from 'react';

/* ─── Design tokens ───────────────────────────────────────────────────────── */
export const SF   = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
export const MONO = "'SF Mono','JetBrains Mono',ui-monospace,'Menlo',monospace";
export const EASE = 'cubic-bezier(0.16,1,0.3,1)'; // Apple's signature out-expo-like curve

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
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          transition-duration: 0.001ms !important;
        }
      }
    `}</style>
  );
}
