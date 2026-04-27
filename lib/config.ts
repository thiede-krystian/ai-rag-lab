export const qdrantConfig = {
  url: process.env.QDRANT_URL ?? "http://localhost:6333",
  collection: process.env.QDRANT_COLLECTION ?? "ai_rag_lab_documents",
};

export const chatConfig = {
  model: process.env.OPENROUTER_CHAT_MODEL ?? "openai/gpt-4.1-mini",
};

export const openRouterConfig = {
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  appTitle: process.env.OPENROUTER_APP_TITLE ?? "AI RAG Lab",
  siteUrl: process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
};
