import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EducationSchema = z.object({
  degree_level: z.string().max(40).optional().nullable(),
  degree_type: z.string().max(40).optional().nullable(),
  field_of_study: z.string().max(120).optional().nullable(),
  university: z.string().max(120).optional().nullable(),
  graduation_year: z.number().int().min(1950).max(2100).optional().nullable(),
});

const OnboardingSchema = z.object({
  // organization
  mode: z.enum(["create", "invite"]),
  org_name: z.string().min(1).max(120).optional(),
  invite_token: z.string().optional(),
  // profile
  full_name: z.string().min(1).max(120),
  age: z.number().int().min(14).max(100).optional().nullable(),
  gender: z.string().max(60).optional().nullable(),
  religion: z.string().max(60).optional().nullable(),
  sexual_orientation: z.string().max(60).optional().nullable(),
  // demographic (optional)
  nationalities: z.array(z.string().min(1).max(60)).max(5).default([]),
  neurodivergence: z.string().max(200).optional().nullable(),
  disability: z.string().max(200).optional().nullable(),
  // education (up to 3)
  educations: z.array(EducationSchema).max(3).default([]),
  language_ids: z.array(z.string().uuid()).max(20).default([]),
  job_title: z.string().max(120).optional().nullable(),
  role_type: z.enum([
    "individual_contributor", "manager", "executive", "intern",
    "senior_management", "team_lead", "specialist", "consultant", "freelancer", "other",
  ]).optional().nullable(),
  years_experience_total: z.number().int().min(0).max(80).optional().nullable(),
  years_in_role: z.number().int().min(0).max(80).optional().nullable(),
  department_name: z.string().max(80).optional().nullable(),
  team_name: z.string().max(80).optional().nullable(),
  skill_ids: z.array(z.string().uuid()).max(80),
  // work style
  collaboration: z.number().int().min(0).max(100),
  independent_work: z.number().int().min(0).max(100),
  task_repetition: z.number().int().min(0).max(100),
  idea_generation: z.number().int().min(0).max(100),
  // problem solving style (0-100 each)
  problem_solving_style: z.object({
    structured_problem_solving: z.number().int().min(0).max(100),
    exploratory_problem_solving: z.number().int().min(0).max(100),
  }).optional().nullable(),
  // information processing style (0-100 each)
  information_processing_style: z.object({
    depth_oriented_processing: z.number().int().min(0).max(100),
    breadth_oriented_processing: z.number().int().min(0).max(100),
    structured_information_preference: z.number().int().min(0).max(100),
    unstructured_information_preference: z.number().int().min(0).max(100),
  }).optional().nullable(),
  // meta-cognition: three self-assessment items 0-100, aggregated mean stored as meta_cognition_score
  meta_cognition: z.object({
    reflects_before_decision: z.number().int().min(0).max(100),
    adjusts_thinking_when_wrong: z.number().int().min(0).max(100),
    aware_of_personal_biases: z.number().int().min(0).max(100),
  }).optional().nullable(),
  // DISC + Cognitive
  disc: z.object({ d: z.number(), i: z.number(), s: z.number(), c: z.number(), dominant: z.enum(["D","I","S","C"]) }),
  cognitive: z.object({ analytical: z.number(), practical: z.number(), relational: z.number(), experimental: z.number(), dominant: z.enum(["analytical","practical","relational","experimental"]) }),
});


