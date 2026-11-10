// Regenerate the first-paint snapshot in src/models-data.js (RAW_FALLBACK) from
// the live sources, so the board shown while /api/leaderboard loads is today's
// and never an old one. Runs the same loaders as the Netlify functions.
//
//   node scripts/refresh-fallback.mjs [count=66]
//
// deploy-prep runs it before every build; if a source is down the previous
// snapshot is kept untouched.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadLLMs } from '../netlify/functions/lib/domains.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../src/models-data.js');
const count = Number(process.argv[2]) || 66;

const llms = await loadLLMs();
if (!llms.ok || llms.stale) throw new Error(`arena board not live (${llms.error ?? 'stale'}) — snapshot left as is`);
const top = llms.models.filter(m => m.arena).sort((a, b) => a.arena.rank - b.arena.rank).slice(0, count);
if (top.length < count) throw new Error(`only ${top.length} arena models`);

const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const n = v => (v == null ? 'null' : String(+(+v).toFixed(4)));
const rows = top.map(m => `  [${[q(m.slug), q(m.name), q(m.org), m.arena.elo, m.arena.votes, q(m.license ?? 'Proprietary'), n(m.priceIn), n(m.priceOut), n(m.context)].join(', ')}],`);
const date = llms.published ?? new Date().toISOString().slice(0, 10);

const src = fs.readFileSync(file, 'utf8');
const start = src.indexOf('// ── Fallback:');
const end = src.indexOf('];', src.indexOf('const RAW_FALLBACK = ['));
if (start < 0 || end < 0) throw new Error('RAW_FALLBACK block not found');
const block = `// ── Fallback: real arena snapshot (top ${count}, published ${date}) ─────────────
// [slug, name, org, elo, votes, license, priceIn, priceOut, contextTokens]
// Written by scripts/refresh-fallback.mjs from the same merged data the site
// serves. It is only shown while the live fetch is in flight, so it carries no
// estimated or hand-added rows — regenerate it, never edit entries by hand.
const RAW_FALLBACK = [
${rows.join('\n')}
`;
fs.writeFileSync(file, src.slice(0, start) + block + src.slice(end));
console.log(`fallback snapshot: ${top.length} models, published ${date}, #1 ${top[0].name}`);
