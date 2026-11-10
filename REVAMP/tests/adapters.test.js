import { describe, it, expect } from 'vitest';
import { normaliseORModel, normaliseOREndpoint } from '../netlify/functions/adapters/openrouter.js';
import { normaliseSWEEntry } from '../netlify/functions/adapters/swebench.js';
import { normaliseASRRow, rowsFromConfig, paramsFromName } from '../netlify/functions/adapters/openasr.js';
import { normaliseAALLM, normaliseAAMedia, aaConfigured } from '../netlify/functions/adapters/artificialanalysis.js';
import { parseS2S } from '../netlify/functions/adapters/aaweb.js';
import { toModel, toMediaRow, validateBoard, normaliseOrg, rowGroups, newcomersFrom, slugify, tidyName } from '../netlify/functions/lib/arena.js';
import { mergeLLMs, mergeMedia, summariseProviders, isOpenWeights, tidyEffort } from '../netlify/functions/lib/merge.js';
import { carryListing } from '../netlify/functions/lib/domains.js';

describe('openrouter adapter', () => {
  const raw = {
    id: 'anthropic/claude-sonnet-4.6', canonical_slug: 'anthropic/claude-4.6-sonnet-20260217', name: 'Anthropic: Claude Sonnet 4.6',
    created: 1771342990, context_length: 1000000,
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
    pricing: { prompt: '0.000003', completion: '0.000015', input_cache_read: '0.0000003', input_cache_write: '0.00000375' },
    top_provider: { max_completion_tokens: 128000 },
    supported_parameters: ['reasoning', 'tools'],
    benchmarks: { artificial_analysis: { intelligence_index: 38.6, coding_index: 74.9 }, design_arena: [{ arena: 'agents', category: 'webapps', elo: 1210, win_rate: 56.9, rank: 20 }] },
  };
  it('converts per-token prices to $/1M and keeps cache prices', () => {
    const m = normaliseORModel(raw);
    expect(m.pricing.priceIn).toBeCloseTo(3);
    expect(m.pricing.priceOut).toBeCloseTo(15);
    expect(m.pricing.priceCacheRead).toBeCloseTo(0.3);
    expect(m.pricing.priceCacheWrite).toBeCloseTo(3.75);
    expect(m.maxOutput).toBe(128000);
    expect(m.org).toBe('Anthropic');
    expect(m.name).toBe('Claude Sonnet 4.6');
    expect(m.created).toBe('2026-02-17');
    expect(m.supportsReasoning).toBe(true);
    expect(m.aa.intelligence).toBe(38.6);
    expect(m.designArena[0].elo).toBe(1210);
  });
  it('treats variable-priced routers as unknown price, not $-1', () => {
    const m = normaliseORModel({ ...raw, id: 'openrouter/auto', pricing: { prompt: '-1', completion: '-1' } });
    expect(m.pricing.priceIn).toBeNull();
  });
  it('normalises endpoints', () => {
    const e = normaliseOREndpoint({ provider_name: 'Novita', tag: 'novita/fp8', context_length: 1048576, pricing: { prompt: '0.000001', completion: '0.000003' }, quantization: 'fp8', uptime_last_30m: 99.8, latency_last_30m: null, supported_parameters: ['tools'] }, 'x:y');
    expect(e.priceIn).toBeCloseTo(1);
    expect(e.quantization).toBe('fp8');
    expect(e.latencyMs).toBeNull();
    expect(e.supportsTools).toBe(true);
    expect(e.modelId).toBe('x:y');
  });
});

describe('swebench adapter', () => {
  it('keeps agent and model separate', () => {
    const r = normaliseSWEEntry({
      agent: 'mini-SWE-agent', agent_org: 'SWE-agent', checked: true, cost: 105.5, date: '2026-02-13', folder: '20260213_mini_gemini-3-flash',
      instance_calls: 52.4, instance_cost: 0.35, model_display: 'Gemini 3 Flash', model_org: 'Google DeepMind', model_release_date: 20251217,
      name: 'Gemini 3 Flash', os_model: false, os_system: true, resolved: 72.7, tags: ['Model: gemini-3-flash', 'System: Attempts - 1'],
    }, 'Verified');
    expect(r.agent).toBe('mini-SWE-agent');
    expect(r.model).toBe('Gemini 3 Flash');
    expect(r.modelOrg).toBe('Google');
    expect(r.modelId).toBe('google:gemini3flash');
    expect(r.resolved).toBe(72.7);
    expect(r.costPerTask).toBe(0.35);
    expect(r.attempts).toBe('1');
    expect(r.modelReleaseDate).toBe('2025-12-17');
  });
  it('missing cost stays null', () => {
    const r = normaliseSWEEntry({ agent: 'X', resolved: 10, cost: null, instance_cost: null, tags: [] }, 'Lite');
    expect(r.costPerTask).toBeNull();
  });
});

