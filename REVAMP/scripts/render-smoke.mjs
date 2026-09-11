// Render every page to a string with real API data — catches runtime errors
// in data → UI mapping without a browser. Run with: npx vite-node scripts/render-smoke.mjs
import React from 'react';
import { renderToString } from 'react-dom/server';

// ── Minimal DOM stubs (the components only touch these in initialisers) ──
const store = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
globalThis.localStorage = store();
globalThis.sessionStorage = store();
globalThis.window = { innerWidth: 1280, location: { hash: '' }, matchMedia: () => ({ matches: true }), addEventListener() {}, removeEventListener() {}, scrollY: 0 };
globalThis.document = { documentElement: { classList: { contains: () => true, toggle() {}, add() {} } }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }), head: { appendChild() {} }, querySelector: () => null };
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.requestAnimationFrame = () => 0;

const { DOMAINS } = await import('../netlify/functions/lib/domains.js');
const api = await import('../src/data/api.js');

// Pre-populate the client cache with live data so hooks render the real thing synchronously.
for (const d of ['llms', 'media', 'coding', 'speech', 'providers', 'history', 'status']) {
  const t0 = Date.now();
  const data = await DOMAINS[d]();
  sessionStorage.setItem('aiwar-warroom-v1:' + d, JSON.stringify({ data, loadedAt: Date.now(), status: data.stale ? 'stale' : 'live', error: null }));
  console.log(`loaded ${d} in ${Date.now() - t0}ms`);
}
const llms = JSON.parse(sessionStorage.getItem('aiwar-warroom-v1:llms')).data;
const topSlug = llms.models[0].slug;
const topId = llms.models[0].id;

// Seed a battle roster so BattlePage renders a comparison.
localStorage.setItem('aiwar-battle-v1', JSON.stringify({ kind: 'llm', items: llms.models.slice(0, 3).map(m => ({ id: m.id, kind: 'llm', name: m.name, org: m.org })) }));

const pages = [
  ['WarRoomPage', () => import('../src/pages/WarRoomPage.jsx'), {}],
  ['LeaderboardPage', () => import('../src/pages/LeaderboardPage.jsx'), { liveModels: null }],
  ['CodeOpsPage', () => import('../src/pages/CodeOpsPage.jsx'), {}],
  ['MediaArenaPage:image', () => import('../src/pages/MediaArenaPage.jsx'), { kind: 'image' }],
  ['MediaArenaPage:video', () => import('../src/pages/MediaArenaPage.jsx'), { kind: 'video' }],
  ['VoiceCommsPage', () => import('../src/pages/VoiceCommsPage.jsx'), {}],
  ['ProviderWarPage', () => import('../src/pages/ProviderWarPage.jsx'), { slug: topId }],
  ['BenchmarksPage', () => import('../src/pages/BenchmarksPage.jsx'), {}],
  ['BattlePage', () => import('../src/pages/BattlePage.jsx'), {}],
  ['MissionPlannerPage', () => import('../src/pages/MissionPlannerPage.jsx'), {}],
  ['SpeedRacePage', () => import('../src/pages/SpeedRacePage.jsx'), {}],
  ['ModelPage', () => import('../src/pages/ModelPage.jsx'), { slug: topSlug, liveModels: null }],
  ['ModelPage:byId', () => import('../src/pages/ModelPage.jsx'), { slug: topId, liveModels: null }],
  ['ModelPage:missing', () => import('../src/pages/ModelPage.jsx'), { slug: 'does-not-exist', liveModels: null }],
];

let failed = 0;
for (const [name, load, props] of pages) {
  try {
    const mod = await load();
    const html = renderToString(React.createElement(mod.default, { onNavigate: () => {}, ...props }));
    const na = (html.match(/N\/A/g) || []).length;
    const zeros = (html.match(/>\$0</g) || []).length;
    console.log(`✓ ${name.padEnd(22)} ${String(html.length).padStart(7)} chars · N/A×${na} · "$0"×${zeros}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}: ${e.message}\n${e.stack.split('\n').slice(1, 6).join('\n')}`);
  }
}
console.log(failed ? `${failed} page(s) failed` : 'all pages rendered');
process.exit(failed ? 1 : 0);
