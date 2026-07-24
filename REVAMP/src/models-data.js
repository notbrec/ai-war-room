// ─── AI WAR ROOM · Model Data ──────────────────────────────────────────────
// ELO data: live from arena.ai via Netlify Function (/api/leaderboard)
// Fallback: real arena.ai snapshot (auto-shown while live data loads)
// Pricing:  live from OpenRouter API (auto-refreshed every 30 min)

import DESCRIPTIONS from './model-descriptions.json';

export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
export const LEADERBOARD_URL       = '/api/leaderboard';
export const AUTO_REFRESH_MS       = 30 * 60 * 1000; // 30 min
export const RELEASE               = 'AI-WAR-LIVE';

// ── Stable count snapshot (avoids a low → real count flash on first paint) ─
// Shows "350+" until a real live count loads or is read from localStorage.
// arena.ai currently rates 378 models, so 350 stays true as the board grows.
const LAST_COUNT_KEY    = 'aiwar-last-model-count';
const DEFAULT_COUNT     = 350;

export function readModelCountSnapshot() {
  try {
    const v = localStorage.getItem(LAST_COUNT_KEY);
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n > 50) return { count: n, exact: true };
  } catch {}
  return { count: DEFAULT_COUNT, exact: false };
}

export function writeModelCountSnapshot(n) {
  if (!Number.isFinite(n) || n <= 50) return;
  try { localStorage.setItem(LAST_COUNT_KEY, String(n)); } catch {}
}

