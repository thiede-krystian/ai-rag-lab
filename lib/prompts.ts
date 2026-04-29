import type { JobRequirementsRubric, PromptVersion, SearchResult } from "@/lib/types";

export function buildRagMessages({
  question,
  retrievedChunks,
  promptVersion,
}: {
  question: string;
  retrievedChunks: SearchResult[];
  promptVersion: PromptVersion;
}) {
  const context = formatContext(retrievedChunks);
  const strictInstruction =
    promptVersion === "rag_strict_v2"
      ? "Use only the provided context. If the context is insufficient, say exactly what is missing. Cite sources using [S1], [S2], etc."
      : "Prefer the provided context and cite relevant sources using [S1], [S2], etc.";

  return [
    {
      role: "system" as const,
      content: [
        "You are an AI product engineer assistant for a recruiting and knowledge-search demo.",
        strictInstruction,
        "Keep the answer concise, specific, and useful for evaluating AI Engineer fit.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [`Context:\n${context}`, `Question:\n${question}`].join("\n\n"),
    },
  ];
}

export function buildMatchScoreMessages({
  candidateProfile,
  jobOffer,
  rubric,
}: {
  candidateProfile: string;
  jobOffer: string;
  rubric: JobRequirementsRubric;
}) {
  return [
    {
      role: "system" as const,
      content: [
        "You score how well a candidate profile matches a specific job description.",
        "Use the supplied job-specific rubric and job description. Do not use a generic AI Engineer checklist.",
        "Return only valid JSON with keys: score, summary, strengths, gaps, evidence, requirementMatches.",
        "score must be an integer from 0 to 100.",
        "strengths, gaps, and evidence must be arrays of short strings.",
        "requirementMatches must be an array of objects with keys: requirement, category, status, evidence.",
        "Each status must be one of: strong, partial, missing.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        `Candidate profile:\n${candidateProfile}`,
        `Job offer:\n${jobOffer}`,
        `Extracted job-specific rubric:\n${JSON.stringify(rubric, null, 2)}`,
        [
          "Scoring guidance:",
          "- must-have requirements should dominate the final score.",
          "- nice-to-have requirements can raise the score, but should not hide missing must-have requirements.",
          "- domain/context requirements should affect contextual fit without becoming mandatory unless the job description says so.",
          "- include concrete evidence from the candidate profile whenever possible.",
        ].join("\n"),
      ].join("\n\n"),
    },
  ];
}

export function buildJobRequirementsMessages({ jobOffer }: { jobOffer: string }) {
  return [
    {
      role: "system" as const,
      content: [
        "You extract a job-specific scoring rubric from a job description.",
        "Return only valid JSON with keys: roleTitle, seniority, mustHave, niceToHave, domainContext.",
        "mustHave, niceToHave, and domainContext must be arrays of requirement objects.",
        "Each requirement object must have keys: label, category, importance, evidence.",
        "category must be one of: must-have, nice-to-have, domain-context.",
        "importance must be one of: high, medium, low.",
        "evidence must be an array of short strings grounded in the job description.",
        "Do not add generic requirements that are not supported by the job description.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: `Job description:\n${jobOffer}`,
    },
  ];
}

function formatContext(chunks: SearchResult[]) {
  if (chunks.length === 0) {
    return "No context was retrieved.";
  }

  return chunks
    .map((chunk, index) =>
      [
        `[S${index + 1}] ${chunk.title} / ${chunk.sourceType} / chunk ${chunk.chunkIndex + 1}`,
        `Similarity: ${chunk.score.toFixed(3)}`,
        chunk.text,
      ].join("\n"),
    )
    .join("\n\n");
}
