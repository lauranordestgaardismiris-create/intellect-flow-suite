import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getMyProfile } from "@/lib/my-profile.functions";
import { DiscBar } from "@/components/disc-bar";
import { Button } from "@/components/ui/button";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/my-profile")({
  head: () => ({ meta: [{ title: "My profile — Collective Intelligence" }] }),
  component: MyProfilePage,
});

// Stored cognitive dim → display label
const COG_META: Record<string, { name: string; color: string }> = {
  analytical:   { name: "Analytical", color: "#3b82f6" },
  practical:    { name: "Practical",  color: "#22c55e" },
  relational:   { name: "Strategic",  color: "#f59e0b" },
  experimental: { name: "Creative",   color: "#a855f7" },
};

function CognitiveRadar({ a, p, r, e, peerA, peerP, peerR, peerE, title }: {
  a: number; p: number; r: number; e: number;
  peerA?: number; peerP?: number; peerR?: number; peerE?: number;
  title?: string;
}) {
  const data = [
    { axis: "Analytical", you: a, team: peerA ?? 0 },
    { axis: "Creative",   you: e, team: peerE ?? 0 },
    { axis: "Strategic",  you: r, team: peerR ?? 0 },
    { axis: "Practical",  you: p, team: peerP ?? 0 },
  ];
  const showTeam = peerA !== undefined;
  return (
    <div className="space-y-2">
      {title && <p className="text-sm font-medium">{title}</p>}
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <PolarRadiusAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} domain={[0, 100]} />
          <Radar name="You" dataKey="you" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
          {showTeam && <Radar name="Team avg" dataKey="team" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />}
          {showTeam && <Legend />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Bars({ items }: { items: Array<[string, number, string?]> }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3 text-sm">
      {items.map(([label, v, tip]) => (
        <div key={label} className="rounded-md border p-3">
          <div className="flex justify-between"><span>{label}</span><span className="tabular-nums">{v}</span></div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${v}%` }} />
          </div>
          {tip && <p className="mt-1.5 text-xs text-muted-foreground">{tip}</p>}
        </div>
      ))}
    </div>
  );
}


function MyProfilePage() {
  const navigate = useNavigate();
  const fetchMine = useServerFn(getMyProfile);
  const { data, isLoading } = useQuery<import("@/lib/my-profile.functions").MyProfilePayload | null>({
    queryKey: ["my-profile"],
    queryFn: () => fetchMine() as any,
  });

  const alignDiff = useMemo(() => {
    const out = { align: [] as string[], differ: [] as string[] };
    const disc = data?.disc;
    const discAvg = data?.team?.disc_avg;
    if (!disc || !discAvg) return out;
    const labels: Record<string, string> = { d: "Dominance", i: "Influence", s: "Steadiness", c: "Conscientiousness" };
    (["d", "i", "s", "c"] as const).forEach((k) => {
      const delta = Math.abs(disc[k] - discAvg[k]);
      if (delta <= 8) out.align.push(`${labels[k]} (you ${disc[k]}% vs team ${discAvg[k]}%)`);
      else out.differ.push(`${labels[k]} (you ${disc[k]}% vs team ${discAvg[k]}%, Δ${delta}pp)`);
    });
    const cog = data?.cognitive;
    const cogAvg = data?.team?.cognitive_avg;
    if (cog && cogAvg) {
      (["analytical", "practical", "relational", "experimental"] as const).forEach((k) => {
        const delta = Math.abs(cog[k] - cogAvg[k]);
        const name = COG_META[k].name;
        if (delta <= 8) out.align.push(`${name} thinking (you ${cog[k]}% vs team ${cogAvg[k]}%)`);
        else out.differ.push(`${name} thinking (you ${cog[k]}% vs team ${cogAvg[k]}%, Δ${delta}pp)`);
      });
    }
    return out;
  }, [data]);

  if (isLoading || !data) {
    return <div className="mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground">Loading your profile…</div>;
  }
  if (!data.profile) {
    return <div className="mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground">No profile yet.</div>;
  }

  const p = data.profile;
  const skillsByCat: Record<string, string[]> = {};
  for (const s of data.skills) {
    const cat = s.category || "Other";
    (skillsByCat[cat] = skillsByCat[cat] || []).push(s.name);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{p.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {p.job_title ?? "—"} · {[p.company, p.department, p.team].filter(Boolean).join(" / ")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/onboarding" })}>
          Retake assessments
        </Button>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Summary</h2>
          <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Email</dt><dd className="col-span-2">{p.email ?? "—"}</dd>
            <dt className="text-muted-foreground">Role</dt><dd className="col-span-2">{p.role_type?.replace("_", " ") ?? "—"}</dd>
            <dt className="text-muted-foreground">Age</dt><dd className="col-span-2">{p.age ?? "—"}</dd>
            <dt className="text-muted-foreground">Gender</dt><dd className="col-span-2">{p.gender ?? "—"}</dd>
            <dt className="text-muted-foreground">Religion</dt><dd className="col-span-2">{p.religion ?? "—"}</dd>
            <dt className="text-muted-foreground">Languages</dt><dd className="col-span-2">{data.languages.join(", ") || "—"}</dd>
          </dl>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Education</h2>
          {data.educations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No education added.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.educations.map((e) => (
                <li key={e.id} className="rounded-md border p-3">
                  <p className="font-medium">
                    {[e.degree_type, e.field_of_study].filter(Boolean).join(" in ") || e.degree_level || "Degree"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[e.university, e.graduation_year].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-3 md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Skills</h2>
          {Object.keys(skillsByCat).length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills added.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(skillsByCat).map(([cat, names]) => (
                <div key={cat}>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{cat}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {names.map((n) => (
                      <span key={n} className="rounded-full border bg-accent/40 px-2.5 py-0.5 text-xs">{n}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analytics only when onboarding is complete */}
      {!p.onboarding_complete ? (
        <div className="rounded-xl border bg-card p-6 text-center space-y-3">
          <p className="text-sm font-semibold">Profile in progress</p>
          <p className="text-sm text-muted-foreground">Complete your onboarding to unlock DISC, cognitive style and team comparisons.</p>
          <Button size="sm" onClick={() => navigate({ to: "/onboarding" })}>Continue onboarding</Button>
        </div>
      ) : (
        <>
          {/* DISC */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">DISC profile</h2>
            {data.disc ? (
              <>
                <DiscBar d={data.disc.d} i={data.disc.i} s={data.disc.s} c={data.disc.c} showInterpretation={false} />
                {p.disc_interpretation && (
                  <p className="text-sm text-foreground/90 leading-relaxed border-t pt-3">{p.disc_interpretation}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No DISC results yet.</p>
            )}
          </div>

          {/* Cognitive radar */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cognitive thinking style</h2>
            {data.cognitive ? (
              <CognitiveRadar
                a={data.cognitive.analytical} p={data.cognitive.practical}
                r={data.cognitive.relational} e={data.cognitive.experimental}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No cognitive results yet.</p>
            )}
          </div>

          {/* Problem solving */}
          {p.problem_solving_style && (
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Problem-solving style</h2>
              <Bars items={[
                ["Structured", p.problem_solving_style.structured_problem_solving, "Methodical, step-by-step approach."],
                ["Exploratory", p.problem_solving_style.exploratory_problem_solving, "Experimentation and discovery."],
              ]} />
            </div>
          )}

          {/* Information processing */}
          {p.information_processing_style && (
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Information processing</h2>
              <Bars items={[
                ["Depth-oriented", p.information_processing_style.depth_oriented_processing],
                ["Breadth-oriented", p.information_processing_style.breadth_oriented_processing],
                ["Structured info", p.information_processing_style.structured_information_preference],
                ["Unstructured info", p.information_processing_style.unstructured_information_preference],
              ]} />
            </div>
          )}

          {/* Meta-cognition */}
          {typeof p.meta_cognition_score === "number" && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Meta-cognition</h2>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-semibold tabular-nums">{p.meta_cognition_score}</div>
                <p className="text-sm text-muted-foreground">Self-assessed average of reflection, openness to update, and bias awareness.</p>
              </div>
            </div>
          )}

          {/* Work style */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Work style</h2>
            {data.work_style ? (
              <Bars items={[
                ["Collaboration / teamwork", data.work_style.collaboration],
                ["Independent work", data.work_style.independent_work],
                ["Repetitive tasks", data.work_style.task_repetition],
                ["Idea generation / innovation", data.work_style.idea_generation],
              ]} />
            ) : (
              <p className="text-sm text-muted-foreground">No work style set yet.</p>
            )}
          </div>

          {/* Compare to team */}
          <div className="rounded-xl border bg-card p-5 space-y-5">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Compare to my {data.team.scope === "none" ? "team" : data.team.scope}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {data.team.scope === "none"
                  ? "No peers yet to compare against."
                  : `Compared against ${data.team.member_count} peer${data.team.member_count === 1 ? "" : "s"} in ${data.team.name ?? "your group"} (${data.team.scope}).`}
              </p>
            </div>

            {data.team.scope !== "none" && data.disc && data.team.disc_avg && (
              <div className="grid md:grid-cols-2 gap-4">
                <DiscBar title="You" d={data.disc.d} i={data.disc.i} s={data.disc.s} c={data.disc.c} showInterpretation={false} />
                <DiscBar title="Team average" d={data.team.disc_avg.d} i={data.team.disc_avg.i} s={data.team.disc_avg.s} c={data.team.disc_avg.c} showInterpretation={false} />
              </div>
            )}

            {data.team.scope !== "none" && data.cognitive && data.team.cognitive_avg && (
              <CognitiveRadar
                title="Cognitive: you vs team"
                a={data.cognitive.analytical} p={data.cognitive.practical}
                r={data.cognitive.relational} e={data.cognitive.experimental}
                peerA={data.team.cognitive_avg.analytical} peerP={data.team.cognitive_avg.practical}
                peerR={data.team.cognitive_avg.relational} peerE={data.team.cognitive_avg.experimental}
              />
            )}

            {data.team.scope !== "none" && (alignDiff.align.length > 0 || alignDiff.differ.length > 0) && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-md border bg-success/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Where I align</p>
                  {alignDiff.align.length ? (
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {alignDiff.align.map((x) => <li key={x}>{x}</li>)}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground">Nothing within 8 points.</p>}
                </div>
                <div className="rounded-md border bg-warning/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Where I differ</p>
                  {alignDiff.differ.length ? (
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {alignDiff.differ.map((x) => <li key={x}>{x}</li>)}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground">You closely match your team.</p>}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
