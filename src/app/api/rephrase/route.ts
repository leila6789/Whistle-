import { allowListFromFacts, validateRephrase } from "@/lib/guardrail";
import type { ExplanationFacts } from "@/lib/types";

export async function GET() {
  return Response.json({ enabled: Boolean(process.env.LLM_API_KEY) });
}

/**
 * Optional rephrase. The template is always the source of truth.
 * The model may only restyle facts already in the payload. If the reply
 * adds a name or a number that is not in those facts, it is discarded.
 */
export async function POST(request: Request) {
  const key = process.env.LLM_API_KEY;
  if (!key) {
    return Response.json({ ok: false, reason: "disabled" });
  }

  let facts: ExplanationFacts;
  try {
    const body = (await request.json()) as { facts?: ExplanationFacts };
    if (!body.facts || typeof body.facts.templateBody !== "string") {
      return Response.json({ ok: false, reason: "bad-facts" }, { status: 400 });
    }
    facts = body.facts;
  } catch {
    return Response.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }

  if (facts.templateBody.length > 4000 || facts.templateWhy.length > 2000) {
    return Response.json({ ok: false, reason: "too-long" }, { status: 400 });
  }

  const base = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const payload = {
    model,
    temperature: 0,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: [
          "You rephrase a beginner basketball explanation.",
          "Use ONLY the facts in the user JSON. Do not add players, teams, scores, fouls, times, distances, or outcomes that are not written there.",
          "Do not guess what happens next. Do not say probably, maybe, or I think.",
          "Keep the same meaning as templateBody and templateWhy.",
          "Write 2 or 3 short sentences for body and 1 or 2 for whyItMatters.",
          "Do not use markdown.",
          'Return JSON: {"title": string, "body": string, "whyItMatters": string}',
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          title: facts.templateTitle,
          templateBody: facts.templateBody,
          templateWhy: facts.templateWhy,
          rule: facts.ruleText,
          period: facts.period,
          clock: facts.clock,
          homeScore: facts.homeScore,
          awayScore: facts.awayScore,
          players: facts.players,
          teams: facts.teams,
          detail: facts.detail,
        }),
      },
    ],
  };

  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return Response.json({ ok: false, reason: "upstream" });
    }
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return Response.json({ ok: false, reason: "empty" });
    const parsed = JSON.parse(content) as {
      title?: string;
      body?: string;
      whyItMatters?: string;
    };
    const title = String(parsed.title ?? "").trim();
    const body = String(parsed.body ?? "").replace(/\*\*/g, "").trim();
    const whyItMatters = String(parsed.whyItMatters ?? "").replace(/\*\*/g, "").trim();
    if (!title || !body || !whyItMatters) {
      return Response.json({ ok: false, reason: "empty" });
    }
    if (title.length > 80 || body.length > 700 || whyItMatters.length > 400) {
      return Response.json({ ok: false, reason: "rejected" });
    }
    const check = validateRephrase(`${title}\n${body}\n${whyItMatters}`, allowListFromFacts(facts));
    if (!check.ok) {
      return Response.json({ ok: false, reason: "rejected" });
    }
    return Response.json({ ok: true, title, body, whyItMatters });
  } catch {
    return Response.json({ ok: false, reason: "upstream" });
  }
}