describe('open asr adapter', () => {
  const link = (href, text) => `<a target="_blank" href="${href}" style="color: var(--link-text-color)">${text}</a>`;
  const config = { components: [
    { type: 'markdown', props: { value: 'intro' } },
    { type: 'dataframe', props: { value: {
      headers: ['Rank', 'Rank Δ', 'model', 'Average WER ⬇️', 'RTFx ⬆️️', 'AMI-Cleaned', 'SPGISpeech'],
      data: [
        [1, '—', link('https://www.zoom.ai', 'zoom/scribe_v2.1_pro'), 4.87, null, 5.96, 1.39],
        [2, '—', link('https://huggingface.co/nvidia/canary-qwen-2.5b', 'nvidia/canary-qwen-2.5b'), 6.92, 881.67, 7.1, 1.6],
      ],
    } } },
    { type: 'dataframe', props: { value: { headers: ['Rank', 'Model', 'Average WER ⬇️', 'Coverage'], data: [] } } },
  ] };
  it('reads the main table out of the Space config', () => {
    const rows = rowsFromConfig(config).map(normaliseASRRow);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('scribe_v2.1_pro');
    expect(rows[0].org).toBe('Zoom');
    expect(rows[0].isOpen).toBe(false);          // vendor page → hosted API
    expect(rows[0].rtfx).toBeNull();
    expect(rows[0].perDataset.SPGISpeech).toBe(1.39);
    expect(rows[1].isOpen).toBe(true);           // Hugging Face repo → open weights
    expect(rows[1].paramsB).toBe(2.5);
    expect(rows[1].url).toBe('https://huggingface.co/nvidia/canary-qwen-2.5b');
  });
  it('reads parameter counts from names', () => {
    expect(paramsFromName('niagara-84m-batch.en')).toBe(0.084);
    expect(paramsFromName('NVIDIA-Nemotron-3.5-Transcribe-30B-A4B')).toBe(30);
    expect(paramsFromName('gemma-4-E4B-it')).toBeNull();
    expect(paramsFromName('whisper-large-v3')).toBeNull();
  });
  it('normalises a row', () => {
    const r = normaliseASRRow({ model: 'nvidia/parakeet-tdt', avg: '5.5', RTFx: '3000', License: 'cc-by-4.0', 'Size (B)': '0.6', 'AMI-Cleaned WER': '10', 'LS Clean WER': '1.2' });
    expect(r.org).toBe('Nvidia');
    expect(r.wer).toBe(5.5);
    expect(r.rtfx).toBe(3000);
    expect(r.isOpen).toBe(true);
    expect(r.perDataset['LS Clean']).toBe(1.2);
  });
  it('proprietary API rows are not open', () => {
    const r = normaliseASRRow({ model: 'assemblyai/universal-3', avg: '4.3', RTFx: '', License: 'Proprietary' });
    expect(r.isOpen).toBe(false);
    expect(r.rtfx).toBeNull();
  });
});

describe('artificial analysis adapter', () => {
  it('is gated on the API key', () => {
    expect(typeof aaConfigured()).toBe('boolean');
  });
  it('normalises LLM rows defensively', () => {
    const m = normaliseAALLM({ id: 'x', name: 'GPT-5.5', slug: 'gpt-5-5', model_creator: { name: 'OpenAI' }, release_date: '2026-05-01',
      evaluations: { artificial_analysis_intelligence_index: 70.1, gpqa: 0.9, hle: '0.3' }, pricing: { price_1m_input_tokens: 5, price_1m_output_tokens: 30, price_1m_blended_3_to_1: 11.25 },
      median_output_tokens_per_second: 120.5, median_time_to_first_token_seconds: 0.6 });
    expect(m.intelligence).toBe(70.1);
    expect(m.benchmarks.gpqa).toBe(0.9);
    expect(m.benchmarks.hle).toBe(0.3);
    expect(m.speed).toBe(120.5);
    expect(m.ttft).toBe(0.6);
    expect(m.priceBlended).toBe(11.25);
    expect(m.org).toBe('OpenAI');
  });
  it('normalises media rows', () => {
    const m = normaliseAAMedia({ name: 'Veo 3.1', slug: 'veo-3-1', model_creator: { name: 'Google' }, elo: 1200.4, ci_95: 12, median_generation_time_seconds: 80, price_per_second: 0.5 });
    expect(m.genTime).toBe(80);
    expect(m.pricePerSecond).toBe(0.5);
    expect(m.elo).toBe(1200.4);
  });
});

