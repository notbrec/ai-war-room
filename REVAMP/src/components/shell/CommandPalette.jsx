// ─── CommandPalette — Ctrl K / ⌘K / "/" from anywhere ───────────────────────
// One box that reaches everything: every page and tool, every language model
// (with its numbers), every lab, the image and video models. Arrow keys move,
// Enter opens, "+" on a model puts it in the battle roster without leaving.

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePassiveDomain } from '../../data/useDomain.js';
import { LabLogo } from '../LabLogo.jsx';
import { AddToBattle } from '../../domains/comparison/BattleControls.jsx';
import { fmtMetric, isNum } from '../../../shared/metrics.js';
import { labSlug } from '../../domains/labs.js';
import { NAV_ITEMS, Icon } from './nav.jsx';

const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Every token must appear; a name that starts with the query ranks first. */
function score(hay, name, q, tokens) {
  if (!tokens.length) return 0;
  for (const t of tokens) if (!hay.includes(t)) return -1;
  const n = norm(name);
  if (n === q) return 1000;
  if (n.startsWith(q)) return 500;
  if (n.split(/[\s\-_.()/]+/).some(w => w.startsWith(tokens[0]))) return 200;
  return 100;
}

export default function CommandPalette({ open, onClose, onNavigate, fallbackModels }) {
  const llms = usePassiveDomain('llms', { eager: true });
  const media = usePassiveDomain('media', { eager: true });
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ(''); setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.body.style.overflow = prev; };
  }, [open]);

  const index = useMemo(() => {
    const models = (llms?.models?.length ? llms.models : fallbackModels ?? []).filter(m => m.slug);
    const llmRows = models.map(m => ({
      kind: 'model', key: `m:${m.id ?? m.slug}`, name: m.name, org: m.org, hay: norm(`${m.name} ${m.org} ${m.family ?? ''}`),
      rank: isNum(m.aa?.intelligence) ? 1000 + m.aa.intelligence : isNum(m.arena?.elo) ? m.arena.elo / 10 : isNum(m.elo) ? m.elo / 10 : 0,
      meta: [isNum(m.aa?.intelligence) ? `${m.aa.intelligence.toFixed(1)} index` : null, isNum(m.arena?.elo ?? m.elo) ? `${m.arena?.elo ?? m.elo} ELO` : null, isNum(m.priceBlended) ? `${fmtMetric('priceBlended', m.priceBlended)}/1M` : null].filter(Boolean).join(' · '),
      go: { type: 'model', slug: m.slug }, battle: m.id ? { id: m.id, kind: 'llm', name: m.name, org: m.org } : null,
    }));
    const orgs = new Map();
    for (const m of models) if (m.org && m.org !== 'Unknown') orgs.set(m.org, (orgs.get(m.org) ?? 0) + 1);
    const labRows = [...orgs].map(([org, n]) => ({ kind: 'lab', key: `l:${org}`, name: org, org, hay: norm(org), rank: n, meta: `${n} model${n > 1 ? 's' : ''}`, go: { type: 'lab', slug: labSlug(org) } }));
    const mediaRows = [];
    for (const [board, type, label] of [['text-to-image', 'images', 'Image'], ['image-edit', 'images', 'Image edit'], ['text-to-video', 'videos', 'Video'], ['image-to-video', 'videos', 'Image to video']]) {
      for (const r of media?.boards?.[board] ?? []) {
        mediaRows.push({ kind: 'media', key: `x:${board}:${r.id}`, name: r.name, org: r.org, hay: norm(`${r.name} ${r.org} ${label}`), rank: r.elo ?? 0,
          meta: `${label} · ${isNum(r.elo) ? `${r.elo} ELO` : ''}${isNum(r.rank) ? ` · #${r.rank}` : ''}`, go: { type, slug: r.id } });
      }
    }
    const pages = NAV_ITEMS.map(i => ({ kind: 'page', key: `p:${i.id}`, name: i.label, icon: i.icon, hay: norm(`${i.label} ${i.short ?? ''} ${i.desc} ${i.group}`), rank: 0, meta: i.desc, group: i.group, go: i.route ?? i.id }));
    return { llmRows, labRows, mediaRows, pages };
  }, [llms, media, fallbackModels]);

  const groups = useMemo(() => {
    const query = norm(q.trim());
    const tokens = query.split(/\s+/).filter(Boolean);
    const pick = (rows, n) => {
      if (!tokens.length) return [];
      return rows.map(r => ({ r, s: score(r.hay, r.name, query, tokens) })).filter(x => x.s >= 0)
        .sort((a, b) => b.s - a.s || b.r.rank - a.r.rank).slice(0, n).map(x => x.r);
    };
    if (!tokens.length) {
      const top = [...index.llmRows].sort((a, b) => b.rank - a.rank).slice(0, 6);
      return [
        { title: 'Arenas', rows: index.pages.filter(p => p.group === 'Arenas') },
        { title: 'Tools', rows: index.pages.filter(p => p.group === 'Tools') },
        { title: 'Smartest models', rows: top },
      ].filter(g => g.rows.length);
    }
    return [
      { title: 'Pages', rows: pick(index.pages, 5) },
      { title: 'Language models', rows: pick(index.llmRows, 8) },
      { title: 'Labs', rows: pick(index.labRows, 4) },
      { title: 'Image & video models', rows: pick(index.mediaRows, 5) },
    ].filter(g => g.rows.length);
  }, [q, index]);

  const flat = useMemo(() => groups.flatMap(g => g.rows), [groups]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="1"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = row => { if (!row) return; onClose(); onNavigate(row.go); };
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(flat.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') {
      if (e.target?.tagName === 'BUTTON') return; // the focused "+ Battle" button handles its own Enter
      e.preventDefault(); go(flat[active]);
    }
  };

  let k = -1;
  return (
    <div className="aw-cmd-veil" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Search">
      <div className="aw-cmd" onKeyDown={onKey}>
        <div className="aw-cmd-input">
          <Icon name="search" size={18} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search models, labs, pages…" spellCheck={false} autoComplete="off" aria-label="Search" />
          <kbd onClick={onClose} style={{ cursor: 'pointer' }}>ESC</kbd>
        </div>
        <div className="aw-cmd-list" ref={listRef}>
          {groups.length === 0 && <div className="aw-cmd-empty">Nothing matches “{q}”. Try a lab name, a model family or a page.</div>}
          {groups.map(g => (
            <div key={g.title}>
              <div className="aw-cmd-group">{g.title}</div>
              {g.rows.map(r => {
                k += 1;
                const i = k;
                return (
                  <div key={r.key} className="aw-cmd-row" data-active={i === active ? '1' : '0'} onMouseMove={() => setActive(i)} onClick={() => go(r)} role="option" aria-selected={i === active}>
                    <span className="aw-cmd-ico">
                      {r.kind === 'page' ? <Icon name={r.icon} size={16} /> : r.org ? <LabLogo org={r.org} size={15} /> : <Icon name="model" size={16} />}
                    </span>
                    <span className="aw-cmd-name">
                      <span>{r.name}</span>
                      {r.kind !== 'page' && r.kind !== 'lab' && r.org && <span className="aw-cmd-org">{r.org}</span>}
                    </span>
                    <span className="aw-cmd-meta">{r.meta}</span>
                    {r.battle && <span onClick={e => e.stopPropagation()}><AddToBattle item={r.battle} label="Battle" /></span>}
                    <span className="aw-cmd-kind">{r.kind === 'page' ? 'Open' : r.kind === 'lab' ? 'Lab' : r.kind === 'media' ? 'Model' : 'Model'}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="aw-cmd-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>ESC</kbd> close</span>
          <span style={{ marginLeft: 'auto' }}>{(llms?.models?.length ?? fallbackModels?.length ?? 0)} models indexed</span>
        </div>
      </div>
    </div>
  );
}
