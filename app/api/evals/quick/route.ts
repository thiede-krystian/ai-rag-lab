import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmbedding } from "@/lib/ai/embeddings";
import { getEmbeddingProfile } from "@/lib/embedding-profiles";
import {
  defaultQuickEvalMinimumScore,
  evaluateTargetTitleRetrieval,
  summarizeQuickEvalRun,
} from "@/lib/evals";
import { searchChunks } from "@/lib/qdrant";

export const runtime = "nodejs";

const queryListSchema = z.array(z.string().trim().min(1)).max(12).optional();

const quickEvalRequestSchema = z.object({
  queries: queryListSchema,
  positiveQueries: queryListSchema,
  negativeQueries: queryListSchema,
  targetTitle: z.string().trim().min(1),
  sourceType: z.enum(["cv", "job", "knowledge"]).optional(),
  embeddingProfile: z.enum(["balanced", "large"]).optional(),
  topK: z.number().int().min(1).max(20).default(5),
  minimumScore: z.number().min(0).max(1).default(defaultQuickEvalMinimumScore),
});

export async function POST(request: Request) {
  try {
    const input = quickEvalRequestSchema.parse(await request.json());
    const profile = getEmbeddingProfile(input.embeddingProfile);
    const positiveQueries = input.positiveQueries ?? input.queries ?? [];
    const negativeQueries = input.negativeQueries ?? [];
    const queryCases = [
      ...positiveQueries.map((query, index) => ({
        id: `positive-${index + 1}`,
        query,
        queryType: "positive" as const,
      })),
      ...negativeQueries.map((query, index) => ({
        id: `negative-${index + 1}`,
        query,
        queryType: "negative" as const,
      })),
    ];

    if (queryCases.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one positive or negative query." },
        { status: 400 },
      );
    }

    if (queryCases.length > 16) {
      return NextResponse.json(
        { error: "Provide at most 16 total positive and negative queries." },
        { status: 400 },
      );
    }

    const cases = [];

    for (const queryCase of queryCases) {
      const startedAt = Date.now();
      const queryVector = await createEmbedding(queryCase.query, profile.id);
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
          id: queryCase.id,
          minimumScore: input.minimumScore,
          query: queryCase.query,
          queryType: queryCase.queryType,
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
      minimumScore: input.minimumScore,
      run: summarizeQuickEvalRun({
        cases,
        minimumScore: input.minimumScore,
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
