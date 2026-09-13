// ─── CODE OPS — coding agents × models ──────────────────────────────────────
// SWE-bench keeps the AGENT (harness) and the MODEL separate; so do we. The
// matrix view answers "how does the same model do in different harnesses?".

import { useMemo, useState, lazy, Suspense } from 'react';
import { useMobile, useDark } from '../hooks/useTheme.js';
import { MONO, GlobalMotion, Reveal, Skeleton, SectionTitle } from '../components/design.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { ORG_CONFIG } from '../models-data.js';
import { useCoding } from '../data/useDomain.js';
import DataTable, { useColumnSelection, ColumnPicker, NaCell } from '../components/table/DataTable.jsx';
import { PageFrame, PageTitle, DataStatus, Panel, Label, Chip, Segmented, StatTile, EmptyState, BadgeTag, SourceTag, Btn, GREEN, GOLD, BLUE, PURPLE, RED } from '../components/ui.jsx';
import { fmtMetric, fmtDate, isNum, NA } from '../../shared/metrics.js';
import { BarPanel, HighlightGrid } from '../components/Highlights.jsx';
import { AddToBattle } from '../domains/comparison/BattleControls.jsx';

const ScatterChart = lazy(() => import('../components/charts/ScatterChart.jsx'));

const BOARD_ORDER = ['Verified', 'Lite', 'Multimodal', 'Multilingual', 'Test'];
const BOARD_NOTE = {
  Verified: '500 human-validated Python tasks — the reference board.',
  Lite: '300 easier tasks; older submissions dominate.',
  Multimodal: 'Tasks with visual context (screenshots, UI).',
  Multilingual: 'Tasks across nine programming languages.',
  Test: 'The full 2,294-task original set.',
};

