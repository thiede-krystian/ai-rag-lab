import { describe, expect, it } from "vitest";
import { buildRagMessages } from "@/lib/prompts";
import type { SearchResult } from "@/lib/types";

const chunks: SearchResult[] = [
  {
    id: "candidate-profile-chunk-1",
    title: "Candidate profile",
    sourceType: "cv",
    chunkIndex: 0,
    score: 0.91,
    text: "The candidate works with Next.js, TypeScript, RAG, and vector search.",
  },
];

describe("RAG prompts", () => {
  it("builds strict source-grounded RAG messages", () => {
    const messages = buildRagMessages({
      question: "Is this candidate a fit?",
      promptVersion: "rag_strict_v2",
      retrievedChunks: chunks,
    });

    expect(messages[0]?.content).toContain("Use only the provided context");
    expect(messages[1]?.content).toContain("[S1] Candidate profile / cv / chunk 1");
    expect(messages[1]?.content).toContain("Is this candidate a fit?");
  });
});
