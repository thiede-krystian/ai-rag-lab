import { describe, expect, it } from "vitest";
import { normalizeCvDraft } from "@/lib/cv/draft";

describe("CV draft normalization", () => {
  it("defaults missing second headline to an empty string", () => {
    const draft = normalizeCvDraft({
      personal: {
        name: "Krystian Thiede",
        headline: "AI Engineer",
      },
    });

    expect(draft.personal.secondHeadline).toBe("");
  });

  it("defaults export selection to true and preserves explicit false values", () => {
    const draft = normalizeCvDraft({
      experience: [
        { role: "Exported role", company: "A" },
        { role: "Hidden role", company: "B", includeInExport: false },
      ],
      projects: [
        { name: "Exported project" },
        { name: "Hidden project", includeInExport: false },
      ],
      education: [
        { school: "Exported school" },
        { school: "Hidden school", includeInExport: false },
      ],
    });

    expect(draft.experience.map((item) => item.includeInExport)).toEqual([true, false]);
    expect(draft.projects.map((item) => item.includeInExport)).toEqual([true, false]);
    expect(draft.education.map((item) => item.includeInExport)).toEqual([true, false]);
  });
});
