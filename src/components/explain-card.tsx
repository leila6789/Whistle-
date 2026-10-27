"use client";

import { ThumbsDown, ThumbsUp, X } from "lucide-react";

import { HalfCourt } from "@/components/half-court";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/rich-text";
import type { RephraseState } from "@/components/use-play-session";
import type { CourtSpot } from "@/lib/spot";
import type { Explanation, Vote } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ExplainCard({
  selected,
  chips,
  isNewRule,
  vote,
  rephrase,
  spot,
  made,
  onChoose,
  onVote,
  onClose,
}: {
  selected: Explanation;
  chips: Explanation[];
  isNewRule: boolean;
  vote: Vote | null;
  rephrase: RephraseState;
  spot?: CourtSpot;
  made?: boolean;
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
    <div className="flex min-h-0 flex-1 flex-col text-[#1c140c]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.14em] text-[#1c140c]/55">Ref card</p>
          <h2 id="explain-title" className="font-display text-3xl font-semibold uppercase leading-none tracking-wide">
            Which play did you just see?
          </h2>
          <p className="mt-1 text-sm leading-5">TV’s usually a few seconds off. Pick the one you saw.</p>
        </div>
        {onClose ? (
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#1c140c]"
            onClick={onClose}
            aria-label="Close explanation"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {picker.map((chip) => {
          const active = chip.playId === selected.playId;
          return (
            <button
              key={chip.playId}
              type="button"
              onClick={() => onChoose(chip.playId)}
              className={cn(
                "font-display shrink-0 border px-2.5 py-1 text-sm uppercase tracking-wide",
                active ? "border-[#1c140c] bg-[#1c140c] text-[#f4efe4]" : "border-[#1c140c]/40 bg-transparent",
              )}
              aria-pressed={active}
            >
              {chip.chip}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <HalfCourt spot={spot} made={made} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs uppercase tracking-[0.12em] text-[#1c140c]/55">
            {selected.clockLabel}
          </p>
          <h3 className="font-display text-4xl font-semibold uppercase leading-none tracking-wide">{title}</h3>
          <RichText text={body} className="mt-2 block text-[16px] leading-6" />
          <div className="mt-3 border-t border-[#1c140c] pt-2">
            <p className="font-display text-sm uppercase tracking-wide">Why it matters</p>
            <RichText text={why} className="mt-1 block text-[15px] leading-snug" />
          </div>
          {isNewRule ? (
            <p className="font-display mt-3 inline-block -rotate-1 border-2 border-[#e25b1a] px-2 py-0.5 text-sm uppercase tracking-wide text-[#e25b1a]">
              New · {selected.ruleName}
            </p>
          ) : (
            <p className="mt-3 text-sm text-[#1c140c]/70">Rule: {selected.ruleName}</p>
          )}
          {rewritten ? <p className="mt-2 text-xs text-[#1c140c]/60">Rephrased from the feed. Nothing added.</p> : null}
          {rejected ? (
            <p className="mt-2 text-xs text-[#9a3412]">Tossed a rephrase. It added something the feed didn’t say.</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#1c140c]/20 pt-3">
        <p className="text-[15px]">Clear enough?</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Yes, this was clear"
            aria-pressed={vote === "up"}
            className={cn(vote === "up" && "bg-[#1c140c] text-[#f4efe4]")}
            onClick={() => onVote("up")}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="No, this was not clear"
            aria-pressed={vote === "down"}
            className={cn(vote === "down" && "bg-[#1c140c] text-[#f4efe4]")}
            onClick={() => onVote("down")}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
