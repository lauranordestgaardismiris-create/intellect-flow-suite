import { useMemo } from "react";
import { FilledCircle } from "@/components/filled-circle";
import { DIMENSIONS, computeDimension, DIM_BY_ID } from "@/lib/dimensions";

type Props = {
  members: any[];
  blindnessScore: number;
};

function RiskTag({ score }: { score: number }) {
  if (score < 40) return <span className="rounded-full bg-destructive/15 text-destructive text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">Critical</span>;
  return <span className="rounded-full bg-warning/15 text-warning text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">At Risk</span>;
}

export function BlindnessPanel({ members, blindnessScore }: Props) {
  if (members.length < 5) {
    return (
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Collective Blindness</h2>
        <p className="text-sm text-muted-foreground">
          Invite more team members to unlock your Collective Blindness analysis. 5+ completed profiles needed.
        </p>
      </section>
    );
  }

  const ranked = useMemo(() => {
    const all = DIMENSIONS.map((d) => ({
      id: d.id,
      meta: d,
      score: computeDimension(d.id, members).score,
    }))
      .filter((r): r is { id: typeof r.id; meta: typeof r.meta; score: number } => typeof r.score === "number")
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
    return all;
  }, [members]);

  return (
    <section className="rounded-xl border bg-card p-6 space-y-5">
      <div className="flex flex-wrap items-start gap-6">
        <FilledCircle score={blindnessScore} size={180} variant="blindness" label="Collective Blindness" />
        <div className="flex-1 min-w-[260px] space-y-2">
          <h2 className="text-lg font-semibold">Collective Blindness</h2>
          <p className="text-sm text-muted-foreground">
            Your blindness score reflects how concentrated your team's weakest dimensions are. A high score means one or more dimensions are critically underdeveloped.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top 3 lowest dimensions</p>
        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dimensions to rank yet.</p>
        ) : (
          <ol className="space-y-3">
            {ranked.map((r, idx) => (
              <li key={r.id} className="flex items-start gap-4 rounded-md border p-3">
                <div className="flex items-center gap-3 min-w-[120px]">
                  <span className="text-2xl font-semibold tabular-nums text-muted-foreground w-6">{idx + 1}</span>
                  <FilledCircle score={r.score} size={60} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{DIM_BY_ID[r.id].name}</p>
                    <RiskTag score={r.score} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">{DIM_BY_ID[r.id].riskCopy}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="text-sm italic text-muted-foreground border-t pt-4">
        Collective intelligence grows not by making everyone the same, but by ensuring what's missing gets a voice.
      </p>
    </section>
  );
}
