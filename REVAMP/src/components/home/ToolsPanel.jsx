// ─── ToolsPanel — put them in the ring ──────────────────────────────────────
// The sparring clip over the four tools; the battle roster's state is shown
// on Battle Mode so a half-built bout is one click from the fight.

import FightArena from '../FightArena.jsx';
import { Board } from '../board.jsx';
import { useBattle } from '../../domains/comparison/battleStore.js';
import { NAV } from '../shell/nav.jsx';
import { Icon } from '../shell/nav.jsx';

const TOOLS = NAV.find(g => g.group === 'Tools').items;

export default function ToolsPanel({ onNavigate, area }) {
  const battle = useBattle();
  return (
    <Board area={area} className="aw-tools" eyebrow="Tools" title="Put them in the ring" flush>
      <div className="aw-tools-clip">
        <FightArena clip="jab" radius={0} border={false} surface="var(--card)" alt="Two robots sparring" style={{ position: 'absolute', inset: 0, aspectRatio: 'auto', height: '100%' }} />
      </div>
      {TOOLS.map((t, i) => (
        <div key={t.id} className="aw-list-row aw-tool" role="link" tabIndex={0} onClick={() => onNavigate(t.route ?? t.id)} onKeyDown={e => e.key === 'Enter' && e.target === e.currentTarget && onNavigate(t.route ?? t.id)}>
          <span className="aw-tool-ico"><Icon name={t.icon} size={16} /></span>
          <span className="aw-list-main">
            <span className="aw-list-name">{t.label}{t.id === 'compare' && battle.items.length > 0 && <em className="aw-tool-n">{battle.items.length} in the ring</em>}</span>
            <span className="aw-list-detail">{t.desc}</span>
          </span>
          <span className="aw-list-val" style={{ color: 'var(--muted2)' }}>{String(i + 1).padStart(2, '0')} →</span>
        </div>
      ))}
    </Board>
  );
}
