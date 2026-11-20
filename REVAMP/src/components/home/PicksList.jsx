// ─── PicksList — who wins what, one line per front ──────────────────────────
// The same engine as the Mission Planner (shared/recommend.js, quality
// first): the winner of every front and, under it, the best-value
// alternative. Each line opens the winner; the value line opens its model.

import { LabLogo } from '../LabLogo.jsx';
import { Board, BoardLink } from '../board.jsx';
import { Skeleton } from '../design.jsx';
import { useFronts, openPick } from '../FrontBoard.jsx';

export default function PicksList({ onNavigate, area }) {
  const { cards, loading } = useFronts();
  return (
    <Board area={area} className="aw-picks" eyebrow="Who wins what" title="Best model for each job"
      sub="Winner per front, and the best-value pick under it" right={<BoardLink onClick={() => onNavigate('planner')}>PLANNER →</BoardLink>} flush>
      {loading && !cards.length
        ? Array.from({ length: 9 }).map((_, i) => <div key={i} className="aw-pick"><Skeleton height={12} width="60%" /><Skeleton height={12} /><Skeleton height={12} width={40} /></div>)
        : cards.map(c => (
          <div key={c.key} className="aw-pick" role="link" tabIndex={0} onClick={() => openPick(c.top, c, onNavigate)} onKeyDown={e => e.key === 'Enter' && e.target === e.currentTarget && openPick(c.top, c, onNavigate)}>
            <div className="aw-pick-front">
              <span className="aw-pick-label"><i style={{ background: c.color }} />{c.label}</span>
              <span className="aw-pick-q">{c.q}</span>
            </div>
            <div className="aw-pick-who">
              <span className="aw-pick-name">{c.top.org ? <LabLogo org={c.top.org} size={14} /> : <span style={{ width: 14 }} />}<span>{c.top.name}</span></span>
              {c.alt
                ? <button type="button" className="aw-pick-alt" onClick={e => { e.stopPropagation(); openPick(c.alt, c, onNavigate); }} title={c.alt.note}>
                    <b>{c.alt.label ?? 'VALUE'}</b>{c.alt.name}{c.alt.note ? <em> · {c.alt.note.split(' · ')[0]}</em> : null}
                  </button>
                : <span className="aw-pick-sub">{c.top.org ?? ''}{c.sub ? ` · ${c.sub}` : ''}</span>}
            </div>
            <div className="aw-pick-val">
              <b>{c.value ?? '—'}</b>
              <span>{c.unit}</span>
            </div>
          </div>
        ))}
    </Board>
  );
}
