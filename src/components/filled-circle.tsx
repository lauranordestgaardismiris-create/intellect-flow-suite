import { useEffect, useId, useState } from "react";

type Props = {
  score: number;
  label?: string;
  size?: number;
  /** "score" = blue→purple gradient. "blindness" = inverted red/amber/green. */
  variant?: "score" | "blindness";
  className?: string;
};

/**
 * Animated filled circle: a circular vessel that fills from the bottom upward
 * based on a 0–100 score. Default brand gradient (blue → purple) for normal
 * scores; "blindness" variant inverts colour logic (green low, red high).
 */
export function FilledCircle({
  score,
  label,
  size = 180,
  variant = "score",
  className,
}: Props) {
  const target = Math.max(0, Math.min(100, Math.round(score)));
  const [animated, setAnimated] = useState(0);
  const gid = useId().replace(/:/g, "");

  useEffect(() => {
    // Animate from 0 → target over ~1.2s with ease-out.
    let raf = 0;
    const start = performance.now();
    const duration = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setAnimated(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // Gradient stops by variant
  const fillId = `fc-fill-${gid}`;
  const clipId = `fc-clip-${gid}`;
  let stopA = "#3b82f6"; // blue-500
  let stopB = "#a855f7"; // purple-500
  if (variant === "blindness") {
    if (target > 60) { stopA = "#ef4444"; stopB = "#dc2626"; }     // red
    else if (target >= 40) { stopA = "#f59e0b"; stopB = "#d97706"; } // amber
    else { stopA = "#22c55e"; stopB = "#16a34a"; }                  // green
  }

  const fillY = size - (animated / 100) * size; // top edge of the fill rect

  // Text sizing scales with circle size
  const numSize = Math.round(size * 0.28);
  const labelSize = Math.round(size * 0.075);

  return (
    <div className={`flex flex-col items-center gap-2 ${className ?? ""}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={stopA} />
              <stop offset="100%" stopColor={stopB} />
            </linearGradient>
            <clipPath id={clipId}>
              <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} />
            </clipPath>
          </defs>
          {/* Unfilled background */}
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="hsl(220 14% 92%)" />
          {/* Filled portion clipped to the circle, rising from the bottom */}
          <rect
            x={0}
            y={fillY}
            width={size}
            height={size}
            fill={`url(#${fillId})`}
            clipPath={`url(#${clipId})`}
          />
          {/* Subtle outline */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 2}
            fill="none"
            stroke="hsl(220 13% 80%)"
            strokeWidth={1}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="font-bold tabular-nums text-foreground drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]"
            style={{ fontSize: numSize, lineHeight: 1 }}
          >
            {Math.round(animated)}
          </span>
        </div>
      </div>
      {label && (
        <p
          className="text-center text-muted-foreground"
          style={{ fontSize: labelSize, maxWidth: size + 20 }}
        >
          {label}
        </p>
      )}
    </div>
  );
}
