// ─── MODEL PROFILE — one model, every signal ────────────────────────────────
// Resolves by arena slug, canonical id or legacy slug. Editorial long-form
// content (content/models.js) stays as the Overview when it exists.

import { useMemo, useState, lazy, Suspense } from 'react';
import { MODELS, ORG_CONFIG, getDescription } from '../models-data.js';
import { MODEL_CONTENT } from '../content/models.js';
import { ArticleSections } from '../components/ArticleLayout.jsx';
import { useDark, useMobile } from '../hooks/useTheme.js';
import { MONO, GlobalMotion, Skeleton, ComparisonBar, EASE } from '../components/design.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import DataTable, { NaCell } from '../components/table/DataTable.jsx';
import { BarPanel } from '../components/Highlights.jsx';
import { useLLMs, useProviders, useHistory, useCoding } from '../data/useDomain.js';
import { fromLegacy } from '../domains/models/columns.jsx';
import { PageFrame, PageTitle, DataStatus, Panel, Label, Btn, StatTile, BadgeTag, SourceTag, Segmented, EmptyState, eloColor, eloTier, Delta, GREEN, GOLD, BLUE, PURPLE, RED } from '../components/ui.jsx';
import { fmtMetric, fmtDate, isNum, NA, SOURCES } from '../../shared/metrics.js';
import { series } from '../../shared/history.js';
import { AddToBattle } from '../domains/comparison/BattleControls.jsx';
import { DESIGN_CATEGORY_LABEL } from '../domains/benchmarks/registry.js';

const TrendChart = lazy(() => import('../components/charts/TrendChart.jsx'));

const SECTIONS = ['Overview', 'Performance', 'Benchmarks', 'Pricing', 'Providers', 'History', 'Capabilities', 'Related'];

function findModel(slug, models, liveModels) {
  if (!slug) return null;
  const hit = models.find(m => m.slug === slug || m.id === slug || m.id === `legacy:${slug}`);
  if (hit) return hit;
  const legacy = (liveModels?.length ? liveModels : MODELS).find(m => m.slug === slug);
  return legacy ? fromLegacy(legacy) : null;
}

const link = { color: '#CD5C4E', textDecoration: 'none', fontWeight: 500 };

const SWE_COLS = [
  { key: 'agent', label: 'Agent / harness', sticky: true, width: 230, value: r => r.agent, render: r => <span><span style={{ fontWeight: 600, color: 'var(--text)' }}>{r.agent}</span><span style={{ color: 'var(--muted)', fontFamily: MONO, fontSize: 10.5, marginLeft: 6 }}>{r.board}</span></span> },
  { key: 'resolved', label: 'Resolved', short: '% solved', metricKey: 'resolved', numeric: true, width: 132, bar: true, barColor: GREEN, barWidth: 44, valueWidth: 48, value: r => r.resolved, render: r => <span style={{ fontWeight: 700 }}>{fmtMetric('resolved', r.resolved)}</span> },
  { key: 'costPerTask', label: 'Cost per task', short: '$/task', metricKey: 'costPerTask', numeric: true, width: 84, value: r => r.costPerTask, render: r => isNum(r.costPerTask) ? fmtMetric('costPerTask', r.costPerTask) : <NaCell /> },
  { key: 'date', label: 'Submitted', width: 104, value: r => r.date, defaultDir: 'desc', render: r => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--muted)' }}>{fmtDate(r.date)}</span> },
];

