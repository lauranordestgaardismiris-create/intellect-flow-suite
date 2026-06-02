import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeCI, computeSubScores, automationRisk, type MemberRow } from "./ci-engine";

type OrgSnapshot = {
  org: { id: string; name: string };
  isAdmin: boolean;
  entities: Array<{ id: string; name: string; type: "company" | "department" | "team"; parent_id: string | null }>;
  members: Array<MemberRow & { id: string; full_name: string; department_entity_id: string | null; team_entity_id: string | null; job_title: string | null }>;
  scores: Array<{ entity_id: string; score: number; sub_scores: any; total_users: number }>;
};

async function buildSnapshot(supabase: any, userId: string): Promise<OrgSnapshot | null> {
  const { data: roleRow } = await supabase
    .from("user_roles").select("org_id, role").eq("user_id", userId).limit(1).maybeSingle();
  if (!roleRow) return null;
  const orgId = roleRow.org_id;
  const isAdmin = roleRow.role === "org_admin";

  const [{ data: org }, { data: entities }, { data: profiles }, { data: ps }, { data: ws }, { data: dr }, { data: cr }, { data: scores }] = await Promise.all([
    supabase.from("organizations").select("id, name").eq("id", orgId).single(),
    supabase.from("entities").select("id, name, type, parent_id").eq("org_id", orgId),
    supabase.from("profiles").select("id, full_name, role_type, department_entity_id, team_entity_id, job_title").eq("org_id", orgId),
    supabase.from("profile_skills").select("profile_id, skill_id, skills(name)"),
    supabase.from("work_style").select("profile_id, collaboration, independent_work, task_repetition, idea_generation"),
    supabase.from("disc_results").select("profile_id, dominant"),
    supabase.from("cognitive_results").select("profile_id, dominant"),
    supabase.from("ci_scores").select("entity_id, score, sub_scores, total_users").eq("org_id", orgId),
  ]);

  const skillsByProfile = new Map<string, string[]>();
  for (const row of ps ?? []) {
    const name = (row as any).skills?.name;
    if (!name) continue;
    const arr = skillsByProfile.get(row.profile_id) ?? [];
    arr.push(name);
    skillsByProfile.set(row.profile_id, arr);
  }
  const wsByProfile = new Map<string, any>(); for (const r of ws ?? []) wsByProfile.set(r.profile_id, r);
  const drByProfile = new Map<string, any>(); for (const r of dr ?? []) drByProfile.set(r.profile_id, r);
  const crByProfile = new Map<string, any>(); for (const r of cr ?? []) crByProfile.set(r.profile_id, r);

  const members = (profiles ?? []).map((p: any) => {
    const w = wsByProfile.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      job_title: p.job_title,
      role_type: p.role_type,
      department_entity_id: p.department_entity_id,
      team_entity_id: p.team_entity_id,
      skills: skillsByProfile.get(p.id) ?? [],
      disc_dominant: drByProfile.get(p.id)?.dominant ?? null,
      cognitive_dominant: crByProfile.get(p.id)?.dominant ?? null,
      collaboration: w?.collaboration ?? 50,
      idea_generation: w?.idea_generation ?? 50,
      task_repetition: w?.task_repetition ?? 50,
    };
  });

  return {
    org: org!,
    isAdmin,
    entities: entities ?? [],
    members,
    scores: scores ?? [],
  };
}

export const getOrgSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const snap = await buildSnapshot(supabase, userId);
    return snap;
  });

export const recomputeCIScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const snap = await buildSnapshot(supabase, userId);
    if (!snap) throw new Error("No organization found");
    const { org, entities, members } = snap;

    // Company-level (members that have any entity)
    const all = members;
    const companyEntity = entities.find((e) => e.type === "company");
    const rows: any[] = [];

    function pushFor(entityId: string, group: typeof members) {
      const sub = computeSubScores(group as any);
      const score = computeCI(sub);
      rows.push({ entity_id: entityId, org_id: org.id, score, sub_scores: sub, total_users: group.length, computed_at: new Date().toISOString() });
    }

    if (companyEntity) pushFor(companyEntity.id, all);
    for (const e of entities) {
      if (e.type === "department") {
        const g = members.filter((m) => m.department_entity_id === e.id);
        pushFor(e.id, g);
      } else if (e.type === "team") {
        const g = members.filter((m) => m.team_entity_id === e.id);
        pushFor(e.id, g);
      }
    }
    if (rows.length > 0) {
      await supabase.from("ci_scores").upsert(rows, { onConflict: "entity_id" });
    }
    return { ok: true, count: rows.length };
  });

export const ensureCompanyEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data: roleRow } = await supabase
      .from("user_roles").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
    if (!roleRow) return { ok: false };
    const orgId = roleRow.org_id;
    const { data: existing } = await supabase.from("entities").select("id").eq("org_id", orgId).eq("type", "company").maybeSingle();
    if (existing) return { ok: true, id: existing.id };
    const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).single();
    const { data: created } = await supabase.from("entities").insert({ org_id: orgId, name: org!.name, type: "company" }).select("id").single();
    return { ok: true, id: created!.id };
  });

export { automationRisk };
