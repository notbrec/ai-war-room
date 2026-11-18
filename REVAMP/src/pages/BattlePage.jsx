// ─── BATTLE MODE — up to four contestants of one kind, metric by metric ─────
// The page never opens empty: with no roster it stages the featured bout (the
// two at the top of the chosen board) with the full comparison already
// drawn. The first change — swapping a contestant, adding a third, loading a
// matchup — turns that into the visitor's own roster, kept across visits.
//
// Reading order: who is fighting (cards) → who is ahead and where (verdict) →
// every row (matrix). One row definition feeds the tally and the table, so
// the score in the verdict is exactly the rows marked below it.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMobile } from '../hooks/useTheme.js';
import { MONO, SF, EASE, GlobalMotion, Skeleton } from '../components/design.jsx';
import { LabLogo } from '../components/LabLogo.jsx';
import { RobotMascot } from '../components/Robot.jsx';
import { ORG_CONFIG } from '../models-data.js';
import { useLLMs, useMedia, useSpeech, useCoding, useDomain } from '../data/useDomain.js';
import { topByIntelligence } from '../domains/models/ranking.js';
import { useBattle, removeFromBattle, clearBattle, addToBattle, setBattle, KIND_LABEL } from '../domains/comparison/battleStore.js';
import MediaBattle from '../domains/comparison/MediaBattle.jsx';
import AudioLanes from '../domains/comparison/AudioLanes.jsx';
import { useSamples, attachSamples } from '../data/samples.js';
import { useFitsWidth } from '../components/table/DataTable.jsx';
import { PageFrame, PageTitle, Panel, Label, Btn, Chip, BadgeTag, Segmented, GREEN, GOLD } from '../components/ui.jsx';
import { metric, fmtMetric, fmtDate, isNum, NA } from '../../shared/metrics.js';
import { aaBenchmarkInfo } from '../domains/benchmarks/registry.js';

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

