/* ─────────────────────────────────────────────────────────────────────────
   Robot.jsx — the AI WAR ROOM mascots.

   Pixel-art robots rendered as inline SVG with transparent backgrounds and
   fully themeable fills (default: currentColor, so they pick up the
   surrounding text/accent colour). No baked-in colours, no gradients.

   Three primitives:
     • <RobotFighters/>  the two combatants clashing — the signature motif
     • <RobotMascot/>    a single idle robot ("classic" | "eared")
   ────────────────────────────────────────────────────────────────────── */

/* One shared <style> block, injected once, scoped by the `aw-rb-` prefix so
   multiple robots on a page never fight over keyframe names. */
function RobotStyles() {
  return (
    <style>{`
      /* fighters */
      @keyframes aw-rb-shk{0%,17%{transform:translate(0,0)}19%{transform:translate(.5px,-.4px)}21%{transform:translate(-.5px,.4px)}23%,58%{transform:translate(0,0)}61%{transform:translate(-.6px,.4px)}63%{transform:translate(.6px,-.4px)}65%,100%{transform:translate(0,0)}}
      @keyframes aw-rb-flb{from{transform:translateY(0)}to{transform:translateY(-.5px)}}
      @keyframes aw-rb-frb{from{transform:translateY(0)}to{transform:translateY(-.5px)}}
      @keyframes aw-rb-fll{0%,8%{transform:translateX(0)}18%{transform:translateX(3px)}24%{transform:translateX(2.6px)}32%{transform:translateX(0)}60%{transform:translateX(-1.4px)}70%,100%{transform:translateX(0)}}
      @keyframes aw-rb-frl{0%{transform:translateX(0)}20%{transform:translateX(1.4px)}30%,40%{transform:translateX(0)}60%{transform:translateX(-3px)}66%{transform:translateX(-2.6px)}74%,100%{transform:translateX(0)}}
      @keyframes aw-rb-flf{0%,10%{transform:translate(0,0)}18%{transform:translate(2.5px,1px)}24%{transform:translate(2.2px,1px)}30%,100%{transform:translate(0,0)}}
      @keyframes aw-rb-frf{0%,42%{transform:translate(0,0)}60%{transform:translate(-2.5px,1px)}66%{transform:translate(-2.2px,1px)}72%,100%{transform:translate(0,0)}}
      @keyframes aw-rb-spk{0%,16%{opacity:0;transform:scale(.3)}19%{opacity:1;transform:scale(1.15)}24%{opacity:0;transform:scale(1.4)}58%{opacity:0;transform:scale(.3)}61%{opacity:1;transform:scale(1.15)}66%{opacity:0;transform:scale(1.4)}100%{opacity:0}}
      @keyframes aw-rb-vsg{0%,100%{transform:scale(1)}50%{transform:scale(1.16)}}
      .aw-rb-scn{animation:aw-rb-shk 2.4s linear infinite}
      .aw-rb-flB{animation:aw-rb-flb .9s ease-in-out infinite alternate}
      .aw-rb-frB{animation:aw-rb-frb 1.05s ease-in-out infinite alternate}
      .aw-rb-flL{animation:aw-rb-fll 2.4s ease-in-out infinite}
      .aw-rb-frL{animation:aw-rb-frl 2.4s ease-in-out infinite}
      .aw-rb-flF{animation:aw-rb-flf 2.4s ease-in-out infinite}
      .aw-rb-frF{animation:aw-rb-frf 2.4s ease-in-out infinite}
      .aw-rb-spk{transform-box:fill-box;transform-origin:center;opacity:0;animation:aw-rb-spk 2.4s linear infinite}
      .aw-rb-vsg{transform-box:fill-box;transform-origin:center;animation:aw-rb-vsg .66s ease-in-out infinite}

      /* classic */
      @keyframes aw-rb-r1b{from{transform:translateY(0)}to{transform:translateY(-.5px)}}
      @keyframes aw-rb-r1a{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}
      @keyframes aw-rb-r1k{0%,90%{opacity:0}93%{opacity:1}96%,100%{opacity:0}}
      .aw-rb-r1b{animation:aw-rb-r1b 1.6s ease-in-out infinite alternate}
      .aw-rb-r1a{transform-box:fill-box;transform-origin:center bottom;animation:aw-rb-r1a 1.3s ease-in-out infinite alternate}
      .aw-rb-r1k{opacity:0;animation:aw-rb-r1k 3.4s ease-in-out infinite}

      /* eared */
      @keyframes aw-rb-r2b{from{transform:translateY(0)}to{transform:translateY(-.5px)}}
      @keyframes aw-rb-r2l{from{transform:rotate(7deg)}to{transform:rotate(-4deg)}}
      @keyframes aw-rb-r2r{from{transform:rotate(-7deg)}to{transform:rotate(4deg)}}
      @keyframes aw-rb-r2k{0%,91%{opacity:0}94%{opacity:1}97%,100%{opacity:0}}
      .aw-rb-r2b{animation:aw-rb-r2b 1.5s ease-in-out infinite alternate}
      .aw-rb-r2l{transform-box:fill-box;transform-origin:center bottom;animation:aw-rb-r2l 1.1s ease-in-out infinite alternate}
      .aw-rb-r2r{transform-box:fill-box;transform-origin:center bottom;animation:aw-rb-r2r 1.25s ease-in-out infinite alternate}
      .aw-rb-r2k{opacity:0;animation:aw-rb-r2k 3.8s ease-in-out infinite}

      /* fight choreography — classic (left) vs eared (right) */
      @keyframes aw-rf-lungeL{0%,24%{transform:translateX(0)}44%{transform:translateX(4px)}64%,100%{transform:translateX(0)}}
      @keyframes aw-rf-lungeR{0%,24%{transform:translateX(0)}44%{transform:translateX(-4px)}64%,100%{transform:translateX(0)}}
      @keyframes aw-rf-spk{0%,34%{opacity:0;transform:scale(.3)}44%{opacity:1;transform:scale(1.25)}56%{opacity:0;transform:scale(1.5)}100%{opacity:0}}
      @keyframes aw-rf-vs{0%,28%{transform:scale(1)}44%{transform:scale(1.22)}62%,100%{transform:scale(1)}}
      .aw-rf-lungeL{transform-box:fill-box;animation:aw-rf-lungeL 2s ease-in-out infinite}
      .aw-rf-lungeR{transform-box:fill-box;animation:aw-rf-lungeR 2s ease-in-out infinite}
      .aw-rf-spk{transform-box:fill-box;transform-origin:center;opacity:0;animation:aw-rf-spk 2s linear infinite}
      .aw-rf-vs{transform-box:fill-box;transform-origin:center;animation:aw-rf-vs 2s ease-in-out infinite}

      @media (prefers-reduced-motion: reduce){
        .aw-rb-scn,.aw-rb-flB,.aw-rb-frB,.aw-rb-flL,.aw-rb-frL,.aw-rb-flF,.aw-rb-frF,
        .aw-rb-vsg,.aw-rb-r1b,.aw-rb-r1a,.aw-rb-r2b,.aw-rb-r2l,.aw-rb-r2r,
        .aw-rf-lungeL,.aw-rf-lungeR,.aw-rf-vs{animation:none}
      }
    `}</style>
  );
}

