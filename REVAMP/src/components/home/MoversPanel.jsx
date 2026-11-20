// ─── MoversPanel — what changed: arrivals, climbers, fallers, price moves ───
// Read from each model's history (7-day rank moves, 30-day price moves,
// first seen on the arena). Every row opens the model.

import { useMemo, useState } from 'react';
import { LabLogo } from '../LabLogo.jsx';
import { Segmented } from '../ui.jsx';
import { Board, BoardLink } from '../board.jsx';
import { fmtMetric, fmtDate, isNum } from '../../../shared/metrics.js';

const GREEN = '#5E9E70', RED = '#CD5C4E';

export default function MoversPanel({ models, onNavigate, area, limit = 10 }) {
  const [tab, setTab] = useState('new');
  const lists = useMemo(() => {
    const ranked = (models ?? []).filter(m => m.inArena && isNum(m.arena?.rank));
    // ELO, not rank: a new arrival at the top pushes everyone under it down a
    // place without anything having happened to them.
    const moved = ranked.filter(m => isNum(m.history?.eloDelta7d) && m.history.eloDelta7d !== 0 && !m.history.isNew7d);
    const was = m => isNum(m.history?.rankDelta7d) && m.history.rankDelta7d !== 0 ? ` · was #${m.arena.rank + m.history.rankDelta7d}` : '';
    return {
      new: ranked.filter(m => m.history?.isNew7d).sort((a, b) => a.arena.rank - b.arena.rank)
        .map(m => ({ m, main: `#${m.arena.rank}`, detail: `ELO ${m.arena.elo}${m.arena.firstSeen ? ` · first seen ${fmtDate(m.arena.firstSeen)}` : ''}` })),
      up: moved.filter(m => m.history.eloDelta7d > 0).sort((a, b) => b.history.eloDelta7d - a.history.eloDelta7d || a.arena.rank - b.arena.rank)
        .map(m => ({ m, main: `+${m.history.eloDelta7d} ELO`, tone: GREEN, detail: `ELO ${m.arena.elo} · #${m.arena.rank}${was(m)}` })),
      down: moved.filter(m => m.history.eloDelta7d < 0).sort((a, b) => a.history.eloDelta7d - b.history.eloDelta7d || a.arena.rank - b.arena.rank)
        .map(m => ({ m, main: `−${-m.history.eloDelta7d} ELO`, tone: RED, detail: `ELO ${m.arena.elo} · #${m.arena.rank}${was(m)}` })),
      price: (models ?? []).filter(m => isNum(m.history?.priceDelta30d) && Math.abs(m.history.priceDelta30d) >= 0.02 && isNum(m.priceBlended) && (m.inArena || isNum(m.aa?.intelligence)))
        .sort((a, b) => Math.abs(b.history.priceDelta30d) - Math.abs(a.history.priceDelta30d))
        .map(m => ({ m, main: `${m.history.priceDelta30d < 0 ? '▼' : '▲'} ${Math.round(Math.abs(m.history.priceDelta30d) * 100)}%`, tone: m.history.priceDelta30d < 0 ? GREEN : RED, detail: `${fmtMetric('priceBlended', m.priceBlended)} per 1M now · 30 days` })),
    };
  }, [models]);
  const rows = lists[tab].slice(0, limit);
  // no model carries a history at all: the snapshots did not load this time
  const noHistory = (models ?? []).length > 0 && !(models ?? []).some(m => m.history);
  const TABS = [
    { value: 'new', label: 'New', count: lists.new.length },
    { value: 'up', label: 'Climbers', count: lists.up.length },
    { value: 'down', label: 'Fallers', count: lists.down.length },
    { value: 'price', label: 'Price', count: lists.price.length },
  ];
  return (
    <Board area={area} className="aw-movers" eyebrow="What changed" title="Movers this week"
      sub="New on the arena, ELO moves over 7 days, price changes over 30"
      right={<Segmented small nowrap value={tab} onChange={setTab} options={TABS} />}
      foot={<><span className="aw-board-eyebrow" style={{ margin: 0 }}>From the daily snapshots · arena.ai · OpenRouter</span><BoardLink onClick={() => onNavigate('leaderboard')}>LEADERBOARD →</BoardLink></>}
      flush>
      {rows.length === 0
        ? <div className="aw-empty">{noHistory ? 'Week-over-week history is refreshing — the moves appear with the next update.' : 'A quiet week — nothing moved here.'}</div>
        : rows.map(r => (
          <div key={r.m.id} className="aw-list-row" role="link" tabIndex={0} onClick={() => onNavigate({ type: 'model', slug: r.m.slug })} onKeyDown={e => e.key === 'Enter' && e.target === e.currentTarget && onNavigate({ type: 'model', slug: r.m.slug })}>
            <LabLogo org={r.m.org} size={15} />
            <span className="aw-list-main">
              <span className="aw-list-name">{r.m.name}</span>
              <span className="aw-list-detail">{r.m.org} · {r.detail}</span>
            </span>
            <b className="aw-list-val" style={{ color: r.tone ?? 'var(--text)' }}>{r.main}</b>
          </div>
        ))}
    </Board>
  );
}
