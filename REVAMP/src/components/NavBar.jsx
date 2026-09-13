import { useEffect, useRef, useState } from 'react';
import { RobotMascot } from './Robot.jsx';
import { useMobile } from '../hooks/useTheme.js';
import { prefetch } from '../data/api.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
const MONO = "'SF Mono','JetBrains Mono',ui-monospace,'Menlo',monospace";
const EASE = 'cubic-bezier(0.16,1,0.3,1)';

/* Two rows on desktop, nothing hidden: the reading pages up top with the
   brand, every arena and tool in a terminal strip underneath. Below 600px
   the strip folds into the drawer. */
const READ = [
  { id: 'guide', label: 'Guide' },
  { id: 'faq',   label: 'FAQ' },
  { id: 'blog',  label: 'Blog' },
  { id: 'about', label: 'About' },
];

const ARENAS = [
  { id: 'home',        label: 'War Room',   prefetch: 'llms' },
  { id: 'leaderboard', label: 'LLMs',       full: 'LLM Rankings',  prefetch: 'llms' },
  { id: 'coding',      label: 'Code',       full: 'Code Ops',      prefetch: 'coding' },
  { id: 'images',      label: 'Image',      full: 'Image Arena',   prefetch: 'media' },
  { id: 'videos',      label: 'Video',      full: 'Video Arena',   prefetch: 'media' },
  { id: 'speech',      label: 'Voice',      full: 'Voice Comms',   prefetch: 'speech' },
  { id: 'providers',   label: 'Providers',  full: 'Provider War',  prefetch: 'providers' },
  { id: 'benchmarks',  label: 'Benchmarks', full: 'Benchmarks',    prefetch: 'llms' },
];
const TOOLS = [
  { id: 'compare', label: 'Battle',  full: 'Battle Mode' },
  { id: 'race',    label: 'Race',    full: 'Speed Race' },
  { id: 'replay',  label: 'Replay',  full: 'Battle Replay', route: { type: 'videos', slug: 'replay' } },
  { id: 'planner', label: 'Planner', full: 'Mission Planner' },
];

const DRAWER = [
  { title: 'Arenas', items: ARENAS.map(a => ({ ...a, label: a.full ?? a.label })) },
  { title: 'Tools',  items: TOOLS.map(t => ({ ...t, label: t.full })) },
  { title: 'Read',   items: [...READ, { id: 'methodology', label: 'Methodology' }] },
];

function useScrolled(threshold = 16) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled((window.scrollY || 0) > threshold);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [threshold]);
  return scrolled;
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="8" y1="1" x2="8" y2="3"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1" y1="8" x2="3" y2="8"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="3.05" y1="3.05" x2="4.46" y2="4.46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="11.54" y1="11.54" x2="12.95" y2="12.95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12.95" y1="3.05" x2="11.54" y2="4.46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="4.46" y1="11.54" x2="3.05" y2="12.95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 108 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function MenuIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {open
        ? <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        : <><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>}
    </svg>
  );
}

const linkStyle = active => ({
  height: 32, paddingInline: 11,
  background: 'none', color: active ? 'var(--text)' : 'var(--muted)',
  fontSize: 13.5, fontWeight: active ? 600 : 500,
  border: 'none', cursor: 'pointer', letterSpacing: '-0.015em', whiteSpace: 'nowrap',
  transition: 'background 0.15s, color 0.15s', fontFamily: SF,
  display: 'inline-flex', alignItems: 'center', gap: 4,
});

