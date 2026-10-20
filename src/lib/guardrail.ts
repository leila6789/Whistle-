import type { ExplanationFacts } from "@/lib/types";

/**
 * Words a rephrase is allowed to capitalize even though they are not player
 * or team names. Anything else with a capital letter has to come from the facts.
 */
const ALLOWED_WORDS = new Set([
  "A",
  "An",
  "The",
  "If",
  "That",
  "This",
  "It",
  "Its",
  "They",
  "Their",
  "Them",
  "Both",
  "No",
  "Not",
  "Each",
  "When",
  "After",
  "Before",
  "During",
  "Overtime",
  "Quarter",
  "Free",
  "Throw",
  "Throws",
  "NBA",
  "OT",
  "And",
  "But",
  "So",
  "Because",
  "Then",
  "With",
  "For",
  "At",
  "By",
  "Of",
  "To",
  "From",
  "Or",
  "On",
  "In",
  "Into",
  "Out",
  "Up",
  "Down",
  "There",
  "Here",
  "Now",
  "Just",
  "Still",
  "Only",
  "Also",
  "Than",
  "Off",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "Jr",
  "Sr",
  "II",
  "III",
  "IV",
  "Coach",
  "End",
  "Final",
  "Halftime",
  "Bonus",
  "Team",
  "Full",
  "Once",
  "Two",
  "One",
  "Three",
  "Four",
  "Five",
  "Six",
]);

export type AllowList = {
  numbers: Set<string>;
  tokens: Set<string>;
};

export function allowListFromFacts(facts: ExplanationFacts): AllowList {
  const blob = [
    JSON.stringify(facts.detail),
    facts.ruleText,
    facts.templateTitle,
    facts.templateBody,
    facts.templateWhy,
    facts.ruleName,
    String(facts.period),
    facts.clock,
    String(facts.homeScore),
    String(facts.awayScore),
    ...facts.players,
    ...facts.teams,
    ...facts.abbreviations,
  ].join(" ");

  const numbers = new Set(blob.match(/\d+(?:\.\d+)?/g) ?? []);
  const tokens = new Set<string>();
  const add = (value: string) => {
    for (const part of value.split(/[\s-]+/)) {
      const cleaned = part.replace(/[.'’]/g, "");
      if (cleaned) tokens.add(cleaned);
    }
  };
  for (const name of facts.players) add(name);
  for (const team of facts.teams) add(team);
  for (const abbr of facts.abbreviations) add(abbr);
  add(facts.ruleName);
  add(facts.templateTitle);
  for (const match of blob.matchAll(/\b[A-Z][A-Za-z0-9'’.-]*/g)) {
    tokens.add(match[0].replace(/[.'’]/g, ""));
  }
  return { numbers, tokens };
}

export type GuardResult = { ok: true } | { ok: false; reason: string };

/**
 * Reject a rephrase that adds a number or a capitalized name the feed facts
 * do not contain, or that hedges with a guess.
 */
export function validateRephrase(text: string, allowed: AllowList): GuardResult {
  if (/\b(probably|i think|might have|reportedly|apparently|maybe|perhaps)\b/i.test(text)) {
    return { ok: false, reason: "speculative language" };
  }
  const numbers = text.match(/\d+(?:\.\d+)?/g) ?? [];
  for (const number of numbers) {
    if (!allowed.numbers.has(number)) {
      return { ok: false, reason: `number ${number} is not in the feed facts` };
    }
  }
  const caps = text.match(/\b[A-Z][A-Za-z0-9'’.-]*/g) ?? [];
  for (const raw of caps) {
    const word = raw.replace(/[.'’]/g, "");
    if (ALLOWED_WORDS.has(word) || allowed.tokens.has(word) || allowed.tokens.has(raw)) {
      continue;
    }
    return { ok: false, reason: `name ${raw} is not in the feed facts` };
  }
  return { ok: true };
}
