// ─── Benchmark registry ─────────────────────────────────────────────────────
// Each benchmark says where it comes from, which direction is good, and how
// to read it off a merged model record. Groups the site cannot yet source
// from a permitted provider are listed as empty — visibly, not silently.

import { isNum } from '../../../shared/metrics.js';

export const GROUPS = [
  { id: 'preference', label: 'Human preference' },
  { id: 'indexes',    label: 'Composite indexes' },
  { id: 'coding',     label: 'Coding' },
  { id: 'agentic',    label: 'Agentic tasks & tool use' },
  { id: 'design',     label: 'UI & design generation' },
  { id: 'reasoning',  label: 'Reasoning & knowledge' },
  { id: 'math',       label: 'Math' },
  { id: 'instruction', label: 'Instruction following' },
  { id: 'longcontext', label: 'Long context' },
  { id: 'multimodal', label: 'Multimodal' },
  { id: 'factuality', label: 'Hallucination & factuality' },
  { id: 'speech',     label: 'Speech' },
  { id: 'domain',     label: 'Business · Finance · Legal · Medical · Science' },
];

const aa = key => m => (isNum(m.aa?.benchmarks?.[key]) ? m.aa.benchmarks[key] : null);
const pct = v => (isNum(v) ? (v <= 1 ? v * 100 : v) : null); // AA publishes some scores as 0..1

