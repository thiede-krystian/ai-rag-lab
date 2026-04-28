import { createEmptyCvDraft, normalizeCvDraft } from "@/lib/cv/draft";
import type { CvDraft, CvExperienceItem } from "@/lib/cv/types";

type SectionKey =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certifications"
  | "languages";

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}[\s-]?\d{0,4}/;
const urlPattern = /(https?:\/\/[^\s]+|(?:linkedin|github)\.com\/[^\s]+)/gi;
const periodPattern =
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})[\w\s.,-]*(?:present|current|now|\d{4})?)/i;

const sectionAliases: Record<SectionKey, string[]> = {
  summary: ["summary", "profile", "about", "professional summary", "career profile"],
  skills: ["skills", "technical skills", "technologies", "tech stack", "core skills"],
  experience: ["experience", "work experience", "professional experience", "employment", "history"],
  projects: ["projects", "selected projects", "portfolio"],
  education: ["education", "academic background"],
  certifications: ["certifications", "certificates", "courses"],
  languages: ["languages", "language"],
};

export function parseCvTextToDraft(text: string): CvDraft {
  const lines = normalizeLines(text);
  const sections = collectSections(lines);
  const draft = createEmptyCvDraft();
  const contact = parseContact(lines);

  draft.personal = {
    ...draft.personal,
    ...contact,
    name: findCandidateName(lines),
    headline: findHeadline(lines),
  };
  draft.summary = parseSummary(sections.summary, lines);
  draft.skills = parseListSection(sections.skills);
  draft.experience = parseExperience(sections.experience);
  draft.projects = parseProjects(sections.projects);
  draft.education = parseEducation(sections.education);
  draft.certifications = parseListSection(sections.certifications);
  draft.languages = parseListSection(sections.languages);

  return normalizeCvDraft(draft);
}

function normalizeLines(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function collectSections(lines: string[]) {
  const sections: Record<SectionKey, string[]> = {
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    languages: [],
  };
  let current: SectionKey | null = null;

  for (const line of lines) {
    const heading = matchSectionHeading(line);

    if (heading) {
      current = heading;
      continue;
    }

    if (current) {
      sections[current].push(line);
    }
  }

  return sections;
}

function matchSectionHeading(line: string): SectionKey | null {
  const normalized = line.toLowerCase().replace(/[:\s]+$/g, "");

  if (normalized.length > 40) {
    return null;
  }

  for (const [key, aliases] of Object.entries(sectionAliases) as Array<[SectionKey, string[]]>) {
    if (aliases.includes(normalized)) {
      return key;
    }
  }

  return null;
}

function parseContact(lines: string[]) {
  const joined = lines.join(" ");
  const email = joined.match(emailPattern)?.[0] ?? "";
  const phone = joined.match(phonePattern)?.[0] ?? "";
  const urls = [...joined.matchAll(urlPattern)].map((match) => match[0].replace(/[),.]+$/g, ""));

  return {
    email,
    phone,
    website: urls.find((url) => !url.includes("linkedin.") && !url.includes("github.")) ?? "",
    links: urls.map((url) => ({
      label: getLinkLabel(url),
      url: normalizeUrl(url),
    })),
  };
}

function findCandidateName(lines: string[]) {
  return (
    lines.find(
      (line) =>
        line.length <= 70 &&
        !emailPattern.test(line) &&
        !phonePattern.test(line) &&
        !urlPattern.test(line) &&
        !matchSectionHeading(line) &&
        /[A-Za-z]/.test(line),
    ) ?? ""
  );
}

function findHeadline(lines: string[]) {
  const name = findCandidateName(lines);
  const index = lines.indexOf(name);

  if (index < 0) {
    return "";
  }

  return (
    lines
      .slice(index + 1, index + 4)
      .find(
        (line) =>
          line.length <= 110 && !emailPattern.test(line) && !phonePattern.test(line) && !urlPattern.test(line),
      ) ?? ""
  );
}

function parseSummary(summaryLines: string[], allLines: string[]) {
  if (summaryLines.length > 0) {
    return summaryLines.slice(0, 4).join(" ");
  }

  return allLines
    .filter((line) => !emailPattern.test(line) && !phonePattern.test(line) && !urlPattern.test(line))
    .filter((line) => !matchSectionHeading(line))
    .slice(2, 5)
    .join(" ");
}

function parseListSection(lines: string[]) {
  return lines
    .flatMap((line) => line.split(/,|;|\s\|\s/))
    .map((value) => value.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function parseExperience(lines: string[]): CvExperienceItem[] {
  const entries: CvExperienceItem[] = [];
  let current: CvExperienceItem | null = null;

  for (const line of lines) {
    if (isBulletLine(line)) {
      current ??= createExperienceFromHeading("");
      current.bullets.push(cleanBullet(line));
      continue;
    }

    if (current) {
      entries.push(current);
    }

    current = createExperienceFromHeading(line);
  }

  if (current) {
    entries.push(current);
  }

  return entries;
}

function createExperienceFromHeading(line: string): CvExperienceItem {
  const period = line.match(periodPattern)?.[0] ?? "";
  const heading = period ? line.replace(period, "").replace(/[-|,]+$/g, "").trim() : line;
  const [role, company = ""] = heading.split(/\s+(?:at|@|\||-)\s+/i, 2);

  return {
    role: role?.trim() ?? "",
    company: company.trim(),
    location: "",
    period,
    bullets: [],
  };
}

function parseProjects(lines: string[]) {
  return lines.map((line) => ({
    name: line.replace(/^[-*•]\s*/, "").split(/[-|:]/)[0]?.trim() ?? line,
    description: line.replace(/^[-*•]\s*/, "").trim(),
    technologies: extractTechnologies(line),
  }));
}

function parseEducation(lines: string[]) {
  return lines.map((line) => ({
    school: line.split(/[-|,]/)[0]?.trim() ?? line,
    degree: "",
    period: line.match(periodPattern)?.[0] ?? "",
    details: line,
  }));
}

function extractTechnologies(line: string) {
  const matches = line.match(/\b(?:React|Next\.js|Node\.js|TypeScript|JavaScript|Python|Qdrant|RAG|AI|LLM)\b/g);

  return matches ? [...new Set(matches)] : [];
}

function isBulletLine(line: string) {
  return /^[-*•]\s+/.test(line);
}

function cleanBullet(line: string) {
  return line.replace(/^[-*•]\s+/, "").trim();
}

function normalizeUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getLinkLabel(url: string) {
  if (url.includes("linkedin.")) {
    return "LinkedIn";
  }

  if (url.includes("github.")) {
    return "GitHub";
  }

  return "Website";
}
