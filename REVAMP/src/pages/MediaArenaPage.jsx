// ─── IMAGE ARENA / VIDEO ARENA ──────────────────────────────────────────────
// One page, two kinds. Boards come from arena.ai (quality ELO, price per
// image / second); generation times and release dates come from Artificial
// Analysis when configured, otherwise they are N/A.

import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useMobile } from '../hooks/useTheme.js';
import { MONO, GlobalMotion, Skeleton, SectionTitle } from '../components/design.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { RobotMascot } from '../components/Robot.jsx';
import { useMedia, useDomain } from '../data/useDomain.js';
import DataTable, { useColumnSelection, ColumnPicker } from '../components/table/DataTable.jsx';
import { PageFrame, PageTitle, DataStatus, Panel, Label, Chip, Segmented, StatTile, EmptyState, BadgeTag, Btn, Unavailable, rankColor, GREEN, GOLD, BLUE, PURPLE, RED } from '../components/ui.jsx';
import { fmtMetric, fmtDate, isNum, NA } from '../../shared/metrics.js';
import { AddToBattle } from '../domains/comparison/BattleControls.jsx';
import { useBattle, addToBattle, removeFromBattle, clearBattle } from '../domains/comparison/battleStore.js';
import MediaBattle from '../domains/comparison/MediaBattle.jsx';
import BattleReplay from '../domains/comparison/BattleReplay.jsx';
import { BarPanel, HighlightGrid } from '../components/Highlights.jsx';
import { useReplays, useSamples, attachSamples } from '../data/samples.js';

const ScatterChart = lazy(() => import('../components/charts/ScatterChart.jsx'));

const KINDS = {
  image: { eyebrow: 'Image Arena', title: 'Pixels, ranked.', boards: [{ id: 'text-to-image', label: 'Text to image' }, { id: 'image-edit', label: 'Image editing' }], price: 'pricePerImage', priceAlt: 'pricePer1kImages',
    subtitle: 'Text-to-image and image-editing models ranked by human-preference quality ELO, with price per image and generation time.' },
  video: { eyebrow: 'Video Arena', title: 'Motion, ranked.', boards: [{ id: 'text-to-video', label: 'Text to video' }, { id: 'image-to-video', label: 'Image to video' }], price: 'pricePerSecond', priceAlt: 'pricePerMinute',
    subtitle: 'Text-to-video and image-to-video models ranked by quality ELO, with price per second, audio support and resolution.' },
};

const CHARTS = {
  image: [
    { id: 'q-price', label: 'Quality vs price', x: 'pricePerImage', y: 'elo', xLog: true },
    { id: 'q-time',  label: 'Quality vs generation time', x: 'genTime', y: 'elo', aa: true },
    { id: 't-price', label: 'Generation time vs price', x: 'pricePerImage', y: 'genTime', xLog: true, aa: true },
  ],
  video: [
    { id: 'q-price', label: 'Quality vs price', x: 'pricePerSecond', y: 'elo', xLog: true },
    { id: 'q-time',  label: 'Quality vs generation time', x: 'genTime', y: 'elo', aa: true },
    { id: 't-price', label: 'Price vs generation time', x: 'genTime', y: 'pricePerSecond', yLog: true, aa: true },
  ],
};

