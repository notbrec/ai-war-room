// Netlify Function — Live leaderboard from arena.ai
//
// arena.ai is a Next.js App Router site: the leaderboard is NOT in the served
// HTML (no <table>, no __NEXT_DATA__). It ships as an RSC flight payload split
// across self.__next_f.push([1,"…"]) chunks. Concatenating the *unescaped*
// chunks reconstructs the stream, which contains the full snapshot as
//   "entries":[{rank, modelKey, modelDisplayName, rating, ratingUpper,
//               ratingLower, votes, modelOrganization, modelUrl, license,
//               inputPricePerMillion, outputPricePerMillion, contextLength, …}]
//
// Strategy order: flight → __NEXT_DATA__ → HTML table. Every result is
// validated before it is trusted, and a stale cache is served in preference
// to an error so the site never falls back to hardcoded 2026 data.
//
// Blob cache: arena.ai fetched at most once per 6h.

import { getStore } from '@netlify/blobs';

const CACHE_KEY = 'leaderboard-v5'; // bumped: RSC flight parser
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const ARENA_URL = 'https://arena.ai/leaderboard/text';

// ── Text helpers ───────────────────────────────────────────────────────────
function stripHtml(str) {
  return str.replace(/<[^>]+>/g, ' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}

function parsePrice(str) {
  if (!str || str === 'N/A' || str === '—' || str === '-') return null;
  const m = String(str).match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

/** Context length → compact label. Accepts a number or a "128K"/"1M" string. */
function fmtContext(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || v <= 0) return null;
    if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`;
    if (v >= 1_000)     return `${Math.round(v / 1_000)}K`;
    return String(v);
  }
  const str = String(v).trim().toUpperCase();
  if (!str || str === 'N/A' || str === '—') return null;
  if (str.includes('M')) return `${parseFloat(str)}M`;
  if (str.includes('K')) return `${Math.round(parseFloat(str))}K`;
  return fmtContext(parseInt(str, 10));
}

function parseVotes(str) {
  if (!str) return 0;
  return parseInt(String(str).replace(/,/g, ''), 10) || 0;
}

// ── Organisation normalisation ─────────────────────────────────────────────
// arena.ai's own labels drift (xAI is currently published as "SpaceXAI") and
// ~50 community models ship with an empty organisation. Both cases would
// otherwise render without a lab logo or brand colour on the site.
const ORG_ALIASES = {
  'spacexai': 'xAI', 'xai': 'xAI', 'x.ai': 'xAI',
  'z.ai': 'Z.ai', 'zai': 'Z.ai', 'zhipu': 'Z.ai', 'zhipu ai': 'Z.ai',
  'bytedance': 'Bytedance', 'byte dance': 'Bytedance',
  'ai2': 'Ai2', 'allenai': 'Ai2', 'allen institute': 'Ai2', 'allen institute for ai': 'Ai2',
  'stepfun': 'StepFun', 'step fun': 'StepFun',
  'nvidia': 'Nvidia', 'ibm': 'IBM', 'openai': 'OpenAI',
  'ant group': 'Ant Group', 'antgroup': 'Ant Group',
  'inception ai': 'Inception AI',
  'nexusflow': 'NexusFlow',
  'ai21': 'AI21 Labs', 'ai21 labs': 'AI21 Labs',
  '01-ai': '01.AI', '01.ai': '01.AI', 'lingyiwanwu': '01.AI',
  'lmsys': 'LMSYS', 'lmsysorg': 'LMSYS',
  'mosaicml': 'Databricks', 'databricks': 'Databricks',
  'huggingfaceh4': 'Hugging Face', 'huggingface': 'Hugging Face',
  'nousresearch': 'Nous Research', 'teknium': 'Nous Research',
  'princeton-nlp': 'Princeton NLP',
  'berkeley-nest': 'Berkeley',
  'internlm': 'InternLM', 'shanghai ai lab': 'InternLM',
  'openchat': 'OpenChat',
  'upstage': 'Upstage',
  'snowflake': 'Snowflake',
  'arcee': 'Arcee AI', 'arcee-ai': 'Arcee AI',
  'primeintellect': 'Prime Intellect', 'prime-intellect': 'Prime Intellect',
  'reka': 'Reka', 'cohere': 'Cohere', 'mistral': 'Mistral', 'mistralai': 'Mistral',
  'tiiuae': 'TII', 'tii': 'TII',
  'ehartford': 'Cognitive Computations', 'cognitivecomputations': 'Cognitive Computations',
  'togethercomputer': 'Together AI', 'together': 'Together AI',
  'huggingfacetb': 'Hugging Face',
  'nomic-ai': 'Nomic AI', 'nomicai': 'Nomic AI',
  'stabilityai': 'Stability AI', 'stability': 'Stability AI',
  'timdettmers': 'Tim Dettmers',
  'thudm': 'Z.ai', 'chatglm': 'Z.ai',
  'blinkdl': 'BlinkDL',
  'openassistant': 'OpenAssistant',
  'stanford': 'Stanford', 'stanford-crfm': 'Stanford',
  'mixedbread-ai': 'Mixedbread',
  'sarvamai': 'Sarvam AI',
  'deepcogito': 'Deep Cogito',
  'deepseek-ai': 'DeepSeek', 'qwen': 'Alibaba', 'alibaba': 'Alibaba',
  'meta-llama': 'Meta', 'facebook': 'Meta',
  'google': 'Google', 'googledeepmind': 'Google', 'google-deepmind': 'Google',
  'microsoft': 'Microsoft', 'anthropic': 'Anthropic', 'amazon': 'Amazon',
  'tencent': 'Tencent', 'baidu': 'Baidu', 'xiaomi': 'Xiaomi', 'minimax': 'MiniMax',
  'moonshot': 'Moonshot', 'moonshotai': 'Moonshot', 'meituan': 'Meituan', 'thinky': 'Thinky',
};

// Anything that is *only* ever a licence must never end up in the org column —
// a lossy table parser will happily shift the licence cell one column left.
// Deliberately excluded: bare "Nvidia", "DeepSeek", "Cohere", "NexusFlow" —
// arena.ai publishes those as both a licence name and a real lab name.
const LICENSE_WORDS = /^(proprietary|mit|modified mit|apache([\s-]?2\.0)?|open source|cc[\s-]?by[\w.\s-]*|non-?commercial|other|unknown license|llama[\s\d.-]*(community)?|gemma(\s?license)?|qwen|qianwen[\s\w]*|deepseek license|nvidia open([\s\w]*)?|jamba open|mrl|mistral research|dbrx[\s\w]*|yi license|openmdw[\s\w.-]*|tencent-hunyuan-community|minimax community license|ai2 impact.*|falcon.*)$/i;

/** Domain / Hugging Face owner → lab display name, for blank-org models. */
function orgFromUrl(url) {
  if (!url) return null;
  let host = '', path = '';
  try { const u = new URL(url); host = u.hostname.replace(/^www\./, ''); path = u.pathname; }
  catch { return null; }

  // huggingface.co/<owner>/<model> — the owner is the lab
  if (host === 'huggingface.co') {
    const owner = path.split('/').filter(Boolean)[0];
    if (owner) {
      const hit = ORG_ALIASES[owner.toLowerCase()];
      if (hit) return hit;
      return owner.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return null;
  }

  // Otherwise use the registrable domain label: arcee.ai → Arcee AI
  const label = host.split('.').slice(-2)[0] || host;
  const hit = ORG_ALIASES[label.toLowerCase()] || ORG_ALIASES[host.toLowerCase()];
  if (hit) return hit;
  if (!label || label.length < 2) return null;
  return label.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Canonical lab name: alias-mapped, licence-scrubbed, URL-inferred. */
function normaliseOrg(raw, url) {
  const s = String(raw ?? '').trim();
  if (s && !LICENSE_WORDS.test(s)) {
    return ORG_ALIASES[s.toLowerCase()] ?? s;
  }
  return orgFromUrl(url) ?? 'Unknown';
}

/** Build the wire shape the frontend consumes. */
function toModel(r, i) {
  const name = r.modelDisplayName ?? r.name ?? r.slug ?? r.modelKey ?? '';
  const ci = (typeof r.ratingUpper === 'number' && typeof r.ratingLower === 'number')
    ? Math.max(0, Math.round((r.ratingUpper - r.ratingLower) / 2))
    : (r.ci ?? null);
  return {
    rank:     r.rank ?? i + 1,
    slug:     String(name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9.-]/g, ''),
    name:     String(name),
    org:      normaliseOrg(r.modelOrganization ?? r.org ?? r.organization, r.modelUrl),
    license:  String(r.license ?? 'Proprietary').trim() || 'Proprietary',
    elo:      Math.round(r.rating ?? r.elo ?? r.score ?? 1200),
    ci,
    votes:    r.votes ?? r.battles ?? 0,
    priceIn:  r.inputPricePerMillion  ?? r.priceIn  ?? null,
    priceOut: r.outputPricePerMillion ?? r.priceOut ?? null,
    context:  fmtContext(r.contextLength ?? r.context ?? null),
    url:      r.modelUrl ?? null,
    isNew:    r.releaseType === 'co_release' || r.releaseType === 'pre_release',
  };
}

// ── Strategy 1: RSC flight payload (current arena.ai) ─────────────────────
/** Reconstruct the flight stream by unescaping every __next_f chunk. */
function flightText(html) {
  let out = '';
  const re = /self\.__next_f\.push\(\[\d+\s*,\s*("(?:[^"\\]|\\.)*")/g;
  let m;
  while ((m = re.exec(html))) {
    try { out += JSON.parse(m[1]); } catch { /* partial chunk — skip */ }
  }
  return out;
}

/** Bracket-match a JSON array literal beginning at `start`. */
function sliceArray(s, start) {
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (inStr) { if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return s.slice(start, i + 1); }
  }
  return null;
}

/** Collect every well-formed "entries":[…] array of rated models. */
function parseFlight(html) {
  const text = flightText(html);
  if (!text) return null;

  const candidates = [];
  const NEEDLE = '"entries":';
  let idx = 0;
  while ((idx = text.indexOf(NEEDLE, idx)) !== -1) {
    const raw = sliceArray(text, idx + NEEDLE.length);
    idx += NEEDLE.length;
    if (!raw) continue;
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 5 && arr[0] && typeof arr[0].rating === 'number') {
        candidates.push(arr);
      }
    } catch { /* not the array we want */ }
  }
  if (candidates.length === 0) return null;

  // The overall text leaderboard is the largest snapshot on the page.
  const best = candidates.sort((a, b) => b.length - a.length)[0];
  return best.map(toModel);
}

// ── Strategy 2: __NEXT_DATA__ JSON (Next.js Pages Router) ─────────────────
function parseNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    const pp = data?.props?.pageProps ?? {};
    const arr = pp.entries ?? pp.models ?? pp.leaderboard ?? pp.rankings ?? pp.data ?? pp.rows;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map(toModel);
  } catch { return null; }
}

// ── Strategy 3: HTML table rows (legacy) ──────────────────────────────────
/** Split a combined "OrgName? model-slug OrgName · License" cell. */
function parseNameCell(cell) {
  let text = cell.trim();
  let license = 'Proprietary';
  let org = '';

  const dotIdx = text.lastIndexOf(' · ');
  if (dotIdx >= 0) {
    license = text.slice(dotIdx + 3).trim() || 'Proprietary';
    text = text.slice(0, dotIdx).trim();
  }

  const words = text.split(/\s+/);
  const orgWords = [];
  let cutAt = words.length;
  for (let i = words.length - 1; i >= 0; i--) {
    if (/^[A-Z0-9]/.test(words[i])) { orgWords.unshift(words[i]); cutAt = i; }
    else break;
  }
  if (orgWords.length > 0) {
    org = orgWords.join(' ');
    text = words.slice(0, cutAt).join(' ').trim();
    if (text.toLowerCase().startsWith(org.toLowerCase() + ' ')) {
      text = text.slice(org.length + 1).trim();
    }
  }

  return { name: text || cell.trim(), org, license };
}

function parseHTMLTable(html) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const models = [];

  for (const row of rows) {
    const tds = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    if (tds.length < 3) continue;
    const cells = tds.map(td => stripHtml(td[1]));

    const rank = parseInt(cells[0], 10);
    if (isNaN(rank) || rank < 1 || rank > 500) continue;

    // ELO spans roughly 900–1550 on the live board; anchoring at 1200 (as an
    // earlier revision did) silently dropped every model below that.
    let eloIdx = -1, elo = null, ci = null;
    for (let i = 1; i < cells.length; i++) {
      const m = cells[i].match(/^([89]\d{2}|1[0-7]\d{2})(?:[±+\s]+(\d+))?/);
      if (m) { elo = parseInt(m[1], 10); ci = m[2] ? parseInt(m[2], 10) : null; eloIdx = i; break; }
    }
    if (!elo || eloIdx < 0) continue;

    let name = '', org = '', license = 'Proprietary';
    if (eloIdx >= 4 && !/^\d{4}/.test(cells[3] ?? '')) {
      const p = parseNameCell(cells[2] ?? '');
      name = p.name || cells[2] || '';
      org = cells[3] || p.org;
      license = cells[4] || p.license;
    } else {
      ({ name, org, license } = parseNameCell(cells[eloIdx - 1] ?? ''));
    }

    let votes = 0;
    for (let i = eloIdx + 1; i < cells.length; i++) {
      const v = parseVotes(cells[i]);
      if (v > 50) { votes = v; break; }
    }

    let priceIn = null, priceOut = null, context = null;
    for (const cell of cells.slice(eloIdx + 1)) {
      if (/\$/.test(cell)) {
        const parts = cell.split('/');
        priceIn  = priceIn  ?? parsePrice(parts[0]);
        priceOut = priceOut ?? parsePrice(parts[1] ?? '');
      } else if (/^\d+\.?\d*[MK]$/.test(cell.trim())) {
        context = context ?? cell.trim();
      }
    }

    models.push(toModel({
      rank, name, license, votes, priceIn, priceOut,
      modelOrganization: org, rating: elo, ci, context,
    }, rank - 1));
  }

  return models.length > 5 ? models : null;
}

// ── Validation ─────────────────────────────────────────────────────────────
// A parser that "succeeds" with mangled rows is worse than one that fails, so
// every candidate result has to look like a real leaderboard before we cache it.
function validate(models) {
  if (!Array.isArray(models) || models.length < 50) return 'too few models';

  const elos = models.map(m => m.elo);
  if (elos.some(e => !Number.isFinite(e) || e < 500 || e > 3000)) return 'ELO out of range';
  if (Math.max(...elos) - Math.min(...elos) < 50) return 'ELO spread too small';

  const named = models.filter(m => m.name && m.name.length > 1).length;
  if (named / models.length < 0.9) return 'missing model names';

  // No licence text may leak into the organisation column.
  const leaked = models.filter(m => LICENSE_WORDS.test(m.org)).length;
  if (leaked > 0) return `${leaked} rows have a licence in the org field`;

  return null; // OK
}

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchFromArena() {
  const res = await fetch(ARENA_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`arena.ai ${res.status}`);
  const html = await res.text();

  const strategies = [
    ['flight',     parseFlight],
    ['next-data',  parseNextData],
    ['html-table', parseHTMLTable],
  ];

  const problems = [];
  for (const [label, fn] of strategies) {
    let models = null;
    try { models = fn(html); } catch (e) { problems.push(`${label}: threw ${e.message}`); continue; }
    if (!models) { problems.push(`${label}: no match`); continue; }

    const problem = validate(models);
    if (problem) { problems.push(`${label}: ${problem}`); continue; }

    models.sort((a, b) => b.elo - a.elo);
    models = models.map((m, i) => ({ ...m, rank: i + 1 }));

    return {
      models,
      count: models.length,
      fetchedAt: new Date().toISOString(),
      source: 'arena.ai',
      parser: label,
    };
  }

  throw new Error(`No usable data from arena.ai — ${problems.join('; ')}`);
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300',
  };

  let store = null;
  try { store = getStore('aiwar-cache'); } catch { /* blobs unavailable */ }

  let cached = null;
  if (store) {
    try { cached = await store.get(CACHE_KEY, { type: 'json' }); } catch { /* cold cache */ }
  }

  if (cached?.fetchedAt) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < CACHE_TTL) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { ...headers, 'X-Cache': 'HIT', 'X-Cache-Age': `${Math.round(age / 60000)}min` },
      });
    }
  }

  try {
    const fresh = await fetchFromArena();
    if (store) {
      try { await store.setJSON(CACHE_KEY, fresh); } catch (e) { console.warn('Cache write failed:', e.message); }
    }
    return new Response(JSON.stringify(fresh), {
      status: 200,
      headers: { ...headers, 'X-Cache': 'MISS', 'X-Parser': fresh.parser },
    });
  } catch (err) {
    console.error('Leaderboard fetch failed:', err.message);

    // Stale data beats no data — the alternative is the site showing its
    // hardcoded snapshot as if it were live.
    if (cached?.models?.length) {
      return new Response(JSON.stringify({ ...cached, stale: true }), {
        status: 200,
        headers: { ...headers, 'X-Cache': 'STALE', 'X-Error': err.message.slice(0, 180) },
      });
    }

    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};

export const config = { path: '/api/leaderboard' };
