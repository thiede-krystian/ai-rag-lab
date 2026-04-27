import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  getDocument,
  GlobalWorkerOptions,
  version as pdfjsVersion,
} from "pdfjs-dist/legacy/build/pdf.mjs";

export type PdfTextExtractionResult = {
  text: string;
  pageCount: number;
  characters: number;
  pdfjsVersion: string;
};

type PdfBinary = ArrayBuffer | Uint8Array;
type PdfTextItem = {
  str: string;
  hasEOL?: boolean;
};

const standardFontDataUrl = `${join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts")}/`;
const workerSrc = pathToFileURL(
  join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
).href;

export async function extractPdfText(data: PdfBinary): Promise<PdfTextExtractionResult> {
  GlobalWorkerOptions.workerSrc = workerSrc;

  const pdfData = toUint8Array(data);
  const loadingTask = getDocument({
    data: pdfData,
    standardFontDataUrl,
    useWorkerFetch: false,
  });

  const pdf = await loadingTask.promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = normalizePageText(getTextParts(content.items));

      if (text) {
        pages.push(text);
      }
    }

    const text = normalizeDocumentText(pages.join("\n\n"));

    return {
      text,
      pageCount: pdf.numPages,
      characters: text.length,
      pdfjsVersion,
    };
  } finally {
    await pdf.destroy();
  }
}

function toUint8Array(data: PdfBinary): Uint8Array {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data.slice(0));
  }

  return new Uint8Array(data);
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    typeof (item as { str: unknown }).str === "string"
  );
}

function getTextParts(items: unknown[]): string[] {
  return items.flatMap((item) => {
    if (!isPdfTextItem(item)) {
      return [];
    }

    return item.hasEOL ? [`${item.str}\n`] : [item.str];
  });
}

function normalizePageText(parts: string[]): string {
  return parts
    .join(" ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeDocumentText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
