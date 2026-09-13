// ─── FrontBoard — who wins what ─────────────────────────────────────────────
// One card per front. Each card is the strongest model for that job (big)
// and the best-value alternative (small), scored from the live data through
// shared/recommend.js with quality-first weights — the same engine as the
// Mission Planner, so a card's arithmetic is one click away. Fronts whose
// source is not configured are simply absent; nothing is estimated.

import { useMemo } from 'react';
import { MONO, EASE, Reveal, Skeleton, LivePulse } from './design.jsx';
import { LabLogo } from './LabLogo.jsx';
import { Label, SourceTag, GREEN, GOLD, BLUE, PURPLE, RED } from './ui.jsx';
import { useLLMs, useMedia, useSpeech, useCoding, useProviders } from '../data/useDomain.js';
import { MISSIONS, recommend } from '../../shared/recommend.js';
import { poolFor } from '../data/candidates.js';
import { fmtMetric, metric, isNum } from '../../shared/metrics.js';

/* The board, in reading order. `mission` cards come from the recommend
   engine; the rest are computed here from the merged datasets. */
const FRONTS = [
  { key: 'chat',          mission: 'chat',          label: 'Language',         q: 'Strongest overall',              color: GREEN,  route: 'leaderboard', live: true },
  { key: 'coding',        mission: 'coding',        label: 'Coding',           q: 'Best for software engineering',  color: GREEN,  route: 'coding' },
  { key: 'reasoning',     mission: 'reasoning',     label: 'Hard reasoning',   q: 'Best on the Intelligence Index', color: BLUE,   route: 'benchmarks' },
  { key: 'agents',        mission: 'agents',        label: 'Agents & tools',   q: 'Best at tool use',               color: BLUE,   route: 'benchmarks' },
  { key: 'cheap',         mission: 'cheap-api',     label: 'Cheap at volume',  q: 'Cheapest model worth using',     color: GOLD,   route: 'leaderboard', topN: 60 },
  { key: 'long',          mission: 'long-context',  label: 'Long documents',   q: 'Reads the most at once',         color: BLUE,   route: 'leaderboard' },
  { key: 'open',          special: 'open',          label: 'Open weights',     q: 'Strongest you can self-host',    color: GREEN,  route: 'leaderboard' },
  { key: 'fast',          mission: 'fast-api',      label: 'Fastest',          q: 'Most tokens per second',         color: PURPLE, route: 'race', needsSpeed: true },
  { key: 'image',         mission: 'image-gen',     label: 'Image generation', q: 'Best text-to-image',             color: GOLD,   route: 'images' },
  { key: 'image-edit',    mission: 'image-edit',    label: 'Image editing',    q: 'Best instruction editing',       color: GOLD,   route: 'images' },
  { key: 'video',         mission: 'video-gen',     label: 'Video generation', q: 'Best text-to-video',             color: GOLD,   route: 'videos' },
  { key: 'voice',         mission: 'voice',         label: 'Text to speech',   q: 'Best voice',                     color: PURPLE, route: 'speech' },
  { key: 'stt',           mission: 'transcription', label: 'Transcription',    q: 'Most accurate speech-to-text',   color: PURPLE, route: 'speech' },
  { key: 'provider',      special: 'provider',      label: 'Provider war',     q: 'Cheapest host for the champion', color: RED,    route: 'providers' },
];

const QUALITY_FIRST = { quality: 1, cost: 0, speed: 0.15, context: 0.1, open: 0 };
const weightsFor = mission => (mission.preset ? { ...mission.preset } : QUALITY_FIRST);

/* A model with no price must not win by omission: only priced candidates
   compete, as long as enough of them exist. */
function priced(rows, mission) {
  const withCost = rows.filter(r => isNum(r.metrics[mission.cost]));
  return withCost.length >= 10 ? withCost : rows;
}

const votes = m => (isNum(m?.arena?.votes) ? `${fmtMetric('votes', m.arena.votes)} votes` : null);

/* prices read as prose, not as column headers */
const COST_UNIT = { priceBlended: '/ 1M blended', priceIn: '/ 1M in', pricePerImage: '/ image', pricePerSecond: '/ s', pricePer1mChars: '/ 1M chars', pricePerMinute: '/ min' };
const cost = (key, v) => (isNum(v) ? `${fmtMetric(key, v)} ${COST_UNIT[key] ?? metric(key).short}` : null);

