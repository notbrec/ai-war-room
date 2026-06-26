import { useEffect, useState } from 'react';
import Logo from './Logo.jsx';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
const EASE = 'cubic-bezier(0.16,1,0.3,1)';

const LINKS = [
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'guide',       label: 'Guide'       },
  { id: 'faq',         label: 'FAQ'         },
  { id: 'blog',        label: 'Blog'        },
  { id: 'about',       label: 'About'       },
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
      <path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 108 8z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function NavBar({ page, onNavigate, dark, onToggleTheme }) {
  const scrolled = useScrolled(20);
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled
        ? (dark ? 'rgba(17,17,19,0.72)' : 'rgba(242,242,247,0.72)')
        : 'var(--nav)',
      backdropFilter: `saturate(180%) blur(${scrolled ? 28 : 20}px)`,
      WebkitBackdropFilter: `saturate(180%) blur(${scrolled ? 28 : 20}px)`,
      borderBottom: scrolled ? '0.5px solid var(--sep)' : '0.5px solid transparent',
      boxShadow: scrolled
        ? (dark ? '0 12px 32px rgba(0,0,0,0.35)' : '0 12px 32px rgba(0,0,0,0.06)')
        : 'none',
      fontFamily: SF,
      transition: `background 350ms ${EASE}, backdrop-filter 350ms ${EASE}, border-color 350ms ${EASE}, box-shadow 500ms ${EASE}`,
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: scrolled ? 44 : 52,
        transition: `height 350ms ${EASE}`,
      }}>

        {/* Brand */}
        <button onClick={() => onNavigate('home')} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <Logo size={20} color="#FF3B30" />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>
            AI WAR ROOM
          </span>
        </button>

        {/* Right side: links + theme toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <nav style={{ display: 'flex', gap: 2, marginRight: 6 }}>
            {LINKS.map(link => (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className="aiwar-nav-link"
                data-active={page === link.id}
                style={{
                  height: 32, paddingInline: 12, borderRadius: 8,
                  background: 'none',
                  color: page === link.id ? 'var(--text)' : 'var(--muted)',
                  fontSize: 14, fontWeight: page === link.id ? 600 : 500,
                  border: 'none', cursor: 'pointer', letterSpacing: '-0.015em',
                  transition: `background 0.15s, color 0.15s`,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { if (page !== link.id) e.currentTarget.style.color = 'var(--muted)'; }}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'var(--pill)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--search)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--pill)'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
