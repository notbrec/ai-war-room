import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Serve the Netlify functions from `vite dev` so the local site hits the
 *  same /api/* contracts it does in production. Each function declares its
 *  route in `export const config = { path }`; `:param` segments are matched
 *  and passed as `context.params`. Netlify Blobs are unavailable here, which
 *  the functions tolerate with an in-memory cache. */
const FUNCTIONS = [
  { file: '/netlify/functions/leaderboard.js', path: '/api/leaderboard' },
  { file: '/netlify/functions/warroom.js',     path: '/api/warroom/:domain' },
];

function toRegex(pattern) {
  const names = [];
  const re = pattern.replace(/\//g, '\\/').replace(/:([a-zA-Z]+)/g, (_, n) => { names.push(n); return '([^\\/]+)'; });
  return { re: new RegExp(`^${re}\\/?$`), names };
}

function netlifyDevApi() {
  return {
    name: 'aiwar-netlify-dev-api',
    apply: 'serve',
    configureServer(server) {
      const routes = FUNCTIONS.map(f => ({ ...f, ...toRegex(f.path) }));
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://local');
        const route = routes.find(r => r.re.test(url.pathname));
        if (!route) return next();
        const m = url.pathname.match(route.re);
        const params = Object.fromEntries(route.names.map((n, i) => [n, m[i + 1]]));
        try {
          const mod = await server.ssrLoadModule(route.file);
          const result = await mod.default(new Request(`http://local${req.url}`), { params });
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
  plugins: [react(), netlifyDevApi()],
  build: {
    rollupOptions: {
      output: {
        // Keep the shell small: the command-center pages and the chart layer
        // load on demand.
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
