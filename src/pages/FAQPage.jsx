import { useState } from 'react';
import { MODELS, RELEASE } from '../models-data.js';
import { useMobile } from '../hooks/useTheme.js';

const SF = "-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";

const FAQ = [
  {
    cat: 'Ratings',
    q: 'What exactly is an ELO score?',
    a: `ELO is a relative skill rating system invented by Arpad Elo to rank chess players. Each
    rated entity — whether a grandmaster or an AI model — starts at a base number (usually around
    1500). When two compete head-to-head, the loser transfers a small portion of their rating to
    the winner. Upsets transfer more points than expected wins, so the system self-corrects over
    time. After enough battles, every player's rating reflects roughly how often they should beat
    every other player. A 100-point lead predicts ~64% win probability; 200 points predicts ~76%.
    The system is robust to gaming because the opponents are also high-skill entities and the
    judges (in the case of AI arena) are uncoordinated humans.`,
  },
  {
    cat: 'Ratings',
    q: 'Why does ELO change between visits?',
    a: `Arena ELO is recomputed continuously as new votes arrive. Arena.ai processes hundreds of
    thousands of human battles per day across hundreds of models, and AI WAR ROOM pulls a fresh
    snapshot every 30 minutes. Small swings (±5 points) are normal noise. Larger swings usually
    mean a model has either had a new wave of votes (new release, viral moment) or that arena.ai
    has merged sibling deployments under one name. If you see a sudden jump of 30+ points for a
    well-established model, check arena.ai directly — there may have been a methodology update.`,
  },
  {
    cat: 'Ratings',
    q: 'What is the confidence interval (±CI) and why should I care?',
    a: `The CI tells you how stable a model's ranking is. A model with ±7 has been tested in
    enough battles that its rating won't move by more than ~7 points with new data. A model with
    ±20 might be undervalued or overvalued by up to 20 points in either direction. Brand-new
    releases routinely arrive with ±25–35 CIs because they have a few thousand votes instead of a
    few hundred thousand. Wait a week before treating them as definitively ranked. The CI also
    helps you read ties: two models within each other's CI bands should be treated as
    statistically indistinguishable.`,
  },
  {
    cat: 'Ratings',
    q: 'Are arena ratings comparable across model families?',
    a: `Yes, with one caveat: arena measures human preference on chat-style prompts. A model
    that's stunning at multi-step coding inside an IDE may rate lower than its rivals because
    arena voters don't typically test it that way. Use arena ELO as the strongest single signal
    for general assistant quality, then run domain-specific evals (HumanEval, SWE-bench, MMLU
    subsets) for specialised use cases.`,
  },
  {
    cat: 'Picking a model',
    q: 'How do I actually choose between two close-ranked models?',
    a: `When two models are within ~30 ELO points, the rating won't help you. Decide on practical
    grounds: price (often varies 5–50× between similarly-ranked models), context window (200K vs
    32K is a different product, not just a different number), latency (Flash variants are 2–4×
    faster), licence (open vs proprietary), and your own quick eval — pick 5 prompts from your
    real workload and try both. The arena gives you a top tier; your own judgement picks within
    it.`,
  },
  {
    cat: 'Picking a model',
    q: 'Should I always use the top-ranked model?',
    a: `Almost never. The #1 model is typically the most expensive, slowest, and built for the
    hardest reasoning tasks. For chatting, summarising, classifying, or extracting structured
    data, a model in positions 5–20 will perform indistinguishably for a fraction of the cost.
    Use the top-ranked model when wrong answers are expensive: legal, medical, financial, agentic
    workflows, or code that ships. Use a mid-tier model for everything else.`,
  },
  {
    cat: 'Picking a model',
    q: 'When is a "Thinking" or "Reasoning" variant worth it?',
    a: `When your task requires multiple logical steps that build on each other — proofs, code
    refactors that touch many files, complex SQL, mathematical optimisation, or planning agents.
    Thinking variants generate hidden chain-of-thought before answering, which costs you tokens
    and latency in exchange for substantially better accuracy on hard problems. For
    conversational chat, FAQ-style answers, or anything you'd consider "easy", a non-thinking
    variant of the same model is faster, cheaper, and often equally good.`,
  },
  {
    cat: 'Picking a model',
    q: 'What about open-weight models? Are they competitive?',
    a: `In 2026, yes — at the A and B tiers. DeepSeek V3.2, Qwen3 Max, Kimi K2, Llama 4, GLM 5,
    and Mistral Large now compete head-to-head with proprietary frontier models on most everyday
    tasks. They're not at S-tier on arena, but they're close. The advantage: you can self-host,
    fine-tune, run on-prem for data residency, or hit them via cheaper API providers. The
    disadvantage: you handle the infrastructure, and on the very hardest reasoning tasks the
    proprietary frontier still leads.`,
  },
  {
    cat: 'Pricing',
    q: 'How is the pricing computed?',
    a: `Pricing comes live from OpenRouter, a routing layer that aggregates inference providers
    for most major models. We show input price (per 1M input tokens) and output price (per 1M
    output tokens) separately because the ratio matters: a model with cheap input and expensive
    output is great for short prompts → long responses, while a model with cheap output is better
    for summarisation. If a model is missing a price, it means OpenRouter doesn't currently route
    to that exact variant — check the model's first-party API.`,
  },
  {
    cat: 'Pricing',
    q: 'How do I budget for a real project?',
    a: `Estimate three numbers: tokens per request, requests per day, and the input/output ratio.
    Multiply input tokens by the input price (per million), output tokens by the output price,
    and add. For a typical RAG application, you're feeding in 2–8K input tokens and getting back
    500–1500 output tokens per call. At, say, $3 input / $15 output per million on a frontier
    model, a 50K-request/month workload is a few hundred dollars. The same workload on an A-tier
    open-weight model via a low-cost provider is often under $20.`,
  },
  {
    cat: 'Pricing',
    q: 'Why is some pricing surprisingly cheap?',
    a: `Two reasons. First, Chinese labs (DeepSeek, Z.ai, Alibaba, Moonshot) deliberately price
    aggressively to win developer adoption — their inference costs are typically lower because of
    domestic compute and exchange-rate advantages. Second, open-weight models can be hosted by
    third-party inference providers competing on price; you'll often see 5–10× variation between
    providers for the same open model. OpenRouter shows the cheapest available route by default,
    so what you see is the floor, not the average.`,
  },
  {
    cat: 'Arena mechanics',
    q: 'Can the arena be gamed?',
    a: `Not easily. Voters don't know which model produced which answer until after they vote
    (and most never check). Models are paired randomly, so brigading a specific model is hard.
    Arena.ai also runs automated checks to flag suspicious voting patterns. The biggest legitimate
    "gaming" is stylistic — models that sound confident and write in markdown tend to win against
    equally-accurate models that write plain prose. This is a real bias, but arena adjusts via
    "style controls" in advanced views, and the effect is well under 50 ELO points even for the
    most affected models.`,
  },
  {
    cat: 'Arena mechanics',
    q: 'Do voters actually know what makes a good answer?',
    a: `On average, yes. The wisdom-of-crowds effect is strong: thousands of voters with different
    expertise levels collectively produce a stable signal. Individual votes are noisy, but tens of
    thousands per model converge on something real. Where this breaks down is for highly
    specialised tasks — niche scientific questions, hard programming problems, languages with few
    speakers in the voter pool. Use arena ELO as a general-purpose proxy and supplement with
    domain-specific evals for niche work.`,
  },
  {
    cat: 'Arena mechanics',
    q: 'Why are there so many variants of the same model?',
    a: `Big labs ship multiple SKUs of a single underlying model: Mini, Nano, Pro, High, Fast,
    Thinking, Chat, Latest, Preview. These usually differ in size, latency, or reasoning
    behaviour rather than fundamental capability. Arena rates each variant separately because
    they behave differently in conversation. If you see Claude Opus 4.7 at 1530 and Claude Opus
    4.7 Thinking at 1545, the thinking variant is the same brain with extra chain-of-thought
    enabled — better on hard tasks, slower on easy ones.`,
  },
  {
    cat: 'Data',
    q: 'How often does AI WAR ROOM update?',
    a: `ELO data refreshes from arena.ai every 30 minutes. Pricing refreshes from OpenRouter on
    the same cadence. New models are added within hours of arena.ai listing them. The "Last
    updated" indicator at the top of the leaderboard shows the most recent successful sync.`,
  },
  {
    cat: 'Data',
    q: 'Where does the model description text come from?',
    a: `Descriptions are built from our internal model catalogue, which we maintain by hand from
    public lab announcements, model cards, and inference-provider documentation. We avoid
    marketing language and try to summarise what each variant is actually for. If a description
    feels stale or wrong, it likely is — newer models sometimes ship before our catalogue catches
    up.`,
  },
  {
    cat: 'Data',
    q: 'Is this site affiliated with arena.ai, OpenRouter, or any of the labs?',
    a: `No. AI WAR ROOM is an independent leaderboard. We pull public data from arena.ai's public
    leaderboard endpoint and OpenRouter's public pricing API. We don't represent any of the
    labs, and we don't accept payment from any of them. If we get something wrong, that's on us.`,
  },
  {
    cat: 'Data',
    q: 'Why is some data missing for some models?',
    a: `A model on arena might not be on OpenRouter (no live pricing); an OpenRouter model might
    not be on arena (no ELO). When data is missing, we show a dash rather than a guess. Open
    licences are tagged from our catalogue, which we keep up to date but may lag a few days on a
    brand-new release.`,
  },
  {
    cat: 'About',
    q: `Why does AI WAR ROOM exist?`,
    a: `Because picking an AI model in 2026 should not require reading twenty marketing
    announcements and a benchmark whitepaper. The signal is in the arena: real humans, real
    prompts, real preferences. Our job is to surface that signal cleanly, alongside the price you
    actually pay, and let you decide. If we make one team's model-choice decision 10 minutes
    faster and 20% better, the site has done its job.`,
  },
];

