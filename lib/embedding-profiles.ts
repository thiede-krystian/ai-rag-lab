export const embeddingProfiles = {
  balanced: {
    id: "balanced",
    label: "Balanced",
    model: "text-embedding-3-small",
    dimensions: 1536,
    description: "Fast, inexpensive default for local RAG demos.",
  },
  large: {
    id: "large",
    label: "High quality",
    model: "text-embedding-3-large",
    dimensions: 3072,
    description: "Larger vectors for higher-recall experiments.",
  },
} as const;

export type EmbeddingProfileId = keyof typeof embeddingProfiles;

export type EmbeddingProfile = (typeof embeddingProfiles)[EmbeddingProfileId];

export const defaultEmbeddingProfileId: EmbeddingProfileId = "balanced";

export function getEmbeddingProfile(profileId: string | undefined | null) {
  if (profileId && isEmbeddingProfileId(profileId)) {
    return embeddingProfiles[profileId];
  }

  return embeddingProfiles[getConfiguredDefaultEmbeddingProfileId()];
}

export function getEmbeddingProfileOptions() {
  return Object.values(embeddingProfiles);
}

export function isEmbeddingProfileId(value: string): value is EmbeddingProfileId {
  return value in embeddingProfiles;
}

function getConfiguredDefaultEmbeddingProfileId(): EmbeddingProfileId {
  const configured =
    typeof process === "undefined" ? undefined : process.env.OPENROUTER_EMBEDDING_PROFILE;

  return configured && isEmbeddingProfileId(configured) ? configured : "balanced";
}
