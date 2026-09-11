// ─── DataTable — one sortable, column-selectable table for every board ──────
// Columns: { key, label, short?, metricKey?, width?, align?, render?(row), value?(row), sticky?, default?, group?, mobile? }
// The first sticky column stays put while the rest scroll horizontally; the
// body renders in pages of `pageSize` so a 400-row board stays fast.

import { useEffect, useMemo, useRef, useState } from 'react';
import { MONO, SF, EASE } from '../design.jsx';
import { metric, isNum, NA } from '../../../shared/metrics.js';
import { InfoTip, Label, Btn } from '../ui.jsx';

const LS_PREFIX = 'aiwar-cols:';

export function useColumnSelection(tableId, columns) {
  const defaults = columns.filter(c => c.default !== false).map(c => c.key);
  const [visible, setVisible] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_PREFIX + tableId);
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return arr.filter(k => columns.some(c => c.key === k)); }
    } catch {}
    return defaults;
  });
  useEffect(() => { try { localStorage.setItem(LS_PREFIX + tableId, JSON.stringify(visible)); } catch {} }, [tableId, visible]);
  const toggle = key => setVisible(v => v.includes(key) ? v.filter(k => k !== key) : [...v, key]);
  const reset = () => setVisible(defaults);
  return { visible, toggle, reset, setVisible };
}