export default function MediaArenaPage({ onNavigate, kind = 'image', slug }) {
  const mobile = useMobile();
  const K = KINDS[kind];
  const media = useMedia();
  const status = useDomain('status');
  const [board, setBoard] = useState(K.boards[0].id);
  const [view, setView] = useState(slug === 'replay' ? 'replay' : 'table');
  const [chart, setChart] = useState(CHARTS[kind][0].id);
  const [query, setQuery] = useState('');
  const [audio, setAudio] = useState(null);      // null | true | false
  const [openOnly, setOpenOnly] = useState(null); // null | true | false
  const [current, setCurrent] = useState(false);
  const [sort, setSort] = useState({ key: 'elo', dir: 'desc' });
  const [expanded, setExpanded] = useState(null);
  const battle = useBattle();
  const replays = useReplays();
  const samples = useSamples();

  useEffect(() => { setBoard(K.boards[0].id); setChart(CHARTS[kind][0].id); setAudio(null); }, [kind]); // eslint-disable-line
  useEffect(() => { if (slug === 'replay') setView('replay'); else if (slug) setExpanded(slug); }, [slug]);

  const rows = useMemo(() => attachSamples(media.boards?.[board] ?? [], samples.byModel, board), [media.boards, board, samples.byModel]);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => rows.filter(r => {
    if (q && !`${r.name} ${r.org}`.toLowerCase().includes(q)) return false;
    if (audio != null && kind === 'video' && !!r.hasAudio !== audio) return false;
    if (openOnly != null && !!r.isOpen !== openOnly) return false;
    if (current && !(r.rank != null && r.rank <= 25)) return false;
    return true;
  }), [rows, q, audio, openOnly, current, kind]);

  const priceKey = K.price;
  const columns = useMemo(() => [
    { key: 'model', label: 'Model', sticky: true, width: mobile ? 210 : 290, value: r => r.rank ?? 9999, defaultDir: 'asc', render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ width: 24, textAlign: 'right', fontFamily: MONO, fontSize: 11.5, color: r.rank <= 3 ? 'var(--text)' : 'var(--muted)', fontWeight: r.rank <= 3 ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>{r.rank ?? '—'}</span>
        <LabLogo org={r.org} size={16} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 140 : 210 }}>{r.name}</span>
            {r.isNew && <BadgeTag color={GREEN}>New</BadgeTag>}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', display: 'flex', gap: 5 }}>{r.org}{r.isOpen && <span style={{ color: GREEN }}>🔓</span>}{kind === 'video' && r.hasAudio && <span title="Generates audio" style={{ color: PURPLE }}>♪</span>}</div>
        </div>
      </div>) },
    { key: 'elo', label: 'Quality ELO', short: 'ELO', metricKey: 'elo', numeric: true, width: 132, bar: true, barColor: GREEN, barWidth: 40, valueWidth: 62, value: r => r.elo, render: r => <span><span style={{ fontWeight: 700 }}>{r.elo}</span><span style={{ fontSize: 10, color: 'var(--muted2)', marginLeft: 4 }}>±{r.ci ?? '—'}</span></span> },
    { key: 'votes', label: 'Votes', metricKey: 'votes', numeric: true, width: 66, value: r => r.votes, render: r => isNum(r.votes) ? fmtMetric('votes', r.votes) : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'price', label: kind === 'image' ? 'Price per image' : 'Price per second', short: kind === 'image' ? '$/img' : '$/s', metricKey: priceKey, numeric: true, width: 72, value: r => r[priceKey], render: r => isNum(r[priceKey]) ? fmtMetric(priceKey, r[priceKey]) : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'priceAlt', label: kind === 'image' ? 'Price per 1,000 images' : 'Price per minute', short: kind === 'image' ? '$/1K' : '$/min', metricKey: K.priceAlt, numeric: true, width: 72, value: r => r[K.priceAlt], render: r => isNum(r[K.priceAlt]) ? fmtMetric(K.priceAlt, r[K.priceAlt]) : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'genTime', label: 'Generation time', short: 'Gen time', metricKey: 'genTime', numeric: true, width: 78, value: r => r.genTime, render: r => isNum(r.genTime) ? <span>{fmtMetric('genTime', r.genTime)}{isNum(r.genTimeP25) && isNum(r.genTimeP75) && <span style={{ color: 'var(--muted2)', fontSize: 10 }}> {fmtMetric('genTime', r.genTimeP25)}–{fmtMetric('genTime', r.genTimeP75)}</span>}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    ...(kind === 'video' ? [
      { key: 'audio', label: 'Audio', width: 60, value: r => (r.hasAudio ? 1 : 0), render: r => r.hasAudio ? <BadgeTag color={PURPLE}>Audio</BadgeTag> : <span style={{ color: 'var(--muted2)', fontSize: 11 }}>silent</span> },
      { key: 'resolution', label: 'Resolution', short: 'Res', width: 64, value: r => r.resolution, render: r => r.resolution ? <span style={{ fontFamily: MONO, fontSize: 11 }}>{r.resolution}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    ] : []),
    { key: 'released', label: 'Release date', short: 'Released', metricKey: 'releaseDate', width: 96, default: false, value: r => r.releaseDate, defaultDir: 'desc', render: r => r.releaseDate ? <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--muted)' }}>{fmtDate(r.releaseDate)}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'provider', label: 'API provider', short: 'Provider', width: 100, default: false, value: r => r.provider, render: r => r.provider ?? <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'license', label: 'Licence', width: 120, default: false, value: r => r.license, maxWidth: 140, render: r => <span style={{ fontSize: 11, color: r.isOpen ? GREEN : 'var(--muted)' }}>{r.license ?? NA}</span> },
    { key: 'battle', label: '', width: 72, sortable: false, align: 'right', render: r => <AddToBattle item={{ id: r.id, kind, name: r.name, org: r.org, board }} /> },
  ], [kind, mobile, priceKey, K.priceAlt, board]);
  const colSel = useColumnSelection(`media-${kind}-v1`, columns);

  const top = rows[0];
  const cheapest = [...rows].filter(r => isNum(r[priceKey]) && r[priceKey] > 0).sort((a, b) => a[priceKey] - b[priceKey])[0];
  const fastest = [...rows].filter(r => isNum(r.genTime)).sort((a, b) => a.genTime - b.genTime)[0];
  const topOpen = rows.find(r => r.isOpen);
  const cfg = CHARTS[kind].find(c => c.id === chart);
  const points = useMemo(() => filtered.map(r => ({ id: r.id, name: r.name, org: r.org, x: r[cfg.x], y: r[cfg.y], r })), [filtered, cfg]);
  const aa = !!media.capabilities?.aa;
  const roster = battle.kind === kind ? battle.items.map(i => rows.find(r => r.id === i.id) ?? Object.values(media.boards ?? {}).flat().find(r => r.id === i.id)).filter(Boolean) : [];

  return (
    <PageFrame mobile={mobile}>
      <GlobalMotion />
      <PageTitle mobile={mobile} eyebrow={K.eyebrow} title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>{K.title} <RobotMascot variant="eared" size={mobile ? 32 : 44} color="var(--accent)" /></span>} subtitle={K.subtitle}
        status={<DataStatus status={media.status} fetchedAt={media.data?.fetchedAt} sources={['arena', ...(aa ? ['aa'] : [])]} loading={media.loading} onRefresh={media.reload} />} />

      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
        <StatTile label="#1 quality" value={top ? top.elo : NA} sub={top ? `${top.name} · ${top.org}` : 'Loading…'} color={GREEN} metricKey="elo" />
        <StatTile label="Cheapest listed" value={cheapest ? fmtMetric(priceKey, cheapest[priceKey]) : NA} sub={cheapest ? `${cheapest.name} · ELO ${cheapest.elo}` : 'No listed prices'} color={GOLD} metricKey={priceKey} />
        <StatTile label="Fastest generation" value={fastest ? fmtMetric('genTime', fastest.genTime) : NA} sub={fastest ? fastest.name : 'Needs Artificial Analysis'} color={PURPLE} metricKey="genTime" />
        <StatTile label="Best open weights" value={topOpen ? topOpen.elo : NA} sub={topOpen ? `${topOpen.name} · #${topOpen.rank}` : 'None on this board'} color={BLUE} metricKey="elo" />
      </div>

      {rows.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <HighlightGrid mobile={mobile}>
            <BarPanel mobile={mobile} title="Quality ELO" color={GREEN} subtitle={`${K.boards.find(b => b.id === board)?.label} · arena.ai`} items={rows.slice(0, 10).map(r => ({ id: r.id, name: r.name, org: r.org, value: r.elo, label: String(r.elo) }))} onSelect={it => setExpanded(expanded === it.id ? null : it.id)} />
            <BarPanel mobile={mobile} title="Price" color={GOLD} subtitle={`Top 10 · ${kind === 'image' ? '$ per image' : '$ per second'}`} higherIsBetter={false} items={rows.slice(0, 10).filter(r => isNum(r[priceKey])).sort((a, b) => a[priceKey] - b[priceKey]).map(r => ({ id: r.id, name: r.name, org: r.org, value: r[priceKey], label: fmtMetric(priceKey, r[priceKey]) }))} onSelect={it => setExpanded(expanded === it.id ? null : it.id)} />
            <BarPanel mobile={mobile} title="Generation time" color={PURPLE} subtitle="Top 10 · seconds · Artificial Analysis" higherIsBetter={false} items={rows.slice(0, 10).filter(r => isNum(r.genTime)).sort((a, b) => a.genTime - b.genTime).map(r => ({ id: r.id, name: r.name, org: r.org, value: r.genTime, label: fmtMetric('genTime', r.genTime) }))} onSelect={it => setExpanded(expanded === it.id ? null : it.id)} />
          </HighlightGrid>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Segmented small value={board} onChange={setBoard} options={K.boards.map(b => ({ value: b.id, label: b.label, count: media.boards?.[b.id]?.length }))} />
        <Segmented small value={view} onChange={setView} options={[{ value: 'table', label: 'Table' }, { value: 'charts', label: 'Charts' }, { value: 'battle', label: `Battle${roster.length ? ` ${roster.length}` : ''}` }, { value: 'replay', label: 'Replay', count: Object.entries(replays.boards).filter(([b]) => (kind === 'video' ? /video/ : /image/).test(b)).reduce((s, [, a]) => s + a.length, 0) || undefined }]} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search model or creator…" style={{ height: 30, paddingInline: 12, background: 'var(--card)', border: '0.5px solid var(--sep)', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', minWidth: 180, flex: mobile ? '1 1 100%' : undefined }} />
        {kind === 'video' && <>
          <Chip small active={audio === true} color={PURPLE} label="With audio" onClick={() => setAudio(audio === true ? null : true)} />
          <Chip small active={audio === false} label="Without audio" onClick={() => setAudio(audio === false ? null : false)} />
        </>}
        <Chip small active={openOnly === true} color={GREEN} label="Open weights" onClick={() => setOpenOnly(openOnly === true ? null : true)} />
        <Chip small active={openOnly === false} label="Proprietary" onClick={() => setOpenOnly(openOnly === false ? null : false)} />
        <Chip small active={current} color={GOLD} label="Top 25" onClick={() => setCurrent(v => !v)} title="Current contenders — the top 25 by ELO" />
        <span style={{ marginLeft: 'auto' }}>{view === 'table' && <ColumnPicker columns={columns} visible={colSel.visible} toggle={colSel.toggle} reset={colSel.reset} />}</span>
      </div>

      {media.loading && !rows.length ? <Skeleton height={400} /> : !rows.length ? (
        <EmptyState title="Board unavailable" body={media.sources?.[`arena:${board}`]?.error ?? 'This arena board could not be loaded and nothing valid is cached.'} action={<Btn small onClick={media.reload}>Retry</Btn>} />
      ) : view === 'table' ? (
        <DataTable columns={columns} rows={filtered} visible={colSel.visible} sort={sort} onSort={setSort} mobile={mobile} rowKey={r => r.id} expandedKey={expanded}
          onRowClick={r => setExpanded(expanded === r.id ? null : r.id)} highlightKey={r => rankColor(r.rank)}
          renderExpanded={r => <MediaExpanded r={r} kind={kind} priceKey={priceKey} mobile={mobile} board={board} aa={aa} />} />
      ) : view === 'charts' ? (
        <Panel pad={mobile ? 12 : 18}>
          <div style={{ marginBottom: 12 }}><Segmented small value={chart} onChange={setChart} options={CHARTS[kind].map(c => ({ value: c.id, label: c.label }))} /></div>
          {cfg.aa && !aa && !points.some(p => isNum(p.x) && isNum(p.y)) ? <Unavailable what="Generation time" /> : (
            <Suspense fallback={<Skeleton height={420} />}>
              <ScatterChart points={points} xKey={cfg.x} yKey={cfg.y} xLog={!!cfg.xLog} yLog={!!cfg.yLog} height={mobile ? 340 : 440}
                tooltipExtra={p => [['Votes', fmtMetric('votes', p.r.votes)], ['Rank', `#${p.r.rank ?? '—'}`]]} />
            </Suspense>
          )}
          <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 10 }}>Quality ELO © arena.ai · listed prices from the arena board{aa ? ' · generation times © Artificial Analysis' : ' · generation time over time needs Artificial Analysis + history'}.</p>
        </Panel>
      ) : view === 'replay' ? (
        <BattleReplay boards={replays.boards} kind={kind} loading={replays.loading} license={replays.license} attribution={replays.attribution} mobile={mobile} initialBoard={board} />
      ) : (
        <MediaBattle kind={kind} roster={roster} candidates={rows} priceKey={priceKey} mobile={mobile} liveBattle={!!status.data?.capabilities?.liveBattle}
          onAdd={r => addToBattle({ id: r.id, kind, name: r.name, org: r.org, board })} onRemove={removeFromBattle} onClear={clearBattle} />
      )}

      <section style={{ marginTop: mobile ? 36 : 48 }}>
        <SectionTitle eyebrow="How to read this" title="Quality is human preference." mobile={mobile} />
        <Panel>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--muted)', margin: 0 }}>
            Every ELO here comes from anonymous side-by-side votes on arena.ai's {kind} arenas: two models render the same prompt, a person picks the better output, and a Bradley-Terry model turns thousands of those votes into a rating. ±CI is the 95% interval — models whose intervals overlap are statistically tied. Prices are the list prices arena records for default settings; {kind === 'image' ? 'per-1,000-image' : 'per-minute'} figures are derived from them. Generation time percentiles are measured by Artificial Analysis and only shown when that source is configured — nothing is estimated.
          </p>
        </Panel>
      </section>
    </PageFrame>
  );
}

