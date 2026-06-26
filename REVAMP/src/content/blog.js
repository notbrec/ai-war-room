// ─── Blog posts — substantive editorial content for AdSense ────────────────
// Each post is 800-1500 words of original analysis written for human readers,
// not templated SEO filler.

export const BLOG_POSTS = [

  {
    slug: 'reading-the-arena-elo-leaderboard',
    title: 'How to actually read the arena ELO leaderboard',
    subtitle: 'A practical guide to what ELO numbers mean, what they hide, and how to use them when picking a model.',
    publishedAt: '2026-05-01',
    readingMinutes: 8,
    sections: [
      {
        h: null,
        p: `The arena ELO leaderboard is the most useful single number we have for ranking large language models, and it is also one of the most frequently misunderstood. New users see Opus 4.7 at 1515 and Gemini 3 Pro at 1486 and conclude that Opus is "30 points better", as if the numbers were directly comparable percentages. They are not. ELO is a relative measure with specific properties, and using it well requires understanding what it actually tells you and what it doesn't.`
      },
      {
        h: 'ELO is a probability, not a score',
        p: `The ELO rating system was invented for chess by Arpad Elo in the 1960s and applied to LLM comparison by the LMSYS team in 2023. The key property — and the one that confuses people — is that ELO is calibrated against win probability in head-to-head matchups, not against any absolute quality scale.

A 100-point ELO difference translates to roughly a 64% win rate for the higher-rated model. A 200-point difference translates to roughly 76%. A 30-point difference, like Opus 4.7 vs. Gemini 3 Pro, translates to a 54% win rate — meaningfully above 50%, but very far from "Opus is twice as good".

What this means in practice: small ELO differences (under 30 points) are usually within noise for any specific user. If you A/B test two models that are 20 ELO apart on the same prompt distribution you actually use, you may genuinely prefer the lower-rated model. The leaderboard tells you about aggregate user preference across many prompt types; it does not tell you which model is right for your specific workflow.`
      },
      {
        h: 'The confidence interval matters more than the rank',
        p: `Every ELO rating on the leaderboard comes with a confidence interval (CI), usually written as ±N. A model with a rating of 1450 ±7 has been battle-tested enough that we know its true rating is almost certainly between 1443 and 1457. A model with 1450 ±23 has far less data behind it, and its real rating could plausibly be anywhere from 1427 to 1473 — a much wider band.

This matters because new models almost always launch with wide CIs. A model that ranks #3 with ±25 might actually belong at #8 or #15 once it has accumulated more battles. The reverse can also happen — a model can be underrated initially and climb as more data comes in. When you see a brand-new release at a surprisingly high rank, check the CI before treating the position as stable.

The practical rule: trust models with CIs under ±10 as having stable rankings. Treat models with CIs above ±20 as provisional. The leaderboard sorts by point estimate, not by confidence-adjusted rank, so this filtering is on you.`
      },
      {
        h: 'Why arena ELO disagrees with benchmarks',
        p: `Arena ELO and benchmark scores (MMLU, HumanEval, GPQA, etc.) sometimes rank models in different orders, and this confuses people who expect them to agree. They are measuring different things.

Benchmarks measure performance on specific, structured tasks with known correct answers. Arena ELO measures human preference on diverse, open-ended prompts where there often is no single correct answer. A model can be excellent on benchmarks and only middling on the arena if it produces correct but cold or hard-to-read responses. A model can be top-five on the arena and middling on benchmarks if it has been trained to please users on the kinds of prompts they actually send rather than on benchmark-style questions.

Neither is wrong. They are complementary. For technical work where correctness is what matters, weight benchmarks heavily. For consumer-facing chat or writing assistance, weight arena ELO heavily. For most production deployments, you want a model that scores well on both.`
      },
      {
        h: 'Arena prompts are not your prompts',
        p: `The single biggest source of misleading conclusions from the leaderboard is the gap between the prompt distribution arena voters submit and the prompt distribution your actual workload contains. Arena prompts skew toward the curious, the conversational, the demonstrative — questions people ask a chatbot for fun, plus some technical questions submitted by developers testing models.

If your workload is dominated by, say, customer support classification — a task where the input is short, the output is a category label, and the user cares only about accuracy — arena ELO is almost entirely irrelevant. The model that wins your task may not even be ranked in the top 50 of the arena board.

This does not make the leaderboard useless. It makes it the first step of a model evaluation, not the last. The right workflow is: shortlist the top 5-10 models in your relevant tier based on the leaderboard, then run your own evaluation on prompts that match your real workload. The leaderboard saves you from evaluating models that are clearly inferior; it does not pick the right model for you.`
      },
      {
        h: 'A practical reading checklist',
        p: `When you visit the leaderboard, here is the order of operations that gives you the most useful read:

First, filter by category. Look at the leaderboard for the specific kind of prompt you care about — code, math, creative writing, multilingual, long context. The aggregate ranking averages over all of these and can hide large differences.

Second, check the CI on any model you are considering. Avoid building production plans around models with wide intervals until more data accumulates.

Third, look at the price column. The frontier flagship is often only 30-50 ELO points above a model that costs 10x less. For workloads with high volume or tight budgets, the cost-adjusted choice is rarely the highest-ranked model.

Fourth, run your own evaluation. The leaderboard gets you to a shortlist of 5-10 candidates; your evaluation against your actual workload picks among them. Skipping this step is the single most common mistake teams make when adopting a new model.`
      },
    ],
  },

  {
    slug: 'open-vs-closed-state-of-2026',
    title: 'Open weights vs. closed APIs: the state of the field in 2026',
    subtitle: 'How the open-weight ecosystem has caught up with the closed frontier — and the gaps that still matter.',
    publishedAt: '2026-04-20',
    readingMinutes: 9,
    sections: [
      {
        h: null,
        p: `Two years ago, the open-weight ecosystem was a clear second tier. The best openly-released model trailed the closed frontier by 100-200 ELO points, which is a substantial gap — roughly the difference between a master-level chess player and a grandmaster. In 2026, that gap has narrowed to under 30 points for the top contenders, and for some categories of work it has effectively closed.

This is a meaningful strategic shift in the field, but it does not mean open and closed are now equivalent. The remaining differences matter, and which side you should bet on depends entirely on what you are trying to do. This post is a survey of where things actually stand.`
      },
      {
        h: 'The open-weight contenders',
        p: `The strongest open-weight models on the current arena leaderboard come from three labs: DeepSeek (V3.2 and V3.2-thinking, MIT license), Z.ai (GLM-5.1 and GLM-5, MIT license), and Alibaba (Qwen3.5 series, Apache 2.0). Meta's Llama-4-Maverick is competitive in the same band, with the caveat that Llama's license is more restrictive than the others — pure open-source it is not, but for most commercial deployments under 700M monthly active users it is effectively unrestricted.

Moonshot's Kimi K2.5 series ships under "Modified MIT" with use-case restrictions, and Mistral has continued to release strong models under Apache 2.0 from their European operation. The breadth of viable open-weight options is itself the story: two years ago there were maybe two serious open-weight choices at the frontier; now there are a dozen.`
      },
      {
        h: 'Where open models have caught up',
        p: `For routine production workloads — chat, summarization, classification, light coding — the best open-weight models are now indistinguishable from mid-tier closed models in blind A/B testing. GLM-5.1 beats Claude Sonnet 4.6 about as often as Claude wins; DeepSeek V3.2 trades wins with GPT-5.2 in roughly even proportions. For these workloads, the open option is competitive in quality and dramatically better on price and deployment flexibility.

Open models have also fully caught up on code. The gap between the best open coding models and the best closed coding models has effectively closed for most everyday programming tasks. Where the closed frontier still leads is on the very hardest reasoning prompts — competition math, novel algorithm design, complex multi-step proofs. For 95% of code that actually gets written, an open model is now an acceptable choice.`
      },
      {
        h: 'Where the gap still matters',
        p: `The remaining gaps fall into four buckets.

The hardest reasoning prompts are the first. On adversarial math problems, multi-step logical puzzles, and the most complex code synthesis, the top closed models (Opus 4.7, GPT-5.4-high) still win meaningfully. The gap is narrower than it was, but for workloads that depend on top-quartile reasoning, closed remains the right choice.

Tool use and agentic chains are the second. The closed frontier labs have invested heavily in agentic tooling — function calling, tool selection, multi-step planning — and the polish shows. Open models can do tool use, but the developer ergonomics and reliability are still rougher.

Multimodality is the third. Gemini's native multimodal training has produced a significant edge on prompts involving images, charts, or audio. Open models with vision capabilities exist, but the quality gap is real and persistent.

Safety and refusal calibration are the fourth. This is more subjective, but enterprises that need predictable behavior on edge cases — content moderation, regulated industries, customer-facing applications — generally find the closed frontier labs' safety training more reliable than open models. Open models can be fine-tuned to similar standards, but most teams do not actually do this.`
      },
      {
        h: 'The cost picture',
        p: `Price is where open weights have produced the most dramatic shift. DeepSeek V3.2 at $0.27/M input is roughly twenty times cheaper than Opus 4.7 at $5/M input. GLM-5.1 at $0.95/M input is five times cheaper than Opus, with a 30-point ELO gap. For volume workloads, these ratios change deployment economics fundamentally.

Self-hosting changes the picture again. Once you have validated a workload, hosting the model on your own infrastructure can drop per-token costs another 5-10x for sufficient utilization. The catch is operational overhead: running production inference on open weights requires real ML infrastructure expertise, and most teams underestimate the cost of that expertise.

The right strategy for most teams in 2026 has become: prototype against the closed frontier (fastest iteration, highest quality), validate against mid-tier closed (good price-quality tradeoff at production volume), then migrate compatible workloads to open weights via API (DeepSeek, Z.ai, etc.) once the workload is stable. Self-hosting comes only after that, and only for workloads at scale.`
      },
      {
        h: 'Looking forward',
        p: `The trajectory through 2026 looks like continued convergence with diminishing returns. The biggest remaining gaps — reasoning, agentic tooling, multimodal — are areas where the closed frontier labs have substantial infrastructure advantages that open releases will struggle to match. But the gap on everyday workloads is now effectively zero, which means the strategic question is no longer "is open competitive?" but "where specifically do you need the closed frontier?"

For most users, the answer is: in fewer places than you think.`
      },
    ],
  },

  {
    slug: 'thinking-models-when-they-help-when-they-hurt',
    title: 'Thinking models: when they help, when they hurt',
    subtitle: 'Extended-reasoning variants are not strictly better. Here is when to turn thinking on and when to leave it off.',
    publishedAt: '2026-04-05',
    readingMinutes: 7,
    sections: [
      {
        h: null,
        p: `Every major lab now ships their flagship models in two variants: a standard variant and a "thinking" or "high reasoning" variant that spends more compute at inference time to produce a better answer. The pattern was pioneered by OpenAI's o-series in late 2024 and is now industry-standard. Claude Opus 4.7, GPT-5.4, Gemini 3 Pro, and Grok 4.1 all have thinking siblings on the arena leaderboard, and these variants generally rank higher than their standard counterparts.

This has produced a common assumption that thinking variants are simply better — that you should always pick the higher-ranked option if you can afford the latency and price. The assumption is wrong. Thinking variants are better at some things, worse at others, and the gap matters more than most users realize. This post is about when each is the right choice.`
      },
      {
        h: 'What "thinking" actually does',
        p: `Mechanically, thinking variants are the same base model run with a different inference protocol. Before producing the user-visible answer, the model writes out a private chain-of-thought — typically 2,000 to 8,000 tokens of step-by-step reasoning that the user does not see but is billed for. The model is trained, through reinforcement learning, to use this thinking budget productively: to consider multiple approaches, check its own work, and catch errors before committing to an answer.

The training pays off on problems that have a single correct answer and require multiple intermediate steps to reach it. Math word problems are the canonical example: a thinking model will work through the equation step by step, often catching a sign error or unit confusion that the standard model would have flown past. Hard code with subtle off-by-one or edge-case bugs is similar — the thinking variant is much more likely to notice the bug than the standard one.`
      },
      {
        h: 'Where thinking helps',
        p: `The clear wins for thinking variants are concentrated in three categories.

First, competition-style technical problems. Math olympiad questions, programming puzzles with adversarial test cases, hard physics or chemistry problems with multiple constraints. On these prompts, thinking variants win arena battles against their standard siblings 60-70% of the time.

Second, long-form analytical writing with strict constraints. Legal drafting that has to honor many requirements simultaneously, technical RFCs that need to balance multiple architectural concerns, multi-section research summaries where coverage of each topic matters. The thinking budget lets the model plan the structure before generating, which produces more coherent final outputs.

Third, fact-checking and verification. Asking a thinking model "is the following claim correct, and how do you know?" produces noticeably more reliable responses than asking the standard model the same question. The extended reasoning step gives the model space to consider counter-arguments before committing.`
      },
      {
        h: 'Where thinking hurts',
        p: `The losses are concentrated in different categories.

Casual conversational chat is the first. When the right reply is short, warm, and flow-preserving, the thinking variant tends to over-engineer — it writes a paragraph when a sentence is appropriate, qualifies things that did not need qualification, or treats a chatty prompt as if it were a homework problem. Arena voters consistently prefer non-thinking variants on conversational prompts.

Creative writing is the second. The thinking process tends to make the model more analytical and less imaginative. A story prompt run through a thinking variant often produces a workmanlike result; the same prompt through the standard variant produces something with more voice and surprise. This is the area where thinking variants lose most consistently in arena head-to-heads.

Latency-sensitive applications are the third. Thinking variants add 10-30 seconds of latency per query. For interactive applications — chat, IDE-integrated code generation, real-time customer support — this latency kills the user experience even when the answer quality is marginally higher.`
      },
      {
        h: 'The pricing wrinkle',
        p: `Thinking variants are billed for the thinking tokens, even though they are not user-visible. This adds substantial cost on top of the visible response. A query that produces 500 tokens of visible output might be billed for an additional 4,000 tokens of private reasoning, multiplying the per-query cost by 5-10x depending on the model.

This makes the price-per-correct-answer math complicated. On hard problems where thinking actually helps, the cost is justified by the better answers. On easy problems where thinking does not help, you are paying for compute that produces no improvement. Routing the right queries to the right variant matters more than picking a single default.`
      },
      {
        h: 'The practical routing pattern',
        p: `The pattern most heavy users have converged on is workload-based routing: short, chatty, or creative prompts go to the standard variant; long, technical, or correctness-critical prompts go to the thinking variant.

Implementation varies. Some teams use a simple classifier model to route between variants. Others let the user choose, with a UI toggle for "think harder". Others run both variants and pick the better answer when latency permits. The exact mechanism matters less than the principle: thinking is a tool that solves specific problems, not a universal upgrade. Use it where it helps, skip it where it does not.`
      },
    ],
  },

];
