import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
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

const COLORS = {
  page: "#F7F6FF",
  white: "#FFFFFF",
  ink: "#1A1045",
  primary: "#6B4AE8",
  primaryDeep: "#534AB7",
  primaryMid: "#7F77DD",
  primaryLight: "#9D87F7",
  primaryPale: "#AFA9EC",
  border: "#CECBF6",
  track: "#EEEDFE",
  accent: "#2563EB",
};

const primaryBtn: React.CSSProperties = {
  background: COLORS.primary,
  color: COLORS.white,
  border: "none",
  padding: "10px 22px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 6,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: COLORS.white,
  color: COLORS.ink,
  border: "0.5px solid " + COLORS.primaryPale,
  padding: "10px 22px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 6,
  cursor: "pointer",
};

function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/dashboard" });
  }, [user, loading, router]);

  if (user) {
    return <div className="min-h-screen grid place-items-center text-sm" style={{ color: COLORS.primaryLight }}>Loading…</div>;
  }

  return (
    <div className="min-h-screen scroll-smooth" style={{ background: COLORS.page, color: COLORS.ink, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Nav />
      <Hero />
      <WhatWeMeasure />
      <LeadGen />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50" style={{ background: COLORS.white, borderBottom: "0.5px solid " + COLORS.border }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between" style={{ padding: "14px 20px" }}>
        <Link to="/" aria-label="Home" style={{ textDecoration: "none" }}>
          <LogoMark size={22} withWordmark tagline />
        </Link>
        <button onClick={() => scrollToId("lead-gen")} style={ghostBtn}>
          Get in touch
        </button>
      </div>
    </header>
  );
}

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: COLORS.accent,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

/* -------- HERO: hexagon with center glow -------- */
function HexVisual() {
  // Hexagon: 6 outer nodes around a central node with glow halo
  // viewBox 240x240, centre at 120,120, radius 90
  const cx = 120;
  const cy = 120;
  const r = 90;
  const nodes = Array.from({ length: 6 }).map((_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2; // start at top
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  const nodeColors = [
    COLORS.primary,
    COLORS.primaryDeep,
    COLORS.primaryMid,
    COLORS.primaryLight,
    COLORS.primaryLight,
    COLORS.primaryMid,
  ];

  const [visible, setVisible] = useState(0); // staged reveal
  useEffect(() => {
    const t = setInterval(() => setVisible((v) => (v >= 3 ? v : v + 1)), 700);
    return () => clearInterval(t);
  }, []);

  const hexPath = nodes.map((n, i) => (i === 0 ? `M ${n.x} ${n.y}` : `L ${n.x} ${n.y}`)).join(" ") + " Z";

  return (
    <svg width="280" height="280" viewBox="0 0 240 240" aria-hidden="true">
      {/* Outer faint ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.track} strokeWidth={1} />
      {/* Hexagon edges */}
      <path d={hexPath} fill="none" stroke={COLORS.border} strokeWidth={1} style={{ opacity: visible >= 1 ? 1 : 0, transition: "opacity .6s" }} />
      {/* Spokes from centre */}
      {nodes.map((n, i) => (
        <line
          key={"sp" + i}
          x1={cx}
          y1={cy}
          x2={n.x}
          y2={n.y}
          stroke={COLORS.border}
          strokeWidth={1}
          style={{ opacity: visible >= 2 ? 1 : 0, transition: "opacity .6s" }}
        />
      ))}
      {/* Centre glow */}
      <circle
        cx={cx}
        cy={cy}
        r={28}
        fill={COLORS.border}
        style={{ opacity: visible >= 3 ? 0.45 : 0, transition: "opacity .8s" }}
      />
      {/* Outer nodes */}
      {nodes.map((n, i) => (
        <circle
          key={"n" + i}
          cx={n.x}
          cy={n.y}
          r={9}
          fill={nodeColors[i]}
          style={{ opacity: visible >= 1 ? 1 : 0, transition: "opacity .5s ease " + i * 0.08 + "s" }}
        />
      ))}
      {/* Centre node */}
      <circle
        cx={cx}
        cy={cy}
        r={12}
        fill={COLORS.primary}
        style={{ opacity: visible >= 3 ? 1 : 0, transition: "opacity .5s" }}
      />
    </svg>
  );
}

function Hero() {
  return (
    <section
      id="hero"
      style={{ background: COLORS.page, padding: "3rem 1.5rem 4rem", borderBottom: "0.5px solid " + COLORS.border }}
    >
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 md:gap-12 items-center">
        <div>
          <Overline>Collective Intelligence</Overline>
          <h1
            style={{
              marginTop: 22,
              fontSize: "clamp(34px, 5vw, 52px)",
              fontWeight: 700,
              color: COLORS.ink,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            When the whole becomes greater than the sum of its individual parts.
          </h1>
          <p
            style={{
              marginTop: 28,
              fontSize: 15,
              color: COLORS.primaryMid,
              lineHeight: 1.7,
              maxWidth: 460,
            }}
          >
            Learn how your organisation{" "}
            <span style={{ color: COLORS.primary, fontWeight: 500 }}>thinks together</span>{" "}
            — and discover how your teams create, decide, and grow.
          </p>
        </div>
        <div className="flex justify-center md:justify-end">
          <HexVisual />
        </div>
      </div>
    </section>
  );
}

/* -------- WHAT WE MEASURE -------- */
function WhatWeMeasure() {
  const dimensions = [
    "Thinking & working styles",
    "Cognitive diversity",
    "Collaboration patterns",
    "Problem-solving spread",
    "Individual competencies",
  ];

  const sectionRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(-1);

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
    const t = setTimeout(() => setStep(step + 1), 600);
    return () => clearTimeout(t);
  }, [step, dimensions.length]);

  // Circle: viewBox 240x240, cx/cy 120, r 90; 5 nodes evenly distributed
  const cx = 120, cy = 120, r = 90;
  const nodes = Array.from({ length: 5 }).map((_, i) => {
    const angle = (2 * Math.PI / 5) * i - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  const circumference = 2 * Math.PI * r;
  const filledRatio = step < 0 ? 0 : (step + 1) / dimensions.length;
  const dashOffset = circumference - filledRatio * circumference;

  return (
    <section
      ref={sectionRef}
      id="what-we-measure"
      style={{ background: COLORS.page, padding: "3.5rem 1.5rem", borderBottom: "0.5px solid " + COLORS.border }}
    >
      <div className="mx-auto max-w-6xl">
        <Overline>What &nbsp;———&nbsp; Measures</Overline>
        <h2
          style={{
            marginTop: 18,
            fontSize: "clamp(22px, 2.6vw, 30px)",
            fontWeight: 600,
            color: COLORS.ink,
            lineHeight: 1.3,
            maxWidth: 760,
          }}
        >
          The only system to measure collective intelligence{" "}
          <span style={{ color: COLORS.primary }}>numerically</span> — based on several key dimensions.
        </h2>
        <p style={{ marginTop: 16, fontSize: 14, color: COLORS.primaryMid, lineHeight: 1.7, maxWidth: 640 }}>
          We build a complete picture of how your organisation is intelligent together, and where blind spots form.
        </p>

        <div className="mt-12 grid md:grid-cols-2 gap-10 items-center">
          <div className="flex justify-center">
            <svg width="280" height="280" viewBox="0 0 240 240" aria-hidden="true">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.track} strokeWidth={2.5} />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={COLORS.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dashoffset 650ms ease-out" }}
              />
              {nodes.map((n, i) => {
                const filled = step >= i;
                return (
                  <circle
                    key={i}
                    cx={n.x}
                    cy={n.y}
                    r={10}
                    fill={filled ? COLORS.primary : COLORS.page}
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    style={{ transition: "fill 400ms ease" }}
                  />
                );
              })}
            </svg>
          </div>

          <ul className="space-y-4">
            {dimensions.map((d, i) => {
              const shown = step >= i;
              return (
                <li
                  key={d}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    opacity: shown ? 1 : 0,
                    transform: shown ? "translateX(0)" : "translateX(-8px)",
                    transition: "opacity .5s ease, transform .5s ease",
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.primary, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: COLORS.ink, fontWeight: 500 }}>{d}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------- LEAD GEN -------- */
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
    <section id="lead-gen" style={{ background: COLORS.white, padding: "3.5rem 1.5rem" }}>
      <div className="mx-auto max-w-3xl">
        <h2 style={{ fontSize: "clamp(20px, 2.4vw, 26px)", fontWeight: 600, color: COLORS.ink, lineHeight: 1.3, maxWidth: 520 }}>
          See what your organisation's collective intelligence looks like.
        </h2>
        <p style={{ marginTop: 14, fontSize: 14, color: COLORS.primaryMid, lineHeight: 1.7 }}>
          Enter your email. We'll be in touch.
        </p>

        {status === "ok" ? (
          <div
            className="mt-6"
            style={{
              maxWidth: 520,
              background: COLORS.page,
              border: "0.5px solid " + COLORS.border,
              borderRadius: 8,
              padding: 16,
              color: COLORS.ink,
              fontSize: 14,
            }}
          >
            Thank you — we'll be in touch within 48 hours.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-wrap gap-2" style={{ maxWidth: 520 }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@company.com"
              style={{
                flex: "1 1 240px",
                background: COLORS.white,
                border: "0.5px solid " + COLORS.border,
                borderRadius: 6,
                padding: "11px 14px",
                fontSize: 13,
                color: COLORS.ink,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button type="submit" disabled={status === "sending"} style={{ ...ghostBtn, opacity: status === "sending" ? 0.6 : 1 }}>
              {status === "sending" ? "Sending…" : "Get in touch"}
            </button>
            {status === "error" && (
              <p style={{ width: "100%", fontSize: 11, color: "#EF4444" }}>{errorMsg}</p>
            )}
          </form>
        )}
        <p style={{ marginTop: 14, fontSize: 11, color: COLORS.primaryLight }}>
          We'll respond within 48 hours.
        </p>
      </div>
    </section>
  );
}
