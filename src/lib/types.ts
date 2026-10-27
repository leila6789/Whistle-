export type GameStatus = "pre" | "in" | "post";

export type Team = {
  id: string;
  abbreviation: string;
  location: string;
  shortName: string;
  displayName: string;
  color: string;
  altColor?: string;
};

export type FeedPlay = {
  id: string;
  sequence: number;
  typeText: string;
  text: string;
  homeScore: number;
  awayScore: number;
  period: number;
  clock: string;
  scoringPlay: boolean;
  scoreValue: number;
  teamId?: string;
  wallclock?: string;
  /** Half-court feet from ESPN. Absent when the feed has no real spot. */
  coordinate?: { x: number; y: number };
};

export type DemoFixture = {
  id: string;
  sourceEventId: string;
  source: string;
  seasonLabel: string;
  date: string;
  venue: string;
  city: string;
  home: Team;
  away: Team;
  finalHome: number;
  finalAway: number;
  startIndex: number;
  plays: FeedPlay[];
};

export type DemoInfo = {
  sourceEventId: string;
  source: string;
  date: string;
  seasonLabel: string;
  finalHome: number;
  finalAway: number;
  startIndex: number;
  city: string;
};

export type GamePayload = {
  id: string;
  status: GameStatus;
  /** Short line for the scoreboard, e.g. "4th quarter · 1:10 left". */
  statusText: string;
  statusDetail: string;
  period: number;
  clock: string;
  completed: boolean;
  venue: string;
  startTime?: string;
  broadcast?: string;
  seasonLabel?: string;
  home: Team;
  away: Team;
  homeScore: number;
  awayScore: number;
  /** Chronological, oldest first. */
  plays: FeedPlay[];
  demo?: DemoInfo;
};

export type GameCard = {
  id: string;
  status: GameStatus;
  statusText: string;
  detail: string;
  clock: string;
  period: number;
  startTime?: string;
  venue: string;
  broadcast?: string;
  home: Team;
  away: Team;
  homeScore: number;
  awayScore: number;
};

export type Scoreboard = {
  seasonLabel: string;
  games: GameCard[];
};

export type Dot =
  | "make"
  | "miss"
  | "foul"
  | "turnover"
  | "timeout"
  | "rebound"
  | "neutral"
  | "end";

export type ExplanationFacts = {
  ruleId: string;
  ruleName: string;
  ruleText: string;
  period: number;
  clock: string;
  homeScore: number;
  awayScore: number;
  players: string[];
  teams: string[];
  abbreviations: string[];
  templateTitle: string;
  templateBody: string;
  templateWhy: string;
  detail: Record<string, string | number | boolean>;
};

export type Explanation = {
  playId: string;
  ruleId: string;
  ruleName: string;
  title: string;
  chip: string;
  /** Plain-English row in the recent-plays list. May contain **bold** markers. */
  summary: string;
  clockLabel: string;
  body: string;
  whyItMatters: string;
  dot: Dot;
  facts: ExplanationFacts;
};

export type Vote = "up" | "down";

export type FeedbackRecord = {
  playId: string;
  ruleId: string;
  vote: Vote;
  at: number;
};

export type LatencySample = {
  playId: string;
  engineMs: number;
  /** Present only for live plays with a sane ESPN wallclock. */
  feedLagMs?: number;
  source: "template" | "llm";
  at: number;
};
