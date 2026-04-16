# AI WAR ROOM Landing Page

Current React component version, saved as Markdown.

```jsx
export default function AIWarRoomLanding() {
  const topModels = [
    { rank: 1, name: 'GPT-4o', org: 'OpenAI', overall: 82.9, reasoning: 78.1, coding: 85.8, math: 77.5, data: 84.6, language: 79.1, instruction: 80.7, badge: 'Front Runner' },
    { rank: 2, name: 'Gemini 1.5 Pro', org: 'Google', overall: 78.6, reasoning: 79.3, coding: 84.0, math: 74.5, data: 79.0, language: 81.4, instruction: 79.7, badge: 'Pressure' },
    { rank: 3, name: 'Claude 3 Opus', org: 'Anthropic', overall: 76.4, reasoning: 77.3, coding: 76.7, math: 71.8, data: 82.2, language: 76.9, instruction: 74.1, badge: 'Precision' },
    { rank: 4, name: 'DeepSeek V3', org: 'DeepSeek', overall: 74.8, reasoning: 75.4, coding: 79.2, math: 72.1, data: 73.5, language: 72.4, instruction: 75.0, badge: 'Open Weight' },
    { rank: 5, name: 'Llama 3.1 405B', org: 'Meta', overall: 72.6, reasoning: 73.7, coding: 74.2, math: 69.6, data: 71.8, language: 74.8, instruction: 71.2, badge: 'Heavyweight' },
    { rank: 6, name: 'Grok 2', org: 'xAI', overall: 71.9, reasoning: 70.8, coding: 73.6, math: 68.9, data: 70.4, language: 75.3, instruction: 72.7, badge: 'Wildcard' },
    { rank: 7, name: 'Qwen 2.5 Max', org: 'Alibaba', overall: 70.8, reasoning: 71.2, coding: 72.5, math: 69.3, data: 68.8, language: 71.0, instruction: 71.7, badge: 'Rising' },
    { rank: 8, name: 'Mistral Large', org: 'Mistral', overall: 69.5, reasoning: 69.9, coding: 70.1, math: 67.8, data: 68.3, language: 70.9, instruction: 69.4, badge: 'Fast' },
    { rank: 9, name: 'Command R+', org: 'Cohere', overall: 67.8, reasoning: 67.4, coding: 66.9, math: 64.6, data: 69.5, language: 71.3, instruction: 68.0, badge: 'Enterprise' },
    { rank: 10, name: 'Phi-4', org: 'Microsoft', overall: 66.7, reasoning: 66.1, coding: 67.9, math: 65.8, data: 64.4, language: 67.2, instruction: 66.8, badge: 'Compact' },
    { rank: 11, name: 'Yi Large', org: '01.AI', overall: 65.9, reasoning: 65.1, coding: 66.4, math: 63.3, data: 64.8, language: 66.5, instruction: 65.7, badge: 'Next' },
    { rank: 12, name: 'Nemotron', org: 'NVIDIA', overall: 65.1, reasoning: 64.7, coding: 65.8, math: 62.9, data: 63.6, language: 66.1, instruction: 65.0, badge: 'Next' },
  ];

  const systemPanels = [
    { label: 'Refresh cycle', value: '6 months', note: 'Questions rotate regularly to reduce contamination risk.' },
    { label: 'Judging mode', value: 'Objective', note: 'Ground-truth answers instead of subjective model judging.' },
    { label: 'Coverage', value: '23 tasks / 7 categories', note: 'Reasoning, math, coding, data and more.' },
    { label: 'Strict filter', value: 'High unseen bias', note: 'Sharper slice for less memorized benchmark behavior.' },
  ];

  const categories = [
    { title: 'Reasoning', score: 9.4 },
    { title: 'Math', score: 9.1 },
    { title: 'Coding', score: 9.7 },
    { title: 'Data Analysis', score: 8.9 },
    { title: 'Language', score: 8.8 },
    { title: 'Instruction', score: 9.0 },
  ];

  const releases = [
    { name: 'LiveBench-2026-01-08', note: 'Latest release with new math and data analysis tasks.' },
    { name: 'Previous releases', note: 'Historical snapshots for comparison and trend tracking.' },
    { name: 'Rolling refresh', note: 'A full refresh cadence preserves benchmark relevance.' },
  ];

  const nextModels = topModels.slice(10);

  const scoreDot = (score) => {
    if (score >= 80) return 'bg-cyan-400';
    if (score >= 74) return 'bg-emerald-400';
    if (score >= 68) return 'bg-yellow-400';
    return 'bg-orange-400';
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white [font-family:Inter,SF_Pro_Display,SF_Pro_Text,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe_UI,sans-serif]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,160,255,0.12),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.06),transparent_22%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-8 md:px-8 lg:px-12">
        <header className="sticky top-4 z-30 mb-10 rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 backdrop-blur-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.34em] text-white/45">Benchmark command center</div>
              <div className="text-[20px] font-semibold tracking-tight text-white">AI WAR ROOM</div>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm text-white/66">
              {['Leaderboard', 'Categories', 'Releases', 'Methodology'].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  {item}
                </span>
              ))}
            </nav>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] px-8 py-10 backdrop-blur-2xl md:px-10 md:py-12 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_34%,rgba(130,180,255,0.20),transparent_14%),radial-gradient(circle_at_60%_42%,rgba(255,255,255,0.07),transparent_18%),radial-gradient(circle_at_76%_22%,rgba(255,255,255,0.05),transparent_20%)]" />
          <div className="absolute right-[10%] top-1/2 hidden h-[420px] w-[420px] -translate-y-1/2 rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(126,167,255,0.18),rgba(126,167,255,0.04)_36%,rgba(0,0,0,0)_60%)] shadow-[0_0_120px_rgba(122,156,255,0.14)] lg:block" />
          <div className="absolute right-[12%] top-1/2 hidden h-[320px] w-[320px] -translate-y-1/2 rounded-full border border-white/10 lg:block" />
          <div className="absolute right-[18%] top-[34%] hidden h-2 w-2 rounded-full bg-white/80 shadow-[0_0_20px_rgba(255,255,255,0.8)] lg:block" />
          <div className="absolute right-[28%] top-[56%] hidden h-2 w-2 rounded-full bg-white/70 shadow-[0_0_18px_rgba(255,255,255,0.6)] lg:block" />

          <div className="relative grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/66">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                LiveBench-inspired, Apple-clean benchmark interface
              </div>

              <h1 className="text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                The AI battlefield,
                <br />
                compressed into one
                <br />
                clean command center.
              </h1>

              <p className="mt-6 max-w-2xl text-[17px] leading-8 text-white/58">
                Minimalist, premium, and software-like. AI WAR ROOM keeps the benchmark backbone, but presents it with Apple-style hierarchy, glass surfaces, calm spacing, and a leaderboard that feels like a product, not a document.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition duration-300 hover:opacity-90">
                  Open leaderboard
                </button>
                <button className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/80 backdrop-blur-xl transition duration-300 hover:bg-white/[0.08]">
                  Compare models
                </button>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-2xl">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                <div className="ml-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/38">
                  AI_WAR_ROOM / STRICT_VIEW
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/42">Featured mode</div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">High unseen bias</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/62">Strict</div>
                </div>

                <p className="mt-4 text-sm leading-7 text-white/56">
                  A more demanding lens on model performance, focused on fresher and less easily memorized benchmark slices.
                </p>

                <div className="mt-6 divide-y divide-white/10 rounded-[20px] border border-white/10 bg-white/[0.03]">
                  {[
                    ['Fairness pressure', '9.6/10'],
                    ['Novelty sensitivity', '9.3/10'],
                    ['Credibility signal', '9.2/10'],
                    ['Audience appeal', '9.8/10'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3.5 text-sm">
                      <span className="text-white/58">{label}</span>
                      <span className="font-medium text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-white/42">Controls</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Filters and benchmark context</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {['Overall', 'Reasoning', 'Math', 'Coding', 'Data', 'Language', 'Instruction'].map((item, idx) => (
                <span key={item} className={`rounded-full px-4 py-2 ${idx === 0 ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.04] text-white/68'}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-sm text-white/62">
            {['High unseen bias: On', 'Closed + Open models', 'Latest release selected', 'Sort by overall score'].map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
          <div className="mb-5 flex flex-col gap-3 px-1 pt-1 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-white/42">Competitors</div>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight">Top 10 leaderboard</h3>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-white/62">
              {['Showing 1–10', 'Scroll for 11+', 'Sortable columns'].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <div className="ml-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/38">
                AI_WAR_ROOM / LEADERBOARD
              </div>
            </div>

            <div className="grid grid-cols-[72px_1.55fr_120px_120px_120px_120px_120px_120px_130px] gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-4 text-[11px] uppercase tracking-[0.24em] text-white/36">
              <div>Rank</div>
              <div>Competitor</div>
              <div>Overall</div>
              <div>Reason</div>
              <div>Code</div>
              <div>Math</div>
              <div>Data</div>
              <div>Lang</div>
              <div>Instruction</div>
            </div>

            <div className="divide-y divide-white/10">
              {topModels.slice(0, 10).map((model) => (
                <div key={model.name} className="grid grid-cols-[72px_1.55fr_120px_120px_120px_120px_120px_120px_130px] gap-2 px-4 py-4 transition duration-300 hover:bg-white/[0.03]">
                  <div className="flex items-center">
                    <div className={`rounded-2xl px-3 py-2 text-sm font-medium ${model.rank <= 3 ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.04] text-white/88'}`}>
                      #{model.rank}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white/90">
                      {model.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium tracking-tight text-white">{model.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-white/46">
                        <span>{model.org}</span>
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        <span>{model.badge}</span>
                      </div>
                    </div>
                  </div>

                  {[model.overall, model.reasoning, model.coding, model.math, model.data, model.language, model.instruction].map((score, idx) => (
                    <div key={idx} className="flex items-center">
                      <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-white">{score.toFixed(1)}</span>
                          <span className={`h-2.5 w-2.5 rounded-full ${scoreDot(score)}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-medium text-white">Extended ranking</div>
                <div className="mt-1 text-sm text-white/54">The same software-style structure continues beyond the visible top 10.</div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/68">Previous</button>
                <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black">Next page</button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.03]">
              {nextModels.map((model) => (
                <div key={model.name} className="grid grid-cols-[72px_1fr_120px] items-center gap-3 border-b border-white/10 px-4 py-3 last:border-b-0">
                  <div className="text-sm text-white/42">#{model.rank}</div>
                  <div>
                    <div className="text-sm font-medium text-white">{model.name}</div>
                    <div className="text-xs text-white/46">{model.org}</div>
                  </div>
                  <div className="justify-self-end rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-white">
                    {model.overall.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
            <div className="mb-4 border-b border-white/10 pb-4">
              <div className="text-[11px] uppercase tracking-[0.3em] text-white/42">System status</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Benchmark core</h2>
            </div>
            <div className="divide-y divide-white/10 rounded-[24px] border border-white/10 bg-black/20">
              {systemPanels.map((panel) => (
                <div key={panel.label} className="grid grid-cols-[130px_1fr] gap-4 px-4 py-4">
                  <div className="text-sm text-white/44">{panel.label}</div>
                  <div>
                    <div className="text-sm font-medium text-white">{panel.value}</div>
                    <div className="mt-1 text-sm leading-6 text-white/54">{panel.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
            <div className="mb-4 border-b border-white/10 pb-4">
              <div className="text-[11px] uppercase tracking-[0.3em] text-white/42">Design direction</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Apple principles applied</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['Negative space', 'Panels breathe, margins are wider, the page scans faster.'],
                ['Typography', 'Large quiet headlines, smaller low-contrast support copy.'],
                ['Glassmorphism', 'Frosted bars and floating layers keep it premium and calm.'],
                ['Motion language', 'Smooth, subtle transitions instead of noisy interaction.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-medium text-white">{title}</div>
                  <div className="mt-2 text-sm leading-6 text-white/54">{text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
            <div className="mb-4 flex items-end justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/42">Benchmark map</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Category signals</h2>
              </div>
              <div className="text-sm text-white/46">1 to 10 visual scale</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {categories.map((item) => (
                <div key={item.title} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white">{item.title}</div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/76">
                      {item.score.toFixed(1)}
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-white" style={{ width: `${(item.score / 10) * 100}%`, opacity: 0.9 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
            <div className="mb-4 border-b border-white/10 pb-4">
              <div className="text-[11px] uppercase tracking-[0.3em] text-white/42">Release layer</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Versioned benchmark story</h2>
            </div>
            <div className="space-y-3">
              {releases.map((release) => (
                <div key={release.name} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-medium text-white">{release.name}</div>
                  <div className="mt-2 text-sm leading-6 text-white/54">{release.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 mb-10 rounded-[32px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-white/42">Final direction</div>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-white">Build the benchmark page people actually want to revisit.</h2>
              <p className="mt-4 max-w-3xl text-[16px] leading-8 text-white/56">
                Keep the LiveBench backbone, objectivity, category structure, release cadence, and bias-aware filtering. Present it with restraint, polish, and software-grade clarity so it feels unmistakably premium.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-right">
              <div className="text-sm text-white/44">Tag line</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-white">Track the models at war.</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
```
