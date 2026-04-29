import type {
  JobRequirement,
  JobRequirementCategory,
  JobRequirementImportance,
  JobRequirementsRubric,
  MatchResponse,
  RequirementMatch,
  RequirementMatchStatus,
} from "@/lib/types";

type ParsedMatchResponse = Omit<
  MatchResponse,
  "cvTitle" | "jobTitle" | "model" | "latencyMs" | "rubric"
>;

const requirementCategories: JobRequirementCategory[] = [
  "must-have",
  "nice-to-have",
  "domain-context",
];
const requirementImportances: JobRequirementImportance[] = ["high", "medium", "low"];
const requirementStatuses: RequirementMatchStatus[] = ["strong", "partial", "missing"];

export const emptyJobRequirementsRubric: JobRequirementsRubric = {
  mustHave: [],
  niceToHave: [],
  domainContext: [],
};

const fallbackMatchResponse: ParsedMatchResponse = {
  score: 0,
  summary: "The model response could not be parsed into the expected scoring shape.",
  strengths: [],
  gaps: ["Check the raw model response and prompt constraints."],
  evidence: [],
  requirementMatches: [],
};

export function parseJobRequirementsResponse(content: string): JobRequirementsRubric {
  try {
    const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
    const rubric = getRecord(parsed.rubric) ?? parsed;

    return {
      roleTitle: getOptionalString(rubric.roleTitle),
      seniority: getOptionalString(rubric.seniority),
      mustHave: getRequirementArray(rubric.mustHave, "must-have"),
      niceToHave: getRequirementArray(rubric.niceToHave, "nice-to-have"),
      domainContext: getRequirementArray(rubric.domainContext, "domain-context"),
    };
  } catch {
    return emptyJobRequirementsRubric;
  }
}

export function parseMatchResponse(content: string): ParsedMatchResponse {
  try {
    const parsed = JSON.parse(extractJson(content)) as Partial<MatchResponse>;

    return {
      score: clampScore(parsed.score),
      summary: typeof parsed.summary === "string" ? parsed.summary : fallbackMatchResponse.summary,
      strengths: getStringArray(parsed.strengths),
      gaps: getStringArray(parsed.gaps),
      evidence: getStringArray(parsed.evidence),
      requirementMatches: getRequirementMatchArray(parsed.requirementMatches),
    };
  } catch {
    return {
      score: fallbackMatchResponse.score,
      summary: content,
      strengths: [],
      gaps: ["The model returned non-JSON output."],
      evidence: [],
      requirementMatches: [],
    };
  }
}

function extractJson(content: string) {
  const match = content.match(/\{[\s\S]*\}/);

  return match?.[0] ?? content;
}

function clampScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(value), 0), 100);
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getRequirementArray(value: unknown, fallbackCategory: JobRequirementCategory) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): JobRequirement | null => {
      if (typeof item === "string") {
        return {
          label: item,
          category: fallbackCategory,
          importance: "medium",
          evidence: [],
        };
      }

      const record = getRecord(item);
      const label =
        getOptionalString(record?.label) ??
        getOptionalString(record?.requirement) ??
        getOptionalString(record?.title);

      if (!record || !label) {
        return null;
      }

      return {
        label,
        category: getRequirementCategory(record.category, fallbackCategory),
        importance: getRequirementImportance(record.importance),
        evidence: getStringArray(record.evidence),
      };
    })
    .filter((item): item is JobRequirement => item !== null);
}

function getRequirementMatchArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): RequirementMatch | null => {
      const record = getRecord(item);
      const requirement =
        getOptionalString(record?.requirement) ??
        getOptionalString(record?.label) ??
        getOptionalString(record?.title);

      if (!record || !requirement) {
        return null;
      }

      return {
        requirement,
        category: getRequirementCategory(record.category, "must-have"),
        status: getRequirementStatus(record.status),
        evidence: getStringArray(record.evidence),
      };
    })
    .filter((item): item is RequirementMatch => item !== null);
}

function getRequirementCategory(value: unknown, fallback: JobRequirementCategory) {
  return typeof value === "string" && requirementCategories.includes(value as JobRequirementCategory)
    ? (value as JobRequirementCategory)
    : fallback;
}

function getRequirementImportance(value: unknown) {
  return typeof value === "string" && requirementImportances.includes(value as JobRequirementImportance)
    ? (value as JobRequirementImportance)
    : "medium";
}

function getRequirementStatus(value: unknown) {
  return typeof value === "string" && requirementStatuses.includes(value as RequirementMatchStatus)
    ? (value as RequirementMatchStatus)
    : "partial";
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
