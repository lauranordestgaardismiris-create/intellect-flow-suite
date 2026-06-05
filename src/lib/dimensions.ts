// Shared metadata + helpers for CI dimensions (Variable Explorer + Blindness panel).
import type { MemberRow } from "@/lib/ci-engine";
import { shannonDiversity, multiDimSpread, mean, clamp01to100 } from "@/lib/ci-engine";

export type DimensionId =
  | "disc_diversity"
  | "cognitive_diversity"
  | "problem_solving"
  | "information_processing"
  | "collaboration_balance"
  | "meta_cognition"
  | "role_seniority"
  | "gender_diversity"
  | "nationality_diversity"
  | "experience_diversity"
  | "education_diversity";

export type DimensionGroup = "behavioural" | "identity";

export type DimensionMeta = {
  id: DimensionId;
  group: DimensionGroup;
  name: string;
  description: string;
  fallbackInsight: string;
  riskCopy: string;
};

export const DIMENSIONS: DimensionMeta[] = [
  {
    id: "disc_diversity",
    group: "behavioural",
    name: "DISC diversity",
    description: "How varied your team's behavioural and communication styles are.",
    fallbackInsight: "A spread of DISC profiles strengthens how your team handles different types of challenges.",
    riskCopy: "Homogeneous communication styles limit how your team handles conflict, decisions, and change.",
  },
  {
    id: "cognitive_diversity",
    group: "behavioural",
    name: "Cognitive style diversity",
    description: "How varied your team's thinking and problem-solving approaches are.",
    fallbackInsight: "Cognitive diversity enables your team to approach problems from multiple angles.",
    riskCopy: "Similar thinking styles increase the risk of missing non-obvious solutions and reinforce existing assumptions.",
  },
  {
    id: "problem_solving",
    group: "behavioural",
    name: "Problem-solving diversity",
    description: "The balance between structured and exploratory problem-solving styles.",
    fallbackInsight: "Teams benefit from both methodical and experimental problem-solvers.",
    riskCopy: "When the team defaults to one problem-solving mode, whole categories of solutions get missed.",
  },
  {
    id: "information_processing",
    group: "behavioural",
    name: "Information-processing diversity",
    description: "The balance between depth-focused and breadth-focused thinkers.",
    fallbackInsight: "A mix of deep specialists and broad generalists strengthens collective analysis.",
    riskCopy: "Insufficient range between depth and breadth thinkers limits analytical completeness.",
  },
  {
    id: "collaboration_balance",
    group: "behavioural",
    name: "Collaboration balance",
    description: "How the team balances collaborative and independent work.",
    fallbackInsight: "Healthy teams have a mix of collaborative and independent working styles.",
    riskCopy: "A skewed balance between collaborative and independent work creates structural tension in how work gets done.",
  },
  {
    id: "meta_cognition",
    group: "behavioural",
    name: "Meta-cognition average",
    description: "The team's average level of self-awareness and reflective thinking.",
    fallbackInsight: "Higher meta-cognition helps teams recognise and correct their own blind spots.",
    riskCopy: "Low collective self-awareness reduces the team's ability to learn from mistakes and adapt.",
  },
  {
    id: "role_seniority",
    group: "behavioural",
    name: "Role / seniority spread",
    description: "How well the team spans different experience and seniority levels.",
    fallbackInsight: "A spread of seniority levels brings both fresh perspectives and deep experience.",
    riskCopy: "A narrow seniority band can silence junior perspectives and reduce the diversity of ideas reaching decisions.",
  },
  {
    id: "gender_diversity",
    group: "identity",
    name: "Gender diversity",
    description: "The gender composition of the team.",
    fallbackInsight: "Gender-diverse teams consistently demonstrate broader perspective-taking.",
    riskCopy: "Significant gender imbalance is associated with reduced perspective-taking and lower collective performance.",
  },
  {
    id: "nationality_diversity",
    group: "identity",
    name: "Nationality diversity",
    description: "The cultural and national diversity of the team.",
    fallbackInsight: "Cultural diversity expands the range of lived experience informing team decisions.",
    riskCopy: "Limited cultural diversity narrows the lived experience informing how the team interprets problems.",
  },
  {
    id: "experience_diversity",
    group: "identity",
    name: "Experience diversity",
    description: "The spread of professional experience levels across the team.",
    fallbackInsight: "A range of experience levels balances execution capability with strategic thinking.",
    riskCopy: "A tight experience band limits your team's range from tactical execution to long-term strategic thinking.",
  },
  {
    id: "education_diversity",
    group: "identity",
    name: "Education diversity",
    description: "The variety of educational backgrounds and degree levels.",
    fallbackInsight: "Diverse educational backgrounds bring different frameworks for approaching problems.",
    riskCopy: "Educational homogeneity reduces the variety of frameworks the team uses to interpret problems.",
  },
];

