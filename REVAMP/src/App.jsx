import { useState, useEffect, useRef, lazy, Suspense, startTransition } from 'react';
import { useTheme }              from './hooks/useTheme.js';
import NavBar                    from './components/NavBar.jsx';
import Footer                    from './components/Footer.jsx';
import CyberBackground           from './components/CyberBackground.jsx';
import HomePage                  from './pages/HomePage.jsx';
import LeaderboardPage           from './pages/LeaderboardPage.jsx';
import { ScrollProgress, GlobalMotion, ClickEffects, SmoothScroll, Skeleton } from './components/design.jsx';
import { MODELS, fetchLeaderboard, readModelCountSnapshot, writeModelCountSnapshot, loadDescriptions } from './models-data.js';
import { BattleDrawer, BattleToastHost } from './domains/comparison/BattleControls.jsx';
import { prefetchAll } from './data/api.js';

// Home and the leaderboard ship in the main bundle; every other page is its
// own chunk. All of them are fetched while the browser is idle right after
// the first paint (see warmUp), so by the time anyone clicks, nothing is left
// to download.
const PAGE_CHUNKS = {
  coding:      () => import('./pages/CodeOpsPage.jsx'),
  media:       () => import('./pages/MediaArenaPage.jsx'),
  speech:      () => import('./pages/VoiceCommsPage.jsx'),
  providers:   () => import('./pages/ProviderWarPage.jsx'),
  benchmarks:  () => import('./pages/BenchmarksPage.jsx'),
  compare:     () => import('./pages/BattlePage.jsx'),
  planner:     () => import('./pages/MissionPlannerPage.jsx'),
  race:        () => import('./pages/SpeedRacePage.jsx'),
  model:       () => import('./pages/ModelPage.jsx'),
  lab:         () => import('./pages/LabPage.jsx'),
  guide:       () => import('./pages/GuidePage.jsx'),
  faq:         () => import('./pages/FAQPage.jsx'),
  blog:        () => import('./pages/BlogPage.jsx'),
  methodology: () => import('./pages/MethodologyPage.jsx'),
  about:       () => import('./pages/AboutPage.jsx'),
  privacy:     () => import('./pages/PrivacyPage.jsx'),
  terms:       () => import('./pages/TermsPage.jsx'),
  contact:     () => import('./pages/ContactPage.jsx'),
};
const EXTRA_CHUNKS = [
  () => import('./components/charts/ScatterChart.jsx'),
  () => import('./components/charts/TrendChart.jsx'),
  () => import('./components/charts/RaceLanes.jsx'),
  loadDescriptions,
];

const CodeOpsPage        = lazy(PAGE_CHUNKS.coding);
const MediaArenaPage     = lazy(PAGE_CHUNKS.media);
const VoiceCommsPage     = lazy(PAGE_CHUNKS.speech);
const ProviderWarPage    = lazy(PAGE_CHUNKS.providers);
const BenchmarksPage     = lazy(PAGE_CHUNKS.benchmarks);
const BattlePage         = lazy(PAGE_CHUNKS.compare);
const MissionPlannerPage = lazy(PAGE_CHUNKS.planner);
const SpeedRacePage      = lazy(PAGE_CHUNKS.race);
const ModelPage          = lazy(PAGE_CHUNKS.model);
const LabPage            = lazy(PAGE_CHUNKS.lab);
const GuidePage          = lazy(PAGE_CHUNKS.guide);
const FAQPage            = lazy(PAGE_CHUNKS.faq);
const BlogIndexPage      = lazy(() => PAGE_CHUNKS.blog().then(m => ({ default: m.BlogIndexPage })));
const BlogPostPage       = lazy(() => PAGE_CHUNKS.blog().then(m => ({ default: m.BlogPostPage })));
const MethodologyPage    = lazy(PAGE_CHUNKS.methodology);
const AboutPage          = lazy(PAGE_CHUNKS.about);
const PrivacyPage        = lazy(PAGE_CHUNKS.privacy);
const TermsPage          = lazy(PAGE_CHUNKS.terms);
const ContactPage        = lazy(PAGE_CHUNKS.contact);

const idle = cb => (typeof requestIdleCallback === 'function' ? requestIdleCallback(cb, { timeout: 3000 }) : setTimeout(cb, 300));

