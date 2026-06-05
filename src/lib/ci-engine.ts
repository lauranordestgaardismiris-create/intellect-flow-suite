// Deterministic Collective Intelligence scoring engine.
// All inputs are normalized to a 0-100 scale before computation.
// Same input always yields the same output: no randomness, no time-based factors.

// ─── Generic helpers ─────────────────────────────────────────────────────────

export function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stddev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

export function shannonDiversity(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / total;
    h -= p * Math.log(p);
  }
  const k = counts.filter((c) => c > 0).length;
  const max = k > 1 ? Math.log(k) : 1;
  return Math.round((h / max) * 100);
}

// Spread of a 0-100 valued dimension across users → 0-100 diversity.
// The theoretical max stddev for values bound to [0,100] split between the two
// poles is 50, so we normalize by 50 to map to a 0-100 diversity score.
export function spreadScore(values: number[]): number {
  if (values.length < 2) return 0;
  const sd = stddev(values);
  return Math.round(clamp01to100((sd / 50) * 100));
}

// Mean spread across multiple 0-100 dimensions (each column is one dimension).
export function multiDimSpread(vectors: number[][]): number {
  if (vectors.length === 0) return 0;
  const dims = vectors[0]?.length ?? 0;
  if (dims === 0) return 0;
  const perDim: number[] = [];
  for (let d = 0; d < dims; d++) {
    perDim.push(spreadScore(vectors.map((v) => v[d] ?? 0)));
  }
  return Math.round(mean(perDim));
}

// ─── Member shape ────────────────────────────────────────────────────────────

export type MemberRow = {
  role_type: string | null;
  skills: string[];
  disc_dominant: string | null;
  cognitive_dominant: string | null;
  // 0-100 sliders
  collaboration: number;
  independent_work?: number;
  idea_generation: number;
  task_repetition: number;
  // DISC components 0-100
  disc?: { d: number; i: number; s: number; c: number } | null;
  // Cognitive components 0-100
  cognitive?: { analytical: number; practical: number; relational: number; experimental: number } | null;
  // Problem solving 0-100
  problem_solving?: { structured: number; exploratory: number } | null;
  // Information processing 0-100
  information_processing?: { depth: number; breadth: number; structured: number; unstructured: number } | null;
  // Meta cognition 0-100
  meta_cognition?: number | null;
  // Demographic / identity (for Diversity Composition score)
  gender?: string | null;
  age?: number | null;
  nationalities?: string[];
  neurodivergence?: string | null;
  disability?: string | null;
};

// ─── Sub-scores ──────────────────────────────────────────────────────────────

export type SubScores = {
  disc_diversity_score: number;
  cognitive_diversity_score: number;
  problem_solving_diversity_score: number;
  information_processing_diversity_score: number;
  role_distribution_score: number;
  collaboration_balance_score: number;
  meta_cognition_score: number;
  // legacy/auxiliary
  skill_diversity: number;
  innovation: number;
};

// Roles considered when evaluating coverage. Penalty applied when key tiers
// (leadership / IC) are missing.
const ROLE_TIERS = {
  leadership: new Set(["executive", "senior_management", "manager", "team_lead"]),
  ic: new Set(["individual_contributor", "specialist", "intern"]),
  flex: new Set(["consultant", "freelancer", "other"]),
};

function roleDistributionScore(members: MemberRow[]): number {
  if (members.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const m of members) if (m.role_type) counts.set(m.role_type, (counts.get(m.role_type) ?? 0) + 1);
  if (counts.size === 0) return 0;
  const entropy = shannonDiversity([...counts.values()]);
  // Coverage penalty: -25 per missing tier among leadership/IC.
  let penalty = 0;
  const present = new Set(counts.keys());
  const hasLeadership = [...present].some((r) => ROLE_TIERS.leadership.has(r));
  const hasIC = [...present].some((r) => ROLE_TIERS.ic.has(r));
  if (!hasLeadership) penalty += 25;
  if (!hasIC) penalty += 25;
  return Math.round(clamp01to100(entropy - penalty));
}

function collaborationBalanceScore(members: MemberRow[]): number {
  if (members.length === 0) return 0;
  const collab = members.map((m) => m.collaboration);
  const indep = members.map((m) => m.independent_work ?? 100 - m.collaboration);
  // Balance = 100 - |mean_collab - mean_indep|, with a small bonus for healthy
  // variance (so not everyone scores identically).
  const diff = Math.abs(mean(collab) - mean(indep));
  const base = clamp01to100(100 - diff);
  const spread = spreadScore(collab);
  // Weighted: 70% balance of means, 30% diversity of preferences.
  return Math.round(base * 0.7 + spread * 0.3);
}

