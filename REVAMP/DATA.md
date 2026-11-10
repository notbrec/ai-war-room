# AI WAR ROOM · data architecture

The command-center pages (War Room, LLM Rankings, Code Ops, Image / Video Arena,
Voice Comms, Provider War, Benchmarks, Battle Mode, Speed Race, Mission Planner)
all read from one normalised dataset served by a single Netlify Function.

```
netlify/functions/
  leaderboard.js           /api/leaderboard          — legacy contract (arena text board), built from the llms domain
  warroom.js               /api/warroom/:domain      — llms · media · providers · coding · speech · history · status
  snapshot.js              scheduled (every 6 h)     — stores the daily history snapshot
  lib/
    arena.js               official arena leaderboard dataset reader (parquet: text, vision, search, webdev, image, video boards)
    cache.js               Netlify Blobs + in-memory cache, TTL, stale-but-valid fallback
    merge.js               cross-source merging + precedence rules (pure, tested)
    domains.js             per-domain loaders, history, status
    http.js                fetch with timeout, bounded concurrency
  adapters/
    openrouter.js          public /models + /models/:id/endpoints
    artificialanalysis.js  official Data API, key-gated (ARTIFICIAL_ANALYSIS_API_KEY)
    swebench.js            swebench.com leaderboard-data JSON
    openasr.js             Open ASR Leaderboard main table (the Space's public /config)
    aaweb.js               Artificial Analysis published pages (LLMs, media, TTS, STT, speech-to-speech)
shared/                    dependency-free logic used by both server and browser
  ids.js                   canonical model ids (lab:family[:variant]), fuzzy matching
  metrics.js               metric registry (label, unit, direction, source, format)
  pareto.js                Pareto frontier + best-value zone
  recommend.js             Mission Planner scoring
  race.js                  Speed Race lanes
  history.js               snapshots, diffs, retention
src/data/                  client fetch + session cache + hooks (useLLMs, useMedia, …)
src/components/charts/     ScatterChart, TrendChart, RaceLanes (SVG, no chart library)
src/components/table/      DataTable with column picker, sticky first column, paging
src/domains/               models · comparison (battle) · benchmarks
```

## Sources and what they give

| Source | Access | Gives |
|---|---|---|
| arena.ai | official dataset `lmarena-ai/leaderboard-dataset` on Hugging Face (CC BY 4.0, parquet via hyparquet), 6 h cache. The arena.ai pages are behind a Cloudflare challenge since Oct 2026 | ELO, CI, votes, org, licence for text (style control), vision (style control), search, webdev, text-to-image, image-edit, text-to-video, image-to-video; `isNew`/`firstSeen` = joined the board in the last 30 days (from the `full` split, rename-aware). Prices / context / model-card links the pages listed until Oct 2026 are carried forward per model with `listedAt` |
| OpenRouter | public API, 3–6 h cache | in/out/cache pricing, context, max output, modalities, reasoning/tool support, release date, per-provider endpoints (price, ctx, quantisation, uptime), relayed AA indexes and Design Arena ELOs |
| SWE-bench | official page's `leaderboard-data` JSON, 12 h | agent × model, resolved %, $/task, calls/task |
| Open ASR Leaderboard | main table in the Space's public Gradio `/config` (the results CSV went private in Oct 2026), 24 h | WER (avg + per dataset), RTFx; open weights inferred from the model link (HF / GitHub repo vs vendor page); params from the name |
| Artificial Analysis | official Data API with `ARTIFICIAL_ANALYSIS_API_KEY` (LLM board only, 12 h cache = at most 2 calls a day; a failed call is not retried for 12 h), else the published leaderboard pages (adapters/aaweb.js, Next.js RSC flight payload, 6 h cache; `AA_WEB=0` disables). Media, TTS, STT and speech-to-speech always come from the pages | speed, TTFT, E2E, per-benchmark scores, media generation times and prices, TTS / STT, speech-to-speech (Speech Arena ELO, Big Bench Audio, τ-Voice, time to first audio, $/hour) |

Without the AA key every dependent cell reads **N/A** — nothing is estimated.
Attribution is shown wherever a source's numbers appear (SourceTag, footers,
Methodology page).

## Precedence (lib/merge.js)

price → OpenRouter > arena listing > AA · context → OpenRouter > arena ·
ELO → arena · speed / latency / benchmarks → AA · indexes → AA API > AA-via-OpenRouter.

## Failure behaviour

Each upstream is cached separately. If a fetch fails, the last valid copy is
served with `stale: true` and the UI shows "Cached · N ago"; if nothing valid
exists the source is `unavailable` and its columns are N/A. One source failing
never fails a page.

## History

`loadLLMs` writes a compact snapshot (`warroom:v1:history:YYYY-MM-DD`) when the
numbers change; `snapshot.js` also runs on a schedule. Retention: daily for 60
days, weekly for a year, monthly after. Rank deltas (1d / 7d / 30d) and the
trend charts on model pages come from these. Locally (no Blobs) history is
memory-only.

## Scripts

```
npm test              vitest (normalisation, metrics, recommendation, race, history, adapters, merge)
npm run smoke         hit every domain loader in Node against the live sources
npm run render-smoke  server-render every page with live data (catches data→UI errors)
npm run shots <dir>   screenshot every page at desktop + phone widths via headless Chrome
npm run deploy-prep   refresh the first-paint snapshot (scripts/refresh-fallback.mjs), build,
                      copy dist → ../NETLIFY-AIWAR, sync functions + shared → repo root
```

Deploy = `npm run deploy-prep`, then commit and push `main` (Netlify builds from
the GitHub repo; the local Netlify CLI is not authenticated).
