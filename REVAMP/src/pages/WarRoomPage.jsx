// ─── WAR ROOM — the command-center overview ─────────────────────────────────

import { useMemo } from 'react';
import { useMobile } from '../hooks/useTheme.js';
import { MONO, Reveal, GlobalMotion, SectionTitle } from '../components/design.jsx';
import { RobotMascot } from '../components/Robot.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { ORG_CONFIG } from '../models-data.js';
import WarRoomBoard, { useWarRoomCards } from '../components/WarRoomBoard.jsx';
import { PageFrame, PageTitle, DataStatus, Panel, Label, Delta, Btn, SourceTag, eloColor, GREEN, RED, GOLD } from '../components/ui.jsx';
import { SOURCES, fmtAgo, fmtMetric, isNum } from '../../shared/metrics.js';
import { AddToBattle } from '../domains/comparison/BattleControls.jsx';

const SECTIONS = [
  { id: 'leaderboard', label: 'LLM Rankings', desc: 'Arena ELO, intelligence, price, speed, context — every language model.' },
  { id: 'coding',      label: 'Code Ops',     desc: 'Coding agents × models on SWE-bench with cost per task.' },
  { id: 'images',      label: 'Image Arena',  desc: 'Text-to-image and editing quality ELO, price per image.' },
  { id: 'videos',      label: 'Video Arena',  desc: 'Text-to-video and image-to-video, price per second, audio.' },
  { id: 'speech',      label: 'Voice Comms',  desc: 'Transcription accuracy (WER), speech quality, speed.' },
  { id: 'providers',   label: 'Provider War', desc: 'Who hosts each model cheapest, with the most context and uptime.' },
  { id: 'benchmarks',  label: 'Benchmarks',   desc: 'The benchmark matrix — pick a test, compare models, read the methodology.' },
  { id: 'compare',     label: 'Battle Mode',  desc: 'Up to four contestants, head to head, metric by metric.' },
  { id: { type: 'videos', slug: 'replay' }, label: 'Battle Replay', desc: 'Real crowd-voted image and video battles — guess the winner, watch side by side.' },
  { id: 'race',        label: 'Speed Race',   desc: 'Real measurements as an animated race.' },
  { id: 'planner',     label: 'Mission Planner', desc: 'Tell it your mission; get a mathematically ranked shortlist.' },
];

