import type { MatchResponse } from "@/lib/types";

type ParsedMatchResponse = Omit<MatchResponse, "cvTitle" | "jobTitle" | "model" | "latencyMs">;

const fallbackMatchResponse: ParsedMatchResponse = {
  score: 0,
  summary: "The model response could not be parsed into the expected scoring shape.",
  strengths: [],
  gaps: ["Check the raw model response and prompt constraints."],
  evidence: [],
};

export function parseMatchResponse(content: string): ParsedMatchResponse {
  try {
    const parsed = JSON.parse(extractJson(content)) as Partial<MatchResponse>;

    return {
      score: clampScore(parsed.score),
      summary: typeof parsed.summary === "string" ? parsed.summary : fallbackMatchResponse.summary,
      strengths: getStringArray(parsed.strengths),
      gaps: getStringArray(parsed.gaps),
      evidence: getStringArray(parsed.evidence),
    };
  } catch {
    return {
      score: fallbackMatchResponse.score,
      summary: content,
      strengths: [],
      gaps: ["The model returned non-JSON output."],
      evidence: [],
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
