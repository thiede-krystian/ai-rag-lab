export type QdrantTarget = "local" | "cloud";

const defaultLocalQdrantUrl = "http://localhost:6333";

export function resolveQdrantConfig(env: NodeJS.ProcessEnv = process.env) {
  const target = resolveQdrantTarget(env);
  const localUrl = env.QDRANT_LOCAL_URL ?? env.QDRANT_URL ?? defaultLocalQdrantUrl;
  const cloudUrl = env.QDRANT_CLOUD_URL ?? env.QDRANT_URL;

  return {
    target,
    url: target === "cloud" ? cloudUrl ?? defaultLocalQdrantUrl : localUrl,
    apiKey: target === "cloud" ? env.QDRANT_API_KEY : undefined,
    collection: env.QDRANT_COLLECTION ?? "ai_rag_lab_documents",
  };
}

function resolveQdrantTarget(env: NodeJS.ProcessEnv): QdrantTarget {
  if (env.QDRANT_TARGET === "local" || env.QDRANT_TARGET === "cloud") {
    return env.QDRANT_TARGET;
  }

  if (env.QDRANT_TARGET && env.QDRANT_TARGET !== "auto") {
    throw new Error("QDRANT_TARGET must be one of: auto, local, cloud.");
  }

  if (env.QDRANT_API_KEY || env.VERCEL || env.VERCEL_ENV) {
    return "cloud";
  }

  return "local";
}

export const qdrantConfig = resolveQdrantConfig();

export const chatConfig = {
  model: process.env.OPENROUTER_CHAT_MODEL ?? "openai/gpt-4.1-mini",
};

export const openRouterConfig = {
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  appTitle: process.env.OPENROUTER_APP_TITLE ?? "AI RAG Lab",
  siteUrl: process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
};
