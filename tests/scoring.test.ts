import { describe, expect, it } from "vitest";
import { parseMatchResponse } from "@/lib/scoring";

describe("match scoring parser", () => {
  it("parses and clamps model JSON score responses", () => {
    const parsed = parseMatchResponse(
      JSON.stringify({
        score: 104,
        summary: "Strong fit.",
        strengths: ["Next.js", "RAG"],
        gaps: ["Production evals"],
        evidence: ["Mentions vector search"],
      }),
    );

    expect(parsed.score).toBe(100);
    expect(parsed.strengths).toEqual(["Next.js", "RAG"]);
    expect(parsed.gaps).toEqual(["Production evals"]);
  });

  it("falls back gracefully for non-JSON model output", () => {
    const parsed = parseMatchResponse("A strong match overall.");

    expect(parsed.score).toBe(0);
    expect(parsed.summary).toBe("A strong match overall.");
    expect(parsed.gaps).toEqual(["The model returned non-JSON output."]);
  });
});
