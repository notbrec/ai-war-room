// ─── Open ASR Leaderboard adapter ───────────────────────────────────────────
// Hugging Face publishes the results behind
// https://huggingface.co/spaces/hf-audio/open_asr_leaderboard as a public
// dataset CSV. Columns: model, avg (WER), RTFx, License, Size (B),
// # Languages, Encoder, Decoder, per-dataset WER / RTFx.

import { fetchText } from '../lib/http.js';
import { canonicalOrg, canonicalModelId } from '../../../shared/ids.js';

const CSV_URL = 'https://huggingface.co/datasets/hf-audio/open-asr-leaderboard-results/resolve/main/english_short_latest.csv';

/** Minimal RFC-4180 parser (quoted fields, commas, newlines in quotes). */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

const OPEN_LICENSES = /apache|mit|cc-by|bsd|openrail|llama|gemma|nvidia-open|open/i;

export function normaliseASRRow(obj) {
  const model = obj.model ?? '';
  const [owner, ...rest] = model.split('/');
  const rawOrg = rest.length ? owner : (/whisper/i.test(model) ? 'OpenAI' : owner);
  const mapped = canonicalOrg(rawOrg);
  // Unknown Hugging Face owners arrive lowercase ("zoom", "kyutai") — title-case them.
  const org = mapped === rawOrg ? rawOrg.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : mapped;
  const name = rest.length ? rest.join('/') : model;
  const perDataset = {};
  for (const [k, v] of Object.entries(obj)) {
    const m = k.match(/^(.+?) WER$/);
    if (m && num(v) != null) perDataset[m[1]] = num(v);
  }
  const license = obj.License || null;
  return {
    id: canonicalModelId(model, org),
    model, name, org,
    wer: num(obj.avg),
    rtfx: num(obj.RTFx),
    license,
    isOpen: license ? OPEN_LICENSES.test(license) && !/proprietary/i.test(license) : !/proprietary/i.test(license ?? '') && rest.length > 0,
    paramsB: num(obj['Size (B)']),
    languages: num(obj['# Languages']),
    encoder: obj.Encoder || null,
    decoder: obj.Decoder || null,
    streaming: null,           // not published by this source
    perDataset,
    url: rest.length ? `https://huggingface.co/${model}` : null,
  };
}

export async function fetchOpenASR() {
  const text = await fetchText(CSV_URL, { timeoutMs: 30_000 });
  const rows = parseCSV(text);
  if (rows.length < 5) throw new Error('openasr: csv too short');
  const header = rows[0];
  const out = rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])))
    .map(normaliseASRRow)
    .filter(r => r.wer != null)
    .sort((a, b) => a.wer - b.wer)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  if (out.length < 5) throw new Error('openasr: no usable rows');
  return out;
}
