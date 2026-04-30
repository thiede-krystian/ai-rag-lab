import { describe, expect, it } from "vitest";
import { createEmptyCvDraft } from "@/lib/cv/draft";
import { renderCvPdf } from "@/lib/cv/pdf-renderer";

describe("CV PDF renderer", () => {
  it("renders dense 3-column CVs with repeated bullet text", async () => {
    const draft = createEmptyCvDraft();

    draft.personal = {
      ...draft.personal,
      name: "Duplicate Keys",
      headline: "Senior Developer",
      secondHeadline: "RAG, product engineering and full-stack systems",
    };
    draft.summary = "Builds AI products. ".repeat(40);
    draft.aspirations = "Applies AI to useful products. ".repeat(20);
    draft.skills = Array.from({ length: 36 }, (_, index) => `Skill ${index + 1}`);
    draft.experience = Array.from({ length: 7 }, (_, index) => ({
      role: `Role ${index + 1}`,
      company: `Company ${index + 1}`,
      location: "",
      period: `20${10 + index} - 20${11 + index}`,
      bullets: Array.from({ length: 8 }, () => "Built product"),
    }));
    draft.projects = Array.from({ length: 5 }, (_, index) => ({
      name: `Project ${index + 1}`,
      description: "project.example | 2015 - 2019 Built product. Built product. Built product.",
      technologies: ["Next.js", "TypeScript"],
    }));
    draft.education = Array.from({ length: 3 }, (_, index) => ({
      school: `School ${index + 1}`,
      degree: "MSc",
      period: `200${index} - 200${index + 1}`,
      details: "Details ".repeat(20),
    }));
    draft.certifications = ["Cert", "Cert", "Cert"];
    draft.languages = ["English", "English"];

    const pdf = await renderCvPdf(draft, "three-column-a4");

    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("renders with the Source Serif 4 embedded font option", async () => {
    const draft = createEmptyCvDraft();

    draft.personal = {
      ...draft.personal,
      name: "Font Test",
      headline: "AI Engineer",
    };
    draft.summary = "Builds AI products with retrieval, scoring and evaluation.";

    const pdf = await renderCvPdf(draft, "classic-a4", "source-serif-4");

    expect(pdf.length).toBeGreaterThan(1000);
  });
});
