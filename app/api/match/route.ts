import { NextResponse } from "next/server";
import { createChatCompletion } from "@/lib/ai/chat";
import { buildMatchScoreMessages } from "@/lib/prompts";
import { parseMatchResponse } from "@/lib/scoring";
import { seedDocuments } from "@/lib/seed-documents";

export const runtime = "nodejs";

export async function POST() {
  const startedAt = Date.now();

  try {
    const candidateProfile = seedDocuments.find((document) => document.sourceType === "cv");
    const jobOffer = seedDocuments.find((document) => document.sourceType === "job");

    if (!candidateProfile || !jobOffer) {
      throw new Error("Seed corpus must include one CV document and one job document.");
    }

    const completion = await createChatCompletion(
      buildMatchScoreMessages({
        candidateProfile: candidateProfile.content,
        jobOffer: jobOffer.content,
      }),
    );
    const parsed = parseMatchResponse(completion.content);

    return NextResponse.json({
      ...parsed,
      model: completion.model,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown match scoring error";

  return NextResponse.json(
    {
      error: message,
    },
    { status: 500 },
  );
}
