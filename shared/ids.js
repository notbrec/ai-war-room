// ─── Canonical identity ─────────────────────────────────────────────────────
// Every source spells the same thing differently: arena publishes
// "claude-opus-4-5-20251101-high-32k", OpenRouter "anthropic/claude-opus-4.5",
// SWE-bench "Claude 4.5 Opus", Artificial Analysis "claude-4-5-opus". This
// module turns any of those into a comparable key, and splits the *variant*
// (reasoning effort, thinking, date stamp) off the *family* so that two rows
// which are the same weights at different effort levels can be related
// without being conflated.
//
// Shared by the Netlify functions and the browser — keep it dependency-free.

export const ORG_ALIASES = {
  'spacexai': 'xAI', 'xai': 'xAI', 'x.ai': 'xAI', 'x-ai': 'xAI',
  'z.ai': 'Z.ai', 'zai': 'Z.ai', 'z-ai': 'Z.ai', 'zhipu': 'Z.ai', 'zhipu ai': 'Z.ai', 'thudm': 'Z.ai', 'chatglm': 'Z.ai',
  'bytedance': 'Bytedance', 'byte dance': 'Bytedance', 'bytedance seed': 'Bytedance', 'doubao': 'Bytedance',
  'ai2': 'Ai2', 'allenai': 'Ai2', 'allen institute': 'Ai2', 'allen institute for ai': 'Ai2',
  'stepfun': 'StepFun', 'step fun': 'StepFun',
  'nvidia': 'Nvidia', 'ibm': 'IBM', 'openai': 'OpenAI',
  'ant group': 'Ant Group', 'antgroup': 'Ant Group',
  'inception ai': 'Inception AI', 'nexusflow': 'NexusFlow',
  'ai21': 'AI21 Labs', 'ai21 labs': 'AI21 Labs',
  '01-ai': '01.AI', '01.ai': '01.AI', 'lingyiwanwu': '01.AI',
  'lmsys': 'LMSYS', 'lmsysorg': 'LMSYS',
  'mosaicml': 'Databricks', 'databricks': 'Databricks',
  'huggingfaceh4': 'Hugging Face', 'huggingface': 'Hugging Face', 'huggingfacetb': 'Hugging Face',
  'nousresearch': 'Nous Research', 'teknium': 'Nous Research',
  'princeton-nlp': 'Princeton NLP', 'berkeley-nest': 'Berkeley',
  'internlm': 'InternLM', 'shanghai ai lab': 'InternLM',
  'openchat': 'OpenChat', 'upstage': 'Upstage', 'snowflake': 'Snowflake',
  'arcee': 'Arcee AI', 'arcee-ai': 'Arcee AI',
  'primeintellect': 'Prime Intellect', 'prime-intellect': 'Prime Intellect',
  'reka': 'Reka', 'cohere': 'Cohere', 'mistral': 'Mistral', 'mistralai': 'Mistral', 'mistral ai': 'Mistral',
  'tiiuae': 'TII', 'tii': 'TII',
  'ehartford': 'Cognitive Computations', 'cognitivecomputations': 'Cognitive Computations',
  'togethercomputer': 'Together AI', 'together': 'Together AI',
  'nomic-ai': 'Nomic AI', 'nomicai': 'Nomic AI',
  'stabilityai': 'Stability AI', 'stability': 'Stability AI', 'stability ai': 'Stability AI',
  'openassistant': 'OpenAssistant', 'stanford': 'Stanford', 'stanford-crfm': 'Stanford',
  'mixedbread-ai': 'Mixedbread', 'sarvamai': 'Sarvam AI', 'deepcogito': 'Deep Cogito',
  'deepseek-ai': 'DeepSeek', 'deepseek': 'DeepSeek',
  'qwen': 'Alibaba', 'alibaba': 'Alibaba', 'alibaba cloud': 'Alibaba', 'alibaba-ath': 'Alibaba',
  'meta-llama': 'Meta', 'facebook': 'Meta', 'meta': 'Meta', 'meta ai': 'Meta',
  'google': 'Google', 'googledeepmind': 'Google', 'google-deepmind': 'Google', 'google deepmind': 'Google',
  'microsoft': 'Microsoft', 'microsoft ai': 'Microsoft', 'anthropic': 'Anthropic', 'amazon': 'Amazon',
  'tencent': 'Tencent', 'baidu': 'Baidu', 'xiaomi': 'Xiaomi', 'minimax': 'MiniMax',
  'moonshot': 'Moonshot', 'moonshotai': 'Moonshot', 'moonshot ai': 'Moonshot',
  'meituan': 'Meituan', 'thinky': 'Thinky',
  'black forest labs': 'Black Forest Labs', 'bfl': 'Black Forest Labs',
  'klingai': 'Kling', 'kling': 'Kling', 'kuaishou': 'Kling',
  'luma ai': 'Luma AI', 'luma': 'Luma AI',
  'runway': 'Runway', 'runwayml': 'Runway',
  'ideogram': 'Ideogram', 'recraft': 'Recraft', 'reve': 'Reve', 'krea': 'Krea',
  'hidream': 'HiDream', 'leonardo ai': 'Leonardo AI', 'pika': 'Pika', 'genmo ai': 'Genmo', 'genmo': 'Genmo',
  'shengshu': 'Shengshu', 'kandinsky': 'Kandinsky', 'sber': 'Kandinsky',
  'elevenlabs': 'ElevenLabs', 'assemblyai': 'AssemblyAI', 'deepgram': 'Deepgram', 'speechmatics': 'Speechmatics',
  'nvidia nemo': 'Nvidia', 'openai whisper': 'OpenAI',
};

