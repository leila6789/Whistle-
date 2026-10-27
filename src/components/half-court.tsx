import type { CourtSpot } from "@/lib/spot";

const SCALE = 10;
const WIDTH = 50 * SCALE;
const HEIGHT = 47 * SCALE;
const RIM_FROM_BASELINE = 5.25 * SCALE;
const RIM = { x: 25 * SCALE, y: HEIGHT - RIM_FROM_BASELINE };

function toSvg(spot: CourtSpot): { x: number; y: number } {
  return {
    x: spot.x * SCALE,
    y: HEIGHT - (5.25 + spot.y) * SCALE,
  };
}

export function HalfCourt({ spot, made }: { spot?: CourtSpot; made?: boolean }) {
  const mark = spot ? toSvg(spot) : null;
  const label = mark
    ? "Half court. The feed marked where this play happened."
    : "Half court. The feed did not mark a spot for this play.";

  return (
    <figure className="shrink-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-40 border border-[#1c140c] bg-[#c9854a] sm:w-36"
        role="img"
        aria-label={label}
      >
        <rect x="8" y="8" width={WIDTH - 16} height={HEIGHT - 16} fill="none" stroke="#f4efe4" strokeWidth="3" />
        <rect x="170" y="280" width="160" height="182" fill="none" stroke="#f4efe4" strokeWidth="3" />
        <circle cx="250" cy="280" r="60" fill="none" stroke="#f4efe4" strokeWidth="3" />
        <line x1="170" y1="280" x2="330" y2="280" stroke="#f4efe4" strokeWidth="3" />
        <path
          d="M30 462 L30 328 A237 237 0 0 1 470 328 L470 462"
          fill="none"
          stroke="#f4efe4"
          strokeWidth="3"
        />
        <line x1="220" y1={RIM.y + 14} x2="280" y2={RIM.y + 14} stroke="#f4efe4" strokeWidth="4" />
        <circle cx={RIM.x} cy={RIM.y} r="9" fill="none" stroke="#f4efe4" strokeWidth="3" />
        <path
          d={`M${RIM.x - 40} ${HEIGHT - 8} A40 40 0 0 1 ${RIM.x + 40} ${HEIGHT - 8}`}
          fill="none"
          stroke="#f4efe4"
          strokeWidth="3"
        />
        {mark ? (
          <g>
            <circle cx={mark.x} cy={mark.y} r="14" fill="none" stroke="#1c140c" strokeWidth="3" />
            <circle cx={mark.x} cy={mark.y} r="7" fill={made ? "#1c140c" : "none"} stroke="#1c140c" strokeWidth="3" />
          </g>
        ) : null}
      </svg>
      <figcaption className="mt-1 text-xs leading-4 text-[#1c140c]/70">
        {mark ? "Where the feed put it." : "No spot on this play."}
      </figcaption>
    </figure>
  );
}
