import { MONO, AnimatedNumber, LivePulse } from './design.jsx';
import { ORG_CONFIG } from '../models-data.js';
import { LabLogo } from './LabLogo.jsx';
import FightArena from './FightArena.jsx';

/* ─────────────────────────────────────────────────────────────────────────
   <ChampionBout/> — the two top-ranked models, personified as the
   combatants in the war room. Makes the robots literal: rank #1 (the
   reigning champion, in accent) clashes with rank #2 (the challenger).
   Flat surfaces, hairline borders, no gradients.
   ────────────────────────────────────────────────────────────────────── */
export default function ChampionBout({ models, onNavigate, mobile }) {
  if (!models || models.length < 2) return null;
  const champ = models[0];
  const chall = models[1];
  const champOrg = ORG_CONFIG[champ.org] ?? { color: 'var(--accent)' };
  const challOrg = ORG_CONFIG[chall.org] ?? { color: 'var(--text)' };
  const gap = Math.abs((champ.elo ?? 0) - (chall.elo ?? 0));

  const Fighter = ({ m, org, side, color }) => (
    <button
      onClick={() => onNavigate?.({ type: 'model', slug: m.slug })}
      className="aiwar-press-btn"
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        /* each corner claims its own edge of the card, the way a fight card
           lists them — crowding both toward the VS wastes the full width */
        textAlign: side === 'left' ? 'left' : 'right',
        display: 'flex', flexDirection: 'column',
        alignItems: side === 'left' ? 'flex-start' : 'flex-end',
        gap: 4, minWidth: 0, width: '100%',
      }}
    >
      <span style={{
        fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        color, textTransform: 'uppercase',
      }}>
        {side === 'left' ? 'Champion' : 'Challenger'}
      </span>
      <span style={{
        fontSize: mobile ? 14 : 15.5, fontWeight: 600, color: 'var(--text)',
        letterSpacing: '-0.022em', lineHeight: 1.2,
        overflowWrap: 'anywhere',
      }}>{m.name}</span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        flexDirection: side === 'left' ? 'row' : 'row-reverse',
      }}>
        <LabLogo org={m.org} size={14} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{m.org}</span>
      </span>
      <span style={{
        fontFamily: MONO, fontSize: mobile ? 20 : 24, fontWeight: 700,
        color: 'var(--text)', letterSpacing: '-0.03em',
        fontVariantNumeric: 'tabular-nums', marginTop: 2,
      }}>
        <AnimatedNumber value={m.elo} format={v => Math.round(v).toString()} />
      </span>
    </button>
  );

  return (
    <div style={{
      background: 'var(--card)',
      border: '0.5px solid var(--sep)',
      borderRadius: 22,
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
    }}>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: mobile ? '13px 16px' : '14px 20px',
        borderBottom: '0.5px solid var(--sep)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <LivePulse color="var(--accent)" />
          <span style={{
            fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            color: 'var(--text)', textTransform: 'uppercase',
          }}>Live bout</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--muted2)' }}>top of the arena</span>
        </span>
        <span style={{
          fontFamily: MONO, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}>Δ {Math.round(gap)} ELO</span>
      </div>

      {/* the arena — the combatants trading blows, edge to edge */}
      <FightArena
        clip="jab"
        aspect={mobile ? '2 / 1' : '2.3 / 1'}
        radius={0}
        border={false}
        alt={`${champ.name} versus ${chall.name}`}
      />

      {/* the tale of the tape */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: mobile ? 8 : 14,
        padding: mobile ? '16px 14px 18px' : '18px 20px 20px',
        borderTop: '0.5px solid var(--sep)',
      }}>
        <Fighter m={champ} org={champOrg} side="left" color="var(--accent)" />
        <span style={{
          fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          color: 'var(--muted2)', flexShrink: 0,
        }}>VS</span>
        <Fighter m={chall} org={challOrg} side="right" color="var(--muted)" />
      </div>
    </div>
  );
}
