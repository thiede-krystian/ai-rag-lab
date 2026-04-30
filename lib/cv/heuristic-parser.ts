import { createEmptyCvDraft, normalizeCvDraft } from "@/lib/cv/draft";
import type { CvDraft, CvExperienceItem, CvProjectItem } from "@/lib/cv/types";

type SectionKey =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certifications"
  | "languages"
  | "aspirations";

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}[\s-]?\d{0,4}/;
const urlPattern = /(https?:\/\/[^\s]+|(?:linkedin|github)\.com\/[^\s]+|[a-z0-9-]+\.[a-z]{2,}[^\s]*)/i;
const urlGlobalPattern = /(https?:\/\/[^\s]+|(?:linkedin|github)\.com\/[^\s]+|[a-z0-9-]+\.[a-z]{2,}[^\s]*)/gi;
const monthPattern =
  "(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\\.?";
const periodPattern = new RegExp(
  `((?:(?:${monthPattern})\\s+)?\\d{4}\\s*-\\s*(?:(?:(?:${monthPattern})\\s+)?\\d{4}|present|current|now))`,
  "i",
);

const sectionAliases: Record<SectionKey, string[]> = {
  summary: ["summary", "profile", "about", "about me", "professional summary", "career profile"],
  skills: ["skills", "tags | skills", "tags skills", "technical skills", "technologies", "tech stack", "core skills"],
  experience: ["experience", "work experience", "professional experience", "employment", "history"],
  projects: ["projects", "my projects", "selected projects", "portfolio"],
  education: ["education", "academic background"],
  certifications: ["certifications", "certificates", "courses"],
  languages: [
    "languages",
    "language",
    "language skills",
    "language proficiency",
    "spoken languages",
    "foreign languages",
  ],
  aspirations: ["aspirations", "career aspirations"],
};

const ignoredHeadlineLines = new Set(["address", "signal | call", "call", "email", "linkedin", "links"]);

export function parseCvTextToDraft(text: string): CvDraft {
  const lines = normalizeLines(text);
  const sections = collectSections(lines);
  const draft = createEmptyCvDraft();
  const contact = parseContact(lines);
  const headlines = findHeadlines(lines);

  draft.personal = {
    ...draft.personal,
    ...contact,
    name: findCandidateName(lines),
    headline: headlines.headline,
    secondHeadline: headlines.secondHeadline,
  };
  draft.summary = parseParagraph(sections.summary) || parseSummaryFallback(lines);
  draft.skills = parseListSection(sections.skills);
  draft.experience = parseExperience(sections.experience);
  draft.projects = parseProjects(sections.projects);
  draft.education = parseEducation(sections.education);
  draft.certifications = parseListSection(sections.certifications);
  draft.languages = parseLanguages(sections.languages);
  draft.aspirations = parseParagraph(sections.aspirations);

  return normalizeCvDraft(draft);
}

function normalizeLines(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(cleanLine)
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
    aspirations: [],
  };
  let current: SectionKey | null = null;

  for (const line of lines) {
    const inlineHeading = splitInlineSectionHeading(line);

    if (inlineHeading) {
      current = inlineHeading.key;

      if (inlineHeading.value) {
        sections[current].push(inlineHeading.value);
      }

      continue;
    }

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

function splitInlineSectionHeading(line: string): { key: SectionKey; value: string } | null {
  const match = line.match(/^([^:]{1,40}):\s*(.+)$/);

  if (!match) {
    return null;
  }

  const key = matchSectionHeading(match[1] ?? "");

  if (!key) {
    return null;
  }

  return {
    key,
    value: match[2]?.trim() ?? "",
  };
}

function matchSectionHeading(line: string): SectionKey | null {
  const normalized = normalizeHeading(line);

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
  const contactLines = getContactLines(lines);
  const joined = contactLines.join(" ");
  const email = joined.match(emailPattern)?.[0] ?? "";
  const phone = joined.match(phonePattern)?.[0] ?? "";
  const urls = [...joined.matchAll(urlGlobalPattern)]
    .filter((match) => match.index === undefined || joined[match.index - 1] !== "@")
    .map((match) => match[0].replace(/[),.]+$/g, ""))
    .filter((url) => !emailPattern.test(url));

  return {
    email,
    phone,
    location: parseLocation(contactLines),
    website: urls.find((url) => !url.includes("linkedin.") && !url.includes("github.")) ?? "",
    links: urls.map((url) => ({
      label: getLinkLabel(url),
      url: normalizeUrl(url),
    })),
  };
}

function getContactLines(lines: string[]) {
  const firstSectionIndex = lines.findIndex((line) => Boolean(matchSectionHeading(line)));

  return lines.slice(0, firstSectionIndex < 0 ? Math.min(lines.length, 16) : firstSectionIndex);
}

function parseLocation(lines: string[]) {
  const addressIndex = lines.findIndex((line) => normalizeHeading(line) === "address");

  if (addressIndex >= 0) {
    return lines[addressIndex + 1] ?? "";
  }

  return lines.find((line) => /\b(?:poland|germany|remote|usa|uk)\b/i.test(line) && line.length < 80) ?? "";
}

