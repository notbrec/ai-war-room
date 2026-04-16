import { useState, useEffect, useCallback, useRef } from 'react';
import { MODELS, ORG_CONFIG, LICENSE_CONFIG, RELEASE, AUTO_REFRESH_MS, fetchOpenRouterMeta } from '../models-data.js';
import { useDark, useMobile } from '../hooks/useTheme.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";

const SORTS = [
  { key: 'elo',      label: 'ELO'     },
  { key: 'votes',    label: 'Votes'   },
  { key: 'priceIn',  label: 'Price ↑' },
  { key: 'context',  label: 'Context' },
];

const CONTEXT_ORDER = { '2M': 2000, '1.1M': 1100, '1M': 1000, '400K': 400, '262K': 262, '256K': 256,
  '204K': 204, '202K': 202, '200K': 200, '196K': 196, '163K': 163, '128K': 128 };

// All unique orgs sorted by how many models they have
const ALL_ORGS = Object.entries(
  MODELS.reduce((acc, m) => { acc[m.org] = (acc[m.org] || 0) + 1; return acc; }, {})
).sort((a, b) => b[1] - a[1]).map(([org]) => org);

function eloColor(v) {
  if (v >= 1500) return '#34C759';
  if (v >= 1400) return '#007AFF';
  if (v >= 1300) return '#FF9500';
  return '#FF3B30';
}

function eloTierLabel(v) {
  if (v >= 1500) return 'S';
  if (v >= 1400) return 'A';
  if (v >= 1300) return 'B';
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
    if (sortKey === 'priceIn') {
      const aP = a.priceIn ?? Infinity;
      const bP = b.priceIn ?? Infinity;
      return aP - bP;
    }
    if (sortKey === 'context') {
      const aC = CONTEXT_ORDER[a.context] ?? 0;
      const bC = CONTEXT_ORDER[b.context] ?? 0;
      return bC - aC;
    }
    return 0;
  });
}

// Small toggle pill button
function TogglePill({ active, color, label, icon, onClick }) {
  return (
    <button onClick={onClick} style={{
      height: 30, paddingInline: 12, borderRadius: 980, display: 'flex', alignItems: 'center', gap: 5,
      background: active ? `${color}22` : 'var(--pill)',
      border: active ? `1px solid ${color}55` : '1px solid transparent',
      color: active ? color : 'var(--pill-text)',
      fontSize: 12, fontWeight: active ? 600 : 400,
      cursor: 'pointer', letterSpacing: '-0.01em',
      transition: 'all 0.15s',
      flexShrink: 0,
    }}>
      {icon && <span style={{ fontSize: 11 }}>{icon}</span>}
      {label}
    </button>
  );
}

