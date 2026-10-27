import type { Team } from "@/lib/types";

export function teamById(
  id: string | undefined,
  home: Team,
  away: Team,
): Team | undefined {
  if (!id) return undefined;
  if (id === home.id) return home;
  if (id === away.id) return away;
  return undefined;
}

export function teamByLabel(
  label: string | undefined,
  home: Team,
  away: Team,
): Team | undefined {
  if (!label) return undefined;
  const word = label.toLowerCase().trim();
  for (const team of [home, away]) {
    const names = [team.shortName, team.location, team.displayName, team.abbreviation];
    if (names.some((name) => name.toLowerCase() === word)) return team;
  }
  return undefined;
}

export function otherTeam(team: Team, home: Team, away: Team): Team {
  return team.id === home.id ? away : home;
}

function channels(hex: string): [number, number, number] | null {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return null;
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

function lumaOf(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** A team color dark enough to tint wood without washing the type out. */
export function paint(hex: string): string {
  const rgb = channels(hex);
  if (!rgb) return "#5c3b22";
  let [r, g, b] = rgb;
  if (lumaOf(r, g, b) > 0.72) {
    r = Math.round(r * 0.45);
    g = Math.round(g * 0.45);
    b = Math.round(b * 0.45);
  }
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Color for an abbreviation sitting on the black scoreboard. */
export function onBoard(hex: string, alt?: string): string {
  const rgb = channels(hex);
  if (!rgb) return "#f4efe4";
  if (lumaOf(...rgb) < 0.28) {
    if (alt && alt.replace("#", "") !== hex.replace("#", "")) return onBoard(alt);
    return "#f4efe4";
  }
  return `#${hex.replace("#", "")}`;
}

export function textOn(hex: string): string {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return "#ffffff";
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma > 0.62 ? "#14120c" : "#ffffff";
}

export function leadLine(
  awayScore: number,
  homeScore: number,
  away: Team,
  home: Team,
): string {
  if (awayScore === homeScore) return "Tied";
  const leader = awayScore > homeScore ? away : home;
  const margin = Math.abs(awayScore - homeScore);
  return `${leader.shortName} lead by ${margin}`;
}
