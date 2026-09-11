// ─── SWE-bench adapter ──────────────────────────────────────────────────────
// swebench.com publishes its leaderboard as a machine-readable
// <script type="application/json" id="leaderboard-data"> block (the same data
// as the open SWE-bench/experiments repository). Each submission names the
// AGENT (harness) and the MODEL separately, plus resolved rate, cost and
// calls per instance when disclosed — exactly the split Code Ops needs.

import { fetchText } from '../lib/http.js';
import { canonicalOrg, canonicalModelId, bareKey } from '../../../shared/ids.js';

const URL = 'https://www.swebench.com/';

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function modelSlugFromTags(tags) {
  const t = (tags ?? []).find(x => /^Model:\s*/i.test(x));
  return t ? t.replace(/^Model:\s*/i, '').trim() : null;
}
function attemptsFromTags(tags) {
  const t = (tags ?? []).find(x => /^System:\s*Attempts/i.test(x));
  if (!t) return null;
  return /2\+/.test(t) ? '2+' : '1';
}

export function normaliseSWEEntry(r, board) {
  const modelOrg = canonicalOrg(r.model_org ?? '');
  const modelSlug = modelSlugFromTags(r.tags) ?? r.model_display ?? r.name;
  const agent = String(r.agent ?? r.name ?? 'Unknown').trim();
  return {
    board,
    id: `${bareKey(board)}:${bareKey(r.folder ?? r.name)}`,
    name: r.name ?? `${agent} + ${r.model_display ?? ''}`.trim(),
    agent,
    agentOrg: r.agent_org ? canonicalOrg(r.agent_org) : null,
    agentId: bareKey(agent),
    model: r.model_display ?? modelSlug ?? null,
    modelSlug,
    modelOrg,
    modelId: modelSlug ? canonicalModelId(modelSlug, modelOrg) : null,
    modelReleaseDate: r.model_release_date ? String(r.model_release_date).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') : null,
    resolved: num(r.resolved),
    totalCost: num(r.cost),
    costPerTask: num(r.instance_cost),
    callsPerTask: num(r.instance_calls),
    reasoningEffort: r.reasoning_effort ?? null,
    attempts: attemptsFromTags(r.tags),
    date: r.date ?? null,
    checked: !!r.checked,
    openModel: !!r.os_model,
    openSystem: !!r.os_system,
    site: r.site ?? null,
    warning: r.warning ?? null,
  };
}

export async function fetchSWEBench() {
  const html = await fetchText(URL, { timeoutMs: 30_000 });
  const m = html.match(/<script type="application\/json" id="leaderboard-data">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('swebench: leaderboard-data block not found');
  const boards = JSON.parse(m[1]);
  if (!Array.isArray(boards) || !boards.length) throw new Error('swebench: empty leaderboard-data');
  const out = {};
  for (const b of boards) {
    const name = String(b.name ?? '').trim();
    if (!name || !Array.isArray(b.results)) continue;
    out[name] = b.results
      .map(r => normaliseSWEEntry(r, name))
      .filter(r => r.resolved != null)
      .sort((a, b2) => b2.resolved - a.resolved)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }
  if (!out.Verified?.length) throw new Error('swebench: Verified board missing');
  return out;
}
