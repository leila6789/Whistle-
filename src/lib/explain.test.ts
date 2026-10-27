import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { explainGame, parsePlay } from "@/lib/explain";
import { validateRephrase, allowListFromFacts } from "@/lib/guardrail";
import { clearRating, formatDuration, formatPct, median, summarizeLatency } from "@/lib/metrics";
import type { DemoFixture, FeedPlay, Team } from "@/lib/types";

const away: Team = {
  id: "2",
  abbreviation: "BOS",
  location: "Boston",
  shortName: "Celtics",
  displayName: "Boston Celtics",
  color: "008348",
};
const home: Team = {
  id: "9",
  abbreviation: "GS",
  location: "Golden State",
  shortName: "Warriors",
  displayName: "Golden State Warriors",
  color: "fdb927",
};

function play(partial: Partial<FeedPlay> & Pick<FeedPlay, "id" | "text" | "typeText">): FeedPlay {
  return {
    sequence: Number(partial.id),
    homeScore: 0,
    awayScore: 0,
    period: 1,
    clock: "10:00",
    scoringPlay: false,
    scoreValue: 0,
    ...partial,
  };
}

function explain(plays: FeedPlay[], teams: { home?: Team; away?: Team } = {}) {
  return explainGame({
    home: teams.home ?? home,
    away: teams.away ?? away,
    plays,
  }).explanations;
}

