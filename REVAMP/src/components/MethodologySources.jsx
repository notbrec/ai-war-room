// ─── Methodology · sources and metric definitions ───────────────────────────
// Rendered from the shared metric registry so the methodology page can never
// drift from what the tables actually show.

import { useDomain } from '../data/useDomain.js';
import { MONO, Reveal, Eyebrow } from './design.jsx';
import { SOURCES, METRICS, fmtAgo } from '../../shared/metrics.js';
import { Label, GREEN, GOLD, RED } from './ui.jsx';

const SOURCE_DETAIL = {
  arena:      { how: 'Fetched from the public leaderboard pages every 6 hours (text, vision, search, text-to-image, image-edit, text-to-video, image-to-video). Rows are validated before they replace the cache; if a fetch fails the last good copy is served and marked "cached".', gives: 'ELO, confidence interval, votes, organisation, licence, listed prices, context length.' },
  openrouter: { how: 'Public model and endpoint catalogue, refreshed every 3–6 hours. Prices are the cheapest listed endpoint; per-provider rows show every endpoint.', gives: 'Input / output / cached pricing, context, max output, modalities, reasoning and tool support, release date, per-provider uptime and quantisation, relayed Artificial Analysis indexes and Design Arena ELOs.' },
  aa:         { how: 'Official Data API when an API key is configured server-side (ARTIFICIAL_ANALYSIS_API_KEY); otherwise the figures Artificial Analysis publishes on its leaderboard pages, read the same way arena.ai is. Every number is shown with attribution, and the affected columns show N/A.', gives: 'Intelligence / Coding / Agentic / Math indexes, individual benchmark scores, output speed, time to first token, end-to-end time, media generation times, TTS / STT / speech-to-speech evaluations.' },
  swebench:   { how: 'The machine-readable leaderboard data the SWE-bench team publishes, refreshed every 12 hours.', gives: 'Agent, model, resolved rate, cost and API calls per task, submission date, whether logs were verified.' },
  openasr:    { how: 'Public results CSV of the Hugging Face Open ASR Leaderboard, refreshed daily.', gives: 'Average and per-dataset word error rate, RTFx throughput, licence, parameter count, languages.' },
  designarena:{ how: 'Relayed through OpenRouter\'s public catalogue.', gives: 'Per-category human-preference ELO and win rate for UI, app and design generation.' },
  internal:   { how: 'Computed by AI WAR ROOM from the sources above: blended price, per-1K / per-minute prices, Pareto frontiers, best-value zones, Mission Planner scores, and daily history snapshots (stored every 6 hours, thinned to weekly after 60 days).', gives: 'Derived values only — no estimates stand in for missing measurements.' },
};

