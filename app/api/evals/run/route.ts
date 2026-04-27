import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmbedding } from "@/lib/ai/embeddings";
import { getEmbeddingProfile } from "@/lib/embedding-profiles";
import { evaluateRetrievedChunks, summarizeEvalRun } from "@/lib/evals";
import { goldenSet } from "@/lib/golden-set";
import { searchChunks } from "@/lib/qdrant";
import type { EvalCaseResult, PromptVersion } from "@/lib/types";

export const runtime = "nodejs";

const evalRunRequestSchema = z
  .object({
    embeddingProfile: z.enum(["balanced", "large"]).optional(),
    promptVersions: z
      .array(z.enum(["rag_v1", "rag_strict_v2", "match_score_v1"]))
      .default(["rag_v1", "rag_strict_v2"]),
    topK: z.number().int().min(1).max(20).default(5),
  })
  .optional();

export async function POST(request: Request) {
  try {
    const body = await parseOptionalJson(request);
    const input = evalRunRequestSchema.parse(body);
    const profile = getEmbeddingProfile(input?.embeddingProfile);
    const topK = input?.topK ?? 5;
    const promptVersions = input?.promptVersions ?? ["rag_v1", "rag_strict_v2"];
    const caseResults: EvalCaseResult[] = [];

    for (const evalCase of goldenSet) {
      const startedAt = Date.now();
      const queryVector = await createEmbedding(evalCase.query, profile.id);
      const results = await searchChunks({
        queryVector,
        topK,
        filters: evalCase.expectedSourceType
          ? {
              sourceType: evalCase.expectedSourceType,
            }
          : undefined,
      });

      caseResults.push(
        evaluateRetrievedChunks({
          evalCase,
          results,
          latencyMs: Date.now() - startedAt,
        }),
      );
    }

    return NextResponse.json({
      embeddingProfile: profile.id,
      model: profile.model,
      dimensions: profile.dimensions,
      topK,
      runs: promptVersions.map((promptVersion) =>
        summarizeEvalRun({
          cases: caseResults,
          model: profile.model,
          promptVersion: promptVersion as PromptVersion,
        }),
      ),
    });
  } catch (error) {
    return jsonError(error);
  }
}

async function parseOptionalJson(request: Request) {
  const text = await request.text();

  if (!text.trim()) {
    return undefined;
  }

  return JSON.parse(text);
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown eval run error";

  return NextResponse.json(
    {
      error: message,
    },
    { status: error instanceof z.ZodError ? 400 : 500 },
  );
}
