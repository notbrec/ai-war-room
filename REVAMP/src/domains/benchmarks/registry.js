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
const AA_EVAL = slug => `https://artificialanalysis.ai/evaluations/${slug}`;
// An Artificial Analysis evaluation read off the merged record: 0..1 scores as %, Elo-style ratings as they are.
const aaEval = (id, group, label, key, slug, desc, unit = '%') => ({
  id, group, label, source: 'aa', unit, higher: true, aaOnly: true, aaKey: key, desc, method: AA_EVAL(slug),
  get: unit === '%' ? m => pct(aa(key)(m)) : aa(key),
});
const pct = v => (isNum(v) ? (v <= 1 ? v * 100 : v) : null); // AA publishes some scores as 0..1

export const BENCHMARKS = [
  // Human preference
  { id: 'arena-text',   group: 'preference', label: 'Arena · Text ELO',   source: 'arena', unit: 'Elo', higher: true, get: m => m.arena?.elo ?? null, desc: 'Overall human-preference ELO from anonymous text battles.', method: 'https://arena.ai/leaderboard/text' },
  { id: 'arena-vision', group: 'preference', label: 'Arena · Vision ELO', source: 'arena', unit: 'Elo', higher: true, get: m => m.arenas?.vision?.elo ?? null, desc: 'Preference ELO on battles that include an image input.', method: 'https://arena.ai/leaderboard/vision' },
  { id: 'arena-search', group: 'preference', label: 'Arena · Search ELO', source: 'arena', unit: 'Elo', higher: true, get: m => m.arenas?.search?.elo ?? null, desc: 'Preference ELO for web-search-augmented answers.', method: 'https://arena.ai/leaderboard/search' },
  { id: 'arena-webdev', group: 'preference', label: 'Arena · WebDev ELO', source: 'arena', unit: 'Elo', higher: true, get: m => m.arenas?.webdev?.elo ?? null, desc: 'Code Arena: people vote on which model builds the better working web app from the same prompt.', method: 'https://arena.ai/leaderboard/webdev' },
  // Indexes
  { id: 'aa-intel',  group: 'indexes', label: 'Intelligence Index', source: 'aa', unit: 'index', higher: true, get: m => m.aa?.intelligence ?? null, desc: 'Composite of reasoning, knowledge, coding and math evaluations.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking' },
  { id: 'aa-coding', group: 'indexes', label: 'Coding Index',       source: 'aa', unit: 'index', higher: true, get: m => m.aa?.codingIndex ?? null, desc: 'Composite of coding evaluations.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking' },
  { id: 'aa-agentic', group: 'indexes', label: 'Agentic Index',     source: 'aa', unit: 'index', higher: true, get: m => m.aa?.agenticIndex ?? null, desc: 'Composite of agentic / tool-use evaluations.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking' },
  { id: 'aa-math',   group: 'indexes', label: 'Math Index',         source: 'aa', unit: 'index', higher: true, get: m => m.aa?.mathIndex ?? null, desc: 'Composite of math evaluations.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking', aaOnly: true },
  // Coding (AA-only detail)
  { id: 'livecodebench', group: 'coding', label: 'LiveCodeBench', source: 'aa', unit: '%', higher: true, get: m => pct(aa('livecodebench')(m)), desc: 'Contamination-resistant competitive programming problems.', method: 'https://livecodebench.github.io', aaOnly: true },
  { id: 'scicode',       group: 'coding', label: 'SciCode',       source: 'aa', unit: '%', higher: true, get: m => pct(aa('scicode')(m)), desc: 'Scientific research coding tasks.', method: 'https://scicode-bench.github.io', aaOnly: true },
  { id: 'terminalbench', group: 'coding', label: 'Terminal-Bench Hard', source: 'aa', unit: '%', higher: true, get: m => pct(aa('terminalbench_hard')(m)), desc: 'Agentic tasks completed in a real terminal.', method: 'https://www.tbench.ai', aaOnly: true },
  aaEval('frontiercode-2', 'coding', 'FrontierCode-AA 2.0', 'frontiercode_2_0', 'frontiercode-2-0', 'Agentic coding in 132 real open-source repositories, graded on whether a maintainer would merge the change.'),
  aaEval('frontiercode', 'coding', 'FrontierCode-AA', 'frontiercode', 'frontiercode', 'The first FrontierCode set: real-repository changes judged against maintainer-style rubrics.'),
  aaEval('terminalbench-4', 'coding', 'Terminal-Bench 4.0', 'terminalbench_v40', 'terminalbench-4-0', 'Long agentic tasks completed end to end inside a real terminal (current version).'),
  aaEval('terminalbench-2', 'coding', 'Terminal-Bench 2.1', 'terminalbench_v21', 'terminalbench-2-1', 'Agentic terminal tasks, the 2.1 task set.'),
  { id: 'swe-verified',  group: 'coding', label: 'SWE-bench Verified (best harness)', source: 'swebench', unit: '%', higher: true, external: 'swe', desc: 'Best resolved rate reached by the model in any submitted harness.', method: 'https://www.swebench.com' },
  // Agentic
  { id: 'tau2', group: 'agentic', label: 'τ²-Bench Telecom', source: 'aa', unit: '%', higher: true, get: m => pct(aa('tau2')(m) ?? aa('tau2_telecom')(m)), desc: 'Multi-turn tool-using agent tasks in a customer-service domain.', method: 'https://github.com/sierra-research/tau2-bench', aaOnly: true },
  aaEval('tau3-banking', 'agentic', 'τ³-Bench Banking', 'tau_banking', 'tau3-banking', 'Multi-turn tool-using agent tasks in a banking customer-service domain.'),
  aaEval('aa-briefcase', 'agentic', 'AA-Briefcase', 'aa_briefcase', 'aa-briefcase', 'Long-horizon knowledge work: agents deliver real business outputs such as spreadsheets and decks. Rated by blind comparison.', 'Elo'),
  aaEval('automationbench', 'agentic', 'AutomationBench-AA', 'automationbench_aa', 'automationbench-aa', 'Share of each workflow completed across simulated SaaS apps, without breaking guardrails.'),
  aaEval('enterprise-ops', 'agentic', 'EnterpriseOps-Gym', 'enterprise_ops_gym_aa', 'enterprise-ops-gym-aa', 'Stateful, multi-step enterprise workflows across eight business domains (ServiceNow).'),
  aaEval('analyst-agent', 'agentic', 'AA Analyst Agent', 'analyst_agent', 'aa-analyst-agent', 'Data-analysis tasks an analyst would hand to an agent.'),
  aaEval('apex-agents', 'agentic', 'APEX-Agents', 'apex_agents', 'apex-agents-aa', 'Professional-services agent tasks (consulting, banking, law).'),
  aaEval('itbench', 'agentic', 'ITBench SRE', 'itbench_sre', 'itbench-aa', 'Site-reliability incidents: diagnose and resolve problems in live IT systems.'),
  { id: 'design-agents', group: 'agentic', label: 'Design Arena · Agents (best category)', source: 'designarena', unit: 'Elo', higher: true, get: m => bestDesign(m, 'agents'), desc: 'Best ELO the model reaches across agentic app-building categories.', method: 'https://www.designarena.ai' },
  // UI & design generation (AA)
  aaEval('aa-3d', 'design', 'AA-3D (interactive 3D)', 'aa_3d', 'aa-3d', 'Agents turn a written brief into an interactive three.js scene; rated by blind human comparison.', 'Elo'),
  aaEval('code2video', 'design', 'Code2Video-AA', 'code2video_aa', 'code2video-aa', 'Short product and brand videos built in HTML from design briefs; rated by blind comparison.', 'Elo'),
  // Reasoning & knowledge
  { id: 'gpqa',     group: 'reasoning', label: 'GPQA Diamond', source: 'aa', unit: '%', higher: true, get: m => pct(aa('gpqa')(m)), desc: 'Graduate-level science questions, Google-proof.', method: 'https://arxiv.org/abs/2311.12022', aaOnly: true },
  { id: 'hle',      group: 'reasoning', label: "Humanity's Last Exam", source: 'aa', unit: '%', higher: true, get: m => pct(aa('hle')(m)), desc: 'Expert-written frontier questions across disciplines.', method: 'https://lastexam.ai', aaOnly: true },
  aaEval('hle-diamond', 'reasoning', 'HLE-Diamond', 'hle_diamond', 'hle-diamond', "A refined 1,000-question cut of Humanity's Last Exam, half reasoning and half knowledge, a quarter with images."),
  aaEval('critpt', 'reasoning', 'CritPt', 'critpt', 'critpt', 'Unpublished research-level physics problems.'),
  aaEval('critpt-hard', 'reasoning', 'CritPt v2 Hard', 'critpt_v2_hard', 'critpt-v2-hard', 'The hardest research-physics problems of the second CritPt set.'),
  { id: 'mmlu-pro', group: 'reasoning', label: 'MMLU-Pro', source: 'aa', unit: '%', higher: true, get: m => pct(aa('mmlu_pro')(m)), desc: 'Harder multi-task knowledge benchmark with 10 choices.', method: 'https://github.com/TIGER-AI-Lab/MMLU-Pro', aaOnly: true },
  // Math
  { id: 'aime',    group: 'math', label: 'AIME 2025', source: 'aa', unit: '%', higher: true, get: m => pct(aa('aime')(m) ?? aa('aime_25')(m)), desc: 'American Invitational Mathematics Examination problems.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking', aaOnly: true },
  { id: 'math500', group: 'math', label: 'MATH-500', source: 'aa', unit: '%', higher: true, get: m => pct(aa('math_500')(m)), desc: 'Competition mathematics, 500-problem subset.', method: 'https://github.com/openai/prm800k', aaOnly: true },
  // Instruction following
  { id: 'ifbench', group: 'instruction', label: 'IFBench', source: 'aa', unit: '%', higher: true, get: m => pct(aa('ifbench')(m)), desc: 'Precise instruction-following with verifiable constraints.', method: 'https://github.com/allenai/IFBench', aaOnly: true },
  // Long context
  { id: 'lcr', group: 'longcontext', label: 'AA-LCR (long context reasoning)', source: 'aa', unit: '%', higher: true, get: m => pct(aa('lcr')(m)), desc: 'Reasoning over ~100K-token documents.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking', aaOnly: true },
  aaEval('gdp-pdf', 'longcontext', 'GDP.pdf', 'gdp_pdf', 'gdp-pdf', 'Reasoning over long, real professional documents and meeting detailed, task-specific criteria.'),
  aaEval('mlcr', 'longcontext', 'MLCR-AA (medical records)', 'mlcr_aa', 'mlcr-aa', 'Synthesis across long, fragmented medical records, as in insurance and healthcare case review.'),
  { id: 'ctx', group: 'longcontext', label: 'Context window (spec)', source: 'openrouter', unit: 'tokens', higher: true, get: m => m.context ?? null, desc: 'Not a benchmark — the advertised maximum context. Shown for scale.', method: 'https://openrouter.ai/models' },
  // Multimodal
  { id: 'arena-vision-2', group: 'multimodal', label: 'Arena · Vision ELO', source: 'arena', unit: 'Elo', higher: true, get: m => m.arenas?.vision?.elo ?? null, desc: 'Human preference on image-grounded prompts.', method: 'https://arena.ai/leaderboard/vision' },
  aaEval('mmmu-pro', 'multimodal', 'MMMU-Pro', 'mmmu_pro', 'mmmu-pro', 'College-level questions that can only be answered from an image.'),
  aaEval('mka', 'multimodal', 'MKA (multimodal knowledge agent)', 'mka', 'mka', 'Agents read visually dense project files — drawings, schematics, scans — and produce the answer a professional needs.'),
  aaEval('vials', 'multimodal', 'VIALS-AA (scientific images)', 'vials_aa', 'vials-aa', 'Interpreting scientific images and answering questions about the evidence in them.'),
  { id: 'swe-multimodal', group: 'multimodal', label: 'SWE-bench Multimodal (best harness)', source: 'swebench', unit: '%', higher: true, external: 'swe-mm', desc: 'Software tasks that need visual context.', method: 'https://www.swebench.com' },
  // Factuality
  { id: 'omniscience', group: 'factuality', label: 'AA-Omniscience', source: 'aa', unit: 'index', higher: true, get: m => aa('aa_omniscience')(m) ?? aa('omniscience')(m), desc: 'Knowledge with a hallucination penalty: wrong answers cost more than abstaining.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking', aaOnly: true },
  aaEval('omni-accuracy', 'factuality', 'Omniscience · accuracy', 'omniscience_accuracy', 'omniscience', 'Share of AA-Omniscience questions answered correctly.'),
  aaEval('omni-honesty', 'factuality', 'Omniscience · non-hallucination', 'omniscience_non_hallucination', 'omniscience', 'When the model does not know, how often it says so instead of inventing an answer.'),
  // Domain
  aaEval('gdpval', 'domain', 'GDPval-AA (economic tasks)', 'gdpval', 'gdpval-aa', 'Real deliverables from 44 occupations, judged against expert work. Rated by blind comparison.', 'Elo'),
  aaEval('harvey-lab', 'domain', 'Harvey LAB-AA (legal)', 'harvey_lab_aa', 'harvey-lab-aa', 'Legal agent work: 120 private tasks across 24 practice areas.'),
  aaEval('healthbench', 'domain', 'HealthBench', 'healthbench', 'healthbench', 'Health conversations graded against physician-written rubrics.'),
  aaEval('healthbench-pro', 'domain', 'HealthBench Professional', 'healthbench_professional', 'healthbench', 'The clinician-facing HealthBench conversations.'),
  aaEval('tb-science', 'domain', 'Terminal-Bench Science', 'terminal_bench_science', 'terminal-bench-science', 'Expert-written research workflows across the life, physical, earth and engineering sciences, done in a terminal.'),
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
  const known = new Set(['livecodebench', 'scicode', 'terminalbench_hard', 'tau2', 'tau2_telecom', 'gpqa', 'hle', 'mmlu_pro', 'aime', 'aime_25', 'math_500', 'ifbench', 'lcr', 'aa_omniscience', 'omniscience',
    ...BENCHMARKS.map(b => b.aaKey).filter(Boolean)]);
  const keys = new Set();
  for (const m of models) for (const k of Object.keys(m.aa?.benchmarks ?? {})) if (!known.has(k)) keys.add(k);
  return [...keys].sort().map(k => ({
    id: `aa:${k}`, group: 'domain', source: 'aa', unit: '', higher: true, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    desc: 'Published by Artificial Analysis; see their methodology for the exact protocol.', method: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking',
    get: m => (isNum(m.aa?.benchmarks?.[k]) ? m.aa.benchmarks[k] : null),
  }));
}

