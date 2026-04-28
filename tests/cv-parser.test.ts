import { describe, expect, it } from "vitest";
import { parseCvTextToDraft } from "@/lib/cv/heuristic-parser";

describe("CV heuristic parser", () => {
  it("maps raw CV text into a structured draft", () => {
    const draft = parseCvTextToDraft(`
      Krystian Thiede
      Full Stack AI Engineer
      krystian@example.com +48 500 600 700 github.com/krystian

      Summary
      Builds RAG applications with Next.js, Node.js, TypeScript, Qdrant and LLM tooling.

      Skills
      Next.js, Node.js, TypeScript, RAG, Qdrant

      Experience
      AI Engineer at Product Lab 2022 - Present
      - Built semantic search with embeddings.
      - Implemented evaluation pipelines.

      Education
      Computer Science University 2018 - 2022
    `);

    expect(draft.personal.name).toBe("Krystian Thiede");
    expect(draft.personal.email).toBe("krystian@example.com");
    expect(draft.personal.links[0]).toMatchObject({ label: "GitHub" });
    expect(draft.summary).toContain("Builds RAG applications");
    expect(draft.skills).toContain("TypeScript");
    expect(draft.experience[0]).toMatchObject({
      role: "AI Engineer",
      company: "Product Lab",
      period: "2022 - Present",
    });
    expect(draft.experience[0]?.bullets).toContain("Built semantic search with embeddings.");
    expect(draft.education[0]?.details).toContain("Computer Science University");
  });

  it("parses layout-aware CV text with split name, sidebars, and slash-separated jobs", () => {
    const draft = parseCvTextToDraft(`
      KrystiaN
      THIEDE
      Full Stack Developer
      Address
      Gdansk, Poland
      Signal | Call
      +48 531 793 900
      Email
      krystian.thiede@gmail.com
      Linkedin
      linkedin.com/in/krystian-thiede
      Tags | Skills
      JavaScript, TypeScript, SASS
      NodeJS, PHP
      ReactJS, NextJs
      About me
      Hello! I'm a lifelong lover of all things systems.

      experience
      Senior Software Developer /Stibo Systems
      APR. 2023 - now
      • Develop and maintain functionalities in Instrument NX monorepo.
      • Technologies: ReactJS, React Aria, NodeJS, Typescript, Figma.
      Senior Full Stack Developer /SolveQ
      SEPT. 2019 - APR. 2023
      • Developed full-stack applications.

      Education
      Gdansk University
      of Technology
      pg.gda.pl | 2003 - 2008
      • Master of Engineering

      My Projects
      Tri-City Job Fair
      targipracy.gdansk.pl | 2015 - 2019
      Key roles in organizing a job fair.

      Aspirations
      Machine Learning & Generative Artificial Intelligence.
    `);

    expect(draft.personal.name).toBe("Krystian Thiede");
    expect(draft.personal.headline).toBe("Full Stack Developer");
    expect(draft.personal.location).toBe("Gdansk, Poland");
    expect(draft.personal.links[0]).toMatchObject({ label: "LinkedIn" });
    expect(draft.skills).toContain("TypeScript");
    expect(draft.summary).toContain("lifelong lover");
    expect(draft.experience[0]).toMatchObject({
      role: "Senior Software Developer",
      company: "Stibo Systems",
      period: "APR. 2023 - now",
    });
    expect(draft.experience[1]).toMatchObject({
      role: "Senior Full Stack Developer",
      company: "SolveQ",
      period: "SEPT. 2019 - APR. 2023",
    });
    expect(draft.education[0]).toMatchObject({
      school: "Gdansk University of Technology",
      period: "2003 - 2008",
    });
    expect(draft.projects[0]?.name).toBe("Tri-City Job Fair");
    expect(draft.aspirations).toContain("Generative Artificial Intelligence");
  });
});
