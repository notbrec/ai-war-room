// ─── LabsPanel — the labs, ranked by their best model ───────────────────────
// Every organisation on the board with its smartest model, its best arena
// rating and how many models it fields. A row opens the lab's page.

import { useMemo } from 'react';
import { LabLogo } from '../LabLogo.jsx';
import { Board, BoardLink } from '../board.jsx';
import { topByIntelligence } from '../../domains/models/ranking.js';
import { labSlug } from '../../domains/labs.js';
import { fmtMetric, isNum } from '../../../shared/metrics.js';

export function useLabStandings(models) {
  return useMemo(() => {
    const by = new Map();
    for (const m of models ?? []) {
      if (!m.org || m.org === 'Unknown') continue;
      const e = by.get(m.org) ?? { org: m.org, models: 0, ranked: 0, open: 0, bestElo: null, eloModel: null, smart: null };
      e.models += 1;
      if (m.inArena && isNum(m.arena?.elo)) {
        e.ranked += 1;
        if (!isNum(e.bestElo) || m.arena.elo > e.bestElo) { e.bestElo = m.arena.elo; e.eloModel = m; }
      }
      if (m.isOpen) e.open += 1;
      by.set(m.org, e);
    }
    for (const m of topByIntelligence(models ?? [], 1000)) {
      const e = by.get(m.org);
      if (e && !e.smart) e.smart = m;
    }
    return [...by.values()].sort((a, b) =>
      (b.smart?.aa?.intelligence ?? -1) - (a.smart?.aa?.intelligence ?? -1) || (b.bestElo ?? 0) - (a.bestElo ?? 0));
  }, [models]);
}

export default function LabsPanel({ models, onNavigate, area, limit = 10 }) {
  const labs = useLabStandings(models);
  const rows = labs.slice(0, limit);
  return (
    <Board area={area} className="aw-labs" eyebrow="The labs" title="Lab standings"
      sub={`${labs.length} labs, ranked by their smartest model`}
      foot={<><span className="aw-board-eyebrow" style={{ margin: 0 }}>Index · Artificial Analysis — ELO · arena.ai</span><BoardLink onClick={() => onNavigate({ type: 'lab', slug: labSlug(rows[0]?.org) })}>LAB PAGES →</BoardLink></>}
      flush>
      <div className="aw-labs-grid aw-labs-th">
        <span>#</span><span>Lab</span><span>Best model</span><span>Index</span><span>Top ELO</span><span>Models</span>
      </div>
      {rows.map((l, i) => (
        <div key={l.org} className="aw-labs-grid aw-labs-row" role="link" tabIndex={0}
          onClick={() => onNavigate({ type: 'lab', slug: labSlug(l.org) })} onKeyDown={e => e.key === 'Enter' && e.target === e.currentTarget && onNavigate({ type: 'lab', slug: labSlug(l.org) })}>
          <span className="aw-rank-n" data-top={i < 3 ? '1' : '0'}>{String(i + 1).padStart(2, '0')}</span>
          <span className="aw-rank-model"><LabLogo org={l.org} size={15} /><span className="aw-rank-name">{l.org}</span></span>
          <span className="aw-labs-best">{(l.smart ?? l.eloModel)?.name ?? '—'}</span>
          <span className="aw-rank-c">{isNum(l.smart?.aa?.intelligence) ? fmtMetric('intelligence', l.smart.aa.intelligence) : '—'}</span>
          <span className="aw-rank-c">{isNum(l.bestElo) ? l.bestElo : '—'}</span>
          <span className="aw-rank-c">{l.models}{l.open ? <em className="aw-labs-open" title="open weights"> · {l.open} open</em> : null}</span>
        </div>
      ))}
    </Board>
  );
}
