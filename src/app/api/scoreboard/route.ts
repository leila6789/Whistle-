import { fetchScoreboard } from "@/lib/espn";

export async function GET() {
  try {
    const board = await fetchScoreboard();
    return Response.json(board, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The NBA feed didn't respond.";
    return Response.json({ error: message }, { status: 502 });
  }
}
