// ─── ReadingFrame — long reads with the war room still in view ──────────────
// Three columns on a wide screen: the page's contents (built from its own
// headings) and the other reading pages on the left, the text at a readable
// measure in the middle, and the live board on the right — the smartest
// models, this week's arrivals and the tools, one click from any article.
// Below 1200 px of page width the rails step aside and the text runs alone.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLLMs } from '../data/useDomain.js';
import { useBattle } from '../domains/comparison/battleStore.js';
import { topByIntelligence } from '../domains/models/ranking.js';
import { fmtMetric, fmtAgo } from '../../shared/metrics.js';
import { go } from '../hooks/navigator.js';
import { LabLogo } from './LabLogo.jsx';
import { NAV, Icon } from './shell/nav.jsx';

const READ = NAV.find(g => g.group === 'Read').items;
const TOOLS = NAV.find(g => g.group === 'Tools').items;
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** The headings of the article, kept in sync as it renders. */
function useToc(ref) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scan = () => {
      const hs = [...el.querySelectorAll('h2')].filter(h => h.textContent.trim());
      const seen = new Set();
      const next = hs.map(h => {
        let id = h.id || `s-${slug(h.textContent)}`;
        while (seen.has(id)) id += '-x';
        seen.add(id);
        if (!h.id) h.id = id;
        h.style.scrollMarginTop = 'calc(var(--nav-h, 56px) + 24px)';
        return { id, text: h.textContent.trim() };
      });
      setItems(prev => (prev.length === next.length && prev.every((p, i) => p.id === next[i].id) ? prev : next));
    };
    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [ref]);
  return items;
}

function useActive(items) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!items.length) return;
    const onScroll = () => {
      const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 56;
      let cur = items[0].id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= navH + 90) cur = it.id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [items]);
  return active;
}

function Toc({ items, current }) {
  const active = useActive(items);
  const jump = id => {
    const el = document.getElementById(id);
    if (!el) return;
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 56;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - navH - 20, behavior: 'smooth' });
  };
  return (
    <nav className="aw-read-toc" aria-label="On this page">
      {items.length > 1 && <>
        <div className="aw-board-eyebrow">On this page</div>
        <div className="aw-read-toc-list">
          {items.map(it => (
            <button key={it.id} type="button" data-on={active === it.id ? '1' : '0'} onClick={() => jump(it.id)}>{it.text}</button>
          ))}
        </div>
      </>}
      <div className="aw-board-eyebrow" style={{ marginTop: items.length > 1 ? 28 : 0 }}>Read</div>
      <div className="aw-read-toc-list">
        {READ.map(r => (
          <button key={r.id} type="button" data-on={current === r.id ? '1' : '0'} onClick={() => go(r.id)}>
            <Icon name={r.icon} size={14} />{r.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

/** The live board, condensed for a side rail. */
export function LiveRail() {
  const llms = useLLMs();
  const battle = useBattle();
  const top = useMemo(() => topByIntelligence(llms.models, 8), [llms.models]);
  const fresh = useMemo(() => llms.models.filter(m => m.inArena && m.history?.isNew7d).sort((a, b) => a.arena.rank - b.arena.rank).slice(0, 4), [llms.models]);
  return (
    <aside className="aw-read-rail" aria-label="Live board">
      <section className="aiwar-surface aw-rail-card">
        <div className="aw-rail-head">
          <span className="aw-board-eyebrow">Live board</span>
          {llms.data?.fetchedAt && <span className="aw-rail-age">{fmtAgo(llms.data.fetchedAt)}</span>}
        </div>
        <h3 className="aw-board-title" style={{ margin: '4px 0 10px' }}>Smartest models now</h3>
        {top.length === 0 && <div className="aw-rail-empty">Loading the board…</div>}
        {top.map((m, i) => (
          <button key={m.id} type="button" className="aw-rail-row" onClick={() => go({ type: 'model', slug: m.slug })}>
            <span className="aw-rank-n" data-top={i < 3 ? '1' : '0'}>{i + 1}</span>
            <LabLogo org={m.org} size={13} />
            <span className="aw-rail-name">{m.name}</span>
            <b>{fmtMetric('intelligence', m.aa.intelligence)}</b>
          </button>
        ))}
        <button type="button" className="aw-link" style={{ marginTop: 8 }} onClick={() => go('leaderboard')}>FULL RANKING →</button>
      </section>

      {fresh.length > 0 && (
        <section className="aiwar-surface aw-rail-card">
          <span className="aw-board-eyebrow">New this week</span>
          {fresh.map(m => (
            <button key={m.id} type="button" className="aw-rail-row" onClick={() => go({ type: 'model', slug: m.slug })}>
              <span className="aw-rail-new">NEW</span>
              <LabLogo org={m.org} size={13} />
              <span className="aw-rail-name">{m.name}</span>
              <b>#{m.arena.rank}</b>
            </button>
          ))}
        </section>
      )}

      <section className="aiwar-surface aw-rail-card">
        <span className="aw-board-eyebrow">Tools</span>
        {TOOLS.map(t => (
          <button key={t.id} type="button" className="aw-rail-row" onClick={() => go(t.route ?? t.id)}>
            <Icon name={t.icon} size={14} />
            <span className="aw-rail-name">{t.label}{t.id === 'compare' && battle.items.length > 0 ? ` · ${battle.items.length} in the ring` : ''}</span>
            <span style={{ color: 'var(--muted2)', fontFamily: 'var(--mono)', fontSize: 11 }}>→</span>
          </button>
        ))}
      </section>
    </aside>
  );
}

export default function ReadingFrame({ children, current, wide = false, rail = true }) {
  const ref = useRef(null);
  const toc = useToc(ref);
  return (
    <div className="aw-page aw-read" data-wide={wide ? '1' : '0'}>
      <div className="aw-read-grid">
        <div className="aw-read-left"><Toc items={toc} current={current} /></div>
        <div className="aw-read-main" ref={ref}>{children}</div>
        {rail && <div className="aw-read-right"><LiveRail /></div>}
      </div>
    </div>
  );
}

