import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getOnboardingCatalogs, getMyProfileStatus, submitOnboarding, lookupInvite } from "@/lib/onboarding.functions";
import { recomputeCIScores } from "@/lib/ci.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { DISC_QUESTIONS, COGNITIVE_QUESTIONS, scoreDisc, scoreCognitive, type DiscDim, type CognitiveDim } from "@/lib/assessments";
import { DiscBar } from "@/components/disc-bar";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — Collective Intelligence Design" }] }),
  validateSearch: (s) => ({ invite: typeof s.invite === "string" ? s.invite : undefined }),
  component: OnboardingPage,
});

type Catalogs = { skills: { id: string; name: string; category: string | null; subcategory: string | null }[]; languages: { id: string; name: string }[] };

const STEPS = ["Workspace", "Personal", "Demographics", "Education", "Professional", "Skills", "Work style", "DISC", "Cognitive", "Review"] as const;

// ---- option lists ----
const GENDER_OPTIONS = ["Female", "Male", "Other"] as const;
const RELIGION_OPTIONS = ["Christian", "Muslim", "Jewish", "Hindu", "Buddhist", "Atheist", "Agnostic", "None", "Other"] as const;
const DEGREE_LEVELS = ["Bachelor's", "Master's", "PhD", "MBA", "Other"];
const DEGREE_TYPES = ["BSc", "BA", "BBA", "MSc", "MA", "MBA", "PhD", "Other"];
const FIELDS = ["Economics", "Business Administration", "Finance", "Marketing", "Computer Science", "Engineering", "Data Science", "Psychology", "Sociology", "Medicine", "Law", "Arts", "Humanities", "Natural Sciences", "Mathematics", "Other"];
const UNIVERSITIES = ["CBS", "Copenhagen Business School", "University of Copenhagen (KU)", "Aarhus University (AU)", "DTU", "ITU", "Stanford", "MIT", "Harvard", "Oxford", "Cambridge", "UCL", "INSEAD", "ETH Zurich", "HEC Paris", "LSE", "Wharton", "Other"];

type Education = {
  degree_level: string;
  degree_type: string;
  field_of_study: string;
  field_other: string;
  university: string;
  university_other: string;
  graduation_year: string;
};
const emptyEdu = (): Education => ({
  degree_level: "", degree_type: "", field_of_study: "", field_other: "",
  university: "", university_other: "", graduation_year: "",
});

