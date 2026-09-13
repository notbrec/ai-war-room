// ─── LLM charts: intelligence / ELO vs price / speed / latency / context ────

import { useMemo, useState, lazy, Suspense } from 'react';
import { MONO } from '../../components/design.jsx';
import { Segmented, Panel, Unavailable, Label, Chip } from '../../components/ui.jsx';
import { fmtMetric, isNum } from '../../../shared/metrics.js';
import { Skeleton } from '../../components/design.jsx';

const ScatterChart = lazy(() => import('../../components/charts/ScatterChart.jsx'));

export const LLM_CHARTS = [
  { id: 'intel-price',   label: 'Intelligence vs Price',      x: 'priceBlended', y: 'intelligence', xLog: true },
  { id: 'intel-speed',   label: 'Intelligence vs Speed',      x: 'speed',        y: 'intelligence', needsAA: true },
  { id: 'intel-latency', label: 'Intelligence vs Latency',    x: 'ttft',         y: 'intelligence', needsAA: true },
  { id: 'intel-e2e',     label: 'Intelligence vs Response time', x: 'e2e',       y: 'intelligence', needsAA: true },
  { id: 'elo-price',     label: 'ELO vs Price',               x: 'priceBlended', y: 'elo',          xLog: true },
  { id: 'elo-speed',     label: 'ELO vs Speed',               x: 'speed',        y: 'elo',          needsAA: true },
  { id: 'ctx-price',     label: 'Context vs Price',           x: 'priceIn',      y: 'context',      xLog: true, yLog: true },
  { id: 'elo-intel',     label: 'ELO vs Intelligence',        x: 'intelligence', y: 'elo' },
];

function getMetric(m, key) {
  switch (key) {
    case 'elo': return m.arena?.elo ?? null;
    case 'intelligence': case 'codingIndex': case 'agenticIndex': case 'speed': case 'ttft': case 'e2e': return m.aa?.[key] ?? null;
    default: return m[key] ?? null;
  }
}

export default function LLMCharts({ models, aaConfigured, selected, onSelect, mobile, initial = LLM_CHARTS[0].id }) {
  const [chart, setChart] = useState(initial);
  const [topOnly, setTopOnly] = useState(true);
  const cfg = LLM_CHARTS.find(c => c.id === chart);
  const points = useMemo(() => {
    const base = topOnly ? models.filter(m => (m.arena?.rank ?? 999) <= 120 || isNum(m.aa?.intelligence)) : models;
    return base.map(m => ({ id: m.id, name: m.name, org: m.org, x: getMetric(m, cfg.x), y: getMetric(m, cfg.y), m }));
  }, [models, cfg, topOnly]);
  const withData = points.filter(p => isNum(p.x) && isNum(p.y)).length;

  return (
    <Panel pad={mobile ? 12 : 18}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <Segmented small value={chart} onChange={setChart} options={LLM_CHARTS.map(c => ({ value: c.id, label: mobile ? c.label.replace('Intelligence', 'Intel').replace(' vs ', '/') : c.label }))} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Chip small active={topOnly} label="Top 120 + indexed" onClick={() => setTopOnly(v => !v)} title="Limit to the top of the arena board plus every model with an Intelligence Index" />
          <Label>{withData} plotted</Label>
        </div>
      </div>
      {cfg.needsAA && !aaConfigured && withData === 0 ? (
        <Unavailable what={`${cfg.label} (speed / latency measurements)`} />
      ) : (
        <Suspense fallback={<Skeleton height={mobile ? 320 : 420} />}>
          <ScatterChart
            points={points} xKey={cfg.x} yKey={cfg.y} xLog={!!cfg.xLog} yLog={!!cfg.yLog}
            height={mobile ? 340 : 440} selected={selected} onSelect={p => onSelect?.(p.m)}
            tooltipExtra={p => [
              ['Rank', p.m.arena?.rank ? `#${p.m.arena.rank}` : 'unranked'],
              ['Ctx', p.m.contextLabel ?? 'N/A'],
              ['In/Out', `${fmtMetric('priceIn', p.m.priceIn)} / ${fmtMetric('priceOut', p.m.priceOut)}`],
            ]}
          />
        </Suspense>
      )}
      <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 10, lineHeight: 1.5 }}>
        {cfg.y === 'intelligence' || cfg.x === 'intelligence' ? 'Intelligence Index © Artificial Analysis, relayed via OpenRouter · ' : ''}
        ELO © arena.ai · prices via OpenRouter (blended = 3:1 in:out). Solid line = Pareto frontier: nothing is both better and cheaper than a point on it.
      </p>
    </Panel>
  );
}