/* the terminal strip: mono, uppercase, hairline-separated groups */
function StripLink({ item, active, onNavigate }) {
  return (
    <button onClick={() => onNavigate(item.route ?? item.id)} onMouseEnter={() => item.prefetch && prefetch(item.prefetch)}
      title={item.full} data-active={active} className="aiwar-strip-link" style={{
        height: 34, paddingInline: 11, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
        fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: active ? 'var(--text)' : 'var(--muted)', position: 'relative', whiteSpace: 'nowrap',
        transition: 'color 0.15s',
      }}>
      {item.label}
      <span aria-hidden style={{ position: 'absolute', left: 11, right: 11, bottom: 0, height: 2, background: 'var(--accent)', transform: active ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left', transition: `transform 350ms ${EASE}` }} />
    </button>
  );
}

export default function NavBar({ page, onNavigate, dark, onToggleTheme }) {
  const scrolled = useScrolled(20);
  const mobile = useMobile();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { setDrawer(false); }, [page]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = e => { if (e.key === 'Escape') setDrawer(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const isActive = item => page === item.id || (item.id === 'home' && page === 'warroom');

  // publish our height so sticky table headers can tuck under the bar
  const barRef = useRef(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--nav-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mobile]);

  return (
    <div ref={barRef} style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled ? (dark ? 'rgba(7,7,10,0.78)' : 'rgba(245,245,247,0.78)') : 'var(--nav)',
      backdropFilter: `saturate(180%) blur(${scrolled ? 28 : 20}px)`,
      WebkitBackdropFilter: `saturate(180%) blur(${scrolled ? 28 : 20}px)`,
      borderBottom: '0.5px solid var(--sep)',
      boxShadow: scrolled ? (dark ? '0 12px 32px rgba(0,0,0,0.35)' : '0 12px 32px rgba(0,0,0,0.06)') : 'none',
      fontFamily: SF,
      transition: `background 350ms ${EASE}, backdrop-filter 350ms ${EASE}, box-shadow 500ms ${EASE}`,
    }}>
      <style>{`
        .aiwar-strip-link:hover { color: var(--text) !important; }
        .aiwar-strip { scrollbar-width: none; }
        .aiwar-strip::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: mobile ? '0 12px' : '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: mobile ? 50 : (scrolled ? 44 : 52), transition: `height 350ms ${EASE}`,
      }}>
        {/* Brand */}
        <button onClick={() => onNavigate('home')} className="aiwar-brand-btn" style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <RobotMascot variant="classic" size={22} color="var(--accent)" />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', whiteSpace: 'nowrap' }}>AI WAR ROOM</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!mobile && (
            <nav style={{ display: 'flex', gap: 2, marginRight: 6 }}>
              {READ.map(g => (
                <button key={g.id} onClick={() => onNavigate(g.id)} className="aiwar-nav-link" data-active={page === g.id} style={linkStyle(page === g.id)}>
                  {g.label}
                </button>
              ))}
            </nav>
          )}

          {/* Theme toggle */}
          <button onClick={onToggleTheme} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{
            width: mobile ? 30 : 34, height: mobile ? 30 : 34, flexShrink: 0,
            background: 'var(--pill)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted)', transition: 'background 0.15s, color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--search)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--pill)'; e.currentTarget.style.color = 'var(--muted)'; }}>
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>

          {mobile && (
            <button onClick={() => setDrawer(d => !d)} aria-label="Menu" aria-expanded={drawer} style={{
              width: 30, height: 30, marginLeft: 6, background: drawer ? 'var(--text)' : 'var(--pill)', color: drawer ? 'var(--bg)' : 'var(--muted)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><MenuIcon open={drawer} /></button>
          )}
        </div>
      </div>

      {/* Terminal strip — every arena and tool, always visible on desktop */}
      {!mobile && (
        <div style={{ borderTop: '0.5px solid var(--sep2)' }}>
          <div className="aiwar-strip" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 14px', display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
            {ARENAS.map(item => <StripLink key={item.id} item={item} active={isActive(item)} onNavigate={onNavigate} />)}
            <span aria-hidden style={{ width: '0.5px', height: 16, background: 'var(--sep)', marginInline: 8, flexShrink: 0 }} />
            {TOOLS.map(item => <StripLink key={item.id} item={item} active={isActive(item)} onNavigate={onNavigate} />)}
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {mobile && drawer && (
        <div style={{ borderTop: '0.5px solid var(--sep)', background: 'var(--card)', maxHeight: 'calc(100vh - 50px)', overflowY: 'auto', animation: `aiwar-fade-in 200ms ${EASE} both` }}>
          <div style={{ padding: '10px 12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {DRAWER.map(sec => (
              <div key={sec.title}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO, marginBottom: 6, padding: '0 6px' }}>{sec.title}</div>
                {sec.items.map(item => (
                  <button key={item.id} onClick={() => onNavigate(item.route ?? item.id)} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 6px', background: isActive(item) ? 'var(--hover)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: SF, fontSize: 13.5, fontWeight: isActive(item) ? 600 : 500, color: 'var(--text)', letterSpacing: '-0.02em',
                  }}>{item.label}</button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
