// ─── HeroBout — the main event, as one panel of the war room ────────────────
// The two smartest models fight in the clip; under them, the tale of the
// tape: every number both have, the better one lit. One click puts the pair
// into Battle Mode for the full comparison.

import FightArena from '../FightArena.jsx';
import { LabLogo } from '../LabLogo.jsx';
import { AnimatedNumber, LivePulse, MONO } from '../design.jsx';
import { setBattle } from '../../domains/comparison/battleStore.js';
import { fmtMetric, isNum } from '../../../shared/metrics.js';

const MASK = 'linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%), linear-gradient(180deg, transparent 0, #000 10%, #000 90%, transparent 100%)';

const TAPE = [
  { key: 'intelligence', label: 'Intelligence', get: m => m.aa?.intelligence, hi: true },
  { key: 'elo',          label: 'Arena ELO',    get: m => m.arena?.elo, hi: true },
  { key: 'speed',        label: 'Speed',        get: m => m.aa?.speed, hi: true, unit: 'tok/s' },
  { key: 'ttft',         label: 'First token',  get: m => m.aa?.ttft, hi: false },
  { key: 'priceBlended', label: 'Price / 1M',   get: m => m.priceBlended, hi: false },
  { key: 'context',      label: 'Context',      get: m => m.context, hi: true },
];

function compact(n) {
  if (!isNum(n)) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

function Fighter({ m, side, role, onNavigate }) {
  const left = side === 'left';
  if (!m) return <div />;
  return (
    <button type="button" className={`aw-hero-fighter aw-hero-fighter--${side}`} onClick={() => onNavigate({ type: 'model', slug: m.slug })}>
      <span className="aw-hero-role" style={{ color: left ? 'var(--accent)' : 'var(--muted)' }}>{role}</span>
      <span className="aw-hero-name">{m.name}</span>
      <span className="aw-hero-org" style={{ flexDirection: left ? 'row' : 'row-reverse' }}>
        <LabLogo org={m.org} size={13} />{m.org}
      </span>
      <span className="aw-hero-score">
        <AnimatedNumber value={m.score} format={v => v.toFixed(1)} />
        <small>INDEX</small>
      </span>
    </button>
  );
}

export default function HeroBout({ fighters, stats, onNavigate, area }) {
  const [a, b] = fighters ?? [];
  const ready = !!(a && b);
  const rows = ready ? TAPE.map(t => ({ ...t, va: t.get(a), vb: t.get(b) })).filter(r => isNum(r.va) || isNum(r.vb)) : [];
  const fight = () => {
    if (!ready) return;
    setBattle([a, b].map(m => ({ id: m.id, kind: 'llm', name: m.name, org: m.org })));
    onNavigate('compare');
  };

  return (
    <section className="aw-board aw-hero" style={{ gridArea: area }}>
      <div className="aw-hero-head">
        <div className="aw-hero-pill">
          <LivePulse color="#5E9E70" size={6} />
          <span style={{ color: 'var(--text)', fontWeight: 700, letterSpacing: '0.12em' }}>LIVE</span>
          {stats && <span>{stats.models} models · {stats.labs} labs · {compact(stats.votes)} human votes</span>}
        </div>
        <span className="aw-board-eyebrow" style={{ margin: 0 }}>Main event · Intelligence Index</span>
      </div>
      <h1 className="aw-hero-h1">Every AI model, ranked by battle.</h1>
      <p className="aw-hero-sub">Independent benchmarks, real arena votes and live prices — language, code, image, video and voice on one board. Nothing is typed in by hand.</p>

      <div className="aw-hero-arena">
        <FightArena clip="clash" radius={0} border={false} surface="var(--card)"
          alt={ready ? `${a.name} versus ${b.name}` : 'Two robots fighting'}
          style={{ position: 'absolute', inset: 0, aspectRatio: 'auto', height: '100%', WebkitMaskImage: MASK, maskImage: MASK, WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }} />
        <div className="aw-hero-fighters">
          <Fighter m={a} side="left" role="Champion · #1" onNavigate={onNavigate} />
          <div className="aw-hero-vs">
            <b>VS</b>
            {ready && <span>Δ {(a.score - b.score).toFixed(1)} pts</span>}
          </div>
          <Fighter m={b} side="right" role="Challenger · #2" onNavigate={onNavigate} />
        </div>
      </div>

      {rows.length > 0 && (
        <div className="aw-hero-tape">
          {rows.map(r => {
            const both = isNum(r.va) && isNum(r.vb);
            const aWin = both && (r.hi ? r.va >= r.vb : r.va <= r.vb);
            const bWin = both && (r.hi ? r.vb >= r.va : r.vb <= r.va);
            const pct = v => {
              if (!isNum(v)) return 0;
              const best = r.hi ? Math.max(r.va ?? 0, r.vb ?? 0) : Math.min(...[r.va, r.vb].filter(isNum));
              return Math.max(6, Math.min(100, r.hi ? (v / best) * 100 : (best / v) * 100));
            };
            return (
              <div key={r.key} className="aw-hero-tr">
                <span className="aw-hero-v" data-win={aWin ? '1' : '0'}>{fmtMetric(r.key, r.va)}</span>
                <span className="aw-hero-bar aw-hero-bar--l"><i style={{ width: `${pct(r.va)}%`, background: aWin ? 'var(--accent)' : 'var(--muted2)' }} /></span>
                <span className="aw-hero-m">{r.label}</span>
                <span className="aw-hero-bar"><i style={{ width: `${pct(r.vb)}%`, background: bWin ? 'var(--text)' : 'var(--muted2)' }} /></span>
                <span className="aw-hero-v aw-hero-v--r" data-win={bWin ? '1' : '0'}>{fmtMetric(r.key, r.vb)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="aw-hero-actions">
        <button type="button" className="aw-btn aw-btn--solid" onClick={fight} disabled={!ready}>Fight them in Battle Mode →</button>
        <button type="button" className="aw-btn" onClick={() => onNavigate('leaderboard')}>Full ranking</button>
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5, color: 'var(--muted2)', letterSpacing: '0.04em' }}>Lit = better · Artificial Analysis · arena.ai · OpenRouter</span>
      </div>
    </section>
  );
}