/** After the first paint: every page chunk, then every dataset, one idle slice at a time. */
function warmUp() {
  const jobs = [...Object.values(PAGE_CHUNKS), ...EXTRA_CHUNKS];
  let i = 0;
  const next = () => {
    if (i >= jobs.length) { prefetchAll(); return; }
    Promise.resolve().then(jobs[i++]).catch(() => {}).finally(() => idle(next));
  };
  idle(next);
}

const CACHE_KEY = 'aiwar-models-v2';

// Route shape: { type, slug? }. Types: home | warroom | leaderboard | coding | images | videos | speech |
// providers | benchmarks | compare | planner | race | methodology | guide | faq | about | privacy | terms |
// contact | blog | blog-post | model | lab
function routeFromHash() {
  const raw = (window.location.hash ?? '').replace(/^#\/?/, '');
  if (!raw) return { type: 'home' };
  const [seg, ...rest] = raw.split('/');
  const slug = rest.length ? decodeURIComponent(rest.join('/')) : undefined;

  switch (seg) {
    case 'warroom':     return { type: 'warroom' };
    case 'leaderboard': return { type: 'leaderboard' };
    case 'coding':      return { type: 'coding', slug };
    case 'images':      return { type: 'images', slug };
    case 'videos':      return { type: 'videos', slug };
    case 'speech':      return { type: 'speech', slug };
    case 'providers':   return { type: 'providers', slug };
    case 'benchmarks':  return { type: 'benchmarks', slug };
    case 'compare':     return { type: 'compare' };
    case 'planner':     return { type: 'planner', slug };
    case 'race':        return { type: 'race', slug };
    case 'methodology': return { type: 'methodology' };
    case 'guide':       return { type: 'guide' };
    case 'faq':         return { type: 'faq' };
    case 'about':       return { type: 'about' };
    case 'privacy':     return { type: 'privacy' };
    case 'terms':       return { type: 'terms' };
    case 'contact':     return { type: 'contact' };
    case 'blog':        return slug ? { type: 'blog-post', slug } : { type: 'blog' };
    case 'models':      return { type: 'model', slug };
    case 'labs':        return { type: 'lab',   slug };
    default:            return { type: 'home' };
  }
}

const SLUG_ROUTES = new Set(['coding', 'images', 'videos', 'speech', 'providers', 'benchmarks', 'planner', 'race']);

function hashForRoute(route) {
  switch (route.type) {
    case 'home':        return '';
    case 'leaderboard': return '#leaderboard';
    case 'methodology': return '#methodology';
    case 'guide':       return '#guide';
    case 'faq':         return '#faq';
    case 'blog-post':   return `#/blog/${route.slug}`;
    case 'model':       return `#/models/${route.slug}`;
    case 'lab':         return `#/labs/${route.slug}`;
    default:
      if (SLUG_ROUTES.has(route.type) && route.slug) return `#/${route.type}/${encodeURIComponent(route.slug)}`;
      return `#/${route.type}`;
  }
}

// The last leaderboard this browser saw, kept across visits so the board is
// filled on the first frame; the live copy replaces it a moment later.
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!(Date.now() - parsed?.at < CACHE_MAX_AGE)) return null;
    return Array.isArray(parsed.models) && parsed.models.length > 0 ? parsed.models : null;
  } catch { return null; }
}
function writeCache(models) {
  idle(() => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), models })); }
    catch { try { localStorage.removeItem(CACHE_KEY); } catch {} }
  });
}

function PageFallback() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
      <Skeleton height={14} width={120} style={{ marginBottom: 18 }} />
      <Skeleton height={48} width="50%" style={{ marginBottom: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={96} />)}
      </div>
    </div>
  );
}

