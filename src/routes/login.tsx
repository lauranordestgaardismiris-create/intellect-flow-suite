import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { LogoMark } from "@/components/logo-mark";


export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — Collective Intelligence Design" },
      { name: "description", content: "Sign in to your company workspace." }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function routeByRole() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: profile } = await supabase.from("profiles").select("onboarding_complete").eq("id", u.user.id).maybeSingle();
    if (!profile?.onboarding_complete) { navigate({ to: "/onboarding" }); return; }
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).limit(1).maybeSingle();
    navigate({ to: role?.role === "org_admin" ? "/dashboard" : "/my-profile" });
  }

  useEffect(() => { if (!loading && user) routeByRole(); }, [user, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    await routeByRole();
  }

  return (
    <div className="min-h-screen grid place-items-center px-4" style={{ background: "#F7F6FF" }}>
      <div
        className="w-full max-w-md p-10"
        style={{ background: "#FFFFFF", border: "0.5px solid #CECBF6", borderRadius: 12 }}
      >
        <div className="flex flex-col items-center text-center">
          <LogoMark size={32} />
          <p className="mt-3" style={{ fontSize: 15, fontWeight: 500, color: "#1A1045" }}>Collective Intelligence</p>
          <h1 className="mt-6" style={{ fontSize: 18, fontWeight: 500, color: "#1A1045" }}>Sign in</h1>
          <p className="mt-1" style={{ fontSize: 13, color: "rgba(30,64,175,0.75)" }}>Continue to your workspace.</p>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" style={{ fontSize: 12, color: "#3C3489" }}>Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" style={{ fontSize: 12, color: "#3C3489" }}>Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        <p className="mt-5 text-center" style={{ fontSize: 13, color: "rgba(30,64,175,0.75)" }}>
          New here? <Link to="/signup" style={{ color: "#6B4AE8", fontWeight: 500 }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}

