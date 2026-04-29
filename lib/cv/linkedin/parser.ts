import { parse } from "csv-parse/sync";
import JSZip from "jszip";
import type { LinkedInProfile } from "@/lib/cv/types";
import {
  asString,
  cleanStringArray,
  createEmptyLinkedInProfile,
  mergeLinkedInProfiles,
  normalizeLinkedInProfile,
} from "@/lib/cv/linkedin/profile";

export type LinkedInImportResult = {
  profile: LinkedInProfile;
  source: "zip" | "csv" | "text";
  parsedFiles: string[];
  warnings: string[];
};

type CsvRow = Record<string, string>;

export async function parseLinkedInFile(buffer: ArrayBuffer, filename: string): Promise<LinkedInImportResult> {
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith(".zip")) {
    return parseLinkedInZip(buffer);
  }

  if (lowerName.endsWith(".csv")) {
    const text = new TextDecoder().decode(buffer);
    const profile = parseLinkedInCsv(text, filename);

    return {
      profile,
      source: "csv",
      parsedFiles: [filename],
      warnings: profileHasContent(profile) ? [] : [`${filename} did not contain recognized LinkedIn profile data.`],
    };
  }

  throw new Error("Only LinkedIn ZIP or CSV files are supported.");
}

export function parseLinkedInText(text: string): LinkedInImportResult {
  const profile = createEmptyLinkedInProfile();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let section = "summary";
  const summaryLines: string[] = [];
  let currentPosition: LinkedInProfile["positions"][number] | null = null;

  for (const line of lines) {
    const normalized = line.toLowerCase();

    if (["about", "summary"].includes(normalized)) {
      section = "summary";
      currentPosition = null;
      continue;
    }

    if (["experience", "positions"].includes(normalized)) {
      section = "experience";
      currentPosition = null;
      continue;
    }

    if (normalized === "education") {
      section = "education";
      currentPosition = null;
      continue;
    }

    if (normalized === "skills") {
      section = "skills";
      currentPosition = null;
      continue;
    }

    if (normalized === "certifications" || normalized === "licenses & certifications") {
      section = "certifications";
      currentPosition = null;
      continue;
    }

    if (normalized === "languages") {
      section = "languages";
      currentPosition = null;
      continue;
    }

    if (normalized === "projects") {
      section = "projects";
      currentPosition = null;
      continue;
    }

    if (!profile.personal.fullName && isLikelyName(line)) {
      profile.personal.fullName = line;
      continue;
    }

    if (!profile.personal.headline && profile.personal.fullName && section === "summary" && line.length < 120) {
      profile.personal.headline = line;
      continue;
    }

    if (section === "summary") {
      summaryLines.push(line);
      continue;
    }

    if (section === "experience") {
      if (looksLikeExperienceHeader(line)) {
        currentPosition = parseExperienceHeader(line);
        profile.positions.push(currentPosition);
      } else if (currentPosition) {
        currentPosition.bullets.push(cleanBullet(line));
      }
      continue;
    }

    if (section === "education") {
      profile.education.push({
        school: line,
        degree: "",
        period: "",
        details: "",
      });
      continue;
    }

    if (section === "skills") {
      profile.skills.push(...cleanStringArray(line));
      continue;
    }

    if (section === "certifications") {
      profile.certifications.push(line);
      continue;
    }

    if (section === "languages") {
      profile.languages.push(line);
      continue;
    }

    if (section === "projects") {
      profile.projects.push({
        name: line,
        description: "",
        technologies: [],
      });
    }
  }

  profile.about = summaryLines.join("\n");

  return {
    profile: normalizeLinkedInProfile(profile),
    source: "text",
    parsedFiles: ["pasted-profile-text"],
    warnings: [],
  };
}

async function parseLinkedInZip(buffer: ArrayBuffer): Promise<LinkedInImportResult> {
  const zip = await JSZip.loadAsync(buffer);
  const parsedProfiles: LinkedInProfile[] = [];
  const parsedFiles: string[] = [];
  const warnings: string[] = [];

  for (const [filename, entry] of Object.entries(zip.files)) {
    if (entry.dir || !filename.toLowerCase().endsWith(".csv")) {
      continue;
    }

    const text = await entry.async("text");
    const profile = parseLinkedInCsv(text, filename);

    if (profileHasContent(profile)) {
      parsedProfiles.push(profile);
      parsedFiles.push(filename);
    }
  }

  if (parsedProfiles.length === 0) {
    warnings.push("No recognized LinkedIn CSV files were found in the archive.");
  }

  return {
    profile: mergeLinkedInProfiles(parsedProfiles),
    source: "zip",
    parsedFiles,
    warnings,
  };
}

