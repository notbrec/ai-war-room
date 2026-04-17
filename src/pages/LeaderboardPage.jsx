import { useState, useEffect, useCallback, useRef } from 'react';
import { MODELS, ORG_CONFIG, LICENSE_CONFIG, RELEASE, AUTO_REFRESH_MS, fetchLeaderboard, fetchOpenRouterMeta } from '../models-data.js';
import { useDark, useMobile } from '../hooks/useTheme.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";

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
    <button onClick={onClick} style={{
      height: 28, paddingInline: 12, borderRadius: 980,
      display: 'flex', alignItems: 'center', gap: 4,
      background: active ? `${color}20` : 'var(--pill)',
      border: `1px solid ${active ? color + '55' : 'transparent'}`,
      color: active ? color : 'var(--pill-text)',
      fontSize: 12, fontWeight: active ? 600 : 400,
      cursor: 'pointer', letterSpacing: '-0.01em',
      transition: 'all 0.15s', flexShrink: 0,
    }}>
      {icon && <span style={{ fontSize: 11 }}>{icon}</span>}
      {label}
    </button>
  );
}

// ── Stat card for header ───────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--card)', borderRadius: 12,
      padding: '12px 16px', flex: 1, minWidth: 0,
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? 'var(--text)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

export default function LeaderboardPage() {
  const dark   = useDark();
  const mobile = useMobile();
  const [models, setModels]               = useState(MODELS);
  const [sort, setSort]                   = useState('elo');
  const [query, setQuery]                 = useState('');
  const [filterOpen, setFilterOpen]       = useState(false);
  const [filterThinking, setFilterThinking] = useState(false);
  const [filterOrg, setFilterOrg]         = useState('');
  const [lastUpdated, setLastUpdated]     = useState(new Date());
  const [loading, setLoading]             = useState(false);
  const [, setTick]                       = useState(0);
  const intervalRef                       = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [liveModels, meta] = await Promise.all([fetchLeaderboard(), fetchOpenRouterMeta()]);
      const enriched = liveModels.map(m => {
        const key = Object.keys(meta).find(k => k.toLowerCase().includes(m.slug.toLowerCase().replace(/-/g, '')));
        if (!key) return m;
        const live = meta[key];
        return { ...m, priceIn: live.priceIn ?? m.priceIn, priceOut: live.priceOut ?? m.priceOut };
      });
      setModels(enriched);
      setLastUpdated(new Date());
    } catch {
      setModels(MODELS);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, AUTO_REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

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
  const COL = { rank: 52, icon: 44, name: 'auto', badges: 120, elo: 88, votes: 72, price: 96, ctx: 64 };

  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: mobile ? '0 14px 80px' : '0 24px 80px' }}>

        {/* ── Title ────────────────────────────────────────────────── */}
        <div style={{ paddingTop: 32, paddingBottom: 20 }}>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', margin: '0 0 6px' }}>
            Leaderboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: loading ? '#FF9500' : '#34C759',
                boxShadow: loading ? 'none' : '0 0 6px #34C759' }} />
              <span style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '-0.01em' }}>
                {loading ? 'Syncing…' : timeAgo(lastUpdated)}
              </span>
            </div>
            <span style={{ color: 'var(--sep)', fontSize: 13 }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Source: AI War Room</span>
            <button onClick={loadData} disabled={loading} style={{
              height: 22, paddingInline: 9, borderRadius: 980,
              background: 'rgba(0,122,255,0.10)', color: '#007AFF',
              fontSize: 11, fontWeight: 600, border: 'none',
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.4 : 1,
            }}>Refresh</button>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: mobile ? 'wrap' : 'nowrap' }}>
          <StatCard label="Models" value={models.length} />
          <StatCard label="Total votes" value={totalVotes >= 1_000_000 ? `${(totalVotes/1_000_000).toFixed(1)}M` : `${(totalVotes/1000).toFixed(0)}K`} />
          <StatCard label="Top ELO" value={topElo} color="#34C759" />
          <StatCard label="Open weight" value={openCount} color="#007AFF" />
        </div>

        {/* ── Search ───────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          background: 'var(--card)', borderRadius: 12,
          padding: '10px 14px', marginBottom: 10,
          boxShadow: 'var(--shadow)',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search model or organization…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 14, color: 'var(--text)', letterSpacing: '-0.015em', fontFamily: SF }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.5 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* ── Filter bar ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 2, letterSpacing: '-0.01em', flexShrink: 0 }}>Sort:</span>
          {SORTS.map(s => (
            <button key={s.key} onClick={() => setSort(s.key)} style={{
              height: 28, paddingInline: 12, borderRadius: 980,
              background: sort === s.key ? 'var(--text)' : 'var(--pill)',
              color: sort === s.key ? 'var(--bg)' : 'var(--pill-text)',
              fontSize: 12, fontWeight: sort === s.key ? 600 : 400,
              border: 'none', cursor: 'pointer', letterSpacing: '-0.01em',
              transition: 'background 0.15s, color 0.15s',
            }}>{s.label}</button>
          ))}
          <div style={{ width: '0.5px', height: 16, background: 'var(--sep)', marginInline: 2, flexShrink: 0 }} />
          <Pill active={filterOpen}     color="#34C759" label="Open"     icon="🔓" onClick={() => setFilterOpen(v => !v)} />
          <Pill active={filterThinking} color="#5856D6" label="Thinking" icon="🧠" onClick={() => setFilterThinking(v => !v)} />
          {activeFilters > 0 && (
            <button onClick={clearFilters} style={{
              height: 26, paddingInline: 9, borderRadius: 980,
              background: 'rgba(255,59,48,0.10)', color: '#FF3B30',
              fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer', flexShrink: 0,
            }}>Clear ×{activeFilters}</button>
          )}
        </div>

        {/* ── Org strip ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
          <button onClick={() => setFilterOrg('')} style={{
            height: 24, paddingInline: 10, borderRadius: 980, flexShrink: 0,
            background: !filterOrg ? 'var(--text)' : 'var(--pill)',
            color: !filterOrg ? 'var(--bg)' : 'var(--pill-text)',
            fontSize: 11, fontWeight: !filterOrg ? 600 : 400, border: 'none', cursor: 'pointer',
          }}>All labs</button>
          {ALL_ORGS.map(org => {
            const cfg = ORG_CONFIG[org] ?? { color: '#8E8E93' };
            const on  = filterOrg === org;
            return (
              <button key={org} onClick={() => setFilterOrg(on ? '' : org)} style={{
                height: 24, paddingInline: 10, borderRadius: 980, flexShrink: 0,
                background: on ? `${cfg.color}20` : 'var(--pill)',
                border: `1px solid ${on ? cfg.color + '55' : 'transparent'}`,
                color: on ? cfg.color : 'var(--pill-text)',
                fontSize: 11, fontWeight: on ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{org}</button>
            );
          })}
        </div>

        {/* ── Count ────────────────────────────────────────────────── */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, paddingLeft: 2 }}>
          {(q || activeFilters > 0) ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : `${filtered.length} models`}
        </p>

        {/* ── Table ────────────────────────────────────────────────── */}
        <div style={{ background: 'var(--card)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>

          {/* Column headers — desktop only */}
          {!mobile && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `4px ${COL.rank}px ${COL.icon}px 1fr ${COL.badges}px ${COL.elo}px ${COL.votes}px ${COL.price}px ${COL.ctx}px`,
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
              <div style={{ padding: '9px 0 9px 8px', fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>Ctx</div>
              <div />
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 15 }}>
              No models match — try adjusting filters
            </div>
          )}

          {filtered.map((model, i) => {
            const org      = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
            const iconBg   = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;
            const tierColor = eloColor(model.elo);
            const isTop    = model.displayRank <= 3;

            if (mobile) {
              // ── Mobile row ──────────────────────────────────────
              return (
                <div key={model.slug}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '4px 40px 1fr auto',
                    alignItems: 'center',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
                    <div style={{ padding: '10px 10px 10px 6px', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: tierColor, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>{model.elo}</div>
                        <div style={{ fontSize: 9, color: 'var(--muted2)' }}>±{model.ci ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                  {i < filtered.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: 54 }} />}
                </div>
              );
            }

            // ── Desktop row ──────────────────────────────────────────
            return (
              <div key={model.slug}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `4px ${COL.rank}px ${COL.icon}px 1fr ${COL.badges}px ${COL.elo}px ${COL.votes}px ${COL.price}px ${COL.ctx}px`,
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
                  <div style={{ padding: '10px 0 10px 8px', textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{model.context ?? '—'}</div>
                  </div>

                  {/* Chevron */}
                </div>
                {i < filtered.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: 68 }} />}
              </div>
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
