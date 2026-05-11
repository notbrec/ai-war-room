import { BLOG_POSTS } from '../content/blog.js';
import ArticleLayout, { ArticleSections } from '../components/ArticleLayout.jsx';
import { useMobile } from '../hooks/useTheme.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";

export function BlogIndexPage({ onNavigate }) {
  const mobile = useMobile();
  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: mobile ? '32px 16px 64px' : '48px 24px 96px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#FF3B30', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
          AI War Room — analysis
        </div>
        <h1 style={{ fontSize: mobile ? 'clamp(32px,7vw,42px)' : 'clamp(40px,4vw,52px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--text)', margin: '0 0 14px' }}>
          The Blog
        </h1>
        <p style={{ fontSize: mobile ? 16 : 19, lineHeight: 1.55, color: 'var(--muted)', letterSpacing: '-0.02em', margin: '0 0 36px' }}>
          Deep-dives on the models, labs, and trends shaping the AI race. No press releases, no benchmarks-laundering — just what the numbers actually mean.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {BLOG_POSTS.map((post, i) => (
            <div key={post.slug}>
              <button
                onClick={() => onNavigate({ type: 'blog-post', slug: post.slug })}
                style={{
                  display: 'block', textAlign: 'left', width: '100%',
                  padding: '24px 0', background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 6, letterSpacing: '-0.01em' }}>
                  {fmtDate(post.publishedAt)} · {post.readingMinutes} min read
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.25 }}>
                  {post.title}
                </h2>
                <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.55, letterSpacing: '-0.015em', margin: 0 }}>
                  {post.subtitle}
                </p>
              </button>
              {i < BLOG_POSTS.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)' }} />}
            </div>
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
        footer={<button onClick={() => onNavigate('blog')} style={ctaBtn}>← Back to blog</button>}
      >
        <p>Browse the <a href="#blog" onClick={e => { e.preventDefault(); onNavigate('blog'); }} style={link}>full blog index</a> to find what you're looking for.</p>
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
      footer={<button onClick={() => onNavigate('blog')} style={ctaBtn}>← Back to blog</button>}
    >
      <ArticleSections sections={post.sections} />
    </ArticleLayout>
  );
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const link = { color: '#FF3B30', textDecoration: 'none', fontWeight: 500 };
const ctaBtn = {
  height: 40, paddingInline: 18, borderRadius: 980,
  background: 'var(--text)', color: 'var(--bg)',
  fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
};
