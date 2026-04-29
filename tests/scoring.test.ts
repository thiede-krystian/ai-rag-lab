import { describe, expect, it } from "vitest";
import { parseJobRequirementsResponse, parseMatchResponse } from "@/lib/scoring";

describe("job requirements parser", () => {
  it("parses a dynamic rubric from model JSON", () => {
    const parsed = parseJobRequirementsResponse(
      JSON.stringify({
        roleTitle: "AI Engineer",
        seniority: "Senior",
        mustHave: [
          {
            label: "RAG systems",
            category: "must-have",
            importance: "high",
            evidence: ["Build RAG features."],
          },
        ],
        niceToHave: ["Multimodal models"],
        domainContext: [
          {
            label: "Recruitment automation",
            category: "domain-context",
            importance: "medium",
            evidence: ["Auto-application product."],
          },
        ],
      }),
    );

    expect(parsed.roleTitle).toBe("AI Engineer");
    expect(parsed.mustHave[0]).toMatchObject({
      label: "RAG systems",
      category: "must-have",
      importance: "high",
    });
    expect(parsed.niceToHave[0]).toMatchObject({
      label: "Multimodal models",
      category: "nice-to-have",
      importance: "medium",
    });
    expect(parsed.domainContext[0]?.evidence).toEqual(["Auto-application product."]);
  });

  it("returns an empty rubric when extraction JSON is invalid", () => {
    const parsed = parseJobRequirementsResponse("not json");

    expect(parsed).toEqual({
      mustHave: [],
      niceToHave: [],
      domainContext: [],
    });
  });
});

describe("match scoring parser", () => {
  it("parses and clamps model JSON score responses", () => {
    const parsed = parseMatchResponse(
      JSON.stringify({
        score: 104,
        summary: "Strong fit.",
        strengths: ["Next.js", "RAG"],
        gaps: ["Production evals"],
        evidence: ["Mentions vector search"],
        requirementMatches: [
          {
            requirement: "RAG systems",
            category: "must-have",
            status: "strong",
            evidence: ["Candidate built RAG apps."],
          },
          {
            requirement: "Production evals",
            category: "nice-to-have",
            status: "missing",
            evidence: [],
          },
        ],
      }),
    );

    expect(parsed.score).toBe(100);
    expect(parsed.strengths).toEqual(["Next.js", "RAG"]);
    expect(parsed.gaps).toEqual(["Production evals"]);
    expect(parsed.requirementMatches).toEqual([
      {
        requirement: "RAG systems",
        category: "must-have",
        status: "strong",
        evidence: ["Candidate built RAG apps."],
      },
      {
        requirement: "Production evals",
        category: "nice-to-have",
        status: "missing",
        evidence: [],
      },
    ]);
  });

  it("falls back gracefully for non-JSON model output", () => {
    const parsed = parseMatchResponse("A strong match overall.");

    expect(parsed.score).toBe(0);
    expect(parsed.summary).toBe("A strong match overall.");
    expect(parsed.gaps).toEqual(["The model returned non-JSON output."]);
    expect(parsed.requirementMatches).toEqual([]);
  });
});
