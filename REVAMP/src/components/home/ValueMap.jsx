// ─── ValueMap — intelligence against price, speed or latency ────────────────
// One dot per model family (its smartest variant). The line is the Pareto
// frontier: nothing is both smarter and better on the other axis than a
// point on it. Click a dot for the model; wheel or drag to zoom.

import { lazy, Suspense, useMemo, useState } from 'react';
import { Segmented } from '../ui.jsx';
import { Board, BoardLink } from '../board.jsx';
import { Skeleton } from '../design.jsx';
import { topByIntelligence } from '../../domains/models/ranking.js';
import { isNum } from '../../../shared/metrics.js';

const ScatterChart = lazy(() => import('../charts/ScatterChart.jsx'));

const AXES = {
  price:   { label: 'Price',   key: 'priceBlended', get: m => m.priceBlended, log: true,  sub: 'x: $ per 1M tokens (log) · lower is better' },
  speed:   { label: 'Speed',   key: 'speed',        get: m => m.aa?.speed,    log: false, sub: 'x: output tokens per second · higher is better' },
  latency: { label: 'Latency', key: 'ttft',         get: m => m.aa?.ttft,     log: true,  sub: 'x: seconds to first token (log) · lower is better' },
};

export default function ValueMap({ models, onNavigate, area, height = 430 }) {
  const [axis, setAxis] = useState('price');
  const A = AXES[axis];
  const points = useMemo(() => topByIntelligence(models ?? [], 400)
    .filter(m => isNum(A.get(m)) && A.get(m) > 0)
    .map(m => ({ id: m.id, name: m.name, org: m.org, slug: m.slug, x: A.get(m), y: m.aa.intelligence })), [models, A]);

  return (
    <Board area={area} className="aw-map" eyebrow="Value map" title={`Intelligence vs. ${A.label.toLowerCase()}`}
      sub={`${points.length} model families · ${A.sub}`}
      right={<Segmented small nowrap value={axis} onChange={setAxis} options={Object.entries(AXES).map(([value, a]) => ({ value, label: a.label }))} />}
      foot={<><span className="aw-board-eyebrow" style={{ margin: 0 }}>The line is the frontier — nothing beats it on both axes</span><BoardLink onClick={() => onNavigate('leaderboard')}>ALL CHARTS →</BoardLink></>}>
      <Suspense fallback={<Skeleton height={height} />}>
        {points.length
          ? <ScatterChart points={points} xKey={A.key} yKey="intelligence" xLog={A.log} height={height} noun="model families"
              onSelect={p => p.slug && onNavigate({ type: 'model', slug: p.slug })} />
          : <Skeleton height={height} />}
      </Suspense>
    </Board>
  );
}
