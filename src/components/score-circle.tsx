type Props = {
  score: number;
  label: string;
  size?: number;
  color?: string;
};

// Brand-aligned score ring (stroke-dasharray). Single brand colour by default.
export function ScoreCircle({ score, label, size = 100, color = "#6B4AE8" }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const sw = Math.max(4, Math.round(size * 0.06));
  const radius = size / 2 - sw;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#EEEDFE" strokeWidth={sw} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 900ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="tabular-nums"
            style={{ fontSize: Math.round(size * 0.3), fontWeight: 500, color: "#1A1045" }}
          >
            {clamped}
          </span>
        </div>
      </div>
      <p className="text-center" style={{ fontSize: 11, color: "#9D87F7", maxWidth: size + 30 }}>
        {label}
      </p>
    </div>
  );
}
