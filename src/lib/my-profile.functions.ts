import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  computeSubScores, computeBehaviouralScore, computeDiversityScore, computeCombinedScore,
  computeBlindness,
} from "./ci-engine";

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
    completed_count: number;
    disc_avg: { d: number; i: number; s: number; c: number } | null;
    cognitive_avg: { analytical: number; practical: number; relational: number; experimental: number } | null;
    work_style_avg: { collaboration: number; independent_work: number; idea_generation: number } | null;
    meta_cognition_avg: number | null;
    scores: { score_a: number; score_b: number | null; score_c: number; blindness: number } | null;
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
    // Build the group as ALL profiles in scope (including self) for aggregate scores.
    let scope: "team" | "department" | "company" | "none" = "none";
    let groupName: string | null = null;
    let groupIds: string[] = [];

    async function loadGroup(filterCol: string | null, filterVal: string | null): Promise<string[]> {
      let q = supabase.from("profiles").select("id").eq("org_id", profile.org_id);
      if (filterCol && filterVal) q = q.eq(filterCol, filterVal);
      const { data } = await q;
      return (data ?? []).map((r: any) => r.id);
    }

    if (profile.team_entity_id) {
      groupIds = await loadGroup("team_entity_id", profile.team_entity_id);
      if (groupIds.length > 1) { scope = "team"; groupName = teamEnt?.name ?? null; }
    }
    if (groupIds.length <= 1 && profile.department_entity_id) {
      groupIds = await loadGroup("department_entity_id", profile.department_entity_id);
      if (groupIds.length > 1) { scope = "department"; groupName = deptEnt?.name ?? null; }
    }
    if (groupIds.length <= 1) {
      groupIds = await loadGroup(null, null);
      if (groupIds.length > 1) { scope = "company"; groupName = org?.name ?? null; }
    }

    const peerIds = groupIds.filter((id) => id !== userId);
    let discAvg: any = null, cogAvg: any = null, wsAvg: any = null, metaAvg: number | null = null;
    let teamScores: { score_a: number; score_b: number; score_c: number; blindness: number } | null = null;
    let completedCount = 0;

    if (groupIds.length > 1) {
      const [
        { data: groupProfiles },
        { data: groupDisc },
        { data: groupCog },
        { data: groupWs },
        { data: groupSkills },
      ] = await Promise.all([
        supabase.from("profiles").select("id, role_type, age, gender, nationalities, neurodivergence, disability, problem_solving_style, information_processing_style, meta_cognition_score, onboarding_complete").in("id", groupIds),
        supabase.from("disc_results").select("profile_id, d, i, s, c, dominant").in("profile_id", groupIds),
        supabase.from("cognitive_results").select("profile_id, analytical, practical, relational, experimental, dominant").in("profile_id", groupIds),
        supabase.from("work_style").select("profile_id, collaboration, independent_work, task_repetition, idea_generation").in("profile_id", groupIds),
        supabase.from("profile_skills").select("profile_id, skills(name)").in("profile_id", groupIds),
      ]);
      completedCount = (groupProfiles ?? []).filter((p: any) => p.onboarding_complete).length;

      // Peer-only averages for "your profile vs team" comparison
      const peerDisc = (groupDisc ?? []).filter((r: any) => r.profile_id !== userId);
      const peerCog = (groupCog ?? []).filter((r: any) => r.profile_id !== userId);
      const peerWs = (groupWs ?? []).filter((r: any) => r.profile_id !== userId);
      const peerMeta = (groupProfiles ?? [])
        .filter((p: any) => p.id !== userId && typeof p.meta_cognition_score === "number")
        .map((p: any) => Number(p.meta_cognition_score));
      const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      if (peerDisc.length) discAvg = {
        d: avg(peerDisc.map((r: any) => r.d)), i: avg(peerDisc.map((r: any) => r.i)),
        s: avg(peerDisc.map((r: any) => r.s)), c: avg(peerDisc.map((r: any) => r.c)),
      };
      if (peerCog.length) cogAvg = {
        analytical: avg(peerCog.map((r: any) => r.analytical)),
        practical: avg(peerCog.map((r: any) => r.practical)),
        relational: avg(peerCog.map((r: any) => r.relational)),
        experimental: avg(peerCog.map((r: any) => r.experimental)),
      };
      if (peerWs.length) wsAvg = {
        collaboration: avg(peerWs.map((r: any) => r.collaboration)),
        independent_work: avg(peerWs.map((r: any) => r.independent_work)),
        idea_generation: avg(peerWs.map((r: any) => r.idea_generation)),
      };
      if (peerMeta.length) metaAvg = avg(peerMeta);

      // Compute team-level CI scores (A/B/C) when at least 5 profiles completed
      if (completedCount >= 5) {
        const discById = new Map<string, any>(); for (const r of groupDisc ?? []) discById.set(r.profile_id, r);
        const cogById = new Map<string, any>(); for (const r of groupCog ?? []) cogById.set(r.profile_id, r);
        const wsById = new Map<string, any>(); for (const r of groupWs ?? []) wsById.set(r.profile_id, r);
        const skillsById = new Map<string, string[]>();
        for (const row of groupSkills ?? []) {
          const name = (row as any).skills?.name; if (!name) continue;
          const arr = skillsById.get((row as any).profile_id) ?? [];
          arr.push(name); skillsById.set((row as any).profile_id, arr);
        }
        const members = (groupProfiles ?? []).filter((p: any) => p.onboarding_complete).map((p: any) => {
          const d = discById.get(p.id); const c = cogById.get(p.id); const w = wsById.get(p.id);
          const pss = p.problem_solving_style ?? null; const ips = p.information_processing_style ?? null;
          return {
            role_type: p.role_type,
            skills: skillsById.get(p.id) ?? [],
            disc_dominant: d?.dominant ?? null,
            cognitive_dominant: c?.dominant ?? null,
            collaboration: w?.collaboration ?? 50,
            independent_work: w?.independent_work ?? 50,
            idea_generation: w?.idea_generation ?? 50,
            task_repetition: w?.task_repetition ?? 50,
            disc: d ? { d: d.d, i: d.i, s: d.s, c: d.c } : null,
            cognitive: c ? { analytical: c.analytical, practical: c.practical, relational: c.relational, experimental: c.experimental } : null,
            problem_solving: pss ? { structured: pss.structured_problem_solving ?? 0, exploratory: pss.exploratory_problem_solving ?? 0 } : null,
            information_processing: ips ? {
              depth: ips.depth_oriented_processing ?? 0, breadth: ips.breadth_oriented_processing ?? 0,
              structured: ips.structured_information_preference ?? 0, unstructured: ips.unstructured_information_preference ?? 0,
            } : null,
            meta_cognition: typeof p.meta_cognition_score === "number" ? p.meta_cognition_score : (p.meta_cognition_score != null ? Number(p.meta_cognition_score) : null),
            gender: p.gender ?? null, age: p.age ?? null,
            nationalities: p.nationalities ?? [],
            neurodivergence: p.neurodivergence ?? null, disability: p.disability ?? null,
          };
        });
        const sub = computeSubScores(members as any);
        const score_a = computeBehaviouralScore(sub);
        const score_b = computeDiversityScore(members as any);
        const score_c = computeCombinedScore(score_a, score_b);
        const blindness = computeBlindness(sub);
        teamScores = { score_a, score_b, score_c, blindness };
      }
    }

    // Generate & cache AI insights if missing and onboarding complete
    let insightsShort: string | null = profile.insights_summary_short ?? null;
    let insightsLong: string | null = profile.insights_summary_long ?? null;
    if (profile.onboarding_complete && (!insightsShort || !insightsLong)) {
      try {
        const aiOut = await generateProfileInsights({
          full_name: profile.full_name,
          disc, cognitive: cog, work_style: ws,
          problem_solving_style: profile.problem_solving_style ?? null,
          information_processing_style: profile.information_processing_style ?? null,
          meta_cognition_score: profile.meta_cognition_score ?? null,
        });
        if (aiOut) {
          insightsShort = aiOut.summary;
          insightsLong = aiOut.detail;
          await supabase.from("profiles").update({
            insights_summary_short: insightsShort, insights_summary_long: insightsLong,
          }).eq("id", userId);
        }
      } catch (e) { console.error("Failed to generate profile insights:", e); }
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
      team: {
        name: groupName, scope,
        member_count: groupIds.length,
        completed_count: completedCount,
        disc_avg: discAvg, cognitive_avg: cogAvg,
        work_style_avg: wsAvg, meta_cognition_avg: metaAvg,
        scores: teamScores,
      },
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