describe("explanation engine", () => {
  it("explains the mockup moment: a late shooting foul on a missed three", () => {
    const explanations = explain([
      play({
        id: "1",
        period: 4,
        clock: "1:10",
        typeText: "Jump Shot",
        text: "Stephen Curry misses 26-foot three point jumper",
        teamId: home.id,
        homeScore: 102,
        awayScore: 104,
      }),
      play({
        id: "2",
        period: 4,
        clock: "1:10",
        typeText: "Shooting Foul",
        text: "Jayson Tatum shooting foul",
        teamId: away.id,
        homeScore: 102,
        awayScore: 104,
      }),
    ]);

    const foul = explanations[1];
    expect(foul.title).toBe("Shooting foul");
    expect(foul.chip).toBe("Foul on Tatum");
    expect(foul.ruleId).toBe("shooting-foul");
    expect(foul.body).toContain("Tatum");
    expect(foul.body).toContain("Curry");
    expect(foul.body).toContain("3 free throws");
    expect(foul.body).not.toMatch(/arm|elbow|wrist/i);
    expect(foul.whyItMatters).toBe(
      "Warriors are down 2 with 1:10 left. If Curry makes all 3, Golden State takes the lead.",
    );
    expect(explanations[0].chip).toBe("Curry 3-pt miss");
    expect(explanations[0].summary).toContain("long");
  });

  it("calls a made basket plus a foul an and-one", () => {
    const [shot, foul, ft] = explain([
      play({
        id: "1",
        clock: "6:17",
        typeText: "Cutting Layup Shot",
        text: "Georges Niang makes 3-foot layup (Draymond Green assists)",
        teamId: home.id,
        scoringPlay: true,
        scoreValue: 2,
        homeScore: 8,
        awayScore: 15,
      }),
      play({
        id: "2",
        clock: "6:17",
        typeText: "Shooting Foul",
        text: "Toumani Camara shooting foul",
        teamId: away.id,
        homeScore: 8,
        awayScore: 15,
      }),
      play({
        id: "3",
        clock: "6:17",
        typeText: "Free Throw - 1 of 1",
        text: "Georges Niang makes free throw 1 of 1",
        teamId: home.id,
        scoringPlay: true,
        scoreValue: 1,
        homeScore: 9,
        awayScore: 15,
      }),
    ]);
    expect(shot.title).toBe("And-one");
    expect(shot.ruleId).toBe("and-one");
    expect(shot.body).toContain("1 free throw");
    expect(foul.body).toContain("and-one");
    expect(ft.ruleId).toBe("free-throw");
    expect(ft.body).toContain("and-one");
    expect(ft.summary).toContain("+1");
  });

  it("does not put the other team in the bonus on an offensive foul, and resets next quarter", () => {
    const plays: FeedPlay[] = [];
    for (let i = 0; i < 4; i += 1) {
      plays.push(
        play({
          id: `o${i}`,
          clock: `11:${10 + i}`,
          typeText: "Offensive Foul",
          text: "Al Horford offensive foul",
          teamId: away.id,
        }),
      );
    }
    for (let i = 0; i < 4; i += 1) {
      plays.push(
        play({
          id: `p${i}`,
          clock: `8:0${i}`,
          typeText: "Personal Foul",
          text: "Jaylen Brown personal foul",
          teamId: away.id,
        }),
      );
    }
    plays.push(
      play({
        id: "bonus",
        clock: "7:00",
        typeText: "Personal Foul",
        text: "Jaylen Brown personal foul",
        teamId: away.id,
      }),
    );
    plays.push(
      play({
        id: "next",
        period: 2,
        clock: "11:00",
        typeText: "Personal Foul",
        text: "Jaylen Brown personal foul",
        teamId: away.id,
      }),
    );
    const explanations = explain(plays);
    const fifth = explanations.find((item) => item.playId === "bonus");
    const reset = explanations.find((item) => item.playId === "next");
    expect(fifth?.whyItMatters).toContain("team foul 5");
    expect(fifth?.whyItMatters).toContain("bonus");
    expect(fifth?.body).toContain("foul 5");
    expect(reset?.body).toContain("team foul 1");
    expect(reset?.whyItMatters).not.toContain("bonus");
    expect(explanations[0].body).toContain("not toward the team bonus");
  });

  it("flags foul trouble from the player's running total, not the quarter", () => {
    const plays = [1, 2, 3, 4, 5].map((n) =>
      play({
        id: String(n),
        period: n < 4 ? 1 : 3,
        clock: `9:0${n}`,
        typeText: "Personal Foul",
        text: "Draymond Green personal foul",
        teamId: home.id,
        homeScore: 40,
        awayScore: 40,
      }),
    );
    const explanations = explain(plays);
    expect(explanations[4].whyItMatters).toContain("Green has 5 fouls");
    expect(explanations[4].whyItMatters).toContain("out of the game");
  });

  it("covers the common play types with feed facts only", () => {
    const cases: { play: FeedPlay; title: string; ruleId: string; includes: string[] }[] = [
      {
        play: play({
          id: "ft",
          typeText: "Free Throw - 2 of 2",
          text: "Tyrese Maxey misses free throw 2 of 2",
          homeScore: 10,
          awayScore: 12,
        }),
        title: "Free throw",
        ruleId: "free-throw",
        includes: ["Maxey", "2 of 2", "missed"],
      },
      {
        play: play({
          id: "make3",
          typeText: "Pullup Jump Shot",
          text: "Stephen Curry makes 28-foot three pointer (Draymond Green assists)",
          scoringPlay: true,
          scoreValue: 3,
          teamId: home.id,
          homeScore: 3,
        }),
        title: "Three-pointer",
        ruleId: "three-pointer",
        includes: ["Curry", "3 points", "Green"],
      },
      {
        play: play({
          id: "make2",
          typeText: "Driving Layup Shot",
          text: "Jaylen Brown makes driving layup",
          scoringPlay: true,
          scoreValue: 2,
          teamId: away.id,
          awayScore: 2,
        }),
        title: "Two-pointer",
        ruleId: "two-pointer",
        includes: ["Brown", "layup", "2 points"],
      },
      {
        play: play({
          id: "block-space",
          typeText: "Fade Away Jump Shot",
          text: "Jaylen Brown blocks Milos Uzan 's 15-foot fade away jump shot",
        }),
        title: "Blocked shot",
        ruleId: "block",
        includes: ["Brown", "Uzan"],
      },
      {
        play: play({
          id: "block-tight",
          typeText: "Driving Dunk Shot",
          text: "Joel Embiid blocks Jordan Walsh's driving dunk",
        }),
        title: "Blocked shot",
        ruleId: "block",
        includes: ["Embiid", "Walsh"],
      },
      {
        play: play({
          id: "steal",
          typeText: "Bad Pass Turnover",
          text: "Tyrese Maxey bad pass turnover (Chris Cenac Jr. steals)",
          teamId: home.id,
        }),
        title: "Steal",
        ruleId: "steal",
        includes: ["Cenac", "Maxey", "turnover"],
      },
      {
        play: play({
          id: "travel",
          typeText: "Traveling",
          text: "Baylor Scheierman traveling turnover",
        }),
        title: "Traveling",
        ruleId: "travel",
        includes: ["Scheierman", "dribbl"],
      },
      {
        play: play({
          id: "clock",
          typeText: "Shot Clock Turnover",
          text: "shot clock turnover",
          teamId: away.id,
        }),
        title: "Shot-clock violation",
        ruleId: "shot-clock",
        includes: ["24 seconds", "Celtics"],
      },
      {
        play: play({
          id: "oreb",
          typeText: "Offensive Rebound",
          text: "Draymond Green offensive rebound",
          teamId: home.id,
        }),
        title: "Offensive rebound",
        ruleId: "rebound",
        includes: ["Green", "offensive"],
      },
      {
        play: play({
          id: "dreb",
          typeText: "Defensive Rebound",
          text: "Warriors defensive team rebound",
          teamId: home.id,
        }),
        title: "Rebound",
        ruleId: "rebound",
        includes: ["Warriors", "defensive"],
      },
      {
        play: play({
          id: "timeout",
          typeText: "Full Timeout",
          text: "Celtics Full timeout",
          teamId: away.id,
          period: 4,
          clock: "0:37",
          homeScore: 100,
          awayScore: 102,
        }),
        title: "Timeout",
        ruleId: "timeout",
        includes: ["Celtics", "clock stops"],
      },
      {
        play: play({
          id: "sub",
          typeText: "Substitution",
          text: "Stephen Curry enters the game for Will Richard",
        }),
        title: "Substitution",
        ruleId: "substitution",
        includes: ["Curry", "Richard"],
      },
      {
        play: play({
          id: "jump",
          typeText: "Jumpball",
          text: "Chris Cenac Jr. vs. Joel Embiid (LeBron James gains possession)",
        }),
        title: "Jump ball",
        ruleId: "jump-ball",
        includes: ["Cenac", "Embiid", "James"],
      },
      {
        play: play({
          id: "tech",
          typeText: "Technical Foul",
          text: "Draymond Green technical foul",
        }),
        title: "Technical foul",
        ruleId: "technical",
        includes: ["Green", "1 free throw", "ejected"],
      },
      {
        play: play({
          id: "flop",
          typeText: "Flopping Technical",
          text: "Baylor Scheierman flopping technical foul",
        }),
        title: "Technical foul",
        ruleId: "technical",
        includes: ["flopping", "Scheierman"],
      },
      {
        play: play({
          id: "flagrant",
          typeText: "Flagrant Foul Type 2",
          text: "Draymond Green flagrant foul type 2",
        }),
        title: "Flagrant 2",
        ruleId: "flagrant",
        includes: ["ejected", "2 free throws"],
      },
      {
        play: play({
          id: "goal",
          typeText: "Defensive Goaltending",
          text: "Gabe McGlothan defensive goaltending violation",
        }),
        title: "Goaltending",
        ruleId: "goaltending",
        includes: ["McGlothan", "basket counts"],
      },
      {
        play: play({
          id: "take",
          typeText: "Personal Take Foul",
          text: "Jayson Kent personal take foul",
          teamId: home.id,
        }),
        title: "Take foul",
        ruleId: "take-foul",
        includes: ["1 free throw", "keeps the ball"],
      },
      {
        play: play({
          id: "loose",
          typeText: "Loose Ball Foul",
          text: "Jaylen Brown loose ball foul",
          teamId: away.id,
        }),
        title: "Loose-ball foul",
        ruleId: "loose-ball-foul",
        includes: ["loose ball"],
      },
      {
        play: play({
          id: "lane",
          typeText: "Lane Violation",
          text: "LeBron James lane violation",
        }),
        title: "Lane violation",
        ruleId: "lane-violation",
        includes: ["lane", "does not count"],
      },
      {
        play: play({
          id: "kick",
          typeText: "Kicked Ball",
          text: "Jrue Holiday kicked ball violation",
        }),
        title: "Kicked ball",
        ruleId: "kicked-ball",
        includes: ["kicking", "possession"],
      },
      {
        play: play({
          id: "d3",
          typeText: "Defensive 3-Seconds Technical",
          text: "Yang Hansen defensive 3-seconds (technical foul)",
        }),
        title: "Defensive 3 seconds",
        ruleId: "defensive-three-seconds",
        includes: ["paint", "1 free throw"],
      },
      {
        play: play({
          id: "half",
          period: 2,
          clock: "0.0",
          typeText: "End Period",
          text: "End of the 2nd Quarter",
          homeScore: 58,
          awayScore: 55,
        }),
        title: "Halftime",
        ruleId: "end-of-period",
        includes: ["halftime"],
      },
      {
        play: play({
          id: "final",
          period: 4,
          clock: "0.0",
          typeText: "End Game",
          text: "End of Game",
          homeScore: 120,
          awayScore: 125,
        }),
        title: "End of game",
        ruleId: "end-of-period",
        includes: ["horn", "Celtics"],
      },
      {
        play: play({
          id: "challenge",
          typeText: "Coach's Challenge (Overturned)",
          text: "(02:31) [76ers] COACH'S CHALLENGE (CALL OVERTURNED) [76ers] retain their timeout",
        }),
        title: "Coach's challenge",
        ruleId: "challenge",
        includes: ["overturned", "timeout"],
      },
      {
        play: play({
          id: "palm",
          typeText: "Palming Turnover",
          text: "Joel Embiid palming turnover",
          teamId: home.id,
        }),
        title: "Palming",
        ruleId: "turnover",
        includes: ["carrying", "turnover"],
      },
      {
        play: play({
          id: "heave",
          typeText: "Heave Jump Shot",
          text: "Baylor Scheierman misses heave jump shot",
        }),
        title: "Heave",
        ruleId: "missed-shot",
        includes: ["heave", "missed"],
      },
    ];

    for (const item of cases) {
      const [explanation] = explain([item.play], {
        home:
          item.play.text.includes("76ers")
            ? { ...home, id: "20", abbreviation: "PHI", shortName: "76ers", location: "Philadelphia", displayName: "Philadelphia 76ers" }
            : home,
      });
      expect(explanation.title, item.play.text).toBe(item.title);
      expect(explanation.ruleId, item.play.text).toBe(item.ruleId);
      for (const snippet of item.includes) {
        expect(explanation.body.toLowerCase(), `${item.play.text} → ${snippet}`).toContain(
          snippet.toLowerCase(),
        );
      }
      expect(explanation.body).not.toMatch(/\bundefined\b|\bNaN\b/);
      expect(explanation.whyItMatters).not.toMatch(/\bundefined\b|\bNaN\b/);
      expect(explanation.chip.length).toBeGreaterThan(0);
    }
  });

  it("notices a lead change and an 8-point run", () => {
    const explanations = explain([
      play({
        id: "base",
        period: 4,
        clock: "3:00",
        typeText: "Full Timeout",
        text: "Celtics Full timeout",
        teamId: away.id,
        homeScore: 97,
        awayScore: 97,
      }),
      play({
        id: "a",
        period: 4,
        clock: "2:10",
        typeText: "Jump Shot",
        text: "Stephen Curry makes 26-foot three pointer",
        teamId: home.id,
        scoringPlay: true,
        scoreValue: 3,
        homeScore: 100,
        awayScore: 97,
      }),
      play({
        id: "b",
        period: 4,
        clock: "1:40",
        typeText: "Layup Shot",
        text: "Stephen Curry makes layup",
        teamId: home.id,
        scoringPlay: true,
        scoreValue: 2,
        homeScore: 102,
        awayScore: 97,
      }),
      play({
        id: "c",
        period: 4,
        clock: "1:10",
        typeText: "Jump Shot",
        text: "Stephen Curry makes 24-foot three pointer",
        teamId: home.id,
        scoringPlay: true,
        scoreValue: 3,
        homeScore: 105,
        awayScore: 97,
      }),
    ]);
    expect(explanations[1].whyItMatters).toContain("takes the lead");
    expect(explanations[3].whyItMatters).toContain("8–0 run");
  });

  it("parses both block apostrophe styles", () => {
    expect(parsePlay(play({ id: "1", typeText: "Dunk", text: "Joel Embiid blocks Jordan Walsh's driving dunk" })).secondary).toBe(
      "Jordan Walsh",
    );
    expect(
      parsePlay(
        play({
          id: "2",
          typeText: "Jump Shot",
          text: "Jaylen Brown blocks Milos Uzan 's 15-foot fade away jump shot",
        }),
      ).secondary,
    ).toBe("Milos Uzan");
  });
});

