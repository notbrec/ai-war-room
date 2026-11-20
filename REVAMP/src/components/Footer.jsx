import { LAB_CONTENT } from '../content/labs.js';
import { MODELS } from '../models-data.js';
import { useMobile } from '../hooks/useTheme.js';
import { RobotMascot } from './Robot.jsx';

const SF = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";

// Today's top six models (one per family) from the snapshot refreshed at every deploy.
const TOP_MODELS = (() => {
  const seen = new Set();
  return MODELS.filter(m => { const k = m.name.replace(/\s*\(.*\)$/, ''); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
})();
// the written profiles first, then the other big labs (their pages are built from the live data)
const LABS = [
  ...Object.keys(LAB_CONTENT).map(slug => ({ slug, name: LAB_CONTENT[slug].name })),
  { slug: 'alibaba', name: 'Alibaba' }, { slug: 'moonshot', name: 'Moonshot' }, { slug: 'z-ai', name: 'Z.ai' }, { slug: 'mistral', name: 'Mistral' },
];

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
        maxWidth: 'var(--page-max)', margin: '0 auto',
        padding: mobile ? '36px 16px 28px' : '40px var(--gutter) 32px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: mobile ? '1fr 1fr' : 'minmax(220px, 1.3fr) repeat(5, minmax(0, 1fr))',
          gap: mobile ? 24 : 32, marginBottom: 32,
        }}>
          {/* Brand — the two combatants sign off every page */}
          <div style={{ gridColumn: mobile ? '1 / -1' : undefined, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <RobotMascot variant="classic" size={26} color="var(--accent)" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>AI WAR ROOM</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '-0.01em' }}>Every model, ranked by battle.</div>
              </div>
              <RobotMascot variant="eared" size={22} color="var(--muted2)" style={{ marginLeft: mobile ? 'auto' : 14 }} />
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)', margin: '16px 0 0', maxWidth: 340 }}>
              Independent rankings for language, code, image, video and voice models — read from public benchmarks, arena votes and price lists several times a day. Nothing is typed in by hand.
            </p>
          </div>
          <Column title="Command">
            <FooterLink onClick={() => onNavigate('home')}>War Room</FooterLink>
            <FooterLink onClick={() => onNavigate('leaderboard')}>LLM Rankings</FooterLink>
            <FooterLink onClick={() => onNavigate('coding')}>Code Ops</FooterLink>
            <FooterLink onClick={() => onNavigate('images')}>Image Arena</FooterLink>
            <FooterLink onClick={() => onNavigate('videos')}>Video Arena</FooterLink>
            <FooterLink onClick={() => onNavigate('speech')}>Voice Comms</FooterLink>
            <FooterLink onClick={() => onNavigate('providers')}>Provider War</FooterLink>
            <FooterLink onClick={() => onNavigate('benchmarks')}>Benchmarks</FooterLink>
          </Column>

          <Column title="Tools & reading">
            <FooterLink onClick={() => onNavigate('compare')}>Battle Mode</FooterLink>
            <FooterLink onClick={() => onNavigate('race')}>Speed Race</FooterLink>
            <FooterLink onClick={() => onNavigate('planner')}>Mission Planner</FooterLink>
            <FooterLink onClick={() => onNavigate({ type: 'videos', slug: 'replay' })}>Battle Replay</FooterLink>
            <FooterLink onClick={() => onNavigate('guide')}>Guide</FooterLink>
            <FooterLink onClick={() => onNavigate('faq')}>FAQ</FooterLink>
            <FooterLink onClick={() => onNavigate('methodology')}>Methodology</FooterLink>
            <FooterLink onClick={() => onNavigate('blog')}>Blog</FooterLink>
          </Column>

          <Column title="Models">
            {TOP_MODELS.map(m => (
              <FooterLink key={m.slug} onClick={() => onNavigate({ type: 'model', slug: m.slug })}>
                {m.name}
              </FooterLink>
            ))}
          </Column>

          <Column title="Labs">
            {LABS.map(l => (
              <FooterLink key={l.slug} onClick={() => onNavigate({ type: 'lab', slug: l.slug })}>
                {l.name}
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
          <span>Data: arena.ai (leaderboard dataset, CC BY 4.0) · OpenRouter · SWE-bench · Open ASR Leaderboard · Artificial Analysis</span>
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
      onMouseEnter={e => e.currentTarget.style.color = '#CD5C4E'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
    >
      {children}
    </button>
  );
}
