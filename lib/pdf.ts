import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ensurePdfJsDomPolyfills } from "@/lib/pdf-dom-polyfills";

export type PdfTextExtractionResult = {
  text: string;
  pageCount: number;
  characters: number;
  pdfjsVersion: string;
  extractionMode: "layout-aware";
};

type PdfBinary = ArrayBuffer | Uint8Array;
type PdfTextItem = {
  str: string;
  hasEOL?: boolean;
  transform?: unknown;
  width?: unknown;
  height?: unknown;
};
type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
export type PdfLayoutTextItem = {
  str: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

const standardFontDataUrl = `${join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts")}/`;
const workerSrc = pathToFileURL(
  join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
).href;
let pdfJsModulePromise: Promise<PdfJsModule> | null = null;

export async function extractPdfText(data: PdfBinary): Promise<PdfTextExtractionResult> {
  const { getDocument, GlobalWorkerOptions, version: pdfjsVersion } = await loadPdfJs();

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
      const viewport = page.getViewport({ scale: 1 });
      const text = extractLayoutAwareTextFromItems(getLayoutTextItems(content.items), viewport.width);

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
      extractionMode: "layout-aware",
    };
  } finally {
    await pdf.destroy();
  }
}

export function extractLayoutAwareTextFromItems(items: PdfLayoutTextItem[], pageWidth = 612): string {
  const lines = groupItemsIntoLines(items, pageWidth);

  if (lines.length === 0) {
    return "";
  }

  const columns = createColumns();

  for (const line of lines) {
    const text = normalizePdfLayoutLine(line.items.map((item) => item.str).join(" "));

    if (!text) {
      continue;
    }

    columns[getColumnIndex(line.x, pageWidth)].lines.push({
      text,
      y: line.y,
    });
  }

  return columns
    .map((column) =>
      column.lines
        .sort((a, b) => b.y - a.y)
        .map((line) => line.text)
        .join("\n"),
    )
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function loadPdfJs() {
  ensurePdfJsDomPolyfills();
  pdfJsModulePromise ??= import("pdfjs-dist/legacy/build/pdf.mjs");

  return pdfJsModulePromise;
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

function normalizeDocumentText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getLayoutTextItems(items: unknown[]): PdfLayoutTextItem[] {
  return items.flatMap((item) => {
    if (!isPdfTextItem(item)) {
      return [];
    }

    const transform = Array.isArray(item.transform) ? item.transform : [];
    const x = asFiniteNumber(transform[4]);
    const y = asFiniteNumber(transform[5]);

    if (x === null || y === null) {
      return [];
    }

    return {
      str: item.str,
      x,
      y,
      width: asFiniteNumber(item.width) ?? undefined,
      height: asFiniteNumber(item.height) ?? undefined,
    };
  });
}

function groupItemsIntoLines(items: PdfLayoutTextItem[], pageWidth: number) {
  const lines: Array<{ x: number; y: number; items: PdfLayoutTextItem[] }> = [];
  const sorted = items
    .map((item) => ({
      ...item,
      str: normalizePdfTextFragment(item.str),
    }))
    .filter((item) => item.str)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  for (const item of sorted) {
    const tolerance = Math.max(2.5, (item.height ?? 10) * 0.35);
    const itemColumn = getColumnIndex(item.x, pageWidth);
    const line = lines.find(
      (candidate) =>
        Math.abs(candidate.y - item.y) <= tolerance && getColumnIndex(candidate.x, pageWidth) === itemColumn,
    );

    if (line) {
      line.items.push(item);
      line.x = Math.min(line.x, item.x);
      line.y = (line.y + item.y) / 2;
      continue;
    }

    lines.push({
      x: item.x,
      y: item.y,
      items: [item],
    });
  }

  return lines.map((line) => ({
    ...line,
    items: line.items.sort((a, b) => a.x - b.x),
  }));
}

function createColumns() {
  return [{ lines: [] }, { lines: [] }, { lines: [] }] as Array<{
    lines: Array<{ text: string; y: number }>;
  }>;
}

function getColumnIndex(x: number, pageWidth: number) {
  if (x < pageWidth * 0.28) {
    return 0;
  }

  if (x > pageWidth * 0.72) {
    return 2;
  }

  return 1;
}

function normalizePdfTextFragment(value: string) {
  return value
    .replace(/º/g, ":")
    .normalize("NFKC")
    .replace(/\u2028|\u2029/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePdfLayoutLine(value: string) {
  return value
    .replace(/^[8]\s+/, "• ")
    .replace(/^[\u0308¨×¡][ÕO]\s+/, "• ")
    .replace(/^[-*]\s+/, "• ")
    .replace(/º\s*$/g, ":")
    .replace(/\|\s*$/g, ".")
    .replace(/\+\s*$/g, "")
    .replace(/\s+([:.,])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function asFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
