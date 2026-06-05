import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { LogoMark } from "@/components/logo-mark";


export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "Create your workspace — Collective Intelligence Design" },
      { name: "description", content: "Create your company workspace or accept an invite." }],
  }),
  validateSearch: (s) => ({ invite: typeof s.invite === "string" ? s.invite : undefined }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { invite } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/onboarding", search: { invite } });
  }, [user, loading, navigate, invite]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding${invite ? `?invite=${invite}` : ""}` },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    navigate({ to: "/onboarding", search: { invite } });
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
          <h1 className="mt-6" style={{ fontSize: 18, fontWeight: 500, color: "#1A1045" }}>Create your account</h1>
          <p className="mt-1" style={{ fontSize: 13, color: "rgba(30,64,175,0.75)" }}>
            {invite ? "You're joining an existing company workspace." : "Start a new company workspace."}
          </p>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" style={{ fontSize: 12, color: "#3C3489" }}>Work email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" style={{ fontSize: 12, color: "#3C3489" }}>Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Continue"}</Button>
        </form>
        <p className="mt-5 text-center" style={{ fontSize: 13, color: "rgba(30,64,175,0.75)" }}>
          Already registered? <Link to="/login" style={{ color: "#6B4AE8", fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