const KIND_TAB = { llm: 'LLMs', image: 'Image', video: 'Video', stt: 'Transcription', tts: 'Voices', coding: 'Coding agents' };
const KIND_WORD = { llm: 'language models', image: 'image models', video: 'video models', stt: 'transcription models', tts: 'voices', coding: 'coding agents' };
const LETTER = i => String.fromCharCode(65 + i);
const labColor = org => { const c = ORG_CONFIG[org]?.color; return !c || /^#f{3,6}$/i.test(c) ? 'var(--text)' : c; };
const recName = r => r.name ?? `${r.agent} + ${r.model}`;
const recOrg = r => r.org ?? r.modelOrg;

/** The record → roster item for each kind. */
function toItem(kind, r) {
  switch (kind) {
    case 'image': case 'video': return { id: r.id, kind, name: r.name, org: r.org, board: r.board };
    case 'tts': return { id: r.modelId ?? r.id, kind, name: r.name, org: r.org };
    case 'coding': return { id: r.id, kind, name: `${r.agent} + ${r.model}`, org: r.modelOrg, board: r.board ?? 'Verified' };
    default: return { id: r.id, kind, name: r.name, org: r.org };
  }
}

/** The one number a contestant card leads with. */
function headline(kind, r) {
  if (kind === 'llm') return isNum(r.aa?.intelligence) ? [fmtMetric('intelligence', r.aa.intelligence), 'Intelligence'] : [r.arena?.elo ?? NA, 'Arena ELO'];
  if (kind === 'stt') return [fmtMetric('wer', r.wer), 'Word error rate'];
  if (kind === 'coding') return [fmtMetric('resolved', r.resolved), 'SWE-bench solved'];
  return [isNum(r.elo) ? Math.round(r.elo) : NA, 'Quality ELO'];
}

/** Every comparable row for these contestants, grouped; one source for the tally and the table. */
function buildGroups(kind, recs) {
  const out = [];
  const finish = row => {
    const nums = row.vals.filter(isNum);
    const lo = Math.min(...nums), hi = Math.max(...nums);
    row.decided = row.higher != null && nums.length >= 2 && hi !== lo;
    row.best = row.decided ? (row.higher ? hi : lo) : null;
    // bar = how close to the row's best (1 = the best); only on a scale that starts at zero
    row.share = row.vals.map(v => {
      if (row.higher == null || !isNum(v) || nums.length < 2 || lo <= 0) return null;
      return row.higher ? v / hi : lo / v;
    });
    return row;
  };
  for (const g of SETS[kind] ?? []) {
    const rows = [];
    for (const [key, get, opt = {}] of g.rows) {
      const m = metric(key);
      const vals = recs.map(get).map(v => (v === undefined ? null : v));
      if (vals.every(v => v == null)) continue;
      rows.push(finish({
        key, label: opt.label ?? m.label, vals, higher: opt.text ? null : (opt.higher ?? m.higherIsBetter ?? null),
        arrow: !(opt.text || opt.label), fmt: v => (v == null ? NA : opt.fmt ? opt.fmt(v) : opt.text ? String(v) : fmtMetric(key, v)),
      }));
    }
    if (rows.length) out.push({ g: g.g, rows });
  }
  if (kind === 'llm') {
    const keys = [...new Set(recs.flatMap(r => Object.keys(r.aa?.benchmarks ?? {})))];
    const rows = keys.map(k => {
      const info = aaBenchmarkInfo(k);
      const vals = recs.map(r => (isNum(r.aa?.benchmarks?.[k]) ? r.aa.benchmarks[k] : null));
      return finish({ key: `bench:${k}`, label: info.label, benchId: info.id, vals, higher: true, arrow: false,
        fmt: v => (!isNum(v) ? NA : info.unit === 'Elo' ? String(Math.round(v)) : v <= 1 ? `${(v * 100).toFixed(1)}%` : v.toFixed(1)) });
    }).filter(r => r.vals.some(isNum)).sort((a, b) => a.label.localeCompare(b.label));
    if (rows.length) out.push({ g: 'Benchmarks', note: 'Artificial Analysis', rows });
  }
  if (kind === 'stt') {
    const keys = [...new Set(recs.flatMap(r => Object.keys(r.perDataset ?? {})))];
    const rows = keys.map(k => finish({ key: `set:${k}`, label: k, vals: recs.map(r => r.perDataset?.[k] ?? null), higher: false, arrow: false, fmt: v => fmtMetric('wer', v) }));
    if (rows.length) out.push({ g: 'WER by test set', note: 'lower is better', rows });
  }
  // wins per contestant, per group and overall (a tie credits everyone on the best value)
  let decided = 0;
  const wins = recs.map(() => 0);
  for (const g of out) {
    g.wins = recs.map(() => 0); g.decided = 0;
    for (const r of g.rows) {
      if (!r.decided) continue;
      g.decided++; decided++;
      r.vals.forEach((v, i) => { if (v === r.best) { g.wins[i]++; wins[i]++; } });
    }
  }
  return { groups: out, wins, decided };
}

/* ── search-and-add, in the empty slot ───────────────────────────────────── */
function AddSlot({ candidates, onAdd, mobile, slotsLeft, kind }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const ref = useRef(null);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? candidates.filter(c => `${c.name} ${c.org ?? ''}`.toLowerCase().includes(s)) : candidates).slice(0, 7);
  }, [q, candidates]);
  useEffect(() => { setCursor(0); }, [q]);
  useEffect(() => {
    if (!open) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  const choose = c => { onAdd(c); setQ(''); setOpen(false); };
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setCursor(c => Math.min(results.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
    else if (e.key === 'Enter' && results[cursor]) { e.preventDefault(); choose(results[cursor]); }
    else if (e.key === 'Escape') setOpen(false);
  };
  return (
    <div ref={ref} style={{ border: `1px dashed ${open ? 'var(--muted)' : 'var(--sep)'}`, padding: mobile ? '12px 12px' : '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, minWidth: 0, minHeight: mobile ? undefined : 150, transition: 'border-color 160ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <Label color="var(--muted)">Add a contestant</Label>
        <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted2)' }}>{slotsLeft} slot{slotsLeft === 1 ? '' : 's'} left</span>
      </div>
      <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, paddingInline: 10, background: 'var(--bg)', border: `0.5px solid ${open ? 'var(--text)' : 'var(--sep)'}` }}>
        <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--muted2)' }}>+</span>
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey} aria-label="Search for a contestant"
          placeholder={`Search ${KIND_WORD[kind] ?? 'models'}…`} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--text)', fontFamily: SF, letterSpacing: '-0.01em' }} />
      </div>
      {open && results.length > 0 && (
        <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, minWidth: 260, zIndex: 60, background: 'var(--card)', border: '0.5px solid var(--text)', boxShadow: 'var(--shadow)', padding: 4, animation: `aiwar-pop-in 200ms ${EASE} both` }}>
          {!q.trim() && <div style={{ padding: '5px 9px 4px' }}><Label>Top of the board</Label></div>}
          {results.map((c, i) => (
            <button key={`${c.id}|${c.board ?? ''}`} role="option" aria-selected={i === cursor} onMouseEnter={() => setCursor(i)} onClick={() => choose(c)} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 9px', background: i === cursor ? 'var(--hover)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: SF }}>
              <LabLogo org={c.org} size={13} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>{c.name}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{c.hint ?? c.org}</span>
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

/* ── one contestant ──────────────────────────────────────────────────────── */
function ContestantCard({ i, rec, kind, wins, decided, leads, onRemove, onProfile, mobile }) {
  const org = recOrg(rec), color = labColor(org);
  const [value, unit] = headline(kind, rec);
  return (
    <div className="aiwar-surface" style={{ position: 'relative', borderTop: `2px solid ${color}`, padding: mobile ? '10px 12px 12px' : '14px 16px 16px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: mobile ? 8 : 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: 'var(--bg)', background: color, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{LETTER(i)}</span>
        {leads && <BadgeTag color={GREEN}>Leads</BadgeTag>}
        <button onClick={onRemove} aria-label={`Remove ${recName(rec)}`} title="Remove" className="aiwar-press-btn" style={{ marginLeft: 'auto', width: 24, height: 24, background: 'none', border: '0.5px solid transparent', color: 'var(--muted2)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <LabLogo org={org} size={mobile ? 15 : 18} />
          <span style={{ fontSize: mobile ? 14 : 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere' }}>{recName(rec)}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{org}{rec.board && kind !== 'coding' ? ` · ${rec.board.replace(/-/g, ' ')}` : ''}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 'auto' }}>
        <span style={{ fontFamily: MONO, fontSize: mobile ? 22 : 28, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, color: 'var(--muted2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{unit}</span>
      </div>
      <div>
        <div style={{ position: 'relative', height: 3, background: 'var(--sep)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${decided ? (wins / decided) * 100 : 0}%`, background: leads ? GREEN : color, transition: `width 400ms ${EASE}` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 7 }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}><b style={{ color: 'var(--text)' }}>{wins}</b> of {decided} rows</span>
          {onProfile && <button onClick={onProfile} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: 'var(--muted)' }}>PROFILE →</button>}
        </div>
      </div>
    </div>
  );
}

/* ── who is ahead, and where ─────────────────────────────────────────────── */
function Verdict({ recs, tally, mobile, onJump }) {
  const { wins, decided, groups } = tally;
  const max = Math.max(...wins);
  const leaders = wins.map((w, i) => (w === max ? i : -1)).filter(i => i >= 0);
  const lead = leaders.length === 1 && max > 0 ? leaders[0] : null;
  const total = wins.reduce((a, b) => a + b, 0) || 1;
  const rest = [...wins].sort((a, b) => b - a)[1] ?? 0;
  return (
    <Panel pad={mobile ? 14 : 18} style={{ marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'minmax(0, 5fr) minmax(0, 7fr)', gap: mobile ? 14 : 28, alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <Label>Verdict</Label>
          <div style={{ fontSize: mobile ? 19 : 23, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.15, color: 'var(--text)', marginTop: 6 }}>
            {decided === 0 ? 'Not enough shared data to call it.' : lead != null
              ? <>{recName(recs[lead])} leads{recs.length === 2 ? <span style={{ fontFamily: MONO, fontWeight: 700, letterSpacing: '-0.02em', color: GREEN }}> {max}–{rest}</span> : null}.</>
              : <>Dead level at the top{recs.length === 2 ? <span style={{ fontFamily: MONO, color: GOLD }}> {max}–{rest}</span> : null}.</>}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
            {decided > 0 ? `Rows won out of ${decided} where at least two have a value and they differ. A count of rows, not a weighted score — weigh the rows that matter to you.` : 'A row needs a value from at least two contestants.'}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 2, height: 26 }}>
            {recs.map((r, i) => wins[i] > 0 && (
              <div key={i} title={`${recName(r)} · ${wins[i]} rows`} style={{ flex: `${wins[i]} 1 0`, minWidth: 34, background: labColor(recOrg(r)), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: MONO, fontSize: 12, fontWeight: 700, color: 'var(--bg)', opacity: lead == null || lead === i ? 1 : 0.6, transition: `flex-grow 400ms ${EASE}` }}>
                {LETTER(i)}<span>{wins[i]}</span>
              </div>
            ))}
            {decided === 0 && <div style={{ flex: 1, background: 'var(--sep)' }} />}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            {groups.filter(g => g.decided > 0).map(g => {
              const gm = Math.max(...g.wins);
              const top = g.wins.map((w, i) => (w === gm ? i : -1)).filter(i => i >= 0);
              const one = top.length === 1 ? top[0] : null;
              return (
                <button key={g.g} onClick={() => onJump(g.g)} className="aiwar-press-btn" title={recs.map((r, i) => `${LETTER(i)} ${g.wins[i]}`).join(' · ')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 26, padding: '0 9px 0 8px', background: 'transparent', border: '0.5px solid var(--sep)', cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  <span data-round="1" style={{ width: 6, height: 6, background: one != null ? labColor(recOrg(recs[one])) : 'var(--muted2)' }} />
                  {g.g}
                  <b style={{ color: 'var(--text)' }}>{one != null ? LETTER(one) : 'TIE'}</b>
                  <span style={{ color: 'var(--muted2)' }}>{[...g.wins].sort((a, b) => b - a).slice(0, 2).join('–')}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ── two contestants on a wide screen: the tale of the tape ──────────────────
   The metric runs down the middle and each side's bar grows outward from it,
   so the two numbers sit next to each other and the longer bar is the better
   one in every row, whatever the metric's direction. */
function TapeSide({ row, i, color }) {
  const v = row.vals[i], left = i === 0;
  const best = row.decided && v === row.best;
  const share = row.share[i];
  const text = row.higher == null;
  const value = (
    <span style={{ fontFamily: text ? SF : MONO, fontSize: text ? 12.5 : 14, fontVariantNumeric: 'tabular-nums', fontWeight: best ? 700 : 500, letterSpacing: text ? '-0.01em' : '-0.02em',
      color: v == null ? 'var(--muted2)' : text ? 'var(--muted)' : 'var(--text)', whiteSpace: text ? 'normal' : 'nowrap', minWidth: text ? 0 : 76, flexShrink: text ? 1 : 0,
      display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end', flexDirection: left ? 'row' : 'row-reverse', textAlign: left ? 'right' : 'left' }}>
      {best && <span data-round="1" aria-label="best in row" style={{ width: 6, height: 6, background: GREEN, flexShrink: 0 }} />}
      <span>{row.fmt(v)}</span>
    </span>
  );
  const track = text ? <span style={{ flex: 1 }} /> : (
    <span aria-hidden style={{ position: 'relative', flex: 1, height: 6, background: share != null ? 'var(--sep2)' : 'transparent' }}>
      {share != null && <span style={{ position: 'absolute', top: 0, bottom: 0, [left ? 'right' : 'left']: 0, width: `${Math.max(1.5, Math.min(1, share) * 100)}%`, background: color, opacity: !row.decided ? 0.5 : best ? 1 : 0.34, transition: `width 400ms ${EASE}` }} />}
    </span>
  );
  return <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: left ? '0 18px 0 20px' : '0 20px 0 18px', minWidth: 0, justifyContent: left ? 'flex-end' : 'flex-start' }}>{left ? <>{track}{value}</> : <>{value}{track}</>}</div>;
}

function Tape({ recs, tally, onNavigate }) {
  const colors = recs.map(r => labColor(recOrg(r)));
  const grid = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 236px minmax(0, 1fr)', alignItems: 'center' };
  return (
    <div className="aiwar-surface">
      <div style={{ ...grid, position: 'sticky', top: 'var(--nav-h, 0px)', zIndex: 4, background: 'var(--th-bg)', borderBottom: '1px solid var(--sep)', padding: '11px 0' }}>
        {recs.map((r, i) => (
          <div key={i} style={{ order: i === 0 ? 0 : 2, display: 'flex', alignItems: 'center', gap: 9, padding: '0 20px', justifyContent: 'flex-end', flexDirection: i === 0 ? 'row' : 'row-reverse', minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recName(r)}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: 'var(--bg)', background: colors[i], width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{LETTER(i)}</span>
          </div>
        ))}
        <div style={{ order: 1, textAlign: 'center' }}><Label>Metric</Label></div>
      </div>
      {tally.groups.map((g, gi) => (
        <div key={g.g} id={`battle-${g.g.replace(/\W+/g, '-').toLowerCase()}`} style={{ scrollMarginTop: 150 }}>
          <div style={{ ...grid, background: 'var(--th-bg2)', borderTop: gi ? '0.5px solid var(--sep)' : 'none', borderBottom: '0.5px solid var(--sep)', padding: '9px 0 7px' }}>
            {[0, 1].map(i => (
              <div key={i} style={{ order: i === 0 ? 0 : 2, padding: '0 20px', textAlign: i === 0 ? 'right' : 'left', fontFamily: MONO, fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.04em' }}>
                {g.decided > 0 && <><b style={{ color: g.wins[i] > g.wins[1 - i] ? 'var(--text)' : 'var(--muted)' }}>{g.wins[i]}</b> / {g.decided}</>}
              </div>
            ))}
            <div style={{ order: 1, textAlign: 'center', whiteSpace: 'nowrap' }}><Label color="var(--text)">{g.g}</Label></div>
          </div>
          {g.rows.map((row, ri) => (
            <div key={row.key} className="aiwar-bt-row" style={{ ...grid, minHeight: 40, padding: '8px 0', borderBottom: ri === g.rows.length - 1 ? 'none' : '0.5px solid var(--sep2)' }}>
              <TapeSide row={row} i={0} color={colors[0]} />
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text)', letterSpacing: '-0.01em', padding: '0 6px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.benchId
                  ? <a href={`#/benchmarks/${row.benchId}`} onClick={e => { e.preventDefault(); onNavigate({ type: 'benchmarks', slug: row.benchId }); }} style={{ color: 'inherit', textDecoration: 'none' }} title="Open the full ranking">{row.label}</a>
                  : row.label}
                {row.arrow && row.higher != null && <span title={row.higher ? 'Higher is better' : 'Lower is better'} style={{ fontFamily: MONO, fontSize: 8.5, color: 'var(--muted2)', marginLeft: 6 }}>{row.higher ? '▲' : '▼'}</span>}
              </div>
              <TapeSide row={row} i={1} color={colors[1]} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── the rows ────────────────────────────────────────────────────────────── */
function Matrix({ recs, tally, mobile, onNavigate }) {
  const wrapRef = useRef(null), tableRef = useRef(null);
  const fits = useFitsWidth(wrapRef, tableRef, [recs.length, mobile]);
  const labelW = mobile ? 132 : 220;
  const cell = { padding: mobile ? '8px 10px 9px' : '9px 16px 10px', borderBottom: '0.5px solid var(--sep2)' };
  return (
    <div className="aiwar-surface" style={{ position: 'relative' }}>
      <div ref={wrapRef} style={{ overflowX: fits ? 'visible' : 'auto', overscrollBehaviorX: fits ? undefined : 'contain' }}>
        <table ref={tableRef} style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: labelW + recs.length * (mobile ? 108 : 150), fontFamily: SF, tableLayout: 'fixed' }}>
          <colgroup><col style={{ width: labelW }} />{recs.map((_, i) => <col key={i} />)}</colgroup>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, top: fits ? 'var(--nav-h, 0px)' : undefined, zIndex: 5, background: 'var(--th-bg)', borderBottom: '1px solid var(--sep)', borderRight: '0.5px solid var(--sep)', padding: mobile ? '9px 10px' : '11px 16px', textAlign: 'left' }}><Label>Metric</Label></th>
              {recs.map((r, i) => (
                <th key={i} style={{ position: fits ? 'sticky' : undefined, top: fits ? 'var(--nav-h, 0px)' : undefined, zIndex: 3, background: 'var(--th-bg)', borderBottom: '1px solid var(--sep)', padding: mobile ? '9px 10px' : '11px 16px', textAlign: 'right', fontWeight: 600 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, maxWidth: '100%', minWidth: 0 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: 'var(--bg)', background: labColor(recOrg(r)), width: 17, height: 17, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{LETTER(i)}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recName(r)}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tally.groups.map(g => (
              <GroupBlock key={g.g} g={g} recs={recs} cell={cell} mobile={mobile} onNavigate={onNavigate} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupBlock({ g, recs, cell, mobile, onNavigate }) {
  return (
    <>
      <tr id={`battle-${g.g.replace(/\W+/g, '-').toLowerCase()}`} style={{ scrollMarginTop: 150 }}>
        <td style={{ position: 'sticky', left: 0, zIndex: 1, padding: mobile ? '9px 10px 7px' : '11px 16px 8px', background: 'var(--th-bg2)', borderBottom: '0.5px solid var(--sep)', borderTop: '0.5px solid var(--sep)', whiteSpace: 'nowrap' }}>
          <Label color="var(--text)">{g.g}</Label>{g.note && !mobile && <span style={{ fontFamily: MONO, fontSize: 9.5, color: 'var(--muted2)', marginLeft: 8, letterSpacing: '0.04em' }}>{g.note}</span>}
        </td>
        {recs.map((_, i) => (
          <td key={i} style={{ padding: mobile ? '9px 10px 7px' : '11px 16px 8px', background: 'var(--th-bg2)', borderBottom: '0.5px solid var(--sep)', borderTop: '0.5px solid var(--sep)', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.04em' }}>
            {g.decided > 0 ? <><b style={{ color: g.wins[i] === Math.max(...g.wins) && g.wins[i] > 0 ? 'var(--text)' : 'var(--muted)' }}>{g.wins[i]}</b> / {g.decided}</> : ''}
          </td>
        ))}
      </tr>
      {g.rows.map(row => (
        <tr key={row.key} className="aiwar-bt-row">
          <td style={{ ...cell, position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface-bot)', borderRight: '0.5px solid var(--sep)', fontSize: mobile ? 12 : 13, color: 'var(--text)', letterSpacing: '-0.01em', verticalAlign: 'top' }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
              {row.benchId
                ? <a href={`#/benchmarks/${row.benchId}`} onClick={e => { e.preventDefault(); onNavigate({ type: 'benchmarks', slug: row.benchId }); }} style={{ color: 'inherit', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="Open the full ranking">{row.label}</a>
                : <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</span>}
              {row.arrow && row.higher != null && <span title={row.higher ? 'Higher is better' : 'Lower is better'} style={{ fontFamily: MONO, fontSize: 8.5, color: 'var(--muted2)', flexShrink: 0 }}>{row.higher ? '▲' : '▼'}</span>}
            </span>
          </td>
          {row.vals.map((v, i) => {
            const best = row.decided && v === row.best;
            const share = row.share[i];
            const text = row.higher == null;
            return (
              <td key={i} style={{ ...cell, textAlign: 'right', background: best ? `${GREEN}12` : undefined, verticalAlign: 'top' }}>
                <div style={{ fontFamily: text ? SF : MONO, fontSize: text ? 12.5 : (mobile ? 12.5 : 13.5), fontVariantNumeric: 'tabular-nums', fontWeight: best ? 700 : 500, color: v == null ? 'var(--muted2)' : text ? 'var(--muted)' : 'var(--text)', whiteSpace: text ? 'normal' : 'nowrap', overflowWrap: 'anywhere', lineHeight: 1.35 }}>
                  {best && <span data-round="1" aria-label="best in row" style={{ display: 'inline-block', width: 6, height: 6, background: GREEN, marginRight: 7, verticalAlign: 'middle', position: 'relative', top: -1 }} />}
                  {row.fmt(v)}
                </div>
                {share != null && (
                  <div aria-hidden style={{ position: 'relative', height: 2, background: 'var(--sep)', marginTop: 6 }}>
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${Math.max(2, Math.min(1, share) * 100)}%`, background: best ? GREEN : 'var(--text)', opacity: best ? 1 : 0.32 }} />
                  </div>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

export default function BattlePage({ onNavigate }) {
  const mobile = useMobile();
  const battle = useBattle();
  const llms = useLLMs(); const media = useMedia(); const speech = useSpeech(); const coding = useCoding(); const status = useDomain('status');
  const samples = useSamples();
  const [previewKind, setPreviewKind] = useState('llm');

  // every contestant a kind can field, in board order
  const pools = useMemo(() => {
    const seen = new Set();
    const mediaAll = Object.values(media.boards ?? {}).flat();
    return {
      llm: [...topByIntelligence(llms.models, 80), ...llms.models.filter(m => m.inArena)].filter(m => !seen.has(m.id) && seen.add(m.id)),
      image: [...(media.boards?.['text-to-image'] ?? []), ...(media.boards?.['image-edit'] ?? [])],
      video: [...(media.boards?.['text-to-video'] ?? []), ...(media.boards?.['image-to-video'] ?? [])],
      stt: speech.stt ?? [],
      tts: speech.tts ?? [],
      coding: coding.boards?.Verified ?? [],
      _mediaAll: mediaAll, _codingAll: Object.values(coding.boards ?? {}).flat(),
    };
  }, [llms.models, media.boards, speech.stt, speech.tts, coding.boards]);

  const isDefault = battle.items.length === 0;
  const kind = isDefault ? previewKind : battle.kind;
  const featured = useMemo(() => (pools[kind] ?? []).slice(0, 2).map(r => toItem(kind, r)), [pools, kind]);
  const items = isDefault ? featured : battle.items;

  const resolve = item => {
    switch (item.kind) {
      case 'llm': return llms.models.find(m => m.id === item.id);
      case 'image': case 'video': return pools._mediaAll.find(m => m.id === item.id && (!item.board || m.board === item.board)) ?? pools._mediaAll.find(m => m.id === item.id);
      case 'stt': return speech.stt.find(m => m.id === item.id);
      case 'tts': return speech.tts.find(m => (m.modelId ?? m.id) === item.id);
      case 'coding': return pools._codingAll.find(m => m.id === item.id);
      default: return null;
    }
  };
  const contestants = items.map(i => ({ item: i, rec: resolve(i) })).map(c => ({ ...c, rec: c.rec ? attachSamples([c.rec], samples.byModel, c.item.board)[0] : null }));
  const recs = contestants.map(c => c.rec).filter(Boolean);
  const present = contestants.filter(c => c.rec);
  const poolLoading = { llm: llms.loading && !llms.models.length, image: media.loading && !pools.image.length, video: media.loading && !pools.video.length, stt: speech.loading && !pools.stt.length, tts: speech.loading && !pools.tts.length, coding: coding.loading && !pools.coding.length }[kind];

  // the first change to the featured bout makes it the visitor's roster
  const add = c => (isDefault ? setBattle([...featured, { ...c, kind }]) : addToBattle({ ...c, kind }));
  const remove = id => (isDefault ? setBattle(featured.filter(i => i.id !== id)) : removeFromBattle(id));

  const candidates = useMemo(() => {
    const taken = new Set(items.map(i => `${i.id}|${i.board ?? ''}`));
    return (pools[kind] ?? []).map(r => ({ ...toItem(kind, r), hint: kind === 'image' || kind === 'video' ? r.board.replace(/-/g, ' ') : kind === 'coding' ? fmtMetric('resolved', r.resolved) : kind === 'stt' ? fmtMetric('wer', r.wer) : undefined }))
      .filter(c => !taken.has(`${c.id}|${c.board ?? ''}`) && !items.some(i => i.id === c.id));
  }, [pools, kind, items]);

  const presets = useMemo(() => {
    const P = (id, label, list) => ({ id, label, items: list.filter(Boolean).map(r => toItem(kind, r)) });
    if (kind === 'llm') {
      const t = topByIntelligence(llms.models, 400);
      const labs = (() => { const s = new Set(); return t.filter(m => !s.has(m.org) && s.add(m.org)).slice(0, 4); })();
      const budget = t.slice(1, 30).filter(m => isNum(m.priceBlended)).sort((a, b) => a.priceBlended - b.priceBlended)[0];
      const fast = (() => { const s = new Set(); return [...llms.models].filter(m => isNum(m.aa?.speed)).sort((a, b) => b.aa.speed - a.aa.speed).filter(m => { const k = `${m.org}|${m.family}`; return !s.has(k) && s.add(k); }).slice(0, 2); })();
      const arenaTop = llms.models.filter(m => m.inArena).sort((a, b) => a.arena.rank - b.arena.rank)[0];
      return [
        P('top2', 'Top two', t.slice(0, 2)), P('top4', 'Top four', t.slice(0, 4)), P('labs', 'Lab leaders', labs),
        P('open', 'Best open vs best closed', [t.find(m => !m.isOpen), t.find(m => m.isOpen)]),
        P('budget', 'Flagship vs budget', [t[0], budget]),
        ...(arenaTop && t[0] && arenaTop.id !== t[0].id ? [P('crowd', "Benchmarks' pick vs the crowd's", [t[0], arenaTop])] : []),
        P('fast', 'Fastest two', fast),
      ].filter(p => p.items.length >= 2);
    }
    const pool = pools[kind] ?? [];
    const second = kind === 'image' ? media.boards?.['image-edit'] : kind === 'video' ? media.boards?.['image-to-video'] : null;
    return [
      P('top2', 'Top two', pool.slice(0, 2)), P('top3', 'Top three', pool.slice(0, 3)), P('top4', 'Top four', pool.slice(0, 4)),
      ...(second?.length >= 2 ? [P('second', kind === 'image' ? 'Editing: top two' : 'Image-to-video: top two', second.slice(0, 2))] : []),
    ].filter(p => p.items.length >= 2);
  }, [kind, llms.models, pools, media.boards]);
  const sameSet = p => p.items.length === items.length && p.items.every(i => items.some(x => x.id === i.id && (x.board ?? null) === (i.board ?? null)));

  const tally = useMemo(() => buildGroups(kind, recs), [kind, recs.map(r => r.id ?? r.modelId).join('|'), llms.models, media.boards, speech.stt, speech.tts, coding.boards]); // eslint-disable-line
  const max = Math.max(0, ...tally.wins);
  const soleLead = tally.wins.filter(w => w === max).length === 1 && max > 0 ? tally.wins.indexOf(max) : null;
  const kinds = Object.keys(KIND_TAB).filter(k => (pools[k]?.length ?? 0) >= 2);
  const jump = g => document.getElementById(`battle-${g.replace(/\W+/g, '-').toLowerCase()}`)?.scrollIntoView({ block: 'start', behavior: 'instant' });
  const n = present.length;
  const cardCols = mobile ? 'repeat(2, minmax(0, 1fr))' : `repeat(${Math.min(4, Math.max(3, n + (n < 4 ? 1 : 0)))}, minmax(0, 1fr))`;

  return (
    <PageFrame mobile={mobile} wide>
      <GlobalMotion />
      <PageTitle mobile={mobile} eyebrow="Battle Mode" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>Head to head. <RobotMascot variant="vs" size={mobile ? 32 : 44} color="var(--accent)" /></span>}
        subtitle="Up to four contestants of one kind, compared only on metrics that mean the same thing for all of them. The best value in each row is marked; a missing value stays N/A and wins nothing."
        right={!isDefault && <Btn small onClick={clearBattle}>Clear battle</Btn>} />

      {/* what is on the card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px 14px', flexWrap: 'wrap', marginBottom: 12 }}>
        {isDefault
          ? <div className="aiwar-tabs-scroll" style={{ marginBottom: 0 }}><Segmented small nowrap={mobile} value={kind} onChange={setPreviewKind} options={kinds.map(k => ({ value: k, label: KIND_TAB[k] }))} /></div>
          : <span className="aiwar-surface" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}><span data-round="1" style={{ width: 6, height: 6, background: 'var(--accent)' }} /><Label color="var(--text)">Your battle · {KIND_LABEL[kind] ?? kind} · {items.length}/4</Label></span>}
        <span style={{ fontSize: 12.5, color: 'var(--muted)', minWidth: 0 }}>
          {isDefault ? <>Featured bout — the two {KIND_WORD[kind]} at the top of the board right now. Swap anyone out, add up to two more, or load a matchup.</> : 'Saved in this browser. Clear it to battle another kind.'}
        </span>
      </div>

      {presets.length > 0 && (
        <div className="aiwar-tabs-scroll" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: mobile ? 'nowrap' : 'wrap', marginBottom: 14 }}>
          <Label style={{ marginRight: 4, flexShrink: 0 }}>Matchups</Label>
          {presets.map(p => <Chip key={p.id} small active={sameSet(p)} label={p.label} onClick={() => setBattle(p.items)} />)}
        </div>
      )}

      {poolLoading ? <Skeleton height={420} /> : (
        <>
          {contestants.some(c => !c.rec) && (
            <div style={{ marginBottom: 12, padding: '9px 12px', border: `0.5px solid ${GOLD}`, fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ flex: 1, minWidth: 200 }}>{contestants.filter(c => !c.rec).map(c => c.item.name).join(', ')}: no longer in the dataset (renamed or removed upstream).</span>
              <Btn small onClick={() => contestants.filter(c => !c.rec).forEach(c => removeFromBattle(c.item.id))}>Remove</Btn>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: cardCols, gap: mobile ? 8 : 10, marginBottom: 12 }}>
            {present.map((c, i) => (
              <ContestantCard key={`${c.item.id}|${c.item.board ?? ''}`} i={i} rec={c.rec} kind={kind} mobile={mobile} wins={tally.wins[i] ?? 0} decided={tally.decided} leads={soleLead === i}
                onRemove={() => remove(c.item.id)} onProfile={kind === 'llm' ? () => onNavigate({ type: 'model', slug: c.rec.slug }) : null} />
            ))}
            {items.length < 4 && candidates.length > 0 && (
              <div style={{ gridColumn: mobile ? '1 / -1' : undefined, minWidth: 0, display: 'grid' }}>
                <AddSlot candidates={candidates} onAdd={add} mobile={mobile} slotsLeft={4 - items.length} kind={kind} />
              </div>
            )}
          </div>

          {recs.length >= 2 ? (
            <>
              <Verdict recs={recs} tally={tally} mobile={mobile} onJump={jump} />

              {(kind === 'image' || kind === 'video') && (
                <div style={{ marginBottom: 12 }}>
                  <MediaBattle kind={kind} roster={recs} candidates={pools._mediaAll.filter(m => m.kind === kind)} priceKey={kind === 'image' ? 'pricePerImage' : 'pricePerSecond'} mobile={mobile} liveBattle={!!status.data?.capabilities?.liveBattle}
                    onAdd={r => add({ id: r.id, name: r.name, org: r.org, board: r.board })} onRemove={remove} onClear={clearBattle}
                    showRoster={false} onReplay={() => onNavigate({ type: kind === 'video' ? 'videos' : 'images', slug: 'replay' })} />
                </div>
              )}
              {kind === 'tts' && (
                <div style={{ marginBottom: 12 }}><AudioLanes rows={recs.map(r => ({ ...r, id: r.modelId ?? r.id }))} mobile={mobile} prompt={recs.find(r => r.samplePrompt)?.samplePrompt} /></div>
              )}

              {recs.length === 2 && !mobile ? <Tape recs={recs} tally={tally} onNavigate={onNavigate} /> : <Matrix recs={recs} tally={tally} mobile={mobile} onNavigate={onNavigate} />}
              <p style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: MONO, marginTop: 10, lineHeight: 1.6 }}>
                Green dot = best in the row, by the metric's own direction (▲ higher is better, ▼ lower). A bar is the value measured against the row's best — the full bar is the best, whichever way the metric runs. Rows with one value, or equal values, have no winner.
                {recs.some(r => r.sources?.length) ? ` Sources: ${[...new Set(recs.flatMap(r => r.sources ?? []))].join(', ')}.` : ''}
              </p>
            </>
          ) : (
            <Panel pad={mobile ? 18 : 28} style={{ textAlign: 'center', borderStyle: 'dashed' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>One more to make it a fight.</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Search above, or load a matchup.</div>
            </Panel>
          )}
        </>
      )}
    </PageFrame>
  );
}
