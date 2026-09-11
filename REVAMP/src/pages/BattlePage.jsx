// ─── BATTLE MODE — up to four contestants of one kind, metric by metric ─────

import { useMemo, useState } from 'react';
import { useMobile } from '../hooks/useTheme.js';
import { MONO, SF, EASE, GlobalMotion, Skeleton } from '../components/design.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { RobotMascot } from '../components/Robot.jsx';
import { ORG_CONFIG } from '../models-data.js';
import { useLLMs, useMedia, useSpeech, useCoding, useDomain } from '../data/useDomain.js';
import { useBattle, removeFromBattle, clearBattle, addToBattle, KIND_LABEL } from '../domains/comparison/battleStore.js';
import MediaBattle from '../domains/comparison/MediaBattle.jsx';
import { PageFrame, PageTitle, Panel, Label, Btn, Chip, EmptyState, BadgeTag, SourceTag, Segmented, GREEN, GOLD, RED, BLUE, PURPLE } from '../components/ui.jsx';
import { metric, fmtMetric, fmtDate, isNum, NA, normalise, extent } from '../../shared/metrics.js';

const SETS = {
  llm: [
    { g: 'Arena', rows: [['elo', m => m.arena?.elo], ['ci', m => m.arena?.ci], ['votes', m => m.arena?.votes], ['rank', m => m.arena?.rank, { label: 'Arena rank', higher: false, fmt: v => `#${v}` }]] },
    { g: 'Intelligence', rows: [['intelligence', m => m.aa?.intelligence], ['codingIndex', m => m.aa?.codingIndex], ['agenticIndex', m => m.aa?.agenticIndex]] },
    { g: 'Speed', rows: [['speed', m => m.aa?.speed], ['ttft', m => m.aa?.ttft], ['e2e', m => m.aa?.e2e]] },
    { g: 'Price', rows: [['priceIn', m => m.priceIn], ['priceOut', m => m.priceOut], ['priceBlended', m => m.priceBlended], ['priceCacheRead', m => m.priceCacheRead], ['priceCacheWrite', m => m.priceCacheWrite]] },
    { g: 'Capacity', rows: [['context', m => m.context], ['maxOutput', m => m.maxOutput]] },
    { g: 'Identity', rows: [['releaseDate', m => m.releaseDate, { text: true, fmt: fmtDate }], ['license', m => m.license, { text: true, label: 'Licence' }], ['reasoning', m => m.reasoningLevel ?? (m.supportsReasoning ? 'opt-in' : null), { text: true, label: 'Reasoning' }], ['modalities', m => m.modalities ? `${m.modalities.in.join('+')} → ${m.modalities.out.join('+')}` : null, { text: true, label: 'Modalities' }]] },
  ],
  image: [
    { g: 'Quality', rows: [['elo', m => m.elo], ['ci', m => m.ci], ['votes', m => m.votes], ['rank', m => m.rank, { label: 'Board rank', higher: false, fmt: v => `#${v}` }]] },
    { g: 'Speed & price', rows: [['genTime', m => m.genTime], ['pricePerImage', m => m.pricePerImage], ['pricePer1kImages', m => m.pricePer1kImages]] },
    { g: 'Identity', rows: [['releaseDate', m => m.releaseDate, { text: true, fmt: fmtDate }], ['license', m => m.license, { text: true, label: 'Licence' }], ['provider', m => m.provider, { text: true, label: 'API provider' }]] },
  ],
  video: [
    { g: 'Quality', rows: [['elo', m => m.elo], ['ci', m => m.ci], ['votes', m => m.votes], ['rank', m => m.rank, { label: 'Board rank', higher: false, fmt: v => `#${v}` }]] },
    { g: 'Speed & price', rows: [['genTime', m => m.genTime], ['pricePerSecond', m => m.pricePerSecond], ['pricePerMinute', m => m.pricePerMinute]] },
    { g: 'Output', rows: [['resolution', m => m.resolution, { text: true, label: 'Resolution' }], ['audio', m => m.hasAudio == null ? null : (m.hasAudio ? 'yes' : 'no'), { text: true, label: 'Audio' }], ['license', m => m.license, { text: true, label: 'Licence' }]] },
  ],
  stt: [
    { g: 'Accuracy', rows: [['wer', m => m.wer]] },
    { g: 'Speed & size', rows: [['rtfx', m => m.rtfx], ['paramsB', m => m.paramsB], ['languages', m => m.languages, { label: 'Languages', higher: true, fmt: v => String(v) }]] },
    { g: 'Identity', rows: [['license', m => m.license, { text: true, label: 'Licence' }]] },
  ],
  tts: [
    { g: 'Quality', rows: [['ttsQuality', m => m.elo], ['ci', m => m.ci]] },
    { g: 'Speed & price', rows: [['ttft', m => m.ttft, { label: 'Time to first audio' }], ['cps', m => m.charsPerSecond, { label: 'Characters / s', higher: true, fmt: v => Math.round(v) }], ['pricePer1mChars', m => m.pricePer1mChars]] },
    { g: 'Identity', rows: [['provider', m => m.provider, { text: true, label: 'Provider' }]] },
  ],
  coding: [
    { g: 'Performance', rows: [['resolved', m => m.resolved], ['rank', m => m.rank, { label: 'Board rank', higher: false, fmt: v => `#${v}` }]] },
    { g: 'Cost & effort', rows: [['costPerTask', m => m.costPerTask], ['callsPerTask', m => m.callsPerTask], ['totalCost', m => m.totalCost, { label: 'Total run cost', higher: false, fmt: v => `$${Math.round(v).toLocaleString()}` }]] },
    { g: 'Setup', rows: [['agent', m => m.agent, { text: true, label: 'Agent / harness' }], ['model', m => m.model, { text: true, label: 'Model' }], ['attempts', m => m.attempts, { text: true, label: 'Attempts' }], ['date', m => m.date, { text: true, label: 'Submitted', fmt: fmtDate }], ['checked', m => (m.checked ? 'verified' : 'self-reported'), { text: true, label: 'Logs' }]] },
  ],
};

