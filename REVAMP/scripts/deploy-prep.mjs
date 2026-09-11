// Prepare the repo root for a Netlify deploy:
//   1. vite build (REVAMP/dist)
//   2. copy dist → ../NETLIFY-AIWAR   (the folder the root netlify.toml publishes)
//   3. copy netlify/functions + shared → ../netlify/functions, ../shared
//      (the root netlify.toml bundles functions from the ROOT, not from REVAMP)
// Deploy = commit + push main (see memory: Netlify CLI is not authenticated).
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const revamp = path.resolve(here, '..');
const root = path.resolve(revamp, '..');

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function copyDir(src, dst) { fs.mkdirSync(dst, { recursive: true }); fs.cpSync(src, dst, { recursive: true }); }

console.log('› building');
execSync('npx vite build', { cwd: revamp, stdio: 'inherit' });

const publish = path.join(root, 'NETLIFY-AIWAR');
console.log('› publishing dist →', publish);
rmrf(publish); copyDir(path.join(revamp, 'dist'), publish);

const fnSrc = path.join(revamp, 'netlify', 'functions');
const fnDst = path.join(root, 'netlify', 'functions');
console.log('› functions →', fnDst);
rmrf(fnDst); copyDir(fnSrc, fnDst);

const shSrc = path.join(revamp, 'shared');
const shDst = path.join(root, 'shared');
console.log('› shared →', shDst);
rmrf(shDst); copyDir(shSrc, shDst);

const toml = `# Serve the REVAMP build. The frontend is prebuilt and committed in
# NETLIFY-AIWAR/ (run \`npm run deploy-prep\` inside REVAMP/), so there is no
# frontend build step here — Netlify just publishes that folder. The Netlify
# Functions (/api/leaderboard, /api/warroom/:domain and the scheduled history
# snapshot) are bundled from netlify/functions, which deploy-prep syncs from
# REVAMP/netlify/functions together with the shared/ modules they import.
[build]
  command   = "echo 'Serving prebuilt REVAMP (NETLIFY-AIWAR)'"
  publish   = "NETLIFY-AIWAR"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"

[functions]
  node_bundler = "esbuild"

[dev]
  command    = "npm run dev"
  targetPort = 5173
  port       = 8888
  framework  = "vite"
`;
fs.writeFileSync(path.join(root, 'netlify.toml'), toml);
console.log('› root netlify.toml written');
console.log('done — review `git status` at the repo root, then commit and push main to deploy.');
