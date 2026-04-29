import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { parseLinkedInFile, parseLinkedInText } from "@/lib/cv/linkedin/parser";

describe("LinkedIn import parser", () => {
  it("parses official LinkedIn CSV files from a ZIP export", async () => {
    const zip = new JSZip();

    zip.file(
      "Profile.csv",
      [
        "First Name,Last Name,Headline,Geo Location,Summary",
        "Krystian,Thiede,Full Stack Developer,Gdansk Poland,Builds RAG products",
      ].join("\n"),
    );
    zip.file(
      "Positions.csv",
      [
        "Title,Company Name,Started On,Finished On,Description",
        "AI Engineer,Product Lab,2024,,Built semantic search and evals",
      ].join("\n"),
    );
    zip.file("Skills.csv", ["Name", "TypeScript", "RAG"].join("\n"));

    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parseLinkedInFile(buffer, "linkedin-export.zip");

    expect(result.source).toBe("zip");
    expect(result.parsedFiles).toEqual(["Profile.csv", "Positions.csv", "Skills.csv"]);
    expect(result.profile.personal.fullName).toBe("Krystian Thiede");
    expect(result.profile.positions[0]).toMatchObject({
      role: "AI Engineer",
      company: "Product Lab",
      period: "2024",
      bullets: ["Built semantic search and evals"],
    });
    expect(result.profile.skills).toEqual(["TypeScript", "RAG"]);
  });

  it("parses pasted LinkedIn profile text as a fallback", () => {
    const result = parseLinkedInText(
      [
        "Krystian Thiede",
        "AI Engineer",
        "About",
        "I build RAG systems.",
        "Experience",
        "Senior Developer at Product Lab",
        "- Built vector search.",
        "Skills",
        "TypeScript, Next.js, Qdrant",
      ].join("\n"),
    );

    expect(result.source).toBe("text");
    expect(result.profile.personal.fullName).toBe("Krystian Thiede");
    expect(result.profile.personal.headline).toBe("AI Engineer");
    expect(result.profile.about).toContain("I build RAG systems.");
    expect(result.profile.positions[0]).toMatchObject({
      role: "Senior Developer",
      company: "Product Lab",
      bullets: ["Built vector search."],
    });
    expect(result.profile.skills).toContain("Qdrant");
  });
});
