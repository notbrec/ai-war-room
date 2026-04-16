export default function CyberBackground({ dark }) {
  if (!dark) return null;
  return (
    <div className="cyber-bg">
      <div className="cyber-grid" />
      <div className="cyber-scan" />
      <div className="cyber-scan cyber-scan--delayed" />
    </div>
  );
}
