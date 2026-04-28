import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/import/route";

const mocks = vi.hoisted(() => ({
  createEmbeddings: vi.fn(),
  extractPdfText: vi.fn(),
  resetDocumentCollection: vi.fn(),
  upsertChunks: vi.fn(),
}));

vi.mock("@/lib/ai/embeddings", () => ({
  createEmbeddings: mocks.createEmbeddings,
}));

vi.mock("@/lib/pdf", () => ({
  extractPdfText: mocks.extractPdfText,
}));

vi.mock("@/lib/qdrant", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/qdrant")>();

  return {
    ...actual,
    resetDocumentCollection: mocks.resetDocumentCollection,
    upsertChunks: mocks.upsertChunks,
  };
});

const pdfText =
  "AI Engineer CV with RAG, vector search, embeddings, eval pipelines, prompting, and TypeScript.";

describe("PDF import API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.extractPdfText.mockResolvedValue({
      text: pdfText,
      pageCount: 2,
      characters: pdfText.length,
      pdfjsVersion: "5.6.205",
    });
    mocks.createEmbeddings.mockImplementation(async (input: string[]) =>
      input.map(() => [0.1, 0.2, 0.3]),
    );
    mocks.upsertChunks.mockImplementation(async (chunks: unknown[]) => ({
      upserted: chunks.length,
    }));
    mocks.resetDocumentCollection.mockResolvedValue({
      collection: "ai_rag_lab_documents",
      vectorSize: 1536,
    });
  });

  it("rejects non-PDF files", async () => {
    const response = await POST(
      createImportRequest({
        file: new File(["plain text"], "cv.txt", { type: "text/plain" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Only PDF files are supported.");
    expect(mocks.extractPdfText).not.toHaveBeenCalled();
  });

  it("exposes a lightweight health check", async () => {
    const response = GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      route: "/api/import",
      runtime: "nodejs",
      maxDuration: 60,
    });
    expect(payload.nodeVersion).toMatch(/^v\d+\./);
  });

  it("rejects PDFs without extracted text", async () => {
    mocks.extractPdfText.mockResolvedValueOnce({
      text: "",
      pageCount: 1,
      characters: 0,
      pdfjsVersion: "5.6.205",
    });

    const response = await POST(createImportRequest());
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("does not contain extractable text");
    expect(mocks.createEmbeddings).not.toHaveBeenCalled();
    expect(mocks.upsertChunks).not.toHaveBeenCalled();
  });

  it("imports a searchable PDF in append mode", async () => {
    const response = await POST(
      createImportRequest({
        title: "Krystian CV",
        tags: JSON.stringify(["cv", "linkedin"]),
      }),
    );
    const payload = await response.json();
    const [chunks] = mocks.upsertChunks.mock.calls[0] ?? [];

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      filename: "candidate-cv.pdf",
      title: "Krystian CV",
      sourceType: "cv",
      tags: ["cv", "linkedin"],
      mode: "append",
      chunks: 1,
      upserted: 1,
      extractedCharacters: pdfText.length,
      embeddingProfile: "balanced",
      dimensions: 1536,
    });
    expect(mocks.resetDocumentCollection).not.toHaveBeenCalled();
    expect(mocks.createEmbeddings).toHaveBeenCalledWith([pdfText], "balanced");
    expect(chunks[0]).toMatchObject({
      title: "Krystian CV",
      sourceType: "cv",
      tags: ["cv", "linkedin"],
      text: pdfText,
    });
  });

  it("resets Qdrant before importing in replace mode", async () => {
    const response = await POST(
      createImportRequest({
        embeddingProfile: "large",
        mode: "replace",
        sourceType: "knowledge",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      mode: "replace",
      sourceType: "knowledge",
      embeddingProfile: "large",
      dimensions: 3072,
    });
    expect(mocks.resetDocumentCollection).toHaveBeenCalledWith(3072);
    expect(mocks.upsertChunks).toHaveBeenCalledOnce();
  });
});

function createImportRequest({
  file = new File(["%PDF-1.4"], "candidate-cv.pdf", { type: "application/pdf" }),
  title = "",
  sourceType = "cv",
  tags = "",
  embeddingProfile = "balanced",
  mode = "append",
}: {
  file?: File;
  title?: string;
  sourceType?: string;
  tags?: string;
  embeddingProfile?: string;
  mode?: string;
} = {}) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("title", title);
  formData.set("sourceType", sourceType);
  formData.set("tags", tags);
  formData.set("embeddingProfile", embeddingProfile);
  formData.set("mode", mode);

  return new Request("http://localhost:3000/api/import", {
    method: "POST",
    body: formData,
  });
}
