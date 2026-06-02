// Shared math for Collective Intelligence scoring. Pure functions; safe in both
// browser and server bundles.

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

export function stddev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

export const DEFAULT_WEIGHTS = {
  skill_diversity: 0.2,
  disc_diversity: 0.15,
  cognitive_diversity: 0.15,
  collaboration_balance: 0.15,
  innovation: 0.2,
  role_distribution: 0.15,
};

export type SubScores = {
  skill_diversity: number;
  disc_diversity: number;
  cognitive_diversity: number;
  collaboration_balance: number;
  innovation: number;
  role_distribution: number;
};

export type MemberRow = {
  role_type: string | null;
  skills: string[];
  disc_dominant: string | null;
  cognitive_dominant: string | null;
  collaboration: number;
  idea_generation: number;
  task_repetition: number;
};

export function computeSubScores(members: MemberRow[]): SubScores {
  if (members.length === 0) {
    return { skill_diversity: 0, disc_diversity: 0, cognitive_diversity: 0,
      collaboration_balance: 0, innovation: 0, role_distribution: 0 };
  }
  // skill diversity
  const skillCount = new Map<string, number>();
  for (const m of members) for (const s of m.skills) skillCount.set(s, (skillCount.get(s) ?? 0) + 1);
  const skill_diversity = shannonDiversity([...skillCount.values()]);
  // disc diversity
  const dCount = new Map<string, number>();
  for (const m of members) if (m.disc_dominant) dCount.set(m.disc_dominant, (dCount.get(m.disc_dominant) ?? 0) + 1);
  const disc_diversity = shannonDiversity([...dCount.values()]);
  // cognitive diversity
  const cCount = new Map<string, number>();
  for (const m of members) if (m.cognitive_dominant) cCount.set(m.cognitive_dominant, (cCount.get(m.cognitive_dominant) ?? 0) + 1);
  const cognitive_diversity = shannonDiversity([...cCount.values()]);
  // collaboration balance: lower stdev = more balance
  const collab = members.map((m) => m.collaboration);
  const collab_sd = stddev(collab);
  const collaboration_balance = Math.max(0, Math.round(100 - collab_sd * 2));
  // innovation: mean idea_generation
  const innovation = Math.round(members.reduce((s, m) => s + m.idea_generation, 0) / members.length);
  // role distribution: coverage of IC/manager/executive
  const rCount = new Map<string, number>();
  for (const m of members) if (m.role_type) rCount.set(m.role_type, (rCount.get(m.role_type) ?? 0) + 1);
  const coverage = rCount.size / 3;
  const role_distribution = Math.round(coverage * 100);
  return { skill_diversity, disc_diversity, cognitive_diversity, collaboration_balance, innovation, role_distribution };
}

export function computeCI(sub: SubScores, weights = DEFAULT_WEIGHTS): number {
  const total =
    sub.skill_diversity * weights.skill_diversity +
    sub.disc_diversity * weights.disc_diversity +
    sub.cognitive_diversity * weights.cognitive_diversity +
    sub.collaboration_balance * weights.collaboration_balance +
    sub.innovation * weights.innovation +
    sub.role_distribution * weights.role_distribution;
  return Math.round(total);
}

export function automationRisk(meanRepetition: number, meanInnovation: number): "low" | "medium" | "high" {
  const score = meanRepetition - meanInnovation;
  if (score > 25) return "high";
  if (score > 0) return "medium";
  return "low";
}
