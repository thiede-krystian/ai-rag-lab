import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/evals/quick/route";
import type { SearchResult } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  createEmbedding: vi.fn(),
  searchChunks: vi.fn(),
}));

vi.mock("@/lib/ai/embeddings", () => ({
  createEmbedding: mocks.createEmbedding,
}));

vi.mock("@/lib/qdrant", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/qdrant")>();

  return {
    ...actual,
    searchChunks: mocks.searchChunks,
  };
});

const importedResult: SearchResult = {
  id: "imported-cv-chunk-1",
  title: "Imported CV",
  sourceType: "cv",
  chunkIndex: 0,
  score: 0.92,
  text: "RAG and vector search",
};

describe("quick eval API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mocks.searchChunks.mockResolvedValue([importedResult]);
  });

  it("runs quick evals against an expected document title", async () => {
    const response = await POST(
      createQuickEvalRequest({
        queries: ["RAG experience", "vector search"],
        targetTitle: "Imported CV",
        sourceType: "cv",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      embeddingProfile: "balanced",
      model: "text-embedding-3-small",
      dimensions: 1536,
      topK: 5,
      run: {
        targetTitle: "Imported CV",
        sourceType: "cv",
        recallAtK: 1,
        passRate: 100,
      },
    });
    expect(payload.run.cases).toHaveLength(2);
    expect(payload.run.cases[0]).toMatchObject({
      query: "RAG experience",
      expectedTitle: "Imported CV",
      foundExpected: true,
      firstRelevantRank: 1,
    });
    expect(mocks.createEmbedding).toHaveBeenCalledTimes(2);
    expect(mocks.searchChunks).toHaveBeenCalledWith({
      queryVector: [0.1, 0.2, 0.3],
      topK: 5,
      filters: {
        sourceType: "cv",
      },
    });
  });

  it("rejects missing target title", async () => {
    const response = await POST(
      createQuickEvalRequest({
        targetTitle: "",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Too small");
    expect(mocks.searchChunks).not.toHaveBeenCalled();
  });
});

function createQuickEvalRequest({
  queries = ["RAG"],
  targetTitle = "Imported CV",
  sourceType = "cv",
  embeddingProfile = "balanced",
  topK = 5,
}: {
  queries?: string[];
  targetTitle?: string;
  sourceType?: string;
  embeddingProfile?: string;
  topK?: number;
} = {}) {
  return new Request("http://localhost:3000/api/evals/quick", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queries,
      targetTitle,
      sourceType,
      embeddingProfile,
      topK,
    }),
  });
}
