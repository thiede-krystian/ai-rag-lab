import { describe, expect, it } from "vitest";
import { buildJobRequirementsMessages, buildMatchScoreMessages, buildRagMessages } from "@/lib/prompts";
import type { SearchResult } from "@/lib/types";

const chunks: SearchResult[] = [
  {
    id: "imported-cv-chunk-1",
    title: "Imported CV",
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
    expect(messages[1]?.content).toContain("[S1] Imported CV / cv / chunk 1");
    expect(messages[1]?.content).toContain("Is this candidate a fit?");
  });
});

describe("match prompts", () => {
  it("extracts a job-specific rubric from the job description", () => {
    const messages = buildJobRequirementsMessages({
      jobOffer: "Senior role requiring RAG, vector search, and TypeScript.",
    });

    expect(messages[0]?.content).toContain("job-specific scoring rubric");
    expect(messages[0]?.content).toContain("mustHave");
    expect(messages[1]?.content).toContain("Senior role requiring RAG");
  });

  it("scores against the extracted rubric instead of a fixed AI Engineer checklist", () => {
    const messages = buildMatchScoreMessages({
      candidateProfile: "Candidate has TypeScript and RAG experience.",
      jobOffer: "Role requires RAG and TypeScript.",
      rubric: {
        roleTitle: "AI Engineer",
        seniority: "Senior",
        mustHave: [
          {
            label: "RAG systems",
            category: "must-have",
            importance: "high",
            evidence: ["Role requires RAG."],
          },
        ],
        niceToHave: [],
        domainContext: [],
      },
    });
    const systemPrompt = messages[0]?.content ?? "";
    const userPrompt = messages[1]?.content ?? "";

    expect(systemPrompt).toContain("Do not use a generic AI Engineer checklist");
    expect(userPrompt).toContain("Extracted job-specific rubric");
    expect(userPrompt).toContain("RAG systems");
    expect(userPrompt).not.toContain(
      "AI engineering, embeddings, vector search, RAG, prompting, evals, Next.js, Node.js, and TypeScript",
    );
  });
});
