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
  it("passes a positive query only when expected document is in TopK above threshold", () => {
    const result = evaluateTargetTitleRetrieval({
      id: "quick-1",
      minimumScore: 0.8,
      query: "RAG experience",
      queryType: "positive",
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
    expect(result.bestExpectedScore).toBe(0.87);
    expect(result.firstRelevantRank).toBe(2);
    expect(result.reciprocalRank).toBe(0.5);
    expect(result.passed).toBe(true);
    expect(result.retrievedTitles).toEqual(["Other CV", "Imported CV"]);
  });

  it("fails a positive query when expected document score is below threshold", () => {
    const result = evaluateTargetTitleRetrieval({
      id: "quick-1",
      minimumScore: 0.95,
      query: "RAG experience",
      queryType: "positive",
      expectedTitle: "Imported CV",
      results: [
        {
          id: "imported",
          title: "Imported CV",
          sourceType: "cv",
          chunkIndex: 0,
          score: 0.44,
          text: "RAG",
        },
      ],
      latencyMs: 100,
    });

    expect(result.foundExpected).toBe(true);
    expect(result.bestExpectedScore).toBe(0.44);
    expect(result.passed).toBe(false);
    expect(result.reciprocalRank).toBe(0);
    expect(result.failureReason).toContain("below threshold");
  });

  it("passes a negative query when expected document is absent or below threshold", () => {
    const absent = evaluateTargetTitleRetrieval({
      id: "negative-1",
      minimumScore: 0.45,
      query: "moon discovering",
      queryType: "negative",
      expectedTitle: "Imported CV",
      results,
      latencyMs: 90,
    });
    const belowThreshold = evaluateTargetTitleRetrieval({
      id: "negative-2",
      minimumScore: 0.45,
      query: "moon discovering",
      queryType: "negative",
      expectedTitle: "Imported CV",
      results: [
        {
          id: "imported",
          title: "Imported CV",
          sourceType: "cv",
          chunkIndex: 0,
          score: 0.22,
          text: "Astronomy aspiration",
        },
      ],
      latencyMs: 100,
    });

    expect(absent.passed).toBe(true);
    expect(belowThreshold.passed).toBe(true);
  });

  it("fails a negative query when expected document has a high score", () => {
    const result = evaluateTargetTitleRetrieval({
      id: "negative-1",
      minimumScore: 0.45,
      query: "moon discovering",
      queryType: "negative",
      expectedTitle: "Imported CV",
      results: [
        {
          id: "imported",
          title: "Imported CV",
          sourceType: "cv",
          chunkIndex: 0,
          score: 0.71,
          text: "Moon discovery project",
        },
      ],
      latencyMs: 100,
    });

    expect(result.passed).toBe(false);
    expect(result.failureReason).toContain("Negative query matched");
  });

  it("summarizes positive and negative eval cases", () => {
    const importedResults: SearchResult[] = [
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
    ];
    const positiveHit = evaluateTargetTitleRetrieval({
      id: "positive-1",
      minimumScore: 0.45,
      query: "RAG",
      queryType: "positive",
      expectedTitle: "Imported CV",
      results: importedResults,
      latencyMs: 100,
    });
    const negativeHit = evaluateTargetTitleRetrieval({
      id: "negative-1",
      minimumScore: 0.45,
      query: "moon discovering",
      queryType: "negative",
      expectedTitle: "Imported CV",
      results,
      latencyMs: 300,
    });

    const run = summarizeQuickEvalRun({
      cases: [positiveHit, negativeHit],
      minimumScore: 0.45,
      targetTitle: "Imported CV",
      sourceType: "cv",
      model: "text-embedding-3-small",
    });

    expect(run.targetTitle).toBe("Imported CV");
    expect(run.sourceType).toBe("cv");
    expect(run.minimumScore).toBe(0.45);
    expect(run.recallAtK).toBe(1);
    expect(run.mrr).toBe(0.5);
    expect(run.averageLatencyMs).toBe(200);
    expect(run.passRate).toBe(100);
    expect(run.positivePassRate).toBe(100);
    expect(run.negativePassRate).toBe(100);
  });
});
