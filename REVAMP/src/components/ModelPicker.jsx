// ─── ModelPicker — choose exactly which models every chart shows ─────────────
// Type a name, pick from the list, and the selection replaces the "Top N"
// cut in every section of the page. Empty selection = Top N. Presets fill
// the selection in one click; the choice survives navigation (session).

import { useEffect, useMemo, useRef, useState } from 'react';
import { MONO, SF, EASE } from './design.jsx';
import { LabLogo } from './LabLogo.jsx';
import { Label, Chip, Btn } from './ui.jsx';
import { isNum } from '../../shared/metrics.js';

const KEY = 'aiwar-picked-llm-v1';

export function useModelPick(models) {
  const [ids, setIds] = useState(() => { try { const a = JSON.parse(sessionStorage.getItem(KEY) ?? '[]'); return Array.isArray(a) ? a : []; } catch { return []; } });
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(ids)); } catch {} }, [ids]);
  const byId = useMemo(() => new Map(models.map(m => [m.id, m])), [models]);
  const picked = useMemo(() => ids.map(id => byId.get(id)).filter(Boolean), [ids, byId]);
  return {
    ids, picked,
    add: id => setIds(a => (a.includes(id) ? a : [...a, id])),
    remove: id => setIds(a => a.filter(x => x !== id)),
    clear: () => setIds([]),
    set: list => setIds(list.map(m => m.id)),
  };
}

const elo = m => m.arena?.elo ?? -1;

export const PRESETS = [
  { id: 'top10',  label: 'Top 10',        pick: ms => [...ms].filter(m => m.inArena).sort((a, b) => elo(b) - elo(a)).slice(0, 10) },
  { id: 'labs',   label: 'Best per lab',  pick: ms => { const seen = new Set(); return [...ms].filter(m => m.inArena).sort((a, b) => elo(b) - elo(a)).filter(m => !seen.has(m.org) && seen.add(m.org)).slice(0, 12); } },
  { id: 'open',   label: 'Open weights',  pick: ms => [...ms].filter(m => m.inArena && m.isOpen).sort((a, b) => elo(b) - elo(a)).slice(0, 10) },
  { id: 'cheap',  label: 'Under $1/M',    pick: ms => [...ms].filter(m => m.inArena && isNum(m.priceBlended) && m.priceBlended <= 1).sort((a, b) => elo(b) - elo(a)).slice(0, 10) },
  { id: 'think',  label: 'Reasoning',     pick: ms => [...ms].filter(m => m.inArena && m.isThinking).sort((a, b) => elo(b) - elo(a)).slice(0, 10) },
];

export default function ModelPicker({ models, pick, mobile }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const ref = useRef(null);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const taken = new Set(pick.ids);
    return models.filter(m => !taken.has(m.id) && (`${m.name} ${m.org}`.toLowerCase().includes(s)))
      .sort((a, b) => elo(b) - elo(a)).slice(0, 8);
  }, [q, models, pick.ids]);
  useEffect(() => { setCursor(0); }, [q]);
  useEffect(() => {
    if (!open) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const choose = m => { pick.add(m.id); setQ(''); setOpen(false); };
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(results.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
    else if (e.key === 'Enter' && results[cursor]) { e.preventDefault(); choose(results[cursor]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={ref} style={{ fontFamily: SF }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: mobile ? '1 1 100%' : '0 1 340px', minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, paddingInline: 10, background: 'var(--bg)', border: `0.5px solid ${open ? 'var(--text)' : 'var(--sep)'}`, transition: 'border-color 200ms' }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--muted2)', flexShrink: 0 }}>+</span>
            <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
              placeholder={pick.ids.length ? 'Add another model…' : 'Add a model to the charts…'}
              style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--text)', fontFamily: SF, letterSpacing: '-0.01em' }} />
          </div>
          {open && results.length > 0 && (
            <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60, background: 'var(--card)', border: '0.5px solid var(--sep)', boxShadow: 'var(--shadow)', padding: 4, animation: `aiwar-pop-in 200ms ${EASE} both` }}>
              {results.map((m, i) => (
                <button key={m.id} role="option" aria-selected={i === cursor} onMouseEnter={() => setCursor(i)} onClick={() => choose(m)} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 9px', background: i === cursor ? 'var(--hover)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: SF }}>
                  <LabLogo org={m.org} size={13} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{m.org}</span>
                  {isNum(m.arena?.elo) && <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{m.arena.elo}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <Label style={{ marginRight: 4 }}>Presets</Label>
          {PRESETS.map(p => <Chip key={p.id} small label={p.label} onClick={() => pick.set(p.pick(models))} />)}
        </div>
      </div>

      {pick.picked.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <Label style={{ marginRight: 4 }}>{pick.picked.length} selected</Label>
          {pick.picked.map(m => (
            <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, paddingInline: '8px 4px', background: 'var(--text)', color: 'var(--bg)', fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em', animation: `aiwar-pop-in 200ms ${EASE} both` }}>
              <LabLogo org={m.org} size={11} color="var(--bg)" />
              {m.name}
              <button onClick={() => pick.remove(m.id)} aria-label={`Remove ${m.name}`} style={{ width: 20, height: 20, background: 'none', border: 'none', color: 'var(--bg)', cursor: 'pointer', opacity: 0.7, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          <Btn small onClick={pick.clear}>Clear</Btn>
        </div>
      )}
    </div>
  );
}
