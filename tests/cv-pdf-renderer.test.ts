import { describe, expect, it } from "vitest";
import { createEmptyCvDraft } from "@/lib/cv/draft";
import { getExperienceColumnTitle, paginateThreeColumnDraft, renderCvPdf } from "@/lib/cv/pdf-renderer";

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

  it("does not show an empty experience title on 3-column pages without experience items", () => {
    const draft = createEmptyCvDraft();

    draft.personal.name = "Right Column Only";
    draft.education = [
      {
        school: "Gdansk University of Technology",
        degree: "Master of Engineering",
        period: "2003 - 2008",
        details: "Faculty of Electronics, Telecommunications and Informatics.",
      },
    ];

    const pages = paginateThreeColumnDraft(draft, "balanced");

    expect(pages[0]?.experience).toEqual([]);
    expect(getExperienceColumnTitle(pages[0]!, 0)).toBeNull();
  });

  it("moves a new right-column project section to the next page with its first block", () => {
    const draft = createEmptyCvDraft();

    draft.personal.name = "Project Orphan Test";
    draft.education = Array.from({ length: 2 }, (_, index) => ({
      school: `School ${index + 1}`,
      degree: "Master of Engineering",
      period: `200${index} - 200${index + 1}`,
      details: "Education details ".repeat(40),
    }));
    draft.projects = [
      {
        name: "Important Project",
        description: "project.example | 2024 - now Delivered a product used by multiple teams.",
        technologies: ["Next.js", "TypeScript"],
      },
    ];

    const pages = paginateThreeColumnDraft(draft, "balanced");
    const projectPageIndex = pages.findIndex((page) =>
      page.rightBlocks.some((block) => block.section === "My Projects"),
    );

    expect(projectPageIndex).toBeGreaterThan(0);
    expect(pages[projectPageIndex]?.rightBlocks[0]?.section).toBe("My Projects");
  });

  it("renders long classic CVs with orphan-aware section headers", async () => {
    const draft = createEmptyCvDraft();

    draft.personal.name = "Classic Orphan Test";
    draft.summary = "Builds products. ".repeat(80);
    draft.experience = Array.from({ length: 8 }, (_, index) => ({
      role: `Role ${index + 1}`,
      company: `Company ${index + 1}`,
      location: "",
      period: `20${10 + index} - 20${11 + index}`,
      bullets: Array.from({ length: 5 }, () => "Delivered production features with tests and documentation."),
    }));
    draft.projects = Array.from({ length: 4 }, (_, index) => ({
      name: `Project ${index + 1}`,
      description: "Built and maintained a production application for internal users.",
      technologies: ["Next.js", "Node.js"],
    }));
    draft.education = [
      {
        school: "Gdansk University of Technology",
        degree: "Master of Engineering",
        period: "2003 - 2008",
        details: "Electronics, Telecommunications and Informatics.",
      },
    ];

    const pdf = await renderCvPdf(draft, "classic-a4");

    expect(pdf.length).toBeGreaterThan(1000);
  });
});