/** Canonical lab / creator display name. Unknown strings pass through trimmed. */
export function canonicalOrg(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return 'Unknown';
  return ORG_ALIASES[s.toLowerCase()] ?? s;
}

/** Lowercase alphanumerics only — the base for every comparison key. */
export function bareKey(s) {
  return String(s ?? '').toLowerCase().split('/').pop().split(':')[0].replace(/[^a-z0-9]/g, '');
}

// Trailing qualifiers that distinguish *variants* of the same weights.
// Ordered longest-first so "xhigh" is stripped before "high".
export const VARIANT_SUFFIXES = [
  'nonreasoning', 'nothinking', 'nonthinking',
  'thinking32k', 'thinking16k', 'thinking', 'reasoning',
  'xhigh', 'high', 'medium', 'minimal', 'low', 'max',
  'preview', 'latest', 'beta', 'exp', 'chat', 'instruct', 'text',
  'fast', 'default', 'online', 'search',
  // quantisation tags some boards append to open weights
  'nvfp4', 'fp8', 'fp4', 'int4', 'int8', 'bf16',
];
// "beta1", "preview2", "rc1" — a qualifier with a small revision number.
const NUMBERED_SUFFIX = /(beta|preview|exp|rc)(\d{1,2})$/;

/**
 * Split a model string into { family, variant, dateStamp }.
 * "claude-opus-4-5-20251101-high-32k" → family "claudeopus45", variant ["high","32k"], dateStamp "20251101"
 */
export function splitVariant(raw) {
  let k = bareKey(raw);
  const variant = [];
  let dateStamp = null;

  // 8-digit date stamps (20251101) anywhere, and 4-digit MMDD tails (0709).
  k = k.replace(/(20\d{6})/g, (_, d) => { dateStamp = d; return ''; });

  // Peel trailing qualifiers, at most 6 rounds.
  for (let i = 0; i < 6; i++) {
    const before = k;
    const ctx = k.match(/(\d{1,3})k$/);
    if (ctx && k.length > ctx[0].length + 3 && !/\d\d\d?k$/.test(k.slice(0, -ctx[0].length)) ) {
      // "…thinking32k" — keep the context tag as a variant marker
      variant.unshift(ctx[0]);
      k = k.slice(0, -ctx[0].length);
    }
    const numbered = k.match(NUMBERED_SUFFIX);
    if (numbered && k.length - numbered[0].length >= 2) {
      variant.unshift(numbered[0]);
      k = k.slice(0, -numbered[0].length);
    }
    for (const suf of VARIANT_SUFFIXES) {
      if (k.endsWith(suf) && k.length - suf.length >= 2) {
        variant.unshift(suf);
        k = k.slice(0, -suf.length);
        break;
      }
    }
    // Trailing MMDD-style stamp after a letter, e.g. "grok420beta0309" → "grok420beta".
    const mmdd = k.match(/[a-z](\d{4})$/);
    if (mmdd && !dateStamp) { dateStamp = mmdd[1]; k = k.slice(0, -4); }
    if (k === before) break;
  }

  return { family: k, variant, dateStamp };
}