export default function MethodologySources({ mobile }) {
  const status = useDomain('status');
  const src = status.data?.sources ?? {};
  const groups = new Map();
  for (const [key, m] of Object.entries(METRICS)) { if (!groups.has(m.source)) groups.set(m.source, []); groups.get(m.source).push({ key, ...m }); }

  return (
    <>
      <section style={{ marginBottom: mobile ? 56 : 80 }}>
        <Reveal>
          <div style={{ marginBottom: 24 }}>
            <Eyebrow>Data sources</Eyebrow>
            <h2 style={{ fontSize: mobile ? 26 : 34, fontWeight: 700, letterSpacing: '-0.038em', color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>Where every number comes from.</h2>
            <p style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.6, margin: '12px 0 0', maxWidth: 720 }}>
              AI WAR ROOM aggregates public, permitted sources and attributes each one. Feature parity with commercial analytics sites is the goal; taking their data is not. When a source is down or not configured, the affected cells read N/A — never zero, never an estimate.
            </p>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gap: 10 }}>
          {Object.values(SOURCES).map((s, i) => {
            const st = src[s.id]?.status;
            const color = st === 'cached' || st === 'live' ? GREEN : st === 'cold' ? GOLD : st === 'unavailable' ? RED : 'var(--muted2)';
            const d = SOURCE_DETAIL[s.id];
            return (
              <Reveal key={s.id} delay={i * 40}>
                <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', padding: mobile ? '14px 16px' : '18px 22px', display: 'grid', gridTemplateColumns: mobile ? '1fr' : '200px 1fr', gap: mobile ? 8 : 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.id !== 'internal' && <span data-round="1" style={{ width: 6, height: 6, background: color, flexShrink: 0 }} />}
                      <a href={s.url} target="_blank" rel="noreferrer noopener" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', textDecoration: 'none', letterSpacing: '-0.02em' }}>{s.name} ↗</a>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 4 }}>
                      {s.id === 'internal' ? 'derived' : st === 'unavailable' ? (src[s.id]?.error ?? 'not configured') : src[s.id]?.fetchedAt ? `refreshed ${fmtAgo(src[s.id].fetchedAt)}` : st === 'cold' ? 'not fetched yet' : '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>
                    <div>{s.note}</div>
                    {d && <div style={{ marginTop: 6 }}><span style={{ color: 'var(--text)', fontWeight: 600 }}>How: </span>{d.how}</div>}
                    {d && <div style={{ marginTop: 4 }}><span style={{ color: 'var(--text)', fontWeight: 600 }}>Gives: </span>{d.gives}</div>}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: mobile ? 56 : 80 }}>
        <Reveal>
          <div style={{ marginBottom: 24 }}>
            <Eyebrow>Metric definitions</Eyebrow>
            <h2 style={{ fontSize: mobile ? 26 : 34, fontWeight: 700, letterSpacing: '-0.038em', color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>What each column means.</h2>
          </div>
        </Reveal>
        <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)' }}>
          {[...groups.entries()].map(([sid, list]) => (
            <div key={sid}>
              <div style={{ padding: '10px 18px 6px', borderBottom: '0.5px solid var(--sep)' }}><Label>{SOURCES[sid]?.name ?? sid}</Label></div>
              {list.map(m => (
                <div key={m.key} style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '220px 1fr 130px', gap: mobile ? 4 : 16, padding: mobile ? '10px 16px' : '10px 18px', borderBottom: '0.5px solid var(--sep2)', alignItems: 'baseline' }}>
                  <div><span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em' }}>{m.label}</span>{m.unit && <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted2)', marginLeft: 8 }}>{m.unit}</span>}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{m.description}{m.method ? <span style={{ color: 'var(--muted2)' }}> — {m.method}</span> : null}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: m.higherIsBetter === null ? 'var(--muted2)' : m.higherIsBetter ? GREEN : GOLD, textAlign: mobile ? 'left' : 'right' }}>{m.higherIsBetter === null ? 'INFORMATIONAL' : m.higherIsBetter ? '▲ HIGHER IS BETTER' : '▼ LOWER IS BETTER'}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: mobile ? 56 : 80 }}>
        <Reveal>
          <div style={{ marginBottom: 16 }}>
            <Eyebrow>Identity & history</Eyebrow>
            <h2 style={{ fontSize: mobile ? 26 : 34, fontWeight: 700, letterSpacing: '-0.038em', color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>One model, many spellings.</h2>
          </div>
          <div style={{ background: 'var(--card)', border: '0.5px solid var(--sep)', padding: mobile ? '16px' : '20px 24px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>
            <p style={{ margin: '0 0 10px' }}>Every source spells models differently ("claude-opus-4-5-20251101-high-32k", "anthropic/claude-opus-4.5", "Claude 4.5 Opus"). We reduce each name to a canonical id of the form <code style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text)' }}>lab:family[:variant]</code>: date stamps are removed, and reasoning-effort or thinking markers are kept as the <em>variant</em>. Two rows with the same family but different variants are related but never merged — a "high" run and a "medium" run of the same weights stay separate rows, sharing a family link on their profile pages.</p>
            <p style={{ margin: '0 0 10px' }}>A model is not the same as the endpoint serving it. Provider War keeps a separate record per host (<code style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text)' }}>provider/lab:family</code>) because the same open weights can differ in price, context and quantisation across providers.</p>
            <p style={{ margin: 0 }}>History: a compact snapshot of rank, ELO, price and index per model is stored every 6 hours when the numbers change; the last 60 days are kept daily, then weekly for a year, then monthly. Rank deltas on the board compare against the newest snapshot that is at least 1, 7 or 30 days old.</p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
