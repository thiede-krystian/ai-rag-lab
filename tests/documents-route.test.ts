import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/documents/route";

const mocks = vi.hoisted(() => ({
  listIndexedDocuments: vi.fn(),
}));

vi.mock("@/lib/qdrant", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/qdrant")>();

  return {
    ...actual,
    listIndexedDocuments: mocks.listIndexedDocuments,
  };
});

describe("document inventory API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listIndexedDocuments.mockResolvedValue([
      {
        title: "Imported CV",
        sourceType: "cv",
        chunks: 3,
        tags: ["pdf"],
      },
      {
        title: "AI Engineer Role",
        sourceType: "job",
        chunks: 2,
        tags: ["job"],
      },
    ]);
  });

  it("returns indexed documents grouped from Qdrant payloads", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.documents).toEqual([
      {
        title: "Imported CV",
        sourceType: "cv",
        chunks: 3,
        tags: ["pdf"],
      },
      {
        title: "AI Engineer Role",
        sourceType: "job",
        chunks: 2,
        tags: ["job"],
      },
    ]);
    expect(mocks.listIndexedDocuments).toHaveBeenCalledOnce();
  });
});
