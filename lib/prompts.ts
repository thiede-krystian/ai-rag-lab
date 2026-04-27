import type { PromptVersion, SearchResult } from "@/lib/types";

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
}: {
  candidateProfile: string;
  jobOffer: string;
}) {
  return [
    {
      role: "system" as const,
      content: [
        "You score how well a candidate profile matches an AI Engineer role.",
        "Return only valid JSON with keys: score, summary, strengths, gaps, evidence.",
        "score must be an integer from 0 to 100.",
        "strengths, gaps, and evidence must be arrays of short strings.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        `Candidate profile:\n${candidateProfile}`,
        `Job offer:\n${jobOffer}`,
        "Evaluate the match for AI engineering, embeddings, vector search, RAG, prompting, evals, Next.js, Node.js, and TypeScript.",
      ].join("\n\n"),
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
