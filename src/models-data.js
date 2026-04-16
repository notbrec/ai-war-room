// ─── AI WAR ROOM · Model Data ──────────────────────────────────────────────
// Domain: aiwarroom.app
// ELO-based arena ranking. Enriched with OpenRouter model metadata.
// Update MODELS array when new scores arrive. Pricing auto-refreshes from API.

export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
export const AUTO_REFRESH_MS       = 30 * 60 * 1000; // 30 min
export const RELEASE               = 'AI-WAR-2026-Q2';

export const ORG_CONFIG = {
  'Anthropic':    { color: '#CC785C', bg: '#FBF0EC', bgDark: '#3A2218' },
  'OpenAI':       { color: '#10A37F', bg: '#E8F8F2', bgDark: '#122A22' },
  'Google':       { color: '#4285F4', bg: '#E8F0FE', bgDark: '#131D3A' },
  'Z.ai':         { color: '#007AFF', bg: '#E7F3FF', bgDark: '#0D1F33' },
  'Alibaba':      { color: '#FF6B00', bg: '#FFF0E6', bgDark: '#2E1800' },
  'xAI':          { color: '#FFFFFF', bg: '#2C2C2E', bgDark: '#1C1C1E' },
  'Moonshot':     { color: '#00C7BE', bg: '#E6FAFB', bgDark: '#0A2525' },
  'MiniMax':      { color: '#8B5CF6', bg: '#F3EFFE', bgDark: '#1E1133' },
  'Xiaomi':       { color: '#FF6900', bg: '#FFF3E6', bgDark: '#2E1400' },
  'DeepSeek':     { color: '#5856D6', bg: '#EEEEFE', bgDark: '#16143A' },
  'Mistral':      { color: '#FF3B30', bg: '#FFF0EF', bgDark: '#2E0D0C' },
  'KwaiKAT':      { color: '#FF9500', bg: '#FFF5E6', bgDark: '#2E1E00' },
  'Inception AI': { color: '#34C759', bg: '#EDFAF2', bgDark: '#0C2918' },
};

export const LICENSE_CONFIG = {
  'Proprietary':    { label: 'Prop',         color: '#8E8E93', bg: 'rgba(142,142,147,0.12)' },
  'MIT':            { label: 'MIT',           color: '#34C759', bg: 'rgba(52,199,89,0.12)'  },
  'Apache 2.0':     { label: 'Apache',        color: '#34C759', bg: 'rgba(52,199,89,0.12)'  },
  'Modified MIT':   { label: 'Mod MIT',       color: '#FF9500', bg: 'rgba(255,149,0,0.12)'  },
};