export function useFronts() {
  const llms = useLLMs(), media = useMedia(), speech = useSpeech(), coding = useCoding(), prov = useProviders();
  const cards = useMemo(() => {
    const env = { llms, media, speech };
    const out = [];
    for (const f of FRONTS) {
      if (f.mission) {
        const mission = MISSIONS.find(m => m.id === f.mission);
        let rows = priced(poolFor(mission.pool, env), mission);
        if (f.topN) rows = [...rows].sort((a, b) => (b.metrics[mission.quality] ?? -1) - (a.metrics[mission.quality] ?? -1)).slice(0, f.topN);
        const res = rows.length ? recommend(mission, rows, weightsFor(mission)) : null;
        const top = res?.picks?.primary;
        if (f.needsSpeed && res?.missing?.speed) continue;
        if (top) {
          let value = recommend(mission, rows).picks.bestValue;
          if (value && value.id === top.id) value = null;
          const qv = top.metrics[mission.quality], cv = top.metrics[mission.cost];
          const card = {
            ...f, source: metric(mission.quality).source, mission,
            top: { name: top.name, org: top.org, kind: top.kind, id: top.id, slug: top.slug },
            value: isNum(qv) ? fmtMetric(mission.quality, qv) : null, unit: metric(mission.quality).short,
            sub: [top.kind === 'llm' ? votes(top.m) : null, cost(mission.cost, cv)].filter(Boolean).join(' · '),
          };
          // the fronts that are about a different number than quality lead with that number
          if (f.key === 'long' && isNum(top.metrics.context)) {
            card.value = fmtMetric('context', top.metrics.context); card.unit = 'tokens of context';
            card.sub = [isNum(qv) ? `ELO ${fmtMetric('elo', qv)}` : null, cost(mission.cost, cv)].filter(Boolean).join(' · ');
          }
          if (f.key === 'cheap' && isNum(cv)) {
            card.value = fmtMetric(mission.cost, cv); card.unit = COST_UNIT[mission.cost];
            card.sub = [isNum(qv) ? `ELO ${fmtMetric('elo', qv)}` : null, votes(top.m)].filter(Boolean).join(' · ');
            value = null; // a dearer "value" alternative to the cheapest pick makes no sense
          }
          out.push({
            ...card,
            alt: value ? (() => {
              const aq = value.metrics[mission.quality], ac = value.metrics[mission.cost];
              const share = isNum(aq) && isNum(qv) && qv > 0 && metric(mission.quality).higherIsBetter !== false ? `${Math.round((aq / qv) * 100)}% of the leader` : null;
              return { name: value.name, org: value.org, kind: value.kind, id: value.id, slug: value.slug, value: isNum(aq) ? fmtMetric(mission.quality, aq) : null, note: [cost(mission.cost, ac), share].filter(Boolean).join(' · ') };
            })() : null,
          });
          continue;
        }
        // Coding has a benchmark of its own when the index source is not configured.
        if (f.key === 'coding') {
          const swe = coding.boards?.Verified?.[0];
          if (swe) out.push({ ...f, source: 'swebench', top: { name: swe.model ?? swe.name, org: swe.modelOrg, kind: 'llm', id: swe.linkedModelId }, value: fmtMetric('resolved', swe.resolved), unit: 'SWE-bench Verified', sub: `via ${swe.agent}${isNum(swe.costPerTask) ? ` · ${fmtMetric('costPerTask', swe.costPerTask)}/task` : ''}`, route: 'coding' });
        }
        continue;
      }
      if (f.special === 'open') {
        const ranked = llms.models.filter(m => m.inArena);
        const top = ranked.find(m => m.isOpen);
        if (!top) continue;
        const cheap = [...ranked.filter(m => m.isOpen && isNum(m.priceBlended)).slice(0, 15)].sort((a, b) => a.priceBlended - b.priceBlended)[0];
        out.push({ ...f, source: 'arena', top: { name: top.name, org: top.org, kind: 'llm', id: top.id, slug: top.slug }, value: fmtMetric('elo', top.arena.elo), unit: 'ELO',
          sub: `#${top.arena.rank} overall · ${top.license ?? 'open'}`,
          alt: cheap && cheap.id !== top.id ? { name: cheap.name, org: cheap.org, kind: 'llm', id: cheap.id, slug: cheap.slug, value: fmtMetric('elo', cheap.arena.elo), note: `${cost('priceBlended', cheap.priceBlended)} · ${Math.round((cheap.arena.elo / top.arena.elo) * 100)}% of the leader` } : null });
        continue;
      }
      if (f.special === 'provider') {
        const champ = llms.models.find(m => m.inArena);
        const entry = champ && prov.models?.find(p => p.modelId === champ.id);
        const ep = entry?.endpoints?.find(e => e.tag === entry.winners.cheapest);
        if (!ep) continue;
        const ctx = entry.endpoints.find(e => e.tag === entry.winners.context);
        out.push({ ...f, source: 'openrouter', top: { name: ep.provider, org: null, kind: 'provider', id: champ.id }, value: fmtMetric('priceBlended', ep.priceBlended), unit: 'blended / 1M',
          sub: `for ${champ.name} · ${entry.endpoints.length} hosts compared`, alt: ctx && ctx.tag !== ep.tag ? { name: ctx.provider, org: null, kind: 'provider', id: champ.id, value: fmtMetric('context', ctx.context), note: 'largest context window served', label: 'CONTEXT' } : null });
      }
    }
    return out;
  }, [llms.models, media.boards, speech.tts, speech.stt, coding.boards, prov.models]);
  const loading = llms.loading && !llms.models.length;
  return { cards, loading };
}

