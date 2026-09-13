// ─── LLM RANKINGS — the models page ─────────────────────────────────────────
// One control bar at the top drives every section below it: pick models
// by name (or take a preset), filter by type, price, context and lab, and
// the highlights, the ELO chart, ELO vs price, cost, context, benchmarks,
// openness, the Artificial Analysis sections when that source is
// configured, and finally the full table all follow. Same shape as the
// benchmark sites people already read, drawn our way.

import { useState, useMemo, useCallback } from 'react';
import { MODELS, ORG_CONFIG, RELEASE, getDescription } from '../models-data.js';
import { useDark, useMobile } from '../hooks/useTheme.js';
import { SF, MONO, EASE, Reveal, AnimatedNumber, Eyebrow, GlobalMotion, ComparisonBar } from '../components/design.jsx';
import ChampionBout from '../components/ChampionBout.jsx';
import { RobotMascot } from '../components/Robot.jsx';
import { useLLMs, useCoding } from '../data/useDomain.js';
import DataTable, { useColumnSelection, ColumnPicker } from '../components/table/DataTable.jsx';
import { llmColumns, fromLegacy } from '../domains/models/columns.jsx';
import LLMCharts from '../domains/models/LLMCharts.jsx';
import { BarPanel, HighlightGrid, ChartSection, SectionNav } from '../components/Highlights.jsx';
import ModelPicker, { useModelPick } from '../components/ModelPicker.jsx';
import BenchMatrix from '../components/BenchMatrix.jsx';
import { BENCHMARKS } from '../domains/benchmarks/registry.js';
import { Chip, Segmented, DataStatus, eloColor, Label, StatTile, Btn, BadgeTag, GREEN, PURPLE, BLUE, GOLD } from '../components/ui.jsx';
import { AddToBattle } from '../domains/comparison/BattleControls.jsx';
import { fmtMetric, isNum, NA, metric } from '../../shared/metrics.js';

const SORTS = [
  { key: 'elo',          label: 'ELO' },
  { key: 'intelligence', label: 'Intelligence' },
  { key: 'votes',        label: 'Votes' },
  { key: 'priceIn',      label: 'Price ↑' },
  { key: 'context',      label: 'Context' },
  { key: 'released',     label: 'Newest' },
];

const PRICE_CAPS = [{ v: 1, l: '≤ $1/M' }, { v: 5, l: '≤ $5/M' }, { v: 15, l: '≤ $15/M' }];
const CTX_MINS   = [{ v: 128_000, l: '≥ 128K' }, { v: 256_000, l: '≥ 256K' }, { v: 1_000_000, l: '≥ 1M' }];
const LIMITS     = [10, 20, 40];
const LABS_SHOWN = 12;

/* the benchmark columns worth a place on the rankings page, in this order */
const MATRIX_IDS = ['arena-text', 'arena-vision', 'arena-search', 'aa-intel', 'aa-coding', 'aa-agentic', 'swe-verified', 'gpqa', 'hle', 'aime'];

/** Lab filter chips, built from whatever is on the board right now. */
function orgsFrom(models) {
  const counts = models.reduce((acc, m) => { acc[m.org] = (acc[m.org] || 0) + 1; return acc; }, {});
  return Object.entries(counts).filter(([org]) => org && org !== 'Unknown').sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([org]) => org);
}

function StatCard({ label, value, color, animate = false, format, suffix }) {
  return (
    <div style={{ background: 'var(--card)', padding: '16px 18px', flex: 1, minWidth: 0, border: '0.5px solid var(--sep)' }}>
      <div style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: MONO, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? 'var(--text)', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {animate && typeof value === 'number' ? <AnimatedNumber value={value} format={format} suffix={suffix} /> : value}
      </div>
    </div>
  );
}

/* one labelled row of the control bar */
function Row({ label, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 0', borderBottom: last ? 'none' : '0.5px solid var(--sep2)' }}>
      <Label style={{ width: 52, flexShrink: 0, paddingTop: 8 }}>{label}</Label>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', minWidth: 0, flex: 1 }}>{children}</div>
    </div>
  );
}