export default function LeaderboardPage() {
  const dark   = useDark();
  const mobile = useMobile();
  const [models, setModels]             = useState(MODELS);
  const [sort, setSort]                 = useState('elo');
  const [query, setQuery]               = useState('');
  const [filterOpen, setFilterOpen]     = useState(false);
  const [filterThinking, setFilterThinking] = useState(false);
  const [filterOrg, setFilterOrg]       = useState('');
  const [lastUpdated, setLastUpdated]   = useState(new Date());
  const [loading, setLoading]           = useState(false);
  const [, setTick]                     = useState(0);
  const intervalRef                     = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const meta = await fetchOpenRouterMeta();
      const enriched = MODELS.map(m => {
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
      if (q && !m.name.toLowerCase().includes(q) && !m.org.toLowerCase().includes(q) && !m.slug.includes(q)) return false;
      if (filterOpen && !m.isOpen) return false;
      if (filterThinking && !m.isThinking) return false;
      if (filterOrg && m.org !== filterOrg) return false;
      return true;
    }),
    sort
  ).map((m, i) => ({ ...m, displayRank: i + 1 }));

  const totalVotes = models.reduce((s, m) => s + m.votes, 0);

  const clearFilters = () => {
    setFilterOpen(false);
    setFilterThinking(false);
    setFilterOrg('');
    setQuery('');
  };

  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: mobile ? '0 16px 72px' : '0 24px 72px' }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ paddingTop: 36, paddingBottom: 20 }}>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 46px)', fontWeight: 700, letterSpacing: '-0.042em', color: 'var(--text)', margin: '0 0 8px' }}>
            Leaderboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: loading ? '#FF9500' : '#34C759' }} />
              <span style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: '-0.01em' }}>
                {loading ? 'Syncing with OpenRouter…' : timeAgo(lastUpdated)}
              </span>
            </div>
            <span style={{ color: 'var(--sep)', fontSize: 14 }}>·</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{RELEASE}</span>
            <span style={{ color: 'var(--sep)', fontSize: 14 }}>·</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {(totalVotes / 1000).toFixed(0)}K total votes
            </span>
            <button onClick={loadData} disabled={loading} style={{
              height: 24, paddingInline: 10, borderRadius: 980,
              background: 'rgba(0,122,255,0.10)', color: '#007AFF',
              fontSize: 12, fontWeight: 600, border: 'none',
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.4 : 1,
            }}>
              Refresh
            </button>
          </div>
        </div>

        {/* ── Search ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          background: 'var(--search)', borderRadius: 12,
          padding: '9px 14px', marginBottom: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search model or organization…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 15, color: 'var(--text)', letterSpacing: '-0.015em', fontFamily: SF }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="var(--card)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </button>
          )}
        </div>

        {/* ── Sort + Quick filter row ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', alignSelf: 'center', marginRight: 2, letterSpacing: '-0.01em', flexShrink: 0 }}>Sort:</span>
          {SORTS.map(s => (
            <button key={s.key} onClick={() => setSort(s.key)} style={{
              height: 30, paddingInline: 13, borderRadius: 980,
              background: sort === s.key ? 'var(--text)' : 'var(--pill)',
              color: sort === s.key ? 'var(--bg)' : 'var(--pill-text)',
              fontSize: 13, fontWeight: sort === s.key ? 600 : 400,
              border: 'none', cursor: 'pointer', letterSpacing: '-0.01em',
              transition: 'background 0.15s, color 0.15s',
            }}>
              {s.label}
            </button>
          ))}

          {/* divider */}
          <div style={{ width: '0.5px', height: 18, background: 'var(--sep)', marginInline: 4, flexShrink: 0 }} />

          {/* Quick filters */}
          <TogglePill active={filterOpen}     color="#34C759" label="Open"     icon="🔓" onClick={() => setFilterOpen(v => !v)} />
          <TogglePill active={filterThinking} color="#5856D6" label="Thinking" icon="🧠" onClick={() => setFilterThinking(v => !v)} />

          {activeFilters > 0 && (
            <button onClick={clearFilters} style={{
              height: 28, paddingInline: 10, borderRadius: 980,
              background: 'rgba(255,59,48,0.10)', color: '#FF3B30',
              fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
              letterSpacing: '-0.01em', flexShrink: 0,
            }}>
              Clear ×{activeFilters}
            </button>
          )}
        </div>

        {/* ── Org filter strip ───────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12,
        }}>
          <button onClick={() => setFilterOrg('')} style={{
            height: 26, paddingInline: 11, borderRadius: 980, flexShrink: 0,
            background: !filterOrg ? 'var(--text)' : 'var(--pill)',
            color: !filterOrg ? 'var(--bg)' : 'var(--pill-text)',
            fontSize: 12, fontWeight: !filterOrg ? 600 : 400, border: 'none', cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}>
            All labs
          </button>
          {ALL_ORGS.map(org => {
            const cfg = ORG_CONFIG[org] ?? { color: '#8E8E93' };
            const isActive = filterOrg === org;
            return (
              <button key={org} onClick={() => setFilterOrg(isActive ? '' : org)} style={{
                height: 26, paddingInline: 11, borderRadius: 980, flexShrink: 0,
                background: isActive ? `${cfg.color}22` : 'var(--pill)',
                border: isActive ? `1px solid ${cfg.color}55` : '1px solid transparent',
                color: isActive ? cfg.color : 'var(--pill-text)',
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', letterSpacing: '-0.01em',
                transition: 'all 0.15s',
              }}>
                {org}
              </button>
            );
          })}
        </div>

        {/* ── Count ──────────────────────────────────────────────────── */}
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, paddingLeft: 2 }}>
          {(q || activeFilters > 0)
            ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
            : `${filtered.length} models`}
        </p>

        {/* ── List ───────────────────────────────────────────────────── */}
        <div style={{ background: 'var(--card)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '44px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 15 }}>
              No models match — try adjusting the filters
            </div>
          )}

          {filtered.map((model, i) => {
            const org  = ORG_CONFIG[model.org] ?? { color: '#8E8E93', bg: '#F2F2F7', bgDark: '#2C2C2E' };
            const iconBg = dark ? (org.bgDark ?? '#2C2C2E') : org.bg;
            const lic  = LICENSE_CONFIG[model.license] ?? LICENSE_CONFIG['Proprietary'];
            const isTop = model.displayRank <= 3;
            const tierColor = eloColor(model.elo);
            const tier = eloTierLabel(model.elo);

            return (
              <div key={model.slug}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: mobile ? '3px 42px 1fr auto' : '3px 56px 1fr auto',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* ELO tier stripe */}
                  <div style={{ alignSelf: 'stretch', background: tierColor, opacity: 0.55 }} />

                  {/* Icon — rank number */}
                  <div style={{ padding: mobile ? '9px 0 9px 10px' : '11px 0 11px 14px' }}>
                    <div style={{
                      width: mobile ? 32 : 38, height: mobile ? 32 : 38,
                      borderRadius: mobile ? 8 : 10, flexShrink: 0,
                      background: iconBg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: model.displayRank > 9 ? (mobile ? 10 : 12) : (mobile ? 13 : 15),
                      fontWeight: 700, color: org.color, letterSpacing: '-0.02em',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {model.displayRank}
                    </div>
                  </div>

                  {/* Name + meta */}
                  <div style={{ padding: '10px 0 10px 11px', minWidth: 0, overflow: 'hidden' }}>
                    {/* Row 1: rank badge + name + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, minWidth: 0 }}>
                      {isTop && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, borderRadius: 4, flexShrink: 0,
                          padding: '1px 5px', letterSpacing: '0.04em', textTransform: 'uppercase',
                          ...(model.displayRank === 1 ? { color: '#7A5500', background: '#FFD700' }
                            : model.displayRank === 2 ? { color: '#555', background: '#D0D0D0' }
                            : { color: '#fff', background: '#CD7F32' }),
                        }}>#{model.displayRank}</span>
                      )}
                      <span style={{
                        fontSize: mobile ? 13 : 14, fontWeight: 500, color: 'var(--text)',
                        letterSpacing: '-0.018em', overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', flex: 1, minWidth: 0,
                      }}>
                        {model.name}
                      </span>
                      {model.isThinking && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#5856D6', background: 'rgba(88,86,214,0.12)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
                          {mobile ? '🧠' : 'Thinking'}
                        </span>
                      )}
                      {model.isOpen && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#34C759', background: 'rgba(52,199,89,0.12)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
                          {mobile ? '🔓' : 'Open'}
                        </span>
                      )}
                    </div>
                    {/* Row 2: meta info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap', overflow: 'hidden' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '-0.01em', flexShrink: 0 }}>{model.org}</span>
                      <span style={{ fontSize: 11, color: tierColor, fontWeight: 700, flexShrink: 0 }}>{tier}</span>
                      {!isTop && <><span style={{ fontSize: 11, color: 'var(--muted2)', flexShrink: 0 }}>·</span><span style={{ fontSize: 11, color: 'var(--muted2)', flexShrink: 0 }}>#{model.displayRank}</span></>}
                      <span style={{ fontSize: 11, color: 'var(--muted2)', flexShrink: 0 }}>·</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{model.votesLabel}v</span>
                      {!mobile && model.priceIn != null && (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--muted2)', flexShrink: 0 }}>·</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
                            {fmtPrice(model.priceIn)}/{fmtPrice(model.priceOut)}
                          </span>
                        </>
                      )}
                      {!mobile && model.context && (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--muted2)', flexShrink: 0 }}>·</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{model.context}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ELO + CI + chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 3 : 5, flexShrink: 0, padding: mobile ? '9px 10px 9px 6px' : '11px 16px 11px 8px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: tierColor, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
                        {model.elo}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted2)', letterSpacing: '-0.005em', fontVariantNumeric: 'tabular-nums' }}>
                        ±{model.ci}
                      </div>
                    </div>
                    <svg width="6" height="11" viewBox="0 0 6 11" fill="none">
                      <path d="M1 1l4 4.5L1 10" stroke="var(--sep)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {i < filtered.length - 1 && (
                  <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: mobile ? 55 : 71 }}/>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 2 }}>
          <p style={{ fontSize: 12, color: 'var(--muted2)', letterSpacing: '-0.01em' }}>
            ELO scores from arena battles · Pricing synced from OpenRouter
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted2)' }}>{RELEASE}</p>
        </div>
      </div>
    </div>
  );
}
