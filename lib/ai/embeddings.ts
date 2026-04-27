import OpenAICompatibleClient from "openai";
import { embeddingConfig, openRouterConfig } from "@/lib/config";

let openRouterClient: OpenAICompatibleClient | null = null;

function getOpenRouterClient() {
  if (!openRouterConfig.apiKey) {
    throw new Error("OPENROUTER_API_KEY is required to create embeddings.");
  }

  openRouterClient ??= new OpenAICompatibleClient({
    apiKey: openRouterConfig.apiKey,
    baseURL: openRouterConfig.baseURL,
    defaultHeaders: {
      "HTTP-Referer": openRouterConfig.siteUrl,
      "X-Title": openRouterConfig.appTitle,
    },
  });

  return openRouterClient;
}

export async function createEmbeddings(input: string[]) {
  if (input.length === 0) {
    return [];
  }

  const response = await getOpenRouterClient().embeddings.create({
    model: embeddingConfig.model,
    dimensions: embeddingConfig.dimensions,
    input,
  });

  return response.data
    .sort((left, right) => left.index - right.index)
    .map((item) => item.embedding);
}

export async function createEmbedding(input: string) {
  const [embedding] = await createEmbeddings([input]);

  if (!embedding) {
    throw new Error("Embedding response did not include a vector.");
  }

  return embedding;
}
