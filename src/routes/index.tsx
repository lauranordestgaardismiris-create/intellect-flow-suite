import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { AnimatedRing } from "@/components/animated-ring";
import { LandingFilledCircle } from "@/components/landing-filled-circle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Collective Intelligence, Measured — CI Platform" },
      { name: "description", content: "Two scores. Every dimension. Exactly where your team is strong — and exactly where it's blind." },
      { property: "og:title", content: "Collective Intelligence, Measured" },
      { property: "og:description", content: "Measure how intelligently your team thinks together — behavioural, identity, and combined." },
    ],
  }),
  component: Landing,
});

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/dashboard" });
  }, [user, loading, router]);

  if (loading || user) {
    return <div className="min-h-screen grid place-items-center bg-[oklch(0.14_0.02_265)] text-white/60 text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[oklch(0.14_0.02_265)] text-white scroll-smooth">
      <Nav />
      <Hero />
      <ThreeNumbers />
      <Problem />
      <HowItWorks />
      <TwoScores />
      <WhoItsFor />
      <LeadGen />
      <Footer />
    </div>
  );
}

function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2 font-semibold">
      <AnimatedRing size={small ? 32 : 36} nodes={7} rotate />
      <span className={small ? "text-sm" : ""}>Collective Intelligence</span>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[oklch(0.14_0.02_265/0.75)] border-b border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <button onClick={() => scrollToId("hero")} className="cursor-pointer">
          <Brand small />
        </button>
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
          <button onClick={() => scrollToId("how-it-works")} className="hover:text-white transition">How it works</button>
          <button onClick={() => scrollToId("who-its-for")} className="hover:text-white transition">Who it's for</button>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="text-sm text-white/70 hover:text-white px-3 py-1.5">Sign in</Link>
          <button
            onClick={() => scrollToId("lead-gen")}
            className="text-sm font-medium rounded-md px-4 py-2 text-white bg-gradient-to-r from-[oklch(0.65_0.2_250)] to-[oklch(0.6_0.22_320)] hover:opacity-90 transition"
          >
            Get in touch
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="hero" className="relative min-h-[calc(100vh-65px)] flex items-center">
      <div className="mx-auto max-w-6xl w-full px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block text-xs uppercase tracking-widest text-white/70 bg-white/5 border border-white/10 rounded-full px-3 py-1">
            Collective Intelligence, Measured
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Your team has talent.<br />
            <span className="bg-gradient-to-r from-[oklch(0.72_0.2_250)] to-[oklch(0.7_0.22_320)] bg-clip-text text-transparent">
              Does it have collective intelligence?
            </span>
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-xl">
            Two scores. Every dimension. Exactly where your team is strong — and exactly where it's blind.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => scrollToId("lead-gen")}
              className="rounded-md px-6 py-3 font-medium text-white bg-gradient-to-r from-[oklch(0.65_0.2_250)] to-[oklch(0.6_0.22_320)] hover:opacity-90 transition"
            >
              Get in touch
            </button>
            <button
              onClick={() => scrollToId("how-it-works")}
              className="rounded-md px-6 py-3 font-medium text-white/90 border border-white/15 hover:bg-white/5 transition"
            >
              See how it works
            </button>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <AnimatedRing size={360} nodes={7} rotate />
        </div>
      </div>
    </section>
  );
}

