import type { CvDraft } from "@/lib/cv/types";

export const CV_CLASSIFIER_PARSER = "openrouter-cv-classifier-v2";

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
        `You are ${CV_CLASSIFIER_PARSER}. Parse arbitrary CV text into the exact structured CV draft JSON used by the app.`,
        "Return only valid JSON. Do not wrap it in markdown, comments, or explanatory text.",
        "Use this exact shape: { personal: { name, headline, secondHeadline, email, phone, location, website, links: [{ label, url }] }, summary, aspirations, skills, experience: [{ role, company, location, period, bullets, includeInExport }], projects: [{ name, description, technologies, includeInExport }], education: [{ school, degree, period, details, includeInExport }], certifications, languages }.",
        "Set includeInExport to true for every parsed experience, project, and education item unless the CV explicitly marks it as excluded.",
        "Preserve every role, employer, project, and education entry visible in the raw CV text. Do not merge separate jobs just because they are close together in the extracted text.",
        "Recognize role/company headings written with separators such as '/', '@', '|', 'at', '-' and '·'.",
        "personal.headline is the main professional title. personal.secondHeadline is the secondary tagline, specialization, or positioning line if present; otherwise use an empty string.",
        "Put spoken or natural languages such as Polish, English, German, B2, C1, native, fluent, or professional proficiency into languages, not into skills.",
        "Keep original facts. Do not invent employers, dates, degrees, skills, links, or achievements.",
        "If a detail is ambiguous, keep it in the closest bullet/detail field instead of dropping it.",
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

export function buildCvParseRepairMessages({ invalidContent }: { invalidContent: string }) {
  return [
    {
      role: "system" as const,
      content: [
        `You repair ${CV_CLASSIFIER_PARSER} output.`,
        "Return only one valid JSON object matching the CV draft shape.",
        "Do not add markdown fences, comments, or explanatory text.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: `Repair this invalid CV draft JSON output:\n${invalidContent}`,
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
