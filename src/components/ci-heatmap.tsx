type Cell = { id: string; name: string; type: string; score: number; total_users: number };

export function CIHeatmap({ cells, onSelect, selectedId }: { cells: Cell[]; onSelect?: (id: string) => void; selectedId?: string | null }) {
  if (cells.length === 0) {
    return <p className="text-sm text-muted-foreground">No sub-entities yet — add departments and teams.</p>;
  }
  function color(score: number) {
    // 0..100 -> green-warning-destructive blend via opacity
    if (score === 0) return "var(--muted)";
    const hue = Math.round((score / 100) * 145); // 0 red -> 145 green
    return `oklch(0.7 0.15 ${145 - hue + 25})`;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {cells.map((c) => (
        <button key={c.id} onClick={() => onSelect?.(c.id)}
          className={`group rounded-lg p-3 text-left transition border ${selectedId === c.id ? "ring-2 ring-primary" : ""}`}
          style={{ background: color(c.score) }}>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-foreground/70">{c.type}</span>
            <span className="text-xs text-foreground/60">{c.total_users} people</span>
          </div>
          <div className="mt-1 text-sm font-medium text-foreground truncate">{c.name}</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{c.score}</div>
        </button>
      ))}
    </div>
  );
}
