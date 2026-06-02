import { useMemo, useState } from "react";
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { automationRisk } from "@/lib/ci-engine";

const LENSES = [
  { id: "skill_radar", label: "Skill coverage" },
  { id: "disc_pie", label: "DISC mix" },
  { id: "cognitive_pie", label: "Cognitive styles" },
  { id: "collab_innov", label: "Collaboration vs innovation" },
  { id: "role_bar", label: "Role distribution" },
  { id: "automation", label: "Automation risk" },
] as const;

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

type Member = {
  id: string; full_name: string; role_type: string | null; job_title: string | null;
  department_entity_id: string | null; team_entity_id: string | null;
  skills: string[]; disc_dominant: string | null; cognitive_dominant: string | null;
  collaboration: number; idea_generation: number; task_repetition: number;
};

export function InsightsPanel({ members, lenses, onChangeLenses }: {
  members: Member[];
  lenses: string[];
  onChangeLenses: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const data = useMemo(() => {
    const skillFreq = new Map<string, number>();
    for (const m of members) for (const s of m.skills) skillFreq.set(s, (skillFreq.get(s) ?? 0) + 1);
    const skillRadar = [...skillFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ subject: k, value: v }));

    const disc = ["D", "I", "S", "C"].map((k) => ({ name: k, value: members.filter((m) => m.disc_dominant === k).length }));
    const cog = ["analytical", "practical", "relational", "experimental"].map((k) => ({ name: k, value: members.filter((m) => m.cognitive_dominant === k).length }));
    const scatter = members.map((m) => ({ x: m.collaboration, y: m.idea_generation, name: m.full_name }));
    const roles = ["individual_contributor", "manager", "executive"].map((k) => ({ name: k.replace("_", " "), value: members.filter((m) => m.role_type === k).length }));

    const meanRep = members.length ? members.reduce((s, m) => s + m.task_repetition, 0) / members.length : 0;
    const meanInn = members.length ? members.reduce((s, m) => s + m.idea_generation, 0) / members.length : 0;
    const risk = automationRisk(meanRep, meanInn);

    return { skillRadar, disc, cog, scatter, roles, risk, meanRep: Math.round(meanRep), meanInn: Math.round(meanInn) };
  }, [members]);

  function toggle(id: string) {
    onChangeLenses(lenses.includes(id) ? lenses.filter((x) => x !== id) : [...lenses, id]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Insights</h2>
        <div className="relative">
          <button className="text-sm rounded-md border px-3 py-1.5" onClick={() => setOpen((o) => !o)}>
            Customize ({lenses.length})
          </button>
          {open && (
            <div className="absolute right-0 mt-2 z-10 w-56 rounded-md border bg-popover p-2 shadow-md">
              {LENSES.map((l) => (
                <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded">
                  <input type="checkbox" checked={lenses.includes(l.id)} onChange={() => toggle(l.id)} />
                  {l.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members in this entity yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {lenses.includes("skill_radar") && (
            <Panel title="Skill coverage">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={data.skillRadar}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <Radar dataKey="value" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </Panel>
          )}
          {lenses.includes("disc_pie") && (
            <Panel title="DISC mix">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.disc} dataKey="value" nameKey="name" outerRadius={90} label>
                    {data.disc.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          )}
          {lenses.includes("cognitive_pie") && (
            <Panel title="Cognitive styles">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.cog} dataKey="value" nameKey="name" outerRadius={90} label>
                    {data.cog.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          )}
          {lenses.includes("collab_innov") && (
            <Panel title="Collaboration × Innovation">
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart>
                  <CartesianGrid stroke="var(--border)" />
                  <XAxis type="number" dataKey="x" name="Collaboration" domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="Innovation" domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={data.scatter} fill="var(--chart-1)" />
                </ScatterChart>
              </ResponsiveContainer>
            </Panel>
          )}
          {lenses.includes("role_bar") && (
            <Panel title="Role distribution">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.roles}>
                  <CartesianGrid stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--chart-2)" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          )}
          {lenses.includes("automation") && (
            <Panel title="Automation risk">
              <div className="flex flex-col items-center justify-center h-[260px] gap-3">
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  data.risk === "high" ? "bg-destructive/10 text-destructive" :
                  data.risk === "medium" ? "bg-warning/20 text-foreground" :
                  "bg-success/15 text-foreground"
                }`}>
                  {data.risk.toUpperCase()} risk
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  Mean repetition <strong className="text-foreground">{data.meanRep}</strong> · Mean innovation <strong className="text-foreground">{data.meanInn}</strong>
                </div>
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      {children}
    </div>
  );
}
