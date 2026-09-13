// ─── PicksBoard — "which model should I use?" ───────────────────────────────
// One card per job. Each card is the Mission Planner's default result for
// that mission (shared/recommend.js) — the top pick plus the best-value pick
// — computed from the live data, never typed in. Clicking a card opens the
// planner on that mission with the arithmetic shown.

import { useMemo } from 'react';
import { MONO, EASE, Reveal } from './design.jsx';
import { LabLogo } from './LabLogo.jsx';
import { Label, SourceTag, GREEN, GOLD, BLUE, PURPLE } from './ui.jsx';
import { Skeleton } from './design.jsx';
import { useLLMs, useMedia, useSpeech, useCoding } from '../data/useDomain.js';
import { MISSIONS, recommend } from '../../shared/recommend.js';
import { poolFor } from '../data/candidates.js';
import { fmtMetric, metric, isNum } from '../../shared/metrics.js';

const TASKS = [
  { id: 'chat',          label: 'Chat & writing',    color: GREEN },
  { id: 'coding',        label: 'Coding',            color: GREEN },
  { id: 'reasoning',     label: 'Hard reasoning',    color: BLUE },
  { id: 'agents',        label: 'Agents & tools',    color: BLUE },
  { id: 'cheap-api',     label: 'Cheap at volume',   color: GOLD, topN: 60 },
  { id: 'long-context',  label: 'Long documents',    color: BLUE },
  { id: 'fast-api',      label: 'Lowest latency',    color: PURPLE, needsSpeed: true },
  { id: 'image-gen',     label: 'Image generation',  color: GOLD },
  { id: 'image-edit',    label: 'Image editing',     color: GOLD },
  { id: 'video-gen',     label: 'Video generation',  color: GOLD },
  { id: 'voice',         label: 'Text to speech',    color: PURPLE },
  { id: 'transcription', label: 'Transcription',     color: BLUE },
];

/* The top pick is the strongest model for the job; cost only decides the
   value pick. Missions whose preset *is* about cost or context (cheap,
   long-context, latency) keep their preset. */
const QUALITY_FIRST = { quality: 1, cost: 0, speed: 0.15, context: 0.1, open: 0 };
function weightsFor(mission) { return mission.preset ? { ...mission.preset } : QUALITY_FIRST; }

/* A model with no price must not win by omission: for LLM jobs, only priced
   candidates compete, as long as enough of them exist. */
function priced(rows, mission) {
  const withCost = rows.filter(r => isNum(r.metrics[mission.cost]));
  return withCost.length >= 10 ? withCost : rows;
}

function usePicks() {
  const llms = useLLMs(), media = useMedia(), speech = useSpeech(), coding = useCoding();
  const cards = useMemo(() => {
    const env = { llms, media, speech };
    const out = [];
    for (const t of TASKS) {
      const mission = MISSIONS.find(m => m.id === t.id);
      if (!mission) continue;
      let rows = priced(poolFor(mission.pool, env), mission);
      // "cheap" only means anything among models worth using: keep the top N by quality
      if (t.topN) rows = [...rows].sort((a, b) => (b.metrics[mission.quality] ?? -1) - (a.metrics[mission.quality] ?? -1)).slice(0, t.topN);
      const res = rows.length ? recommend(mission, rows, weightsFor(mission)) : null;
      if (t.needsSpeed && res?.missing?.speed) continue;
      const primary = res?.picks?.primary ?? null;
      // value = best quality-per-dollar under the planner's default weights
      let value = rows.length ? recommend(mission, rows).picks.bestValue : null;
      if (value && primary && value.id === primary.id) value = null;

      if (primary) {
        out.push({ ...t, mission, primary, value, source: metric(mission.quality).source });
        continue;
      }
      // Coding has a benchmark of its own when the index source is not configured.
      if (t.id === 'coding') {
        const swe = coding.boards?.Verified?.[0];
        if (swe) out.push({ ...t, mission, swe, source: 'swebench' });
      }
    }
    return out;
  }, [llms.models, media.boards, speech.tts, speech.stt, coding.boards]);
  const loading = llms.loading && !llms.models.length;
  return { cards, loading };
}

