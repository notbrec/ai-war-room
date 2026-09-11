// ─── Speed Race — turn real measurements into race lanes ────────────────────
// The animation is normalised for UX (the winner always crosses in
// `baseMs`); the numbers on screen are the real values.

import { isNum, pctDiff } from './metrics.js';

export const RACE_CATEGORIES = [
  { id: 'llm-speed',   label: 'LLM output speed',      metric: 'speed',   pool: 'llm',   higherIsBetter: true,  unit: 'tok/s', desc: 'Tokens generated per second — more is faster.' },
  { id: 'llm-ttft',    label: 'First-token latency',   metric: 'ttft',    pool: 'llm',   higherIsBetter: false, unit: 's',     desc: 'Seconds until the first token arrives — less is faster.' },
  { id: 'image-gen',   label: 'Image generation',      metric: 'genTime', pool: 'image', higherIsBetter: false, unit: 's',     desc: 'Seconds to produce one image.' },
  { id: 'video-gen',   label: 'Video generation',      metric: 'genTime', pool: 'video', higherIsBetter: false, unit: 's',     desc: 'Seconds to produce one clip.' },
  { id: 'voice-gen',   label: 'Voice generation',      metric: 'ttft',    pool: 'tts',   higherIsBetter: false, unit: 's',     desc: 'Time to first audio.' },
  { id: 'stt-speed',   label: 'Transcription speed',   metric: 'rtfx',    pool: 'stt',   higherIsBetter: true,  unit: '×RT',   desc: 'Real-time factor — 100× means an hour of audio in 36 seconds.' },
  { id: 'coding-cost', label: 'Coding task cost',      metric: 'costPerTask', pool: 'coding', higherIsBetter: false, unit: '$', desc: 'Not a clock, but a race to the cheapest solved task.' },
];

/**
 * Build lanes. `entries` = [{ id, name, org, value }] with real values.
 * Returns lanes sorted by finishing order with:
 *   time      — real value
 *   finishMs  — animation finish time (winner = baseMs; others scaled by ratio, capped)
 *   ratio     — how many times slower than the winner (1 = winner)
 *   pctSlower — percent slower than the winner
 *   winner    — boolean
 */
export function buildLanes(entries, { higherIsBetter, baseMs = 3000, maxRatio = 6 } = {}) {
  const valid = entries.filter(e => isNum(e.value) && e.value > 0);
  if (!valid.length) return [];
  // "Effective time" is always something where lower = faster.
  const eff = e => (higherIsBetter ? 1 / e.value : e.value);
  const sorted = [...valid].sort((a, b) => eff(a) - eff(b));
  const best = eff(sorted[0]);
  return sorted.map((e, i) => {
    const ratio = eff(e) / best;
    const shown = Math.min(ratio, maxRatio);
    return {
      ...e,
      rank: i + 1,
      winner: i === 0,
      ratio,
      finishMs: Math.round(baseMs * shown),
      capped: ratio > maxRatio,
      pctSlower: i === 0 ? 0 : (ratio - 1) * 100,
      pctDiffVsWinner: pctDiff(sorted[0].value, e.value),
    };
  });
}

/** Position 0..1 of a lane at animation time t (ms), with an ease-out that keeps the ordering exact. */
export function laneProgress(lane, tMs) {
  if (!lane || lane.finishMs <= 0) return 0;
  return Math.max(0, Math.min(1, tMs / lane.finishMs));
}