export default function BattlePage({ onNavigate }) {
  const mobile = useMobile();
  const battle = useBattle();
  const llms = useLLMs(); const media = useMedia(); const speech = useSpeech(); const coding = useCoding(); const status = useDomain('status');
  const kind = battle.kind;
  const [pick, setPick] = useState('');

  const resolve = useMemo(() => {
    const mediaAll = Object.values(media.boards ?? {}).flat();
    const codingAll = Object.values(coding.boards ?? {}).flat();
    return item => {
      switch (item.kind) {
        case 'llm': return llms.models.find(m => m.id === item.id);
        case 'image': case 'video': return mediaAll.find(m => m.id === item.id && (!item.board || m.board === item.board)) ?? mediaAll.find(m => m.id === item.id);
        case 'stt': return speech.stt.find(m => m.id === item.id);
        case 'tts': return speech.tts.find(m => (m.modelId ?? m.id) === item.id);
        case 'coding': return codingAll.find(m => m.id === item.id);
        default: return null;
      }
    };
  }, [llms.models, media.boards, speech.stt, speech.tts, coding.boards]);

  const contestants = battle.items.map(i => ({ item: i, rec: resolve(i) }));
  const loading = (kind === 'llm' && llms.loading && !llms.models.length) || ((kind === 'image' || kind === 'video') && media.loading && !Object.keys(media.boards).length) || (kind === 'stt' && speech.loading && !speech.stt.length) || (kind === 'coding' && coding.loading && !Object.keys(coding.boards).length);
  const recs = contestants.map(c => c.rec).filter(Boolean);

  // Candidates for the picker (same kind)
  const candidates = useMemo(() => {
    switch (kind) {
      case 'llm': return llms.models.filter(m => m.inArena).slice(0, 150).map(m => ({ id: m.id, name: m.name, org: m.org }));
      case 'image': case 'video': return Object.values(media.boards ?? {}).flat().filter(m => m.kind === kind).map(m => ({ id: m.id, name: `${m.name} (${m.board})`, org: m.org, board: m.board }));
      case 'stt': return speech.stt.map(m => ({ id: m.id, name: m.name, org: m.org }));
      case 'coding': return (coding.boards?.Verified ?? []).map(m => ({ id: m.id, name: `${m.agent} + ${m.model}`, org: m.modelOrg, board: 'Verified' }));
      default: return [];
    }
  }, [kind, llms.models, media.boards, speech.stt, coding.boards]);

  const sets = SETS[kind] ?? [];
  const winnersCount = useMemo(() => {
    const counts = new Map(recs.map(r => [r, 0]));
    for (const g of sets) for (const [key, get, opt = {}] of g.rows) {
      if (opt.text) continue;
      const m = metric(key); const higher = opt.higher ?? m.higherIsBetter;
      if (higher == null) continue;
      const vals = recs.map(r => get(r)).filter(isNum);
      if (vals.length < 2) continue;
      const best = higher ? Math.max(...vals) : Math.min(...vals);
      for (const r of recs) if (get(r) === best) counts.set(r, counts.get(r) + 1);
    }
    return counts;
  }, [recs, sets]);
  const overall = recs.length ? [...winnersCount.entries()].sort((a, b) => b[1] - a[1])[0] : null;

  return (
    <PageFrame mobile={mobile} wide>
      <GlobalMotion />
      <PageTitle mobile={mobile} eyebrow="Battle Mode" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>Head to head. <RobotMascot variant="vs" size={mobile ? 32 : 44} color="var(--accent)" /></span>}
        subtitle="Up to four contestants of one kind, compared only on metrics that mean the same thing for all of them. Best value per row is marked; missing values stay N/A."
        right={battle.items.length > 0 && <Btn small onClick={clearBattle}>Clear battle</Btn>} />

      {!kind || battle.items.length === 0 ? (
        <EmptyState icon="⚔" title="No contestants yet" body="Press the BATTLE button on any row of the LLM rankings, Code Ops, Image / Video arenas or Voice Comms to add a contestant. Mixed kinds are refused — an image model can't fight a language model on meaningful metrics."
          action={<div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}><Btn small solid onClick={() => onNavigate('leaderboard')}>LLM rankings</Btn><Btn small onClick={() => onNavigate('images')}>Image arena</Btn><Btn small onClick={() => onNavigate('videos')}>Video arena</Btn><Btn small onClick={() => onNavigate('coding')}>Code Ops</Btn></div>} />
      ) : loading ? <Skeleton height={420} /> : (
        <>
          <Panel style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Label>{KIND_LABEL[kind]} battle · {battle.items.length}/4</Label>
              {contestants.map(c => <Chip key={c.item.id} active color={ORG_CONFIG[c.item.org]?.color ?? 'var(--text)'} label={`${c.item.name} ×`} onClick={() => removeFromBattle(c.item.id)} />)}
              {battle.items.length < 4 && candidates.length > 0 && (
                <select value={pick} onChange={e => { const c = candidates.find(x => x.id === e.target.value); if (c) addToBattle({ ...c, kind }); setPick(''); }} style={{ height: 30, paddingInline: 10, background: 'var(--card)', border: '0.5px solid var(--sep)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12.5, maxWidth: 280 }}>
                  <option value="">+ Add contestant…</option>
                  {candidates.filter(c => !battle.items.some(i => i.id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name} — {c.org}</option>)}
                </select>
              )}
            </div>
          </Panel>

          {contestants.some(c => !c.rec) && (
            <div style={{ marginBottom: 12, padding: '8px 12px', border: `0.5px solid ${GOLD}`, fontSize: 12, color: 'var(--muted)' }}>
              {contestants.filter(c => !c.rec).map(c => c.item.name).join(', ')}: not found in the current dataset (renamed or removed upstream). Remove it to keep the comparison clean.
            </div>
          )}

          {recs.length >= 2 && (kind === 'image' || kind === 'video') && (
            <div style={{ marginBottom: 16 }}>
              <MediaBattle kind={kind} roster={recs} candidates={Object.values(media.boards ?? {}).flat().filter(m => m.kind === kind)} priceKey={kind === 'image' ? 'pricePerImage' : 'pricePerSecond'} mobile={mobile} liveBattle={!!status.data?.capabilities?.liveBattle}
                onAdd={r => addToBattle({ id: r.id, kind, name: r.name, org: r.org, board: r.board })} onRemove={removeFromBattle} onClear={clearBattle} />
            </div>
          )}

          {recs.length >= 2 ? (
            <>
              {/* Header cards */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${recs.length}, 1fr)`, gap: 8, marginBottom: 10 }}>
                {recs.map((r, i) => {
                  const nm = r.name ?? `${r.agent} + ${r.model}`;
                  const org = r.org ?? r.modelOrg;
                  const wins = winnersCount.get(r) ?? 0;
                  const isOverall = overall && overall[0] === r && overall[1] > 0;
                  return (
                    <div key={i} style={{ background: 'var(--card)', border: `0.5px solid ${isOverall ? GREEN : 'var(--sep)'}`, borderTop: `2px solid ${ORG_CONFIG[org]?.color ?? 'var(--text)'}`, padding: mobile ? '8px 8px' : '12px 14px', minWidth: 0, animation: `aiwar-fade-up 500ms ${EASE} ${i * 70}ms both` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Label>{String.fromCharCode(65 + i)}</Label>{isOverall && <BadgeTag color={GREEN}>Most wins</BadgeTag>}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>{!mobile && <LabLogo org={org} size={14} />}<span style={{ fontSize: mobile ? 12 : 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.025em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nm}</span></div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{org} · <span style={{ fontFamily: MONO }}>{wins} row win{wins === 1 ? '' : 's'}</span></div>
                      {kind === 'llm' && <div style={{ marginTop: 6 }}><Btn small onClick={() => onNavigate({ type: 'model', slug: r.slug })}>Profile →</Btn></div>}
                    </div>
                  );
                })}
              </div>

              {/* Matrix */}
              <Panel pad={0}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 140 + recs.length * 120, fontFamily: SF }}>
                    <tbody>
                      {sets.map(g => (
                        <GroupRows key={g.g} group={g} recs={recs} mobile={mobile} />
                      ))}
                      {kind === 'llm' && <BenchRows recs={recs} mobile={mobile} />}
                      {kind === 'stt' && <DatasetRows recs={recs} mobile={mobile} />}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 10, lineHeight: 1.5 }}>
                Green = best in the row (direction from the metric's definition), red = worst. A row needs at least two known values to have a winner. Sources: {[...new Set(recs.flatMap(r => r.sources ?? []))].join(', ') || 'see each board'}.
              </p>
            </>
          ) : <EmptyState title="Add one more" body="A battle needs at least two contestants." />}
        </>
      )}
    </PageFrame>
  );
}

function Cell({ v, best, worst, mobile }) {
  return (
    <td style={{ padding: mobile ? '7px 8px' : '8px 12px', textAlign: 'right', borderBottom: '0.5px solid var(--sep2)', fontFamily: MONO, fontSize: mobile ? 12 : 13, fontVariantNumeric: 'tabular-nums',
      color: v === NA ? 'var(--muted2)' : best ? GREEN : worst ? RED : 'var(--text)', fontWeight: best ? 700 : 500, background: best ? `${GREEN}0e` : 'transparent', whiteSpace: 'nowrap' }}>{v}</td>
  );
}
function LabelCell({ children, mobile, metricKey }) {
  const m = metricKey ? metric(metricKey) : null;
  return (
    <td style={{ position: 'sticky', left: 0, background: 'var(--card)', padding: mobile ? '7px 8px' : '8px 12px', borderBottom: '0.5px solid var(--sep2)', borderRight: '0.5px solid var(--sep)', fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', zIndex: 1 }}>
      {children}{m && m.higherIsBetter != null && <span style={{ fontFamily: MONO, fontSize: 9, color: 'var(--muted2)', marginLeft: 6 }}>{m.higherIsBetter ? '▲' : '▼'}</span>}
    </td>
  );
}
function GroupHeader({ children, span }) {
  return <tr><td colSpan={span} style={{ padding: '10px 12px 4px', borderBottom: '0.5px solid var(--sep)' }}><Label>{children}</Label></td></tr>;
}

function GroupRows({ group, recs, mobile }) {
  return (
    <>
      <GroupHeader span={recs.length + 1}>{group.g}</GroupHeader>
      {group.rows.map(([key, get, opt = {}]) => {
        const m = metric(key);
        const label = opt.label ?? m.label;
        const vals = recs.map(get);
        const nums = vals.filter(isNum);
        const higher = opt.higher ?? m.higherIsBetter;
        const best = !opt.text && higher != null && nums.length >= 2 ? (higher ? Math.max(...nums) : Math.min(...nums)) : null;
        const worst = !opt.text && higher != null && nums.length >= 2 ? (higher ? Math.min(...nums) : Math.max(...nums)) : null;
        if (vals.every(v => v == null)) return null;
        return (
          <tr key={key}>
            <LabelCell mobile={mobile} metricKey={opt.text || opt.label ? null : key}>{label}</LabelCell>
            {vals.map((v, i) => <Cell key={i} mobile={mobile} v={v == null ? NA : opt.fmt ? opt.fmt(v) : opt.text ? String(v) : fmtMetric(key, v)} best={best != null && v === best && best !== worst} worst={worst != null && v === worst && best !== worst} />)}
          </tr>
        );
      })}
    </>
  );
}

function BenchRows({ recs, mobile }) {
  const keys = [...new Set(recs.flatMap(r => Object.keys(r.aa?.benchmarks ?? {})))].sort();
  if (!keys.length) return null;
  return (
    <>
      <GroupHeader span={recs.length + 1}>Benchmarks · Artificial Analysis</GroupHeader>
      {keys.map(k => {
        const vals = recs.map(r => r.aa?.benchmarks?.[k] ?? null);
        const nums = vals.filter(isNum);
        const best = nums.length >= 2 ? Math.max(...nums) : null, worst = nums.length >= 2 ? Math.min(...nums) : null;
        return (
          <tr key={k}>
            <LabelCell mobile={mobile}>{k.replace(/_/g, ' ')}</LabelCell>
            {vals.map((v, i) => <Cell key={i} mobile={mobile} v={isNum(v) ? (v <= 1 ? `${(v * 100).toFixed(1)}%` : v.toFixed(1)) : NA} best={best != null && v === best && best !== worst} worst={worst != null && v === worst && best !== worst} />)}
          </tr>
        );
      })}
    </>
  );
}

function DatasetRows({ recs, mobile }) {
  const keys = [...new Set(recs.flatMap(r => Object.keys(r.perDataset ?? {})))];
  if (!keys.length) return null;
  return (
    <>
      <GroupHeader span={recs.length + 1}>WER by test set · lower is better</GroupHeader>
      {keys.map(k => {
        const vals = recs.map(r => r.perDataset?.[k] ?? null);
        const nums = vals.filter(isNum);
        const best = nums.length >= 2 ? Math.min(...nums) : null, worst = nums.length >= 2 ? Math.max(...nums) : null;
        return (
          <tr key={k}>
            <LabelCell mobile={mobile}>{k}</LabelCell>
            {vals.map((v, i) => <Cell key={i} mobile={mobile} v={fmtMetric('wer', v)} best={best != null && v === best && best !== worst} worst={worst != null && v === worst && best !== worst} />)}
          </tr>
        );
      })}
    </>
  );
}