export const BENCHMARKS = [
  // Human preference
  { id: 'arena-text',   group: 'preference', label: 'Arena · Text ELO',   source: 'arena', unit: 'Elo', higher: true, get: m => m.arena?.elo ?? null, desc: 'Overall human-preference ELO from anonymous text battles.', method: 'https://arena.ai/leaderboard/text' },
  { id: 'arena-vision', group: 'preference', label: 'Arena · Vision ELO', source: 'arena', unit: 'Elo', higher: true, get: m => m.arenas?.vision?.elo ?? null, desc: 'Preference ELO on battles that include an image input.', method: 'https://arena.ai/leaderboard/vision' },
  { id: 'arena-search', group: 'preference', label: 'Arena · Search ELO', source: 'arena', unit: 'Elo', higher: true, get: m => m.arenas?.search?.elo ?? null, desc: 'Preference ELO for web-search-augmented answers.', method: 'https://arena.ai/leaderboard/search' },
  // Indexes
  { id: 'aa-intel',  group: 'indexes', label: 'Intelligence Index', source: 'aa', unit: 'index', higher: true, get: m => m.aa?.intelligence ?? null, desc: 'Composite of reasoning, knowledge, coding and math evaluations.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking' },
  { id: 'aa-coding', group: 'indexes', label: 'Coding Index',       source: 'aa', unit: 'index', higher: true, get: m => m.aa?.codingIndex ?? null, desc: 'Composite of coding evaluations.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking' },
  { id: 'aa-agentic', group: 'indexes', label: 'Agentic Index',     source: 'aa', unit: 'index', higher: true, get: m => m.aa?.agenticIndex ?? null, desc: 'Composite of agentic / tool-use evaluations.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking' },
  { id: 'aa-math',   group: 'indexes', label: 'Math Index',         source: 'aa', unit: 'index', higher: true, get: m => m.aa?.mathIndex ?? null, desc: 'Composite of math evaluations.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking', aaOnly: true },
  // Coding (AA-only detail)
  { id: 'livecodebench', group: 'coding', label: 'LiveCodeBench', source: 'aa', unit: '%', higher: true, get: m => pct(aa('livecodebench')(m)), desc: 'Contamination-resistant competitive programming problems.', method: 'https://livecodebench.github.io', aaOnly: true },
  { id: 'scicode',       group: 'coding', label: 'SciCode',       source: 'aa', unit: '%', higher: true, get: m => pct(aa('scicode')(m)), desc: 'Scientific research coding tasks.', method: 'https://scicode-bench.github.io', aaOnly: true },
  { id: 'terminalbench', group: 'coding', label: 'Terminal-Bench Hard', source: 'aa', unit: '%', higher: true, get: m => pct(aa('terminalbench_hard')(m)), desc: 'Agentic tasks completed in a real terminal.', method: 'https://www.tbench.ai', aaOnly: true },
  { id: 'swe-verified',  group: 'coding', label: 'SWE-bench Verified (best harness)', source: 'swebench', unit: '%', higher: true, external: 'swe', desc: 'Best resolved rate reached by the model in any submitted harness.', method: 'https://www.swebench.com' },
  // Agentic
  { id: 'tau2', group: 'agentic', label: 'τ²-Bench Telecom', source: 'aa', unit: '%', higher: true, get: m => pct(aa('tau2')(m) ?? aa('tau2_telecom')(m)), desc: 'Multi-turn tool-using agent tasks in a customer-service domain.', method: 'https://github.com/sierra-research/tau2-bench', aaOnly: true },
  { id: 'design-agents', group: 'agentic', label: 'Design Arena · Agents (best category)', source: 'designarena', unit: 'Elo', higher: true, get: m => bestDesign(m, 'agents'), desc: 'Best ELO the model reaches across agentic app-building categories.', method: 'https://www.designarena.ai' },
  // Reasoning & knowledge
  { id: 'gpqa',     group: 'reasoning', label: 'GPQA Diamond', source: 'aa', unit: '%', higher: true, get: m => pct(aa('gpqa')(m)), desc: 'Graduate-level science questions, Google-proof.', method: 'https://arxiv.org/abs/2311.12022', aaOnly: true },
  { id: 'hle',      group: 'reasoning', label: "Humanity's Last Exam", source: 'aa', unit: '%', higher: true, get: m => pct(aa('hle')(m)), desc: 'Expert-written frontier questions across disciplines.', method: 'https://lastexam.ai', aaOnly: true },
  { id: 'mmlu-pro', group: 'reasoning', label: 'MMLU-Pro', source: 'aa', unit: '%', higher: true, get: m => pct(aa('mmlu_pro')(m)), desc: 'Harder multi-task knowledge benchmark with 10 choices.', method: 'https://github.com/TIGER-AI-Lab/MMLU-Pro', aaOnly: true },
  // Math
  { id: 'aime',    group: 'math', label: 'AIME 2025', source: 'aa', unit: '%', higher: true, get: m => pct(aa('aime')(m) ?? aa('aime_25')(m)), desc: 'American Invitational Mathematics Examination problems.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking', aaOnly: true },
  { id: 'math500', group: 'math', label: 'MATH-500', source: 'aa', unit: '%', higher: true, get: m => pct(aa('math_500')(m)), desc: 'Competition mathematics, 500-problem subset.', method: 'https://github.com/openai/prm800k', aaOnly: true },
  // Instruction following
  { id: 'ifbench', group: 'instruction', label: 'IFBench', source: 'aa', unit: '%', higher: true, get: m => pct(aa('ifbench')(m)), desc: 'Precise instruction-following with verifiable constraints.', method: 'https://github.com/allenai/IFBench', aaOnly: true },
  // Long context
  { id: 'lcr', group: 'longcontext', label: 'AA-LCR (long context reasoning)', source: 'aa', unit: '%', higher: true, get: m => pct(aa('lcr')(m)), desc: 'Reasoning over ~100K-token documents.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking', aaOnly: true },
  { id: 'ctx', group: 'longcontext', label: 'Context window (spec)', source: 'openrouter', unit: 'tokens', higher: true, get: m => m.context ?? null, desc: 'Not a benchmark — the advertised maximum context. Shown for scale.', method: 'https://openrouter.ai/models' },
  // Multimodal
  { id: 'arena-vision-2', group: 'multimodal', label: 'Arena · Vision ELO', source: 'arena', unit: 'Elo', higher: true, get: m => m.arenas?.vision?.elo ?? null, desc: 'Human preference on image-grounded prompts.', method: 'https://arena.ai/leaderboard/vision' },
  { id: 'swe-multimodal', group: 'multimodal', label: 'SWE-bench Multimodal (best harness)', source: 'swebench', unit: '%', higher: true, external: 'swe-mm', desc: 'Software tasks that need visual context.', method: 'https://www.swebench.com' },
  // Factuality
  { id: 'omniscience', group: 'factuality', label: 'AA-Omniscience', source: 'aa', unit: 'index', higher: true, get: m => aa('aa_omniscience')(m) ?? aa('omniscience')(m), desc: 'Knowledge with a hallucination penalty: wrong answers cost more than abstaining.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking', aaOnly: true },
  // Domain
  { id: 'domain-placeholder', group: 'domain', label: 'Domain evaluations', source: 'aa', unit: '', higher: true, get: () => null, desc: 'Business, finance, legal, medical, engineering and economics evaluations are published by Artificial Analysis; they populate here once the source is configured.', method: 'https://artificialanalysis.ai', aaOnly: true, placeholder: true },
];

