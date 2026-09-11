// ─── LLM table columns ──────────────────────────────────────────────────────
// Every column reads a merged record from /api/warroom/llms. Unknown values
// render as N/A via DataTable — never 0.

import { MONO } from '../../components/design.jsx';
import { LabLogo } from '../../components/LabLogo.jsx';
import { ORG_CONFIG } from '../../models-data.js';
import { fmtMetric, fmtDate, isNum, parseContext, blendedPrice, NA } from '../../../shared/metrics.js';
import { eloColor, eloTier, Delta, BadgeTag, SourceTag, GREEN, PURPLE } from '../../components/ui.jsx';
import { AddToBattle } from '../comparison/BattleControls.jsx';

/** Legacy /api/leaderboard row → merged-record shape (offline fallback). */
export function fromLegacy(m) {
  const ctx = parseContext(m.context);
  return {
    id: `legacy:${m.slug}`, slug: m.slug, name: m.name, org: m.org, license: m.license, isOpen: m.isOpen, isThinking: m.isThinking,
    reasoningLevel: m.isThinking ? 'thinking' : null, inArena: true,
    arena: { rank: m.rank, elo: m.elo, ci: m.ci, votes: m.votes, url: m.url ?? null, isNew: m.isNew ?? false },
    arenas: {}, or: null, aa: null,
    priceIn: m.priceIn ?? null, priceOut: m.priceOut ?? null, priceBlended: blendedPrice(m.priceIn, m.priceOut), priceCacheRead: null, priceCacheWrite: null,
    context: ctx, contextLabel: m.context ?? null, maxOutput: null, releaseDate: null, sources: ['arena'], history: null,
  };
}

const num = (v, key) => (isNum(v) ? <span>{fmtMetric(key, v)}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span>);

export function ModelCell({ m, dark, rank, onOpen, compact = false }) {
  const org = ORG_CONFIG[m.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
  const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;
  const r = rank ?? m.arena?.rank;
  const top = isNum(r) && r <= 3;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 10, minWidth: 0 }}>
      <span style={{ width: 30, flexShrink: 0, textAlign: 'right' }}>
        {top ? (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 5px', ...(r === 1 ? { color: '#7A5500', background: '#FFD700' } : r === 2 ? { color: '#555', background: '#D0D0D0' } : { color: '#fff', background: '#CD7F32' }) }}>#{r}</span>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', fontFamily: MONO }}>{isNum(r) ? r : '—'}</span>
        )}
      </span>
      <div style={{ width: compact ? 26 : 32, height: compact ? 26 : 32, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <LabLogo org={m.org} size={compact ? 14 : 18} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <button onClick={e => { e.stopPropagation(); onOpen?.(m); }} className="aiwar-link-underline" style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: compact ? 150 : 220, textAlign: 'left',
          }}>{m.name}</button>
          {m.arena?.isNew && <BadgeTag color={GREEN}>New</BadgeTag>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
          <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{m.org}</span>
          {isNum(m.arena?.elo) && <span style={{ fontSize: 9.5, color: eloColor(m.arena.elo), fontWeight: 700, fontFamily: MONO }}>{eloTier(m.arena.elo)}</span>}
          {m.isThinking && <span title="Reasoning / thinking variant" style={{ fontSize: 9, color: PURPLE }}>🧠</span>}
          {m.isOpen && <span title="Open weights" style={{ fontSize: 9, color: GREEN }}>🔓</span>}
          {!m.inArena && <span title="Not on the arena board — ranked by intelligence only" style={{ fontSize: 9, color: 'var(--muted2)', fontFamily: MONO }}>UNRANKED</span>}
        </div>
      </div>
    </div>
  );
}

