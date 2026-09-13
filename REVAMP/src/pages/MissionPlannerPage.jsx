// ─── MISSION PLANNER — deterministic recommendations ────────────────────────
// "What is your mission?" → weights → normalised scoring in shared/recommend.js.
// Every pick shows the numbers behind it. No LLM in the loop.

import { useMemo, useState } from 'react';
import { useMobile } from '../hooks/useTheme.js';
import { MONO, EASE, GlobalMotion, Skeleton } from '../components/design.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { useLLMs, useMedia, useSpeech } from '../data/useDomain.js';
import DataTable, { NaCell } from '../components/table/DataTable.jsx';
import { PageFrame, PageTitle, DataStatus, Panel, Label, Chip, Btn, EmptyState, BadgeTag, GREEN, GOLD, BLUE, PURPLE } from '../components/ui.jsx';
import { MISSIONS, DEFAULT_WEIGHTS, recommend } from '../../shared/recommend.js';
import { isNum, NA, metric } from '../../shared/metrics.js';
import { AddToBattle } from '../domains/comparison/BattleControls.jsx';
import { poolFor } from '../data/candidates.js';

const SLIDERS = [
  { key: 'quality', label: 'Quality', color: GREEN, hint: 'ELO / index of the mission' },
  { key: 'speed',   label: 'Speed',   color: PURPLE, hint: 'tokens/s, latency or generation time' },
  { key: 'cost',    label: 'Cost',    color: GOLD, hint: 'lower price scores higher (log scale)' },
  { key: 'context', label: 'Context', color: BLUE, hint: 'context window (LLM missions)' },
  { key: 'open',    label: 'Open weights', color: GREEN, hint: 'bonus for downloadable weights' },
];
const DIM_COLOR = Object.fromEntries(SLIDERS.map(s => [s.key, s.color]));

