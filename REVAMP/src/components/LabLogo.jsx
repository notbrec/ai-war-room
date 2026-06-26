import { ORG_CONFIG } from '../models-data.js';

/* ─────────────────────────────────────────────────────────────────────────
   <LabLogo/> — real brand marks for each AI lab.

   Monochrome SVGs (vendored locally from simple-icons, CC0) tinted with the
   lab's brand colour via currentColor. Labs without an available mark fall
   back to a sharp monogram chip in the brand colour. No external requests,
   nothing uploaded.
   ────────────────────────────────────────────────────────────────────── */

// Eager-import every vendored logo as a raw SVG string.
const RAW = import.meta.glob('../assets/logos/*.svg', { query: '?raw', import: 'default', eager: true });
const LOGOS = {};
for (const path in RAW) {
  const key = path.split('/').pop().replace('.svg', '');
  LOGOS[key] = RAW[path];
}

// Lab display name → vendored logo key
const KEYMAP = {
  'Anthropic': 'anthropic',
  'OpenAI':    'openai',
  'Google':    'google',
  'Meta':      'meta',
  'xAI':       'xai',
  'Mistral':   'mistral',
  'DeepSeek':  'deepseek',
  'Alibaba':   'alibaba',
  'Xiaomi':    'xiaomi',
  'Amazon':    'amazon',
  'Baidu':     'baidu',
  'Microsoft': 'microsoft',
};

function resolveTint(org, override) {
  if (override) return override;
  const c = ORG_CONFIG[org]?.color;
  if (!c) return 'var(--text)';
  // pure-white brand marks would vanish on light backgrounds → use text colour
  const lc = c.toLowerCase();
  if (lc === '#ffffff' || lc === '#fff') return 'var(--text)';
  return c;
}

export function LabLogo({ org, size = 16, color, mono = false, style }) {
  const tint = mono ? (color || 'currentColor') : resolveTint(org, color);
  const key = KEYMAP[org];
  const svg = key && LOGOS[key];

  if (svg) {
    return (
      <span
        className="aiwar-lab-logo"
        aria-label={org}
        style={{
          width: size, height: size, color: tint,
          display: 'inline-flex', flexShrink: 0, ...style,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // monogram fallback — sharp chip outlined in the brand colour
  const letter = (org || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 1).toUpperCase() || '#';
  return (
    <span
      aria-label={org}
      style={{
        width: size, height: size, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${tint}`, color: tint,
        fontSize: Math.round(size * 0.6), fontWeight: 800,
        fontFamily: "'SF Mono','JetBrains Mono',ui-monospace,monospace",
        lineHeight: 1, ...style,
      }}
    >
      {letter}
    </span>
  );
}

export default LabLogo;
