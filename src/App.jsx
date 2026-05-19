import { useState, useEffect } from 'react';
import { useTheme }              from './hooks/useTheme.js';
import NavBar                    from './components/NavBar.jsx';
import Footer                    from './components/Footer.jsx';
import CyberBackground           from './components/CyberBackground.jsx';
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
import { MODELS, fetchLeaderboard, readModelCountSnapshot, writeModelCountSnapshot } from './models-data.js';

const CACHE_KEY = 'aiwar-models-v1';

// Route shape: { type: 'home' | 'leaderboard' | 'methodology' | 'guide' | 'faq' | 'about' | 'privacy' | 'terms' | 'contact' | 'blog' | 'blog-post' | 'model' | 'lab', slug?: string }
function routeFromHash() {
  const raw = (window.location.hash ?? '').replace(/^#\/?/, '');
  if (!raw) return { type: 'home' };
  const [seg, slug] = raw.split('/');

  switch (seg) {
    case 'leaderboard': return { type: 'leaderboard' };
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

function hashForRoute(route) {
  switch (route.type) {
    case 'home':        return '';
    case 'leaderboard': return '#leaderboard';
    case 'methodology': return '#methodology';
    case 'guide':       return '#guide';
    case 'faq':         return '#faq';
    case 'about':       return '#/about';
    case 'privacy':     return '#/privacy';
    case 'terms':       return '#/terms';
    case 'contact':     return '#/contact';
    case 'blog':        return '#/blog';
    case 'blog-post':   return `#/blog/${route.slug}`;
    case 'model':       return `#/models/${route.slug}`;
    case 'lab':         return `#/labs/${route.slug}`;
    default:            return '';
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

export default function App() {
  const { dark, toggle } = useTheme();
  const [route, setRoute] = useState(routeFromHash);
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
          // countSnapshot intentionally not touched on fallback
        }
      })
      .catch(() => {
        setLiveModels(prev => prev ?? MODELS);
        // countSnapshot intentionally not touched on failure
      });
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
    if (typeof document !== 'undefined') document.title = title;
  }, [route]);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  let body;
  switch (route.type) {
    case 'leaderboard':  body = <LeaderboardPage onNavigate={navigate} liveModels={liveModels} countSnapshot={countSnapshot} />; break;
    case 'methodology':  body = <MethodologyPage onNavigate={navigate} liveModels={liveModels} countSnapshot={countSnapshot} />; break;
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
      <CyberBackground dark={dark} />
      <NavBar
        page={route.type}
        onNavigate={navigate}
        dark={dark}
        onToggleTheme={toggle}
      />
      {body}
      <Footer onNavigate={navigate} />
    </>
  );
}

function pathForRoute(r) {
  switch (r.type) {
    case 'home':      return '/';
    case 'blog-post': return `/blog/${r.slug}`;
    case 'model':     return `/models/${r.slug}`;
    case 'lab':       return `/labs/${r.slug}`;
    default:          return `/${r.type}`;
  }
}

function titleForRoute(r) {
  const base = 'AI WAR ROOM';
  switch (r.type) {
    case 'home':         return base;
    case 'leaderboard':  return `Leaderboard — ${base}`;
    case 'methodology':  return `Methodology — ${base}`;
    case 'guide':        return `Guide — ${base}`;
    case 'faq':          return `FAQ — ${base}`;
    case 'about':        return `About — ${base}`;
    case 'privacy':      return `Privacy Policy — ${base}`;
    case 'terms':        return `Terms of Use — ${base}`;
    case 'contact':      return `Contact — ${base}`;
    case 'blog':         return `Blog — ${base}`;
    case 'blog-post':    return `${r.slug?.replace(/-/g, ' ')} — ${base}`;
    case 'model':        return `${r.slug ?? 'Model'} — ${base}`;
    case 'lab':          return `${r.slug ?? 'Lab'} — ${base}`;
    default:             return base;
  }
}
