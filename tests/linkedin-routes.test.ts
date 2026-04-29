import { describe, expect, it } from "vitest";
import { POST as applyLinkedIn } from "@/app/api/cv/linkedin/apply/route";
import { POST as compareLinkedIn } from "@/app/api/cv/linkedin/compare/route";
import { POST as importLinkedIn } from "@/app/api/cv/linkedin/import/route";
import type { CvDraft, LinkedInProfile } from "@/lib/cv/types";

describe("LinkedIn CV Maker API", () => {
  it("rejects an empty import request", async () => {
    const response = await importLinkedIn(new Request("http://localhost:3000/api/cv/linkedin/import"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Provide a LinkedIn ZIP/CSV file");
  });

  it("imports LinkedIn CSV data", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(["Name\nTypeScript\nRAG"], "Skills.csv", { type: "text/csv" }),
    );

    const response = await importLinkedIn(
      new Request("http://localhost:3000/api/cv/linkedin/import", {
        method: "POST",
        body: formData,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.source).toBe("csv");
    expect(payload.profile.skills).toEqual(["TypeScript", "RAG"]);
  });

  it("compares and applies selected suggestions", async () => {
    const draft = createDraft();
    const profile = createProfile();

    const compareResponse = await compareLinkedIn(
      jsonRequest("http://localhost:3000/api/cv/linkedin/compare", { draft, profile }),
    );
    const comparePayload = await compareResponse.json();
    const selectedSuggestions = comparePayload.suggestions.filter(
      (suggestion: { label: string }) => suggestion.label === "Add skill: RAG",
    );

    expect(compareResponse.status).toBe(200);
    expect(comparePayload.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Skill missing in CV: RAG" }),
      ]),
    );

    const applyResponse = await applyLinkedIn(
      jsonRequest("http://localhost:3000/api/cv/linkedin/apply", {
        draft,
        suggestions: selectedSuggestions,
      }),
    );
    const applyPayload = await applyResponse.json();

    expect(applyResponse.status).toBe(200);
    expect(applyPayload.draft.skills).toEqual(["TypeScript", "RAG"]);
  });
});

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDraft(): CvDraft {
  return {
    personal: {
      name: "Krystian Thiede",
      headline: "Developer",
      email: "",
      phone: "",
      location: "",
      website: "",
      links: [],
    },
    summary: "",
    aspirations: "",
    skills: ["TypeScript"],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    languages: [],
  };
}

function createProfile(): LinkedInProfile {
  return {
    personal: {
      firstName: "Krystian",
      lastName: "Thiede",
      fullName: "Krystian Thiede",
      headline: "AI Engineer",
      location: "",
      website: "",
      email: "",
      phone: "",
    },
    about: "",
    positions: [],
    education: [],
    skills: ["TypeScript", "RAG"],
    certifications: [],
    languages: [],
    projects: [],
  };
}
