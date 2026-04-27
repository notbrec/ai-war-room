import { useState, useEffect } from 'react';
import { useTheme }           from './hooks/useTheme.js';
import NavBar                 from './components/NavBar.jsx';
import CyberBackground        from './components/CyberBackground.jsx';
import HomePage               from './pages/HomePage.jsx';
import LeaderboardPage        from './pages/LeaderboardPage.jsx';
import MethodologyPage        from './pages/MethodologyPage.jsx';
import { MODELS, fetchLeaderboard } from './models-data.js';

const HASH_MAP = { '#leaderboard': 'leaderboard', '#methodology': 'methodology' };
const CACHE_KEY = 'aiwar-models-v1';

function pageFromHash() {
  return HASH_MAP[window.location.hash] ?? 'home';
}

// Load cached live data synchronously so subsequent navigations are instant
function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch { return null; }
}

export default function App() {
  const { dark, toggle }       = useTheme();
  const [page, setPage]        = useState(pageFromHash);
  // null = still loading first time. Cached value = instant. After fetch resolves, real data.
  const [liveModels, setLiveModels] = useState(readCache);

  useEffect(() => {
    fetchLeaderboard()
      .then(models => {
        if (models?.length > 0) {
          setLiveModels(models);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(models)); } catch {}
        } else {
          // API returned empty — fall back to static so page isn't blank
          setLiveModels(prev => prev ?? MODELS);
        }
      })
      .catch(() => {
        // API failed — fall back to static
        setLiveModels(prev => prev ?? MODELS);
      });
  }, []);

  const navigate = (target) => {
    if (target === page) return;
    window.location.hash = target === 'home' ? '' : target;
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Send a GA4 page_view whenever the SPA route changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    const path = page === 'home' ? '/' : `/${page}`;
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: page === 'home' ? 'AI WAR ROOM' : `AI WAR ROOM — ${page}`,
      page_location: window.location.origin + path,
    });
  }, [page]);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const pages = {
    home:        <HomePage        onNavigate={navigate} liveModels={liveModels} />,
    leaderboard: <LeaderboardPage onNavigate={navigate} liveModels={liveModels} />,
    methodology: <MethodologyPage onNavigate={navigate} liveModels={liveModels} />,
  };

  return (
    <>
      <CyberBackground dark={dark} />
      <NavBar
        page={page}
        onNavigate={navigate}
        dark={dark}
        onToggleTheme={toggle}
      />
      {pages[page] ?? pages.home}
    </>
  );
}
