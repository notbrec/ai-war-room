// ─── LAB — every organisation on the board gets a page ──────────────────────
// Read from the live datasets: how many models the lab fields, its smartest
// and best-rated ones, what they cost, where else it competes (image, video,
// voice), and every model in one table. Labs with a written profile
// (content/labs.js) get that analysis underneath.

import { useMemo, useState, useCallback } from 'react';
import { ORG_CONFIG } from '../models-data.js';
import { LAB_CONTENT } from '../content/labs.js';
import { ArticleSections } from '../components/ArticleLayout.jsx';
import { BarPanel } from '../components/Highlights.jsx';
import { fmtMetric, isNum, NA } from '../../shared/metrics.js';
import { useLLMs, useMedia, useSpeech } from '../data/useDomain.js';
import { topByIntelligence } from '../domains/models/ranking.js';
import { labSlug, orgForSlug } from '../domains/labs.js';
import { useLabStandings } from '../components/home/LabsPanel.jsx';
import { useDark, useMobile } from '../hooks/useTheme.js';
import { GlobalMotion, Skeleton } from '../components/design.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { DataStatus, StatTile, Btn, EmptyState, GREEN, GOLD, BLUE, PURPLE } from '../components/ui.jsx';
import { Board } from '../components/board.jsx';
import DataTable, { useColumnSelection, ColumnPicker } from '../components/table/DataTable.jsx';
import { llmColumns } from '../domains/models/columns.jsx';
import { setBattle } from '../domains/comparison/battleStore.js';