export default function WarRoomPage({ onNavigate }) {
  const mobile = useMobile();
  const wr = useWarRoomCards();
  const movers = useMemo(() => {
    const withHist = wr.models.filter(m => m.inArena && isNum(m.history?.rankDelta7d) && m.history.rankDelta7d !== 0);
    const up = [...withHist].sort((a, b) => b.history.rankDelta7d - a.history.rankDelta7d).slice(0, 5);
    const down = [...withHist].sort((a, b) => a.history.rankDelta7d - b.history.rankDelta7d).slice(0, 5);
    const fresh = wr.models.filter(m => m.inArena && (m.arena?.isNew || m.history?.isNew7d)).slice(0, 6);
    return { up, down, fresh, any: withHist.length > 0 };
  }, [wr.models]);
  const labs = useMemo(() => {
    const by = {};
    for (const m of wr.models.filter(m => m.inArena)) {
      const e = by[m.org] ?? { org: m.org, count: 0, top: null, intel: null };
      e.count++; if (!e.top || m.arena.elo > e.top.arena.elo) e.top = m;
      if (isNum(m.aa?.intelligence) && (e.intel == null || m.aa.intelligence > e.intel)) e.intel = m.aa.intelligence;
      by[m.org] = e;
    }
    return Object.values(by).sort((a, b) => b.top.arena.elo - a.top.arena.elo).slice(0, mobile ? 6 : 8);
  }, [wr.models, mobile]);

  const srcRows = useMemo(() => {
    const out = [];
    const push = (domain, key, s) => { if (s) out.push({ domain, key, ...s }); };
    for (const [domain, src] of Object.entries(wr.sources)) for (const [k, s] of Object.entries(src ?? {})) push(domain, k, s);
    return out;
  }, [wr.sources]);

  return (
    <PageFrame mobile={mobile} wide>
      <GlobalMotion />
      <PageTitle mobile={mobile} eyebrow="War Room" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>Situation board. <RobotMascot variant="classic" size={mobile ? 32 : 44} color="var(--accent)" /></span>}
        subtitle="Who is strongest, fastest, cheapest — across language, code, image, video, voice and the providers that serve them. Every card is computed from live sources; nothing is typed in by hand."
        status={<DataStatus status={wr.status} fetchedAt={wr.fetchedAt} sources={['arena', 'openrouter', 'swebench', 'openasr', ...(wr.capabilities?.aa ? ['aa'] : [])]} loading={wr.loading} />} />

      <section style={{ marginBottom: mobile ? 40 : 56 }}>
        <WarRoomBoard onNavigate={onNavigate} mobile={mobile} />
      </section>

      {/* Movers + labs */}
      <section style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.2fr 1fr', gap: 12, marginBottom: mobile ? 40 : 56 }}>
        <Reveal>
          <Panel title="Movers · last 7 days" action={<SourceTag id="internal" />} style={{ height: '100%' }}>
            {!movers.any ? (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                Rank movement appears once the daily snapshot history covers at least a week. {wr.capabilities?.history === false ? 'Snapshots are stored on the production deployment.' : 'Collecting…'}
                {movers.fresh.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Label>New on the board</Label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {movers.fresh.map(m => <button key={m.id} onClick={() => onNavigate({ type: 'model', slug: m.slug })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'transparent', border: '0.5px solid var(--sep)', cursor: 'pointer', fontSize: 11.5, color: 'var(--text)', fontFamily: 'inherit' }}><LabLogo org={m.org} size={11} />{m.name} <span style={{ fontFamily: MONO, color: GREEN, fontSize: 10 }}>#{m.arena.rank}</span></button>)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[['Climbing', movers.up, GREEN], ['Falling', movers.down, RED]].map(([t, list, col]) => (
                  <div key={t}>
                    <Label color={col} style={{ display: 'block', marginBottom: 6 }}>{t}</Label>
                    {list.map(m => (
                      <div key={m.id} onClick={() => onNavigate({ type: 'model', slug: m.slug })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--sep2)', cursor: 'pointer' }}>
                        <LabLogo org={m.org} size={12} />
                        <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted2)' }}>#{m.arena.rank}</span>
                        <Delta value={m.history.rankDelta7d} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </Reveal>
        <Reveal delay={80}>
          <Panel title="Lab leaderboard · by top model" action={<Btn small onClick={() => onNavigate('leaderboard')}>All labs →</Btn>} style={{ height: '100%' }}>
            {labs.map((l, i) => (
              <div key={l.org} onClick={() => onNavigate({ type: 'model', slug: l.top.slug })} style={{ display: 'grid', gridTemplateColumns: '18px 16px 1fr auto auto', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: i < labs.length - 1 ? '0.5px solid var(--sep2)' : 'none', cursor: 'pointer' }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted2)' }}>{String(i + 1).padStart(2, '0')}</span>
                <LabLogo org={l.org} size={14} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{l.org} <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)', fontWeight: 500 }}>×{l.count}</span></div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.top.name}</div>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted)' }}>{isNum(l.intel) ? `AI ${fmtMetric('intelligence', l.intel)}` : ''}</span>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: eloColor(l.top.arena.elo), fontVariantNumeric: 'tabular-nums' }}>{l.top.arena.elo}</span>
              </div>
            ))}
          </Panel>
        </Reveal>
      </section>

      {/* Sections directory */}
      <section style={{ marginBottom: mobile ? 40 : 56 }}>
        <SectionTitle eyebrow="Theatres of operation" title="Every front, one terminal." mobile={mobile} />
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {SECTIONS.map((s, i) => (
            <Reveal key={s.id} delay={i * 40}>
              <Panel hover onClick={() => onNavigate(s.id)} style={{ height: '100%', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.025em' }}>{s.label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)' }}>{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</div>
              </Panel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Signal status */}
      <section>
        <SectionTitle eyebrow="Signal status" title="Where the numbers come from." mobile={mobile} action={<Btn small onClick={() => onNavigate('methodology')}>Methodology →</Btn>} />
        <Panel pad={0}>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 0 }}>
            {srcRows.map((s, i) => {
              const color = s.status === 'live' ? GREEN : s.status === 'stale' ? GOLD : RED;
              return (
                <div key={`${s.domain}:${s.key}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '0.5px solid var(--sep2)', borderRight: !mobile && i % 2 === 0 ? '0.5px solid var(--sep2)' : undefined }}>
                  <span data-round="1" style={{ width: 6, height: 6, background: color, flexShrink: 0 }} />
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--text)', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.domain} · {s.key}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.status}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)', minWidth: 70, textAlign: 'right' }}>{s.fetchedAt ? fmtAgo(s.fetchedAt) : (s.error ? 'not configured' : '—')}</span>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--muted2)', lineHeight: 1.5 }}>
            {Object.values(SOURCES).filter(s => s.id !== 'internal').map(s => <span key={s.id} style={{ marginRight: 12 }}><a href={s.url} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--muted)', textDecoration: 'none' }}>{s.name} ↗</a></span>)}
            <br />A red row means that source is unavailable or not configured; the site keeps serving the last good copy and shows N/A where nothing valid exists.
          </div>
        </Panel>
      </section>
    </PageFrame>
  );
}
