// ─── The site map — one list for the sidebar, the phone drawer, the top bar
// titles and the command palette, so a page is named the same everywhere.

export const NAV = [
  {
    group: 'Arenas',
    items: [
      { id: 'home',        label: 'War Room',     short: 'War Room',   icon: 'room',   prefetch: 'llms',      desc: 'Every front on one board' },
      { id: 'leaderboard', label: 'LLM Rankings', short: 'LLMs',       icon: 'llm',    prefetch: 'llms',      desc: 'Language models by intelligence, ELO, price and speed' },
      { id: 'coding',      label: 'Code Ops',     short: 'Code',       icon: 'code',   prefetch: 'coding',    desc: 'Coding agents and models on SWE-bench' },
      { id: 'images',      label: 'Image Arena',  short: 'Image',      icon: 'image',  prefetch: 'media',     desc: 'Text-to-image and image editing' },
      { id: 'videos',      label: 'Video Arena',  short: 'Video',      icon: 'video',  prefetch: 'media',     desc: 'Text-to-video and image-to-video' },
      { id: 'speech',      label: 'Voice Comms',  short: 'Voice',      icon: 'voice',  prefetch: 'speech',    desc: 'Speech-to-text and text-to-speech' },
      { id: 'providers',   label: 'Provider War', short: 'Providers',  icon: 'server', prefetch: 'providers', desc: 'The same model on every host' },
      { id: 'benchmarks',  label: 'Benchmarks',   short: 'Benchmarks', icon: 'bench',  prefetch: 'llms',      desc: 'Every evaluation, one matrix' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { id: 'compare', label: 'Battle Mode',     short: 'Battle',  icon: 'swords', desc: 'Up to four models head to head' },
      { id: 'race',    label: 'Speed Race',      short: 'Race',    icon: 'timer',  desc: 'Real speed and latency, as a race' },
      { id: 'planner', label: 'Mission Planner', short: 'Planner', icon: 'target', desc: 'Describe the job, get a ranked shortlist' },
      { id: 'replay',  label: 'Battle Replay',   short: 'Replay',  icon: 'replay', route: { type: 'videos', slug: 'replay' }, desc: 'Real crowd-voted duels — guess the winner' },
    ],
  },
  {
    group: 'Read',
    items: [
      { id: 'guide',       label: 'Guide',       icon: 'book',   desc: 'How to pick a model, in plain English' },
      { id: 'methodology', label: 'Methodology', icon: 'doc',    desc: 'Where every number comes from' },
      { id: 'faq',         label: 'FAQ',         icon: 'help',   desc: 'Short answers' },
      { id: 'blog',        label: 'Blog',        icon: 'pen',    desc: 'Notes from the war room' },
      { id: 'about',       label: 'About',       icon: 'info',   desc: 'Who runs this and why' },
    ],
  },
];

export const NAV_ITEMS = NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.group })));

/** Is this nav item the page we are on? */
export function isActive(item, route) {
  if (item.id === 'replay') return (route.type === 'videos' || route.type === 'images') && route.slug === 'replay';
  if (item.id === 'home') return route.type === 'home' || route.type === 'warroom';
  if (item.id === 'videos' || item.id === 'images') return route.type === item.id && route.slug !== 'replay';
  if (item.id === 'blog') return route.type === 'blog' || route.type === 'blog-post';
  return route.type === item.id;
}

/** Title and section for the top bar. */
export function pageMeta(route, { modelName, labName } = {}) {
  const hit = NAV_ITEMS.find(i => isActive(i, route));
  if (hit) return { title: hit.label, group: hit.group, desc: hit.desc };
  switch (route.type) {
    case 'model':     return { title: modelName ?? route.slug ?? 'Model', group: 'Models', desc: 'Model profile' };
    case 'lab':       return { title: labName ?? route.slug ?? 'Lab', group: 'Labs', desc: 'Lab profile' };
    case 'blog-post': return { title: 'Blog', group: 'Read', desc: '' };
    case 'privacy':   return { title: 'Privacy', group: 'Company', desc: '' };
    case 'terms':     return { title: 'Terms', group: 'Company', desc: '' };
    case 'contact':   return { title: 'Contact', group: 'Company', desc: '' };
    default:          return { title: 'War Room', group: 'Arenas', desc: '' };
  }
}

