import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DIM_BY_ID, type DimensionId } from "@/lib/dimensions";

type Input = {
  entityId: string;
  dimension: DimensionId;
  score: number | null;
  // Compact distribution label/count pairs for grounding the AI insight.
  distribution: Array<{ label: string; count: number }>;
};

export const getVariableInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const meta = DIM_BY_ID[data.dimension];
    if (!meta) return { insight: "Dimension not recognised.", source: "fallback" as const };

    const { data: role } = await supabase
      .from("user_roles").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
    if (!role) return { insight: meta.fallbackInsight, source: "fallback" as const };
    const orgId = role.org_id;

    // Verify entity belongs to org and load cached insights.
    const { data: ent } = await supabase
      .from("entities").select("id, org_id").eq("id", data.entityId).maybeSingle();
    if (!ent || ent.org_id !== orgId) return { insight: meta.fallbackInsight, source: "fallback" as const };

    const { data: ci } = await supabase
      .from("ci_scores").select("variable_insights").eq("entity_id", data.entityId).maybeSingle();
    const cache = (ci?.variable_insights ?? {}) as Record<string, string>;
    if (cache && typeof cache[data.dimension] === "string" && cache[data.dimension].length > 0) {
      return { insight: cache[data.dimension], source: "cache" as const };
    }

    // Call Gemini for a single sentence.
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { insight: meta.fallbackInsight, source: "fallback" as const };

    const sys = `You write one short, plain-English sentence (max 28 words) describing what a team's score on a specific Collective Intelligence dimension means. No bullet lists, no markdown, no preface. Be specific to the score range and the distribution provided. Never invent member names.`;
    const user = `Dimension: ${meta.name}
What it measures: ${meta.description}
Team score (0–100, higher = more diverse/balanced, except meta-cognition which is an average): ${data.score ?? "n/a"}
Distribution: ${data.distribution.map((d) => `${d.label}: ${d.count}`).join(" · ") || "n/a"}
Write one sentence.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) return { insight: meta.fallbackInsight, source: "fallback" as const };
      const json: any = await res.json();
      const text = (json.choices?.[0]?.message?.content ?? "").trim();
      if (!text) return { insight: meta.fallbackInsight, source: "fallback" as const };

      // Cache into ci_scores.variable_insights JSONB.
      const next = { ...cache, [data.dimension]: text };
      await supabase.from("ci_scores").update({ variable_insights: next }).eq("entity_id", data.entityId);
      return { insight: text, source: "ai" as const };
    } catch {
      return { insight: meta.fallbackInsight, source: "fallback" as const };
    }
  });
