import { DISC_META, discInterpretation, type DiscDim } from "@/lib/assessments";

type Props = {
  d: number; i: number; s: number; c: number;
  showInterpretation?: boolean;
  height?: number;
  title?: string;
};

export function DiscBar({ d, i, s, c, showInterpretation = true, height = 28, title }: Props) {
  const segs: { k: DiscDim; v: number }[] = [
    { k: "D", v: d }, { k: "I", v: i }, { k: "S", v: s }, { k: "C", v: c },
  ];
  const total = segs.reduce((a, b) => a + b.v, 0) || 1;
  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-medium">{title}</p>}
      <div
        className="flex w-full overflow-hidden rounded-md border"
        style={{ height }}
        role="img"
        aria-label={`DISC profile: D ${d}%, I ${i}%, S ${s}%, C ${c}%`}
      >
        {segs.map((seg) => {
          const pct = (seg.v / total) * 100;
          if (pct === 0) return null;
          const meta = DISC_META[seg.k];
          return (
            <div
              key={seg.k}
              title={`${meta.name}: ${seg.v}%`}
              className="flex items-center justify-center text-[11px] font-semibold text-white tabular-nums"
              style={{ width: `${pct}%`, backgroundColor: meta.color }}
            >
              {pct >= 8 ? `${seg.v}%` : ""}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {segs.map((seg) => {
          const m = DISC_META[seg.k];
          return (
            <div key={seg.k} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: m.color }} />
              <span><strong className="text-foreground">{m.name}</strong> ({m.tag}) · {seg.v}%</span>
            </div>
          );
        })}
      </div>
      {showInterpretation && (
        <p className="text-sm text-foreground/90 leading-relaxed">{discInterpretation(d, i, s, c)}</p>
      )}
    </div>
  );
}