export default function ModelPage({ slug, onNavigate, liveModels }) {
  const dark = useDark();
  const mobile = useMobile();
  const llms = useLLMs();
  const prov = useProviders();
  const hist = useHistory();
  const coding = useCoding();
  const [section, setSection] = useState('Overview');
  const [sweSort, setSweSort] = useState({ key: 'resolved', dir: 'desc' });
  const [provSort, setProvSort] = useState({ key: 'priceBlended', dir: 'asc' });

  const model = useMemo(() => findModel(slug, llms.models, liveModels), [slug, llms.models, liveModels]);
  const content = MODEL_CONTENT[slug] ?? (model ? MODEL_CONTENT[model.slug] : null);
  const loading = llms.loading && !llms.models.length && !model;

  const related = useMemo(() => {
    if (!model) return { family: [], lab: [] };
    const family = llms.models.filter(m => m.family === model.family && m.org === model.org && m.id !== model.id).slice(0, 8);
    const lab = llms.models.filter(m => m.org === model.org && m.inArena && m.id !== model.id && m.family !== model.family).slice(0, 6);
    return { family, lab };
  }, [model, llms.models]);
  const providers = model ? prov.models.find(p => p.modelId === model.id) : null;
  const sweRuns = useMemo(() => model ? Object.values(coding.boards ?? {}).flat().filter(r => r.linkedModelId === model.id).sort((a, b) => b.resolved - a.resolved).slice(0, 8) : [], [coding.boards, model]);
  const eloSeries = useMemo(() => model ? series(hist.snapshots, model.id, 'elo') : [], [hist.snapshots, model]);
  const rankSeries = useMemo(() => model ? series(hist.snapshots, model.id, 'rank') : [], [hist.snapshots, model]);
  const priceSeries = useMemo(() => model ? series(hist.snapshots, model.id, 'priceIn') : [], [hist.snapshots, model]);
  const provCols = useMemo(() => {
    const W = providers?.winners ?? {};
    return [
      { key: 'provider', label: 'Provider', sticky: true, width: mobile ? 170 : 230, value: e => e.provider, render: e => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><span style={{ fontWeight: 600, color: 'var(--text)' }}>{e.provider}</span>{W.cheapest === e.tag && <BadgeTag color={GOLD}>Cheapest</BadgeTag>}{W.bestValue === e.tag && W.bestValue !== W.cheapest && <BadgeTag color={BLUE}>Best value</BadgeTag>}</span> },
      { key: 'quantization', label: 'Quantisation', short: 'Quant', width: 70, value: e => e.quantization, render: e => e.quantization ? <span style={{ fontFamily: MONO, fontSize: 11, color: /int4|fp4/.test(e.quantization) ? GOLD : 'var(--text)' }}>{e.quantization}</span> : <span style={{ color: 'var(--muted2)', fontSize: 11 }}>full</span> },
      { key: 'contextLength', label: 'Context', short: 'Ctx', metricKey: 'context', numeric: true, width: 70, value: e => e.contextLength, render: e => fmtMetric('context', e.contextLength) },
      { key: 'priceIn', label: 'Input price', short: 'In $/M', metricKey: 'priceIn', numeric: true, width: 76, value: e => e.priceIn, render: e => fmtMetric('priceIn', e.priceIn) },
      { key: 'priceOut', label: 'Output price', short: 'Out $/M', metricKey: 'priceOut', numeric: true, width: 76, value: e => e.priceOut, render: e => fmtMetric('priceOut', e.priceOut) },
      { key: 'priceBlended', label: 'Blended price', short: 'Blend', metricKey: 'priceBlended', numeric: true, width: 124, bar: true, barColor: GOLD, barWidth: 40, valueWidth: 52, value: e => e.priceBlended, render: e => <span style={{ fontWeight: 700 }}>{fmtMetric('priceBlended', e.priceBlended)}</span> },
      { key: 'uptime30m', label: 'Uptime (30 min)', short: 'Uptime', metricKey: 'uptime', numeric: true, width: 76, value: e => e.uptime30m, render: e => isNum(e.uptime30m) ? fmtMetric('uptime', e.uptime30m) : <NaCell /> },
    ];
  }, [providers, mobile]);

  if (loading) return <PageFrame mobile={mobile}><Skeleton height={60} width="40%" style={{ marginBottom: 20 }} /><Skeleton height={300} /></PageFrame>;
  if (!model) {
    return (
      <PageFrame mobile={mobile}>
        <EmptyState title="Model not found" body={<>No model matches <code style={{ fontFamily: MONO }}>{slug}</code> in the live dataset. It may have been renamed or retired upstream.</>} action={<Btn small solid onClick={() => onNavigate('leaderboard')}>Open the rankings →</Btn>} />
      </PageFrame>
    );
  }

  const org = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
  const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;
  const elo = model.arena?.elo;
  const desc = getDescription(model.name);
  const type = model.modalities ? (model.modalities.in.includes('image') ? 'Multimodal LLM' : 'Text LLM') : 'LLM';
  const status = model.arena ? (model.arena.isNew ? 'New on the arena' : 'Active on the arena') : 'Not on the arena board';

  return (
    <PageFrame mobile={mobile}>
      <GlobalMotion />
      {/* Header */}
      <header style={{ marginBottom: mobile ? 20 : 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0, animation: `aiwar-fade-up 600ms ${EASE} both` }}>
          <button onClick={() => onNavigate('leaderboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', padding: 0 }}>← LLM RANKINGS</button>
          <span style={{ color: 'var(--muted2)' }}>·</span>
          <button onClick={() => onNavigate({ type: 'lab', slug: model.org.toLowerCase().replace(/[^a-z0-9]+/g, '-') })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', padding: 0 }}>{model.org.toUpperCase()}</button>
        </div>
        <div style={{ display: 'flex', gap: mobile ? 12 : 18, alignItems: 'flex-start', flexWrap: 'wrap', opacity: 0, animation: `aiwar-fade-up 700ms ${EASE} 80ms both` }}>
          <div style={{ width: mobile ? 52 : 68, height: mobile ? 52 : 68, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><LabLogo org={model.org} size={mobile ? 28 : 36} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: mobile ? 'clamp(26px,7vw,36px)' : 'clamp(34px,4vw,52px)', fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1.0, color: 'var(--text)', margin: '0 0 8px', overflowWrap: 'anywhere' }}>{model.name}</h1>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{model.org}</span>
              <span>·</span><span>{type}</span>
              <span>·</span><span>Released {fmtDate(model.releaseDate)}</span>
              <BadgeTag color={model.isOpen ? GREEN : 'var(--muted)'}>{model.isOpen ? 'Open weights' : 'Proprietary'}</BadgeTag>
              {model.isThinking && <BadgeTag color={PURPLE}>Reasoning{model.reasoningLevel && model.reasoningLevel !== 'thinking' ? ` · ${model.reasoningLevel}` : ''}</BadgeTag>}
              <BadgeTag color={model.arena ? GREEN : GOLD}>{status}</BadgeTag>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <AddToBattle item={{ id: model.id, kind: 'llm', name: model.name, org: model.org }} small={false} label="Add to battle" />
            {model.or && <Btn small onClick={() => onNavigate({ type: 'providers', slug: model.id })}>Providers</Btn>}
          </div>
        </div>
        <div style={{ marginTop: 14, opacity: 0, animation: `aiwar-fade-up 700ms ${EASE} 160ms both` }}>
          <DataStatus status={llms.status} fetchedAt={llms.data?.fetchedAt} sources={model.sources} loading={llms.loading} compact />
        </div>
      </header>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', gap: 8, marginBottom: 20 }}>
        <StatTile label="Arena ELO" metricKey="elo" value={isNum(elo) ? elo : NA} color={eloColor(elo)} sub={isNum(elo) ? `#${model.arena.rank} · ±${model.arena.ci ?? '—'} · tier ${eloTier(elo)}` : 'not ranked'} delta={<Delta value={model.history?.rankDelta7d} />} trend={eloSeries.map(p => p.value)} />
        <StatTile label="Intelligence" metricKey="intelligence" value={fmtMetric('intelligence', model.aa?.intelligence)} sub={isNum(model.aa?.codingIndex) ? `code ${fmtMetric('codingIndex', model.aa.codingIndex)} · agent ${fmtMetric('agenticIndex', model.aa.agenticIndex)}` : undefined} color={BLUE} />
        <StatTile label="Speed" metricKey="speed" value={fmtMetric('speed', model.aa?.speed)} sub={isNum(model.aa?.speed) ? 'tokens / s' : 'source not configured'} color={PURPLE} />
        <StatTile label="Latency" metricKey="ttft" value={fmtMetric('ttft', model.aa?.ttft)} sub={isNum(model.aa?.ttft) ? 'to first token' : 'source not configured'} color={PURPLE} />
        <StatTile label="Price" metricKey="priceBlended" value={fmtMetric('priceBlended', model.priceBlended)} sub={isNum(model.priceIn) ? `${fmtMetric('priceIn', model.priceIn)} in · ${fmtMetric('priceOut', model.priceOut)} out` : 'no listed price'} color={GOLD} />
        <StatTile label="Context" metricKey="context" value={model.contextLabel ?? NA} sub={isNum(model.maxOutput) ? `max out ${fmtMetric('maxOutput', model.maxOutput)}` : undefined} />
      </div>

      <div style={{ marginBottom: 16, overflowX: 'auto' }}><Segmented small value={section} onChange={setSection} options={SECTIONS.map(s => ({ value: s, label: s }))} /></div>

      {section === 'Overview' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {content ? (
            <Panel>
              <Label style={{ display: 'block', marginBottom: 8 }}>Analyst profile</Label>
              <h2 style={{ fontSize: mobile ? 22 : 28, fontWeight: 700, letterSpacing: '-0.035em', color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.1 }}>{content.headline}</h2>
              <p style={{ fontSize: 15, color: 'var(--muted)', margin: '0 0 8px', lineHeight: 1.5 }}>{content.tagline}</p>
              <div style={{ fontSize: mobile ? 15.5 : 16.5, lineHeight: 1.7, color: 'var(--text)', letterSpacing: '-0.011em' }}><ArticleSections sections={content.sections} /></div>
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted2)' }}>Editorial analysis based on public arena data, model documentation and observed behaviour. Figures on this page refresh automatically from the sources listed.</p>
            </Panel>
          ) : (
            <Panel title="About">
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text)', margin: 0, opacity: 0.9 }}>{desc ?? `${model.name} is a ${model.org} model.${model.arena ? ` It holds arena ELO ${elo} (rank #${model.arena.rank}) from ${fmtMetric('votes', model.arena.votes)} human battles.` : ''}${isNum(model.aa?.intelligence) ? ` Intelligence Index ${fmtMetric('intelligence', model.aa.intelligence)}.` : ''} No long-form profile has been written for it yet — see the <a href="#methodology" onClick={e => { e.preventDefault(); onNavigate('methodology'); }} style={link}>methodology</a> for how these numbers are produced.`}</p>
            </Panel>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <Panel title="Arena standing" action={<SourceTag id="arena" />}>
              {model.arena ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <ComparisonBar label="ELO vs board leader" valueText={`${elo} / ${llms.models[0]?.arena?.elo ?? '—'}`} width={Math.max(0.05, (elo - 1280) / Math.max(1, (llms.models[0]?.arena?.elo ?? 1500) - 1280))} color={eloColor(elo)} />
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
                    <span>Rank <b style={{ color: 'var(--text)' }}>#{model.arena.rank}</b></span>
                    <span>Votes <b style={{ color: 'var(--text)' }}>{fmtMetric('votes', model.arena.votes)}</b></span>
                    <span>7d <Delta value={model.history?.rankDelta7d} placeholder={model.history ? '=' : NA} /></span>
                    <span>30d <Delta value={model.history?.rankDelta30d} placeholder={model.history ? '=' : NA} /></span>
                    {model.arenas?.vision && <span>Vision ELO <b style={{ color: 'var(--text)' }}>{model.arenas.vision.elo}</b> (#{model.arenas.vision.rank})</span>}
                    {model.arenas?.search && <span>Search ELO <b style={{ color: 'var(--text)' }}>{model.arenas.search.elo}</b> (#{model.arenas.search.rank})</span>}
                  </div>
                </div>
              ) : <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>This model is not on the arena text board; it is ranked here on its Intelligence Index only.</p>}
            </Panel>
            <Panel title="Identity">
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', fontSize: 12.5 }}>
                <Label>Family</Label><span style={{ fontFamily: MONO, color: 'var(--text)' }}>{model.family}{model.variant ? <span style={{ color: 'var(--muted)' }}> · variant {model.variant}</span> : null}</span>
                <Label>Licence</Label><span style={{ color: model.isOpen ? GREEN : 'var(--text)' }}>{model.license ?? NA}</span>
                <Label>Released</Label><span>{fmtDate(model.releaseDate)}</span>
                <Label>Knowledge cutoff</Label><span>{model.or?.knowledgeCutoff ?? NA}</span>
                <Label>Canonical id</Label><span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--muted)' }}>{model.id}</span>
                {model.or?.id && <><Label>OpenRouter</Label><a href={`https://openrouter.ai/${model.or.id}`} target="_blank" rel="noreferrer noopener" style={{ ...link, fontFamily: MONO, fontSize: 11 }}>{model.or.id} ↗</a></>}
                {model.arena?.url && <><Label>Model card</Label><a href={model.arena.url} target="_blank" rel="noreferrer noopener" style={{ ...link, fontSize: 11, overflowWrap: 'anywhere' }}>{model.arena.url.replace(/^https?:\/\//, '').slice(0, 60)} ↗</a></>}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {section === 'Performance' && (
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <Panel title="Throughput & latency" action={<SourceTag id="aa" />}>
            {isNum(model.aa?.speed) || isNum(model.aa?.ttft) ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {[['speed', model.aa.speed], ['ttft', model.aa.ttft], ['e2e', model.aa.e2e]].map(([k, v]) => <StatTile key={k} label={fmtLabel(k)} metricKey={k} value={fmtMetric(k, v)} />)}
              </div>
            ) : <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0, lineHeight: 1.55 }}>Output speed, time to first token and end-to-end time are measurements from Artificial Analysis. They appear here once <code style={{ fontFamily: MONO, fontSize: 11 }}>ARTIFICIAL_ANALYSIS_API_KEY</code> is configured — never estimated.</p>}
          </Panel>
          <Panel title="Where it sits" action={<Btn small onClick={() => onNavigate('race')}>Speed Race →</Btn>}>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.55 }}>Position among arena-ranked models on the axes we have data for.</p>
            {[['elo', m => m.arena?.elo, true], ['intelligence', m => m.aa?.intelligence, true], ['priceBlended', m => m.priceBlended, false], ['context', m => m.context, true]].map(([k, get, higher]) => {
              const v = get(model); if (!isNum(v)) return null;
              const all = llms.models.map(get).filter(isNum);
              const better = all.filter(x => higher ? x > v : x < v).length;
              const pct = all.length ? 1 - better / all.length : 0;
              return <ComparisonBar key={k} label={`${fmtLabel(k)} · top ${Math.max(1, Math.round((1 - pct) * 100))}%`} valueText={fmtMetric(k, v)} width={pct} color={k === 'elo' ? eloColor(v) : 'var(--text)'} />;
            })}
          </Panel>
        </div>
      )}

      {section === 'Benchmarks' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <Panel title="Composite indexes" action={<SourceTag id="aa" />}>
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 8 }}>
              {[['intelligence', model.aa?.intelligence], ['codingIndex', model.aa?.codingIndex], ['agenticIndex', model.aa?.agenticIndex], ['mathIndex', model.aa?.mathIndex]].map(([k, v]) => <StatTile key={k} label={k === 'mathIndex' ? 'Math Index' : fmtLabel(k)} metricKey={k === 'mathIndex' ? undefined : k} value={isNum(v) ? v.toFixed(1) : NA} />)}
            </div>
            {model.aa?.via === 'openrouter' && <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 8 }}>Indexes © Artificial Analysis, relayed via OpenRouter's public catalogue. Per-benchmark scores need the AA Data API.</p>}
          </Panel>
          {model.aa?.benchmarks && Object.keys(model.aa.benchmarks).length > 0 && (
            <Panel title="Individual evaluations" action={<SourceTag id="aa" />}>
              <BarPanel flat wide mobile={mobile} barColor={BLUE} baseline={0} limit={99} rank={false} gap={false}
                items={Object.entries(model.aa.benchmarks).filter(([, v]) => isNum(v)).map(([k, v]) => ({ id: k, name: k.replace(/_/g, ' '), value: v <= 1 ? v * 100 : v, label: v <= 1 ? `${(v * 100).toFixed(1)}%` : v.toFixed(1) })).sort((a, b) => b.value - a.value)}
                note="Scores as published by Artificial Analysis; different evaluations are not comparable with each other" />
            </Panel>
          )}
          {model.or?.designArena?.length > 0 && (
            <Panel title="Design Arena · human preference by category" action={<SourceTag id="designarena" />}>
              <BarPanel flat wide mobile={mobile} barColor={BLUE} limit={99} rank={false} gap={false}
                items={[...model.or.designArena].filter(d => isNum(d.elo)).sort((a, b) => b.elo - a.elo).map(d => ({ id: `${d.arena}:${d.category}`, name: `${DESIGN_CATEGORY_LABEL[d.category] ?? d.category} · ${d.arena}`, value: d.elo, label: String(Math.round(d.elo)), tag: d.rank ? <BadgeTag color="var(--muted)">#{d.rank}</BadgeTag> : null }))}
                note="ELO per category; the badge is this model's rank within that category" />
            </Panel>
          )}
          {sweRuns.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}><Label color="var(--muted)">SWE-bench runs with this model</Label><Btn small onClick={() => onNavigate('coding')}>Code Ops →</Btn></div>
              <DataTable dense mobile={mobile} rows={sweRuns} rowKey={r => r.id} columns={SWE_COLS} visible={SWE_COLS.map(c => c.key)} sort={sweSort} onSort={setSweSort} onRowClick={() => onNavigate('coding')} footer={<span>Resolved = share of benchmark tasks whose tests pass after the agent's patch · SWE-bench</span>} />
            </div>
          )}
          {!model.aa && !model.or?.designArena?.length && !sweRuns.length && <EmptyState title="No benchmark scores from a permitted source" body="This model has an arena ELO only. Benchmarks arrive from Artificial Analysis, Design Arena (via OpenRouter) and SWE-bench when the model is covered there." />}
        </div>
      )}

      {section === 'Pricing' && (
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <Panel title="List price · $ per 1M tokens" action={model.priceSource && <SourceTag id={model.priceSource} />}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[['priceIn', model.priceIn], ['priceOut', model.priceOut], ['priceBlended', model.priceBlended], ['priceCacheRead', model.priceCacheRead], ['priceCacheWrite', model.priceCacheWrite]].map(([k, v]) => <StatTile key={k} label={fmtLabel(k)} metricKey={k} value={fmtMetric(k, v)} />)}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>Blended = (3 × input + output) ÷ 4. Cache prices apply where the provider supports prompt caching. Cost per task depends on the workload and is not estimated here.</p>
          </Panel>
          {isNum(model.priceBlended) ? (
            <BarPanel mobile={mobile} title="Blended price vs the top 20" color={GOLD} subtitle="$ per 1M tokens at 3:1 in:out · this model highlighted · OpenRouter" higherIsBetter={false} baseline={0} limit={21} emphasis={new Set([model.id])}
              items={[...llms.models.filter(m => m.inArena && isNum(m.priceBlended)).slice(0, 20), model].filter((m, i, a) => a.findIndex(x => x.id === m.id) === i).sort((a, b) => a.priceBlended - b.priceBlended).map(m => ({ id: m.id, name: m.name, org: m.org, value: m.priceBlended, label: fmtMetric('priceBlended', m.priceBlended), slug: m.slug }))}
              onSelect={it => { if (it.id !== model.id && it.slug) onNavigate({ type: 'model', slug: it.slug }); }} />
          ) : <Panel title="Blended price vs the top 20"><p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>No listed price for this model.</p></Panel>}
        </div>
      )}

      {section === 'Providers' && (
        providers ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}><Label color="var(--muted)">{providers.count} hosts on OpenRouter</Label><Btn small onClick={() => onNavigate({ type: 'providers', slug: model.id })}>Full provider view →</Btn></div>
            <DataTable dense mobile={mobile} rows={providers.endpoints} rowKey={e => e.tag ?? e.provider} columns={provCols} visible={provCols.map(c => c.key)} sort={provSort} onSort={setProvSort}
              footer={<span>Blended = (3 × input + output) ÷ 4 · cheapest and best-value hosts are tagged · list prices relayed by OpenRouter</span>} />
          </div>
        ) : <EmptyState title="No provider data" body={model.or ? 'Provider endpoints are tracked for the top of the board; this model is outside that window or the provider feed is still loading.' : 'This model is not listed on OpenRouter, so per-provider pricing is unavailable.'} />
      )}

      {section === 'History' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <Panel title="Arena ELO over time" action={<SourceTag id="internal" />}>
            <Suspense fallback={<Skeleton height={260} />}>
              <TrendChart series={[{ id: model.id, name: model.name, org: model.org, points: eloSeries }]} yKey="elo" height={260} emptyText={hist.data?.durable === false ? 'History snapshots are stored on the production deployment; none are available in this environment.' : `${hist.days} daily snapshot${hist.days === 1 ? '' : 's'} so far — a trend appears after the second day.`} />
            </Suspense>
          </Panel>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <Panel title="Rank over time"><Suspense fallback={<Skeleton height={200} />}><TrendChart series={[{ id: model.id, name: model.name, org: model.org, points: rankSeries }]} yKey="rank" height={200} invertY emptyText="Rank history appears after two snapshots." /></Suspense></Panel>
            <Panel title="Input price over time"><Suspense fallback={<Skeleton height={200} />}><TrendChart series={[{ id: model.id, name: model.name, org: model.org, points: priceSeries }]} yKey="priceIn" height={200} emptyText="Price history appears after two snapshots." /></Suspense></Panel>
          </div>
        </div>
      )}

      {section === 'Capabilities' && (
        <Panel title="Capabilities" action={model.or && <SourceTag id="openrouter" />}>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(2, 1fr)', gap: '8px 24px', fontSize: 12.5 }}>
            <Row k="Input modalities" v={model.modalities ? model.modalities.in.join(', ') : NA} />
            <Row k="Output modalities" v={model.modalities ? model.modalities.out.join(', ') : NA} />
            <Row k="Context window" v={model.contextLabel ?? NA} />
            <Row k="Max output" v={fmtMetric('maxOutput', model.maxOutput)} />
            <Row k="Reasoning" v={model.reasoningLevel && model.reasoningLevel !== 'none' ? `yes · ${model.reasoningLevel}` : model.supportsReasoning ? 'opt-in (reasoning parameter)' : model.supportsReasoning === false ? 'no' : NA} />
            <Row k="Tool calling" v={model.supportsTools == null ? NA : model.supportsTools ? 'yes' : 'no'} />
            <Row k="Open weights" v={model.isOpen ? `yes · ${model.license}` : 'no'} />
            <Row k="Hugging Face" v={model.or?.huggingFaceId ? <a href={`https://huggingface.co/${model.or.huggingFaceId}`} target="_blank" rel="noreferrer noopener" style={link}>{model.or.huggingFaceId} ↗</a> : NA} />
          </div>
        </Panel>
      )}

      {section === 'Related' && (
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <Panel title={`Same family · ${related.family.length} variant${related.family.length === 1 ? '' : 's'}`}>
            {related.family.length ? related.family.map(m => <RelatedRow key={m.id} m={m} onNavigate={onNavigate} />) : <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>No other reasoning-level or date variants of this family on the board.</p>}
          </Panel>
          <Panel title={`More from ${model.org}`}>
            {related.lab.length ? related.lab.map(m => <RelatedRow key={m.id} m={m} onNavigate={onNavigate} />) : <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>No other ranked models from this lab.</p>}
          </Panel>
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--muted2)', lineHeight: 1.55 }}>
        Sources on this page: {model.sources.map(s => SOURCES[s]?.name ?? s).join(', ')}. See the <a href="#methodology" onClick={e => { e.preventDefault(); onNavigate('methodology'); }} style={link}>methodology</a> for how each number is produced and refreshed.
      </p>
    </PageFrame>
  );
}

