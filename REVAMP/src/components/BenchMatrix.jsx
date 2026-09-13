// ─── BenchMatrix — the capability grid, shaded ──────────────────────────────
// Rows are models, columns are benchmarks; each cell is tinted by where it
// sits within its column (one hue, light → dark), so a strong column reads
// as a stripe and the column leader carries a ring. Columns with no value
// for any row are dropped rather than shown as N/A.

import { useMemo, useRef, useState } from 'react';
import { MONO, SF } from './design.jsx';
import { LabLogo } from './LabLogo.jsx';
import { SourceTag, GREEN } from './ui.jsx';
import { fmtMetric, isNum, NA } from '../../shared/metrics.js';
import { useFitsWidth } from './table/DataTable.jsx';

export function fmtBench(b, v) {
  if (!isNum(v)) return NA;
  if (b.unit === '%') return `${v.toFixed(1)}%`;
  if (b.unit === 'Elo') return String(Math.round(v));
  if (b.unit === 'tokens') return fmtMetric('context', v);
  return v.toFixed(1);
}

const RAMP = a => `rgba(94,158,112,${a.toFixed(3)})`;

export default function BenchMatrix({ rows, benches, valueOf, mobile, onOpen }) {
  const cols = useMemo(() => benches.filter(b => rows.some(r => isNum(valueOf(b, r)))), [benches, rows, valueOf]);
  const [sortId, setSortId] = useState(null);
  const sortBy = cols.find(c => c.id === sortId) ?? cols[0];
  const wrapRef = useRef(null), tableRef = useRef(null);
  const fits = useFitsWidth(wrapRef, tableRef, [cols.length, mobile]);
  const [scrolledX, setScrolledX] = useState(false);

  const table = useMemo(() => {
    const vals = rows.map(m => ({ m, v: Object.fromEntries(cols.map(b => [b.id, valueOf(b, m)])) }));
    const ext = Object.fromEntries(cols.map(b => {
      const xs = vals.map(r => r.v[b.id]).filter(isNum);
      return [b.id, [Math.min(...xs), Math.max(...xs)]];
    }));
    const best = Object.fromEntries(cols.map(b => [b.id, b.higher ? ext[b.id][1] : ext[b.id][0]]));
    if (sortBy) vals.sort((a, c) => {
      const x = a.v[sortBy.id], y = c.v[sortBy.id];
      if (!isNum(x)) return 1; if (!isNum(y)) return -1;
      return sortBy.higher ? y - x : x - y;
    });
    return { vals, ext, best };
  }, [rows, cols, valueOf, sortBy]);

  const strength = (b, v) => {
    if (!isNum(v)) return 0;
    const [lo, hi] = table.ext[b.id];
    const n = hi === lo ? 1 : (v - lo) / (hi - lo);
    return b.higher ? n : 1 - n;
  };
  const tint = (b, v) => (isNum(v) ? RAMP(0.06 + strength(b, v) * 0.30) : 'transparent');

  if (!cols.length) return null;
  const headTop = fits ? 'var(--nav-h, 0px)' : undefined;
  const thBase = { position: 'sticky', top: headTop, zIndex: 3, background: 'var(--th-bg)', borderBottom: '1px solid var(--sep)', fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap', userSelect: 'none' };
  const shortLabel = b => b.label.replace(/^(Arena|Design Arena) · /, '').replace(' (best harness)', '').replace(' (spec)', '');
  return (
    <div className="aiwar-surface aiwar-dt" style={{ fontFamily: SF }}>
      <div ref={wrapRef} className="aiwar-dt-scroll" data-scrolled={scrolledX ? '1' : '0'} onScroll={e => { const s = e.currentTarget.scrollLeft > 2; if (s !== scrolledX) setScrolledX(s); }}
        style={{ overflowX: fits ? 'visible' : 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table ref={tableRef} style={{ width: '100%', minWidth: 170 + cols.length * 104 }}>
          <thead>
            <tr>
              <th className="aiwar-dt-stick" style={{ ...thBase, left: 0, zIndex: 5, textAlign: 'left', padding: mobile ? '10px 12px' : '10px 16px', color: 'var(--muted)', minWidth: mobile ? 170 : 240, borderRight: '0.5px solid var(--sep)' }}>Model</th>
              {cols.map(b => {
                const on = sortBy?.id === b.id;
                return (
                  <th key={b.id} onClick={() => setSortId(b.id)} title={`${b.label} — ${b.higher ? 'higher' : 'lower'} is better${b.desc ? ` · ${b.desc}` : ''}`} className="aiwar-dt-sortable" style={{ ...thBase, cursor: 'pointer', textAlign: 'right', padding: mobile ? '10px 10px' : '10px 14px', borderBottom: `1px solid ${on ? 'var(--text)' : 'var(--sep)'}`, color: on ? 'var(--text)' : 'var(--muted)', transition: 'color 160ms ease, border-color 160ms ease' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexDirection: 'row-reverse' }}>
                      <span>{shortLabel(b)}</span>
                      <svg className="aiwar-dt-sortglyph" data-on={on ? '1' : '0'} width="8" height="10" viewBox="0 0 8 10" aria-hidden style={{ flexShrink: 0, color: 'var(--text)' }}>
                        <path d="M4 0 L7.5 4 H0.5 Z" fill="currentColor" opacity={on && !b.higher ? 1 : 0.25} />
                        <path d="M4 10 L0.5 6 H7.5 Z" fill="currentColor" opacity={on && b.higher ? 1 : 0.25} />
                      </svg>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {table.vals.map(({ m, v }, i) => (
              <tr key={m.id} onClick={() => onOpen?.(m)} className="aiwar-dt-row" style={{ cursor: onOpen ? 'pointer' : 'default' }}>
                <td className="aiwar-dt-stick" style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface-bot)', padding: mobile ? '7px 12px' : '8px 16px', borderBottom: '0.5px solid var(--sep2)', borderRight: '0.5px solid var(--sep)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: i === 0 ? 'var(--text)' : 'var(--muted2)', fontWeight: i === 0 ? 700 : 500, width: 18, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                    <LabLogo org={m.org} size={13} />
                    <span style={{ fontSize: 12.5, fontWeight: i === 0 ? 700 : 500, color: 'var(--text)', letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 120 : 200 }}>{m.name}</span>
                  </span>
                </td>
                {cols.map(b => {
                  const x = v[b.id], has = isNum(x), lead = has && x === table.best[b.id];
                  return (
                    <td key={b.id} style={{ textAlign: 'right', padding: mobile ? '5px 8px' : '5px 10px', borderBottom: '0.5px solid var(--sep2)', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block', minWidth: mobile ? 52 : 64, padding: '4px 8px', textAlign: 'right',
                        background: tint(b, x), boxShadow: lead ? `inset 0 0 0 1px ${GREEN}` : undefined,
                        fontFamily: MONO, fontSize: 12.5, fontWeight: lead ? 700 : has ? 500 : 400, color: has ? 'var(--text)' : 'var(--muted2)', fontVariantNumeric: 'tabular-nums',
                      }}>{fmtBench(b, x)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="aiwar-dt-foot">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-flex', gap: 1 }}>{[0.08, 0.16, 0.26, 0.36].map(a => <span key={a} style={{ width: 9, height: 9, background: RAMP(a) }} />)}</span>
          weaker → stronger within the column
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, boxShadow: `inset 0 0 0 1px ${GREEN}` }} /> column leader</span>
        <span>click a header to sort</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>{[...new Set(cols.map(b => b.source))].map(s => <SourceTag key={s} id={s} />)}</span>
      </div>
    </div>
  );
}
