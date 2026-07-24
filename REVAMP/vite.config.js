import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Serve the Netlify leaderboard function from `vite dev` so the local site
 *  hits the same /api/leaderboard contract it does in production. Netlify
 *  Blobs are unavailable here, which the function already tolerates by
 *  fetching arena.ai on every request. */
function leaderboardDevApi() {
  return {
    name: 'aiwar-leaderboard-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/leaderboard', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/netlify/functions/leaderboard.js');
          const result = await mod.default(new Request('http://local/api/leaderboard'), {});
          res.statusCode = result.status;
          result.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(await result.text());
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), leaderboardDevApi()],
});