export const DIM_BY_ID: Record<DimensionId, DimensionMeta> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.id, d]),
) as Record<DimensionId, DimensionMeta>;

// ─── Per-dimension score + distribution computed from members ───────────────

export type DistributionItem = { label: string; count: number; pct: number };

export type DimensionResult = {
  id: DimensionId;
  score: number | null; // null => not enough data
  distribution: DistributionItem[];
};

type Member = MemberRow & {
  years_experience_total?: number | null;
  education_level?: string | null;
};

const DISC_NAME: Record<string, string> = { D: "Dominant (D)", I: "Influential (I)", S: "Steady (S)", C: "Conscientious (C)" };
const COG_NAME: Record<string, string> = { analytical: "Analytical", practical: "Practical", relational: "Strategic", experimental: "Creative" };

const JUNIOR = new Set(["intern", "student_worker", "graduate_trainee", "analyst"]);
const MID = new Set(["individual_contributor", "specialist", "consultant", "freelancer", "team_lead"]);
const SENIOR = new Set(["manager", "senior_management", "executive"]);
function tier(r: string | null | undefined): "Junior" | "Mid" | "Senior" | "Other" {
  if (!r) return "Other";
  if (JUNIOR.has(r)) return "Junior";
  if (MID.has(r)) return "Mid";
  if (SENIOR.has(r)) return "Senior";
  return "Other";
}

function distFromCounts(counts: Record<string, number>): DistributionItem[] {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(counts).map(([label, count]) => ({
    label, count, pct: Math.round((count / total) * 100),
  })).sort((a, b) => b.count - a.count);
}

