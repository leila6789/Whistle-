"use client";

import { Check, Star, ThumbsDown, ThumbsUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RichText } from "@/components/rich-text";
import type { RephraseState } from "@/components/use-play-session";
import type { Explanation, Vote } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ExplainCard({
  selected,
  chips,
  isNewRule,
  vote,
  rephrase,
  onChoose,
  onVote,
  onClose,
}: {
  selected: Explanation;
  chips: Explanation[];
  isNewRule: boolean;
  vote: Vote | null;
  rephrase: RephraseState;
  onChoose: (id: string) => void;
  onVote: (vote: Vote) => void;
  onClose?: () => void;
}) {
  const picker = chips.some((chip) => chip.playId === selected.playId)
    ? chips
    : [selected, ...chips].slice(0, 3);
  const rewritten = rephrase.status === "ok" && rephrase.playId === selected.playId ? rephrase : null;
  const rejected = rephrase.status === "rejected" && rephrase.playId === selected.playId;
  const title = rewritten?.title ?? selected.title;
  const body = rewritten?.body ?? selected.body;
  const why = rewritten?.why ?? selected.whyItMatters;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="explain-title" className="text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">
            Which play did you just see?
          </h2>
          <p className="mt-1 text-sm text-white/55">Your TV may be a few seconds ahead or behind.</p>
        </div>
        {onClose ? (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={onClose}
            aria-label="Close explanation"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {picker.map((chip) => {
          const active = chip.playId === selected.playId;
          return (
            <button
              key={chip.playId}
              type="button"
              onClick={() => onChoose(chip.playId)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm",
                active
                  ? "border border-[#ff7a1a] bg-[#ff7a1a]/12 text-white"
                  : "bg-[#2a3142] text-white/75 hover:text-white",
              )}
              aria-pressed={active}
            >
              {active ? <Check className="h-3.5 w-3.5 text-[#ff9a3c]" /> : null}
              {chip.chip}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[22px] bg-[#12151c] px-4 py-4">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-white/40">
          {selected.clockLabel} · EXPLAINED
        </p>
        <h3 className="mt-1 text-[26px] font-semibold tracking-tight">{title}</h3>
        <RichText text={body} className="mt-2 block text-[16px] leading-6 text-white/88" />

        <div className="relative mt-4 rounded-2xl bg-[#2a2118] px-4 py-3">
          <span className="absolute bottom-3 left-0 top-3 w-1 rounded-full bg-[#ff7a1a]" />
          <p className="pl-2 text-[11px] font-semibold tracking-[0.14em] text-[#ff9a3c]">WHY IT MATTERS</p>
          <RichText text={why} className="mt-1 block pl-2 text-[15px] leading-snug text-white/90" />
        </div>

        {isNewRule ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#123226] px-3 py-1.5 text-sm text-[#c8f8d8]">
            <Star className="h-3.5 w-3.5 fill-[#3ddc97] text-[#3ddc97]" />
            New rule learned: {selected.ruleName}
          </p>
        ) : (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-sm text-white/60">
            Rule: {selected.ruleName}
          </p>
        )}
        {rewritten ? (
          <p className="mt-2 text-xs text-white/40">Rephrased from the feed facts only.</p>
        ) : null}
        {rejected ? (
          <p className="mt-2 text-xs text-[#ffb089]">
            A rephrase was discarded because it added something that was not in the feed.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[15px] text-white/75">Was this clear?</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Yes, this was clear"
            aria-pressed={vote === "up"}
            className={cn(vote === "up" && "border-[#ff7a1a] bg-[#ff7a1a]/15")}
            onClick={() => onVote("up")}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="No, this was not clear"
            aria-pressed={vote === "down"}
            className={cn(vote === "down" && "border-white/40 bg-white/10")}
            onClick={() => onVote("down")}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