function parseLinkedInCsv(text: string, filename: string) {
  const rows = parseCsvRows(text);
  const type = detectCsvType(filename, rows);

  if (type === "profile") {
    return parseProfileRows(rows);
  }

  if (type === "positions") {
    return { ...createEmptyLinkedInProfile(), positions: rows.map(parsePositionRow).filter(hasExperienceContent) };
  }

  if (type === "education") {
    return { ...createEmptyLinkedInProfile(), education: rows.map(parseEducationRow).filter((item) => item.school || item.degree) };
  }

  if (type === "skills") {
    return { ...createEmptyLinkedInProfile(), skills: cleanStringArray(rows.map((row) => pick(row, ["Name", "Skill", "Skills"])).join("\n")) };
  }

  if (type === "certifications") {
    return { ...createEmptyLinkedInProfile(), certifications: rows.map(parseCertificationRow).filter(Boolean) };
  }

  if (type === "languages") {
    return { ...createEmptyLinkedInProfile(), languages: rows.map(parseLanguageRow).filter(Boolean) };
  }

  if (type === "projects") {
    return { ...createEmptyLinkedInProfile(), projects: rows.map(parseProjectRow).filter((item) => item.name || item.description) };
  }

  return createEmptyLinkedInProfile();
}

function parseCsvRows(text: string): CsvRow[] {
  return parse(text, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];
}

function detectCsvType(filename: string, rows: CsvRow[]) {
  const lowerName = filename.toLowerCase();
  const headers = Object.keys(rows[0] ?? {}).join(" ").toLowerCase();

  if (lowerName.includes("profile") || headers.includes("headline")) return "profile";
  if (lowerName.includes("position") || headers.includes("company name")) return "positions";
  if (lowerName.includes("education") || headers.includes("school name")) return "education";
  if (lowerName.includes("skill")) return "skills";
  if (lowerName.includes("certification") || lowerName.includes("license")) return "certifications";
  if (lowerName.includes("language")) return "languages";
  if (lowerName.includes("project")) return "projects";

  return "unknown";
}

function parseProfileRows(rows: CsvRow[]) {
  const row = rows[0] ?? {};
  const firstName = pick(row, ["First Name", "FirstName"]);
  const lastName = pick(row, ["Last Name", "LastName"]);

  return normalizeLinkedInProfile({
    personal: {
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(" "),
      headline: pick(row, ["Headline", "Title"]),
      location: pick(row, ["Geo Location", "Location", "Address"]),
      website: pick(row, ["Websites", "Website"]),
      email: pick(row, ["Email Address", "Email"]),
      phone: pick(row, ["Phone Numbers", "Phone"]),
    },
    about: pick(row, ["Summary", "About"]),
  });
}

function parsePositionRow(row: CsvRow) {
  const period = [pick(row, ["Started On", "Start Date", "From"]), pick(row, ["Finished On", "End Date", "To"])]
    .filter(Boolean)
    .join(" - ");

  return {
    role: pick(row, ["Title", "Role", "Position"]),
    company: pick(row, ["Company Name", "Company"]),
    location: pick(row, ["Location"]),
    period,
    bullets: [pick(row, ["Description", "Summary"])].filter(Boolean),
  };
}

function parseEducationRow(row: CsvRow) {
  return {
    school: pick(row, ["School Name", "School"]),
    degree: pick(row, ["Degree Name", "Degree"]),
    period: [pick(row, ["Start Date", "Started On"]), pick(row, ["End Date", "Finished On"])]
      .filter(Boolean)
      .join(" - "),
    details: [pick(row, ["Notes", "Activities", "Field Of Study"])].filter(Boolean).join(" | "),
  };
}

function parseCertificationRow(row: CsvRow) {
  return [pick(row, ["Name", "Certification"]), pick(row, ["Authority", "Organization"])]
    .filter(Boolean)
    .join(" / ");
}

function parseLanguageRow(row: CsvRow) {
  return [pick(row, ["Name", "Language"]), pick(row, ["Proficiency"])].filter(Boolean).join(" - ");
}

function parseProjectRow(row: CsvRow) {
  return {
    name: pick(row, ["Title", "Name", "Project"]),
    description: pick(row, ["Description"]),
    technologies: cleanStringArray(pick(row, ["Technologies", "Skills"])),
  };
}

function pick(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const match = Object.keys(row).find((header) => header.toLowerCase() === key.toLowerCase());
    const value = match ? asString(row[match]) : "";

    if (value) {
      return value;
    }
  }

  return "";
}

function hasExperienceContent(item: LinkedInProfile["positions"][number]) {
  return Boolean(item.role || item.company || item.bullets.length);
}

function profileHasContent(profile: LinkedInProfile) {
  return Boolean(
    profile.personal.fullName ||
      profile.personal.headline ||
      profile.about ||
      profile.positions.length ||
      profile.education.length ||
      profile.skills.length ||
      profile.certifications.length ||
      profile.languages.length ||
      profile.projects.length,
  );
}

function isLikelyName(line: string) {
  return /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(line) && line.length < 80;
}

function looksLikeExperienceHeader(line: string) {
  return line.includes(" at ") || line.includes(" /") || line.includes(" - ");
}

function parseExperienceHeader(line: string) {
  const [rolePart, companyPart = ""] = line.split(/\s+at\s+| \/ |\s+-\s+/);

  return {
    role: rolePart.trim(),
    company: companyPart.trim(),
    location: "",
    period: "",
    bullets: [],
  };
}

function cleanBullet(line: string) {
  return line.replace(/^[-*\u2022]\s*/, "").trim();
}
