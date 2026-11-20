// ─── useShell — which frame the site wears at this width ────────────────────
// phone  (< 600)   the top bar + drawer (NavBar), one column
// tablet (< 1100)  the same top bar, fluid content
// desktop (≥ 1100) a fixed sidebar on the left, a sticky top bar over the page
// The sidebar is full (labels) or a rail (icons); the visitor's choice is
// remembered, otherwise the rail is used below 1280 px.

import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';

export const DESKTOP_MIN = 1100;
export const SIDE_FULL = 236;
export const SIDE_RAIL = 64;

const viewportWidth = () => (typeof document === 'undefined' ? 1440 : document.documentElement.clientWidth || window.innerWidth);

/* one resize listener for every component that asks */
let width = viewportWidth();
const subs = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    const w = viewportWidth();
    if (w === width) return;
    width = w;
    for (const fn of subs) fn();
  }, { passive: true });
}
const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };
export function useViewportWidth() {
  return useSyncExternalStore(subscribe, () => width, () => width);
}

const PREF_KEY = 'aiwar-sidebar';
let pref = (() => { try { return localStorage.getItem(PREF_KEY); } catch { return null; } })();
const prefSubs = new Set();
function setPref(v) {
  pref = v;
  try { localStorage.setItem(PREF_KEY, v); } catch {}
  for (const fn of prefSubs) fn();
}
const subscribePref = fn => { prefSubs.add(fn); return () => prefSubs.delete(fn); };

export function useShell() {
  const w = useViewportWidth();
  const p = useSyncExternalStore(subscribePref, () => pref, () => pref);
  const desktop = w >= DESKTOP_MIN;
  const rail = desktop && (p ? p === 'rail' : w < 1280);
  const sideW = !desktop ? 0 : rail ? SIDE_RAIL : SIDE_FULL;
  return { width: w, desktop, rail, sideW, phone: w < 600, toggleRail: () => setPref(rail ? 'full' : 'rail') };
}

/** Publishes the sidebar width as --side-w so fixed layers (battle drawer, toasts) sit beside it. */
export function useSideVar(sideW) {
  // layout effect: the content must not paint at 0 px and then jump sideways
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--side-w', `${sideW}px`);
  }, [sideW]);
}

/** A tick every minute, for "updated 4 h ago" labels. */
export function useMinuteTick() {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set(n => n + 1), 60_000); return () => clearInterval(t); }, []);
}
