import { describe, expect, it } from "vitest";
import { resolveQdrantConfig } from "@/lib/config";

describe("Qdrant config", () => {
  it("uses local Qdrant by default", () => {
    expect(resolveQdrantConfig({})).toMatchObject({
      target: "local",
      url: "http://localhost:6333",
      apiKey: undefined,
      collection: "ai_rag_lab_documents",
    });
  });

  it("uses Qdrant Cloud when an API key is present", () => {
    expect(
      resolveQdrantConfig({
        QDRANT_CLOUD_URL: "https://cluster.example.cloud.qdrant.io:6333",
        QDRANT_API_KEY: "secret",
      }),
    ).toMatchObject({
      target: "cloud",
      url: "https://cluster.example.cloud.qdrant.io:6333",
      apiKey: "secret",
    });
  });

  it("uses Qdrant Cloud on Vercel deployments", () => {
    expect(
      resolveQdrantConfig({
        VERCEL: "1",
        QDRANT_URL: "https://cluster.example.cloud.qdrant.io:6333",
        QDRANT_API_KEY: "secret",
      }),
    ).toMatchObject({
      target: "cloud",
      url: "https://cluster.example.cloud.qdrant.io:6333",
      apiKey: "secret",
    });
  });

  it("allows forcing local Qdrant even when cloud env exists", () => {
    expect(
      resolveQdrantConfig({
        QDRANT_TARGET: "local",
        QDRANT_LOCAL_URL: "http://qdrant:6333",
        QDRANT_CLOUD_URL: "https://cluster.example.cloud.qdrant.io:6333",
        QDRANT_API_KEY: "secret",
      }),
    ).toMatchObject({
      target: "local",
      url: "http://qdrant:6333",
      apiKey: undefined,
    });
  });

  it("rejects invalid Qdrant target values", () => {
    expect(() =>
      resolveQdrantConfig({
        QDRANT_TARGET: "staging",
      }),
    ).toThrow("QDRANT_TARGET must be one of: auto, local, cloud.");
  });
});
