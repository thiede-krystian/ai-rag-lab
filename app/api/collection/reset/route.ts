import { NextResponse } from "next/server";
import { z } from "zod";
import { getEmbeddingProfile } from "@/lib/embedding-profiles";
import { resetDocumentCollection } from "@/lib/qdrant";

export const runtime = "nodejs";

const resetRequestSchema = z
  .object({
    embeddingProfile: z.enum(["balanced", "large"]).optional(),
  })
  .optional();

export async function POST(request: Request) {
  try {
    const body = await parseOptionalJson(request);
    const input = resetRequestSchema.parse(body);
    const profile = getEmbeddingProfile(input?.embeddingProfile);
    const result = await resetDocumentCollection(profile.dimensions);

    return NextResponse.json({
      ...result,
      embeddingProfile: profile.id,
      model: profile.model,
      dimensions: profile.dimensions,
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
  const message = error instanceof Error ? error.message : "Unknown collection reset error";

  return NextResponse.json(
    {
      error: message,
    },
    { status: error instanceof z.ZodError ? 400 : 500 },
  );
}
