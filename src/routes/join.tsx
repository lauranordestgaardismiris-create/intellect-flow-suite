import { createFileRoute, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { lookupOrgInvite, acceptOrgInvite } from "@/lib/join.functions";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/logo-mark";
import { z } from "zod";

const search = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/join")({
  validateSearch: (s) => search.parse(s),
  component: JoinPage,
});

function JoinPage() {
  const { token } = useSearch({ from: "/join" });
  const router = useRouter();
  const lookup = useServerFn(lookupOrgInvite);
  const accept = useServerFn(acceptOrgInvite);

  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "invalid"; reason: string }
    | { kind: "ready"; email: string; org_name: string }
  >({ kind: "loading" });

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState({ kind: "invalid", reason: "Missing invite token" }); return; }
    lookup({ data: { token } }).then((r) => {
      if (!r.valid) setState({ kind: "invalid", reason: r.reason });
      else setState({ kind: "ready", email: r.email, org_name: r.org_name });
    }).catch((e: any) => setState({ kind: "invalid", reason: e?.message ?? "Invalid invite" }));
  }, [token, lookup]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind !== "ready" || !token) return;
    setErr(null); setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: state.email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/onboarding` },
      });
      if (error) throw new Error(error.message);
      // Wait for session
      await new Promise((r) => setTimeout(r, 300));
      await accept({ data: { token, full_name: fullName } });
      router.navigate({ to: "/onboarding" });
    } catch (e: any) {
      setErr(e?.message ?? "Sign up failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4" style={{ background: "#F7F6FF" }}>
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><LogoMark size={28} withWordmark /></div>
        <div className="rounded-xl p-6" style={{ background: "#FFFFFF", border: "0.5px solid #CECBF6" }}>
          {state.kind === "loading" && <div style={{ color: "#7F77DD", fontSize: 13 }}>Checking invite…</div>}
          {state.kind === "invalid" && (
            <div>
              <h1 style={{ color: "#1A1045", fontSize: 20, fontWeight: 700 }}>Invite unavailable</h1>
              <p style={{ color: "#7F77DD", fontSize: 13, marginTop: 8 }}>{state.reason}</p>
            </div>
          )}
          {state.kind === "ready" && (
            <form onSubmit={submit}>
              <h1 style={{ color: "#1A1045", fontSize: 20, fontWeight: 700 }}>Join {state.org_name}</h1>
              <p style={{ color: "#7F77DD", fontSize: 13, marginTop: 4 }}>Create your account to continue.</p>
              <div className="mt-5 space-y-4">
                <div>
                  <label style={{ color: "#1A1045", fontSize: 12, fontWeight: 500 }}>Email</label>
                  <input value={state.email} disabled className="mt-1 w-full rounded-md"
                    style={{ border: "0.5px solid #CECBF6", padding: "9px 14px", fontSize: 13, color: "#7F77DD", background: "#F7F6FF" }} />
                </div>
                <div>
                  <label style={{ color: "#1A1045", fontSize: 12, fontWeight: 500 }}>Full name</label>
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-md"
                    style={{ border: "0.5px solid #CECBF6", padding: "9px 14px", fontSize: 13, color: "#1A1045", background: "#FFFFFF", outline: "none" }} />
                </div>
                <div>
                  <label style={{ color: "#1A1045", fontSize: 12, fontWeight: 500 }}>Password</label>
                  <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-md"
                    style={{ border: "0.5px solid #CECBF6", padding: "9px 14px", fontSize: 13, color: "#1A1045", background: "#FFFFFF", outline: "none" }} />
                </div>
              </div>
              {err && <div className="mt-3" style={{ color: "#EF4444", fontSize: 12 }}>{err}</div>}
              <button type="submit" disabled={submitting}
                className="mt-6 w-full rounded-md text-white py-2"
                style={{ background: "#6B4AE8", fontSize: 13, fontWeight: 500, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
