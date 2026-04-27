export const qdrantConfig = {
  url: process.env.QDRANT_URL ?? "http://localhost:6333",
  collection: process.env.QDRANT_COLLECTION ?? "ai_rag_lab_documents",
};

export const embeddingConfig = {
  model: process.env.OPENROUTER_EMBEDDING_MODEL ?? "text-embedding-3-small",
  dimensions: getOptionalNumber(process.env.OPENROUTER_EMBEDDING_DIMENSIONS) ?? 1536,
};

export const openRouterConfig = {
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  appTitle: process.env.OPENROUTER_APP_TITLE ?? "AI RAG Lab",
  siteUrl: process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
};

function getOptionalNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric environment value: ${value}`);
  }

  return parsed;
}