export function ColumnPicker({ columns, visible, toggle, reset }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  const groups = useMemo(() => {
    const g = new Map();
    for (const c of columns) { if (c.sticky) continue; const k = c.group ?? 'Columns'; if (!g.has(k)) g.set(k, []); g.get(k).push(c); }
    return [...g.entries()];
  }, [columns]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Btn small onClick={() => setOpen(o => !o)} title="Choose columns">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="3" height="10" stroke="currentColor"/><rect x="4.5" y="1" width="3" height="10" stroke="currentColor"/><rect x="8" y="1" width="3" height="10" stroke="currentColor"/></svg>
        Columns <span style={{ fontFamily: MONO, color: 'var(--muted)', fontSize: 10 }}>{visible.length}</span>
      </Btn>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 40, width: 300, maxHeight: 420, overflowY: 'auto',
          background: 'var(--card)', border: '0.5px solid var(--text)', boxShadow: 'var(--shadow)', padding: 10,
          animation: `aiwar-pop-in 260ms ${EASE} both`,
        }}>
          {groups.map(([g, cols]) => (
            <div key={g} style={{ marginBottom: 10 }}>
              <Label style={{ display: 'block', marginBottom: 6 }}>{g}</Label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {cols.map(c => {
                  const on = visible.includes(c.key);
                  return (
                    <button key={c.key} onClick={() => toggle(c.key)} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', background: on ? 'var(--hover)' : 'transparent',
                      border: '0.5px solid transparent', cursor: 'pointer', textAlign: 'left', fontFamily: SF, fontSize: 12, color: on ? 'var(--text)' : 'var(--muted)',
                    }}>
                      <span style={{ width: 10, height: 10, border: `1px solid ${on ? 'var(--text)' : 'var(--sep)'}`, background: on ? 'var(--text)' : 'transparent', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '0.5px solid var(--sep)' }}>
            <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.06em' }}>RESET DEFAULTS</button>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10.5, color: 'var(--text)', letterSpacing: '0.06em' }}>DONE</button>
          </div>
        </div>
      )}
    </div>
  );
}

function cellValue(col, row) {
  if (col.value) return col.value(row);
  return row[col.key];
}

export default function DataTable({
  columns, rows, visible, sort, onSort, onRowClick, rowKey = r => r.id,
  pageSize = 60, mobile = false, renderExpanded, expandedKey, emptyText = 'No rows match.', stripe, dense = false,
  highlightKey,
}) {
  const [shown, setShown] = useState(pageSize);
  useEffect(() => { setShown(pageSize); }, [rows, pageSize]);
  const cols = columns.filter(c => c.sticky || visible.includes(c.key)).filter(c => !mobile || c.mobile !== false);

  const sorted = useMemo(() => {
    if (!sort?.key) return rows;
    const col = columns.find(c => c.key === sort.key);
    if (!col) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = cellValue(col, a), vb = cellValue(col, b);
      const na = va == null || va === '' || (typeof va === 'number' && !Number.isFinite(va));
      const nb = vb == null || vb === '' || (typeof vb === 'number' && !Number.isFinite(vb));
      if (na && nb) return 0;
      if (na) return 1;           // unknown always sinks, whatever the direction
      if (nb) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [rows, sort, columns]);

  const clickSort = col => {
    if (!onSort || col.sortable === false) return;
    if (sort?.key === col.key) onSort({ key: col.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    else {
      // First click sorts "best first": higher-is-better → desc, lower-is-better → asc, text → asc.
      const m = col.metricKey ? metric(col.metricKey) : null;
      const dir = col.defaultDir ?? (m ? (m.higherIsBetter === false ? 'asc' : 'desc') : (col.numeric ? 'desc' : 'asc'));
      onSort({ key: col.key, dir });
    }
  };

  const padY = dense ? 7 : 10;
  return (
    <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', boxShadow: 'var(--shadow)' }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: cols.reduce((s, c) => s + (c.width ?? 100), 0), fontFamily: SF }}>
          <thead>
            <tr>
              {cols.map((c, i) => {
                const active = sort?.key === c.key;
                const m = c.metricKey ? metric(c.metricKey) : null;
                return (
                  <th key={c.key} onClick={() => clickSort(c)} style={{
                    position: c.sticky ? 'sticky' : undefined, left: c.sticky ? 0 : undefined, zIndex: c.sticky ? 3 : 1,
                    background: 'var(--card)', borderBottom: '1px solid var(--sep)', borderRight: c.sticky ? '0.5px solid var(--sep)' : undefined,
                    padding: `9px ${i === cols.length - 1 ? 14 : 8}px 9px ${i === 0 ? 14 : 8}px`, textAlign: c.align ?? (c.numeric ? 'right' : 'left'),
                    fontSize: 10, fontWeight: 700, color: active ? 'var(--text)' : 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em',
                    whiteSpace: 'nowrap', cursor: onSort && c.sortable !== false ? 'pointer' : 'default', userSelect: 'none', width: c.width, minWidth: c.width,
                  }} title={m ? `${m.label} — ${m.higherIsBetter === false ? 'lower is better' : m.higherIsBetter ? 'higher is better' : ''}` : undefined}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexDirection: (c.align ?? (c.numeric ? 'right' : 'left')) === 'right' ? 'row-reverse' : 'row' }}>
                      {c.metricKey && !mobile ? <InfoTip metricKey={c.metricKey} align={(c.align ?? (c.numeric ? 'right' : 'left')) === 'right' ? 'right' : 'left'}><span>{c.short ?? c.label}</span></InfoTip> : <span>{c.short ?? c.label}</span>}
                      {active && <span style={{ fontSize: 8, color: 'var(--text)' }}>{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={cols.length} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>{emptyText}</td></tr>
            )}
            {sorted.slice(0, shown).map((row, ri) => {
              const key = rowKey(row);
              const expanded = expandedKey != null && expandedKey === key;
              const hi = highlightKey ? highlightKey(row) : null;
              return (
                <RowGroup key={key}>
                  <tr onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className="aiwar-dt-row"
                    style={{ cursor: onRowClick ? 'pointer' : 'default', background: expanded ? 'var(--hover)' : (stripe && ri % 2 ? 'var(--sep2)' : 'transparent') }}>
                    {cols.map((c, i) => {
                      const v = cellValue(c, row);
                      const content = c.render ? c.render(row, v) : (v == null || v === '' ? <span style={{ color: 'var(--muted2)' }}>{NA}</span> : (isNum(v) ? v.toLocaleString() : String(v)));
                      return (
                        <td key={c.key} style={{
                          position: c.sticky ? 'sticky' : undefined, left: c.sticky ? 0 : undefined, zIndex: c.sticky ? 2 : undefined,
                          background: c.sticky ? (expanded ? 'var(--card2)' : 'var(--card)') : undefined,
                          borderRight: c.sticky ? '0.5px solid var(--sep)' : undefined,
                          borderBottom: '0.5px solid var(--sep2)', borderLeft: hi && i === 0 ? `3px solid ${hi}` : undefined,
                          padding: `${padY}px ${i === cols.length - 1 ? 14 : 8}px ${padY}px ${i === 0 ? (hi ? 11 : 14) : 8}px`,
                          textAlign: c.align ?? (c.numeric ? 'right' : 'left'), fontSize: 12.5, color: 'var(--text)', whiteSpace: 'nowrap',
                          fontVariantNumeric: 'tabular-nums', fontFamily: c.mono !== false && c.numeric ? MONO : SF, maxWidth: c.maxWidth, overflow: c.maxWidth ? 'hidden' : undefined, textOverflow: c.maxWidth ? 'ellipsis' : undefined,
                        }}>{content}</td>
                      );
                    })}
                  </tr>
                  {expanded && renderExpanded && (
                    <tr><td colSpan={cols.length} style={{ padding: 0, background: 'var(--card2)', borderBottom: '0.5px solid var(--sep)' }}>
                      <div style={{ padding: mobile ? '14px 14px 18px' : '18px 24px 22px', animation: `aiwar-pop-in 380ms ${EASE} both`, transformOrigin: 'top center' }}>{renderExpanded(row)}</div>
                    </td></tr>
                  )}
                </RowGroup>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > shown && (
        <div style={{ padding: 10, textAlign: 'center', borderTop: '0.5px solid var(--sep)' }}>
          <Btn small onClick={() => setShown(s => s + pageSize)}>Show {Math.min(pageSize, sorted.length - shown)} more <span style={{ fontFamily: MONO, color: 'var(--muted)', fontSize: 10 }}>{shown}/{sorted.length}</span></Btn>
        </div>
      )}
      <style>{`.aiwar-dt-row:hover td { background: var(--hover) !important; }`}</style>
    </div>
  );
}

function RowGroup({ children }) { return <>{children}</>; }