// Normalize a model name into a lookup key (alphanumerics only, lowercase)
function descKey(s) {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Known org/lab tokens commonly appended to live arena.ai names
const ORG_TOKENS = [
  'xai','anthropic','openai','google','meta','mistral','deepseek','alibaba',
  'zai','moonshot','minimax','xiaomi','microsoft','amazon','baidu','bytedance',
  'meituan','tencent','perplexity','cohere','nvidia','reka','databricks',
  'inflection','stability','qwen','hunyuan','ernie','doubao','skywork',
];

// Build an auxiliary index: JSON keys also indexed with leading org prefix stripped
// (PDF keys often contain company prefix like "tencenthunyuan…", live names don't)
const DESC_INDEX_NO_PREFIX = {};
for (const key of Object.keys(DESCRIPTIONS)) {
  for (const t of ORG_TOKENS) {
    if (key.startsWith(t) && key.length > t.length + 3) {
      const stripped = key.slice(t.length);
      if (!DESC_INDEX_NO_PREFIX[stripped]) DESC_INDEX_NO_PREFIX[stripped] = DESCRIPTIONS[key];
    }
  }
  // Also index "stepfun" → "step", "bytedance" → raw model name etc.
  const extraPrefixes = ['stepfun','c4ai'];
  for (const t of extraPrefixes) {
    if (key.includes(t)) {
      const stripped = key.replace(t, '');
      if (!DESC_INDEX_NO_PREFIX[stripped]) DESC_INDEX_NO_PREFIX[stripped] = DESCRIPTIONS[key];
    }
  }
}

// Strip noise: trailing org tokens, long date digits, short date suffixes.
// Returns an array of progressively more-stripped variants to try.
function variants(raw) {
  const out = new Set();
  let k = descKey(raw);
  out.add(k);

  // Strip trailing org token repeatedly
  for (let i = 0; i < 3; i++) {
    const before = k;
    for (const t of ORG_TOKENS) {
      if (k.endsWith(t)) { k = k.slice(0, -t.length); break; }
    }
    if (k === before) break;
    out.add(k);
  }

  // Strip trailing 4-8 digit date-like sequences (e.g. 20251101, 0709, 0309)
  let k2 = k.replace(/\d{6,8}$/, '');
  if (k2 !== k) out.add(k2);
  k2 = k2.replace(/\d{4}$/, '');
  if (k2 !== k) out.add(k2);

  // Remove date digits embedded before "thinking" / "reasoning" tails
  // e.g. claudeopus4520251101thinking32k → claudeopus45thinking32k
  const embedded = k.replace(/(\d{6,8})(thinking|reasoning|chat|instruct|preview|mini|high|fast)/g, '$2');
  if (embedded !== k) out.add(embedded);

  // Also strip 4-digit embedded date-like groups before thinking/reasoning
  const embedded2 = k.replace(/(\d{4})(thinking|reasoning)/g, '$2');
  if (embedded2 !== k) out.add(embedded2);

  // Combine: strip org THEN embedded date
  for (const v of [...out]) {
    const stripped = v.replace(/(\d{6,8})(thinking|reasoning|chat|instruct|preview|mini|high|fast)/g, '$2');
    if (stripped !== v) out.add(stripped);
  }

  return [...out].filter(Boolean);
}

/** Look up a description for a model by its display name */
export function getDescription(name) {
  const tries = variants(name);
  for (const v of tries) {
    if (DESCRIPTIONS[v]) return DESCRIPTIONS[v];
    if (DESC_INDEX_NO_PREFIX[v]) return DESC_INDEX_NO_PREFIX[v];
  }
  // Last-ditch: find any JSON key that contains our shortest stripped variant
  // (guards against extra tail like "-32k" that isn't in PDF key, or company prefix)
  const shortest = tries.sort((a, b) => a.length - b.length)[0];
  if (shortest && shortest.length >= 6) {
    for (const key of Object.keys(DESCRIPTIONS)) {
      if (key === shortest || key.endsWith(shortest) || key.startsWith(shortest) || shortest.startsWith(key)) {
        if (Math.abs(key.length - shortest.length) <= 10) return DESCRIPTIONS[key];
      }
    }
  }
  return null;
}

export const ORG_CONFIG = {
  'Anthropic':    { color: '#CC785C', bg: '#FBF0EC', bgDark: '#3A2218' },
  'OpenAI':       { color: '#10A37F', bg: '#E8F8F2', bgDark: '#122A22' },
  'Google':       { color: '#4285F4', bg: '#E8F0FE', bgDark: '#131D3A' },
  'Meta':         { color: '#0866FF', bg: '#E7F0FF', bgDark: '#0D1E3A' },
  'xAI':          { color: '#FFFFFF', bg: '#2C2C2E', bgDark: '#1C1C1E' },
  'Mistral':      { color: '#FF3B30', bg: '#FFF0EF', bgDark: '#2E0D0C' },
  'DeepSeek':     { color: '#5856D6', bg: '#EEEEFE', bgDark: '#16143A' },
  'Alibaba':      { color: '#FF6B00', bg: '#FFF0E6', bgDark: '#2E1800' },
  'Z.ai':         { color: '#007AFF', bg: '#E7F3FF', bgDark: '#0D1F33' },
  'Moonshot':     { color: '#00C7BE', bg: '#E6FAFB', bgDark: '#0A2525' },
  'MiniMax':      { color: '#8B5CF6', bg: '#F3EFFE', bgDark: '#1E1133' },
  'Xiaomi':       { color: '#FF6900', bg: '#FFF3E6', bgDark: '#2E1400' },
  'Microsoft':    { color: '#00A4EF', bg: '#E6F6FD', bgDark: '#07232E' },
  'Amazon':       { color: '#FF9900', bg: '#FFF5E6', bgDark: '#2E1E00' },
  'Baidu':        { color: '#2932E1', bg: '#EAEBFD', bgDark: '#0D1040' },
  'Bytedance':    { color: '#FE2C55', bg: '#FFF0F3', bgDark: '#2E0811' },
  'Meituan':      { color: '#FFD100', bg: '#FFFCE6', bgDark: '#2E2800' },
  'Cohere':       { color: '#39594D', bg: '#E6F2EE', bgDark: '#0E2119' },
  'Inception AI': { color: '#34C759', bg: '#EDFAF2', bgDark: '#0C2918' },
  // Labs that only appear once the full arena.ai board (378 models) loads —
  // without an entry here they render colourless and look broken.
  'Nvidia':       { color: '#76B900', bg: '#F1F9E6', bgDark: '#182B00' },
  'Tencent':      { color: '#0052D9', bg: '#E6EEFB', bgDark: '#001838' },
  'Ai2':          { color: '#F0529C', bg: '#FDECF4', bgDark: '#330F20' },
  'IBM':          { color: '#0F62FE', bg: '#E7EFFF', bgDark: '#001141' },
  'StepFun':      { color: '#7C4DFF', bg: '#F0EBFF', bgDark: '#1A0D3D' },
  'Thinky':       { color: '#FF375F', bg: '#FFECF0', bgDark: '#330711' },
  'Ant Group':    { color: '#1677FF', bg: '#E8F1FF', bgDark: '#001A3D' },
  'Reka':         { color: '#FF6A3D', bg: '#FFF0EB', bgDark: '#2E1006' },
  'Databricks':   { color: '#FF3621', bg: '#FFEDEA', bgDark: '#2E0A05' },
  'LMSYS':        { color: '#6E56CF', bg: '#EFECFB', bgDark: '#150F33' },
  '01.AI':        { color: '#00B389', bg: '#E6F8F3', bgDark: '#00291F' },
  'NexusFlow':    { color: '#3B82F6', bg: '#EAF2FE', bgDark: '#0A1B38' },
  'Hugging Face': { color: '#FFD21E', bg: '#FFFBE6', bgDark: '#2E2700' },
  'Arcee AI':     { color: '#0EA5E9', bg: '#E6F6FE', bgDark: '#03222E' },
  'AI21 Labs':    { color: '#E23E57', bg: '#FDECEF', bgDark: '#2E0A11' },
  'Together AI':  { color: '#0F6FFF', bg: '#E7F0FF', bgDark: '#001838' },
  'Stability AI': { color: '#8B5CF6', bg: '#F3EFFE', bgDark: '#1E1133' },
  'Nous Research':{ color: '#64748B', bg: '#EEF1F5', bgDark: '#151A21' },
  'Prime Intellect': { color: '#111111', bg: '#EFEFEF', bgDark: '#1C1C1E' },
  'Snowflake':    { color: '#29B5E8', bg: '#E8F7FD', bgDark: '#04242E' },
  'Upstage':      { color: '#8155FF', bg: '#F1ECFF', bgDark: '#170D33' },
  'Nomic AI':     { color: '#3B82F6', bg: '#EAF2FE', bgDark: '#0A1B38' },
  'OpenChat':     { color: '#22C55E', bg: '#E9FAEF', bgDark: '#062915' },
  'Stanford':     { color: '#8C1515', bg: '#FBECEC', bgDark: '#2E0707' },
  'Berkeley':     { color: '#003262', bg: '#E6EDF3', bgDark: '#00131F' },
  'Princeton NLP':{ color: '#E77500', bg: '#FFF3E6', bgDark: '#2E1800' },
  'InternLM':     { color: '#2563EB', bg: '#E8EFFE', bgDark: '#06122E' },
  'TII':          { color: '#00A3A1', bg: '#E6F6F6', bgDark: '#002A29' },
  'OpenAssistant':{ color: '#3A86FF', bg: '#E8F0FF', bgDark: '#061A38' },
};

// Licence strings arena.ai actually publishes, grouped by what they mean for
// the user. Anything unlisted falls back to a neutral "Other" badge rather
// than being silently mislabelled as proprietary.
const OPEN_LICENSE_RE = /^(mit|modified mit|apache[\s-]?2\.0|apache|open source|openmdw|gemma|qwen|qianwen|deepseek|llama|jamba open|nvidia open|nexusflow|dbrx|yi license|tencent-hunyuan-community|minimax community|ai2 impact|falcon|mrl|mistral research|cc-by|non-?commercial|other)/i;

// Licences with real usage restrictions — open weights, but not open season.
const RESTRICTED_LICENSE_RE = /^(cc-by-nc|non-?commercial|ai2 impact|mistral research|mrl|yi license|falcon)/i;

/** Short badge label for any licence string arena.ai returns. */
export function licenseLabel(lic) {
  const s = (lic ?? '').trim();
  if (!s || /^proprietary$/i.test(s)) return 'Prop';
  if (/^mit$/i.test(s))               return 'MIT';
  if (/^modified mit$/i.test(s))      return 'Mod MIT';
  if (/^apache/i.test(s))             return 'Apache';
  if (/^llama/i.test(s))              return 'Llama';
  if (/^gemma/i.test(s))              return 'Gemma';
  if (/^(qwen|qianwen)/i.test(s))     return 'Qwen';
  if (/^deepseek/i.test(s))           return 'DeepSeek';
  if (/^nvidia/i.test(s))             return 'NVIDIA';
  if (/^cc-by-nc/i.test(s))           return 'CC NC';
  if (/^cc-by/i.test(s))              return 'CC BY';
  if (/^non-?commercial/i.test(s))    return 'Non-comm';
  if (/^openmdw/i.test(s))            return 'OpenMDW';
  if (s.length <= 10) return s;
  return s.split(/[\s-]/)[0].slice(0, 10);
}

export const LICENSE_CONFIG = {
  'Proprietary':   { label: 'Prop',   color: '#8E8E93', bg: 'rgba(142,142,147,0.12)' },
  'MIT':           { label: 'MIT',    color: '#34C759', bg: 'rgba(52,199,89,0.12)'   },
  'Apache 2.0':    { label: 'Apache', color: '#34C759', bg: 'rgba(52,199,89,0.12)'   },
  'Modified MIT':  { label: 'Mod MIT',color: '#FF9500', bg: 'rgba(255,149,0,0.12)'   },
  'Open Source':   { label: 'Open',   color: '#34C759', bg: 'rgba(52,199,89,0.12)'   },
};

/** Badge styling for any licence, derived when it isn't in LICENSE_CONFIG. */
export function licenseStyle(lic) {
  const exact = LICENSE_CONFIG[lic];
  if (exact) return exact;
  const label = licenseLabel(lic);
  if (RESTRICTED_LICENSE_RE.test(lic ?? '')) return { label, color: '#FF9500', bg: 'rgba(255,149,0,0.12)' };
  if (OPEN_LICENSE_RE.test(lic ?? ''))       return { label, color: '#34C759', bg: 'rgba(52,199,89,0.12)' };
  return { label, color: '#8E8E93', bg: 'rgba(142,142,147,0.12)' };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtVotes(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtContext(n) {
  if (!n) return null;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  return `${Math.round(n / 1_000)}K`;
}

function formatName(slug) {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bGpt\b/g,   'GPT')
    .replace(/\bGlm\b/g,   'GLM')
    .replace(/\bErnie\b/g, 'ERNIE')
    .replace(/\bO(\d)/g,   'o$1');
}

function initials(name) {
  return (name ?? '').replace(/[^A-Za-z0-9 ]/g, '').trim()
    .split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

const LICENSE_NAMES = ['Proprietary', 'MIT', 'Apache 2.0', 'Apache', 'Open Source', 'Modified MIT', 'CC BY', 'Llama'];

/** Cleans raw name strings that HTML parser may produce, e.g.
 *  "Anthropic claude-opus-4-7-thinking Anthropic · Proprietary"
 *  → "Claude Opus 4 7 Thinking"  */
function cleanName(raw, org) {
  let s = (raw ?? '').trim();
  // Strip licence suffixes like "· Proprietary" or "Proprietary" at end
  for (const lic of LICENSE_NAMES) {
    s = s.replace(new RegExp(`\\s*[·•]?\\s*${lic}\\s*$`, 'i'), '');
  }
  // Strip known org name from start/end
  if (org && org !== 'Unknown') {
    const e = org.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp(`^${e}\\s+`, 'i'), '');
    s = s.replace(new RegExp(`\\s+${e}\\s*$`, 'i'), '');
  }
  // Strip any remaining org names from ORG_CONFIG
  for (const o of Object.keys(ORG_CONFIG)) {
    const e = o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp(`^${e}\\s+`, 'i'), '');
    s = s.replace(new RegExp(`\\s+${e}\\s*$`, 'i'), '');
  }
  return s.trim();
}

/** True when the weights are downloadable, whatever the licence's exact wording.
 *  arena.ai publishes ~38 distinct licence strings; an exact-match whitelist
 *  (the previous approach) marked most open models as proprietary. */
export function isOpenWeights(lic) {
  const s = (lic ?? '').trim();
  if (!s || /^(proprietary|other|unknown)/i.test(s)) return false;
  return true;
}

/** Transform arena.ai model object → our app model shape */
export function normaliseModel(m, rank) {
  const cleaned = cleanName(m.name, m.org);
  const name   = cleaned ? formatName(cleaned) : formatName(m.slug ?? '');
  const slug   = (m.slug || '').trim() || String(rank ?? m.rank ?? '');
  return {
    rank:        rank ?? m.rank ?? 1,
    slug,
    name,
    org:         m.org  ?? 'Unknown',
    license:     m.license ?? 'Proprietary',
    elo:         m.elo  ?? 1200,
    ci:          m.ci   ?? null,
    votes:       m.votes ?? 0,
    votesLabel:  fmtVotes(m.votes ?? 0),
    priceIn:     m.priceIn  ?? null,
    priceOut:    m.priceOut ?? null,
    context:     m.context  ?? null,
    url:         m.url ?? null,
    isNew:       m.isNew ?? false,
    // arena.ai names reasoning variants both "…-thinking" and "…-reasoning"
    isThinking:  /thinking|reasoning/i.test(name),
    isOpen:      isOpenWeights(m.license),
    initials:    initials(name),
  };
}

// Note: an earlier revision spliced hand-written entries (claude-opus-4-7,
// gpt-5.6-*) into the live response with *estimated* ELOs and votes: 0. arena
// now rates those models for real, so the injection produced duplicate rows
// that outranked the genuine ones. A board that claims live arena ELO must
// only contain models arena has actually rated — no manual entries.

/** Fetch live leaderboard from our Netlify Function.
 *  Returns { models, fetchedAt, stale } so the UI can be honest about age. */
export async function fetchLeaderboard() {
  const res  = await fetch(LEADERBOARD_URL);
  if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json.models) || json.models.length === 0) {
    throw new Error('Invalid leaderboard response');
  }
  const models = json.models.map((m, i) => normaliseModel(m, i + 1));
  models.fetchedAt = json.fetchedAt ?? null;
  models.stale     = json.stale === true;
  return models;
}