let _stylesMounted = false;
function useRobotStyles() {
  // Render the style block once per mount tree; cheap idempotent guard.
  if (!_stylesMounted) { _stylesMounted = true; }
  return null;
}

/* ── The two combatants, clashing. Transparent, fully recolourable. ──────────
   Classic robot (left) vs eared robot (right) — the exact cast of the fight.
   Each robot bobs + lunges toward the centre; on the clash a spark fires and
   the VS glyph pulses. leftColor / rightColor / sparkColor are independent so
   you can run e.g. a red champion vs a white (var(--text)) challenger. ───── */
export function RobotFighters({
  width = 240,
  leftColor = 'var(--accent)',
  rightColor = 'var(--text)',
  sparkColor = 'var(--accent)',
  style,
  className = '',
  ...rest
}) {
  useRobotStyles();
  return (
    <svg
      viewBox="0 0 64 32"
      shapeRendering="crispEdges" aria-hidden
      className={className}
      style={{ display: 'block', width, height: 'auto', overflow: 'visible', ...style }}
      {...rest}
    >
      <RobotStyles />

      {/* LEFT — classic */}
      <g transform="translate(2,5)">
        <g className="aw-rf-lungeL">
          <g transform="translate(4,4)" fill={leftColor}>
            <g className="aw-rb-r1b">
              <g className="aw-rb-r1a"><rect x="9" y="0" width="2" height="3"/></g>
              <g><rect x="4" y="4" width="12" height="2"/><rect x="3" y="5" width="1" height="5"/><rect x="16" y="5" width="1" height="5"/><rect x="4" y="6" width="2" height="5"/><rect x="8" y="6" width="4" height="5"/><rect x="14" y="6" width="2" height="5"/><rect x="6" y="8" width="2" height="3"/><rect x="12" y="8" width="2" height="3"/><rect x="0" y="12" width="3" height="1"/><rect x="5" y="12" width="10" height="2"/><rect x="17" y="12" width="3" height="1"/><rect x="0" y="13" width="1" height="3"/><rect x="2" y="13" width="3" height="2"/><rect x="15" y="13" width="3" height="2"/><rect x="19" y="13" width="1" height="3"/><rect x="5" y="14" width="2" height="4"/><rect x="8" y="14" width="1" height="4"/><rect x="10" y="14" width="1" height="4"/><rect x="12" y="14" width="3" height="4"/><rect x="1" y="15" width="2" height="1"/><rect x="7" y="15" width="1" height="5"/><rect x="9" y="15" width="1" height="3"/><rect x="11" y="15" width="1" height="3"/><rect x="17" y="15" width="2" height="1"/><rect x="6" y="18" width="1" height="2"/><rect x="12" y="18" width="2" height="2"/><rect x="5" y="19" width="1" height="1"/><rect x="14" y="19" width="1" height="1"/></g>
              <g className="aw-rb-r1k"><rect x="6" y="6" width="2" height="2"/><rect x="12" y="6" width="2" height="2"/></g>
            </g>
          </g>
        </g>
      </g>

      {/* RIGHT — eared */}
      <g transform="translate(41,6)">
        <g className="aw-rf-lungeR">
          <g transform="translate(3,5)" fill={rightColor}>
            <g className="aw-rb-r2b">
              <g className="aw-rb-r2l"><rect x="5" y="0" width="2" height="3"/></g>
              <g className="aw-rb-r2r"><rect x="13" y="0" width="2" height="3"/></g>
              <g><rect x="4" y="3" width="12" height="3"/><rect x="3" y="4" width="1" height="9"/><rect x="16" y="4" width="1" height="9"/><rect x="4" y="6" width="2" height="8"/><rect x="8" y="6" width="4" height="4"/><rect x="14" y="6" width="2" height="8"/><rect x="6" y="8" width="2" height="8"/><rect x="12" y="8" width="2" height="8"/><rect x="0" y="9" width="2" height="3"/><rect x="18" y="9" width="2" height="3"/><rect x="2" y="10" width="1" height="1"/><rect x="17" y="10" width="1" height="1"/><rect x="8" y="11" width="4" height="3"/><rect x="5" y="15" width="1" height="1"/><rect x="14" y="15" width="1" height="1"/></g>
              <g className="aw-rb-r2k"><rect x="6" y="6" width="2" height="2"/><rect x="12" y="6" width="2" height="2"/></g>
            </g>
          </g>
        </g>
      </g>

      {/* VS glyph */}
      <g transform="translate(28,13)">
        <g className="aw-rf-vs" fill={sparkColor}><rect x="0" y="0" width="1" height="3"/><rect x="4" y="0" width="1" height="3"/><rect x="6" y="0" width="3" height="1"/><rect x="6" y="1" width="1" height="2"/><rect x="7" y="2" width="2" height="1"/><rect x="1" y="3" width="1" height="1"/><rect x="3" y="3" width="1" height="1"/><rect x="8" y="3" width="1" height="2"/><rect x="2" y="4" width="1" height="1"/><rect x="6" y="4" width="2" height="1"/></g>
      </g>

      {/* Impact spark */}
      <g transform="translate(32,14)">
        <g className="aw-rf-spk" fill={sparkColor}><rect x="-0.5" y="-3" width="1" height="6"/><rect x="-3" y="-0.5" width="6" height="1"/><rect x="1.6" y="1.6" width="1" height="1"/><rect x="-2.6" y="1.6" width="1" height="1"/><rect x="1.6" y="-2.6" width="1" height="1"/><rect x="-2.6" y="-2.6" width="1" height="1"/><rect x="-0.5" y="-4.6" width="1" height="1"/><rect x="-0.5" y="3.6" width="1" height="1"/><rect x="-4.6" y="-0.5" width="1" height="1"/><rect x="3.6" y="-0.5" width="1" height="1"/></g>
      </g>
    </svg>
  );
}

