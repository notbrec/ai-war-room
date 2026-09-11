// ─── VOICE COMMS — speech-to-text, text-to-speech, speech-to-speech ─────────

import { useMemo, useState, lazy, Suspense } from 'react';
import { useMobile } from '../hooks/useTheme.js';
import { MONO, GlobalMotion, Skeleton, ComparisonBar } from '../components/design.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { useSpeech } from '../data/useDomain.js';
import DataTable, { useColumnSelection, ColumnPicker } from '../components/table/DataTable.jsx';
import { PageFrame, PageTitle, DataStatus, Panel, Label, Chip, Segmented, StatTile, EmptyState, BadgeTag, Btn, Unavailable, GREEN, GOLD, BLUE, PURPLE } from '../components/ui.jsx';
import { fmtMetric, isNum, NA, METRICS } from '../../shared/metrics.js';
import { AddToBattle } from '../domains/comparison/BattleControls.jsx';

const ScatterChart = lazy(() => import('../components/charts/ScatterChart.jsx'));

export default function VoiceCommsPage({ onNavigate, slug }) {
  const mobile = useMobile();
  const speech = useSpeech();
  const [cat, setCat] = useState(slug === 'tts' || slug === 's2s' ? slug : 'stt');
  const [view, setView] = useState('table');
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState({ key: 'wer', dir: 'asc' });
  const [expanded, setExpanded] = useState(null);

  const stt = speech.stt;
  const q = query.trim().toLowerCase();
  const sttRows = useMemo(() => stt.filter(r => (!q || `${r.name} ${r.org}`.toLowerCase().includes(q)) && (!openOnly || r.isOpen)), [stt, q, openOnly]);
  const datasets = useMemo(() => { const s = new Set(); for (const r of stt) for (const k of Object.keys(r.perDataset ?? {})) s.add(k); return [...s]; }, [stt]);

  const columns = useMemo(() => [
    { key: 'model', label: 'Model', sticky: true, width: mobile ? 210 : 300, value: r => r.rank, defaultDir: 'asc', render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ width: 24, textAlign: 'right', fontFamily: MONO, fontSize: 11, color: r.rank <= 3 ? GOLD : 'var(--muted)', fontWeight: r.rank <= 3 ? 700 : 500 }}>{r.rank}</span>
        <LabLogo org={r.org} size={16} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: mobile ? 150 : 220 }}>{r.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.org}{r.isOpen ? ' · 🔓' : ' · API'}</div>
        </div>
      </div>) },
    { key: 'wer', label: 'Word error rate', short: 'WER', metricKey: 'wer', numeric: true, width: 78, value: r => r.wer, render: r => <span style={{ fontSize: 15, fontWeight: 700, color: r.wer < 5 ? GREEN : r.wer < 7 ? BLUE : r.wer < 10 ? GOLD : 'var(--text)', letterSpacing: '-0.03em' }}>{fmtMetric('wer', r.wer)}</span> },
    { key: 'rtfx', label: 'Speed (RTFx)', short: 'RTFx', metricKey: 'rtfx', numeric: true, width: 72, value: r => r.rtfx, render: r => isNum(r.rtfx) ? <span>{fmtMetric('rtfx', r.rtfx)}×</span> : <span style={{ color: 'var(--muted2)' }} title="Not measured for hosted API models">{NA}</span> },
    { key: 'paramsB', label: 'Parameters', short: 'Params', metricKey: 'paramsB', numeric: true, width: 66, value: r => r.paramsB, render: r => fmtMetric('paramsB', r.paramsB) },
    { key: 'languages', label: 'Languages', short: 'Langs', numeric: true, width: 60, default: false, value: r => r.languages },
    { key: 'streaming', label: 'Streaming', width: 80, default: false, value: r => r.streaming, render: () => <span style={{ color: 'var(--muted2)' }} title="Not published by the Open ASR Leaderboard">{NA}</span> },
    { key: 'price', label: 'Price per minute', short: '$/min', metricKey: 'pricePerMinute', numeric: true, width: 70, default: false, value: () => null, render: () => <span style={{ color: 'var(--muted2)' }} title="Pricing not published by this source">{NA}</span> },
    { key: 'license', label: 'Licence', width: 130, default: false, value: r => r.license, maxWidth: 150, render: r => <span style={{ fontSize: 11, color: r.isOpen ? GREEN : 'var(--muted)' }}>{r.license ?? NA}</span> },
    { key: 'arch', label: 'Architecture', width: 130, default: false, mobile: false, value: r => `${r.encoder ?? ''}/${r.decoder ?? ''}`, render: r => (r.encoder || r.decoder) ? <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted)' }}>{r.encoder ?? '?'} → {r.decoder ?? '?'}</span> : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    ...datasets.map(d => ({ key: `ds:${d}`, label: `${d} WER`, short: d.replace(/-Cleaned.*|-AA.*/g, ''), group: 'Per-dataset WER', metricKey: 'wer', numeric: true, width: 74, default: false, value: r => r.perDataset?.[d], render: r => fmtMetric('wer', r.perDataset?.[d]) })),
    { key: 'battle', label: '', width: 70, sortable: false, align: 'right', render: r => <AddToBattle item={{ id: r.id, kind: 'stt', name: r.name, org: r.org }} /> },
  ], [mobile, datasets]);
  const colSel = useColumnSelection('stt-v1', columns);

  const best = stt[0];
  const fastest = [...stt].filter(r => isNum(r.rtfx)).sort((a, b) => b.rtfx - a.rtfx)[0];
  const bestOpen = stt.find(r => r.isOpen);
  const smallest = [...stt].filter(r => isNum(r.paramsB) && r.wer < 8).sort((a, b) => a.paramsB - b.paramsB)[0];
  const points = useMemo(() => sttRows.map(r => ({ id: r.id, name: r.name, org: r.org, x: r.rtfx, y: r.wer, r })), [sttRows]);
  const aa = !!speech.capabilities?.aa;

  return (
    <PageFrame mobile={mobile}>
      <GlobalMotion />
      <PageTitle mobile={mobile} eyebrow="Voice Comms" title="Ears and voices." subtitle="Transcription accuracy and speed from the Open ASR Leaderboard; speech quality, latency and price from Artificial Analysis when configured."
        status={<DataStatus status={speech.status} fetchedAt={speech.data?.fetchedAt} sources={['openasr', ...(aa ? ['aa'] : [])]} loading={speech.loading} onRefresh={speech.reload} />} />

      <div style={{ marginBottom: 14 }}>
        <Segmented value={cat} onChange={setCat} options={[{ value: 'stt', label: 'Speech to text', count: stt.length || undefined }, { value: 'tts', label: 'Text to speech', count: speech.tts.length || undefined }, { value: 's2s', label: 'Speech to speech', count: speech.s2s.length || undefined }]} />
      </div>

      {cat === 'stt' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
            <StatTile label="Most accurate" value={best ? fmtMetric('wer', best.wer) : NA} sub={best ? `${best.name} · ${best.org}` : 'Loading…'} color={GREEN} metricKey="wer" />
            <StatTile label="Fastest (RTFx)" value={fastest ? `${fmtMetric('rtfx', fastest.rtfx)}×` : NA} sub={fastest ? `${fastest.name} · WER ${fmtMetric('wer', fastest.wer)}` : 'No throughput data'} color={PURPLE} metricKey="rtfx" />
            <StatTile label="Best open weights" value={bestOpen ? fmtMetric('wer', bestOpen.wer) : NA} sub={bestOpen ? bestOpen.name : '—'} color={BLUE} metricKey="wer" />
            <StatTile label="Smallest under 8% WER" value={smallest ? fmtMetric('paramsB', smallest.paramsB) : NA} sub={smallest ? `${smallest.name} · ${fmtMetric('wer', smallest.wer)}` : '—'} color={GOLD} metricKey="paramsB" />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <Segmented small value={view} onChange={setView} options={[{ value: 'table', label: 'Table' }, { value: 'chart', label: 'WER vs speed' }]} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search model or org…" style={{ height: 30, paddingInline: 12, background: 'var(--card)', border: '0.5px solid var(--sep)', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', minWidth: 180, flex: mobile ? '1 1 100%' : undefined }} />
            <Chip small active={openOnly} color={GREEN} label="Open weights" onClick={() => setOpenOnly(v => !v)} />
            <span style={{ marginLeft: 'auto' }}>{view === 'table' && <ColumnPicker columns={columns} visible={colSel.visible} toggle={colSel.toggle} reset={colSel.reset} />}</span>
          </div>
          {speech.loading && !stt.length ? <Skeleton height={400} /> : !stt.length ? (
            <EmptyState title="Open ASR Leaderboard unavailable" body={speech.sources?.openasr?.error ?? 'Could not load the results CSV.'} action={<Btn small onClick={speech.reload}>Retry</Btn>} />
          ) : view === 'table' ? (
            <DataTable columns={columns} rows={sttRows} visible={colSel.visible} sort={sort} onSort={setSort} mobile={mobile} rowKey={r => r.id} expandedKey={expanded} onRowClick={r => setExpanded(expanded === r.id ? null : r.id)}
              renderExpanded={r => (
                <div>
                  <Label style={{ display: 'block', marginBottom: 8 }}>WER by test set · lower is better</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(2, 1fr)', gap: '8px 24px', maxWidth: 760 }}>
                    {Object.entries(r.perDataset ?? {}).map(([d, v]) => <ComparisonBar key={d} label={d} valueText={fmtMetric('wer', v)} width={Math.min(1, v / 25)} color={v < 5 ? GREEN : v < 10 ? BLUE : GOLD} />)}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Licence: {r.license ?? NA}</span>{isNum(r.languages) && <span>Languages: {r.languages}</span>}
                    {r.url && <a href={r.url} target="_blank" rel="noreferrer noopener" style={{ fontFamily: MONO, color: 'var(--muted)', textDecoration: 'none' }}>Model card ↗</a>}
                  </div>
                </div>
              )} />
          ) : (
            <Panel pad={mobile ? 12 : 18}>
              <Suspense fallback={<Skeleton height={420} />}>
                <ScatterChart points={points} xKey="rtfx" yKey="wer" xLog height={mobile ? 340 : 440} maxX maxY={false} emptyText="Hosted API models publish no RTFx, so only open models plot here."
                  tooltipExtra={p => [['Params', fmtMetric('paramsB', p.r.paramsB)], ['Licence', p.r.license ?? NA]]} />
              </Suspense>
              <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 10 }}>Bottom-right is best: low error, high throughput. RTFx is measured on the leaderboard's reference GPU and is only published for open models.</p>
            </Panel>
          )}
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 12, lineHeight: 1.55 }}>
            WER is averaged across {datasets.length || 8} English test sets with normalised transcripts. Pricing, streaming support and transcript latency are not published by the Open ASR Leaderboard, so those columns stay N/A rather than guessed.
          </p>
        </>
      )}

      {cat === 'tts' && (
        speech.tts.length ? <MediaLikeTable rows={speech.tts} kind="tts" mobile={mobile} /> : (
          <SchemaReady title="Text to speech" metrics={['ttsQuality', 'pricePer1mChars', 'ttft']} extra={['Characters / second', 'Provider', 'Language support']} note="Voice-quality ELO comes from the Artificial Analysis Speech Arena; this deployment has no AA key configured." />
        )
      )}
      {cat === 's2s' && (
        speech.s2s.length ? <MediaLikeTable rows={speech.s2s} kind="s2s" mobile={mobile} /> : (
          <SchemaReady title="Speech to speech" metrics={['ttsQuality', 'ttft']} extra={['Speech reasoning', 'Conversational dynamics', 'Agentic performance', 'Task success', 'Cost']} note="Speech-to-speech evaluations (Big Bench Audio, speech arena preference, time-to-first-audio) are an Artificial Analysis dataset; nothing is shown until the source is configured." />
        )
      )}
    </PageFrame>
  );
}

