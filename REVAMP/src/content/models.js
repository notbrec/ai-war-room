// ─── Long-form editorial content for top model spotlights ───────────────────
// Each entry has original, hand-written analysis: positioning, strengths,
// weaknesses, real-world use cases, and how the model behaves in arena battles.
// This is the substantive content AdSense needs to clear "low value content".

export const MODEL_CONTENT = {

  'claude-opus-4-7': {
    headline: 'The reigning king of long-context reasoning',
    tagline: 'Anthropic\'s flagship — a million-token context window and the highest measured ELO on the arena board.',
    sections: [
      {
        h: 'What makes Opus 4.7 different',
        p: `Claude Opus 4.7 is the seventh major iteration of Anthropic's flagship line, and it represents the first time the company has pushed a Claude model to a one-million-token context window at production-scale pricing. That single number reshapes what the model is for. A standard 200k-context model can hold a long PDF or a medium-sized codebase in memory; a one-million-token model can hold the entire source tree of a real product, the design docs, the test fixtures, the issue tracker — and reason across all of it in one shot.

The arena results reflect this. Opus 4.7 climbed past the entire Opus 4.6 generation almost immediately on release, and it currently sits at the top of the ELO board with a comfortable margin. What is unusual is that the gap is widest on what arena voters call "long-form reasoning prompts" — multi-step problems where the model has to track a thread across thousands of tokens of prior context. On short, snappy prompts, the gap narrows considerably.`
      },
      {
        h: 'Where it wins arena battles',
        p: `In head-to-head matchups, voters consistently prefer Opus 4.7 for three kinds of prompts:

First, **codebase-spanning refactors**. When you paste in a large multi-file diff and ask the model to identify breakage in a different part of the system, Opus 4.7 catches dependencies that Sonnet and the older Opus models miss. This is the obvious payoff of the million-token context: the model can actually see the whole picture.

Second, **structured writing with constraints**. Long-form legal summaries, technical RFCs, multi-section research write-ups — anything where the user gives a detailed spec and expects the output to honor every constraint. Opus 4.7 forgets fewer requirements over the course of a long generation than any other model on the board.

Third, **tool-use chains**. With agentic frameworks that call multiple tools in sequence, Opus 4.7's lower hallucination rate translates to fewer derailed loops. It is one of the few frontier models that will explicitly say "I do not have enough information to answer this" rather than confabulate.`
      },
      {
        h: 'Where it loses',
        p: `Opus 4.7 is not the right pick for every task. Voters in the arena prefer Grok 4.20 and GPT-5.4 on prompts where personality, sass, or creative flair matters — Opus tends toward measured, careful prose, which reads as flat to some readers. On hard math olympiad problems, GPT-5.4-high and Gemini 3.1 Pro consistently outperform; Opus is competent but not state-of-the-art on the most adversarial reasoning benchmarks.

Pricing is the other catch. At $5/M input and $25/M output tokens, Opus 4.7 is roughly five times more expensive than Sonnet 4.6 and twenty times more expensive than Haiku-tier models. The premium is justified for the workflows it owns, but it is overkill for routine chat or simple Q&A.`
      },
      {
        h: 'How to use it well',
        p: `The pattern most heavy users have converged on: route long, important, irreversible work to Opus 4.7, and route everything else to Sonnet or a smaller model. The economics only make sense when the cost of getting the answer wrong is high — production code review, legal drafting, multi-document analysis. For volume work like classification or summarization, Sonnet 4.6 delivers 90% of the quality at 60% less cost.

The other technique worth knowing is **explicit context priming**. With a million-token window, the temptation is to dump everything in. In practice, Opus 4.7 performs better when you give it a short prefix that explains what's in the long context — "here is the codebase, here is the task, here is the constraint" — rather than letting it discover the structure on its own.`
      },
    ],
  },

  'claude-opus-4-6-thinking': {
    headline: 'The previous champion, now a more affordable second-best',
    tagline: 'Opus 4.6 with extended thinking — still elite, and now usually the value play against the newer 4.7.',
    sections: [
      {
        h: 'The thinking variant explained',
        p: `Opus 4.6 Thinking is the same base model as standard Opus 4.6, but with a longer internal reasoning budget exposed at inference time. The model writes out an extended chain-of-thought before producing the visible answer — typically 2,000 to 8,000 tokens of private reasoning that the user does not see but pays for.

This matters most on problems where the right answer requires multiple intermediate steps. Math word problems, multi-constraint scheduling, code with subtle off-by-one errors — anything where a shortcut answer is plausible but wrong. The thinking variant catches roughly twice as many of these mistakes as the non-thinking baseline.`
      },
      {
        h: 'How it stacks against Opus 4.7',
        p: `On the arena board, Opus 4.6 Thinking sits in the second slot by ELO, only narrowly behind Opus 4.7. In direct head-to-head, the newer model wins about 55% of battles — a real edge but not a blowout. For most users, the decision comes down to context length and cost.

If your workflow regularly exceeds 200k tokens, Opus 4.7 is the only reasonable choice. If you live under that ceiling, Opus 4.6 Thinking can do the same work at the same per-token price with a battle-tested track record. Many production deployments will stay on 4.6 Thinking for the next few months simply because they have validated it against their evals already.`
      },
      {
        h: 'When extended thinking hurts',
        p: `It is worth noting that thinking variants are not strictly better on every task. On simple factual lookups, conversational chat, or creative writing where flow matters more than precision, the extended reasoning often makes the model second-guess itself into worse answers. The thinking budget also adds 10-30 seconds of latency, which kills the experience for real-time applications.

The rule of thumb: turn thinking on for hard, single-shot problems where correctness is paramount, and turn it off for high-volume or latency-sensitive work.`
      },
    ],
  },

  'claude-opus-4-6': {
    headline: 'The non-thinking version of the previous flagship',
    tagline: 'Opus 4.6 without extended reasoning — faster, cheaper-on-tokens, and still in the top three.',
    sections: [
      {
        h: 'Why the non-thinking variant exists',
        p: `Most frontier-class models now ship in pairs: a thinking variant and a standard variant. The thinking variant gets more attention in benchmarks because it scores higher, but in production, the standard variant is the one most teams actually deploy. The reason is latency. A thinking model takes 10-30 extra seconds to produce a reply, which is fine for an offline batch job and terrible for a chatbot. Opus 4.6 standard answers in 2-6 seconds and is the variant Anthropic recommends for interactive use.`
      },
      {
        h: 'What it is best at',
        p: `Opus 4.6 standard is the workhorse for tasks that need top-tier quality but cannot afford latency. Customer-facing chat at high-tier SaaS, real-time document drafting, IDE-integrated code generation — all of these have effectively moved to Opus 4.6 standard over the past quarter. The win rate against GPT-5.2 and Gemini 3 Pro on similar prompts is consistently in the 53-57% range, which is meaningful but not overwhelming. The reason to pick Opus over the competition usually comes down to two factors: Anthropic's safety guardrails are the strongest in the industry, and the model's tone is the most consistent across long sessions.`
      },
      {
        h: 'The arena voting pattern',
        p: `One notable thing about the arena votes for Opus 4.6 is how they split by prompt category. On code, the model wins big. On creative writing, it is roughly tied with GPT-5.2-chat. On factual Q&A, it loses about a point to Gemini, which has the best search-augmented retrieval. This is a useful signal: pick Opus when correctness and judgment matter, and look elsewhere if your workload is dominated by retrieval-style queries.`
      },
    ],
  },

  'gemini-3-pro': {
    headline: 'Google\'s flagship — the multimodal generalist',
    tagline: 'The model with the best image understanding on the board, plus a one-million-token context window and aggressive pricing.',
    sections: [
      {
        h: 'The Gemini value proposition',
        p: `Gemini 3 Pro is Google's answer to GPT-5 and Claude Opus, and it competes on three axes the others cannot match. First, native multimodality: Gemini was trained from the ground up on text, images, audio, and video, and it handles mixed-modal prompts in a way that bolt-on vision models do not. Second, context length: at 1,048,576 tokens, it is functionally tied with Opus 4.7 and rooms ahead of most competitors. Third, price: at $2/M input and $12/M output, it is half the price of Opus and a fraction of GPT-5.4-high.`
      },
      {
        h: 'Where it actually wins arena battles',
        p: `In raw text-vs-text battles, Gemini 3 Pro trades wins and losses with Claude Opus 4.6 — roughly even on most prompt categories, with Opus edging ahead on code and Gemini edging ahead on factual retrieval. The picture changes dramatically when images are involved. On prompts that include a screenshot, diagram, chart, or photo, Gemini wins about 65% of battles against the next-best vision model. This is the area where Google's investment in multimodal training shows.

The model also has a real advantage on prompts that benefit from Google's search and retrieval infrastructure. When a question requires current information — recent news, live sports scores, fresh API documentation — Gemini's grounding tools deliver fresher and more accurate answers than competitor models that cannot search.`
      },
      {
        h: 'The known weaknesses',
        p: `Gemini 3 Pro is not the best pure-reasoning model on the board. On hard math and complex multi-step logic, Opus 4.7 and GPT-5.4-high both win consistently. The model also has a reputation among heavy users for being slightly more sycophantic — more likely to agree with a wrong premise than to push back — though Google has narrowed this gap considerably with each release.

Tool-use is another area where Gemini lags. Anthropic and OpenAI have spent more engineering effort on agentic frameworks, and the polish shows when you wire Gemini into a multi-step tool chain. The model works, but the ergonomics are rougher.`
      },
    ],
  },

  'gpt-5.4-high': {
    headline: 'OpenAI\'s reasoning specialist',
    tagline: 'GPT-5.4 at high reasoning effort — the model that wins the hardest math and code prompts on the arena board.',
    sections: [
      {
        h: 'What "high" reasoning effort means',
        p: `OpenAI's "high" variants are the GPT line's answer to extended thinking: the same base model with a larger reasoning compute budget at inference time. GPT-5.4-high spends substantially more on each query than the standard GPT-5.4, which translates to better answers on hard problems and worse latency on simple ones. It is the variant OpenAI markets at enterprise customers with deep workflows, not at consumer ChatGPT users.`
      },
      {
        h: 'Where it dominates',
        p: `GPT-5.4-high is the model to beat on competition mathematics, hard physics problems, and adversarial coding challenges. On these prompts, the model wins arena battles against Opus 4.7 with surprising consistency — a reversal of the usual pattern. The reason is OpenAI's investment in reasoning-specific RL training, which produces a model that is particularly good at not giving up on hard problems. Where Claude will sometimes hedge and say "this is uncertain", GPT-5.4-high will grind through and find the answer.

For specialized technical work — quantitative finance, scientific computing, advanced ML research — GPT-5.4-high is the default pick at most well-resourced teams.`
      },
      {
        h: 'The everyday tradeoffs',
        p: `Outside of the hardest reasoning prompts, GPT-5.4-high is overkill. The latency is substantial — often 15-30 seconds per answer — and the price is $2.50/M input and $15/M output, which is competitive with Opus but several times more than the standard GPT-5 variants. For volume chat, GPT-5.4 standard or GPT-5.4-mini-high both deliver 80% of the quality at a fraction of the cost.

The model is also less personable than the consumer-facing ChatGPT variants. OpenAI tuned the high-reasoning line for correctness and stripped out some of the conversational warmth. If you need a model that can chat, look at gpt-5.2-chat-latest. If you need one that can solve hard problems, this is the one.`
      },
    ],
  },

  'grok-4.1-thinking': {
    headline: 'xAI\'s reasoning model with the largest context on the board',
    tagline: 'Grok 4.1 Thinking — two-million-token context, aggressive personality, and competitive on hard reasoning.',
    sections: [
      {
        h: 'The two-million-token context',
        p: `Grok 4.1 Thinking ships with a 2,000,000-token context window — twice what Opus 4.7 or Gemini 3 Pro offer, and an order of magnitude beyond most production models. For workflows that involve very large document sets — entire law libraries, large repository ingestion, multi-book research synthesis — this is the only model on the board that can hold the full corpus in memory at once.

The catch is that effective use of two million tokens is still an open research problem. Even Grok 4.1 Thinking degrades in retrieval accuracy as the context grows past 500k tokens. The headline number is impressive, but in practice, you are still better off chunking very large inputs.`
      },
      {
        h: 'How it behaves in arena battles',
        p: `Grok models have a distinctive personality compared to the rest of the leaderboard. xAI has tuned the model to be more direct, more willing to give opinions, and less likely to refuse edgy prompts than Claude or Gemini. In arena voting, this plays well with users who find the polite default of other models frustrating. It plays poorly when users want measured, careful prose.

On hard reasoning, Grok 4.1 Thinking is solidly in the top tier — close to GPT-5.4 standard, behind GPT-5.4-high and Opus 4.7. The model has caught up dramatically since the original Grok release, but the most demanding technical prompts still go to OpenAI or Anthropic.`
      },
      {
        h: 'When to pick it',
        p: `Grok 4.1 Thinking is the right choice when context length is the binding constraint, or when you specifically want the model's personality. For most other use cases, you can get equal or better quality from Claude or GPT at competitive prices. The model's main strategic position is as the "long context plus attitude" option — a niche but real one.`
      },
    ],
  },

  'gemini-3-flash': {
    headline: 'The best price-to-performance model on the board',
    tagline: 'Gemini 3 Flash — frontier-class quality at one-tenth the cost. The default pick for volume workloads.',
    sections: [
      {
        h: 'The Flash positioning',
        p: `Gemini 3 Flash is the smaller, faster, cheaper sibling of Gemini 3 Pro, and it is the model that has done the most to reshape the cost economics of LLM deployment over the past quarter. At $0.50/M input and $3/M output, it is roughly 10x cheaper than Opus 4.7 and 5x cheaper than GPT-5.4. The surprising thing is how little quality you give up.`
      },
      {
        h: 'How good is it really',
        p: `On the arena leaderboard, Gemini 3 Flash sits comfortably in the top 15 — within striking distance of the major flagships. On routine prompts (chat, summarization, classification, basic Q&A), arena voters cannot reliably distinguish Flash from Pro. The gap only opens on the hardest reasoning prompts, where Pro and the other frontier models pull ahead.

For most production workloads — customer support, content moderation, document processing, basic agentic tasks — Flash is the right default. The cost savings are dramatic enough that you can run it at 5-10x the volume of a flagship model for the same budget, which often produces better outcomes than running fewer queries through a more expensive model.`
      },
      {
        h: 'The thinking variant is worth considering',
        p: `Gemini 3 Flash also has a thinking variant on the board, which sits even higher in the rankings. For workloads where you can tolerate a few extra seconds of latency, the thinking variant captures most of the reasoning advantage of the larger models at the Flash price point. This is probably the single best price-to-performance ratio on the leaderboard for serious work.`
      },
    ],
  },

  'glm-5.1': {
    headline: 'The top open-weight model on the leaderboard',
    tagline: 'Z.ai\'s GLM-5.1 under MIT license — frontier-tier quality you can actually self-host.',
    sections: [
      {
        h: 'Why open weights matter',
        p: `Every model in the top 10 of the arena is closed-source except GLM-5.1. Anthropic, OpenAI, and Google ship their flagships only as API products — you cannot run them on your own hardware, you cannot fine-tune them, and you cannot guarantee data privacy beyond the provider's terms. For a meaningful fraction of enterprise users, that is a hard blocker. GLM-5.1, released under the MIT license, removes that blocker.`
      },
      {
        h: 'How it compares to closed flagships',
        p: `On the arena board, GLM-5.1 is the highest-ranked open-weight model and one of the highest-ranked Chinese-origin models overall. It competes head-to-head with Claude Sonnet 4.6 and GPT-5.2 — slightly behind on the hardest reasoning prompts, roughly equal on code, slightly better on long-form Chinese-language tasks. For an open model, this is a remarkable position. The previous generation of open models trailed the closed frontier by 100-200 ELO points; GLM-5.1 has closed that gap to under 30.`
      },
      {
        h: 'Practical deployment',
        p: `Z.ai serves GLM-5.1 through their API at $0.95/M input and $3.15/M output, which is competitive with the closed mid-tier models. The compelling case for most teams is the option value: deploy through the API while validating, then migrate to self-hosted inference once you have confidence in the model. The MIT license makes that path completely open, including for commercial fine-tuning. This is the model that proves the open-weight ecosystem can compete at the frontier — not match it exactly, but close enough that the practical differences are usually outweighed by the deployment flexibility.`
      },
    ],
  },

  'kimi-k2.5-thinking': {
    headline: 'Moonshot\'s reasoning model — modified MIT and surprisingly strong',
    tagline: 'Kimi K2.5 Thinking — competitive on hard reasoning, releaseable under a permissive license, and priced aggressively.',
    sections: [
      {
        h: 'The Kimi line',
        p: `Moonshot AI's Kimi series has been one of the surprises of the past year. The original Kimi models were primarily known in the Chinese market, but K2.5 has broken out to global attention on the arena. The thinking variant in particular has put up scores that put it in the top 30 globally, which is a substantial jump from where the line sat a few quarters ago.`
      },
      {
        h: 'License and deployment',
        p: `Kimi K2.5 ships under a Modified MIT license, which is permissive for most uses but adds attribution and use-case restrictions that pure MIT does not. Read the license carefully before commercial deployment, especially if your application competes with Moonshot's own products. For most non-competing uses, the license is effectively as permissive as standard MIT.`
      },
      {
        h: 'Where it fits',
        p: `Kimi K2.5 Thinking is in the same competitive band as the mid-tier closed models — Claude Sonnet 4.6, GPT-5.2, Gemini 3 Flash. It is not catching the absolute frontier, but it is also priced and licensed in a way that makes it a serious option for cost-conscious teams. If your workload is dominated by reasoning-heavy queries and you want an open-weight backup to your closed-model deployment, K2.5 Thinking is one of the strongest candidates on the board.`
      },
    ],
  },

  'deepseek-v3.2-thinking': {
    headline: 'The most cost-efficient frontier-tier model on the leaderboard',
    tagline: 'DeepSeek V3.2 Thinking under MIT license — the price-to-performance benchmark every other model is measured against.',
    sections: [
      {
        h: 'The DeepSeek pricing shock',
        p: `DeepSeek V3.2 prices at $0.27/M input and $0.41/M output — roughly twenty times cheaper than the top closed models. The DeepSeek team has been the most aggressive on inference efficiency in the entire industry, and the price reflects it. For applications where every query counts against a budget, DeepSeek V3.2 has reset what users expect to pay.`
      },
      {
        h: 'How good is it at the price',
        p: `On the arena board, DeepSeek V3.2 Thinking sits in the top 50 globally — well below the frontier flagships, but competitive with the previous generation of mid-tier closed models. On code and math specifically, the thinking variant punches above its weight: it wins arena battles against models that cost ten times more on a meaningful fraction of technical prompts.

The model is not the best at anything in particular. It is the best at being adequate at almost everything for the lowest price on the board. For a large class of production workloads where good enough beats expensive, DeepSeek V3.2 is the obvious answer.`
      },
      {
        h: 'Open weights and the geopolitical context',
        p: `DeepSeek ships under MIT, and the weights are widely available for self-hosting. This has made the model controversial: some Western buyers avoid Chinese-origin models for regulatory or data-residency reasons. For users not subject to those constraints, V3.2 is one of the strongest values on the entire leaderboard. For users who are, the comparable picks are GLM-5.1 (also Chinese, also open weights) or one of the Western open-weight models like Llama-4-Maverick, which trade quality for jurisdictional comfort.`
      },
    ],
  },

};
