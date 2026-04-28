import { describe, expect, it } from "vitest";
import { DEFAULT_CV_TEMPLATE, cvTemplateOptions, normalizeCvTemplateId } from "@/lib/cv/templates";

describe("CV template helpers", () => {
  it("exposes only classic and final 3-column templates", () => {
    expect(cvTemplateOptions.map((option) => option.value)).toEqual(["three-column-a4", "classic-a4"]);
    expect(DEFAULT_CV_TEMPLATE).toBe("three-column-a4");
  });

  it("migrates removed 3-column template ids to the final template", () => {
    expect(normalizeCvTemplateId("compact-three-column-a4")).toBe("three-column-a4");
    expect(normalizeCvTemplateId("polished-three-column-a4")).toBe("three-column-a4");
    expect(normalizeCvTemplateId("three-column-a4")).toBe("three-column-a4");
    expect(normalizeCvTemplateId("classic-a4")).toBe("classic-a4");
  });
});
