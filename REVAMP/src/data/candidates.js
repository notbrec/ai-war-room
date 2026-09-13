// ─── Candidate pools for shared/recommend.js ────────────────────────────────
// One place that turns merged dataset rows into { id, name, org, metrics }
// candidates, so the home picks, the situation board and the Mission
// Planner all score exactly the same inputs.

import { isNum } from '../../shared/metrics.js';

export function llmCandidates(models) {
  return models.filter(m => m.inArena || isNum(m.aa?.intelligence)).map(m => ({
    id: m.id, name: m.name, org: m.org, slug: m.slug, isReasoning: m.isThinking, kind: 'llm', m,
    metrics: {
      elo: m.arena?.elo, intelligence: m.aa?.intelligence, codingIndex: m.aa?.codingIndex, agenticIndex: m.aa?.agenticIndex,
      priceBlended: m.priceBlended, priceIn: m.priceIn, speed: m.aa?.speed, ttft: m.aa?.ttft, context: m.context, open: m.isOpen,
    },
  }));
}

export function mediaCandidates(rows, kind) {
  return rows.map(r => ({
    id: r.id, name: r.name, org: r.org, kind, board: r.board, m: r,
    metrics: { elo: r.elo, pricePerImage: r.pricePerImage, pricePerSecond: r.pricePerSecond, genTime: r.genTime, open: r.isOpen },
  }));
}

export function ttsCandidates(rows) {
  return rows.map(r => ({
    id: r.modelId ?? r.id, name: r.name, org: r.org, kind: 'tts', m: r,
    metrics: { ttsQuality: r.elo, pricePer1mChars: r.pricePer1mChars, ttft: r.ttft, open: r.isOpen },
  }));
}

export function sttCandidates(rows) {
  return rows.map(r => ({
    id: r.id, name: r.name, org: r.org, kind: 'stt', m: r,
    metrics: { wer: r.wer, rtfx: r.rtfx, pricePerMinute: null, open: r.isOpen },
  }));
}

/** Rows for a mission pool, given the three domain envelopes. */
export function poolFor(pool, { llms, media, speech }) {
  switch (pool) {
    case 'llm':        return llmCandidates(llms.models);
    case 'image':      return mediaCandidates(media.boards?.['text-to-image'] ?? [], 'image');
    case 'image-edit': return mediaCandidates(media.boards?.['image-edit'] ?? [], 'image');
    case 'video':      return mediaCandidates(media.boards?.['text-to-video'] ?? [], 'video');
    case 'tts':        return ttsCandidates(speech.tts);
    case 'stt':        return sttCandidates(speech.stt);
    default:           return [];
  }
}
