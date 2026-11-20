// ─── RankBoard — the top of the board, five ways ────────────────────────────
// Intelligence · Arena · Value · Speed · Open. One row per model family
// (its best variant), except the Arena view, which keeps the arena's own
// ranks so a number here matches the leaderboard it opens.

import { useMemo, useState } from 'react';
import { LabLogo } from '../LabLogo.jsx';
import { Segmented, Delta } from '../ui.jsx';
import { Board, BoardLink, Tag } from '../board.jsx';
import { Skeleton } from '../design.jsx';
import { AddToBattle } from '../../domains/comparison/BattleControls.jsx';
import { topByIntelligence } from '../../domains/models/ranking.js';
import { fmtMetric, isNum } from '../../../shared/metrics.js';
import { ORG_CONFIG } from '../../models-data.js';

const GREEN = '#5E9E70', RED = '#CD5C4E';
const labColor = org => ORG_CONFIG[org]?.color && ORG_CONFIG[org].color !== '#FFFFFF' ? ORG_CONFIG[org].color : 'var(--text2)';

const VIEWS = {
  intel: {
    label: 'Intelligence', title: 'Smartest models right now', sub: 'Intelligence Index · best variant per family · Artificial Analysis',
    primary: { key: 'intelligence', label: 'Index', get: m => m.aa?.intelligence, hi: true },
    cols: [['elo', 'ELO', m => m.arena?.elo], ['priceBlended', '$/1M', m => m.priceBlended], ['speed', 'tok/s', m => m.aa?.speed]],
  },
  arena: {
    label: 'Arena', title: 'Preferred by people', sub: 'Arena ELO from blind human votes · arena.ai ranks',
    primary: { key: 'elo', label: 'ELO', get: m => m.arena?.elo, hi: true },
    cols: [['ci', '±', m => m.arena?.ci], ['votes', 'Votes', m => m.arena?.votes], ['delta', '7d', m => m.history?.rankDelta7d]],
  },
  value: {
    label: 'Value', title: 'Smart and cheap', sub: 'The 40 smartest families, cheapest first · $ per 1M tokens, 3:1 blend',
    primary: { key: 'priceBlended', label: '$/1M', get: m => m.priceBlended, hi: false },
    cols: [['intelligence', 'Index', m => m.aa?.intelligence], ['elo', 'ELO', m => m.arena?.elo], ['speed', 'tok/s', m => m.aa?.speed]],
  },
  speed: {
    label: 'Speed', title: 'Fastest capable models', sub: 'Output tokens per second among the 60 smartest families · Artificial Analysis',
    primary: { key: 'speed', label: 'tok/s', get: m => m.aa?.speed, hi: true },
    cols: [['ttft', 'TTFT', m => m.aa?.ttft], ['intelligence', 'Index', m => m.aa?.intelligence], ['priceBlended', '$/1M', m => m.priceBlended]],
  },
  open: {
    label: 'Open', title: 'Best open weights', sub: 'Models you can download and self-host · Intelligence Index',
    primary: { key: 'intelligence', label: 'Index', get: m => m.aa?.intelligence, hi: true },
    cols: [['elo', 'ELO', m => m.arena?.elo], ['priceBlended', '$/1M', m => m.priceBlended], ['speed', 'tok/s', m => m.aa?.speed]],
  },
};

function rowsFor(view, models) {
  const fam = topByIntelligence(models, 400);
  switch (view) {
    case 'arena': return models.filter(m => m.inArena && isNum(m.arena?.elo)).sort((a, b) => (a.arena.rank ?? 1e9) - (b.arena.rank ?? 1e9));
    case 'value': return fam.slice(0, 40).filter(m => isNum(m.priceBlended) && m.priceBlended > 0).sort((a, b) => a.priceBlended - b.priceBlended);
    case 'speed': return fam.slice(0, 60).filter(m => isNum(m.aa?.speed)).sort((a, b) => b.aa.speed - a.aa.speed);
    case 'open': {
      const open = fam.filter(m => m.isOpen);
      return open.length >= 5 ? open : models.filter(m => m.isOpen && m.inArena).sort((a, b) => a.arena.rank - b.arena.rank);
    }
    default: return fam;
  }
}

