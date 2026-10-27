"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, MoreHorizontal } from "lucide-react";

import { ExplainCard } from "@/components/explain-card";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { WhistleSignal } from "@/components/whistle-signal";
import { usePlaySession } from "@/components/use-play-session";
import { formatTipTime, prettyClock } from "@/lib/clock";
import { leadLine, onBoard, paint } from "@/lib/teams";
import type { Explanation, GamePayload, Team } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOT: Record<Explanation["dot"], string> = {
  make: "bg-[#1c140c]",
  miss: "bg-[#1c140c]/35",
  foul: "bg-[#e25b1a]",
  turnover: "bg-[#9a3412]",
  timeout: "bg-[#1c140c]/50",
  rebound: "bg-[#1c140c]/70",
  neutral: "bg-[#1c140c]/30",
  end: "bg-[#1c140c]",
};

function subline(game: GamePayload): string {
  if (game.status === "pre") return "Not started";
  if (game.status === "post") {
    if (game.awayScore === game.homeScore) return "Final, tied";
    const winner = game.awayScore > game.homeScore ? game.away : game.home;
    return `${winner.shortName} by ${Math.abs(game.awayScore - game.homeScore)}`;
  }
  if (game.statusText === "Halftime") return "Halftime";
  return leadLine(game.awayScore, game.homeScore, game.away, game.home);
}