describe('arena dataset', () => {
  // Rows exactly as lmarena-ai/leaderboard-dataset ships them (int64 → BigInt).
  const rows = Array.from({ length: 30 }, (_, i) => ({
    model_name: i === 0 ? 'Claude Opus 4.6 (High)' : `Model ${i}`, organization: i % 2 ? 'xai' : 'google', license: i % 3 ? 'Proprietary' : 'MIT',
    rating: 1500.4 - i * 5, rating_lower: 1490.4 - i * 5, rating_upper: 1510.4 - i * 5, variance: 4, vote_count: 1000 + i, rank: BigInt(i + 1),
    category: 'overall', leaderboard_publish_date: '2026-11-09',
  }));
  it('maps rows, keeps display names and normalises the org', () => {
    const out = rows.map(toModel);
    expect(out[0].name).toBe('Claude Opus 4.6 (High)');
    expect(out[0].slug).toBe('claude-opus-4.6-high');
    expect(out[0].rank).toBe(1);
    expect(out[0].elo).toBe(1500);
    expect(out[0].ci).toBe(10);
    expect(out[1].org).toBe('xAI');
    expect(out[0].priceIn).toBeNull();          // the dataset lists no prices — never invented
    expect(validateBoard(out, { minRows: 20 })).toBeNull();
  });
  it('media rows carry empty price slots for the merge to fill', () => {
    const m = toMediaRow(rows[0]);
    expect(m.pricePerImage).toBeNull();
    expect(m.pricePerSecond).toBeNull();
  });
  it('names the lab when the dataset leaves it blank, and never uses a licence', () => {
    expect(normaliseOrg('', 'Yi Lightning')).toBe('01.AI');
    expect(normaliseOrg('', 'Trinity Large Thinking')).toBe('Arcee AI');
    expect(normaliseOrg('Apache 2.0', 'Something')).toBe('Unknown');
    expect(normaliseOrg('luma-ai', 'Luma Ray3')).toBe('Luma AI');
    expect(normaliseOrg('thinky', 'Inkling')).toBe('Thinking Machines');
    expect(normaliseOrg('synlan', 'X')).toBe('Synlan');
  });
  it('prettifies only bare slugs', () => {
    expect(tidyName('gemini-omni-flash')).toBe('Gemini Omni Flash');
    expect(tidyName('GPT-5.6 Sol (xHigh)')).toBe('GPT-5.6 Sol (xHigh)');
    expect(slugify('Claude Opus 4.5 (High, 32K, 20251101)')).toBe('claude-opus-4.5-high-32k-20251101');
  });
  it('finds the "overall" row groups from parquet statistics', () => {
    const rg = (min, max, n, dmin = '2026-01-01', dmax = '2026-11-09') => ({ num_rows: BigInt(n), columns: [
      { meta_data: { path_in_schema: ['category'], statistics: { min_value: min, max_value: max } } },
      { meta_data: { path_in_schema: ['leaderboard_publish_date'], statistics: { min_value: dmin, max_value: dmax } } },
    ] });
    const g = rowGroups({ row_groups: [rg('chinese', 'math', 1000), rg('math', 'overall', 1000), rg('overall', 'overall', 1000), rg('overall', 'spanish', 500)] });
    expect(g.map(x => x.overall)).toEqual([false, true, true, true]);
    expect(g.map(x => x.pure)).toEqual([false, false, true, false]);
    expect(g[2].start).toBe(2000);
    expect(g[3].end).toBe(3500);
  });
});