function cell(key, v) {
  if (key === 'delta') return isNum(v) && v !== 0 ? <Delta value={v} size={10.5} /> : <span style={{ color: 'var(--muted2)' }}>—</span>;
  if (key === 'ci') return isNum(v) ? `±${v}` : '—';
  if (!isNum(v)) return <span style={{ color: 'var(--muted2)' }}>—</span>;
  return fmtMetric(key, v);
}

export default function RankBoard({ models, loading, onNavigate, area, rows = 14, mobile }) {
  const [view, setView] = useState('intel');
  const V = VIEWS[view];
  const list = useMemo(() => rowsFor(view, models ?? []).slice(0, mobile ? 8 : rows), [view, models, rows, mobile]);
  const values = list.map(V.primary.get).filter(isNum);
  const best = V.primary.hi ? Math.max(...values) : Math.min(...values);
  const pct = v => !isNum(v) || !values.length ? 0 : Math.max(4, Math.min(100, V.primary.hi ? (v / best) * 100 : (best / v) * 100));

  return (
    <Board area={area} className="aw-rank" eyebrow="The ranking" title={V.title} sub={V.sub}
      right={<Segmented small nowrap value={view} onChange={setView} options={Object.entries(VIEWS).map(([value, v]) => ({ value, label: v.label }))} />}
      foot={<>
        <span className="aw-board-eyebrow" style={{ margin: 0 }}>{models?.length ? `Showing ${list.length} of ${models.length} models` : ' '}</span>
        <BoardLink onClick={() => onNavigate('leaderboard')}>FULL RANKING →</BoardLink>
      </>}
      flush>
      <div className="aw-rank-grid aw-rank-th" data-mobile={mobile ? '1' : '0'}>
        <span>#</span><span>Model</span><span className="on">{V.primary.label} {V.primary.hi ? '↓' : '↑'}</span>
        {!mobile && V.cols.map(([k, l]) => <span key={k}>{l}</span>)}
        {mobile && <span>{V.cols[0][1]}</span>}
        {!mobile && <span />}
      </div>
      {loading && !list.length
        ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="aw-rank-grid aw-rank-row"><Skeleton height={12} width="70%" style={{ gridColumn: '1 / -1' }} /></div>)
        : list.map((m, i) => {
          const v = V.primary.get(m);
          const rank = view === 'arena' ? m.arena.rank : i + 1;
          return (
            <div key={m.id} className="aw-rank-grid aw-rank-row" data-mobile={mobile ? '1' : '0'} role="link" tabIndex={0}
              onClick={() => onNavigate({ type: 'model', slug: m.slug })} onKeyDown={e => e.key === 'Enter' && e.target === e.currentTarget && onNavigate({ type: 'model', slug: m.slug })}>
              <span className="aw-rank-n" data-top={rank <= 3 ? '1' : '0'}>{String(rank).padStart(2, '0')}</span>
              <span className="aw-rank-model">
                <LabLogo org={m.org} size={15} />
                <span className="aw-rank-name">{m.name}</span>
                {m.history?.isNew7d && <Tag color={RED}>NEW</Tag>}
                {m.isOpen && view !== 'open' && <Tag color={GREEN}>OPEN</Tag>}
              </span>
              <span className="aw-rank-primary">
                <span className="aw-rank-track"><i style={{ width: `${pct(v)}%`, background: labColor(m.org) }} /></span>
                <b>{cell(V.primary.key, v)}</b>
              </span>
              {!mobile && V.cols.map(([k, , get]) => <span key={k} className="aw-rank-c">{cell(k, get(m))}</span>)}
              {mobile && <span className="aw-rank-c">{cell(V.cols[0][0], V.cols[0][2](m))}</span>}
              {!mobile && <span className="aw-rank-act" onClick={e => e.stopPropagation()}><AddToBattle item={{ id: m.id, kind: 'llm', name: m.name, org: m.org }} label="" /></span>}
            </div>
          );
        })}
    </Board>
  );
}
