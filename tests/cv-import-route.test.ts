import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cv/import-pdf/route";

const mocks = vi.hoisted(() => ({
  extractPdfText: vi.fn(),
}));

vi.mock("@/lib/pdf", () => ({
  extractPdfText: mocks.extractPdfText,
}));

describe("CV PDF import API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractPdfText.mockResolvedValue({
      text: "Krystian Thiede\nAI Engineer\nSkills\nNext.js, RAG",
      pageCount: 1,
      characters: 47,
      pdfjsVersion: "5.6.205",
      extractionMode: "layout-aware",
    });
  });

  it("rejects non-PDF files", async () => {
    const response = await POST(
      createImportRequest({
        file: new File(["text"], "cv.txt", { type: "text/plain" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Only PDF files are supported.");
    expect(mocks.extractPdfText).not.toHaveBeenCalled();
  });

  it("rejects empty PDFs", async () => {
    const response = await POST(
      createImportRequest({
        file: new File([], "empty.pdf", { type: "application/pdf" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("PDF file is empty.");
    expect(mocks.extractPdfText).not.toHaveBeenCalled();
  });

  it("returns extracted text and heuristic draft", async () => {
    const response = await POST(createImportRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      filename: "cv.pdf",
      pageCount: 1,
      extractedCharacters: 47,
      extractionMode: "layout-aware",
      parser: "layout-aware-heuristic",
    });
    expect(payload.draft.personal.name).toBe("Krystian Thiede");
    expect(payload.draft.skills).toContain("Next.js");
  });
});

function createImportRequest({
  file = new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" }),
}: {
  file?: File;
} = {}) {
  const formData = new FormData();
  formData.set("file", file);

  return new Request("http://localhost:3000/api/cv/import-pdf", {
    method: "POST",
    body: formData,
  });
}
