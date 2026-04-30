import { Font } from "@react-pdf/renderer";
import { join } from "node:path";
import type { CvPdfFontId } from "@/lib/cv/types";

export const DEFAULT_CV_PDF_FONT: CvPdfFontId = "inter";

export const cvPdfFontOptions: Array<{ label: string; value: CvPdfFontId }> = [
  { value: "inter", label: "Inter" },
  { value: "source-serif-4", label: "Source Serif 4" },
];

export type CvPdfFontProfile = {
  bold: string;
  id: CvPdfFontId;
  label: string;
  regular: string;
};

const fontProfiles: Record<CvPdfFontId, CvPdfFontProfile> = {
  inter: {
    bold: "AI RAG Lab Inter Bold",
    id: "inter",
    label: "Inter",
    regular: "AI RAG Lab Inter",
  },
  "source-serif-4": {
    bold: "AI RAG Lab Source Serif 4 Bold",
    id: "source-serif-4",
    label: "Source Serif 4",
    regular: "AI RAG Lab Source Serif 4",
  },
};

let fontsRegistered = false;

export function normalizeCvPdfFontId(value: unknown): CvPdfFontId {
  return value === "source-serif-4" ? "source-serif-4" : DEFAULT_CV_PDF_FONT;
}

export function getCvPdfFontProfile(value: unknown = DEFAULT_CV_PDF_FONT) {
  registerCvPdfFonts();

  return fontProfiles[normalizeCvPdfFontId(value)];
}

function registerCvPdfFonts() {
  if (fontsRegistered) {
    return;
  }

  const fontDir = join(process.cwd(), "assets/fonts/cv");

  Font.register({
    family: fontProfiles.inter.regular,
    fontWeight: 400,
    src: join(fontDir, "InterVariable.ttf"),
  });
  Font.register({
    family: fontProfiles.inter.bold,
    fontWeight: 700,
    src: join(fontDir, "InterVariable.ttf"),
  });
  Font.register({
    family: fontProfiles["source-serif-4"].regular,
    fontWeight: 400,
    src: join(fontDir, "SourceSerif4-Regular.otf"),
  });
  Font.register({
    family: fontProfiles["source-serif-4"].bold,
    fontWeight: 700,
    src: join(fontDir, "SourceSerif4-Bold.otf"),
  });

  fontsRegistered = true;
}
