import type { FeedbackRecord, LatencySample, Vote } from "@/lib/types";

const FEEDBACK_KEY = "whistle.feedback.v1";
const LATENCY_KEY = "whistle.latency.v1";
const RULES_KEY = "whistle.rules.v1";
const MAX_LATENCY = 2000;
const MAX_FEEDBACK = 1000;

export type LearnedRule = {
  ruleId: string;
  ruleName: string;
  learnedAt: number;
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("whistle-storage"));
  }
}

export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full disk. The in-memory copy still works this session.
  }
}

let latencyCache: LatencySample[] | null = null;
let latencyTimer: number | null = null;

function latencyKey(sample: LatencySample): string {
  return `${sample.playId}:${sample.source}`;
}

export function recordLatency(sample: LatencySample) {
  if (typeof window === "undefined") return;
  if (!latencyCache) latencyCache = read<LatencySample[]>(LATENCY_KEY, []);
  if (latencyCache.some((item) => latencyKey(item) === latencyKey(sample))) return;
  latencyCache.push(sample);
  if (latencyCache.length > MAX_LATENCY) {
    latencyCache.splice(0, latencyCache.length - MAX_LATENCY);
  }
  if (latencyTimer !== null) return;
  latencyTimer = window.setTimeout(() => {
    latencyTimer = null;
    write(LATENCY_KEY, latencyCache ?? []);
    notify();
  }, 60);
}

export function readLatency(): LatencySample[] {
  if (latencyCache) return latencyCache;
  return read<LatencySample[]>(LATENCY_KEY, []);
}

export function readFeedback(): FeedbackRecord[] {
  return read<FeedbackRecord[]>(FEEDBACK_KEY, []);
}

export function getVote(playId: string): Vote | null {
  const records = readFeedback();
  for (let i = records.length - 1; i >= 0; i -= 1) {
    if (records[i].playId === playId) return records[i].vote;
  }
  return null;
}

export function saveVote(record: FeedbackRecord) {
  const next = readFeedback().filter((item) => item.playId !== record.playId);
  next.push(record);
  write(FEEDBACK_KEY, next.slice(-MAX_FEEDBACK));
  notify();
}

export function readLearned(): LearnedRule[] {
  return read<LearnedRule[]>(RULES_KEY, []);
}

export function learnRule(ruleId: string, ruleName: string): { isNew: boolean } {
  const all = readLearned();
  if (all.some((item) => item.ruleId === ruleId)) return { isNew: false };
  all.push({ ruleId, ruleName, learnedAt: Date.now() });
  write(RULES_KEY, all);
  notify();
  return { isNew: true };
}

export function resetLocalStats() {
  latencyCache = [];
  if (latencyTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(latencyTimer);
    latencyTimer = null;
  }
  write(FEEDBACK_KEY, []);
  write(LATENCY_KEY, []);
  write(RULES_KEY, []);
  notify();
}
