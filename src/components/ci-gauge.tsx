type Props = { score: number; size?: number; label?: string };

export function CIGauge({ score, size = 220, label = "Collective Intelligence" }: Props) {
  const radius = size * 0.4;
  const cx = size / 2;
  const cy = size * 0.55;
  const start = Math.PI;
  const end = 0;
  const clamped = Math.max(0, Math.min(100, score));
  const angle = start - (clamped / 100) * (start - end);

  function polar(angle: number, r: number) {
    return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)] as const;
  }
  const [sx, sy] = polar(start, radius);
  const [ex, ey] = polar(end, radius);
  const [px, py] = polar(angle, radius);
  const largeArc = 0;
  const bgPath = `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`;
  const fgPath = `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${px} ${py}`;

  const color =
    clamped >= 75 ? "var(--success)" :
    clamped >= 50 ? "var(--primary)" :
    clamped >= 30 ? "var(--warning)" : "var(--destructive)";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        <path d={bgPath} stroke="var(--muted)" strokeWidth={size * 0.06} fill="none" strokeLinecap="round" />
        <path d={fgPath} stroke={color} strokeWidth={size * 0.06} fill="none" strokeLinecap="round" />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={size * 0.22} fontWeight={700} fill="var(--foreground)">{clamped}</text>
        <text x={cx} y={cy + size * 0.08} textAnchor="middle" fontSize={size * 0.07} fill="var(--muted-foreground)">/ 100</text>
      </svg>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
