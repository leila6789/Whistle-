export const RULES = [
  {
    id: "shooting-foul",
    name: "Shooting fouls",
    lesson:
      "A shooting foul is illegal contact on a player who is in the act of shooting. If the shot misses, they shoot 2 free throws, or 3 if it was a three-pointer. If the shot goes in, they keep the points and shoot 1 more.",
  },
  {
    id: "and-one",
    name: "And-ones",
    lesson:
      "An and-one is a made basket plus the foul. The points count, and the shooter gets 1 free throw.",
  },
  {
    id: "personal-foul",
    name: "Personal fouls",
    lesson:
      "A personal foul is illegal contact that is not on a shot. A team can commit 4 fouls in a quarter. Starting with team foul 5, the other team shoots 2 free throws. That is the bonus. A player fouls out on foul 6.",
  },
  {
    id: "take-foul",
    name: "Take fouls",
    lesson:
      "A take foul is grabbing a player away from the ball to stop a fast break. The penalty is 1 free throw, and the fouled team keeps the ball.",
  },
  {
    id: "offensive-foul",
    name: "Offensive fouls",
    lesson:
      "An offensive foul is illegal contact by the offense, such as charging into a defender who is set. No free throws. It is a turnover. It counts on that player's fouls, but not toward the team bonus.",
  },
  {
    id: "loose-ball-foul",
    name: "Loose-ball fouls",
    lesson:
      "A loose-ball foul is illegal contact while players chase a ball nobody controls. It counts as a team foul. In the bonus, that means 2 free throws.",
  },
  {
    id: "technical",
    name: "Technical fouls",
    lesson:
      "A technical foul is for conduct, not for contact during a play. The other team shoots 1 free throw, then play continues. Two technicals and a player is ejected.",
  },
  {
    id: "flagrant",
    name: "Flagrant fouls",
    lesson:
      "A flagrant foul is unnecessary or excessive contact. The other team shoots 2 free throws and keeps the ball. A flagrant 2 ejects the player. A flagrant 1 does not.",
  },
  {
    id: "free-throw",
    name: "Free throws",
    lesson:
      "A free throw is an uncontested shot from 15 feet, worth 1 point.",
  },
  {
    id: "two-pointer",
    name: "Two-pointers",
    lesson:
      "A shot from inside the three-point line is worth 2 points. Layups, dunks, and most jumpers are two-pointers.",
  },
  {
    id: "three-pointer",
    name: "Three-pointers",
    lesson:
      "A shot from behind the three-point line is worth 3 points. The NBA line is 23 feet 9 inches from the basket, and a little closer in the corners.",
  },
  {
    id: "missed-shot",
    name: "Missed shots",
    lesson:
      "A missed shot is worth nothing. Either team can grab the rebound.",
  },
  {
    id: "block",
    name: "Blocks",
    lesson:
      "A block is when a defender tips the ball as the shooter releases it. The shot does not count, and the ball is live.",
  },
  {
    id: "turnover",
    name: "Turnovers",
    lesson:
      "A turnover is when the offense gives the ball away without a shot. The other team takes possession.",
  },
  {
    id: "steal",
    name: "Steals",
    lesson:
      "A steal is when a defender takes the ball from the offense. It is a turnover for the team that lost it.",
  },
  {
    id: "travel",
    name: "Traveling",
    lesson:
      "Traveling is moving with the ball without dribbling, past what the rules allow. Once a player stops dribbling, extra steps are a turnover. The other team gets the ball.",
  },
  {
    id: "shot-clock",
    name: "Shot clock",
    lesson:
      "The offense has 24 seconds to take a shot that hits the rim. If the shot clock hits zero, it is a turnover.",
  },
  {
    id: "rebound",
    name: "Rebounds",
    lesson:
      "A rebound is grabbing the ball after a missed shot. An offensive rebound keeps the possession. A defensive rebound starts a new one for the other team.",
  },
  {
    id: "timeout",
    name: "Timeouts",
    lesson:
      "A timeout stops the clock so a coach can talk to the players. Teams have a limited number. Late in a close game, a timeout is how a team draws up a play or stops a run.",
  },
  {
    id: "substitution",
    name: "Substitutions",
    lesson:
      "A substitution swaps one player for a teammate. It happens during a stoppage. Coaches use it to rest players or change a matchup.",
  },
  {
    id: "jump-ball",
    name: "Jump balls",
    lesson:
      "A jump ball starts the game: the referee tosses the ball between two players. It is also used when two players hold the ball at the same time.",
  },
  {
    id: "goaltending",
    name: "Goaltending",
    lesson:
      "Goaltending is touching the ball when it is on its way down into the basket, or when it is on the rim. On defense, the basket counts. On offense, the basket is waved off.",
  },
  {
    id: "violation",
    name: "Violations",
    lesson:
      "A violation is an illegal play that is not a foul. Depending on the call, the other team may get the ball, or a free throw may be taken again.",
  },
  {
    id: "kicked-ball",
    name: "Kicked ball",
    lesson:
      "Intentionally kicking the ball is a violation. The other team gets possession.",
  },
  {
    id: "lane-violation",
    name: "Lane violations",
    lesson:
      "On a free throw, players have to stay outside the lane until the ball hits the rim. If the shooter steps in early, the free throw does not count.",
  },
  {
    id: "defensive-three-seconds",
    name: "Defensive 3 seconds",
    lesson:
      "A defender cannot stand in the paint for 3 seconds unless they are guarding an opponent. The penalty is a technical foul: 1 free throw for the other team.",
  },
  {
    id: "challenge",
    name: "Coach's challenge",
    lesson:
      "A coach can challenge a call and the referees review replay. If the call stands, the team loses a timeout. If it is overturned, they keep the timeout.",
  },
  {
    id: "end-of-period",
    name: "End of period",
    lesson:
      "Each quarter is 12 minutes. When the clock hits zero, the quarter is over. Teams switch ends every quarter. A tie after 4 quarters means a 5-minute overtime.",
  },
] as const;

export type RuleId = (typeof RULES)[number]["id"];

const BY_ID = new Map<string, (typeof RULES)[number]>(
  RULES.map((rule) => [rule.id, rule]),
);

export function getRule(id: string): (typeof RULES)[number] {
  const rule = BY_ID.get(id);
  if (!rule) {
    throw new Error(`Unknown rule: ${id}`);
  }
  return rule;
}