// [name, displayName, org, license, elo, ci, votes, priceIn, priceOut, context]
// priceIn/priceOut = $/M tokens, null = N/A
// context = tokens in K or M, null = N/A
const RAW = [
  ['claude-opus-4-6-thinking',              'Claude Opus 4.6 Thinking',        'Anthropic', 'Proprietary', 1548,  11,  4237, 5.00,  25.00, '1M'   ],
  ['claude-opus-4-6',                       'Claude Opus 4.6',                 'Anthropic', 'Proprietary', 1545,  10,  5085, 5.00,  25.00, '1M'   ],
  ['glm-5.1',                               'GLM 5.1',                         'Z.ai',      'MIT',         1537,  17,  1482, 0.95,  3.15,  '202K' ],
  ['claude-sonnet-4-6',                     'Claude Sonnet 4.6',               'Anthropic', 'Proprietary', 1524,   9,  7077, 3.00,  15.00, '1M'   ],
  ['claude-opus-4-5-thinking',              'Claude Opus 4.5 Thinking',        'Anthropic', 'Proprietary', 1490,   7, 13065, 5.00,  25.00, '200K' ],
  ['claude-opus-4-5',                       'Claude Opus 4.5',                 'Anthropic', 'Proprietary', 1468,   7, 14690, 5.00,  25.00, '200K' ],
  ['gpt-5.4-high-codex',                    'GPT-5.4 High (Codex)',            'OpenAI',    'Proprietary', 1457,  17,  1483, 2.50,  15.00, '1.1M' ],
  ['gemini-3.1-pro-preview',                'Gemini 3.1 Pro Preview',          'Google',    'Proprietary', 1454,   9,  6069, 2.00,  12.00, '1M'   ],
  ['qwen3.6-plus-preview',                  'Qwen 3.6 Plus Preview',           'Alibaba',   'Proprietary', 1453,  13,  2211, 0.33,  1.95,  '1M'   ],
  ['glm-5',                                 'GLM 5',                           'Z.ai',      'MIT',         1440,   9,  4959, 1.00,  3.20,  '202K' ],
  ['glm-4.7',                               'GLM 4.7',                         'Z.ai',      'MIT',         1440,  10,  4878, 0.39,  1.75,  '202K' ],
  ['gemini-3-pro',                          'Gemini 3 Pro',                    'Google',    'Proprietary', 1438,   7, 17162, 2.00,  12.00, '1M'   ],
  ['gpt-5.4-medium-codex',                  'GPT-5.4 Medium (Codex)',          'OpenAI',    'Proprietary', 1437,  16,  1449, 2.50,  15.00, '1.1M' ],
  ['gemini-3-flash',                        'Gemini 3 Flash',                  'Google',    'Proprietary', 1437,   7, 13269, 0.50,  3.00,  '1M'   ],
  ['mimo-v2-pro',                           'MiMo V2 Pro',                     'Xiaomi',    'Proprietary', 1432,  11,  3234, 1.00,  3.00,  '1M'   ],
  ['kimi-k2.5-thinking',                    'Kimi K2.5 Thinking',              'Moonshot',  'Modified MIT',1429,   8,  7339, 0.60,  3.00,  null   ],
  ['minimax-m2.7',                          'Minimax M2.7',                    'MiniMax',   'Modified MIT',1422,  11,  3026, 0.30,  1.20,  '196K' ],
  ['kimi-k2.5-instant',                     'Kimi K2.5 Instant',               'Moonshot',  'Modified MIT',1408,  11,  3610, 0.38,  1.72,  '262K' ],
  ['gpt-5.3-codex',                         'GPT-5.3 Codex',                   'OpenAI',    'Proprietary', 1407,  12,  2971, 1.75,  14.00, '400K' ],
  ['gpt-5.2',                               'GPT-5.2',                         'OpenAI',    'Proprietary', 1404,  17,  1461, 1.75,  14.00, '400K' ],
  ['grok-4.20-beta-reasoning',              'Grok 4.20 Beta Reasoning',        'xAI',       'Proprietary', 1396,  11,  3378, 2.00,  6.00,  '2M'   ],
  ['gpt-5.4-mini-high',                     'GPT-5.4 Mini High',               'OpenAI',    'Proprietary', 1393,  15,  1843, 2.50,  15.00, '1.1M' ],
  ['gpt-5-medium',                          'GPT-5 Medium',                    'OpenAI',    'Proprietary', 1393,  13,  3755, 1.25,  10.00, '400K' ],
  ['minimax-m2.1-preview',                  'Minimax M2.1 Preview',            'MiniMax',   'MIT',         1392,   8,  9273, 0.29,  0.95,  '196K' ],
  ['gpt-5.1-medium',                        'GPT-5.1 Medium',                  'OpenAI',    'Proprietary', 1391,   9,  6124, 1.25,  10.00, '400K' ],
  ['qwen3.5-397b',                          'Qwen 3.5 397B A17B',              'Alibaba',   'Apache 2.0',  1389,   8,  5978, 0.39,  2.34,  '262K' ],
  ['gemini-3-flash-thinking',               'Gemini 3 Flash (Thinking)',        'Google',    'Proprietary', 1389,   7, 12677, 0.50,  3.00,  '1M'   ],
  ['minimax-m2.5',                          'Minimax M2.5',                    'MiniMax',   'Modified MIT',1388,   8,  7184, 0.12,  0.99,  '196K' ],
  ['claude-sonnet-4-5-thinking',            'Claude Sonnet 4.5 Thinking',      'Anthropic', 'Proprietary', 1388,   6, 15750, 3.00,  15.00, '200K' ],
  ['claude-sonnet-4-5',                     'Claude Sonnet 4.5',               'Anthropic', 'Proprietary', 1386,   6, 18409, 3.00,  15.00, '200K' ],
  ['claude-opus-4-1',                       'Claude Opus 4.1',                 'Anthropic', 'Proprietary', 1385,   9,  8573,15.00,  75.00, '200K' ],
  ['deepseek-v3.2-thinking',                'DeepSeek V3.2 Thinking',          'DeepSeek',  'MIT',         1368,   8,  7910, 0.26,  0.38,  '163K' ],
  ['qwen3.5-122b',                          'Qwen 3.5 122B A10B',              'Alibaba',   'Apache 2.0',  1364,   9,  4758, 0.26,  2.08,  '262K' ],
  ['glm-4.6',                               'GLM 4.6',                         'Z.ai',      'MIT',         1354,   9,  8351, 0.39,  1.90,  '204K' ],
  ['qwen3.5-27b',                           'Qwen 3.5 27B',                    'Alibaba',   'Apache 2.0',  1347,  10,  4369, 0.20,  1.56,  '262K' ],
  ['gpt-5.1',                               'GPT-5.1',                         'OpenAI',    'Proprietary', 1339,   7, 12875, 1.25,  10.00, '400K' ],
  ['mimo-v2-flash',                         'MiMo V2 Flash',                   'Xiaomi',    'MIT',         1337,   8,  6734, 0.09,  0.29,  '262K' ],
  ['gpt-5.2-codex',                         'GPT-5.2 Codex',                   'OpenAI',    'Proprietary', 1335,   8,  7765, 1.75,  14.00, '400K' ],
  ['deepseek-v3.2',                         'DeepSeek V3.2',                   'DeepSeek',  'MIT',         1330,   7,  9997, 0.26,  0.38,  '163K' ],
  ['kimi-k2-thinking-turbo',                'Kimi K2 Thinking Turbo',          'Moonshot',  'Modified MIT',1330,   6, 15368, 1.15,  8.00,  '262K' ],
  ['gpt-5.1-codex',                         'GPT-5.1 Codex',                   'OpenAI',    'Proprietary', 1329,   9,  6229, 1.25,  10.00, '400K' ],
  ['claude-haiku-4-5',                      'Claude Haiku 4.5',                'Anthropic', 'Proprietary', 1314,   6, 17091, 1.00,  5.00,  '200K' ],
  ['minimax-m2',                            'Minimax M2',                      'MiniMax',   'Apache 2.0',  1304,   9,  8402, 0.26,  1.00,  '196K' ],
  ['mimo-v2-flash-thinking',                'MiMo V2 Flash (Thinking)',        'Xiaomi',    'MIT',         1300,  14,  2095, 0.09,  0.29,  '262K' ],
  ['deepseek-v3.2-exp',                     'DeepSeek V3.2 Exp',               'DeepSeek',  'MIT',         1286,  11,  4870, 0.27,  0.41,  '163K' ],
  ['qwen3-coder-480b',                      'Qwen3 Coder 480B A35B',           'Alibaba',   'Apache 2.0',  1281,   7, 15212, 0.40,  1.60,  '262K' ],
  ['kat-coder-pro-v1',                      'KAT Coder Pro V1',                'KwaiKAT',   'Proprietary', 1258,  15,  1883, 0.21,  0.83,  '256K' ],
  ['qwen3.5-35b',                           'Qwen 3.5 35B A3B',                'Alibaba',   'Apache 2.0',  1247,  16,  1817, 0.16,  1.30,  '262K' ],
  ['gpt-5.1-codex-mini',                    'GPT-5.1 Codex Mini',              'OpenAI',    'Proprietary', 1239,  17,  1444, 0.25,  2.00,  '400K' ],
  ['qwen3.5-flash',                         'Qwen 3.5 Flash',                  'Alibaba',   'Proprietary', 1236,  17,  1562, null,  null,  null   ],
  ['gemini-3.1-flash-lite-preview',         'Gemini 3.1 Flash Lite Preview',   'Google',    'Proprietary', 1236,  10,  5544, 0.25,  1.50,  '1M'   ],
  ['grok-4-1-fast-reasoning',               'Grok 4.1 Fast Reasoning',         'xAI',       'Proprietary', 1234,   9,  6916, 0.20,  0.50,  '2M'   ],
  ['mistral-large-3',                       'Mistral Large 3',                 'Mistral',   'Apache 2.0',  1222,  20,  1032, 0.50,  1.50,  null   ],
  ['grok-4.1-thinking',                     'Grok 4.1 Thinking',               'xAI',       'Proprietary', 1207,  20,  1209, null,  null,  null   ],
  ['gemini-2.5-pro',                        'Gemini 2.5 Pro',                  'Google',    'Proprietary', 1202,  13,  3300, 1.25,  10.00, '1M'   ],
  ['devstral-2',                            'Devstral 2',                      'Mistral',   'Modified MIT',1199,  17,  1579, null,  null,  null   ],
  ['mercury-2',                             'Mercury 2',                       'Inception AI','Proprietary',1167, 23,   951, 0.25,  0.75,  '128K' ],
  ['grok-4-fast-reasoning',                 'Grok 4 Fast Reasoning',           'xAI',       'Proprietary', 1148,  23,   936, 0.20,  0.50,  '2M'   ],
  ['grok-code-fast-1',                      'Grok Code Fast 1',                'xAI',       'Proprietary', 1139,  22,   984, 0.20,  1.50,  '256K' ],
  ['devstral-medium-2507',                  'Devstral Medium 2507',            'Mistral',   'Proprietary', 1091,  23,   993, 0.40,  2.00,  '128K' ],
];

