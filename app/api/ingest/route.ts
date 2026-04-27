import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmbeddings } from "@/lib/ai/embeddings";
import { chunkDocuments } from "@/lib/chunking";
import { getEmbeddingProfile } from "@/lib/embedding-profiles";
import { seedDocuments } from "@/lib/seed-documents";
import { resetDocumentCollection, upsertChunks } from "@/lib/qdrant";
import type { DocumentInput } from "@/lib/types";

export const runtime = "nodejs";

const documentSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  sourceType: z.enum(["cv", "job", "knowledge"]),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

const ingestRequestSchema = z
  .object({
    documents: z.array(documentSchema).optional(),
    embeddingProfile: z.enum(["balanced", "large"]).optional(),
    resetCollection: z.boolean().optional(),
  })
  .optional();

export async function POST(request: Request) {
  try {
    const body = await parseOptionalJson(request);
    const parsed = ingestRequestSchema.parse(body);
    const documents = (parsed?.documents ?? seedDocuments) as DocumentInput[];
    const profile = getEmbeddingProfile(parsed?.embeddingProfile);
    const chunks = chunkDocuments(documents);
    const vectors = await createEmbeddings(chunks.map((chunk) => chunk.text), profile.id);

    if (parsed?.resetCollection) {
      await resetDocumentCollection(profile.dimensions);
    }

    const result = await upsertChunks(chunks, vectors);

    return NextResponse.json({
      documents: documents.length,
      chunks: chunks.length,
      upserted: result.upserted,
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
  const message = error instanceof Error ? error.message : "Unknown ingestion error";

  return NextResponse.json(
    {
      error: message,
    },
    { status: error instanceof z.ZodError ? 400 : 500 },
  );
}
