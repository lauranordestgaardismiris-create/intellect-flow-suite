import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Collective Intelligence Design" },
      { name: "description", content: "Terms of service for the Collective Intelligence Design platform." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-4 text-muted-foreground">Full policy coming soon.</p>
      </div>
    </div>
  );
}
