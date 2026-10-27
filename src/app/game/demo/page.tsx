import type { Metadata } from "next";

import { ReplayScreen } from "@/components/replay-screen";

export const metadata: Metadata = {
  title: "Replay — Whistle",
  description: "A recorded NBA game, played back play by play, with plain-English explanations.",
};

export default function DemoPage() {
  return <ReplayScreen />;
}
