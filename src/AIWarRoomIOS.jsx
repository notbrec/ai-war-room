import { useState, useEffect, useCallback, useRef } from 'react';
import { MODELS, ORG_CONFIG, DATA_URL, AUTO_REFRESH_MS, RELEASE } from './models-data.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'global',       label: 'Global'   },
  { key: 'reasoning',    label: 'Reasoning'},
  { key: 'coding',       label: 'Coding'   },
  { key: 'agenticCoding',label: 'Agentic'  },
  { key: 'math',         label: 'Math'     },
  { key: 'dataAnalysis', label: 'Data'     },
  { key: 'language',     label: 'Language' },
  { key: 'ifScore',      label: 'IF'       },
];

function scoreColor(v) {
  if (v >= 75) return '#34C759';
  if (v >= 60) return '#007AFF';
  if (v >= 45) return '#FF9500';
  return '#FF3B30';
}

function fmt(v) { return v.toFixed(2); }

function timeAgo(date) {
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AIWar() {
  const [models, setModels]         = useState(MODELS);
  const [category, setCategory]     = useState('global');
  const [query, setQuery]           = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [loading, setLoading]       = useState(false);
  const [tick, setTick]             = useState(0);           // forces timeAgo re-render
  const intervalRef                 = useRef(null);

  // ── Data loader ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!DATA_URL) {
      // No external URL configured — re-use static data (update models-data.js manually)
      setModels([...MODELS]);
      setLastUpdated(new Date());
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(DATA_URL);
      const json = await res.json();
      setModels(json);
      setLastUpdated(new Date());
    } catch (e) {
      console.warn('AI-WAR: fetch failed, keeping cached data.', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-refresh ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, AUTO_REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

  // ── Relative time ticker ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const q = query.trim().toLowerCase();
  const filtered = models
    .filter(m => !q || m.name.toLowerCase().includes(q) || m.org.toLowerCase().includes(q))
    .sort((a, b) => b[category] - a[category])
    .map((m, i) => ({ ...m, filteredRank: i + 1 }));

  // ── Style tokens ──────────────────────────────────────────────────────────
  const BG       = '#F2F2F7';
  const CARD     = '#FFFFFF';
  const SEP      = 'rgba(60,60,67,0.12)';
  const LABEL    = 'rgba(60,60,67,0.6)';
  const SF       = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: SF, WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Frosted glass nav ───────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(242,242,247,0.80)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: `0.5px solid ${SEP}`,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em', color: '#000' }}>AI-WAR</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: LABEL, letterSpacing: '-0.01em' }}>
              {loading ? 'Updating…' : timeAgo(lastUpdated)}
            </span>
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                height: 30, paddingInline: 14, borderRadius: 980,
                background: loading ? 'rgba(0,122,255,0.08)' : 'rgba(0,122,255,0.10)',
                color: '#007AFF', fontSize: 13, fontWeight: 600,
                border: 'none', cursor: loading ? 'default' : 'pointer',
                letterSpacing: '-0.01em', opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? '…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px 60px' }}>

        {/* ── Large title ─────────────────────────────────────────────────── */}
        <div style={{ paddingTop: 40, paddingBottom: 4 }}>
          <h1 style={{
            fontSize: 'clamp(40px, 8vw, 60px)',
            fontWeight: 700,
            letterSpacing: '-0.045em',
            lineHeight: 1.05,
            color: '#000',
            margin: 0,
          }}>
            AI-WAR
          </h1>
          <p style={{ marginTop: 10, fontSize: 17, lineHeight: 1.55, color: LABEL, letterSpacing: '-0.02em', maxWidth: 460 }}>
            {filtered.length} models ranked across 8 categories. Independent, objective, updated regularly.
          </p>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: 4, background: '#34C759' }} />
            <span style={{ fontSize: 12, color: LABEL, letterSpacing: '-0.01em' }}>{RELEASE}</span>
          </div>
        </div>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(116,116,128,0.12)',
            borderRadius: 12, padding: '8px 12px',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
              <circle cx="6" cy="6" r="4.5" stroke="#3C3C43" strokeWidth="1.4" />
              <path d="M9.5 9.5L12 12" stroke="#3C3C43" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search models or organizations…"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 15, color: '#000', letterSpacing: '-0.015em',
                fontFamily: SF,
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: 'rgba(60,60,67,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* ── Category pills ──────────────────────────────────────────────── */}
        <div style={{ marginTop: 20, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              style={{
                height: 30, paddingInline: 13, borderRadius: 980,
                background: category === cat.key ? '#007AFF' : 'rgba(116,116,128,0.12)',
                color: category === cat.key ? '#fff' : 'rgba(60,60,67,0.85)',
                fontSize: 13, fontWeight: category === cat.key ? 600 : 400,
                border: 'none', cursor: 'pointer', letterSpacing: '-0.01em',
                transition: 'background 0.15s',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Count label ─────────────────────────────────────────────────── */}
        <p style={{ marginTop: 20, marginBottom: 8, fontSize: 13, fontWeight: 600, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 16 }}>
          {q ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : `${filtered.length} Models · Sorted by ${CATEGORIES.find(c => c.key === category)?.label}`}
        </p>

        {/* ── Inset grouped leaderboard ────────────────────────────────────── */}
        <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden', boxShadow: `0 1px 0 ${SEP}` }}>
          {filtered.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: LABEL, fontSize: 15 }}>
              No models match "{query}"
            </div>
          )}

          {filtered.map((model, i) => {
            const org   = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7' };
            const score = model[category];
            const isTop = model.filteredRank <= 3;

            return (
              <div key={model.name}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '11px 16px', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Squircle icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: org.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: org.color,
                    letterSpacing: '0.02em', flexShrink: 0,
                  }}>
                    {model.initials}
                  </div>

                  {/* Name + org */}
                  <div style={{ flex: 1, paddingLeft: 12, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 400, color: '#000', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
                        {model.name}
                      </span>
                      {model.isThinking && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#5856D6', background: '#EEEEFE', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
                          Thinking
                        </span>
                      )}
                      {isTop && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 5px',
                          letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0,
                          ...(model.filteredRank === 1 ? { color: '#7A5500', background: '#FFD700' }
                            : model.filteredRank === 2 ? { color: '#555', background: '#D0D0D0' }
                            : { color: '#fff', background: '#CD7F32' }),
                        }}>
                          #{model.filteredRank}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: LABEL, marginTop: 1, letterSpacing: '-0.01em' }}>
                      {model.org}
                      {model.filteredRank > 3 && <span style={{ marginLeft: 5, color: 'rgba(60,60,67,0.3)' }}>#{model.filteredRank}</span>}
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: scoreColor(score), letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(score)}
                    </span>
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                      <path d="M1 1l5 5-5 5" stroke="rgba(60,60,67,0.25)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Inset separator */}
                {i < filtered.length - 1 && (
                  <div style={{ height: '0.5px', background: SEP, marginLeft: 66 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Info panels ─────────────────────────────────────────────────── */}
        <div style={{ marginTop: 44, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {[
            { label: 'Models',        value: `${filtered.length} tracked`,          sub: 'Closed and open-weight across all major labs.'   },
            { label: 'Categories',    value: '8 categories',               sub: 'Reasoning, math, coding, agentic, and more.'    },
            { label: 'Scoring',       value: 'Objective',                  sub: 'Verifiable answers only. No LLM judge.'          },
            { label: 'Release',       value: RELEASE,                      sub: 'Data updated when new evaluations are published.' },
          ].map(item => (
            <div key={item.label} style={{ background: CARD, borderRadius: 14, padding: '16px 18px', boxShadow: `0 1px 0 ${SEP}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#000', letterSpacing: '-0.02em', margin: '4px 0 2px' }}>{item.value}</p>
              <p style={{ fontSize: 13, color: LABEL, letterSpacing: '-0.01em', lineHeight: 1.4, margin: 0 }}>{item.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(60,60,67,0.38)', letterSpacing: '-0.01em' }}>
            AI-WAR · Independent AI Benchmark · {RELEASE}
          </p>
        </div>
      </div>
    </div>
  );
}
