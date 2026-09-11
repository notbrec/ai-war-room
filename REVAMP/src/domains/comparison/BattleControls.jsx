// ─── ADD TO BATTLE button + the roster drawer that follows you around ───────

import { useEffect, useState } from 'react';
import { MONO, SF, EASE } from '../../components/design.jsx';
import { LabLogo } from '../../components/LabLogo.jsx';
import { RobotMascot } from '../../components/Robot.jsx';
import { useMobile } from '../../hooks/useTheme.js';
import { useBattle, toggleBattle, removeFromBattle, clearBattle, KIND_LABEL } from './battleStore.js';
import { Label, Btn, RED } from '../../components/ui.jsx';

let toastFn = null;
export function BattleToastHost() {
  const [msg, setMsg] = useState(null);
  useEffect(() => { toastFn = m => { setMsg(m); setTimeout(() => setMsg(null), 2600); }; return () => { toastFn = null; }; }, []);
  if (!msg) return null;
  return (
    <div role="status" style={{
      position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
      background: 'var(--card)', border: `0.5px solid ${RED}`, color: 'var(--text)', padding: '8px 14px',
      fontFamily: SF, fontSize: 12.5, boxShadow: 'var(--shadow)', animation: `aiwar-pop-in 300ms ${EASE} both`, maxWidth: 'calc(100vw - 32px)',
    }}>{msg}</div>
  );
}

export function AddToBattle({ item, small = true, label = 'Battle', style }) {
  const b = useBattle();
  const on = b.items.some(i => i.id === item.id);
  return (
    <button
      onClick={e => { e.stopPropagation(); const r = toggleBattle(item); if (!r.ok && toastFn) toastFn(r.reason); }}
      className="aiwar-press-btn" title={on ? 'Remove from battle' : 'Add to battle'} aria-pressed={on}
      style={{
        height: small ? 24 : 32, paddingInline: small ? 8 : 12, borderRadius: 980, flexShrink: 0,
        background: on ? 'var(--text)' : 'transparent', color: on ? 'var(--bg)' : 'var(--text)',
        border: `0.5px solid ${on ? 'var(--text)' : 'var(--sep)'}`, cursor: 'pointer',
        fontFamily: MONO, fontSize: small ? 9.5 : 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', ...style,
      }}>
      <span style={{ fontSize: small ? 10 : 12, lineHeight: 1 }}>{on ? '✓' : '+'}</span>{label}
    </button>
  );
}

export function BattleDrawer({ onNavigate, page }) {
  const b = useBattle();
  const mobile = useMobile();
  const [collapsed, setCollapsed] = useState(false);
  if (!b.items.length || page === 'compare') return null;
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 150, fontFamily: SF,
      background: 'var(--nav)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderTop: '0.5px solid var(--sep)', boxShadow: '0 -12px 32px rgba(0,0,0,0.18)',
      animation: `aiwar-fade-up 400ms ${EASE} both`,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: mobile ? '8px 12px' : '10px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <RobotMascot variant="classic" size={18} color="var(--accent)" />
        <Label color="var(--text)">Battle · {KIND_LABEL[b.kind] ?? b.kind}</Label>
        {!collapsed && (
          <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 0, overflowX: 'auto' }}>
            {b.items.map(i => (
              <span key={i.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', border: '0.5px solid var(--sep)', background: 'var(--card)', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                <LabLogo org={i.org} size={11} />{i.name}
                <button onClick={() => removeFromBattle(i.id)} aria-label="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
            {b.items.length < 4 && <span style={{ fontSize: 10.5, color: 'var(--muted2)', fontFamily: MONO, alignSelf: 'center', whiteSpace: 'nowrap' }}>{4 - b.items.length} slot{4 - b.items.length > 1 ? 's' : ''} left</span>}
          </div>
        )}
        {collapsed && <span style={{ flex: 1, fontSize: 11, color: 'var(--muted)', fontFamily: MONO }}>{b.items.length} contestant{b.items.length > 1 ? 's' : ''}</span>}
        {!mobile && <button onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontFamily: MONO, fontSize: 10 }}>{collapsed ? 'SHOW' : 'HIDE'}</button>}
        <button onClick={clearBattle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em' }}>CLEAR</button>
        <Btn small solid onClick={() => onNavigate('compare')} disabled={b.items.length < 2} title={b.items.length < 2 ? 'Add at least two contestants' : 'Open Battle Mode'}>
          Fight {b.items.length >= 2 ? `${b.items.length}` : ''} →
        </Btn>
      </div>
    </div>
  );
}
