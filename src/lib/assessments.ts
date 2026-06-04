// DISC: 12 forced-choice questions. Each option maps to D / I / S / C.
// Users pick the one most like them; we tally and normalize to percentages summing to 100.
export type DiscDim = "D" | "I" | "S" | "C";

export const DISC_QUESTIONS: { q: string; options: { label: string; dim: DiscDim }[] }[] = [
  { q: "At work I am most often described as…", options: [
    { label: "Direct and decisive", dim: "D" },
    { label: "Inspiring and outgoing", dim: "I" },
    { label: "Steady and patient", dim: "S" },
    { label: "Precise and analytical", dim: "C" },
  ]},
  { q: "When solving a problem I tend to…", options: [
    { label: "Take charge and act fast", dim: "D" },
    { label: "Brainstorm with others", dim: "I" },
    { label: "Look for a calm, proven path", dim: "S" },
    { label: "Study the data carefully", dim: "C" },
  ]},
  { q: "Under pressure I…", options: [
    { label: "Push harder", dim: "D" },
    { label: "Rally the team", dim: "I" },
    { label: "Stay composed", dim: "S" },
    { label: "Double-check the details", dim: "C" },
  ]},
  { q: "My ideal teammate is…", options: [
    { label: "Results-oriented", dim: "D" },
    { label: "Energetic and social", dim: "I" },
    { label: "Reliable and loyal", dim: "S" },
    { label: "Thorough and accurate", dim: "C" },
  ]},
  { q: "I get frustrated by…", options: [
    { label: "Indecision", dim: "D" },
    { label: "Routine and isolation", dim: "I" },
    { label: "Sudden change", dim: "S" },
    { label: "Sloppy work", dim: "C" },
  ]},
  { q: "In meetings I usually…", options: [
    { label: "Drive the agenda", dim: "D" },
    { label: "Share ideas openly", dim: "I" },
    { label: "Support the consensus", dim: "S" },
    { label: "Ask probing questions", dim: "C" },
  ]},
  { q: "I prefer goals that are…", options: [
    { label: "Big and bold", dim: "D" },
    { label: "Exciting and visible", dim: "I" },
    { label: "Achievable and stable", dim: "S" },
    { label: "Clearly defined and measurable", dim: "C" },
  ]},
  { q: "Conflict, for me, is…", options: [
    { label: "Sometimes necessary", dim: "D" },
    { label: "Best resolved through talking it out", dim: "I" },
    { label: "Uncomfortable; I avoid it", dim: "S" },
    { label: "Fixed by facts and logic", dim: "C" },
  ]},
  { q: "I learn best when…", options: [
    { label: "I can try things directly", dim: "D" },
    { label: "I discuss with others", dim: "I" },
    { label: "I have time to practise", dim: "S" },
    { label: "I have written references", dim: "C" },
  ]},
  { q: "When deadlines slip I…", options: [
    { label: "Refocus the team firmly", dim: "D" },
    { label: "Motivate everyone to push", dim: "I" },
    { label: "Help quietly behind the scenes", dim: "S" },
    { label: "Re-examine the plan", dim: "C" },
  ]},
  { q: "Recognition matters most when it is…", options: [
    { label: "For winning", dim: "D" },
    { label: "Public and warm", dim: "I" },
    { label: "Sincere and personal", dim: "S" },
    { label: "For quality of work", dim: "C" },
  ]},
  { q: "Change at work…", options: [
    { label: "Excites me — I lead it", dim: "D" },
    { label: "Energises me", dim: "I" },
    { label: "Concerns me; I adapt slowly", dim: "S" },
    { label: "Needs analysis before I commit", dim: "C" },
  ]},
];

export type CognitiveDim = "analytical" | "practical" | "relational" | "experimental";

// Whole-brain (Herrmann-style) 10-question quiz. Each option maps to one quadrant.
export const COGNITIVE_QUESTIONS: { q: string; options: { label: string; dim: CognitiveDim }[] }[] = [
  { q: "Faced with a new problem, my first move is to…", options: [
    { label: "Break it into numbers and logic", dim: "analytical" },
    { label: "Make a concrete step-by-step plan", dim: "practical" },
    { label: "Talk it through with people", dim: "relational" },
    { label: "Explore wild ideas and possibilities", dim: "experimental" },
  ]},
  { q: "I am most energised by…", options: [
    { label: "Data and patterns", dim: "analytical" },
    { label: "Getting things done", dim: "practical" },
    { label: "Helping or coaching others", dim: "relational" },
    { label: "Imagining the future", dim: "experimental" },
  ]},
  { q: "I trust decisions most when they are…", options: [
    { label: "Backed by evidence", dim: "analytical" },
    { label: "Tested and proven", dim: "practical" },
    { label: "Built on team agreement", dim: "relational" },
    { label: "Bold and original", dim: "experimental" },
  ]},
  { q: "Colleagues often come to me for…", options: [
    { label: "Sharp analysis", dim: "analytical" },
    { label: "Practical advice", dim: "practical" },
    { label: "Emotional support", dim: "relational" },
    { label: "Fresh ideas", dim: "experimental" },
  ]},
  { q: "I get bored by…", options: [
    { label: "Vague reasoning", dim: "analytical" },
    { label: "Endless debate without action", dim: "practical" },
    { label: "Cold, impersonal work", dim: "relational" },
    { label: "Repetitive routine", dim: "experimental" },
  ]},
  { q: "Given free time at work I would…", options: [
    { label: "Dig into a dataset", dim: "analytical" },
    { label: "Organise a backlog", dim: "practical" },
    { label: "Catch up with the team", dim: "relational" },
    { label: "Sketch a new concept", dim: "experimental" },
  ]},
  { q: "I am best at…", options: [
    { label: "Diagnosing problems", dim: "analytical" },
    { label: "Executing reliably", dim: "practical" },
    { label: "Building trust", dim: "relational" },
    { label: "Spotting opportunities", dim: "experimental" },
  ]},
  { q: "In a strategy meeting I would naturally…", options: [
    { label: "Question the assumptions", dim: "analytical" },
    { label: "Translate ideas into a roadmap", dim: "practical" },
    { label: "Check how the team feels about it", dim: "relational" },
    { label: "Propose a radical alternative", dim: "experimental" },
  ]},
  { q: "Mistakes happen most often when I…", options: [
    { label: "Over-analyse and stall", dim: "analytical" },
    { label: "Stick too rigidly to the plan", dim: "practical" },
    { label: "Avoid hard truths to keep harmony", dim: "relational" },
    { label: "Jump ahead before validating", dim: "experimental" },
  ]},
  { q: "A great workday for me ends with…", options: [
    { label: "A clearly solved problem", dim: "analytical" },
    { label: "A list of completed tasks", dim: "practical" },
    { label: "A meaningful conversation", dim: "relational" },
    { label: "An exciting new direction", dim: "experimental" },
  ]},
];

