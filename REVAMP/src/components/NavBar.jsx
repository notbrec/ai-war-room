import { useEffect, useRef, useState } from 'react';
import { RobotMascot } from './Robot.jsx';
import { useMobile } from '../hooks/useTheme.js';
import { prefetch } from '../data/api.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
const MONO = "'SF Mono','JetBrains Mono',ui-monospace,'Menlo',monospace";
const EASE = 'cubic-bezier(0.16,1,0.3,1)';

/* Primary row stays compact; the arenas and tools live in two dropdowns so
   the bar never has to scroll. Below 600px everything moves into a drawer. */
const GROUPS = [
  { id: 'warroom', label: 'War Room', prefetch: 'llms' },
  { id: 'rankings', label: 'Rankings', items: [
    { id: 'leaderboard', label: 'LLM Rankings', hint: 'Arena ELO · price · context', prefetch: 'llms' },
    { id: 'coding',      label: 'Code Ops',     hint: 'SWE-bench agents × models', prefetch: 'coding' },
    { id: 'images',      label: 'Image Arena',  hint: 'Text-to-image · editing', prefetch: 'media' },
    { id: 'videos',      label: 'Video Arena',  hint: 'Text-to-video · image-to-video', prefetch: 'media' },
    { id: 'speech',      label: 'Voice Comms',  hint: 'STT · TTS · speech-to-speech', prefetch: 'speech' },
    { id: 'providers',   label: 'Provider War', hint: 'Who hosts it best', prefetch: 'providers' },
    { id: 'benchmarks',  label: 'Benchmarks',   hint: 'The capability matrix', prefetch: 'llms' },
  ] },
  { id: 'tools', label: 'Tools', items: [
    { id: 'compare', label: 'Battle Mode',    hint: 'Up to four, head to head' },
    { id: 'race',    label: 'Speed Race',     hint: 'Real metrics, animated' },
    { id: 'replay',  label: 'Battle Replay',  hint: 'Crowd-voted image & video duels', route: { type: 'videos', slug: 'replay' } },
    { id: 'planner', label: 'Mission Planner', hint: 'Recommendation engine' },
  ] },
  { id: 'guide', label: 'Guide' },
  { id: 'faq',   label: 'FAQ' },
  { id: 'blog',  label: 'Blog' },
  { id: 'about', label: 'About' },
];

