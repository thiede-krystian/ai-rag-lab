import { describe, expect, it } from "vitest";
import { extractLayoutAwareTextFromItems, extractPdfText } from "@/lib/pdf";

describe("PDF text extraction", () => {
  it("extracts text from a searchable PDF", async () => {
    const pdf = createSearchablePdf("AI Engineer CV: RAG, vector search, eval pipelines.");

    const result = await extractPdfText(pdf);

    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("AI Engineer CV");
    expect(result.text).toContain("RAG, vector search, eval pipelines");
    expect(result.characters).toBe(result.text.length);
    expect(result.pdfjsVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(result.extractionMode).toBe("layout-aware");
  });

  it("returns empty text when a PDF has no text layer", async () => {
    const pdf = createSearchablePdf("");

    const result = await extractPdfText(pdf);

    expect(result.pageCount).toBe(1);
    expect(result.text).toBe("");
    expect(result.characters).toBe(0);
  });

  it("orders positioned text by columns and vertical layout", () => {
    const text = extractLayoutAwareTextFromItems(
      [
        { str: "Education", x: 455, y: 730 },
        { str: "experience", x: 190, y: 740 },
        { str: "KrystiaN", x: 28, y: 732 },
        { str: "8 Built search|", x: 195, y: 710 },
        { str: "THIEDE", x: 28, y: 704 },
        { str: "Key Projectsº", x: 190, y: 690 },
        { str: "Gdansk University", x: 455, y: 700 },
      ],
      595,
    );

    expect(text).toBe(
      [
        "KrystiaN",
        "THIEDE",
        "",
        "experience",
        "• Built search.",
        "Key Projects:",
        "",
        "Education",
        "Gdansk University",
      ].join("\n"),
    );
  });
});

function createSearchablePdf(text: string): Uint8Array {
  const chunks = ["%PDF-1.4\n"];
  const offsets: number[] = [0];
  const escapedText = escapePdfText(text);
  const contentStream = escapedText
    ? `BT\n/F1 24 Tf\n72 720 Td\n(${escapedText}) Tj\nET`
    : "";

  addObject(chunks, offsets, 1, "<< /Type /Catalog /Pages 2 0 R >>");
  addObject(chunks, offsets, 2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObject(
    chunks,
    offsets,
    3,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  );
  addObject(chunks, offsets, 4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObject(
    chunks,
    offsets,
    5,
    `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`,
  );

  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");
  chunks.push("xref\n0 6\n");
  chunks.push("0000000000 65535 f \n");

  for (let id = 1; id <= 5; id += 1) {
    chunks.push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }

  chunks.push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return new Uint8Array(Buffer.from(chunks.join(""), "utf8"));
}

function addObject(chunks: string[], offsets: number[], id: number, body: string): void {
  offsets[id] = Buffer.byteLength(chunks.join(""), "utf8");
  chunks.push(`${id} 0 obj\n${body}\nendobj\n`);
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