function OnboardingPage() {
  const { invite } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const { user, loading } = useAuth();
  const getCatalogs = useServerFn(getOnboardingCatalogs);
  const getStatus = useServerFn(getMyProfileStatus);
  const submit = useServerFn(submitOnboarding);
  const recompute = useServerFn(recomputeCIScores);
  const checkInvite = useServerFn(lookupInvite);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data: catalogs } = useQuery<Catalogs>({
    queryKey: ["catalogs"],
    queryFn: () => getCatalogs() as any,
    enabled: !!user,
  });
  const { data: status } = useQuery({
    queryKey: ["profile-status"],
    queryFn: () => getStatus() as any,
    enabled: !!user,
  });

  // Allow re-entry from "Retake assessments" — only redirect away if user landed here while complete with no intent.
  // We respect a `?retake=1` flag if present.
  const search = Route.useSearch() as { invite?: string };
  useEffect(() => {
    if (status?.profile?.onboarding_complete && !search.invite) {
      // Stay if user explicitly navigated here from "Retake" — heuristic: came from /my-profile.
      const fromMyProfile = typeof document !== "undefined" && document.referrer.includes("/my-profile");
      if (!fromMyProfile) navigate({ to: "/dashboard" });
    }
  }, [status, navigate, search.invite]);

  const [step, setStep] = useState(0);
  const [inviteValid, setInviteValid] = useState<{ valid: boolean; org_name?: string; reason?: string } | null>(null);
  const [mode, setMode] = useState<"create" | "invite">(invite ? "invite" : "create");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (!invite) return;
    checkInvite({ data: { token: invite } }).then((r: any) => setInviteValid(r));
  }, [invite, checkInvite]);

  // form state
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState("");
  const [religion, setReligion] = useState("");
  const [religionOther, setReligionOther] = useState("");
  const [orientation, setOrientation] = useState("");
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [nationalityInput, setNationalityInput] = useState("");
  const [neurodivergence, setNeurodivergence] = useState("");
  const [disability, setDisability] = useState("");
  const [educations, setEducations] = useState<Education[]>([emptyEdu()]);
  const [jobTitle, setJobTitle] = useState("");
  const [roleType, setRoleType] = useState<
    "individual_contributor" | "manager" | "executive" | "intern" |
    "senior_management" | "team_lead" | "specialist" | "consultant" | "freelancer" | "other"
  >("individual_contributor");
  const [yearsTotal, setYearsTotal] = useState<string>("");
  const [yearsInRole, setYearsInRole] = useState<string>("");
  const [department, setDepartment] = useState("");
  const [team, setTeam] = useState("");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [langIds, setLangIds] = useState<string[]>([]);
  const [langSearch, setLangSearch] = useState("");
  const [openMainCats, setOpenMainCats] = useState<string[]>([]);
  const [openSubCats, setOpenSubCats] = useState<string[]>([]);

  const [collab, setCollab] = useState(60);
  const [indep, setIndep] = useState(60);
  const [repet, setRepet] = useState(40);
  const [idea, setIdea] = useState(60);
  // Problem solving style
  const [psStructured, setPsStructured] = useState(50);
  const [psExploratory, setPsExploratory] = useState(50);
  // Information processing style
  const [ipDepth, setIpDepth] = useState(50);
  const [ipBreadth, setIpBreadth] = useState(50);
  const [ipStructured, setIpStructured] = useState(50);
  const [ipUnstructured, setIpUnstructured] = useState(50);
  // Meta-cognition
  const [mcReflect, setMcReflect] = useState(60);
  const [mcAdjust, setMcAdjust] = useState(60);
  const [mcBias, setMcBias] = useState(60);
  const [discA, setDiscA] = useState<(DiscDim | null)[]>(Array(DISC_QUESTIONS.length).fill(null));
  const [cogA, setCogA] = useState<(CognitiveDim | null)[]>(Array(COGNITIVE_QUESTIONS.length).fill(null));
  const [busy, setBusy] = useState(false);

  // Hierarchical skill grouping: Main Category -> Subcategory -> Skills
  // The DB `skills.category` field holds the existing flat category (e.g. "Programming").
  // We map those into higher-level main categories for navigation. Subcategory (DB column)
  // is used when present; otherwise the existing category acts as the subcategory label.
  const MAIN_CATEGORY_MAP: Record<string, string> = {
    ai: "AI",
    "machine learning": "AI",
    programming: "Technical",
    "data & analytics": "Technical",
    analytics: "Technical",
    engineering: "Technical",
    cybersecurity: "Technical",
    design: "Creative / Design",
    creative: "Creative / Design",
    finance: "Business",
    marketing: "Business",
    sales: "Business",
    operations: "Business",
    "project management": "Business",
    leadership: "People & Leadership",
    communication: "People & Leadership",
    hr: "People & Leadership",
    soft: "People & Leadership",
    legal: "Business",
  };
  const MAIN_CATEGORY_ORDER = ["AI", "Technical", "Creative / Design", "Business", "People & Leadership", "Other"];

  type SkillItem = { id: string; name: string };
  const skillTree = useMemo(() => {
    const tree: Record<string, Record<string, SkillItem[]>> = {};
    for (const s of catalogs?.skills ?? []) {
      const rawCat = (s.category || "Other").trim();
      if (rawCat.toLowerCase() === "languages") continue;
      const main = MAIN_CATEGORY_MAP[rawCat.toLowerCase()] || "Other";
      const sub = (s as any).subcategory || rawCat;
      const subKey = sub.charAt(0).toUpperCase() + sub.slice(1);
      tree[main] = tree[main] || {};
      tree[main][subKey] = tree[main][subKey] || [];
      tree[main][subKey].push({ id: s.id, name: s.name });
    }
    return tree;
  }, [catalogs]);

  const filteredLanguages = useMemo(() => {
    const all = catalogs?.languages ?? [];
    const q = langSearch.trim().toLowerCase();
    const list = q ? all.filter((l) => l.name.toLowerCase().includes(q)) : all;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogs, langSearch]);

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function updateEdu(i: number, patch: Partial<Education>) {
    setEducations((es) => es.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  }
  function removeEdu(i: number) {
    setEducations((es) => es.length <= 1 ? es : es.filter((_, idx) => idx !== i));
  }

  // Compute DISC live for the review step
  const discPreview = useMemo(() => scoreDisc(discA.filter(Boolean) as DiscDim[]), [discA]);

  async function finish() {
    const disc = scoreDisc(discA.filter(Boolean) as DiscDim[]);
    const cog = scoreCognitive(cogA.filter(Boolean) as CognitiveDim[]);
    setBusy(true);
    try {
      const resolvedReligion = religion === "Other" ? (religionOther.trim() || "Other") : (religion || null);
      const cleanEdus = educations
        .filter((e) => e.degree_level || e.degree_type || e.field_of_study || e.university || e.graduation_year)
        .map((e) => ({
          degree_level: e.degree_level || null,
          degree_type: e.degree_type || null,
          field_of_study: e.field_of_study === "Other" ? (e.field_other.trim() || "Other") : (e.field_of_study || null),
          university: e.university === "Other" ? (e.university_other.trim() || "Other") : (e.university || null),
          graduation_year: e.graduation_year ? parseInt(e.graduation_year) : null,
        }));
      await submit({ data: {
        mode, org_name: mode === "create" ? orgName : undefined, invite_token: mode === "invite" ? invite : undefined,
        full_name: fullName, age: age ? parseInt(age) : null, gender: gender || null,
        religion: resolvedReligion, sexual_orientation: orientation || null,
        nationalities,
        neurodivergence: neurodivergence.trim() || null,
        disability: disability.trim() || null,
        educations: cleanEdus,
        language_ids: langIds,
        job_title: jobTitle || null, role_type: roleType,
        years_experience_total: yearsTotal ? parseInt(yearsTotal) : null,
        years_in_role: yearsInRole ? parseInt(yearsInRole) : null,
        department_name: department || null, team_name: team || null,
        skill_ids: skillIds,
        collaboration: collab, independent_work: indep, task_repetition: repet, idea_generation: idea,
        problem_solving_style: {
          structured_problem_solving: psStructured,
          exploratory_problem_solving: psExploratory,
        },
        information_processing_style: {
          depth_oriented_processing: ipDepth,
          breadth_oriented_processing: ipBreadth,
          structured_information_preference: ipStructured,
          unstructured_information_preference: ipUnstructured,
        },
        meta_cognition: {
          reflects_before_decision: mcReflect,
          adjusts_thinking_when_wrong: mcAdjust,
          aware_of_personal_biases: mcBias,
        },
        disc: { d: disc.d, i: disc.i, s: disc.s, c: disc.c, dominant: disc.dominant },
        cognitive: { analytical: cog.analytical, practical: cog.practical, relational: cog.relational, experimental: cog.experimental, dominant: cog.dominant },
      } } as any);

      await recompute().catch(() => {});
      toast.success("Profile complete!");
      router.invalidate();
      // Redirect by role
      const role = (status as any)?.role;
      navigate({ to: role === "org_admin" ? "/dashboard" : "/my-profile" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setBusy(false); }
  }

  function next() { setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{STEPS[step]}</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your workspace</h2>
              {invite ? (
                inviteValid?.valid ? (
                  <div className="rounded-md border bg-accent/30 p-4">
                    <p className="text-sm">You're joining <strong>{inviteValid.org_name}</strong>.</p>
                  </div>
                ) : inviteValid && !inviteValid.valid ? (
                  <p className="text-sm text-destructive">Invite link is {inviteValid.reason ?? "invalid"}.</p>
                ) : <p className="text-sm text-muted-foreground">Checking invite…</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Create a new company workspace. You'll be the admin.</p>
                  <div className="space-y-2">
                    <Label>Company name</Label>
                    <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc." />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Personal</h2>
              <div className="space-y-2"><Label>Full name *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Age</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Religion (optional)</Label>
                  <Select value={religion} onValueChange={setReligion}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {RELIGION_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {religion === "Other" && (
                    <Input value={religionOther} onChange={(e) => setReligionOther(e.target.value)} placeholder="Specify…" className="mt-2" />
                  )}
                </div>
                <div className="space-y-2"><Label>Sexual orientation (optional)</Label><Input value={orientation} onChange={(e) => setOrientation(e.target.value)} /></div>
              </div>
              <p className="text-xs text-muted-foreground">All personal fields are private to you. Aggregated diversity metrics are computed without exposing individual rows.</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Demographics</h2>
              <p className="text-sm text-muted-foreground">All fields are optional. Used only for aggregated diversity metrics.</p>
              <div className="space-y-2">
                <Label>Nationality (you can add more than one)</Label>
                <div className="flex flex-wrap gap-2">
                  {nationalities.map((n) => (
                    <span key={n} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs">
                      {n}
                      <button type="button" onClick={() => setNationalities((a) => a.filter((x) => x !== n))} className="text-muted-foreground hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={nationalityInput}
                    onChange={(e) => setNationalityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = nationalityInput.trim();
                        if (v && !nationalities.includes(v) && nationalities.length < 5) {
                          setNationalities((a) => [...a, v]);
                          setNationalityInput("");
                        }
                      }
                    }}
                    placeholder="e.g. Greek, Italian"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const v = nationalityInput.trim();
                    if (v && !nationalities.includes(v) && nationalities.length < 5) {
                      setNationalities((a) => [...a, v]);
                      setNationalityInput("");
                    }
                  }}>Add</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Neurodivergence (optional)</Label>
                <Input value={neurodivergence} onChange={(e) => setNeurodivergence(e.target.value)} placeholder="e.g. ADHD, Autism, Dyslexia, prefer not to say" />
              </div>
              <div className="space-y-2">
                <Label>Disability (optional)</Label>
                <Input value={disability} onChange={(e) => setDisability(e.target.value)} placeholder="Specify or leave blank" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Educational background</h2>
                <p className="text-sm text-muted-foreground">Add up to three degrees (e.g. Bachelor's, Master's, PhD).</p>
              </div>
              {educations.map((edu, i) => (
                <div key={i} className="rounded-lg border bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Degree {i + 1}</p>
                    {educations.length > 1 && (
                      <button type="button" onClick={() => removeEdu(i)} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Degree level</Label>
                      <Select value={edu.degree_level} onValueChange={(v) => updateEdu(i, { degree_level: v })}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>{DEGREE_LEVELS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Degree type</Label>
                      <Select value={edu.degree_type} onValueChange={(v) => updateEdu(i, { degree_type: v })}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>{DEGREE_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Field of study</Label>
                    <Select value={edu.field_of_study} onValueChange={(v) => updateEdu(i, { field_of_study: v })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{FIELDS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                    {edu.field_of_study === "Other" && (
                      <Input value={edu.field_other} onChange={(e) => updateEdu(i, { field_other: e.target.value })} placeholder="Specify field…" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>University</Label>
                      <Select value={edu.university} onValueChange={(v) => updateEdu(i, { university: v })}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>{UNIVERSITIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                      {edu.university === "Other" && (
                        <Input value={edu.university_other} onChange={(e) => updateEdu(i, { university_other: e.target.value })} placeholder="Specify university…" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Graduation year</Label>
                      <Input type="number" value={edu.graduation_year} onChange={(e) => updateEdu(i, { graduation_year: e.target.value })} placeholder="e.g. 2023" />
                    </div>
                  </div>
                </div>
              ))}
              {educations.length < 3 && (
                <Button variant="outline" size="sm" onClick={() => setEducations((es) => [...es, emptyEdu()])}>+ Add another degree</Button>
              )}
            </div>
          )}


          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Professional</h2>
              <div className="space-y-2"><Label>Job title</Label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Role type</Label>
                <Select value={roleType} onValueChange={(v) => setRoleType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="senior_management">Senior Management</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="team_lead">Team Lead</SelectItem>
                    <SelectItem value="individual_contributor">Individual Contributor</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Years of experience (total)</Label>
                  <Input type="number" min={0} value={yearsTotal} onChange={(e) => setYearsTotal(e.target.value)} placeholder="e.g. 8" />
                </div>
                <div className="space-y-2">
                  <Label>Years in current role</Label>
                  <Input type="number" min={0} value={yearsInRole} onChange={(e) => setYearsInRole(e.target.value)} placeholder="e.g. 2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["HR","Finance","Engineering","Sales","Marketing","Operations","Product","Design","Legal","Other"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Team (optional)</Label><Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Platform" /></div>
              </div>

            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Core skills</h2>
                <p className="text-sm text-muted-foreground">
                  Browse main areas, expand a subcategory, and tap individual skills. You can select across multiple areas.
                </p>
              </div>
              <div className="space-y-3">
                {MAIN_CATEGORY_ORDER.filter((m) => skillTree[m]).map((main) => {
                  const subs = skillTree[main];
                  const mainOpen = openMainCats.includes(main);
                  const allItems = Object.values(subs).flat();
                  const selectedInMain = allItems.filter((s) => skillIds.includes(s.id)).length;
                  return (
                    <div key={main} className="rounded-xl border bg-background">
                      <button
                        type="button"
                        onClick={() => setOpenMainCats((a) => toggle(a, main))}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground">{mainOpen ? "▾" : "▸"}</span>
                          {main}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {selectedInMain > 0
                            ? `${selectedInMain} selected · ${Object.keys(subs).length} subcategories`
                            : `${Object.keys(subs).length} subcategories · ${allItems.length} skills`}
                        </span>
                      </button>
                      {mainOpen && (
                        <div className="border-t px-3 py-3 space-y-2">
                          {Object.entries(subs).sort(([a], [b]) => a.localeCompare(b)).map(([sub, items]) => {
                            const subKey = `${main}::${sub}`;
                            const subOpen = openSubCats.includes(subKey);
                            const selectedHere = items.filter((s) => skillIds.includes(s.id)).length;
                            return (
                              <div key={subKey} className="rounded-lg border bg-card">
                                <button
                                  type="button"
                                  onClick={() => setOpenSubCats((a) => toggle(a, subKey))}
                                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{subOpen ? "▾" : "▸"}</span>
                                    {sub}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {selectedHere > 0 ? `${selectedHere} selected` : `${items.length} skills`}
                                  </span>
                                </button>
                                {subOpen && (
                                  <div className="border-t px-3 py-3">
                                    <div className="flex flex-wrap gap-2">
                                      {items.map((s) => (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={() => setSkillIds((a) => toggle(a, s.id))}
                                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                                            skillIds.includes(s.id)
                                              ? "bg-primary text-primary-foreground border-primary"
                                              : "bg-background hover:bg-muted"
                                          }`}
                                        >
                                          {s.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Languages — dedicated main category with global searchable list */}
              <div className="rounded-xl border bg-background">
                <button
                  type="button"
                  onClick={() => setOpenMainCats((a) => toggle(a, "Languages"))}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">{openMainCats.includes("Languages") ? "▾" : "▸"}</span>
                    Languages
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {langIds.length > 0
                      ? `${langIds.length} selected · ${catalogs?.languages?.length ?? 0} available`
                      : `Search ${catalogs?.languages?.length ?? 0} languages`}
                  </span>
                </button>
                {openMainCats.includes("Languages") && (
                  <div className="border-t px-3 py-3 space-y-3">
                    <Input
                      value={langSearch}
                      onChange={(e) => setLangSearch(e.target.value)}
                      placeholder="Search languages…"
                    />
                    {langIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(catalogs?.languages ?? [])
                          .filter((l) => langIds.includes(l.id))
                          .map((l) => (
                            <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs">
                              {l.name}
                              <button type="button" onClick={() => setLangIds((a) => a.filter((x) => x !== l.id))} className="text-muted-foreground hover:text-destructive">×</button>
                            </span>
                          ))}
                      </div>
                    )}
                    <div className="max-h-64 overflow-y-auto flex flex-wrap gap-2 pr-1">
                      {filteredLanguages.slice(0, 80).map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setLangIds((a) => toggle(a, l.id))}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            langIds.includes(l.id)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card hover:bg-muted"
                          }`}
                        >
                          {l.name}
                        </button>
                      ))}
                      {filteredLanguages.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2">No languages match "{langSearch}".</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {skillIds.length} skill{skillIds.length === 1 ? "" : "s"} · {langIds.length} language{langIds.length === 1 ? "" : "s"} selected
              </p>
            </div>
          )}


          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Work & thinking style</h2>
                <p className="text-sm text-muted-foreground">Each slider is independent — they do not need to sum to 100.</p>
              </div>

              <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work style</p>
                {([
                  ["Collaboration / teamwork", "How much of your work is done with others.", collab, setCollab],
                  ["Independent work", "How much of your work you do alone.", indep, setIndep],
                  ["Repetitive tasks", "How much of your work is routine and repeated.", repet, setRepet],
                  ["Idea generation / innovation", "How much of your work involves creating new ideas.", idea, setIdea],
                ] as const).map(([label, tip, val, set]) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between text-sm"><Label>{label}</Label><span className="text-muted-foreground tabular-nums">{val}</span></div>
                    <Slider value={[val as number]} onValueChange={(v) => (set as any)(v[0])} max={100} step={1} />
                    <p className="text-xs text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </section>

              <section className="space-y-4 border-t pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Problem-solving style</p>
                {([
                  ["Structured problem solving", "I follow a clear, methodical process.", psStructured, setPsStructured],
                  ["Exploratory problem solving", "I experiment, prototype and discover as I go.", psExploratory, setPsExploratory],
                ] as const).map(([label, tip, val, set]) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between text-sm"><Label>{label}</Label><span className="text-muted-foreground tabular-nums">{val}</span></div>
                    <Slider value={[val as number]} onValueChange={(v) => (set as any)(v[0])} max={100} step={1} />
                    <p className="text-xs text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </section>

              <section className="space-y-4 border-t pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Information processing</p>
                {([
                  ["Depth-oriented", "I prefer going deep on one topic at a time.", ipDepth, setIpDepth],
                  ["Breadth-oriented", "I prefer scanning broadly across many topics.", ipBreadth, setIpBreadth],
                  ["Structured information", "I work best with organised, formatted info.", ipStructured, setIpStructured],
                  ["Unstructured information", "I'm comfortable with raw, messy info.", ipUnstructured, setIpUnstructured],
                ] as const).map(([label, tip, val, set]) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between text-sm"><Label>{label}</Label><span className="text-muted-foreground tabular-nums">{val}</span></div>
                    <Slider value={[val as number]} onValueChange={(v) => (set as any)(v[0])} max={100} step={1} />
                    <p className="text-xs text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </section>

              <section className="space-y-4 border-t pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta-cognition (self-assessment)</p>
                {([
                  ["I reflect before making decisions.", "How often you pause to think things through.", mcReflect, setMcReflect],
                  ["I adjust my thinking when I'm shown I'm wrong.", "How easily you update your views.", mcAdjust, setMcAdjust],
                  ["I'm aware of my personal biases.", "How honestly you notice your own biases.", mcBias, setMcBias],
                ] as const).map(([label, tip, val, set]) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between text-sm"><Label>{label}</Label><span className="text-muted-foreground tabular-nums">{val}</span></div>
                    <Slider value={[val as number]} onValueChange={(v) => (set as any)(v[0])} max={100} step={1} />
                    <p className="text-xs text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </section>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">DISC personality</h2>
              <p className="text-sm text-muted-foreground">Pick the option most like you for each.</p>
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-5">
                {DISC_QUESTIONS.map((q, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-sm font-medium">{i + 1}. {q.q}</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {q.options.map((o) => (
                        <button key={o.label} type="button" onClick={() => setDiscA((a) => { const c = [...a]; c[i] = o.dim; return c; })}
                          className={`rounded-md border px-3 py-2 text-left text-sm ${discA[i] === o.dim ? "border-primary bg-primary/10" : ""}`}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Cognitive thinking style</h2>
              <p className="text-sm text-muted-foreground">Choose the answer that feels most natural to you.</p>
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-5">
                {COGNITIVE_QUESTIONS.map((q, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-sm font-medium">{i + 1}. {q.q}</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {q.options.map((o) => (
                        <button key={o.label} type="button" onClick={() => setCogA((a) => { const c = [...a]; c[i] = o.dim; return c; })}
                          className={`rounded-md border px-3 py-2 text-left text-sm ${cogA[i] === o.dim ? "border-primary bg-primary/10" : ""}`}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 9 && (() => {
            const cogPreview = scoreCognitive(cogA.filter(Boolean) as CognitiveDim[]);
            const COG_LABEL: Record<string, string> = { analytical: "Analytical", practical: "Practical", relational: "Strategic", experimental: "Creative" };
            const cogBars: Array<[string, number]> = [
              ["Analytical", cogPreview.analytical],
              ["Practical", cogPreview.practical],
              ["Strategic", cogPreview.relational],
              ["Creative", cogPreview.experimental],
            ];
            const mcMean = Math.round((mcReflect + mcAdjust + mcBias) / 3);
            return (
              <div className="space-y-6 py-2">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-semibold">Your profile snapshot</h2>
                  <p className="text-sm text-muted-foreground">A multi-dimensional overview from all assessments.</p>
                </div>

                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DISC personality</p>
                  {discA.every(Boolean) ? (
                    <DiscBar d={discPreview.d} i={discPreview.i} s={discPreview.s} c={discPreview.c} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Complete the DISC step to see your breakdown.</p>
                  )}
                </section>

                <section className="space-y-2 border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cognitive thinking style</p>
                  {cogA.every(Boolean) ? (
                    <div className="space-y-2">
                      {cogBars.map(([label, val]) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs"><span>{label}</span><span className="tabular-nums text-muted-foreground">{val}</span></div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground pt-1">Dominant: <strong className="text-foreground">{COG_LABEL[cogPreview.dominant] ?? cogPreview.dominant}</strong></p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Complete the cognitive step to see your breakdown.</p>
                  )}
                </section>

                <section className="space-y-2 border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work & thinking style</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {([
                      ["Collaboration", collab],["Independent", indep],
                      ["Repetition", repet],["Innovation", idea],
                      ["Structured problem solving", psStructured],["Exploratory problem solving", psExploratory],
                      ["Depth", ipDepth],["Breadth", ipBreadth],
                      ["Meta-cognition", mcMean],
                    ] as const).map(([label, val]) => (
                      <div key={label} className="rounded-md border bg-background p-2">
                        <div className="text-muted-foreground">{label}</div>
                        <div className="text-base font-semibold tabular-nums">{val}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-2 border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills & languages</p>
                  <p className="text-sm">
                    <strong className="text-foreground">{skillIds.length}</strong> skill{skillIds.length === 1 ? "" : "s"} ·{" "}
                    <strong className="text-foreground">{langIds.length}</strong> language{langIds.length === 1 ? "" : "s"}
                  </p>
                </section>

                <div className="pt-2 text-center">
                  <Button onClick={finish} disabled={busy} size="lg">{busy ? "Submitting…" : "Submit & continue"}</Button>
                </div>
              </div>
            );
          })()}

          {step < 9 && (
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={back} disabled={step === 0}>Back</Button>
              <Button onClick={next} disabled={
                (step === 0 && mode === "create" && !orgName) ||
                (step === 0 && mode === "invite" && !inviteValid?.valid) ||
                (step === 1 && !fullName) ||
                (step === 7 && discA.some((a) => !a)) ||
                (step === 8 && cogA.some((a) => !a))
              }>Continue</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
