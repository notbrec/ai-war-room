import { useMobile } from '../hooks/useTheme.js';
import { SF, MONO, EASE, Reveal, Eyebrow, GlobalMotion } from './design.jsx';

export default function ArticleLayout({ eyebrow, title, subtitle, meta, children, footer }) {
  const mobile = useMobile();

  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh' }}>
      <GlobalMotion />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: mobile ? '40px 18px 72px' : '72px 24px 112px' }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header style={{ marginBottom: mobile ? 32 : 44 }}>
          {eyebrow && (
            <div style={{
              opacity: 0, animation: `aiwar-fade-up 700ms ${EASE} both`,
            }}>
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
          )}

          <h1 style={{
            fontSize: mobile ? 'clamp(34px,8.5vw,46px)' : 'clamp(48px,5.4vw,72px)',
            fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1.0,
            color: 'var(--text)', margin: '10px 0 18px',
            opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 80ms both`,
          }}>
            {title}
          </h1>

          {subtitle && (
            <p style={{
              fontSize: mobile ? 17 : 21, lineHeight: 1.45,
              color: 'var(--muted)', letterSpacing: '-0.02em',
              margin: 0,
              opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 160ms both`,
            }}>
              {subtitle}
            </p>
          )}

          {meta && (
            <div style={{
              fontSize: 13, color: 'var(--muted2)', marginTop: 22,
              letterSpacing: '-0.01em', fontFamily: MONO,
              opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 240ms both`,
            }}>
              {meta}
            </div>
          )}
        </header>

        <div style={{ height: '0.5px', background: 'var(--sep)', margin: '0 0 36px' }} />

        {/* ── Article body ───────────────────────────────────────── */}
        <article style={{
          fontSize: mobile ? 16.5 : 17.5, lineHeight: 1.72,
          color: 'var(--text)', letterSpacing: '-0.011em',
        }}>
          {children}
        </article>

        {footer && (
          <>
            <div style={{ height: '0.5px', background: 'var(--sep)', margin: '56px 0 28px' }} />
            <div style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: '-0.01em', fontFamily: MONO }}>
              {footer}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Renders an array of { h, p } sections with consistent typography + Reveal */
export function ArticleSections({ sections }) {
  return (
    <>
      {sections.map((s, i) => (
        <Reveal key={i} as="section" style={{ marginBottom: 36 }}>
          {s.h && (
            <h2 style={{
              fontSize: 26, fontWeight: 700, letterSpacing: '-0.035em',
              color: 'var(--text)', margin: '40px 0 14px', lineHeight: 1.15,
            }}>
              {s.h}
            </h2>
          )}
          {s.p.split('\n\n').map((para, j) => (
            <p key={j} style={{ margin: '0 0 16px', whiteSpace: 'pre-wrap', opacity: 0.92 }}>
              {renderParagraph(para)}
            </p>
          ))}
        </Reveal>
      ))}
    </>
  );
}

function renderParagraph(s) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 600, color: 'var(--text)' }}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}
