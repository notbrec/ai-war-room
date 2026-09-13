// ─── BENCHMARKS — the capability matrix ─────────────────────────────────────
// Pick a benchmark: a ranked chart of the leaders, then every model that
// carries the value in a sortable table. Click rows to compare a handful.
// Matrix mode puts up to six benchmarks side by side as data-bar columns.

import { useMemo, useState, useEffect } from 'react';
import { useMobile } from '../hooks/useTheme.js';
import { MONO, GlobalMotion, Skeleton } from '../components/design.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { useLLMs, useCoding, useSpeech } from '../data/useDomain.js';
import DataTable, { NaCell } from '../components/table/DataTable.jsx';
import { BarPanel } from '../components/Highlights.jsx';
import { PageFrame, PageTitle, DataStatus, Panel, Chip, Segmented, EmptyState, BadgeTag, SourceTag, Btn, Unavailable, GREEN, GOLD, BLUE } from '../components/ui.jsx';
import { fmtMetric, isNum, NA, SOURCES } from '../../shared/metrics.js';
import { GROUPS, BENCHMARKS, designBenchmarks, extraAABenchmarks } from '../domains/benchmarks/registry.js';
import { AddToBattle } from '../domains/comparison/BattleControls.jsx';

function fmtVal(b, v) {
  if (!isNum(v)) return NA;
  if (b.unit === '%') return `${v.toFixed(1)}%`;
  if (b.unit === 'Elo') return String(Math.round(v));
  if (b.unit === 'tokens') return fmtMetric('context', v);
  return v.toFixed(1);
}
function fmtGap(b, d) {
  if (b.unit === '%') return `${d.toFixed(1)} pts`;
  if (b.unit === 'Elo') return String(Math.round(d));
  if (b.unit === 'tokens') return fmtMetric('context', d);
  return d.toFixed(1);
}
const shortName = b => b.label.replace(/^(Arena|Design Arena) · /, '').replace(' (best harness)', '').replace(' (spec)', '').slice(0, 20);
const TOP_N = 15;

