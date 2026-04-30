import type {
  CvDraft,
  CvEducationItem,
  CvExperienceItem,
  CvLink,
  CvProjectItem,
} from "@/lib/cv/types";

export function createEmptyCvDraft(): CvDraft {
  return {
    personal: {
      name: "",
      headline: "",
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
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    languages: [],
  };
}

export function normalizeCvDraft(input: unknown): CvDraft {
  const source = isRecord(input) ? input : {};
  const personal = isRecord(source.personal) ? source.personal : {};

  return {
    personal: {
      name: asString(personal.name),
      headline: asString(personal.headline),
      secondHeadline: asString(personal.secondHeadline),
      email: asString(personal.email),
      phone: asString(personal.phone),
      location: asString(personal.location),
      website: asString(personal.website),
      links: asArray(personal.links).map(normalizeLink).filter((link) => link.label || link.url),
    },
    summary: asString(source.summary),
    aspirations: asString(source.aspirations),
    skills: cleanStringArray(source.skills),
    experience: asArray(source.experience)
      .map(normalizeExperience)
      .filter((item) => item.role || item.company || item.bullets.length > 0),
    projects: asArray(source.projects)
      .map(normalizeProject)
      .filter((item) => item.name || item.description || item.technologies.length > 0),
    education: asArray(source.education)
      .map(normalizeEducation)
      .filter((item) => item.school || item.degree || item.details),
    certifications: cleanStringArray(source.certifications),
    languages: cleanStringArray(source.languages),
  };
}

export function hasCvContent(draft: CvDraft) {
  return Boolean(
    draft.personal.name ||
      draft.personal.headline ||
      draft.personal.secondHeadline ||
      draft.summary ||
      draft.aspirations ||
      draft.skills.length ||
      draft.experience.length ||
      draft.projects.length ||
      draft.education.length,
  );
}

function normalizeLink(input: unknown): CvLink {
  if (typeof input === "string") {
    return {
      label: getLinkLabel(input),
      url: input.trim(),
    };
  }

  const source = isRecord(input) ? input : {};

  return {
    label: asString(source.label) || getLinkLabel(asString(source.url)),
    url: asString(source.url),
  };
}

function normalizeExperience(input: unknown): CvExperienceItem {
  const source = isRecord(input) ? input : {};

  return {
    role: asString(source.role),
    company: asString(source.company),
    location: asString(source.location),
    period: asString(source.period),
    bullets: cleanTextArray(source.bullets),
    includeInExport: normalizeIncludeInExport(source.includeInExport),
  };
}

function normalizeProject(input: unknown): CvProjectItem {
  const source = isRecord(input) ? input : {};

  return {
    name: asString(source.name),
    description: asString(source.description),
    technologies: cleanStringArray(source.technologies),
    includeInExport: normalizeIncludeInExport(source.includeInExport),
  };
}

function normalizeEducation(input: unknown): CvEducationItem {
  const source = isRecord(input) ? input : {};

  return {
    school: asString(source.school),
    degree: asString(source.degree),
    period: asString(source.period),
    details: asString(source.details),
    includeInExport: normalizeIncludeInExport(source.includeInExport),
  };
}

function normalizeIncludeInExport(value: unknown) {
  return typeof value === "boolean" ? value : true;
}

function cleanStringArray(input: unknown) {
  return asArray(input)
    .flatMap((value) => (typeof value === "string" ? splitLooseList(value) : []))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function cleanTextArray(input: unknown) {
  return asArray(input)
    .flatMap((value) => (typeof value === "string" ? value.split(/\n/) : []))
    .map((value) => value.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function splitLooseList(value: string) {
  return value
    .split(/\n|,|;|\s\|\s|\s+[·•]\s+/)
    .map((item) => item.replace(/^[-*•]\s*/, ""));
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getLinkLabel(url: string) {
  if (!url) {
    return "";
  }

  if (url.includes("linkedin.")) {
    return "LinkedIn";
  }

  if (url.includes("github.")) {
    return "GitHub";
  }

  return "Link";
}