function fmtLabel(k) { return { elo: 'Arena ELO', intelligence: 'Intelligence', codingIndex: 'Coding Index', agenticIndex: 'Agentic Index', speed: 'Output speed', ttft: 'First token', e2e: 'End-to-end', priceIn: 'Input', priceOut: 'Output', priceBlended: 'Blended', priceCacheRead: 'Cached input', priceCacheWrite: 'Cache write', context: 'Context' }[k] ?? k; }
function Row({ k, v }) { return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderBottom: '0.5px solid var(--sep2)' }}><span style={{ color: 'var(--muted)' }}>{k}</span><span style={{ color: 'var(--text)', textAlign: 'right', fontFamily: MONO, fontSize: 12 }}>{v}</span></div>; }
function RelatedRow({ m, onNavigate }) {
  return (
    <button onClick={() => onNavigate({ type: 'model', slug: m.slug })} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', width: '100%', padding: '7px 0', background: 'none', border: 'none', borderBottom: '0.5px solid var(--sep2)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
      <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span><span style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: MONO }}>{m.variant ?? 'base'}{m.reasoningLevel ? ` · ${m.reasoningLevel}` : ''}{isNum(m.priceBlended) ? ` · ${fmtMetric('priceBlended', m.priceBlended)}` : ''}</span></span>
      <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted2)' }}>{m.arena ? `#${m.arena.rank}` : ''}</span>
      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: eloColor(m.arena?.elo) }}>{m.arena?.elo ?? NA}</span>
    </button>
  );
}
