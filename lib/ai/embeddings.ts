import { getOpenRouterClient } from "@/lib/ai/openrouter-client";
import { getEmbeddingProfile, type EmbeddingProfileId } from "@/lib/embedding-profiles";

export async function createEmbeddings(input: string[], profileId?: EmbeddingProfileId) {
  if (input.length === 0) {
    return [];
  }

  const profile = getEmbeddingProfile(profileId);
  const response = await getOpenRouterClient().embeddings.create({
    model: profile.model,
    dimensions: profile.dimensions,
    input,
  });

  return response.data
    .sort((left, right) => left.index - right.index)
    .map((item) => item.embedding);
}

export async function createEmbedding(input: string, profileId?: EmbeddingProfileId) {
  const [embedding] = await createEmbeddings([input], profileId);

  if (!embedding) {
    throw new Error("Embedding response did not include a vector.");
  }

  return embedding;
}