/** Progressively shorter keys for fuzzy matching across sources.
 *  Pass `org` to also try the name with a leading lab prefix removed
 *  ("nvidia-nemotron-3-ultra" → "nemotron3ultra"). */
export function keyVariants(raw, org) {
  const out = [];
  const push = v => { if (v && v.length >= 3 && !out.includes(v)) out.push(v); };
  const full = bareKey(raw);
  push(full);
  const { family, dateStamp } = splitVariant(raw);
  if (dateStamp) push(full.replace(dateStamp, ''));
  push(family);
  const o = org ? bareKey(canonicalOrg(org)) : null;
  if (o && o !== 'unknown' && family.startsWith(o) && family.length > o.length + 3) push(family.slice(o.length));
  return out;
}

/**
 * Canonical model id: "<org-key>:<family>[:<variant>]".
 * Distinct reasoning levels stay distinct ids; the shared `family` field
 * lets the UI group them.
 */
export function canonicalModelId(name, org) {
  const { family, variant } = splitVariant(name);
  const o = bareKey(canonicalOrg(org)) || 'unknown';
  return variant.length ? `${o}:${family}:${variant.join('-')}` : `${o}:${family}`;
}

/** Provider endpoint id: "<provider-key>/<canonical model id>". */
export function providerEndpointId(provider, modelId) {
  return `${bareKey(provider) || 'unknown'}/${modelId}`;
}

/** Reasoning effort level implied by the name, or null. */
export function reasoningLevel(name) {
  const { variant } = splitVariant(name);
  for (const v of ['xhigh', 'high', 'medium', 'low', 'minimal', 'max']) if (variant.includes(v)) return v;
  if (variant.some(v => v.startsWith('thinking') || v === 'reasoning')) return 'thinking';
  if (variant.some(v => v === 'nonreasoning' || v === 'nothinking' || v === 'nonthinking')) return 'none';
  return null;
}

export function isReasoningName(name) {
  const lvl = reasoningLevel(name);
  return lvl != null && lvl !== 'none';
}

/**
 * Build an index from a list of source records to a lookup function.
 * `getKeys(record)` yields candidate strings; the first index hit wins.
 * Exact (longest) keys are inserted first so fuzzy matches never override.
 */
export function buildIndex(records, getKeys) {
  const exact = new Map();
  const fuzzy = new Map();
  for (const r of records) {
    const keys = getKeys(r);
    for (const raw of keys) {
      const variants = keyVariants(raw, r.org);
      variants.forEach((k, i) => {
        const bucket = i === 0 ? exact : fuzzy;
        if (!bucket.has(k)) bucket.set(k, r);
      });
    }
  }
  return function lookup(raw, org) {
    const variants = keyVariants(raw, org);
    for (const k of variants) if (exact.has(k)) return exact.get(k);
    for (const k of variants) if (fuzzy.has(k)) return fuzzy.get(k);
    return null;
  };
}

/** Human display name from a slug, with brand casing fixes. */
export function displayName(slug) {
  return String(slug ?? '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bGpt\b/g, 'GPT').replace(/\bGlm\b/g, 'GLM').replace(/\bErnie\b/g, 'ERNIE')
    .replace(/\bO(\d)\b/g, 'o$1').replace(/\bAi\b/g, 'AI').replace(/\bTts\b/g, 'TTS').replace(/\bAsr\b/g, 'ASR');
}
