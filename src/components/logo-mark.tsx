interface Props {
  size?: number;
  className?: string;
  /** When true, render the wordmark + tagline next to the mark */
  withWordmark?: boolean;
  tagline?: boolean;
}

/**
 * Brand logo: 6 outer nodes on a ring connected to a central node.
 * Exact coordinates per design system (viewBox 0 0 32 32).
 */
export function LogoMark({ size = 32, className, withWordmark = false, tagline = false }: Props) {
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Outer ring */}
      <circle cx="16" cy="16" r="10" fill="none" stroke="#6B4AE8" strokeWidth="1.5" opacity="0.3" />
      {/* Spokes from outer nodes to centre */}
      <g stroke="#6B4AE8" strokeWidth="1" opacity="0.35">
        <line x1="16" y1="6"    x2="16" y2="16" />
        <line x1="24.7" y1="11" x2="16" y2="16" />
        <line x1="24.7" y1="21" x2="16" y2="16" />
        <line x1="16" y1="26"   x2="16" y2="16" />
        <line x1="7.3" y1="21"  x2="16" y2="16" />
        <line x1="7.3" y1="11"  x2="16" y2="16" />
      </g>
      {/* Nodes */}
      <circle cx="16"   cy="6"  r="2.5" fill="#6B4AE8" />
      <circle cx="24.7" cy="11" r="2"   fill="#7F77DD" />
      <circle cx="24.7" cy="21" r="2"   fill="#9D87F7" />
      <circle cx="16"   cy="26" r="2.5" fill="#7F77DD" />
      <circle cx="7.3"  cy="21" r="2"   fill="#6B4AE8" />
      <circle cx="7.3"  cy="11" r="2"   fill="#534AB7" />
      <circle cx="16"   cy="16" r="2.5" fill="#6B4AE8" />
    </svg>
  );

  if (!withWordmark) return <span className={className}>{svg}</span>;

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      {svg}
      <span className="flex flex-col leading-tight">
        <span style={{ fontSize: 15, fontWeight: 500, color: "#1A1045" }}>
          Collective Intelligence
        </span>
        {tagline && (
          <span style={{ fontSize: 10, color: "#9D87F7" }}>
            measuring collective intelligence
          </span>
        )}
      </span>
    </span>
  );
}
