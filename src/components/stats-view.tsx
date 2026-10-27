"use client";

import { useEffect, useState } from "react";

import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { clearRating, formatDuration, formatPct, summarizeLatency } from "@/lib/metrics";
import {
  readFeedback,
  readLatency,
  readLearned,
  resetLocalStats,
  subscribeStore,
} from "@/lib/persist";

export function StatsView() {
  const [ready, setReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [snapshot, setSnapshot] = useState({
    feedback: [] as ReturnType<typeof readFeedback>,
    latency: [] as ReturnType<typeof readLatency>,
    learned: 0,
  });

  useEffect(() => {
    const sync = () => {
      setSnapshot({
        feedback: readFeedback(),
        latency: readLatency(),
        learned: readLearned().length,
      });
      setReady(true);
    };
    sync();
    return subscribeStore(sync);
  }, []);

  const rating = clearRating(snapshot.feedback);
  const latency = summarizeLatency(snapshot.latency);

  return (
    <Shell>
      <p className="font-display mt-5 text-sm uppercase tracking-[0.16em]">On this phone</p>
      <h1 className="font-display mt-1 text-6xl font-semibold uppercase leading-none">Stats</h1>
      <p className="mt-3 max-w-lg text-sm leading-6">
        Thumbs and timing stay in this browser. Nothing is uploaded, and nothing here is filled in ahead of time. A dash means there is no sample yet.
      </p>

      <div className="paper mt-6 border border-[#1c140c]">
        <section className="border-b border-[#1c140c]/15 px-5 py-5">
          <h2 className="font-display text-sm uppercase tracking-wide">Clear rating</h2>
          <p className="font-display mt-1 text-7xl font-semibold leading-none tabular-nums">
            {ready ? formatPct(rating.clearPct) : "—"}
          </p>
          <p className="mt-2 text-sm">
            {!ready || rating.total === 0
              ? "No votes yet. Open a play and say if it made sense."
              : `${rating.up} up · ${rating.down} down · ${rating.total} ${rating.total === 1 ? "vote" : "votes"}`}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#1c140c]/60">
            Up votes divided by every vote. A later vote on the same play replaces the earlier one.
          </p>
        </section>

        <section className="border-b border-[#1c140c]/15 px-5 py-5">
          <h2 className="font-display text-sm uppercase tracking-wide">Time to explanation</h2>
          <p className="font-display mt-1 text-7xl font-semibold leading-none tabular-nums">
            {ready ? formatDuration(latency.templateMedianMs) : "—"}
          </p>
          <p className="mt-2 text-sm">
            {latency.templateCount === 0
              ? "Nothing timed yet."
              : `Median · ${latency.templateCount} ${latency.templateCount === 1 ? "play" : "plays"}`}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#1c140c]/60">
            From the moment a play arrives in this browser until its template is built. Plays that arrive together share that time. Not a guess about the TV. The feed itself can trail the arena.
          </p>
        </section>

        <section className="px-5 py-5">
          <h2 className="font-display text-sm uppercase tracking-wide">Feed lag</h2>
          <p className="font-display mt-1 text-5xl font-semibold leading-none tabular-nums">
            {ready ? formatDuration(latency.feedLagMedianMs) : "—"}
          </p>
          <p className="mt-2 text-sm leading-6">
            {latency.feedLagCount === 0
              ? "No live game measured here. Replays don’t count. Their clocks are from the original night."
              : `Median · ${latency.feedLagCount} live ${latency.feedLagCount === 1 ? "play" : "plays"}. ESPN’s timestamp versus when the play reached this browser.`}
          </p>
        </section>

        {latency.llmCount > 0 ? (
          <section className="border-t border-[#1c140c]/15 px-5 py-5">
            <h2 className="font-display text-sm uppercase tracking-wide">LLM rephrase</h2>
            <p className="font-display mt-1 text-5xl font-semibold leading-none tabular-nums">
              {formatDuration(latency.llmMedianMs)}
            </p>
            <p className="mt-2 text-sm">
              Median · {latency.llmCount} accepted {latency.llmCount === 1 ? "rephrase" : "rephrases"}. Rejected replies stay out.
            </p>
          </section>
        ) : null}
      </div>

      <p className="mt-4 text-sm">
        {snapshot.learned} {snapshot.learned === 1 ? "rule" : "rules"} opened on this phone.
      </p>

      <div className="mt-6">
        {confirming ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                resetLocalStats();
                setConfirming(false);
              }}
            >
              Erase local stats
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            Reset local stats
          </Button>
        )}
      </div>
    </Shell>
  );
}