const bar = (m, value, label, extra = {}) => ({ id: m.id, name: m.name, org: m.org, m, value, label, ...extra });

export default function LeaderboardPage({ liveModels, onNavigate }) {
  const dark   = useDark();
  const mobile = useMobile();
  const llms   = useLLMs();
  const coding = useCoding();

  // Merged records from the command-center API; fall back to the legacy
  // arena feed (mapped to the same shape) if that endpoint is unreachable.
  const models = useMemo(() => {
    if (llms.models.length) return llms.models;
    const legacy = liveModels?.length ? liveModels : MODELS;
    return legacy.map(fromLegacy);
  }, [llms.models, liveModels]);
  const usingFallback = !llms.models.length;
  const aa = !!llms.capabilities?.aa;
  const pick = useModelPick(models);

  const [sort, setSort]                   = useState({ key: 'elo', dir: 'desc' });
  const [query, setQuery]                 = useState('');
  const [filterOpen, setFilterOpen]       = useState(false);
  const [filterThinking, setFilterThinking] = useState(false);
  const [filterVision, setFilterVision]   = useState(false);
  const [filterTools, setFilterTools]     = useState(false);
  const [filterIndexed, setFilterIndexed] = useState(false);
  const [includeUnranked, setIncludeUnranked] = useState(false);
  const [priceCap, setPriceCap]           = useState(null);
  const [ctxMin, setCtxMin]               = useState(null);
  const [filterOrg, setFilterOrg]         = useState('');
  const [allLabs, setAllLabs]             = useState(false);
  const [limit, setLimit]                 = useState(mobile ? 10 : 20);
  const [expandedId, setExpandedId]       = useState(null);
  const [selected, setSelected]           = useState(() => new Set());

  const openModel = useCallback(m => onNavigate({ type: 'model', slug: m.slug }), [onNavigate]);
  const columns = useMemo(() => llmColumns({ dark, onOpen: openModel, mobile }), [dark, openModel, mobile]);
  const colSel = useColumnSelection('llm-rankings-v1', columns);

  const q = query.trim().toLowerCase();
  const activeFilters = [filterOpen, filterThinking, filterVision, filterTools, filterIndexed, includeUnranked, priceCap != null, ctxMin != null, !!filterOrg].filter(Boolean).length;
  const filtered = useMemo(() => models.filter(m => {
    if (!includeUnranked && !m.inArena) return false;
    if (q && !m.name.toLowerCase().includes(q) && !m.org.toLowerCase().includes(q) && !(m.family ?? '').includes(q.replace(/[^a-z0-9]/g, ''))) return false;
    if (filterOpen && !m.isOpen) return false;
    if (filterThinking && !m.isThinking) return false;
    if (filterVision && !(m.modalities?.in?.includes('image'))) return false;
    if (filterTools && !m.supportsTools) return false;
    if (filterIndexed && !isNum(m.aa?.intelligence)) return false;
    if (priceCap != null && !(isNum(m.priceIn) && m.priceIn <= priceCap)) return false;
    if (ctxMin != null && !(isNum(m.context) && m.context >= ctxMin)) return false;
    if (filterOrg && m.org !== filterOrg) return false;
    return true;
  }), [models, q, filterOpen, filterThinking, filterVision, filterTools, filterIndexed, includeUnranked, priceCap, ctxMin, filterOrg]);

  const ranked     = models.filter(m => m.inArena);
  const totalVotes = ranked.reduce((s, m) => s + (m.arena?.votes ?? 0), 0);
  const topElo     = ranked.length ? Math.max(...ranked.map(m => m.arena?.elo ?? 0)) : 0;
  const openCount  = ranked.filter(m => m.isOpen).length;
  const allOrgs    = orgsFrom(ranked);
  const boutModels = useMemo(() => [...ranked].sort((a, b) => (b.arena?.elo ?? 0) - (a.arena?.elo ?? 0)).slice(0, 2).map(m => ({ ...m, elo: m.arena.elo, ci: m.arena.ci, votes: m.arena.votes, votesLabel: fmtMetric('votes', m.arena.votes) })), [ranked]);

  // The chart rows: the hand-picked models if any, else the filtered set,
  // best first, cut to the chosen size.
  const picking = pick.picked.length > 0;
  const chartRows = useMemo(() => {
    const src = picking ? pick.picked : filtered;
    const rows = [...src].sort((a, b) => (b.arena?.elo ?? -1) - (a.arena?.elo ?? -1));
    return picking ? rows : rows.filter(m => isNum(m.arena?.elo)).slice(0, limit);
  }, [picking, pick.picked, filtered, limit]);
  const n = chartRows.length;
  const scope = picking ? `${n} selected` : `${activeFilters > 0 || q ? 'Filtered' : 'Top'} ${n}`;

  const charts = useMemo(() => ({
    elo:      chartRows.filter(m => isNum(m.arena?.elo)).map(m => bar(m, m.arena.elo, String(m.arena.elo))),
    cost:     chartRows.filter(m => isNum(m.priceIn) && isNum(m.priceOut)).sort((a, b) => a.priceBlended - b.priceBlended)
                .map(m => bar(m, m.priceIn + m.priceOut, fmtMetric('priceBlended', m.priceBlended), { parts: [{ value: m.priceIn, opacity: 1 }, { value: m.priceOut, opacity: 0.55 }] })),
    context:  chartRows.filter(m => isNum(m.context)).sort((a, b) => b.context - a.context).map(m => bar(m, m.context, fmtMetric('context', m.context))),
    intel:    chartRows.filter(m => isNum(m.aa?.intelligence)).sort((a, b) => b.aa.intelligence - a.aa.intelligence).map(m => bar(m, m.aa.intelligence, fmtMetric('intelligence', m.aa.intelligence))),
    speed:    chartRows.filter(m => isNum(m.aa?.speed)).sort((a, b) => b.aa.speed - a.aa.speed).map(m => bar(m, m.aa.speed, fmtMetric('speed', m.aa.speed))),
    ttft:     chartRows.filter(m => isNum(m.aa?.ttft)).sort((a, b) => a.aa.ttft - b.aa.ttft).map(m => bar(m, m.aa.ttft, fmtMetric('ttft', m.aa.ttft))),
  }), [chartRows]);
  const hl = useMemo(() => ({
    elo:     charts.elo.slice(0, 10),
    price:   chartRows.slice(0, 10).filter(m => isNum(m.priceBlended)).sort((a, b) => a.priceBlended - b.priceBlended).map(m => bar(m, m.priceBlended, fmtMetric('priceBlended', m.priceBlended))),
    context: chartRows.slice(0, 10).filter(m => isNum(m.context)).sort((a, b) => b.context - a.context).map(m => bar(m, m.context, fmtMetric('context', m.context))),
  }), [charts.elo, chartRows]);

  // Openness: the open-weight models in scope; if the scope has fewer than
  // three, the best open models on the whole board instead.
  const openness = useMemo(() => {
    const inScope = chartRows.filter(m => m.isOpen);
    const rows = inScope.length >= 3 ? inScope : [...filtered].filter(m => m.isOpen && isNum(m.arena?.elo)).sort((a, b) => b.arena.elo - a.arena.elo).slice(0, limit);
    const lic = {};
    for (const m of rows) { const k = m.license ?? 'open'; lic[k] = (lic[k] ?? 0) + 1; }
    return { rows, fromScope: inScope.length >= 3, bars: rows.filter(m => isNum(m.arena?.elo)).map(m => bar(m, m.arena.elo, String(m.arena.elo))), licences: Object.entries(lic).sort((a, b) => b[1] - a[1]), share: n ? Math.round((inScope.length / n) * 100) : 0 };
  }, [chartRows, filtered, limit, n]);

  // Benchmarks: SWE-bench "best per model" lookups + the registry getters
  const sweBest = useMemo(() => {
    const out = new Map();
    for (const r of coding.boards?.Verified ?? []) if (r.linkedModelId) out.set(r.linkedModelId, Math.max(out.get(r.linkedModelId) ?? -1, r.resolved));
    return out;
  }, [coding.boards]);
  const benches = useMemo(() => MATRIX_IDS.map(id => BENCHMARKS.find(b => b.id === id)).filter(Boolean), []);
  const valueOf = useCallback((b, m) => (b.external === 'swe' ? (sweBest.get(m.id) ?? null) : b.external ? null : b.get(m)), [sweBest]);

  const clearFilters = () => { setFilterOpen(false); setFilterThinking(false); setFilterVision(false); setFilterTools(false); setFilterIndexed(false); setIncludeUnranked(false); setPriceCap(null); setCtxMin(null); setFilterOrg(''); setQuery(''); };
  const setSortKey = key => {
    const col = columns.find(c => c.key === key);
    const dir = key === 'priceIn' ? 'asc' : (col?.defaultDir ?? 'desc');
    setSort({ key, dir });
  };

  const sourcesUsed = ['arena', ...(llms.sources?.openrouter?.status === 'live' || llms.sources?.openrouter?.status === 'stale' ? ['openrouter'] : []), ...(aa ? ['aa'] : [])];
  const status = usingFallback ? (llms.status === 'loading' ? 'loading' : 'offline') : llms.status;
  const open = it => openModel(it.m);
  const labsShown = allLabs || filterOrg ? allOrgs : allOrgs.slice(0, LABS_SHOWN);

  const sections = [
    { id: 'sec-highlights', label: 'Highlights' }, { id: 'sec-elo', label: 'ELO' }, { id: 'sec-value', label: 'ELO vs price' },
    { id: 'sec-cost', label: 'Cost' }, { id: 'sec-context', label: 'Context' },
    ...(aa && charts.intel.length ? [{ id: 'sec-intel', label: 'Intelligence' }] : []),
    ...(aa && charts.speed.length ? [{ id: 'sec-speed', label: 'Speed' }] : []),
    ...(aa && charts.ttft.length ? [{ id: 'sec-latency', label: 'Latency' }] : []),
    { id: 'sec-bench', label: 'Benchmarks' }, { id: 'sec-open', label: 'Openness' }, { id: 'sec-table', label: 'Table' },
  ];

  return (
    <div className="page-enter" style={{ background: 'transparent', fontFamily: SF, minHeight: '100vh' }}>
      <GlobalMotion />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: mobile ? '40px 16px 96px' : '64px 24px 112px' }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header style={{ marginBottom: mobile ? 28 : 36 }}>
          <div style={{ opacity: 0, animation: `aiwar-fade-up 700ms ${EASE} both` }}>
            <Eyebrow>LLM Rankings</Eyebrow>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 12 : 18, margin: '10px 0 14px', opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 80ms both` }}>
            <h1 style={{ fontSize: mobile ? 'clamp(34px,8.5vw,46px)' : 'clamp(48px,5.4vw,72px)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.98, color: 'var(--text)', margin: 0 }}>
              The ranking.
            </h1>
            <RobotMascot variant="eared" size={mobile ? 36 : 48} color="var(--accent)" style={{ flexShrink: 0 }} />
          </div>
          <p style={{ fontSize: mobile ? 15 : 17, lineHeight: 1.45, color: 'var(--muted)', letterSpacing: '-0.015em', margin: '0 0 14px', maxWidth: 720, opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 120ms both` }}>
            Every language model by arena ELO, price, context and benchmarks{aa ? ', plus intelligence, speed and latency' : ''}. Pick the models once at the top — every chart and the table follow.
          </p>
          <div style={{ opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 160ms both` }}>
            <DataStatus status={status} fetchedAt={llms.data?.fetchedAt} sources={sourcesUsed} loading={llms.loading} onRefresh={llms.reload} />
          </div>
        </header>

        {/* ── Live bout: the top two combatants ────────────────────── */}
        {boutModels.length >= 2 && (
          <Reveal>
            <div style={{ marginBottom: 24 }}>
              <ChampionBout models={boutModels} onNavigate={onNavigate} mobile={mobile} variant="compact" />
            </div>
          </Reveal>
        )}

        {/* ── Stats row ────────────────────────────────────────────── */}
        <Reveal>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: mobile ? 'wrap' : 'nowrap' }}>
            <StatCard label="Models" value={ranked.length > 0 ? ranked.length : '—'} animate format={v => Math.round(v).toString()} />
            <StatCard label="Total votes" value={ranked.length > 0 ? totalVotes : '—'} animate format={v => { const n = Math.round(v); return n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : `${Math.round(n/1000)}K`; }} />
            <StatCard label="Top ELO" value={ranked.length > 0 ? topElo : '—'} animate format={v => Math.round(v).toString()} />
            <StatCard label="Open weight" value={ranked.length > 0 ? openCount : '—'} animate format={v => Math.round(v).toString()} />
          </div>
        </Reveal>

        {/* ── Control bar — drives everything below ────────────────── */}
        <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', padding: mobile ? '4px 12px 6px' : '6px 18px 8px', marginBottom: 14 }}>
          <Row label="Models">
            <ModelPicker models={models} pick={pick} mobile={mobile} />
          </Row>
          <Row label="Show">
            <Segmented small value={picking ? 'picked' : limit} onChange={v => { if (v === 'picked') return; pick.clear(); setLimit(v); }}
              options={[...LIMITS.map(x => ({ value: x, label: `Top ${x}` })), ...(picking ? [{ value: 'picked', label: `${n} selected` }] : [])]} />
            <div style={{ width: '0.5px', height: 18, background: 'var(--sep)', marginInline: 4, flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter by name, family or lab…"
                style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--text)', letterSpacing: '-0.015em', fontFamily: SF, height: 28 }} />
              {query && <button onClick={() => setQuery('')} className="aiwar-press-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.5, fontSize: 14 }}>×</button>}
            </div>
          </Row>
          <Row label="Type">
            <Chip small active={filterOpen}     color={GREEN}  label="Open weights" onClick={() => setFilterOpen(v => !v)} />
            <Chip small active={filterThinking} color={PURPLE} label="Reasoning"    onClick={() => setFilterThinking(v => !v)} />
            <Chip small active={filterVision}   color={BLUE}   label="Vision"       onClick={() => setFilterVision(v => !v)} title="Accepts image input (OpenRouter modalities)" />
            <Chip small active={filterTools}    color={BLUE}   label="Tools"        onClick={() => setFilterTools(v => !v)} title="Supports tool calling" />
            <Chip small active={filterIndexed}  color={GOLD}   label="Indexed"      onClick={() => setFilterIndexed(v => !v)} title="Has an Intelligence Index" />
            <div style={{ width: '0.5px', height: 18, background: 'var(--sep)', marginInline: 4, flexShrink: 0 }} />
            {PRICE_CAPS.map(p => <Chip key={p.v} small active={priceCap === p.v} label={p.l} onClick={() => setPriceCap(priceCap === p.v ? null : p.v)} />)}
            <div style={{ width: '0.5px', height: 18, background: 'var(--sep)', marginInline: 4, flexShrink: 0 }} />
            {CTX_MINS.map(c => <Chip key={c.v} small active={ctxMin === c.v} label={c.l} onClick={() => setCtxMin(ctxMin === c.v ? null : c.v)} />)}
            <div style={{ width: '0.5px', height: 18, background: 'var(--sep)', marginInline: 4, flexShrink: 0 }} />
            <Chip small active={includeUnranked} label={`+ ${models.length - ranked.length} unranked`} onClick={() => setIncludeUnranked(v => !v)} title="Include models with an Intelligence Index that are not on the arena board" />
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="aiwar-press-btn" style={{ height: 26, paddingInline: 10, borderRadius: 980, background: 'rgba(255,59,48,0.10)', color: '#CD5C4E', fontSize: 11, fontWeight: 600, border: '0.5px solid rgba(255,59,48,0.30)', cursor: 'pointer', flexShrink: 0 }}>Clear ×{activeFilters}</button>
            )}
          </Row>
          <Row label="Lab" last>
            <Chip small active={!filterOrg} label="All" onClick={() => setFilterOrg('')} />
            {labsShown.map(org => {
              const cfg = ORG_CONFIG[org] ?? { color: '#8E8E93' };
              return <Chip key={org} small active={filterOrg === org} color={cfg.color} dot={cfg.color} label={org} onClick={() => setFilterOrg(filterOrg === org ? '' : org)} />;
            })}
            {!filterOrg && allOrgs.length > LABS_SHOWN && (
              <button onClick={() => setAllLabs(v => !v)} style={{ height: 26, paddingInline: 8, background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.04em' }}>
                {allLabs ? 'FEWER ▴' : `+${allOrgs.length - LABS_SHOWN} MORE ▾`}
              </button>
            )}
          </Row>
        </div>

        <SectionNav sections={sections} mobile={mobile} />

        {/* ── Highlights ───────────────────────────────────────────── */}
        <div id="sec-highlights" style={{ marginTop: 18, scrollMarginTop: 110 }}>
          {n > 0 && (
            <HighlightGrid mobile={mobile}>
              <Reveal><BarPanel mobile={mobile} title="Arena ELO" color={GREEN} subtitle={`${scope} · arena.ai`} items={hl.elo} onSelect={open} /></Reveal>
              <Reveal delay={60}><BarPanel mobile={mobile} title="Price" color={GOLD} subtitle="$ per 1M blended · OpenRouter" items={hl.price} higherIsBetter={false} onSelect={open} /></Reveal>
              <Reveal delay={120}><BarPanel mobile={mobile} title="Context" color={BLUE} subtitle="Tokens · OpenRouter" items={hl.context} baseline={0} onSelect={open} /></Reveal>
            </HighlightGrid>
          )}
        </div>

        {/* ── Arena ELO ────────────────────────────────────────────── */}
        <ChartSection id="sec-elo" mobile={mobile} eyebrow="Quality" title="Arena ELO." sub="Human preference from anonymous side-by-side battles on arena.ai. Two models answer the same prompt, a person picks the better answer; thousands of those votes become a rating.">
          <BarPanel wide mobile={mobile} title="Arena ELO" color={GREEN} subtitle={`${scope} · arena.ai`} items={charts.elo} limit={n} onSelect={open} note="Confidence intervals overlap near the top — models within a few points are statistically tied." />
        </ChartSection>

        {/* ── ELO vs price ─────────────────────────────────────────── */}
        <ChartSection id="sec-value" mobile={mobile} eyebrow="Quality vs cost" title="ELO vs price." sub="Up and to the left is the place to be. The dashed line is the Pareto frontier: nothing is both better and cheaper than a point on it.">
          <LLMCharts models={picking ? pick.picked : filtered} aaConfigured={aa} mobile={mobile} initial="elo-price"
            selected={selected} onSelect={m => setSelected(s => { const n = new Set(s); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n; })} />
        </ChartSection>

        {/* ── Cost ─────────────────────────────────────────────────── */}
        <ChartSection id="sec-cost" mobile={mobile} eyebrow="Cost" title="Price per million tokens." sub="Input (solid) stacked with output (light) per 1M tokens from OpenRouter list prices; the label is the blended price at a 3:1 input:output mix.">
          <BarPanel wide mobile={mobile} title="Input + output price" color={GOLD} subtitle={`${scope} · $ per 1M · OpenRouter`} items={charts.cost} limit={n} higherIsBetter={false} baseline={0} onSelect={open} />
        </ChartSection>

        {/* ── Context ──────────────────────────────────────────────── */}
        <ChartSection id="sec-context" mobile={mobile} eyebrow="Context" title="Context window." sub="How much a model can read in one request. Listed by OpenRouter; the largest window a provider actually serves may be smaller — see Provider War.">
          <BarPanel wide mobile={mobile} title="Context window" color={BLUE} subtitle={`${scope} · tokens · OpenRouter`} items={charts.context} limit={n} baseline={0} onSelect={open} />
          {!aa && (
            <p style={{ fontSize: 11.5, color: 'var(--muted2)', fontFamily: MONO, margin: '10px 2px 0', lineHeight: 1.5 }}>
              Intelligence Index, output speed and time-to-first-token sections appear here once <code>ARTIFICIAL_ANALYSIS_API_KEY</code> is set on the deployment — the charts are built, only the source is missing. Nothing is estimated in the meantime.
            </p>
          )}
        </ChartSection>

        {/* ── Artificial Analysis sections, only when configured ───── */}
        {aa && charts.intel.length > 0 && (
          <ChartSection id="sec-intel" mobile={mobile} eyebrow="Intelligence" title="Intelligence Index." sub="Artificial Analysis' composite of reasoning, knowledge, maths and coding evaluations.">
            <BarPanel wide mobile={mobile} title="Intelligence Index" color={PURPLE} subtitle={`${scope} · Artificial Analysis`} items={charts.intel} limit={n} onSelect={open} />
          </ChartSection>
        )}
        {aa && charts.speed.length > 0 && (
          <ChartSection id="sec-speed" mobile={mobile} eyebrow="Speed" title="Output speed." sub="Median output tokens per second, measured by Artificial Analysis.">
            <BarPanel wide mobile={mobile} title="Output speed" color={PURPLE} subtitle={`${scope} · tokens/s · Artificial Analysis`} items={charts.speed} limit={n} baseline={0} onSelect={open} />
          </ChartSection>
        )}
        {aa && charts.ttft.length > 0 && (
          <ChartSection id="sec-latency" mobile={mobile} eyebrow="Latency" title="Time to first token." sub="Seconds until the first token arrives, measured by Artificial Analysis.">
            <BarPanel wide mobile={mobile} title="Time to first token" color={PURPLE} subtitle={`${scope} · seconds · Artificial Analysis`} items={charts.ttft} limit={n} higherIsBetter={false} baseline={0} onSelect={open} />
          </ChartSection>
        )}

        {/* ── Benchmarks ───────────────────────────────────────────── */}
        <ChartSection id="sec-bench" mobile={mobile} eyebrow="Benchmarks" title="The capability grid." sub="Arena ELOs, SWE-bench and the composite indexes side by side for the models in scope. Columns nobody in scope has a value for are left out."
          action={<Btn small onClick={() => onNavigate('benchmarks')}>All benchmarks →</Btn>}>
          <BenchMatrix rows={chartRows} benches={benches} valueOf={valueOf} mobile={mobile} onOpen={openModel} />
        </ChartSection>

        {/* ── Openness ─────────────────────────────────────────────── */}
        <ChartSection id="sec-open" mobile={mobile} eyebrow="Openness" title="Open weights." sub={openness.fromScope ? `${openness.share}% of the models in scope publish their weights. Their ELO, best first.` : `Fewer than three models in scope are open, so this is the best of the open-weight board instead.`}
          action={<div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{openness.licences.slice(0, 6).map(([l, c]) => <BadgeTag key={l} color={GREEN}>{l} ×{c}</BadgeTag>)}</div>}>
          <BarPanel wide mobile={mobile} title="Open-weight models by ELO" color={GREEN} subtitle={`${openness.bars.length} models · licence per model on the model page · arena.ai`} items={openness.bars} limit={openness.bars.length} onSelect={open} />
        </ChartSection>

        {/* ── The full board ───────────────────────────────────────── */}
        <ChartSection id="sec-table" mobile={mobile} eyebrow="The full board" title={`${filtered.length === models.length ? 'Every model' : `${filtered.length} model${filtered.length !== 1 ? 's' : ''}`}, one table.`}
          sub="Sort any column, pick the columns you need, open a row for the description and the numbers behind it."
          action={<ColumnPicker columns={columns} visible={colSel.visible} toggle={colSel.toggle} reset={colSel.reset} />}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
            <Label style={{ marginRight: 6 }}>Sort</Label>
            {SORTS.map(s => <Chip key={s.key} small active={sort.key === s.key} label={s.label} onClick={() => setSortKey(s.key)} />)}
          </div>
          <DataTable
            columns={columns} rows={filtered} visible={colSel.visible} sort={sort} onSort={setSort} mobile={mobile}
            rowKey={m => m.id} onRowClick={m => setExpandedId(expandedId === m.id ? null : m.id)} expandedKey={expandedId}
            highlightKey={m => isNum(m.arena?.elo) ? eloColor(m.arena.elo) : null}
            emptyText={models.length === 0 ? 'Loading models…' : 'No models match — try adjusting filters'}
            renderExpanded={m => <ExpandedModel m={m} topElo={topElo} mobile={mobile} onNavigate={onNavigate} />}
          />
        </ChartSection>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 2, flexWrap: 'wrap', gap: 4 }}>
          <p style={{ fontSize: 11, color: 'var(--muted2)', letterSpacing: '-0.01em' }}>
            {ranked.length} models · ELO from arena.ai human battles · pricing & context via OpenRouter{aa ? ' · performance via Artificial Analysis' : ' · Intelligence Index © Artificial Analysis (via OpenRouter)'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--muted2)' }}>{RELEASE}</p>
        </div>
      </div>
    </div>
  );
}

function ExpandedModel({ m, topElo, mobile, onNavigate }) {
  const description = getDescription(m.name);
  const tierColor = eloColor(m.arena?.elo);
  const cells = [
    ['intelligence', m.aa?.intelligence], ['codingIndex', m.aa?.codingIndex], ['agenticIndex', m.aa?.agenticIndex],
    ['speed', m.aa?.speed], ['ttft', m.aa?.ttft], ['priceCacheRead', m.priceCacheRead], ['maxOutput', m.maxOutput], ['releaseDate', m.releaseDate],
  ];
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10, fontFamily: MONO }}>About</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text)', letterSpacing: '-0.01em', margin: '0 0 18px', maxWidth: 820, opacity: 0.88, whiteSpace: 'normal' }}>
        {description ?? `${m.name} — ${m.org} model.${m.arena ? ` ELO ${m.arena.elo} from ${fmtMetric('votes', m.arena.votes)} arena battles.` : ''} No description available yet.`}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: 18, maxWidth: 720, marginBottom: 16 }}>
        {isNum(m.arena?.elo) && <ComparisonBar label="ELO" valueText={String(m.arena.elo)} width={Math.max(0.05, (m.arena.elo - 1280) / Math.max(1, topElo - 1280))} color={tierColor} />}
        {isNum(m.priceIn) && <ComparisonBar label="Price/M in" valueText={fmtMetric('priceIn', m.priceIn)} width={Math.max(0.05, Math.min(1, m.priceIn / 25))} color="var(--text)" />}
        {isNum(m.context) && <ComparisonBar label="Context" valueText={m.contextLabel ?? NA} width={Math.max(0.05, Math.min(1, m.context / 2_000_000))} color="var(--text)" />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 8, maxWidth: 820, marginBottom: 16 }}>
        {cells.map(([k, v]) => <StatTile key={k} label={metric(k).short} metricKey={k} value={fmtMetric(k, v)} style={{ padding: '9px 11px' }} />)}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn small solid onClick={() => onNavigate({ type: 'model', slug: m.slug })}>Model page →</Btn>
        {m.or && <Btn small onClick={() => onNavigate({ type: 'providers', slug: m.id })}>Providers</Btn>}
        <AddToBattle item={{ id: m.id, kind: 'llm', name: m.name, org: m.org }} small={false} label="Add to battle" />
        {m.arena?.url && <a href={m.arena.url} target="_blank" rel="noreferrer noopener" style={{ fontSize: 11, fontFamily: MONO, color: 'var(--muted)', textDecoration: 'none' }}>Model card ↗</a>}
      </div>
    </div>
  );
}
