import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getOrgSnapshot, recomputeCIScores } from "@/lib/ci.functions";
import { generateInsights } from "@/lib/ai.functions";
import { getMyProfileStatus } from "@/lib/onboarding.functions";
import { CIGauge } from "@/components/ci-gauge";
import { ScoreCircle } from "@/components/score-circle";
import { InsightsPanel } from "@/components/insights-panel";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Collective Intelligence Design" }] }),
  component: DashboardPage,
});

const MANAGER_ROLES = new Set(["manager", "team_lead", "senior_management", "executive"]);
const DISC_LABEL: Record<string, string> = { D: "Dominance", I: "Influence", S: "Steadiness", C: "Conscientiousness" };
const COG_LABEL: Record<string, string> = { analytical: "Analytical", practical: "Practical", relational: "Strategic", experimental: "Creative" };

function DistroBars({ title, items }: { title: string; items: Array<{ name: string; value: number }> }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.name} className="grid grid-cols-[110px_1fr_40px] items-center gap-2 text-sm">
            <span className="truncate">{it.name}</span>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${(it.value / max) * 100}%` }} />
            </div>
            <span className="text-right text-xs tabular-nums text-muted-foreground">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getSnap = useServerFn(getOrgSnapshot);
  const recompute = useServerFn(recomputeCIScores);
  const aiInsights = useServerFn(generateInsights);
  const getStatus = useServerFn(getMyProfileStatus);

  const { data: status } = useQuery({ queryKey: ["profile-status"], queryFn: () => getStatus() as any });

  const { data: snap, isLoading } = useQuery({
    queryKey: ["org-snapshot"],
    queryFn: () => getSnap() as any,
    enabled: !!status?.profile?.onboarding_complete,
  });

  // Determine role: org_admin from user_roles → admin; else inspect profile.role_type for manager.
  const isAdmin = status?.role === "org_admin";
  const myProfile = useMemo(() => snap?.members?.find((m: any) => m.id === status?.profile?.id), [snap, status]);
  const isManager = !isAdmin && !!myProfile && MANAGER_ROLES.has(myProfile.role_type ?? "");

  useEffect(() => {
    if (!status) return;
    if (!status.profile || !status.profile.onboarding_complete) {
      navigate({ to: "/onboarding" });
      return;
    }
    if (!isAdmin && !isManager && snap) {
      // Plain employees still go to /my-profile
      navigate({ to: "/my-profile" });
    }
  }, [status, snap, isAdmin, isManager, navigate]);

  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [lenses, setLenses] = useState<string[]>(["disc_pie", "cognitive_pie", "role_bar", "collab_innov"]);
  const [aiContent, setAiContent] = useState<string | null>(null);

  useEffect(() => {
    if (!status?.profile?.id) return;
    supabase.from("insights_preferences").select("lenses").eq("user_id", status.profile.id).maybeSingle().then(({ data }) => {
      if (data?.lenses && Array.isArray(data.lenses)) setLenses(data.lenses as string[]);
    });
  }, [status?.profile?.id]);

  function saveLenses(next: string[]) {
    setLenses(next);
    if (status?.profile?.id) {
      supabase.from("insights_preferences").upsert({ user_id: status.profile.id, lenses: next, updated_at: new Date().toISOString() });
    }
  }

  const recomputeMut = useMutation({
    mutationFn: () => recompute() as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["org-snapshot"] }); toast.success("Scores refreshed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const aiMut = useMutation({
    mutationFn: (entityId: string) => aiInsights({ data: { entityId } }) as any,
    onSuccess: (r: any) => setAiContent(r.content),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !snap) {
    return <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-muted-foreground">Loading your workspace…</div>;
  }

  // Manager scope = their team or department
  const managerEntityId = myProfile?.team_entity_id ?? myProfile?.department_entity_id ?? null;

  // For admin: "All Departments" is null selection
  const effectiveSelection = isAdmin ? selectedEntity : managerEntityId;

  function membersIn(entityId: string | null) {
    if (!entityId) return snap.members;
    const ent = snap.entities.find((e: any) => e.id === entityId);
    if (!ent) return [];
    if (ent.type === "company") return snap.members;
    if (ent.type === "department") return snap.members.filter((m: any) => m.department_entity_id === entityId);
    return snap.members.filter((m: any) => m.team_entity_id === entityId);
  }

  function scoresFor(entityId: string | null) {
    if (entityId) {
      const r = snap.scores.find((s: any) => s.entity_id === entityId);
      if (!r) return null;
      return {
        score_a: r.score_a ?? r.sub_scores?.score_a ?? r.score ?? 0,
        score_b: (r.score_b ?? r.sub_scores?.score_b ?? null) as number | null,
        score_c: r.score_c ?? r.sub_scores?.score_c ?? r.score ?? 0,
        blindness: r.sub_scores?.collective_blindness_score ?? 0,
        total_users: r.total_users ?? 0,
        confidence: r.sub_scores?.confidence ?? "—",
      };
    }
    // Aggregate across departments (weighted by total_users)
    const deptRows = snap.scores.filter((s: any) => {
      const ent = snap.entities.find((e: any) => e.id === s.entity_id);
      return ent && ent.type !== "company";
    });
    if (!deptRows.length) {
      // Fall back to company entity score
      const company = snap.entities.find((e: any) => e.type === "company");
      if (company) return scoresFor(company.id);
      return null;
    }
    const total = deptRows.reduce((a: number, r: any) => a + (r.total_users ?? 0), 0) || 1;
    const wmean = (key: string, sub = true) => Math.round(
      deptRows.reduce((acc: number, r: any) => acc + ((sub ? r.sub_scores?.[key] : r[key]) ?? 0) * (r.total_users ?? 0), 0) / total
    );
    return {
      score_a: wmean("score_a"),
      score_b: wmean("score_b"),
      score_c: wmean("score_c"),
      blindness: wmean("collective_blindness_score"),
      total_users: total,
      confidence: total >= 15 ? "high" : total >= 5 ? "medium" : "low",
    };
  }

  const selectedMembers = membersIn(effectiveSelection);
  const selectedScores = scoresFor(effectiveSelection);
  const selectedEntityObj = effectiveSelection ? snap.entities.find((e: any) => e.id === effectiveSelection) : null;
  const headerLabel = selectedEntityObj?.name ?? (isAdmin ? "All Departments" : "Your team");

  // Compositions
  const discDistro = useMemo(() => ["D", "I", "S", "C"].map((k) => ({
    name: DISC_LABEL[k], value: selectedMembers.filter((m: any) => m.disc_dominant === k).length,
  })), [selectedMembers]);
  const cogDistro = useMemo(() => ["analytical", "practical", "relational", "experimental"].map((k) => ({
    name: COG_LABEL[k], value: selectedMembers.filter((m: any) => m.cognitive_dominant === k).length,
  })), [selectedMembers]);
  const roleDistro = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of selectedMembers) {
      const key = (m.role_type ?? "unknown").replace(/_/g, " ");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [selectedMembers]);

  const completedPct = selectedMembers.length
    ? Math.round(selectedMembers.filter((m: any) => m.onboarding_complete).length / selectedMembers.length * 100)
    : 0;

  // Admin: comparison rows per entity
  const comparisonRows = useMemo(() => {
    if (!isAdmin) return [];
    return snap.entities
      .filter((e: any) => e.type !== "company")
      .map((e: any) => {
        const sc = scoresFor(e.id);
        const members = membersIn(e.id);
        const completed = members.filter((m: any) => m.onboarding_complete).length;
        return {
          id: e.id, name: e.name, type: e.type,
          members: members.length,
          completedPct: members.length ? Math.round((completed / members.length) * 100) : 0,
          score_a: sc?.score_a ?? 0, score_b: (sc?.score_b ?? null) as number | null, score_c: sc?.score_c ?? 0,
          blindness: sc?.blindness ?? 0,
        };
      })
      .sort((a: any, b: any) => b.score_c - a.score_c);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, isAdmin]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{snap.org.name}</h1>
          <p className="text-sm text-muted-foreground">
            {headerLabel} · {selectedMembers.length} member{selectedMembers.length === 1 ? "" : "s"} ·{" "}
            {completedPct}% profiles complete
            {selectedScores ? <> · CI Score: <strong className="text-foreground">{selectedScores.score_c}</strong></> : null}
            <span className="ml-2 uppercase tracking-wider text-xs">· {isAdmin ? "Admin" : "Manager"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={selectedEntity ?? ""}
              onChange={(e) => setSelectedEntity(e.target.value || null)}
              className="text-sm rounded-md border bg-background px-2 py-1.5"
            >
              <option value="">All Departments</option>
              {snap.entities.filter((e: any) => e.type !== "company").map((e: any) => (
                <option key={e.id} value={e.id}>{e.type === "team" ? "Team — " : "Dept — "}{e.name}</option>
              ))}
            </select>
          )}
          <Button variant="outline" size="sm" onClick={() => recomputeMut.mutate()} disabled={recomputeMut.isPending}>
            {recomputeMut.isPending ? "Recomputing…" : "Recompute scores"}
          </Button>
        </div>
      </div>

      {/* Three CI circles + Blindness */}
      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Collective Intelligence — {headerLabel}
          </h2>
          {selectedScores ? (
            <div className="grid grid-cols-3 gap-4 justify-items-center">
              <ScoreCircle score={selectedScores.score_c} label="Collective Intelligence" />
              <ScoreCircle score={selectedScores.score_a} label="Behavioural Profile" />
              {selectedScores.score_b === null ? (
                <div className="flex flex-col items-center gap-2 text-center max-w-[160px]">
                  <div className="h-[120px] w-[120px] rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-[11px] text-muted-foreground px-3 leading-tight">
                    Not enough identity data to calculate
                  </div>
                  <span className="text-sm font-medium">Diversity Composition</span>
                </div>
              ) : (
                <ScoreCircle score={selectedScores.score_b} label="Diversity Composition" />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Once members complete their profiles, scores light up here.</p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center gap-3">
          <CIGauge score={selectedScores?.blindness ?? 0} label="Collective Blindness" />
          <p className="text-xs text-muted-foreground">
            Lower is better — measures structural blind spots in this {selectedEntityObj?.type ?? "group"}.
          </p>
        </div>
      </div>

      {/* Composition charts */}
      <div className="grid md:grid-cols-3 gap-4">
        <DistroBars title="DISC type distribution" items={discDistro} />
        <DistroBars title="Cognitive style distribution" items={cogDistro} />
        <DistroBars title="Role / seniority distribution" items={roleDistro} />
      </div>

      {/* Admin: department comparison table */}
      {isAdmin && !selectedEntity && comparisonRows.length > 0 && (
        <div className="rounded-xl border bg-card p-6 space-y-3 overflow-x-auto">
          <h2 className="text-lg font-semibold">Department comparison</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3">Entity</th>
                <th className="py-2 px-2">Members</th>
                <th className="py-2 px-2">CI Score</th>
                <th className="py-2 px-2">Behavioural (A)</th>
                <th className="py-2 px-2">Diversity (B)</th>
                <th className="py-2 px-2">Blindness</th>
                <th className="py-2 px-2">Complete %</th>
                <th className="py-2 pl-2"></th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-accent/30">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{r.type}</div>
                  </td>
                  <td className="py-2 px-2 tabular-nums">{r.members}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-3">
                      <ScoreCircle score={r.score_c} label="" size={60} />
                      <span className="tabular-nums font-semibold">{r.score_c}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 tabular-nums">{r.score_a}</td>
                  <td className="py-2 px-2 tabular-nums">{r.score_b}</td>
                  <td className="py-2 px-2 tabular-nums">{r.blindness}</td>
                  <td className="py-2 px-2 tabular-nums">{r.completedPct}%</td>
                  <td className="py-2 pl-2">
                    <button
                      className="text-xs underline text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedEntity(r.id)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Member list */}
      {(isManager || (isAdmin && selectedEntity)) && (
        <div className="rounded-xl border bg-card p-6 space-y-3 overflow-x-auto">
          <h2 className="text-lg font-semibold">Members</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 px-2">Role</th>
                <th className="py-2 px-2">Dominant DISC</th>
                <th className="py-2 px-2">Dominant Cognitive</th>
                {isAdmin && <>
                  <th className="py-2 px-2">Collab</th>
                  <th className="py-2 px-2">Innovation</th>
                  <th className="py-2 px-2">Meta-cog</th>
                </>}
                <th className="py-2 px-2">Profile</th>
              </tr>
            </thead>
            <tbody>
              {selectedMembers.map((m: any) => {
                const filled = [m.disc, m.cognitive, m.problem_solving, m.information_processing].filter(Boolean).length;
                const pct = Math.round((filled / 4) * 100);
                return (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{m.full_name}</div>
                      {m.job_title && <div className="text-xs text-muted-foreground">{m.job_title}</div>}
                    </td>
                    <td className="py-2 px-2">{(m.role_type ?? "—").replace(/_/g, " ")}</td>
                    <td className="py-2 px-2">{m.disc_dominant ? DISC_LABEL[m.disc_dominant] : "—"}</td>
                    <td className="py-2 px-2">{m.cognitive_dominant ? COG_LABEL[m.cognitive_dominant] : "—"}</td>
                    {isAdmin && <>
                      <td className="py-2 px-2 tabular-nums">{m.collaboration}</td>
                      <td className="py-2 px-2 tabular-nums">{m.idea_generation}</td>
                      <td className="py-2 px-2 tabular-nums">{m.meta_cognition ?? "—"}</td>
                    </>}
                    <td className="py-2 px-2 tabular-nums">{pct}%</td>
                  </tr>
                );
              })}
              {selectedMembers.length === 0 && (
                <tr><td colSpan={isAdmin ? 8 : 5} className="py-4 text-center text-muted-foreground">No members in this scope yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Insights + AI */}
      <InsightsPanel members={selectedMembers as any} lenses={lenses} onChangeLenses={saveLenses} />

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">AI insights</h2>
            <p className="text-xs text-muted-foreground">Hiring, optimization and automation suggestions grounded in this entity's data.</p>
          </div>
          <Button size="sm" onClick={() => effectiveSelection && aiMut.mutate(effectiveSelection)} disabled={!effectiveSelection || aiMut.isPending}>
            {aiMut.isPending ? "Thinking…" : "Generate"}
          </Button>
        </div>
        {aiContent ? (
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed">{aiContent}</div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {effectiveSelection
              ? <>Press Generate to get tailored suggestions for <strong>{headerLabel}</strong>.</>
              : <>Select a specific department to generate suggestions.</>}
          </p>
        )}
      </div>
    </div>
  );
}
