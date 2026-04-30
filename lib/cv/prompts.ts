import type { CvDraft } from "@/lib/cv/types";

export function buildCvParseMessages({
  text,
  currentDraft,
}: {
  text: string;
  currentDraft?: CvDraft;
}) {
  return [
    {
      role: "system" as const,
      content: [
        "You parse CV text into a clean structured JSON draft.",
        "Return only valid JSON. Do not wrap it in markdown.",
        "Use this shape: { personal: { name, headline, secondHeadline, email, phone, location, website, links: [{ label, url }] }, summary, aspirations, skills, experience: [{ role, company, location, period, bullets }], projects: [{ name, description, technologies }], education: [{ school, degree, period, details }], certifications, languages }.",
        "Keep original facts. Do not invent employers, dates, degrees, or skills.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        currentDraft ? `Current draft JSON:\n${JSON.stringify(currentDraft, null, 2)}` : "",
        `Raw CV text:\n${text}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
}

export function parseCvDraftJson(content: string) {
  const json = extractJsonObject(content);

  if (!json) {
    throw new Error("AI parser returned invalid CV JSON.");
  }

  return JSON.parse(json) as unknown;
}

function extractJsonObject(content: string) {
  const trimmed = content.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start < 0 || end <= start) {
    return null;
  }

  return trimmed.slice(start, end + 1);
}
