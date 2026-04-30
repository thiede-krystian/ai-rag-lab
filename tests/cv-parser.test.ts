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

  it("splits middot-separated skills from PDF text into individual tags", () => {
    const draft = parseCvTextToDraft(`
      Krystian Thiede
      Full Stack Developer

      Tags | Skills
      JavaScript · TypeScript · SASS · NodeJS · PHP · PostgreSQL · MongoDB · Git · Docker
      Photoshop · Illustrator · Figma · ReactJS · NextJs · NestJS · FeathersJS · Yii2
    `);

    expect(draft.skills).toEqual([
      "JavaScript",
      "TypeScript",
      "SASS",
      "NodeJS",
      "PHP",
      "PostgreSQL",
      "MongoDB",
      "Git",
      "Docker",
      "Photoshop",
      "Illustrator",
      "Figma",
      "ReactJS",
      "NextJs",
      "NestJS",
      "FeathersJS",
      "Yii2",
    ]);
  });

  it("keeps middot-separated experience entries from multi-page extracted CV text", () => {
    const draft = parseCvTextToDraft(`
      Krystian Thiede
      Senior Software Developer
      AI-assisted full-stack engineering
      krystian.thiede@gmail.com

      experience
      Senior Software Engineer · KEH Camera
      JAN. 2026 - now
      • Building and evolving full-stack product features.
      Senior Software Developer · Stibo Systems
      APR. 2023 - DEC. 2025
      • Develop and maintain frontend applications.
      Senior Full Stack Developer · SolveQ
      SEPT. 2019 - APR. 2023
      • Developed full-stack applications.
      Full Stack Developer · Freelancer
      FEB. 2015 - SEPT. 2019
      • Built web applications for clients.
      PHP Developer · G-Forces Web Management Polska
      OCT. 2013 - FEB. 2015
      • Developed automotive e-commerce software.
      Frontend Developer / PHP Developer · OPERON Sp. z o.o.
      JUN. 2010 - AUG. 2012
      • Built publishing house web applications.
      IT Trainer · iSpot Apple Premium Reseller SAD sp. z o.o.
      2007 - 2010
      • Led IT and creative software trainings.
    `);

    expect(draft.personal.headline).toBe("Senior Software Developer");
    expect(draft.personal.secondHeadline).toBe("AI-assisted full-stack engineering");
    expect(draft.experience.map((item) => item.company)).toEqual([
      "KEH Camera",
      "Stibo Systems",
      "SolveQ",
      "Freelancer",
      "G-Forces Web Management Polska",
      "OPERON Sp. z o.o.",
      "iSpot Apple Premium Reseller SAD sp. z o.o.",
    ]);
    expect(draft.experience[5]).toMatchObject({
      role: "Frontend Developer / PHP Developer",
      company: "OPERON Sp. z o.o.",
    });
  });

  it("parses languages from inline and dedicated language sections", () => {
    const inlineDraft = parseCvTextToDraft(`
      Krystian Thiede
      Senior Software Developer
      Languages: Polish native, English B2/C1
    `);
    const sectionDraft = parseCvTextToDraft(`
      Krystian Thiede
      Senior Software Developer

      Language proficiency
      Polish - native
      English – professional working proficiency
      German A2
    `);

    expect(inlineDraft.languages).toEqual(["Polish native", "English B2/C1"]);
    expect(sectionDraft.languages).toEqual([
      "Polish - native",
      "English - professional working proficiency",
      "German A2",
    ]);
  });
});
