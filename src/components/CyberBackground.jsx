/**
 * Ambient premium background — noise + hairline grid + soft drifting light
 * + vignette. No neon, no cyan, no purple, no military feel.
 */
export default function CyberBackground({ dark }) {
  return (
    <div className="aiwar-bg" aria-hidden>
      <div className="aiwar-bg-light" />
      <div className="aiwar-bg-vignette" />
    </div>
  );
}
