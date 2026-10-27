/** ESPN half-court feet. x is sideline to sideline (0–50). y is feet from the rim toward midcourt. */
export type CourtSpot = { x: number; y: number };

const SENTINEL = -1_000_000;

/**
 * Keep a coordinate only when it sits on a half court.
 * ESPN uses a huge negative sentinel when a play has no spot. Those are dropped, not guessed.
 */
export function saneCoordinate(raw: { x?: number; y?: number } | null | undefined): CourtSpot | undefined {
  if (!raw) return undefined;
  const x = Number(raw.x);
  const y = Number(raw.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  if (x <= SENTINEL || y <= SENTINEL) return undefined;
  if (x < 0 || x > 50 || y < 0 || y > 47) return undefined;
  return { x, y };
}