export default function App() {
  const { dark, toggle } = useTheme();
  const [route, setRoute] = useState(routeFromHash);
  // The first page shows at once; only later page changes get the short fade.
  const firstPage = useRef(`${route.type}/${route.slug ?? ''}`);
  useEffect(() => {
    if (firstPage.current !== `${route.type}/${route.slug ?? ''}`) firstPage.current = null;
  }, [route]);
  const [liveModels, setLiveModels] = useState(readCache);
  // Stable count: starts from localStorage (or 280+ default), updates only on a real live load
  // so the user never sees the static 63-entry fallback flash through the UI.
  const [countSnapshot, setCountSnapshot] = useState(() => {
    if (liveModels?.length > 50) return { count: liveModels.length, exact: true };
    return readModelCountSnapshot();
  });

  useEffect(() => {
    fetchLeaderboard()
      .then(models => {
        if (models?.length > 0) {
          setLiveModels(models);
          setCountSnapshot({ count: models.length, exact: true });
          writeModelCountSnapshot(models.length);
          writeCache(models);
        } else {
          setLiveModels(prev => prev ?? MODELS);
        }
      })
      .catch(() => {
        setLiveModels(prev => prev ?? MODELS);
      });
    // Every page chunk and dataset, while the browser has nothing better to do.
    warmUp();
  }, []);

  /** Accepts either a string (legacy: 'home', 'leaderboard', etc.) or a route object */
  const navigate = (target) => {
    const next = typeof target === 'string' ? { type: target } : target;
    if (next.type === route.type && next.slug === route.slug) return;
    window.location.hash = hashForRoute(next);
    // A transition keeps the current page up while a lazy page resolves, so a
    // page whose chunk is already here swaps in without a skeleton frame.
    startTransition(() => setRoute(next));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    const path = pathForRoute(route);
    const title = titleForRoute(route);
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title,
      page_location: window.location.origin + path,
    });
  }, [route]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = titleForRoute(route);
    const desc = descriptionForRoute(route);
    const meta = document.querySelector('meta[name="description"]');
    if (meta && desc) meta.setAttribute('content', desc);
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute('href', `https://aiwarroom.app/${hashForRoute(route)}`);
  }, [route]);

  useEffect(() => {
    const onHash = () => {
      const next = routeFromHash();
      startTransition(() => setRoute(cur => (cur.type === next.type && cur.slug === next.slug ? cur : next)));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  let body;
  switch (route.type) {
    case 'warroom':      body = <HomePage         onNavigate={navigate} liveModels={liveModels} countSnapshot={countSnapshot} />; break;
    case 'leaderboard':  body = <LeaderboardPage  onNavigate={navigate} liveModels={liveModels} countSnapshot={countSnapshot} />; break;
    case 'coding':       body = <CodeOpsPage      onNavigate={navigate} slug={route.slug} />; break;
    case 'images':       body = <MediaArenaPage   onNavigate={navigate} kind="image" slug={route.slug} />; break;
    case 'videos':       body = <MediaArenaPage   onNavigate={navigate} kind="video" slug={route.slug} />; break;
    case 'speech':       body = <VoiceCommsPage   onNavigate={navigate} slug={route.slug} />; break;
    case 'providers':    body = <ProviderWarPage  onNavigate={navigate} slug={route.slug} />; break;
    case 'benchmarks':   body = <BenchmarksPage   onNavigate={navigate} slug={route.slug} />; break;
    case 'compare':      body = <BattlePage       onNavigate={navigate} />; break;
    case 'planner':      body = <MissionPlannerPage onNavigate={navigate} slug={route.slug} />; break;
    case 'race':         body = <SpeedRacePage    onNavigate={navigate} slug={route.slug} />; break;
    case 'methodology':  body = <MethodologyPage  onNavigate={navigate} liveModels={liveModels} countSnapshot={countSnapshot} />; break;
    case 'guide':        body = <GuidePage        onNavigate={navigate} liveModels={liveModels} />; break;
    case 'faq':          body = <FAQPage          onNavigate={navigate} liveModels={liveModels} />; break;
    case 'about':        body = <AboutPage        onNavigate={navigate} />; break;
    case 'privacy':      body = <PrivacyPage      onNavigate={navigate} />; break;
    case 'terms':        body = <TermsPage        onNavigate={navigate} />; break;
    case 'contact':      body = <ContactPage      onNavigate={navigate} />; break;
    case 'blog':         body = <BlogIndexPage    onNavigate={navigate} />; break;
    case 'blog-post':    body = <BlogPostPage     onNavigate={navigate} slug={route.slug} />; break;
    case 'model':        body = <ModelPage        onNavigate={navigate} slug={route.slug} liveModels={liveModels} />; break;
    case 'lab':          body = <LabPage          onNavigate={navigate} slug={route.slug} liveModels={liveModels} />; break;
    default:             body = <HomePage         onNavigate={navigate} liveModels={liveModels} countSnapshot={countSnapshot} />;
  }

  return (
    <>
      <GlobalMotion />
      <SmoothScroll />
      <ScrollProgress />
      <ClickEffects />
      <CyberBackground dark={dark} />
      <NavBar
        page={route.type}
        onNavigate={navigate}
        dark={dark}
        onToggleTheme={toggle}
      />
      {/* The boundary sits outside the keyed page, so it outlives page changes:
          inside a transition React keeps the current page up until the next
          one can render, instead of flashing a fresh boundary's skeleton. */}
      <Suspense fallback={<div className="aiwar-page-enter"><PageFallback /></div>}>
        <div key={`${route.type}/${route.slug ?? ''}`} className="aiwar-page-enter" data-nav={firstPage.current === `${route.type}/${route.slug ?? ''}` ? undefined : '1'}>
          {body}
        </div>
      </Suspense>
      <Footer onNavigate={navigate} />
      <BattleDrawer onNavigate={navigate} page={route.type} />
      <BattleToastHost />
    </>
  );
}

function pathForRoute(r) {
  switch (r.type) {
    case 'home':      return '/';
    case 'blog-post': return `/blog/${r.slug}`;
    case 'model':     return `/models/${r.slug}`;
    case 'lab':       return `/labs/${r.slug}`;
    default:          return r.slug ? `/${r.type}/${r.slug}` : `/${r.type}`;
  }
}

const TITLES = {
  warroom: 'War Room', leaderboard: 'LLM Rankings — Leaderboard', coding: 'Code Ops — coding agents & models',
  images: 'Image Arena — text-to-image & editing rankings', videos: 'Video Arena — text-to-video & image-to-video rankings',
  speech: 'Voice Comms — speech-to-text & text-to-speech', providers: 'Provider War — inference providers compared',
  benchmarks: 'Benchmarks — the capability matrix', compare: 'Battle Mode — head-to-head comparison',
  planner: 'Mission Planner — model recommendation', race: 'Speed Race — AI performance as a race',
  methodology: 'Methodology', guide: 'Guide', faq: 'FAQ', about: 'About', privacy: 'Privacy Policy', terms: 'Terms of Use', contact: 'Contact', blog: 'Blog',
};

function titleForRoute(r) {
  const base = 'AI WAR ROOM';
  switch (r.type) {
    case 'home':         return base;
    case 'blog-post':    return `${r.slug?.replace(/-/g, ' ')} — ${base}`;
    case 'model':        return `${r.slug ?? 'Model'} — ${base}`;
    case 'lab':          return `${r.slug ?? 'Lab'} — ${base}`;
    default:             return TITLES[r.type] ? `${TITLES[r.type]} — ${base}` : base;
  }
}

const DESCRIPTIONS = {
  home: 'AI WAR ROOM ranks 350+ AI models by live arena ELO. Daily-updated leaderboard, plain-English guide, FAQ, blog, and pricing for OpenAI, Anthropic, Google, xAI, DeepSeek, Qwen, Kimi and more.',
  warroom: 'The AI command center: strongest, fastest, cheapest and best-value models across language, code, image, video and voice — with providers, benchmarks and history.',
  leaderboard: 'Every language model ranked by arena ELO with intelligence index, pricing, cached pricing, context window, speed and latency. Sort, filter, choose columns, chart.',
  coding: 'Coding agents and models on SWE-bench: resolved rate, cost per task, calls per task — agent and model kept separate.',
  images: 'Text-to-image and image-editing models ranked by quality ELO with price per image and generation time.',
  videos: 'Text-to-video and image-to-video models ranked by quality ELO with price per second, audio support and resolution.',
  speech: 'Speech-to-text word error rate and speed, text-to-speech quality and price, speech-to-speech performance.',
  providers: 'Compare inference providers hosting the same model: price, context, quantisation, uptime — find the best host.',
  benchmarks: 'Benchmark matrix across coding, agents, reasoning, knowledge and more with methodology and sources.',
  compare: 'Battle Mode: compare up to four models head to head on the metrics that matter for their modality.',
  planner: 'Mission Planner: describe your workload, weight quality, speed, cost, context and open weights, get a ranked pick.',
  race: 'Speed Race: real benchmark measurements animated as a race — output speed, latency, generation and transcription.',
};
function descriptionForRoute(r) { return DESCRIPTIONS[r.type] ?? null; }
