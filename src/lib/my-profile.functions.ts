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
      .select("id, full_name, age, gender, job_title, role_type, org_id, department_entity_id, team_entity_id")
      .eq("id", userId).maybeSingle();
    if (!profile) return null;
    const { data: sensitiveRows } = await supabase.rpc("get_my_sensitive_profile");
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
      },
      educations: (edus ?? []) as any,
      languages: (pls ?? []).map((r: any) => r.languages?.name).filter(Boolean),
      skills: (pss ?? []).map((r: any) => ({ name: r.skills?.name, category: r.skills?.category })).filter((s: any) => s.name),
      disc, cognitive: cog, work_style: ws,
      team: { name: groupName, scope, member_count: peerIds.length, disc_avg: discAvg, cognitive_avg: cogAvg },
    };
  });