export default function CodeOpsPage({ onNavigate, slug }) {
  const mobile = useMobile();
  const dark = useDark();
  const coding = useCoding();
  const [board, setBoard] = useState('Verified');
  const [view, setView] = useState('table');
  const [query, setQuery] = useState('');
  const [checkedOnly, setCheckedOnly] = useState(false);
  const [withCost, setWithCost] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  const [openSystem, setOpenSystem] = useState(false);
  const [sort, setSort] = useState({ key: 'resolved', dir: 'desc' });
  const [focusModel, setFocusModel] = useState(null);
  const [focusAgent, setFocusAgent] = useState(null);

  const rows = coding.boards?.[board] ?? [];
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => rows.filter(r => {
    if (q && !`${r.agent} ${r.model} ${r.modelOrg} ${r.agentOrg ?? ''}`.toLowerCase().includes(q)) return false;
    if (checkedOnly && !r.checked) return false;
    if (withCost && !isNum(r.costPerTask)) return false;
    if (openModel && !r.openModel) return false;
    if (openSystem && !r.openSystem) return false;
    return true;
  }), [rows, q, checkedOnly, withCost, openModel, openSystem]);

  const columns = useMemo(() => [
    { key: 'sub', label: 'Agent + model', sticky: true, width: mobile ? 220 : 320, value: r => r.rank, defaultDir: 'asc',
      render: r => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ width: 24, textAlign: 'right', fontFamily: MONO, fontSize: 11, color: 'var(--muted)' }}>{r.rank}</span>
          <LabLogo org={r.modelOrg} size={16} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 160 : 260 }}>{r.model ?? '—'}</div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ color: BLUE, fontWeight: 600 }}>{r.agent}</span>{r.reasoningEffort && <BadgeTag color={PURPLE}>{r.reasoningEffort}</BadgeTag>}{r.attempts === '2+' && <BadgeTag color={GOLD}>2+ attempts</BadgeTag>}
            </div>
          </div>
        </div>
      ) },
    { key: 'resolved', label: 'Resolved', short: '% solved', metricKey: 'resolved', numeric: true, width: 140, bar: true, barColor: GREEN, barWidth: 52, valueWidth: 48, value: r => r.resolved,
      render: r => <span style={{ fontWeight: 700 }}>{fmtMetric('resolved', r.resolved)}</span> },
    { key: 'costPerTask', label: 'Cost per task', short: '$/task', metricKey: 'costPerTask', numeric: true, width: 80, value: r => r.costPerTask, render: r => isNum(r.costPerTask) ? fmtMetric('costPerTask', r.costPerTask) : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'callsPerTask', label: 'Calls per task', short: 'Calls', metricKey: 'callsPerTask', numeric: true, width: 66, value: r => r.callsPerTask, render: r => isNum(r.callsPerTask) ? fmtMetric('callsPerTask', r.callsPerTask) : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'totalCost', label: 'Total run cost', short: 'Run $', numeric: true, width: 78, default: false, value: r => r.totalCost, render: r => isNum(r.totalCost) ? `$${Math.round(r.totalCost).toLocaleString()}` : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'linkedElo', label: 'Model ELO', short: 'ELO', metricKey: 'elo', numeric: true, width: 64, default: false, value: r => r.linkedElo, render: r => isNum(r.linkedElo) ? r.linkedElo : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'linkedCodingIndex', label: 'Coding Index', short: 'Code idx', metricKey: 'codingIndex', numeric: true, width: 70, default: false, value: r => r.linkedCodingIndex, render: r => isNum(r.linkedCodingIndex) ? fmtMetric('codingIndex', r.linkedCodingIndex) : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'agentOrg', label: 'Agent org', width: 110, default: false, value: r => r.agentOrg, maxWidth: 130 },
    { key: 'date', label: 'Submitted', width: 96, value: r => r.date, defaultDir: 'desc', render: r => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--muted)' }}>{fmtDate(r.date)}</span> },
    { key: 'flags', label: 'Flags', width: 150, sortable: false, render: r => (
      <span style={{ display: 'inline-flex', gap: 4 }}>
        {r.checked && <BadgeTag color={GREEN}>Verified logs</BadgeTag>}
        {r.openModel && <BadgeTag color={GREEN}>Open model</BadgeTag>}
        {r.openSystem && <BadgeTag color={BLUE}>Open agent</BadgeTag>}
      </span>) },
    { key: 'links', label: '', width: 120, sortable: false, align: 'right', render: r => (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        {r.site && <a href={r.site} target="_blank" rel="noreferrer noopener" onClick={e => e.stopPropagation()} style={{ fontSize: 10, fontFamily: MONO, color: 'var(--muted)', textDecoration: 'none' }}>site ↗</a>}
        <AddToBattle item={{ id: r.id, kind: 'coding', name: `${r.agent} + ${r.model ?? ''}`.trim(), org: r.modelOrg, board }} />
      </span>) },
  ], [mobile, board]);
  const colSel = useColumnSelection('codeops-v1', columns);

  // Aggregates
  const top = rows[0];
  const cheapestGood = [...rows].filter(r => isNum(r.costPerTask) && r.resolved >= 60).sort((a, b) => a.costPerTask - b.costPerTask)[0];
  const verified = rows.find(r => r.checked);

  // Matrix: model → agents, agent → models
  const matrix = useMemo(() => {
    const byModel = new Map(), byAgent = new Map();
    for (const r of rows) {
      const mk = r.model ?? 'Unknown';
      if (!byModel.has(mk)) byModel.set(mk, { model: mk, org: r.modelOrg, id: r.modelId, runs: [] });
      byModel.get(mk).runs.push(r);
      if (!byAgent.has(r.agent)) byAgent.set(r.agent, { agent: r.agent, org: r.agentOrg, runs: [] });
      byAgent.get(r.agent).runs.push(r);
    }
    const models = [...byModel.values()].map(m => ({ ...m, best: Math.max(...m.runs.map(x => x.resolved)), harnesses: new Set(m.runs.map(x => x.agent)).size })).sort((a, b) => b.harnesses - a.harnesses || b.best - a.best);
    const agents = [...byAgent.values()].map(a => ({ ...a, best: Math.max(...a.runs.map(x => x.resolved)), models: new Set(a.runs.map(x => x.model)).size })).sort((a, b) => b.models - a.models || b.best - a.best);
    return { models, agents };
  }, [rows]);

  const points = useMemo(() => filtered.map(r => ({ id: r.id, name: `${r.agent} · ${r.model ?? ''}`, org: r.modelOrg, x: view === 'chart-calls' ? r.callsPerTask : r.costPerTask, y: r.resolved, r })), [filtered, view]);
  const status = coding.status;
  const sources = ['swebench', ...(coding.indexes?.length ? ['aa'] : [])];

  return (
    <PageFrame mobile={mobile}>
      <GlobalMotion />
      <PageTitle mobile={mobile} eyebrow="Code Ops" title="The coding battlefield."
        subtitle="Software-engineering agents on SWE-bench, with the harness and the model kept separate — plus the coding index of every language model."
        status={<DataStatus status={status} fetchedAt={coding.data?.fetchedAt} sources={sources} loading={coding.loading} onRefresh={coding.reload} />} />

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
        <StatTile label={`#1 · ${board}`} value={top ? fmtMetric('resolved', top.resolved) : NA} sub={top ? `${top.model} via ${top.agent}` : 'Loading…'} color={GREEN} metricKey="resolved" />
        <StatTile label="Cheapest ≥60% solved" value={cheapestGood ? fmtMetric('costPerTask', cheapestGood.costPerTask) : NA} sub={cheapestGood ? `${cheapestGood.model} via ${cheapestGood.agent} · ${fmtMetric('resolved', cheapestGood.resolved)}` : 'No cost-disclosed run ≥ 60%'} color={GOLD} metricKey="costPerTask" />
        <StatTile label="Best verified logs" value={verified ? fmtMetric('resolved', verified.resolved) : NA} sub={verified ? `${verified.model} via ${verified.agent}` : 'No checked submission'} color={BLUE} metricKey="resolved" />
        <StatTile label="Submissions" value={rows.length ? rows.length : NA} sub={`${matrix.agents.length} harnesses · ${matrix.models.length} models`} />
      </div>

      {rows.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <HighlightGrid mobile={mobile} cols={2}>
            <BarPanel mobile={mobile} title="Resolved" color={GREEN} subtitle={`${board} · % of tasks solved · SWE-bench`} items={[...rows].sort((a, b) => b.resolved - a.resolved).slice(0, 10).map(r => ({ id: r.id, name: `${r.model ?? r.name}`, org: r.modelOrg, value: r.resolved, label: fmtMetric('resolved', r.resolved) }))} />
            <BarPanel mobile={mobile} title="Cost per task" color={GOLD} subtitle="Top 10 by resolved · $ per task" higherIsBetter={false} items={[...rows].sort((a, b) => b.resolved - a.resolved).filter(r => isNum(r.costPerTask)).slice(0, 10).sort((a, b) => a.costPerTask - b.costPerTask).map(r => ({ id: r.id, name: `${r.model ?? r.name}`, org: r.modelOrg, value: r.costPerTask, label: fmtMetric('costPerTask', r.costPerTask) }))} />
          </HighlightGrid>
        </div>
      )}

      {/* Board + view */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Segmented small value={board} onChange={b => { setBoard(b); setFocusAgent(null); setFocusModel(null); }} options={BOARD_ORDER.filter(b => coding.boards?.[b]).map(b => ({ value: b, label: b, count: coding.boards[b].length }))} />
        <Segmented small value={view} onChange={setView} options={[{ value: 'table', label: 'Table' }, { value: 'chart-cost', label: 'Score vs cost' }, { value: 'chart-calls', label: 'Score vs calls' }, { value: 'matrix', label: 'Model × harness' }]} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px', fontFamily: MONO }}>{BOARD_NOTE[board]}</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search agent, model, org…" style={{ height: 30, paddingInline: 12, background: 'var(--card)', border: '0.5px solid var(--sep)', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', minWidth: 200, flex: mobile ? '1 1 100%' : undefined }} />
        <Chip small active={checkedOnly} color={GREEN} label="Verified logs" onClick={() => setCheckedOnly(v => !v)} title="Only submissions whose trajectories were checked by the SWE-bench team" />
        <Chip small active={withCost} color={GOLD} label="Cost disclosed" onClick={() => setWithCost(v => !v)} />
        <Chip small active={openModel} color={GREEN} label="Open model" onClick={() => setOpenModel(v => !v)} />
        <Chip small active={openSystem} color={BLUE} label="Open agent" onClick={() => setOpenSystem(v => !v)} />
        <span style={{ marginLeft: 'auto' }}>{view === 'table' && <ColumnPicker columns={columns} visible={colSel.visible} toggle={colSel.toggle} reset={colSel.reset} />}</span>
      </div>

      {coding.loading && !rows.length ? <Skeleton height={400} /> : !rows.length ? (
        <EmptyState title="SWE-bench unavailable" body={coding.sources?.swebench?.error ?? 'The SWE-bench feed could not be loaded and nothing valid is cached yet.'} action={<Btn small onClick={coding.reload}>Retry</Btn>} />
      ) : view === 'table' ? (
        <DataTable columns={columns} rows={filtered} visible={colSel.visible} sort={sort} onSort={setSort} mobile={mobile} rowKey={r => r.id} pageSize={50}
          onRowClick={r => { if (r.linkedModelId) onNavigate({ type: 'model', slug: r.linkedModelId }); }} />
      ) : view === 'matrix' ? (
        <MatrixView matrix={matrix} focusModel={focusModel} setFocusModel={setFocusModel} focusAgent={focusAgent} setFocusAgent={setFocusAgent} mobile={mobile} />
      ) : (
        <Panel pad={mobile ? 12 : 18}>
          <Suspense fallback={<Skeleton height={420} />}>
            <ScatterChart points={points} xKey={view === 'chart-calls' ? 'callsPerTask' : 'costPerTask'} yKey="resolved" xLog={view !== 'chart-calls'} height={mobile ? 340 : 440}
              emptyText="No submissions on this board disclose that number."
              tooltipExtra={p => [['Calls', fmtMetric('callsPerTask', p.r.callsPerTask)], ['Date', fmtDate(p.r.date)]]} />
          </Suspense>
          <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 10, lineHeight: 1.5 }}>
            SWE-bench does not publish execution time or token counts per run; cost and API calls per task are the disclosed proxies, so the "execution time" and "token usage" axes stay N/A here rather than being estimated. Only submissions that disclose the metric are plotted.
          </p>
        </Panel>
      )}

      {/* Coding index */}
      <section style={{ marginTop: mobile ? 40 : 56 }}>
        <SectionTitle eyebrow="Model-level signal" title="Coding Index." mobile={mobile} action={<SourceTag id="aa" />} />
        {coding.indexes?.length ? (
          <CodingIndexTable rows={coding.indexes} mobile={mobile} onNavigate={onNavigate} />
        ) : <EmptyState title="No coding index available" body="Artificial Analysis coding indexes arrive via OpenRouter's public catalogue or the AA Data API." />}
      </section>
    </PageFrame>
  );
}