function MediaExpanded({ r, kind, priceKey, mobile, board, aa }) {
  const cells = kind === 'image'
    ? [['elo', r.elo], ['ci', r.ci], ['votes', r.votes], ['pricePerImage', r.pricePerImage], ['pricePer1kImages', r.pricePer1kImages], ['genTime', r.genTime], ['releaseDate', r.releaseDate]]
    : [['elo', r.elo], ['ci', r.ci], ['votes', r.votes], ['pricePerSecond', r.pricePerSecond], ['pricePerMinute', r.pricePerMinute], ['genTime', r.genTime], ['releaseDate', r.releaseDate]];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {cells.map(([k, v]) => <StatTile key={k} label={k === 'releaseDate' ? 'Released' : k} metricKey={k} value={fmtMetric(k, v)} style={{ padding: '9px 11px' }} />)}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 11.5, color: 'var(--muted)' }}>
        <span>Licence: <span style={{ color: r.isOpen ? GREEN : 'var(--text)' }}>{r.license ?? NA}</span></span>
        {kind === 'video' && <span>Audio: {r.hasAudio ? 'yes' : 'no'}</span>}
        {r.resolution && <span>Resolution: {r.resolution}</span>}
        {r.provider && <span>Provider: {r.provider}</span>}
        {r.url && <a href={r.url} target="_blank" rel="noreferrer noopener" style={{ fontFamily: MONO, color: 'var(--muted)', textDecoration: 'none' }}>Model page ↗</a>}
        <AddToBattle item={{ id: r.id, kind, name: r.name, org: r.org, board }} small={false} label="Add to battle" />
      </div>
      {!aa && <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 10 }}>Generation time, percentiles and release date need the Artificial Analysis source — shown as N/A until configured.</p>}
    </div>
  );
}