const LEGACY_SLUG = { anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', xai: 'xAI', meta: 'Meta', deepseek: 'DeepSeek' };

export default function LabPage({ slug, onNavigate }) {
  const mobile = useMobile();
  const dark = useDark();
  const llms = useLLMs(), media = useMedia(), speech = useSpeech();
  const content = LAB_CONTENT[slug];
  const org = orgForSlug(slug, llms.models) ?? LEGACY_SLUG[slug] ?? content?.name ?? null;
  const cfg = ORG_CONFIG[org] ?? { color: '#8E8E93' };
  const tint = cfg.color === '#FFFFFF' ? 'var(--text)' : cfg.color;

  const mine = useMemo(() => llms.models.filter(m => m.org === org), [llms.models, org]);
  const ranked = useMemo(() => mine.filter(m => m.inArena && isNum(m.arena?.elo)).sort((a, b) => a.arena.rank - b.arena.rank), [mine]);
  const smartest = useMemo(() => topByIntelligence(mine, 10), [mine]);
  const standings = useLabStandings(llms.models);
  const place = standings.findIndex(l => l.org === org) + 1;
  const cheapest = useMemo(() => [...smartest].filter(m => isNum(m.priceBlended) && m.priceBlended > 0).sort((a, b) => a.priceBlended - b.priceBlended)[0], [smartest]);
  const fastest = useMemo(() => [...mine].filter(m => isNum(m.aa?.speed)).sort((a, b) => b.aa.speed - a.aa.speed)[0], [mine]);
  const open = mine.filter(m => m.isOpen).length;

  // the lab on the other fronts
  const fronts = useMemo(() => {
    const out = [];
    const boards = [['text-to-image', 'Image', 'images'], ['image-edit', 'Image editing', 'images'], ['text-to-video', 'Video', 'videos'], ['image-to-video', 'Image to video', 'videos']];
    for (const [b, label, route] of boards) {
      const rows = (media.boards?.[b] ?? []).filter(r => r.org === org);
      if (rows.length) out.push({ label, route, n: rows.length, best: rows.reduce((x, y) => ((y.elo ?? 0) > (x.elo ?? 0) ? y : x)), unit: 'ELO' });
    }
    const tts = speech.tts.filter(r => r.org === org);
    if (tts.length) out.push({ label: 'Text to speech', route: 'speech', n: tts.length, best: tts.reduce((x, y) => ((y.elo ?? 0) > (x.elo ?? 0) ? y : x)), unit: 'ELO' });
    const stt = speech.stt.filter(r => r.org === org);
    if (stt.length) out.push({ label: 'Transcription', route: 'speech', n: stt.length, best: stt.reduce((x, y) => ((y.wer ?? 99) < (x.wer ?? 99) ? y : x)), unit: 'WER' });
    return out;
  }, [media.boards, speech.tts, speech.stt, org]);

  const openModel = useCallback(m => onNavigate({ type: 'model', slug: m.slug }), [onNavigate]);
  const columns = useMemo(() => llmColumns({ dark, onOpen: openModel, mobile, rankBy: 'intelligence' }), [dark, openModel, mobile]);
  const colSel = useColumnSelection('lab-models-v1', columns);
  const [sort, setSort] = useState({ key: 'intelligence', dir: 'desc' });
  const rows = useMemo(() => [...mine].sort((a, b) => (b.aa?.intelligence ?? -1) - (a.aa?.intelligence ?? -1) || (a.arena?.rank ?? 1e9) - (b.arena?.rank ?? 1e9)), [mine]);

  if (llms.loading && !llms.models.length) return <div className="aw-page"><Skeleton height={60} width="40%" style={{ marginBottom: 20 }} /><Skeleton height={300} /></div>;
  if (!org) {
    return (
      <div className="aw-page">
        <EmptyState title="Lab not found" body="No model on the board belongs to this organisation right now." action={<Btn small onClick={() => onNavigate('leaderboard')}>View the leaderboard →</Btn>} />
      </div>
    );
  }

  const top = smartest[0] ?? ranked[0];
  const headline = content?.headline ?? `${mine.length} model${mine.length === 1 ? '' : 's'} on the board${place ? ` · #${place} of ${standings.length} labs by its smartest model` : ''}.`;

  return (
    <div className="aw-page aw-labpage page-enter">
      <GlobalMotion />
      <header className="aw-lab-head">
        <span className="aw-lab-logo" style={{ borderColor: `${cfg.color}55` }}><LabLogo org={org} size={34} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="aw-board-eyebrow">Lab profile{place ? ` · #${place} of ${standings.length}` : ''}</div>
          <h1 className="aw-lab-h1">{org}</h1>
          <p className="aw-lab-sub">{headline}</p>
          <div className="aw-lab-meta">
            {content?.founded && <span>Founded {content.founded}</span>}
            {content?.headquarters && <span>{content.headquarters}</span>}
            <DataStatus status={llms.status} fetchedAt={llms.data?.fetchedAt} loading={llms.loading} compact />
          </div>
        </div>
        <div className="aw-lab-actions">
          {smartest.length >= 2 && <Btn small solid onClick={() => { setBattle(smartest.slice(0, 2).map(m => ({ id: m.id, kind: 'llm', name: m.name, org: m.org }))); onNavigate('compare'); }}>Battle its top two →</Btn>}
          <Btn small onClick={() => onNavigate('leaderboard')}>All labs on the leaderboard</Btn>
        </div>
      </header>

      <div className="aw-lab-stats">
        <StatTile label="Models on the board" value={mine.length} sub={`${ranked.length} arena-rated · ${open} open weights`} />
        <StatTile label="Smartest" metricKey="intelligence" value={top && isNum(top.aa?.intelligence) ? fmtMetric('intelligence', top.aa.intelligence) : NA} sub={top?.name ?? '—'} color={BLUE} />
        <StatTile label="Best arena rating" metricKey="elo" value={ranked[0] ? ranked[0].arena.elo : NA} sub={ranked[0] ? `${ranked[0].name} · #${ranked[0].arena.rank}` : 'Not rated on the arena yet'} color={GREEN} />
        <StatTile label="Cheapest of its best" metricKey="priceBlended" value={cheapest ? fmtMetric('priceBlended', cheapest.priceBlended) : NA} sub={cheapest ? `${cheapest.name} · per 1M` : 'No listed price'} color={GOLD} />
        <StatTile label="Fastest" metricKey="speed" value={fastest ? fmtMetric('speed', fastest.aa.speed) : NA} sub={fastest ? `${fastest.name} · tok/s` : 'Not measured'} color={PURPLE} />
      </div>

      <div className="aw-lab-grid">
        {smartest.length > 0 && (
          <div className="aw-lab-cell">
            <BarPanel title={`Smartest ${org} models`} subtitle="Intelligence Index · best effort level per model · Artificial Analysis" color={tint} limit={10}
              items={smartest.map(m => ({ id: m.id, name: m.name, org, value: m.aa.intelligence, label: fmtMetric('intelligence', m.aa.intelligence), slug: m.slug }))}
              onSelect={it => onNavigate({ type: 'model', slug: it.slug })} />
          </div>
        )}
        {ranked.length > 0 && (
          <div className="aw-lab-cell">
            <BarPanel title={`${org} on the arena`} subtitle="Arena ELO · blind human votes · arena.ai" color={tint} limit={10}
              items={ranked.slice(0, 10).map(m => ({ id: m.id, name: m.name, org, value: m.arena.elo, label: String(m.arena.elo), slug: m.slug }))}
              onSelect={it => onNavigate({ type: 'model', slug: it.slug })} />
          </div>
        )}
        <Board className="aw-lab-cell" eyebrow="Other fronts" title={fronts.length ? `${org} beyond language` : 'Language models only'}
          sub={fronts.length ? 'Where else this lab competes, and its best entry there' : 'No image, video or voice model from this lab is on those boards.'} flush>
          {fronts.map(f => (
            <div key={f.label} className="aw-list-row" role="link" tabIndex={0} onClick={() => onNavigate(f.route)} onKeyDown={e => e.key === 'Enter' && e.target === e.currentTarget && onNavigate(f.route)}>
              <span className="aw-list-main">
                <span className="aw-list-name">{f.label}</span>
                <span className="aw-list-detail">{f.n} model{f.n > 1 ? 's' : ''} · best: {f.best.name}</span>
              </span>
              <b className="aw-list-val">{f.unit === 'WER' ? fmtMetric('wer', f.best.wer) : Math.round(f.best.elo ?? 0)}<span style={{ color: 'var(--muted2)', fontSize: 10, marginLeft: 4 }}>{f.unit}</span></b>
            </div>
          ))}
          <div className="aw-lab-others">
            <span className="aw-board-eyebrow">Other labs</span>
            <div className="aw-lab-chips">
              {standings.filter(l => l.org !== org).slice(0, 14).map(l => (
                <button key={l.org} type="button" className="aw-chip" onClick={() => onNavigate({ type: 'lab', slug: labSlug(l.org) })}>
                  <LabLogo org={l.org} size={12} />{l.org}
                </button>
              ))}
            </div>
          </div>
        </Board>
      </div>

      <section className="aw-lab-table">
        <div className="aw-lab-table-head">
          <div>
            <div className="aw-board-eyebrow">Every model</div>
            <h2 className="aw-section-h2">{mine.length} {org} model{mine.length === 1 ? '' : 's'}, one table.</h2>
          </div>
          <ColumnPicker columns={columns} visible={colSel.visible} toggle={colSel.toggle} reset={colSel.reset} />
        </div>
        <DataTable columns={columns} rows={rows} visible={colSel.visible} sort={sort} onSort={setSort} mobile={mobile} rowKey={m => m.id}
          onRowClick={openModel} emptyText="No models from this lab right now" />
      </section>

      {content?.sections?.length > 0 && (
        <section className="aw-lab-story">
          <div className="aw-board-eyebrow">Analysis</div>
          <h2 className="aw-section-h2">The {org} story.</h2>
          <div className="aw-lab-prose"><ArticleSections sections={content.sections} /></div>
        </section>
      )}
    </div>
  );
}
