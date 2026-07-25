import { useEffect, useRef, useState } from 'react';
import { useDark } from '../hooks/useTheme.js';
import clashDarkMp4     from '../assets/robots/fight_clash_dark.mp4';
import clashDarkPoster  from '../assets/robots/fight_clash_dark.webp';
import clashLightMp4    from '../assets/robots/fight_clash_light.mp4';
import clashLightPoster from '../assets/robots/fight_clash_light.webp';
import jabDarkMp4       from '../assets/robots/fight_jab_dark.mp4';
import jabDarkPoster    from '../assets/robots/fight_jab_dark.webp';
import jabLightMp4      from '../assets/robots/fight_jab_light.mp4';
import jabLightPoster   from '../assets/robots/fight_jab_light.webp';

/* ─────────────────────────────────────────────────────────────────────────
   <FightArena/> — the combatants, rendered rather than pixelled.

   Two exchanges, each cut into a seamless loop:
     clash — the full trade, debris and all. The intro moment.
     jab   — a calmer bob-and-jab. Sits beside the leaderboard all day
             without pulling the eye off the numbers.

   Each ships in two gradings, because one clip cannot serve both themes:

     dark  — white challenger on pure black, screened over a black surface.
             Black is the identity for screen, so the clip's background
             becomes the surface exactly and the fighters float on the page.
     light — charcoal challenger on pure white, multiplied over a white
             surface. White is the identity for multiply, so the same trick
             runs in reverse. (A white robot would vanish on white, hence the
             repaint — the same call the pixel art makes in RobotAnim.)

   Either way the clip has no visible rectangle: it dissolves into whatever
   surface it is given, as long as that surface matches the theme.

   The poster paints on the first frame and the video crossfades over it once
   it can play, so the slot is never empty and never jumps.
   ────────────────────────────────────────────────────────────────────── */

const CLIPS = {
  clash: {
    dark:  { src: clashDarkMp4,  poster: clashDarkPoster  },
    light: { src: clashLightMp4, poster: clashLightPoster },
  },
  jab: {
    dark:  { src: jabDarkMp4,  poster: jabDarkPoster  },
    light: { src: jabLightMp4, poster: jabLightPoster },
  },
};

export default function FightArena({
  clip = 'jab',
  alt = 'Two robots fighting',
  /* the clips are 16:9; anything tighter crops the empty headroom away
     rather than shrinking the fighters */
  aspect = '16 / 9',
  radius = 2,
  border = true,
  /* defaults to the page background of the active theme, so the arena reads
     as part of the page; pass a card colour to inset it into a card instead */
  surface,
  style,
  ...rest
}) {
  const dark = useDark();
  const theme = dark ? 'dark' : 'light';
  const { src, poster } = (CLIPS[clip] ?? CLIPS.jab)[theme];
  const blend = dark ? 'screen' : 'multiply';
  const bg = surface ?? (dark ? '#07070a' : '#ffffff');

  const [ready, setReady] = useState(false);
  const videoRef = useRef(null);

  /* Media events don't bubble and a cached clip can be ready before React
     ever attaches a handler, so bind natively and check readyState in the
     same breath — otherwise the reveal silently never fires and the poster
     sits there looking like a broken video.

     Autoplay is a promise and browsers reject it freely (battery saver, a
     backgrounded tab). A rejection just means we keep showing the poster.

     Re-runs on theme change: that swaps the source, which resets the element
     back to readyState 0. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const reveal = () => setReady(true);
    /* hand the slot back to the poster while the new grading loads, or the
       old clip's reveal would leave an empty box uncovered */
    setReady(v.readyState >= 3);
    v.addEventListener('canplay', reveal);
    v.addEventListener('playing', reveal);
    v.play?.().catch(() => {});
    return () => {
      v.removeEventListener('canplay', reveal);
      v.removeEventListener('playing', reveal);
    };
  }, [src]);

  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: aspect,
        width: '100%',
        overflow: 'hidden',
        borderRadius: radius,
        background: bg,
        border: border ? '0.5px solid var(--sep)' : 'none',
        /* keeps the blend inside this box instead of reaching through to
           whatever card or page background sits behind it */
        isolation: 'isolate',
        ...style,
      }}
      {...rest}
    >
      {/* Both layers blend, so the poster has to get out of the way rather
          than sit underneath — two blended stills stacked read as a double
          exposure, not as a fallback. */}
      <img
        src={poster}
        alt={alt}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          mixBlendMode: blend,
          opacity: ready ? 0 : 1,
          transition: 'opacity 500ms ease',
        }}
      />
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          mixBlendMode: blend,
          opacity: ready ? 1 : 0,
          transition: 'opacity 500ms ease',
        }}
      />
    </div>
  );
}
