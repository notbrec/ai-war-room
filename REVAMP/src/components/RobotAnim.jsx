import { useDark } from '../hooks/useTheme.js';
import brawlRW from '../assets/robots/brawl_rw.png';
import brawlRD from '../assets/robots/brawl_rd.png';
import classicRed from '../assets/robots/classic_red.png';
import classicRW  from '../assets/robots/classic_rw.png';
import classicRD  from '../assets/robots/classic_rd.png';
import earedRed   from '../assets/robots/eared_red.png';
import earedRW    from '../assets/robots/eared_rw.png';
import earedRD    from '../assets/robots/eared_rd.png';

/* ─────────────────────────────────────────────────────────────────────────
   Animated robot art (the real moving pixel art), recoloured. The "white"
   challenger would vanish on a light surface, so neutral robots serve a dark
   variant in light mode. Transparent background, pixel-perfect scaling.
   ────────────────────────────────────────────────────────────────────── */

/* <RobotAnim kind="brawl"/> — the two combatants clashing (red vs white). */
const FIGHT = { brawl: { dark: brawlRW, light: brawlRD } };

export function RobotAnim({ kind = 'brawl', width, alt = '', style, ...rest }) {
  const dark = useDark();
  const src = FIGHT[kind][dark ? 'dark' : 'light'];
  return (
    <img src={src} alt={alt}
      style={{ width, height: 'auto', display: 'block', imageRendering: 'pixelated', ...style }}
      {...rest} />
  );
}

/* <RobotSingle robot="classic|eared" tone="red|neutral"/> — one robot.
   tone="red" works on any background; tone="neutral" is white in dark mode
   and ink in light mode so it always reads. */
const SINGLE = {
  classic: { red: classicRed, neutralDark: classicRW, neutralLight: classicRD },
  eared:   { red: earedRed,   neutralDark: earedRW,   neutralLight: earedRD   },
};

export function RobotSingle({ robot = 'classic', tone = 'neutral', width, alt = '', style, ...rest }) {
  const dark = useDark();
  const set = SINGLE[robot] ?? SINGLE.classic;
  const src = tone === 'red' ? set.red : (dark ? set.neutralDark : set.neutralLight);
  return (
    <img src={src} alt={alt}
      style={{ width, height: 'auto', display: 'block', imageRendering: 'pixelated', ...style }}
      {...rest} />
  );
}

export default RobotAnim;
