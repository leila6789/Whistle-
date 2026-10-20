"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, MoreHorizontal } from "lucide-react";

import { ExplainCard } from "@/components/explain-card";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { usePlaySession } from "@/components/use-play-session";
import { prettyClock } from "@/lib/clock";
import { leadLine, textOn } from "@/lib/teams";
import type { Explanation, GamePayload, Team } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOT: Record<Explanation["dot"], string> = {
  make: "bg-[#3ddc97]",
  miss: "bg-white/35",
  foul: "bg-[#ff7a1a]",
  turnover: "bg-[#ff5d73]",
  timeout: "bg-[#79a6ff]",
  rebound: "bg-white/70",
  neutral: "bg-white/30",
  end: "bg-white/80",
};

function TeamBadge({ team }: { team: Team }) {
  return (
    <span
      className="flex h-12 w-12 items-center justify-center rounded-full text-[13px] font-bold tracking-wide"
      style={{ backgroundColor: `#${team.color}`, color: textOn(team.color) }}
    >
      {team.abbreviation}
    </span>
  );
}

function StatusPill({ game }: { game: GamePayload }) {
  if (game.demo && game.status !== "post") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff6a00] px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        REPLAY
      </span>
    );
  }
  if (game.status === "in" && game.statusText !== "Halftime") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e23b3b] px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        LIVE
      </span>
    );
  }
  if (game.statusText === "Halftime") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#f5c451] px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#2a2110]">
        HALFTIME
      </span>
    );
  }
  if (game.status === "post") {
    return (
      <span className="inline-flex items-center rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white/80">
        {game.demo ? "REPLAY FINAL" : game.statusText.toUpperCase()}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white/70">
      PREGAME
    </span>
  );
}

function subline(game: GamePayload): string {
  if (game.status === "pre") return "Not started";
  if (game.status === "post") {
    if (game.awayScore === game.homeScore) return "Final, tied";
    const winner = game.awayScore > game.homeScore ? game.away : game.home;
    return `${winner.shortName} win by ${Math.abs(game.awayScore - game.homeScore)}`;
  }
  if (game.statusText === "Halftime") return "Halftime";
  return leadLine(game.awayScore, game.homeScore, game.away, game.home);
}

