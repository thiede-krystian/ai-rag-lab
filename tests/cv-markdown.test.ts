import { describe, expect, it } from "vitest";
import { cvDraftToMarkdown } from "@/lib/cv/markdown";
import type { CvDraft } from "@/lib/cv/types";

describe("CV Markdown export", () => {
  it("renders populated CV sections", () => {
    const markdown = cvDraftToMarkdown({
      personal: {
        name: "Krystian Thiede",
        headline: "AI Engineer",
        email: "krystian@example.com",
        phone: "",
        location: "Warsaw",
        website: "",
        links: [{ label: "GitHub", url: "https://github.com/krystian" }],
      },
      summary: "Builds AI products.",
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
    expect(markdown).toContain("krystian@example.com | Warsaw | [GitHub](https://github.com/krystian)");
    expect(markdown).toContain("## Skills");
    expect(markdown).toContain("- RAG");
    expect(markdown).toContain("### AI Engineer - Product Lab");
    expect(markdown).toContain("- Built semantic search.");
  });
});
