// Smoke-test the API domain loaders directly in Node: `node scripts/smoke.mjs llms media`
import { DOMAINS } from '../netlify/functions/lib/domains.js';
const which = process.argv.slice(2);
for (const d of which.length ? which : ['status', 'llms']) {
  const t0 = Date.now();
  try {
    const out = await DOMAINS[d]();
    console.log(`=== ${d} ${Date.now() - t0}ms`, JSON.stringify({ ok: out.ok, stale: out.stale, sources: out.sources, counts: out.counts, capabilities: out.capabilities }));
    if (d === 'llms') {
      const m = out.models;
      console.log('first 3:', JSON.stringify(m.slice(0, 3).map(x => ({ id: x.id, name: x.name, org: x.org, elo: x.arena?.elo, price: [x.priceIn, x.priceOut], src: x.priceSource, ctx: x.contextLabel, intel: x.aa?.intelligence, or: x.or?.id, rl: x.reasoningLevel, fam: x.family, v: x.variant }))));
      console.log('matched OR:', m.filter(x => x.or).length, '/ arena', m.filter(x => x.inArena).length, '| intel', m.filter(x => x.aa?.intelligence != null).length, '| non-arena', m.filter(x => !x.inArena).length);
      console.log('unmatched arena top-40:', m.filter(x => x.inArena && !x.or).slice(0, 40).map(x => x.slug).join(', '));
      console.log('matched pairs:\n  ' + m.filter(x => x.inArena && x.or).slice(0, 30).map(x => x.slug + ' -> ' + x.or.id).join('\n  '));
    }
    if (d === 'media') for (const [b, rows] of Object.entries(out.boards)) console.log(b, rows.length, JSON.stringify(rows[0]));
    if (d === 'coding') { console.log(Object.keys(out.boards).map(b => `${b}:${out.boards[b].length}`).join(' '), 'indexes', out.indexes.length); console.log(JSON.stringify(out.boards.Verified?.[0])); }
    if (d === 'speech') console.log('stt', out.stt.length, JSON.stringify(out.stt[0]));
    if (d === 'providers') { console.log('models', out.models.length, 'providers', out.providers.length); console.log(JSON.stringify(out.models[0]).slice(0, 700)); }
  } catch (e) { console.error(d, 'FAILED', e); }
}