/** Name, unit and group for a raw Artificial Analysis benchmark key (the
 *  model page lists whatever a model carries). Elo-style ratings and 0..1
 *  scores must never share one bar scale. */
const LEGACY_AA = {
  gpqa: ['GPQA Diamond', 'reasoning'], hle: ["Humanity's Last Exam", 'reasoning'], scicode: ['SciCode', 'coding'], livecodebench: ['LiveCodeBench', 'coding'],
  terminalbench_hard: ['Terminal-Bench Hard', 'coding'], tau2: ['τ²-Bench Telecom', 'agentic'], tau2_telecom: ['τ²-Bench Telecom', 'agentic'], ifbench: ['IFBench', 'instruction'],
  lcr: ['AA-LCR (long context)', 'longcontext'], aime: ['AIME 2025', 'math'], aime_25: ['AIME 2025', 'math'], math_500: ['MATH-500', 'math'], mmlu_pro: ['MMLU-Pro', 'reasoning'],
};
export function aaBenchmarkInfo(key) {
  const b = BENCHMARKS.find(x => x.aaKey === key);
  if (b) return { label: b.label, unit: b.unit, group: b.group, id: b.id };
  if (key === 'aa_omniscience' || key === 'omniscience') return { label: 'AA-Omniscience', unit: 'index', group: 'factuality', id: 'omniscience' };
  const legacy = LEGACY_AA[key];
  const reg = legacy && BENCHMARKS.find(x => x.label === legacy[0]);
  if (legacy) return { label: legacy[0], unit: '%', group: legacy[1], id: reg?.id ?? null };
  return { label: key.replace(/_/g, ' ').replace(/\w/g, c => c.toUpperCase()), unit: null, group: 'domain', id: null };
}