export const DESIGN_CATEGORY_LABEL = {
  agenticgamedev: 'Game dev (agentic)', agentichtmlslides: 'HTML slides (agentic)', androidnative: 'Android native', fullstack: 'Full-stack app', godotgamedev: 'Godot game dev', mobileapps: 'Mobile apps', webapps: 'Web apps',
  '3d': '3D scenes', asciiart: 'ASCII art', svg: 'SVG', website: 'Websites', components: 'UI components', animation: 'Animation', slides: 'Slides', dataviz: 'Data viz', game: 'Games', images: 'Images', pixelart: 'Pixel art', text: 'Text',
};

function bestDesign(m, arena) {
  const list = (m.or?.designArena ?? []).filter(d => d.arena === arena && isNum(d.elo));
  return list.length ? Math.max(...list.map(d => d.elo)) : null;
}

/** Design Arena per-category benchmarks discovered from the data. */
export function designBenchmarks(models) {
  const cats = new Map();
  for (const m of models) for (const d of m.or?.designArena ?? []) {
    const k = `${d.arena}:${d.category}`;
    if (!cats.has(k)) cats.set(k, { arena: d.arena, category: d.category, n: 0 });
    cats.get(k).n++;
  }
  return [...cats.values()].filter(c => c.n >= 5).sort((a, b) => a.arena.localeCompare(b.arena) || a.category.localeCompare(b.category)).map(c => ({
    id: `design:${c.arena}:${c.category}`, group: 'design', source: 'designarena', unit: 'Elo', higher: true,
    label: `Design Arena · ${c.arena === 'agents' ? 'Agents' : 'Models'} · ${DESIGN_CATEGORY_LABEL[c.category] ?? c.category}`,
    desc: `Human-preference ELO for ${DESIGN_CATEGORY_LABEL[c.category] ?? c.category} outputs (${c.arena} arena).`, method: 'https://www.designarena.ai',
    get: m => { const d = (m.or?.designArena ?? []).find(x => x.arena === c.arena && x.category === c.category); return d && isNum(d.elo) ? d.elo : null; },
  }));
}

/** Any AA benchmark keys present in the data that the registry does not name. */
export function extraAABenchmarks(models) {
  const known = new Set(['livecodebench', 'scicode', 'terminalbench_hard', 'tau2', 'tau2_telecom', 'gpqa', 'hle', 'mmlu_pro', 'aime', 'aime_25', 'math_500', 'ifbench', 'lcr', 'aa_omniscience', 'omniscience']);
  const keys = new Set();
  for (const m of models) for (const k of Object.keys(m.aa?.benchmarks ?? {})) if (!known.has(k)) keys.add(k);
  return [...keys].sort().map(k => ({
    id: `aa:${k}`, group: 'domain', source: 'aa', unit: '', higher: true, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    desc: 'Published by Artificial Analysis; see their methodology for the exact protocol.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking',
    get: m => (isNum(m.aa?.benchmarks?.[k]) ? m.aa.benchmarks[k] : null),
  }));
}
