import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Collective Intelligence Design — Measure your organization's CI" },
      { name: "description", content: "A platform that measures who people are, how they think, and how teams are structured — so you know where your collective intelligence is strong, where it's weak, and what to do next." },
      { property: "og:title", content: "Collective Intelligence Design" },
      { property: "og:description", content: "Measure and grow your organization's collective intelligence." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-chart-4" />
            <span>Collective Intelligence Design</span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/signup" className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground font-medium">Get started</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Organizational analytics</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight md:text-6xl">
            See where your organization <span className="text-primary">thinks together</span>.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Map skills, personalities and cognitive styles across your company. Get a single Collective Intelligence score and discover where your teams are strong, where they're weak, and what to hire next.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/signup" className="rounded-md bg-primary px-5 py-2.5 text-primary-foreground font-medium">Create your workspace</Link>
            <Link to="/login" className="rounded-md border px-5 py-2.5 font-medium">Sign in</Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24 grid md:grid-cols-3 gap-4">
          {[
            { t: "One CI score", d: "A single 0–100% measure for your company, each department and each team." },
            { t: "Customizable insights", d: "Toggle lenses for skills, DISC, cognitive styles, collaboration and innovation." },
            { t: "AI suggestions", d: "Hiring and team-optimization recommendations grounded in your real data." },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-muted-foreground">© Collective Intelligence Design</div>
      </footer>
    </div>
  );
}
