import { MODELS, RELEASE } from '../models-data.js';
import { useMobile } from '../hooks/useTheme.js';
import { SF, MONO, EASE, Reveal, Eyebrow, GlobalMotion } from '../components/design.jsx';

function H2({ children }) {
  return (
    <Reveal as="h2" style={{
      fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 700,
      letterSpacing: '-0.035em', color: 'var(--text)',
      margin: '56px 0 16px', lineHeight: 1.1,
    }}>{children}</Reveal>
  );
}

function H3({ children }) {
  return (
    <h3 style={{
      fontSize: 20, fontWeight: 600,
      letterSpacing: '-0.022em', color: 'var(--text)',
      margin: '28px 0 10px', lineHeight: 1.3,
    }}>{children}</h3>
  );
}

function P({ children }) {
  return (
    <p style={{
      fontSize: 17, lineHeight: 1.7, color: 'var(--text)',
      letterSpacing: '-0.012em', margin: '0 0 16px', opacity: 0.92,
    }}>{children}</p>
  );
}

function LI({ children }) {
  return (
    <li style={{
      fontSize: 17, lineHeight: 1.7, color: 'var(--text)',
      letterSpacing: '-0.012em', marginBottom: 10, opacity: 0.92,
    }}>{children}</li>
  );
}

function Callout({ tone = 'blue', title, children }) {
  const colors = {
    blue:   '#5C81B8',
    green:  '#5E9E70',
    orange: '#C89150',
    red:    '#CD5C4E',
  };
  const accent = colors[tone];
  return (
    <Reveal>
      <div style={{
        background: 'var(--card)',
        border: '0.5px solid var(--sep)',
        borderRadius: 16,
        padding: '20px 22px',
        margin: '20px 0 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: accent }} />
          <span style={{
            fontSize: 11, fontWeight: 600, color: accent,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO,
          }}>
            {title}
          </span>
        </div>
        <div style={{
          fontSize: 16, lineHeight: 1.65, color: 'var(--text)',
          letterSpacing: '-0.012em', opacity: 0.92,
        }}>
          {children}
        </div>
      </div>
    </Reveal>
  );
}

export default function GuidePage({ onNavigate, liveModels }) {
  const mobile = useMobile();
  const data   = liveModels ?? MODELS;
  const labs   = new Set(data.map(m => m.org)).size;

  return (
    <div className="page-enter" style={{ background: 'transparent', fontFamily: SF, minHeight: '100vh' }}>
      <GlobalMotion />

      <article style={{ maxWidth: 760, margin: '0 auto', padding: mobile ? '40px 18px 96px' : '72px 24px 112px' }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header style={{ marginBottom: 36 }}>
          <div style={{ opacity: 0, animation: `aiwar-fade-up 700ms ${EASE} both` }}>
            <Eyebrow>The Guide</Eyebrow>
          </div>
          <h1 style={{
            fontSize: mobile ? 'clamp(36px,9vw,48px)' : 'clamp(52px,5.8vw,76px)',
            fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.98,
            color: 'var(--text)', margin: '10px 0 18px',
            opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 80ms both`,
          }}>
            How to read the<br />AI leaderboard.
          </h1>
          <p style={{
            fontSize: mobile ? 17 : 21, lineHeight: 1.45,
            color: 'var(--muted)', letterSpacing: '-0.02em',
            margin: 0,
            opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 160ms both`,
          }}>
            An honest, plain-English walkthrough of ELO ratings, arena battles,
            and the tradeoffs that actually matter when picking a model for real work.
          </p>
          <div style={{
            display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap',
            fontSize: 12, color: 'var(--muted2)', fontFamily: MONO,
            opacity: 0, animation: `aiwar-fade-up 800ms ${EASE} 240ms both`,
          }}>
            <span>Updated {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <span>·</span>
            <span>~10 min read</span>
            <span>·</span>
            <span>{data.length} models · {labs} labs</span>
          </div>
        </header>

        <div style={{ height: '0.5px', background: 'var(--sep)', margin: '0 0 36px' }} />

        {/* ── Body ───────────────────────────────────────────────── */}
        <H2>Why we built AI WAR ROOM</H2>
        <P>
          When a new AI model drops, the marketing claims arrive first — "best in class", "state of the art",
          "ranked #1 on benchmark X". Most of these claims are technically true and practically meaningless.
          Benchmarks like MMLU, HumanEval, or GSM8K were designed in a different era. Today's frontier
          models have all seen variants of these tests during training, and the gap between #1 and #5 on
          most public benchmarks is often within noise.
        </P>
        <P>
          The arena is different. Real humans send real prompts, see two anonymous answers, and pick the
          better one. After hundreds of thousands of battles, you get an ELO rating — the same statistical
          system used to rank chess players. It can be gamed, but only with great difficulty, because the
          opponents are also strong models and the judges are uncoordinated humans.
        </P>
        <P>
          AI WAR ROOM is a daily-updated readout of that battlefield. We pull arena ELO scores from
          arena.ai, cross-reference live pricing from OpenRouter, and present the {data.length}+ models
          currently competing in one ranked, filterable view. No editorialising in the data — just the
          numbers, refreshed every 30 minutes.
        </P>

        <Callout tone="blue" title="The short version">
          ELO is a relative skill score. A model rated 1500 is meaningfully stronger than one rated 1400,
          and that gap predicts the probability it wins a head-to-head. Use ELO to filter the top tier,
          then pick on price, context window, license, and your actual use case.
        </Callout>

        <H2>ELO, in plain English</H2>
        <P>
          ELO comes from chess. The Hungarian-American physicist Arpad Elo designed it in the 1960s to
          replace the messier rating systems used by chess federations. The intuition is simple: when two
          players (or models) compete, both stake some rating points. If the favourite wins, only a few
          points change hands; if the underdog wins, a lot do. Over many games, the numbers settle into
          a stable distribution that reflects each player's true skill.
        </P>
        <H3>What the gap means</H3>
        <P>
          A 100-point ELO gap predicts roughly a 64% win rate for the higher-rated side. A 200-point gap
          predicts about 76%. So a model at 1500 doesn't "always beat" a 1400 model — it just wins more
          often, in a way you can quantify. This is also why you should be sceptical of single-digit
          differences: noise can easily explain them.
        </P>
        <H3>Why we show ±CI</H3>
        <P>
          Every ELO rating on AI WAR ROOM is paired with a confidence interval. A model with ±7 has been
          tested in enough battles that its rank is stable. A model with ±20 has only been seen by a few
          hundred voters; its real ELO could realistically be twenty points either way. If a brand-new
          model lands at the top of the leaderboard with a ±25 CI, treat that ranking with patience — give
          it a week of voting before betting on it.
        </P>

        <H2>Tiers, not ranks</H2>
        <P>
          Ranks are seductive but misleading. "I want the #1 model" rarely matches "I want the model that
          will solve my problem best for the price I can pay". A more honest mental model is to group
          models into rough tiers and choose by fit.
        </P>
        <H3>S-tier (≥ 1500)</H3>
        <P>
          The frontier. These are flagship reasoning or general-purpose models, typically from OpenAI,
          Anthropic, Google, xAI, or a handful of well-funded Chinese labs. They cost more, sometimes
          much more, and their advantage is real but narrow on most everyday tasks. Pick S-tier when you
          are doing hard reasoning, agentic workflows, or anything where a wrong answer is expensive.
        </P>
        <H3>A-tier (1400–1499)</H3>
        <P>
          The sweet spot for most teams. Strong general performance, often at a fraction of the cost of
          S-tier. The mid-priced flagship variants — Sonnet-class, GPT non-thinking variants, mid Gemini
          tiers, Qwen Max — live here. For 90% of production use cases, this is where you should be
          shopping.
        </P>
        <H3>B-tier (1300–1399)</H3>
        <P>
          Specialised or older models that are still excellent in their niche. Many open-weight models
          land here: Llama, Mistral, DeepSeek's open releases, Gemma. They are the right answer when you
          need self-hosting, fine-tuning, or radically lower per-token cost at high volume.
        </P>
        <H3>C-tier (&lt; 1300)</H3>
        <P>
          Small, fast, or older models. Not bad — just not frontier. Useful for autocomplete-style tasks,
          classification, summarisation of short text, or any high-volume pipeline where you'd rather pay
          a fifth of a cent than a full cent per call.
        </P>

        <H2>How to actually pick a model</H2>
        <P>
          ELO is one input among several. Here's the decision tree we'd suggest if you're picking a model
          for a real project.
        </P>

        <H3>1. Is your workload sensitive to wrong answers?</H3>
        <P>
          If yes — legal drafting, medical triage, financial analysis, code that ships to production —
          start from the top of the S-tier. The marginal cost of a stronger model is almost always less
          than the marginal cost of one bad answer.
        </P>

        <H3>2. How long is your context window?</H3>
        <P>
          If you're summarising entire books, processing long transcripts, or feeding in large codebases,
          you need 200K+ context. Filter the leaderboard on context length first; ELO becomes secondary.
          Gemini 1.5/2/3 Pro, Claude Opus, and the Kimi K2 family lead here.
        </P>

        <H3>3. Do you need open weights?</H3>
        <P>
          If you're running on-prem, fine-tuning, or subject to data-residency rules that forbid third-party
          APIs, you need a model with a permissive licence. Filter "Open" in the leaderboard. The top
          open-weight contenders in 2026 are DeepSeek's R/V series, Alibaba's Qwen3, Meta's Llama 4
          family, Mistral's open releases, and Google's Gemma.
        </P>

        <H3>4. What's your monthly token budget?</H3>
        <P>
          Price varies by more than 100× between cheapest and most expensive frontier models. Sort by
          "Price ↑" once you've narrowed the field on quality. A 50× cheaper model that's only 3% worse
          on arena is a great deal for most workloads.
        </P>

        <H3>5. Do you need thinking (reasoning) mode?</H3>
        <P>
          Thinking variants — Claude Opus Thinking, Gemini Thinking, o-series, DeepSeek R1 — pause to
          generate hidden chain-of-thought before answering. They're better on hard problems and slower
          on easy ones. If you're chatting, the non-thinking variant is usually the right call.
        </P>

        <Callout tone="green" title="Practical rule of thumb">
          Pick the cheapest A-tier model that satisfies your context and licence constraints. Reach for
          S-tier only when arena ELO and your own evals both say it matters.
        </Callout>

        <H2>The 2026 landscape</H2>
        <P>
          A year ago, the frontier was three or four labs; today it is closer to ten. The race for the
          top of the leaderboard is no longer a two-horse contest. Here is how the major players look as
          of this update.
        </P>

        <H3>Anthropic</H3>
        <P>
          The Claude 4-series — Opus, Sonnet, Haiku — is consistently strong across reasoning, writing,
          and coding. Opus 4.7 sits near the very top of arena ELO; Sonnet 4.6 is the most popular
          working model for engineers. Anthropic's signature is "thoughtful" prose and strong agentic
          tool use.
        </P>

        <H3>OpenAI</H3>
        <P>
          The GPT-5.x family is broad and deep — Chat, Mini, Nano, High, Thinking variants for every
          budget and latency profile. The o-series reasoning models are still the reference for
          mathematical and step-by-step tasks. OpenAI's strength is breadth: you can almost always find
          a tier-appropriate variant.
        </P>

        <H3>Google</H3>
        <P>
          Gemini 3 ships in Pro, Flash, and Flash Lite tiers, with Thinking variants on top. Google's
          unique advantage is multimodal handling — images, video, audio in the same request — and
          extremely long context windows. Gemini 3 Pro is one of the few S-tier models that doesn't
          require thinking mode to compete.
        </P>

        <H3>xAI</H3>
        <P>
          Grok 4 and the new 4.20 Beta line are characterised by speed and conversational style. xAI's
          fast-reasoning variants compete with the best in their tier for considerably less per token.
          Worth a look when latency matters.
        </P>

        <H3>Chinese labs</H3>
        <P>
          DeepSeek, Alibaba (Qwen), Moonshot (Kimi), Z.ai (GLM), Baidu (ERNIE), ByteDance (Dola/Seed),
          Tencent (Hunyuan), Xiaomi (MiMo) and Meituan (LongCat) are all competing at the frontier with
          aggressive pricing and, in several cases, genuinely permissive open-weight releases. DeepSeek
          and Qwen lead on open weights; Moonshot leads on long context.
        </P>

        <H3>Open-source labs in the West</H3>
        <P>
          Meta's Llama, Mistral's open releases, Cohere's Command R, and Google's Gemma family round out
          the open landscape. None currently sit at S-tier on arena, but several reach A-tier — enough
          for most production work, at vanishing cost.
        </P>

        <H2>Glossary</H2>
        <P>
          A few terms that show up everywhere on the leaderboard.
        </P>
        <ul style={{ paddingLeft: 22, margin: '0 0 16px' }}>
          <LI><strong>Arena</strong> — a head-to-head voting system (chat.lmsys.org → arena.ai) where humans pick the better of two anonymised model responses.</LI>
          <LI><strong>ELO</strong> — relative skill rating; higher = stronger; gaps predict win probability.</LI>
          <LI><strong>CI (confidence interval)</strong> — uncertainty in the ELO rating; smaller is more stable.</LI>
          <LI><strong>Context window</strong> — how many tokens (roughly: words × 1.3) the model can attend to in one request.</LI>
          <LI><strong>Token</strong> — the unit of LLM cost; a word is typically one token, a paragraph might be ~80.</LI>
          <LI><strong>Thinking / reasoning mode</strong> — the model generates hidden intermediate steps before answering. Better quality, higher latency, higher cost.</LI>
          <LI><strong>Open weight</strong> — the model's parameters are publicly released under a permissive licence (MIT, Apache 2.0, sometimes custom).</LI>
          <LI><strong>Frontier model</strong> — the current strongest tier of models, usually the flagship from a major lab.</LI>
          <LI><strong>Mixture of Experts (MoE)</strong> — architecture where only a subset of parameters activates per token; explains the "A22B" / "A17B" tags meaning "active billion params".</LI>
          <LI><strong>Multimodal</strong> — accepts not just text but also images, audio, or video as input.</LI>
        </ul>

        <H2>Common pitfalls</H2>
        <H3>Chasing #1</H3>
        <P>
          The #1 model is rarely the one you want. It's the most expensive, often slowest, and frequently
          has more capability than your task requires. The point of the leaderboard is to find the
          cheapest model that's good enough.
        </P>
        <H3>Trusting one benchmark</H3>
        <P>
          Even arena ELO is one signal. Run your own evals on the top three candidates with prompts from
          your real workload. The relative ordering on your data is what matters.
        </P>
        <H3>Ignoring the confidence interval</H3>
        <P>
          A new release with ±25 CI at rank 4 is not necessarily a rank-4 model. Wait a few days.
        </P>
        <H3>Forgetting about context cost</H3>
        <P>
          For long-context tasks, the input price matters more than the output price. Sort by input price
          when planning a RAG or summarisation pipeline.
        </P>
        <H3>Equating "thinking" with "better"</H3>
        <P>
          Thinking variants are better on hard problems. They are <em>worse</em> for chat — slower, more
          expensive, sometimes more verbose. Match the variant to the task.
        </P>

        <Callout tone="orange" title="A note on data freshness">
          ELO numbers refresh from arena.ai every 30 minutes. Pricing refreshes from OpenRouter every 30
          minutes. Newly released models appear on the leaderboard within hours of their public release.
          If you don't see a model you expect, check arena.ai directly — it may have been pulled or
          renamed.
        </Callout>

        <H2>Where to start</H2>
        <P>
          If you're new to the field, open the leaderboard and sort by ELO. Read the descriptions for
          the top five models — they'll teach you the vocabulary fast. Then click "Methodology" for the
          exact rules behind the rankings.
        </P>
        <P>
          And if you're picking a model for a real project, read the FAQ — it covers the questions we
          get most often from people doing exactly that.
        </P>

        <Reveal>
          <div style={{ display: 'flex', gap: 10, marginTop: 36, flexWrap: 'wrap' }}>
            <button onClick={() => onNavigate('leaderboard')}
              className="aiwar-press-btn"
              style={{
                height: 48, paddingInline: 22, borderRadius: 980,
                background: 'var(--text)', color: 'var(--bg)',
                fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', letterSpacing: '-0.015em',
              }}>
              Open the leaderboard
            </button>
            <button onClick={() => onNavigate('faq')}
              className="aiwar-press-btn"
              style={{
                height: 48, paddingInline: 22, borderRadius: 980,
                background: 'transparent', color: 'var(--text)',
                fontSize: 15, fontWeight: 600, border: '0.5px solid var(--sep)', cursor: 'pointer', letterSpacing: '-0.015em',
              }}>
              Read the FAQ →
            </button>
          </div>
        </Reveal>

        <p style={{
          fontSize: 12, color: 'var(--muted2)', textAlign: 'center',
          marginTop: 56, letterSpacing: '-0.005em', fontFamily: MONO,
        }}>
          AI WAR ROOM · aiwarroom.app · {RELEASE}
        </p>
      </article>
    </div>
  );
}
