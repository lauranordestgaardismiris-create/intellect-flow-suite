import { useId } from "react";

interface Props {
  size?: number;
  nodes?: number;
  rotate?: boolean;
  className?: string;
}

export function AnimatedRing({ size = 320, nodes = 7, rotate = true, className }: Props) {
  const id = useId().replace(/:/g, "");
  const gradId = `ring-grad-${id}`;
  const radius = size / 2 - 20;
  const cx = size / 2;
  const cy = size / 2;

  const points = Array.from({ length: nodes }, (_, i) => {
    const angle = (i / nodes) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .concat([`L ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`])
    .join(" ");

  return (
    <div className={className} style={{ width: size, height: size }}>
      <style>{`
        @keyframes ring-draw-${id} { to { stroke-dashoffset: 0; } }
        @keyframes ring-rotate-${id} {
          0% { transform: rotate(0deg); }
          60% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ring-node-${id} { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
        .ring-${id} { transform-origin: ${cx}px ${cy}px; animation: ring-rotate-${id} 6s ease-in-out 1.2s 1 forwards; }
        .ring-${id} .arc { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: ring-draw-${id} 1.6s ease-out 0.3s forwards; }
        .ring-${id} .node { opacity: 0; transform-box: fill-box; transform-origin: center; animation: ring-node-${id} 0.4s ease-out forwards; }
      `}</style>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className={rotate ? `ring-${id}` : ""}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.65 0.2 250)" />
            <stop offset="100%" stopColor="oklch(0.6 0.22 320)" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={`url(#${gradId})`} strokeOpacity="0.15" strokeWidth="1.5" />
        <path d={linePath} fill="none" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="arc" />
        {points.map((p, i) => (
          <g key={i} className="node" style={{ animationDelay: `${0.15 * i}s` }}>
            <circle cx={p.x} cy={p.y} r="9" fill={`url(#${gradId})`} />
            <circle cx={p.x} cy={p.y} r="14" fill={`url(#${gradId})`} fillOpacity="0.18" />
          </g>
        ))}
      </svg>
    </div>
  );
}
