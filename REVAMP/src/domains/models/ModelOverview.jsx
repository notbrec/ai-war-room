// ─── Model overview — the scouting report ───────────────────────────────────
// One screen that answers "what is this model, where does it stand, what is
// it best at, who are its rivals and what are its variants" from the merged
// record alone. Every figure is a rank or a value the boards already show:
// ranks are counted over the same rows the leaderboard and the benchmark
// pages list, so a "#3" here is the row you land on when you click through.

import { useMemo } from 'react';
import { MONO } from '../../components/design.jsx';
import { LabLogo } from '../../components/LabLogo.jsx';
import { Panel, Label, Btn, BadgeTag, SourceTag, Delta, eloColor, GREEN, GOLD, BLUE, PURPLE } from '../../components/ui.jsx';
import { fmtMetric, fmtDate, isNum, NA } from '../../../shared/metrics.js';
import { aaBenchmarkInfo, DESIGN_CATEGORY_LABEL } from '../benchmarks/registry.js';
import { topByIntelligence } from './ranking.js';
import { setBattle } from '../comparison/battleStore.js';

const link = { color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 };
const num = { fontFamily: MONO, fontVariantNumeric: 'tabular-nums' };

/** Rank of `v` among `values` (1 = best) and the share of the field it beats. */
function standing(v, values, higher) {
  if (!isNum(v) || values.length < 2) return null;
  const better = values.filter(x => (higher ? x > v : x < v)).length;
  const rank = better + 1, total = values.length;
  return { rank, total, pct: 1 - better / (total - 1 || 1) };
}
const bandOf = s => (s.rank / s.total <= 0.5 ? `top ${Math.max(1, Math.round((s.rank / s.total) * 100))}%` : `bottom ${Math.max(1, Math.round((1 - (s.rank - 1) / s.total) * 100))}%`);

