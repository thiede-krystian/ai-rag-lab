import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmbedding } from "@/lib/ai/embeddings";
import { getEmbeddingProfile } from "@/lib/embedding-profiles";
import { evaluateTargetTitleRetrieval, summarizeQuickEvalRun } from "@/lib/evals";
import { searchChunks } from "@/lib/qdrant";

export const runtime = "nodejs";

const quickEvalRequestSchema = z.object({
  queries: z.array(z.string().trim().min(1)).min(1).max(12),
  targetTitle: z.string().trim().min(1),
  sourceType: z.enum(["cv", "job", "knowledge"]).optional(),
  embeddingProfile: z.enum(["balanced", "large"]).optional(),
  topK: z.number().int().min(1).max(20).default(5),
});

export async function POST(request: Request) {
  try {
    const input = quickEvalRequestSchema.parse(await request.json());
    const profile = getEmbeddingProfile(input.embeddingProfile);
    const cases = [];

    for (const [index, query] of input.queries.entries()) {
      const startedAt = Date.now();
      const queryVector = await createEmbedding(query, profile.id);
      const results = await searchChunks({
        queryVector,
        topK: input.topK,
        filters: input.sourceType
          ? {
              sourceType: input.sourceType,
            }
          : undefined,
      });

      cases.push(
        evaluateTargetTitleRetrieval({
          id: `quick-${index + 1}`,
          query,
          expectedTitle: input.targetTitle,
          results,
          latencyMs: Date.now() - startedAt,
        }),
      );
    }

    return NextResponse.json({
      embeddingProfile: profile.id,
      model: profile.model,
      dimensions: profile.dimensions,
      topK: input.topK,
      run: summarizeQuickEvalRun({
        cases,
        targetTitle: input.targetTitle,
        sourceType: input.sourceType,
        model: profile.model,
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown quick eval error";

  return NextResponse.json(
    {
      error: message,
    },
    { status: error instanceof z.ZodError ? 400 : 500 },
  );
}
