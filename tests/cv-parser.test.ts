import { describe, expect, it } from "vitest";
import { parseCvTextToDraft } from "@/lib/cv/heuristic-parser";

describe("CV heuristic parser", () => {
  it("maps raw CV text into a structured draft", () => {
    const draft = parseCvTextToDraft(`
      Krystian Thiede
      Full Stack AI Engineer
      krystian@example.com +48 500 600 700 github.com/krystian

      Summary
      Builds RAG applications with Next.js, Node.js, TypeScript, Qdrant and LLM tooling.

      Skills
      Next.js, Node.js, TypeScript, RAG, Qdrant

      Experience
      AI Engineer at Product Lab 2022 - Present
      - Built semantic search with embeddings.
      - Implemented evaluation pipelines.

      Education
      Computer Science University 2018 - 2022
    `);

    expect(draft.personal.name).toBe("Krystian Thiede");
    expect(draft.personal.email).toBe("krystian@example.com");
    expect(draft.personal.links[0]).toMatchObject({ label: "GitHub" });
    expect(draft.summary).toContain("Builds RAG applications");
    expect(draft.skills).toContain("TypeScript");
    expect(draft.experience[0]).toMatchObject({
      role: "AI Engineer",
      company: "Product Lab",
      period: "2022 - Present",
    });
    expect(draft.experience[0]?.bullets).toContain("Built semantic search with embeddings.");
    expect(draft.education[0]?.details).toContain("Computer Science University");
  });
});
