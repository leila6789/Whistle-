import type { FeedbackRecord, LatencySample, Vote } from "@/lib/types";

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "—";
  if (ms < 0.01) return "< 0.01 ms";
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 10) return `${ms.toFixed(2)} ms`;
  if (ms < 100) return `${ms.toFixed(1)} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export type Rating = {
  up: number;
  down: number;
  total: number;
  /** Null when nobody has voted. 0 would mean every vote was thumbs-down. */
  clearPct: number | null;
};

/** One vote per play. A later vote replaces the earlier one. */
export function clearRating(records: FeedbackRecord[]): Rating {
  const latest = new Map<string, Vote>();
  const ordered = [...records].sort((a, b) => a.at - b.at);
  for (const record of ordered) latest.set(record.playId, record.vote);
  let up = 0;
  let down = 0;
  for (const vote of latest.values()) {
    if (vote === "up") up += 1;
    else down += 1;
  }
  const total = up + down;
  return {
    up,
    down,
    total,
    clearPct: total === 0 ? null : (up / total) * 100,
  };
}

export function formatPct(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "—";
  return `${Math.round(pct)}%`;
}

export type LatencySummary = {
  templateMedianMs: number | null;
  templateCount: number;
  llmMedianMs: number | null;
  llmCount: number;
  feedLagMedianMs: number | null;
  feedLagCount: number;
};

export function summarizeLatency(samples: LatencySample[]): LatencySummary {
  const template = samples.filter((sample) => sample.source === "template");
  const llm = samples.filter((sample) => sample.source === "llm");
  const lag = samples.filter(
    (sample) => sample.source === "template" && typeof sample.feedLagMs === "number",
  );
  return {
    templateMedianMs: median(template.map((sample) => sample.engineMs)),
    templateCount: template.length,
    llmMedianMs: median(llm.map((sample) => sample.engineMs)),
    llmCount: llm.length,
    feedLagMedianMs: median(
      lag.map((sample) => sample.feedLagMs).filter((value): value is number => value !== undefined),
    ),
    feedLagCount: lag.length,
  };
}
