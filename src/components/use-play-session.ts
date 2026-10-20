"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MAX_FEED_LAG_MS } from "@/lib/config";
import { explainGame } from "@/lib/explain";
import { allowListFromFacts, validateRephrase } from "@/lib/guardrail";
import { getVote, learnRule, recordLatency, saveVote } from "@/lib/persist";
import { emphasize } from "@/lib/text";
import type { Explanation, GamePayload, Vote } from "@/lib/types";

export type RephraseState =
  | { status: "idle" }
  | { status: "rejected"; playId: string }
  | { status: "ok"; playId: string; title: string; body: string; why: string };

const EMPTY = {
  explanations: [] as Explanation[],
  timings: [] as { playId: string; engineMs: number }[],
  batchMs: 0,
};

export function usePlaySession(game: GamePayload | null) {
  const recorded = useRef(new Set<string>());
  const freshRules = useRef(new Set<string>());

  const explained = useMemo(() => (game ? explainGame(game) : EMPTY), [game]);

  const explanations = explained.explanations;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isNewRule, setIsNewRule] = useState(false);
  const [vote, setVote] = useState<Vote | null>(null);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [rephrase, setRephrase] = useState<RephraseState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rephrase")
      .then((response) => response.json())
      .then((data: { enabled?: boolean }) => {
        if (!cancelled) setLlmEnabled(Boolean(data.enabled));
      })
      .catch(() => {
        if (!cancelled) setLlmEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!game) return;
    const live = game.status === "in" && !game.demo;
    for (const timing of explained.timings) {
      const key = `${timing.playId}:template`;
      if (recorded.current.has(key)) continue;
      recorded.current.add(key);
      const play = game.plays.find((item) => item.id === timing.playId);
      let feedLagMs: number | undefined;
      if (live && play?.wallclock) {
        const lag = Date.now() - Date.parse(play.wallclock);
        if (Number.isFinite(lag) && lag >= 0 && lag < MAX_FEED_LAG_MS) feedLagMs = lag;
      }
      recordLatency({
        playId: timing.playId,
        engineMs: explained.batchMs,
        feedLagMs,
        source: "template",
        at: Date.now(),
      });
    }
  }, [explained, game]);

  const selected = explanations.find((item) => item.playId === selectedId) ?? null;

  useEffect(() => {
    if (!llmEnabled || !selectedId) return;
    const current = explanations.find((item) => item.playId === selectedId);
    if (!current) return;
    const facts = current.facts;
    const playId = current.playId;
    let cancelled = false;
    const started = performance.now();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    fetch("/api/rephrase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data: { ok?: boolean; reason?: string; title?: string; body?: string; whyItMatters?: string }) => {
        if (cancelled) return;
        if (!data.ok || !data.title || !data.body || !data.whyItMatters) {
          if (data.reason === "rejected") setRephrase({ status: "rejected", playId });
          return;
        }
        const check = validateRephrase(
          `${data.title}\n${data.body}\n${data.whyItMatters}`,
          allowListFromFacts(facts),
        );
        if (!check.ok) {
          setRephrase({ status: "rejected", playId });
          return;
        }
        recordLatency({
          playId: `${playId}:llm`,
          engineMs: performance.now() - started,
          source: "llm",
          at: Date.now(),
        });
        const names = [...facts.players, ...facts.teams];
        setRephrase({
          status: "ok",
          playId,
          title: data.title,
          body: emphasize(data.body, names),
          why: emphasize(data.whyItMatters, names),
        });
      })
      .catch(() => {
        /* Template stays. A failed rephrase is not an error the viewer needs. */
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
    // Fetch once per play. A later poll should not send the same facts again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llmEnabled, selectedId]);

  const mark = useCallback((explanation: Explanation) => {
    const key = `${explanation.playId}:${explanation.ruleId}`;
    if (freshRules.current.has(key)) {
      setIsNewRule(true);
    } else {
      const learned = learnRule(explanation.ruleId, explanation.ruleName);
      if (learned.isNew) freshRules.current.add(key);
      setIsNewRule(learned.isNew);
    }
    setVote(getVote(explanation.playId));
  }, []);

  const choose = useCallback(
    (id: string) => {
      const explanation = explanations.find((item) => item.playId === id);
      setSelectedId(id);
      setSheetOpen(true);
      if (explanation) mark(explanation);
    },
    [explanations, mark],
  );

  const chips = useMemo(() => {
    const meaningful = explanations.filter((item) => item.ruleId !== "substitution");
    const source = meaningful.length > 0 ? meaningful : explanations;
    return source.slice(-3).reverse();
  }, [explanations]);

  const voteOn = useCallback(
    (next: Vote) => {
      if (!selected) return;
      saveVote({
        playId: selected.playId,
        ruleId: selected.ruleId,
        vote: next,
        at: Date.now(),
      });
      setVote(next);
    },
    [selected],
  );

  const ask = useCallback(() => {
    const newest = chips[0];
    if (!newest) return;
    choose(newest.playId);
  }, [chips, choose]);

  const activeRephrase: RephraseState =
    rephrase.status !== "idle" && rephrase.playId === selectedId ? rephrase : { status: "idle" };

  return {
    explanations,
    selected,
    chips,
    sheetOpen: sheetOpen && Boolean(selected),
    setSheetOpen,
    choose,
    ask,
    isNewRule,
    vote,
    voteOn,
    rephrase: activeRephrase,
    llmEnabled,
  };
}
