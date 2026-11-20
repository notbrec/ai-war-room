// ─── Sidebar — the desktop site map, always in view ─────────────────────────
// Every arena, tool and reading page with a live count beside it, the battle
// roster's size on Battle Mode, and the state of every data source at the
// foot. Full (labels) or rail (icons only); the toggle is remembered.

import { useMemo, useState } from 'react';
import { RobotMascot } from '../Robot.jsx';
import { prefetch } from '../../data/api.js';
import { usePassiveDomain } from '../../data/useDomain.js';
import { useBattle } from '../../domains/comparison/battleStore.js';
import { SOURCES, fmtAgo, isNum } from '../../../shared/metrics.js';
import { useMinuteTick } from '../../hooks/useShell.js';
import { NAV, Icon, isActive } from './nav.jsx';

const GREEN = '#5E9E70', GOLD = '#C89150', RED = '#CD5C4E';

/** Every source the datasets report, best status and newest fetch per source. */
export function useSourceStatus() {
  const llms = usePassiveDomain('llms'), media = usePassiveDomain('media'), coding = usePassiveDomain('coding'), speech = usePassiveDomain('speech'), prov = usePassiveDomain('providers');
  return useMemo(() => {
    const rank = { live: 3, stale: 2, unavailable: 1 };
    const agg = {};
    const alias = k => {
      const id = k.split(':')[0];
      if (id.startsWith('arena')) return 'arena';
      if (id.startsWith('aa')) return 'aa';
      return id;
    };
    for (const d of [llms, media, coding, speech, prov]) {
      for (const [key, s] of Object.entries(d?.sources ?? {})) {
        const id = alias(key);
        if (!SOURCES[id] || id === 'internal') continue;
        const cur = agg[id];
        const t = s?.fetchedAt ? new Date(s.fetchedAt).getTime() : 0;
        if (!cur) { agg[id] = { id, name: SOURCES[id].name, status: s.status, at: t }; continue; }
        if ((rank[s.status] ?? 0) > (rank[cur.status] ?? 0)) cur.status = s.status;
        if (t > cur.at) cur.at = t;
      }
    }
    const order = ['arena', 'aa', 'openrouter', 'swebench', 'openasr', 'designarena'];
    return Object.values(agg).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }, [llms, media, coding, speech, prov]);
}

function useCounts() {
  const llms = usePassiveDomain('llms'), media = usePassiveDomain('media'), coding = usePassiveDomain('coding'), speech = usePassiveDomain('speech'), prov = usePassiveDomain('providers');
  return useMemo(() => ({
    leaderboard: llms?.models?.length,
    coding: coding?.boards?.Verified?.length,
    images: (media?.boards?.['text-to-image']?.length ?? 0) + (media?.boards?.['image-edit']?.length ?? 0) || undefined,
    videos: (media?.boards?.['text-to-video']?.length ?? 0) + (media?.boards?.['image-to-video']?.length ?? 0) || undefined,
    speech: (speech?.tts?.length ?? 0) + (speech?.stt?.length ?? 0) || undefined,
    providers: prov?.providers?.length,
  }), [llms, media, coding, speech, prov]);
}

export default function Sidebar({ route, onNavigate, rail, onToggleRail }) {
  useMinuteTick();
  const counts = useCounts();
  const battle = useBattle();
  const sources = useSourceStatus();
  const worst = sources.some(s => s.status !== 'live') ? (sources.some(s => s.status === 'unavailable') ? RED : GOLD) : GREEN;
  // rail tooltips are drawn fixed beside the hovered icon, so the rail can still scroll on short screens
  const [tip, setTip] = useState(null);
  const tipOn = e => {
    if (!rail) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ text: e.currentTarget.dataset.tip, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const tipOff = () => setTip(null);

  return (
    <aside className="aw-side" data-rail={rail ? '1' : '0'} aria-label="Site">
      <button className="aw-side-brand" onClick={() => onNavigate('home')} title="AI WAR ROOM — home">
        <RobotMascot variant="classic" size={rail ? 22 : 20} color="var(--accent)" />
        {!rail && <span className="aw-side-word">AI WAR ROOM</span>}
      </button>

      <nav className="aw-side-nav">
        {NAV.map(g => (
          <div key={g.group} className="aw-side-group">
            {rail ? <div className="aw-side-sep" /> : <div className="aw-side-label">{g.group}</div>}
            {g.items.map(item => {
              const on = isActive(item, route);
              const count = item.id === 'compare' ? (battle.items.length ? `${battle.items.length}/4` : null) : counts[item.id];
              return (
                <button key={item.id} className="aw-side-item" data-on={on ? '1' : '0'} data-tip={item.label}
                  aria-current={on ? 'page' : undefined}
                  onClick={() => { tipOff(); onNavigate(item.route ?? item.id); }}
                  onMouseEnter={e => { tipOn(e); if (item.prefetch) prefetch(item.prefetch); }} onMouseLeave={tipOff}
                  onFocus={tipOn} onBlur={tipOff}>
                  <Icon name={item.icon} size={rail ? 18 : 16} />
                  {!rail && <span className="aw-side-text">{item.label}</span>}
                  {!rail && count != null && <span className={item.id === 'compare' ? 'aw-side-badge' : 'aw-side-count'}>{count}</span>}
                  {rail && item.id === 'compare' && battle.items.length > 0 && <span className="aw-side-dot" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="aw-side-foot">
        {!rail && sources.length > 0 && (
          <button className="aw-side-sources" onClick={() => onNavigate('methodology')} title="Where every number comes from">
            <div className="aw-side-label" style={{ margin: '0 0 6px' }}>Data sources</div>
            {sources.map(s => (
              <div key={s.id} className="aw-side-src">
                <span data-round="1" style={{ width: 6, height: 6, background: s.status === 'live' ? GREEN : s.status === 'stale' ? GOLD : RED, flexShrink: 0 }} />
                <span className="aw-side-src-name">{s.name}</span>
                <span className="aw-side-src-age">{isNum(s.at) && s.at > 0 ? fmtAgo(new Date(s.at).toISOString()).replace(' ago', '') : s.status}</span>
              </div>
            ))}
          </button>
        )}
        {rail && sources.length > 0 && (
          <button className="aw-side-item" data-tip="Data sources" onClick={() => onNavigate('methodology')} onMouseEnter={tipOn} onMouseLeave={tipOff}>
            <span data-round="1" style={{ width: 8, height: 8, background: worst, boxShadow: `0 0 0 4px ${worst}26` }} />
          </button>
        )}
        <button className="aw-side-item aw-side-toggle" data-tip={rail ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => { tipOff(); onToggleRail(); }} onMouseEnter={tipOn} onMouseLeave={tipOff} aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={rail ? 'expand' : 'collapse'} size={rail ? 18 : 16} />
          {!rail && <span className="aw-side-text">Collapse</span>}
        </button>
      </div>
      {rail && tip && <div className="aw-side-tip" role="tooltip" style={{ top: tip.top, left: tip.left }}>{tip.text}</div>}
    </aside>
  );
}
