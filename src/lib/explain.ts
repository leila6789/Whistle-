import { clockLabel, clockLeft, periodName, quarterHeadline } from "@/lib/clock";
import { getRule, type RuleId } from "@/lib/rules";
import { teamById, teamByLabel, otherTeam } from "@/lib/teams";
import { bold, lastName, plain, unique } from "@/lib/text";
import type {
  Dot,
  Explanation,
  ExplanationFacts,
  FeedPlay,
  Team,
} from "@/lib/types";

/**
 * Deterministic play explanations.
 *
 * Every sentence is filled from the feed (players, score, clock, play text)
 * plus a rule written in this file. Nothing is inferred about contact that
 * the feed does not name — a shooting foul is not described as "hit his arm"
 * unless the feed says that, which it does not.
 *
 * A three is called "long" only at 26 feet or more. The NBA arc is 23 feet
 * 9 inches, so 26 is a defined cutoff, not a vibe.
 */

const LONG_THREE_FEET = 26;

export type ParsedKind =
  | "jump-ball"
  | "shot"
  | "free-throw"
  | "block"
  | "shooting-foul"
  | "personal-foul"
  | "take-foul"
  | "offensive-foul"
  | "loose-ball-foul"
  | "technical"
  | "flagrant"
  | "turnover"
  | "shot-clock"
  | "travel"
  | "rebound"
  | "timeout"
  | "substitution"
  | "goaltending"
  | "violation"
  | "challenge"
  | "end-period"
  | "end-game"
  | "other";

export type TurnoverDetail =
  | "bad-pass"
  | "lost-ball"
  | "out-of-bounds"
  | "palming"
  | "double-dribble"
  | "offensive-foul"
  | "other";

export type ParsedPlay = {
  kind: ParsedKind;
  primary?: string;
  secondary?: string;
  tertiary?: string;
  made?: boolean;
  points?: 1 | 2 | 3;
  feet?: number;
  shotLabel?: string;
  ftIndex?: number;
  ftTotal?: number;
  technicalFreeThrow?: boolean;
  reboundSide?: "offensive" | "defensive";
  teamRebound?: boolean;
  teamLabel?: string;
  turnoverDetail?: TurnoverDetail;
  flagrantDegree?: 1 | 2;
  technicalKind?: "standard" | "flopping" | "defensive-three-seconds";
  goaltendSide?: "defensive" | "offensive";
  charge?: boolean;
  challengeResult?: "overturned" | "stands";
  violationKind?: "lane" | "kicked-ball" | "other";
  timeoutKind?: string;
};

type GameLike = {
  home: Team;
  away: Team;
  plays: FeedPlay[];
};

type Acc = {
  teamPeriod: Map<string, { period: number; count: number }>;
  playerFouls: Map<string, number>;
  lastAway: number;
  lastHome: number;
  runSide: "home" | "away" | null;
  runPoints: number;
};

type Moment = {
  andOne: boolean;
  shooter?: string;
  shooterTeam?: Team;
  shotPoints?: 2 | 3;
  shotMade?: boolean;
  shotLabel?: string;
  ftCount?: number;
  fouler?: string;
  foulerTeam?: Team;
  playerFoulCount?: number;
  teamFoulCount?: number;
  countsAsTeamFoul: boolean;
  timeoutTeam?: Team;
};

const PLAYER_FOULS = new Set<ParsedKind>([
  "shooting-foul",
  "personal-foul",
  "take-foul",
  "offensive-foul",
  "loose-ball-foul",
  "technical",
  "flagrant",
]);

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function feetIn(text: string): number | undefined {
  const match = text.match(/(\d+)-foot/i);
  if (!match) return undefined;
  return Number(match[1]);
}

function shotPoints(desc: string, typeText: string, scoreValue: number): 2 | 3 {
  const blob = `${desc} ${typeText}`.toLowerCase();
  if (
    blob.includes("three point") ||
    blob.includes("three pointer") ||
    blob.includes("3-point") ||
    blob.includes("3pt")
  ) {
    return 3;
  }
  if (scoreValue === 3) return 3;
  return 2;
}

function shotLabel(desc: string, typeText: string, points: 2 | 3): string {
  const blob = `${typeText} ${desc}`.toLowerCase();
  if (points === 3 || blob.includes("three")) return "three-pointer";
  if (blob.includes("alley")) return "alley-oop";
  if (blob.includes("dunk")) return "dunk";
  if (blob.includes("putback") || blob.includes("tip")) return "putback";
  if (blob.includes("layup") || blob.includes("finger roll")) return "layup";
  if (blob.includes("hook")) return "hook shot";
  if (blob.includes("heave")) return "heave";
  return "jumper";
}

function article(label: string): string {
  return /^[aeiou]/i.test(label) ? "an" : "a";
}