function ThreeNumbers() {
  const items = [
    { n: "17 minutes", d: "Per employee to complete the full assessment." },
    { n: "2 scores", d: "Collective Intelligence and Collective Blindness. Both measured. Both actionable." },
    { n: "3 lenses", d: "Behavioural, identity, and combined — always kept separate." },
  ];
  return (
    <section className="bg-[oklch(0.97_0.01_250)] text-[oklch(0.18_0.04_265)]">
      <div className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-3 gap-10">
        {items.map((i) => (
          <div key={i.n} className="text-center">
            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.55_0.22_320)] bg-clip-text text-transparent">
              {i.n}
            </div>
            <p className="mt-4 text-base text-[oklch(0.4_0.03_260)] max-w-xs mx-auto">{i.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Problem() {
  const cols = [
    "Individual intelligence doesn't predict team performance. MIT and Carnegie Mellon research shows the strongest predictor is how a team thinks together — not who is on it.",
    "Most tools stop at the individual. DISC, MBTI, Insights Discovery — they describe each person. None of them tell you what your team is, collectively.",
    "Blind spots compound. When a team thinks alike, it makes the same mistakes repeatedly. The Collective Blindness score shows you exactly where the gaps are.",
  ];
  return (
    <section className="py-24 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl">
          Why brilliant individuals don't always make brilliant teams
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {cols.map((c, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="text-xs font-mono text-white/40">0{i + 1}</div>
              <p className="mt-3 text-white/80 leading-relaxed">{c}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    "Each employee completes a 17-minute assessment — personality, cognitive style, work preferences, and team experience.",
    "The platform calculates your Collective Intelligence Score across multiple dimensions. Behavioural data and identity data are always measured separately — and combined.",
    "Every employee sees their own profile and how they contribute to their team. Every manager sees their department. Leadership sees the whole picture.",
  ];
  return (
    <section id="how-it-works" className="bg-[oklch(0.97_0.01_250)] text-[oklch(0.18_0.04_265)]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl">
          From invitation to insight in under 20 minutes
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="rounded-xl bg-white border border-[oklch(0.92_0.01_255)] p-6 shadow-sm">
              <div className="h-10 w-10 rounded-full grid place-items-center font-semibold text-white bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.55_0.22_320)]">
                {i + 1}
              </div>
              <p className="mt-4 text-[oklch(0.32_0.03_260)] leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TwoScores() {
  return (
    <section className="py-24 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl">
          Two numbers that tell you what your team is
        </h2>
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">Collective Intelligence</h3>
                <p className="mt-3 text-white/70 leading-relaxed">
                  A score from 0–100 measuring how intelligently your organisation thinks together. Based on the diversity of thinking styles, working preferences, seniority, experience, and team dynamics — across three lenses: behavioural, identity, and combined.
                </p>
              </div>
              <LandingFilledCircle value={74} variant="primary" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">Collective Blindness</h3>
                <p className="mt-3 text-white/70 leading-relaxed">
                  A score from 0–100 reflecting how concentrated your team's weakest dimensions are. A high score signals that one or more dimensions are critically underdeveloped — creating real organisational risk.
                </p>
              </div>
              <LandingFilledCircle value={38} variant="amber" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhoItsFor() {
  const cards = [
    { t: "HR & People Leaders", d: "Demonstrate that your people strategy is generating measurable organisational intelligence — not just individual self-awareness." },
    { t: "Founders & COOs", d: "When your team underperforms its individual talent, this tells you why — and which dimensions to address." },
    { t: "Innovation & Strategy Leaders", d: "Find out whether your team is cognitively diverse enough to generate genuinely new ideas, or whether you're reinforcing the same assumptions." },
  ];
  return (
    <section id="who-its-for" className="bg-[oklch(0.97_0.01_250)] text-[oklch(0.18_0.04_265)]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl">
          Built for people who want data, not personality workshops
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div key={c.t} className="rounded-xl bg-white border border-[oklch(0.92_0.01_255)] p-6 shadow-sm">
              <h3 className="text-lg font-semibold">{c.t}</h3>
              <p className="mt-3 text-[oklch(0.4_0.03_260)] leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LeadGen() {
  const [email, setEmail] = useState("");
  const [companySize, setCompanySize] = useState("10–50 employees");
  const [role, setRole] = useState("HR / People & Culture");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company_size: companySize, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <section id="lead-gen" className="py-24 border-t border-white/5">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
          Curious about your team's collective intelligence?
        </h2>
        <p className="mt-6 text-lg text-white/70">
          If this resonates, we'd like to hear from you. Share a few details and we'll reach out to explore whether this is the right fit for your organisation.
        </p>

        {status === "ok" ? (
          <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-8">
            <div className="text-2xl font-semibold">Thank you. We'll be in touch.</div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 mx-auto max-w-[480px] flex flex-col gap-4 text-left">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Work email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@company.com"
                className="rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[oklch(0.65_0.2_250)]"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Company size</span>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-[oklch(0.65_0.2_250)]"
              >
                {["10–50 employees", "51–200", "201–500", "500+"].map((o) => (
                  <option key={o} value={o} className="bg-[oklch(0.2_0.03_265)]">{o}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Your role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-[oklch(0.65_0.2_250)]"
              >
                {["HR / People & Culture", "Founder / CEO", "COO / Operations", "Innovation / R&D", "Other"].map((o) => (
                  <option key={o} value={o} className="bg-[oklch(0.2_0.03_265)]">{o}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-2 rounded-md w-full py-3 font-medium text-white bg-gradient-to-r from-[oklch(0.65_0.2_250)] to-[oklch(0.6_0.22_320)] hover:opacity-90 transition disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "I'm interested"}
            </button>
            {status === "error" && <p className="text-sm text-[oklch(0.7_0.2_27)]">{errorMsg}</p>}
            <p className="text-xs text-white/40 text-center mt-2">All data stored in the EU. GDPR compliant.</p>
          </form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[oklch(0.12_0.02_265)]">
      <div className="mx-auto max-w-6xl px-6 py-12 grid md:grid-cols-3 gap-8 items-start">
        <div>
          <Brand small />
          <p className="mt-3 text-sm text-white/50 max-w-xs">Measure what actually predicts performance.</p>
        </div>
        <div className="flex flex-wrap gap-4 justify-start md:justify-center text-sm text-white/60">
          <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white">Terms of Service</Link>
          <Link to="/login" className="hover:text-white">Sign in</Link>
        </div>
        <div className="text-sm text-white/60 md:text-right">hello@collective-intelligence.app</div>
      </div>
    </footer>
  );
}
