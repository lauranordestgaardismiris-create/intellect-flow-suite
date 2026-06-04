import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MyProfilePayload = {
  profile: {
    id: string;
    full_name: string;
    email: string | null;
    age: number | null;
    gender: string | null;
    religion: string | null;
    sexual_orientation: string | null;
    job_title: string | null;
    role_type: string | null;
    company: string | null;
    department: string | null;
    team: string | null;
    department_entity_id: string | null;
    team_entity_id: string | null;
    onboarding_complete: boolean;
    problem_solving_style: { structured_problem_solving: number; exploratory_problem_solving: number } | null;
    information_processing_style: {
      depth_oriented_processing: number;
      breadth_oriented_processing: number;
      structured_information_preference: number;
      unstructured_information_preference: number;
    } | null;
    meta_cognition_score: number | null;
    disc_interpretation: string | null;
    insights_summary_short: string | null;
    insights_summary_long: string | null;
  };
  educations: Array<{
    id: string; position: number; degree_level: string | null; degree_type: string | null;
    field_of_study: string | null; university: string | null; graduation_year: number | null;
  }>;
  languages: string[];
  skills: Array<{ name: string; category: string | null }>;
  disc: { d: number; i: number; s: number; c: number; dominant: string } | null;
  cognitive: { analytical: number; practical: number; relational: number; experimental: number; dominant: string } | null;
  work_style: { collaboration: number; independent_work: number; task_repetition: number; idea_generation: number } | null;
  team: {
    name: string | null;
    scope: "team" | "department" | "company" | "none";
    member_count: number;
    disc_avg: { d: number; i: number; s: number; c: number } | null;
    cognitive_avg: { analytical: number; practical: number; relational: number; experimental: number } | null;
  };
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyProfilePayload | null> => {
    const { supabase, userId, claims } = context as any;
    const email = claims?.email ?? null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, age, gender, job_title, role_type, org_id, department_entity_id, team_entity_id, onboarding_complete, problem_solving_style, information_processing_style, meta_cognition_score, disc_interpretation, insights_summary_short, insights_summary_long")
      .eq("id", userId).maybeSingle();
    if (!profile) return null;
    const { data: sensitiveRows } = await (supabase.rpc as any)("get_my_sensitive_profile");
    const sensitive = (sensitiveRows && sensitiveRows[0]) || { religion: null, sexual_orientation: null };

    const [
      { data: org },
      { data: deptEnt },
      { data: teamEnt },
      { data: edus },
      { data: pls },
      { data: pss },
      { data: disc },
      { data: cog },
      { data: ws },
    ] = await Promise.all([
      supabase.from("organizations").select("name").eq("id", profile.org_id).maybeSingle(),
      profile.department_entity_id
        ? supabase.from("entities").select("name").eq("id", profile.department_entity_id).maybeSingle()
        : Promise.resolve({ data: null }),
      profile.team_entity_id
        ? supabase.from("entities").select("name").eq("id", profile.team_entity_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("profile_educations").select("*").eq("profile_id", userId).order("position"),
      supabase.from("profile_languages").select("language_id, languages(name)").eq("profile_id", userId),
      supabase.from("profile_skills").select("skill_id, skills(name, category)").eq("profile_id", userId),
      supabase.from("disc_results").select("d, i, s, c, dominant").eq("profile_id", userId).maybeSingle(),
      supabase.from("cognitive_results").select("analytical, practical, relational, experimental, dominant").eq("profile_id", userId).maybeSingle(),
      supabase.from("work_style").select("collaboration, independent_work, task_repetition, idea_generation").eq("profile_id", userId).maybeSingle(),
    ]);

    // Team scope: prefer same team, fallback to same department, fallback to company.
    let scope: "team" | "department" | "company" | "none" = "none";
    let groupName: string | null = null;
    let peerIds: string[] = [];

    async function loadPeers(filterCol: string, filterVal: string): Promise<string[]> {
      const { data } = await supabase.from("profiles").select("id").eq("org_id", profile.org_id).eq(filterCol, filterVal);
      return (data ?? []).map((r: any) => r.id).filter((id: string) => id !== userId);
    }

    if (profile.team_entity_id) {
      peerIds = await loadPeers("team_entity_id", profile.team_entity_id);
      if (peerIds.length) { scope = "team"; groupName = teamEnt?.name ?? null; }
    }
    if (!peerIds.length && profile.department_entity_id) {
      peerIds = await loadPeers("department_entity_id", profile.department_entity_id);
      if (peerIds.length) { scope = "department"; groupName = deptEnt?.name ?? null; }
    }
    if (!peerIds.length) {
      const { data } = await supabase.from("profiles").select("id").eq("org_id", profile.org_id);
      peerIds = (data ?? []).map((r: any) => r.id).filter((id: string) => id !== userId);
      if (peerIds.length) { scope = "company"; groupName = org?.name ?? null; }
    }

    let discAvg: any = null, cogAvg: any = null;
    if (peerIds.length) {
      const [{ data: peerDisc }, { data: peerCog }] = await Promise.all([
        supabase.from("disc_results").select("d, i, s, c").in("profile_id", peerIds),
        supabase.from("cognitive_results").select("analytical, practical, relational, experimental").in("profile_id", peerIds),
      ]);
      if (peerDisc?.length) {
        const n = peerDisc.length;
        discAvg = {
          d: Math.round(peerDisc.reduce((a: number, r: any) => a + r.d, 0) / n),
          i: Math.round(peerDisc.reduce((a: number, r: any) => a + r.i, 0) / n),
          s: Math.round(peerDisc.reduce((a: number, r: any) => a + r.s, 0) / n),
          c: Math.round(peerDisc.reduce((a: number, r: any) => a + r.c, 0) / n),
        };
      }
      if (peerCog?.length) {
        const n = peerCog.length;
        cogAvg = {
          analytical: Math.round(peerCog.reduce((a: number, r: any) => a + r.analytical, 0) / n),
          practical: Math.round(peerCog.reduce((a: number, r: any) => a + r.practical, 0) / n),
          relational: Math.round(peerCog.reduce((a: number, r: any) => a + r.relational, 0) / n),
          experimental: Math.round(peerCog.reduce((a: number, r: any) => a + r.experimental, 0) / n),
        };
      }
    }

    // Generate & cache AI insights if missing and onboarding complete
    let insightsShort: string | null = profile.insights_summary_short ?? null;
    let insightsLong: string | null = profile.insights_summary_long ?? null;
    if (profile.onboarding_complete && (!insightsShort || !insightsLong)) {
      try {
        const aiOut = await generateProfileInsights({
          full_name: profile.full_name,
          disc,
          cognitive: cog,
          work_style: ws,
          problem_solving_style: profile.problem_solving_style ?? null,
          information_processing_style: profile.information_processing_style ?? null,
          meta_cognition_score: profile.meta_cognition_score ?? null,
        });
        if (aiOut) {
          insightsShort = aiOut.summary;
          insightsLong = aiOut.detail;
          await supabase
            .from("profiles")
            .update({ insights_summary_short: insightsShort, insights_summary_long: insightsLong })
            .eq("id", userId);
        }
      } catch (e) {
        console.error("Failed to generate profile insights:", e);
      }
    }

    return {
      profile: {
        id: profile.id, full_name: profile.full_name, email,
        age: profile.age, gender: profile.gender, religion: sensitive.religion,
        sexual_orientation: sensitive.sexual_orientation,
        job_title: profile.job_title, role_type: profile.role_type,
        company: org?.name ?? null,
        department: deptEnt?.name ?? null,
        team: teamEnt?.name ?? null,
        department_entity_id: profile.department_entity_id,
        team_entity_id: profile.team_entity_id,
        onboarding_complete: !!profile.onboarding_complete,
        problem_solving_style: profile.problem_solving_style ?? null,
        information_processing_style: profile.information_processing_style ?? null,
        meta_cognition_score: profile.meta_cognition_score ?? null,
        disc_interpretation: profile.disc_interpretation ?? null,
        insights_summary_short: insightsShort,
        insights_summary_long: insightsLong,
      },
      educations: (edus ?? []) as any,
      languages: (pls ?? []).map((r: any) => r.languages?.name).filter(Boolean),
      skills: (pss ?? []).map((r: any) => ({ name: r.skills?.name, category: r.skills?.category })).filter((s: any) => s.name),
      disc, cognitive: cog, work_style: ws,
      team: { name: groupName, scope, member_count: peerIds.length, disc_avg: discAvg, cognitive_avg: cogAvg },
    };
  });

async function generateProfileInsights(input: {
  full_name: string;
  disc: any;
  cognitive: any;
  work_style: any;
  problem_solving_style: any;
  information_processing_style: any;
  meta_cognition_score: number | null;
}): Promise<{ summary: string; detail: string } | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;

  const sys = `You are writing a personalised intelligence profile for a professional. Return STRICT JSON only, no markdown, no commentary, in the shape: {"summary": string, "detail": string}.
- "summary": 2-3 natural sentences, max 60 words. Describe this person's overall cognitive and working style by weaving all dimensions together into one coherent paragraph. Do not list scores. Do not mention percentages. Do not use first person.
- "detail": 4 short paragraphs, max 200 words total, separated by \\n\\n. Cover in order: (1) how their DISC profile and cognitive style interact, (2) what their work style scores suggest about their ideal environment, (3) what their problem-solving and information-processing styles reveal about how they handle complexity, (4) one actionable insight about where they likely add the most value in a team. Warm, specific, second person. No headings, no bullets.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Assessment data:\n${JSON.stringify(input, null, 2)}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    console.error("AI insights gateway error", res.status, await res.text().catch(() => ""));
    return null;
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed.summary === "string" && typeof parsed.detail === "string") {
      return { summary: parsed.summary, detail: parsed.detail };
    }
  } catch (e) {
    console.error("Failed to parse AI insights JSON:", content);
  }
  return null;
}
