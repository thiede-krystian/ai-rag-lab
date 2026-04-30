import type { LinkedInProfile } from "@/lib/cv/types";

export function createEmptyLinkedInProfile(): LinkedInProfile {
  return {
    personal: {
      firstName: "",
      lastName: "",
      fullName: "",
      headline: "",
      location: "",
      website: "",
      email: "",
      phone: "",
    },
    about: "",
    positions: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    projects: [],
  };
}

export function normalizeLinkedInProfile(input: unknown): LinkedInProfile {
  const source = isRecord(input) ? input : {};
  const personal = isRecord(source.personal) ? source.personal : {};

  return {
    personal: {
      firstName: asString(personal.firstName),
      lastName: asString(personal.lastName),
      fullName:
        asString(personal.fullName) ||
        [asString(personal.firstName), asString(personal.lastName)].filter(Boolean).join(" "),
      headline: asString(personal.headline),
      location: asString(personal.location),
      website: asString(personal.website),
      email: asString(personal.email),
      phone: asString(personal.phone),
    },
    about: asString(source.about),
    positions: asArray(source.positions)
      .map((item) => {
        const record = isRecord(item) ? item : {};

        return {
          role: asString(record.role),
          company: asString(record.company),
          location: asString(record.location),
          period: asString(record.period),
          bullets: cleanTextArray(record.bullets),
        };
      })
      .filter((item) => item.role || item.company || item.bullets.length > 0),
    education: asArray(source.education)
      .map((item) => {
        const record = isRecord(item) ? item : {};

        return {
          school: asString(record.school),
          degree: asString(record.degree),
          period: asString(record.period),
          details: asString(record.details),
        };
      })
      .filter((item) => item.school || item.degree || item.details),
    skills: cleanStringArray(source.skills),
    certifications: cleanStringArray(source.certifications),
    languages: cleanStringArray(source.languages),
    projects: asArray(source.projects)
      .map((item) => {
        const record = isRecord(item) ? item : {};

        return {
          name: asString(record.name),
          description: asString(record.description),
          technologies: cleanStringArray(record.technologies),
        };
      })
      .filter((item) => item.name || item.description || item.technologies.length > 0),
  };
}

export function mergeLinkedInProfiles(profiles: LinkedInProfile[]) {
  return normalizeLinkedInProfile(
    profiles.reduce<LinkedInProfile>((merged, profile) => {
      const normalized = normalizeLinkedInProfile(profile);

      return {
        personal: {
          firstName: merged.personal.firstName || normalized.personal.firstName,
          lastName: merged.personal.lastName || normalized.personal.lastName,
          fullName: merged.personal.fullName || normalized.personal.fullName,
          headline: merged.personal.headline || normalized.personal.headline,
          location: merged.personal.location || normalized.personal.location,
          website: merged.personal.website || normalized.personal.website,
          email: merged.personal.email || normalized.personal.email,
          phone: merged.personal.phone || normalized.personal.phone,
        },
        about: merged.about || normalized.about,
        positions: [...merged.positions, ...normalized.positions],
        education: [...merged.education, ...normalized.education],
        skills: [...merged.skills, ...normalized.skills],
        certifications: [...merged.certifications, ...normalized.certifications],
        languages: [...merged.languages, ...normalized.languages],
        projects: [...merged.projects, ...normalized.projects],
      };
    }, createEmptyLinkedInProfile()),
  );
}

export function cleanStringArray(input: unknown) {
  return asArray(input)
    .flatMap((value) => (typeof value === "string" ? splitLooseList(value) : []))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, values) => values.findIndex((item) => sameText(item, value)) === index);
}

export function cleanTextArray(input: unknown) {
  return asArray(input)
    .flatMap((value) => (typeof value === "string" ? splitLines(value) : []))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  return typeof value === "string" && value.trim() ? [value] : [];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function sameText(left: string, right: string) {
  return normalizeKey(left) === normalizeKey(right);
}

export function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function splitLooseList(value: string) {
  return value
    .split(/[,;|]\s*|\s+[·•]\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string) {
  return value
    .split(/\n+|[\u2022*]\s+/)
    .map((item) => item.replace(/^[-\u2013\u2014]\s*/, "").trim())
    .filter(Boolean);
}