/* ── A single idle robot. ────────────────────────────────────────────────── */
export function RobotMascot({
  variant = 'classic',
  size = 64,
  color = 'currentColor',
  blink = true,
  style,
  className = '',
  ...rest
}) {
  useRobotStyles();
  if (variant === 'eared') {
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" shapeRendering="crispEdges"
        aria-hidden className={className} style={{ display: 'block', overflow: 'visible', ...style }} {...rest}>
        <RobotStyles />
        <g transform="translate(3,5)" fill={color}>
          <g className="aw-rb-r2b">
            <g className="aw-rb-r2l"><rect x="5" y="0" width="2" height="3"/></g>
            <g className="aw-rb-r2r"><rect x="13" y="0" width="2" height="3"/></g>
            <g><rect x="4" y="3" width="12" height="3"/><rect x="3" y="4" width="1" height="9"/><rect x="16" y="4" width="1" height="9"/><rect x="4" y="6" width="2" height="8"/><rect x="8" y="6" width="4" height="4"/><rect x="14" y="6" width="2" height="8"/><rect x="6" y="8" width="2" height="8"/><rect x="12" y="8" width="2" height="8"/><rect x="0" y="9" width="2" height="3"/><rect x="18" y="9" width="2" height="3"/><rect x="2" y="10" width="1" height="1"/><rect x="17" y="10" width="1" height="1"/><rect x="8" y="11" width="4" height="3"/><rect x="5" y="15" width="1" height="1"/><rect x="14" y="15" width="1" height="1"/></g>
            {blink && <g className="aw-rb-r2k"><rect x="6" y="6" width="2" height="2"/><rect x="12" y="6" width="2" height="2"/></g>}
          </g>
        </g>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" shapeRendering="crispEdges"
      aria-hidden className={className} style={{ display: 'block', overflow: 'visible', ...style }} {...rest}>
      <RobotStyles />
      <g transform="translate(4,4)" fill={color}>
        <g className="aw-rb-r1b">
          <g className="aw-rb-r1a"><rect x="9" y="0" width="2" height="3"/></g>
          <g><rect x="4" y="4" width="12" height="2"/><rect x="3" y="5" width="1" height="5"/><rect x="16" y="5" width="1" height="5"/><rect x="4" y="6" width="2" height="5"/><rect x="8" y="6" width="4" height="5"/><rect x="14" y="6" width="2" height="5"/><rect x="6" y="8" width="2" height="3"/><rect x="12" y="8" width="2" height="3"/><rect x="0" y="12" width="3" height="1"/><rect x="5" y="12" width="10" height="2"/><rect x="17" y="12" width="3" height="1"/><rect x="0" y="13" width="1" height="3"/><rect x="2" y="13" width="3" height="2"/><rect x="15" y="13" width="3" height="2"/><rect x="19" y="13" width="1" height="3"/><rect x="5" y="14" width="2" height="4"/><rect x="8" y="14" width="1" height="4"/><rect x="10" y="14" width="1" height="4"/><rect x="12" y="14" width="3" height="4"/><rect x="1" y="15" width="2" height="1"/><rect x="7" y="15" width="1" height="5"/><rect x="9" y="15" width="1" height="3"/><rect x="11" y="15" width="1" height="3"/><rect x="17" y="15" width="2" height="1"/><rect x="6" y="18" width="1" height="2"/><rect x="12" y="18" width="2" height="2"/><rect x="5" y="19" width="1" height="1"/><rect x="14" y="19" width="1" height="1"/></g>
          {blink && <g className="aw-rb-r1k"><rect x="6" y="6" width="2" height="2"/><rect x="12" y="6" width="2" height="2"/></g>}
        </g>
      </g>
    </svg>
  );
}

export default RobotMascot;
