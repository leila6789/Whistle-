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
