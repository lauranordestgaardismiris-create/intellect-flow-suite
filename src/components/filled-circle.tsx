import { useEffect, useState } from "react";

type Props = {
  score: number;
  label?: string;
  size?: number;
  /** "score" = brand primary ring. "blindness" = inverted red/amber/green. */
  variant?: "score" | "blindness";
  className?: string;
  strokeWidth?: number;
};

/**
 * SVG stroke-dasharray ring that animates from 0 → score on mount.
 * Brand primary (#6B4AE8) on a #EEEDFE track per design system.
 */
export function FilledCircle({
  score,
  label,
  size = 100,
  variant = "score",
  className,
  strokeWidth,
}: Props) {
  const target = Math.max(0, Math.min(100, Math.round(score)));
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 1100;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const sw = strokeWidth ?? Math.max(4, Math.round(size * 0.06));
  const r = size / 2 - sw;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (animated / 100) * circumference;

  // Blindness variant inverts colour logic
  let stroke = "#6B4AE8";
  if (variant === "blindness") {
    if (target > 60) stroke = "#EF4444";
    else if (target >= 40) stroke = "#F59E0B";
    else stroke = "#10B981";
  }

  const numSize = Math.round(size * 0.3);

  return (
    <div className={`flex flex-col items-center gap-2 ${className ?? ""}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEEDFE" strokeWidth={sw} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="tabular-nums"
            style={{ fontSize: numSize, fontWeight: 500, color: "#1A1045", lineHeight: 1 }}
          >
            {Math.round(animated)}
          </span>
        </div>
      </div>
      {label && (
        <p className="text-center" style={{ fontSize: 11, color: "#9D87F7", maxWidth: size + 30 }}>
          {label}
        </p>
      )}
    </div>
  );
}
