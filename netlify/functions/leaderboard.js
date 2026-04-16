// Netlify Function — fetches live leaderboard data from arena.ai
// Called by the frontend every 30 minutes, bypasses CORS

export default async (req, context) => {
  try {
    const res  = await fetch('https://arena.ai/leaderboard/text', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIWarRoom/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) throw new Error(`arena.ai returned ${res.status}`);

    const html = await res.text();

    // Next.js embeds page data in __NEXT_DATA__ script tag
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) throw new Error('__NEXT_DATA__ not found');

    const nextData  = JSON.parse(match[1]);

    // Navigate to the model array — path may vary, try common paths
    const pageProps = nextData?.props?.pageProps ?? {};
    const models =
      pageProps.models       ??
      pageProps.leaderboard  ??
      pageProps.rankings     ??
      pageProps.data         ??
      null;

    if (!Array.isArray(models)) throw new Error('Model array not found in __NEXT_DATA__');

    // Normalise to our format
    const fmt = (n) => {
      if (n == null) return null;
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
      if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
      return String(n);
    };

    const clean = models.map((m, i) => ({
      rank:        m.rank        ?? i + 1,
      slug:        (m.modelDisplayName ?? m.slug ?? m.id ?? '').toLowerCase().replace(/\s+/g, '-'),
      name:        m.modelDisplayName ?? m.name ?? m.slug ?? '',
      org:         m.modelOrganization ?? m.org ?? 'Unknown',
      license:     m.license    ?? 'Proprietary',
      elo:         Math.round(m.rating ?? m.elo ?? 1200),
      ci:          m.ratingUpper && m.ratingLower
                     ? Math.round((m.ratingUpper - m.ratingLower) / 2)
                     : null,
      votes:       m.votes      ?? 0,
      priceIn:     m.inputPricePerMillion  ?? null,
      priceOut:    m.outputPricePerMillion ?? null,
      context:     m.contextLength ? fmt(m.contextLength) : null,
    }));

    return new Response(JSON.stringify({ models: clean, fetchedAt: new Date().toISOString() }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800', // cache 30 min
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};

export const config = { path: '/api/leaderboard' };
