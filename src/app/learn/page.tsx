import type { Metadata } from "next";

import { LearnView } from "@/components/learn-view";

export const metadata: Metadata = {
  title: "Rules learned — Whistle",
};

export default function LearnPage() {
  return <LearnView />;
}
