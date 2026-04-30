import { describe, expect, it } from "vitest";
import { orderCvDraftForExport, parseCvPeriodRange } from "@/lib/cv/export-order";
import { createEmptyCvDraft } from "@/lib/cv/draft";

describe("CV export ordering", () => {
  it("parses current and historical periods", () => {
    expect(parseCvPeriodRange("APR. 2023 - now")).toMatchObject({
      start: 2023 * 12 + 4,
      end: 9999 * 12 + 12,
    });
    expect(parseCvPeriodRange("SEPT. 2019 - APR. 2023")).toMatchObject({
      start: 2019 * 12 + 9,
      end: 2023 * 12 + 4,
    });
    expect(parseCvPeriodRange("2015 - 2019")).toMatchObject({
      start: 2015 * 12 + 1,
      end: 2019 * 12 + 12,
    });
  });

  it("orders experience, projects and education from newest to oldest for export", () => {
    const draft = createEmptyCvDraft();

    draft.experience = [
      { role: "Old", company: "A", location: "", period: "2013 - 2015", bullets: [] },
      {
        role: "Hidden newest",
        company: "X",
        location: "",
        period: "2025 - now",
        bullets: [],
        includeInExport: false,
      },
      { role: "Current", company: "B", location: "", period: "APR. 2023 - now", bullets: [] },
      { role: "Middle", company: "C", location: "", period: "SEPT. 2019 - APR. 2023", bullets: [] },
    ];
    draft.projects = [
      { name: "Basewear", description: "Basewear.pl | 2015 - 2017 E-commerce platform.", technologies: [] },
      { name: "Tri-City Job Fair", description: "targipracy.gdansk.pl | 2015 - 2019 Website.", technologies: [] },
      {
        name: "Hidden project",
        description: "hidden.example | 2024 - now",
        technologies: [],
        includeInExport: false,
      },
      { name: "No dates", description: "Internal tool without dates.", technologies: [] },
    ];
    draft.education = [
      { school: "Hidden School", degree: "", period: "2020 - 2022", details: "", includeInExport: false },
      { school: "Older School", degree: "", period: "2001 - 2004", details: "" },
      { school: "Newer School", degree: "", period: "2004 - 2008", details: "" },
    ];

    const orderedDraft = orderCvDraftForExport(draft);

    expect(orderedDraft.experience.map((item) => item.role)).toEqual(["Current", "Middle", "Old"]);
    expect(orderedDraft.projects.map((item) => item.name)).toEqual([
      "Tri-City Job Fair",
      "Basewear",
      "No dates",
    ]);
    expect(orderedDraft.education.map((item) => item.school)).toEqual(["Newer School", "Older School"]);
  });
});
