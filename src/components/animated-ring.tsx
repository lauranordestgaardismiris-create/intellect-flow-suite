import { useId } from "react";

interface Props {
  size?: number;
  nodes?: number;
  rotate?: boolean;
  className?: string;
}

/**
 * Animated brand network: 6 outer nodes stagger in, ring + spokes draw,
 * centre node appears last with a soft glow. Pure CSS animation, no JS.
 */
export function AnimatedRing({ size = 220, nodes = 6, rotate = true, className }: Props) {
  const id = useId().replace(/:/g, "");
  const radius = size / 2 - Math.max(18, size * 0.1);
  const cx = size / 2;
  const cy = size / 2;

  const points = Array.from({ length: nodes }, (_, i) => {
    const angle = (i / nodes) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  const nodeColors = ["#6B4AE8", "#534AB7", "#7F77DD", "#7F77DD", "#9D87F7", "#9D87F7"];

  return (
    <div className={className} style={{ width: size, height: size }}>
      <style>{`
        @keyframes ring-node-${id} { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
        @keyframes ring-line-${id} { from { stroke-dashoffset: 600; opacity: 0; } to { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes ring-center-${id} { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
        @keyframes ring-rotate-${id} {
          0% { transform: rotate(0deg); }
          70% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .arr-${id} { transform-origin: ${cx}px ${cy}px; ${rotate ? `animation: ring-rotate-${id} 14s ease-in-out 2.4s infinite;` : ""} }
        .arr-${id} .arc { stroke-dasharray: 600; stroke-dashoffset: 600; opacity: 0; animation: ring-line-${id} 1.4s ease-out 0.9s forwards; }
        .arr-${id} .spoke { stroke-dasharray: 200; stroke-dashoffset: 200; opacity: 0; animation: ring-line-${id} 0.8s ease-out forwards; }
        .arr-${id} .node { opacity: 0; transform-box: fill-box; transform-origin: center; animation: ring-node-${id} 0.45s cubic-bezier(.2,.8,.2,1) forwards; }
        .arr-${id} .center { opacity: 0; transform-box: fill-box; transform-origin: center; animation: ring-center-${id} 0.6s ease-out 2.0s forwards; }
        .arr-${id} .halo { opacity: 0; animation: ring-center-${id} 0.6s ease-out 2.0s forwards; }
      `}</style>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={`arr-${id}`}>
        {/* Ring connections between adjacent outer nodes */}
        {points.map((p, i) => {
          const n = points[(i + 1) % points.length];
          return (
            <line
              key={`r${i}`}
              className="arc"
              x1={p.x} y1={p.y} x2={n.x} y2={n.y}
              stroke="#6B4AE8" strokeWidth="1" strokeLinecap="round" opacity="0.5"
            />
          );
        })}
        {/* Spokes from each outer node to centre */}
        {points.map((p, i) => (
          <line
            key={`s${i}`}
            className="spoke"
            x1={p.x} y1={p.y} x2={cx} y2={cy}
            stroke="#6B4AE8" strokeWidth="1" strokeLinecap="round" opacity="0.35"
            style={{ animationDelay: `${1.4 + i * 0.08}s` }}
          />
        ))}
        {/* Centre halo */}
        <circle className="halo" cx={cx} cy={cy} r={size * 0.09} fill="#6B4AE8" opacity="0.18" />
        {/* Outer nodes */}
        {points.map((p, i) => (
          <circle
            key={`n${i}`}
            className="node"
            cx={p.x} cy={p.y}
            r={size * 0.035}
            fill={nodeColors[i % nodeColors.length]}
            style={{ animationDelay: `${0.22 * i}s` }}
          />
        ))}
        {/* Centre node */}
        <circle className="center" cx={cx} cy={cy} r={size * 0.045} fill="#6B4AE8" />
      </svg>
    </div>
  );
}
