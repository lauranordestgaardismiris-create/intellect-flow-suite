import { createFileRoute, redirect, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/login" });
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-chart-4" />
            <span>Collective Intelligence</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/dashboard" className="px-3 py-1.5 rounded-md hover:bg-accent" activeProps={{ className: "bg-accent" }}>Dashboard</Link>
            <Link to="/settings" className="px-3 py-1.5 rounded-md hover:bg-accent" activeProps={{ className: "bg-accent" }}>Settings</Link>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.navigate({ to: "/login" }); }}
              className="ml-2 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
