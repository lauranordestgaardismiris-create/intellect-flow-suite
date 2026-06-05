import { useId } from "react";

interface Props {
  value: number;
  size?: number;
  variant?: "primary" | "amber";
  label?: string;
}

export function LandingFilledCircle({ value, size = 140, variant = "primary", label }: Props) {
  const id = useId().replace(/:/g, "");
  const gradId = `lfc-${id}`;
  const clipId = `lfc-clip-${id}`;
  const v = Math.max(0, Math.min(100, value));
  const fillY = ((100 - v) / 100) * size;

  const colors = variant === "amber"
    ? { from: "oklch(0.78 0.16 75)", to: "oklch(0.65 0.2 40)" }
    : { from: "oklch(0.65 0.2 250)", to: "oklch(0.6 0.22 320)" };

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
          <clipPath id={clipId}>
            <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} />
          </clipPath>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="oklch(0.96 0.01 250 / 0.1)" stroke="oklch(1 0 0 / 0.15)" strokeWidth="2" />
        <rect x="0" y={fillY} width={size} height={size} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`}>
          <animate attributeName="y" from={size} to={fillY} dur="1.2s" fill="freeze" />
        </rect>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.28} fontWeight="700" fill="white" style={{ mixBlendMode: "difference" }}>
          {v}
        </text>
      </svg>
      {label && <div className="text-sm text-white/70">{label}</div>}
    </div>
  );
}
