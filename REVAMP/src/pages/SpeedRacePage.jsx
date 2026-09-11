// ─── SPEED RACE — real measurements, animated ───────────────────────────────

import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useMobile } from '../hooks/useTheme.js';
import { MONO, GlobalMotion, Skeleton } from '../components/design.jsx';
import { RobotMascot } from '../components/Robot.jsx';
import { useLLMs, useMedia, useSpeech, useCoding } from '../data/useDomain.js';
import { PageFrame, PageTitle, DataStatus, Panel, Label, Chip, Segmented, Btn, EmptyState, Unavailable, SourceTag, GREEN } from '../components/ui.jsx';
import { RACE_CATEGORIES, buildLanes } from '../../shared/race.js';
import { fmtMetric, isNum, metric } from '../../shared/metrics.js';

const RaceLanes = lazy(() => import('../components/charts/RaceLanes.jsx'));

export default function SpeedRacePage({ onNavigate, slug }) {
  const mobile = useMobile();
  const llms = useLLMs(); const media = useMedia(); const speech = useSpeech(); const coding = useCoding();
  const [catId, setCatId] = useState(RACE_CATEGORIES.some(c => c.id === slug) ? slug : 'stt-speed');
  const [picked, setPicked] = useState([]);
  const [query, setQuery] = useState('');
  const cat = RACE_CATEGORIES.find(c => c.id === catId);

  // Entrants per category: only rows that carry the real metric.
  const pool = useMemo(() => {
    const m = cat.metric;
    switch (cat.pool) {
      case 'llm': return llms.models.filter(x => isNum(x.aa?.[m])).map(x => ({ id: x.id, name: x.name, org: x.org, value: x.aa[m], sub: x.arena ? `ELO ${x.arena.elo}` : 'unranked' }));
      case 'image': return (media.boards?.['text-to-image'] ?? []).filter(x => isNum(x.genTime)).map(x => ({ id: x.id, name: x.name, org: x.org, value: x.genTime, sub: `ELO ${x.elo}` }));
      case 'video': return (media.boards?.['text-to-video'] ?? []).filter(x => isNum(x.genTime)).map(x => ({ id: x.id, name: x.name, org: x.org, value: x.genTime, sub: `ELO ${x.elo}` }));
      case 'tts': return speech.tts.filter(x => isNum(x.ttft)).map(x => ({ id: x.modelId ?? x.id, name: x.name, org: x.org, value: x.ttft, sub: x.provider ?? '' }));
      case 'stt': return speech.stt.filter(x => isNum(x.rtfx)).map(x => ({ id: x.id, name: x.name, org: x.org, value: x.rtfx, sub: `WER ${fmtMetric('wer', x.wer)}` }));
      case 'coding': return (coding.boards?.Verified ?? []).filter(x => isNum(x.costPerTask) && x.costPerTask > 0).map(x => ({ id: x.id, name: `${x.model} · ${x.agent}`, org: x.modelOrg, value: x.costPerTask, sub: `${fmtMetric('resolved', x.resolved)} solved` }));
      default: return [];
    }
  }, [cat, llms.models, media.boards, speech.tts, speech.stt, coding.boards]);

  const ranked = useMemo(() => [...pool].sort((a, b) => cat.higherIsBetter ? b.value - a.value : a.value - b.value), [pool, cat]);
  useEffect(() => { setPicked(ranked.slice(0, Math.min(5, ranked.length)).map(e => e.id)); }, [catId, ranked.length]); // eslint-disable-line

  const entries = picked.map(id => pool.find(e => e.id === id)).filter(Boolean);
  const lanes = useMemo(() => buildLanes(entries, { higherIsBetter: cat.higherIsBetter, baseMs: 3200 }), [entries, cat]);
  const q = query.trim().toLowerCase();
  const choices = ranked.filter(e => !q || `${e.name} ${e.org}`.toLowerCase().includes(q)).slice(0, 40);
  const anyLoading = llms.loading && !llms.models.length;
  const aa = !!llms.capabilities?.aa;
  const needsAA = ['llm', 'image', 'video', 'tts'].includes(cat.pool);

  return (
    <PageFrame mobile={mobile}>
      <GlobalMotion />
      <PageTitle mobile={mobile} eyebrow="Speed Race" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>On your marks. <RobotMascot variant="eared" size={mobile ? 32 : 44} color="var(--accent)" /></span>}
        subtitle="Benchmark measurements as a race: the winner crosses the line in about three seconds and every other lane is scaled by its real ratio. The numbers printed are the measurements, not the animation."
        status={<DataStatus status={llms.status} fetchedAt={llms.data?.fetchedAt} sources={cat.pool === 'stt' ? ['openasr'] : cat.pool === 'coding' ? ['swebench'] : ['aa']} loading={anyLoading} />} />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {RACE_CATEGORIES.map(c => {
          const n = c.id === catId ? pool.length : null;
          return <Chip key={c.id} active={catId === c.id} label={c.label} onClick={() => setCatId(c.id)} title={c.desc} />;
        })}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 12px' }}>{cat.desc} <span style={{ fontFamily: MONO, color: 'var(--muted2)', fontSize: 11 }}>· {cat.higherIsBetter ? 'higher wins' : 'lower wins'} · {pool.length} entrants with real data</span></p>

      {anyLoading ? <Skeleton height={360} /> : pool.length === 0 ? (
        needsAA && !aa ? <Unavailable what={`${cat.label} measurements`} /> : <EmptyState title="No entrants" body="No row in this category carries the measurement yet." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 280px', gap: 12, alignItems: 'start' }}>
          <Panel pad={mobile ? 12 : 18}>
            {lanes.length >= 2 ? (
              <Suspense fallback={<Skeleton height={300} />}>
                <RaceLanes lanes={lanes} metricKey={cat.metric} unit={cat.unit} mobile={mobile} />
              </Suspense>
            ) : <EmptyState title="Pick at least two racers" body="Choose entrants from the list." />}
          </Panel>
          <Panel title={`Entrants · ${picked.length}/8`} action={<Btn small onClick={() => setPicked(ranked.slice(0, 5).map(e => e.id))}>Top 5</Btn>} pad={10}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a model…" style={{ width: '100%', height: 28, paddingInline: 10, background: 'var(--card2)', border: '0.5px solid var(--sep)', outline: 'none', fontSize: 12.5, color: 'var(--text)', fontFamily: 'inherit', marginBottom: 8 }} />
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {choices.map((e, i) => {
                const on = picked.includes(e.id);
                return (
                  <button key={e.id} onClick={() => setPicked(p => on ? p.filter(x => x !== e.id) : p.length >= 8 ? p : [...p, e.id])} style={{ display: 'grid', gridTemplateColumns: '14px 1fr auto', gap: 8, alignItems: 'center', width: '100%', padding: '6px 6px', background: on ? 'var(--hover)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    <span style={{ width: 10, height: 10, border: `1px solid ${on ? 'var(--text)' : 'var(--sep)'}`, background: on ? 'var(--text)' : 'transparent' }} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted2)' }}>{e.org}{e.sub ? ` · ${e.sub}` : ''}</span>
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: i === 0 ? GREEN : 'var(--muted)' }}>{fmtMetric(cat.metric, e.value)}</span>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 14, lineHeight: 1.55 }}>
        Data source for this category: <SourceTag id={metric(cat.metric).source} />. Output speed, first-token latency and image / video / voice generation times are Artificial Analysis measurements and appear when that source is configured; transcription speed (RTFx) comes from the Open ASR Leaderboard; coding cost per task from SWE-bench submissions that disclose spend.
      </p>
    </PageFrame>
  );
}
