import { MODELS, ORG_CONFIG } from '../models-data.js';
import { MODEL_CONTENT } from '../content/models.js';
import ArticleLayout, { ArticleSections } from '../components/ArticleLayout.jsx';
import { useDark } from '../hooks/useTheme.js';

function findModel(slug, liveModels) {
  const list = liveModels?.length ? liveModels : MODELS;
  return list.find(m => m.slug === slug)
      || MODELS.find(m => m.slug === slug);
}

function priceLabel(model) {
  if (model.priceIn == null) return 'Pricing unavailable';
  return `$${model.priceIn.toFixed(2)} / $${model.priceOut?.toFixed(2) ?? '—'} per 1M tokens (in / out)`;
}

export default function ModelPage({ slug, onNavigate, liveModels }) {
  const dark    = useDark();
  const model   = findModel(slug, liveModels);
  const content = MODEL_CONTENT[slug];

  // If we don't have written content for this model, redirect to leaderboard
  if (!content) {
    return (
      <ArticleLayout
        eyebrow="Model spotlight"
        title="Model profile coming soon"
        subtitle="We're working on a long-form profile for this model. In the meantime, see its current ranking on the leaderboard."
        footer={<button onClick={() => onNavigate('leaderboard')} style={ctaBtn}>View leaderboard →</button>}
      >
        <p>If you have a specific question about <strong>{slug}</strong>, see the <a href="#methodology" onClick={e => { e.preventDefault(); onNavigate('methodology'); }} style={link}>methodology page</a> for how we rank models, or browse the full <a href="#leaderboard" onClick={e => { e.preventDefault(); onNavigate('leaderboard'); }} style={link}>leaderboard</a> to compare.</p>
      </ArticleLayout>
    );
  }

  const org    = ORG_CONFIG[model?.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
  const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;

  return (
    <ArticleLayout
      eyebrow="Model spotlight"
      title={content.headline}
      subtitle={content.tagline}
      meta={
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: org.color }}>
              {model?.initials ?? '—'}
            </div>
            <span>{model?.name ?? slug}</span>
          </div>
          <span style={sep}>·</span>
          <span>{model?.org ?? 'Unknown'}</span>
          {model?.elo && (<>
            <span style={sep}>·</span>
            <span>ELO {model.elo}</span>
          </>)}
          {model?.license && (<>
            <span style={sep}>·</span>
            <span>{model.license}</span>
          </>)}
          {model?.priceIn != null && (<>
            <span style={sep}>·</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{priceLabel(model)}</span>
          </>)}
        </div>
      }
      footer={
        <>
          <p>Want to see how {model?.name ?? 'this model'} compares to the rest of the field? Browse the full <a href="#leaderboard" onClick={e => { e.preventDefault(); onNavigate('leaderboard'); }} style={link}>arena leaderboard</a>, or read about <a href="#methodology" onClick={e => { e.preventDefault(); onNavigate('methodology'); }} style={link}>how we rank models</a>.</p>
          <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted2)' }}>
            All commentary above is editorial analysis based on public arena data, model documentation, and observed behavior. Pricing and ELO figures are sourced from arena.ai and OpenRouter and refresh automatically.
          </p>
        </>
      }
    >
      <ArticleSections sections={content.sections} />
    </ArticleLayout>
  );
}

const link    = { color: '#FF3B30', textDecoration: 'none', fontWeight: 500 };
const sep     = { color: 'var(--muted2)' };
const ctaBtn  = {
  height: 40, paddingInline: 18, borderRadius: 980,
  background: 'var(--text)', color: 'var(--bg)',
  fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
};
