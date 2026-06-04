import { useMemo, useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from "recharts";
import type { MyProfilePayload } from "@/lib/my-profile.functions";

type Props = { data: MyProfilePayload };

const DISC_LABEL: Record<string, string> = {
  d: "Dominance", i: "Influence", s: "Steadiness", c: "Conscientiousness",
};
const COG_LABEL: Record<string, string> = {
  analytical: "Analytical", practical: "Practical",
  relational: "Strategic", experimental: "Creative",
};

function topN<T extends { label: string; value: number }>(arr: T[], n: number) {
  return [...arr].sort((a, b) => b.value - a.value).slice(0, n);
}
function bottomN<T extends { label: string; value: number }>(arr: T[], n: number, min = 35) {
  return [...arr].sort((a, b) => a.value - b.value).filter((x) => x.value <= min).slice(0, n);
}

export function PersonalIntelligenceProfile({ data }: Props) {
  const p = data.profile;
  const disc = data.disc;
  const cog = data.cognitive;
  const ws = data.work_style;
  const pss = p.problem_solving_style;
  const ips = p.information_processing_style;
  const meta = typeof p.meta_cognition_score === "number" ? p.meta_cognition_score : null;

  // Unified radar — all dimensions on a single 0–100 scale
  const radarData = useMemo(() => {
    const rows: Array<{ axis: string; you: number; team?: number }> = [];
    if (disc) {
      rows.push({ axis: "Dominance", you: disc.d, team: data.team.disc_avg?.d });
      rows.push({ axis: "Influence", you: disc.i, team: data.team.disc_avg?.i });
      rows.push({ axis: "Steadiness", you: disc.s, team: data.team.disc_avg?.s });
      rows.push({ axis: "Conscientious", you: disc.c, team: data.team.disc_avg?.c });
    }
    if (cog) {
      rows.push({ axis: "Analytical", you: cog.analytical, team: data.team.cognitive_avg?.analytical });
      rows.push({ axis: "Strategic", you: cog.relational, team: data.team.cognitive_avg?.relational });
      rows.push({ axis: "Creative", you: cog.experimental, team: data.team.cognitive_avg?.experimental });
      rows.push({ axis: "Practical", you: cog.practical, team: data.team.cognitive_avg?.practical });
    }
    if (pss) {
      rows.push({ axis: "Structured PS", you: pss.structured_problem_solving });
      rows.push({ axis: "Exploratory PS", you: pss.exploratory_problem_solving });
    }
    if (ips) {
      rows.push({ axis: "Depth", you: ips.depth_oriented_processing });
      rows.push({ axis: "Breadth", you: ips.breadth_oriented_processing });
    }
    if (meta !== null) rows.push({ axis: "Meta-cognition", you: meta });
    if (ws) {
      rows.push({ axis: "Collaboration", you: ws.collaboration });
      rows.push({ axis: "Innovation", you: ws.idea_generation });
    }
    return rows;
  }, [disc, cog, pss, ips, meta, ws, data.team]);

  const showTeam = data.team.scope !== "none" && (!!data.team.disc_avg || !!data.team.cognitive_avg);

  // Dynamic summary
  const summary = useMemo(() => {
    const parts: string[] = [];
    if (cog) {
      const cogArr = [
        { label: COG_LABEL.analytical, value: cog.analytical },
        { label: COG_LABEL.relational, value: cog.relational },
        { label: COG_LABEL.experimental, value: cog.experimental },
        { label: COG_LABEL.practical, value: cog.practical },
      ];
      const top = topN(cogArr, 2).map((x) => x.label.toLowerCase());
      parts.push(`You are a ${top.join(" and ")} thinker`);
    } else {
      parts.push("Your profile is taking shape");
    }
    if (disc) {
      const discArr = [
        { label: DISC_LABEL.d, value: disc.d },
        { label: DISC_LABEL.i, value: disc.i },
        { label: DISC_LABEL.s, value: disc.s },
        { label: DISC_LABEL.c, value: disc.c },
      ];
      const top = topN(discArr, 1)[0];
      parts.push(`with strong ${top.label.toLowerCase()} tendencies`);
    }
    let line1 = parts.join(" ") + ".";

    const traits: string[] = [];
    if (pss) {
      traits.push(
        pss.structured_problem_solving >= pss.exploratory_problem_solving
          ? "a preference for structured problem-solving"
          : "an exploratory problem-solving approach",
      );
    }
    if (ips) {
      const depth = ips.depth_oriented_processing;
      const breadth = ips.breadth_oriented_processing;
      traits.push(depth >= breadth ? "depth-oriented information processing" : "breadth-oriented information processing");
    }
    if (meta !== null) {
      const lvl = meta >= 70 ? "above-average" : meta >= 45 ? "balanced" : "developing";
      traits.push(`${lvl} meta-cognitive awareness`);
    }
    const line2 = traits.length ? `Your profile combines ${traits.join(", ")}.` : "";

    let line3 = "";
    if (showTeam && cog && data.team.cognitive_avg) {
      const diffs = (["analytical", "relational", "experimental", "practical"] as const).map((k) => ({
        label: COG_LABEL[k],
        delta: cog[k] - (data.team.cognitive_avg as any)[k],
      }));
      const standout = [...diffs].sort((a, b) => b.delta - a.delta)[0];
      if (standout && standout.delta >= 6) {
        line3 = `Compared to your team, you contribute extra ${standout.label.toLowerCase()} perspective.`;
      } else {
        line3 = "Compared to your team, your profile sits close to the group average.";
      }
    }
    return [line1, line2, line3].filter(Boolean).join(" ");
  }, [disc, cog, pss, ips, meta, showTeam, data.team]);

  // Strengths & blind spots from unified dimension list
  const dims = useMemo(() => {
    const out: Array<{ label: string; value: number }> = [];
    if (disc) {
      out.push({ label: DISC_LABEL.d, value: disc.d });
      out.push({ label: DISC_LABEL.i, value: disc.i });
      out.push({ label: DISC_LABEL.s, value: disc.s });
      out.push({ label: DISC_LABEL.c, value: disc.c });
    }
    if (cog) {
      out.push({ label: "Analytical thinking", value: cog.analytical });
      out.push({ label: "Strategic thinking", value: cog.relational });
      out.push({ label: "Creative thinking", value: cog.experimental });
      out.push({ label: "Practical thinking", value: cog.practical });
    }
    if (pss) {
      out.push({ label: "Structured problem-solving", value: pss.structured_problem_solving });
      out.push({ label: "Exploratory problem-solving", value: pss.exploratory_problem_solving });
    }
    if (ips) {
      out.push({ label: "Depth processing", value: ips.depth_oriented_processing });
      out.push({ label: "Breadth processing", value: ips.breadth_oriented_processing });
    }
    if (meta !== null) out.push({ label: "Meta-cognition", value: meta });
    if (ws) {
      out.push({ label: "Collaboration", value: ws.collaboration });
      out.push({ label: "Independent work", value: ws.independent_work });
      out.push({ label: "Idea generation", value: ws.idea_generation });
    }
    return out;
  }, [disc, cog, pss, ips, meta, ws]);

  const strengths = topN(dims, 4);
  const blindspots = bottomN(dims, 3, 40);

  // Team contribution
  const contribution = useMemo(() => {
    const align: string[] = [];
    const diverge: string[] = [];
    if (showTeam && disc && data.team.disc_avg) {
      (["d", "i", "s", "c"] as const).forEach((k) => {
        const d = disc[k] - (data.team.disc_avg as any)[k];
        if (Math.abs(d) <= 8) align.push(DISC_LABEL[k]);
        else if (d > 0) diverge.push(`higher ${DISC_LABEL[k]}`);
      });
    }
    if (showTeam && cog && data.team.cognitive_avg) {
      (["analytical", "relational", "experimental", "practical"] as const).forEach((k) => {
        const d = cog[k] - (data.team.cognitive_avg as any)[k];
        if (Math.abs(d) <= 8) align.push(`${COG_LABEL[k]} thinking`);
        else if (d > 0) diverge.push(`extra ${COG_LABEL[k].toLowerCase()} thinking`);
      });
    }
    return { align, diverge };
  }, [showTeam, disc, cog, data.team]);

  const [detailOpen, setDetailOpen] = useState(false);
  const aiShort = p.insights_summary_short;
  const aiLong = p.insights_summary_long;
  const displaySummary = aiShort || summary;

  return (
    <section className="rounded-xl border bg-card p-6 space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Your Intelligence Insights</h2>
        <p className="text-sm text-muted-foreground">
          A unified view of how you think, work, and contribute — combining all your assessments.
        </p>
      </header>

      {/* Profile Summary */}
      {displaySummary && (
        <div className="rounded-lg border bg-accent/30 p-4 space-y-3">
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{displaySummary}</p>

          {aiLong && (
            <div>
              <button
                type="button"
                onClick={() => setDetailOpen((o) => !o)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-expanded={detailOpen}
              >
                <span>Curious to know more?</span>
                <span
                  className={`inline-block transition-transform duration-200 ${detailOpen ? "rotate-90" : ""}`}
                  aria-hidden
                >
                  ›
                </span>
              </button>
              {detailOpen && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  {aiLong.split(/\n\n+/).map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-foreground/90">{para}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Intelligence Profile Overview — unified radar */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Intelligence Profile Overview
        </h3>
        {radarData.length >= 3 ? (
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radarData} outerRadius="78%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} domain={[0, 100]} />
              <Tooltip />
              <Radar name="You" dataKey="you" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
              {showTeam && (
                <Radar name={`Team avg (${data.team.scope})`} dataKey="team" stroke="#a855f7" fill="#a855f7" fillOpacity={0.18} />
              )}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">Complete more assessments to unlock the unified view.</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Key Strengths */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Key strengths</h3>
          {strengths.length ? (
            <ul className="space-y-2">
              {strengths.map((s) => (
                <li key={s.label} className="text-sm">
                  <div className="flex justify-between">
                    <span>{s.label}</span>
                    <span className="tabular-nums text-muted-foreground">{s.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${s.value}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No data yet.</p>}
        </div>

        {/* Potential Blind Spots */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Potential blind spots</h3>
          {blindspots.length ? (
            <>
              <ul className="space-y-2">
                {blindspots.map((s) => (
                  <li key={s.label} className="text-sm">
                    <div className="flex justify-between">
                      <span>{s.label}</span>
                      <span className="tabular-nums text-muted-foreground">{s.value}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-warning rounded-full" style={{ width: `${s.value}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Underrepresented dimensions — useful to pair with collaborators who bring these strengths.
              </p>
            </>
          ) : <p className="text-sm text-muted-foreground">No notable underrepresented dimensions.</p>}
        </div>
      </div>

      {/* Team Contribution */}
      {showTeam && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Team contribution
          </h3>
          <p className="text-xs text-muted-foreground">
            Based on {data.team.member_count} peer{data.team.member_count === 1 ? "" : "s"} in {data.team.name ?? "your group"} ({data.team.scope}).
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="font-medium mb-1">You bring diversity in</p>
              {contribution.diverge.length ? (
                <ul className="list-disc list-inside space-y-1">
                  {contribution.diverge.map((x) => <li key={x}>{x}</li>)}
                </ul>
              ) : <p className="text-muted-foreground">Closely aligned with team profile.</p>}
            </div>
            <div>
              <p className="font-medium mb-1">You align with team on</p>
              {contribution.align.length ? (
                <ul className="list-disc list-inside space-y-1">
                  {contribution.align.map((x) => <li key={x}>{x}</li>)}
                </ul>
              ) : <p className="text-muted-foreground">More distinct than aligned across dimensions.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
