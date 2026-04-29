import { describe, expect, it } from "vitest";
import { compareCvWithLinkedIn, applyLinkedInSuggestions } from "@/lib/cv/linkedin/diff";
import type { CvDraft, LinkedInProfile } from "@/lib/cv/types";

const draft: CvDraft = {
  personal: {
    name: "Krystian Thiede",
    headline: "Full Stack Developer",
    email: "krystian@example.com",
    phone: "",
    location: "Gdansk",
    website: "",
    links: [],
  },
  summary: "Builds web applications.",
  aspirations: "",
  skills: ["TypeScript"],
  experience: [
    {
      role: "Developer",
      company: "Product Lab",
      location: "",
      period: "2020 - 2022",
      bullets: ["Built apps."],
    },
  ],
  projects: [],
  education: [],
  certifications: [],
  languages: [],
};

const profile: LinkedInProfile = {
  personal: {
    firstName: "Krystian",
    lastName: "Thiede",
    fullName: "Krystian Thiede",
    headline: "AI Engineer",
    location: "Gdansk",
    website: "https://linkedin.com/in/krystian-thiede",
    email: "",
    phone: "",
  },
  about:
    "Builds web applications, semantic search, RAG systems and evaluation pipelines for AI products.",
  positions: [
    {
      role: "AI Engineer",
      company: "Product Lab",
      location: "",
      period: "2020 - 2024",
      bullets: ["Built apps.", "Built semantic search with Qdrant and embeddings."],
    },
    {
      role: "Consultant",
      company: "AI Studio",
      location: "",
      period: "2024 - now",
      bullets: ["Advises teams on RAG quality."],
    },
  ],
  education: [{ school: "Gdansk University of Technology", degree: "MSc", period: "2003 - 2008", details: "" }],
  skills: ["TypeScript", "RAG", "Qdrant"],
  certifications: ["AWS Certified Cloud Practitioner"],
  languages: ["English"],
  projects: [{ name: "RAG Lab", description: "Demo RAG project", technologies: ["Next.js"] }],
};

describe("LinkedIn CV diff", () => {
  it("finds missing skills, conflicts, missing roles and richer descriptions", () => {
    const result = compareCvWithLinkedIn(draft, profile);

    expect(result.summary.differences).toBeGreaterThan(0);
    expect(result.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: "skills",
          type: "missing-in-cv",
          title: "Skill missing in CV: RAG",
        }),
        expect.objectContaining({
          section: "experience",
          type: "conflict",
          title: "Different dates: AI Engineer / Product Lab",
        }),
        expect.objectContaining({
          section: "experience",
          type: "missing-in-cv",
          title: "Experience missing in CV: Consultant / AI Studio",
        }),
      ]),
    );
    expect(result.suggestions.map((suggestion) => suggestion.action)).toContain("add-skill");
    expect(result.suggestions.map((suggestion) => suggestion.action)).toContain("update-experience");
  });

  it("applies only selected suggestions to the CV draft", () => {
    const result = compareCvWithLinkedIn(draft, profile);
    const selected = result.suggestions.filter((suggestion) =>
      ["Add skill: RAG", "Use LinkedIn headline"].includes(suggestion.label),
    );

    const updatedDraft = applyLinkedInSuggestions(draft, selected);

    expect(updatedDraft.personal.headline).toBe("AI Engineer");
    expect(updatedDraft.skills).toContain("RAG");
    expect(updatedDraft.skills).not.toContain("Qdrant");
    expect(updatedDraft.experience).toHaveLength(1);
  });
});
