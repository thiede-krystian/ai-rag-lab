import { describe, expect, it } from "vitest";
import { getCvDensityProfile } from "@/lib/cv/pdf-density";
import { createEmptyCvDraft } from "@/lib/cv/draft";

describe("CV PDF density profile", () => {
  it("uses a relaxed profile for short CVs", () => {
    const draft = createEmptyCvDraft();

    draft.experience = [
      {
        role: "AI Engineer",
        company: "Product Lab",
        location: "",
        period: "2024 - now",
        bullets: ["Built a RAG demo."],
      },
    ];

    expect(getCvDensityProfile(draft).id).toBe("relaxed");
  });

  it("uses a balanced profile for medium CVs", () => {
    const draft = createEmptyCvDraft();

    draft.experience = Array.from({ length: 5 }, (_, index) => ({
      role: `Senior Developer ${index}`,
      company: "Product Company",
      location: "",
      period: "2020 - now",
      bullets: [
        "Developed full-stack applications with React, Node.js, TypeScript, testing, and cloud deployment.",
        "Designed accessible interfaces and maintained CI/CD pipelines for production systems.",
      ],
    }));

    expect(getCvDensityProfile(draft).id).toBe("balanced");
  });

  it("uses a dense profile for long CVs", () => {
    const draft = createEmptyCvDraft();

    draft.experience = Array.from({ length: 8 }, (_, index) => ({
      role: `Principal Engineer ${index}`,
      company: "Large Platform",
      location: "",
      period: "2012 - now",
      bullets: Array.from(
        { length: 5 },
        () =>
          "Led complex product engineering work across frontend, backend, cloud infrastructure, observability, testing, documentation, and delivery.",
      ),
    }));

    expect(getCvDensityProfile(draft).id).toBe("dense");
  });
});
