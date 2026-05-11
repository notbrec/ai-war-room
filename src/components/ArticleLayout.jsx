import { useMobile } from '../hooks/useTheme.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";

export default function ArticleLayout({ eyebrow, title, subtitle, meta, children, footer }) {
  const mobile = useMobile();

  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: mobile ? '32px 16px 64px' : '48px 24px 96px' }}>

        {eyebrow && (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#FF3B30', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            {eyebrow}
          </div>
        )}

        <h1 style={{
          fontSize: mobile ? 'clamp(28px,7vw,38px)' : 'clamp(36px,4vw,52px)',
          fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.08,
          color: 'var(--text)', margin: '0 0 14px',
        }}>
          {title}
        </h1>

        {subtitle && (
          <p style={{
            fontSize: mobile ? 16 : 19, lineHeight: 1.55, color: 'var(--muted)',
            letterSpacing: '-0.02em', margin: '0 0 18px',
          }}>
            {subtitle}
          </p>
        )}

        {meta && (
          <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 32, letterSpacing: '-0.01em' }}>
            {meta}
          </div>
        )}

        <div style={{ height: '0.5px', background: 'var(--sep)', margin: '0 0 32px' }} />

        <article style={{ fontSize: mobile ? 16 : 17, lineHeight: 1.7, color: 'var(--text)', letterSpacing: '-0.011em' }}>
          {children}
        </article>

        {footer && (
          <>
            <div style={{ height: '0.5px', background: 'var(--sep)', margin: '48px 0 24px' }} />
            <div style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: '-0.01em' }}>
              {footer}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Renders an array of { h, p } sections with consistent typography */
export function ArticleSections({ sections }) {
  return (
    <>
      {sections.map((s, i) => (
        <section key={i} style={{ marginBottom: 28 }}>
          {s.h && (
            <h2 style={{
              fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em',
              color: 'var(--text)', margin: '32px 0 12px',
            }}>
              {s.h}
            </h2>
          )}
          {s.p.split('\n\n').map((para, j) => (
            <p key={j} style={{ margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>
              {renderParagraph(para)}
            </p>
          ))}
        </section>
      ))}
    </>
  );
}

// Lightweight inline-bold parser: **text** → <strong>text</strong>
function renderParagraph(s) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 600, color: 'var(--text)' }}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}
