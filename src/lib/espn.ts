import {
  ESPN_SCOREBOARD,
  ESPN_SUMMARY,
} from "@/lib/config";
import { prettyClock, quarterHeadline } from "@/lib/clock";
import { saneCoordinate } from "@/lib/spot";
import type { FeedPlay, GameCard, GamePayload, GameStatus, Scoreboard, Team } from "@/lib/types";

type EspnTeam = {
  id?: string;
  abbreviation?: string;
  location?: string;
  name?: string;
  shortDisplayName?: string;
  displayName?: string;
  color?: string;
  alternateColor?: string;
};

type EspnStatus = {
  period?: number;
  displayClock?: string;
  type?: {
    state?: string;
    completed?: boolean;
    description?: string;
    detail?: string;
    shortDetail?: string;
  };
};

type EspnCompetitor = {
  homeAway?: string;
  score?: string;
  team?: EspnTeam;
};

type EspnPlay = {
  id?: string;
  sequenceNumber?: string;
  type?: { text?: string };
  text?: string;
  homeScore?: number;
  awayScore?: number;
  period?: { number?: number };
  clock?: { displayValue?: string };
  scoringPlay?: boolean;
  scoreValue?: number;
  team?: { id?: string };
  wallclock?: string;
  coordinate?: { x?: number; y?: number };
};

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeTeam(raw: EspnTeam | undefined, fallbackId: string): Team {
  return {
    id: String(raw?.id ?? fallbackId),
    abbreviation: raw?.abbreviation || "NBA",
    location: raw?.location || raw?.displayName || "Team",
    shortName: raw?.shortDisplayName || raw?.name || raw?.abbreviation || "Team",
    displayName: raw?.displayName || raw?.name || "Team",
    color: (raw?.color || "333333").replace("#", ""),
    altColor: raw?.alternateColor?.replace("#", ""),
  };
}

function mapState(state: string | undefined): GameStatus {
  if (state === "in") return "in";
  if (state === "post") return "post";
  return "pre";
}

function statusBlob(status: EspnStatus | undefined): string {
  const type = status?.type;
  return `${type?.description ?? ""} ${type?.detail ?? ""} ${type?.shortDetail ?? ""}`;
}

export function statusHeadline(
  status: EspnStatus | undefined,
  last?: FeedPlay,
): string {
  const blob = statusBlob(status);
  const state = mapState(status?.type?.state);
  const period = status?.period || last?.period || 0;
  if (/halftime/i.test(blob)) return "Halftime";
  if (state === "post") {
    if (/2\s*OT|2OT/i.test(blob) || period > 5) return "Final/OT";
    if (/OT/i.test(blob) || period > 4) return "Final/OT";
    return "Final";
  }
  if (state === "pre") {
    return status?.type?.shortDetail || "Scheduled";
  }
  const clock = status?.displayClock && status.displayClock !== "0.0"
    ? status.displayClock
    : last?.clock;
  if (/end of/i.test(blob)) {
    return clean(status?.type?.description) || `End of ${quarterHeadline(period)}`;
  }
  if (period > 0 && clock && clock !== "0.0" && clock !== "0:00") {
    return `${quarterHeadline(period)} · ${prettyClock(clock)} left`;
  }
  if (period > 0) return quarterHeadline(period);
  return clean(status?.type?.description) || "Live";
}

function cardStatus(status: EspnStatus | undefined, last?: FeedPlay): string {
  const state = mapState(status?.type?.state);
  const blob = statusBlob(status);
  if (/halftime/i.test(blob)) return "Halftime";
  if (state === "post") return statusHeadline(status, last);
  if (state === "in") {
    const period = status?.period || last?.period || 0;
    const clock = status?.displayClock || last?.clock || "";
    if (period && clock && clock !== "0.0") return `${quarterHeadline(period).replace(" quarter", "")} · ${prettyClock(clock)}`;
    return statusHeadline(status, last);
  }
  return status?.type?.shortDetail || "Scheduled";
}

export function normalizePlay(raw: EspnPlay): FeedPlay | null {
  if (!raw?.id) return null;
  const text = clean(raw.text);
  if (!text && !raw.type?.text) return null;
  return {
    id: String(raw.id),
    sequence: Number(raw.sequenceNumber ?? 0),
    typeText: clean(raw.type?.text),
    text,
    homeScore: Number(raw.homeScore ?? 0),
    awayScore: Number(raw.awayScore ?? 0),
    period: Number(raw.period?.number ?? 0),
    clock: raw.clock?.displayValue || "0:00",
    scoringPlay: Boolean(raw.scoringPlay),
    scoreValue: Number(raw.scoreValue ?? 0),
    teamId: raw.team?.id ? String(raw.team.id) : undefined,
    wallclock: raw.wallclock || undefined,
    coordinate: saneCoordinate(raw.coordinate),
  };
}

