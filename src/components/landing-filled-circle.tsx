import { useEffect, useState } from "react";

interface Props {
  value: number;
  size?: number;
  variant?: "primary" | "amber";
  label?: string;
}

export function LandingFilledCircle({ value, size = 110, variant = "primary", label }: Props) {
  const target = Math.max(0, Math.min(100, value));
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1100);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const sw = 6;
  const r = size / 2 - sw;
  const c = 2 * Math.PI * r;
  const offset = c - (animated / 100) * c;
  const stroke = variant === "amber" ? "#F59E0B" : "#6B4AE8";

  return (
    <div className="inline-flex flex-col items-center gap-2">
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
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: Math.round(size * 0.3), fontWeight: 500, color: "#1A1045" }}>
            {Math.round(animated)}
          </span>
        </div>
      </div>
      {label && <div style={{ fontSize: 11, color: "#9D87F7" }}>{label}</div>}
    </div>
  );
}