const CATEGORIES = [...new Set(FAQ.map(f => f.cat))];

function QA({ item, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: '0.5px solid var(--sep)' }}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', fontFamily: SF, color: 'var(--text)',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.4 }}>
          {item.q}
        </span>
        <span style={{
          width: 22, height: 22, borderRadius: 11, background: 'var(--pill)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted)', flexShrink: 0,
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.18s',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 0 20px' }}>
          <p style={{
            fontSize: 15, lineHeight: 1.7, color: 'var(--text)',
            letterSpacing: '-0.012em', margin: 0, opacity: 0.88, whiteSpace: 'pre-line',
          }}>
            {item.a}
          </p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage({ onNavigate, liveModels }) {
  const mobile = useMobile();
  const data   = liveModels ?? MODELS;
  // Open by default — all answers rendered so crawlers index the content.
  const [openSet, setOpenSet]   = useState(() => new Set(FAQ.map((_, i) => i)));
  const [activeCat, setActiveCat] = useState('All');

  const filtered = activeCat === 'All' ? FAQ : FAQ.filter(f => f.cat === activeCat);
  const toggle = (i) => {
    setOpenSet(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div className="page-enter" style={{ background: 'var(--bg)', fontFamily: SF, minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: mobile ? '0 18px 80px' : '0 24px 80px' }}>

        {/* Header */}
        <header style={{ paddingTop: mobile ? 32 : 48, paddingBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#FF3B30', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            FAQ
          </div>
          <h1 style={{
            fontSize: mobile ? 'clamp(30px,8vw,40px)' : 'clamp(38px,5vw,54px)',
            fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05,
            color: 'var(--text)', margin: '0 0 14px',
          }}>
            Frequently asked questions
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--muted)', letterSpacing: '-0.018em', margin: 0 }}>
            Honest answers to the questions we get most often about ELO, arena battles, picking a
            model, pricing, and how the leaderboard works.
          </p>
        </header>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {['All', ...CATEGORIES].map(cat => {
            const on = cat === activeCat;
            return (
              <button key={cat} onClick={() => setActiveCat(cat)} style={{
                height: 30, paddingInline: 13, borderRadius: 980,
                background: on ? 'var(--text)' : 'var(--pill)',
                color: on ? 'var(--bg)' : 'var(--pill-text)',
                fontSize: 12, fontWeight: on ? 600 : 500, border: 'none', cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}>{cat}</button>
            );
          })}
        </div>

        {/* Q&A list */}
        <div>
          {filtered.map((item) => {
            const realIndex = FAQ.indexOf(item);
            return (
              <QA
                key={item.q}
                item={item}
                isOpen={openSet.has(realIndex)}
                onToggle={() => toggle(realIndex)}
              />
            );
          })}
        </div>

        {/* Still have questions? */}
        <div style={{
          background: 'var(--card)', borderRadius: 16, padding: '22px 22px',
          marginTop: 32, boxShadow: 'var(--shadow)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.025em', marginBottom: 4 }}>
              Want to go deeper?
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: '-0.01em' }}>
              The Guide explains how to read the leaderboard end-to-end.
            </div>
          </div>
          <button onClick={() => onNavigate('guide')} style={{
            height: 38, paddingInline: 16, borderRadius: 980,
            background: 'var(--text)', color: 'var(--bg)',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', flexShrink: 0,
          }}>
            Read the Guide →
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--muted2)', textAlign: 'center', marginTop: 40, letterSpacing: '-0.01em' }}>
          AI WAR ROOM · {data.length}+ models tracked · {RELEASE}
        </p>
      </div>
    </div>
  );
}