export default function MissionPlannerPage({ onNavigate, slug }) {
  const mobile = useMobile();
  const llms = useLLMs(); const media = useMedia(); const speech = useSpeech();
  const [missionId, setMissionId] = useState(MISSIONS.some(m => m.id === slug) ? slug : 'chat');
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS });
  const [touched, setTouched] = useState(false);
  const [sort, setSort] = useState({ key: 'score', dir: 'desc' });
  const mission = MISSIONS.find(m => m.id === missionId);

  const rows = useMemo(() => poolFor(mission.pool, { llms, media, speech }), [mission, llms.models, media.boards, speech.tts, speech.stt]); // eslint-disable-line

  const effective = touched ? weights : { ...DEFAULT_WEIGHTS, ...(mission.preset ?? {}) };
  const result = useMemo(() => rows.length ? recommend(mission, rows, effective) : null, [mission, rows, effective]);
  const loading = (mission.pool === 'llm' && llms.loading && !llms.models.length) || (mission.pool.startsWith('image') || mission.pool === 'video' ? media.loading && !Object.keys(media.boards).length : false) || (mission.pool === 'stt' && speech.loading && !speech.stt.length);

  const set = (k, v) => { setTouched(true); setWeights(w => ({ ...w, [k]: v })); };
  const pickMission = id => { setMissionId(id); setTouched(false); setWeights({ ...DEFAULT_WEIGHTS }); };

  const shortlist = useMemo(() => (result?.scored ?? []).slice(0, 25).map((r, i) => ({ ...r, rank: i + 1 })), [result]);
  const cols = useMemo(() => [
    { key: 'model', label: 'Candidate', sticky: true, width: mobile ? 200 : 290, value: r => r.rank, defaultDir: 'asc', render: r => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ width: 22, textAlign: 'right', fontFamily: MONO, fontSize: 11.5, color: r.rank <= 3 ? 'var(--text)' : 'var(--muted)', fontWeight: r.rank <= 3 ? 700 : 500, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{r.rank}</span>
        <LabLogo org={r.org} size={14} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 130 : 200 }}>{r.name}</span>
          <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.org}</span>
        </span>
      </span>) },
    { key: 'score', label: 'Mission score', short: 'Score', group: 'Score · 0–100', numeric: true, bar: true, barColor: GREEN, higherIsBetter: true, width: 150, barWidth: 60, valueWidth: 36, value: r => r.score * 100, render: r => <span style={{ fontWeight: 700 }}>{Math.round(r.score * 100)}</span> },
    ...(result?.dims ?? []).map(d => ({ key: `part:${d.key}`, label: `${d.key} · weight ${Math.round(d.weight * 100)}%`, short: d.key, group: 'Breakdown · per dimension', numeric: true, width: 92, bar: true, barColor: DIM_COLOR[d.key] ?? 'var(--text)', barWidth: 28, valueWidth: 28, higherIsBetter: true, value: r => (isNum(r.parts?.[d.key]) ? r.parts[d.key] * 100 : null), render: r => (isNum(r.parts?.[d.key]) ? Math.round(r.parts[d.key] * 100) : <NaCell />) })),
    { key: 'coverage', label: 'Data coverage', short: 'Coverage', group: 'Breakdown · per dimension', numeric: true, width: 84, value: r => r.coverage, render: r => r.coverage < 1 ? <BadgeTag color={GOLD}>partial</BadgeTag> : <span style={{ color: 'var(--muted2)', fontSize: 11 }}>full</span> },
    { key: 'battle', label: '', width: 72, sortable: false, align: 'right', render: r => <AddToBattle item={{ id: r.id, kind: r.kind, name: r.name, org: r.org, board: r.board }} /> },
  ], [result, mobile]);

  return (
    <PageFrame mobile={mobile}>
      <GlobalMotion />
      <PageTitle mobile={mobile} eyebrow="Mission Planner" title="What is your mission?" subtitle="Pick the job, weight what matters, and get a shortlist computed from the live data — with the arithmetic shown. Nothing here is generated by a language model."
        status={<DataStatus status={llms.status} fetchedAt={llms.data?.fetchedAt} sources={['arena', 'openrouter', 'openasr', ...(llms.capabilities?.aa ? ['aa'] : [])]} loading={llms.loading} />} />

      {/* Mission */}
      <Panel style={{ marginBottom: 12 }} title="Mission">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MISSIONS.map(m => <Chip key={m.id} active={missionId === m.id} label={m.label} onClick={() => pickMission(m.id)} />)}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5 }}>
          {mission.desc} Quality metric: <span style={{ fontFamily: MONO, color: 'var(--text)' }}>{metric(mission.quality).label}</span> · cost: <span style={{ fontFamily: MONO, color: 'var(--text)' }}>{metric(mission.cost).label}</span> · speed: <span style={{ fontFamily: MONO, color: 'var(--text)' }}>{metric(mission.speed).label}</span>.
        </p>
      </Panel>

      {/* Priorities */}
      <Panel style={{ marginBottom: 16 }} title="Priorities" action={touched && <Btn small onClick={() => { setTouched(false); setWeights({ ...DEFAULT_WEIGHTS }); }}>Reset to mission default</Btn>}>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(5, 1fr)', gap: mobile ? 10 : 16 }}>
          {SLIDERS.map(s => (
            <label key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between' }}><Label color={s.color}>{s.label}</Label><span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--text)' }}>{Math.round(effective[s.key] * 100)}%</span></span>
              <input type="range" min="0" max="100" value={Math.round(effective[s.key] * 100)} onChange={e => set(s.key, +e.target.value / 100)} style={{ width: '100%', accentColor: s.color }} />
              <span style={{ fontSize: 10.5, color: 'var(--muted2)' }}>{s.hint}</span>
            </label>
          ))}
        </div>
      </Panel>

      {loading ? <Skeleton height={360} /> : !result || !result.scored.length ? (
        <EmptyState title="Not enough data for this mission" body={result?.reason ?? `No candidates carry a ${metric(mission.quality).label} value from a configured source.`} />
      ) : (
        <>
          {/* The four picks */}
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[['primary', 'Primary pick', GREEN], ['bestValue', 'Best value', GOLD], ['budget', 'Budget pick', BLUE], ['fastest', 'Fastest pick', PURPLE]].map(([k, label, color], i) => {
              const p = result.picks[k];
              return (
                <div key={k} className="aiwar-surface" style={{ borderTop: `2px solid ${color}`, padding: 14, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, animation: `aiwar-fade-up 500ms ${EASE} ${i * 70}ms both` }}>
                  <Label color={color}>{label}</Label>
                  {p ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}><LabLogo org={p.org} size={14} /><span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span></div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{p.org} · <span style={{ fontFamily: MONO }}>score {(p.score * 100).toFixed(0)}/100</span></div>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 14, fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>{p.why.map((w, j) => <li key={j}>{w}</li>)}</ul>
                      <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {p.slug && <Btn small onClick={() => onNavigate({ type: 'model', slug: p.slug })}>Profile</Btn>}
                        <AddToBattle item={{ id: p.id, kind: p.kind, name: p.name, org: p.org, board: p.board }} />
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}><span style={{ fontFamily: MONO, color: 'var(--muted2)' }}>{NA}</span> · {k === 'fastest' ? (result.missing.speed ?? 'no speed data') : k === 'budget' || k === 'bestValue' ? (result.missing.cost ?? 'no cost data') : 'no candidates'}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* The shortlist — score, and the score's parts, as data bars */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <Label color="var(--muted)">Ranked shortlist · top {shortlist.length} of {result.scored.length} candidates</Label>
            <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)' }}>weights: {result.dims.map(d => `${d.key} ${Math.round(d.weight * 100)}%`).join(' · ')}</span>
          </div>
          <DataTable columns={cols} rows={shortlist} visible={cols.map(c => c.key)} sort={sort} onSort={setSort} mobile={mobile} rowKey={r => r.id} pageSize={25}
            onRowClick={r => { if (r.slug) onNavigate({ type: 'model', slug: r.slug }); }}
            footer={<span>Score = weighted mean of the dimensions the candidate has data for · a missing dimension is skipped, never scored as zero · partial = coverage penalty applied</span>} />

          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 12, lineHeight: 1.55 }}>
            How it works: each dimension is normalised to 0–1 across the candidate pool (cost and context on a log scale, lower-is-better metrics inverted), multiplied by its weight and averaged over the dimensions the candidate actually has data for. A missing dimension is skipped — never scored as zero — with a small coverage penalty so a model can't win by omission. Best value = ½ quality + ½ cheapness among candidates at ≥55% of the top quality; budget = cheapest at mid-pack quality or better; fastest = best speed metric at mid-pack quality or better.
          </p>
        </>
      )}
    </PageFrame>
  );
}
