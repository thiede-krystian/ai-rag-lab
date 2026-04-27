import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmbedding } from "@/lib/ai/embeddings";
import { searchChunks } from "@/lib/qdrant";

export const runtime = "nodejs";

const searchRequestSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(20).default(5),
  filters: z
    .object({
      sourceType: z.enum(["cv", "job", "knowledge"]).optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const input = searchRequestSchema.parse(await request.json());
    const queryVector = await createEmbedding(input.query);
    const results = await searchChunks({
      queryVector,
      topK: input.topK,
      filters: input.filters,
    });

    return NextResponse.json({
      query: input.query,
      topK: input.topK,
      results,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown search error";

  return NextResponse.json(
    {
      error: message,
    },
    { status: error instanceof z.ZodError ? 400 : 500 },
  );
}
