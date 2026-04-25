// Tiny SVG sparkline — no chart library needed.
export default function Sparkline({ data = [], width = 220, height = 56, color = '#ff6b1a' }) {
  if (!data.length) {
    // generic empty curve
    data = [2, 3, 2, 4, 3, 5, 4, 6, 7, 9, 12, 14];
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 6) - 3]);
  const d = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${d} L${width},${height} L0,${height} Z`;
  const gid = `g-${color.replace('#', '')}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
