// ─── AI WAR ROOM · Model Data ──────────────────────────────────────────────
// ELO data: live from arena.ai via Netlify Function (/api/leaderboard)
// Fallback: real arena.ai snapshot (auto-shown while live data loads)
// Pricing:  live from OpenRouter API (auto-refreshed every 30 min)

export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
export const LEADERBOARD_URL       = '/api/leaderboard';
export const AUTO_REFRESH_MS       = 30 * 60 * 1000; // 30 min
export const RELEASE               = 'AI-WAR-LIVE';

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
};

export const LICENSE_CONFIG = {
  'Proprietary':   { label: 'Prop',   color: '#8E8E93', bg: 'rgba(142,142,147,0.12)' },
  'MIT':           { label: 'MIT',    color: '#34C759', bg: 'rgba(52,199,89,0.12)'   },
  'Apache 2.0':    { label: 'Apache', color: '#34C759', bg: 'rgba(52,199,89,0.12)'   },
  'Modified MIT':  { label: 'Mod MIT',color: '#FF9500', bg: 'rgba(255,149,0,0.12)'   },
  'Open Source':   { label: 'Open',   color: '#34C759', bg: 'rgba(52,199,89,0.12)'   },
};

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

/** Transform arena.ai model object → our app model shape */
export function normaliseModel(m, rank) {
  const lic = (m.license ?? '').trim();
  const isOpen = /^(MIT|Apache[\s-]?2\.0|Open Source|Modified MIT|Jamba Open|Nvidia Open|NVIDIA Open Model|Apache-2\.0)$/i.test(lic)
    || /^Llama[\s-]?[34]/i.test(lic);
  const cleaned = cleanName(m.name, m.org);
  const name   = cleaned ? formatName(cleaned) : formatName(m.slug ?? '');
  return {
    rank:        rank ?? m.rank ?? 1,
    slug:        m.slug ?? String(rank),
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
    isThinking:  /thinking/i.test(name),
    isOpen,
    initials:    initials(name),
  };
}

/** Fetch live leaderboard from our Netlify Function */
export async function fetchLeaderboard() {
  const res  = await fetch(LEADERBOARD_URL);
  if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json.models)) throw new Error('Invalid leaderboard response');
  return json.models.map((m, i) => normaliseModel(m, i + 1));
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
  ['claude-opus-4-6-thinking',               'Anthropic', 1502, 17219,  'Proprietary',  5,     25,    1000000 ],
  ['claude-opus-4-6',                        'Anthropic', 1496, 18377,  'Proprietary',  5,     25,    1000000 ],
  ['muse-spark',                             'Meta',      1495, 4182,   'Proprietary',  null,  null,  null    ],
  ['gemini-3.1-pro-preview',                 'Google',    1493, 21708,  'Proprietary',  2,     12,    1048576 ],
  ['gemini-3-pro',                           'Google',    1486, 41578,  'Proprietary',  2,     12,    1048576 ],
  ['grok-4.20-beta1',                        'xAI',       1485, 10884,  'Proprietary',  null,  null,  null    ],
  ['gpt-5.4-high',                           'OpenAI',    1481, 10633,  'Proprietary',  2.5,   15,    1050000 ],
  ['grok-4.20-beta-0309-reasoning',          'xAI',       1479, 10713,  'Proprietary',  2,     6,     2000000 ],
  ['gpt-5.2-chat-latest-20260210',           'OpenAI',    1476, 16810,  'Proprietary',  1.75,  14,    128000  ],
  ['grok-4.20-multi-agent-beta-0309',        'xAI',       1476, 11079,  'Proprietary',  2,     6,     2000000 ],
  ['gemini-3-flash',                         'Google',    1474, 30922,  'Proprietary',  0.5,   3,     1048576 ],
  ['claude-opus-4-5-thinking',               'Anthropic', 1473, 37292,  'Proprietary',  5,     25,    200000  ],
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