function statusWord(game: GamePayload): string {
  if (game.demo && game.status !== "post") return "Replay";
  if (game.status === "in" && game.statusText !== "Halftime") return "Live";
  if (game.statusText === "Halftime") return "Halftime";
  if (game.status === "post") return game.demo ? "Replay final" : game.statusText;
  return "Pregame";
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
  const [signal, setSignal] = useState(false);
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

  function blow() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      session.ask();
      return;
    }
    setSignal(true);
    window.setTimeout(() => {
      setSignal(false);
      session.ask();
    }, 480);
  }

  const selectedPlay = game.plays.find((play) => play.id === session.selected?.playId);

  return (
    <div
      className="game-floor mx-auto flex h-dvh w-full max-w-6xl flex-col lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,480px)] lg:justify-center lg:gap-8 lg:px-6"
      style={{
        ["--team-away" as string]: paint(game.away.color),
        ["--team-home" as string]: paint(game.home.color),
      }}
    >
      <div className="flex h-1.5 lg:col-span-2 lg:mt-4">
        <div className="flex-1" style={{ background: paint(game.away.color) }} />
        <div className="flex-1" style={{ background: paint(game.home.color) }} />
      </div>
      <section className="flex min-h-0 flex-1 flex-col lg:py-4">
        <header className="flex h-14 items-center gap-2 px-3">
          <Link
            href="/"
            aria-label="All games"
            className="flex h-10 w-10 items-center justify-center border border-[#1c140c]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display flex-1 text-center text-xl font-semibold uppercase tracking-wide">
            {game.away.shortName} vs {game.home.shortName}
          </h1>
          <div className="relative">
            <button
              type="button"
              aria-label="More"
              aria-expanded={menuOpen}
              className="flex h-10 w-10 items-center justify-center border border-[#1c140c]"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen ? (
              <div className="paper absolute right-0 z-30 mt-1 w-40 border border-[#1c140c] p-1">
                <Link href="/learn" className="block px-3 py-2 text-sm hover:bg-[#1c140c]/8" onClick={() => setMenuOpen(false)}>
                  Rules learned
                </Link>
                <Link href="/stats" className="block px-3 py-2 text-sm hover:bg-[#1c140c]/8" onClick={() => setMenuOpen(false)}>
                  Stats
                </Link>
              </div>
            ) : null}
          </div>
        </header>

        <div className="px-4">
          <div className="board px-4 py-3">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-sm uppercase tracking-[0.16em] text-[#e25b1a]">{statusWord(game)}</p>
              <p className="font-display text-sm uppercase tracking-wide text-[#f4efe4]/80">
                {game.status === "pre" ? game.statusDetail || "Scheduled" : game.statusText}
              </p>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <TeamBlock team={game.away} score={game.awayScore} align="left" hideScore={game.status === "pre"} />
              <span className="pb-1 font-display text-3xl text-[#f4efe4]/40">–</span>
              <TeamBlock team={game.home} score={game.homeScore} align="right" hideScore={game.status === "pre"} />
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[#f4efe4]/20 pt-2 text-sm text-[#f4efe4]/75">
              <span>{subline(game)}</span>
              <span className="truncate pl-3 text-right">{game.venue}</span>
            </div>
          </div>
          {banner}
          {notice}
        </div>

        <div className="mt-4 flex items-baseline justify-between px-4">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide">Recent plays</h2>
          <p className="text-xs text-[#1c140c]/60">Newest first</p>
        </div>

        <div className="mt-1 min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {game.statusText === "Halftime" ? (
            <p className="pb-2 text-sm">Halftime. Last plays of the half are still here.</p>
          ) : null}
          {visible.length === 0 ? (
            <p className="border-t border-[#1c140c]/20 py-8 text-center text-sm leading-6">
              {game.status === "pre"
                ? `Nothing yet. Tip-off’s at ${formatTipTime(game.startTime)}.`
                : "No plays in the feed yet."}
            </p>
          ) : (
            <ul className="border-t border-[#1c140c]/25">
              {visible.map((explanation) => {
                const play = game.plays.find((item) => item.id === explanation.playId);
                const active = explanation.playId === session.selected?.playId;
                return (
                  <li key={explanation.playId} className="border-b border-[#1c140c]/15">
                    <button
                      type="button"
                      onClick={() => session.choose(explanation.playId)}
                      className={cn(
                        "flex w-full gap-3 px-1 py-2.5 text-left",
                        active && "border-l-4 border-[#e25b1a] bg-[#f4efe4] pl-2",
                      )}
                    >
                      <span className="font-display w-12 shrink-0 pt-0.5 text-sm tabular-nums text-[#1c140c]/55">
                        {play ? prettyClock(play.clock) : explanation.clockLabel}
                      </span>
                      <span className={cn("mt-2 h-1.5 w-1.5 shrink-0", DOT[explanation.dot])} />
                      <RichText text={explanation.summary} className="text-[15px] leading-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {newest.length > 8 ? (
            <button
              type="button"
              className="w-full py-2 text-center text-sm underline underline-offset-2"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? "Show fewer" : `Earlier plays (${newest.length - 8})`}
            </button>
          ) : null}
        </div>

        <div className="px-4 pb-4 pt-2">
          <Button
            variant="orange"
            size="lg"
            disabled={session.explanations.length === 0}
            onClick={blow}
          >
            {session.explanations.length === 0 ? "Waiting on tip-off" : "What just happened?"}
          </Button>
          <p className="mt-2 text-center text-xs text-[#1c140c]/65">Tap it when the broadcast loses you.</p>
        </div>
      </section>

      <aside className="hidden min-h-0 lg:block lg:py-4">
        <div className="paper flex h-full max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto border border-[#1c140c] p-5">
          <ClipboardClip />
          {session.selected ? (
            <ExplainCard
              selected={session.selected}
              chips={session.chips}
              isNewRule={session.isNewRule}
              vote={session.vote}
              rephrase={session.rephrase}
              spot={selectedPlay?.coordinate}
              made={selectedPlay?.scoringPlay}
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
            className="absolute inset-0 bg-[#1c140c]/45"
            aria-label="Close explanation"
            onClick={() => setSheetOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="explain-title"
            className="paper absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto border-t-4 border-[#1c140c] px-4 pb-6 pt-3"
          >
            <ClipboardClip />
            <ExplainCard
              selected={session.selected}
              chips={session.chips}
              isNewRule={session.isNewRule}
              vote={session.vote}
              rephrase={session.rephrase}
              spot={selectedPlay?.coordinate}
              made={selectedPlay?.scoringPlay}
              onChoose={session.choose}
              onVote={session.voteOn}
              onClose={() => setSheetOpen(false)}
            />
          </div>
        </div>
      ) : null}
      {signal ? <WhistleSignal /> : null}
    </div>
  );
}

function ClipboardClip() {
  return <div className="mx-auto mb-3 h-2 w-16 bg-[#8a8f93]" aria-hidden />;
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
    <div className={cn(align === "right" && "text-right")}>
      <p
        className="font-display text-sm font-semibold uppercase tracking-[0.14em]"
        style={{ color: onBoard(team.color, team.altColor) }}
      >
        {team.abbreviation}
      </p>
      <p className="font-display text-6xl font-semibold leading-none tabular-nums text-[#f4efe4]">
        {hideScore ? "—" : score}
      </p>
      <p className="mt-1 text-xs text-[#f4efe4]/60">{team.shortName}</p>
    </div>
  );
}

function IdlePanel({ hasPlays }: { hasPlays: boolean }) {
  return (
    <div className="flex h-full flex-col justify-center px-2">
      <h2 className="font-display text-4xl font-semibold uppercase leading-none">Which play did you just see?</h2>
      <p className="mt-3 max-w-sm text-sm leading-6">
        {hasPlays
          ? "Your TV and this feed aren’t on the same second. Hit the button and pick the play you saw."
          : "When the ball goes up, the button will tell you what the rule was."}
      </p>
    </div>
  );
}
