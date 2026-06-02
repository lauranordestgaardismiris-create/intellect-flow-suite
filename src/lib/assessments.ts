// DISC: 12 forced-choice questions. Each option maps to D / I / S / C.
// Users pick the one most like them; we tally and normalize to 0-100.
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

export function scoreDisc(answers: DiscDim[]) {
  const tally = { D: 0, I: 0, S: 0, C: 0 };
  for (const a of answers) tally[a]++;
  const total = answers.length || 1;
  const norm = {
    d: Math.round((tally.D / total) * 100),
    i: Math.round((tally.I / total) * 100),
    s: Math.round((tally.S / total) * 100),
    c: Math.round((tally.C / total) * 100),
  };
  const dominant = (Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]) as DiscDim;
  return { ...norm, dominant };
}

export function scoreCognitive(answers: CognitiveDim[]) {
  const tally = { analytical: 0, practical: 0, relational: 0, experimental: 0 };
  for (const a of answers) tally[a]++;
  const total = answers.length || 1;
  const norm = {
    analytical: Math.round((tally.analytical / total) * 100),
    practical: Math.round((tally.practical / total) * 100),
    relational: Math.round((tally.relational / total) * 100),
    experimental: Math.round((tally.experimental / total) * 100),
  };
  const dominant = (Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]) as CognitiveDim;
  return { ...norm, dominant };
}
