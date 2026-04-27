import { embeddingConfig } from "@/lib/config";
import { getOpenRouterClient } from "@/lib/ai/openrouter-client";

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
