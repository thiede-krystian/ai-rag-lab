import { createHash } from "node:crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import { qdrantConfig } from "@/lib/config";
import type {
  ChunkRecord,
  IndexedDocument,
  SearchRequest,
  SearchResult,
  SourceType,
} from "@/lib/types";

export type QdrantPayload = {
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
  validateQdrantConfig();

  qdrantClient ??= new QdrantClient({
    url: qdrantConfig.url,
    apiKey: qdrantConfig.apiKey,
  });

  return qdrantClient;
}

function validateQdrantConfig() {
  if (qdrantConfig.target === "cloud" && !qdrantConfig.apiKey) {
    throw new Error("QDRANT_API_KEY is required when QDRANT_TARGET resolves to cloud.");
  }

  if (qdrantConfig.target === "cloud" && qdrantConfig.url === "http://localhost:6333") {
    throw new Error("QDRANT_CLOUD_URL or QDRANT_URL is required when QDRANT_TARGET resolves to cloud.");
  }
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
  const exists = await collectionExists();

  if (!exists) {
    await createDocumentCollection(vectorSize);
  } else {
    const collectionInfo = await client.getCollection(qdrantConfig.collection);
    const existingVectorSize = getCollectionVectorSize(collectionInfo);

    if (existingVectorSize && existingVectorSize !== vectorSize) {
      throw new Error(
        `Qdrant collection uses ${existingVectorSize}-dimensional vectors, but the selected embedding profile produced ${vectorSize}. Reset the collection before importing documents with this profile.`,
      );
    }
  }

  await ensurePayloadIndexes();
}

export async function resetDocumentCollection(vectorSize: number) {
  if (await collectionExists()) {
    await getQdrantClient().deleteCollection(qdrantConfig.collection, {
      timeout: 30,
    });
  }

  await createDocumentCollection(vectorSize);
  await ensurePayloadIndexes();

  return {
    collection: qdrantConfig.collection,
    vectorSize,
  };
}

async function collectionExists() {
  const collections = await getQdrantClient().getCollections();

  return collections.collections.some((collection) => collection.name === qdrantConfig.collection);
}

async function createDocumentCollection(vectorSize: number) {
  await getQdrantClient().createCollection(qdrantConfig.collection, {
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

async function ensurePayloadIndexes() {
  await Promise.all([
    createPayloadIndexIfMissing("sourceType"),
    createPayloadIndexIfMissing("tags"),
    createPayloadIndexIfMissing("documentId"),
    createPayloadIndexIfMissing("title"),
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

export async function listIndexedDocuments() {
  if (!(await collectionExists())) {
    return [];
  }

  await ensurePayloadIndexes();

  const payloads = await scrollPayloads();

  return groupDocumentPayloads(payloads);
}

export async function getDocumentChunks({
  title,
  sourceType,
}: {
  title: string;
  sourceType: SourceType;
}) {
  if (!(await collectionExists())) {
    return [];
  }

  await ensurePayloadIndexes();

  const payloads = await scrollPayloads(buildDocumentFilter({ title, sourceType }));

  return payloads
    .map(toChunkRecord)
    .filter((chunk): chunk is ChunkRecord => Boolean(chunk))
    .sort((left, right) => left.chunkIndex - right.chunkIndex);
}

export function groupDocumentPayloads(payloads: Array<Partial<QdrantPayload>>): IndexedDocument[] {
  const documents = new Map<string, IndexedDocument>();

  for (const payload of payloads) {
    if (!payload.title || !payload.sourceType) {
      continue;
    }

    const key = `${payload.sourceType}\u0000${payload.title}`;
    const current = documents.get(key);
    const tags = [...new Set([...(current?.tags ?? []), ...(payload.tags ?? [])])].sort();

    documents.set(key, {
      title: payload.title,
      sourceType: payload.sourceType,
      chunks: (current?.chunks ?? 0) + 1,
      tags,
    });
  }

  return [...documents.values()].sort((left, right) => {
    const typeOrder = left.sourceType.localeCompare(right.sourceType);

    return typeOrder === 0 ? left.title.localeCompare(right.title) : typeOrder;
  });
}

async function scrollPayloads(filter?: ReturnType<typeof buildDocumentFilter>) {
  const payloads: Array<Partial<QdrantPayload>> = [];
  let offset: string | number | Record<string, unknown> | null | undefined;

  do {
    const page = await getQdrantClient().scroll(qdrantConfig.collection, {
      filter,
      limit: 100,
      offset,
      with_payload: true,
      with_vector: false,
    });

    payloads.push(...page.points.map((point) => parsePayload(point.payload)));
    offset = page.next_page_offset;
  } while (offset);

  return payloads;
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

function toChunkRecord(payload: Partial<QdrantPayload>): ChunkRecord | null {
  if (
    !payload.chunkId ||
    !payload.documentId ||
    !payload.title ||
    !payload.text ||
    !payload.sourceType ||
    typeof payload.chunkIndex !== "number"
  ) {
    return null;
  }

  return {
    id: payload.chunkId,
    documentId: payload.documentId,
    title: payload.title,
    text: payload.text,
    chunkIndex: payload.chunkIndex,
    sourceType: payload.sourceType,
    tags: payload.tags ?? [],
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

function buildDocumentFilter({ title, sourceType }: { title: string; sourceType: SourceType }) {
  return {
    must: [
      {
        key: "sourceType",
        match: { value: sourceType },
      },
      {
        key: "title",
        match: { value: title },
      },
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
    documentId: getString(payload?.documentId),
    title: getString(payload?.title),
    text: getString(payload?.text),
    sourceType: getSourceType(payload?.sourceType),
    chunkIndex: getNumber(payload?.chunkIndex),
    tags: getStringArray(payload?.tags),
  };
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getSourceType(value: unknown): SourceType | undefined {
  return value === "cv" || value === "job" || value === "knowledge" ? value : undefined;
}

function getCollectionVectorSize(collectionInfo: unknown) {
  const vectors = (collectionInfo as { config?: { params?: { vectors?: unknown } } }).config?.params
    ?.vectors;

  if (isVectorParams(vectors)) {
    return vectors.size;
  }

  return undefined;
}

function isVectorParams(value: unknown): value is { size: number } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "size" in value &&
      typeof (value as { size?: unknown }).size === "number",
  );
}
