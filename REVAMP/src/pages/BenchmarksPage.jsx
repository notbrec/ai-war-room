// ─── BENCHMARKS — the capability matrix ─────────────────────────────────────

import { useMemo, useState, useEffect } from 'react';
import { useMobile } from '../hooks/useTheme.js';
import { MONO, GlobalMotion, Skeleton, ComparisonBar } from '../components/design.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { ORG_CONFIG } from '../models-data.js';
import { useLLMs, useCoding, useSpeech } from '../data/useDomain.js';
import DataTable from '../components/table/DataTable.jsx';
import { PageFrame, PageTitle, DataStatus, Panel, Label, Chip, Segmented, EmptyState, BadgeTag, SourceTag, Btn, Unavailable, GREEN, GOLD, BLUE, PURPLE } from '../components/ui.jsx';
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
  const groupBenches = all.filter(b => b.group === group);
  const pool = bench?.pool === 'stt' ? speech.stt : models;
  const q = query.trim().toLowerCase();
  const ranked = useMemo(() => {
    if (!bench) return [];
    const rows = pool.map(m => ({ m, v: valueOf(bench, m) })).filter(r => isNum(r.v) && (!q || `${r.m.name} ${r.m.org}`.toLowerCase().includes(q)));
    rows.sort((a, b) => bench.higher ? b.v - a.v : a.v - b.v);
    return rows;
  }, [bench, pool, q, sweBest]);
  const counts = useMemo(() => Object.fromEntries(all.map(b => [b.id, (b.pool === 'stt' ? speech.stt : models).filter(m => isNum(valueOf(b, m))).length])), [all, models, speech.stt, sweBest]);
  const ext = ranked.length ? [ranked[ranked.length - 1].v, ranked[0].v] : [0, 1];
  const norm = v => { const [lo, hi] = bench.higher ? ext : [ext[1], ext[0]]; return hi === lo ? 1 : Math.max(0.03, (v - lo) / (hi - lo)); };

  const aa = !!llms.capabilities?.aa;
  const matrixBenches = matrixIds.map(id => all.find(b => b.id === id)).filter(Boolean);
  const matrixRows = useMemo(() => {
    const rows = models.map(m => ({ m, vals: Object.fromEntries(matrixBenches.map(b => [b.id, valueOf(b, m)])) })).filter(r => Object.values(r.vals).some(isNum));
    return rows.filter(r => !q || `${r.m.name} ${r.m.org}`.toLowerCase().includes(q));
  }, [models, matrixBenches, q, sweBest]);
  const matrixColumns = useMemo(() => [
    { key: 'model', label: 'Model', sticky: true, width: mobile ? 190 : 260, value: r => r.m.name, render: r => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}><LabLogo org={r.m.org} size={14} /><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 130 : 200 }}>{r.m.name}</span></span> },
    ...matrixBenches.map(b => ({ key: b.id, label: b.label, short: b.label.replace(/^(Arena|Design Arena) · /, '').slice(0, 18), numeric: true, width: 92, value: r => r.vals[b.id], defaultDir: b.higher ? 'desc' : 'asc', render: r => isNum(r.vals[b.id]) ? <span style={{ fontWeight: 600 }}>{fmtVal(b, r.vals[b.id])}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> })),
  ], [matrixBenches, mobile]);
  const [mSort, setMSort] = useState({ key: 'arena-text', dir: 'desc' });

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
          {llms.loading && !models.length ? <Skeleton height={400} /> : <DataTable columns={matrixColumns} rows={matrixRows} visible={matrixColumns.map(c => c.key)} sort={mSort} onSort={setMSort} mobile={mobile} rowKey={r => r.m.id} pageSize={50} dense onRowClick={r => onNavigate({ type: 'model', slug: r.m.slug })} />}
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

          {/* Right: leaderboard for the benchmark */}
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

            {bench?.aaOnly && !aa && ranked.length === 0 ? <Unavailable what={bench.label} /> : ranked.length === 0 ? (
              <EmptyState title="No values yet" body={bench?.placeholder ? bench.desc : 'No model carries this benchmark in the current dataset.'} />
            ) : (
              <>
                {compare.size > 0 && (
                  <Panel title={`Compare · ${compare.size} selected`} action={<Btn small onClick={() => setCompare(new Set())}>Clear</Btn>}>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {ranked.filter(r => compare.has(r.m.id)).map(r => <ComparisonBar key={r.m.id} label={`${r.m.name} · ${r.m.org}`} valueText={fmtVal(bench, r.v)} width={norm(r.v)} color={ORG_CONFIG[r.m.org]?.color ?? 'var(--text)'} />)}
                    </div>
                  </Panel>
                )}
                <Panel pad={0}>
                  {ranked.slice(0, 60).map((r, i) => {
                    const sel = compare.has(r.m.id);
                    return (
                      <div key={r.m.id} onClick={() => setCompare(s => { const n = new Set(s); n.has(r.m.id) ? n.delete(r.m.id) : n.size < 8 && n.add(r.m.id); return n; })}
                        style={{ display: 'grid', gridTemplateColumns: mobile ? '24px 1fr 70px' : '32px 16px 1fr 200px 90px 70px', gap: 10, alignItems: 'center', padding: mobile ? '8px 10px' : '8px 14px', borderBottom: '0.5px solid var(--sep2)', background: sel ? 'var(--hover)' : 'transparent', cursor: 'pointer' }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: i < 3 ? GOLD : 'var(--muted)', fontWeight: i < 3 ? 700 : 500 }}>{i + 1}</span>
                        {!mobile && <LabLogo org={r.m.org} size={14} />}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.m.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.m.org}{isNum(r.m.arena?.rank) ? ` · arena #${r.m.arena.rank}` : ''}</div>
                        </div>
                        {!mobile && <div style={{ height: 4, background: 'var(--sep2)' }}><div style={{ height: '100%', width: `${norm(r.v) * 100}%`, background: ORG_CONFIG[r.m.org]?.color ?? 'var(--text)' }} /></div>}
                        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtVal(bench, r.v)}</span>
                        {!mobile && <span style={{ textAlign: 'right' }}>{bench.pool !== 'stt' && <AddToBattle item={{ id: r.m.id, kind: 'llm', name: r.m.name, org: r.m.org }} />}</span>}
                      </div>
                    );
                  })}
                  {ranked.length > 60 && <div style={{ padding: 10, fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, textAlign: 'center' }}>Top 60 of {ranked.length} shown — use the filter to find a specific model.</div>}
                </Panel>
                <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO }}>Click rows to compare up to 8 side by side. Values are shown exactly as published by the source; no cross-benchmark averaging.</p>
              </>
            )}
          </div>
        </div>
      )}
    </PageFrame>
  );
}