function Pick({ p, kind, mission, onNavigate, big }) {
  const go = e => {
    e.stopPropagation();
    if (kind === 'llm' && p.slug) return onNavigate({ type: 'model', slug: p.slug });
    if (kind === 'image') return onNavigate({ type: 'images', slug: p.id });
    if (kind === 'video') return onNavigate({ type: 'videos', slug: p.id });
    if (kind === 'tts' || kind === 'stt') return onNavigate('speech');
    onNavigate({ type: 'planner', slug: mission.id });
  };
  const qv = p.metrics[mission.quality];
  const cv = p.metrics[mission.cost];
  return (
    <button onClick={go} className="aiwar-press-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, width: '100%' }}>
      <LabLogo org={p.org} size={big ? 16 : 13} />
      <span style={{ fontSize: big ? 15 : 12.5, fontWeight: big ? 700 : 600, color: 'var(--text)', letterSpacing: '-0.025em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{p.name}</span>
      <span style={{ fontFamily: MONO, fontSize: big ? 12 : 10.5, color: big ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {isNum(qv) && <span>{fmtMetric(mission.quality, qv)} <span style={{ color: 'var(--muted2)', fontSize: 9.5 }}>{metric(mission.quality).short}</span></span>}
        {isNum(cv) && <span style={{ color: GOLD, marginLeft: 8 }}>{fmtMetric(mission.cost, cv)}</span>}
      </span>
    </button>
  );
}

export default function PicksBoard({ onNavigate, mobile }) {
  const { cards, loading } = usePicks();
  const cols = mobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))';
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10 }}>
        {Array.from({ length: mobile ? 4 : 8 }).map((_, i) => <div key={i} style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', padding: 14 }}><Skeleton height={11} width="40%" style={{ marginBottom: 14 }} /><Skeleton height={18} /><Skeleton height={11} width="70%" style={{ marginTop: 10 }} /></div>)}
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10 }}>
      {cards.map((c, i) => (
        <Reveal key={c.id} delay={Math.min(i, 8) * 40} y={16}>
          <div onClick={() => onNavigate({ type: 'planner', slug: c.id })} className="aiwar-card-hover" role="link" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onNavigate({ type: 'planner', slug: c.id })}
            style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', borderLeft: `2px solid ${c.color}`, padding: mobile ? '12px 12px 11px' : '14px 16px 12px', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Label color="var(--text)">{c.label}</Label>
              <SourceTag id={c.source} />
            </div>
            {c.swe ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <LabLogo org={c.swe.modelOrg} size={16} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.025em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.swe.model ?? c.swe.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>{fmtMetric('resolved', c.swe.resolved)} <span style={{ color: 'var(--muted2)', fontSize: 9.5 }}>solved</span></span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>SWE-bench Verified · via {c.swe.agent}{isNum(c.swe.costPerTask) ? ` · ${fmtMetric('costPerTask', c.swe.costPerTask)}/task` : ''}</div>
              </>
            ) : (
              <>
                <Pick p={c.primary} kind={c.primary.kind} mission={c.mission} onNavigate={onNavigate} big />
                {c.value ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, paddingTop: 8, borderTop: '0.5px solid var(--sep2)' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: GOLD, letterSpacing: '0.08em', flexShrink: 0 }}>VALUE</span>
                    <Pick p={c.value} kind={c.value.kind} mission={c.mission} onNavigate={onNavigate} />
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--muted2)', paddingTop: 8, borderTop: '0.5px solid var(--sep2)' }}>{c.mission.desc}</div>
                )}
              </>
            )}
          </div>
        </Reveal>
      ))}
    </div>
  );
}
