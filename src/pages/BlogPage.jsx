import { BLOG_POSTS } from '../content/blog.js';
import ArticleLayout, { ArticleSections } from '../components/ArticleLayout.jsx';
import { useMobile } from '../hooks/useTheme.js';
import { SF, MONO, EASE, Reveal, Eyebrow, GlobalMotion } from '../components/design.jsx';

export function BlogIndexPage({ onNavigate }) {
  const mobile = useMobile();

  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh' }}>
      <GlobalMotion />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: mobile ? '40px 18px 96px' : '72px 24px 112px' }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header style={{ marginBottom: 48 }}>
          <div style={{ opacity: 0, animation: `aiwar-fade-up 700ms ${EASE} both` }}>
            <Eyebrow>Analysis</Eyebrow>
          </div>
          <h1 style={{
            fontSize: mobile ? 'clamp(36px,9vw,48px)' : 'clamp(52px,5.8vw,76px)',
            fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.98,
            color: 'var(--text)', margin: '10px 0 18px',
            opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 80ms both`,
          }}>
            The Blog.
          </h1>
          <p style={{
            fontSize: mobile ? 17 : 21, lineHeight: 1.45,
            color: 'var(--muted)', letterSpacing: '-0.02em',
            margin: 0,
            opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 160ms both`,
          }}>
            Deep-dives on the models, labs, and trends shaping the AI race.
            No press releases, no benchmark laundering — just what the numbers actually mean.
          </p>
        </header>

        <div style={{ height: '0.5px', background: 'var(--sep)', marginBottom: 8 }} />

        {/* ── Post list ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {BLOG_POSTS.map((post, i) => (
            <Reveal key={post.slug} delay={i * 80}>
              <div style={{ borderBottom: i < BLOG_POSTS.length - 1 ? '0.5px solid var(--sep)' : 'none' }}>
                <button
                  onClick={() => onNavigate({ type: 'blog-post', slug: post.slug })}
                  className="aiwar-press-btn"
                  style={{
                    display: 'block', textAlign: 'left', width: '100%',
                    padding: '32px 0', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <div style={{
                    fontSize: 12, color: 'var(--muted2)', marginBottom: 12,
                    letterSpacing: '-0.005em', fontFamily: MONO,
                  }}>
                    {fmtDate(post.publishedAt)} · {post.readingMinutes} min read
                  </div>
                  <h2 style={{
                    fontSize: mobile ? 24 : 30, fontWeight: 700,
                    letterSpacing: '-0.038em', color: 'var(--text)',
                    margin: '0 0 10px', lineHeight: 1.15,
                  }}>
                    {post.title}
                  </h2>
                  <p style={{
                    fontSize: mobile ? 15.5 : 16.5, color: 'var(--muted)',
                    lineHeight: 1.55, letterSpacing: '-0.015em',
                    margin: '0 0 14px', opacity: 0.88,
                  }}>
                    {post.subtitle}
                  </p>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 600, color: 'var(--text)',
                    letterSpacing: '-0.01em',
                  }}>
                    Read article
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BlogPostPage({ slug, onNavigate }) {
  const post = BLOG_POSTS.find(p => p.slug === slug);

  if (!post) {
    return (
      <ArticleLayout
        eyebrow="Blog"
        title="Post not found"
        subtitle="This post may have been moved or removed."
        footer={<button onClick={() => onNavigate('blog')} className="aiwar-press-btn" style={ctaBtn}>← Back to blog</button>}
      >
        <p>Browse the <a href="#/blog" onClick={e => { e.preventDefault(); onNavigate('blog'); }} style={link}>full blog index</a> to find what you're looking for.</p>
      </ArticleLayout>
    );
  }

  return (
    <ArticleLayout
      eyebrow="Blog"
      title={post.title}
      subtitle={post.subtitle}
      meta={
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>{fmtDate(post.publishedAt)}</span>
          <span style={{ color: 'var(--muted2)' }}>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
      }
      footer={<button onClick={() => onNavigate('blog')} className="aiwar-press-btn" style={ctaBtn}>← Back to blog</button>}
    >
      <ArticleSections sections={post.sections} />
    </ArticleLayout>
  );
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const link = { color: 'var(--text)', textDecoration: 'underline', fontWeight: 500 };
const ctaBtn = {
  height: 44, paddingInline: 20, borderRadius: 980,
  background: 'var(--text)', color: 'var(--bg)',
  fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
  letterSpacing: '-0.015em',
};
