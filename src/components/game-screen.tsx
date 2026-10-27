"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Court } from "@/components/court";
import { Button } from "@/components/ui/button";
import { LIVE_POLL_MS, PREGAME_POLL_MS } from "@/lib/config";
import type { GamePayload } from "@/lib/types";

export function GameScreen({ id }: { id: string }) {
  const [game, setGame] = useState<GamePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    async function load() {
      if (document.visibilityState === "hidden") {
        timer = window.setTimeout(load, LIVE_POLL_MS);
        return;
      }
      try {
        const response = await fetch(`/api/game/${id}`, { cache: "no-store" });
        const data = (await response.json()) as GamePayload & { error?: string };
        if (!response.ok) throw new Error(data.error || "The NBA feed didn't respond.");
        if (cancelled) return;
        setGame(data);
        setError(null);
        const delay = data.status === "in" ? LIVE_POLL_MS : data.status === "pre" ? PREGAME_POLL_MS : 0;
        if (delay) timer = window.setTimeout(load, delay);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't load this game.");
        timer = window.setTimeout(load, LIVE_POLL_MS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        load();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id]);

  if (loading && !game) {
    return (
      <div className="mx-auto w-full max-w-[440px] px-4 pt-6">
        <div className="h-14" />
        <div className="h-36 animate-pulse bg-[#1c140c]/10" />
        <div className="mt-4 space-y-2">
          <div className="h-12 animate-pulse bg-[#1c140c]/10" />
          <div className="h-12 animate-pulse bg-[#1c140c]/10" />
          <div className="h-12 animate-pulse bg-[#1c140c]/10" />
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
        <h1 className="font-display text-4xl font-semibold uppercase">Could not open this game</h1>
        <p className="mt-2 text-sm leading-6">{error ?? "The feed did not return it."}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button variant="orange" asChild>
            <Link href="/">Back to games</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Court
      game={game}
      notice={
        error ? (
          <p className="mt-2 text-center text-xs text-[#9a3412]">Feed hiccup. Still showing the last plays.</p>
        ) : game.status === "post" ? (
          <p className="mt-2 text-center text-xs">This one’s over. You can still ask about the last plays.</p>
        ) : null
      }
    />
  );
}
