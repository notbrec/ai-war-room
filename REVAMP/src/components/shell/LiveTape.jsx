// ─── LiveTape — what changed this week, scrolling under the top bar ─────────
// New arrivals on the arena, rank moves over seven days and price changes
// over thirty, straight from each model's history. Every item opens the
// model. When the week was quiet the tape shows the top of the board.

import { useMemo } from 'react';
import { usePassiveDomain } from '../../data/useDomain.js';
import { LabLogo } from '../LabLogo.jsx';
import { isNum } from '../../../shared/metrics.js';

const GREEN = '#5E9E70', RED = '#CD5C4E', GOLD = '#C89150';

export function useTapeItems() {
  const llms = usePassiveDomain('llms');
  return useMemo(() => {
    const models = llms?.models ?? [];
    if (!models.length) return { items: [], weekly: 0 };
    const ranked = models.filter(m => m.inArena && isNum(m.arena?.rank));
    const fresh = ranked.filter(m => m.history?.isNew7d).sort((a, b) => a.arena.rank - b.arena.rank).slice(0, 6)
      .map(m => ({ m, tag: 'NEW', color: RED, text: `#${m.arena.rank} · ${m.arena.elo}` }));
    const movers = ranked.filter(m => isNum(m.history?.rankDelta7d) && m.history.rankDelta7d !== 0 && m.arena.rank <= 60 && !m.history?.isNew7d)
      .sort((a, b) => Math.abs(b.history.rankDelta7d) - Math.abs(a.history.rankDelta7d) || a.arena.rank - b.arena.rank).slice(0, 10)
      .map(m => {
        const d = m.history.rankDelta7d;
        return { m, tag: `#${m.arena.rank}`, color: 'var(--muted2)', text: `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}`, tone: d > 0 ? GREEN : RED };
      });
    const prices = models.filter(m => isNum(m.history?.priceDelta30d) && Math.abs(m.history.priceDelta30d) >= 0.05 && isNum(m.priceBlended) && (m.inArena || isNum(m.aa?.intelligence)))
      .sort((a, b) => a.history.priceDelta30d - b.history.priceDelta30d).slice(0, 4)
      .map(m => {
        const p = m.history.priceDelta30d;
        return { m, tag: 'PRICE', color: GOLD, text: `${p < 0 ? '▼' : '▲'} ${Math.round(Math.abs(p) * 100)}%`, tone: p < 0 ? GREEN : RED };
      });
    let items = [...fresh, ...movers, ...prices];
    const weekly = items.length;
    if (items.length < 8) {
      const have = new Set(items.map(i => i.m.id));
      items = [...items, ...ranked.slice(0, 16).filter(m => !have.has(m.id)).map(m => ({ m, tag: `#${m.arena.rank}`, color: 'var(--muted2)', text: String(m.arena.elo) }))];
    }
    return { items, weekly };
  }, [llms]);
}

export default function LiveTape({ onNavigate }) {
  const { items, weekly } = useTapeItems();
  if (!items.length) return <div className="aw-tape" aria-hidden />;
  const doubled = [...items, ...items];
  return (
    <div className="aw-tape">
      <div className="aw-tape-label">
        <span data-round="1" style={{ width: 6, height: 6, background: GREEN }} />
        {weekly > 0 ? 'This week' : 'Top of the arena'}
      </div>
      <div className="aw-tape-track-wrap">
        <div className="aw-tape-track" style={{ animationDuration: `${Math.max(50, items.length * 4.5)}s` }}>
          {doubled.map((it, i) => (
            <button key={i} className="aw-tape-item" onClick={() => onNavigate({ type: 'model', slug: it.m.slug })} tabIndex={i < items.length ? 0 : -1} aria-hidden={i >= items.length}>
              <span className="aw-tape-tag" style={{ color: it.color }}>{it.tag}</span>
              <LabLogo org={it.m.org} size={11} />
              <span className="aw-tape-name">{it.m.name}</span>
              <span className="aw-tape-val" style={{ color: it.tone ?? 'var(--muted)' }}>{it.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
