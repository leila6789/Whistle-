import { Suspense } from "react";
import { notFound } from "next/navigation";

import { GameScreen } from "@/components/game-screen";

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<GameShell />}>
      <GameGate params={params} />
    </Suspense>
  );
}

async function GameGate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{5,12}$/.test(id)) notFound();
  return <GameScreen id={id} />;
}

function GameShell() {
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