/* Line icons, 24-unit grid, drawn with currentColor. */
const PATHS = {
  room:   <><rect x="3.5" y="3.5" width="7" height="7" /><rect x="13.5" y="3.5" width="7" height="7" /><rect x="3.5" y="13.5" width="7" height="7" /><rect x="13.5" y="13.5" width="7" height="7" /></>,
  llm:    <><path d="M4 6h16M4 12h16M4 18h10" /></>,
  code:   <><path d="m8.5 7.5-4.5 4.5 4.5 4.5M15.5 7.5l4.5 4.5-4.5 4.5" /></>,
  image:  <><rect x="3.5" y="4.5" width="17" height="15" /><circle cx="9" cy="10" r="1.8" /><path d="m20.5 16-5-5-9.5 8.5" /></>,
  video:  <><rect x="3.5" y="5.5" width="12" height="13" /><path d="m15.5 10 5-3v10l-5-3" /></>,
  voice:  <><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" /></>,
  server: <><rect x="4" y="4" width="16" height="6.5" /><rect x="4" y="13.5" width="16" height="6.5" /><path d="M7.5 7.25h.01M7.5 16.75h.01" /></>,
  bench:  <><path d="M4 20h16M7 16V10M12 16V5M17 16v-4" /></>,
  swords: <><path d="m4 4 9.5 9.5M20 4l-9.5 9.5M5.5 15.5l3 3M18.5 15.5l-3 3M4 20l2.5-2.5M20 20l-2.5-2.5" /></>,
  timer:  <><circle cx="12" cy="13" r="7.5" /><path d="M12 9.5V13l2.5 2M9.5 2.5h5" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  replay: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" /><path d="M3.5 3.5v5h5" /><path d="m10 9 5 3-5 3z" /></>,
  book:   <><path d="M4 5.5A2 2 0 0 1 6 3.5h13.5v14H6a2 2 0 0 0-2 2z" /><path d="M4 19.5a2 2 0 0 0 2 2h13.5v-4" /></>,
  doc:    <><path d="M6 3.5h8.5l4 4v13H6z" /><path d="M14.5 3.5v4h4M9 12h6.5M9 16h6.5" /></>,
  help:   <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6M12 16.8h.01" /></>,
  pen:    <><path d="M4 20h4.5L19.5 9 15 4.5 4 15.5z" /><path d="m13 6.5 4.5 4.5" /></>,
  info:   <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8h.01" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  sun:    <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  moon:   <><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></>,
  collapse: <><rect x="3.5" y="4.5" width="17" height="15" /><path d="M9.5 4.5v15M15.5 10l-2 2 2 2" /></>,
  expand: <><rect x="3.5" y="4.5" width="17" height="15" /><path d="M9.5 4.5v15M13.5 10l2 2-2 2" /></>,
  lab:    <><path d="M9.5 3.5v6l-5 9a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2l-5-9v-6M8 3.5h8" /></>,
  model:  <><rect x="5" y="5" width="14" height="14" /><path d="M9 2.5V5M15 2.5V5M9 19v2.5M15 19v2.5M2.5 9H5M2.5 15H5M19 9h2.5M19 15h2.5" /></>,
  arrow:  <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  plus:   <><path d="M12 5v14M5 12h14" /></>,
  check:  <><path d="m5 12.5 4.5 4.5L19 7.5" /></>,
};

export function Icon({ name, size = 16, stroke = 1.6, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, display: 'block', ...style }}>
      {PATHS[name] ?? null}
    </svg>
  );
}
