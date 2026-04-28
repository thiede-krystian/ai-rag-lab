import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf";
import { parseCvTextToDraft } from "@/lib/cv/heuristic-parser";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = getPdfFile(formData);
    const filename = getSafeFilename(file.name);
    const fileData = await file.arrayBuffer();
    const extracted = await extractPdfText(fileData);

    if (!extracted.text) {
      throw new CvImportError(
        "PDF does not contain extractable text. Searchable PDFs are supported; scanned PDFs require OCR, which is not implemented yet.",
      );
    }

    return NextResponse.json({
      filename,
      text: extracted.text,
      pageCount: extracted.pageCount,
      extractedCharacters: extracted.characters,
      pdfjsVersion: extracted.pdfjsVersion,
      extractionMode: extracted.extractionMode,
      draft: parseCvTextToDraft(extracted.text),
      parser: "layout-aware-heuristic" as const,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function getPdfFile(formData: FormData): File {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new CvImportError("PDF file is required.");
  }

  const filename = getSafeFilename(file.name);
  const isPdf = file.type === "application/pdf" || filename.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new CvImportError("Only PDF files are supported.");
  }

  if (file.size === 0) {
    throw new CvImportError("PDF file is empty.");
  }

  return file;
}

function getSafeFilename(filename: string) {
  return filename.split(/[\\/]/).pop() || "document.pdf";
}

class CvImportError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown CV import error";
  const status = error instanceof CvImportError ? error.status : 500;

  if (status >= 500) {
    console.error("[api/cv/import-pdf] failed", error);
  }

  return NextResponse.json({ error: message }, { status });
}
