import { describe, expect, it } from "vitest";
import { evaluateTargetTitleRetrieval, summarizeQuickEvalRun } from "@/lib/evals";
import type { SearchResult } from "@/lib/types";

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
  it("evaluates quick retrieval by expected document title", () => {
    const result = evaluateTargetTitleRetrieval({
      id: "quick-1",
      query: "RAG experience",
      expectedTitle: "Imported CV",
      results: [
        {
          id: "other",
          title: "Other CV",
          sourceType: "cv",
          chunkIndex: 0,
          score: 0.91,
          text: "Other",
        },
        {
          id: "imported",
          title: "Imported CV",
          sourceType: "cv",
          chunkIndex: 1,
          score: 0.87,
          text: "RAG",
        },
      ],
      latencyMs: 80,
    });

    expect(result.foundExpected).toBe(true);
    expect(result.firstRelevantRank).toBe(2);
    expect(result.reciprocalRank).toBe(0.5);
    expect(result.retrievedTitles).toEqual(["Other CV", "Imported CV"]);
  });

  it("summarizes quick eval cases", () => {
    const hit = evaluateTargetTitleRetrieval({
      id: "quick-1",
      query: "RAG",
      expectedTitle: "Imported CV",
      results,
      latencyMs: 100,
    });
    const miss = evaluateTargetTitleRetrieval({
      id: "quick-2",
      query: "Rust",
      expectedTitle: "Imported CV",
      results,
      latencyMs: 300,
    });

    const run = summarizeQuickEvalRun({
      cases: [hit, miss],
      targetTitle: "Imported CV",
      sourceType: "cv",
      model: "text-embedding-3-small",
    });

    expect(run.targetTitle).toBe("Imported CV");
    expect(run.sourceType).toBe("cv");
    expect(run.recallAtK).toBe(0);
    expect(run.mrr).toBe(0);
    expect(run.averageLatencyMs).toBe(200);
    expect(run.passRate).toBe(0);
  });
});
