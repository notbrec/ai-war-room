import { useState, useEffect } from 'react';
import { useTheme }           from './hooks/useTheme.js';
import NavBar                 from './components/NavBar.jsx';
import CyberBackground        from './components/CyberBackground.jsx';
import HomePage               from './pages/HomePage.jsx';
import LeaderboardPage        from './pages/LeaderboardPage.jsx';
import MethodologyPage        from './pages/MethodologyPage.jsx';

const HASH_MAP = { '#leaderboard': 'leaderboard', '#methodology': 'methodology' };

function pageFromHash() {
  return HASH_MAP[window.location.hash] ?? 'home';
}

export default function App() {
  const { dark, toggle } = useTheme();
  const [page, setPage]  = useState(pageFromHash);

  const navigate = (target) => {
    if (target === page) return;
    window.location.hash = target === 'home' ? '' : target;
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const pages = {
    home:        <HomePage        onNavigate={navigate} />,
    leaderboard: <LeaderboardPage onNavigate={navigate} />,
    methodology: <MethodologyPage onNavigate={navigate} />,
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
