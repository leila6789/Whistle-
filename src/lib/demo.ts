import fixtureJson from "@/data/demo-game.json";

import { prettyClock, quarterHeadline } from "@/lib/clock";
import type { DemoFixture, FeedPlay, GamePayload } from "@/lib/types";

const fixture = fixtureJson as DemoFixture;

export function replayLength(): number {
  return fixture.plays.length;
}

export function replayStartIndex(): number {
  return fixture.startIndex;
}

export function projectReplay(index: number): GamePayload {
  const plays: FeedPlay[] = index < 0 ? [] : fixture.plays.slice(0, index + 1);
  const last = plays[plays.length - 1];
  const atEnd = index >= fixture.plays.length - 1;
  const ended = Boolean(last && /^end of game$/i.test(last.text));
  let status: GamePayload["status"] = "in";
  let statusText = "Tipoff";
  let period = last?.period ?? 0;
  let clock = last?.clock ?? "12:00";

  if (!last) {
    status = "pre";
    statusText = "Tipoff";
    clock = "12:00";
    period = 1;
  } else if (atEnd || ended) {
    status = "post";
    statusText = last.period > 4 ? "Final/OT" : "Final";
    period = last.period;
    clock = "0:00";
  } else if (/^end of the 2nd quarter$/i.test(last.text)) {
    statusText = "Halftime";
    period = 2;
    clock = "0:00";
  } else if (/^end of /i.test(last.text)) {
    statusText = `End of ${quarterHeadline(last.period)}`;
    period = last.period;
    clock = last.clock;
  } else {
    period = last.period;
    clock = last.clock;
    statusText = `${quarterHeadline(last.period)} · ${prettyClock(last.clock)} left`;
  }

  return {
    id: "demo",
    status,
    statusText,
    statusDetail: `${fixture.seasonLabel} replay`,
    period,
    clock,
    completed: status === "post",
    venue: fixture.venue,
    startTime: fixture.date,
    seasonLabel: fixture.seasonLabel,
    home: fixture.home,
    away: fixture.away,
    homeScore: last?.homeScore ?? 0,
    awayScore: last?.awayScore ?? 0,
    plays,
    demo: {
      sourceEventId: fixture.sourceEventId,
      source: fixture.source,
      date: fixture.date,
      seasonLabel: fixture.seasonLabel,
      finalHome: fixture.finalHome,
      finalAway: fixture.finalAway,
      startIndex: fixture.startIndex,
      city: fixture.city,
    },
  };
}