describe('arena newcomers', () => {
  const row = (d, name, rating, votes) => ({ leaderboard_publish_date: d, model_name: name, rating, vote_count: votes });
  const rows = [
    row('2026-10-01', 'claude-opus-4-6-high', 1503, 80000), row('2026-10-01', 'mistral-medium-2508', 1408, 95300), row('2026-10-01', 'old-model', 1300, 5000),
    // Oct 15: arena renames everything; one reworded beyond any spelling rule
    row('2026-10-15', 'Claude Opus 4.6 (High)', 1503.1, 80100), row('2026-10-15', 'Mistral Medium 3.1 (2508)', 1407.9, 95290), row('2026-10-15', 'Old Model', 1300, 5000),
    row('2026-10-15', 'Brand New (Max)', 1510, 2000),
    row('2026-11-09', 'Claude Opus 4.6 (High)', 1503, 84000), row('2026-11-09', 'Mistral Medium 3.1 (2508)', 1408, 95400), row('2026-11-09', 'Old Model', 1301, 5100),
    row('2026-11-09', 'Brand New (Max)', 1511, 12000), row('2026-11-09', 'Fresh One', 1450, 900),
  ];
  it('flags only models that joined after the baseline, surviving renames', () => {
    const r = newcomersFrom(rows, '2026-10-10');
    expect(r.baseline).toBe('2026-10-01');
    expect(r.firstSeen).toEqual({ 'Brand New (Max)': '2026-10-15', 'Fresh One': '2026-11-09' });
  });
  it('a board younger than the window has no baseline', () => {
    expect(newcomersFrom(rows, '2026-09-01')).toBeNull();
  });
});

describe('arena listing carry-forward', () => {
  it('keeps prices and links the pages last listed, dated, without overwriting fresh values', () => {
    const prior = { fetchedAt: '2026-10-12T12:00:00Z', data: [
      { name: 'veo-3.1-audio-1080p', pricePerSecond: 0.5, url: 'https://deepmind.google/veo' },
      { name: 'seedance-v1.5-pro', pricePerSecond: 0.247, url: null },
    ] };
    const rows = carryListing(prior, [
      { name: 'Veo 3.1 (Audio, 1080p)', pricePerSecond: null, url: null },
      { name: 'Seedance 1.5 Pro', pricePerSecond: 0.3, url: null },
      { name: 'Gemini Omni 1.2 Flash', pricePerSecond: null, url: null },
    ]);
    expect(rows[0].pricePerSecond).toBe(0.5);
    expect(rows[0].url).toBe('https://deepmind.google/veo');
    expect(rows[0].listedAt).toBe('2026-10-12');
    expect(rows[1].pricePerSecond).toBe(0.3);    // a value already present wins
    expect(rows[2].pricePerSecond).toBeNull();    // new model: nothing to carry, nothing invented
  });
});

describe('aa speech-to-speech page', () => {
  const host = (id, name, bba, ttfa) => ({ id, name, shortName: name, slug: name.toLowerCase().replace(/\W+/g, '-'), model: { openSource: false }, host: { name: 'Google' }, bbaScore: bba, timeToFirstAudioSeconds: ttfa, pricePerHourInput: 0.3, pricePerHourOutput: 1.4, tauVoiceAggScore: 0.3 });
  const text = `x{"stsIndexHostModels":${JSON.stringify([host('a', 'Live A', 0.9, 0.8), host('b', 'Live B', 0.7, 1.2)])},"other":["$ref"],` +
    `"tauChartModels":${JSON.stringify([host('c', 'Live C', 0.5, 2.0)])},` +
    `"arenaResults":${JSON.stringify([{ stsHostModelId: 'b', creatorName: 'Google', elo: 1080, lower95ci: 1070, upper95ci: 1090, appearances: 900, sliceKey: 'overall', stsQualityIndexV2Score: 70 }])}}`;
  it('collects host rows across chart arrays and joins the speech arena', () => {
    const rows = parseS2S(text);
    expect(rows.map(r => r.name)).toEqual(['Live B', 'Live A', 'Live C']);   // rated first, then by Big Bench Audio
    expect(rows[0].elo).toBe(1080);
    expect(rows[0].ci).toBe(10);
    expect(rows[1].bigBenchAudio).toBeCloseTo(90);
    expect(rows[1].pricePerHour).toBeCloseTo(1.7);
  });
});

