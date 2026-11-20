// ─── The app's navigate(), reachable from components that are not handed it
// (reading layouts, rails). App registers it once on mount.
let current = null;
export function setNavigator(fn) { current = fn; }
export function go(target) {
  if (current) return current(target);
  // before App mounts (never in practice): fall back to the hash router
  const t = typeof target === 'string' ? { type: target } : target;
  window.location.hash = t.type === 'home' ? '' : `#/${t.type}${t.slug ? `/${encodeURIComponent(t.slug)}` : ''}`;
}