function openPick(p, f, onNavigate) {
  if (p.kind === 'llm' && p.slug) return onNavigate({ type: 'model', slug: p.slug });
  if (p.kind === 'image') return onNavigate({ type: 'images', slug: p.id });
  if (p.kind === 'video') return onNavigate({ type: 'videos', slug: p.id });
  if (p.kind === 'provider') return onNavigate({ type: 'providers', slug: p.id });
  onNavigate(f.route);
}

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

function LogoTile({ org, size = 34 }) {
  return (
    <span style={{ width: size, height: size, background: 'var(--card2)', border: '0.5px solid var(--sep2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <LabLogo org={org} size={Math.round(size * 0.55)} />
    </span>
  );
}

/* One front: the label, the question, the winner as a row (mark · name · lab
   on the left, the number on the right), then the best-value alternative as
   a second, smaller row of the same shape. Numbers wear the ink colour; the
   front's colour is the small square beside the label. */
function Card({ c, i, mobile, onNavigate }) {
  const go = () => openPick(c.top, c, onNavigate);
  return (
    <div onClick={go} className="aiwar-surface aiwar-card-hover" role="link" tabIndex={0} onKeyDown={e => e.key === 'Enter' && go()} style={{
      padding: mobile ? '14px 14px 12px' : '16px 18px 14px', cursor: 'pointer', minWidth: 0, height: '100%',
      display: 'flex', flexDirection: 'column',
      opacity: 0, animation: `aiwar-fade-up 600ms ${EASE} ${80 + i * 35}ms both`,
    }}>
      {/* Front */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span aria-hidden style={{ width: 8, height: 8, background: c.color, flexShrink: 0 }} />
          <Label color="var(--text)" style={{ fontSize: 10.5 }}>{c.label}</Label>
          {c.live && <LivePulse color={GREEN} size={6} />}
        </span>
        <SourceTag id={c.source} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, ...ellipsis }}>{c.q}</div>

      {/* Winner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14, minWidth: 0 }}>
        {c.top.org ? <LogoTile org={c.top.org} size={mobile ? 30 : 34} /> : null}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: mobile ? 15 : 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15, ...ellipsis }}>{c.top.name}</div>
          {c.top.org && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, ...ellipsis }}>{c.top.org}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: mobile ? 20 : 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', fontFamily: MONO, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
          <div style={{ fontSize: 9.5, color: 'var(--muted2)', fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4, maxWidth: 120, ...ellipsis }}>{c.unit}</div>
        </div>
      </div>
      {c.sub && <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 8, ...ellipsis }}>{c.sub}</div>}

      {/* Best-value alternative */}
      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <div style={{ borderTop: '0.5px solid var(--sep)', paddingTop: 10, minHeight: 46 }}>
          {c.alt ? (
            <button onClick={e => { e.stopPropagation(); openPick(c.alt, c, onNavigate); }} className="aiwar-press-btn" title="Best value for this job" style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit',
              display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', columnGap: 8, rowGap: 3,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: GOLD, letterSpacing: '0.1em', border: `0.5px solid ${GOLD}66`, padding: '2px 5px', whiteSpace: 'nowrap' }}>{c.alt.label ?? 'VALUE'}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                {c.alt.org && <LabLogo org={c.alt.org} size={12} />}
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', ...ellipsis }}>{c.alt.name}</span>
              </span>
              <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.alt.value ?? ''}</span>
              {c.alt.note && <><span /><span style={{ fontSize: 10.5, color: 'var(--muted)', gridColumn: '2 / 4', ...ellipsis }}>{c.alt.note}</span></>}
            </button>
          ) : (
            <span style={{ fontSize: 11.5, color: 'var(--muted2)', display: 'block', lineHeight: 1.45 }}>{c.mission?.desc ?? ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FrontBoard({ onNavigate, mobile }) {
  const { cards, loading } = useFronts();
  const cols = mobile ? '1fr' : 'repeat(auto-fill, minmax(270px, 1fr))';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12 }}>
      {loading
        ? Array.from({ length: mobile ? 4 : 8 }).map((_, i) => <div key={i} style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', padding: 18 }}><Skeleton height={11} width="40%" style={{ marginBottom: 16 }} /><Skeleton height={18} /><Skeleton height={28} width="45%" style={{ marginTop: 12 }} /><Skeleton height={11} width="70%" style={{ marginTop: 16 }} /></div>)
        : cards.map((c, i) => <Card key={c.key} c={c} i={i} mobile={mobile} onNavigate={onNavigate} />)}
    </div>
  );
}