/* ── one axis: label · value · rank, and the position on a track ─────────── */
function RankRow({ label, value, s, color, note, last }) {
  return (
    <div style={{ padding: '11px 0 12px', borderBottom: last ? 'none' : '0.5px solid var(--sep2)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', alignItems: 'baseline', columnGap: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--text)', letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ ...num, fontSize: 15, fontWeight: 700, color: s ? color : 'var(--muted2)', letterSpacing: '-0.02em' }}>{value}</span>
        <span style={{ ...num, fontSize: 11, color: 'var(--muted)', minWidth: 92, textAlign: 'right', whiteSpace: 'nowrap' }}>
          {s ? <><b style={{ color: 'var(--text)', fontWeight: 700 }}>#{s.rank}</b> of {s.total}</> : note}
        </span>
      </div>
      {s && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <div style={{ position: 'relative', flex: 1, height: 4, background: 'var(--sep)' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(1.5, s.pct * 100)}%`, background: color, opacity: 0.85 }} />
            <div data-round="1" aria-hidden style={{ position: 'absolute', top: '50%', left: `${Math.max(1.5, s.pct * 100)}%`, width: 8, height: 8, marginLeft: -4, marginTop: -4, background: color, boxShadow: '0 0 0 2px var(--surface-bot)' }} />
          </div>
          <span style={{ ...num, fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted2)', width: 68, textAlign: 'right', flexShrink: 0 }}>{bandOf(s)}</span>
        </div>
      )}
    </div>
  );
}

function RankBadge({ rank }) {
  const c = rank === 1 ? GREEN : rank <= 3 ? BLUE : 'var(--muted)';
  return <span style={{ ...num, fontSize: 11.5, fontWeight: 700, color: c, background: rank <= 3 ? `${c}1c` : 'var(--pill)', padding: '3px 0', width: 38, textAlign: 'center', flexShrink: 0 }}>#{rank}</span>;
}

function KV({ k, children, last }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr)', gap: 12, alignItems: 'baseline', padding: '7px 0', borderBottom: last ? 'none' : '0.5px solid var(--sep2)' }}>
      <Label>{k}</Label>
      <span style={{ fontSize: 12.5, color: 'var(--text)', minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.45 }}>{children}</span>
    </div>
  );
}

/* a model row in the rivals / variants lists */
function ModelRow({ m, self, score, scoreColor, sub, right, onOpen, last }) {
  return (
    <button onClick={self ? undefined : onOpen} className={self ? undefined : 'aiwar-ov-row'} style={{
      display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) auto auto', alignItems: 'center', columnGap: 10, width: '100%',
      padding: '9px 10px', margin: '0 -10px', boxSizing: 'content-box', background: self ? 'var(--hover)' : 'transparent', border: 'none',
      borderBottom: last ? 'none' : '0.5px solid var(--sep2)', cursor: self ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit',
    }}>
      <LabLogo org={m.org} size={14} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
          {self && <BadgeTag color="var(--text)">This model</BadgeTag>}
        </span>
        {sub && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
      <span style={{ ...num, fontSize: 11, color: 'var(--muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>{right}</span>
      <span style={{ ...num, fontSize: 14, fontWeight: 700, color: scoreColor ?? 'var(--text)', minWidth: 44, textAlign: 'right' }}>{score}</span>
    </button>
  );
}

export default function ModelOverview({ model, models, family, lab, providers, desc, mobile, onNavigate, onSection, sweRuns = [] }) {
  const elo = model.arena?.elo;

  // ── where it ranks ────────────────────────────────────────────────────────
  const axes = useMemo(() => {
    const col = get => models.map(get).filter(isNum);
    const A = (label, get, higher, key, color, note) => {
      const v = get(model);
      return { label, value: isNum(v) ? fmtMetric(key, v) : NA, s: standing(v, col(get), higher), color, note };
    };
    return [
      A('Intelligence Index', m => m.aa?.intelligence, true, 'intelligence', BLUE, 'not benchmarked'),
      model.arena
        ? { label: 'Arena ELO', value: String(elo), s: { rank: model.arena.rank, total: models.filter(m => m.inArena).length, pct: 1 - (model.arena.rank - 1) / Math.max(1, models.filter(m => m.inArena).length - 1) }, color: eloColor(elo) }
        : { label: 'Arena ELO', value: NA, s: null, note: 'not rated yet' },
      A('Output speed', m => m.aa?.speed, true, 'speed', PURPLE, 'not measured'),
      A('Time to first token', m => m.aa?.ttft, false, 'ttft', PURPLE, 'not measured'),
      A('Blended price', m => m.priceBlended, false, 'priceBlended', GOLD, 'no listed price'),
      A('Context window', m => m.context, true, 'context', 'var(--text)', 'not listed'),
    ];
  }, [model, models, elo]);

  // ── benchmark placements, best first ──────────────────────────────────────
  const placements = useMemo(() => {
    const out = [];
    for (const [k, v] of Object.entries(model.aa?.benchmarks ?? {})) {
      if (!isNum(v)) continue;
      const s = standing(v, models.map(m => m.aa?.benchmarks?.[k]).filter(isNum), true);
      if (!s || s.total < 5) continue;
      const info = aaBenchmarkInfo(k);
      out.push({ k, s, info, text: info.unit === 'Elo' ? String(Math.round(v)) : v <= 1 ? `${(v * 100).toFixed(1)}%` : v.toFixed(1) });
    }
    return out.sort((a, b) => a.s.rank / a.s.total - b.s.rank / b.s.total || b.s.total - a.s.total);
  }, [model, models]);
  const design = useMemo(() => [...(model.or?.designArena ?? [])].filter(d => isNum(d.elo) && isNum(d.rank)).sort((a, b) => a.rank - b.rank || b.elo - a.elo), [model]);

  // ── the models either side of it ──────────────────────────────────────────
  const rivals = useMemo(() => {
    const byIntel = isNum(model.aa?.intelligence);
    const fam = m => `${m.org}|${m.family ?? m.id}`;
    const score = m => (byIntel ? m.aa?.intelligence : m.arena?.elo);
    const pool = (byIntel ? topByIntelligence(models, 9999) : models.filter(m => m.inArena).sort((a, b) => a.arena.rank - b.arena.rank)).filter(m => fam(m) !== fam(model));
    if (!isNum(score(model)) || !pool.length) return { byIntel, rows: [] };
    const above = pool.filter(m => score(m) > score(model)).slice(-2);
    const below = pool.filter(m => score(m) <= score(model)).slice(0, 4 - above.length);
    return { byIntel, score, rows: [...above.map(m => ({ m })), { m: model, self: true }, ...below.map(m => ({ m }))], near: [...above.reverse(), ...below] };
  }, [model, models]);

  const variants = useMemo(() => {
    const v = [model, ...family].sort((a, b) => (b.aa?.intelligence ?? -1) - (a.aa?.intelligence ?? -1) || (b.arena?.elo ?? -1) - (a.arena?.elo ?? -1));
    return v.length > 1 ? v.slice(0, 7) : null;
  }, [model, family]);

  const cheapest = providers?.endpoints?.find(e => e.tag === providers.winners?.cheapest);
  const open = m => onNavigate({ type: 'model', slug: m.slug });
  const priceVs = m => {
    if (!isNum(m.priceBlended)) return 'no listed price';
    const p = fmtMetric('priceBlended', m.priceBlended);
    if (!isNum(model.priceBlended) || model.priceBlended <= 0 || m.priceBlended <= 0) return p;
    const r = m.priceBlended / model.priceBlended;
    return r > 1.15 ? `${p} · ${r >= 10 ? Math.round(r) : r.toFixed(1)}× pricier` : r < 0.87 ? `${p} · ${1 / r >= 10 ? Math.round(1 / r) : (1 / r).toFixed(1)}× cheaper` : `${p} · same price`;
  };
  const battleRivals = () => { setBattle([model, ...rivals.near.slice(0, 3)].map(m => ({ id: m.id, kind: 'llm', name: m.name, org: m.org }))); onNavigate('compare'); };

  const cols = mobile ? 'minmax(0, 1fr)' : 'minmax(0, 7fr) minmax(0, 5fr)';
  const mods = model.modalities;
  const reasoning = model.reasoningLevel && model.reasoningLevel !== 'none' ? `Yes · ${model.reasoningLevel}` : model.supportsReasoning ? 'Opt-in' : model.supportsReasoning === false ? 'No' : null;

  const About = (
    <Panel title="About" pad={mobile ? 16 : 20}>
      <p style={{ fontSize: mobile ? 15 : 15.5, lineHeight: 1.65, color: 'var(--text)', margin: 0, letterSpacing: '-0.011em' }}>
        {desc ?? (
          <>
            {model.name} is a model from {model.org}.
            {model.arena ? ` It holds arena ELO ${elo} (rank #${model.arena.rank}) from ${fmtMetric('votes', model.arena.votes)} human battles.` : ''}
            {isNum(model.aa?.intelligence) ? ` Its Intelligence Index is ${fmtMetric('intelligence', model.aa.intelligence)}.` : ''}
            {' '}No long-form profile has been written for it yet — see the{' '}
            <a href="#methodology" onClick={e => { e.preventDefault(); onNavigate('methodology'); }} style={link}>methodology</a>
            {' '}for how these numbers are produced.
          </>
        )}
      </p>
    </Panel>
  );

  const Glance = (
    <Panel title="At a glance" pad={mobile ? 16 : 20}>
      <KV k="Released">{fmtDate(model.releaseDate)}</KV>
      <KV k="Licence"><span style={{ color: model.isOpen ? GREEN : 'var(--text)' }}>{model.license ?? NA}</span>{model.isOpen && <span style={{ color: 'var(--muted)' }}> · open weights</span>}</KV>
      <KV k="Context">{model.contextLabel ?? NA}{isNum(model.maxOutput) && <span style={{ color: 'var(--muted)' }}> · up to {fmtMetric('maxOutput', model.maxOutput)} out</span>}</KV>
      {mods && <KV k="Modalities">{mods.in.join(', ')} <span style={{ color: 'var(--muted2)' }}>→</span> {mods.out.join(', ')}</KV>}
      {reasoning && <KV k="Reasoning">{reasoning}</KV>}
      {model.supportsTools != null && <KV k="Tool calling">{model.supportsTools ? 'Yes' : 'No'}</KV>}
      {model.or?.knowledgeCutoff && <KV k="Knowledge cutoff">{model.or.knowledgeCutoff}</KV>}
      <KV k="Hosts">
        {providers
          ? <a href="#" onClick={e => { e.preventDefault(); onSection('Providers'); }} style={link}>{providers.count} on OpenRouter{cheapest && isNum(cheapest.priceBlended) ? ` · cheapest ${cheapest.provider} ${fmtMetric('priceBlended', cheapest.priceBlended)}` : ''} →</a>
          : <span style={{ color: 'var(--muted)' }}>{model.or ? 'not tracked per host' : 'not on OpenRouter'}</span>}
      </KV>
      <KV k="Links" last>
        <span style={{ display: 'inline-flex', gap: '4px 14px', flexWrap: 'wrap' }}>
          {model.or?.id && <a href={`https://openrouter.ai/${model.or.id}`} target="_blank" rel="noreferrer noopener" style={link}>OpenRouter ↗</a>}
          {model.arena?.url && <a href={model.arena.url} target="_blank" rel="noreferrer noopener" style={link}>Model card ↗</a>}
          {model.or?.huggingFaceId && <a href={`https://huggingface.co/${model.or.huggingFaceId}`} target="_blank" rel="noreferrer noopener" style={link}>Hugging Face ↗</a>}
          {!model.or?.id && !model.arena?.url && !model.or?.huggingFaceId && <span style={{ color: 'var(--muted)' }}>{NA}</span>}
        </span>
      </KV>
    </Panel>
  );

  const Standing = (
    <Panel title="Where it ranks" pad={mobile ? 16 : 20} action={<span style={{ ...num, fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.06em' }}>AMONG {models.length} MODELS</span>}>
      <div style={{ marginTop: -6 }}>
        {axes.map((a, i) => <RankRow key={a.label} {...a} last={i === axes.length - 1 && !model.arena} />)}
      </div>
      {model.arena && (
        <div style={{ display: 'flex', gap: '6px 16px', flexWrap: 'wrap', alignItems: 'center', paddingTop: 12, fontSize: 12, color: 'var(--muted)' }}>
          <SourceTag id="arena" />
          <span>{fmtMetric('votes', model.arena.votes)} votes</span>
          {isNum(model.arena.ci) && <span>±{model.arena.ci}</span>}
          <span>7d <Delta value={model.history?.rankDelta7d} placeholder={model.history ? '=' : NA} /></span>
          <span>30d <Delta value={model.history?.rankDelta30d} placeholder={model.history ? '=' : NA} /></span>
          {['vision', 'search', 'webdev'].map(b => model.arenas?.[b] && <span key={b}>{b === 'webdev' ? 'WebDev' : b[0].toUpperCase() + b.slice(1)} <b style={{ ...num, color: 'var(--text)' }}>{model.arenas[b].elo}</b> <span style={num}>#{model.arenas[b].rank}</span></span>)}
        </div>
      )}
    </Panel>
  );

  const shownPlacements = placements.slice(0, 6);
  const weakest = placements.length > 6 ? placements[placements.length - 1] : null;
  const Strengths = (
    <Panel title={placements.length ? 'Best placements' : design.length ? 'Best placements · Design Arena' : 'Benchmarks'} pad={mobile ? 16 : 20}
      action={placements.length ? <SourceTag id="aa" /> : design.length ? <SourceTag id="designarena" /> : null}>
      {placements.length > 0 ? (
        <>
          <div style={{ marginTop: -4 }}>
            {shownPlacements.map((p, i) => (
              <button key={p.k} onClick={() => p.info.id && onNavigate({ type: 'benchmarks', slug: p.info.id })} className="aiwar-ov-row" style={{
                display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', columnGap: 12, width: '100%', padding: '8px 10px', margin: '0 -10px', boxSizing: 'content-box',
                background: 'transparent', border: 'none', borderBottom: i === shownPlacements.length - 1 ? 'none' : '0.5px solid var(--sep2)', cursor: p.info.id ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit',
              }}>
                <RankBadge rank={p.s.rank} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.info.label}</span>
                  <span style={{ ...num, fontSize: 10.5, color: 'var(--muted2)' }}>of {p.s.total} models</span>
                </span>
                <span style={{ ...num, fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{p.text}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--sep)' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', minWidth: 0 }}>{weakest ? <>Lowest: <b style={{ ...num, color: 'var(--text)' }}>#{weakest.s.rank}</b> of {weakest.s.total} on {weakest.info.label}</> : `${placements.length} evaluation${placements.length === 1 ? '' : 's'} published`}</span>
            <Btn small onClick={() => onSection('Benchmarks')}>All {placements.length} →</Btn>
          </div>
        </>
      ) : design.length > 0 ? (
        <>
          <div style={{ marginTop: -4 }}>
            {design.slice(0, 6).map((d, i, a) => (
              <div key={`${d.arena}:${d.category}`} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', columnGap: 12, padding: '8px 0', borderBottom: i === a.length - 1 ? 'none' : '0.5px solid var(--sep2)' }}>
                <RankBadge rank={d.rank} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{DESIGN_CATEGORY_LABEL[d.category] ?? d.category}<span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {d.arena}</span></span>
                <span style={{ ...num, fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{Math.round(d.elo)}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--sep)', display: 'flex', justifyContent: 'flex-end' }}><Btn small onClick={() => onSection('Benchmarks')}>All benchmarks →</Btn></div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
          No per-benchmark scores have been published for this model yet.
          {sweRuns.length > 0 ? ` It appears in ${sweRuns.length} SWE-bench run${sweRuns.length === 1 ? '' : 's'} — see the Benchmarks tab.` : ' Its rank here rests on the figures on the left.'}
        </p>
      )}
    </Panel>
  );

  const Rivals = rivals.rows.length > 1 && (
    <Panel title={mobile ? 'Closest rivals' : `Closest rivals · by ${rivals.byIntel ? 'Intelligence Index' : 'arena ELO'}`} pad={mobile ? 16 : 20}
      action={rivals.near.length > 0 && <Btn small solid onClick={battleRivals}>Battle them →</Btn>}>
      <div style={{ marginTop: -6 }}>
        {rivals.rows.map(({ m, self }, i) => {
          const d = rivals.score(m) - rivals.score(model);
          return <ModelRow key={m.id} m={m} self={self} last={i === rivals.rows.length - 1} onOpen={() => open(m)}
            score={rivals.byIntel ? fmtMetric('intelligence', rivals.score(m)) : rivals.score(m)} scoreColor={rivals.byIntel ? (self ? BLUE : 'var(--text)') : eloColor(rivals.score(m))}
            sub={self ? (isNum(m.priceBlended) ? fmtMetric('priceBlended', m.priceBlended) : 'no listed price') : priceVs(m)}
            right={self ? '' : `${d > 0 ? '+' : d < 0 ? '−' : '±'}${rivals.byIntel ? Math.abs(d).toFixed(1) : Math.abs(Math.round(d))}`} />;
        })}
      </div>
    </Panel>
  );

  const list = variants ?? lab.slice(0, 5);
  const Family = list.length > 0 && (
    <Panel title={variants ? `Effort levels & variants · ${variants.length}` : `More from ${model.org}`} pad={mobile ? 16 : 20}
      action={<Btn small onClick={() => onSection('Related')}>All related →</Btn>}>
      <div style={{ marginTop: -6 }}>
        {list.map((m, i) => (
          <ModelRow key={m.id} m={m} self={m.id === model.id} last={i === list.length - 1} onOpen={() => open(m)}
            score={isNum(m.aa?.intelligence) ? fmtMetric('intelligence', m.aa.intelligence) : (m.arena?.elo ?? NA)}
            scoreColor={isNum(m.aa?.intelligence) ? (m.id === model.id ? BLUE : 'var(--text)') : eloColor(m.arena?.elo)}
            sub={[m.reasoningLevel && m.reasoningLevel !== 'none' ? `reasoning ${m.reasoningLevel}` : null, m.arena ? `arena #${m.arena.rank}` : null].filter(Boolean).join(' · ') || (variants ? 'base' : m.org)}
            right={isNum(m.priceBlended) ? fmtMetric('priceBlended', m.priceBlended) : ''} />
        ))}
      </div>
    </Panel>
  );

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>{About}{Standing}{Rivals}</div>
        <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>{mobile ? <>{Strengths}{Family}{Glance}</> : <>{Glance}{Strengths}{Family}</>}</div>
      </div>
    </div>
  );
}
