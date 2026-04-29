import { NextResponse } from "next/server";
import { z } from "zod";
import { createChatCompletion } from "@/lib/ai/chat";
import { buildJobRequirementsMessages, buildMatchScoreMessages } from "@/lib/prompts";
import { getDocumentChunks } from "@/lib/qdrant";
import { parseJobRequirementsResponse, parseMatchResponse } from "@/lib/scoring";

export const runtime = "nodejs";

const matchRequestSchema = z.object({
  cvTitle: z.string().trim().min(1),
  jobTitle: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const input = matchRequestSchema.parse(await request.json());
    const [candidateChunks, jobChunks] = await Promise.all([
      getDocumentChunks({
        title: input.cvTitle,
        sourceType: "cv",
      }),
      getDocumentChunks({
        title: input.jobTitle,
        sourceType: "job",
      }),
    ]);

    if (candidateChunks.length === 0) {
      throw new MatchRequestError(`No indexed CV document found for title "${input.cvTitle}".`);
    }

    if (jobChunks.length === 0) {
      throw new MatchRequestError(`No indexed job document found for title "${input.jobTitle}".`);
    }

    const candidateProfile = joinChunkText(candidateChunks);
    const jobOffer = joinChunkText(jobChunks);
    const requirementsCompletion = await createChatCompletion(
      buildJobRequirementsMessages({
        jobOffer,
      }),
      { temperature: 0.1 },
    );
    const rubric = parseJobRequirementsResponse(requirementsCompletion.content);
    const completion = await createChatCompletion(
      buildMatchScoreMessages({
        candidateProfile,
        jobOffer,
        rubric,
      }),
      { temperature: 0.1 },
    );
    const parsed = parseMatchResponse(completion.content);

    return NextResponse.json({
      cvTitle: input.cvTitle,
      jobTitle: input.jobTitle,
      ...parsed,
      rubric,
      model: completion.model,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function joinChunkText(chunks: Array<{ text: string }>) {
  return chunks.map((chunk) => chunk.text).join("\n\n");
}

class MatchRequestError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown match scoring error";
  const status =
    error instanceof MatchRequestError ? error.status : error instanceof z.ZodError ? 400 : 500;

  return NextResponse.json(
    {
      error: message,
    },
    { status },
  );
}
