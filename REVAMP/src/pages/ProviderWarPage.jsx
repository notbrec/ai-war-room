// ─── PROVIDER WAR — the same model, many hosts ──────────────────────────────
// Models and API providers are different entities. OpenRouter's public
// endpoint catalogue gives price, context, quantisation and uptime per host;
// throughput / latency / accuracy need a measurement source and are only
// shown when one supplies them.
//
// The page is an index and a detail: every tracked model on the left (with
// how many hosts serve it, the cheapest listing and how far the priciest is
// from it), the chosen model's hosts on the right. Below, the market as a
// whole: where the choice of host changes the bill most, and who hosts most.

import { useMemo, useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useMobile } from '../hooks/useTheme.js';
import { MONO, SF, GlobalMotion, Skeleton, SectionTitle } from '../components/design.jsx';
import { BarPanel, HighlightGrid } from '../components/Highlights.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { useProviders } from '../data/useDomain.js';
import DataTable, { useColumnSelection, ColumnPicker } from '../components/table/DataTable.jsx';
import PriceStrip, { LOW_PRECISION } from '../components/charts/PriceStrip.jsx';
import { AddToBattle } from '../domains/comparison/BattleControls.jsx';
import { PageFrame, PageTitle, DataStatus, Panel, Label, Segmented, StatTile, EmptyState, BadgeTag, Btn, GREEN, GOLD, BLUE, PURPLE, RED } from '../components/ui.jsx';
import { fmtMetric, isNum, NA } from '../../shared/metrics.js';

const ScatterChart = lazy(() => import('../components/charts/ScatterChart.jsx'));

const fmtX = r => `${r >= 10 ? Math.round(r) : r.toFixed(1)}×`;
const spreadColor = r => (!isNum(r) ? 'var(--muted2)' : r >= 5 ? RED : r >= 1.5 ? GOLD : 'var(--muted)');
const uptimeColor = u => (!isNum(u) ? 'var(--muted2)' : u >= 99.5 ? GREEN : u >= 97 ? GOLD : RED);
const price = v => fmtMetric('priceBlended', v);

