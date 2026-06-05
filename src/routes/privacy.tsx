import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Collective Intelligence Design" },
      { name: "description", content: "Privacy policy for the Collective Intelligence Design platform." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">Full policy coming soon.</p>
      </div>
    </div>
  );
}
