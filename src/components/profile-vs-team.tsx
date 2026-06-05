import type { MyProfilePayload } from "@/lib/my-profile.functions";

type Row = { label: string; you: number; team: number | null };

function ComparisonBar({ row }: { row: Row }) {
  const you = Math.max(0, Math.min(100, Math.round(row.you)));
  const team = row.team !== null ? Math.max(0, Math.min(100, Math.round(row.team))) : null;
  let verdict = "—";
  let verdictColor = "text-muted-foreground";
  if (team !== null) {
    const delta = you - team;
    if (Math.abs(delta) <= 5) { verdict = "At team average"; verdictColor = "text-muted-foreground"; }
    else if (delta > 0) { verdict = "Above team average"; verdictColor = "text-success"; }
    else { verdict = "Below team average"; verdictColor = "text-warning"; }
  }
  return (
    <div className="grid grid-cols-[140px_1fr_140px] items-center gap-3 text-sm">
      <div className="truncate">{row.label}</div>
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${you}%` }} />
        {team !== null && (
          <div
            className="absolute top-[-3px] bottom-[-3px] w-[2px] bg-foreground/70"
            style={{ left: `calc(${team}% - 1px)` }}
            title={`Team avg: ${team}`}
          />
        )}
      </div>
      <div className={`text-right text-xs ${verdictColor}`}>
        <span className="tabular-nums text-foreground mr-2">{you}</span>
        {verdict}
      </div>
    </div>
  );
}

export function ProfileVsTeam({ data }: { data: MyProfilePayload }) {
  if (data.team.scope === "none") return null;
  const rows: Row[] = [];
  if (data.disc) {
    rows.push({ label: "Dominance (D)", you: data.disc.d, team: data.team.disc_avg?.d ?? null });
    rows.push({ label: "Influence (I)", you: data.disc.i, team: data.team.disc_avg?.i ?? null });
    rows.push({ label: "Steadiness (S)", you: data.disc.s, team: data.team.disc_avg?.s ?? null });
    rows.push({ label: "Conscientious (C)", you: data.disc.c, team: data.team.disc_avg?.c ?? null });
  }
  if (data.cognitive) {
    rows.push({ label: "Analytical", you: data.cognitive.analytical, team: data.team.cognitive_avg?.analytical ?? null });
    rows.push({ label: "Practical", you: data.cognitive.practical, team: data.team.cognitive_avg?.practical ?? null });
    rows.push({ label: "Strategic", you: data.cognitive.relational, team: data.team.cognitive_avg?.relational ?? null });
    rows.push({ label: "Creative", you: data.cognitive.experimental, team: data.team.cognitive_avg?.experimental ?? null });
  }
  if (data.work_style) {
    rows.push({ label: "Collaboration", you: data.work_style.collaboration, team: data.team.work_style_avg?.collaboration ?? null });
    rows.push({ label: "Independent", you: data.work_style.independent_work, team: data.team.work_style_avg?.independent_work ?? null });
    rows.push({ label: "Innovation", you: data.work_style.idea_generation, team: data.team.work_style_avg?.idea_generation ?? null });
  }
  if (typeof data.profile.meta_cognition_score === "number") {
    rows.push({ label: "Meta-cognition", you: data.profile.meta_cognition_score, team: data.team.meta_cognition_avg });
  }

  return (
    <section className="rounded-xl border bg-card p-6 space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Your Profile Within Your Team</h2>
        <p className="text-sm text-muted-foreground">
          See how your strengths and working style contribute to your team's overall intelligence.
        </p>
      </header>
      <div className="space-y-2.5">
        {rows.map((r) => <ComparisonBar key={r.label} row={r} />)}
      </div>
      <p className="text-xs text-muted-foreground">
        Marker shows the anonymous team average. Individual peer data is never shown.
      </p>
    </section>
  );
}
