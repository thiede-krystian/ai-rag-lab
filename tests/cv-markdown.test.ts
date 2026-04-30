import { describe, expect, it } from "vitest";
import { cvDraftToMarkdown } from "@/lib/cv/markdown";
import type { CvDraft } from "@/lib/cv/types";

describe("CV Markdown export", () => {
  it("renders populated CV sections", () => {
    const markdown = cvDraftToMarkdown({
      personal: {
        name: "Krystian Thiede",
        headline: "AI Engineer",
        secondHeadline: "RAG, embeddings and product engineering",
        email: "krystian@example.com",
        phone: "",
        location: "Warsaw",
        website: "",
        links: [{ label: "GitHub", url: "https://github.com/krystian" }],
      },
      summary: "Builds AI products.",
      aspirations: "Applies AI to useful products.",
      skills: ["Next.js", "RAG"],
      experience: [
        {
          role: "AI Engineer",
          company: "Product Lab",
          location: "",
          period: "2022 - Present",
          bullets: ["Built semantic search."],
        },
      ],
      projects: [],
      education: [],
      certifications: [],
      languages: ["Polish", "English"],
    } satisfies CvDraft);

    expect(markdown).toContain("# Krystian Thiede");
    expect(markdown.indexOf("AI Engineer")).toBeLessThan(
      markdown.indexOf("RAG, embeddings and product engineering"),
    );
    expect(markdown).toContain("krystian@example.com | Warsaw | [GitHub](https://github.com/krystian)");
    expect(markdown).toContain("## Skills");
    expect(markdown).toContain("- RAG");
    expect(markdown).toContain("### AI Engineer - Product Lab");
    expect(markdown).toContain("- Built semantic search.");
  });

  it("exports dated sections from newest to oldest", () => {
    const markdown = cvDraftToMarkdown({
      personal: {
        name: "Krystian Thiede",
        headline: "AI Engineer",
        secondHeadline: "",
        email: "",
        phone: "",
        location: "",
        website: "",
        links: [],
      },
      summary: "",
      aspirations: "",
      skills: [],
      experience: [
        {
          role: "Hidden Role",
          company: "HiddenCo",
          location: "",
          period: "2025 - now",
          bullets: ["This should stay out of export."],
          includeInExport: false,
        },
        {
          role: "Older Role",
          company: "OldCo",
          location: "",
          period: "2015 - 2017",
          bullets: [],
        },
        {
          role: "Current Role",
          company: "NowCo",
          location: "",
          period: "APR. 2023 - now",
          bullets: [],
        },
      ],
      projects: [
        {
          name: "Hidden Project",
          description: "hidden.example | 2025 - now",
          technologies: [],
          includeInExport: false,
        },
        {
          name: "Older Project",
          description: "older.example | 2015 - 2017 Built a store.",
          technologies: [],
        },
        {
          name: "Newer Project",
          description: "newer.example | 2015 - 2019 Built a job fair site.",
          technologies: [],
        },
      ],
      education: [
        { school: "Hidden University", degree: "", period: "2020 - 2022", details: "", includeInExport: false },
        { school: "Older University", degree: "", period: "2001 - 2004", details: "" },
        { school: "Newer University", degree: "", period: "2004 - 2008", details: "" },
      ],
      certifications: [],
      languages: [],
    } satisfies CvDraft);

    expect(markdown.indexOf("Current Role")).toBeLessThan(markdown.indexOf("Older Role"));
    expect(markdown.indexOf("Newer Project")).toBeLessThan(markdown.indexOf("Older Project"));
    expect(markdown.indexOf("Newer University")).toBeLessThan(markdown.indexOf("Older University"));
    expect(markdown).not.toContain("Hidden Role");
    expect(markdown).not.toContain("Hidden Project");
    expect(markdown).not.toContain("Hidden University");
  });
});
