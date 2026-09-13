// ─── BenchMatrix — the capability grid, shaded ──────────────────────────────
// Rows are models, columns are benchmarks; each cell is tinted by where it
// sits within its column, so the strong column reads as a green stripe.
// Columns with no value for any row are dropped rather than shown as N/A.

import { useMemo, useState } from 'react';
import { MONO, SF } from './design.jsx';
import { LabLogo } from './LabLogo.jsx';
import { SourceTag, GREEN } from './ui.jsx';
import { fmtMetric, isNum, NA } from '../../shared/metrics.js';

export function fmtBench(b, v) {
  if (!isNum(v)) return NA;
  if (b.unit === '%') return `${v.toFixed(1)}%`;
  if (b.unit === 'Elo') return String(Math.round(v));
  if (b.unit === 'tokens') return fmtMetric('context', v);
  return v.toFixed(1);
}

export default function BenchMatrix({ rows, benches, valueOf, mobile, onOpen }) {
  const cols = useMemo(() => benches.filter(b => rows.some(r => isNum(valueOf(b, r)))), [benches, rows, valueOf]);
  const [sortId, setSortId] = useState(null);
  const sortBy = cols.find(c => c.id === sortId) ?? cols[0];

  const table = useMemo(() => {
    const vals = rows.map(m => ({ m, v: Object.fromEntries(cols.map(b => [b.id, valueOf(b, m)])) }));
    const ext = Object.fromEntries(cols.map(b => {
      const xs = vals.map(r => r.v[b.id]).filter(isNum);
      return [b.id, [Math.min(...xs), Math.max(...xs)]];
    }));
    if (sortBy) vals.sort((a, c) => {
      const x = a.v[sortBy.id], y = c.v[sortBy.id];
      if (!isNum(x)) return 1; if (!isNum(y)) return -1;
      return sortBy.higher ? y - x : x - y;
    });
    return { vals, ext };
  }, [rows, cols, valueOf, sortBy]);

  const tint = (b, v) => {
    if (!isNum(v)) return 'transparent';
    const [lo, hi] = table.ext[b.id];
    const n = hi === lo ? 1 : (v - lo) / (hi - lo);
    const k = b.higher ? n : 1 - n;
    return `rgba(94,158,112,${(0.06 + k * 0.34).toFixed(3)})`;
  };

  if (!cols.length) return null;
  return (
    <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', overflowX: 'auto', fontFamily: SF }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 160 + cols.length * 96 }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--card)', textAlign: 'left', padding: mobile ? '10px 12px' : '12px 16px', borderBottom: '0.5px solid var(--sep)', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted2)', textTransform: 'uppercase', minWidth: mobile ? 170 : 230 }}>Model</th>
            {cols.map(b => (
              <th key={b.id} onClick={() => setSortId(b.id)} title={b.desc} style={{ cursor: 'pointer', textAlign: 'right', padding: mobile ? '10px 10px' : '12px 14px', borderBottom: `0.5px solid ${sortBy?.id === b.id ? 'var(--text)' : 'var(--sep)'}`, fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: sortBy?.id === b.id ? 'var(--text)' : 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', userSelect: 'none' }}>
                {b.label.replace(/^(Arena|Design Arena) · /, '').replace(' (best harness)', '').replace(' (spec)', '')}{sortBy?.id === b.id ? ' ▾' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.vals.map(({ m, v }, i) => (
            <tr key={m.id} onClick={() => onOpen?.(m)} style={{ cursor: onOpen ? 'pointer' : 'default' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--card)', padding: mobile ? '8px 12px' : '9px 16px', borderBottom: '0.5px solid var(--sep2)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)', width: 18, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
                  <LabLogo org={m.org} size={13} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 120 : 190 }}>{m.name}</span>
                </span>
              </td>
              {cols.map(b => (
                <td key={b.id} style={{ textAlign: 'right', padding: mobile ? '8px 10px' : '9px 14px', borderBottom: '0.5px solid var(--sep2)', background: tint(b, v[b.id]), fontFamily: MONO, fontSize: 12, fontWeight: isNum(v[b.id]) ? 700 : 500, color: isNum(v[b.id]) ? 'var(--text)' : 'var(--muted2)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {fmtBench(b, v[b.id])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '9px 14px', borderTop: '0.5px solid var(--sep)', fontSize: 10.5, color: 'var(--muted2)', fontFamily: MONO }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, background: GREEN, opacity: 0.4 }} /> darker = stronger within the column</span>
        <span>·</span>
        <span>click a header to sort</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>{[...new Set(cols.map(b => b.source))].map(s => <SourceTag key={s} id={s} />)}</span>
      </div>
    </div>
  );
}
