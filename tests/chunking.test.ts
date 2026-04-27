import { describe, expect, it } from "vitest";
import { chunkDocument, chunkDocuments, createDocumentId, normalizeText } from "@/lib/chunking";
import { seedDocuments } from "@/lib/seed-documents";
import type { DocumentInput } from "@/lib/types";

const document: DocumentInput = {
  id: "demo-doc",
  title: "Demo Document",
  sourceType: "knowledge",
  tags: ["demo"],
  content: "one two three four five six seven eight nine ten eleven twelve",
};

describe("chunking", () => {
  it("normalizes user-provided text while keeping paragraph boundaries", () => {
    expect(normalizeText(" First line  \r\n\r\n\tSecond line ")).toBe("First line\nSecond line");
  });

  it("creates stable document ids", () => {
    expect(createDocumentId(document)).toBe("demo-doc");
    expect(createDocumentId({ ...document, id: undefined, title: "AI Engineer Role!" })).toBe(
      "ai-engineer-role",
    );
  });

  it("splits documents into deterministic overlapping chunks", () => {
    const chunks = chunkDocument(document, 0, {
      targetWords: 5,
      overlapWords: 2,
    });

    expect(chunks).toHaveLength(4);
    expect(chunks[0]).toMatchObject({
      id: "demo-doc-chunk-1",
      documentId: "demo-doc",
      chunkIndex: 0,
      sourceType: "knowledge",
      tags: ["demo"],
      text: "one two three four five",
    });
    expect(chunks[1]?.text).toBe("four five six seven eight");
  });

  it("returns no chunks for empty content", () => {
    expect(chunkDocument({ ...document, content: " \n\n " })).toEqual([]);
  });

  it("rejects invalid chunk sizes", () => {
    expect(() => chunkDocument(document, 0, { targetWords: 0 })).toThrow(
      "targetWords must be greater than 0",
    );
    expect(() => chunkDocument(document, 0, { targetWords: 5, overlapWords: 5 })).toThrow(
      "overlapWords must be at least 0 and lower than targetWords",
    );
  });

  it("chunks the bundled seed corpus", () => {
    const chunks = chunkDocuments(seedDocuments);

    expect(seedDocuments).toHaveLength(3);
    expect(chunks.length).toBeGreaterThan(seedDocuments.length);
    expect(chunks.map((chunk) => chunk.documentId)).toContain("candidate-profile");
    expect(chunks.map((chunk) => chunk.documentId)).toContain("ai-engineer-role");
    expect(chunks.map((chunk) => chunk.documentId)).toContain("rag-evals-notes");
  });
});
