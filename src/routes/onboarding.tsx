import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — Collective Intelligence Design" }] }),
  validateSearch: (s) => ({ invite: typeof s.invite === "string" ? s.invite : undefined }),
  component: OnboardingPage,
});

type Catalogs = { skills: { id: string; name: string; category: string | null }[]; languages: { id: string; name: string }[] };

const STEPS = ["Workspace", "Personal", "Background", "Professional", "Work style", "DISC", "Cognitive", "Done"] as const;

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

  useEffect(() => {
    if (status?.profile?.onboarding_complete) navigate({ to: "/dashboard" });
  }, [status, navigate]);

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
  const [orientation, setOrientation] = useState("");
  const [education, setEducation] = useState("");
  const [field, setField] = useState("");
  const [languageIds, setLanguageIds] = useState<string[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [roleType, setRoleType] = useState<"individual_contributor" | "manager" | "executive">("individual_contributor");
  const [department, setDepartment] = useState("");
  const [team, setTeam] = useState("");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [collab, setCollab] = useState(60);
  const [indep, setIndep] = useState(60);
  const [repet, setRepet] = useState(40);
  const [idea, setIdea] = useState(60);
  const [discA, setDiscA] = useState<(DiscDim | null)[]>(Array(DISC_QUESTIONS.length).fill(null));
  const [cogA, setCogA] = useState<(CognitiveDim | null)[]>(Array(COGNITIVE_QUESTIONS.length).fill(null));
  const [busy, setBusy] = useState(false);

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function finish() {
    const disc = scoreDisc(discA.filter(Boolean) as DiscDim[]);
    const cog = scoreCognitive(cogA.filter(Boolean) as CognitiveDim[]);
    setBusy(true);
    try {
      await submit({ data: {
        mode, org_name: mode === "create" ? orgName : undefined, invite_token: mode === "invite" ? invite : undefined,
        full_name: fullName, age: age ? parseInt(age) : null, gender: gender || null,
        religion: religion || null, sexual_orientation: orientation || null,
        education_level: education || null, field_of_study: field || null,
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
      navigate({ to: "/dashboard" });
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
                <div className="space-y-2"><Label>Gender</Label><Input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="e.g. Female" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Religion (optional)</Label><Input value={religion} onChange={(e) => setReligion(e.target.value)} /></div>
                <div className="space-y-2"><Label>Sexual orientation (optional)</Label><Input value={orientation} onChange={(e) => setOrientation(e.target.value)} /></div>
              </div>
              <p className="text-xs text-muted-foreground">All personal fields are private to you. Aggregated diversity metrics are computed without exposing individual rows.</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Background</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Education level</Label><Input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. MSc" /></div>
                <div className="space-y-2"><Label>Field of study</Label><Input value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g. Economics" /></div>
              </div>
              <div className="space-y-2">
                <Label>Languages you speak</Label>
                <div className="flex flex-wrap gap-2">
                  {catalogs?.languages.map((l) => (
                    <button key={l.id} type="button" onClick={() => setLanguageIds((a) => toggle(a, l.id))}
                      className={`rounded-full border px-3 py-1 text-xs ${languageIds.includes(l.id) ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
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
              <div className="space-y-2">
                <Label>Core skills</Label>
                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
                  {catalogs?.skills.map((s) => (
                    <button key={s.id} type="button" onClick={() => setSkillIds((a) => toggle(a, s.id))}
                      className={`rounded-full border px-3 py-1 text-xs ${skillIds.includes(s.id) ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Work style</h2>
              <p className="text-sm text-muted-foreground">Drag each slider to where it best fits how you work.</p>
              {([
                ["Collaboration with others", collab, setCollab],
                ["Independent work", indep, setIndep],
                ["Repetitive / structured tasks", repet, setRepet],
                ["Idea generation & innovation", idea, setIdea],
              ] as const).map(([label, val, set]) => (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between text-sm"><Label>{label}</Label><span className="text-muted-foreground tabular-nums">{val}</span></div>
                  <Slider value={[val as number]} onValueChange={(v) => (set as any)(v[0])} max={100} step={1} />
                </div>
              ))}
            </div>
          )}

          {step === 5 && (
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

          {step === 6 && (
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

          {step === 7 && (
            <div className="space-y-4 text-center py-8">
              <h2 className="text-2xl font-semibold">Ready to submit</h2>
              <p className="text-sm text-muted-foreground">We'll create your profile, compute your DISC + cognitive style, and refresh your company's Collective Intelligence score.</p>
              <Button onClick={finish} disabled={busy} size="lg">{busy ? "Submitting…" : "Submit & view dashboard"}</Button>
            </div>
          )}

          {step < 7 && (
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={back} disabled={step === 0}>Back</Button>
              <Button onClick={next} disabled={
                (step === 0 && mode === "create" && !orgName) ||
                (step === 0 && mode === "invite" && !inviteValid?.valid) ||
                (step === 1 && !fullName) ||
                (step === 5 && discA.some((a) => !a)) ||
                (step === 6 && cogA.some((a) => !a))
              }>Continue</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
