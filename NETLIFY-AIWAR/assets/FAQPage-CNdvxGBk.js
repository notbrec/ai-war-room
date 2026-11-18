import{u as b,j as e,y as u,k as v,z as r,as as x,at as c,ap as k,au as A,M as j}from"./index-DxQFeY-m.js";import{r as p}from"./react-jVyfcstf.js";const l=[{cat:"Ratings",q:"What exactly is an ELO score?",a:`ELO is a relative skill rating system invented by Arpad Elo to rank chess players. Each
    rated entity — whether a grandmaster or an AI model — starts at a base number (usually around
    1500). When two compete head-to-head, the loser transfers a small portion of their rating to
    the winner. Upsets transfer more points than expected wins, so the system self-corrects over
    time. After enough battles, every player's rating reflects roughly how often they should beat
    every other player. A 100-point lead predicts ~64% win probability; 200 points predicts ~76%.
    The system is robust to gaming because the opponents are also high-skill entities and the
    judges (in the case of AI arena) are uncoordinated humans.`},{cat:"Ratings",q:"Why does ELO change between visits?",a:`Arena ELO is recomputed continuously as new votes arrive. Arena.ai processes hundreds of
    thousands of human battles per day across hundreds of models, and AI WAR ROOM pulls a fresh
    snapshot every 30 minutes. Small swings (±5 points) are normal noise. Larger swings usually
    mean a model has either had a new wave of votes (new release, viral moment) or that arena.ai
    has merged sibling deployments under one name. If you see a sudden jump of 30+ points for a
    well-established model, check arena.ai directly — there may have been a methodology update.`},{cat:"Ratings",q:"What is the confidence interval (±CI) and why should I care?",a:`The CI tells you how stable a model's ranking is. A model with ±7 has been tested in
    enough battles that its rating won't move by more than ~7 points with new data. A model with
    ±20 might be undervalued or overvalued by up to 20 points in either direction. Brand-new
    releases routinely arrive with ±25–35 CIs because they have a few thousand votes instead of a
    few hundred thousand. Wait a week before treating them as definitively ranked. The CI also
    helps you read ties: two models within each other's CI bands should be treated as
    statistically indistinguishable.`},{cat:"Ratings",q:"Are arena ratings comparable across model families?",a:`Yes, with one caveat: arena measures human preference on chat-style prompts. A model
    that's stunning at multi-step coding inside an IDE may rate lower than its rivals because
    arena voters don't typically test it that way. Use arena ELO as the strongest single signal
    for general assistant quality, then run domain-specific evals (HumanEval, SWE-bench, MMLU
    subsets) for specialised use cases.`},{cat:"Picking a model",q:"How do I actually choose between two close-ranked models?",a:`When two models are within ~30 ELO points, the rating won't help you. Decide on practical
    grounds: price (often varies 5–50× between similarly-ranked models), context window (200K vs
    32K is a different product, not just a different number), latency (Flash variants are 2–4×
    faster), licence (open vs proprietary), and your own quick eval — pick 5 prompts from your
    real workload and try both. The arena gives you a top tier; your own judgement picks within
    it.`},{cat:"Picking a model",q:"Should I always use the top-ranked model?",a:`Almost never. The #1 model is typically the most expensive, slowest, and built for the
    hardest reasoning tasks. For chatting, summarising, classifying, or extracting structured
    data, a model in positions 5–20 will perform indistinguishably for a fraction of the cost.
    Use the top-ranked model when wrong answers are expensive: legal, medical, financial, agentic
    workflows, or code that ships. Use a mid-tier model for everything else.`},{cat:"Picking a model",q:'When is a "Thinking" or "Reasoning" variant worth it?',a:`When your task requires multiple logical steps that build on each other — proofs, code
    refactors that touch many files, complex SQL, mathematical optimisation, or planning agents.
    Thinking variants generate hidden chain-of-thought before answering, which costs you tokens
    and latency in exchange for substantially better accuracy on hard problems. For
    conversational chat, FAQ-style answers, or anything you'd consider "easy", a non-thinking
    variant of the same model is faster, cheaper, and often equally good.`},{cat:"Picking a model",q:"What about open-weight models? Are they competitive?",a:`In 2026, yes — at the A and B tiers. DeepSeek V3.2, Qwen3 Max, Kimi K2, Llama 4, GLM 5,
    and Mistral Large now compete head-to-head with proprietary frontier models on most everyday
    tasks. They're not at S-tier on arena, but they're close. The advantage: you can self-host,
    fine-tune, run on-prem for data residency, or hit them via cheaper API providers. The
    disadvantage: you handle the infrastructure, and on the very hardest reasoning tasks the
    proprietary frontier still leads.`},{cat:"Pricing",q:"How is the pricing computed?",a:`Pricing comes live from OpenRouter, a routing layer that aggregates inference providers
    for most major models. We show input price (per 1M input tokens) and output price (per 1M
    output tokens) separately because the ratio matters: a model with cheap input and expensive
    output is great for short prompts → long responses, while a model with cheap output is better
    for summarisation. If a model is missing a price, it means OpenRouter doesn't currently route
    to that exact variant — check the model's first-party API.`},{cat:"Pricing",q:"How do I budget for a real project?",a:`Estimate three numbers: tokens per request, requests per day, and the input/output ratio.
    Multiply input tokens by the input price (per million), output tokens by the output price,
    and add. For a typical RAG application, you're feeding in 2–8K input tokens and getting back
    500–1500 output tokens per call. At, say, $3 input / $15 output per million on a frontier
    model, a 50K-request/month workload is a few hundred dollars. The same workload on an A-tier
    open-weight model via a low-cost provider is often under $20.`},{cat:"Pricing",q:"Why is some pricing surprisingly cheap?",a:`Two reasons. First, Chinese labs (DeepSeek, Z.ai, Alibaba, Moonshot) deliberately price
    aggressively to win developer adoption — their inference costs are typically lower because of
    domestic compute and exchange-rate advantages. Second, open-weight models can be hosted by
    third-party inference providers competing on price; you'll often see 5–10× variation between
    providers for the same open model. OpenRouter shows the cheapest available route by default,
    so what you see is the floor, not the average.`},{cat:"Arena mechanics",q:"Can the arena be gamed?",a:`Not easily. Voters don't know which model produced which answer until after they vote
    (and most never check). Models are paired randomly, so brigading a specific model is hard.
    Arena.ai also runs automated checks to flag suspicious voting patterns. The biggest legitimate
    "gaming" is stylistic — models that sound confident and write in markdown tend to win against
    equally-accurate models that write plain prose. This is a real bias, but arena adjusts via
    "style controls" in advanced views, and the effect is well under 50 ELO points even for the
    most affected models.`},{cat:"Arena mechanics",q:"Do voters actually know what makes a good answer?",a:`On average, yes. The wisdom-of-crowds effect is strong: thousands of voters with different
    expertise levels collectively produce a stable signal. Individual votes are noisy, but tens of
    thousands per model converge on something real. Where this breaks down is for highly
    specialised tasks — niche scientific questions, hard programming problems, languages with few
    speakers in the voter pool. Use arena ELO as a general-purpose proxy and supplement with
    domain-specific evals for niche work.`},{cat:"Arena mechanics",q:"Why are there so many variants of the same model?",a:`Big labs ship multiple SKUs of a single underlying model: Mini, Nano, Pro, High, Fast,
    Thinking, Chat, Latest, Preview. These usually differ in size, latency, or reasoning
    behaviour rather than fundamental capability. Arena rates each variant separately because
    they behave differently in conversation. If you see Claude Opus 4.7 at 1530 and Claude Opus
    4.7 Thinking at 1545, the thinking variant is the same brain with extra chain-of-thought
    enabled — better on hard tasks, slower on easy ones.`},{cat:"Data",q:"How often does AI WAR ROOM update?",a:`ELO data refreshes from arena.ai every 30 minutes. Pricing refreshes from OpenRouter on
    the same cadence. New models are added within hours of arena.ai listing them. The "Last
    updated" indicator at the top of the leaderboard shows the most recent successful sync.`},{cat:"Data",q:"Where does the model description text come from?",a:`Descriptions are built from our internal model catalogue, which we maintain by hand from
    public lab announcements, model cards, and inference-provider documentation. We avoid
    marketing language and try to summarise what each variant is actually for. If a description
    feels stale or wrong, it likely is — newer models sometimes ship before our catalogue catches
    up.`},{cat:"Data",q:"Is this site affiliated with arena.ai, OpenRouter, or any of the labs?",a:`No. AI WAR ROOM is an independent leaderboard. We pull public data from arena.ai's public
    leaderboard endpoint and OpenRouter's public pricing API. We don't represent any of the
    labs, and we don't accept payment from any of them. If we get something wrong, that's on us.`},{cat:"Data",q:"Why is some data missing for some models?",a:`A model on arena might not be on OpenRouter (no live pricing); an OpenRouter model might
    not be on arena (no ELO). When data is missing, we show a dash rather than a guess. Open
    licences are tagged from our catalogue, which we keep up to date but may lag a few days on a
    brand-new release.`},{cat:"About",q:"Why does AI WAR ROOM exist?",a:`Because picking an AI model in 2026 should not require reading twenty marketing
    announcements and a benchmark whitepaper. The signal is in the arena: real humans, real
    prompts, real preferences. Our job is to surface that signal cleanly, alongside the price you
    actually pay, and let you decide. If we make one team's model-choice decision 10 minutes
    faster and 20% better, the site has done its job.`}],S=[...new Set(l.map(o=>o.cat))];function I({item:o,isOpen:i,onToggle:s,delay:d}){return e.jsx(c,{delay:d,children:e.jsxs("div",{style:{borderBottom:"0.5px solid var(--sep)"},children:[e.jsxs("button",{onClick:s,"aria-expanded":i,className:"aiwar-press-btn",style:{width:"100%",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,padding:"22px 0",background:"none",border:"none",cursor:"pointer",textAlign:"left",fontFamily:u,color:"var(--text)"},children:[e.jsx("span",{style:{fontSize:18,fontWeight:600,letterSpacing:"-0.024em",lineHeight:1.35,paddingRight:8},children:o.q}),e.jsx("span",{style:{width:28,height:28,borderRadius:14,background:"var(--card)",border:"0.5px solid var(--sep)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",flexShrink:0,transform:i?"rotate(45deg)":"rotate(0deg)",transition:`transform 300ms ${r}, background 200ms`},children:e.jsx("svg",{width:"11",height:"11",viewBox:"0 0 11 11",fill:"none",children:e.jsx("path",{d:"M5.5 1v9M1 5.5h9",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round"})})})]}),e.jsx("div",{style:{overflow:"hidden",maxHeight:i?800:0,opacity:i?1:0,transition:`max-height 500ms ${r}, opacity 300ms ${r}`},children:e.jsx("p",{style:{fontSize:16.5,lineHeight:1.7,color:"var(--text)",letterSpacing:"-0.012em",margin:"0 0 24px",opacity:.86,whiteSpace:"pre-line",paddingRight:44},children:o.a})})]})})}function R({onNavigate:o,liveModels:i}){const s=b(),d=i??k,[m,g]=p.useState(()=>new Set(l.map((a,t)=>t))),[h,f]=p.useState("All"),y=h==="All"?l:l.filter(a=>a.cat===h),w=a=>{g(t=>{const n=new Set(t);return n.has(a)?n.delete(a):n.add(a),n})};return e.jsxs("div",{className:"page-enter",style:{background:"transparent",fontFamily:u,minHeight:"100vh"},children:[e.jsx(v,{}),e.jsxs("div",{style:{maxWidth:760,margin:"0 auto",padding:s?"40px 18px 96px":"72px 24px 112px"},children:[e.jsxs("header",{style:{marginBottom:36},children:[e.jsx("div",{style:{opacity:0,animation:`aiwar-fade-up 280ms ${r} both`},children:e.jsx(x,{children:"FAQ"})}),e.jsxs("h1",{style:{fontSize:s?"clamp(36px,9vw,48px)":"clamp(52px,5.8vw,76px)",fontWeight:700,letterSpacing:"-0.05em",lineHeight:.98,color:"var(--text)",margin:"10px 0 18px",opacity:0,animation:`aiwar-fade-up 280ms ${r} both`},children:["Honest answers.",e.jsx("br",{}),"No marketing."]}),e.jsx("p",{style:{fontSize:s?17:21,lineHeight:1.45,color:"var(--muted)",letterSpacing:"-0.02em",margin:0,opacity:0,animation:`aiwar-fade-up 280ms ${r} both`},children:"The questions we get most often about ELO, arena battles, picking a model, pricing, and how the leaderboard works."})]}),e.jsx(c,{children:e.jsx("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:28},children:["All",...S].map(a=>{const t=a===h;return e.jsx("button",{onClick:()=>f(a),className:"aiwar-press-btn",style:{height:32,paddingInline:14,borderRadius:980,background:t?"var(--text)":"transparent",color:t?"var(--bg)":"var(--text)",fontSize:13,fontWeight:t?600:500,border:"0.5px solid",borderColor:t?"var(--text)":"var(--sep)",cursor:"pointer",letterSpacing:"-0.01em"},children:a},a)})})}),e.jsx("div",{children:y.map((a,t)=>{const n=l.indexOf(a);return e.jsx(I,{item:a,isOpen:m.has(n),onToggle:()=>w(n),delay:Math.min(t*40,320)},a.q)})}),e.jsx(c,{children:e.jsxs("div",{style:{background:"var(--card)",borderRadius:18,padding:s?"24px 22px":"28px 28px",marginTop:44,border:"0.5px solid var(--sep)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:19,fontWeight:600,color:"var(--text)",letterSpacing:"-0.028em",marginBottom:6,lineHeight:1.2},children:"Want to go deeper?"}),e.jsx("div",{style:{fontSize:14,color:"var(--muted)",letterSpacing:"-0.01em",lineHeight:1.5},children:"The Guide walks through how to read the leaderboard end-to-end."})]}),e.jsxs("button",{onClick:()=>o("guide"),className:"aiwar-press-btn",style:{height:42,paddingInline:18,borderRadius:980,background:"var(--text)",color:"var(--bg)",fontSize:14,fontWeight:600,border:"none",cursor:"pointer",flexShrink:0,display:"inline-flex",alignItems:"center",gap:6},children:["Read the Guide",e.jsx("svg",{width:"12",height:"12",viewBox:"0 0 12 12",fill:"none",children:e.jsx("path",{d:"M2 6h8M6 2l4 4-4 4",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round"})})]})]})}),e.jsxs("p",{style:{fontSize:12,color:"var(--muted2)",textAlign:"center",marginTop:48,letterSpacing:"-0.005em",fontFamily:j},children:["AI WAR ROOM · ",d.length,"+ models tracked · ",A]})]})]})}export{R as default};
