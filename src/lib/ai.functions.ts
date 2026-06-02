import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = { entityId: string };

export const generateInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: role } = await supabase.from("user_roles").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
    if (!role) throw new Error("No organization");
    const orgId = role.org_id;

    const { data: entity } = await supabase.from("entities").select("id, name, type, org_id").eq("id", data.entityId).single();
    if (!entity || entity.org_id !== orgId) throw new Error("Entity not in your org");

    const { data: ci } = await supabase.from("ci_scores").select("score, sub_scores, total_users").eq("entity_id", data.entityId).maybeSingle();
    if (!ci) throw new Error("No CI score yet — recompute first.");

    // aggregate skills + cognitive + disc distribution (server-side, never returns rows)
    const { data: profs } = await supabase.from("profiles").select("id, role_type, department_entity_id, team_entity_id").eq("org_id", orgId);
    const filtered = (profs ?? []).filter((p: any) => {
      if (entity.type === "company") return true;
      if (entity.type === "department") return p.department_entity_id === entity.id;
      return p.team_entity_id === entity.id;
    });
    const ids = filtered.map((p: any) => p.id);
    const [{ data: ps }, { data: dr }, { data: cr }, { data: ws }] = await Promise.all([
      supabase.from("profile_skills").select("profile_id, skills(name)").in("profile_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("disc_results").select("profile_id, dominant").in("profile_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("cognitive_results").select("profile_id, dominant").in("profile_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("work_style").select("collaboration, idea_generation, task_repetition, independent_work").in("profile_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    ]);
    const skillFreq: Record<string, number> = {};
    for (const r of ps ?? []) { const n = (r as any).skills?.name; if (n) skillFreq[n] = (skillFreq[n] ?? 0) + 1; }
    const discFreq: Record<string, number> = {};
    for (const r of dr ?? []) discFreq[r.dominant] = (discFreq[r.dominant] ?? 0) + 1;
    const cogFreq: Record<string, number> = {};
    for (const r of cr ?? []) cogFreq[r.dominant] = (cogFreq[r.dominant] ?? 0) + 1;
    const roleFreq: Record<string, number> = {};
    for (const p of filtered) { const rt = (p as any).role_type ?? "unspecified"; roleFreq[rt] = (roleFreq[rt] ?? 0) + 1; }
    const avg = (k: string) => (ws && ws.length) ? Math.round(ws.reduce((s: number, w: any) => s + (w[k] ?? 0), 0) / ws.length) : 0;

    const payload = {
      entity: { name: entity.name, type: entity.type, members: ci.total_users },
      ci_score: ci.score,
      sub_scores: ci.sub_scores,
      skills_top: Object.entries(skillFreq).sort((a, b) => b[1] - a[1]).slice(0, 10),
      disc_distribution: discFreq,
      cognitive_distribution: cogFreq,
      role_distribution: roleFreq,
      averages: { collaboration: avg("collaboration"), idea_generation: avg("idea_generation"), task_repetition: avg("task_repetition"), independent_work: avg("independent_work") },
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const sys = `You are an organizational design analyst. You receive anonymized, aggregated metrics for a company/department/team and produce concise, actionable Collective Intelligence insights. Reply in compact Markdown with three sections:
## Hiring suggestion
## Team optimization
## Automation risk
Each section is 2-4 sentences. Be specific, reference the strongest and weakest sub-scores by name, and tie recommendations to the data. Never invent members or names.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Entity data:\n\n${JSON.stringify(payload, null, 2)}` },
        ],
      }),
    });
    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI usage limit reached. Add credits in workspace settings.");
    if (!res.ok) throw new Error(`AI gateway error: ${res.status}`);
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "(no content)";

    await supabase.from("ai_suggestions").insert({ entity_id: entity.id, org_id: orgId, kind: "insights", content });

    return { content, payload };
  });