function MatrixView({ matrix, focusModel, setFocusModel, focusAgent, setFocusAgent, mobile }) {
  const m = focusModel ? matrix.models.find(x => x.model === focusModel) : null;
  const a = focusAgent ? matrix.agents.find(x => x.agent === focusAgent) : null;
  const [mSort, setMSort] = useState({ key: 'harnesses', dir: 'desc' });
  const [aSort, setASort] = useState({ key: 'models', dir: 'desc' });
  const [rSort, setRSort] = useState({ key: 'resolved', dir: 'desc' });
  const modelCols = useMemo(() => [
    { key: 'model', label: 'Model', sticky: true, width: mobile ? 180 : 240, value: x => x.model, render: x => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}><LabLogo org={x.org} size={13} /><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 130 : 190 }}>{x.model}</span></span> },
    { key: 'harnesses', label: 'Harnesses tried', short: 'Harnesses', numeric: true, width: 96, value: x => x.harnesses },
    { key: 'best', label: 'Best resolved', short: 'Best', metricKey: 'resolved', numeric: true, width: 124, bar: true, barColor: GREEN, barWidth: 40, valueWidth: 46, value: x => x.best, render: x => <span style={{ fontWeight: 700 }}>{fmtMetric('resolved', x.best)}</span> },
  ], [mobile]);
  const agentCols = useMemo(() => [
    { key: 'agent', label: 'Harness', sticky: true, width: mobile ? 180 : 240, value: x => x.agent, render: x => <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{x.agent}{x.org ? <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 400 }}> · {x.org}</span> : null}</span> },
    { key: 'models', label: 'Models tried', short: 'Models', numeric: true, width: 90, value: x => x.models },
    { key: 'best', label: 'Best resolved', short: 'Best', metricKey: 'resolved', numeric: true, width: 124, bar: true, barColor: GREEN, barWidth: 40, valueWidth: 46, value: x => x.best, render: x => <span style={{ fontWeight: 700 }}>{fmtMetric('resolved', x.best)}</span> },
  ], [mobile]);
  const runCols = useMemo(() => [
    { key: 'name', label: m ? 'Harness' : 'Model', sticky: true, width: mobile ? 180 : 240, value: r => (m ? r.agent : r.model), render: r => <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 150 : 210 }}>{m ? r.agent : r.model}</span><span style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: MONO }}>{fmtDate(r.date)}{r.reasoningEffort ? ` · ${r.reasoningEffort}` : ''}{r.attempts === '2+' ? ' · 2+ attempts' : ''}</span></span> },
    { key: 'resolved', label: 'Resolved', short: '% solved', metricKey: 'resolved', numeric: true, width: 124, bar: true, barColor: GREEN, barWidth: 40, valueWidth: 46, value: r => r.resolved, render: r => <span style={{ fontWeight: 700 }}>{fmtMetric('resolved', r.resolved)}</span> },
    { key: 'costPerTask', label: 'Cost per task', short: '$/task', metricKey: 'costPerTask', numeric: true, width: 84, value: r => r.costPerTask, render: r => isNum(r.costPerTask) ? fmtMetric('costPerTask', r.costPerTask) : <NaCell /> },
  ], [m, mobile]);
  const focus = m ?? a;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}><Label color="var(--muted)">By model · harnesses tried</Label><span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.06em' }}>CLICK A ROW</span></div>
        <DataTable dense mobile={mobile} rows={matrix.models} rowKey={x => x.model} columns={modelCols} visible={modelCols.map(c => c.key)} sort={mSort} onSort={setMSort} pageSize={30}
          onRowClick={x => { setFocusModel(focusModel === x.model ? null : x.model); setFocusAgent(null); }} highlightKey={x => (x.model === focusModel ? GREEN : null)} />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
          <Label color="var(--muted)">{m ? `${m.model} across harnesses` : a ? `${a.agent} across models` : 'By harness · models tried'}</Label>
          {focus && <Btn small onClick={() => { setFocusModel(null); setFocusAgent(null); }}>← All harnesses</Btn>}
        </div>
        {focus ? (
          <DataTable dense mobile={mobile} rows={focus.runs} rowKey={r => r.id} columns={runCols} visible={runCols.map(c => c.key)} sort={rSort} onSort={setRSort} pageSize={30} />
        ) : (
          <DataTable dense mobile={mobile} rows={matrix.agents} rowKey={x => x.agent} columns={agentCols} visible={agentCols.map(c => c.key)} sort={aSort} onSort={setASort} pageSize={30}
            onRowClick={x => { setFocusAgent(x.agent); setFocusModel(null); }} />
        )}
      </div>
    </div>
  );
}