export function computeDimension(id: DimensionId, members: Member[], minIdentity = 5): DimensionResult {
  const empty = { id, score: 0, distribution: [] as DistributionItem[] };
  if (members.length === 0) return empty;

  switch (id) {
    case "disc_diversity": {
      const counts: Record<string, number> = {};
      for (const m of members) if (m.disc_dominant) counts[m.disc_dominant] = (counts[m.disc_dominant] ?? 0) + 1;
      const score = shannonDiversity(Object.values(counts));
      return {
        id, score,
        distribution: distFromCounts(
          Object.fromEntries(Object.entries(counts).map(([k, v]) => [DISC_NAME[k] ?? k, v])),
        ),
      };
    }
    case "cognitive_diversity": {
      const counts: Record<string, number> = {};
      for (const m of members) if (m.cognitive_dominant) counts[m.cognitive_dominant] = (counts[m.cognitive_dominant] ?? 0) + 1;
      const score = shannonDiversity(Object.values(counts));
      return {
        id, score,
        distribution: distFromCounts(
          Object.fromEntries(Object.entries(counts).map(([k, v]) => [COG_NAME[k] ?? k, v])),
        ),
      };
    }
    case "problem_solving": {
      const vecs = members
        .map((m) => m.problem_solving ? [m.problem_solving.structured, m.problem_solving.exploratory] : null)
        .filter((v): v is number[] => v !== null);
      const score = multiDimSpread(vecs);
      const labels: Record<string, number> = { Structured: 0, Exploratory: 0, Balanced: 0 };
      for (const v of vecs) {
        if (Math.abs(v[0] - v[1]) <= 10) labels.Balanced++;
        else if (v[0] > v[1]) labels.Structured++;
        else labels.Exploratory++;
      }
      return { id, score, distribution: distFromCounts(labels) };
    }
    case "information_processing": {
      const vecs = members
        .map((m) => m.information_processing ? [m.information_processing.depth, m.information_processing.breadth] : null)
        .filter((v): v is number[] => v !== null);
      const score = multiDimSpread(vecs);
      const labels: Record<string, number> = { "Depth-leaning": 0, "Breadth-leaning": 0, "Balanced": 0 };
      for (const v of vecs) {
        if (Math.abs(v[0] - v[1]) <= 10) labels.Balanced++;
        else if (v[0] > v[1]) labels["Depth-leaning"]++;
        else labels["Breadth-leaning"]++;
      }
      return { id, score, distribution: distFromCounts(labels) };
    }
    case "collaboration_balance": {
      const collab = members.map((m) => m.collaboration);
      const indep = members.map((m) => m.independent_work ?? 100 - m.collaboration);
      const base = clamp01to100(100 - Math.abs(mean(collab) - mean(indep)));
      const labels: Record<string, number> = { "Collaboration-leaning": 0, "Independence-leaning": 0, "Balanced": 0 };
      for (const m of members) {
        const c = m.collaboration;
        const i = m.independent_work ?? 100 - c;
        if (Math.abs(c - i) <= 10) labels.Balanced++;
        else if (c > i) labels["Collaboration-leaning"]++;
        else labels["Independence-leaning"]++;
      }
      return { id, score: Math.round(base), distribution: distFromCounts(labels) };
    }
    case "meta_cognition": {
      const vals = members.map((m) => m.meta_cognition).filter((v): v is number => typeof v === "number");
      const score = vals.length ? Math.round(mean(vals)) : 0;
      const labels: Record<string, number> = { "Low (0–40)": 0, "Mid (41–70)": 0, "High (71–100)": 0 };
      for (const v of vals) {
        if (v <= 40) labels["Low (0–40)"]++;
        else if (v <= 70) labels["Mid (41–70)"]++;
        else labels["High (71–100)"]++;
      }
      return { id, score, distribution: distFromCounts(labels) };
    }
    case "role_seniority": {
      const counts: Record<string, number> = { Junior: 0, Mid: 0, Senior: 0, Other: 0 };
      for (const m of members) counts[tier(m.role_type)]++;
      const filtered = Object.fromEntries(Object.entries(counts).filter(([, v]) => v > 0));
      const score = shannonDiversity(Object.values(filtered));
      return { id, score, distribution: distFromCounts(filtered) };
    }
    case "gender_diversity": {
      const present = members.filter((m) => m.gender && m.gender.trim().length > 0);
      const counts: Record<string, number> = {};
      for (const m of members) {
        const g = m.gender && m.gender.trim().length > 0
          ? m.gender.charAt(0).toUpperCase() + m.gender.slice(1).toLowerCase()
          : "Not specified";
        counts[g] = (counts[g] ?? 0) + 1;
      }
      const score = present.length >= minIdentity
        ? shannonDiversity(Object.values(counts).filter((_, i) => Object.keys(counts)[i] !== "Not specified"))
        : null;
      return { id, score, distribution: distFromCounts(counts) };
    }
    case "nationality_diversity": {
      const present = members.filter((m) => (m.nationalities ?? []).length > 0);
      const counts: Record<string, number> = {};
      for (const m of members) {
        const n = (m.nationalities ?? [])[0];
        const key = n ? n : "Not specified";
        counts[key] = (counts[key] ?? 0) + 1;
      }
      const score = present.length >= minIdentity
        ? shannonDiversity(Object.values(counts).filter((_, i) => Object.keys(counts)[i] !== "Not specified"))
        : null;
      return { id, score, distribution: distFromCounts(counts) };
    }
    case "experience_diversity": {
      const present = members.filter((m) => typeof m.years_experience_total === "number");
      const band = (y: number) => y <= 2 ? "0–2 years" : y <= 5 ? "3–5 years" : y <= 10 ? "6–10 years" : "11+ years";
      const counts: Record<string, number> = {};
      for (const m of members) {
        const key = typeof m.years_experience_total === "number" ? band(m.years_experience_total) : "Not specified";
        counts[key] = (counts[key] ?? 0) + 1;
      }
      const score = present.length >= minIdentity
        ? shannonDiversity(Object.values(counts).filter((_, i) => Object.keys(counts)[i] !== "Not specified"))
        : null;
      return { id, score, distribution: distFromCounts(counts) };
    }
    case "education_diversity": {
      const present = members.filter((m) => m.education_level && m.education_level.trim().length > 0);
      const counts: Record<string, number> = {};
      for (const m of members) {
        const e = m.education_level && m.education_level.trim().length > 0 ? m.education_level : "Not specified";
        counts[e] = (counts[e] ?? 0) + 1;
      }
      const score = present.length >= minIdentity
        ? shannonDiversity(Object.values(counts).filter((_, i) => Object.keys(counts)[i] !== "Not specified"))
        : null;
      return { id, score, distribution: distFromCounts(counts) };
    }
  }
}
