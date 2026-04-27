import { describe, expect, it } from "vitest";
import { evaluateRetrievedChunks, summarizeEvalRun } from "@/lib/evals";
import type { EvalCase, SearchResult } from "@/lib/types";

const evalCase: EvalCase = {
  id: "rag-case",
  query: "rag pipeline",
  expectedChunkIds: ["expected-chunk"],
};

const results: SearchResult[] = [
  {
    id: "other-chunk",
    title: "Other",
    sourceType: "knowledge",
    chunkIndex: 0,
    score: 0.91,
    text: "Other text",
  },
  {
    id: "expected-chunk",
    title: "Expected",
    sourceType: "knowledge",
    chunkIndex: 1,
    score: 0.87,
    text: "Expected text",
  },
];

describe("eval metrics", () => {
  it("tracks first relevant rank and reciprocal rank", () => {
    const result = evaluateRetrievedChunks({
      evalCase,
      results,
      latencyMs: 42,
    });

    expect(result.foundExpected).toBe(true);
    expect(result.firstRelevantRank).toBe(2);
    expect(result.reciprocalRank).toBe(0.5);
    expect(result.latencyMs).toBe(42);
  });

  it("summarizes retrieval cases into run metrics", () => {
    const hit = evaluateRetrievedChunks({
      evalCase,
      results,
      latencyMs: 100,
    });
    const miss = evaluateRetrievedChunks({
      evalCase: { ...evalCase, id: "miss", expectedChunkIds: ["missing-chunk"] },
      results,
      latencyMs: 200,
    });

    const run = summarizeEvalRun({
      cases: [hit, miss],
      model: "text-embedding-3-small",
      promptVersion: "rag_v1",
    });

    expect(run.recallAt5).toBe(0.5);
    expect(run.mrr).toBe(0.25);
    expect(run.averageLatencyMs).toBe(150);
    expect(run.passRate).toBe(50);
  });
});
