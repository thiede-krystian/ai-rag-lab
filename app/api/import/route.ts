import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmbeddings } from "@/lib/ai/embeddings";
import { chunkDocuments } from "@/lib/chunking";
import { getEmbeddingProfile } from "@/lib/embedding-profiles";
import { extractPdfText } from "@/lib/pdf";
import { resetDocumentCollection, upsertChunks } from "@/lib/qdrant";
import type { DocumentInput, ImportMode, SourceType } from "@/lib/types";

export const runtime = "nodejs";

const importFieldsSchema = z.object({
  title: z.string().optional(),
  sourceType: z.enum(["cv", "job", "knowledge"]).default("cv"),
  tags: z.array(z.string()).default([]),
  embeddingProfile: z.enum(["balanced", "large"]).optional(),
  mode: z.enum(["append", "replace"]).default("append"),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = getPdfFile(formData);
    const filename = getSafeFilename(file.name);
    const fileData = await file.arrayBuffer();
    const fields = importFieldsSchema.parse({
      title: getStringField(formData, "title"),
      sourceType: getStringField(formData, "sourceType") ?? "cv",
      tags: parseTags(getStringField(formData, "tags")),
      embeddingProfile: getStringField(formData, "embeddingProfile"),
      mode: getStringField(formData, "mode") ?? "append",
    });
    const profile = getEmbeddingProfile(fields.embeddingProfile);
    const extracted = await extractPdfText(fileData);

    if (!extracted.text) {
      throw new ImportRequestError(
        "PDF does not contain extractable text. Searchable PDFs are supported; scanned PDFs require OCR, which is not implemented yet.",
      );
    }

    const document: DocumentInput = {
      id: createImportedDocumentId(fileData),
      title: fields.title?.trim() || getTitleFromFilename(filename),
      sourceType: fields.sourceType as SourceType,
      content: extracted.text,
      tags: fields.tags,
    };
    const chunks = chunkDocuments([document]);

    if (chunks.length === 0) {
      throw new ImportRequestError("PDF text was extracted, but no indexable chunks were created.");
    }

    const vectors = await createEmbeddings(
      chunks.map((chunk) => chunk.text),
      profile.id,
    );

    if (fields.mode === "replace") {
      await resetDocumentCollection(profile.dimensions);
    }

    const result = await upsertChunks(chunks, vectors);

    return NextResponse.json({
      filename,
      title: document.title,
      sourceType: document.sourceType,
      tags: document.tags,
      mode: fields.mode as ImportMode,
      documents: 1,
      chunks: chunks.length,
      upserted: result.upserted,
      extractedCharacters: extracted.characters,
      pageCount: extracted.pageCount,
      embeddingProfile: profile.id,
      model: profile.model,
      dimensions: profile.dimensions,
      pdfjsVersion: extracted.pdfjsVersion,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function getPdfFile(formData: FormData): File {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ImportRequestError("PDF file is required.");
  }

  const filename = getSafeFilename(file.name);
  const isPdf = file.type === "application/pdf" || filename.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new ImportRequestError("Only PDF files are supported.");
  }

  if (file.size === 0) {
    throw new ImportRequestError("PDF file is empty.");
  }

  return file;
}

function getStringField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value : undefined;
}

function parseTags(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return normalizeTags(parsed);
    }
  } catch {
    return normalizeTags(value.split(","));
  }

  return normalizeTags(value.split(","));
}

function normalizeTags(values: unknown[]) {
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getSafeFilename(filename: string) {
  return filename.split(/[\\/]/).pop() || "document.pdf";
}

function getTitleFromFilename(filename: string) {
  return filename.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim() || "Imported PDF";
}

function createImportedDocumentId(fileData: ArrayBuffer) {
  const hash = createHash("sha256").update(new Uint8Array(fileData)).digest("hex").slice(0, 16);

  return `pdf-${hash}`;
}

class ImportRequestError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown import error";
  const status =
    error instanceof ImportRequestError ? error.status : error instanceof z.ZodError ? 400 : 500;

  return NextResponse.json(
    {
      error: message,
    },
    { status },
  );
}
