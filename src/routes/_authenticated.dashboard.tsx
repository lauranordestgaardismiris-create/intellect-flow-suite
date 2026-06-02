import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getOrgSnapshot, recomputeCIScores } from "@/lib/ci.functions";
import { generateInsights } from "@/lib/ai.functions";
import { getMyProfileStatus } from "@/lib/onboarding.functions";
import { CIGauge } from "@/components/ci-gauge";
import { CIHeatmap } from "@/components/ci-heatmap";
import { InsightsPanel } from "@/components/insights-panel";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Collective Intelligence Design" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getSnap = useServerFn(getOrgSnapshot);
  const recompute = useServerFn(recomputeCIScores);
  const aiInsights = useServerFn(generateInsights);
  const getStatus = useServerFn(getMyProfileStatus);

  const { data: status } = useQuery({ queryKey: ["profile-status"], queryFn: () => getStatus() as any });
  useEffect(() => {
    if (status && (!status.profile || !status.profile.onboarding_complete)) navigate({ to: "/onboarding" });
  }, [status, navigate]);

  const { data: snap, isLoading } = useQuery({
    queryKey: ["org-snapshot"],
    queryFn: () => getSnap() as any,
    enabled: !!status?.profile?.onboarding_complete,
  });

  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [lenses, setLenses] = useState<string[]>([
    "skill_radar", "disc_pie", "cognitive_pie", "collab_innov", "role_bar", "automation",
  ]);
  const [aiContent, setAiContent] = useState<string | null>(null);

  // Load saved preferences
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

  const entityList = useMemo(() => {
    if (!snap) return [];
    const company = snap.entities.find((e: any) => e.type === "company");
    const others = snap.entities.filter((e: any) => e.type !== "company");
    return [...(company ? [company] : []), ...others];
  }, [snap]);

  const selected = selectedEntity ?? snap?.entities.find((e: any) => e.type === "company")?.id ?? snap?.entities[0]?.id ?? null;

  const selectedScore = useMemo(() => {
    if (!snap || !selected) return null;
    return snap.scores.find((s: any) => s.entity_id === selected) ?? null;
  }, [snap, selected]);

  const selectedMembers = useMemo(() => {
    if (!snap || !selected) return [];
    const e = snap.entities.find((x: any) => x.id === selected);
    if (!e) return [];
    if (e.type === "company") return snap.members;
    if (e.type === "department") return snap.members.filter((m: any) => m.department_entity_id === selected);
    return snap.members.filter((m: any) => m.team_entity_id === selected);
  }, [snap, selected]);

  const heatmapCells = useMemo(() => {
    if (!snap) return [];
    return snap.entities
      .filter((e: any) => e.type !== "company")
      .map((e: any) => {
        const s = snap.scores.find((x: any) => x.entity_id === e.id);
        return { id: e.id, name: e.name, type: e.type, score: s?.score ?? 0, total_users: s?.total_users ?? 0 };
      });
  }, [snap]);

  if (isLoading || !snap) {
    return <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-muted-foreground">Loading your workspace…</div>;
  }

  const selectedEntityObj = snap.entities.find((e: any) => e.id === selected);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{snap.org.name}</h1>
          <p className="text-sm text-muted-foreground">{snap.members.length} member{snap.members.length === 1 ? "" : "s"} · {snap.isAdmin ? "Admin" : "Employee"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => recomputeMut.mutate()} disabled={recomputeMut.isPending}>
          {recomputeMut.isPending ? "Recomputing…" : "Recompute scores"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center">
          <CIGauge score={selectedScore?.score ?? 0} label={selectedEntityObj?.name ?? "Company"} />
          <p className="mt-2 text-xs text-muted-foreground">{selectedScore?.total_users ?? 0} members in this view</p>
        </div>
        <div className="rounded-xl border bg-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">CI distribution</h2>
            <p className="text-xs text-muted-foreground">Click a cell to drill in</p>
          </div>
          <CIHeatmap cells={heatmapCells} onSelect={setSelectedEntity} selectedId={selected} />
          {heatmapCells.length === 0 && snap.isAdmin && (
            <p className="text-sm text-muted-foreground mt-3">Once members join with department info, scores light up here.</p>
          )}
        </div>
      </div>

      {/* Entity selector */}
      <div className="flex flex-wrap gap-2">
        {entityList.map((e: any) => (
          <button key={e.id} onClick={() => setSelectedEntity(e.id)}
            className={`text-xs rounded-full border px-3 py-1 ${selected === e.id ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
            <span className="uppercase tracking-wider opacity-70 mr-1">{e.type}</span>{e.name}
          </button>
        ))}
      </div>

      <InsightsPanel members={selectedMembers as any} lenses={lenses} onChangeLenses={saveLenses} />

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">AI insights</h2>
            <p className="text-xs text-muted-foreground">Hiring, optimization and automation suggestions grounded in this entity's data.</p>
          </div>
          <Button size="sm" onClick={() => selected && aiMut.mutate(selected)} disabled={!selected || aiMut.isPending}>
            {aiMut.isPending ? "Thinking…" : "Generate"}
          </Button>
        </div>
        {aiContent ? (
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed">{aiContent}</div>
        ) : (
          <p className="text-sm text-muted-foreground">Press Generate to get tailored suggestions for <strong>{selectedEntityObj?.name}</strong>.</p>
        )}
      </div>

      <div className="rounded-xl border border-dashed bg-muted/30 p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Layer 2 — Coming soon</p>
        <h3 className="mt-1 font-semibold">Collective Blindness</h3>
        <p className="text-sm text-muted-foreground mt-1">
          A future layer that mathematically detects what your organization is structurally unable to see — combining missing roles, cognitive bias and skill voids into a single blind-spot score.
        </p>
      </div>
    </div>
  );
}
