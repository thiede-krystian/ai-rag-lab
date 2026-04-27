import { describe, expect, it } from "vitest";
import { chunkDocument, chunkDocuments, createDocumentId, normalizeText } from "@/lib/chunking";
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
    expect(createDocumentId({ ...document, id: undefined, title: "Senior AI Specialist!" })).toBe(
      "senior-ai-specialist",
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

  it("chunks an explicit document list", () => {
    const documents: DocumentInput[] = [
      document,
      {
        id: "job-role",
        title: "Job Role",
        sourceType: "job",
        content: "one two three four five six seven eight nine ten eleven twelve",
      },
    ];
    const chunks = chunkDocuments(documents, {
      targetWords: 5,
      overlapWords: 2,
    });

    expect(chunks).toHaveLength(8);
    expect(chunks.map((chunk) => chunk.documentId)).toContain("demo-doc");
    expect(chunks.map((chunk) => chunk.documentId)).toContain("job-role");
  });
});
