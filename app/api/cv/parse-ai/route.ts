import { NextResponse } from "next/server";
import { z } from "zod";
import { createChatCompletion } from "@/lib/ai/chat";
import { normalizeCvDraft } from "@/lib/cv/draft";
import { buildCvParseMessages, parseCvDraftJson } from "@/lib/cv/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  text: z.string().min(20, "CV text is required for AI parsing."),
  currentDraft: z.unknown().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const currentDraft = payload.currentDraft ? normalizeCvDraft(payload.currentDraft) : undefined;
    const completion = await createChatCompletion(
      buildCvParseMessages({
        text: payload.text,
        currentDraft,
      }),
      { temperature: 0.1 },
    );
    const draft = normalizeCvDraft(parseCvDraftJson(completion.content));

    return NextResponse.json({
      draft,
      model: completion.model,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid CV parse request." }, { status: 400 });
  }

  if (error instanceof SyntaxError || (error instanceof Error && error.message.includes("invalid CV JSON"))) {
    return NextResponse.json({ error: "AI parser returned invalid CV JSON." }, { status: 502 });
  }

  console.error("[api/cv/parse-ai] failed", error);

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unknown AI parse error" },
    { status: 500 },
  );
}
