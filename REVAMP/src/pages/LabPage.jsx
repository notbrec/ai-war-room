import { MODELS, ORG_CONFIG } from '../models-data.js';
import { LAB_CONTENT } from '../content/labs.js';
import ArticleLayout, { ArticleSections } from '../components/ArticleLayout.jsx';

const ORG_BY_SLUG = {
  'anthropic': 'Anthropic',
  'openai':    'OpenAI',
  'google':    'Google',
  'xai':       'xAI',
  'meta':      'Meta',
  'deepseek':  'DeepSeek',
};

export default function LabPage({ slug, onNavigate, liveModels }) {
  const lab = LAB_CONTENT[slug];

  if (!lab) {
    return (
      <ArticleLayout
        eyebrow="Lab profile"
        title="Lab profile coming soon"
        subtitle="We're working on a long-form profile for this organization."
        footer={<button onClick={() => onNavigate('leaderboard')} style={ctaBtn}>View leaderboard →</button>}
      >
        <p>In the meantime, see the <a href="#leaderboard" onClick={e => { e.preventDefault(); onNavigate('leaderboard'); }} style={link}>full leaderboard</a> for current rankings across all labs.</p>
      </ArticleLayout>
    );
  }

  const orgName = ORG_BY_SLUG[slug] ?? lab.name;
  const list    = liveModels?.length ? liveModels : MODELS;
  const labModels = list.filter(m => m.org === orgName).slice(0, 8);
  const orgCfg  = ORG_CONFIG[orgName] ?? { color: '#8E8E93' };

  return (
    <ArticleLayout
      eyebrow="Lab profile"
      title={lab.name}
      subtitle={lab.headline}
      meta={
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ color: orgCfg.color, fontWeight: 600 }}>{lab.name}</span>
          <span style={sep}>·</span>
          <span>Founded {lab.founded}</span>
          <span style={sep}>·</span>
          <span>{lab.headquarters}</span>
          {labModels.length > 0 && (<>
            <span style={sep}>·</span>
            <span>{labModels.length}+ models on the leaderboard</span>
          </>)}
        </div>
      }
      footer={
        <>
          {labModels.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', margin: '0 0 12px' }}>
                Top {orgName} models on the leaderboard
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {labModels.map(m => (
                  <button key={m.slug} onClick={() => onNavigate({ type: 'model', slug: m.slug })} style={modelRow}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em' }}>
                      {m.name}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                      ELO {m.elo}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          <p>See the <a href="#leaderboard" onClick={e => { e.preventDefault(); onNavigate('leaderboard'); }} style={link}>full arena leaderboard</a> for all current rankings across every lab.</p>
        </>
      }
    >
      <ArticleSections sections={lab.sections} />
    </ArticleLayout>
  );
}

const link = { color: '#CD5C4E', textDecoration: 'none', fontWeight: 500 };
const sep  = { color: 'var(--muted2)' };
const modelRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 14px', borderRadius: 10, border: '0.5px solid var(--sep)',
  background: 'var(--card)', cursor: 'pointer',
  fontFamily: 'inherit', textAlign: 'left', width: '100%',
};
const ctaBtn = {
  height: 40, paddingInline: 18, borderRadius: 980,
  background: 'var(--text)', color: 'var(--bg)',
  fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
};
