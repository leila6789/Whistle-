"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Shell } from "@/components/shell";
import { DEMO_CARD } from "@/lib/demo-meta";
import { SCOREBOARD_POLL_MS } from "@/lib/config";
import { formatDay, formatTipTime } from "@/lib/clock";
import { textOn } from "@/lib/teams";
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

  return (
    <Shell>
      <div className="pt-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#ff9a3c]">NBA, IN PLAIN ENGLISH</p>
        <h1 className="mt-2 max-w-xl text-[2rem] font-semibold leading-tight tracking-tight">
          What just happened?
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-6 text-white/60">
          A live companion for people who do not know the rules yet. Open a game, and when the broadcast loses you, tap one button.
        </p>
        <p className="mt-4 text-sm text-white/45">
          {today || "Today"}
          {board?.seasonLabel ? ` · ${board.seasonLabel}` : ""}
        </p>
      </div>

      {games.length > 0 ? <ReplayStrip /> : null}

      <div className="mt-4 space-y-3">
        {loading && !board ? (
          <>
            <div className="h-28 animate-pulse rounded-3xl bg-white/5" />
            <div className="h-28 animate-pulse rounded-3xl bg-white/5" />
          </>
        ) : null}
        {error && !board ? (
          <div className="rounded-3xl border border-white/10 bg-[#141820] px-4 py-5">
            <p className="font-medium">The scoreboard did not load.</p>
            <p className="mt-1 text-sm text-white/55">{error} The replay below still works.</p>
          </div>
        ) : null}
        {!loading && board && games.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 px-4 py-6 text-sm leading-6 text-white/55">
            No NBA games on the schedule today. The replay is a full real game, so you can still try the button.
          </div>
        ) : null}
        {games.map((game) => (
          <GameRow key={game.id} game={game} />
        ))}
      </div>

      {!loading && games.length === 0 ? <ReplayCard featured /> : null}

      {error && board ? (
        <p className="mt-3 text-xs text-[#ffb089]">Scoreboard refresh failed. Showing the last one that loaded.</p>
      ) : null}

      <footer className="mt-10 text-xs leading-5 text-white/35">
        Scores and plays come from the public ESPN NBA feed. Explanations are templates in this repo. Whistle is not affiliated with the NBA or ESPN.
      </footer>
    </Shell>
  );
}

function GameRow({ game }: { game: GameCard }) {
  return (
    <Link
      href={`/game/${game.id}`}
      className="block rounded-3xl border border-white/8 bg-[#141820] px-4 py-4 transition hover:border-white/20"
    >
      <div className="flex items-center justify-between text-xs">
        {game.status === "in" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e23b3b] px-2 py-0.5 font-bold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            LIVE
          </span>
        ) : (
          <span className="text-white/50">{game.status === "pre" ? formatTipTime(game.startTime) : game.statusText}</span>
        )}
        <span className="text-white/35">{game.broadcast}</span>
      </div>
      <div className="mt-3 space-y-2">
        <Side game={game} side="away" />
        <Side game={game} side="home" />
      </div>
      <p className="mt-3 truncate text-xs text-white/40">
        {game.venue}
        {game.status === "in" ? ` · ${game.statusText}` : ""}
      </p>
    </Link>
  );
}

function Side({ game, side }: { game: GameCard; side: "home" | "away" }) {
  const team = side === "home" ? game.home : game.away;
  const score = side === "home" ? game.homeScore : game.awayScore;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ backgroundColor: `#${team.color}`, color: textOn(team.color) }}
        >
          {team.abbreviation}
        </span>
        <span className="text-[15px] font-medium">{team.displayName}</span>
      </div>
      <span className="text-xl font-semibold tabular-nums">{game.status === "pre" ? "" : score}</span>
    </div>
  );
}

function ReplayStrip() {
  return (
    <Link
      href={DEMO_CARD.href}
      className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#ff7a1a]/40 bg-[#24180f] px-4 py-3"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ff9a3c]">REPLAY A REAL GAME</p>
        <p className="truncate text-sm text-[#ffd7bf]">
          {DEMO_CARD.away} at {DEMO_CARD.home} · {DEMO_CARD.when} · final {DEMO_CARD.awayScore}–{DEMO_CARD.homeScore}
        </p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-[#ff9a3c]">Watch</p>
    </Link>
  );
}

function ReplayCard({ featured = false }: { featured?: boolean }) {
  return (
    <Link
      href={DEMO_CARD.href}
      className={
        featured
          ? "mt-6 block rounded-[28px] border border-[#ff7a1a]/40 bg-gradient-to-br from-[#2a1a10] to-[#141820] px-5 py-5"
          : "block rounded-3xl border border-white/8 bg-[#141820] px-4 py-4"
      }
    >
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ff9a3c]">REPLAY A REAL GAME</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">
        {DEMO_CARD.away} at {DEMO_CARD.home}
      </h2>
      <p className="mt-1 text-sm text-white/55">
        {DEMO_CARD.when} · {DEMO_CARD.note} · {DEMO_CARD.venue}
      </p>
      <p className="mt-3 max-w-lg text-sm leading-6 text-white/75">
        Nothing has to be live. This plays back the real {DEMO_CARD.source}, one play at a time, final {DEMO_CARD.away} {DEMO_CARD.awayScore}, {DEMO_CARD.home} {DEMO_CARD.homeScore}.
      </p>
      <p className="mt-4 text-sm font-semibold text-[#ff9a3c]">Watch the replay</p>
    </Link>
  );
}
