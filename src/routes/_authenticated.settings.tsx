import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getOrgSnapshot } from "@/lib/ci.functions";
import { createInvite } from "@/lib/onboarding.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Collective Intelligence Design" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const getSnap = useServerFn(getOrgSnapshot);
  const invite = useServerFn(createInvite);
  const { data: snap } = useQuery({ queryKey: ["org-snapshot"], queryFn: () => getSnap() as any });

  const [email, setEmail] = useState("");
  const [lastToken, setLastToken] = useState<string | null>(null);

  const inviteMut = useMutation({
    mutationFn: (email: string) => invite({ data: { email } }) as any,
    onSuccess: (r: any) => { setLastToken(r.token); toast.success("Invite created"); setEmail(""); },
    onError: (e: any) => toast.error(e.message),
  });

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!snap) return <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-muted-foreground">Loading…</div>;

  const inviteUrl = lastToken ? `${window.location.origin}/signup?invite=${lastToken}` : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Your account, workspace and invitations.</p>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Workspace</h2>
        <p className="text-sm text-muted-foreground">{snap.org.name} · {snap.members.length} member{snap.members.length === 1 ? "" : "s"}</p>
      </section>

      {snap.isAdmin && (
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <div>
            <h2 className="font-semibold">Invite employees</h2>
            <p className="text-sm text-muted-foreground">Send people a link to join your workspace and complete the onboarding.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); inviteMut.mutate(email); }} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
            </div>
            <Button type="submit" disabled={inviteMut.isPending}>{inviteMut.isPending ? "Creating…" : "Create invite"}</Button>
          </form>
          {inviteUrl && (
            <div className="rounded-md border bg-accent/40 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Share this link</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate text-xs">{inviteUrl}</code>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Copied"); }}>Copy</Button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">Re-take an assessment or edit your details.</p>
        <Button asChild variant="outline" className="mt-3"><a href="/onboarding">Re-take onboarding</a></Button>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Account</h2>
        <Button variant="destructive" className="mt-3" onClick={signOut}>Sign out</Button>
      </section>
    </div>
  );
}
