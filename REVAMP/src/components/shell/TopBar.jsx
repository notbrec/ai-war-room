// ─── TopBar — where you are, how fresh the data is, and the next move ───────
// Desktop only (the phone keeps NavBar). Page title on the left, the search
// that opens the command palette, the board's size, the data age, the theme
// switch and Battle Mode with the roster count.

import { useEffect, useMemo, useRef } from 'react';
import { usePassiveDomain } from '../../data/useDomain.js';
import { useBattle } from '../../domains/comparison/battleStore.js';
import { fmtAgo, isNum } from '../../../shared/metrics.js';
import { useMinuteTick } from '../../hooks/useShell.js';
import { LivePulse } from '../design.jsx';
import { Icon } from './nav.jsx';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '');
export const SHORTCUT = isMac ? '⌘K' : 'Ctrl K';

function compact(n) {
  if (!isNum(n)) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

export function useBoardStats() {
  const llms = usePassiveDomain('llms');
  return useMemo(() => {
    const models = llms?.models ?? [];
    if (!models.length) return null;
    const ranked = models.filter(m => m.inArena);
    return {
      models: models.length,
      ranked: ranked.length,
      labs: new Set(models.map(m => m.org).filter(Boolean)).size,
      votes: ranked.reduce((s, m) => s + (m.arena?.votes ?? 0), 0),
      open: ranked.filter(m => m.isOpen).length,
      fetchedAt: llms?.fetchedAt ?? null,
    };
  }, [llms]);
}

export default function TopBar({ meta, route, onNavigate, dark, onToggleTheme, onSearch, wide }) {
  useMinuteTick();
  const stats = useBoardStats();
  const llms = usePassiveDomain('llms');
  // a model page is titled by the model's name, not its slug
  const title = route?.type === 'model' ? (llms?.models?.find(m => m.slug === route.slug)?.name ?? meta.title) : meta.title;
  const battle = useBattle();
  const ref = useRef(null);

  // publish the height so sticky table headers tuck under the bar
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--nav-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fresh = stats?.fetchedAt && Date.now() - new Date(stats.fetchedAt).getTime() < 26 * 3600e3;

  return (
    <header ref={ref} className="aw-top">
      <div className="aw-top-title">
        <span className="aw-top-group">{meta.group}</span>
        <span className="aw-top-slash">/</span>
        <h2 className="aw-top-h">{title}</h2>
      </div>

      <button className="aw-top-search" onClick={onSearch} aria-label="Search models, labs and pages">
        <Icon name="search" size={15} />
        <span className="aw-top-search-text">Search models, labs, pages…</span>
        <kbd>{SHORTCUT}</kbd>
      </button>

      <div className="aw-top-right">
        {wide && stats && (
          <div className="aw-top-kpis">
            <button onClick={() => onNavigate('leaderboard')} title="Models on the board"><b>{stats.models}</b><span>models</span></button>
            <button onClick={() => onNavigate('leaderboard')} title="Labs with a model on the board"><b>{stats.labs}</b><span>labs</span></button>
            <button onClick={() => onNavigate('methodology')} title="Human votes behind the arena ratings"><b>{compact(stats.votes)}</b><span>votes</span></button>
            <button onClick={() => onNavigate('leaderboard')} title="Arena-rated models with open weights"><b>{stats.open}</b><span>open</span></button>
          </div>
        )}
        {stats?.fetchedAt && (
          <button className="aw-top-live" onClick={() => onNavigate('methodology')} title={`Data fetched ${new Date(stats.fetchedAt).toLocaleString()}`}>
            {fresh ? <LivePulse color="#5E9E70" size={6} /> : <span data-round="1" style={{ width: 6, height: 6, background: '#C89150' }} />}
            <span>{fmtAgo(stats.fetchedAt).toUpperCase()}</span>
          </button>
        )}
        <button className="aw-top-icon" onClick={onToggleTheme} title={dark ? 'Light mode' : 'Dark mode'} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          <Icon name={dark ? 'sun' : 'moon'} size={16} />
        </button>
        <button className="aw-top-cta" onClick={() => onNavigate('compare')}>
          <Icon name="swords" size={15} stroke={1.8} />
          Battle Mode
          {battle.items.length > 0 && <span className="aw-top-cta-n">{battle.items.length}</span>}
        </button>
      </div>
    </header>
  );
}
