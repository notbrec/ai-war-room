// ─── Headline ranking ───────────────────────────────────────────────────────
// The site's #1 is the model with the highest Artificial Analysis Intelligence
// Index: AA benchmarks a release within days, while the arena needs weeks of
// votes before it rates one. Each model counts once, at its best effort level
// ("Claude Fable 5.2", not its low / medium / high / xHigh rows as well).
import { isNum } from '../../../shared/metrics.js';

/** Best record per lab+family by Intelligence Index, highest first. */
export function topByIntelligence(models, n = 10) {
  const best = new Map();
  for (const m of models ?? []) {
    if (!isNum(m.aa?.intelligence)) continue;
    const k = `${m.org}|${m.family ?? m.id}`;
    const cur = best.get(k);
    if (!cur || m.aa.intelligence > cur.aa.intelligence) best.set(k, m);
  }
  return [...best.values()].sort((a, b) => b.aa.intelligence - a.aa.intelligence).slice(0, n);
}

/** Shape the ChampionBout / hero fighters read: score + unit. */
export function asFighters(models, by = 'intelligence') {
  return models.map(m => by === 'intelligence'
    ? { ...m, score: m.aa.intelligence, unit: 'Intelligence', votesLabel: null }
    : { ...m, score: m.arena?.elo ?? m.elo, unit: 'ELO' });
}
