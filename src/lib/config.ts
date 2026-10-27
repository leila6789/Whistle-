/** How often a live game asks the proxy for a new play-by-play. */
export const LIVE_POLL_MS = 5000;

/** Pregame games only need a light check in case tipoff starts. */
export const PREGAME_POLL_MS = 30_000;

export const SCOREBOARD_POLL_MS = 20_000;

/** Ignore ESPN wallclocks older than this when measuring feed lag. */
export const MAX_FEED_LAG_MS = 10 * 60 * 1000;

export const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

export const ESPN_SUMMARY =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary";