/** Fetch live pricing from OpenRouter */
export async function fetchOpenRouterMeta() {
  try {
    const res  = await fetch(OPENROUTER_MODELS_URL);
    const json = await res.json();
    const map  = {};
    for (const m of json.data ?? []) {
      map[m.id] = {
        priceIn:  m.pricing?.prompt     ? parseFloat(m.pricing.prompt)     * 1_000_000 : null,
        priceOut: m.pricing?.completion ? parseFloat(m.pricing.completion) * 1_000_000 : null,
      };
    }
    return map;
  } catch {
    return {};
  }
}

// ── Fallback: real arena.ai snapshot (top 60, April 2026) ─────────────────
// [slug, org, elo, votes, license, priceIn, priceOut, contextTokens]
// Models marked NEW are manually added before arena.ai picks them up
const RAW_FALLBACK = [
  ['claude-opus-4-7',                        'Anthropic', 1515, 0,      'Proprietary',  5,     25,    1000000 ], // NEW — estimated ELO
  ['gpt-5.6-sol',                            'OpenAI',    1513, 0,      'Proprietary',  5,     30,    1050000 ], // NEW — estimated ELO (GA 2026-07-09)
  ['claude-opus-4-6-thinking',               'Anthropic', 1502, 17219,  'Proprietary',  5,     25,    1000000 ],
  ['claude-opus-4-6',                        'Anthropic', 1496, 18377,  'Proprietary',  5,     25,    1000000 ],
  ['muse-spark',                             'Meta',      1495, 4182,   'Proprietary',  null,  null,  null    ],
  ['gpt-5.6-terra',                          'OpenAI',    1494, 0,      'Proprietary',  2.5,   15,    1050000 ], // NEW — estimated ELO (GA 2026-07-09)
  ['gemini-3.1-pro-preview',                 'Google',    1493, 21708,  'Proprietary',  2,     12,    1048576 ],
  ['gemini-3-pro',                           'Google',    1486, 41578,  'Proprietary',  2,     12,    1048576 ],
  ['grok-4.20-beta1',                        'xAI',       1485, 10884,  'Proprietary',  null,  null,  null    ],
  ['gpt-5.4-high',                           'OpenAI',    1481, 10633,  'Proprietary',  2.5,   15,    1050000 ],
  ['grok-4.20-beta-0309-reasoning',          'xAI',       1479, 10713,  'Proprietary',  2,     6,     2000000 ],
  ['gpt-5.2-chat-latest-20260210',           'OpenAI',    1476, 16810,  'Proprietary',  1.75,  14,    128000  ],
  ['grok-4.20-multi-agent-beta-0309',        'xAI',       1476, 11079,  'Proprietary',  2,     6,     2000000 ],
  ['gemini-3-flash',                         'Google',    1474, 30922,  'Proprietary',  0.5,   3,     1048576 ],
  ['claude-opus-4-5-thinking',               'Anthropic', 1473, 37292,  'Proprietary',  5,     25,    200000  ],
  ['gpt-5.6-luna',                           'OpenAI',    1472, 0,      'Proprietary',  1,     6,     1050000 ], // NEW — estimated ELO (GA 2026-07-09)
  ['glm-5.1',                                'Z.ai',      1471, 6274,   'MIT',          0.95,  3.15,  202800  ],
  ['grok-4.1-thinking',                      'xAI',       1470, 48508,  'Proprietary',  null,  null,  null    ],
  ['claude-opus-4-5',                        'Anthropic', 1469, 48318,  'Proprietary',  5,     25,    200000  ],
  ['gpt-5.4',                                'OpenAI',    1466, 10990,  'Proprietary',  2.5,   15,    1100000 ],
  ['qwen3.5-max-preview',                    'Alibaba',   1466, 8774,   'Proprietary',  null,  null,  null    ],
  ['gemini-3-flash-thinking',                'Google',    1462, 34519,  'Proprietary',  0.5,   3,     1048576 ],
  ['claude-sonnet-4-6',                      'Anthropic', 1461, 10935,  'Proprietary',  3,     15,    1000000 ],
  ['dola-seed-2.0-pro',                      'Bytedance', 1460, 19770,  'Proprietary',  null,  null,  null    ],
  ['grok-4.1',                               'xAI',       1460, 52460,  'Proprietary',  null,  null,  null    ],
  ['gpt-5.4-mini-high',                      'OpenAI',    1457, 8174,   'Proprietary',  2.5,   15,    1100000 ],
  ['glm-5',                                  'Z.ai',      1456, 14988,  'MIT',          1,     3.2,   202800  ],
  ['gpt-5.3-chat-latest',                    'OpenAI',    1455, 15448,  'Proprietary',  1.75,  14,    128000  ],
  ['gpt-5.1-high',                           'OpenAI',    1454, 41035,  'Proprietary',  1.25,  10,    400000  ],
  ['claude-sonnet-4-5-thinking',             'Anthropic', 1452, 61159,  'Proprietary',  3,     15,    200000  ],
  ['claude-sonnet-4-5',                      'Anthropic', 1451, 59047,  'Proprietary',  3,     15,    200000  ],
  ['kimi-k2.5-thinking',                     'Moonshot',  1451, 21678,  'Modified MIT', 0.6,   3,     null    ],
  ['gemma-4-31b',                            'Google',    1450, 5839,   'Apache 2.0',   0.14,  0.4,   262100  ],
  ['ernie-5.0',                              'Baidu',     1450, 23507,  'Proprietary',  null,  null,  null    ],
  ['claude-opus-4-1-thinking',               'Anthropic', 1448, 50147,  'Proprietary',  15,    75,    200000  ],
  ['gemini-2.5-pro',                         'Google',    1448, 108717, 'Proprietary',  1.25,  10,    1000000 ],
  ['mimo-v2-pro',                            'Xiaomi',    1447, 9239,   'Proprietary',  1,     3,     1000000 ],
  ['claude-opus-4-1',                        'Anthropic', 1447, 77831,  'Proprietary',  15,    75,    200000  ],
  ['qwen3.5-397b-a17b',                      'Alibaba',   1446, 16360,  'Apache 2.0',   0.39,  2.34,  262100  ],
  ['gpt-4.5-preview',                        'OpenAI',    1444, 14547,  'Proprietary',  75,    150,   128000  ],
  ['chatgpt-4o-latest',                      'OpenAI',    1443, 82981,  'Proprietary',  5,     15,    128000  ],
  ['glm-4.7',                                'Z.ai',      1443, 12180,  'MIT',          0.39,  1.75,  202800  ],
  ['gpt-5.2-high',                           'OpenAI',    1441, 31439,  'Proprietary',  1.75,  14,    400000  ],
  ['gpt-5.2',                                'OpenAI',    1439, 28519,  'Proprietary',  1.75,  14,    400000  ],
  ['gpt-5.1',                                'OpenAI',    1438, 43688,  'Proprietary',  1.25,  10,    400000  ],
  ['gemini-3.1-flash-lite-preview',          'Google',    1436, 16969,  'Proprietary',  0.25,  1.5,   1000000 ],
  ['qwen3-max-preview',                      'Alibaba',   1435, 27926,  'Proprietary',  0.78,  3.9,   262100  ],
  ['gpt-5-high',                             'OpenAI',    1433, 32239,  'Proprietary',  1.25,  10,    400000  ],
  ['kimi-k2.5-instant',                      'Moonshot',  1432, 8234,   'Modified MIT', 0.38,  1.72,  262100  ],
  ['grok-4-1-fast-reasoning',                'xAI',       1432, 43555,  'Proprietary',  0.2,   0.5,   2000000 ],
  ['o3-2025-04-16',                          'OpenAI',    1431, 60167,  'Proprietary',  2,     8,     200000  ],
  ['kimi-k2-thinking-turbo',                 'Moonshot',  1430, 47037,  'Modified MIT', 1.15,  8,     262100  ],
  ['gpt-5-chat',                             'OpenAI',    1426, 31842,  'Proprietary',  1.25,  10,    128000  ],
  ['glm-4.6',                                'Z.ai',      1426, 35904,  'MIT',          0.39,  1.9,   204800  ],
  ['deepseek-v3.2-thinking',                 'DeepSeek',  1425, 9140,   'MIT',          0.27,  0.41,  163800  ],
  ['deepseek-v3.2',                          'DeepSeek',  1423, 42036,  'MIT',          0.26,  0.38,  163800  ],
  ['qwen3-235b-a22b',                        'Alibaba',   1423, 82850,  'Apache 2.0',   0.26,  1.06,  null    ],
  ['deepseek-v3.2-exp-thinking',             'DeepSeek',  1423, 36441,  'MIT',          0.26,  0.38,  163800  ],
  ['qwen3-max',                              'Alibaba',   1424, 9244,   'Proprietary',  0.78,  3.9,   262100  ],
  ['claude-opus-4-thinking',                 'Anthropic', 1424, 37185,  'Proprietary',  15,    75,    200000  ],
  ['gpt-5-mini-high',                        'OpenAI',    1421, 38821,  'Proprietary',  0.4,   1.6,   128000  ],
  ['qwen3-30b-a3b',                          'Alibaba',   1420, 48231,  'Apache 2.0',   0.1,   0.4,   131000  ],
  ['kimi-k2-instant',                        'Moonshot',  1419, 39871,  'Modified MIT', 0.3,   1.5,   262100  ],
  ['gemini-3-flash-lite',                    'Google',    1418, 25413,  'Proprietary',  0.1,   0.4,   1048576 ],
  ['claude-sonnet-4',                        'Anthropic', 1416, 75342,  'Proprietary',  3,     15,    200000  ],
  ['llama-4-maverick',                       'Meta',      1414, 67219,  'Proprietary',  0.2,   0.6,   1000000 ],
];

export const MODELS = RAW_FALLBACK.map(([slug, org, elo, votes, license, priceIn, priceOut, ctxRaw], i) => {
  const name = formatName(slug);
  const isOpen = ['MIT', 'Apache 2.0', 'Open Source'].includes(license);
  return {
    rank:       i + 1,
    slug,
    name,
    org,
    license,
    elo,
    ci:         null,
    votes,
    votesLabel: fmtVotes(votes),
    priceIn,
    priceOut,
    context:    fmtContext(ctxRaw),
    isThinking: /thinking/i.test(name),
    isOpen,
    initials:   initials(name),
  };
});
