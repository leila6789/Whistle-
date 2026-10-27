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
  const ordered = [...RULES].sort((a, b) => Number(known.has(b.id)) - Number(known.has(a.id)));

  return (
    <Shell>
      <p className="font-display mt-5 text-sm uppercase tracking-[0.16em]">Rules you’ve opened</p>
      <h1 className="font-display mt-1 text-6xl font-semibold uppercase leading-none tabular-nums">
        {ready ? `${count} of ${RULES.length}` : "—"}
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-6">
        Opening an explanation counts. Scrolling past a play does not. This list stays in this browser.
      </p>
      <div className="mt-4 h-1 bg-[#1c140c]/15">
        <div
          className="h-full bg-[#1c140c]"
          style={{ width: ready ? `${(count / RULES.length) * 100}%` : "0%" }}
        />
      </div>
      <ul className="paper mt-6 border border-[#1c140c]">
        {ordered.map((rule) => {
          const item = known.get(rule.id);
          return (
            <li key={rule.id} className="border-b border-[#1c140c]/15 px-4 py-3 last:border-b-0">
              <div className="flex items-start gap-3">
                <span className="font-display mt-0.5 w-4 shrink-0 text-sm" aria-hidden>
                  {item ? "✓" : ""}
                </span>
                <div>
                  <p className="font-display text-xl uppercase leading-none">{rule.name}</p>
                  {item ? (
                    <p className="mt-1 text-sm leading-5">{rule.lesson}</p>
                  ) : (
                    <p className="mt-1 text-sm text-[#1c140c]/55">Not yet. It shows up the first time you open that explanation.</p>
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