function SchemaReady({ title, metrics, extra, note }) {
  return (
    <Panel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <Unavailable what={`${title} quality`} />
        <div>
          <Label style={{ display: 'block', marginBottom: 8 }}>Columns ready for this data</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {metrics.map(k => <BadgeTag key={k} color="var(--muted)">{METRICS[k]?.label ?? k}</BadgeTag>)}
            {extra.map(k => <BadgeTag key={k} color="var(--muted2)">{k}</BadgeTag>)}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, marginTop: 10 }}>{note} Set <code style={{ fontFamily: MONO, fontSize: 11 }}>ARTIFICIAL_ANALYSIS_API_KEY</code> in the Netlify environment and these boards populate on the next refresh, with attribution.</p>
        </div>
      </div>
    </Panel>
  );
}

function MediaLikeTable({ rows, kind, mobile }) {
  const [sort, setSort] = useState({ key: 'elo', dir: 'desc' });
  const columns = useMemo(() => [
    { key: 'model', label: 'Model', sticky: true, width: mobile ? 200 : 280, value: r => r.rank ?? 999, defaultDir: 'asc', render: r => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><LabLogo org={r.org} size={14} /><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.name}</span><span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.org}</span></span> },
    { key: 'elo', label: 'Quality ELO', short: 'ELO', metricKey: 'ttsQuality', numeric: true, width: 80, value: r => r.elo, render: r => <span style={{ fontWeight: 700 }}>{fmtMetric('ttsQuality', r.elo)}</span> },
    { key: 'price', label: 'Price per 1M chars', short: '$/1M ch', metricKey: 'pricePer1mChars', numeric: true, width: 80, value: r => r.pricePer1mChars, render: r => fmtMetric('pricePer1mChars', r.pricePer1mChars) },
    { key: 'cps', label: 'Characters / s', short: 'Chars/s', numeric: true, width: 74, value: r => r.charsPerSecond, render: r => isNum(r.charsPerSecond) ? Math.round(r.charsPerSecond) : <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'ttft', label: 'Time to first audio', short: 'TTFA', metricKey: 'ttft', numeric: true, width: 74, value: r => r.ttft, render: r => fmtMetric('ttft', r.ttft) },
    { key: 'provider', label: 'Provider', width: 110, value: r => r.provider, render: r => r.provider ?? <span style={{ color: 'var(--muted2)' }}>{NA}</span> },
    { key: 'battle', label: '', width: 70, sortable: false, align: 'right', render: r => <AddToBattle item={{ id: r.modelId ?? r.id, kind, name: r.name, org: r.org }} /> },
  ], [mobile, kind]);
  return <DataTable columns={columns} rows={rows} visible={columns.map(c => c.key)} sort={sort} onSort={setSort} mobile={mobile} rowKey={r => r.modelId ?? r.id} />;
}
