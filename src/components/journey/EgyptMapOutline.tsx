import { cn } from "@/lib/utils";
import { EGYPT_PATH, MAP_VIEWBOX, NILE_BRANCHES, NILE_MAIN } from "./map-data";

export type Station = { id: string; x: number; y: number; label: string };

// Static, dependency-free map. It is the placeholder shown before the animated journey loads,
// and the same shapes become the base of the animated map in Phase 4.
export function EgyptMapOutline({
  label,
  stations,
  className,
}: {
  label: string;
  stations: Station[];
  className?: string;
}) {
  return (
    <svg
      viewBox={MAP_VIEWBOX}
      role="img"
      aria-label={label}
      className={cn("h-auto w-full", className)}
    >
      <path
        d={EGYPT_PATH}
        className="fill-gold/10 stroke-gold"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <g
        className="fill-none stroke-teal"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={NILE_MAIN} />
        {NILE_BRANCHES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {stations.map((s) => (
        <g key={s.id}>
          <circle cx={s.x} cy={s.y} r={3.6} className="fill-gold" />
          <text x={s.x + 10} y={s.y + 4} fontSize={13} className="fill-sand font-sans">
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
