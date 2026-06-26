import { useDark } from '../hooks/useTheme.js';
import brawlRW from '../assets/robots/brawl_rw.png';
import brawlRD from '../assets/robots/brawl_rd.png';
import twoRW  from '../assets/robots/two_rw.png';
import twoRD  from '../assets/robots/two_rd.png';

/* ─────────────────────────────────────────────────────────────────────────
   <RobotAnim/> — the real animated robots (the moving GIF art), recoloured:
   champion in red, challenger in white. The "white" robot would vanish on a
   light surface, so we serve a dark-robot variant in light mode. Transparent
   background, pixel-perfect scaling.
     kind="brawl"  → the two combatants clashing (red vs white)
     kind="two"    → the idle pair (red classic + white eared)
   ────────────────────────────────────────────────────────────────────── */
const SRC = {
  brawl: { dark: brawlRW, light: brawlRD },
  two:   { dark: twoRW,   light: twoRD   },
};

export function RobotAnim({ kind = 'brawl', width, alt = '', style, ...rest }) {
  const dark = useDark();
  const src = SRC[kind][dark ? 'dark' : 'light'];
  return (
    <img
      src={src}
      alt={alt}
      style={{ width, height: 'auto', display: 'block', imageRendering: 'pixelated', ...style }}
      {...rest}
    />
  );
}

export default RobotAnim;