export function Court({
  game,
  banner,
  notice,
}: {
  game: GamePayload;
  banner?: React.ReactNode;
  notice?: React.ReactNode;
}) {
  const session = usePlaySession(game);
  const { sheetOpen, setSheetOpen } = session;
  const [showAll, setShowAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const newest = [...session.explanations].reverse();
  const visible = showAll ? newest : newest.slice(0, 8);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen, setSheetOpen]);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-6xl flex-col lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,460px)] lg:justify-center lg:gap-8 lg:px-6">
      <section className="flex min-h-0 flex-1 flex-col lg:py-4">
        <header className="flex h-14 items-center gap-2 px-3">
          <Link
            href="/"
            aria-label="All games"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6 text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-center text-[15px] font-semibold tracking-tight">
            {game.away.shortName} vs {game.home.shortName}
          </h1>
          <div className="relative">
            <button
              type="button"
              aria-label="More"
              aria-expanded={menuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-44 rounded-2xl border border-white/10 bg-[#1c2230] p-1 shadow-xl">
                <Link href="/learn" className="block rounded-xl px-3 py-2 text-sm hover:bg-white/6" onClick={() => setMenuOpen(false)}>
                  Rules learned
                </Link>
                <Link href="/stats" className="block rounded-xl px-3 py-2 text-sm hover:bg-white/6" onClick={() => setMenuOpen(false)}>
                  Stats
                </Link>
              </div>
            ) : null}
          </div>
        </header>

        <div className="px-4">
          <div className="rounded-[28px] border border-white/8 bg-[#141820] px-4 py-4">
            <div className="flex items-center justify-between">
              <StatusPill game={game} />
              <p className="text-sm text-white/55">{game.status === "pre" ? game.statusDetail || "Scheduled" : game.statusText}</p>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <TeamBlock team={game.away} score={game.awayScore} align="left" hideScore={game.status === "pre"} />
              <span className="text-2xl font-light text-white/25">–</span>
              <TeamBlock team={game.home} score={game.homeScore} align="right" hideScore={game.status === "pre"} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-sm text-white/55">
              <span>{subline(game)}</span>
              <span className="truncate pl-3 text-right">{game.venue}</span>
            </div>
          </div>
          {banner}
          {notice}
        </div>

        <div className="mt-5 flex items-baseline justify-between px-4">
          <h2 className="text-base font-semibold">Recent plays</h2>
          <p className="text-xs text-white/40">Newest first</p>
        </div>

        <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-2">
          {game.statusText === "Halftime" ? (
            <p className="pb-1 text-center text-sm text-white/45">Halftime. The last plays of the half are below.</p>
          ) : null}
          {visible.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 px-4 py-10 text-center text-sm leading-6 text-white/50">
              {game.status === "pre"
                ? "Tipoff has not happened yet. Plays will show up here once the ball goes up."
                : "No plays in the feed yet."}
            </div>
          ) : (
            visible.map((explanation) => {
              const play = game.plays.find((item) => item.id === explanation.playId);
              const active = explanation.playId === session.selected?.playId;
              return (
                <button
                  key={explanation.playId}
                  type="button"
                  onClick={() => session.choose(explanation.playId)}
                  className={cn(
                    "flex w-full gap-3 rounded-2xl border bg-[#141820] px-3.5 py-3 text-left",
                    active ? "border-[#ff7a1a]/70" : "border-white/6",
                  )}
                >
                  <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-white/40">
                    {play ? prettyClock(play.clock) : explanation.clockLabel}
                  </span>
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[explanation.dot])} />
                  <RichText text={explanation.summary} className="text-[15px] leading-5 text-white/85" />
                </button>
              );
            })
          )}
          {newest.length > 8 ? (
            <button
              type="button"
              className="w-full py-2 text-center text-sm text-white/50 hover:text-white"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? "Show fewer plays" : `Show earlier plays (${newest.length - 8} more)`}
            </button>
          ) : null}
        </div>

        <div className="bg-gradient-to-t from-[#090a0d] via-[#090a0d] to-transparent px-4 pb-4 pt-3">
          <Button
            variant="orange"
            size="lg"
            className="w-full"
            disabled={session.explanations.length === 0}
            onClick={session.ask}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-sm">?</span>
            {session.explanations.length === 0 ? "Waiting for the first play" : "What just happened?"}
          </Button>
          <p className="mt-2 text-center text-xs text-white/40">Tap anytime for a plain-English explanation</p>
        </div>
      </section>

      <aside className="hidden min-h-0 lg:block lg:py-4">
        <div className="flex h-full max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto rounded-[28px] border border-white/10 bg-[#1c202b] p-5">
          {session.selected ? (
            <ExplainCard
              selected={session.selected}
              chips={session.chips}
              isNewRule={session.isNewRule}
              vote={session.vote}
              rephrase={session.rephrase}
              onChoose={session.choose}
              onVote={session.voteOn}
            />
          ) : (
            <IdlePanel hasPlays={session.explanations.length > 0} />
          )}
        </div>
      </aside>

      {session.sheetOpen && session.selected ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close explanation"
            onClick={() => setSheetOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="explain-title"
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#1c202b] px-4 pb-6 pt-3 shadow-2xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <ExplainCard
              selected={session.selected}
              chips={session.chips}
              isNewRule={session.isNewRule}
              vote={session.vote}
              rephrase={session.rephrase}
              onChoose={session.choose}
              onVote={session.voteOn}
              onClose={() => setSheetOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TeamBlock({
  team,
  score,
  align,
  hideScore,
}: {
  team: Team;
  score: number;
  align: "left" | "right";
  hideScore: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", align === "right" && "flex-row-reverse text-right")}>
      <TeamBadge team={team} />
      <div>
        <p className="text-4xl font-semibold leading-none tabular-nums tracking-tight">
          {hideScore ? "—" : score}
        </p>
        <p className="mt-1 text-xs text-white/45">{team.shortName}</p>
      </div>
    </div>
  );
}

function IdlePanel({ hasPlays }: { hasPlays: boolean }) {
  return (
    <div className="flex h-full flex-col justify-center px-4 text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#ff9a3c]">PLAIN ENGLISH</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">Which play did you just see?</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/55">
        {hasPlays
          ? "Broadcasts run a few seconds off the feed. Hit What just happened? and pick the play that matches your TV."
          : "When the first play lands, the button will explain it without assuming you know the rules."}
      </p>
    </div>
  );
}