export function computeSubScores(members: MemberRow[]): SubScores {
  if (members.length === 0) {
    return {
      disc_diversity_score: 0, cognitive_diversity_score: 0,
      problem_solving_diversity_score: 0, information_processing_diversity_score: 0,
      role_distribution_score: 0, collaboration_balance_score: 0,
      meta_cognition_score: 0, skill_diversity: 0, innovation: 0,
    };
  }

  // DISC diversity — combine spread across 4 components with dominant-trait entropy.
  const discVectors = members
    .map((m) => m.disc ? [m.disc.d, m.disc.i, m.disc.s, m.disc.c] : null)
    .filter((v): v is number[] => v !== null);
  const discSpread = multiDimSpread(discVectors);
  const discDomCounts = new Map<string, number>();
  for (const m of members) if (m.disc_dominant) discDomCounts.set(m.disc_dominant, (discDomCounts.get(m.disc_dominant) ?? 0) + 1);
  const discDom = shannonDiversity([...discDomCounts.values()]);
  const disc_diversity_score = Math.round((discSpread + discDom) / 2);

  // Cognitive diversity — same shape.
  const cogVectors = members
    .map((m) => m.cognitive ? [m.cognitive.analytical, m.cognitive.practical, m.cognitive.relational, m.cognitive.experimental] : null)
    .filter((v): v is number[] => v !== null);
  const cogSpread = multiDimSpread(cogVectors);
  const cogDomCounts = new Map<string, number>();
  for (const m of members) if (m.cognitive_dominant) cogDomCounts.set(m.cognitive_dominant, (cogDomCounts.get(m.cognitive_dominant) ?? 0) + 1);
  const cogDom = shannonDiversity([...cogDomCounts.values()]);
  const cognitive_diversity_score = Math.round((cogSpread + cogDom) / 2);

  // Problem solving diversity — 2-D spread.
  const psVectors = members
    .map((m) => m.problem_solving ? [m.problem_solving.structured, m.problem_solving.exploratory] : null)
    .filter((v): v is number[] => v !== null);
  const problem_solving_diversity_score = multiDimSpread(psVectors);

  // Information processing diversity — 4-D spread.
  const ipVectors = members
    .map((m) => m.information_processing ? [
      m.information_processing.depth, m.information_processing.breadth,
      m.information_processing.structured, m.information_processing.unstructured,
    ] : null)
    .filter((v): v is number[] => v !== null);
  const information_processing_diversity_score = multiDimSpread(ipVectors);

  const role_distribution_score = roleDistributionScore(members);
  const collaboration_balance_score = collaborationBalanceScore(members);

  // Meta-cognition: average across members that have a score.
  const mcVals = members.map((m) => m.meta_cognition).filter((v): v is number => typeof v === "number");
  const meta_cognition_score = mcVals.length ? Math.round(mean(mcVals)) : 0;

  // Legacy: skill diversity + innovation (kept for back-compat in UI).
  const skillCount = new Map<string, number>();
  for (const m of members) for (const s of m.skills) skillCount.set(s, (skillCount.get(s) ?? 0) + 1);
  const skill_diversity = shannonDiversity([...skillCount.values()]);
  const innovation = Math.round(mean(members.map((m) => m.idea_generation)));

  return {
    disc_diversity_score, cognitive_diversity_score,
    problem_solving_diversity_score, information_processing_diversity_score,
    role_distribution_score, collaboration_balance_score,
    meta_cognition_score, skill_diversity, innovation,
  };
}

// ─── CI Score ────────────────────────────────────────────────────────────────

// Equal-weighted average of the seven canonical sub-scores.
export function computeCI(sub: SubScores): number {
  const parts = [
    sub.disc_diversity_score,
    sub.cognitive_diversity_score,
    sub.problem_solving_diversity_score,
    sub.information_processing_diversity_score,
    sub.role_distribution_score,
    sub.collaboration_balance_score,
    sub.meta_cognition_score,
  ];
  return Math.round(clamp01to100(mean(parts)));
}

// Collective Blindness = 100 - weighted_diversity_coverage.
// Coverage uses the five diversity dimensions (DISC, cognitive, problem solving,
// information processing, role distribution). Lower diversity → higher blindness.
export function computeBlindness(sub: SubScores): number {
  const diversity = [
    sub.disc_diversity_score,
    sub.cognitive_diversity_score,
    sub.problem_solving_diversity_score,
    sub.information_processing_diversity_score,
    sub.role_distribution_score,
  ];
  const coverage = mean(diversity);
  return Math.round(clamp01to100(100 - coverage));
}

// Low confidence flag for small samples.
export function confidenceLabel(n: number): "low" | "medium" | "high" {
  if (n < 5) return "low";
  if (n < 15) return "medium";
  return "high";
}

// ─── Back-compat exports ─────────────────────────────────────────────────────

// ─── Behavioural / Diversity / Combined scores (v2 — spec'd dimensions) ─────

const JUNIOR_ROLES = new Set(["intern", "student_worker", "graduate_trainee", "analyst"]);
const MID_ROLES = new Set(["individual_contributor", "specialist", "consultant", "freelancer", "team_lead"]);
const SENIOR_ROLES = new Set(["manager", "senior_management", "executive"]);

