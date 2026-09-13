import { MODELS, ORG_CONFIG } from '../models-data.js';
import { LAB_CONTENT } from '../content/labs.js';
import ArticleLayout, { ArticleSections } from '../components/ArticleLayout.jsx';
import { BarPanel } from '../components/Highlights.jsx';
import { isNum } from '../../shared/metrics.js';

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
              <div style={{ marginBottom: 24 }}>
                <BarPanel title={`Top ${orgName} models`} subtitle="Arena ELO · arena.ai" color={orgCfg.color === '#FFFFFF' ? 'var(--text)' : orgCfg.color} limit={labModels.length}
                  items={labModels.filter(m => isNum(m.elo)).map(m => ({ id: m.slug, name: m.name, org: orgName, value: m.elo, label: String(m.elo), slug: m.slug }))}
                  onSelect={it => onNavigate({ type: 'model', slug: it.slug })} />
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
const ctaBtn = {
  height: 40, paddingInline: 18, borderRadius: 980,
  background: 'var(--text)', color: 'var(--bg)',
  fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
};
