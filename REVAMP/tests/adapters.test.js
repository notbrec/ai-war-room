import { describe, it, expect } from 'vitest';
import { normaliseORModel, normaliseOREndpoint } from '../netlify/functions/adapters/openrouter.js';
import { normaliseSWEEntry } from '../netlify/functions/adapters/swebench.js';
import { parseCSV, normaliseASRRow } from '../netlify/functions/adapters/openasr.js';
import { normaliseAALLM, normaliseAAMedia, aaConfigured } from '../netlify/functions/adapters/artificialanalysis.js';
import { extractEntryArrays, toModel, toMediaRow, validateBoard, normaliseOrg } from '../netlify/functions/lib/arena.js';
import { mergeLLMs, mergeMedia, summariseProviders, isOpenWeights } from '../netlify/functions/lib/merge.js';

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
  it('parses quoted CSV', () => {
    expect(parseCSV('a,b\n"x, y",2\n')).toEqual([['a', 'b'], ['x, y', '2']]);
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

describe('arena parser', () => {
  const entries = Array.from({ length: 30 }, (_, i) => ({
    rank: i + 1, modelKey: `k${i}`, modelDisplayName: `model-${i}`, rating: 1500 - i * 5, ratingUpper: 1510 - i * 5, ratingLower: 1490 - i * 5,
    votes: 1000 + i, modelOrganization: i % 2 ? 'SpaceXAI' : 'Google', modelUrl: null, license: i % 3 ? 'Proprietary' : 'MIT',
    inputPricePerMillion: 1, outputPricePerMillion: 5, contextLength: 262144, pricePerImage: i === 0 ? 0.04 : null, pricePerSecond: null, releaseType: null,
  }));
  const chunk = JSON.stringify(`x:{"entries":${JSON.stringify(entries)}}`);
  const html = `<html><script>self.__next_f.push([1,${chunk}])</script></html>`;
  it('recovers the entries array from the flight payload', () => {
    const arrays = extractEntryArrays(html);
    expect(arrays.length).toBe(1);
    expect(arrays[0].length).toBe(30);
  });
  it('maps rows and normalises the org', () => {
    const rows = extractEntryArrays(html)[0].map(toModel);
    expect(rows[1].org).toBe('xAI');
    expect(rows[0].ci).toBe(10);
    expect(rows[0].context).toBe('262K');
    expect(validateBoard(rows, { minRows: 20 })).toBeNull();
  });
  it('media rows keep per-unit prices and treat a listed $0 as unknown', () => {
    const rows = extractEntryArrays(html)[0].map(toMediaRow);
    expect(rows[0].pricePerImage).toBe(0.04);
    expect(rows[1].pricePerImage).toBeNull();
    expect(toMediaRow({ ...entries[0], pricePerImage: 0 }, 0).pricePerImage).toBeNull();
  });
  it('rejects a licence leaking into the org column', () => {
    expect(normaliseOrg('Apache 2.0', 'https://huggingface.co/Qwen/x')).toBe('Alibaba');
    expect(normaliseOrg('Proprietary', null)).toBe('Unknown');
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
  it('isOpenWeights', () => {
    expect(isOpenWeights('MIT')).toBe(true);
    expect(isOpenWeights('Proprietary')).toBe(false);
    expect(isOpenWeights(null)).toBe(false);
  });
});