describe('merge', () => {
  const arena = [
    { rank: 1, slug: 'claude-opus-4-5-20251101-high-32k', name: 'claude-opus-4-5-20251101-high-32k', org: 'Anthropic', license: 'Proprietary', elo: 1500, ci: 5, votes: 100, priceIn: 5, priceOut: 25, context: '200K' },
    { rank: 2, slug: 'grok-4.20-beta1', name: 'grok-4.20-beta1', org: 'xAI', license: 'Proprietary', elo: 1490, ci: 5, votes: 90, priceIn: null, priceOut: null, context: null },
    { rank: 3, slug: 'glm-5.3-flash', name: 'glm-5.3-flash', org: 'Z.ai', license: 'MIT', elo: 1470, ci: 5, votes: 80, priceIn: 0.15, priceOut: 0.5, context: '1M' },
  ];
  const or = [
    { id: 'anthropic/claude-opus-4.5', canonicalSlug: 'anthropic/claude-4.5-opus-20251101', name: 'Claude Opus 4.5', org: 'Anthropic', modelId: 'anthropic:claudeopus45', contextLength: 200000, maxOutput: 64000,
      modalities: { in: ['text'], out: ['text'] }, pricing: { priceIn: 5, priceOut: 25, priceCacheRead: 0.5, priceCacheWrite: 6.25 }, supportsReasoning: true, supportsTools: true, aa: { intelligence: 50, codingIndex: 60, agenticIndex: 40 }, designArena: [], created: '2025-11-24' },
    { id: 'openai/gpt-5.5', canonicalSlug: 'openai/gpt-5.5', name: 'GPT-5.5', org: 'OpenAI', modelId: 'openai:gpt55', contextLength: 1050000, maxOutput: 128000,
      modalities: { in: ['text'], out: ['text'] }, pricing: { priceIn: 5, priceOut: 30 }, supportsReasoning: true, aa: { intelligence: 70, codingIndex: 75, agenticIndex: 60 }, designArena: [], created: '2026-04-01' },
    { id: 'z-ai/glm-5.3-flash', canonicalSlug: 'z-ai/glm-5.3-flash', name: 'GLM 5.3 Flash', org: 'Z.ai', modelId: 'zai:glm53flash', contextLength: 1000000, modalities: { in: ['text'], out: ['text'] }, pricing: { priceIn: 0.14, priceOut: 0.45 }, huggingFaceId: 'zai-org/GLM-5.3-Flash', isOpenWeights: true, designArena: [] },
  ];
  it('matches arena rows to OpenRouter and prefers OpenRouter pricing', () => {
    const out = mergeLLMs({ arena, or });
    const opus = out.find(m => m.slug === 'claude-opus-4-5-20251101-high-32k');
    expect(opus.or.id).toBe('anthropic/claude-opus-4.5');
    expect(opus.priceCacheRead).toBe(0.5);
    expect(opus.aa.intelligence).toBe(50);
    expect(opus.reasoningLevel).toBe('high');
    expect(opus.variant).toBe('high-32k');
    expect(opus.family).toBe('claudeopus45');
    const glm = out.find(m => m.slug === 'glm-5.3-flash');
    expect(glm.priceIn).toBe(0.14);
    expect(glm.priceSource).toBe('openrouter');
    expect(glm.isOpen).toBe(true);
    expect(glm.context).toBe(1000000);
  });
  it('adds non-arena models that carry an intelligence signal, ranked after arena rows', () => {
    const out = mergeLLMs({ arena, or });
    const gpt = out.find(m => m.id === 'openai:gpt55');
    expect(gpt.inArena).toBe(false);
    expect(out.indexOf(gpt)).toBeGreaterThan(2);
  });
  it('a model without any price stays N/A (null), never 0', () => {
    const out = mergeLLMs({ arena, or });
    const grok = out.find(m => m.slug === 'grok-4.20-beta1');
    expect(grok.priceIn).toBeNull();
    expect(grok.priceBlended).toBeNull();
    expect(grok.or).toBeNull();
  });
  it('same family with multiple reasoning levels get distinct ids but shared family', () => {
    const two = [
      { ...arena[0], slug: 'gemini-3.5-flash-high', name: 'gemini-3.5-flash-high', org: 'Google' },
      { ...arena[0], rank: 2, slug: 'gemini-3.5-flash-medium', name: 'gemini-3.5-flash-medium', org: 'Google' },
    ];
    const out = mergeLLMs({ arena: two, or: [] });
    expect(out[0].id).not.toBe(out[1].id);
    expect(out[0].family).toBe(out[1].family);
  });
  it('merges media boards and derives per-1k / per-minute prices', () => {
    const rows = mergeMedia('text-to-video', [{ rank: 1, slug: 'veo-3.1-audio-1080p', name: 'veo-3.1-audio-1080p', org: 'Google', license: 'Proprietary', elo: 1500, ci: 8, votes: 10, pricePerImage: null, pricePerSecond: 0.5 }], [{ modelId: 'google:veo31audio1080p', slug: 'veo-3-1', name: 'Veo 3.1', org: 'Google', genTime: 90, elo: 1200 }]);
    expect(rows[0].pricePerMinute).toBe(30);
    expect(rows[0].hasAudio).toBe(true);
    expect(rows[0].resolution).toBe('1080p');
    expect(rows[0].kind).toBe('video');
  });
  it('summarises providers and marks the cheapest', () => {
    const s = summariseProviders({ 'x:y': [
      { provider: 'A', tag: 'a', priceIn: 1, priceOut: 3, uptime30m: 99, quantization: 'fp8' },
      { provider: 'B', tag: 'b', priceIn: 0.5, priceOut: 2, uptime30m: 98, quantization: 'int4' },
      { provider: 'C', tag: 'c', priceIn: null, priceOut: null, uptime30m: 100 },
    ] });
    expect(s[0].winners.cheapest).toBe('b');
    expect(s[0].winners.bestValue).toBe('a');   // full precision beats int4
    expect(s[0].winners.bestUptime).toBe('c');
    expect(s[0].winners.fastest).toBeNull();     // no throughput data → no winner, not a fake one
  });
  it('effort levels of one OpenRouter model get their own names and URLs', () => {
    const aa = [
      { slug: 'claude-opus-4-5', name: 'Claude Opus 4.5', org: 'Anthropic', modelId: 'anthropic:claudeopus45', intelligence: 50 },
      { slug: 'claude-opus-4-5-xhigh', name: 'Claude Opus 4.5 (xhigh)', org: 'Anthropic', modelId: 'anthropic:claudeopus45:xhigh', intelligence: 55 },
      { slug: 'claude-opus-4-5-low', name: 'Claude Opus 4.5', org: 'Anthropic', modelId: 'anthropic:claudeopus45:low', intelligence: 45 },
    ];
    const out = mergeLLMs({ arena: [], or: [or[0]], aa });
    const names = out.map(m => m.name);
    expect(names).toContain('Claude Opus 4.5 (xHigh)');
    expect(names).toContain('Claude Opus 4.5 (Low)');
    expect(new Set(out.map(m => m.slug)).size).toBe(out.length);
  });
  it('dated snapshots of one model keep distinct ids', () => {
    const two = [
      { ...arena[0], rank: 1, slug: 'gpt-4o-2024-05-13', name: 'GPT-4o (2024-05-13)', org: 'OpenAI' },
      { ...arena[0], rank: 2, slug: 'gpt-4o-2024-08-06', name: 'GPT-4o (2024-08-06)', org: 'OpenAI' },
    ];
    const out = mergeLLMs({ arena: two, or: [] });
    expect(out[0].id).toBe('openai:gpt4o');
    expect(out[1].id).toBe('openai:gpt4o@20240806');
  });
  it('word order does not stop a media match within one lab', () => {
    const rows = mergeMedia('text-to-video', [{ rank: 1, slug: 'gemini-omni-1.2-flash', name: 'Gemini Omni 1.2 Flash', org: 'Google', license: 'Proprietary', elo: 1540, ci: 9, votes: 1700, pricePerImage: null, pricePerSecond: null }],
      [{ slug: 'gemini-omni-flash-1-2', name: 'Gemini Omni Flash 1.2', org: 'Google', pricePerSecond: 0.104 }]);
    expect(rows[0].pricePerSecond).toBe(0.104);
  });
  it('tidies effort labels', () => {
    expect(tidyEffort('Muse Wonder Full (max)')).toBe('Muse Wonder Full (Max)');
    expect(tidyEffort('GPT-5.6 Sol (xhigh)')).toBe('GPT-5.6 Sol (xHigh)');
  });
  it('isOpenWeights', () => {
    expect(isOpenWeights('MIT')).toBe(true);
    expect(isOpenWeights('Proprietary')).toBe(false);
    expect(isOpenWeights(null)).toBe(false);
  });
});