/* ── the index: every tracked model ──────────────────────────────────────── */
function ModelIndex({ index, modelId, onPick, mobile }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('top');
  const listRef = useRef(null);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = index.filter(m => !s || `${m.name} ${m.org ?? ''}`.toLowerCase().includes(s));
    if (sort === 'hosts') return [...list].sort((a, b) => b.count - a.count);
    if (sort === 'spread') return [...list].sort((a, b) => (b.spread ?? 0) - (a.spread ?? 0));
    return list;
  }, [index, q, sort]);
  // keep the chosen model in view when it changes from outside the list
  useEffect(() => {
    const list = listRef.current; if (!list) return;
    const el = list.querySelector('[data-on="1"]'); if (!el) return;
    const top = el.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = Math.max(0, top - list.clientHeight / 2 + el.offsetHeight / 2);
  }, [modelId, sort]);
  return (
    <div className="aiwar-surface" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div style={{ padding: '12px 12px 10px', borderBottom: '0.5px solid var(--sep)', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <Label color="var(--text)">Models</Label>
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)' }}>{rows.length} of {index.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, paddingInline: 10, background: 'var(--bg)', border: '0.5px solid var(--sep)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ color: 'var(--muted2)', flexShrink: 0 }}><circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.3" data-round="1" /><path d="M7.8 7.8 L11 11" stroke="currentColor" strokeWidth="1.3" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a model…" aria-label="Find a model" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: SF, letterSpacing: '-0.01em' }} />
          {q && <button onClick={() => setQ('')} aria-label="Clear" style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>}
        </div>
        <Segmented small value={sort} onChange={setSort} options={[{ value: 'top', label: 'Smartest' }, { value: 'hosts', label: 'Most hosts' }, { value: 'spread', label: 'Widest gap' }]} />
      </div>
      <div ref={listRef} style={{ overflowY: 'auto', flex: 1, minHeight: 0, maxHeight: mobile ? 320 : undefined, overscrollBehavior: 'contain' }}>
        {rows.length === 0 && <div style={{ padding: 16, fontSize: 12.5, color: 'var(--muted)' }}>No tracked model matches “{q}”.</div>}
        {rows.map(m => {
          const on = m.id === modelId;
          return (
            <button key={m.id} data-on={on ? '1' : '0'} onClick={() => onPick(m.id)} className="aiwar-ov-row" style={{
              display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) auto', columnGap: 10, alignItems: 'center', width: '100%', padding: '9px 12px 9px 10px',
              background: on ? 'var(--hover)' : 'transparent', border: 'none', borderLeft: `2px solid ${on ? 'var(--accent)' : 'transparent'}`, borderBottom: '0.5px solid var(--sep2)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            }}>
              <LabLogo org={m.org} size={14} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.count} host{m.count === 1 ? '' : 's'}{m.org ? ` · ${m.org}` : ''}</span>
              </span>
              <span style={{ textAlign: 'right', fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{isNum(m.lo) ? price(m.lo) : NA}</span>
                <span style={{ display: 'block', fontSize: 10.5, marginTop: 1, color: spreadColor(m.spread) }}>{isNum(m.spread) && m.spread >= 1.05 ? `up to ${fmtX(m.spread)}` : m.count > 1 && isNum(m.lo) ? 'one price' : ' '}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── market panels ───────────────────────────────────────────────────────── */
function SpreadBoard({ index, onPick, mobile }) {
  const top = useMemo(() => index.filter(m => isNum(m.spread) && m.spread >= 1.05).sort((a, b) => b.spread - a.spread).slice(0, 8), [index]);
  if (!top.length) return null;
  const maxLog = Math.log(top[0].spread);
  return (
    <Panel pad={mobile ? 14 : 18} title="Widest gap between the cheapest and the priciest host">
      <div style={{ marginTop: -4 }}>
        {top.map((m, i) => (
          <button key={m.id} onClick={() => onPick(m.id)} className="aiwar-ov-row" style={{ display: 'block', width: '100%', padding: '10px 10px 11px', margin: '0 -10px', boxSizing: 'content-box', background: 'transparent', border: 'none', borderBottom: i === top.length - 1 ? 'none' : '0.5px solid var(--sep2)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) auto', alignItems: 'baseline', columnGap: 9 }}>
              <span style={{ alignSelf: 'center' }}><LabLogo org={m.org} size={14} /></span>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{m.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>{m.count} hosts{m.low ? ` · ${m.low} at 4-bit` : ''}</span>
              </span>
              <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: spreadColor(m.spread), fontVariantNumeric: 'tabular-nums' }}>{fmtX(m.spread)}</span>
            </span>
            <span style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', columnGap: 9, marginTop: 7, paddingLeft: 25, fontFamily: MONO, fontSize: 10.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: GOLD, fontWeight: 700 }}>{price(m.lo)}</span>
              <span style={{ position: 'relative', height: 4, background: 'var(--sep2)' }}>
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(4, (Math.log(m.spread) / maxLog) * 100)}%`, background: spreadColor(m.spread), opacity: 0.85 }} />
              </span>
              <span>{price(m.hi)}</span>
            </span>
          </button>
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, lineHeight: 1.5 }}>Blended list price per 1M tokens · bar length on a log scale · a wide gap often means some hosts run a quantised copy</p>
    </Panel>
  );
}

function HostBoard({ providers, mobile, all, onToggleAll }) {
  const top = providers.slice(0, mobile ? 8 : 12);
  const max = Math.max(1, ...top.map(p => p.models));
  return (
    <Panel pad={mobile ? 14 : 18} title="Who hosts the most of the top models" action={<Btn small onClick={onToggleAll}>{all ? 'Hide the list' : `All ${providers.length} →`}</Btn>}>
      <div style={{ marginTop: -4 }}>
        {top.map((p, i) => (
          <div key={p.provider} style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr) 70px 54px' : 'minmax(0, 150px) minmax(0, 1fr) 38px 58px', alignItems: 'center', columnGap: 12, padding: '10px 0 11px', borderBottom: i === top.length - 1 ? 'none' : '0.5px solid var(--sep2)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.provider}</span>
            {!mobile && <span style={{ position: 'relative', height: 6, background: 'var(--sep2)' }}><span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(p.models / max) * 100}%`, background: BLUE, opacity: 0.85 }} /></span>}
            <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.models}{mobile && <span style={{ fontWeight: 400, fontSize: 10.5, color: 'var(--muted)' }}> models</span>}</span>
            <span title="Average 30-minute uptime across its endpoints" style={{ fontFamily: MONO, fontSize: 11.5, color: uptimeColor(p.avgUptime), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{isNum(p.avgUptime) ? fmtMetric('uptime', p.avgUptime) : NA}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, lineHeight: 1.5 }}>Models hosted out of the tracked set · right: average uptime over the last 30 minutes</p>
    </Panel>
  );
}

export default function ProviderWarPage({ onNavigate, slug }) {
  const mobile = useMobile();
  const prov = useProviders();
  const [modelId, setModelId] = useState(slug ?? null);
  const [view, setView] = useState('hosts');
  const [sort, setSort] = useState({ key: 'priceBlended', dir: 'asc' });
  const [dirSort, setDirSort] = useState({ key: 'models', dir: 'desc' });
  const [allProviders, setAllProviders] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);   // phone: the model list is folded
  const [focusTag, setFocusTag] = useState(null);
  const detailRef = useRef(null);

  const models = prov.models;
  const caps = prov.capabilities ?? {};
  useEffect(() => { if (!modelId && models.length) setModelId(models[0].modelId); }, [models, modelId]);
  useEffect(() => { if (slug) setModelId(slug); }, [slug]);
  useEffect(() => { setFocusTag(null); }, [modelId]);

  const index = useMemo(() => models.map(m => {
    const meta = prov.modelMeta[m.modelId] ?? {};
    const prices = m.endpoints.map(e => e.priceBlended).filter(v => isNum(v) && v > 0);
    const lo = prices.length ? Math.min(...prices) : null, hi = prices.length ? Math.max(...prices) : null;
    return { id: m.modelId, name: meta.name ?? m.modelId, org: meta.org, count: m.count, lo, hi, spread: prices.length > 1 ? hi / lo : null, low: m.endpoints.filter(e => LOW_PRECISION.test(e.quantization ?? '')).length };
  }), [models, prov.modelMeta]);

  const current = models.find(m => m.modelId === modelId) ?? null;
  const meta = current ? prov.modelMeta[current.modelId] : null;
  const rows = current?.endpoints ?? [];
  const W = current?.winners ?? {};
  const byTag = t => rows.find(e => e.tag === t);
  const cheapest = byTag(W.cheapest);
  const bestValue = byTag(W.bestValue);
  const priced = rows.filter(e => isNum(e.priceBlended) && e.priceBlended > 0);
  const priciest = [...priced].sort((a, b) => a.priceBlended - b.priceBlended).pop();   // same pick as the price strip when hosts tie
  const spread = cheapest && priciest && priced.length > 1 ? priciest.priceBlended / cheapest.priceBlended : null;
  const lowCount = rows.filter(e => LOW_PRECISION.test(e.quantization ?? '')).length;
  const widest = [...rows].filter(e => isNum(e.contextLength)).sort((a, b) => b.contextLength - a.contextLength)[0];
  const narrowest = [...rows].filter(e => isNum(e.contextLength)).sort((a, b) => a.contextLength - b.contextLength)[0];
  const bestUp = byTag(W.bestUptime);
  const ctxVaries = !!(widest && narrowest && fmtMetric('context', widest.contextLength) !== fmtMetric('context', narrowest.contextLength));

  const pick = id => {
    setModelId(id); setIndexOpen(false);
    requestAnimationFrame(() => { const el = detailRef.current; if (!el) return; const top = el.getBoundingClientRect().top; if (top < 0 || top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + top - 110, behavior: 'instant' }); });
  };

  const columns = useMemo(() => [
    { key: 'provider', label: 'Host', sticky: true, width: mobile ? 176 : 232, value: e => e.provider, render: e => (
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{e.provider}</span>
          {W.cheapest === e.tag && <BadgeTag color={GOLD}>Cheapest</BadgeTag>}
          {W.bestValue === e.tag && W.bestValue !== W.cheapest && <BadgeTag color={BLUE}>Best value</BadgeTag>}
          {!mobile && W.bestUptime === e.tag && isNum(e.uptime30m) && <BadgeTag color={GREEN}>Best uptime</BadgeTag>}
          {W.fastest === e.tag && <BadgeTag color={PURPLE}>Fastest</BadgeTag>}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: MONO, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 150 : 204 }}>{e.tag}</div>
      </div>) },
    { key: 'priceBlended', label: 'Blended price', short: 'Blended', metricKey: 'priceBlended', numeric: true, width: 124, bar: true, barColor: GOLD, barWidth: 40, valueWidth: 56, value: e => e.priceBlended, render: e => <span style={{ fontWeight: 700 }}>{price(e.priceBlended)}</span> },
    { key: 'priceIn', label: 'Input price', short: 'In $/M', metricKey: 'priceIn', numeric: true, width: 74, value: e => e.priceIn, render: e => fmtMetric('priceIn', e.priceIn) },
    { key: 'priceOut', label: 'Output price', short: 'Out $/M', metricKey: 'priceOut', numeric: true, width: 78, value: e => e.priceOut, render: e => fmtMetric('priceOut', e.priceOut) },
    { key: 'priceCacheRead', label: 'Cached input', short: 'Cache rd', metricKey: 'priceCacheRead', numeric: true, width: 78, default: false, value: e => e.priceCacheRead, render: e => fmtMetric('priceCacheRead', e.priceCacheRead) },
    { key: 'quantization', label: 'Precision', short: 'Precision', width: 80, value: e => e.quantization, render: e => e.quantization ? <span style={{ fontFamily: MONO, fontSize: 11, color: LOW_PRECISION.test(e.quantization) ? GOLD : 'var(--text)' }}>{e.quantization}</span> : <span style={{ color: 'var(--muted2)', fontSize: 11.5 }}>full</span> },
    { key: 'contextLength', label: 'Context', short: 'Context', metricKey: 'context', numeric: true, width: 76, value: e => e.contextLength, render: e => fmtMetric('context', e.contextLength) },
    { key: 'maxOutput', label: 'Max output', short: 'Max out', metricKey: 'maxOutput', numeric: true, width: 74, default: false, value: e => e.maxOutput, render: e => fmtMetric('maxOutput', e.maxOutput) },
    { key: 'uptime30m', label: 'Uptime (30 min)', short: 'Up 30m', metricKey: 'uptime', numeric: true, width: 78, value: e => e.uptime30m, render: e => isNum(e.uptime30m) ? <span style={{ color: uptimeColor(e.uptime30m) }}>{fmtMetric('uptime', e.uptime30m)}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'uptime1d', label: 'Uptime (24 h)', short: 'Up 24h', metricKey: 'uptime', numeric: true, width: 78, default: false, value: e => e.uptime1d, render: e => isNum(e.uptime1d) ? fmtMetric('uptime', e.uptime1d) : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    // measured, not listed: only when a source supplies them
    ...(caps.speed ? [{ key: 'throughput', label: 'Output speed', short: 'Tok/s', metricKey: 'speed', numeric: true, width: 70, value: e => e.throughput, render: e => isNum(e.throughput) ? fmtMetric('speed', e.throughput) : <span style={{ color: 'var(--muted2)' }}>{NA}</span> }] : []),
    ...(caps.latency ? [{ key: 'latencyMs', label: 'First-token latency', short: 'Latency', metricKey: 'ttft', numeric: true, width: 74, value: e => e.latencyMs, render: e => isNum(e.latencyMs) ? fmtMetric('ttft', e.latencyMs / 1000) : <span style={{ color: 'var(--muted2)' }}>{NA}</span> }] : []),
    { key: 'caps', label: 'Capabilities', short: 'Supports', width: 150, default: false, sortable: false, render: e => <span style={{ display: 'inline-flex', gap: 3 }}>{e.supportsTools && <BadgeTag color={BLUE}>tools</BadgeTag>}{e.supportsReasoning && <BadgeTag color={PURPLE}>reasoning</BadgeTag>}{e.supportsCaching && <BadgeTag color={GREEN}>cache</BadgeTag>}</span> },
  ], [mobile, W.cheapest, W.bestValue, W.bestUptime, W.fastest, caps.speed, caps.latency]);
  const colSel = useColumnSelection('providers-v2', columns);

  const chartPoints = useMemo(() => {
    const pts = [];
    for (const m of models) for (const e of m.endpoints) {
      const mm = prov.modelMeta[m.modelId];
      pts.push({ id: `${m.modelId}|${e.tag}`, name: `${e.provider} · ${mm?.name ?? m.modelId}`, org: mm?.org, x: e.priceBlended, y: e.uptime30m, e });
    }
    return pts;
  }, [models, prov.modelMeta]);

  const dirColumns = useMemo(() => [
    { key: 'provider', label: 'Provider', sticky: true, width: mobile ? 170 : 240, value: p => p.provider, render: p => <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.provider}</span> },
    { key: 'models', label: 'Top models hosted', short: 'Models', numeric: true, width: 130, bar: true, barColor: BLUE, barWidth: 48, valueWidth: 30, value: p => p.models },
    { key: 'endpoints', label: 'Endpoints', numeric: true, width: 96, value: p => p.endpoints },
    { key: 'avgUptime', label: 'Avg uptime (30 min)', short: 'Avg uptime', metricKey: 'uptime', numeric: true, width: 140, bar: true, barColor: GREEN, barWidth: 44, valueWidth: 56, value: p => p.avgUptime, render: p => isNum(p.avgUptime) ? <span style={{ color: uptimeColor(p.avgUptime), fontWeight: 600 }}>{fmtMetric('uptime', p.avgUptime)}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
  ], [mobile]);

  const totalEndpoints = models.reduce((s, m) => s + m.count, 0);

  return (
    <PageFrame mobile={mobile} wide>
      <GlobalMotion />
      <PageTitle mobile={mobile} eyebrow="Provider War" title="Same model, many hosts." subtitle="The same weights can cost several times more, come with a fraction of the context, or run quantised — depending on who serves them. Pick a model and see who hosts it best."
        status={<DataStatus status={prov.status} fetchedAt={prov.data?.fetchedAt} sources={['openrouter']} loading={prov.loading} onRefresh={prov.reload} />} />

      {prov.loading && !models.length ? <Skeleton height={520} /> : !models.length ? (
        <EmptyState title="Provider data unavailable" body={prov.sources?.openrouter?.error ?? 'OpenRouter endpoint data could not be loaded.'} action={<Btn small onClick={prov.reload}>Retry</Btn>} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : '300px minmax(0, 1fr)', gap: mobile ? 10 : 14, alignItems: 'start' }}>
            {/* index */}
            {mobile ? (
              <div>
                <button onClick={() => setIndexOpen(o => !o)} aria-expanded={indexOpen} className="aiwar-surface aiwar-press-btn" style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr) auto', columnGap: 10, alignItems: 'center', width: '100%', padding: '11px 14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--text)' }}>
                  <LabLogo org={meta?.org} size={16} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.08em', color: 'var(--muted2)', textTransform: 'uppercase' }}>Model · {index.length} tracked</span>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta?.name ?? 'Choose a model'}</span>
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.06em' }}>{indexOpen ? 'CLOSE ▴' : 'CHANGE ▾'}</span>
                </button>
                {indexOpen && <div style={{ marginTop: 6 }}><ModelIndex index={index} modelId={modelId} onPick={pick} mobile /></div>}
              </div>
            ) : (
              <div style={{ position: 'sticky', top: 'calc(var(--nav-h, 88px) + 14px)', height: 'min(680px, calc(100vh - var(--nav-h, 88px) - 28px))' }}>
                <ModelIndex index={index} modelId={modelId} onPick={pick} />
              </div>
            )}

            {/* detail */}
            <div ref={detailRef} style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
              {!current ? <EmptyState title="Not tracked per host" body="Provider endpoints are followed for the models at the top of the board. Pick one from the list." /> : (
                <>
                  <Panel pad={mobile ? 16 : 22}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        {!mobile && <LabLogo org={meta?.org} size={26} />}
                        <div style={{ minWidth: 0 }}>
                          {!mobile && <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--text)', overflowWrap: 'anywhere' }}>{meta?.name ?? current.modelId}</h2>}
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: mobile ? 0 : 4 }}>
                            {[meta?.org, isNum(meta?.intelligence) ? `Intelligence ${fmtMetric('intelligence', meta.intelligence)}` : isNum(meta?.elo) ? `ELO ${meta.elo}` : null, meta?.isOpen ? 'open weights' : null].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <AddToBattle item={{ id: current.modelId, kind: 'llm', name: meta?.name ?? current.modelId, org: meta?.org }} small={false} />
                        <Btn small onClick={() => onNavigate({ type: 'model', slug: current.modelId })}>Model page →</Btn>
                      </div>
                    </div>

                    <p style={{ margin: mobile ? '14px 0 16px' : '16px 0 20px', fontSize: mobile ? 15 : 16.5, lineHeight: 1.5, letterSpacing: '-0.015em', color: 'var(--muted)', maxWidth: 720 }}>
                      {cheapest ? <>Cheapest at <b style={{ color: 'var(--text)', fontWeight: 600 }}>{cheapest.provider}</b>, <b style={{ color: GOLD, fontFamily: MONO, fontWeight: 700 }}>{price(cheapest.priceBlended)}</b> per 1M tokens. </> : 'No host lists a price. '}
                      {isNum(spread) && spread >= 1.05
                        ? <>The priciest listing, {priciest.provider}, is <b style={{ color: spreadColor(spread), fontFamily: MONO, fontWeight: 700 }}>{fmtX(spread)}</b> that for the same weights. </>
                        : priced.length > 1 ? <>All {priced.length} priced hosts list the same rate. </> : null}
                      {lowCount > 0 && <>{lowCount} of {rows.length} hosts serve it at 4-bit precision{bestValue && cheapest && bestValue.tag !== cheapest.tag ? <> — at fp8 or better the cheapest is <b style={{ color: 'var(--text)', fontWeight: 600 }}>{bestValue.provider}</b> at <b style={{ color: BLUE, fontFamily: MONO, fontWeight: 700 }}>{price(bestValue.priceBlended)}</b></> : null}. </>}
                      {ctxVaries && <>Context ranges from {fmtMetric('context', narrowest.contextLength)} to {fmtMetric('context', widest.contextLength)}.</>}
                    </p>

                    <Label style={{ display: 'block', marginBottom: 10 }}>Every host, by price</Label>
                    <PriceStrip endpoints={rows} winners={W} picked={focusTag} onPick={t => { setFocusTag(t); setView('hosts'); }} mobile={mobile} />
                  </Panel>

                  <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))', gap: mobile ? 8 : 10 }}>
                    <StatTile label="Hosts" value={current.count} sub={lowCount ? `${lowCount} at 4-bit` : 'all full precision or unlisted'} />
                    <StatTile label="Cheapest" value={cheapest ? price(cheapest.priceBlended) : NA} sub={cheapest ? cheapest.provider : 'no price'} color={GOLD} metricKey="priceBlended" />
                    <StatTile label="Price gap" value={isNum(spread) ? fmtX(spread) : NA} sub={isNum(spread) && spread >= 1.05 ? `${price(cheapest.priceBlended)} → ${price(priciest.priceBlended)}` : priced.length > 1 ? 'one price everywhere' : 'one priced host'} color={isNum(spread) ? spreadColor(spread) : undefined} />
                    <StatTile label="Best uptime" value={bestUp && isNum(bestUp.uptime30m) ? fmtMetric('uptime', bestUp.uptime30m) : NA} sub={bestUp && isNum(bestUp.uptime30m) ? bestUp.provider : 'not reported'} color={bestUp && isNum(bestUp.uptime30m) ? uptimeColor(bestUp.uptime30m) : undefined} metricKey="uptime" />
                    {caps.speed && W.fastest
                      ? <StatTile label="Fastest" value={byTag(W.fastest)?.provider ?? NA} color={PURPLE} metricKey="speed" mono={false} />
                      : <StatTile label="Largest context" value={widest ? fmtMetric('context', widest.contextLength) : NA} sub={widest ? (ctxVaries ? `${widest.provider} · least ${fmtMetric('context', narrowest.contextLength)}` : 'every host') : 'not listed'} metricKey="context" style={mobile ? { gridColumn: '1 / -1' } : undefined} />}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                    <Segmented small value={view} onChange={setView} options={[{ value: 'hosts', label: 'Hosts', count: rows.length }, { value: 'bars', label: 'Price & context' }]} />
                    {view === 'hosts' && <ColumnPicker columns={columns} visible={colSel.visible} toggle={colSel.toggle} reset={colSel.reset} />}
                  </div>

                  {view === 'hosts' && (
                    <DataTable columns={columns} rows={rows} visible={colSel.visible} sort={sort} onSort={setSort} mobile={mobile} rowKey={e => e.tag ?? e.provider} pageSize={25}
                      highlightKey={e => (focusTag && e.tag === focusTag ? GOLD : null)} onRowClick={e => setFocusTag(t => (t === e.tag ? null : e.tag))}
                      footer={<span>List prices relayed by OpenRouter · blended = (3 × input + output) ÷ 4 · “best value” is the cheapest host at fp8 precision or better{caps.speed ? '' : ' · speed and latency per host are not published'}</span>} />
                  )}
                  {view === 'bars' && (
                    <HighlightGrid mobile={mobile} cols={2}>
                      <BarPanel mobile={mobile} title="Blended price per host" color={GOLD} subtitle="$ per 1M tokens at 3:1 in:out · OpenRouter" higherIsBetter={false} baseline={0} limit={rows.length}
                        items={[...priced].sort((a, b) => a.priceBlended - b.priceBlended).map(e => ({ id: e.tag, name: e.provider, value: e.priceBlended, label: price(e.priceBlended), color: e.tag === W.cheapest ? GOLD : e.tag === W.bestValue ? BLUE : 'var(--muted)', tag: e.quantization ? <BadgeTag color={LOW_PRECISION.test(e.quantization) ? GOLD : 'var(--muted)'}>{e.quantization}</BadgeTag> : null }))}
                        note={`${rows.length - priced.length ? `${rows.length - priced.length} host(s) without a listed price are not drawn · ` : ''}gold = cheapest · blue = best value at fp8 or better`} />
                      <BarPanel mobile={mobile} title="Context served per host" color={BLUE} subtitle="Largest request each host accepts · tokens · OpenRouter" baseline={0} limit={rows.length}
                        items={[...rows].filter(e => isNum(e.contextLength)).sort((a, b) => b.contextLength - a.contextLength).map(e => ({ id: e.tag, name: e.provider, value: e.contextLength, label: fmtMetric('context', e.contextLength), color: e.tag === widest?.tag ? BLUE : 'var(--muted)' }))}
                        note="blue = the host serving the largest window" />
                    </HighlightGrid>
                  )}
                </>
              )}
            </div>
          </div>

          {/* the market */}
          <section style={{ marginTop: mobile ? 44 : 64 }}>
            <SectionTitle eyebrow="The market" title="Where the host matters most." mobile={mobile}
              action={!mobile && <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted2)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{models.length} MODELS · {prov.providers.length} PROVIDERS · {totalEndpoints.toLocaleString('en-US')} ENDPOINTS</span>} />
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, alignItems: 'start' }}>
              <SpreadBoard index={index} onPick={pick} mobile={mobile} />
              <HostBoard providers={prov.providers} mobile={mobile} all={allProviders} onToggleAll={() => setAllProviders(v => !v)} />
            </div>
            {allProviders && (
              <div style={{ marginTop: 12 }}>
                <DataTable columns={dirColumns} rows={prov.providers} visible={dirColumns.map(c => c.key)} sort={dirSort} onSort={setDirSort} mobile={mobile} rowKey={p => p.provider} dense pageSize={30} />
              </div>
            )}
            <Panel pad={mobile ? 12 : 18} style={{ marginTop: 12 }} title="Uptime against price · every endpoint">
              <Suspense fallback={<Skeleton height={mobile ? 320 : 400} />}>
                <ScatterChart points={chartPoints} xKey="priceBlended" yKey="uptime" xLog height={mobile ? 320 : 400} showZone={false} showLabels={false} noun="endpoints"
                  tooltipExtra={p => [['Ctx', fmtMetric('context', p.e.contextLength)], ['Quant', p.e.quantization ?? 'full']]} />
              </Suspense>
              <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, margin: '10px 0 0', lineHeight: 1.5 }}>One point per endpoint across the {models.length} tracked models · uptime is OpenRouter's rolling 30-minute success rate{caps.speed ? '' : " · per-host speed and latency are not in OpenRouter's public data, so they are not charted"}</p>
            </Panel>
          </section>

          <section style={{ marginTop: mobile ? 36 : 48 }}>
            <SectionTitle eyebrow="Reading the board" title="Quantisation is the hidden variable." mobile={mobile} />
            <Panel pad={mobile ? 16 : 22}>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)', margin: 0, maxWidth: 820 }}>
                A cheaper host of an open model is often running it at int4 or fp4 precision, which can change output quality; “best value” here is the cheapest endpoint that keeps fp8-or-better precision. Uptime is OpenRouter's rolling success rate for the endpoint. Price is the provider's list price relayed through OpenRouter; direct pricing from the provider may differ. Speed, latency and accuracy are measurements, not listings — they appear only when a measurement source supplies them, never as estimates.
              </p>
            </Panel>
          </section>
        </>
      )}
    </PageFrame>
  );
}