function CodingIndexTable({ rows, mobile, onNavigate }) {
  const [sort, setSort] = useState({ key: 'codingIndex', dir: 'desc' });
  const columns = useMemo(() => [
    { key: 'model', label: 'Model', sticky: true, width: mobile ? 200 : 280, value: r => r.name, render: r => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><LabLogo org={r.org} size={14} /><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.name}</span><span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.org}</span>{r.isOpen && <BadgeTag color={GREEN}>open</BadgeTag>}</span>) },
    { key: 'codingIndex', label: 'Coding Index', short: 'Code', metricKey: 'codingIndex', numeric: true, width: 116, bar: true, barColor: GREEN, barWidth: 40, valueWidth: 36, value: r => r.codingIndex, render: r => <span style={{ fontWeight: 700, color: 'var(--text)' }}>{fmtMetric('codingIndex', r.codingIndex)}</span> },
    { key: 'agenticIndex', label: 'Agentic Index', short: 'Agent', metricKey: 'agenticIndex', numeric: true, width: 70, value: r => r.agenticIndex, render: r => fmtMetric('agenticIndex', r.agenticIndex) },
    { key: 'intelligence', label: 'Intelligence', short: 'Intel', metricKey: 'intelligence', numeric: true, width: 70, value: r => r.intelligence, render: r => fmtMetric('intelligence', r.intelligence) },
    { key: 'elo', label: 'Arena ELO', short: 'ELO', metricKey: 'elo', numeric: true, width: 70, value: r => r.elo, render: r => isNum(r.elo) ? r.elo : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'priceBlended', label: 'Blended price', short: '$/M', metricKey: 'priceBlended', numeric: true, width: 74, value: r => r.priceBlended, render: r => fmtMetric('priceBlended', r.priceBlended) },
    { key: 'battle', label: '', width: 70, sortable: false, align: 'right', render: r => <AddToBattle item={{ id: r.id, kind: 'llm', name: r.name, org: r.org }} /> },
  ], [mobile]);
  return <DataTable columns={columns} rows={rows} visible={columns.map(c => c.key)} sort={sort} onSort={setSort} mobile={mobile} rowKey={r => r.id} pageSize={40} dense />;
}
