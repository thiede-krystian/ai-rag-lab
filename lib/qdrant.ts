import { createHash } from "node:crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import { qdrantConfig } from "@/lib/config";
import type { ChunkRecord, SearchRequest, SearchResult, SourceType } from "@/lib/types";

type QdrantPayload = {
  chunkId: string;
  documentId: string;
  title: string;
  text: string;
  chunkIndex: number;
  sourceType: SourceType;
  tags: string[];
};

let qdrantClient: QdrantClient | null = null;

function getQdrantClient() {
  qdrantClient ??= new QdrantClient({
    url: qdrantConfig.url,
  });

  return qdrantClient;
}

export function createStablePointId(value: string) {
  const hash = createHash("sha256").update(value).digest("hex");

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${((Number.parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hash.slice(
      18,
      20,
    )}`,
    hash.slice(20, 32),
  ].join("-");
}

export async function ensureDocumentCollection(vectorSize: number) {
  const client = getQdrantClient();
  const collections = await client.getCollections();
  const exists = collections.collections.some(
    (collection) => collection.name === qdrantConfig.collection,
  );

  if (!exists) {
    await client.createCollection(qdrantConfig.collection, {
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
      hnsw_config: {
        m: 16,
        ef_construct: 100,
      },
    });
  }

  await ensurePayloadIndexes();
}

async function ensurePayloadIndexes() {
  await Promise.all([
    createPayloadIndexIfMissing("sourceType"),
    createPayloadIndexIfMissing("tags"),
    createPayloadIndexIfMissing("documentId"),
  ]);
}

async function createPayloadIndexIfMissing(fieldName: string) {
  try {
    await getQdrantClient().createPayloadIndex(qdrantConfig.collection, {
      field_name: fieldName,
      field_schema: "keyword",
      wait: true,
    });
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }
  }
}

function isAlreadyExistsError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("already exists");
}

export async function upsertChunks(chunks: ChunkRecord[], vectors: number[][]) {
  if (chunks.length !== vectors.length) {
    throw new Error("Chunk and vector counts must match before Qdrant upsert.");
  }

  if (chunks.length === 0) {
    return { upserted: 0 };
  }

  await ensureDocumentCollection(vectors[0]?.length ?? 0);

  await getQdrantClient().upsert(qdrantConfig.collection, {
    wait: true,
    points: chunks.map((chunk, index) => ({
      id: createStablePointId(chunk.id),
      vector: vectors[index] ?? [],
      payload: toPayload(chunk),
    })),
  });

  return { upserted: chunks.length };
}

export async function searchChunks({
  queryVector,
  topK,
  filters,
}: {
  queryVector: number[];
  topK: number;
  filters?: SearchRequest["filters"];
}) {
  const results = await getQdrantClient().search(qdrantConfig.collection, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
    filter: buildFilter(filters),
  });

  return results.map((result) => toSearchResult(result));
}

function toPayload(chunk: ChunkRecord): QdrantPayload {
  return {
    chunkId: chunk.id,
    documentId: chunk.documentId,
    title: chunk.title,
    text: chunk.text,
    chunkIndex: chunk.chunkIndex,
    sourceType: chunk.sourceType,
    tags: chunk.tags,
  };
}

function buildFilter(filters: SearchRequest["filters"] | undefined) {
  if (!filters?.sourceType && !filters?.tags?.length) {
    return undefined;
  }

  return {
    must: [
      ...(filters.sourceType
        ? [
            {
              key: "sourceType",
              match: { value: filters.sourceType },
            },
          ]
        : []),
      ...(filters.tags?.length
        ? [
            {
              key: "tags",
              match: { any: filters.tags },
            },
          ]
        : []),
    ],
  };
}

function toSearchResult(result: {
  id: string | number;
  score: number;
  payload?: Record<string, unknown> | null;
}): SearchResult {
  const payload = parsePayload(result.payload);

  return {
    id: payload.chunkId ?? String(result.id),
    score: result.score,
    text: payload.text ?? "",
    title: payload.title ?? "Untitled document",
    sourceType: payload.sourceType ?? "knowledge",
    chunkIndex: payload.chunkIndex ?? 0,
  };
}

function parsePayload(payload: Record<string, unknown> | null | undefined) {
  return {
    chunkId: getString(payload?.chunkId),
    title: getString(payload?.title),
    text: getString(payload?.text),
    sourceType: getSourceType(payload?.sourceType),
    chunkIndex: getNumber(payload?.chunkIndex),
  };
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function getSourceType(value: unknown): SourceType | undefined {
  return value === "cv" || value === "job" || value === "knowledge" ? value : undefined;
}
