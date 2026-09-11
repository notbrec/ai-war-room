// Fetch the GenAI-Bench battle archive (CC-BY-4.0) into public/replays.json.
// Run by deploy-prep; the datasets-server is too slow to call from a
// function on every request, and the media URLs only need refreshing when
// the site is redeployed.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchGenAIBench } from '../netlify/functions/adapters/genaibench.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '..', 'public', 'replays.json');
const t0 = Date.now();
try {
  const data = await fetchGenAIBench({ limit: +(process.env.REPLAY_LIMIT ?? 300) });
  const counts = Object.fromEntries(Object.entries(data.boards).map(([b, a]) => [b, a.length]));
  fs.writeFileSync(out, JSON.stringify({ ...data, counts }));
  console.log(`replays.json: ${JSON.stringify(counts)} in ${Date.now() - t0}ms (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
} catch (e) {
  if (fs.existsSync(out)) console.warn('replays fetch failed, keeping previous file:', e.message);
  else { console.error('replays fetch failed and no previous file exists:', e.message); process.exit(1); }
}
