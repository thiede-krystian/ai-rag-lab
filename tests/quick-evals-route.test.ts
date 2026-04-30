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
      minimumScore: 0.45,
      run: {
        targetTitle: "Imported CV",
        sourceType: "cv",
        minimumScore: 0.45,
        recallAtK: 1,
        passRate: 100,
      },
    });
    expect(payload.run.cases).toHaveLength(2);
    expect(payload.run.cases[0]).toMatchObject({
      query: "RAG experience",
      queryType: "positive",
      expectedTitle: "Imported CV",
      foundExpected: true,
      firstRelevantRank: 1,
      bestExpectedScore: 0.92,
      passed: true,
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

  it("supports positive and negative queries with minimum score", async () => {
    mocks.searchChunks.mockReset();
    mocks.searchChunks.mockResolvedValueOnce([importedResult]);
    mocks.searchChunks.mockResolvedValueOnce([]);

    const response = await POST(
      createQuickEvalRequest({
        positiveQueries: ["RAG experience"],
        negativeQueries: ["moon discovering"],
        queries: undefined,
        minimumScore: 0.7,
        targetTitle: "Imported CV",
        sourceType: "cv",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.minimumScore).toBe(0.7);
    expect(payload.run).toMatchObject({
      minimumScore: 0.7,
      positivePassRate: 100,
      negativePassRate: 100,
      passRate: 100,
    });
    expect(payload.run.cases).toHaveLength(2);
    expect(payload.run.cases[0]).toMatchObject({
      queryType: "positive",
      passed: true,
    });
    expect(payload.run.cases[1]).toMatchObject({
      queryType: "negative",
      foundExpected: false,
      passed: true,
    });
    expect(mocks.createEmbedding).toHaveBeenCalledTimes(2);
  });

  it("defaults minimum score to 0.45 for backward-compatible queries", async () => {
    const response = await POST(
      createQuickEvalRequest({
        queries: ["RAG experience"],
        targetTitle: "Imported CV",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.run.minimumScore).toBe(0.45);
    expect(payload.run.cases[0].queryType).toBe("positive");
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
  positiveQueries,
  negativeQueries,
  targetTitle = "Imported CV",
  sourceType = "cv",
  embeddingProfile = "balanced",
  topK = 5,
  minimumScore,
}: {
  queries?: string[] | undefined;
  positiveQueries?: string[];
  negativeQueries?: string[];
  targetTitle?: string;
  sourceType?: string;
  embeddingProfile?: string;
  topK?: number;
  minimumScore?: number;
} = {}) {
  return new Request("http://localhost:3000/api/evals/quick", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queries,
      positiveQueries,
      negativeQueries,
      targetTitle,
      sourceType,
      embeddingProfile,
      topK,
      minimumScore,
    }),
  });
}