export function parsePlay(play: FeedPlay): ParsedPlay {
  const text = clean(play.text || "");
  const typeText = clean(play.typeText || "");
  const lower = text.toLowerCase();

  if (lower === "end of game" || typeText.toLowerCase() === "end game") {
    return { kind: "end-game" };
  }
  if (lower.startsWith("end of ") || typeText.toLowerCase() === "end period") {
    return { kind: "end-period" };
  }

  const jump = text.match(/^(.+?) vs\. (.+?) \((.+?) gains possession\)$/i);
  if (jump) {
    return {
      kind: "jump-ball",
      primary: jump[1],
      secondary: jump[2],
      tertiary: jump[3],
    };
  }

  const sub = text.match(/^(.+?) enters the game for (.+)$/i);
  if (sub) {
    return { kind: "substitution", primary: sub[1], secondary: sub[2] };
  }

  const block = text.match(/^(.+?) blocks (.+?)\s*'s\s+(.+)$/i);
  if (block) {
    const desc = block[3];
    const points = shotPoints(desc, typeText, 0);
    return {
      kind: "block",
      primary: block[1],
      secondary: block[2],
      shotLabel: shotLabel(desc, typeText, points),
      points,
      feet: feetIn(desc),
      made: false,
    };
  }

  const techFt = text.match(/^(.+?) (makes|misses) technical free throw$/i);
  if (techFt) {
    return {
      kind: "free-throw",
      primary: techFt[1],
      made: techFt[2].toLowerCase() === "makes",
      points: 1,
      technicalFreeThrow: true,
      ftIndex: 1,
      ftTotal: 1,
    };
  }

  const ft = text.match(/^(.+?) (makes|misses) free throw (\d) of (\d)$/i);
  if (ft) {
    return {
      kind: "free-throw",
      primary: ft[1],
      made: ft[2].toLowerCase() === "makes",
      points: 1,
      ftIndex: Number(ft[3]),
      ftTotal: Number(ft[4]),
    };
  }

  if (/shot clock/i.test(text) || /shot clock/i.test(typeText)) {
    return { kind: "shot-clock" };
  }

  const travel = text.match(/^(.+?) traveling\b/i);
  if (travel) return { kind: "travel", primary: travel[1] };

  const palm = text.match(/^(.+?) palming turnover$/i);
  if (palm) {
    return { kind: "turnover", primary: palm[1], turnoverDetail: "palming" };
  }

  const dribble = text.match(/^(.+?) double dribble(?: turnover)?$/i);
  if (dribble) {
    return { kind: "turnover", primary: dribble[1], turnoverDetail: "double-dribble" };
  }

  const goal = text.match(/^(.+?) (defensive|offensive) goaltending/i);
  if (goal) {
    return {
      kind: "goaltending",
      primary: goal[1],
      goaltendSide: goal[2].toLowerCase() as "defensive" | "offensive",
    };
  }

  const d3 = text.match(/^(.+?) defensive (?:3-seconds|three seconds)/i);
  if (d3) {
    return {
      kind: "technical",
      primary: d3[1],
      technicalKind: "defensive-three-seconds",
    };
  }

  const flop = text.match(/^(.+?) flopping technical/i);
  if (flop) {
    return { kind: "technical", primary: flop[1], technicalKind: "flopping" };
  }

  const flagrant = text.match(/^(.+?) flagrant(?: foul)?(?: type)?(?: (\d))?$/i);
  if (flagrant) {
    const degree = flagrant[2] ? (Number(flagrant[2]) as 1 | 2) : undefined;
    return { kind: "flagrant", primary: flagrant[1], flagrantDegree: degree };
  }

  const technical = text.match(/^(.+?) technical foul$/i);
  if (technical) {
    return { kind: "technical", primary: technical[1], technicalKind: "standard" };
  }

  const charge = text.match(/^(.+?) offensive charge$/i);
  if (charge) return { kind: "offensive-foul", primary: charge[1], charge: true };

  const offTo = text.match(/^(.+?) offensive foul turnover$/i);
  if (offTo) {
    return { kind: "turnover", primary: offTo[1], turnoverDetail: "offensive-foul" };
  }

  const off = text.match(/^(.+?) offensive foul$/i);
  if (off) return { kind: "offensive-foul", primary: off[1] };

  const shooting = text.match(/^(.+?) shooting foul$/i);
  if (shooting) return { kind: "shooting-foul", primary: shooting[1] };

  const loose = text.match(/^(.+?) loose ball foul$/i);
  if (loose) return { kind: "loose-ball-foul", primary: loose[1] };

  const take = text.match(/^(.+?) personal take foul$/i);
  if (take) return { kind: "take-foul", primary: take[1] };

  const personal = text.match(/^(.+?) personal foul$/i);
  if (personal) return { kind: "personal-foul", primary: personal[1] };

  const step = text.match(/^(.+?) steps out of bounds turnover$/i);
  if (step) {
    return { kind: "turnover", primary: step[1], turnoverDetail: "out-of-bounds" };
  }

  if (/turnover/i.test(text)) {
    return parseTurnover(text);
  }

  const lane = text.match(/^(.+?) lane violation/i);
  if (lane || /lane violation/i.test(text)) {
    return {
      kind: "violation",
      primary: lane?.[1],
      violationKind: "lane",
    };
  }

  const kick = text.match(/^(.+?) (?:kicked ball|kick ball|kicked-ball)/i);
  if (kick || /kicked ball|kick ball/i.test(text)) {
    return {
      kind: "violation",
      primary: kick?.[1],
      violationKind: "kicked-ball",
    };
  }

  const challengeLong = text.match(
    /\[(.+?)\] coach's challenge \(call (overturned|stands)\)/i,
  );
  if (challengeLong || /challenge/i.test(text) || /challenge/i.test(typeText)) {
    const result = challengeLong?.[2]?.toLowerCase();
    return {
      kind: "challenge",
      teamLabel: challengeLong?.[1] ?? text.match(/^(.+?) coach's challenge$/i)?.[1],
      ...(result === "overturned" || result === "stands"
        ? { challengeResult: result }
        : {}),
    };
  }

  const teamBoard = text.match(/^(.+?) (offensive|defensive) team rebound$/i);
  if (teamBoard) {
    return {
      kind: "rebound",
      teamLabel: teamBoard[1],
      teamRebound: true,
      reboundSide: teamBoard[2].toLowerCase() as "offensive" | "defensive",
    };
  }

  const board = text.match(/^(.+?) (offensive|defensive) rebound$/i);
  if (board) {
    return {
      kind: "rebound",
      primary: board[1],
      reboundSide: board[2].toLowerCase() as "offensive" | "defensive",
    };
  }

  const timeout = text.match(
    /^(.+?)(?: (full|short|official|20-second|20 second))? timeout$/i,
  );
  if ((timeout || /timeout/i.test(typeText)) && !/challenge/i.test(text)) {
    return {
      kind: "timeout",
      teamLabel: timeout?.[1],
      timeoutKind: timeout?.[2]?.toLowerCase(),
    };
  }

  const shot = text.match(/^(.+?) (makes|misses) (.+)$/i);
  if (shot) {
    let desc = shot[3];
    let assist: string | undefined;
    const assistMatch = desc.match(/^(.*) \((.+?) assists\)$/i);
    if (assistMatch) {
      desc = assistMatch[1];
      assist = assistMatch[2];
    }
    const points = shotPoints(desc, typeText, play.scoreValue);
    return {
      kind: "shot",
      primary: shot[1],
      secondary: assist,
      made: shot[2].toLowerCase() === "makes",
      points,
      feet: feetIn(desc),
      shotLabel: shotLabel(desc, typeText, points),
    };
  }

  return { kind: "other" };
}

function parseTurnover(text: string): ParsedPlay {
  const steal = text.match(/\((.+?) steals\)\s*$/i)?.[1];
  const base = text.replace(/\s*\((.+?) steals\)\s*$/i, "").trim();
  const marker = base.toLowerCase().lastIndexOf(" turnover");
  const head = marker >= 0 ? base.slice(0, marker).trim() : base;
  const suffixes: { phrase: string; detail: TurnoverDetail }[] = [
    { phrase: "out of bounds bad pass", detail: "out-of-bounds" },
    { phrase: "out of bounds lost ball", detail: "out-of-bounds" },
    { phrase: "out of bounds", detail: "out-of-bounds" },
    { phrase: "steps out of bounds", detail: "out-of-bounds" },
    { phrase: "bad pass", detail: "bad-pass" },
    { phrase: "lost ball", detail: "lost-ball" },
    { phrase: "offensive foul", detail: "offensive-foul" },
    { phrase: "double dribble", detail: "double-dribble" },
    { phrase: "palming", detail: "palming" },
    { phrase: "traveling", detail: "other" },
  ];
  const lower = head.toLowerCase();
  for (const suffix of suffixes) {
    if (lower.endsWith(suffix.phrase)) {
      const name = head.slice(0, head.length - suffix.phrase.length).trim();
      return {
        kind: "turnover",
        primary: name || undefined,
        secondary: steal,
        turnoverDetail: suffix.detail,
      };
    }
  }
  return {
    kind: "turnover",
    primary: head || undefined,
    secondary: steal,
    turnoverDetail: "other",
  };
}

function isTeamFoul(parsed: ParsedPlay): boolean {
  if (!PLAYER_FOULS.has(parsed.kind)) return false;
  if (parsed.kind === "offensive-foul") return false;
  return true;
}

function sameMoment(plays: FeedPlay[], index: number): FeedPlay[] {
  const play = plays[index];
  const out: FeedPlay[] = [];
  for (let i = 0; i < plays.length; i += 1) {
    if (i === index) continue;
    const other = plays[i];
    if (other.period === play.period && other.clock === play.clock) out.push(other);
  }
  return out;
}

function siblingShot(
  siblings: FeedPlay[],
  home: Team,
  away: Team,
): { name?: string; team?: Team; points?: 2 | 3; made?: boolean; label?: string } {
  for (const sibling of siblings) {
    const parsed = parsePlay(sibling);
    if (parsed.kind === "shot") {
      return {
        name: parsed.primary,
        team: teamById(sibling.teamId, home, away),
        points: parsed.points === 3 ? 3 : 2,
        made: parsed.made,
        label: parsed.shotLabel,
      };
    }
  }
  return {};
}

function observedFreeThrows(siblings: FeedPlay[]): number | undefined {
  let max = 0;
  for (const sibling of siblings) {
    const match = clean(sibling.text).match(/free throw \d of (\d)/i);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max || undefined;
}

function distancePhrase(feet: number | undefined): string {
  if (!feet || feet <= 4) return "";
  return ` from ${feet} feet`;
}

function longThree(parsed: ParsedPlay): boolean {
  return parsed.shotLabel === "three-pointer" && (parsed.feet ?? 0) >= LONG_THREE_FEET;
}

function plus(team: Team | undefined, points: number | undefined): string {
  if (!team || !points) return "";
  return ` ${bold(team.shortName)} +${points}`;
}

function scoreSentence(
  play: FeedPlay,
  home: Team,
  away: Team,
): string {
  const late = play.period >= 4;
  const when = late
    ? ` with ${clockLeft(play.clock)} in ${periodName(play.period)}`
    : ` in ${periodName(play.period)}`;
  if (play.awayScore === play.homeScore) {
    return `The game is tied at ${play.awayScore}${when}.`;
  }
  const leader = play.awayScore > play.homeScore ? away : home;
  const margin = Math.abs(play.awayScore - play.homeScore);
  const hi = Math.max(play.awayScore, play.homeScore);
  const lo = Math.min(play.awayScore, play.homeScore);
  return `${leader.shortName} lead by ${margin}, ${hi}–${lo}${when}.`;
}

function isClutch(play: FeedPlay): boolean {
  const secs = parseClockSafe(play.clock);
  const late = play.period > 4 || (play.period === 4 && secs <= 180);
  const margin = Math.abs(play.awayScore - play.homeScore);
  return late && margin <= 6;
}

function parseClockSafe(clock: string): number {
  if (clock.includes(":")) {
    const [m, s] = clock.split(":");
    return Number(m) * 60 + Number(s);
  }
  return Number(clock);
}

function clutchFreeThrows(
  play: FeedPlay,
  home: Team,
  away: Team,
  moment: Moment,
): string | undefined {
  if (!moment.ftCount || !moment.shooter || !moment.shooterTeam) return undefined;
  if (!isClutch(play)) return undefined;
  const team = moment.shooterTeam;
  const teamScore = team.id === home.id ? play.homeScore : play.awayScore;
  const otherScore = team.id === home.id ? play.awayScore : play.homeScore;
  const margin = otherScore - teamScore;
  const attempt =
    moment.ftCount === 1 ? "makes the free throw" : `makes all ${moment.ftCount}`;
  const who = lastName(moment.shooter);
  if (margin > 0) {
    const after = margin - moment.ftCount;
    let result: string;
    if (after < 0) result = `${team.location} takes the lead`;
    else if (after === 0) result = "the game is tied";
    else result = `${team.shortName} cut it to ${after}`;
    return `${team.shortName} are down ${margin} with ${clockLeft(play.clock)}. If ${who} ${attempt}, ${result}.`;
  }
  if (margin === 0) {
    return `The game is tied at ${play.awayScore} with ${clockLeft(play.clock)}. If ${who} ${attempt}, ${team.location} takes the lead.`;
  }
  const lead = -margin;
  return `${team.shortName} lead by ${lead} with ${clockLeft(play.clock)}. If ${who} ${attempt}, the lead grows to ${lead + moment.ftCount}.`;
}

function previewRun(acc: Acc, play: FeedPlay): { side: "home" | "away"; points: number } | null {
  const dAway = play.awayScore - acc.lastAway;
  const dHome = play.homeScore - acc.lastHome;
  if (dAway > 0 && dHome === 0) {
    return {
      side: "away",
      points: acc.runSide === "away" ? acc.runPoints + dAway : dAway,
    };
  }
  if (dHome > 0 && dAway === 0) {
    return {
      side: "home",
      points: acc.runSide === "home" ? acc.runPoints + dHome : dHome,
    };
  }
  return null;
}

function scoringTeam(
  play: FeedPlay,
  acc: Acc,
  home: Team,
  away: Team,
): { team: Team; points: number } | undefined {
  const dAway = play.awayScore - acc.lastAway;
  const dHome = play.homeScore - acc.lastHome;
  if (dAway > 0 && dHome === 0) return { team: away, points: dAway };
  if (dHome > 0 && dAway === 0) return { team: home, points: dHome };
  return undefined;
}

function whyItMatters(
  play: FeedPlay,
  parsed: ParsedPlay,
  acc: Acc,
  home: Team,
  away: Team,
  moment: Moment,
): string {
  const awayScore = play.awayScore;
  const homeScore = play.homeScore;
  const tied = awayScore === homeScore;
  const leader = awayScore > homeScore ? away : home;
  const hi = Math.max(awayScore, homeScore);
  const lo = Math.min(awayScore, homeScore);
  const base = scoreSentence(play, home, away);

  if (parsed.kind === "end-game") {
    if (tied) return `The game ends tied at ${awayScore}.`;
    return `${leader.location} wins, ${hi}–${lo}.`;
  }

  if (parsed.kind === "end-period") {
    if (play.period === 2) return `It's halftime. ${base}`;
    if (play.period === 4 && tied) {
      return `The 4th quarter ends tied at ${awayScore}. They play a 5-minute overtime.`;
    }
    if (play.period > 4 && tied) {
      return `Still tied at ${awayScore}. Another 5-minute overtime.`;
    }
    if (play.period >= 4 && !tied) return `${leader.location} wins, ${hi}–${lo}.`;
    return `${quarterHeadline(play.period)} is over. ${base}`;
  }

  const prevDiff = acc.lastAway - acc.lastHome;
  const diff = awayScore - homeScore;
  const prevTotal = acc.lastAway + acc.lastHome;
  const flipped =
    prevTotal > 0 && prevDiff !== 0 && diff !== 0 && Math.sign(prevDiff) !== Math.sign(diff);
  const tookLead = prevTotal > 0 && prevDiff === 0 && diff !== 0;
  const tiedIt = prevDiff !== 0 && diff === 0;
  const scored = Boolean(scoringTeam(play, acc, home, away));

  if (scored && (flipped || tookLead)) {
    return `${leader.location} takes the lead, ${hi}–${lo}, with ${clockLeft(play.clock)} in ${periodName(play.period)}.`;
  }
  if (scored && tiedIt && (isClutch(play) || play.period >= 4)) {
    const scorer = scoringTeam(play, acc, home, away);
    return `${scorer?.team.location ?? "They"} ties the game at ${awayScore} with ${clockLeft(play.clock)} in ${periodName(play.period)}.`;
  }

  if (
    (parsed.kind === "shooting-foul" || parsed.kind === "free-throw") &&
    moment.ftCount &&
    moment.shooter
  ) {
    const clutch = clutchFreeThrows(play, home, away, moment);
    if (clutch) return clutch;
  }

  if (moment.fouler && moment.playerFoulCount && moment.playerFoulCount >= 6) {
    return `${lastName(moment.fouler)} has fouled out with 6 fouls. ${base}`;
  }

  if (moment.countsAsTeamFoul && moment.teamFoulCount === 5 && moment.foulerTeam) {
    return `That is team foul 5 on the ${moment.foulerTeam.shortName}. They are in the bonus for the rest of ${periodName(play.period)}: common fouls now mean 2 free throws.`;
  }

  if (moment.fouler && moment.playerFoulCount === 5) {
    return `${lastName(moment.fouler)} has 5 fouls. One more and they are out of the game. ${base}`;
  }

  const run = previewRun(acc, play);
  if (run && run.points >= 8 && scored) {
    const team = run.side === "home" ? home : away;
    return `That's a ${run.points}–0 run for the ${team.shortName}. ${base}`;
  }

  if (parsed.kind === "timeout" && moment.timeoutTeam && isClutch(play)) {
    return `${moment.timeoutTeam.shortName} stop the clock with ${clockLeft(play.clock)} in ${periodName(play.period)}. ${base}`;
  }

  if (parsed.kind === "free-throw" && parsed.ftIndex && parsed.ftTotal && parsed.ftIndex < parsed.ftTotal && isClutch(play)) {
    const left = parsed.ftTotal - parsed.ftIndex;
    return `${base} ${left} free throw${left === 1 ? "" : "s"} still to come.`;
  }

  let sentence = base;
  const margin = Math.abs(awayScore - homeScore);
  if (margin >= 20 && play.period >= 4) {
    sentence += " The lead is large enough that one possession will not flip it.";
  }
  return sentence;
}

type Draft = {
  ruleId: RuleId;
  title: string;
  chip: string;
  summary: string;
  body: string;
  dot: Dot;
  players: string[];
  detail: Record<string, string | number | boolean>;
};

function describe(play: FeedPlay, parsed: ParsedPlay, game: GameLike, acc: Acc, moment: Moment): Draft {
  const { home, away } = game;
  const scored = scoringTeam(play, acc, home, away);
  const team = teamById(play.teamId, home, away);

  switch (parsed.kind) {
    case "shot":
      return describeShot(parsed, moment, scored, team);
    case "block":
      return describeBlock(parsed);
    case "free-throw":
      return describeFreeThrow(parsed, moment, scored);
    case "shooting-foul":
      return describeShootingFoul(parsed, moment);
    case "personal-foul":
      return describeCommonFoul(parsed, moment, "personal-foul", "Personal foul");
    case "loose-ball-foul":
      return describeCommonFoul(parsed, moment, "loose-ball-foul", "Loose-ball foul");
    case "take-foul":
      return describeTakeFoul(parsed, moment);
    case "offensive-foul":
      return describeOffensiveFoul(parsed, moment);
    case "technical":
      return describeTechnical(parsed);
    case "flagrant":
      return describeFlagrant(parsed);
    case "turnover":
      return describeTurnover(parsed, team, home, away);
    case "travel":
      return describeTravel(parsed);
    case "shot-clock":
      return describeShotClock(team);
    case "rebound":
      return describeRebound(parsed, home, away, team);
    case "timeout":
      return describeTimeout(parsed, moment.timeoutTeam);
    case "substitution":
      return describeSub(parsed);
    case "jump-ball":
      return describeJump(parsed);
    case "goaltending":
      return describeGoaltend(parsed);
    case "violation":
      return describeViolation(parsed);
    case "challenge":
      return describeChallenge(parsed, moment.timeoutTeam ?? teamByLabel(parsed.teamLabel, home, away));
    case "end-period":
      return describeEndPeriod(play, home, away);
    case "end-game":
      return describeEndGame(play, home, away);
    default:
      return {
        ruleId: "violation",
        title: "This play",
        chip: "This play",
        summary: clean(play.text) || "A play the feed did not label.",
        body: play.text
          ? `The feed says: "${clean(play.text)}." There is no rule card for this exact call, so nothing is added beyond that line.`
          : "The feed sent a play with no description. There is nothing else to add.",
        dot: "neutral",
        players: [],
        detail: { unclassified: true },
      };
  }
}

function describeShot(
  parsed: ParsedPlay,
  moment: Moment,
  scored: { team: Team; points: number } | undefined,
  team: Team | undefined,
): Draft {
  const name = parsed.primary ?? "The shooter";
  const label = parsed.shotLabel ?? "shot";
  const points = parsed.points === 3 ? 3 : 2;
  const from = distancePhrase(parsed.feet);
  const assist = parsed.secondary ? `, assisted by ${bold(parsed.secondary)}` : "";
  const scoringTeamName = scored?.team ?? team;

  if (moment.andOne && parsed.made) {
    return {
      ruleId: "and-one",
      title: "And-one",
      chip: `${lastName(name)} and-one`,
      summary: `${bold(lastName(name))} made ${article(label)} ${label} and was fouled.${plus(scoringTeamName, scored?.points ?? points)}`,
      body: `${bold(name)} made ${article(label)} ${label}${from}${assist} and was fouled on the shot. The basket counts, and ${name} shoots 1 free throw. That combination is an and-one.`,
      dot: "make",
      players: unique([parsed.primary, parsed.secondary]),
      detail: { made: true, points, andOne: true, label },
    };
  }

  if (parsed.made) {
    const ruleId: RuleId = points === 3 ? "three-pointer" : "two-pointer";
    const worth =
      points === 3
        ? "A shot from behind the three-point line is worth 3 points."
        : `${label === "dunk" ? "A dunk" : label === "layup" ? "A layup" : "A shot inside the three-point line"} is worth 2 points.`;
    return {
      ruleId,
      title: points === 3 ? "Three-pointer" : "Two-pointer",
      chip: `${lastName(name)} ${label === "three-pointer" ? "3-pointer" : label}`,
      summary: `${bold(lastName(name))} made ${article(label)} ${label}.${plus(scoringTeamName, scored?.points ?? points)}`,
      body: `${bold(name)} made ${article(label)} ${label}${from}${assist}. ${worth}`,
      dot: "make",
      players: unique([parsed.primary, parsed.secondary]),
      detail: { made: true, points, label, ...(parsed.feet ? { feet: parsed.feet } : {}) },
    };
  }

  const shown = longThree(parsed) ? `long ${label}` : label;
  const ruleId: RuleId = points === 3 ? "three-pointer" : "missed-shot";
  const ruleBit =
    label === "heave"
      ? "A heave is a last-second shot, usually just to beat the buzzer. This one missed, so it is worth nothing."
      : points === 3
        ? "A three-pointer is a shot from behind the arc, worth 3 points only if it goes in. This one missed."
        : "A missed shot is worth nothing. Either team can grab the rebound.";
  return {
    ruleId,
    title: label === "heave" ? "Heave" : points === 3 ? "Missed three" : "Missed shot",
    chip: points === 3 ? `${lastName(name)} 3-pt miss` : `${lastName(name)} ${label} miss`,
    summary: `${bold(lastName(name))} missed ${article(shown)} ${shown}.`,
    body: `${bold(name)} missed ${article(shown)} ${shown}${from}. ${ruleBit}`,
    dot: "miss",
    players: unique([parsed.primary]),
    detail: { made: false, points, label, ...(parsed.feet ? { feet: parsed.feet } : {}) },
  };
}

function describeBlock(parsed: ParsedPlay): Draft {
  const blocker = parsed.primary ?? "The defender";
  const shooter = parsed.secondary ?? "the shooter";
  const label = parsed.shotLabel ?? "shot";
  return {
    ruleId: "block",
    title: "Blocked shot",
    chip: `${lastName(blocker)} block`,
    summary: `${bold(lastName(blocker))} blocked ${bold(lastName(shooter))}'s ${label}.`,
    body: `${bold(blocker)} blocked ${bold(shooter)}'s ${label}. A block is a defender tipping the ball as the shot is released. The shot does not count, and the ball stays live.`,
    dot: "miss",
    players: unique([parsed.primary, parsed.secondary]),
    detail: { label },
  };
}

function describeFreeThrow(
  parsed: ParsedPlay,
  moment: Moment,
  scored: { team: Team; points: number } | undefined,
): Draft {
  const name = parsed.primary ?? "The shooter";
  const made = Boolean(parsed.made);
  const index = parsed.ftIndex;
  const total = parsed.ftTotal;
  const count =
    index && total ? ` free throw ${index} of ${total}` : " a free throw";
  let extra = "A free throw is an uncontested shot from 15 feet, worth 1 point.";
  if (parsed.technicalFreeThrow) {
    extra = "This free throw is the penalty for a technical foul. It is worth 1 point, then play continues.";
  } else if (moment.andOne) {
    extra = "This is the extra free throw from an and-one. The basket already counted. A made free throw is worth 1 more point.";
  } else if (index && total && index < total) {
    const left = total - index;
    extra = `${extra} ${left} more ${left === 1 ? "is" : "are"} left.`;
  } else if (index && total && index === total) {
    extra = `${extra} That was the last one.`;
  }
  return {
    ruleId: "free-throw",
    title: "Free throw",
    chip: `${lastName(name)} free throw`,
    summary: `${bold(lastName(name))} ${made ? "made" : "missed"}${count}.${made ? plus(scored?.team, scored?.points ?? 1) : ""}`,
    body: `${bold(name)} ${made ? "made" : "missed"}${count}. ${extra}`,
    dot: made ? "make" : "miss",
    players: unique([parsed.primary]),
    detail: {
      made,
      ...(index ? { ftIndex: index } : {}),
      ...(total ? { ftTotal: total } : {}),
      technical: Boolean(parsed.technicalFreeThrow),
    },
  };
}

function describeShootingFoul(parsed: ParsedPlay, moment: Moment): Draft {
  const fouler = parsed.primary ?? "A defender";
  const shooter = moment.shooter;
  const label = moment.shotLabel;
  const n = moment.ftCount;
  const shots = n === 1 ? "1 free throw" : n ? `${n} free throws` : "free throws";
  let summary: string;
  let body: string;
  if (moment.andOne && shooter) {
    summary = `Foul on ${bold(lastName(fouler))}. The shot counts, and ${bold(lastName(shooter))} shoots 1 free throw.`;
    body = `${bold(fouler)} fouled ${bold(shooter)} as the shot went in. The basket counts, and ${shooter} shoots 1 free throw. That is an and-one: the points plus one more shot.`;
  } else if (shooter && label) {
    summary = `Foul on ${bold(lastName(fouler))}. ${bold(lastName(shooter))} will shoot ${shots}.`;
    const outcome = moment.shotMade
      ? `The shot went in, so ${shooter} keeps those points and shoots ${shots}.`
      : `The shot missed, so ${shooter} shoots ${shots}.`;
    body = `${bold(fouler)} fouled ${bold(shooter)} on ${article(label)} ${label}. ${outcome} A shooting foul is contact on a player who is in the act of shooting.`;
  } else if (shooter) {
    summary = `Foul on ${bold(lastName(fouler))}. ${bold(lastName(shooter))} will shoot ${shots}.`;
    body = `${bold(fouler)} was called for a shooting foul on ${bold(shooter)}. ${shooter} shoots ${shots}. A shooting foul is contact on a player who is in the act of shooting.`;
  } else {
    summary = `Foul on ${bold(lastName(fouler))}.`;
    body = `${bold(fouler)} was called for a shooting foul. That is contact on a player who is in the act of shooting, so the shooter gets free throws.`;
  }
  return {
    ruleId: "shooting-foul",
    title: "Shooting foul",
    chip: `Foul on ${lastName(fouler)}`,
    summary,
    body,
    dot: "foul",
    players: unique([parsed.primary, moment.shooter]),
    detail: {
      ...(n ? { freeThrows: n } : {}),
      andOne: moment.andOne,
    },
  };
}

function describeCommonFoul(
  parsed: ParsedPlay,
  moment: Moment,
  ruleId: RuleId,
  title: string,
): Draft {
  const name = parsed.primary ?? "A player";
  const team = moment.foulerTeam;
  const count = moment.teamFoulCount;
  let penalty: string;
  if (moment.ftCount && moment.ftCount > 0) {
    penalty = `The other team shoots ${moment.ftCount} free throw${moment.ftCount === 1 ? "" : "s"}.`;
  } else if (count && count >= 5) {
    penalty = `This is team foul ${count} on the ${team?.shortName ?? "defense"}. They are in the bonus, so the other team shoots 2 free throws.`;
  } else if (count) {
    penalty = `No free throws yet. This is team foul ${count}. A team can commit 4 in a quarter before the bonus.`;
  } else {
    penalty = "No free throws, unless that team is already in the bonus.";
  }
  const what =
    ruleId === "loose-ball-foul"
      ? `${bold(name)} fouled someone while they were both going for a loose ball. A loose-ball foul counts as a team foul.`
      : `${bold(name)} committed a personal foul: illegal contact that is not on a shot.`;
  return {
    ruleId,
    title,
    chip: `Foul on ${lastName(name)}`,
    summary: `Foul on ${bold(lastName(name))}.`,
    body: `${what} ${penalty}`,
    dot: "foul",
    players: unique([parsed.primary]),
    detail: {
      ...(count ? { teamFouls: count } : {}),
      ...(moment.playerFoulCount ? { playerFouls: moment.playerFoulCount } : {}),
    },
  };
}

function describeTakeFoul(parsed: ParsedPlay, moment: Moment): Draft {
  const name = parsed.primary ?? "A defender";
  const shots = moment.ftCount ?? 1;
  return {
    ruleId: "take-foul",
    title: "Take foul",
    chip: `Foul on ${lastName(name)}`,
    summary: `Take foul on ${bold(lastName(name))}.`,
    body: `${bold(name)} committed a take foul: grabbing a player away from the ball to stop a break. The penalty is ${shots} free throw${shots === 1 ? "" : "s"}, and the fouled team keeps the ball.`,
    dot: "foul",
    players: unique([parsed.primary]),
    detail: { freeThrows: shots },
  };
}

function describeOffensiveFoul(parsed: ParsedPlay, moment: Moment): Draft {
  const name = parsed.primary ?? "An offensive player";
  const charge = parsed.charge
    ? " This one is a charge: the defender was set, and the offensive player ran into them."
    : "";
  return {
    ruleId: "offensive-foul",
    title: "Offensive foul",
    chip: `Foul on ${lastName(name)}`,
    summary: `Offensive foul on ${bold(lastName(name))}.`,
    body: `${bold(name)} was called for an offensive foul.${charge} No free throws. The other team gets the ball. It counts on ${name}'s personal fouls${moment.playerFoulCount ? ` (foul ${moment.playerFoulCount})` : ""}, but not toward the team bonus.`,
    dot: "foul",
    players: unique([parsed.primary]),
    detail: {
      charge: Boolean(parsed.charge),
      ...(moment.playerFoulCount ? { playerFouls: moment.playerFoulCount } : {}),
    },
  };
}

function describeTechnical(parsed: ParsedPlay): Draft {
  const name = parsed.primary ?? "A player";
  if (parsed.technicalKind === "defensive-three-seconds") {
    return {
      ruleId: "defensive-three-seconds",
      title: "Defensive 3 seconds",
      chip: `${lastName(name)} 3 seconds`,
      summary: `${bold(lastName(name))} was called for defensive 3 seconds.`,
      body: `${bold(name)} stood in the paint too long. A defender cannot stay in the paint for 3 seconds unless they are guarding someone. It is a technical foul: the other team shoots 1 free throw.`,
      dot: "foul",
      players: unique([parsed.primary]),
      detail: { freeThrows: 1 },
    };
  }
  if (parsed.technicalKind === "flopping") {
    return {
      ruleId: "technical",
      title: "Technical foul",
      chip: `${lastName(name)} technical`,
      summary: `Technical foul on ${bold(lastName(name))} for flopping.`,
      body: `${bold(name)} was called for a flopping technical. Flopping means exaggerating contact to sell a foul. The other team shoots 1 free throw, then play goes on.`,
      dot: "foul",
      players: unique([parsed.primary]),
      detail: { flopping: true, freeThrows: 1 },
    };
  }
  return {
    ruleId: "technical",
    title: "Technical foul",
    chip: `${lastName(name)} technical`,
    summary: `Technical foul on ${bold(lastName(name))}.`,
    body: `${bold(name)} was called for a technical foul. A technical is for conduct, not for contact on a play. The other team shoots 1 free throw, then play continues. Two technicals and a player is ejected.`,
    dot: "foul",
    players: unique([parsed.primary]),
    detail: { freeThrows: 1 },
  };
}

function describeFlagrant(parsed: ParsedPlay): Draft {
  const name = parsed.primary ?? "A player";
  const degree = parsed.flagrantDegree;
  const stay =
    degree === 2
      ? "A flagrant 2 means the player is ejected."
      : degree === 1
        ? "A flagrant 1 means the player stays in the game."
        : "Flagrant 1 stays in. Flagrant 2 is an ejection.";
  return {
    ruleId: "flagrant",
    title: degree ? `Flagrant ${degree}` : "Flagrant foul",
    chip: `Flagrant on ${lastName(name)}`,
    summary: `Flagrant foul on ${bold(lastName(name))}.`,
    body: `${bold(name)} was called for a flagrant${degree ? ` ${degree}` : ""} foul. A flagrant is unnecessary or excessive contact, beyond a normal foul. The other team shoots 2 free throws and keeps the ball. ${stay}`,
    dot: "foul",
    players: unique([parsed.primary]),
    detail: { freeThrows: 2, ...(degree ? { degree } : {}) },
  };
}

function describeTurnover(parsed: ParsedPlay, team: Team | undefined, home: Team, away: Team): Draft {
  const name = parsed.primary;
  const other = team ? otherTeam(team, home, away) : undefined;
  const ball = other ? ` ${other.shortName} get the ball.` : " The other team gets the ball.";
  if (parsed.secondary && name) {
    return {
      ruleId: "steal",
      title: "Steal",
      chip: `${lastName(parsed.secondary)} steal`,
      summary: `${bold(lastName(parsed.secondary))} stole the ball from ${bold(lastName(name))}.`,
      body: `${bold(parsed.secondary)} stole the ball from ${bold(name)}. A steal is the defense taking the ball away. It is also a turnover for ${name}'s team: they lose the possession without a shot.${ball}`,
      dot: "turnover",
      players: unique([parsed.primary, parsed.secondary]),
      detail: { steal: true, detail: parsed.turnoverDetail ?? "other" },
    };
  }
  if (parsed.turnoverDetail === "palming" && name) {
    return {
      ruleId: "turnover",
      title: "Palming",
      chip: `${lastName(name)} turnover`,
      summary: `${bold(lastName(name))} was called for palming.`,
      body: `${bold(name)} was called for palming, also called carrying: letting the ball rest in the hand while dribbling. It is a turnover.${ball}`,
      dot: "turnover",
      players: unique([name]),
      detail: { detail: "palming" },
    };
  }
  if (parsed.turnoverDetail === "double-dribble" && name) {
    return {
      ruleId: "turnover",
      title: "Double dribble",
      chip: `${lastName(name)} turnover`,
      summary: `${bold(lastName(name))} double dribbled.`,
      body: `${bold(name)} was called for a double dribble: dribbling, stopping, then dribbling again. It is a turnover.${ball}`,
      dot: "turnover",
      players: unique([name]),
      detail: { detail: "double-dribble" },
    };
  }
  if (parsed.turnoverDetail === "out-of-bounds" && name) {
    return {
      ruleId: "turnover",
      title: "Out of bounds",
      chip: `${lastName(name)} turnover`,
      summary: `${bold(lastName(name))} turned it over out of bounds.`,
      body: `${bold(name)} sent the ball out of bounds, or stepped out with it. That is a turnover.${ball}`,
      dot: "turnover",
      players: unique([name]),
      detail: { detail: "out-of-bounds" },
    };
  }
  if (parsed.turnoverDetail === "offensive-foul" && name) {
    return {
      ruleId: "turnover",
      title: "Turnover",
      chip: `${lastName(name)} turnover`,
      summary: `${bold(lastName(name))}'s offensive foul is a turnover.`,
      body: `The offensive foul on ${bold(name)} is also a turnover. No shot, and the other team gets the ball.`,
      dot: "turnover",
      players: unique([name]),
      detail: { detail: "offensive-foul" },
    };
  }
  const who = name ? bold(name) : "The offense";
  const chip = name ? `${lastName(name)} turnover` : "Turnover";
  const how =
    parsed.turnoverDetail === "bad-pass"
      ? " on a bad pass"
      : parsed.turnoverDetail === "lost-ball"
        ? " after losing the ball"
        : "";
  return {
    ruleId: "turnover",
    title: "Turnover",
    chip,
    summary: name
      ? `${bold(lastName(name))} turned the ball over.`
      : "Turnover.",
    body: `${who} turned the ball over${how}. A turnover means the offense gives the ball away without a shot.${ball}`,
    dot: "turnover",
    players: unique([name]),
    detail: { detail: parsed.turnoverDetail ?? "other" },
  };
}

function describeTravel(parsed: ParsedPlay): Draft {
  const name = parsed.primary ?? "A player";
  return {
    ruleId: "travel",
    title: "Traveling",
    chip: `${lastName(name)} travel`,
    summary: `${bold(lastName(name))} was called for traveling.`,
    body: `${bold(name)} was called for traveling. That means moving with the ball without dribbling, past what the rules allow. Once the dribble stops, extra steps are a turnover, and the other team gets the ball.`,
    dot: "turnover",
    players: unique([parsed.primary]),
    detail: {},
  };
}

function describeShotClock(team: Team | undefined): Draft {
  const who = team ? `The ${team.shortName}` : "The offense";
  return {
    ruleId: "shot-clock",
    title: "Shot-clock violation",
    chip: "Shot clock",
    summary: `${team ? bold(team.shortName) : "The offense"} didn't shoot in time.`,
    body: `${who} did not get a shot up before the shot clock hit zero. The offense has 24 seconds to take a shot that hits the rim. This is a turnover, so the other team gets the ball.`,
    dot: "turnover",
    players: [],
    detail: { seconds: 24 },
  };
}

function describeRebound(
  parsed: ParsedPlay,
  home: Team,
  away: Team,
  team: Team | undefined,
): Draft {
  const side = parsed.reboundSide ?? "defensive";
  const owner = team ?? teamByLabel(parsed.teamLabel, home, away);
  if (parsed.teamRebound) {
    const label = owner?.shortName ?? parsed.teamLabel ?? "The team";
    return {
      ruleId: "rebound",
      title: "Rebound",
      chip: `${label} rebound`,
      summary: `${bold(label)} grabbed the ${side} rebound.`,
      body: `The ${label} were credited with ${article(side)} ${side} team rebound. No single player controlled the ball, but the possession counts for them. ${side === "offensive" ? "An offensive rebound means the same team keeps the ball after a miss." : "A defensive rebound means the other team missed, and this team can bring the ball up."}`,
      dot: "rebound",
      players: [],
      detail: { side, teamRebound: true },
    };
  }
  const name = parsed.primary ?? "A player";
  const keep =
    side === "offensive"
      ? `${name}'s team missed, and they got the ball back for another shot.`
      : "The other team missed, and this team now has the ball.";
  return {
    ruleId: "rebound",
    title: side === "offensive" ? "Offensive rebound" : "Defensive rebound",
    chip: `${lastName(name)} rebound`,
    summary: `${bold(lastName(name))} grabbed the ${side} rebound.`,
    body: `${bold(name)} grabbed the ${side} rebound. A rebound is securing the ball after a missed shot. ${keep}`,
    dot: "rebound",
    players: unique([parsed.primary]),
    detail: { side },
  };
}

function describeTimeout(parsed: ParsedPlay, team: Team | undefined): Draft {
  const label = team?.shortName ?? parsed.teamLabel ?? "A team";
  const kind = parsed.timeoutKind === "full" ? "full timeout" : parsed.timeoutKind === "short" || parsed.timeoutKind?.includes("20") ? "short timeout" : "timeout";
  return {
    ruleId: "timeout",
    title: "Timeout",
    chip: `${label} timeout`,
    summary: `${bold(label)} called a timeout.`,
    body: `The ${label} called a ${kind}. The clock stops and the coach can talk to the players. Teams have a limited number of timeouts, so calling one here spends one of them.`,
    dot: "timeout",
    players: [],
    detail: { ...(parsed.timeoutKind ? { timeoutKind: parsed.timeoutKind } : {}) },
  };
}

function describeSub(parsed: ParsedPlay): Draft {
  const incoming = parsed.primary ?? "A player";
  const outgoing = parsed.secondary ?? "a teammate";
  return {
    ruleId: "substitution",
    title: "Substitution",
    chip: `${lastName(incoming)} in`,
    summary: `${bold(lastName(incoming))} comes in for ${bold(lastName(outgoing))}.`,
    body: `${bold(incoming)} enters for ${bold(outgoing)}. A substitution swaps one player for a teammate during a stoppage. Coaches do it to rest players or change the matchup.`,
    dot: "neutral",
    players: unique([parsed.primary, parsed.secondary]),
    detail: {},
  };
}

function describeJump(parsed: ParsedPlay): Draft {
  const a = parsed.primary ?? "one player";
  const b = parsed.secondary ?? "another player";
  const c = parsed.tertiary;
  return {
    ruleId: "jump-ball",
    title: "Jump ball",
    chip: "Jump ball",
    summary: c
      ? `${bold(lastName(c))} got the jump ball.`
      : "Jump ball.",
    body: c
      ? `${bold(a)} and ${bold(b)} jumped for the ball, and ${bold(c)} came away with it. A jump ball starts the game, and it is also used when two players hold the ball at the same time.`
      : `${bold(a)} and ${bold(b)} jumped for the ball. A jump ball starts the game, and it is also used when two players hold the ball at the same time.`,
    dot: "neutral",
    players: unique([parsed.primary, parsed.secondary, parsed.tertiary]),
    detail: {},
  };
}

function describeGoaltend(parsed: ParsedPlay): Draft {
  const name = parsed.primary ?? "A player";
  const defensive = parsed.goaltendSide !== "offensive";
  return {
    ruleId: "goaltending",
    title: "Goaltending",
    chip: `${lastName(name)} goaltend`,
    summary: `${bold(lastName(name))} was called for goaltending.`,
    body: defensive
      ? `${bold(name)} was called for defensive goaltending. A defender cannot touch the ball when it is on the way down toward the basket, or while it is on the rim. By rule, the basket counts.`
      : `${bold(name)} was called for offensive goaltending. An offensive player touched the ball in the cylinder above the rim. By rule, the basket is waved off.`,
    dot: "neutral",
    players: unique([parsed.primary]),
    detail: { side: parsed.goaltendSide ?? "defensive" },
  };
}

function describeViolation(parsed: ParsedPlay): Draft {
  const name = parsed.primary;
  if (parsed.violationKind === "kicked-ball") {
    return {
      ruleId: "kicked-ball",
      title: "Kicked ball",
      chip: name ? `${lastName(name)} kick` : "Kicked ball",
      summary: name
        ? `${bold(lastName(name))} kicked the ball.`
        : "Kicked ball.",
      body: `${name ? bold(name) : "A player"} kicked the ball on purpose. Intentionally kicking the ball is a violation, and the other team gets possession.`,
      dot: "turnover",
      players: unique([name]),
      detail: { violation: "kicked-ball" },
    };
  }
  if (parsed.violationKind === "lane") {
    return {
      ruleId: "lane-violation",
      title: "Lane violation",
      chip: "Lane violation",
      summary: name
        ? `Lane violation on ${bold(lastName(name))}.`
        : "Lane violation.",
      body: `${name ? `${bold(name)} committed a lane violation` : "A lane violation"} on a free throw. Players have to stay outside the lane until the ball hits the rim. If the shooter steps in early, the free throw does not count.`,
      dot: "neutral",
      players: unique([name]),
      detail: { violation: "lane" },
    };
  }
  return {
    ruleId: "violation",
    title: "Violation",
    chip: "Violation",
    summary: "Violation.",
    body: "The feed called a violation. A violation is an illegal play that is not a foul. The usual result is that the other team gets the ball.",
    dot: "turnover",
    players: [],
    detail: { violation: "other" },
  };
}

function describeChallenge(parsed: ParsedPlay, team: Team | undefined): Draft {
  const label = team?.shortName ?? parsed.teamLabel ?? "A team";
  const result = parsed.challengeResult;
  const outcome =
    result === "overturned"
      ? "The referees overturned the call, so the team keeps its timeout."
      : result === "stands"
        ? "The call stands, so the team is charged a timeout."
        : "The referees look at the replay. If the call stands, the team loses a timeout. If it is overturned, they keep it.";
  return {
    ruleId: "challenge",
    title: "Coach's challenge",
    chip: `${label} challenge`,
    summary: `${bold(label)} challenged the call.`,
    body: `The ${label} challenged the call. A coach can ask the referees to review a play. ${outcome}`,
    dot: "timeout",
    players: [],
    detail: { ...(result ? { result } : {}) },
  };
}

function describeEndPeriod(play: FeedPlay, home: Team, away: Team): Draft {
  const tied = play.awayScore === play.homeScore;
  const leader = play.awayScore > play.homeScore ? away : home;
  let extra = "Teams switch ends of the court each quarter.";
  if (play.period === 2) extra = "This break is halftime, longer than the gap between other quarters. Teams switch ends each quarter.";
  if (play.period === 4 && tied) extra = "The score is tied, so they play a 5-minute overtime.";
  if (play.period === 4 && !tied) extra = `${leader.location} wins. Each quarter is 12 minutes, and the game is over when the 4th ends with a leader.`;
  if (play.period > 4 && tied) extra = "Still tied, so they play another 5-minute overtime.";
  if (play.period > 4 && !tied) extra = `${leader.location} wins.`;
  return {
    ruleId: "end-of-period",
    title: play.period === 2 ? "Halftime" : "End of period",
    chip: play.period >= 4 && !tied ? "End of game" : `End of ${quarterHeadline(play.period)}`,
    summary:
      play.period === 2
        ? "Halftime."
        : `End of ${quarterHeadline(play.period)}.`,
    body: `The clock hit zero on ${periodName(play.period)}. ${extra}`,
    dot: "end",
    players: [],
    detail: { period: play.period },
  };
}

function describeEndGame(play: FeedPlay, home: Team, away: Team): Draft {
  const tied = play.awayScore === play.homeScore;
  const leader = play.awayScore > play.homeScore ? away : home;
  const hi = Math.max(play.awayScore, play.homeScore);
  const lo = Math.min(play.awayScore, play.homeScore);
  return {
    ruleId: "end-of-period",
    title: "End of game",
    chip: "End of game",
    summary: tied ? "The game is over, tied." : `${bold(leader.shortName)} win, ${hi}–${lo}.`,
    body: tied
      ? "That's the horn. The game is over, and the score is tied."
      : `That's the horn. The game is over, and the ${leader.shortName} win, ${hi}–${lo}.`,
    dot: "end",
    players: [],
    detail: { final: true },
  };
}

function buildMoment(
  play: FeedPlay,
  parsed: ParsedPlay,
  siblings: FeedPlay[],
  home: Team,
  away: Team,
  acc: Acc,
): Moment {
  const shot = siblingShot(siblings, home, away);
  const observed = observedFreeThrows(siblings);
  const foulerTeam = teamById(play.teamId, home, away);
  const andOne =
    (parsed.kind === "shot" &&
      parsed.made === true &&
      (parsed.points === 2 || parsed.points === 3) &&
      siblings.some((sibling) => parsePlay(sibling).kind === "shooting-foul")) ||
    (parsed.kind === "shooting-foul" && shot.made === true) ||
    (parsed.kind === "free-throw" &&
      parsed.ftTotal === 1 &&
      !parsed.technicalFreeThrow &&
      shot.made === true &&
      siblings.some((sibling) => parsePlay(sibling).kind === "shooting-foul"));

  let ftCount: number | undefined;
  if (parsed.kind === "shooting-foul") {
    if (andOne) ftCount = 1;
    else if (observed) ftCount = observed;
    else if (shot.points === 3) ftCount = 3;
    else if (shot.points === 2) ftCount = 2;
  } else if (parsed.kind === "take-foul") {
    ftCount = observed ?? 1;
  } else if (parsed.kind === "personal-foul" || parsed.kind === "loose-ball-foul") {
    ftCount = observed;
  }

  const shooter =
    parsed.kind === "shot" || parsed.kind === "free-throw" || parsed.kind === "block"
      ? parsed.kind === "block"
        ? parsed.secondary
        : parsed.primary
      : shot.name;
  const shooterTeam =
    parsed.kind === "shot"
      ? teamById(play.teamId, home, away)
      : shot.team ?? (foulerTeam ? otherTeam(foulerTeam, home, away) : undefined);

  let playerFoulCount: number | undefined;
  let teamFoulCount: number | undefined;
  const counts = isTeamFoul(parsed);
  if (PLAYER_FOULS.has(parsed.kind) && parsed.primary && !/^coach\b/i.test(parsed.primary)) {
    playerFoulCount = (acc.playerFouls.get(parsed.primary.toLowerCase()) ?? 0) + 1;
  }
  if (counts && play.teamId && teamById(play.teamId, home, away)) {
    const row = acc.teamPeriod.get(play.teamId);
    const before = row && row.period === play.period ? row.count : 0;
    teamFoulCount = before + 1;
  }

  const timeoutTeam =
    parsed.kind === "timeout" || parsed.kind === "challenge"
      ? teamByLabel(parsed.teamLabel, home, away) ?? teamById(play.teamId, home, away)
      : undefined;

  return {
    andOne,
    shooter,
    shooterTeam,
    shotPoints: parsed.kind === "shot" ? (parsed.points === 3 ? 3 : 2) : shot.points,
    shotMade: parsed.kind === "shot" ? parsed.made : shot.made,
    shotLabel: parsed.kind === "shot" ? parsed.shotLabel : shot.label,
    ftCount,
    fouler: PLAYER_FOULS.has(parsed.kind) ? parsed.primary : undefined,
    foulerTeam: PLAYER_FOULS.has(parsed.kind) ? foulerTeam : undefined,
    playerFoulCount,
    teamFoulCount,
    countsAsTeamFoul: counts,
    timeoutTeam,
  };
}

function commit(acc: Acc, play: FeedPlay, parsed: ParsedPlay, moment: Moment) {
  if (moment.playerFoulCount && parsed.primary) {
    acc.playerFouls.set(parsed.primary.toLowerCase(), moment.playerFoulCount);
  }
  if (moment.countsAsTeamFoul && moment.teamFoulCount && play.teamId) {
    acc.teamPeriod.set(play.teamId, { period: play.period, count: moment.teamFoulCount });
  }
  const dAway = play.awayScore - acc.lastAway;
  const dHome = play.homeScore - acc.lastHome;
  if (dAway > 0 && dHome === 0) {
    acc.runPoints = acc.runSide === "away" ? acc.runPoints + dAway : dAway;
    acc.runSide = "away";
  } else if (dHome > 0 && dAway === 0) {
    acc.runPoints = acc.runSide === "home" ? acc.runPoints + dHome : dHome;
    acc.runSide = "home";
  }
  acc.lastAway = play.awayScore;
  acc.lastHome = play.homeScore;
}

function factsFor(
  play: FeedPlay,
  draft: Draft,
  why: string,
  home: Team,
  away: Team,
): ExplanationFacts {
  const rule = getRule(draft.ruleId);
  return {
    ruleId: draft.ruleId,
    ruleName: rule.name,
    ruleText: rule.lesson,
    period: play.period,
    clock: play.clock,
    homeScore: play.homeScore,
    awayScore: play.awayScore,
    players: draft.players,
    teams: unique([
      home.displayName,
      home.shortName,
      home.location,
      away.displayName,
      away.shortName,
      away.location,
    ]),
    abbreviations: [home.abbreviation, away.abbreviation],
    templateTitle: draft.title,
    templateBody: plain(draft.body),
    templateWhy: plain(why),
    detail: draft.detail,
  };
}

export function explainGame(game: GameLike): {
  explanations: Explanation[];
  timings: { playId: string; engineMs: number }[];
  /** Wall time for this whole update. Plays that arrive together share it. */
  batchMs: number;
} {
  const batchStarted = performance.now();
  const acc: Acc = {
    teamPeriod: new Map(),
    playerFouls: new Map(),
    lastAway: 0,
    lastHome: 0,
    runSide: null,
    runPoints: 0,
  };
  const explanations: Explanation[] = [];
  const timings: { playId: string; engineMs: number }[] = [];

  game.plays.forEach((play, index) => {
    const started = performance.now();
    const parsed = parsePlay(play);
    const siblings = sameMoment(game.plays, index);
    const moment = buildMoment(play, parsed, siblings, game.home, game.away, acc);
    const draft = describe(play, parsed, game, acc, moment);
    const why = whyItMatters(play, parsed, acc, game.home, game.away, moment);
    const rule = getRule(draft.ruleId);
    const explanation: Explanation = {
      playId: play.id,
      ruleId: draft.ruleId,
      ruleName: rule.name,
      title: draft.title,
      chip: draft.chip,
      summary: draft.summary,
      clockLabel: clockLabel(play.period, play.clock),
      body: draft.body,
      whyItMatters: why,
      dot: draft.dot,
      facts: factsFor(play, draft, why, game.home, game.away),
    };
    const engineMs = performance.now() - started;
    explanations.push(explanation);
    timings.push({ playId: play.id, engineMs });
    commit(acc, play, parsed, moment);
  });

  return { explanations, timings, batchMs: performance.now() - batchStarted };
}

export function explainAt(game: GameLike, index: number): Explanation {
  return explainGame({
    home: game.home,
    away: game.away,
    plays: game.plays.slice(0, index + 1),
  }).explanations[index];
}