describe("recorded Celtics at 76ers game", () => {
  const fixture = JSON.parse(
    readFileSync(path.join(process.cwd(), "src/data/demo-game.json"), "utf8"),
  ) as DemoFixture;

  it("explains every real play without inventing empty fields", () => {
    const { explanations } = explainGame({
      home: fixture.home,
      away: fixture.away,
      plays: fixture.plays,
    });
    expect(explanations).toHaveLength(fixture.plays.length);
    const uncovered: string[] = [];
    for (const explanation of explanations) {
      expect(explanation.title.length).toBeGreaterThan(0);
      expect(explanation.body.length).toBeGreaterThan(0);
      expect(explanation.whyItMatters.length).toBeGreaterThan(0);
      expect(explanation.chip.length).toBeGreaterThan(0);
      expect(explanation.body).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/);
      expect(explanation.summary).not.toMatch(/\bundefined\b|\bNaN\b/);
      expect(explanation.whyItMatters).not.toMatch(/\bundefined\b|\bNaN\b/);
      if (explanation.body.includes("no rule card")) {
        const play = fixture.plays.find((item) => item.id === explanation.playId);
        uncovered.push(`${play?.typeText} | ${play?.text}`);
      }
    }
    expect(uncovered, uncovered.join("\n")).toEqual([]);
    expect(fixture.plays.at(-1)?.awayScore).toBe(fixture.finalAway);
    expect(fixture.plays.at(-1)?.homeScore).toBe(fixture.finalHome);
  });
});

