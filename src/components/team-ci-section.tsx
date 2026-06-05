import { ScoreCircle } from "@/components/score-circle";
import type { MyProfilePayload } from "@/lib/my-profile.functions";

export function TeamCISection({ team }: { team: MyProfilePayload["team"] }) {
  if (team.scope === "none") return null;

  return (
    <section className="rounded-xl border bg-card p-6 space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Your Team's Collective Intelligence</h2>
        <p className="text-sm text-muted-foreground">
          How {team.name ?? "your group"} performs across the three intelligence dimensions.
        </p>
      </header>

      {team.completed_count < 5 || !team.scores ? (
        <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
          Your team needs at least 5 completed profiles to generate a Collective Intelligence score.
          ({team.completed_count} of 5 complete so far)
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 items-start justify-items-center">
            <ScoreCircle score={team.scores.score_c} label="Collective Intelligence" />
            <ScoreCircle score={team.scores.score_a} label="Behavioural Profile" />
            {team.scores.score_b === null ? (
              <div className="flex flex-col items-center gap-2 text-center max-w-[160px]">
                <div className="h-[120px] w-[120px] rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-[11px] text-muted-foreground px-3 leading-tight">
                  Not enough identity data to calculate
                </div>
                <span className="text-sm font-medium">Diversity Composition</span>
              </div>
            ) : (
              <ScoreCircle score={team.scores.score_b} label="Diversity Composition" />
            )}
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Based on {team.completed_count} member{team.completed_count === 1 ? "" : "s"} in {team.name ?? "your group"}.
          </p>
        </>
      )}
    </section>
  );
}