function findCandidateName(lines: string[]) {
  const candidate = getNameCandidate(lines);

  return candidate?.name ?? "";
}

function findHeadlines(lines: string[]) {
  const candidate = getNameCandidate(lines);
  const start = candidate ? candidate.startIndex + candidate.lineCount : 0;
  const headlineLines: string[] = [];

  for (const line of lines.slice(start, start + 8)) {
    if (isHeadlineBoundary(line)) {
      break;
    }

    if (!isHeadlineCandidate(line)) {
      continue;
    }

    headlineLines.push(line);

    if (headlineLines.length >= 2) {
      break;
    }
  }

  return {
    headline: headlineLines[0] ?? "",
    secondHeadline: headlineLines[1] ?? "",
  };
}

function isHeadlineCandidate(line: string) {
  return (
    line.length <= 110 &&
    !emailPattern.test(line) &&
    !phonePattern.test(line) &&
    !urlPattern.test(line) &&
    !matchSectionHeading(line) &&
    !ignoredHeadlineLines.has(normalizeHeading(line))
  );
}

function isHeadlineBoundary(line: string) {
  return (
    emailPattern.test(line) ||
    phonePattern.test(line) ||
    urlPattern.test(line) ||
    matchSectionHeading(line) ||
    ignoredHeadlineLines.has(normalizeHeading(line))
  );
}

function getNameCandidate(lines: string[]) {
  for (let index = 0; index < Math.min(lines.length, 5); index += 1) {
    const line = lines[index];
    const next = lines[index + 1] ?? "";

    if (!isPotentialNameLine(line)) {
      continue;
    }

    if (next && isUppercaseNamePart(next)) {
      return {
        name: toTitleCase(`${line} ${next}`),
        startIndex: index,
        lineCount: 2,
      };
    }

    return {
      name: toTitleCase(line),
      startIndex: index,
      lineCount: 1,
    };
  }

  return null;
}

function isPotentialNameLine(line: string) {
  return (
    line.length <= 70 &&
    /[A-Za-z]/.test(line) &&
    !emailPattern.test(line) &&
    !phonePattern.test(line) &&
    !urlPattern.test(line) &&
    !matchSectionHeading(line) &&
    !ignoredHeadlineLines.has(normalizeHeading(line))
  );
}

