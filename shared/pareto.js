// ─── Pareto frontier + best-value zone ──────────────────────────────────────
// Points are { x, y, ... }. `maxX` / `maxY` say whether larger is better on
// each axis; the frontier is the set of points not dominated by any other.

import { isNum } from './metrics.js';

export function paretoFrontier(points, { maxX = false, maxY = true } = {}) {
  const valid = points.filter(p => isNum(p.x) && isNum(p.y));
  const sx = maxX ? -1 : 1;
  const sy = maxY ? -1 : 1;
  // Sort by x in the "cheaper first" direction; tie-break by better y.
  const sorted = [...valid].sort((a, b) => (a.x - b.x) * sx || (a.y - b.y) * sy);
  const frontier = [];
  let bestY = null;
  for (const p of sorted) {
    if (bestY == null || (maxY ? p.y > bestY : p.y < bestY)) {
      frontier.push(p);
      bestY = p.y;
    }
  }
  return frontier;
}

/**
 * The "best value zone": points that are within `yTol` (fraction of the y
 * range) of the frontier's best y while sitting in the cheaper half of x.
 * Returns the bounding box { x0, x1, y0, y1 } or null.
 */
export function bestValueZone(points, { maxX = false, maxY = true, yTol = 0.15, xQuantile = 0.5 } = {}) {
  const valid = points.filter(p => isNum(p.x) && isNum(p.y));
  if (valid.length < 3) return null;
  const xs = valid.map(p => p.x).sort((a, b) => a - b);
  const ys = valid.map(p => p.y);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const yRange = yMax - yMin || 1;
  const xCut = xs[Math.floor((xs.length - 1) * xQuantile)];
  const bestY = maxY ? yMax : yMin;
  const yEdge = maxY ? bestY - yTol * yRange : bestY + yTol * yRange;
  return {
    x0: maxX ? xCut : xs[0],
    x1: maxX ? xs[xs.length - 1] : xCut,
    y0: maxY ? yEdge : yMin,
    y1: maxY ? yMax : yEdge,
  };
}

/** True if `p` lies inside a zone bbox. */
export function inZone(p, z) {
  return !!z && isNum(p.x) && isNum(p.y) && p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1;
}