export default function BenchmarksPage({ onNavigate, slug }) {
  const mobile = useMobile();
  const llms = useLLMs();
  const coding = useCoding();
  const speech = useSpeech();
  const [group, setGroup] = useState('preference');
  const [benchId, setBenchId] = useState(slug ?? 'arena-text');
  const [mode, setMode] = useState('single');
  const [matrixIds, setMatrixIds] = useState(['arena-text', 'aa-intel', 'aa-coding', 'aa-agentic']);
  const [compare, setCompare] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'score', dir: 'desc' });
  const [mSort, setMSort] = useState({ key: 'arena-text', dir: 'desc' });

  const models = llms.models;
  const all = useMemo(() => {
    const dyn = [...designBenchmarks(models), ...extraAABenchmarks(models)];
    // Speech: per-dataset WER, from the STT board (different pool)
    const sttSets = new Set(); for (const r of speech.stt) for (const k of Object.keys(r.perDataset ?? {})) sttSets.add(k);
    const stt = [{ id: 'stt-avg', group: 'speech', label: 'Open ASR · average WER', source: 'openasr', unit: '%', higher: false, pool: 'stt', get: r => r.wer, desc: 'Average word error rate across English test sets. Lower is better.', method: 'https://huggingface.co/spaces/hf-audio/open_asr_leaderboard' },
      ...[...sttSets].map(d => ({ id: `stt:${d}`, group: 'speech', label: `Open ASR · ${d} WER`, source: 'openasr', unit: '%', higher: false, pool: 'stt', get: r => r.perDataset?.[d] ?? null, desc: `Word error rate on the ${d} test set. Lower is better.`, method: 'https://huggingface.co/spaces/hf-audio/open_asr_leaderboard' }))];
    return [...BENCHMARKS, ...dyn, ...stt];
  }, [models, speech.stt]);

  // SWE-bench "best per model" lookups
  const sweBest = useMemo(() => {
    const out = { swe: new Map(), 'swe-mm': new Map() };
    for (const r of coding.boards?.Verified ?? []) if (r.linkedModelId) out.swe.set(r.linkedModelId, Math.max(out.swe.get(r.linkedModelId) ?? -1, r.resolved));
    for (const r of coding.boards?.Multimodal ?? []) if (r.linkedModelId) out['swe-mm'].set(r.linkedModelId, Math.max(out['swe-mm'].get(r.linkedModelId) ?? -1, r.resolved));
    return out;
  }, [coding.boards]);
  const valueOf = (b, m) => b.external ? (sweBest[b.external].get(m.id) ?? null) : b.get(m);

  const bench = all.find(b => b.id === benchId) ?? all[0];
  useEffect(() => { if (bench && bench.group !== group) setGroup(bench.group); }, [bench]); // eslint-disable-line
  useEffect(() => { setCompare(new Set()); setSort({ key: 'score', dir: bench?.higher === false ? 'asc' : 'desc' }); }, [benchId]); // eslint-disable-line
  const groupBenches = all.filter(b => b.group === group);
  const pool = bench?.pool === 'stt' ? speech.stt : models;
  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    if (!bench) return [];
    const list = pool.map(m => ({ m, v: valueOf(bench, m) })).filter(r => isNum(r.v) && (!q || `${r.m.name} ${r.m.org}`.toLowerCase().includes(q)));
    list.sort((a, b) => bench.higher ? b.v - a.v : a.v - b.v);
    const top = list[0]?.v;
    return list.map((r, i) => ({
      ...r, id: r.m.id, rank: i + 1,
      gap: i === 0 ? 0 : bench.higher ? top - r.v : r.v / top,
      gapLabel: i === 0 ? '' : bench.higher ? `−${fmtGap(bench, top - r.v)}` : `${(r.v / top).toFixed(2)}×`,
    }));
  }, [bench, pool, q, sweBest]); // eslint-disable-line
  const counts = useMemo(() => Object.fromEntries(all.map(b => [b.id, (b.pool === 'stt' ? speech.stt : models).filter(m => isNum(valueOf(b, m))).length])), [all, models, speech.stt, sweBest]); // eslint-disable-line
  const toggleCompare = id => setCompare(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else if (n.size < 8) n.add(id); return n; });
  const comparing = compare.size >= 2;
  const chartRows = comparing ? rows.filter(r => compare.has(r.id)) : rows.slice(0, TOP_N);

  const boardColumns = useMemo(() => [
    { key: 'model', label: 'Model', sticky: true, width: mobile ? 210 : 300, value: r => r.rank, defaultDir: 'asc', render: r => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ width: 22, textAlign: 'right', fontFamily: MONO, fontSize: 11.5, color: r.rank <= 3 ? 'var(--text)' : 'var(--muted)', fontWeight: r.rank <= 3 ? 700 : 500, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{r.rank}</span>
        <LabLogo org={r.m.org} size={14} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 140 : 210 }}>{r.m.name}</span>
          <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.m.org}{isNum(r.m.arena?.rank) ? ` · arena #${r.m.arena.rank}` : ''}</span>
        </span>
      </span>) },
    { key: 'score', label: bench?.label ?? 'Score', short: bench?.unit === 'Elo' ? 'ELO' : bench?.unit === '%' ? 'Score' : 'Value', numeric: true, bar: true, barColor: GREEN, higherIsBetter: bench?.higher !== false, width: 172, barWidth: 64, valueWidth: 62, value: r => r.v, render: r => <span style={{ fontWeight: 700 }}>{fmtVal(bench, r.v)}</span> },
    { key: 'gap', label: 'Gap to the leader', short: 'vs #1', numeric: true, width: 88, value: r => r.gap, defaultDir: 'asc', render: r => r.rank === 1 ? <span style={{ color: 'var(--muted2)' }}>leader</span> : <span style={{ color: 'var(--muted)' }}>{r.gapLabel}</span> },
    { key: 'compare', label: 'Compare', width: 90, sortable: false, align: 'right', render: r => <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: compare.has(r.id) ? GREEN : 'var(--muted2)' }}>{compare.has(r.id) ? '✓ ON' : '+ ADD'}</span> },
    ...(bench?.pool !== 'stt' ? [{ key: 'battle', label: '', width: 72, sortable: false, align: 'right', render: r => <AddToBattle item={{ id: r.m.id, kind: 'llm', name: r.m.name, org: r.m.org }} /> }] : []),
  ], [bench, mobile, compare]);

  const aa = !!llms.capabilities?.aa;
  const matrixBenches = matrixIds.map(id => all.find(b => b.id === id)).filter(Boolean);
  const matrixRows = useMemo(() => {
    const list = models.map(m => ({ m, vals: Object.fromEntries(matrixBenches.map(b => [b.id, valueOf(b, m)])) })).filter(r => Object.values(r.vals).some(isNum));
    return list.filter(r => !q || `${r.m.name} ${r.m.org}`.toLowerCase().includes(q));
  }, [models, matrixBenches, q, sweBest]); // eslint-disable-line
  const matrixColumns = useMemo(() => [
    { key: 'model', label: 'Model', sticky: true, width: mobile ? 190 : 260, value: r => r.m.name, render: r => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}><LabLogo org={r.m.org} size={14} /><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 130 : 200 }}>{r.m.name}</span></span> },
    ...matrixBenches.map(b => ({ key: b.id, label: b.label, short: shortName(b), numeric: true, width: 132, bar: true, barColor: BLUE, barWidth: 40, valueWidth: 52, higherIsBetter: b.higher !== false, value: r => r.vals[b.id], defaultDir: b.higher ? 'desc' : 'asc', render: r => isNum(r.vals[b.id]) ? <span style={{ fontWeight: 600 }}>{fmtVal(b, r.vals[b.id])}</span> : <NaCell /> })),
  ], [matrixBenches, mobile]);

  return (
    <PageFrame mobile={mobile} wide>
      <GlobalMotion />
      <PageTitle mobile={mobile} eyebrow="Benchmarks" title="The capability matrix." subtitle="Pick a benchmark, see who leads it, read how it is measured and where it comes from. Incompatible tests are never averaged into one number."
        status={<DataStatus status={llms.status} fetchedAt={llms.data?.fetchedAt} sources={['arena', 'openrouter', 'swebench', 'openasr', 'designarena', ...(aa ? ['aa'] : [])]} loading={llms.loading} />} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <Segmented small value={mode} onChange={setMode} options={[{ value: 'single', label: 'One benchmark' }, { value: 'matrix', label: 'Matrix' }]} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter models…" style={{ height: 30, paddingInline: 12, background: 'var(--card)', border: '0.5px solid var(--sep)', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', minWidth: 180, flex: mobile ? '1 1 100%' : undefined }} />
      </div>

      {mode === 'matrix' ? (
        <>
          <Panel style={{ marginBottom: 12 }} title="Columns · up to 6 benchmarks">
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {all.filter(b => !b.placeholder && b.pool !== 'stt' && counts[b.id] > 0).map(b => <Chip key={b.id} small active={matrixIds.includes(b.id)} label={b.label.replace('Design Arena · ', 'DA · ')} onClick={() => setMatrixIds(ids => ids.includes(b.id) ? ids.filter(x => x !== b.id) : ids.length >= 6 ? ids : [...ids, b.id])} />)}
            </div>
          </Panel>
          {llms.loading && !models.length ? <Skeleton height={400} /> : (
            <DataTable columns={matrixColumns} rows={matrixRows} visible={matrixColumns.map(c => c.key)} sort={mSort} onSort={setMSort} mobile={mobile} rowKey={r => r.m.id} pageSize={50} dense
              onRowClick={r => onNavigate({ type: 'model', slug: r.m.slug })}
              footer={<span>Each bar is the value's position within its column · values as published, never averaged across benchmarks · click a row for the model page</span>} />
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '280px 1fr', gap: 12, alignItems: 'start' }}>
          {/* Left: groups + benchmarks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Panel pad={8}>
              <div style={{ display: 'flex', flexDirection: mobile ? 'row' : 'column', gap: 2, overflowX: mobile ? 'auto' : undefined }}>
                {GROUPS.map(g => {
                  const n = all.filter(b => b.group === g.id).reduce((s, b) => s + (counts[b.id] > 0 ? 1 : 0), 0);
                  return (
                    <button key={g.id} onClick={() => { setGroup(g.id); const first = all.find(b => b.group === g.id && counts[b.id] > 0) ?? all.find(b => b.group === g.id); if (first) setBenchId(first.id); }} style={{
                      display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 10px', background: group === g.id ? 'var(--text)' : 'transparent', color: group === g.id ? 'var(--bg)' : n ? 'var(--text)' : 'var(--muted2)',
                      border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.015em', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>{g.label}<span style={{ fontFamily: MONO, fontSize: 10, opacity: 0.6 }}>{n}</span></button>
                  );
                })}
              </div>
            </Panel>
            <Panel pad={8}>
              {groupBenches.length === 0 && <div style={{ padding: 10, fontSize: 12, color: 'var(--muted)' }}>No permitted source configured for this group yet.</div>}
              {groupBenches.map(b => (
                <button key={b.id} onClick={() => setBenchId(b.id)} style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '8px 10px', background: benchId === b.id ? 'var(--hover)' : 'transparent', border: 'none', borderLeft: `2px solid ${benchId === b.id ? 'var(--text)' : 'transparent'}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: counts[b.id] ? 'var(--text)' : 'var(--muted2)', letterSpacing: '-0.015em' }}>{b.label}</span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: b.higher ? GREEN : GOLD }}>{b.higher ? '▲ higher' : '▼ lower'}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)' }}>{counts[b.id] ?? 0} models</span>
                    <SourceTag id={b.source} />
                  </span>
                </button>
              ))}
            </Panel>
          </div>

          {/* Right: chart + board for the benchmark */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {bench && (
              <Panel>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>{bench.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, marginTop: 4, maxWidth: 640 }}>{bench.desc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <BadgeTag color={bench.higher ? GREEN : GOLD}>{bench.higher ? 'Higher is better' : 'Lower is better'}</BadgeTag>
                    {bench.unit && <BadgeTag color="var(--muted)">{bench.unit}</BadgeTag>}
                    <SourceTag id={bench.source} />
                    <a href={bench.method} target="_blank" rel="noreferrer noopener" style={{ fontSize: 10.5, fontFamily: MONO, color: 'var(--text)', textDecoration: 'none' }}>Methodology ↗</a>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted2)', fontFamily: MONO }}>
                  Source: {SOURCES[bench.source]?.name} · {SOURCES[bench.source]?.note} · {counts[bench.id] ?? 0} models carry this value · updated {llms.data?.fetchedAt ? new Date(llms.data.fetchedAt).toLocaleString() : '—'}
                </div>
              </Panel>
            )}

            {bench?.aaOnly && !aa && rows.length === 0 ? <Unavailable what={bench.label} /> : rows.length === 0 ? (
              <EmptyState title="No values yet" body={bench?.placeholder ? bench.desc : 'No model carries this benchmark in the current dataset.'} />
            ) : (
              <>
                <BarPanel wide mobile={mobile} title={bench.label} color={GREEN} higherIsBetter={bench.higher !== false} baseline={bench.unit === 'Elo' ? 'auto' : 0} limit={chartRows.length}
                  subtitle={`${comparing ? `Comparing ${compare.size} of ${rows.length}` : `Top ${chartRows.length} of ${rows.length}`} · ${SOURCES[bench.source]?.name ?? bench.source}${bench.unit ? ` · ${bench.unit}` : ''}`}
                  items={chartRows.map(r => ({ id: r.id, name: r.m.name, org: r.m.org, value: r.v, label: fmtVal(bench, r.v) }))}
                  onSelect={it => toggleCompare(it.id)}
                  badge={compare.size > 0 ? <Btn small onClick={() => setCompare(new Set())}>Clear {compare.size}</Btn> : null}
                  note={comparing ? 'Click a bar or a table row to drop it from the comparison' : 'Click rows in the table below to compare up to 8 side by side'} />
                <DataTable columns={boardColumns} rows={rows} visible={boardColumns.map(c => c.key)} sort={sort} onSort={setSort} mobile={mobile} rowKey={r => r.id} pageSize={50}
                  onRowClick={r => toggleCompare(r.id)} highlightKey={r => (compare.has(r.id) ? GREEN : null)}
                  footer={<span>Values exactly as published by {SOURCES[bench.source]?.name ?? bench.source} · no cross-benchmark averaging · {rows.length} models carry this value</span>} />
              </>
            )}
          </div>
        </div>
      )}
    </PageFrame>
  );
}
