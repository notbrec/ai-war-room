// ─── Chart scale helpers shared by the SVG charts and the ranked bars ───────

import { metric, isNum } from '../../../shared/metrics.js';

/** "Nice" tick values between lo and hi (linear, or log10 with 1·2·5 steps). */
export function niceTicks(lo, hi, n = 5, log = false) {
  if (!isNum(lo) || !isNum(hi) || hi <= lo) return [];
  if (log) {
    const out = [];
    const a = Math.floor(Math.log10(Math.max(lo, 1e-9))), b = Math.ceil(Math.log10(hi));
    for (let e = a; e <= b; e++) for (const m of [1, 2, 5]) { const v = m * 10 ** e; if (v >= lo && v <= hi) out.push(v); }
    while (out.length > n + 3) for (let i = out.length - 2; i > 0; i -= 2) out.splice(i, 1);
    return out;
  }
  const span = hi - lo;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n + 1) ?? mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

/** Axis tick label for a metric key: $0.5 · 128K · 1.2s · 45% · 1,500 */
export function fmtTick(key, v) {
  const u = metric(key).unit ?? '';
  if (u.startsWith('$')) return v < 1 ? `$${+v.toFixed(3)}` : `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : +v.toFixed(v < 10 ? 1 : 0)}`;
  if (u === 'tokens') return v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(v);
  if (u === 's') return v < 1 ? `${Math.round(v * 1000)}ms` : `${+v.toFixed(1)}s`;
  if (u === '%') return `${+v.toFixed(1)}%`;
  if (u === 'votes') return v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(v);
  return Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : `${+v.toFixed(1)}`;
}

/** Compact number for scale captions and deltas: 1,506 · 12.5K · 1.0M · 0.75 */
export function fmtCompactNum(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return `${+(v / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${+(v / 1e3).toFixed(0)}K`;
  if (a >= 1e3) return Math.round(v).toLocaleString('en-US');
  if (Number.isInteger(v)) return String(v);
  return a >= 10 ? (+v.toFixed(1)).toString() : (+v.toFixed(2)).toString();
}

/** "Sep 3" from an ISO date. */
export function fmtDay(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Lab colour for a mark; xAI's white becomes the ink colour so it shows on both surfaces. */
export function labColor(org, orgConfig, fallback = 'var(--text)') {
  if (!org) return fallback;
  const c = orgConfig[org]?.color ?? '#8E8E93';
  return c.toUpperCase() === '#FFFFFF' ? 'var(--text)' : c;
}