export function llmColumns({ dark, onOpen, mobile }) {
  return [
    { key: 'model', label: 'Model', sticky: true, width: mobile ? 210 : 290, sortable: true, value: m => m.arena?.rank ?? 10_000 + (1000 - (m.aa?.intelligence ?? 0)), defaultDir: 'asc',
      render: m => <ModelCell m={m} dark={dark} onOpen={onOpen} compact={mobile} /> },
    // Arena
    { key: 'elo', label: 'Arena ELO', short: 'ELO', metricKey: 'elo', group: 'Arena', numeric: true, width: 84, value: m => m.arena?.elo,
      render: m => isNum(m.arena?.elo) ? <div><div style={{ fontSize: 15, fontWeight: 700, color: eloColor(m.arena.elo), letterSpacing: '-0.03em' }}>{m.arena.elo}</div><div style={{ fontSize: 9.5, color: 'var(--muted2)' }}>±{m.arena.ci ?? '—'}</div></div> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'delta7', label: 'Rank Δ 7d', short: 'Δ7d', group: 'Arena', numeric: true, width: 64, value: m => m.history?.rankDelta7d,
      render: m => m.history?.rankDelta7d != null ? <Delta value={m.history.rankDelta7d} placeholder="=" /> : <span style={{ color: 'var(--muted2)', fontSize: 10, fontFamily: MONO }} title="No snapshot ≥ 7 days old yet">{m.history?.isNew7d ? 'NEW' : NA}</span> },
    { key: 'eloDelta7', label: 'ELO Δ 7d', short: 'ELO Δ', group: 'Arena', numeric: true, width: 64, default: false, value: m => m.history?.eloDelta7d, render: m => <Delta value={m.history?.eloDelta7d} placeholder={m.history ? '=' : NA} /> },
    { key: 'votes', label: 'Votes', metricKey: 'votes', group: 'Arena', numeric: true, width: 68, value: m => m.arena?.votes, render: m => num(m.arena?.votes, 'votes') },
    { key: 'ci', label: 'Confidence ±', short: '±CI', metricKey: 'ci', group: 'Arena', numeric: true, width: 56, default: false, value: m => m.arena?.ci, render: m => num(m.arena?.ci, 'ci') },
    { key: 'visionElo', label: 'Vision ELO', short: 'Vision', metricKey: 'elo', group: 'Arena', numeric: true, width: 70, default: false, value: m => m.arenas?.vision?.elo, render: m => num(m.arenas?.vision?.elo, 'elo') },
    { key: 'searchElo', label: 'Search ELO', short: 'Search', metricKey: 'elo', group: 'Arena', numeric: true, width: 70, default: false, value: m => m.arenas?.search?.elo, render: m => num(m.arenas?.search?.elo, 'elo') },
    // Intelligence
    { key: 'intelligence', label: 'Intelligence Index', short: 'Intel', metricKey: 'intelligence', group: 'Benchmarks', numeric: true, width: 66, value: m => m.aa?.intelligence, render: m => num(m.aa?.intelligence, 'intelligence') },
    { key: 'codingIndex', label: 'Coding Index', short: 'Code', metricKey: 'codingIndex', group: 'Benchmarks', numeric: true, width: 62, default: false, value: m => m.aa?.codingIndex, render: m => num(m.aa?.codingIndex, 'codingIndex') },
    { key: 'agenticIndex', label: 'Agentic Index', short: 'Agent', metricKey: 'agenticIndex', group: 'Benchmarks', numeric: true, width: 62, default: false, value: m => m.aa?.agenticIndex, render: m => num(m.aa?.agenticIndex, 'agenticIndex') },
    // Performance
    { key: 'speed', label: 'Output speed', short: 'Tok/s', metricKey: 'speed', group: 'Performance', numeric: true, width: 66, default: false, value: m => m.aa?.speed, render: m => num(m.aa?.speed, 'speed') },
    { key: 'ttft', label: 'First token', short: 'TTFT', metricKey: 'ttft', group: 'Performance', numeric: true, width: 66, default: false, value: m => m.aa?.ttft, render: m => num(m.aa?.ttft, 'ttft') },
    { key: 'e2e', label: 'End-to-end', short: 'E2E', metricKey: 'e2e', group: 'Performance', numeric: true, width: 66, default: false, value: m => m.aa?.e2e, render: m => num(m.aa?.e2e, 'e2e') },
    // Pricing
    { key: 'priceIn', label: 'Input price', short: 'In $/M', metricKey: 'priceIn', group: 'Pricing', numeric: true, width: 74, value: m => m.priceIn, render: m => num(m.priceIn, 'priceIn') },
    { key: 'priceOut', label: 'Output price', short: 'Out $/M', metricKey: 'priceOut', group: 'Pricing', numeric: true, width: 74, value: m => m.priceOut, render: m => num(m.priceOut, 'priceOut') },
    { key: 'priceBlended', label: 'Blended price', short: 'Blend', metricKey: 'priceBlended', group: 'Pricing', numeric: true, width: 70, default: false, value: m => m.priceBlended, render: m => num(m.priceBlended, 'priceBlended') },
    { key: 'priceCacheRead', label: 'Cached input', short: 'Cache rd', metricKey: 'priceCacheRead', group: 'Pricing', numeric: true, width: 74, default: false, value: m => m.priceCacheRead, render: m => num(m.priceCacheRead, 'priceCacheRead') },
    { key: 'priceCacheWrite', label: 'Cache write', short: 'Cache wr', metricKey: 'priceCacheWrite', group: 'Pricing', numeric: true, width: 74, default: false, value: m => m.priceCacheWrite, render: m => num(m.priceCacheWrite, 'priceCacheWrite') },
    // Capacity
    { key: 'context', label: 'Context window', short: 'Ctx', metricKey: 'context', group: 'Capacity', numeric: true, width: 62, value: m => m.context, render: m => m.contextLabel ? <span style={{ color: 'var(--muted)' }}>{m.contextLabel}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'maxOutput', label: 'Max output', short: 'Max out', metricKey: 'maxOutput', group: 'Capacity', numeric: true, width: 66, default: false, value: m => m.maxOutput, render: m => num(m.maxOutput, 'maxOutput') },
    { key: 'modalities', label: 'Modalities', short: 'In → Out', group: 'Capacity', width: 120, default: false, mobile: false, value: m => m.modalities ? `${m.modalities.in.join('+')}→${m.modalities.out.join('+')}` : null,
      render: m => m.modalities ? <span style={{ fontSize: 10.5, fontFamily: MONO, color: 'var(--muted)' }}>{m.modalities.in.map(x => x[0].toUpperCase()).join('')}→{m.modalities.out.map(x => x[0].toUpperCase()).join('')}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    // Identity
    { key: 'reasoning', label: 'Reasoning', short: 'Reason', group: 'Identity', width: 70, default: false, value: m => m.reasoningLevel ?? (m.supportsReasoning ? 'supported' : null),
      render: m => m.reasoningLevel && m.reasoningLevel !== 'none' ? <BadgeTag color={PURPLE}>{m.reasoningLevel}</BadgeTag> : m.supportsReasoning ? <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: MONO }}>opt-in</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'license', label: 'Licence', group: 'Identity', width: 110, default: false, value: m => m.license, maxWidth: 130,
      render: m => m.license ? <span style={{ fontSize: 11, color: m.isOpen ? GREEN : 'var(--muted)' }}>{m.license}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'released', label: 'Released', metricKey: 'releaseDate', group: 'Identity', width: 96, default: false, value: m => m.releaseDate, defaultDir: 'desc',
      render: m => m.releaseDate ? <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: MONO }}>{fmtDate(m.releaseDate)}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'family', label: 'Family', group: 'Identity', width: 110, default: false, value: m => m.family, render: m => <span style={{ fontSize: 10.5, fontFamily: MONO, color: 'var(--muted)' }}>{m.family}{m.variant ? <span style={{ color: 'var(--muted2)' }}> · {m.variant}</span> : null}</span> },
    { key: 'sources', label: 'Sources', group: 'Identity', width: 150, default: false, sortable: false, mobile: false,
      render: m => <span style={{ display: 'inline-flex', gap: 3 }}>{m.sources.map(s => <SourceTag key={s} id={s} />)}</span> },
    { key: 'battle', label: 'Battle', short: '', group: 'Actions', width: 72, sortable: false, align: 'right',
      render: m => <AddToBattle item={{ id: m.id, kind: 'llm', name: m.name, org: m.org }} /> },
  ];
}