function fmtVotes(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function initials(name) {
  return name.replace(/[^A-Za-z0-9 ]/g, '').trim()
    .split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export const MODELS = RAW.map(([slug, displayName, org, license, elo, ci, votes, priceIn, priceOut, context], i) => ({
  rank: i + 1,
  slug,
  name: displayName,
  org,
  license,
  elo,
  ci,
  votes,
  votesLabel: fmtVotes(votes),
  priceIn,
  priceOut,
  context,
  isThinking: /thinking/i.test(displayName),
  isOpen: license === 'MIT' || license === 'Apache 2.0',
  initials: initials(displayName),
}));

// Fetch live model metadata from OpenRouter (pricing, context, descriptions)
// Returns map of slug → { context_length, pricing, description }
export async function fetchOpenRouterMeta() {
  try {
    const res  = await fetch(OPENROUTER_MODELS_URL);
    const json = await res.json();
    const map  = {};
    for (const m of json.data ?? []) {
      map[m.id] = {
        description:    m.description ?? null,
        context_length: m.context_length ?? null,
        priceIn:  m.pricing?.prompt     ? parseFloat(m.pricing.prompt)     * 1_000_000 : null,
        priceOut: m.pricing?.completion ? parseFloat(m.pricing.completion) * 1_000_000 : null,
      };
    }
    return map;
  } catch {
    return {};
  }
}
