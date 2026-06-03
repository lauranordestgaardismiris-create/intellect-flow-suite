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

type Catalogs = { skills: { id: string; name: string; category: string | null }[]; languages: { id: string; name: string }[] };

const STEPS = ["Workspace", "Personal", "Education", "Languages", "Professional", "Skills", "Work style", "DISC", "Cognitive", "Review"] as const;

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
  const [educations, setEducations] = useState<Education[]>([emptyEdu()]);
  const [languageIds, setLanguageIds] = useState<string[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [roleType, setRoleType] = useState<"individual_contributor" | "manager" | "executive">("individual_contributor");
  const [department, setDepartment] = useState("");
  const [team, setTeam] = useState("");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [collab, setCollab] = useState(60);
  const [indep, setIndep] = useState(60);
  const [repet, setRepet] = useState(40);
  const [idea, setIdea] = useState(60);
  const [discA, setDiscA] = useState<(DiscDim | null)[]>(Array(DISC_QUESTIONS.length).fill(null));
  const [cogA, setCogA] = useState<(CognitiveDim | null)[]>(Array(COGNITIVE_QUESTIONS.length).fill(null));
  const [busy, setBusy] = useState(false);

  // group skills by category
  const skillsByCat = useMemo(() => {
    const map: Record<string, { id: string; name: string }[]> = {};
    for (const s of catalogs?.skills ?? []) {
      const cat = s.category || "Other";
      (map[cat] = map[cat] || []).push({ id: s.id, name: s.name });
    }
    return map;
  }, [catalogs]);

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
        educations: cleanEdus,
        language_ids: languageIds,
        job_title: jobTitle || null, role_type: roleType,
        department_name: department || null, team_name: team || null,
        skill_ids: skillIds,
        collaboration: collab, independent_work: indep, task_repetition: repet, idea_generation: idea,
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
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Educational background</h2>
                <p className="text-sm text-muted-foreground">Add up to two degrees (typically Bachelor's and Master's).</p>
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
              {educations.length < 2 && (
                <Button variant="outline" size="sm" onClick={() => setEducations((es) => [...es, emptyEdu()])}>+ Add another degree</Button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Languages</h2>
              <div className="flex flex-wrap gap-2">
                {catalogs?.languages.map((l) => (
                  <button key={l.id} type="button" onClick={() => setLanguageIds((a) => toggle(a, l.id))}
                    className={`rounded-full border px-3 py-1 text-xs ${languageIds.includes(l.id) ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
                    {l.name}
                  </button>
                ))}
              </div>
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
                    <SelectItem value="individual_contributor">Individual contributor</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
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
                <p className="text-sm text-muted-foreground">Pick a category to expand, then choose your skills inside.</p>
              </div>
              <div className="space-y-2">
                {Object.entries(skillsByCat).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => {
                  const open = openCategories.includes(cat);
                  const selectedHere = items.filter((s) => skillIds.includes(s.id)).length;
                  return (
                    <div key={cat} className="rounded-lg border bg-background">
                      <button
                        type="button"
                        onClick={() => setOpenCategories((a) => toggle(a, cat))}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium"
                      >
                        <span className="flex items-center gap-2">
                          <span>{open ? "▾" : "▸"}</span> {cat}
                        </span>
                        <span className="text-xs text-muted-foreground">{selectedHere > 0 ? `${selectedHere} selected` : `${items.length} skills`}</span>
                      </button>
                      {open && (
                        <div className="border-t px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {items.map((s) => (
                              <button key={s.id} type="button" onClick={() => setSkillIds((a) => toggle(a, s.id))}
                                className={`rounded-full border px-3 py-1 text-xs ${skillIds.includes(s.id) ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
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
              <p className="text-xs text-muted-foreground">{skillIds.length} skill{skillIds.length === 1 ? "" : "s"} selected</p>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Work style</h2>
                <p className="text-sm text-muted-foreground">Each slider is independent — they do not need to sum to 100.</p>
              </div>
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

          {step === 9 && (
            <div className="space-y-5 py-4">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-semibold">Your DISC profile</h2>
                <p className="text-sm text-muted-foreground">Here's how your answers map across the four DISC dimensions.</p>
              </div>
              {discA.every(Boolean) ? (
                <DiscBar d={discPreview.d} i={discPreview.i} s={discPreview.s} c={discPreview.c} />
              ) : (
                <p className="text-sm text-muted-foreground text-center">Complete the DISC step to see your breakdown.</p>
              )}
              <div className="pt-4 text-center">
                <Button onClick={finish} disabled={busy} size="lg">{busy ? "Submitting…" : "Submit & continue"}</Button>
              </div>
            </div>
          )}

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
