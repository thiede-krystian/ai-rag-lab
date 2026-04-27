import { describe, expect, it } from "vitest";
import { createStablePointId, groupDocumentPayloads } from "@/lib/qdrant";

describe("qdrant helpers", () => {
  it("creates deterministic uuid-like point ids for chunk ids", () => {
    const pointId = createStablePointId("imported-cv-chunk-1");

    expect(pointId).toBe(createStablePointId("imported-cv-chunk-1"));
    expect(pointId).not.toBe(createStablePointId("imported-cv-chunk-2"));
    expect(pointId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("groups Qdrant payloads by title and source type", () => {
    const documents = groupDocumentPayloads([
      {
        title: "Imported CV",
        sourceType: "cv",
        tags: ["pdf", "cv"],
      },
      {
        title: "Imported CV",
        sourceType: "cv",
        tags: ["linkedin"],
      },
      {
        title: "AI Engineer Role",
        sourceType: "job",
        tags: ["job"],
      },
    ]);

    expect(documents).toEqual([
      {
        title: "Imported CV",
        sourceType: "cv",
        chunks: 2,
        tags: ["cv", "linkedin", "pdf"],
      },
      {
        title: "AI Engineer Role",
        sourceType: "job",
        chunks: 1,
        tags: ["job"],
      },
    ]);
  });
});
