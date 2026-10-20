import { fetchGame } from "@/lib/espn";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const game = await fetchGame(id);
    return Response.json(game, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The NBA feed didn't respond.";
    const status = message === "Invalid game id" ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}
