import { NextResponse } from "next/server";
import { z } from "zod";
import { createChatCompletion } from "@/lib/ai/chat";
import { createEmbedding } from "@/lib/ai/embeddings";
import { buildRagMessages } from "@/lib/prompts";
import { searchChunks } from "@/lib/qdrant";

export const runtime = "nodejs";

const chatRequestSchema = z.object({
  question: z.string().min(1),
  topK: z.number().int().min(1).max(20).default(5),
  embeddingProfile: z.enum(["balanced", "large"]).optional(),
  promptVersion: z.enum(["rag_v1", "rag_strict_v2", "match_score_v1"]).default("rag_strict_v2"),
});

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const input = chatRequestSchema.parse(await request.json());
    const queryVector = await createEmbedding(input.question, input.embeddingProfile);
    const retrievedChunks = await searchChunks({
      queryVector,
      topK: input.topK,
    });
    const completion = await createChatCompletion(
      buildRagMessages({
        question: input.question,
        promptVersion: input.promptVersion,
        retrievedChunks,
      }),
    );

    return NextResponse.json({
      answer: completion.content,
      citations: retrievedChunks,
      retrievedChunks,
      model: completion.model,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown chat error";

  return NextResponse.json(
    {
      error: message,
    },
    { status: error instanceof z.ZodError ? 400 : 500 },
  );
}
