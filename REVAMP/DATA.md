# AI WAR ROOM · data architecture

The command-center pages (War Room, LLM Rankings, Code Ops, Image / Video Arena,
Voice Comms, Provider War, Benchmarks, Battle Mode, Speed Race, Mission Planner)
all read from one normalised dataset served by a single Netlify Function.

```
netlify/functions/
  leaderboard.js           /api/leaderboard          — unchanged legacy contract (arena text board)
  warroom.js               /api/warroom/:domain      — llms · media · providers · coding · speech · history · status
  snapshot.js              scheduled (every 6 h)     — stores the daily history snapshot
  lib/
    arena.js               arena.ai RSC-flight parser (text, vision, search, image, video boards)
    cache.js               Netlify Blobs + in-memory cache, TTL, stale-but-valid fallback
    merge.js               cross-source merging + precedence rules (pure, tested)
    domains.js             per-domain loaders, history, status
    http.js                fetch with timeout, bounded concurrency
  adapters/
    openrouter.js          public /models + /models/:id/endpoints
    artificialanalysis.js  official Data API, key-gated (ARTIFICIAL_ANALYSIS_API_KEY)
    swebench.js            swebench.com leaderboard-data JSON
    openasr.js             Hugging Face Open ASR Leaderboard CSV
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
| arena.ai | public leaderboard pages (flight payload), 6 h cache | ELO, CI, votes, org, licence, listed prices, context; image / video boards with $/image, $/s |
| OpenRouter | public API, 3–6 h cache | in/out/cache pricing, context, max output, modalities, reasoning/tool support, release date, per-provider endpoints (price, ctx, quantisation, uptime), relayed AA indexes and Design Arena ELOs |
| SWE-bench | official page's `leaderboard-data` JSON, 12 h | agent × model, resolved %, $/task, calls/task |
| Open ASR Leaderboard | public HF dataset CSV, 24 h | WER (avg + per dataset), RTFx, licence, params |
| Artificial Analysis | official Data API with `ARTIFICIAL_ANALYSIS_API_KEY` (LLM board only, 12 h cache = at most 2 calls a day; a failed call is not retried for 12 h), else the published leaderboard pages (adapters/aaweb.js, RSC flight payload like arena.ai, 6 h cache; `AA_WEB=0` disables) | speed, TTFT, E2E, per-benchmark scores, media generation times, TTS / STT / S2S |

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
npm run deploy-prep   build, copy dist → ../NETLIFY-AIWAR, sync functions + shared → repo root
```

Deploy = `npm run deploy-prep`, then commit and push `main` (Netlify builds from
the GitHub repo; the local Netlify CLI is not authenticated).
