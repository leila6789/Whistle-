"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";

import { Court } from "@/components/court";
import { Button } from "@/components/ui/button";
import { formatWhen } from "@/lib/clock";
import { projectReplay, replayLength, replayStartIndex } from "@/lib/demo";

export function ReplayScreen() {
  const length = replayLength();
  const jumpIndex = replayStartIndex();
  const [index, setIndex] = useState(jumpIndex);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const game = useMemo(() => projectReplay(index), [index]);
  const atEnd = index >= length - 1;

  useEffect(() => {
    if (!playing || atEnd) return;
    const timer = window.setTimeout(
      () => setIndex((current) => Math.min(length - 1, current + 1)),
      speed === 2 ? 1100 : 2400,
    );
    return () => window.clearTimeout(timer);
  }, [playing, atEnd, speed, length, index]);

  const when = game.demo ? formatWhen(game.demo.date) : "";

  return (
    <Court
      game={game}
      banner={
        <div className="mt-3 rounded-2xl border border-[#ff7a1a]/30 bg-[#24180f] px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ff9a3c]">REPLAY · NOT LIVE</p>
              <p className="truncate text-xs text-[#ffd7bf]">
                {game.away.shortName} at {game.home.shortName} · {when} · real ESPN feed
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                aria-label={playing ? "Pause replay" : "Play replay"}
                onClick={() => setPlaying((value) => !value)}
              >
                {playing && !atEnd ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                aria-label="Next play"
                disabled={atEnd}
                onClick={() => setIndex((current) => Math.min(length - 1, current + 1))}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              <button
                type="button"
                className="rounded-full px-2 py-1 text-xs font-semibold text-[#ffd7bf]"
                onClick={() => setSpeed((value) => (value === 1 ? 2 : 1))}
              >
                {speed}×
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <button type="button" className="text-[#ffb089] underline-offset-2 hover:underline" onClick={() => { setIndex(-1); setPlaying(true); }}>
              From the tip
            </button>
            <button type="button" className="text-[#ffb089] underline-offset-2 hover:underline" onClick={() => { setIndex(jumpIndex); setPlaying(true); }}>
              Jump to the 4th
            </button>
            {atEnd ? (
              <button type="button" className="text-white underline-offset-2 hover:underline" onClick={() => { setIndex(jumpIndex); setPlaying(true); }}>
                Watch again
              </button>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
