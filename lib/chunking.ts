import type { ChunkRecord, DocumentInput } from "@/lib/types";

export type ChunkingOptions = {
  targetWords?: number;
  overlapWords?: number;
};

const DEFAULT_TARGET_WORDS = 90;
const DEFAULT_OVERLAP_WORDS = 18;

export function createDocumentId(document: DocumentInput, index = 0) {
  if (document.id) {
    return document.id;
  }

  const slug = document.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || `document-${index + 1}`;
}

export function normalizeText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function splitIntoWords(value: string) {
  return normalizeText(value).replace(/\n+/g, " ").split(/\s+/).filter(Boolean);
}

export function chunkDocument(
  document: DocumentInput,
  index = 0,
  options: ChunkingOptions = {},
): ChunkRecord[] {
  const targetWords = options.targetWords ?? DEFAULT_TARGET_WORDS;
  const overlapWords = options.overlapWords ?? DEFAULT_OVERLAP_WORDS;

  if (targetWords <= 0) {
    throw new Error("targetWords must be greater than 0");
  }

  if (overlapWords < 0 || overlapWords >= targetWords) {
    throw new Error("overlapWords must be at least 0 and lower than targetWords");
  }

  const words = splitIntoWords(document.content);

  if (words.length === 0) {
    return [];
  }

  const documentId = createDocumentId(document, index);
  const step = targetWords - overlapWords;
  const chunks: ChunkRecord[] = [];

  for (let start = 0; start < words.length; start += step) {
    const text = words.slice(start, start + targetWords).join(" ");

    chunks.push({
      id: `${documentId}-chunk-${chunks.length + 1}`,
      documentId,
      title: document.title,
      text,
      chunkIndex: chunks.length,
      sourceType: document.sourceType,
      tags: document.tags ?? [],
    });

    if (start + targetWords >= words.length) {
      break;
    }
  }

  return chunks;
}

export function chunkDocuments(documents: DocumentInput[], options: ChunkingOptions = {}) {
  return documents.flatMap((document, index) => chunkDocument(document, index, options));
}
