import { useState, useEffect, useCallback, useRef } from 'react';
import { MODELS, ORG_CONFIG, LICENSE_CONFIG, RELEASE, AUTO_REFRESH_MS, fetchLeaderboard, fetchOpenRouterMeta, getDescription } from '../models-data.js';
import { useDark, useMobile } from '../hooks/useTheme.js';
import { SF, MONO, EASE, Reveal, RowReveal, AnimatedNumber, Eyebrow, LivePulse, GlobalMotion, ComparisonBar } from '../components/design.jsx';

const SORTS = [
  { key: 'elo',      label: 'ELO'      },
  { key: 'votes',    label: 'Votes'    },
  { key: 'priceIn',  label: 'Price ↑'  },
  { key: 'context',  label: 'Context'  },
];

const CONTEXT_ORDER = { '2M':2000,'1.1M':1100,'1M':1000,'400K':400,'262K':262,
  '256K':256,'204K':204,'202K':202,'200K':200,'196K':196,'163K':163,'131K':131,'128K':128 };

const ALL_ORGS = Object.entries(
  MODELS.reduce((acc, m) => { acc[m.org] = (acc[m.org] || 0) + 1; return acc; }, {})
).sort((a, b) => b[1] - a[1]).map(([org]) => org);

function eloColor(v) {
  if (v >= 1490) return '#34C759';
  if (v >= 1450) return '#007AFF';
  if (v >= 1420) return '#FF9500';
  return '#FF3B30';
}
function eloTier(v) {
  if (v >= 1490) return 'S';
  if (v >= 1450) return 'A';
  if (v >= 1420) return 'B';
  return 'C';
}
function timeAgo(date) {
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
function fmtPrice(v) {
  if (v == null) return '—';
  return v < 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(0)}`;
}
function sortModels(models, sortKey) {
  return [...models].sort((a, b) => {
    if (sortKey === 'elo')     return b.elo - a.elo;
    if (sortKey === 'votes')   return b.votes - a.votes;
    if (sortKey === 'priceIn') return (a.priceIn ?? Infinity) - (b.priceIn ?? Infinity);
    if (sortKey === 'context') return (CONTEXT_ORDER[b.context] ?? 0) - (CONTEXT_ORDER[a.context] ?? 0);
    return 0;
  });
}

function Pill({ active, color, label, icon, onClick }) {
  return (
    <button onClick={onClick}
      className="aiwar-press-btn"
      style={{
        height: 30, paddingInline: 14, borderRadius: 980,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: active ? `${color}18` : 'transparent',
        border: `0.5px solid ${active ? color + '88' : 'var(--sep)'}`,
        color: active ? color : 'var(--text)',
        fontSize: 12, fontWeight: 500,
        cursor: 'pointer', letterSpacing: '-0.01em',
        flexShrink: 0,
        boxShadow: active ? `0 0 0 4px ${color}14` : 'none',
      }}>
      {icon && <span style={{ fontSize: 11 }}>{icon}</span>}
      {label}
    </button>
  );
}

// ── Stat card for header ───────────────────────────────────────────────────
function StatCard({ label, value, color, animate = false, format, suffix }) {
  return (
    <div style={{
      background: 'var(--card)', borderRadius: 14,
      padding: '16px 18px', flex: 1, minWidth: 0,
      border: '0.5px solid var(--sep)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: MONO, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? 'var(--text)', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {animate && typeof value === 'number'
          ? <AnimatedNumber value={value} format={format} suffix={suffix} />
          : value}
      </div>
    </div>
  );
}

export default function LeaderboardPage({ liveModels }) {
  const dark   = useDark();
  const mobile = useMobile();
  const [models, setModels]               = useState(() => liveModels ?? []);
  const [sort, setSort]                   = useState('elo');
  const [query, setQuery]                 = useState('');
  const [filterOpen, setFilterOpen]       = useState(false);
  const [filterThinking, setFilterThinking] = useState(false);
  const [filterOrg, setFilterOrg]         = useState('');
  const [lastUpdated, setLastUpdated]     = useState(new Date());
  const [loading, setLoading]             = useState(false);
  const [, setTick]                       = useState(0);
  const [expandedSlug, setExpandedSlug]   = useState(null);
  const intervalRef                       = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetched, meta] = await Promise.all([fetchLeaderboard(), fetchOpenRouterMeta()]);
      const enriched = fetched.map(m => {
        const key = Object.keys(meta).find(k => k.toLowerCase().includes(m.slug.toLowerCase().replace(/-/g, '')));
        if (!key) return m;
        const live = meta[key];
        return { ...m, priceIn: live.priceIn ?? m.priceIn, priceOut: live.priceOut ?? m.priceOut };
      });
      setModels(enriched);
      setLastUpdated(new Date());
    } catch {
      setModels(prev => prev.length > 0 ? prev : (liveModels ?? MODELS));
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [liveModels]);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, AUTO_REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

  // Sync with liveModels passed from App (fills the table instantly once
  // App.jsx's fetch resolves, even before our own enriched loadData finishes)
  useEffect(() => {
    if (liveModels?.length > 0 && models.length === 0) setModels(liveModels);
  }, [liveModels, models.length]);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const q = query.trim().toLowerCase();
  const activeFilters = (filterOpen ? 1 : 0) + (filterThinking ? 1 : 0) + (filterOrg ? 1 : 0);
  const filtered = sortModels(
    models.filter(m => {
      if (q && !m.name.toLowerCase().includes(q) && !m.org.toLowerCase().includes(q)) return false;
      if (filterOpen && !m.isOpen) return false;
      if (filterThinking && !m.isThinking) return false;
      if (filterOrg && m.org !== filterOrg) return false;
      return true;
    }),
    sort
  ).map((m, i) => ({ ...m, displayRank: i + 1 }));

  const totalVotes  = models.reduce((s, m) => s + m.votes, 0);
  const topElo      = models.length ? Math.max(...models.map(m => m.elo)) : 0;
  const openCount   = models.filter(m => m.isOpen).length;

  const clearFilters = () => { setFilterOpen(false); setFilterThinking(false); setFilterOrg(''); setQuery(''); };

  // ── Column widths for desktop table ──
  const COL = { rank: 52, icon: 44, name: 'auto', badges: 120, elo: 88, votes: 72, price: 96, ctx: 64, chev: 26 };

  return (
    <div className="page-enter" style={{ background: 'transparent', fontFamily: SF, minHeight: '100vh' }}>
      <GlobalMotion />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: mobile ? '40px 16px 96px' : '64px 24px 112px' }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header style={{ marginBottom: mobile ? 28 : 36 }}>
          <div style={{ opacity: 0, animation: `aiwar-fade-up 700ms ${EASE} both` }}>
            <Eyebrow>Leaderboard</Eyebrow>
          </div>
          <h1 style={{
            fontSize: mobile ? 'clamp(34px,8.5vw,46px)' : 'clamp(48px,5.4vw,72px)',
            fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.98,
            color: 'var(--text)', margin: '10px 0 18px',
            opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 80ms both`,
          }}>
            The ranking.
          </h1>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 160ms both`,
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 980, background: 'var(--card)', border: '0.5px solid var(--sep)' }}>
              {loading
                ? <span style={{ width: 6, height: 6, borderRadius: 3, background: '#FF9500' }} />
                : <LivePulse color="#34C759" size={6} />}
              <span style={{ fontSize: 12, color: 'var(--text)', letterSpacing: '-0.005em', fontFamily: MONO, fontWeight: 500 }}>
                {loading ? 'Syncing…' : timeAgo(lastUpdated)}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: MONO }}>arena.ai + OpenRouter</span>
            <button onClick={loadData} disabled={loading}
              className="aiwar-press-btn"
              style={{
                height: 28, paddingInline: 12, borderRadius: 980,
                background: 'transparent', color: 'var(--text)',
                fontSize: 12, fontWeight: 600, border: '0.5px solid var(--sep)',
                cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.4 : 1,
                letterSpacing: '-0.01em',
              }}>Refresh</button>
          </div>
        </header>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <Reveal>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: mobile ? 'wrap' : 'nowrap' }}>
            <StatCard label="Models" value={models.length > 0 ? models.length : '—'} animate format={v => Math.round(v).toString()} />
            <StatCard label="Total votes" value={models.length > 0 ? totalVotes : '—'} animate format={v => {
              const n = Math.round(v);
              if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
              return `${Math.round(n/1000)}K`;
            }} />
            <StatCard label="Top ELO" value={models.length > 0 ? topElo : '—'} animate format={v => Math.round(v).toString()} />
            <StatCard label="Open weight" value={models.length > 0 ? openCount : '—'} animate format={v => Math.round(v).toString()} />
          </div>
        </Reveal>

        {/* ── Search ───────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--card)', borderRadius: 14,
          padding: '12px 16px', marginBottom: 12,
          border: '0.5px solid var(--sep)',
          transition: 'border-color 200ms',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search model or organisation…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 14.5, color: 'var(--text)', letterSpacing: '-0.015em', fontFamily: SF }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="aiwar-press-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.5 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* ── Filter bar ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 10.5, color: 'var(--muted2)', marginRight: 6, letterSpacing: '0.08em',
            flexShrink: 0, fontFamily: MONO, fontWeight: 600, textTransform: 'uppercase',
          }}>Sort</span>
          {SORTS.map(s => (
            <button key={s.key} onClick={() => setSort(s.key)}
              className="aiwar-press-btn"
              style={{
                height: 30, paddingInline: 14, borderRadius: 980,
                background: sort === s.key ? 'var(--text)' : 'transparent',
                color: sort === s.key ? 'var(--bg)' : 'var(--text)',
                fontSize: 12, fontWeight: sort === s.key ? 600 : 500,
                border: `0.5px solid ${sort === s.key ? 'var(--text)' : 'var(--sep)'}`,
                cursor: 'pointer', letterSpacing: '-0.01em',
                boxShadow: sort === s.key ? '0 0 0 4px rgba(255,255,255,0.04)' : 'none',
              }}>{s.label}</button>
          ))}
          <div style={{ width: '0.5px', height: 18, background: 'var(--sep)', marginInline: 6, flexShrink: 0 }} />
          <Pill active={filterOpen}     color="#34C759" label="Open"     icon="🔓" onClick={() => setFilterOpen(v => !v)} />
          <Pill active={filterThinking} color="#5856D6" label="Thinking" icon="🧠" onClick={() => setFilterThinking(v => !v)} />
          {activeFilters > 0 && (
            <button onClick={clearFilters}
              className="aiwar-press-btn"
              style={{
                height: 28, paddingInline: 12, borderRadius: 980,
                background: 'rgba(255,59,48,0.10)', color: '#FF3B30',
                fontSize: 11.5, fontWeight: 600, border: '0.5px solid rgba(255,59,48,0.30)',
                cursor: 'pointer', flexShrink: 0, letterSpacing: '-0.005em',
              }}>Clear ×{activeFilters}</button>
          )}
        </div>

        {/* ── Org strip ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
          <span style={{
            fontSize: 10.5, color: 'var(--muted2)', marginRight: 6, letterSpacing: '0.08em',
            flexShrink: 0, fontFamily: MONO, fontWeight: 600, textTransform: 'uppercase',
          }}>Lab</span>
          <button onClick={() => setFilterOrg('')}
            className="aiwar-press-btn"
            style={{
              height: 26, paddingInline: 11, borderRadius: 980, flexShrink: 0,
              background: !filterOrg ? 'var(--text)' : 'transparent',
              color: !filterOrg ? 'var(--bg)' : 'var(--text)',
              fontSize: 11.5, fontWeight: !filterOrg ? 600 : 500,
              border: `0.5px solid ${!filterOrg ? 'var(--text)' : 'var(--sep)'}`, cursor: 'pointer',
              letterSpacing: '-0.005em',
            }}>All</button>
          {ALL_ORGS.map(org => {
            const cfg = ORG_CONFIG[org] ?? { color: '#8E8E93' };
            const on  = filterOrg === org;
            return (
              <button key={org} onClick={() => setFilterOrg(on ? '' : org)}
                className="aiwar-press-btn"
                style={{
                  height: 26, paddingInline: 11, borderRadius: 980, flexShrink: 0,
                  background: on ? `${cfg.color}18` : 'transparent',
                  border: `0.5px solid ${on ? cfg.color + '88' : 'var(--sep)'}`,
                  color: on ? cfg.color : 'var(--text)',
                  fontSize: 11.5, fontWeight: on ? 600 : 500,
                  cursor: 'pointer', letterSpacing: '-0.005em',
                  boxShadow: on ? `0 0 0 4px ${cfg.color}14` : 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                <span style={{ width: 5, height: 5, borderRadius: 3, background: cfg.color }} />
                {org}
              </button>
            );
          })}
        </div>

        {/* ── Featured top models with descriptions (visible without clicks) ── */}
        {models.length > 0 && !q && activeFilters === 0 && sort === 'elo' && (
          <section style={{ marginBottom: 22 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, paddingLeft: 2 }}>
              Featured — top 5 by ELO
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.slice(0, 5).map((m, fi) => {
                const org      = ORG_CONFIG[m.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
                const iconBg   = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;
                const tColor   = eloColor(m.elo);
                const desc     = getDescription(m.name);
                return (
                  <Reveal key={m.slug} delay={fi * 90} y={26}>
                  <article style={{
                    background: 'var(--card)', borderRadius: 14,
                    padding: mobile ? '14px 14px 14px' : '16px 20px',
                    boxShadow: 'var(--shadow)',
                    borderLeft: `3px solid ${tColor}`,
                    display: 'grid',
                    gridTemplateColumns: mobile ? '1fr' : '40px 1fr auto',
                    gap: mobile ? 10 : 16,
                    alignItems: 'start',
                  }}>
                    {/* Icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: iconBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: org.color, flexShrink: 0,
                    }}>{m.initials}</div>

                    {/* Title + description */}
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 4px', lineHeight: 1.3 }}>
                        #{m.displayRank} · {m.name}
                      </h3>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                        {m.org} · ELO <span style={{ color: tColor, fontWeight: 700 }}>{m.elo}</span> · {m.votesLabel} votes
                      </div>
                      <p style={{
                        fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)', opacity: 0.78,
                        letterSpacing: '-0.005em', margin: 0,
                      }}>
                        {desc ?? `${m.name} from ${m.org}. ELO ${m.elo} from ${m.votesLabel} arena battles. Tier ${eloTier(m.elo)}.`}
                      </p>
                    </div>

                    {/* ELO badge (desktop only) */}
                    {!mobile && (
                      <div style={{
                        textAlign: 'right', minWidth: 72,
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: tColor, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                          {m.elo}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 3, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Tier {eloTier(m.elo)}
                        </div>
                      </div>
                    )}
                  </article>
                  </Reveal>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Count ────────────────────────────────────────────────── */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, paddingLeft: 2 }}>
          {models.length === 0
            ? 'Loading…'
            : (q || activeFilters > 0)
              ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
              : `${filtered.length} models`}
        </p>

        {/* ── Table ────────────────────────────────────────────────── */}
        <div style={{ background: 'var(--card)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>

          {/* Column headers — desktop only */}
          {!mobile && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `4px ${COL.rank}px ${COL.icon}px 1fr ${COL.badges}px ${COL.elo}px ${COL.votes}px ${COL.price}px ${COL.ctx}px ${COL.chev}px`,
              alignItems: 'center',
              borderBottom: '1px solid var(--sep)',
              padding: '0',
            }}>
              <div />
              <div style={{ padding: '9px 0 9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>#</div>
              <div />
              <div style={{ padding: '9px 0 9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Model</div>
              <div style={{ padding: '9px 8px', fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tags</div>
              <div style={{ padding: '9px 0', fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>ELO</div>
              <div style={{ padding: '9px 0 9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>Votes</div>
              <div style={{ padding: '9px 0 9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>Price/M</div>
              <div style={{ padding: '9px 14px 9px 8px', fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>Ctx</div>
              <div />
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 15 }}>
              {models.length === 0 ? 'Loading models…' : 'No models match — try adjusting filters'}
            </div>
          )}

          {filtered.map((model, i) => {
            const org      = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
            const iconBg   = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;
            const tierColor = eloColor(model.elo);
            const isTop    = model.displayRank <= 3;
            const expanded = expandedSlug === model.slug;
            const toggleExpand = () => setExpandedSlug(expanded ? null : model.slug);
            const description  = getDescription(model.name);

            if (mobile) {
              // ── Mobile row — cascades in as it scrolls into view ──
              return (
                <RowReveal key={model.slug} index={i}>
                  <div onClick={toggleExpand} style={{
                    display: 'grid', gridTemplateColumns: '4px 40px 1fr auto',
                    alignItems: 'center', cursor: 'pointer',
                    background: expanded ? 'var(--hover)' : 'transparent',
                  }}
                    onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'var(--hover)'; }}
                    onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ alignSelf: 'stretch', background: tierColor, opacity: 0.5 }} />
                    <div style={{ padding: '10px 0 10px 10px' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: model.displayRank > 9 ? 10 : 13, fontWeight: 700, color: org.color,
                        fontVariantNumeric: 'tabular-nums',
                      }}>{model.displayRank}</div>
                    </div>
                    <div style={{ padding: '10px 0 10px 10px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        {isTop && <span style={{
                          fontSize: 9, fontWeight: 700, borderRadius: 3, padding: '1px 4px',
                          ...(model.displayRank===1?{color:'#7A5500',background:'#FFD700'}
                            :model.displayRank===2?{color:'#555',background:'#D0D0D0'}
                            :{color:'#fff',background:'#CD7F32'})
                        }}>#{model.displayRank}</span>}
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.018em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                          {model.name}
                        </span>
                        {model.isThinking && <span style={{ fontSize: 9, color: '#5856D6', background: 'rgba(88,86,214,0.12)', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>🧠</span>}
                        {model.isOpen    && <span style={{ fontSize: 9, color: '#34C759', background: 'rgba(52,199,89,0.12)',    borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>🔓</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{model.org}</span>
                        <span style={{ fontSize: 10, color: tierColor, fontWeight: 700, flexShrink: 0 }}>{eloTier(model.elo)}</span>
                        <span style={{ fontSize: 10, color: 'var(--muted2)', flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{model.votesLabel}v</span>
                      </div>
                    </div>
                    <div style={{ padding: '10px 10px 10px 6px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: tierColor, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>{model.elo}</div>
                        <div style={{ fontSize: 9, color: 'var(--muted2)' }}>±{model.ci ?? '—'}</div>
                      </div>
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}>
                        <path d="M1 1l4 4 4-4" stroke="var(--muted2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  {expanded && (
                    <div style={{
                      padding: '14px 16px 18px 54px',
                      background: 'var(--card2)',
                      borderTop: '0.5px solid var(--sep)',
                      transformOrigin: 'top center',
                      animation: `aiwar-pop-in 460ms ${EASE} both`,
                    }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>About</div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', letterSpacing: '-0.01em', margin: '0 0 10px' }}>
                        {description ?? `${model.name} — ${model.org} model. ELO ${model.elo} from ${model.votesLabel} arena battles. No description available yet.`}
                      </p>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: tierColor, background: `${tierColor}18`, borderRadius: 6, padding: '3px 7px', letterSpacing: '-0.01em' }}>Tier {eloTier(model.elo)}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--pill-text)', background: 'var(--pill)', borderRadius: 6, padding: '3px 7px', letterSpacing: '-0.01em' }}>{model.context ?? '—'} ctx</span>
                        {model.priceIn != null && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--pill-text)', background: 'var(--pill)', borderRadius: 6, padding: '3px 7px', letterSpacing: '-0.01em' }}>{fmtPrice(model.priceIn)}/M in</span>}
                      </div>
                    </div>
                  )}
                  {i < filtered.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: 54 }} />}
                </RowReveal>
              );
            }

            // ── Desktop row — cascades in as it scrolls into view ────
            return (
              <RowReveal key={model.slug} index={i}>
                <div onClick={toggleExpand} style={{
                  display: 'grid',
                  gridTemplateColumns: `4px ${COL.rank}px ${COL.icon}px 1fr ${COL.badges}px ${COL.elo}px ${COL.votes}px ${COL.price}px ${COL.ctx}px ${COL.chev}px`,
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 250ms ease',
                  background: expanded ? 'var(--hover)' : 'transparent',
                }}
                  onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Tier stripe */}
                  <div style={{ alignSelf: 'stretch', background: tierColor, opacity: 0.5 }} />

                  {/* Rank */}
                  <div style={{ padding: '12px 0 12px 12px' }}>
                    {isTop ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 5px',
                        ...(model.displayRank===1?{color:'#7A5500',background:'#FFD700'}
                          :model.displayRank===2?{color:'#555',background:'#D0D0D0'}
                          :{color:'#fff',background:'#CD7F32'})
                      }}>#{model.displayRank}</span>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{model.displayRank}</span>
                    )}
                  </div>

                  {/* Icon squircle */}
                  <div style={{ padding: '10px 0' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 9, background: iconBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: org.color, letterSpacing: '-0.01em',
                    }}>
                      {model.initials}
                    </div>
                  </div>

                  {/* Name + org */}
                  <div style={{ padding: '10px 0 10px 12px', minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 500, color: 'var(--text)',
                      letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: 2,
                    }}>{model.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '-0.01em' }}>{model.org}</span>
                      <span style={{ fontSize: 10, color: tierColor, fontWeight: 700 }}>{eloTier(model.elo)}</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ padding: '10px 8px', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    {model.isThinking && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#5856D6', background: 'rgba(88,86,214,0.12)', borderRadius: 4, padding: '2px 5px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Thinking
                      </span>
                    )}
                    {model.isOpen && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#34C759', background: 'rgba(52,199,89,0.12)', borderRadius: 4, padding: '2px 5px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Open
                      </span>
                    )}
                  </div>

                  {/* ELO */}
                  <div style={{ padding: '10px 0', textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: tierColor, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{model.elo}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted2)', fontVariantNumeric: 'tabular-nums' }}>±{model.ci ?? '—'}</div>
                  </div>

                  {/* Votes */}
                  <div style={{ padding: '10px 0 10px 12px', textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{model.votesLabel}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted2)' }}>votes</div>
                  </div>

                  {/* Price */}
                  <div style={{ padding: '10px 0 10px 12px', textAlign: 'right' }}>
                    {model.priceIn != null ? (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(model.priceIn)}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted2)', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(model.priceOut)} out</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--muted2)' }}>—</div>
                    )}
                  </div>

                  {/* Context */}
                  <div style={{ padding: '10px 8px 10px 8px', textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{model.context ?? '—'}</div>
                  </div>

                  {/* Chevron */}
                  <div style={{ padding: '10px 10px 10px 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s', opacity: 0.5 }}>
                      <path d="M1 1l4 4 4-4" stroke="var(--muted2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                {expanded && (
                  <div style={{
                    padding: '20px 28px 24px 72px',
                    background: 'var(--card2)',
                    borderTop: '0.5px solid var(--sep)',
                    transformOrigin: 'top center',
                    animation: `aiwar-pop-in 460ms ${EASE} both`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10, fontFamily: MONO }}>About</div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text)', letterSpacing: '-0.01em', margin: '0 0 18px', maxWidth: 820, opacity: 0.88 }}>
                      {description ?? `${model.name} — ${model.org} model. ELO ${model.elo} from ${model.votesLabel} arena battles. No description available yet.`}
                    </p>

                    {/* Comparison bars */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: model.priceIn != null ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                      gap: 18, maxWidth: 720, marginBottom: 16,
                    }}>
                      <ComparisonBar
                        label="ELO"
                        valueText={String(model.elo)}
                        width={Math.max(0.05, (model.elo - 1280) / Math.max(1, topElo - 1280))}
                        color={tierColor}
                      />
                      {model.priceIn != null && (
                        <ComparisonBar
                          label="Price/M in"
                          valueText={fmtPrice(model.priceIn)}
                          width={Math.max(0.05, Math.min(1, model.priceIn / 25))}
                          color="var(--text)"
                        />
                      )}
                      <ComparisonBar
                        label="Context"
                        valueText={model.context ?? '—'}
                        width={(() => {
                          const ctxMap = { '2M':1, '1.1M':0.55, '1M':0.5, '400K':0.20, '262K':0.13, '256K':0.13, '204K':0.10, '200K':0.10, '163K':0.08, '131K':0.07, '128K':0.06 };
                          return ctxMap[model.context] ?? 0.05;
                        })()}
                        color="var(--text)"
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: tierColor, background: `${tierColor}18`, borderRadius: 6, padding: '3px 8px', letterSpacing: '-0.005em', fontFamily: MONO }}>Tier {eloTier(model.elo)}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', background: 'transparent', border: '0.5px solid var(--sep)', borderRadius: 6, padding: '3px 8px', letterSpacing: '-0.005em', fontFamily: MONO }}>{model.votesLabel} votes</span>
                      {model.isThinking && <span style={{ fontSize: 10, fontWeight: 600, color: '#5856D6', background: 'rgba(88,86,214,0.12)', borderRadius: 6, padding: '3px 8px', letterSpacing: '-0.005em', fontFamily: MONO }}>Thinking</span>}
                      {model.isOpen && <span style={{ fontSize: 10, fontWeight: 600, color: '#34C759', background: 'rgba(52,199,89,0.12)', borderRadius: 6, padding: '3px 8px', letterSpacing: '-0.005em', fontFamily: MONO }}>Open weight</span>}
                    </div>
                  </div>
                )}
                {i < filtered.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: 68 }} />}
              </RowReveal>
            );
          })}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 2, flexWrap: 'wrap', gap: 4 }}>
          <p style={{ fontSize: 11, color: 'var(--muted2)', letterSpacing: '-0.01em' }}>
            ELO from arena.ai human battles · Pricing from OpenRouter
          </p>
          <p style={{ fontSize: 11, color: 'var(--muted2)' }}>{RELEASE}</p>
        </div>
      </div>
    </div>
  );
}
