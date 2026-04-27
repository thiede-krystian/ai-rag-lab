import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ingest/route";

const mocks = vi.hoisted(() => ({
  createEmbeddings: vi.fn(),
  resetDocumentCollection: vi.fn(),
  upsertChunks: vi.fn(),
}));

vi.mock("@/lib/ai/embeddings", () => ({
  createEmbeddings: mocks.createEmbeddings,
}));

vi.mock("@/lib/qdrant", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/qdrant")>();

  return {
    ...actual,
    resetDocumentCollection: mocks.resetDocumentCollection,
    upsertChunks: mocks.upsertChunks,
  };
});

describe("document ingest API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createEmbeddings.mockImplementation(async (input: string[]) =>
      input.map(() => [0.1, 0.2, 0.3]),
    );
    mocks.upsertChunks.mockImplementation(async (chunks: unknown[]) => ({
      upserted: chunks.length,
    }));
    mocks.resetDocumentCollection.mockResolvedValue({
      collection: "ai_rag_lab_documents",
      vectorSize: 1536,
    });
  });

  it("rejects an empty request instead of indexing fallback documents", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/ingest", {
        method: "POST",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Invalid input");
    expect(mocks.createEmbeddings).not.toHaveBeenCalled();
    expect(mocks.upsertChunks).not.toHaveBeenCalled();
  });

  it("ingests explicitly provided documents", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documents: [
            {
              title: "AI Engineer Role",
              sourceType: "job",
              content: "Build RAG, semantic search, embeddings, evals, and TypeScript features.",
              tags: ["job"],
            },
          ],
          embeddingProfile: "balanced",
          resetCollection: true,
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      documents: 1,
      chunks: 1,
      upserted: 1,
      embeddingProfile: "balanced",
      dimensions: 1536,
    });
    expect(mocks.resetDocumentCollection).toHaveBeenCalledWith(1536);
    expect(mocks.upsertChunks).toHaveBeenCalledOnce();
  });
});
