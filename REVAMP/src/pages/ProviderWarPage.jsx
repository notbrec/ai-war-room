// ─── PROVIDER WAR — the same model, many hosts ──────────────────────────────
// Models and API providers are different entities. OpenRouter's public
// endpoint catalogue gives price, context, quantisation and uptime per host;
// throughput / latency / accuracy need a measurement source (Artificial
// Analysis) and stay N/A until one is configured.

import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useMobile } from '../hooks/useTheme.js';
import { MONO, GlobalMotion, Skeleton, SectionTitle } from '../components/design.jsx';
import { BarPanel, HighlightGrid } from '../components/Highlights.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { useProviders } from '../data/useDomain.js';
import DataTable, { useColumnSelection, ColumnPicker } from '../components/table/DataTable.jsx';
import { PageFrame, PageTitle, DataStatus, Panel, Label, Chip, Segmented, StatTile, EmptyState, BadgeTag, Btn, Unavailable, GREEN, GOLD, BLUE, PURPLE, RED } from '../components/ui.jsx';
import { fmtMetric, isNum, NA } from '../../shared/metrics.js';

const ScatterChart = lazy(() => import('../components/charts/ScatterChart.jsx'));

export default function ProviderWarPage({ onNavigate, slug }) {
  const mobile = useMobile();
  const prov = useProviders();
  const [modelId, setModelId] = useState(slug ?? null);
  const [view, setView] = useState('endpoints');
  const [chart, setChart] = useState('uptime-price');
  const [sort, setSort] = useState({ key: 'priceBlended', dir: 'asc' });
  const [query, setQuery] = useState('');

  const models = prov.models;
  useEffect(() => { if (!modelId && models.length) setModelId(models[0].modelId); }, [models, modelId]);
  useEffect(() => { if (slug) setModelId(slug); }, [slug]);
  const current = models.find(m => m.modelId === modelId) ?? null;
  const meta = current ? prov.modelMeta[current.modelId] : null;
  const rows = current?.endpoints ?? [];
  const q = query.trim().toLowerCase();
  const modelOptions = useMemo(() => models.map(m => ({ id: m.modelId, name: prov.modelMeta[m.modelId]?.name ?? m.modelId, org: prov.modelMeta[m.modelId]?.org, count: m.count, elo: prov.modelMeta[m.modelId]?.elo })).filter(m => !q || `${m.name} ${m.org}`.toLowerCase().includes(q)), [models, prov.modelMeta, q]);

  const W = current?.winners ?? {};
  const badge = e => (
    <span style={{ display: 'inline-flex', gap: 3, flexWrap: 'wrap' }}>
      {W.cheapest === e.tag && <BadgeTag color={GOLD}>Cheapest</BadgeTag>}
      {W.bestValue === e.tag && W.bestValue !== W.cheapest && <BadgeTag color={BLUE}>Best value</BadgeTag>}
      {W.bestUptime === e.tag && <BadgeTag color={GREEN}>Best uptime</BadgeTag>}
      {W.fastest === e.tag && <BadgeTag color={PURPLE}>Fastest</BadgeTag>}
      {W.lowestLatency === e.tag && <BadgeTag color={PURPLE}>Lowest latency</BadgeTag>}
    </span>
  );

  const columns = useMemo(() => [
    { key: 'provider', label: 'Provider', sticky: true, width: mobile ? 170 : 240, value: e => e.provider, render: e => (
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{e.provider}</div>
        <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: MONO }}>{e.tag}{e.quantization ? ` · ${e.quantization}` : ''}</div>
      </div>) },
    { key: 'flags', label: 'Wins', width: 150, sortable: false, render: badge },
    { key: 'priceIn', label: 'Input price', short: 'In $/M', metricKey: 'priceIn', numeric: true, width: 74, value: e => e.priceIn, render: e => fmtMetric('priceIn', e.priceIn) },
    { key: 'priceOut', label: 'Output price', short: 'Out $/M', metricKey: 'priceOut', numeric: true, width: 74, value: e => e.priceOut, render: e => fmtMetric('priceOut', e.priceOut) },
    { key: 'priceBlended', label: 'Blended price', short: 'Blend', metricKey: 'priceBlended', numeric: true, width: 124, bar: true, barColor: GOLD, barWidth: 40, valueWidth: 52, value: e => e.priceBlended, render: e => <span style={{ fontWeight: 700 }}>{fmtMetric('priceBlended', e.priceBlended)}</span> },
    { key: 'priceCacheRead', label: 'Cached input', short: 'Cache rd', metricKey: 'priceCacheRead', numeric: true, width: 74, default: false, value: e => e.priceCacheRead, render: e => fmtMetric('priceCacheRead', e.priceCacheRead) },
    { key: 'contextLength', label: 'Context', short: 'Ctx', metricKey: 'context', numeric: true, width: 62, value: e => e.contextLength, render: e => fmtMetric('context', e.contextLength) },
    { key: 'maxOutput', label: 'Max output', short: 'Max out', metricKey: 'maxOutput', numeric: true, width: 66, default: false, value: e => e.maxOutput, render: e => fmtMetric('maxOutput', e.maxOutput) },
    { key: 'quantization', label: 'Quantisation', short: 'Quant', width: 64, value: e => e.quantization, render: e => e.quantization ? <span style={{ fontFamily: MONO, fontSize: 11, color: /int4|fp4/.test(e.quantization) ? GOLD : 'var(--text)' }}>{e.quantization}</span> : <span style={{ color: 'var(--muted2)', fontSize: 11 }}>full</span> },
    { key: 'uptime30m', label: 'Uptime (30 min)', short: 'Up 30m', metricKey: 'uptime', numeric: true, width: 68, value: e => e.uptime30m, render: e => isNum(e.uptime30m) ? <span style={{ color: e.uptime30m >= 99.5 ? GREEN : e.uptime30m >= 97 ? GOLD : RED }}>{fmtMetric('uptime', e.uptime30m)}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'uptime1d', label: 'Uptime (24 h)', short: 'Up 24h', metricKey: 'uptime', numeric: true, width: 68, value: e => e.uptime1d, render: e => isNum(e.uptime1d) ? fmtMetric('uptime', e.uptime1d) : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'throughput', label: 'Output speed', short: 'Tok/s', metricKey: 'speed', numeric: true, width: 62, value: e => e.throughput, render: e => isNum(e.throughput) ? fmtMetric('speed', e.throughput) : <span style={{ color: 'var(--muted2)' }} title="Not exposed by the public endpoint API">{NA}</span> },
    { key: 'latencyMs', label: 'First-token latency', short: 'Latency', metricKey: 'ttft', numeric: true, width: 66, value: e => e.latencyMs, render: e => isNum(e.latencyMs) ? fmtMetric('ttft', e.latencyMs / 1000) : <span style={{ color: 'var(--muted2)' }} title="Not exposed by the public endpoint API">{NA}</span> },
    { key: 'caps', label: 'Capabilities', short: 'Caps', width: 110, default: false, sortable: false, render: e => <span style={{ display: 'inline-flex', gap: 3 }}>{e.supportsTools && <BadgeTag color={BLUE}>tools</BadgeTag>}{e.supportsReasoning && <BadgeTag color={PURPLE}>reasoning</BadgeTag>}{e.supportsCaching && <BadgeTag color={GREEN}>cache</BadgeTag>}</span> },
  ], [mobile, W]);
  const colSel = useColumnSelection('providers-v1', columns);

  const cheapest = rows.find(e => e.tag === W.cheapest);
  const priciest = [...rows].filter(e => isNum(e.priceBlended)).sort((a, b) => b.priceBlended - a.priceBlended)[0];
  const spread = cheapest && priciest && cheapest.priceBlended > 0 ? priciest.priceBlended / cheapest.priceBlended : null;
  const unpriced = rows.filter(e => !isNum(e.priceBlended)).length;

  const chartPoints = useMemo(() => {
    // Across every model: one point per endpoint
    const pts = [];
    for (const m of models) for (const e of m.endpoints) {
      const mm = prov.modelMeta[m.modelId];
      pts.push({ id: `${m.modelId}|${e.tag}`, name: `${e.provider} · ${mm?.name ?? m.modelId}`, org: mm?.org, x: e.priceBlended, y: chart === 'uptime-price' ? e.uptime30m : chart === 'speed-price' ? e.throughput : e.latencyMs, e });
    }
    return pts;
  }, [models, prov.modelMeta, chart]);

  const dirColumns = useMemo(() => [
    { key: 'provider', label: 'Provider', sticky: true, width: 200, value: p => p.provider, render: p => <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.provider}</span> },
    { key: 'models', label: 'Top models hosted', short: 'Models', numeric: true, width: 120, bar: true, barColor: BLUE, barWidth: 44, valueWidth: 30, value: p => p.models },
    { key: 'endpoints', label: 'Endpoints', numeric: true, width: 90, value: p => p.endpoints },
    { key: 'avgUptime', label: 'Avg uptime (30 min)', short: 'Avg uptime', metricKey: 'uptime', numeric: true, width: 130, bar: true, barColor: GREEN, barWidth: 40, valueWidth: 52, value: p => p.avgUptime, render: p => isNum(p.avgUptime) ? <span style={{ color: p.avgUptime >= 99.5 ? GREEN : p.avgUptime >= 97 ? GOLD : RED, fontWeight: 600 }}>{fmtMetric('uptime', p.avgUptime)}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
  ], []);
  const [dirSort, setDirSort] = useState({ key: 'models', dir: 'desc' });

  return (
    <PageFrame mobile={mobile}>
      <GlobalMotion />
      <PageTitle mobile={mobile} eyebrow="Provider War" title="Same model, many hosts." subtitle="The same weights can cost 3× more, offer a quarter of the context, or run quantised depending on who serves them. Pick a model and see who hosts it best."
        status={<DataStatus status={prov.status} fetchedAt={prov.data?.fetchedAt} sources={['openrouter']} loading={prov.loading} onRefresh={prov.reload} />} />

      {prov.loading && !models.length ? <Skeleton height={480} /> : !models.length ? (
        <EmptyState title="Provider data unavailable" body={prov.sources?.openrouter?.error ?? 'OpenRouter endpoint data could not be loaded.'} action={<Btn small onClick={prov.reload}>Retry</Btn>} />
      ) : (
        <>
          {/* Model picker */}
          <Panel style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Label>Who is the best provider for</Label>
              <select value={modelId ?? ''} onChange={e => setModelId(e.target.value)} style={{ height: 32, paddingInline: 10, background: 'var(--card2)', border: '0.5px solid var(--sep)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, maxWidth: mobile ? '100%' : 360, flex: mobile ? '1 1 100%' : undefined }}>
                {modelOptions.map(m => <option key={m.id} value={m.id}>{m.name} — {m.org} ({m.count} hosts{isNum(m.elo) ? `, ELO ${m.elo}` : ''})</option>)}
              </select>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter list…" style={{ height: 32, paddingInline: 10, background: 'var(--card)', border: '0.5px solid var(--sep)', outline: 'none', fontSize: 12.5, color: 'var(--text)', fontFamily: 'inherit', width: mobile ? '100%' : 160 }} />
              {meta && <Btn small onClick={() => onNavigate({ type: 'model', slug: current.modelId })} style={{ marginLeft: mobile ? 0 : 'auto' }}>Model page →</Btn>}
            </div>
          </Panel>

          {current && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                <StatTile label="Hosts" value={current.count} sub={meta ? `${meta.name}` : ''} />
                <StatTile label="Cheapest" value={cheapest ? fmtMetric('priceBlended', cheapest.priceBlended) : NA} sub={cheapest ? cheapest.provider : 'no price'} color={GOLD} metricKey="priceBlended" />
                <StatTile label="Price spread" value={spread ? `${spread.toFixed(1)}×` : NA} sub={priciest && cheapest ? `${priciest.provider} vs ${cheapest.provider}` : ''} color={RED} />
                <StatTile label="Fastest" value={W.fastest ? rows.find(e => e.tag === W.fastest)?.provider : NA} sub={W.fastest ? '' : 'No throughput source'} color={PURPLE} metricKey="speed" />
                <StatTile label="Best uptime" value={W.bestUptime ? fmtMetric('uptime', rows.find(e => e.tag === W.bestUptime)?.uptime30m) : NA} sub={W.bestUptime ? rows.find(e => e.tag === W.bestUptime)?.provider : ''} color={GREEN} metricKey="uptime" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <Segmented small value={view} onChange={setView} options={[{ value: 'endpoints', label: 'Endpoints' }, { value: 'spread', label: 'Price spread' }, { value: 'charts', label: 'Charts' }, { value: 'directory', label: 'Providers' }]} />
                {view === 'endpoints' && <ColumnPicker columns={columns} visible={colSel.visible} toggle={colSel.toggle} reset={colSel.reset} />}
              </div>

              {view === 'endpoints' && (
                <DataTable columns={columns} rows={rows} visible={colSel.visible} sort={sort} onSort={setSort} mobile={mobile} rowKey={e => e.tag ?? e.provider} />
              )}
              {view === 'spread' && (
                <HighlightGrid mobile={mobile} cols={2}>
                  <BarPanel mobile={mobile} title="Blended price per host" color={GOLD} subtitle={`${meta?.name ?? current.modelId} · $ per 1M tokens at 3:1 in:out · OpenRouter`} higherIsBetter={false} baseline={0} limit={rows.length}
                    items={[...rows].filter(e => isNum(e.priceBlended)).sort((a, b) => a.priceBlended - b.priceBlended).map(e => ({ id: e.tag, name: e.provider, value: e.priceBlended, label: fmtMetric('priceBlended', e.priceBlended), color: e.tag === W.cheapest ? GOLD : e.tag === W.bestValue ? BLUE : 'var(--muted)', tag: e.quantization ? <BadgeTag color={/int4|fp4/.test(e.quantization) ? GOLD : 'var(--muted)'}>{e.quantization}</BadgeTag> : null }))}
                    note={`${unpriced ? `${unpriced} host(s) without a listed price are not drawn · ` : ''}gold = cheapest · blue = best value at fp8 or better`} />
                  <BarPanel mobile={mobile} title="Context served per host" color={BLUE} subtitle="Largest request each host accepts · tokens · OpenRouter" baseline={0} limit={rows.length}
                    items={[...rows].filter(e => isNum(e.contextLength)).sort((a, b) => b.contextLength - a.contextLength).map(e => ({ id: e.tag, name: e.provider, value: e.contextLength, label: fmtMetric('context', e.contextLength), color: e.tag === W.context ? BLUE : 'var(--muted)' }))}
                    note="blue = the host serving the largest window" />
                </HighlightGrid>
              )}
              {view === 'charts' && (
                <Panel pad={mobile ? 12 : 18}>
                  <div style={{ marginBottom: 12 }}><Segmented small value={chart} onChange={setChart} options={[{ value: 'uptime-price', label: 'Uptime vs price' }, { value: 'speed-price', label: 'Speed vs price' }, { value: 'latency-price', label: 'Latency vs price' }, { value: 'accuracy-price', label: 'Accuracy vs price' }]} /></div>
                  {chart === 'uptime-price' ? (
                    <Suspense fallback={<Skeleton height={420} />}>
                      <ScatterChart points={chartPoints} xKey="priceBlended" yKey="uptime" xLog height={mobile ? 340 : 440} showZone={false} showLabels={false}
                        tooltipExtra={p => [['Ctx', fmtMetric('context', p.e.contextLength)], ['Quant', p.e.quantization ?? 'full']]} />
                    </Suspense>
                  ) : chart === 'accuracy-price' ? (
                    <Unavailable what="Endpoint accuracy (does the hosted endpoint reproduce the reference model's benchmark scores?)" />
                  ) : (
                    <Unavailable what={chart === 'speed-price' ? 'Per-provider output speed' : 'Per-provider first-token latency'} />
                  )}
                  <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 10, lineHeight: 1.5 }}>Every endpoint of every tracked model is plotted (top {models.length} models). OpenRouter's public API exposes price, context and uptime per host; its throughput / latency fields are null publicly, so speed and latency charts wait for a measurement source. Speed over time accumulates once such a source is configured.</p>
                </Panel>
              )}
              {view === 'directory' && (
                <DataTable columns={dirColumns} rows={prov.providers} visible={dirColumns.map(c => c.key)} sort={dirSort} onSort={setDirSort} mobile={mobile} rowKey={p => p.provider} dense />
              )}
            </>
          )}

          <section style={{ marginTop: mobile ? 36 : 48 }}>
            <SectionTitle eyebrow="Reading the board" title="Quantisation is the hidden variable." mobile={mobile} />
            <Panel>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--muted)', margin: 0 }}>
                A cheaper host of an open model is often running it at int4 or fp4 precision, which can change output quality; "Best value" here is the cheapest endpoint that keeps fp8-or-better precision. Uptime is OpenRouter's rolling success rate for the endpoint. Price is the provider's list price relayed through OpenRouter; direct pricing from the provider may differ. Speed, latency and accuracy are measurements, not listings — they appear only when a measurement source is configured, never as estimates.
              </p>
            </Panel>
          </section>
        </>
      )}
    </PageFrame>
  );
}
