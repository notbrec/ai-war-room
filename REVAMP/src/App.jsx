import { useState, useEffect, lazy, Suspense } from 'react';
import { useTheme }              from './hooks/useTheme.js';
import NavBar                    from './components/NavBar.jsx';
import Footer                    from './components/Footer.jsx';
import CyberBackground           from './components/CyberBackground.jsx';
import LoadingScreen             from './components/LoadingScreen.jsx';
import HomePage                  from './pages/HomePage.jsx';
import LeaderboardPage           from './pages/LeaderboardPage.jsx';
import MethodologyPage           from './pages/MethodologyPage.jsx';
import AboutPage                 from './pages/AboutPage.jsx';
import PrivacyPage               from './pages/PrivacyPage.jsx';
import TermsPage                 from './pages/TermsPage.jsx';
import ContactPage               from './pages/ContactPage.jsx';
import ModelPage                 from './pages/ModelPage.jsx';
import LabPage                   from './pages/LabPage.jsx';
import GuidePage                  from './pages/GuidePage.jsx';
import FAQPage                    from './pages/FAQPage.jsx';
import { BlogIndexPage, BlogPostPage } from './pages/BlogPage.jsx';
import { ScrollProgress, GlobalMotion, ClickEffects, SmoothScroll, Skeleton } from './components/design.jsx';
import { MODELS, fetchLeaderboard, readModelCountSnapshot, writeModelCountSnapshot } from './models-data.js';
import { BattleDrawer, BattleToastHost } from './domains/comparison/BattleControls.jsx';
import { prefetch } from './data/api.js';

// Command-center pages are code-split: the home + leaderboard shell stays small.
const WarRoomPage       = lazy(() => import('./pages/WarRoomPage.jsx'));
const CodeOpsPage       = lazy(() => import('./pages/CodeOpsPage.jsx'));
const MediaArenaPage    = lazy(() => import('./pages/MediaArenaPage.jsx'));
const VoiceCommsPage    = lazy(() => import('./pages/VoiceCommsPage.jsx'));
const ProviderWarPage   = lazy(() => import('./pages/ProviderWarPage.jsx'));
const BenchmarksPage    = lazy(() => import('./pages/BenchmarksPage.jsx'));
const BattlePage        = lazy(() => import('./pages/BattlePage.jsx'));
const MissionPlannerPage = lazy(() => import('./pages/MissionPlannerPage.jsx'));
const SpeedRacePage     = lazy(() => import('./pages/SpeedRacePage.jsx'));

const CACHE_KEY = 'aiwar-models-v1';

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

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch { return null; }
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
  // Intro plays once per browser session, and only when landing on home.
  const [intro, setIntro] = useState(() => {
    try {
      return routeFromHash().type === 'home' && !sessionStorage.getItem('aiwar-intro-seen');
    } catch { return false; }
  });
  const [liveModels, setLiveModels] = useState(readCache);
  // Stable count: starts from localStorage (or 280+ default), updates only on a real live load
  // so the user never sees the static 63-entry fallback flash through the UI.
  const [countSnapshot, setCountSnapshot] = useState(() => {
    const cached = readCache();
    if (cached?.length > 50) return { count: cached.length, exact: true };
    return readModelCountSnapshot();
  });

  useEffect(() => {
    fetchLeaderboard()
      .then(models => {
        if (models?.length > 0) {
          setLiveModels(models);
          setCountSnapshot({ count: models.length, exact: true });
          writeModelCountSnapshot(models.length);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(models)); } catch {}
        } else {
          setLiveModels(prev => prev ?? MODELS);
        }
      })
      .catch(() => {
        setLiveModels(prev => prev ?? MODELS);
      });
    // Warm the merged dataset so the first command-center page opens instantly.
    const t = setTimeout(() => prefetch('llms'), 1200);
    return () => clearTimeout(t);
  }, []);

  /** Accepts either a string (legacy: 'home', 'leaderboard', etc.) or a route object */
  const navigate = (target) => {
    const next = typeof target === 'string' ? { type: target } : target;
    if (next.type === route.type && next.slug === route.slug) return;
    window.location.hash = hashForRoute(next);
    setRoute(next);
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
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  let body;
  switch (route.type) {
    case 'warroom':      body = <WarRoomPage      onNavigate={navigate} />; break;
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
      {intro && (
        <LoadingScreen onDone={() => {
          try { sessionStorage.setItem('aiwar-intro-seen', '1'); } catch {}
          setIntro(false);
        }} />
      )}
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
      <div key={`${route.type}/${route.slug ?? ''}`} className="aiwar-page-enter">
        <Suspense fallback={<PageFallback />}>{body}</Suspense>
      </div>
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
  warroom: 'War Room — AI command center', leaderboard: 'LLM Rankings — Leaderboard', coding: 'Code Ops — coding agents & models',
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
