"use client";

import { useEffect, useState } from "react";

import { Shell } from "@/components/shell";
import { readLearned, subscribeStore, type LearnedRule } from "@/lib/persist";
import { RULES } from "@/lib/rules";

export function LearnView() {
  const [learned, setLearned] = useState<LearnedRule[] | null>(null);

  useEffect(() => {
    const sync = () => setLearned(readLearned());
    sync();
    return subscribeStore(sync);
  }, []);

  const known = new Map((learned ?? []).map((item) => [item.ruleId, item]));
  const count = RULES.filter((rule) => known.has(rule.id)).length;
  const ready = learned !== null;

  return (
    <Shell>
      <p className="text-xs font-semibold tracking-[0.16em] text-[#3ddc97]">RULES YOU HAVE OPENED</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {ready ? `${count} of ${RULES.length}` : "—"}
      </h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-white/55">
        A rule counts when you open its explanation. Scrolling past a play does not. This list stays in this browser.
      </p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-[#ff6a00]"
          style={{ width: ready ? `${(count / RULES.length) * 100}%` : "0%" }}
        />
      </div>
      <ul className="mt-6 space-y-2">
        {RULES.map((rule) => {
          const item = known.get(rule.id);
          return (
            <li key={rule.id} className="rounded-2xl border border-white/8 bg-[#141820] px-4 py-3">
              <div className="flex items-start gap-3">
                <span
                  className={
                    item
                      ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#123226] text-xs text-[#3ddc97]"
                      : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-[10px] text-white/30"
                  }
                  aria-hidden
                >
                  {item ? "✓" : ""}
                </span>
                <div>
                  <p className="font-medium">{rule.name}</p>
                  {item ? (
                    <p className="mt-1 text-sm leading-5 text-white/60">{rule.lesson}</p>
                  ) : (
                    <p className="mt-1 text-sm text-white/35">Not seen yet. It lights up the first time you open that explanation.</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
