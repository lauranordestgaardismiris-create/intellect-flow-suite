import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { FilledCircle } from "@/components/filled-circle";
import { DIMENSIONS, computeDimension, type DimensionId, type DimensionResult, DIM_BY_ID } from "@/lib/dimensions";
import { getVariableInsight } from "@/lib/ci-insights.functions";

type Props = {
  entityId: string;
  members: any[];
  hasIdentityScore: boolean;
};

function RiskBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  if (score < 40) {
    return <span className="rounded-full bg-destructive/15 text-destructive text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">Gap</span>;
  }
  if (score <= 60) {
    return <span className="rounded-full bg-warning/15 text-warning text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">Watch</span>;
  }
  return null;
}

function DimensionCard({
  id, result, selected, onClick,
}: { id: DimensionId; result: DimensionResult; selected: boolean; onClick: () => void }) {
  const meta = DIM_BY_ID[id];
  const disabled = result.score === null;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`text-left rounded-xl border bg-card p-4 transition hover:shadow-md hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed ${selected ? "border-primary ring-2 ring-primary/30" : ""}`}
    >
      <div className="flex items-center gap-3">
        <FilledCircle score={result.score ?? 0} size={80} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-medium leading-tight">{meta.name}</p>
          <RiskBadge score={result.score} />
        </div>
      </div>
    </button>
  );
}

export function VariableExplorer({ entityId, members, hasIdentityScore }: Props) {
  const [selected, setSelected] = useState<DimensionId | null>(null);
  const fetchInsight = useServerFn(getVariableInsight);

  const results = useMemo(() => {
    const m: Record<DimensionId, DimensionResult> = {} as any;
    for (const d of DIMENSIONS) m[d.id] = computeDimension(d.id, members);
    return m;
  }, [members]);

  const insightMut = useMutation({
    mutationFn: (id: DimensionId) => fetchInsight({
      data: {
        entityId,
        dimension: id,
        score: results[id].score,
        distribution: results[id].distribution.map((d) => ({ label: d.label, count: d.count })),
      },
    }) as any,
  });

  function pick(id: DimensionId) {
    if (selected === id) { setSelected(null); return; }
    setSelected(id);
    insightMut.mutate(id);
  }

  const behavioural = DIMENSIONS.filter((d) => d.group === "behavioural");
  const identity = DIMENSIONS.filter((d) => d.group === "identity");

  const detail = selected ? { meta: DIM_BY_ID[selected], result: results[selected] } : null;

  return (
    <section className="rounded-xl border bg-card p-6 space-y-5">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Explore by Dimension</h2>
        <p className="text-sm text-muted-foreground">
          Select any dimension to see how it contributes to your team's collective intelligence.
        </p>
      </header>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Behavioural Dimensions</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {behavioural.map((d) => (
            <DimensionCard key={d.id} id={d.id} result={results[d.id]} selected={selected === d.id} onClick={() => pick(d.id)} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identity Dimensions</p>
        {hasIdentityScore ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {identity.map((d) => (
              <DimensionCard key={d.id} id={d.id} result={results[d.id]} selected={selected === d.id} onClick={() => pick(d.id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            Not enough identity data yet.
          </div>
        )}
      </div>

      {detail && (
        <div className="rounded-xl border bg-accent/20 p-6 space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-start gap-6">
            <FilledCircle score={detail.result.score ?? 0} size={180} label={detail.meta.name} />
            <div className="flex-1 min-w-[240px] space-y-3">
              <p className="text-sm">{detail.meta.description}</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Distribution</p>
                {detail.result.distribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <p className="text-sm">
                    {detail.result.distribution.map((d, i) => (
                      <span key={d.label}>
                        {i > 0 && <span className="text-muted-foreground"> · </span>}
                        <span className="font-medium">{d.label}:</span> {d.count}
                        {detail.meta.group === "identity" ? ` (${d.pct}%)` : ""}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div className="rounded-md border bg-card p-3 text-sm">
                {insightMut.isPending && <span className="text-muted-foreground">Generating insight…</span>}
                {!insightMut.isPending && insightMut.data?.insight && <span>{insightMut.data.insight}</span>}
                {!insightMut.isPending && !insightMut.data && <span className="text-muted-foreground">{detail.meta.fallbackInsight}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
