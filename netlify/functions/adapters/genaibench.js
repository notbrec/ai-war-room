// ─── GenAI-Bench adapter (TIGER-Lab, CC-BY-4.0) ─────────────────────────────
// Real human-preference battles from the GenAI Arena: the same prompt
// rendered by two models side by side, plus the crowd's vote. Images are
// served by the Hugging Face datasets-server, videos from the public
// genai-arena-video-mp4 dataset. Licence: CC-BY-4.0 — attribution shown in
// the UI. Models are 2024-era open models; this is a replay archive, not
// the current board.

import { fetchJSON } from '../lib/http.js';
import { canonicalOrg, canonicalModelId } from '../../../shared/ids.js';

const DATASET = 'TIGER-Lab/GenAI-Bench';
const CONFIGS = {
  'text-to-image': { config: 'image_generation', kind: 'image', left: 'left_image', right: 'right_image', prompt: 'prompt' },
  'image-edit':    { config: 'image_edition',    kind: 'image', left: 'left_output_image', right: 'right_output_image', prompt: 'instruct_prompt', source: 'source_image' },
  'text-to-video': { config: 'video_generation', kind: 'video', left: 'left_video', right: 'right_video', prompt: 'prompt' },
};

// Dataset spellings → (org, display name)
const MODEL_META = {
  'SDXL': ['Stability AI', 'SDXL'], 'SDXLTurbo': ['Stability AI', 'SDXL Turbo'], 'SDXLLightning': ['Bytedance', 'SDXL Lightning'], 'SD3': ['Stability AI', 'Stable Diffusion 3'],
  'StableCascade': ['Stability AI', 'Stable Cascade'], 'LCM': ['Tsinghua', 'LCM'], 'OpenJourney': ['PromptHero', 'OpenJourney'],
  'Playground v2': ['Playground', 'Playground v2'], 'PlayGroundV2': ['Playground', 'Playground v2'], 'Playground v2.5': ['Playground', 'Playground v2.5'], 'PlayGroundV2.5': ['Playground', 'Playground v2.5'],
  'PixArtAlpha': ['PixArt', 'PixArt-α'], 'PixArtSigma': ['PixArt', 'PixArt-Σ'], 'Kolors': ['Kuaishou', 'Kolors'], 'FLUX1dev': ['Black Forest Labs', 'FLUX.1 dev'], 'HunyuanDiT': ['Tencent', 'Hunyuan-DiT'],
  'OpenSora': ['HPC-AI Tech', 'Open-Sora'], 'T2VTurbo': ['T2V-Turbo', 'T2V-Turbo'], 'LaVie': ['Vchitect', 'LaVie'], 'AnimateDiff': ['AnimateDiff', 'AnimateDiff'], 'AnimateDiffTurbo': ['AnimateDiff', 'AnimateDiff Turbo'],
  'VideoCrafter2': ['Tencent', 'VideoCrafter2'], 'ModelScope': ['Alibaba', 'ModelScope T2V'], 'StableVideoDiffusion': ['Stability AI', 'Stable Video Diffusion'],
  'PNP': ['Plug-and-Play', 'PnP'], 'SDEdit': ['SDEdit', 'SDEdit'], 'InfEdit': ['InfEdit', 'InfEdit'], 'CosXLEdit': ['Stability AI', 'CosXL Edit'], 'InstructPix2Pix': ['Berkeley', 'InstructPix2Pix'],
  'MagicBrush': ['MagicBrush', 'MagicBrush'], 'Pix2PixZero': ['Adobe', 'Pix2Pix-Zero'], 'CycleDiffusion': ['CycleDiffusion', 'CycleDiffusion'], 'Prompt2prompt': ['Google', 'Prompt-to-Prompt'], 'UltraEdit': ['UltraEdit', 'UltraEdit'],
};

function modelOf(raw) {
  const [org, name] = MODEL_META[raw] ?? ['Unknown', raw];
  return { raw, name, org: canonicalOrg(org), id: canonicalModelId(raw, org) };
}
function mediaUrl(v) {
  if (!v) return null;
  if (typeof v === 'string') return v.replace('/blob/main/', '/resolve/main/');
  return v.src ?? null;
}

async function rows(config, offset, length) {
  const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(DATASET)}&config=${config}&split=test&offset=${offset}&length=${length}`;
  const json = await fetchJSON(url, { timeoutMs: 25_000 });
  return { rows: (json.rows ?? []).map(r => r.row), total: json.num_rows_total ?? 0 };
}

/** Fetch up to `limit` battles per board (pages fetched in parallel to stay inside the function budget). */
export async function fetchGenAIBench({ limit = 200 } = {}) {
  const out = {};
  const boards = Object.entries(CONFIGS);
  const pages = await Promise.all(boards.map(([, c]) =>
    Promise.all(Array.from({ length: Math.ceil(limit / 100) }, (_, i) => rows(c.config, i * 100, 100).catch(() => ({ rows: [] }))))));
  boards.forEach(([board, c], bi) => {
    const battles = [];
    for (const page of pages[bi]) {
      for (const r of page.rows) {
        const left = modelOf(r.left_model), right = modelOf(r.right_model);
        const lu = mediaUrl(r[c.left]), ru = mediaUrl(r[c.right]);
        if (!lu || !ru) continue;
        battles.push({
          id: `${board}:${battles.length}`,
          board, kind: c.kind,
          prompt: r[c.prompt] ?? '',
          source: c.source ? mediaUrl(r[c.source]) : null,
          left: { ...left, url: lu }, right: { ...right, url: ru },
          vote: r.vote_type === 'leftvote' ? 'left' : r.vote_type === 'rightvote' ? 'right' : r.vote_type === 'tievote' ? 'tie' : r.vote_type === 'bothbad_vote' ? 'bothbad' : (r.vote_type ?? null),
        });
      }
    }
    out[board] = battles;
  });
  const n = Object.values(out).reduce((s, a) => s + a.length, 0);
  if (n < 20) throw new Error('genaibench: too few battles');
  return { boards: out, license: 'CC-BY-4.0', attribution: 'GenAI-Bench (TIGER-Lab) — https://huggingface.co/datasets/TIGER-Lab/GenAI-Bench', fetchedAt: new Date().toISOString() };
}
