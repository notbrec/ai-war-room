/**
 * Ambient premium background — animated noise + drifting hairline grid
 * + three slow drifting light blobs + corner vignette.
 * No neon, no cyan, no purple, no military feel.
 */
export default function CyberBackground({ dark }) {
  return (
    <div className="aiwar-bg" aria-hidden>
      <div className="aiwar-bg-light" />
      <div className="aiwar-bg-light-2" />
      <div className="aiwar-bg-light-3" />
      <div className="aiwar-bg-vignette" />
    </div>
  );
}
