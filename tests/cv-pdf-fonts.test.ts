import { describe, expect, it } from "vitest";
import { DEFAULT_CV_PDF_FONT, cvPdfFontOptions, normalizeCvPdfFontId } from "@/lib/cv/pdf-fonts";

describe("CV PDF font helpers", () => {
  it("defaults unknown values to Inter", () => {
    expect(DEFAULT_CV_PDF_FONT).toBe("inter");
    expect(normalizeCvPdfFontId(undefined)).toBe("inter");
    expect(normalizeCvPdfFontId("unknown")).toBe("inter");
  });

  it("exposes Inter and Source Serif 4 PDF font options", () => {
    expect(cvPdfFontOptions.map((option) => option.value)).toEqual(["inter", "source-serif-4"]);
  });
});
