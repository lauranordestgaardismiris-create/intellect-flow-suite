import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const lookupOrgInvite = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await (supabaseAdmin as any)
      .from("org_invites")
      .select("email, org_id, role, accepted_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!inv) return { valid: false, reason: "Invite not found" as const };
    if (inv.accepted_at) return { valid: false, reason: "Invite already used" as const };
    if (new Date(inv.expires_at).getTime() < Date.now()) return { valid: false, reason: "Invite expired" as const };
    const { data: org } = await supabaseAdmin.from("organizations").select("name").eq("id", inv.org_id).maybeSingle();
    return { valid: true as const, email: inv.email as string, org_name: org?.name ?? "", role: inv.role as string };
  });

export const acceptOrgInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(1).max(200), full_name: z.string().min(1).max(200) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: inv, error } = await (supabaseAdmin as any)
      .from("org_invites")
      .select("id, org_id, role, email, accepted_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Invite not found");
    if (inv.accepted_at) throw new Error("Invite already used");
    if (new Date(inv.expires_at).getTime() < Date.now()) throw new Error("Invite expired");

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authUser?.user?.email ?? inv.email;

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      org_id: inv.org_id,
      email,
      full_name: data.full_name,
      onboarding_complete: false,
    });

    await supabaseAdmin.from("user_roles").insert({ user_id: userId, org_id: inv.org_id, role: inv.role });

    await (supabaseAdmin as any).from("org_invites").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);

    return { ok: true, org_id: inv.org_id };
  });
