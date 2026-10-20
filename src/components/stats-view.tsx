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
      <p className="text-xs font-semibold tracking-[0.16em] text-[#ff9a3c]">ON THIS DEVICE</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Stats</h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-white/55">
        Thumbs and timing stay in this browser. Nothing is uploaded, and nothing on this page is filled in ahead of time. A dash means there is no sample yet.
      </p>

      <section className="mt-6 rounded-[28px] border border-white/8 bg-[#141820] px-5 py-5">
        <h2 className="text-sm text-white/50">Clear rating</h2>
        <p className="mt-2 text-6xl font-semibold tabular-nums tracking-tight">
          {ready ? formatPct(rating.clearPct) : "—"}
        </p>
        <p className="mt-2 text-sm text-white/55">
          {rating.total === 0
            ? "No ratings yet. Open a play and mark whether the explanation was clear."
            : `${rating.up} thumbs up · ${rating.down} thumbs down · ${rating.total} ${rating.total === 1 ? "vote" : "votes"}`}
        </p>
        <p className="mt-2 text-xs leading-5 text-white/35">
          Clear rating is up votes divided by every vote. A later vote on the same play replaces the earlier one.
        </p>
      </section>

      <section className="mt-3 rounded-[28px] border border-white/8 bg-[#141820] px-5 py-5">
        <h2 className="text-sm text-white/50">Time to explanation</h2>
        <p className="mt-2 text-6xl font-semibold tabular-nums tracking-tight">
          {ready ? formatDuration(latency.templateMedianMs) : "—"}
        </p>
        <p className="mt-2 text-sm text-white/55">
          {latency.templateCount === 0
            ? "No plays measured yet."
            : `Median · ${latency.templateCount} ${latency.templateCount === 1 ? "play" : "plays"}`}
        </p>
        <p className="mt-2 text-xs leading-5 text-white/35">
          Measured from the moment a play arrives in this browser until its template explanation is built. Plays that arrive together share that update. It is not a guess about TV delay. The feed itself can be several seconds behind the arena.
        </p>
      </section>

      <section className="mt-3 rounded-[28px] border border-white/8 bg-[#141820] px-5 py-5">
        <h2 className="text-sm text-white/50">Feed lag</h2>
        <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">
          {ready ? formatDuration(latency.feedLagMedianMs) : "—"}
        </p>
        <p className="mt-2 text-sm leading-6 text-white/55">
          {latency.feedLagCount === 0
            ? "No live plays measured in this browser yet. Replay plays are left out, because their timestamps are from the original game."
            : `Median · ${latency.feedLagCount} live ${latency.feedLagCount === 1 ? "play" : "plays"}. The ESPN timestamp versus when the play reached this browser.`}
        </p>
      </section>

      {latency.llmCount > 0 ? (
        <section className="mt-3 rounded-[28px] border border-white/8 bg-[#141820] px-5 py-5">
          <h2 className="text-sm text-white/50">LLM rephrase</h2>
          <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">
            {formatDuration(latency.llmMedianMs)}
          </p>
          <p className="mt-2 text-sm text-white/55">
            Median · {latency.llmCount} accepted {latency.llmCount === 1 ? "rephrase" : "rephrases"}. Rejected replies are not included.
          </p>
        </section>
      ) : null}

      <p className="mt-4 text-sm text-white/45">
        {snapshot.learned} {snapshot.learned === 1 ? "rule" : "rules"} opened on this device.
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
