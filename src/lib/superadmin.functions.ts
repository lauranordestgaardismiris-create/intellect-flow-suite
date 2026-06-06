import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertSuperadmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: superadmin only");
}

export const isSuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "superadmin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { isSuperAdmin: !!data };
  });

export type OrgRow = {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
  ci_score: number | null;
  admin_emails: string[];
};

export const getAllOrgs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertSuperadmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orgs, error: oErr } = await supabaseAdmin
      .from("organizations")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    if (oErr) throw new Error(oErr.message);

    const ids = (orgs ?? []).map((o: any) => o.id);
    if (ids.length === 0) return { orgs: [] as OrgRow[] };

    const [{ data: profiles }, { data: scores }, { data: roles }, { data: entities }] = await Promise.all([
      supabaseAdmin.from("profiles").select("org_id, email").in("org_id", ids),
      supabaseAdmin.from("ci_scores").select("org_id, entity_id, score, computed_at").in("org_id", ids),
      supabaseAdmin.from("user_roles").select("org_id, user_id, role").in("org_id", ids).eq("role", "org_admin"),
      supabaseAdmin.from("entities").select("id, org_id, type").in("org_id", ids).eq("type", "company"),
    ]);

    const adminUserIds = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    let userEmailMap: Record<string, string> = {};
    if (adminUserIds.length) {
      const { data: adminProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", adminUserIds);
      userEmailMap = Object.fromEntries((adminProfiles ?? []).map((p: any) => [p.id, p.email ?? ""]));
    }

    const companyEntityByOrg: Record<string, string> = {};
    (entities ?? []).forEach((e: any) => { companyEntityByOrg[e.org_id] = e.id; });

    const result: OrgRow[] = (orgs ?? []).map((o: any) => {
      const memberCount = (profiles ?? []).filter((p: any) => p.org_id === o.id).length;
      const companyEntity = companyEntityByOrg[o.id];
      const orgScores = (scores ?? [])
        .filter((s: any) => s.org_id === o.id && (companyEntity ? s.entity_id === companyEntity : true))
        .sort((a: any, b: any) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime());
      const ciScore = orgScores.length ? Number(orgScores[0].score) : null;
      const adminEmails = (roles ?? [])
        .filter((r: any) => r.org_id === o.id)
        .map((r: any) => userEmailMap[r.user_id])
        .filter(Boolean);
      return {
        id: o.id,
        name: o.name,
        created_at: o.created_at,
        member_count: memberCount,
        ci_score: ciScore,
        admin_emails: adminEmails,
      };
    });

    return { orgs: result };
  });

export const createOrgWithAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      org_name: z.string().min(1).max(200),
      admin_email: z.string().email().max(254),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertSuperadmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .insert({ name: data.org_name, created_by: userId })
      .select("id")
      .single();
    if (orgErr) throw new Error(orgErr.message);

    const { error: entErr } = await supabaseAdmin
      .from("entities")
      .insert({ org_id: org.id, name: data.org_name, type: "company" });
    if (entErr) throw new Error(entErr.message);

    const { error: wErr } = await supabaseAdmin
      .from("ci_weights")
      .insert({ org_id: org.id });
    if (wErr && !String(wErr.message).includes("duplicate")) throw new Error(wErr.message);

    const { data: invite, error: invErr } = await (supabaseAdmin as any)
      .from("admin_invites")
      .insert({ email: data.admin_email, org_id: org.id, created_by: userId })
      .select("token")
      .single();
    if (invErr) throw new Error(invErr.message);

    return { org_id: org.id, invite_token: invite.token };
  });

export const getAdminInviteByToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(1).max(200) }).parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite, error } = await (supabaseAdmin as any)
      .from("admin_invites")
      .select("email, org_id, used_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) return { valid: false, reason: error.message };
    if (!invite) return { valid: false, reason: "Invite not found" };
    if (invite.used_at) return { valid: false, reason: "Invite already used" };
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", invite.org_id)
      .maybeSingle();
    return { valid: true, org_name: org?.name ?? null, email: invite.email };
  });

export const claimAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(1).max(200) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite, error } = await (supabaseAdmin as any)
      .from("admin_invites")
      .select("id, org_id, used_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found");
    if (invite.used_at) throw new Error("Invite already used");

    const { error: updErr } = await (supabaseAdmin as any)
      .from("admin_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);
    if (updErr) throw new Error(updErr.message);

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, org_id: invite.org_id, role: "org_admin" });
    if (roleErr && !String(roleErr.message).toLowerCase().includes("duplicate")) {
      throw new Error(roleErr.message);
    }

    return { ok: true, org_id: invite.org_id };
  });
