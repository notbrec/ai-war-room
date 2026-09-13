// ─── DataTable — one sortable, column-selectable table for every board ──────
// Columns: { key, label, short?, metricKey?, higherIsBetter?, width?, align?, numeric?, mono?,
//            render?(row, v), value?(row), sticky?, default?, group?, mobile?, sortable?, defaultDir?,
//            maxWidth?, bar?, barColor?, barWidth?, valueWidth? }
// The first sticky column stays put while the rest scroll horizontally; the
// body renders in pages of `pageSize` so a 400-row board stays fast.
//
// Presentation rules (shared by every board on the site):
//  • flat header on a solid tint, one hairline under it, the sorted column
//    underlined in ink — no gradients, no glass
//  • a group band above the header names the column families (Arena,
//    Pricing…) so a wide board reads in sections
//  • numbers are monospaced, tabular and right-aligned; unknown values print
//    N/A in the muted ink, never 0
//  • `bar: true` columns draw a data bar in front of the number — the bar is
//    the value's position within the column (min → max), the same language
//    as the ranked charts, so a table can be scanned like one
//  • when the table fits its container the header sticks under the nav bar;
//    when it must scroll sideways the first column sticks instead and casts a
//    shadow once you have scrolled

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
        <div className="aiwar-surface" style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 40, width: 300, maxHeight: 420, overflowY: 'auto',
          borderColor: 'var(--text)', padding: 10,
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
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label || c.short || c.key}</span>
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

/** True while the table is narrower than its wrapper — then the header can
 *  stick to the page instead of the wrapper being a scroll box. */
