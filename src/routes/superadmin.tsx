import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { isSuperAdmin, getAllOrgs, createOrgWithAdmin, type OrgRow } from "@/lib/superadmin.functions";
import { LogoMark } from "@/components/logo-mark";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/superadmin")({
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const checkSuper = useServerFn(isSuperAdmin);
  const fetchOrgs = useServerFn(getAllOrgs);
  const createOrg = useServerFn(createOrgWithAdmin);

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ token: string; org_name: string; admin_email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.navigate({ to: "/login" }); return; }
    checkSuper().then((r) => {
      if (!r.isSuperAdmin) { router.navigate({ to: "/dashboard" }); return; }
      setAllowed(true);
    }).catch(() => router.navigate({ to: "/dashboard" }));
  }, [user, loading, router, checkSuper]);

  useEffect(() => {
    if (!allowed) return;
    setLoadingOrgs(true);
    fetchOrgs().then((r) => setOrgs(r.orgs)).finally(() => setLoadingOrgs(false));
  }, [allowed, fetchOrgs]);

  if (!allowed) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  const inviteLink = inviteResult
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?admin_invite=${inviteResult.token}`
    : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await createOrg({ data: { org_name: orgName, admin_email: adminEmail } });
      setInviteResult({ token: r.invite_token, org_name: orgName, admin_email: adminEmail });
      setOrgName("");
      setAdminEmail("");
      const refreshed = await fetchOrgs();
      setOrgs(refreshed.orgs);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create organisation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#F7F6FF" }}>
      <header style={{ background: "#FFFFFF", borderBottom: "0.5px solid #CECBF6" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between" style={{ padding: "14px 24px" }}>
          <Link to="/superadmin" aria-label="Home">
            <LogoMark size={22} withWordmark tagline />
          </Link>
          <nav className="flex items-center gap-2" style={{ fontSize: 13 }}>
            <span className="px-2 py-1 rounded-md" style={{ background: "#EEEDFE", color: "#6B4AE8", fontWeight: 500 }}>
              Founder view
            </span>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.navigate({ to: "/login" }); }}
              className="ml-2 px-3 py-1.5 rounded-md"
              style={{ color: "#7F77DD" }}
            >Sign out</button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 style={{ color: "#1A1045", fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Founder Overview
            </h1>
            <p style={{ color: "#7F77DD", fontSize: 14, marginTop: 4 }}>
              All organisations in the system
            </p>
          </div>
          <button
            onClick={() => { setShowModal(true); setInviteResult(null); setError(null); }}
            className="px-4 py-2 rounded-md text-white"
            style={{ background: "#6B4AE8", fontSize: 13, fontWeight: 500 }}
          >
            Create new organisation
          </button>
        </div>

        {loadingOrgs ? (
          <div style={{ color: "#7F77DD", fontSize: 13 }}>Loading organisations…</div>
        ) : orgs.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{ background: "#FFFFFF", border: "0.5px solid #CECBF6", color: "#7F77DD", fontSize: 13 }}
          >
            No organisations yet. Click "Create new organisation" to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgs.map((o) => (
              <div
                key={o.id}
                className="rounded-xl p-6"
                style={{ background: "#FFFFFF", border: "0.5px solid #CECBF6" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 style={{ color: "#1A1045", fontSize: 18, fontWeight: 700 }}>{o.name}</h3>
                  <div
                    className="grid place-items-center rounded-full"
                    style={{
                      width: 52, height: 52, background: "#EEEDFE",
                      color: "#6B4AE8", fontWeight: 700, fontSize: 14,
                    }}
                  >
                    {o.ci_score != null ? Math.round(o.ci_score) : "—"}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3" style={{ fontSize: 12 }}>
                  <div>
                    <div style={{ color: "#9D87F7" }}>Members</div>
                    <div style={{ color: "#1A1045", fontSize: 15, fontWeight: 600 }}>{o.member_count}</div>
                  </div>
                  <div>
                    <div style={{ color: "#9D87F7" }}>CI score</div>
                    <div style={{ color: "#1A1045", fontSize: 15, fontWeight: 600 }}>
                      {o.ci_score != null ? Math.round(o.ci_score) : "No score yet"}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div style={{ color: "#9D87F7", fontSize: 12 }}>Admins</div>
                  {o.admin_emails.length === 0 ? (
                    <div style={{ color: "#7F77DD", fontSize: 13, marginTop: 2 }}>No admin yet</div>
                  ) : (
                    <ul className="mt-1 space-y-0.5">
                      {o.admin_emails.map((e) => (
                        <li key={e} style={{ color: "#1A1045", fontSize: 13 }}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mt-4" style={{ color: "#9D87F7", fontSize: 11 }}>
                  Created {new Date(o.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: "rgba(26, 16, 69, 0.4)" }}
          onClick={() => !submitting && setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ background: "#FFFFFF", border: "0.5px solid #CECBF6" }}
            onClick={(e) => e.stopPropagation()}
          >
            {!inviteResult ? (
              <form onSubmit={submit}>
                <h2 style={{ color: "#1A1045", fontSize: 20, fontWeight: 700 }}>New organisation</h2>
                <p style={{ color: "#7F77DD", fontSize: 13, marginTop: 4 }}>
                  Create an org and an invite link for its first admin.
                </p>
                <div className="mt-5 space-y-4">
                  <div>
                    <label style={{ color: "#1A1045", fontSize: 12, fontWeight: 500 }}>Company name</label>
                    <input
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="mt-1 w-full rounded-md"
                      style={{ border: "0.5px solid #CECBF6", padding: "9px 14px", fontSize: 13, color: "#1A1045", background: "#F7F6FF", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ color: "#1A1045", fontSize: 12, fontWeight: 500 }}>Admin email</label>
                    <input
                      required
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="mt-1 w-full rounded-md"
                      style={{ border: "0.5px solid #CECBF6", padding: "9px 14px", fontSize: 13, color: "#1A1045", background: "#F7F6FF", outline: "none" }}
                    />
                  </div>
                </div>
                {error && <div className="mt-3" style={{ color: "#EF4444", fontSize: 12 }}>{error}</div>}
                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="px-3 py-1.5 rounded-md"
                    style={{ color: "#7F77DD", fontSize: 13 }}
                  >Cancel</button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-md text-white"
                    style={{ background: "#6B4AE8", fontSize: 13, fontWeight: 500, opacity: submitting ? 0.6 : 1 }}
                  >{submitting ? "Creating…" : "Create"}</button>
                </div>
              </form>
            ) : (
              <div>
                <h2 style={{ color: "#1A1045", fontSize: 20, fontWeight: 700 }}>Invite link ready</h2>
                <p style={{ color: "#1A1045", fontSize: 13, marginTop: 8 }}>
                  Send this link to <strong>{inviteResult.admin_email}</strong>. They will sign up and become the admin of <strong>{inviteResult.org_name}</strong>.
                </p>
                <div
                  className="mt-4 p-3 rounded-md break-all"
                  style={{ background: "#F7F6FF", border: "0.5px solid #CECBF6", fontSize: 12, color: "#1A1045", fontFamily: "monospace" }}
                >
                  {inviteLink}
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
                    }}
                    className="px-3 py-1.5 rounded-md"
                    style={{ color: "#6B4AE8", fontSize: 13, border: "0.5px solid #AFA9EC" }}
                  >{copied ? "Copied!" : "Copy link"}</button>
                  <button
                    onClick={() => { setShowModal(false); setInviteResult(null); }}
                    className="px-4 py-2 rounded-md text-white"
                    style={{ background: "#6B4AE8", fontSize: 13, fontWeight: 500 }}
                  >Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