function pickSide(competitors: EspnCompetitor[] | undefined, side: "home" | "away"): EspnCompetitor | undefined {
  return competitors?.find((competitor) => competitor.homeAway === side);
}

function broadcastName(broadcasts: { names?: string[] }[] | undefined): string | undefined {
  const name = broadcasts?.find((item) => item.names?.length)?.names?.[0];
  return name || undefined;
}

export function normalizeScoreboard(data: {
  leagues?: { season?: { displayName?: string; type?: { name?: string } } }[];
  events?: {
    id?: string;
    date?: string;
    competitions?: {
      venue?: { fullName?: string };
      broadcasts?: { names?: string[] }[];
      competitors?: EspnCompetitor[];
    }[];
    status?: EspnStatus;
  }[];
}): Scoreboard {
  const season = data.leagues?.[0]?.season;
  const seasonLabel = [season?.displayName, season?.type?.name].filter(Boolean).join(" ");
  const games: GameCard[] = (data.events ?? []).flatMap((event) => {
    if (!event.id) return [];
    const competition = event.competitions?.[0];
    const homeRaw = pickSide(competition?.competitors, "home");
    const awayRaw = pickSide(competition?.competitors, "away");
    const state = mapState(event.status?.type?.state);
    return [
      {
        id: String(event.id),
        status: state,
        statusText: cardStatus(event.status),
        detail: event.status?.type?.detail || event.status?.type?.shortDetail || "",
        clock: event.status?.displayClock || "",
        period: Number(event.status?.period ?? 0),
        startTime: event.date,
        venue: competition?.venue?.fullName || "",
        broadcast: broadcastName(competition?.broadcasts),
        home: normalizeTeam(homeRaw?.team, "home"),
        away: normalizeTeam(awayRaw?.team, "away"),
        homeScore: Number(homeRaw?.score ?? 0),
        awayScore: Number(awayRaw?.score ?? 0),
      },
    ];
  });
  const rank: Record<GameStatus, number> = { in: 0, pre: 1, post: 2 };
  games.sort(
    (a, b) => rank[a.status] - rank[b.status] || String(a.startTime).localeCompare(String(b.startTime)),
  );
  return { seasonLabel, games };
}

export function normalizeSummary(
  id: string,
  data: {
    header?: {
      competitions?: {
        date?: string;
        venue?: { fullName?: string };
        broadcasts?: { names?: string[] }[];
        competitors?: EspnCompetitor[];
        status?: EspnStatus;
      }[];
      season?: { year?: number; type?: number };
    };
    gameInfo?: { venue?: { fullName?: string } };
    plays?: EspnPlay[];
    leagues?: { season?: { displayName?: string; type?: { name?: string } } }[];
  },
): GamePayload {
  const competition = data.header?.competitions?.[0];
  const homeRaw = pickSide(competition?.competitors, "home");
  const awayRaw = pickSide(competition?.competitors, "away");
  const plays = (data.plays ?? [])
    .map(normalizePlay)
    .filter((play): play is FeedPlay => Boolean(play))
    .sort((a, b) => a.sequence - b.sequence);
  const last = plays[plays.length - 1];
  const status = competition?.status;
  const state = mapState(status?.type?.state);
  const period = status?.period || last?.period || 0;
  const clock =
    status?.displayClock && status.displayClock !== "0.0"
      ? status.displayClock
      : last?.clock || status?.displayClock || "0:00";
  return {
    id,
    status: state,
    statusText: statusHeadline(status, last),
    statusDetail: status?.type?.detail || status?.type?.description || "",
    period,
    clock,
    completed: Boolean(status?.type?.completed) || state === "post",
    venue: data.gameInfo?.venue?.fullName || competition?.venue?.fullName || "",
    startTime: competition?.date,
    broadcast: broadcastName(competition?.broadcasts),
    home: normalizeTeam(homeRaw?.team, "home"),
    away: normalizeTeam(awayRaw?.team, "away"),
    homeScore: Number(homeRaw?.score ?? last?.homeScore ?? 0),
    awayScore: Number(awayRaw?.score ?? last?.awayScore ?? 0),
    plays,
  };
}

async function espn(url: string): Promise<unknown> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "whistle-nba-companion/1.0 (educational portfolio)",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`ESPN returned ${response.status}`);
  }
  return response.json();
}

export async function fetchScoreboard(): Promise<Scoreboard> {
  const data = await espn(ESPN_SCOREBOARD);
  return normalizeScoreboard(data as Parameters<typeof normalizeScoreboard>[0]);
}

export async function fetchGame(id: string): Promise<GamePayload> {
  if (!/^\d{5,12}$/.test(id)) {
    throw new Error("Invalid game id");
  }
  const data = await espn(`${ESPN_SUMMARY}?event=${id}`);
  const game = normalizeSummary(id, data as Parameters<typeof normalizeSummary>[1]);
  if (!game.home.abbreviation || game.home.abbreviation === "NBA") {
    throw new Error("That game was not on the feed");
  }
  return game;
}