function isUppercaseNamePart(line: string) {
  return /^[A-Z][A-Z\s'-]{1,40}$/.test(line);
}

function parseSummaryFallback(allLines: string[]) {
  const candidate = allLines
    .filter((line) => !emailPattern.test(line) && !phonePattern.test(line) && !urlPattern.test(line))
    .filter((line) => !matchSectionHeading(line))
    .filter((line) => !ignoredHeadlineLines.has(normalizeHeading(line)))
    .slice(2, 6);

  return parseParagraph(candidate);
}

function parseParagraph(lines: string[]) {
  return lines.map(cleanBullet).join(" ").replace(/\s{2,}/g, " ").trim();
}

function parseListSection(lines: string[]) {
  return unique(
    lines
      .flatMap((line) => splitLooseList(cleanBullet(line)))
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function parseLanguages(lines: string[]) {
  return unique(
    lines
      .flatMap((line) => splitLooseList(cleanBullet(line)))
      .map(cleanLanguageValue)
      .filter(Boolean)
      .filter((value) => value.length <= 80 && !matchSectionHeading(value)),
  );
}

function splitLooseList(value: string) {
  return value.split(/,|;|\s\|\s|\s+[·•]\s+/);
}

function cleanLanguageValue(value: string) {
  return value
    .replace(/^languages?\s*[:|-]\s*/i, "")
    .replace(/\s*[–—]\s*/g, " - ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseExperience(lines: string[]): CvExperienceItem[] {
  const entries: CvExperienceItem[] = [];
  let current: CvExperienceItem | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1] ?? "";

    if (isPeriodLine(line) && current) {
      current.period = line;
      continue;
    }

    if (isJobHeading(line, nextLine)) {
      if (current) {
        entries.push(current);
      }

      current = createExperienceFromHeading(line);
      continue;
    }

    if (isBulletLine(line)) {
      current ??= createExperienceFromHeading("");
      current.bullets.push(cleanBullet(line));
      continue;
    }

    if (isInlineSubheading(line) && current) {
      current.bullets.push(line);
      continue;
    }

    if (current?.bullets.length) {
      appendToLastBullet(current, line);
      continue;
    }

    if (!current && line.length <= 120) {
      current = createExperienceFromHeading(line);
    }
  }

  if (current) {
    entries.push(current);
  }

  return entries;
}

function createExperienceFromHeading(line: string): CvExperienceItem {
  const period = line.match(periodPattern)?.[0] ?? "";
  const heading = period ? line.replace(period, "").replace(/[-|,]+$/g, "").trim() : line;
  const [role, company = ""] = splitRoleCompany(heading);

  return {
    role: role?.trim() ?? "",
    company: company.trim(),
    location: "",
    period,
    bullets: [],
  };
}

function splitRoleCompany(heading: string) {
  const separators = [
    /\s+·\s+/,
    /\s+@\s+/,
    /\s+\bat\b\s+/i,
    /\s+\|\s+/,
    /\s*\/\s*/,
    /\s+-\s+/,
  ];

  for (const separator of separators) {
    const parts = heading.split(separator, 2);

    if (parts.length === 2 && parts[0]?.trim() && parts[1]?.trim()) {
      return parts;
    }
  }

  return [heading, ""];
}

function parseProjects(lines: string[]) {
  const projects: CvProjectItem[] = [];
  let current: CvProjectItem | null = null;

  lines.forEach((line, index) => {
    const next = lines[index + 1] ?? "";

    if (isProjectHeading(line, next, current)) {
      if (current) {
        projects.push(current);
      }

      current = {
        name: cleanBullet(line),
        description: "",
        technologies: [],
      };
      return;
    }

    current ??= {
      name: cleanBullet(line).split(/[-|:]/)[0]?.trim() ?? line,
      description: "",
      technologies: [],
    };

    const description = cleanBullet(line);
    current.description = [current.description, description].filter(Boolean).join(" ");
    current.technologies = unique([...current.technologies, ...extractTechnologies(description)]);
  });

  if (current) {
    projects.push(current);
  }

  return projects;
}

function parseEducation(lines: string[]) {
  if (lines.length === 0) {
    return [];
  }

  const schoolLines: string[] = [];
  const details: string[] = [];
  let period = "";

  for (const line of lines) {
    const linePeriod = line.match(periodPattern)?.[0] ?? "";

    if (linePeriod) {
      period = linePeriod;
      details.push(line);
      continue;
    }

    if (isBulletLine(line) || schoolLines.length >= 2) {
      details.push(cleanBullet(line));
      continue;
    }

    schoolLines.push(line);
  }

  const fallback = lines[0] ?? "";

  return [
    {
      school: schoolLines.join(" ") || fallback.replace(period, "").trim(),
      degree: details.find((line) => /master|bachelor|engineer|degree/i.test(line)) ?? "",
      period,
      details: details.join(" "),
    },
  ];
}

function extractTechnologies(line: string) {
  const matches = line.match(
    /\b(?:React|ReactJS|Next\.?js|Node\.?js|NestJS|TypeScript|JavaScript|Python|PHP|Qdrant|RAG|AI|LLM|GraphQL|Docker|AWS|GCP|Cypress|Jest|Figma)\b/gi,
  );

  return matches ? unique(matches) : [];
}

function isBulletLine(line: string) {
  return /^(?:[-*•]\s+|8\s+)/.test(line);
}

function isInlineSubheading(line: string) {
  return line.endsWith(":") && line.length <= 60;
}

function cleanBullet(line: string) {
  return line
    .replace(/^(?:[-*•]\s+|8\s+)/, "")
    .replace(/^[\u0308¨×¡][ÕO]\s+/, "")
    .replace(/\|\s*$/g, ".")
    .replace(/\+\s*$/g, "")
    .trim();
}

function isPeriodLine(line: string) {
  return periodPattern.test(line) && line.replace(periodPattern, "").trim().length <= 8;
}

function isJobHeading(line: string, nextLine = "") {
  return (
    !isBulletLine(line) &&
    !line.endsWith(":") &&
    !line.includes(":") &&
    line.length <= 140 &&
    (/\/\s*\S/.test(line) ||
      /\s+\bat\b\s+/i.test(line) ||
      /\s+·\s+/.test(line) ||
      /\s+-\s+\S/.test(line) ||
      Boolean(line.match(periodPattern)) ||
      Boolean(nextLine && isPeriodLine(nextLine)))
  );
}

function appendToLastBullet(current: CvExperienceItem, line: string) {
  const lastIndex = current.bullets.length - 1;
  current.bullets[lastIndex] = `${current.bullets[lastIndex]} ${cleanBullet(line)}`.replace(/\s{2,}/g, " ");
}

function isProjectHeading(line: string, nextLine: string, current: CvProjectItem | null) {
  return (
    !isBulletLine(line) &&
    !urlPattern.test(line) &&
    !periodPattern.test(line) &&
    line.length <= 80 &&
    (/^[A-Z]/.test(line) || !current) &&
    (Boolean(nextLine.match(periodPattern)) || urlPattern.test(nextLine))
  );
}

function cleanLine(line: string) {
  return line
    .replace(/º/g, ":")
    .normalize("NFKC")
    .replace(/\u2028|\u2029/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/^[8]\s+/, "• ")
    .replace(/^[\u0308¨×¡][ÕO]\s+/, "• ")
    .replace(/º\s*$/g, ":")
    .replace(/\|\s*$/g, ".")
    .replace(/\+\s*$/g, "")
    .replace(/\s+([:.,])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeHeading(line: string) {
  return line
    .toLowerCase()
    .replace(/[|:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\bAi\b/g, "AI")
    .replace(/\bUi\b/g, "UI")
    .replace(/\bUx\b/g, "UX");
}

function unique(values: string[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}
