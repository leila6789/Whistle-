"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Shell } from "@/components/shell";
import { DEMO_CARD } from "@/lib/demo-meta";
import { SCOREBOARD_POLL_MS } from "@/lib/config";
import { formatDay, formatTipTime } from "@/lib/clock";
import { paint } from "@/lib/teams";
import type { GameCard, Scoreboard } from "@/lib/types";

export function GamesBoard() {
  const [board, setBoard] = useState<Scoreboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    async function load() {
      try {
        const response = await fetch("/api/scoreboard", { cache: "no-store" });
        const data = (await response.json()) as Scoreboard & { error?: string };
        if (!response.ok) throw new Error(data.error || "The NBA feed didn't respond.");
        if (!cancelled) {
          setBoard(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load today's games.");
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) timer = window.setTimeout(load, SCOREBOARD_POLL_MS);
      }
    }
    load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const games = board?.games ?? [];
  const today = formatDay(games[0]?.startTime);
  const live = games.some((game) => game.status === "in");
  const nextTip = games.find((game) => game.status === "pre");

  return (
    <Shell>
      <div className="pt-5">
        <p className="font-display text-sm uppercase tracking-[0.16em]">NBA, in plain English</p>
        <h1 className="font-display mt-1 text-5xl font-semibold uppercase leading-none tracking-wide">
          What just happened?
        </h1>
        <p className="mt-3 max-w-xl text-[16px] leading-6">
          For when the broadcast loses you. Open a game, tap the button, get the rule in plain words.
        </p>
        <p className="mt-4 font-display text-sm uppercase tracking-wide text-[#1c140c]/70">
          {today || "Today"}
          {board?.seasonLabel ? ` · ${board.seasonLabel}` : ""}
        </p>
        {!loading && board && !live && nextTip ? (
          <p className="mt-1 text-sm">Nothing live yet. Tip-off’s at {formatTipTime(nextTip.startTime)}.</p>
        ) : null}
      </div>

      <div className="paper mt-5 border border-[#1c140c]">
        {loading && !board ? (
          <div className="space-y-px">
            <div className="h-20 animate-pulse bg-[#1c140c]/8" />
            <div className="h-20 animate-pulse bg-[#1c140c]/8" />
          </div>
        ) : null}
        {error && !board ? (
          <div className="px-4 py-5">
            <p className="font-display text-xl uppercase">Scoreboard didn’t load.</p>
            <p className="mt-1 text-sm">{error} The replay below still works.</p>
          </div>
        ) : null}
        {!loading && board && games.length === 0 ? (
          <p className="px-4 py-6 text-sm leading-6">
            Nothing on the schedule today. The replay below is a real game, if you want to try the button.
          </p>
        ) : null}
        {games.length > 0 ? (
          <Link href={DEMO_CARD.href} className="flex items-baseline justify-between gap-3 border-b border-[#1c140c] px-4 py-3">
            <div className="min-w-0">
              <p className="font-display text-xs uppercase tracking-[0.14em] text-[#9a3412]">Replay, not live</p>
              <p className="truncate text-sm">
                {DEMO_CARD.away} at {DEMO_CARD.home}, {DEMO_CARD.when}. Final {DEMO_CARD.awayScore}–{DEMO_CARD.homeScore}.
              </p>
            </div>
            <p className="font-display shrink-0 text-sm uppercase tracking-wide">Watch</p>
          </Link>
        ) : null}
        <ul>
          {games.map((game) => (
            <li key={game.id} className="border-b border-[#1c140c]/15 last:border-b-0">
              <GameRow game={game} />
            </li>
          ))}
        </ul>
        {!loading && games.length === 0 ? (
          <Link href={DEMO_CARD.href} className="block border-t border-[#1c140c] px-4 py-4">
            <p className="font-display text-xs uppercase tracking-[0.14em] text-[#9a3412]">Replay, not live</p>
            <h2 className="font-display mt-1 text-3xl font-semibold uppercase leading-none">
              {DEMO_CARD.away} at {DEMO_CARD.home}
            </h2>
            <p className="mt-2 text-sm leading-6">
              {DEMO_CARD.when}, {DEMO_CARD.note}, {DEMO_CARD.venue}. Real {DEMO_CARD.source}, one play at a time. Final {DEMO_CARD.away} {DEMO_CARD.awayScore}, {DEMO_CARD.home} {DEMO_CARD.homeScore}.
            </p>
            <p className="font-display mt-3 text-sm uppercase tracking-wide">Watch the replay</p>
          </Link>
        ) : null}
      </div>

      {error && board ? (
        <p className="mt-3 text-xs text-[#9a3412]">Scoreboard refresh failed. Showing the last one that loaded.</p>
      ) : null}

      <footer className="mt-8 text-xs leading-5 text-[#1c140c]/60">
        Scores and plays come from the public ESPN NBA feed. Explanations are templates in this repo. Whistle is not affiliated with the NBA or ESPN.
      </footer>
    </Shell>
  );
}

function GameRow({ game }: { game: GameCard }) {
  const when = game.status === "in" ? "Live" : game.status === "pre" ? formatTipTime(game.startTime) : game.statusText;
  return (
    <Link href={`/game/${game.id}`} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 px-4 py-3">
      <p className="font-display text-xs uppercase leading-tight tracking-wide text-[#1c140c]/70">{when}</p>
      <div className="min-w-0">
        <p className="font-display truncate text-2xl font-semibold uppercase leading-none tracking-wide">
          <Abbr team={game.away} />
          {game.away.abbreviation}
          <span className="px-1.5 text-[0.65em] tracking-normal text-[#1c140c]/45"> at </span>
          <Abbr team={game.home} />
          {game.home.abbreviation}
        </p>
        <p className="mt-1 truncate text-xs text-[#1c140c]/65">
          {game.away.shortName} at {game.home.shortName}
          {game.venue ? ` · ${game.venue}` : ""}
          {game.broadcast ? ` · ${game.broadcast}` : ""}
        </p>
      </div>
      <p className="font-display text-right text-2xl font-semibold tabular-nums leading-none">
        {game.status === "pre" ? "" : (
          <>
            {game.awayScore}
            <span className="px-0.5 text-[#1c140c]/35">–</span>
            {game.homeScore}
          </>
        )}
      </p>
    </Link>
  );
}

function Abbr({ team }: { team: GameCard["home"] }) {
  return (
    <span className="mr-1.5 inline-block h-3 w-1 align-[-1px]" style={{ background: paint(team.color) }} aria-hidden />
  );
}
