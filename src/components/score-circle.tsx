type Props = {
  score: number;
  label: string;
  size?: number;
  color?: string;
};

// A filled circle that visually represents a 0–100 score as a circular fill level.
export function ScoreCircle({ score, label, size = 140, color }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const c =
    color ??
    (clamped >= 75
      ? "var(--success)"
      : clamped >= 50
      ? "var(--primary)"
      : clamped >= 30
      ? "var(--warning)"
      : "var(--destructive)");

  const radius = size / 2;
  const circumference = 2 * Math.PI * (radius - 8);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={radius}
            cy={radius}
            r={radius - 8}
            stroke="var(--muted)"
            strokeWidth={10}
            fill="none"
          />
          <circle
            cx={radius}
            cy={radius}
            r={radius - 8}
            stroke={c}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{clamped}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className="text-xs text-center text-muted-foreground max-w-[140px]">{label}</p>
    </div>
  );
}
