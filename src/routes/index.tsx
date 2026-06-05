import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { AnimatedRing } from "@/components/animated-ring";
import { LogoMark } from "@/components/logo-mark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Collective Intelligence — measuring how teams think together" },
      { name: "description", content: "Learn how your organisation thinks together — and discover how your teams create, decide, and grow." },
      { property: "og:title", content: "Collective Intelligence" },
      { property: "og:description", content: "When the whole becomes greater than the sum of its individual parts." },
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
    return <div className="min-h-screen grid place-items-center text-sm" style={{ color: "#9D87F7" }}>Loading…</div>;
  }

  return (
    <div className="min-h-screen scroll-smooth" style={{ background: "#F7F6FF", color: "#1A1045" }}>
      <Nav />
      <Hero />
      <WhatWeMeasure />
      <LeadGen />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: "#FFFFFF", borderBottom: "0.5px solid #CECBF6" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between" style={{ padding: "14px 24px" }}>
        <Link to="/" aria-label="Home">
          <LogoMark size={22} withWordmark tagline />
        </Link>
        <button onClick={() => scrollToId("lead-gen")} style={primaryBtn}>
          Get in touch
        </button>
      </div>
    </header>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "#6B4AE8",
  color: "#FFFFFF",
  border: "none",
  padding: "9px 20px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 6,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "#FFFFFF",
  color: "#1A1045",
  border: "0.5px solid #AFA9EC",
  padding: "9px 20px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 6,
  cursor: "pointer",
};

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: "#2563EB",
        letterSpacing: "0.07em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function Hero() {
  const captions = ["The individual parts…", "Connections form…", "The whole emerges."];
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => {
      setIdx((i) => {
        if (i >= captions.length - 1) {
          clearInterval(timer);
          setTimeout(() => setDone(true), 1400);
          return i;
        }
        return i + 1;
      });
    }, 1400);
    return () => clearInterval(timer);
  }, [done]);

  return (
    <section
      id="hero"
      style={{ background: "#F7F6FF", padding: "3.5rem 2.5rem", borderBottom: "0.5px solid #CECBF6" }}
    >
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
        <div>
          <Overline>Collective intelligence</Overline>
          <h1 style={{ marginTop: 16, fontSize: 20, fontWeight: 500, color: "#1A1045", lineHeight: 1.4 }}>
            When the whole becomes greater than the sum of its individual parts.
          </h1>
          <p style={{ marginTop: 18, fontSize: 14, color: "rgba(30,64,175,0.75)", lineHeight: 1.7, maxWidth: 480 }}>
            Learn how your organisation{" "}
            <span style={{ color: "#6B4AE8", fontWeight: 500 }}>thinks together</span>
            {" "}— and discover how your teams create, decide, and grow.
          </p>
          <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => scrollToId("lead-gen")} style={primaryBtn}>Get in touch</button>
            <button onClick={() => scrollToId("what-we-measure")} style={ghostBtn}>See how it works</button>
          </div>
        </div>
        <div className="flex flex-col items-center md:items-end gap-3">
          <AnimatedRing size={220} nodes={6} rotate />
          <div style={{ height: 18, fontSize: 11, color: "#9D87F7", transition: "opacity .4s", opacity: done ? 0 : 1 }}>
            {captions[idx]}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatWeMeasure() {
  const dimensions = [
    "Thinking & working styles",
    "Cognitive diversity",
    "Collaboration patterns",
    "Problem-solving spread",
    "Individual competencies",
  ];
  // Node coordinates exactly per spec (r=80, cx=95, cy=95)
  const nodes = [
    { cx: 95,  cy: 15  },
    { cx: 171, cy: 70  },
    { cx: 142, cy: 162 },
    { cx: 48,  cy: 162 },
    { cx: 19,  cy: 70  },
  ];
  const [step, setStep] = useState(-1); // -1 = idle
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && step === -1) {
            setStep(0);
            io.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [step]);

  useEffect(() => {
    if (step < 0 || step >= dimensions.length - 1) return;
    const t = setTimeout(() => setStep(step + 1), 650);
    return () => clearTimeout(t);
  }, [step, dimensions.length]);

  const r = 80;
  const cxArc = 95;
  const cyArc = 95;
  const circumference = 2 * Math.PI * r;
  const filledRatio = step < 0 ? 0 : (step + 1) / dimensions.length;
  const dashOffset = circumference - filledRatio * circumference;

  return (
    <section
      ref={sectionRef}
      id="what-we-measure"
      style={{ background: "#F7F6FF", padding: "2.5rem" }}
    >
      <div className="mx-auto max-w-6xl">
        <Overline>What Collective Intelligence measures</Overline>
        <h2 style={{ marginTop: 12, fontSize: 19, fontWeight: 500, color: "#1A1045", lineHeight: 1.4, maxWidth: 720 }}>
          The only system to measure collective intelligence{" "}
          <span style={{ color: "#6B4AE8" }}>numerically</span> — based on several key dimensions.
        </h2>
        <p style={{ marginTop: 14, fontSize: 14, color: "rgba(30,64,175,0.75)", lineHeight: 1.7, maxWidth: 640 }}>
          We build a complete picture of how your organisation is intelligent together, and where blind spots form.
        </p>

        <div className="mt-12 grid md:grid-cols-2 gap-10 items-center">
          {/* Animated circle */}
          <div className="flex justify-center">
            <svg width={200} height={200} viewBox="0 0 200 200" aria-hidden="true">
              {/* Background track */}
              <circle cx={100} cy={100} r={r} fill="none" stroke="#EEEDFE" strokeWidth={3} />
              {/* Animated progress arc */}
              <circle
                cx={100}
                cy={100}
                r={r}
                fill="none"
                stroke="#6B4AE8"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 100 100)`}
                style={{ transition: "stroke-dashoffset 650ms ease-out" }}
              />
              {/* 5 nodes, shifted to centre at 100,100 from cxArc/cyArc spec */}
              {nodes.map((n, i) => {
                const filled = step >= 0 && i <= step;
                return (
                  <circle
                    key={i}
                    cx={n.cx + (100 - cxArc)}
                    cy={n.cy + (100 - cyArc)}
                    r={9}
                    fill={filled ? "#6B4AE8" : "#F7F6FF"}
                    stroke={filled ? "#6B4AE8" : "#EEEDFE"}
                    strokeWidth={2}
                    style={{ transition: "fill 400ms ease, stroke 400ms ease" }}
                  />
                );
              })}
            </svg>
          </div>

          {/* Dimension list */}
          <ul className="space-y-3">
            {dimensions.map((d, i) => {
              const shown = step >= i;
              return (
                <li
                  key={d}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: shown ? 1 : 0,
                    transform: shown ? "translateX(0)" : "translateX(-8px)",
                    transition: "opacity .5s ease, transform .5s ease",
                  }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#6B4AE8", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#1A1045" }}>{d}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function LeadGen() {
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email, company_size: "Unspecified", role: "Unspecified" }),
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
    <section id="lead-gen" style={{ background: "#FFFFFF", padding: "2.5rem" }}>
      <div className="mx-auto max-w-3xl text-center">
        <h2 style={{ fontSize: 19, fontWeight: 500, color: "#1A1045", lineHeight: 1.4 }}>
          See what your organisation's collective intelligence looks like.
        </h2>
        <p style={{ marginTop: 14, fontSize: 14, color: "rgba(30,64,175,0.75)", lineHeight: 1.7 }}>
          Enter your email. We'll be in touch.
        </p>

        {status === "ok" ? (
          <div
            className="mt-8 mx-auto"
            style={{
              maxWidth: 480,
              background: "#FFFFFF",
              border: "0.5px solid #CECBF6",
              borderRadius: 12,
              padding: 20,
              color: "#1A1045",
              fontSize: 14,
            }}
          >
            Thank you. We'll respond within 48 hours.
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-8 mx-auto flex flex-wrap gap-2 justify-center"
            style={{ maxWidth: 520 }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@company.com"
              style={{
                flex: "1 1 260px",
                background: "#F7F6FF",
                border: "0.5px solid #CECBF6",
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 13,
                color: "#1A1045",
                outline: "none",
              }}
            />
            <button type="submit" disabled={status === "sending"} style={{ ...primaryBtn, opacity: status === "sending" ? 0.6 : 1 }}>
              {status === "sending" ? "Sending…" : "Get in touch"}
            </button>
            {status === "error" && (
              <p style={{ width: "100%", fontSize: 11, color: "#EF4444" }}>{errorMsg}</p>
            )}
          </form>
        )}
        <p style={{ marginTop: 14, fontSize: 11, color: "#AFA9EC" }}>
          We'll respond within 48 hours.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#FFFFFF", borderTop: "0.5px solid #CECBF6" }}>
      <div
        className="mx-auto max-w-6xl grid md:grid-cols-3 gap-6 items-start"
        style={{ padding: "2rem 1.5rem" }}
      >
        <LogoMark size={22} withWordmark tagline />
        <div className="flex flex-wrap gap-4 justify-start md:justify-center" style={{ fontSize: 12, color: "#7F77DD" }}>
          <Link to="/privacy" style={{ color: "#7F77DD" }}>Privacy</Link>
          <Link to="/terms" style={{ color: "#7F77DD" }}>Terms</Link>
          <Link to="/login" style={{ color: "#7F77DD" }}>Sign in</Link>
        </div>
        <div className="md:text-right" style={{ fontSize: 12, color: "#9D87F7" }}>
          hello@collective-intelligence.app
        </div>
      </div>
    </footer>
  );
}
