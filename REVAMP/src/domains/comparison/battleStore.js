// ─── Battle roster — up to four contestants of one kind ─────────────────────
// Persisted in localStorage so the roster survives navigation. Mixing kinds
// is refused: an image model can't fight an LLM on meaningful metrics.

import { useEffect, useState } from 'react';

const KEY = 'aiwar-battle-v1';
const MAX = 4;
const listeners = new Set();
let state = read();

function read() {
  try { const r = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (r && Array.isArray(r.items)) return r; } catch {}
  return { kind: null, items: [] };
}
function write(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  for (const fn of listeners) fn(state);
}

export const KIND_LABEL = { llm: 'LLM', image: 'Image model', video: 'Video model', stt: 'Speech-to-text', tts: 'Text-to-speech', coding: 'Coding agent', provider: 'Provider' };

export function getBattle() { return state; }
export function inBattle(id) { return state.items.some(i => i.id === id); }
export function battleFull() { return state.items.length >= MAX; }

/** Returns { ok, reason }. */
export function addToBattle(item) {
  if (!item?.id || !item?.kind) return { ok: false, reason: 'invalid' };
  if (state.items.some(i => i.id === item.id)) return { ok: true, reason: 'already' };
  if (state.kind && state.kind !== item.kind && state.items.length) return { ok: false, reason: `Battle already holds ${KIND_LABEL[state.kind] ?? state.kind}s — clear it to compare ${KIND_LABEL[item.kind] ?? item.kind}s.` };
  if (state.items.length >= MAX) return { ok: false, reason: `Battle is full (${MAX}). Remove one first.` };
  write({ kind: item.kind, items: [...state.items, { id: item.id, kind: item.kind, name: item.name, org: item.org, board: item.board ?? null }] });
  return { ok: true };
}
export function removeFromBattle(id) {
  const items = state.items.filter(i => i.id !== id);
  write({ kind: items.length ? state.kind : null, items });
}
export function clearBattle() { write({ kind: null, items: [] }); }
export function toggleBattle(item) { return inBattle(item.id) ? (removeFromBattle(item.id), { ok: true, removed: true }) : addToBattle(item); }

export function useBattle() {
  const [s, setS] = useState(state);
  useEffect(() => { listeners.add(setS); return () => listeners.delete(setS); }, []);
  return s;
}
