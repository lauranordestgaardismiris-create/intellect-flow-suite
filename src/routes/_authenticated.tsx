import { createFileRoute, Outlet, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { isSuperAdmin } from "@/lib/superadmin.functions";
import { LogoMark } from "@/components/logo-mark";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const checkSuper = useServerFn(isSuperAdmin);
  const [isSuper, setIsSuper] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/login" });
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    checkSuper().then((r) => setIsSuper(r.isSuperAdmin)).catch(() => setIsSuper(false));
  }, [user, checkSuper]);

  useEffect(() => {
    if (isSuper && pathname === "/dashboard") {
      router.navigate({ to: "/superadmin" });
    }
  }, [isSuper, pathname, router]);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: "#F7F6FF" }}>
      <header style={{ background: "#FFFFFF", borderBottom: "0.5px solid #CECBF6" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between" style={{ padding: "14px 24px" }}>
          <Link to="/dashboard" aria-label="Home">
            <LogoMark size={22} withWordmark tagline />
          </Link>
          <nav className="flex items-center gap-1" style={{ fontSize: 13 }}>
            <Link
              to="/my-profile"
              className="px-3 py-1.5 rounded-md hover:bg-[#EEEDFE]"
              style={{ color: "#1A1045" }}
              activeProps={{ style: { color: "#6B4AE8", background: "#EEEDFE", borderRadius: 6 } }}
            >My profile</Link>
            <Link
              to="/dashboard"
              className="px-3 py-1.5 rounded-md hover:bg-[#EEEDFE]"
              style={{ color: "#1A1045" }}
              activeProps={{ style: { color: "#6B4AE8", background: "#EEEDFE", borderRadius: 6 } }}
            >Dashboard</Link>
            <Link
              to="/settings"
              className="px-3 py-1.5 rounded-md hover:bg-[#EEEDFE]"
              style={{ color: "#1A1045" }}
              activeProps={{ style: { color: "#6B4AE8", background: "#EEEDFE", borderRadius: 6 } }}
            >Settings</Link>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.navigate({ to: "/login" }); }}
              className="ml-2 px-3 py-1.5 rounded-md"
              style={{ color: "#7F77DD", fontSize: 13 }}
            >
              Sign out
            </button>
            <span
              aria-hidden
              className="ml-2 grid place-items-center"
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "#EEEDFE", color: "#6B4AE8",
                fontSize: 11, fontWeight: 500,
                border: "0.5px solid #CECBF6",
              }}
            >
              {initials}
            </span>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