export const submitOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => OnboardingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context as any;
    const email = claims.email ?? null;

    // Resolve org
    let orgId: string;
    if (data.mode === "create") {
      if (!data.org_name) throw new Error("Company name required");
      const { data: org, error } = await supabase.from("organizations").insert({ name: data.org_name, created_by: userId }).select("id").single();
      if (error) throw new Error(error.message);
      orgId = org.id;
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, org_id: orgId, role: "org_admin" });
      await supabase.from("entities").insert({ org_id: orgId, name: data.org_name, type: "company" });
      await supabase.from("ci_weights").insert({ org_id: orgId });
    } else {
      if (!data.invite_token) throw new Error("Invite token required");
      const { data: inv } = await supabaseAdmin.from("org_invites").select("id, org_id, role, expires_at, accepted_at").eq("token", data.invite_token).maybeSingle();
      if (!inv) throw new Error("Invalid invite");
      if (inv.accepted_at) throw new Error("Invite already used");
      if (new Date(inv.expires_at) < new Date()) throw new Error("Invite expired");
      orgId = inv.org_id;
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, org_id: orgId, role: inv.role });
      await supabaseAdmin.from("org_invites").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);
    }

    // Ensure department + team entities
    let deptId: string | null = null;
    let teamId: string | null = null;
    if (data.department_name) {
      const { data: existing } = await supabase.from("entities").select("id").eq("org_id", orgId).eq("type", "department").ilike("name", data.department_name).maybeSingle();
      if (existing) deptId = existing.id;
      else {
        const { data: c } = await supabase.from("entities").insert({ org_id: orgId, name: data.department_name, type: "department" }).select("id").maybeSingle();
        deptId = c?.id ?? null;
      }
    }
    if (data.team_name && deptId) {
      const { data: existing } = await supabase.from("entities").select("id").eq("org_id", orgId).eq("type", "team").eq("parent_id", deptId).ilike("name", data.team_name).maybeSingle();
      if (existing) teamId = existing.id;
      else {
        const { data: c } = await supabase.from("entities").insert({ org_id: orgId, name: data.team_name, type: "team", parent_id: deptId }).select("id").maybeSingle();
        teamId = c?.id ?? null;
      }
    }

    // Derive headline education fields from the first degree (back-compat with profiles.education_level/field_of_study)
    const firstEdu = data.educations[0];
    const educationLevel = firstEdu?.degree_level ?? null;
    const fieldOfStudy = firstEdu?.field_of_study ?? null;

    // Upsert profile
    const profileRow = {
      id: userId, org_id: orgId, email,
      full_name: data.full_name, age: data.age ?? null, gender: data.gender ?? null,
      religion: data.religion ?? null, sexual_orientation: data.sexual_orientation ?? null,
      nationalities: data.nationalities ?? [],
      neurodivergence: data.neurodivergence ?? null,
      disability: data.disability ?? null,
      education_level: educationLevel, field_of_study: fieldOfStudy,
      job_title: data.job_title ?? null, role_type: data.role_type ?? null,
      years_experience_total: data.years_experience_total ?? null,
      years_in_role: data.years_in_role ?? null,
      department_entity_id: deptId, team_entity_id: teamId,
      onboarding_complete: true, updated_at: new Date().toISOString(),
    };
    const { error: pe } = await supabase.from("profiles").upsert(profileRow, { onConflict: "id" });
    if (pe) throw new Error(pe.message);


    // Educations: wipe + reinsert
    await supabase.from("profile_educations").delete().eq("profile_id", userId);
    if (data.educations.length) {
      await supabase.from("profile_educations").insert(
        data.educations.map((e, i) => ({
          profile_id: userId,
          position: i,
          degree_level: e.degree_level ?? null,
          degree_type: e.degree_type ?? null,
          field_of_study: e.field_of_study ?? null,
          university: e.university ?? null,
          graduation_year: e.graduation_year ?? null,
        })),
      );
    }

    // Skills & languages
    await supabase.from("profile_skills").delete().eq("profile_id", userId);
    if (data.skill_ids.length) {
      await supabase.from("profile_skills").insert(data.skill_ids.map((skill_id) => ({ profile_id: userId, skill_id })));
    }
    await supabase.from("profile_languages").delete().eq("profile_id", userId);
    if (data.language_ids.length) {
      await supabase.from("profile_languages").insert(data.language_ids.map((language_id) => ({ profile_id: userId, language_id })));
    }

    await supabase.from("work_style").upsert({
      profile_id: userId,
      collaboration: data.collaboration, independent_work: data.independent_work,
      task_repetition: data.task_repetition, idea_generation: data.idea_generation,
      updated_at: new Date().toISOString(),
    }, { onConflict: "profile_id" });

    await supabase.from("disc_results").upsert({
      profile_id: userId, d: data.disc.d, i: data.disc.i, s: data.disc.s, c: data.disc.c,
      dominant: data.disc.dominant, completed_at: new Date().toISOString(),
    }, { onConflict: "profile_id" });

    await supabase.from("cognitive_results").upsert({
      profile_id: userId, ...data.cognitive, completed_at: new Date().toISOString(),
    }, { onConflict: "profile_id" });

    return { ok: true, orgId };
  });

export const getOnboardingCatalogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as any;
    const [{ data: skills }, { data: languages }] = await Promise.all([
      supabase.from("skills").select("id, name, category").order("category").order("name"),
      supabase.from("languages").select("id, name").order("name"),
    ]);
    return { skills: skills ?? [], languages: languages ?? [] };
  });

export const getMyProfileStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const [{ data: profile }, { data: role }] = await Promise.all([
      supabase.from("profiles").select("id, onboarding_complete, org_id").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role, org_id").eq("user_id", userId).limit(1).maybeSingle(),
    ]);
    return { profile, role: role?.role ?? null };
  });

export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: role } = await supabase.from("user_roles").select("org_id, role").eq("user_id", userId).limit(1).maybeSingle();
    if (!role || role.role !== "org_admin") throw new Error("Only admins can invite");
    const token = crypto.randomUUID() + "-" + crypto.randomUUID().slice(0, 8);
    const { data: inv, error } = await supabase.from("org_invites").insert({
      org_id: role.org_id, email: data.email, token, role: "employee", created_by: userId,
    }).select("token").single();
    if (error) throw new Error(error.message);
    return { token: inv.token };
  });

export const lookupInvite = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => z.object({ token: z.string().min(8).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { data: inv } = await supabaseAdmin.from("org_invites").select("id, org_id, email, accepted_at, expires_at").eq("token", data.token).maybeSingle();
    if (!inv) return { valid: false as const };
    if (inv.accepted_at) return { valid: false as const, reason: "already used" };
    if (new Date(inv.expires_at) < new Date()) return { valid: false as const, reason: "expired" };
    const { data: org } = await supabaseAdmin.from("organizations").select("name").eq("id", inv.org_id).maybeSingle();
    return { valid: true as const, email: inv.email, org_name: org?.name ?? "" };
  });
