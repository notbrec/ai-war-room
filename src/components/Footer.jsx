import { MODEL_CONTENT } from '../content/models.js';
import { LAB_CONTENT } from '../content/labs.js';
import { MODELS } from '../models-data.js';
import { useMobile } from '../hooks/useTheme.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";

const TOP_MODEL_SLUGS = Object.keys(MODEL_CONTENT);
const LAB_SLUGS       = Object.keys(LAB_CONTENT);

export default function Footer({ onNavigate }) {
  const mobile = useMobile();

  return (
    <footer style={{
      background: 'var(--bg)',
      borderTop: '0.5px solid var(--sep)',
      fontFamily: SF,
      marginTop: 32,
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: mobile ? '36px 16px 28px' : '48px 24px 36px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: mobile ? 24 : 32, marginBottom: 32,
        }}>

          <Column title="Site">
            <FooterLink onClick={() => onNavigate('home')}>Home</FooterLink>
            <FooterLink onClick={() => onNavigate('leaderboard')}>Leaderboard</FooterLink>
            <FooterLink onClick={() => onNavigate('guide')}>Guide</FooterLink>
            <FooterLink onClick={() => onNavigate('faq')}>FAQ</FooterLink>
            <FooterLink onClick={() => onNavigate('methodology')}>Methodology</FooterLink>
            <FooterLink onClick={() => onNavigate('blog')}>Blog</FooterLink>
          </Column>

          <Column title="Models">
            {TOP_MODEL_SLUGS.slice(0, 6).map(slug => {
              const m = MODELS.find(x => x.slug === slug);
              return (
                <FooterLink key={slug} onClick={() => onNavigate({ type: 'model', slug })}>
                  {m?.name ?? slug}
                </FooterLink>
              );
            })}
          </Column>

          <Column title="Labs">
            {LAB_SLUGS.map(slug => (
              <FooterLink key={slug} onClick={() => onNavigate({ type: 'lab', slug })}>
                {LAB_CONTENT[slug].name}
              </FooterLink>
            ))}
          </Column>

          <Column title="Company">
            <FooterLink onClick={() => onNavigate('about')}>About</FooterLink>
            <FooterLink onClick={() => onNavigate('contact')}>Contact</FooterLink>
            <FooterLink onClick={() => onNavigate('privacy')}>Privacy</FooterLink>
            <FooterLink onClick={() => onNavigate('terms')}>Terms</FooterLink>
          </Column>

        </div>

        <div style={{
          paddingTop: 20, borderTop: '0.5px solid var(--sep)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12, color: 'var(--muted2)', letterSpacing: '-0.01em',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span>© {new Date().getFullYear()} AI WAR ROOM · aiwarroom.app</span>
          <span>Data: arena.ai · OpenRouter · public sources</span>
        </div>
      </div>
    </footer>
  );
}

function Column({ title, children }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function FooterLink({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
      letterSpacing: '-0.015em', textAlign: 'left',
      transition: 'color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.color = '#FF3B30'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
    >
      {children}
    </button>
  );
}