export function useFitsWidth(wrapRef, tableRef, deps = []) {
  const [fits, setFits] = useState(false);
  useLayoutEffect(() => {
    const wrap = wrapRef.current, table = tableRef.current;
    if (!wrap || !table) return;
    const check = () => setFits(table.scrollWidth <= wrap.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(wrap); ro.observe(table);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return fits;
}

/** Group band — one cell per run of same-group columns. */
function groupBands(cols) {
  const bands = [];
  for (const c of cols) {
    const g = c.sticky ? null : (c.group ?? null);
    const last = bands[bands.length - 1];
    if (last && last.group === g && !c.sticky && !last.sticky) last.span += 1;
    else bands.push({ group: g, span: 1, sticky: !!c.sticky, key: c.key });
  }
  return bands;
}

/** Muted N/A cell — every board prints unknowns the same way. */
export function NaCell() { return <span style={{ color: 'var(--muted2)' }}>{NA}</span>; }

export default function DataTable({
  columns, rows, visible, sort, onSort, onRowClick, rowKey = r => r.id,
  pageSize = 60, mobile = false, renderExpanded, expandedKey, emptyText = 'No rows match.', dense = false,
  highlightKey, stickyHeader = true, footer,
}) {
  const [shown, setShown] = useState(pageSize);
  useEffect(() => { setShown(pageSize); }, [rows, pageSize]);
  const cols = columns.filter(c => c.sticky || visible.includes(c.key)).filter(c => !mobile || c.mobile !== false);

  const wrapRef = useRef(null), tableRef = useRef(null);
  const fits = useFitsWidth(wrapRef, tableRef, [cols.length, mobile]);
  const [scrolledX, setScrolledX] = useState(false);
  const onScroll = e => { const s = e.currentTarget.scrollLeft > 2; if (s !== scrolledX) setScrolledX(s); };

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

  // per-column extent for the data bars (over every row, not just the page)
  const barExt = useMemo(() => {
    const out = {};
    for (const c of cols) {
      if (!c.bar) continue;
      const xs = rows.map(r => cellValue(c, r)).filter(isNum);
      if (xs.length < 2) continue;
      const lo = Math.min(...xs), hi = Math.max(...xs);
      if (hi > lo) out[c.key] = [lo, hi];
    }
    return out;
  }, [cols, rows]);
  const barRatio = (c, v) => {
    const ext = barExt[c.key];
    if (!ext || !isNum(v)) return null;
    return 0.05 + ((v - ext[0]) / (ext[1] - ext[0])) * 0.95;
  };

  const dirOf = c => c.higherIsBetter ?? (c.metricKey ? metric(c.metricKey).higherIsBetter : null);
  const clickSort = col => {
    if (!onSort || col.sortable === false) return;
    if (sort?.key === col.key) onSort({ key: col.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    else {
      // First click sorts "best first": higher-is-better → desc, lower-is-better → asc, text → asc.
      const d = dirOf(col);
      const dir = col.defaultDir ?? (d === false ? 'asc' : d === true ? 'desc' : (col.numeric ? 'desc' : 'asc'));
      onSort({ key: col.key, dir });
    }
  };

  const bands = groupBands(cols);
  const showBands = !mobile && bands.filter(b => b.group).length >= 2;
  const padY = dense ? 7 : 10;
  const alignOf = c => c.align ?? (c.numeric ? 'right' : 'left');
  const stickTop = stickyHeader && fits;
  const bandH = showBands ? 22 : 0;
  // first column of each non-sticky group gets a hairline to its left
  const groupStart = new Set();
  { let prev = null; for (const c of cols) { const g = c.sticky ? '__s' : (c.group ?? null); if (g !== prev && !c.sticky && prev !== null) groupStart.add(c.key); prev = g; } }

  return (
    <div className="aiwar-surface aiwar-dt">
      <div ref={wrapRef} className="aiwar-dt-scroll" data-scrolled={scrolledX ? '1' : '0'} onScroll={onScroll}
        style={{ overflowX: fits ? 'visible' : 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table ref={tableRef} style={{ width: '100%', minWidth: cols.reduce((s, c) => s + (c.width ?? 100), 0), fontFamily: SF }}>
          <thead>
            {showBands && (
              <tr className="aiwar-dt-groups">
                {bands.map((b, i) => (
                  <th key={b.key} className={b.sticky ? 'aiwar-dt-stick' : undefined} colSpan={b.span} style={{
                    position: (b.sticky || stickTop) ? 'sticky' : undefined, left: b.sticky ? 0 : undefined, top: stickTop ? 'var(--nav-h, 0px)' : undefined, zIndex: b.sticky ? 5 : 3,
                    height: bandH, padding: '0 10px', textAlign: 'left', borderBottom: '0.5px solid var(--sep)',
                    borderLeft: i > 0 && !b.sticky ? '0.5px solid var(--sep)' : undefined,
                    fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted2)', whiteSpace: 'nowrap',
                  }}>{b.sticky ? '' : b.group}</th>
                ))}
              </tr>
            )}
            <tr>
              {cols.map((c, i) => {
                const active = sort?.key === c.key;
                const sortable = !!onSort && c.sortable !== false;
                const m = c.metricKey ? metric(c.metricKey) : null;
                const d = dirOf(c);
                const align = alignOf(c);
                const dirText = d === false ? 'lower is better' : d === true ? 'higher is better' : '';
                const title = [m ? `${m.label}${dirText ? ` — ${dirText}` : ''}` : (dirText || null), c.bar ? 'bar = position within this column' : null].filter(Boolean).join(' · ') || undefined;
                return (
                  <th key={c.key} onClick={() => clickSort(c)} className={[c.sticky ? 'aiwar-dt-stick' : '', sortable ? 'aiwar-dt-sortable' : ''].join(' ').trim() || undefined} title={title} style={{
                    position: (c.sticky || stickTop) ? 'sticky' : undefined, left: c.sticky ? 0 : undefined, top: stickTop ? `calc(var(--nav-h, 0px) + ${bandH}px)` : undefined,
                    zIndex: c.sticky ? 5 : 3,
                    borderBottom: `1px solid ${active ? 'var(--text)' : 'var(--sep)'}`, borderRight: c.sticky ? '0.5px solid var(--sep)' : undefined,
                    borderLeft: groupStart.has(c.key) ? '0.5px solid var(--sep)' : undefined,
                    padding: `${dense ? 8 : 10}px ${i === cols.length - 1 ? 14 : 10}px ${dense ? 7 : 9}px ${i === 0 ? 14 : 10}px`, textAlign: align,
                    fontSize: 10.5, fontWeight: 600, color: active ? 'var(--text)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO,
                    whiteSpace: 'nowrap', cursor: sortable ? 'pointer' : 'default', userSelect: 'none', width: c.width, minWidth: c.width,
                    transition: 'color 160ms ease, border-color 160ms ease',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
                      {c.metricKey && !mobile ? <InfoTip metricKey={c.metricKey} align={align === 'right' ? 'right' : 'left'}><span>{c.short ?? c.label}</span></InfoTip> : <span>{c.short ?? c.label}</span>}
                      {sortable && (
                        <svg className="aiwar-dt-sortglyph" data-on={active ? '1' : '0'} width="8" height="10" viewBox="0 0 8 10" aria-hidden style={{ flexShrink: 0, color: 'var(--text)' }}>
                          <path d="M4 0 L7.5 4 H0.5 Z" fill="currentColor" opacity={active && sort.dir === 'asc' ? 1 : 0.25} />
                          <path d="M4 10 L0.5 6 H7.5 Z" fill="currentColor" opacity={active && sort.dir === 'desc' ? 1 : 0.25} />
                        </svg>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={cols.length} style={{ padding: '44px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>{emptyText}</td></tr>
            )}
            {sorted.slice(0, shown).map((row) => {
              const key = rowKey(row);
              const expanded = expandedKey != null && expandedKey === key;
              const hi = highlightKey ? highlightKey(row) : null;
              return (
                <Fragment key={key}>
                  <tr onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className="aiwar-dt-row" data-expanded={expanded ? '1' : '0'}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
                    {cols.map((c, i) => {
                      const v = cellValue(c, row);
                      const content = c.render ? c.render(row, v) : (v == null || v === '' ? <NaCell /> : (isNum(v) ? v.toLocaleString('en-US') : String(v)));
                      const ratio = c.bar ? barRatio(c, v) : null;
                      const align = alignOf(c);
                      return (
                        <td key={c.key} className={c.sticky ? 'aiwar-dt-stick' : undefined} style={{
                          position: c.sticky ? 'sticky' : undefined, left: c.sticky ? 0 : undefined, zIndex: c.sticky ? 2 : undefined,
                          background: c.sticky ? (expanded ? 'var(--card2)' : 'var(--surface-bot)') : undefined,
                          borderRight: c.sticky ? '0.5px solid var(--sep)' : undefined,
                          borderLeft: hi && i === 0 ? `3px solid ${hi}` : groupStart.has(c.key) ? '0.5px solid var(--sep2)' : undefined,
                          borderBottom: '0.5px solid var(--sep2)',
                          padding: `${padY}px ${i === cols.length - 1 ? 14 : 10}px ${padY}px ${i === 0 ? (hi ? 11 : 14) : 10}px`,
                          textAlign: align, fontSize: dense ? 12.5 : 13, color: 'var(--text)', whiteSpace: 'nowrap', lineHeight: 1.3,
                          fontVariantNumeric: 'tabular-nums', fontFamily: c.mono !== false && c.numeric ? MONO : SF, maxWidth: c.maxWidth, overflow: c.maxWidth ? 'hidden' : undefined, textOverflow: c.maxWidth ? 'ellipsis' : undefined,
                        }}>
                          {ratio != null ? (
                            <span className="aiwar-dt-cell-bar">
                              <span className="aiwar-bar-track" aria-hidden style={{ width: c.barWidth ?? 44, color: c.barColor ?? 'var(--text)' }}><span style={{ width: `${(ratio * 100).toFixed(1)}%` }} /></span>
                              <span className="aiwar-dt-val" style={{ minWidth: c.valueWidth ?? 40 }}>{content}</span>
                            </span>
                          ) : content}
                        </td>
                      );
                    })}
                  </tr>
                  {expanded && renderExpanded && (
                    <tr><td colSpan={cols.length} style={{ padding: 0, background: 'var(--card2)', borderBottom: '0.5px solid var(--sep)' }}>
                      <div style={{ padding: mobile ? '14px 14px 18px' : '18px 24px 22px', animation: `aiwar-pop-in 380ms ${EASE} both`, transformOrigin: 'top center' }}>{renderExpanded(row)}</div>
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > shown && (
        <div className="aiwar-dt-more">
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.04em' }}>{shown} / {sorted.length}</span>
          <span className="aiwar-dt-progress"><span style={{ width: `${(shown / sorted.length * 100).toFixed(1)}%` }} /></span>
          <Btn small onClick={() => setShown(s => s + pageSize)}>Show {Math.min(pageSize, sorted.length - shown)} more</Btn>
          {sorted.length - shown > pageSize && <Btn small onClick={() => setShown(sorted.length)} style={{ color: 'var(--muted)' }}>All</Btn>}
        </div>
      )}
      {footer && <div className="aiwar-dt-foot">{footer}</div>}
    </div>
  );
}
