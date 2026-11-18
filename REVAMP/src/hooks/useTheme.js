import { useState, useEffect } from 'react';

let themeAnimTimer = null;

export function useTheme() {
  // The blocking script in index.html has already picked the theme (saved
  // choice, else dark) and painted it; start from that, so the first render
  // never flips the page — or makes the fight clips load in both gradings.
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [chosen, setChosen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    if (!chosen) return;
    try { localStorage.setItem('aiwar-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark, chosen]);

  const toggle = () => {
    const html = document.documentElement;
    html.classList.add('aiwar-theme-anim');
    clearTimeout(themeAnimTimer);
    themeAnimTimer = setTimeout(() => html.classList.remove('aiwar-theme-anim'), 450);
    setChosen(true);
    setDark(d => !d);
  };

  return { dark, toggle };
}

/** Returns true when viewport width < 600px, updates on resize */
export function useMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 600);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

/** Lightweight hook: just reads the current dark state by watching html.dark class */
export function useDark() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return dark;
}
