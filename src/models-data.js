// ─── AI WAR ROOM · Model Data ──────────────────────────────────────────────
// ELO data: live from arena.ai via Netlify Function (/api/leaderboard)
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
  'Mistral':      { color: '#FF3B30', bg: '#FFF0EF', bgDark: '#2E0D0C' },
  'DeepSeek':     { color: '#5856D6', bg: '#EEEEFE', bgDark: '#16143A' },
  'Alibaba':      { color: '#FF6B00', bg: '#FFF0E6', bgDark: '#2E1800' },
  'xAI':          { color: '#FFFFFF', bg: '#2C2C2E', bgDark: '#1C1C1E' },
  'Cohere':       { color: '#39594D', bg: '#E6F2EE', bgDark: '#0E2119' },
  'AI21':         { color: '#6C63FF', bg: '#F0EFFE', bgDark: '#1A1840' },
  'Z.ai':         { color: '#007AFF', bg: '#E7F3FF', bgDark: '#0D1F33' },
  'Moonshot':     { color: '#00C7BE', bg: '#E6FAFB', bgDark: '#0A2525' },
  'MiniMax':      { color: '#8B5CF6', bg: '#F3EFFE', bgDark: '#1E1133' },
  'Xiaomi':       { color: '#FF6900', bg: '#FFF3E6', bgDark: '#2E1400' },
  'Microsoft':    { color: '#00A4EF', bg: '#E6F6FD', bgDark: '#07232E' },
  'Amazon':       { color: '#FF9900', bg: '#FFF5E6', bgDark: '#2E1E00' },
  'Inception AI': { color: '#34C759', bg: '#EDFAF2', bgDark: '#0C2918' },
};

export const LICENSE_CONFIG = {
  'Proprietary':   { label: 'Prop',   color: '#8E8E93', bg: 'rgba(142,142,147,0.12)' },
  'MIT':           { label: 'MIT',    color: '#34C759', bg: 'rgba(52,199,89,0.12)'   },
  'Apache 2.0':    { label: 'Apache', color: '#34C759', bg: 'rgba(52,199,89,0.12)'   },
  'Modified MIT':  { label: 'Mod MIT',color: '#FF9500', bg: 'rgba(255,149,0,0.12)'   },
  'Open Source':   { label: 'Open',   color: '#34C759', bg: 'rgba(52,199,89,0.12)'   },
};

function fmtVotes(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function initials(name) {
  return (name ?? '').replace(/[^A-Za-z0-9 ]/g, '').trim()
    .split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function orgColor(org) {
  return ORG_CONFIG[org]?.color ?? '#8E8E93';
}

/** Transform raw arena.ai model object → our app model shape */
export function normaliseModel(m, rank) {
  const isOpen = ['MIT', 'Apache 2.0', 'Open Source'].includes(m.license);
  return {
    rank:        rank ?? m.rank ?? 1,
    slug:        m.slug ?? String(rank),
    name:        m.name ?? m.slug ?? 'Unknown',
    org:         m.org  ?? 'Unknown',
    license:     m.license ?? 'Proprietary',
    elo:         m.elo  ?? 1200,
    ci:          m.ci   ?? null,
    votes:       m.votes ?? 0,
    votesLabel:  fmtVotes(m.votes ?? 0),
    priceIn:     m.priceIn  ?? null,
    priceOut:    m.priceOut ?? null,
    context:     m.context  ?? null,
    isThinking:  /thinking/i.test(m.name ?? ''),
    isOpen,
    initials:    initials(m.name ?? ''),
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

// ── Fallback static data (shown on first load / if API fails) ──────────────
// A small set of well-known models so the page isn't empty while loading
const FALLBACK_RAW = [
  { rank:1,  slug:'claude-opus-4-6-thinking',  name:'Claude Opus 4.6 Thinking',  org:'Anthropic', license:'Proprietary', elo:1502, ci:5,  votes:17219, priceIn:5,    priceOut:25,   context:'1M'   },
  { rank:2,  slug:'claude-opus-4-6',            name:'Claude Opus 4.6',            org:'Anthropic', license:'Proprietary', elo:1496, ci:5,  votes:18377, priceIn:5,    priceOut:25,   context:'1M'   },
  { rank:3,  slug:'gemini-3.1-pro-preview',     name:'Gemini 3.1 Pro Preview',     org:'Google',    license:'Proprietary', elo:1493, ci:6,  votes:21708, priceIn:2,    priceOut:12,   context:'1M'   },
  { rank:4,  slug:'gemini-3-pro',               name:'Gemini 3 Pro',               org:'Google',    license:'Proprietary', elo:1486, ci:4,  votes:41578, priceIn:2,    priceOut:12,   context:'1M'   },
  { rank:5,  slug:'gpt-4o',                     name:'GPT-4o',                     org:'OpenAI',    license:'Proprietary', elo:1480, ci:4,  votes:55000, priceIn:2.5,  priceOut:10,   context:'128K' },
];

export const MODELS = FALLBACK_RAW.map((m, i) => normaliseModel(m, i + 1));
