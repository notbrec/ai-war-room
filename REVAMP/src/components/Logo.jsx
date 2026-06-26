export default function Logo({ size = 24, color = 'currentColor' }) {
  const c = size / 2;
  const ro = size * 0.43;   // outer ring radius
  const ri = size * 0.14;   // inner ring radius
  const sw = size * 0.055;  // stroke width
  const gap = size * 0.07;  // gap between line and inner ring

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-label="AI-WAR logo"
    >
      {/* Outer ring */}
      <circle cx={c} cy={c} r={ro} stroke={color} strokeWidth={sw} />
      {/* Inner ring */}
      <circle cx={c} cy={c} r={ri} stroke={color} strokeWidth={sw} />
      {/* Center dot */}
      <circle cx={c} cy={c} r={sw * 0.9} fill={color} />
      {/* Top tick */}
      <line x1={c} y1={sw} x2={c} y2={c - ri - gap}
        stroke={color} strokeWidth={sw} strokeLinecap="round" />
      {/* Bottom tick */}
      <line x1={c} y1={c + ri + gap} x2={c} y2={size - sw}
        stroke={color} strokeWidth={sw} strokeLinecap="round" />
      {/* Left tick */}
      <line x1={sw} y1={c} x2={c - ri - gap} y2={c}
        stroke={color} strokeWidth={sw} strokeLinecap="round" />
      {/* Right tick */}
      <line x1={c + ri + gap} y1={c} x2={size - sw} y2={c}
        stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
}
