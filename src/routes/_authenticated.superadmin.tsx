import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { isSuperAdmin, getAllOrgs, type OrgRow } from "@/lib/superadmin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/superadmin")({
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const router = useRouter();
  const checkSuper = useServerFn(isSuperAdmin);
  const fetchOrgs = useServerFn(getAllOrgs);

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSuper().then((r) => {
      if (!r.isSuperAdmin) { router.navigate({ to: "/dashboard" }); return; }
      setAllowed(true);
    }).catch(() => router.navigate({ to: "/dashboard" }));
  }, [router, checkSuper]);

  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    fetchOrgs().then((r) => setOrgs(r.orgs)).finally(() => setLoading(false));
  }, [allowed, fetchOrgs]);

  if (!allowed) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const { data: org, error: oErr } = await supabase.from("organizations").insert({ name: orgName } as any).select("id").single();
      if (oErr) throw new Error(oErr.message);
      const { error: eErr } = await supabase.from("entities").insert({ org_id: org.id, name: orgName, type: "company" } as any);
      if (eErr) throw new Error(eErr.message);
      const token = (crypto as any).randomUUID();
      const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      const { error: iErr } = await supabase.from("org_invites").insert({
        org_id: org.id, email: adminEmail, role: "org_admin", token, expires_at: expires,
      } as any);
      if (iErr) throw new Error(iErr.message);
      setInviteLink(`${window.location.origin}/join?token=${token}`);
      setOrgName(""); setAdminEmail("");
      const r = await fetchOrgs(); setOrgs(r.orgs);
    } catch (err: any) { setError(err?.message ?? "Failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 style={{ color: "#1A1045", fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em" }}>Companies</h1>
          <p style={{ color: "#7F77DD", fontSize: 14, marginTop: 4 }}>All organisations in the system</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setInviteLink(null); setError(null); }}
          className="px-4 py-2 rounded-md text-white"
          style={{ background: "#6B4AE8", fontSize: 13, fontWeight: 500 }}
        >Create company</button>
      </div>

      {loading ? (
        <div style={{ color: "#7F77DD", fontSize: 13 }}>Loading…</div>
      ) : orgs.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "#FFFFFF", border: "0.5px solid #CECBF6", color: "#7F77DD", fontSize: 13 }}>
          No companies yet.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "0.5px solid #CECBF6" }}>
          <table className="w-full" style={{ fontSize: 13, color: "#1A1045" }}>
            <thead style={{ background: "#F7F6FF", color: "#7F77DD", fontSize: 12 }}>
              <tr>
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Created</th>
                <th className="text-left px-5 py-3 font-medium">Members</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} style={{ borderTop: "0.5px solid #EEEDFE" }}>
                  <td className="px-5 py-3" style={{ fontWeight: 500 }}>{o.name}</td>
                  <td className="px-5 py-3" style={{ color: "#7F77DD" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3">{o.member_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(26,16,69,0.4)" }} onClick={() => !submitting && setShowModal(false)}>
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: "#FFFFFF", border: "0.5px solid #CECBF6" }} onClick={(e) => e.stopPropagation()}>
            {!inviteLink ? (
              <form onSubmit={submit}>
                <h2 style={{ color: "#1A1045", fontSize: 20, fontWeight: 700 }}>New company</h2>
                <div className="mt-5 space-y-4">
                  <div>
                    <label style={{ color: "#1A1045", fontSize: 12, fontWeight: 500 }}>Company name</label>
                    <input required value={orgName} onChange={(e) => setOrgName(e.target.value)}
                      className="mt-1 w-full rounded-md"
                      style={{ border: "0.5px solid #CECBF6", padding: "9px 14px", fontSize: 13, color: "#1A1045", background: "#F7F6FF", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ color: "#1A1045", fontSize: 12, fontWeight: 500 }}>Admin email</label>
                    <input required type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
                      className="mt-1 w-full rounded-md"
                      style={{ border: "0.5px solid #CECBF6", padding: "9px 14px", fontSize: 13, color: "#1A1045", background: "#F7F6FF", outline: "none" }} />
                  </div>
                </div>
                {error && <div className="mt-3" style={{ color: "#EF4444", fontSize: 12 }}>{error}</div>}
                <div className="mt-6 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setShowModal(false)} disabled={submitting}
                    className="px-3 py-1.5 rounded-md" style={{ color: "#7F77DD", fontSize: 13 }}>Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 rounded-md text-white"
                    style={{ background: "#6B4AE8", fontSize: 13, fontWeight: 500, opacity: submitting ? 0.6 : 1 }}>
                    {submitting ? "Creating…" : "Create"}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h2 style={{ color: "#1A1045", fontSize: 20, fontWeight: 700 }}>Invite link ready</h2>
                <p style={{ color: "#1A1045", fontSize: 13, marginTop: 8 }}>Send this link to the new admin.</p>
                <div className="mt-4 p-3 rounded-md break-all" style={{ background: "#F7F6FF", border: "0.5px solid #CECBF6", fontSize: 12, color: "#1A1045", fontFamily: "monospace" }}>{inviteLink}</div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button onClick={async () => { try { await navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}
                    className="px-3 py-1.5 rounded-md" style={{ color: "#6B4AE8", fontSize: 13, border: "0.5px solid #AFA9EC" }}>
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                  <button onClick={() => { setShowModal(false); setInviteLink(null); }}
                    className="px-4 py-2 rounded-md text-white" style={{ background: "#6B4AE8", fontSize: 13, fontWeight: 500 }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