function roleTier(role: string | null | undefined): "junior" | "mid" | "senior" | null {
  if (!role) return null;
  if (JUNIOR_ROLES.has(role)) return "junior";
  if (MID_ROLES.has(role)) return "mid";
  if (SENIOR_ROLES.has(role)) return "senior";
  return null;
}

function entropyOf<T>(items: T[], key: (x: T) => string | null | undefined): number {
  const counts = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (counts.size === 0) return 0;
  return shannonDiversity([...counts.values()]);
}

// Score A — Behavioural / Skills. Equal weight across the 7 dimensions.
// Accepts either members[] (v2) or a SubScores object (legacy: delegates to computeCI).
export function computeBehaviouralScore(arg: SubScores | MemberRow[]): number {
  if (!Array.isArray(arg)) return computeCI(arg);
  const members = arg;
  if (members.length === 0) return 0;

  // 1. DISC dominant entropy
  const disc = entropyOf(members, (m) => m.disc_dominant);

  // 2. Cognitive dominant entropy
  const cog = entropyOf(members, (m) => m.cognitive_dominant);

  // 3. Problem-solving diversity (spread of structured vs exploratory)
  const psVectors = members
    .map((m) => m.problem_solving ? [m.problem_solving.structured, m.problem_solving.exploratory] : null)
    .filter((v): v is number[] => v !== null);
  const ps = multiDimSpread(psVectors);

  // 4. Information-processing diversity (depth vs breadth)
  const ipVectors = members
    .map((m) => m.information_processing ? [m.information_processing.depth, m.information_processing.breadth] : null)
    .filter((v): v is number[] => v !== null);
  const ip = multiDimSpread(ipVectors);

  // 5. Collaboration balance
  const collab = members.map((m) => m.collaboration);
  const indep = members.map((m) => m.independent_work ?? 100 - m.collaboration);
  const collabBalance = clamp01to100(100 - Math.abs(mean(collab) - mean(indep)));

  // 6. Meta-cognition average
  const mcVals = members.map((m) => m.meta_cognition).filter((v): v is number => typeof v === "number");
  const meta = mcVals.length ? mean(mcVals) : 0;

  // 7. Role/seniority tier spread
  const roleSpread = entropyOf(members, (m) => roleTier(m.role_type));

  return Math.round(clamp01to100(mean([disc, cog, ps, ip, collabBalance, meta, roleSpread])));
}

export type DiversityMember = MemberRow & {
  years_experience_total?: number | null;
  education_level?: string | null;
};

// Score B — Identity / Demographics. Returns null when fewer than 2 dimensions
// have at least 5 members with non-null values.
export function computeDiversityScore(members: DiversityMember[]): number | null {
  if (members.length === 0) return null;
  const MIN = 5;
  const parts: number[] = [];

  const gendered = members.filter((m) => m.gender && m.gender.trim().length > 0);
  if (gendered.length >= MIN) parts.push(entropyOf(gendered, (m) => (m.gender ?? "").toLowerCase()));

  const natted = members.filter((m) => (m.nationalities ?? []).length > 0);
  if (natted.length >= MIN) parts.push(entropyOf(natted, (m) => (m.nationalities?.[0] ?? "").toLowerCase()));

  const exped = members.filter((m) => typeof m.years_experience_total === "number");
  if (exped.length >= MIN) {
    const band = (y: number) => y <= 2 ? "0-2" : y <= 5 ? "3-5" : y <= 10 ? "6-10" : "11+";
    parts.push(entropyOf(exped, (m) => band(m.years_experience_total as number)));
  }

  const eduMembers = members.filter((m) => m.education_level && m.education_level.trim().length > 0);
  if (eduMembers.length >= MIN) parts.push(entropyOf(eduMembers, (m) => (m.education_level ?? "").toLowerCase()));

  const tiered = members.filter((m) => roleTier(m.role_type) !== null);
  if (tiered.length >= MIN) parts.push(entropyOf(tiered, (m) => roleTier(m.role_type)));

  if (parts.length < 2) return null;
  return Math.round(clamp01to100(mean(parts)));
}

// Score C — Combined. If Score B is null, Score C = Score A.
export function computeCombinedScore(scoreA: number, scoreB: number | null): number {
  if (scoreB === null) return scoreA;
  return Math.round(clamp01to100((scoreA + scoreB) / 2));
}

// ─── Back-compat exports ─────────────────────────────────────────────────────

export const DEFAULT_WEIGHTS = {
  skill_diversity: 1, disc_diversity: 1, cognitive_diversity: 1,
  collaboration_balance: 1, innovation: 1, role_distribution: 1,
};

export function automationRisk(meanRepetition: number, meanInnovation: number): "low" | "medium" | "high" {
  const score = meanRepetition - meanInnovation;
  if (score > 25) return "high";
  if (score > 0) return "medium";
  return "low";
}
