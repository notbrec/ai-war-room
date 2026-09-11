import { describe, it, expect } from 'vitest';
import { splitVariant, keyVariants, canonicalModelId, canonicalOrg, reasoningLevel, isReasoningName, buildIndex, displayName } from '../shared/ids.js';

describe('splitVariant', () => {
  it('separates reasoning effort and date stamps from the family', () => {
    const r = splitVariant('claude-opus-4-5-20251101-high-32k');
    expect(r.family).toBe('claudeopus45');
    expect(r.variant).toEqual(['high', '32k']);
    expect(r.dateStamp).toBe('20251101');
  });
  it('keeps the family for plain names', () => {
    expect(splitVariant('gpt-5.5').family).toBe('gpt55');
    expect(splitVariant('openai/gpt-5.5').family).toBe('gpt55');
  });
  it('peels numbered qualifiers and MMDD tails', () => {
    expect(splitVariant('grok-4.20-beta1').family).toBe('grok420');
    expect(splitVariant('grok-4.20-multi-agent-beta-0309').family).toBe('grok420multiagent');
  });
  it('peels quantisation tags', () => {
    expect(splitVariant('nvidia-nemotron-3-ultra-550b-a55b-nvfp4').family).toBe('nvidianemotron3ultra550ba55b');
  });
  it('does not strip a short family into nothing', () => {
    expect(splitVariant('chat').family).toBe('chat');
    expect(splitVariant('o3-high').family).toBe('o3');
  });
});

describe('keyVariants', () => {
  it('drops a leading lab prefix when the org is known', () => {
    expect(keyVariants('nvidia-nemotron-3-ultra-550b-a55b-nvfp4', 'Nvidia')).toContain('nemotron3ultra550ba55b');
  });
  it('never yields keys shorter than 3 chars', () => {
    for (const k of keyVariants('ab', 'x')) expect(k.length).toBeGreaterThanOrEqual(3);
  });
});

describe('canonicalModelId', () => {
  it('keeps distinct reasoning levels distinct but shares the family', () => {
    const a = canonicalModelId('gemini-3.5-flash-high', 'Google');
    const b = canonicalModelId('gemini-3.5-flash-medium', 'Google');
    const c = canonicalModelId('gemini-3.5-flash', 'Google');
    expect(a).not.toBe(b);
    expect(a.split(':')[1]).toBe(c.split(':')[1]);
    expect(c).toBe('google:gemini35flash');
  });
  it('normalises the org alias', () => {
    expect(canonicalModelId('grok-4.5', 'SpaceXAI')).toBe('xai:grok45');
    expect(canonicalOrg('spacexai')).toBe('xAI');
    expect(canonicalOrg('moonshotai')).toBe('Moonshot');
  });
});

describe('reasoning detection', () => {
  it('reads effort levels and thinking markers', () => {
    expect(reasoningLevel('gpt-5.6-sol-xhigh')).toBe('xhigh');
    expect(reasoningLevel('kimi-k2-thinking')).toBe('thinking');
    expect(reasoningLevel('grok-4.20-beta-0309-reasoning')).toBe('thinking');
    expect(reasoningLevel('qwen3-235b-a22b-no-thinking')).toBe('none');
    expect(isReasoningName('gpt-5.5')).toBe(false);
  });
});

describe('buildIndex', () => {
  const or = [
    { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', org: 'Anthropic' },
    { id: 'google/gemini-3.5-flash', name: 'Gemini 3.5 Flash', org: 'Google' },
    { id: 'x-ai/grok-4.20', name: 'Grok 4.20', org: 'xAI' },
  ];
  const find = buildIndex(or, m => [m.id, m.name]);
  it('matches arena spellings to OpenRouter ids', () => {
    expect(find('claude-opus-4-5-20251101-high-32k', 'Anthropic')?.id).toBe('anthropic/claude-opus-4.5');
    expect(find('gemini-3.5-flash-high', 'Google')?.id).toBe('google/gemini-3.5-flash');
    expect(find('grok-4.20-beta1', 'SpaceXAI')?.id).toBe('x-ai/grok-4.20');
  });
  it('returns null for unknown models', () => {
    expect(find('ernie-5.1', 'Baidu')).toBeNull();
  });
});

describe('displayName', () => {
  it('fixes brand casing', () => {
    expect(displayName('gpt-5.5-high')).toBe('GPT 5.5 High');
    expect(displayName('glm-5.3-flash')).toBe('GLM 5.3 Flash');
  });
});
