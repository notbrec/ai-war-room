// ─── Open ASR Leaderboard adapter ───────────────────────────────────────────
// https://huggingface.co/spaces/hf-audio/open_asr_leaderboard is a public
// Gradio app. Its results CSV (hf-audio/open-asr-leaderboard-results) went
// private in October 2026 — the Space now reads it with a token — but the
// Space's public /config still ships the rendered main table as the initial
// value of its first dataframe: rank, model (as a link), average WER, RTFx and
// one WER column per dataset, exactly what the leaderboard page shows.
//
// Licence and size are no longer published there. Open weights are inferred
// from where the model links: a Hugging Face or GitHub repo means downloadable
// weights; a vendor page means a hosted API.

import { fetchText } from '../lib/http.js';
import { canonicalOrg, canonicalModelId } from '../../../shared/ids.js';

export const SPACE_URL = 'https://huggingface.co/spaces/hf-audio/open_asr_leaderboard';
const CONFIG_URL = 'https://hf-audio-open-asr-leaderboard.hf.space/config';

const num = v => { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) ? n : null; };

/** "nvidia/canary-qwen-2.5b" → 2.5 ; "niagara-84m-batch.en" → 0.084 ; none → null */
export function paramsFromName(name) {
  const m = String(name ?? '').match(/(?<![a-z0-9.])(\d+(?:\.\d+)?)([bm])(?![a-z])/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return m[2].toLowerCase() === 'm' ? +(v / 1000).toFixed(3) : v;
}

export function isOpenUrl(url) {
  return /^https?:\/\/(www\.)?(huggingface\.co|github\.com)\//i.test(String(url ?? ''));
}

/** One leaderboard row: { model, avg, RTFx, License?, 'Size (B)'?, '<dataset> WER': … , url? }. */
export function normaliseASRRow(obj) {
  const model = obj.model ?? '';
  const [owner, ...rest] = model.split('/');
  const rawOrg = rest.length ? owner : (/whisper/i.test(model) ? 'OpenAI' : owner);
  const org = canonicalOrg(rawOrg);
  const name = rest.length ? rest.join('/') : model;
  const perDataset = {};
  for (const [k, v] of Object.entries(obj)) {
    const m = k.match(/^(.+?) WER$/);
    if (m && num(v) != null) perDataset[m[1]] = num(v);
  }
  const url = obj.url ?? (rest.length ? `https://huggingface.co/${model}` : null);
  const license = obj.License || null;
  const isOpen = license
    ? !/proprietary/i.test(license)
    : obj.url != null ? isOpenUrl(obj.url) : rest.length > 0;
  return {
    id: canonicalModelId(model, org),
    model, name, org,
    wer: num(obj.avg),
    rtfx: num(obj.RTFx),
    license: license ?? (isOpen ? 'Open weights' : 'Proprietary'),
    isOpen,
    paramsB: num(obj['Size (B)']) ?? (isOpen ? paramsFromName(name) : null),
    languages: num(obj['# Languages']),
    encoder: obj.Encoder || null,
    decoder: obj.Decoder || null,
    streaming: null,           // not published by this source
    perDataset,
    url,
  };
}

const strip = s => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();

/** Main table of the Space config → rows for normaliseASRRow. */
export function rowsFromConfig(config) {
  const frames = (config?.components ?? []).filter(c => c.type === 'dataframe' && Array.isArray(c.props?.value?.headers));
  const main = frames.find(c => {
    const h = c.props.value.headers.map(x => String(x).toLowerCase());
    return h.some(x => x === 'model') && h.some(x => x.startsWith('average wer')) && h.some(x => x.startsWith('rtfx'));
  });
  if (!main) throw new Error('openasr: main table not found in the Space config');
  const headers = main.props.value.headers.map(String);
  const iModel = headers.findIndex(h => h.toLowerCase() === 'model');
  const iAvg = headers.findIndex(h => h.toLowerCase().startsWith('average wer'));
  const iRtfx = headers.findIndex(h => h.toLowerCase().startsWith('rtfx'));
  const datasets = headers.map((h, i) => [h, i]).filter(([, i]) => i > Math.max(iAvg, iRtfx));
  return main.props.value.data.map(r => {
    const cell = String(r[iModel] ?? '');
    const obj = { model: strip(cell), url: (cell.match(/href="([^"]+)"/) ?? [])[1] ?? null, avg: r[iAvg], RTFx: r[iRtfx] };
    for (const [h, i] of datasets) obj[`${h} WER`] = r[i];
    return obj;
  });
}

export async function fetchOpenASR() {
  const config = JSON.parse(await fetchText(CONFIG_URL, { timeoutMs: 30_000 }));
  const out = rowsFromConfig(config)
    .map(normaliseASRRow)
    .filter(r => r.model && r.wer != null)
    .sort((a, b) => a.wer - b.wer)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  if (out.length < 5) throw new Error('openasr: no usable rows');
  return out;
}
