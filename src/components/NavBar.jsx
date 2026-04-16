import Logo from './Logo.jsx';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";

const LINKS = [
  { id: 'home',        label: 'Home'        },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'methodology', label: 'Methodology' },
];

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
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--nav)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: '0.5px solid var(--sep)',
      fontFamily: SF,
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 48,
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
                style={{
                  height: 32, paddingInline: 12, borderRadius: 8,
                  background: page === link.id ? 'var(--pill)' : 'none',
                  color: page === link.id ? 'var(--text)' : 'var(--muted)',
                  fontSize: 14, fontWeight: page === link.id ? 600 : 400,
                  border: 'none', cursor: 'pointer', letterSpacing: '-0.015em',
                  transition: 'background 0.15s, color 0.15s',
                }}
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