// Normalize a set of integer counts so they sum to exactly `total` (default 100).
// Uses largest-remainder rounding to keep each component close to its true proportion.
function normalizeTo(counts: Record<string, number>, total = 100): Record<string, number> {
  const keys = Object.keys(counts);
  const sum = keys.reduce((a, k) => a + counts[k], 0) || 1;
  const raw = keys.map((k) => ({ k, v: (counts[k] / sum) * total }));
  const floors = raw.map((r) => ({ k: r.k, base: Math.floor(r.v), rem: r.v - Math.floor(r.v) }));
  let used = floors.reduce((a, r) => a + r.base, 0);
  const remaining = total - used;
  const sorted = [...floors].sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < remaining; i++) sorted[i % sorted.length].base += 1;
  const out: Record<string, number> = {};
  for (const r of floors) out[r.k] = r.base;
  return out;
}

export function scoreDisc(answers: DiscDim[]) {
  const tally: Record<DiscDim, number> = { D: 0, I: 0, S: 0, C: 0 };
  for (const a of answers) tally[a]++;
  const norm = normalizeTo(tally as any, 100);
  const dominant = (Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]) as DiscDim;
  return {
    d: norm.D, i: norm.I, s: norm.S, c: norm.C,
    dominant,
  };
}

export function scoreCognitive(answers: CognitiveDim[]) {
  const tally: Record<CognitiveDim, number> = { analytical: 0, practical: 0, relational: 0, experimental: 0 };
  for (const a of answers) tally[a]++;
  const norm = normalizeTo(tally as any, 100);
  const dominant = (Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]) as CognitiveDim;
  return {
    analytical: norm.analytical, practical: norm.practical,
    relational: norm.relational, experimental: norm.experimental,
    dominant,
  };
}

// ============ DISC presentation helpers ============
export const DISC_META: Record<DiscDim, { name: string; color: string; tag: string; verbs: string }> = {
  D: { name: "Dominance",         color: "#ef4444", tag: "Red",    verbs: "drive results and take decisive action" },
  I: { name: "Influence",         color: "#facc15", tag: "Yellow", verbs: "energize teams and inspire people" },
  S: { name: "Steadiness",        color: "#22c55e", tag: "Green",  verbs: "create stability and support others" },
  C: { name: "Conscientiousness", color: "#3b82f6", tag: "Blue",   verbs: "ensure precision, quality and rigor" },
};

// Supports balanced profiles and 1–3 dominant trait combinations.
export function discInterpretation(d: number, i: number, s: number, c: number): string {
  const arr: { k: DiscDim; v: number }[] = [
    { k: "D" as DiscDim, v: d }, { k: "I" as DiscDim, v: i }, { k: "S" as DiscDim, v: s }, { k: "C" as DiscDim, v: c },
  ].sort((a, b) => b.v - a.v);
  const total = arr.reduce((a, b) => a + b.v, 0);
  if (total === 0) return "Take the DISC assessment to see your interpretation.";

  // Fully balanced
  if (arr[0].v - arr[3].v <= 6) {
    return "Balanced profile — you adapt fluidly across Dominance, Influence, Steadiness and Conscientiousness, drawing on whichever the situation requires.";
  }

  const top = arr[0];
  const dominants = arr.filter((x) => top.v - x.v <= 10 && x.v > 0);

  if (dominants.length >= 3) {
    const names = dominants.slice(0, 3).map((x) => DISC_META[x.k].name);
    return `Tri-dominant (${names.join(" / ")}) — you flex across these three modes, ${DISC_META[dominants[0].k].verbs}, while also ${DISC_META[dominants[1].k].verbs} and ${DISC_META[dominants[2].k].verbs}.`;
  }
  if (dominants.length === 2) {
    const [a, b] = dominants;
    return `Predominantly ${DISC_META[a.k].name} with strong ${DISC_META[b.k].name} — you ${DISC_META[a.k].verbs} while also helping to ${DISC_META[b.k].verbs}.`;
  }
  return `Predominantly ${DISC_META[top.k].name} — you ${DISC_META[top.k].verbs}.`;
}

// Cognitive labels (Analytical, Practical, Strategic, Creative) mapped to stored dims.
export const COGNITIVE_META: Record<CognitiveDim, { name: string; color: string }> = {
  analytical:   { name: "Analytical", color: "#3b82f6" },
  practical:    { name: "Practical",  color: "#22c55e" },
  relational:   { name: "Strategic",  color: "#f59e0b" },
  experimental: { name: "Creative",   color: "#a855f7" },
};