const DRAWER = [
  { title: 'Command', items: [{ id: 'warroom', label: 'War Room' }, { id: 'home', label: 'Home' }] },
  { title: 'Rankings', items: GROUPS[1].items },
  { title: 'Tools', items: GROUPS[2].items },
  { title: 'Read', items: [{ id: 'guide', label: 'Guide' }, { id: 'faq', label: 'FAQ' }, { id: 'blog', label: 'Blog' }, { id: 'methodology', label: 'Methodology' }, { id: 'about', label: 'About' }] },
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

const linkStyle = (active, mobile) => ({
  height: 32, paddingInline: mobile ? 6 : 11, borderRadius: 8,
  background: 'none', color: active ? 'var(--text)' : 'var(--muted)',
  fontSize: mobile ? 12.5 : 13.5, fontWeight: active ? 600 : 500,
  border: 'none', cursor: 'pointer', letterSpacing: '-0.015em', whiteSpace: 'nowrap',
  transition: 'background 0.15s, color 0.15s', fontFamily: SF,
  display: 'inline-flex', alignItems: 'center', gap: 4,
});

function Dropdown({ group, page, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const timer = useRef(null);
  const active = group.items.some(i => i.id === page);
  useEffect(() => {
    if (!open) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  const enter = () => { clearTimeout(timer.current); setOpen(true); };
  const leave = () => { timer.current = setTimeout(() => setOpen(false), 160); };
  return (
    <div ref={ref} onMouseEnter={enter} onMouseLeave={leave} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} className="aiwar-nav-link" data-active={active} aria-expanded={open} aria-haspopup="menu" style={linkStyle(active, false)}>
        {group.label}
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms', opacity: 0.6 }}><path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div role="menu" style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: 236, zIndex: 200,
          background: 'var(--card)', border: '0.5px solid var(--sep)', boxShadow: 'var(--shadow)', padding: 6,
          animation: `aiwar-pop-in 220ms ${EASE} both`, transformOrigin: 'top left',
        }}>
          {group.items.map(item => (
            <button key={item.id} role="menuitem" onClick={() => { setOpen(false); onNavigate(item.route ?? item.id); }} onMouseEnter={() => item.prefetch && prefetch(item.prefetch)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '8px 10px', gap: 1,
                background: page === item.id ? 'var(--hover)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: SF,
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseOut={e => { e.currentTarget.style.background = page === item.id ? 'var(--hover)' : 'transparent'; }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{item.label}</span>
              <span style={{ fontSize: 10.5, color: 'var(--muted2)', fontFamily: MONO, letterSpacing: '0.02em' }}>{item.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
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

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled ? (dark ? 'rgba(17,17,19,0.72)' : 'rgba(242,242,247,0.72)') : 'var(--nav)',
      backdropFilter: `saturate(180%) blur(${scrolled ? 28 : 20}px)`,
      WebkitBackdropFilter: `saturate(180%) blur(${scrolled ? 28 : 20}px)`,
      borderBottom: scrolled || drawer ? '0.5px solid var(--sep)' : '0.5px solid transparent',
      boxShadow: scrolled ? (dark ? '0 12px 32px rgba(0,0,0,0.35)' : '0 12px 32px rgba(0,0,0,0.06)') : 'none',
      fontFamily: SF,
      transition: `background 350ms ${EASE}, backdrop-filter 350ms ${EASE}, border-color 350ms ${EASE}, box-shadow 500ms ${EASE}`,
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: mobile ? '0 12px' : '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: scrolled ? 44 : 52, transition: `height 350ms ${EASE}`,
      }}>
        {/* Brand */}
        <button onClick={() => onNavigate('home')} className="aiwar-brand-btn" style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <RobotMascot variant="classic" size={22} color="var(--accent)" />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', whiteSpace: 'nowrap' }}>AI WAR ROOM</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!mobile && (
            <nav style={{ display: 'flex', gap: 2, marginRight: 6 }}>
              {GROUPS.map(g => g.items
                ? <Dropdown key={g.id} group={g} page={page} onNavigate={onNavigate} />
                : (
                  <button key={g.id} onClick={() => onNavigate(g.id)} onMouseEnter={() => g.prefetch && prefetch(g.prefetch)} className="aiwar-nav-link" data-active={page === g.id} style={linkStyle(page === g.id, false)}>
                    {g.label}
                  </button>
                ))}
            </nav>
          )}

          {/* Theme toggle */}
          <button onClick={onToggleTheme} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{
            width: mobile ? 30 : 34, height: mobile ? 30 : 34, borderRadius: 10, flexShrink: 0,
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

      {/* Mobile drawer */}
      {mobile && drawer && (
        <div style={{ borderTop: '0.5px solid var(--sep)', background: 'var(--card)', maxHeight: 'calc(100vh - 52px)', overflowY: 'auto', animation: `aiwar-fade-in 200ms ${EASE} both` }}>
          <div style={{ padding: '10px 12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {DRAWER.map(sec => (
              <div key={sec.title}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO, marginBottom: 6, padding: '0 6px' }}>{sec.title}</div>
                {sec.items.map(item => (
                  <button key={item.id} onClick={() => onNavigate(item.route ?? item.id)} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 6px', background: page === item.id ? 'var(--hover)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: SF, fontSize: 13.5, fontWeight: page === item.id ? 600 : 500, color: 'var(--text)', letterSpacing: '-0.02em',
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