describe("guardrail", () => {
  const facts = explain([
    play({
      id: "1",
      period: 4,
      clock: "1:10",
      typeText: "Shooting Foul",
      text: "Jayson Tatum shooting foul",
      teamId: away.id,
      homeScore: 102,
      awayScore: 104,
    }),
  ])[0].facts;

  const allowed = allowListFromFacts(facts);

  it("accepts a rephrase that stays inside the facts", () => {
    const text = "Tatum committed a shooting foul with the Celtics leading 104–102 and 1:10 left.";
    expect(validateRephrase(text, allowed).ok).toBe(true);
  });

  it("rejects a new player, a new score, and a guess", () => {
    expect(validateRephrase("LeBron hit him, so the lead is 9.", allowed).ok).toBe(false);
    expect(validateRephrase("Tatum fouled someone and the score is now 110–102.", allowed).ok).toBe(false);
    expect(validateRephrase("Tatum probably fouled Curry.", allowed).ok).toBe(false);
  });
});

describe("metrics", () => {
  it("returns a real median and never treats no votes as 0%", () => {
    expect(median([])).toBeNull();
    expect(median([4])).toBe(4);
    expect(median([1, 3])).toBe(2);
    expect(median([9, 1, 3])).toBe(3);
    const empty = clearRating([]);
    expect(empty.clearPct).toBeNull();
    expect(formatPct(empty.clearPct)).toBe("—");
    const rating = clearRating([
      { playId: "a", ruleId: "steal", vote: "down", at: 1 },
      { playId: "a", ruleId: "steal", vote: "up", at: 2 },
      { playId: "b", ruleId: "steal", vote: "down", at: 3 },
    ]);
    expect(rating).toMatchObject({ up: 1, down: 1, total: 2, clearPct: 50 });
    const latency = summarizeLatency([
      { playId: "a", engineMs: 0.4, source: "template", at: 1, feedLagMs: 4000 },
      { playId: "b", engineMs: 1.2, source: "template", at: 2 },
      { playId: "a:llm", engineMs: 800, source: "llm", at: 3 },
    ]);
    expect(latency.templateCount).toBe(2);
    expect(latency.templateMedianMs).toBeCloseTo(0.8);
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(0)).toBe("< 0.01 ms");
    expect(formatDuration(0.8)).toBe("0.80 ms");
    expect(latency.llmCount).toBe(1);
    expect(latency.feedLagCount).toBe(1);
    expect(latency.feedLagMedianMs).toBe(4000);
  });
});
