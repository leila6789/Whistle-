import type { Metadata } from "next";

import { StatsView } from "@/components/stats-view";

export const metadata: Metadata = {
  title: "Stats — Whistle",
};

export default function StatsPage() {
  return <StatsView />;
}
